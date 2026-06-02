/**
 * Single-command provisioning CLI.
 *
 *   npm run provision -- --slug acme --name "Acme Corp" [--password ...]
 *   npm run seed:demo                # provisions the 'demo' tenant
 *
 * Requires DATABASE_URL + DIRECT_URL in the environment (same as the app).
 */
import { provisionDemoTenant, verifyLogin } from './provisioningService.js';
import { closePools } from '../tenancy/pool.js';

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main(): Promise<void> {
  const slug = arg('slug', 'acme')!;
  const name = arg('name');
  const password = arg('password');

  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    throw new Error(`invalid slug: ${slug}`);
  }

  console.log(`\n▶ Provisioning tenant "${slug}"…`);
  const r = await provisionDemoTenant({ slug, name, password });

  if (r.alreadyExisted) {
    console.log(`\n⚠ Tenant "${slug}" already exists — skipped seeding (idempotent).`);
    console.log(`  Login: ${r.loginUrlDev}  |  ${r.loginUrlProd}`);
    return;
  }

  // Prove the seeded admin can actually authenticate.
  const auth = await verifyLogin(r.host, r.admin.email, r.password);

  console.log(`\n✓ Tenant provisioned: ${r.tenant.name} (${r.tenant.slug}) [${r.tenant.id}]`);
  console.log(`  Default program + branding configured.`);
  console.log(`  Seeded: 1 admin, ${r.counts.mentors} mentors, ${r.counts.mentees} mentees,`);
  console.log(`          ${r.counts.participants} program participants, ${r.counts.mentorships} mentorship, ${r.counts.sessions} completed session.`);
  console.log(`  Admin login verified (role=${auth.role}).`);
  console.log(`\n  Open:`);
  console.log(`    dev : ${r.loginUrlDev}`);
  console.log(`    prod: ${r.loginUrlProd}`);
  console.log(`\n  Credentials (DEMO ONLY — shared password):`);
  console.log(`    admin : ${r.admin.email}`);
  for (const m of r.mentors) console.log(`    mentor: ${m.email}`);
  for (const m of r.mentees) console.log(`    mentee: ${m.email}`);
  console.log(`    password: ${r.password}\n`);
}

main()
  .then(() => closePools())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('\n✗ Provisioning failed:', err instanceof Error ? err.message : err);
    await closePools().catch(() => {});
    process.exit(1);
  });
