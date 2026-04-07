import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { RewardCasesAdminService } from '../application/reward-cases-admin.service';
import { ListRewardCasesQueryDto } from './dto/list-reward-cases.query.dto';
import { CreateRewardCaseBodyDto } from './dto/create-reward-case.body.dto';
import { UpdateRewardCaseBodyDto } from './dto/update-reward-case.body.dto';
import {
  CreateRewardCaseItemBodyDto,
  UpdateRewardCaseItemBodyDto,
} from './dto/reward-case-item.body.dto';
import { RewardActivityQueryDto } from './dto/activity.query.dto';
import { RewardOpensQueryDto } from './dto/opens.query.dto';

/** Staff JWT routes must skip `login` / `twoFactor` throttlers (global guard). */
@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/reward-cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class RewardCasesController {
  constructor(private readonly rewardCases: RewardCasesAdminService) {}

  @Get()
  list(@Query() query: ListRewardCasesQueryDto) {
    return this.rewardCases.listDefinitions(query);
  }

  @Get('activity')
  activity(@Query() query: RewardActivityQueryDto) {
    return this.rewardCases.listActivity(query);
  }

  @Get('opens')
  opens(@Query() query: RewardOpensQueryDto) {
    return this.rewardCases.listOpens(query);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rewardCases.getDefinition(id);
  }

  @Post()
  create(@Body() body: CreateRewardCaseBodyDto) {
    return this.rewardCases.createDefinition(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRewardCaseBodyDto,
  ) {
    return this.rewardCases.updateDefinition(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rewardCases.deleteDefinition(id);
  }

  @Post(':id/items')
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateRewardCaseItemBodyDto,
  ) {
    return this.rewardCases.addPoolItem(id, body);
  }

  @Patch(':id/items/:itemId')
  patchItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: UpdateRewardCaseItemBodyDto,
  ) {
    return this.rewardCases.updatePoolItem(id, itemId, body);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.rewardCases.deletePoolItem(id, itemId);
  }
}
