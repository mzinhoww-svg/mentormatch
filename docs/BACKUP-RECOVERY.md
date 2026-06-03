# Backup, Recovery & Operational Checklist

Operational runbook for MentorMatch in production (Supabase Postgres + Vercel).
This documents strategy and drills; it is **not** application code.

## 1. Backup strategy (database)

- **Managed backups (primary):** enable Supabase **daily backups** and, on paid tiers,
  **Point-in-Time Recovery (PITR)**. Retention ≥ 7 days (≥ 30 recommended).
- **Schema as code:** all schema lives in `prisma/migrations/0001..0011`. A database
  can be rebuilt from scratch with `npm run db:bootstrap` (roles, RLS, grants,
  migrations) against a fresh instance.
- **Secrets:** `AUTH_SECRET`, `CRON_SECRET`, DB URLs are stored only in the platform
  (Vercel env) — never in the repo. Keep an offline copy in a password manager.

## 2. Restore procedure

1. Provision a new Postgres (or restore Supabase snapshot/PITR to a timestamp).
2. If rebuilding empty: set `DATABASE_ADMIN_URL`/`DIRECT_URL` and run
   `npm run db:bootstrap` to recreate roles, RLS, grants and apply all migrations.
3. Point Vercel `DATABASE_URL`/`DIRECT_URL` at the restored instance; redeploy.
4. Validate: `BASE_URL=https://<host> npm run smoke` (must be 9/9) and spot-check a
   tenant login + admin overview.

## 3. Restore drill (do quarterly)

- Restore the latest snapshot to a **scratch** database.
- Run `npm run db:bootstrap` is NOT needed for a snapshot (schema+data included);
  for an empty rebuild it is.
- Run the integration suite against the scratch DB
  (`DATABASE_URL/DIRECT_URL=scratch npm run test:integration`) — expect green.
- Record the RTO (time to restore) and RPO (data-loss window) observed.

## 4. Operational checklist (production)

### One-time setup
- [ ] Single Vercel project (consolidate the legacy duplicates).
- [ ] Env set: `APP_ENV=production`, `APP_BASE_DOMAIN`, `TENANT_DOMAIN_MODE=subdomain`,
      `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `CRON_SECRET`,
      `EMAIL_PROVIDER` (+ provider creds), `EMAIL_FROM`.
- [ ] Wildcard DNS `*.APP_BASE_DOMAIN` → Vercel; apex/`www` + `admin` as needed.
- [ ] `npm run db:bootstrap` applied to the production DB (migrations 0001–0011).
- [ ] Backups/PITR enabled.
- [ ] Vercel Cron for `/api/cron/email` active (uses `CRON_SECRET`).

### Per-tenant onboarding
- [ ] `npm run provision -- --slug <tenant> --name "<Name>"` against prod env.
- [ ] Verify `https://<tenant>.<APP_BASE_DOMAIN>/login` (admin login works).
- [ ] Rotate the demo password / create the real first admin.

### Release checklist
- [ ] `npm run typecheck && npm run lint && npm run test:unit` green.
- [ ] `npm run test:integration` green (against a real Postgres).
- [ ] `npm run build` green.
- [ ] After deploy: `BASE_URL=https://<host> npm run smoke` green (9/9).
- [ ] Confirm security headers present (`curl -I https://<host>/health`).

## 5. Monitoring & alerts

- Logs are structured JSON with `requestId`/`tenantId` and redaction.
- Critical failures emit `alert:true` (`alertCritical`) — forward those log entries to
  Slack/PagerDuty via a log drain/transport.
- Watch: cron run summaries (`email.cron_run`), `email.failed` audit rows, 5xx rate.
