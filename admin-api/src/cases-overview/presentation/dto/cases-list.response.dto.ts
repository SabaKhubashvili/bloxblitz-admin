import type { CaseListRow } from '../../domain/cases-list.repository';

export class CasesListResponseDto {
  page: number;
  pageSize: number;
  total: number;
  cases: CaseListRow[];
}
