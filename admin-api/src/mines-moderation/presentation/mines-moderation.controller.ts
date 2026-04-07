import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { ClearMinesModerationUseCase } from '../application/clear-mines-moderation.use-case';
import { ListMinesModerationUseCase } from '../application/list-mines-moderation.use-case';
import { UnbanMinesPlayerUseCase } from '../application/unban-mines-player.use-case';
import { UnlimitMinesPlayerUseCase } from '../application/unlimit-mines-player.use-case';
import { UpsertMinesModerationUseCase } from '../application/upsert-mines-moderation.use-case';
import { MinesModerationListQueryDto } from './dto/mines-moderation-list.query.dto';
import { MinesModerationUpsertBodyDto } from './dto/mines-moderation-upsert.body.dto';

@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/mines/moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class MinesModerationController {
  constructor(
    private readonly listMinesModeration: ListMinesModerationUseCase,
    private readonly upsertMinesModeration: UpsertMinesModerationUseCase,
    private readonly clearMinesModeration: ClearMinesModerationUseCase,
    private readonly unbanMinesPlayer: UnbanMinesPlayerUseCase,
    private readonly unlimitMinesPlayer: UnlimitMinesPlayerUseCase,
  ) {}

  @Get()
  async list(@Query() query: MinesModerationListQueryDto) {
    return this.listMinesModeration.execute({
      status: query.status,
      search: query.search,
    });
  }

  @Put(':username')
  async upsert(
    @Param('username') usernameRaw: string,
    @Body() body: MinesModerationUpsertBodyDto,
  ) {
    const username = normalizeUsernameParam(usernameRaw);
    return this.upsertMinesModeration.execute(username, body);
  }

  @Delete(':username')
  @HttpCode(HttpStatus.OK)
  async clear(@Param('username') usernameRaw: string) {
    const username = normalizeUsernameParam(usernameRaw);
    return this.clearMinesModeration.execute(username);
  }

  @Post(':username/unban')
  @HttpCode(HttpStatus.OK)
  async unban(@Param('username') usernameRaw: string) {
    const username = normalizeUsernameParam(usernameRaw);
    return this.unbanMinesPlayer.execute(username);
  }

  @Post(':username/unlimit')
  @HttpCode(HttpStatus.OK)
  async unlimit(@Param('username') usernameRaw: string) {
    const username = normalizeUsernameParam(usernameRaw);
    return this.unlimitMinesPlayer.execute(username);
  }
}

function normalizeUsernameParam(raw: string): string {
  let username: string;
  try {
    username = decodeURIComponent(raw).trim();
  } catch {
    throw new BadRequestException('Invalid username.');
  }
  if (!username.length || username.length > 64) {
    throw new BadRequestException('Invalid username.');
  }
  return username;
}
