import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from '../auth/presentation/jwt-auth.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { CrashChainAdminService } from './crash-chain-admin.service';
import { CreateCrashChainBodyDto } from './presentation/dto/create-crash-chain.body.dto';
import { CrashPrecalculateBodyDto } from './presentation/dto/precalculate.body.dto';
import { SetCrashClientSeedBodyDto } from './presentation/dto/set-crash-client-seed.body.dto';

/** Staff JWT routes must skip `login` / `twoFactor` throttlers (global guard). */
@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/crash/chains')
@UseGuards(JwtAuthGuard, RolesGuard)
/** Server seeds are secret; keep this surface ADMIN/OWNER only. */
@Roles(UserRoles.ADMIN, UserRoles.OWNER)
export class CrashChainAdminController {
  constructor(private readonly crashChainAdmin: CrashChainAdminService) {}

  @Get()
  list(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 50;
    return this.crashChainAdmin.listChains(Number.isFinite(n) ? n : 50);
  }

  @Get('active/statistics')
  activeStatistics() {
    return this.crashChainAdmin.getActiveChainStatistics();
  }

  @Get('active')
  active() {
    return this.crashChainAdmin.getActiveChain();
  }

  @Post('precalculate')
  precalculate(@Body() body: CrashPrecalculateBodyDto) {
    return this.crashChainAdmin.precalculateActiveChain(body.count);
  }

  @Post()
  create(@Body() body: CreateCrashChainBodyDto) {
    return this.crashChainAdmin.createCrashChain({
      preset: body.preset,
      totalRounds: body.totalRounds,
    });
  }

  @Patch(':chainId/client-seed')
  setClientSeed(
    @Param('chainId') chainId: string,
    @Body() body: SetCrashClientSeedBodyDto,
  ) {
    return this.crashChainAdmin.setClientSeedAndActivate(chainId, body.clientSeed);
  }

  @Get(':chainId')
  byId(@Param('chainId') chainId: string) {
    return this.crashChainAdmin.getChainById(chainId);
  }
}
