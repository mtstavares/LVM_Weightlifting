import type { NextConfig } from 'next';

const apiProxyUrl = process.env.API_PROXY_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3333';

const nextConfig: NextConfig = {
  transpilePackages: ['@lvm/shared'],
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: `${apiProxyUrl}/auth/:path*`
      },
      {
        source: '/api/:path*',
        destination: `${apiProxyUrl}/:path*`
      }
    ];
  }
};

export default nextConfig;
