import { describe, it, expect, afterEach } from 'vitest';
import {
  AppError,
  isAppError,
  expectedError,
  unexpectedError,
  toAppError,
  serializeError,
  setErrorReporter,
  reportError,
} from '../errors.js';
import { ErrorCode } from '../error-codes.js';

describe('AppError', () => {
  it('has a consistent shape with defaults', () => {
    const err = new AppError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.code).toBe(ErrorCode.INTERNAL);
    expect(err.httpStatus).toBe(500);
    expect(err.expected).toBe(false);
  });

  it('maps code to default http status', () => {
    expect(new AppError('x', { code: ErrorCode.NOT_FOUND }).httpStatus).toBe(404);
    expect(new AppError('x', { code: ErrorCode.VALIDATION }).httpStatus).toBe(400);
    expect(new AppError('x', { code: ErrorCode.UNAUTHORIZED }).httpStatus).toBe(401);
  });

  it('serializes to a stable, redacted JSON form', () => {
    const err = new AppError('failure for a@b.com', {
      code: ErrorCode.FORBIDDEN,
      expected: true,
      context: { password: 'hunter2', tenantId: 't-1' },
    });
    const json = err.toJSON();
    expect(json).toMatchObject({
      name: 'AppError',
      code: ErrorCode.FORBIDDEN,
      httpStatus: 403,
      expected: true,
    });
    expect(json.message).toContain('[REDACTED_EMAIL]');
    expect(json.context?.password).toBe('[REDACTED]');
    expect(json.context?.tenantId).toBe('t-1');
    expect(JSON.stringify(json)).not.toContain('hunter2');
  });
});

describe('error guards and factories', () => {
  it('isAppError distinguishes AppError', () => {
    expect(isAppError(new AppError('x'))).toBe(true);
    expect(isAppError(new Error('x'))).toBe(false);
    expect(isAppError('x')).toBe(false);
  });

  it('expectedError marks operational errors', () => {
    const err = expectedError(ErrorCode.VALIDATION, 'bad input');
    expect(err.expected).toBe(true);
    expect(err.code).toBe(ErrorCode.VALIDATION);
  });

  it('unexpectedError marks bugs', () => {
    const err = unexpectedError('oops');
    expect(err.expected).toBe(false);
    expect(err.code).toBe(ErrorCode.INTERNAL);
  });
});

describe('normalization', () => {
  it('toAppError passes AppError through', () => {
    const original = new AppError('x', { code: ErrorCode.CONFLICT });
    expect(toAppError(original)).toBe(original);
  });

  it('toAppError wraps a native Error', () => {
    const wrapped = toAppError(new Error('native'));
    expect(wrapped).toBeInstanceOf(AppError);
    expect(wrapped.code).toBe(ErrorCode.INTERNAL);
    expect(wrapped.message).toBe('native');
  });

  it('toAppError wraps non-error throwables', () => {
    const wrapped = toAppError('string thrown');
    expect(wrapped.code).toBe(ErrorCode.UNKNOWN);
  });

  it('serializeError works on any value and never includes a stack', () => {
    const json = serializeError(new Error('plain'));
    expect(json.code).toBe(ErrorCode.INTERNAL);
    expect(json).not.toHaveProperty('stack');
  });
});

describe('error reporter hook (Sentry prep)', () => {
  afterEach(() => setErrorReporter(undefined));

  it('logs via the default reporter and never throws', () => {
    expect(() => reportError(new Error('x'))).not.toThrow();
  });

  it('forwards to the reporter with redacted context', () => {
    const calls: Array<{ error: unknown; context?: Record<string, unknown> }> = [];
    setErrorReporter((error, context) => calls.push({ error, context }));
    reportError(new Error('x'), { password: 'hunter2', tenantId: 't-1' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.context?.password).toBe('[REDACTED]');
    expect(calls[0]?.context?.tenantId).toBe('t-1');
  });

  it('swallows reporter failures', () => {
    setErrorReporter(() => {
      throw new Error('reporter down');
    });
    expect(() => reportError(new Error('x'))).not.toThrow();
  });
});
