import type { PetValueColumnRow } from "@/lib/case-item-pet-value";
import { adminApiClientFetch } from "./client-fetch";

export type PetSnapshotApi = {
  id: number;
  name: string;
  image: string;
  rarity: string;
  values: PetValueColumnRow;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchPetSnapshot(
  petId: number,
  init?: RequestInit,
): Promise<PetSnapshotApi> {
  const res = await adminApiClientFetch(`/admin/pets/${petId}`, init);
  return parseJson<PetSnapshotApi>(res);
}

/**
 * Case-insensitive partial name match (admin-api uses ILIKE semantics on `pets.name`).
 * Query is normalized to lowercase for consistency.
 */
export async function searchPetsByName(
  rawQuery: string,
  init?: RequestInit,
): Promise<PetSnapshotApi[]> {
  const q = rawQuery.trim().toLowerCase();
  if (q.length === 0) return [];
  const params = new URLSearchParams({ q });
  const res = await adminApiClientFetch(
    `/admin/pets/search?${params.toString()}`,
    init,
  );
  return parseJson<PetSnapshotApi[]>(res);
}
