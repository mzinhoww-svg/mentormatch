# TESTING — MentorMatch

> Living document. As of Slice 0.2 the suite covers the observability foundation.

## 1. Tooling
- **Runner:** Vitest (`vitest run`), Node environment.
- **Location:** co-located under `src/**/__tests__/*.test.ts`.
- **Commands:** `npm test` (CI), `npm run test:watch` (local).
- Coverage configured via `vitest.config.ts` (v8 provider).

## 2. Gates (must be green before merge / next slice)
| Gate | Command |
|---|---|
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests | `npm test` |

Integration tests against Postgres are **not** part of this slice (no DB code yet);
they will be added when Prisma/data access lands.

## 3. Current coverage (Slice 0.2)

`src/observability/__tests__/` — **51 tests across 5 files**:

| File | Focus |
|---|---|
| `redaction.test.ts` | sensitive-key detection; value patterns (connection strings, Bearer, JWT, email/CPF/phone, env assignments); deep/array/circular redaction; Error reduction |
| `logger.test.ts` | **logger never prints secrets**; message scrubbing; ContactInfo masking; accepts `requestId`; accepts `tenantId`; context fallback + override; level threshold; child bindings; entry shape |
| `request-context.test.ts` | ALS storage in/out of request; nesting isolation; `generateRequestId` uniqueness/format; header resolution; `createRequestContext` precedence |
| `errors.test.ts` | `AppError` shape + status mapping; redacted `toJSON` (no stack); guards/factories; `toAppError` normalization; reporter hook (no-op, forward-redacted, swallow failures) |
| `audit.test.ts` | `buildAuditEvent` payload + context pull + precedence; **metadata redaction**; full action taxonomy; sink delivery; default-sink no-leak |

## 4. Mapping to Definition of Done
- *logger does not print a secret* → `logger.test.ts` (“secrets” block).
- *logger accepts tenantId / requestId* → `logger.test.ts` (“context” block) +
  `request-context.test.ts`.
- *audit logger creates expected payload* → `audit.test.ts`.
- *errors have a consistent format* → `errors.test.ts`.
- *masking works* → `redaction.test.ts` (+ asserted in logger/errors/audit).

## 5. Conventions
- Inject seams instead of mocking globals: logger `transport`, audit `sink`, clock
  `now`, error `reporter`.
- Assert **absence** of the raw secret (`not.toContain`) in addition to presence of
  the `[REDACTED]` marker.
- Keep tests deterministic (fixed `now`, explicit ids where shape matters).

## 6. Adding tests for new redaction rules
When you add a key/pattern to `redaction.ts`, add a paired test asserting the raw
value is absent from the output. This keeps the security guarantee enforced.
