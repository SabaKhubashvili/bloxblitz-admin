import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { CASE_COVER_MAX_BYTES } from '../application/case-cover-image.validation';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { GetCasesOverviewUseCase } from '../application/get-cases-overview.use-case';
import { ListCasesPaginatedUseCase } from '../application/list-cases-paginated.use-case';
import { CreateCaseUseCase } from '../application/create-case.use-case';
import { UpdateCaseUseCase } from '../application/update-case.use-case';
import { GetRecentCaseOpensUseCase } from '../application/get-recent-case-opens.use-case';
import { EnableAllCasesUseCase } from '../application/enable-all-cases.use-case';
import { DisableAllCasesUseCase } from '../application/disable-all-cases.use-case';
import type { CasesOverviewResponseDto } from './dto/cases-overview.response.dto';
import { CasesOverviewQueryDto } from './dto/cases-overview.query.dto';
import { CasesListQueryDto } from './dto/cases-list.query.dto';
import type { CasesListResponseDto } from './dto/cases-list.response.dto';
import { CreateCaseBodyDto } from './dto/create-case.body.dto';
import { CreateCaseMultipartBodyDto } from './dto/create-case.multipart.dto';
import { UpdateCaseBodyDto } from './dto/update-case.body.dto';
import { UpdateCaseMultipartBodyDto } from './dto/update-case.multipart.dto';
import type { RecentCaseOpensResponseDto } from './dto/recent-case-opens.response.dto';
import type { BulkCasesStatusResponseDto } from './dto/bulk-cases-status.response.dto';

/** Staff JWT routes must skip `login` / `twoFactor` throttlers (global guard). */
@SkipThrottle({ login: true, twoFactor: true })
@Controller('admin/cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRoles.ADMIN,
  UserRoles.OWNER,
  UserRoles.MODERATOR,
  UserRoles.COMMUNITY_MANAGER,
)
export class CasesOverviewController {
  constructor(
    private readonly getCasesOverview: GetCasesOverviewUseCase,
    private readonly listCasesPaginated: ListCasesPaginatedUseCase,
    private readonly createCase: CreateCaseUseCase,
    private readonly updateCase: UpdateCaseUseCase,
    private readonly getRecentCaseOpens: GetRecentCaseOpensUseCase,
    private readonly enableAllCases: EnableAllCasesUseCase,
    private readonly disableAllCases: DisableAllCasesUseCase,
  ) {}

  @Post('enable-all')
  async enableAll(): Promise<BulkCasesStatusResponseDto> {
    return this.enableAllCases.execute();
  }

  @Post('disable-all')
  async disableAll(): Promise<BulkCasesStatusResponseDto> {
    return this.disableAllCases.execute();
  }

  @Get('recent-opens')
  async recentOpens(): Promise<RecentCaseOpensResponseDto> {
    return this.getRecentCaseOpens.execute();
  }

  @Get('overview')
  async overview(
    @Query() query: CasesOverviewQueryDto,
  ): Promise<CasesOverviewResponseDto> {
    return this.getCasesOverview.execute(query.range);
  }

  @Get('list')
  async list(@Query() query: CasesListQueryDto): Promise<CasesListResponseDto> {
    return this.listCasesPaginated.execute({
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      status: query.status,
    });
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: CASE_COVER_MAX_BYTES },
    }),
  )
  async create(
    @Body() body: CreateCaseMultipartBodyDto,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<{ id: string }> {
    const dto: CreateCaseBodyDto = {
      slug: body.slug,
      name: body.name,
      imageUrl: body.imageUrl ?? null,
      price: body.price,
      variant: body.variant,
      catalogCategory: body.catalogCategory,
      riskLevel: body.riskLevel,
      isActive: body.isActive,
      sortOrder: body.sortOrder,
      items: body.items,
    };
    const coverImage =
      image && image.buffer?.length
        ? {
            buffer: image.buffer,
            mimetype: image.mimetype,
            size: image.size,
          }
        : undefined;
    return this.createCase.execute(dto, coverImage);
  }

  @Patch(':caseId')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: CASE_COVER_MAX_BYTES },
    }),
  )
  async update(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() body: UpdateCaseMultipartBodyDto,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<{ id: string; imageUrl: string | null }> {
    const dto: UpdateCaseBodyDto = {
      name: body.name,
      imageUrl: body.imageUrl ?? null,
      price: body.price,
      isActive: body.isActive,
      items: body.items,
    };
    const coverImage =
      image && image.buffer?.length
        ? {
            buffer: image.buffer,
            mimetype: image.mimetype,
            size: image.size,
          }
        : undefined;
    return this.updateCase.execute(caseId, dto, coverImage);
  }
}
