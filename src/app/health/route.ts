/**
 * Liveness/health endpoint. Returns a static JSON payload — no DB, no tenant,
 * no secrets. Useful for deploy smoke tests (see docs/RUNBOOK.md).
 */
export function GET() {
  return Response.json({ status: 'ok', service: 'mentormatch' });
}
