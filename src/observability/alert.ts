/**
 * Critical-failure alerting hook. Emits a structured error log flagged
 * `alert: true` — the single integration point for paging/webhooks (e.g. wire a
 * transport that forwards `alert:true` entries to Slack/PagerDuty). Never throws.
 * Sensitive fields are redacted by the logger.
 */
import { logger } from './logger.js';

export function alertCritical(event: string, fields: Record<string, unknown> = {}): void {
  try {
    logger.error(`alert:${event}`, { alert: true, alertEvent: event, ...fields });
  } catch {
    // alerting must never break the caller
  }
}
