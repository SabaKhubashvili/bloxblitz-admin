import { Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { RedisService } from '../../redis/redis.service';

const AUDIT_CAP = 49;
const AUDIT_TTL_SECONDS = 604_800;
const IDEM_TTL_SECONDS = 2_592_000; // 30d

/**
 * Atomic idempotent credit + audit — mirrors `MinesBalanceLedgerAdapter.settlePayout`
 * with a per-game idempotency key so admin reset retries never double-pay.
 */
const LUA_ADMIN_RESET_REFUND = `
  local username = ARGV[1]
  local gross = tonumber(ARGV[2])
  local gameId = ARGV[3]
  local ts = ARGV[4]
  local idemKey = 'mines:adminRefund:' .. gameId

  if redis.call('EXISTS', idemKey) == 1 then
    return {0, 'ALREADY'}
  end

  local balanceKey = 'user:balance:' .. username
  local auditKey = 'ledger:mines:' .. gameId

  local balanceValue = redis.call('GET', balanceKey)
  local newBalanceValue = gross
  if balanceValue then
    newBalanceValue = (tonumber(balanceValue) or 0) + gross
    local ttl = redis.call('TTL', balanceKey)
    redis.call('SET', balanceKey, newBalanceValue)
    if ttl > 0 then
      redis.call('EXPIRE', balanceKey, ttl)
    end
  else
    redis.call('SET', balanceKey, cjson.encode({b = gross}))
    newBalanceValue = gross
  end

  redis.call('SADD', 'user:balance:dirty', username)

  local entry = cjson.encode({
    action = 'ADMIN_RESET',
    username = username,
    delta = gross,
    balanceAfter = newBalanceValue,
    ts = tonumber(ts)
  })
  redis.call('LPUSH', auditKey, entry)
  redis.call('LTRIM', auditKey, 0, ${AUDIT_CAP})
  redis.call('EXPIRE', auditKey, ${AUDIT_TTL_SECONDS})

  redis.call('SET', idemKey, '1', 'EX', ${IDEM_TTL_SECONDS})

  return {1, tostring(newBalanceValue)}
`;

@Injectable()
export class MinesAdminRefundRedisService {
  private readonly log = new Logger(MinesAdminRefundRedisService.name);

  constructor(private readonly redisManager: RedisService) {}

  private client(): Redis | null {
    return this.redisManager.getClient();
  }

  /**
   * @returns whether a new credit was applied (false if idempotent skip)
   */
  async applyAdminResetCredit(
    username: string,
    gameId: string,
    grossCredit: number,
  ): Promise<{ credited: boolean; balanceAfter?: string }> {
    const r = this.client();
    if (!r) {
      throw new Error('Redis unavailable — cannot apply Mines admin refund');
    }
    const rounded = Math.round(grossCredit * 100) / 100;
    const res = (await r.eval(
      LUA_ADMIN_RESET_REFUND,
      0,
      username,
      String(rounded),
      gameId,
      String(Date.now()),
    )) as [number, string];

    if (!Array.isArray(res)) {
      throw new Error('Unexpected Lua result for admin refund');
    }
    if (res[0] === 0 && res[1] === 'ALREADY') {
      return { credited: false };
    }
    if (res[0] === 1) {
      this.log.log(
        `[AUDIT] mines.adminRefund credit user=${username} game=${gameId} gross=${rounded} balanceAfter=${res[1]}`,
      );
      return { credited: true, balanceAfter: res[1] };
    }
    throw new Error('Unexpected Lua status for admin refund');
  }
}
