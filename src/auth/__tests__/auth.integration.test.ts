import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as signupPost } from '../../app/api/auth/signup/route.js';
import { POST as loginPost } from '../../app/api/auth/login/route.js';
import { POST as logoutPost } from '../../app/api/auth/logout/route.js';
import { GET as meGet } from '../../app/api/me/route.js';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { closePools } from '../../tenancy/pool.js';
import { verifySessionToken } from '../session.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);

function makeReq(
  path: string,
  opts: { host?: string; method?: string; body?: unknown; cookie?: string },
): Request {
  const headers = new Headers();
  if (opts.host) headers.set('host', opts.host);
  if (opts.cookie) headers.set('cookie', opts.cookie);
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(opts.body);
  }
  return new Request(`http://${opts.host ?? 'localhost'}${path}`, {
    method: opts.method ?? 'POST',
    headers,
    body,
  });
}

function sessionCookie(res: Response): string | undefined {
  const sc = res.headers.get('set-cookie');
  const m = sc?.match(/mm_session=([^;]*)/);
  return m && m[1] ? `mm_session=${m[1]}` : undefined;
}

describe.skipIf(!hasDb)('Auth — tenant-scoped (integration)', () => {
  let a: TenantRecord;
  let b: TenantRecord;
  let hostA: string;
  let hostB: string;
  const password = 'sup3r-secret-pw';

  beforeAll(async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? 'integration-test-secret';
    a = await createTenant({ slug: `autha${rand()}`, name: 'Auth A' });
    b = await createTenant({ slug: `authb${rand()}`, name: 'Auth B' });
    hostA = `${a.slug}.mentormatch.app`;
    hostB = `${b.slug}.mentormatch.app`;
  });

  afterAll(async () => {
    await closePools();
  });

  it('1. login of tenant A does not authenticate tenant B; sessions do not cross', async () => {
    const email = `cross-${rand()}@example.com`;
    const su = await signupPost(makeReq('/api/auth/signup', { host: hostA, body: { email, password, consent: true } }));
    expect(su.status).toBe(201);
    const cookieA = sessionCookie(su);
    expect(cookieA).toBeTruthy();

    // Same credentials on B's host -> user doesn't exist there -> 401.
    const loginB = await loginPost(makeReq('/api/auth/login', { host: hostB, body: { email, password } }));
    expect(loginB.status).toBe(401);

    // A's session presented on B's host -> tenant_mismatch -> 401.
    const meOnB = await meGet(makeReq('/api/me', { host: hostB, method: 'GET', cookie: cookieA }));
    expect(meOnB.status).toBe(401);

    // A's session on A's host -> 200, carries A's tenantId.
    const meOnA = await meGet(makeReq('/api/me', { host: hostA, method: 'GET', cookie: cookieA }));
    expect(meOnA.status).toBe(200);
    expect(await meOnA.json()).toMatchObject({ tenantId: a.id });
  });

  it('2. the same email works in two different tenants', async () => {
    const email = `dual-${rand()}@example.com`;
    const ra = await signupPost(makeReq('/api/auth/signup', { host: hostA, body: { email, password, consent: true } }));
    const rb = await signupPost(makeReq('/api/auth/signup', { host: hostB, body: { email, password, consent: true } }));
    expect(ra.status).toBe(201);
    expect(rb.status).toBe(201);
  });

  it('3. the session carries tenantId', async () => {
    const email = `claims-${rand()}@example.com`;
    const su = await signupPost(makeReq('/api/auth/signup', { host: hostA, body: { email, password, consent: true } }));
    const cookie = sessionCookie(su)!;
    const token = cookie.replace('mm_session=', '');
    const claims = verifySessionToken(token);
    expect(claims?.tenantId).toBe(a.id);
    expect(typeof claims?.sub).toBe('string');
  });

  it('4. a protected route blocks access without auth', async () => {
    const res = await meGet(makeReq('/api/me', { host: hostA, method: 'GET' }));
    expect(res.status).toBe(401);
  });

  it('5. logout clears the session', async () => {
    const email = `logout-${rand()}@example.com`;
    const su = await signupPost(makeReq('/api/auth/signup', { host: hostA, body: { email, password, consent: true } }));
    const cookie = sessionCookie(su)!;

    const out = await logoutPost(makeReq('/api/auth/logout', { host: hostA, cookie }));
    expect(out.status).toBe(200);
    expect(out.headers.get('set-cookie')).toMatch(/mm_session=;|Max-Age=0/);

    // With the cleared cookie there is no valid session.
    const me = await meGet(makeReq('/api/me', { host: hostA, method: 'GET', cookie: 'mm_session=' }));
    expect(me.status).toBe(401);
  });

  it('6. consent is required for signup', async () => {
    const email = `noconsent-${rand()}@example.com`;
    const res = await signupPost(makeReq('/api/auth/signup', { host: hostA, body: { email, password, consent: false } }));
    expect(res.status).toBe(400);
    // and no account was created -> login fails
    const login = await loginPost(makeReq('/api/auth/login', { host: hostA, body: { email, password } }));
    expect(login.status).toBe(401);
  });

  it('7. login and logout are audited', async () => {
    const email = `audit-${rand()}@example.com`;
    await signupPost(makeReq('/api/auth/signup', { host: hostA, body: { email, password, consent: true } }));
    const li = await loginPost(makeReq('/api/auth/login', { host: hostA, body: { email, password } }));
    const cookie = sessionCookie(li)!;
    const userId = verifySessionToken(cookie.replace('mm_session=', ''))!.sub;
    await logoutPost(makeReq('/api/auth/logout', { host: hostA, cookie }));

    const events = await withTenant(a.id, (db) =>
      db.query<{ action: string }>(
        'SELECT action FROM audit_event WHERE actor_id = $1 ORDER BY occurred_at',
        [userId],
      ),
    );
    const actions = events.rows.map((r) => r.action);
    expect(actions).toContain('auth.login');
    expect(actions).toContain('auth.logout');
  });

  it('8. auth rate limit blocks repeated failures', async () => {
    const email = `ratelimit-${rand()}@example.com`;
    await signupPost(makeReq('/api/auth/signup', { host: hostA, body: { email, password, consent: true } }));
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await loginPost(
        makeReq('/api/auth/login', { host: hostA, body: { email, password: 'wrong-password' } }),
      );
      statuses.push(res.status);
    }
    // First 5 attempts reach auth (401 invalid); subsequent ones are rate-limited (429).
    expect(statuses.filter((s) => s === 401).length).toBe(5);
    expect(statuses).toContain(429);
  });
});
