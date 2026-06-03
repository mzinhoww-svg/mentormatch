/**
 * Single-command provisioning CLI.
 *
 *   # Demo tenant (seeded with sample cohorts + a shared demo password):
 *   npm run seed:demo
 *   npm run provision -- --slug acme --name "Acme Corp" [--password ...]
 *
 *   # REAL / production tenant (one real admin, NO demo data, set-password link):
 *   npm run provision:real -- --slug acme --name "Acme Corp" \
 *     --admin-email admin@acme.com [--admin-name "Ana Admin"] \
 *     [--program-name "..."] [--primary-color "#RRGGBB"] \
 *     [--secondary-color "#RRGGBB"] [--locale pt-BR] [--logo-url https://...]
 *
 * Requires DATABASE_URL + DIRECT_URL (+ AUTH_SECRET) in the environment.
 */
import { provisionDemoTenant, provisionRealTenant, verifyLogin } from './provisioningService.js';
import { closePools } from '../tenancy/pool.js';

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function runReal(): Promise<void> {
  const slug = arg('slug');
  if (!slug || !SLUG_RE.test(slug)) {
    throw new Error(`invalid or missing --slug: ${slug ?? '(none)'}`);
  }
  const name = arg('name');
  const adminEmail = arg('admin-email');
  if (!name) throw new Error('--name is required with --real');
  if (!adminEmail) throw new Error('--admin-email is required with --real');

  console.log(`\n▶ Provisioning PRODUCTION tenant "${slug}"…`);
  const r = await provisionRealTenant({
    slug,
    name,
    adminEmail,
    adminName: arg('admin-name'),
    branding: {
      programName: arg('program-name'),
      primaryColor: arg('primary-color'),
      secondaryColor: arg('secondary-color'),
      locale: arg('locale'),
      logoUrl: arg('logo-url'),
    },
  });

  if (r.alreadyExisted) {
    console.log(`\n⚠ Tenant "${slug}" already exists — skipped (idempotent).`);
    console.log(`  Login: ${r.loginUrlDev}  |  ${r.loginUrlProd}`);
    return;
  }

  console.log(`\n✓ Production tenant provisioned: ${r.tenant.name} (${r.tenant.slug}) [${r.tenant.id}]`);
  console.log(`  Default program + branding configured. No demo data seeded.`);
  console.log(`  Admin: ${r.admin.email} (role=admin) — account active, password NOT set yet.`);
  if (r.emailSent) {
    console.log(`\n  ✉ Set-password email sent to ${r.admin.email} via "${r.emailProvider}".`);
    console.log(`    Set-password page (the link in that email):`);
  } else {
    console.log(`\n  ⚠ Set-password email NOT sent (provider="${r.emailProvider}"). Send this link to the admin:`);
  }
  console.log(`      ${r.setPasswordUrlProd}`);
  console.log(`\n  Fallback — raw token (valid 7 days), POST to the confirm endpoint:`);
  console.log(`    token: ${r.setPasswordToken}`);
  console.log(`    curl -X POST ${r.setPasswordConfirmUrlProd} \\`);
  console.log(`      -H 'Content-Type: application/json' \\`);
  console.log(`      -d '{"token":"${r.setPasswordToken}","password":"<NEW_PASSWORD min 8 chars>"}'`);
  console.log(`\n  After setting the password, log in:`);
  console.log(`    dev : ${r.loginUrlDev}`);
  console.log(`    prod: ${r.loginUrlProd}\n`);
}

async function runDemo(): Promise<void> {
  const slug = arg('slug', 'acme')!;
  const name = arg('name');
  const password = arg('password');

  if (!SLUG_RE.test(slug)) {
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

async function main(): Promise<void> {
  if (process.argv.includes('--real')) return runReal();
  return runDemo();
}

main()
  .then(() => closePools())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('\n✗ Provisioning failed:', err instanceof Error ? err.message : err);
    await closePools().catch(() => {});
    process.exit(1);
  });
