import type { RestrictionTimeframe } from './restriction-timeframe';

export interface RouletteRestrictionSnapshot {
  username: string;
  banned: boolean;
  banReason: string | null;
  maxWagerAmount: number | null;
  timeframe: RestrictionTimeframe | null;
}

const roundMoney = (n: number): number => Math.round(n * 100) / 100;

export class RouletteRestriction {
  private constructor(
    private readonly username: string,
    private readonly banned: boolean,
    private readonly banReason: string | null,
    private readonly maxWagerAmount: number | null,
    private readonly timeframe: RestrictionTimeframe | null,
  ) {}

  getUsername(): string {
    return this.username;
  }

  static fromSnapshot(s: RouletteRestrictionSnapshot): RouletteRestriction {
    return new RouletteRestriction(
      s.username,
      s.banned,
      s.banReason,
      s.maxWagerAmount,
      s.timeframe,
    );
  }

  /** No DB row / empty Redis → not banned, no wager cap. */
  static unrestricted(username: string): RouletteRestriction {
    return new RouletteRestriction(username, false, null, null, null);
  }

  toSnapshot(): RouletteRestrictionSnapshot {
    return {
      username: this.username,
      banned: this.banned,
      banReason: this.banReason,
      maxWagerAmount: this.maxWagerAmount,
      timeframe: this.timeframe,
    };
  }

  isBanned(): boolean {
    return this.banned;
  }

  /** Wager cap applies only when both max and timeframe are set and max > 0. */
  hasActiveWagerLimit(): boolean {
    return (
      this.maxWagerAmount != null &&
      this.maxWagerAmount > 0 &&
      this.timeframe != null
    );
  }

  /**
   * @param currentWager — running total already spent in the current Redis window
   */
  canPlaceBet(currentWager: number, betAmount: number): boolean {
    if (this.banned) return false;
    if (!this.hasActiveWagerLimit()) return true;
    const cap = this.maxWagerAmount!;
    return (
      roundMoney(currentWager) + roundMoney(betAmount) <= roundMoney(cap) + 1e-9
    );
  }

  /**
   * Remaining headroom under the cap, or `null` if there is no active wager limit.
   */
  getRemainingLimit(currentWager: number): number | null {
    if (!this.hasActiveWagerLimit()) return null;
    const cap = this.maxWagerAmount!;
    return Math.max(0, roundMoney(cap) - roundMoney(currentWager));
  }

  getMaxWagerAmount(): number | null {
    return this.maxWagerAmount;
  }

  getTimeframe(): RestrictionTimeframe | null {
    return this.timeframe;
  }
}
