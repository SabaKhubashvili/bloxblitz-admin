import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import {
  CoinflipBotsAdminService,
  type CreateCoinflipBotInput,
  type UpdateCoinflipBotInput,
} from '../application/coinflip-bots-admin.service';

class CoinflipBotConfigDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  minBet?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  maxBet?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  joinDelayMinMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  joinDelayMaxMs?: number;

  @IsOptional()
  @IsNumber()
  behaviorTier?: 0 | 1 | 2;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  selectionWeight?: number;
}

class CreateCoinflipBotBodyDto {
  @IsString()
  @MinLength(2)
  username!: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialBalance?: number;

  @IsOptional()
  @IsObject()
  config?: CoinflipBotConfigDto;
}

class UpdateCoinflipBotBodyDto {
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsObject()
  config?: CoinflipBotConfigDto;
}

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/coinflip/bots')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class CoinflipBotsController {
  constructor(private readonly coinflipBots: CoinflipBotsAdminService) {}

  @Get()
  async list() {
    return this.coinflipBots.listBotsFromDb();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateCoinflipBotBodyDto) {
    const input: CreateCoinflipBotInput = {
      username: body.username,
      profilePicture: body.profilePicture,
      initialBalance: body.initialBalance,
      config: body.config ?? {},
    };
    return this.coinflipBots.createBot(input);
  }

  @Patch(':username')
  async update(
    @Param('username') username: string,
    @Body() body: UpdateCoinflipBotBodyDto,
  ) {
    const input: UpdateCoinflipBotInput = {
      profilePicture: body.profilePicture,
      config: body.config,
    };
    return this.coinflipBots.updateBot(username, input);
  }

  @Delete(':username')
  async remove(@Param('username') username: string) {
    return this.coinflipBots.deleteBot(username);
  }

  @Post('resync')
  @HttpCode(HttpStatus.OK)
  async resync() {
    const n = await this.coinflipBots.syncAllBotsToRedis();
    return { ok: true, count: n };
  }
}
