/**
 * Central structured logger.
 *
 * - Emits one JSON object per log line.
 * - Automatically enriches every entry with `requestId` / `tenantId` from the
 *   active request context (explicit fields win over context).
 * - Redacts every field and the message itself, so secrets and ContactInfo can
 *   never be printed (see redaction.ts).
 * - Transport is injectable, which keeps it framework-agnostic and testable.
 */

import { getRequestContext } from './request-context.js';
import { redact, redactString } from './redaction.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type LogFields = Record<string, unknown>;

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  tenantId?: string;
  [key: string]: unknown;
}

export type LogTransport = (entry: LogEntry) => void;

export interface LoggerOptions {
  /** Minimum level to emit. Default: 'info' (or 'debug' when APP_ENV=development). */
  level?: LogLevel;
  /** Where entries go. Default: console, one JSON line per entry. */
  transport?: LogTransport;
  /** Fields merged into every entry (e.g. service name). */
  base?: LogFields;
  /** Clock, for testability. */
  now?: () => string;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /** Returns a logger that always includes `bindings`. */
  child(bindings: LogFields): Logger;
}

function defaultLevel(): LogLevel {
  return process.env.APP_ENV === 'development' ? 'debug' : 'info';
}

const consoleTransport: LogTransport = (entry) => {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case 'debug':
      console.debug(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
    default:
      console.info(line);
  }
};

export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? defaultLevel();
  const threshold = LEVEL_WEIGHT[level];
  const transport = options.transport ?? consoleTransport;
  const now = options.now ?? (() => new Date().toISOString());
  const base = options.base ?? {};

  function emit(entryLevel: LogLevel, message: string, fields?: LogFields): void {
    if (LEVEL_WEIGHT[entryLevel] < threshold) return;

    const merged: LogFields = { ...base, ...fields };
    const ctx = getRequestContext();

    // requestId/tenantId: explicit field wins, else fall back to context.
    const requestId =
      (typeof merged.requestId === 'string' ? merged.requestId : undefined) ?? ctx?.requestId;
    const tenantId =
      (typeof merged.tenantId === 'string' ? merged.tenantId : undefined) ?? ctx?.tenantId;
    delete merged.requestId;
    delete merged.tenantId;

    const safeFields = redact(merged) as LogFields;

    const entry: LogEntry = {
      timestamp: now(),
      level: entryLevel,
      message: redactString(message),
      ...(requestId !== undefined ? { requestId } : {}),
      ...(tenantId !== undefined ? { tenantId } : {}),
      ...safeFields,
    };

    transport(entry);
  }

  const logger: Logger = {
    debug: (message, fields) => emit('debug', message, fields),
    info: (message, fields) => emit('info', message, fields),
    warn: (message, fields) => emit('warn', message, fields),
    error: (message, fields) => emit('error', message, fields),
    child: (bindings) =>
      createLogger({ ...options, level, transport, now, base: { ...base, ...bindings } }),
  };

  return logger;
}

/** Default application logger. */
export const logger = createLogger({ base: { service: 'mentormatch' } });
