import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Linting runs as its own gate (`npm run lint`); keep the build independent of it.
  eslint: { ignoreDuringBuilds: true },
  // `pg` (and friends) are Node-only with dynamic/optional requires — don't bundle.
  serverExternalPackages: ['pg', 'pg-native'],
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
