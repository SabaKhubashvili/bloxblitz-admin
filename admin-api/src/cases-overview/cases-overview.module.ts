import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { GetCasesOverviewUseCase } from './application/get-cases-overview.use-case';
import { CreateCaseUseCase } from './application/create-case.use-case';
import { ListCasesPaginatedUseCase } from './application/list-cases-paginated.use-case';
import { UpdateCaseUseCase } from './application/update-case.use-case';
import { GetRecentCaseOpensUseCase } from './application/get-recent-case-opens.use-case';
import { EnableAllCasesUseCase } from './application/enable-all-cases.use-case';
import { DisableAllCasesUseCase } from './application/disable-all-cases.use-case';
import { CASES_LIST_REPOSITORY } from './infrastructure/cases-list.tokens';
import { CASES_OVERVIEW_REPOSITORY } from './infrastructure/cases-overview.tokens';
import {
  IMAGE_PROCESSOR_SERVICE,
  STORAGE_SERVICE,
} from './infrastructure/case-image.tokens';
import { PrismaCasesListRepository } from './infrastructure/prisma-cases-list.repository';
import { PrismaCasesOverviewRepository } from './infrastructure/prisma-cases-overview.repository';
import { CasesOverviewController } from './presentation/cases-overview.controller';
import { CaseAmpCacheInvalidationService } from './infrastructure/case-amp-cache-invalidation.service';
import { CloudflareR2StorageService } from './infrastructure/cloudflare-r2-storage.service';
import { SharpImageProcessorService } from './infrastructure/sharp-image-processor.service';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule],
  controllers: [CasesOverviewController],
  providers: [
    CaseAmpCacheInvalidationService,
    CloudflareR2StorageService,
    SharpImageProcessorService,
    {
      provide: STORAGE_SERVICE,
      useExisting: CloudflareR2StorageService,
    },
    {
      provide: IMAGE_PROCESSOR_SERVICE,
      useExisting: SharpImageProcessorService,
    },
    PrismaCasesOverviewRepository,
    PrismaCasesListRepository,
    {
      provide: CASES_OVERVIEW_REPOSITORY,
      useExisting: PrismaCasesOverviewRepository,
    },
    {
      provide: CASES_LIST_REPOSITORY,
      useExisting: PrismaCasesListRepository,
    },
    GetCasesOverviewUseCase,
    ListCasesPaginatedUseCase,
    CreateCaseUseCase,
    UpdateCaseUseCase,
    GetRecentCaseOpensUseCase,
    EnableAllCasesUseCase,
    DisableAllCasesUseCase,
  ],
})
export class CasesOverviewModule {}
