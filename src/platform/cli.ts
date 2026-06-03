/**
 * Platform-admin bootstrap CLI. Creates (or resets the password of) a platform
 * admin, gated by PLATFORM_ADMIN_BOOTSTRAP_TOKEN. Run with owner DB creds
 * (DIRECT_URL) since the platform_admin registry is owner-only.
 *
 *   PLATFORM_ADMIN_BOOTSTRAP_TOKEN=… npm run platform:admin -- \
 *     --email you@co.com --password 'a-strong-password' [--name "You"] [--token …]
 *
 * --token defaults to PLATFORM_ADMIN_BOOTSTRAP_TOKEN from the environment.
 */
import { createPlatformAdmin } from './platformAuthService.js';
import { closePools } from '../tenancy/pool.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const email = arg('email');
  const password = arg('password');
  const token = arg('token') ?? process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN ?? '';
  if (!email || !password) {
    throw new Error('usage: platform:admin --email <email> --password <password> [--name <name>] [--token <token>]');
  }

  const admin = await createPlatformAdmin({ token, email, password, displayName: arg('name') });
  console.log(`\n✓ Platform admin ready: ${admin.email} [${admin.id}]`);
  console.log('  Sign in at: https://admin.<APP_BASE_DOMAIN>/console\n');
}

main()
  .then(() => closePools())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('\n✗ platform:admin failed:', err instanceof Error ? err.message : err);
    await closePools().catch(() => {});
    process.exit(1);
  });
