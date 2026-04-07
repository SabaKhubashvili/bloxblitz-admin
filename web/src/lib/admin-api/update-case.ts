import { adminApiClientFetch } from "./client-fetch";

export type UpdateCaseItemPayload = {
  id: string;
  petId: number;
  dropChance: number;
  sortOrder: number;
  variant: string[];
};

export type UpdateCasePayload = {
  name: string;
  imageUrl: string | null;
  price: number;
  isActive: boolean;
  items: UpdateCaseItemPayload[];
};

export type UpdateCaseOptions = {
  /** When set, image is optimized and stored as a new object `cases/{caseId}/{uuid}.webp` on R2. */
  coverImage?: File | null;
};

export type UpdateCaseResponse = {
  id: string;
  imageUrl: string | null;
};

export async function updateCase(
  caseId: string,
  body: UpdateCasePayload,
  options?: UpdateCaseOptions,
): Promise<UpdateCaseResponse> {
  const fd = new FormData();
  fd.append("name", body.name);
  fd.append("price", String(body.price));
  fd.append("isActive", String(body.isActive));
  fd.append("items", JSON.stringify(body.items));
  if (body.imageUrl != null && body.imageUrl !== "") {
    fd.append("imageUrl", body.imageUrl);
  }
  if (options?.coverImage) {
    fd.append("image", options.coverImage);
  }

  const res = await adminApiClientFetch(`/admin/cases/${caseId}`, {
    method: "PATCH",
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<UpdateCaseResponse>;
}
