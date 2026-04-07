import type { PetValueColumnRow } from './case-item-pet-value';

export type CaseListCaseItemRow = {
  /** `case_items.id` */
  id: string;
  /** `pets.id` */
  petId: number;
  name: string;
  value: number;
  variant: string[];
  dropChance: number;
  imageUrl: string | null;
  rarity: string;
  petValues: PetValueColumnRow;
};

export type CaseListRow = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  opened: number;
  status: 'active' | 'disabled';
  createdAt: string;
  caseItems: CaseListCaseItemRow[];
};

export type ListCasesPaginatedInput = {
  page: number;
  pageSize: number;
  search?: string;
  statusFilter: 'all' | 'active' | 'disabled';
};

export interface ICasesListRepository {
  listPaginated(
    input: ListCasesPaginatedInput,
  ): Promise<{ total: number; cases: CaseListRow[] }>;
}
