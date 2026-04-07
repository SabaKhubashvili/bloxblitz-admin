import { Inject, Injectable } from '@nestjs/common';
import type { ICasesListRepository } from '../domain/cases-list.repository';
import { CASES_LIST_REPOSITORY } from '../infrastructure/cases-list.tokens';
import { CasesListResponseDto } from '../presentation/dto/cases-list.response.dto';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 500;

export type ListCasesPaginatedCommand = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'all' | 'active' | 'disabled';
};

@Injectable()
export class ListCasesPaginatedUseCase {
  constructor(
    @Inject(CASES_LIST_REPOSITORY)
    private readonly repo: ICasesListRepository,
  ) {}

  async execute(cmd: ListCasesPaginatedCommand): Promise<CasesListResponseDto> {
    const page = Math.max(1, cmd.page ?? 1);
    const statusFilter = cmd.status ?? 'all';
    const rawSize = cmd.pageSize ?? DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize | 0));
    const { total, cases } = await this.repo.listPaginated({
      page,
      pageSize,
      search: cmd.search,
      statusFilter,
    });
    const dto = new CasesListResponseDto();
    dto.page = page;
    dto.pageSize = pageSize;
    dto.total = total;
    dto.cases = cases;
    return dto;
  }
}
