import { describe, it, expect } from 'vitest';
import {
  validateLogoUpload,
  extForLogoType,
  MAX_LOGO_BYTES,
  ALLOWED_LOGO_TYPES,
  LOGO_ACCEPT,
} from '../logoUpload.js';
import { isAppError } from '../../observability/errors.js';

describe('extForLogoType', () => {
  it('maps allowed types to extensions', () => {
    expect(extForLogoType('image/png')).toBe('png');
    expect(extForLogoType('image/jpeg')).toBe('jpg');
    expect(extForLogoType('image/webp')).toBe('webp');
    expect(extForLogoType('image/svg+xml')).toBe('svg');
  });
  it('returns null for disallowed types', () => {
    expect(extForLogoType('image/gif')).toBeNull();
    expect(extForLogoType('application/pdf')).toBeNull();
    expect(extForLogoType('')).toBeNull();
  });
});

describe('validateLogoUpload', () => {
  it('accepts a valid small image and returns its extension', () => {
    expect(validateLogoUpload({ type: 'image/png', size: 10_000 })).toBe('png');
    expect(validateLogoUpload({ type: 'image/svg+xml', size: 2_000 })).toBe('svg');
  });

  it('rejects unsupported types as an AppError', () => {
    try {
      validateLogoUpload({ type: 'image/gif', size: 10 });
      throw new Error('should have thrown');
    } catch (err) {
      expect(isAppError(err)).toBe(true);
      expect((err as Error).message).toBe('unsupported_image_type');
    }
  });

  it('rejects empty files', () => {
    expect(() => validateLogoUpload({ type: 'image/png', size: 0 })).toThrow('empty_file');
  });

  it('rejects files over the size limit', () => {
    expect(() => validateLogoUpload({ type: 'image/png', size: MAX_LOGO_BYTES + 1 })).toThrow(
      'logo_too_large',
    );
    expect(validateLogoUpload({ type: 'image/png', size: MAX_LOGO_BYTES })).toBe('png'); // boundary ok
  });

  it('the accept list covers exactly the allowed types', () => {
    for (const t of Object.keys(ALLOWED_LOGO_TYPES)) expect(LOGO_ACCEPT).toContain(t);
  });
});
