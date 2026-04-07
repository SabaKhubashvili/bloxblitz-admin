import { InvalidCaseImageError } from '../domain/errors/case-image.errors';

export const CASE_COVER_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type CaseCoverUploadInput = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

export function assertValidCaseCoverUpload(file: CaseCoverUploadInput): void {
  if (!file.buffer?.length) {
    throw new InvalidCaseImageError('Image file is empty');
  }
  if (file.size > CASE_COVER_MAX_BYTES) {
    throw new InvalidCaseImageError('Image must be at most 5MB');
  }
  const mime = (file.mimetype ?? '').toLowerCase().split(';')[0].trim();
  if (!ALLOWED_MIMES.has(mime)) {
    throw new InvalidCaseImageError('Image must be JPEG, PNG, or WebP');
  }
}
