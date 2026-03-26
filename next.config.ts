import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Playwright runs in API routes (server-side only)
  serverExternalPackages: ['playwright-extra', 'playwright', 'puppeteer-extra-plugin-stealth'],
};

export default nextConfig;
