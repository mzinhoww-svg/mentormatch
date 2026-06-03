#!/usr/bin/env node
/**
 * Production smoke test. Hits public endpoints of a running deployment and
 * checks status codes — no secrets, no DB. Authenticated flows are covered by
 * the integration suite; this verifies the deployment is actually serving.
 *
 *   BASE_URL=https://acme.mentorxmatch.xyz npm run smoke
 *
 * Exit code 0 = all checks passed, 1 = at least one failed.
 */
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** [path, expectedStatus, label] */
const CHECKS = [
  ['/health', 200, 'health'],
  ['/', 200, 'landing home'],
  ['/como-funciona', 200, 'landing how-it-works'],
  ['/planos', 200, 'landing pricing'],
  ['/robots.txt', 200, 'robots'],
  ['/sitemap.xml', 200, 'sitemap'],
  ['/api/branding', 200, 'branding (public)'],
  ['/login', 200, 'login page'],
  ['/api/me', 401, 'me requires auth'],
];

async function main() {
  console.log(`Smoke test against ${BASE}\n`);
  let failed = 0;
  for (const [path, expected, label] of CHECKS) {
    try {
      const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
      const ok = res.status === expected;
      console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(24)} ${path} → ${res.status} (esperado ${expected})`);
      if (!ok) failed++;
    } catch (err) {
      console.log(`  ✗ ${label.padEnd(24)} ${path} → ERRO ${err?.message ?? err}`);
      failed++;
    }
  }
  console.log(`\n${failed === 0 ? '✓ smoke OK' : `✗ ${failed} verificação(ões) falharam`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
