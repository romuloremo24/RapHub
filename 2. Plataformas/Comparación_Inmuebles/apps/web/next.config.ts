import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@vesta/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.mlstatic.com' },
      { protocol: 'https', hostname: '**.toctoc.com' },
      { protocol: 'https', hostname: '**.portalinmobiliario.com' },
      { protocol: 'https', hostname: '**.yapo.cl' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
    ],
  },
};

export default nextConfig;
