import type { PetValueColumnRow } from "@/lib/case-item-pet-value";
import { adminApiClientFetch } from "./client-fetch";

export type CaseListCaseItemApi = {
  id: string;
  petId: number;
  name: string;
  value: number;
  variant: string[];
  dropChance: number;
  imageUrl: string | null;
  rarity: string;
  petValues: PetValueColumnRow;
};

export type CaseListItemApi = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  opened: number;
  status: "active" | "disabled";
  createdAt: string;
  caseItems: CaseListCaseItemApi[];
};

export type CasesListApiResponse = {
  page: number;
  pageSize: number;
  total: number;
  cases: CaseListItemApi[];
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCasesList(
  params: {
    page: number;
    pageSize?: number;
    search?: string;
    status: "all" | "active" | "disabled";
  },
  init?: RequestInit,
): Promise<CasesListApiResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.status !== "all") q.set("status", params.status);
  const res = await adminApiClientFetch(`/admin/cases/list?${q}`, init);
  return parseJson<CasesListApiResponse>(res);
}
