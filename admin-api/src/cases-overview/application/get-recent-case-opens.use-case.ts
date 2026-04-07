import { Inject, Injectable } from '@nestjs/common';
import type { ICasesOverviewRepository } from '../domain/cases-overview.repository';
import { CASES_OVERVIEW_REPOSITORY } from '../infrastructure/cases-overview.tokens';
import { RecentCaseOpensResponseDto } from '../presentation/dto/recent-case-opens.response.dto';

const RECENT_OPENS_LIMIT = 20;

@Injectable()
export class GetRecentCaseOpensUseCase {
  constructor(
    @Inject(CASES_OVERVIEW_REPOSITORY)
    private readonly repo: ICasesOverviewRepository,
  ) {}

  async execute(): Promise<RecentCaseOpensResponseDto> {
    const rows = await this.repo.findRecentOpens(RECENT_OPENS_LIMIT);
    return RecentCaseOpensResponseDto.fromRows(rows);
  }
}
