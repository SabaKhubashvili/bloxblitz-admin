export type CasesOverviewAggregate = {
  totalCases: number;
  activeCases: number;
  totalOpened: number;
  totalRevenue: number;
};

/** Row for global “recent opens” feed (joined for display). */
export type RecentCaseOpenRow = {
  id: string;
  userUsername: string;
  caseName: string;
  itemWon: string;
  wonItemValue: number;
  createdAt: Date;
};

export interface ICasesOverviewRepository {
  aggregateOverview(
    opensFromInclusive: Date,
    opensToExclusive: Date,
  ): Promise<CasesOverviewAggregate>;

  findRecentOpens(limit: number): Promise<RecentCaseOpenRow[]>;

  /** All case slugs (for cache invalidation after bulk updates). */
  findAllCaseSlugs(): Promise<string[]>;

  /** Single-query bulk activation toggle; returns number of rows updated. */
  setAllCasesActive(isActive: boolean): Promise<number>;
}
