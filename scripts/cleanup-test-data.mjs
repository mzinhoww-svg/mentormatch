/**
 * Safe test-data cleanup — permanently deletes whole tenants by slug.
 *
 * Deleting a row from the `tenant` registry CASCADES (ON DELETE CASCADE) to every
 * tenant-scoped table (users, profiles, mentorships, sessions, notifications,
 * domains, settings, …). FK cascades bypass RLS, so this removes ALL of a
 * tenant's data in one transaction. Use it to wipe demo/test tenants from a
 * shared (incl. production) database without touching real customers.
 *
 * SAFETY
 *   - Dry-run by DEFAULT: prints the blast radius and deletes nothing.
 *   - You MUST name the tenants explicitly with --slugs (never a wildcard).
 *   - Deletion only happens with --yes. A confirmation summary is shown first.
 *   - Runs as the owner role (DIRECT_URL); the `tenant` registry is owner-only.
 *
 * USAGE
 *   node scripts/cleanup-test-data.mjs --slugs acme,sicredi            # dry-run
 *   node scripts/cleanup-test-data.mjs --slugs acme,sicredi --yes      # execute
 *   npm run cleanup:tenants -- --slugs acme,sicredi [--yes]
 *
 * ENV
 *   DIRECT_URL   owner (mm_owner) connection string  [required]
 *   PGSSL=disable to force-disable TLS (default: TLS on for non-local hosts)
 */
import pg from 'pg';

const { Client } = pg;

function parseArgs(argv) {
  const args = { slugs: [], yes: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--yes' || a === '-y') args.yes = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--slugs') args.slugs = splitSlugs(argv[++i]);
    else if (a.startsWith('--slugs=')) args.slugs = splitSlugs(a.slice('--slugs='.length));
  }
  return args;
}

function splitSlugs(value) {
  return String(value ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const HELP = `Safe test-data cleanup — deletes whole tenants by slug (CASCADE).

Usage:
  node scripts/cleanup-test-data.mjs --slugs <a,b,c> [--yes]

Options:
  --slugs <list>  Comma-separated tenant slugs to delete (required).
  --yes, -y       Actually perform the deletion (default is a dry-run).
  --help, -h      Show this help.

Examples:
  node scripts/cleanup-test-data.mjs --slugs acme,sicredi          # preview
  node scripts/cleanup-test-data.mjs --slugs acme,sicredi --yes    # execute
`;

function isLocalConnection(cs) {
  return /@(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:[/?]|$)/i.test(cs);
}

/** Mirrors src/tenancy/pool.ts: strip sslmode + trust host via secret URL. */
function clientConfig(connectionString) {
  if (process.env.PGSSL === 'disable' || isLocalConnection(connectionString)) {
    return { connectionString };
  }
  let cs = connectionString;
  try {
    const u = new URL(connectionString);
    u.searchParams.delete('sslmode');
    cs = u.toString();
  } catch {
    /* keep original */
  }
  return { connectionString: cs, ssl: { rejectUnauthorized: false } };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (args.slugs.length === 0) {
    process.stderr.write('refusing to run: no --slugs given (this script never deletes all tenants)\n\n');
    process.stderr.write(HELP);
    process.exit(2);
  }

  const url = process.env.DIRECT_URL;
  if (!url) {
    process.stderr.write('DIRECT_URL is not set (owner connection required)\n');
    process.exit(1);
  }

  const client = new Client(clientConfig(url));
  await client.connect();
  try {
    // Resolve the requested slugs and measure the blast radius (user counts).
    const { rows } = await client.query(
      `SELECT t.id, t.slug, t.name, t.created_at,
              (SELECT count(*) FROM tenant_user u WHERE u.tenant_id = t.id) AS user_count
         FROM tenant t
        WHERE t.slug = ANY($1::text[])
        ORDER BY t.slug`,
      [args.slugs],
    );

    const found = new Set(rows.map((r) => r.slug));
    const missing = args.slugs.filter((s) => !found.has(s));

    process.stdout.write(`\nTenants matched: ${rows.length} of ${args.slugs.length} requested\n`);
    process.stdout.write('─'.repeat(64) + '\n');
    for (const r of rows) {
      const created = new Date(r.created_at).toISOString().slice(0, 10);
      process.stdout.write(
        `  ${r.slug.padEnd(20)} ${String(r.user_count).padStart(4)} users  created ${created}  "${r.name}"\n`,
      );
    }
    if (missing.length) {
      process.stdout.write(`\n  not found (skipped): ${missing.join(', ')}\n`);
    }
    process.stdout.write('─'.repeat(64) + '\n');

    if (rows.length === 0) {
      process.stdout.write('Nothing to delete.\n');
      return;
    }

    if (!args.yes) {
      process.stdout.write('\nDRY RUN — nothing was deleted.\n');
      process.stdout.write('Re-run with --yes to permanently delete the tenants above (cascades to ALL their data).\n');
      return;
    }

    const slugsToDelete = rows.map((r) => r.slug);
    await client.query('BEGIN');
    const del = await client.query('DELETE FROM tenant WHERE slug = ANY($1::text[])', [slugsToDelete]);
    await client.query('COMMIT');
    process.stdout.write(`\nDeleted ${del.rowCount} tenant(s): ${slugsToDelete.join(', ')}\n`);
    process.stdout.write('All associated data was removed via ON DELETE CASCADE.\n');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  process.stderr.write(`cleanup failed: ${err?.message ?? err}\n`);
  process.exit(1);
});
