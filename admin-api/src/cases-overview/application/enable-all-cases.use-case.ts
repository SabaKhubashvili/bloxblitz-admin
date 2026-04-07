import { Inject, Injectable } from '@nestjs/common';
import type { ICasesOverviewRepository } from '../domain/cases-overview.repository';
import { CASES_OVERVIEW_REPOSITORY } from '../infrastructure/cases-overview.tokens';
import { CaseAmpCacheInvalidationService } from '../infrastructure/case-amp-cache-invalidation.service';
import { BulkCasesStatusResponseDto } from '../presentation/dto/bulk-cases-status.response.dto';

@Injectable()
export class EnableAllCasesUseCase {
  constructor(
    @Inject(CASES_OVERVIEW_REPOSITORY)
    private readonly repo: ICasesOverviewRepository,
    private readonly caseAmpCache: CaseAmpCacheInvalidationService,
  ) {}

  async execute(): Promise<BulkCasesStatusResponseDto> {
    const slugs = await this.repo.findAllCaseSlugs();
    const updatedCount = await this.repo.setAllCasesActive(true);
    await this.caseAmpCache.invalidateAfterBulkCaseMutations(slugs);
    return BulkCasesStatusResponseDto.ok(updatedCount);
  }
}
