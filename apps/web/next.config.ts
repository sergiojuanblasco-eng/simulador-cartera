import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const config: NextConfig = {
  transpilePackages: ['@kartera/core'],
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: '6mb' },
  },
  async redirects() {
    // Rutas de la versión anterior de kartera.pro
    return [
      { source: '/dashboard', destination: '/', permanent: false },
      { source: '/onboarding', destination: '/', permanent: false },
      { source: '/landing.html', destination: '/', permanent: true },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default config;
