# RUNBOOK — MentorMatch

> Operational guide. As of Slice 0.2 it covers the observability foundation only
> (logs, errors, audit). Deploy/rollback specifics live in `docs/DEPLOYMENT.md`.

## 1. Local commands

```bash
npm install        # install dev dependencies
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm test           # vitest run (unit tests)
npm run test:watch # vitest watch mode
```

## 2. Logs

- Format: **one JSON object per line** with at least `timestamp`, `level`,
  `message`, and (when in a request) `requestId` and `tenantId`.
- Levels: `debug` < `info` < `warn` < `error`. Default level is `info`
  (`debug` when `APP_ENV=development`).
- **Correlation:** filter by `requestId` to follow a single request; by `tenantId`
  to scope to one tenant.

### Reading logs on Vercel
Use the Vercel project → Logs (or `vercel logs <deployment>` once the CLI is set
up). Search by `requestId`/`tenantId`. Entries are JSON; pipe through `jq` if
exporting.

### Guarantee
Logs are redacted at the source — secrets and ContactInfo are masked
(`[REDACTED]`, `[REDACTED_EMAIL]`, …). If you ever see an unmasked secret in a log,
treat it as an incident (see §5) and add the leaking key/pattern to
`src/observability/redaction.ts` with a test.

## 3. Errors

- All deliberate errors are `AppError` with a stable `code` and `httpStatus`.
- `expected: true` → operational (client-safe). `expected: false` → bug/internal.
- Serialized errors are redacted and contain **no stack** — safe to log/return.
- To inspect: search logs for the error `code` and the originating `requestId`.

## 4. Audit events

- Emitted via `auditLogger.record({ action, ... })`. Default sink logs a structured
  line tagged `audit: true`. No audit UI/persistence yet.
- Actions: `auth.login`, `auth.logout`, `consent.recorded`, `tenant.created`,
  `role.changed`, `contact_info.revealed`, `data.exported`, `data.deleted`.
- Metadata is redacted; events carry actor/target/requestId/tenantId, not raw
  ContactInfo.

## 5. Incident: suspected secret/PII in logs

1. Identify the field/pattern that leaked.
2. Add it to `redaction.ts` (`SENSITIVE_KEYS` / `SENSITIVE_KEY_SUBSTRINGS` or a
   value `PATTERN`) and add a failing-then-passing test.
3. Run `npm run typecheck && npm run lint && npm test`.
4. If a real secret was exposed in a deployed log, **rotate** it (see
   `docs/ENVIRONMENT.md` §6) and purge logs where possible.

## 6. Wiring Sentry (future)
The hook exists: call `setErrorReporter(adapter)` at startup once a Sentry adapter
is available; `reportError()` will forward with redacted context. Until then it is a
no-op (nothing leaves the process).

## 7. Health checklist (pre-merge)
- [ ] `npm run typecheck` green
- [ ] `npm run lint` green
- [ ] `npm test` green
- [ ] No new code logs raw secrets/ContactInfo (covered by redaction tests)
