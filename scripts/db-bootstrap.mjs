/**
 * Local DB bootstrap for development/CI.
 *
 * Creates the non-superuser roles (mm_owner, mm_app), (re)creates the database
 * owned by mm_owner, and applies the raw-SQL migrations in prisma/migrations as
 * the owner. The app/tests then connect as mm_app (RLS-enforced).
 *
 * Env:
 *   DATABASE_ADMIN_URL  superuser connection (default: local postgres)
 *   DIRECT_URL          owner connection      (default: local mm_owner)
 *   DB_NAME             database name         (default: mentormatch)
 *
 * NOTE: requires superuser to create roles/databases. In production these are
 * provisioned out-of-band; only the migrations (0001/0002) are applied as owner.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const here = dirname(fileURLToPath(import.meta.url));

const ADMIN_URL =
  process.env.DATABASE_ADMIN_URL ?? 'postgresql://postgres@127.0.0.1:5432/postgres';
const OWNER_URL = process.env.DIRECT_URL ?? 'postgresql://mm_owner@127.0.0.1:5432/mentormatch';
const DB_NAME = process.env.DB_NAME ?? 'mentormatch';

async function main() {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='mm_owner') THEN
      CREATE ROLE mm_owner LOGIN NOSUPERUSER NOBYPASSRLS CREATEDB;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='mm_app') THEN
      CREATE ROLE mm_app LOGIN NOSUPERUSER NOBYPASSRLS;
    END IF;
  END $$;`);
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${DB_NAME} OWNER mm_owner`);
  await admin.end();

  const owner = new Client({ connectionString: OWNER_URL });
  await owner.connect();
  const migrationsDir = join(here, '..', 'prisma', 'migrations');
  const dirs = readdirSync(migrationsDir)
    .filter((d) => /^\d+_/.test(d))
    .sort();
  for (const d of dirs) {
    const sql = readFileSync(join(migrationsDir, d, 'migration.sql'), 'utf8');
    process.stdout.write(`applying ${d}\n`);
    await owner.query(sql);
  }
  await owner.end();
  process.stdout.write('bootstrap complete\n');
}

main().catch((err) => {
  process.stderr.write(`bootstrap failed: ${err?.message ?? err}\n`);
  process.exit(1);
});
