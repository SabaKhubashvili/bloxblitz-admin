import { adminApiClientFetch } from "./client-fetch";

/** Must match admin-api `R2_CDN_PUBLIC_BASE_URL` + `/cases/{id}.webp` */
export const CASE_COVER_CDN_BASE = "https://cdn.bloxblitz.com";

export type CreateCaseItemPayload = {
  petId: number;
  dropChance: number;
  sortOrder: number;
  variant: string[];
};

export type CaseVariantPayload = "FEATURED" | "STANDARD" | "HIGH_RISK";

export type CreateCasePayload = {
  slug: string;
  name: string;
  /** Stored when no file upload (e.g. external image URL). */
  imageUrl?: string | null;
  /** Uploaded as multipart `image`; optimized server-side and stored as CDN URL. */
  coverImage?: File | null;
  price: number;
  variant: CaseVariantPayload;
  catalogCategory?: "AMP" | "MM2";
  riskLevel?: number;
  isActive: boolean;
  sortOrder?: number;
  items: CreateCaseItemPayload[];
};

export async function createCase(
  body: CreateCasePayload,
): Promise<{ id: string }> {
  const fd = new FormData();
  fd.append("slug", body.slug);
  fd.append("name", body.name);
  fd.append("price", String(body.price));
  fd.append("variant", body.variant);
  fd.append("isActive", String(body.isActive));
  if (body.catalogCategory != null) {
    fd.append("catalogCategory", body.catalogCategory);
  }
  if (body.riskLevel != null) {
    fd.append("riskLevel", String(body.riskLevel));
  }
  if (body.sortOrder != null) {
    fd.append("sortOrder", String(body.sortOrder));
  }
  if (body.coverImage) {
    fd.append("image", body.coverImage);
  } else if (body.imageUrl != null && body.imageUrl !== "") {
    fd.append("imageUrl", body.imageUrl);
  }
  fd.append("items", JSON.stringify(body.items));

  const res = await adminApiClientFetch(`/admin/cases`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ id: string }>;
}
