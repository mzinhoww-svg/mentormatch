import type { NextConfig } from 'next';
import { SECURITY_HEADERS } from './src/observability/securityHeaders';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Linting runs as its own gate (`npm run lint`); keep the build independent of it.
  eslint: { ignoreDuringBuilds: true },
  // `pg` (and friends) are Node-only with dynamic/optional requires — don't bundle.
  serverExternalPackages: ['pg', 'pg-native'],
  // Baseline security headers on every response (Slice 16 hardening).
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  webpack: (config) => {
    // Resolve ESM-style `.js` import specifiers to their `.ts(x)` sources, so the
    // project's `.js` extension convention (used by tsc/vitest) also builds here.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
