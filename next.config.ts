import type { NextConfig } from 'next';

const isGithubPages = process.env.GITHUB_PAGES === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (isGithubPages ? '/PRD-Design' : '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(isGithubPages
    ? {
        output: 'export',
        trailingSlash: true,
        basePath,
        assetPrefix: basePath,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
