import type { RecentCaseOpenRow } from '../../domain/cases-overview.repository';

export class RecentCaseOpenItemDto {
  id!: string;
  username!: string;
  caseName!: string;
  itemWon!: string;
  itemValue!: number;
  openedAt!: string;
}

export class RecentCaseOpensResponseDto {
  opens!: RecentCaseOpenItemDto[];

  static fromRows(rows: RecentCaseOpenRow[]): RecentCaseOpensResponseDto {
    const dto = new RecentCaseOpensResponseDto();
    dto.opens = rows.map((r) => {
      const item = new RecentCaseOpenItemDto();
      item.id = r.id;
      item.username = r.userUsername;
      item.caseName = r.caseName;
      item.itemWon = r.itemWon;
      item.itemValue = r.wonItemValue;
      item.openedAt = r.createdAt.toISOString();
      return item;
    });
    return dto;
  }
}
