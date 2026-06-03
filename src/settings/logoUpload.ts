/**
 * Pure validation for tenant logo uploads (type + size). Kept transport-agnostic
 * and side-effect free so it can be unit-tested without a request or Blob store.
 */
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';

/** Max accepted logo size. Logos are small marks, not photos. */
export const MAX_LOGO_BYTES = 512 * 1024; // 512 KB

/** Allowed logo mime types → file extension (used for the Blob object key). */
export const ALLOWED_LOGO_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/** Comma-separated accept list for the file input. */
export const LOGO_ACCEPT = Object.keys(ALLOWED_LOGO_TYPES).join(',');

export function extForLogoType(type: string): string | null {
  return ALLOWED_LOGO_TYPES[type] ?? null;
}

export interface UploadedFileMeta {
  type: string;
  size: number;
}

/**
 * Validates a logo upload. Throws a VALIDATION error on a disallowed type, an
 * empty file, or a file over MAX_LOGO_BYTES. Returns the extension to store.
 */
export function validateLogoUpload(file: UploadedFileMeta): string {
  const ext = extForLogoType(file.type);
  if (!ext) throw expectedError(ErrorCode.VALIDATION, 'unsupported_image_type');
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw expectedError(ErrorCode.VALIDATION, 'empty_file');
  }
  if (file.size > MAX_LOGO_BYTES) throw expectedError(ErrorCode.VALIDATION, 'logo_too_large');
  return ext;
}
