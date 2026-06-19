import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@lvm/shared'],
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: 'http://127.0.0.1:3333/auth/:path*'
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3333/:path*'
      }
    ];
  }
};

export default nextConfig;
