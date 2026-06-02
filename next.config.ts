import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Linting runs as its own gate (`npm run lint`); keep the build independent of it.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
