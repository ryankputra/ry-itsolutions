import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

import path from "path";

const rootDir = path.resolve(process.cwd(), process.cwd().endsWith('frontend-v2') ? '../..' : '.');

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  // Explicitly specify workspace root to avoid inference warning and path mismatch
  outputFileTracingRoot: rootDir,

  // Optimasi Khusus Perangkat Low-Resource (Armbian STB / VPS RAM 1GB-2GB)
  typescript: {
    // Lewati type-check saat build di STB (menghemat 88+ menit)
    ignoreBuildErrors: true,
  },
  experimental: {
    // Batasi worker thread menjadi 1 agar hemat RAM & tidak OOM di STB
    cpus: 1,
    workerThreads: false,
  },
  productionBrowserSourceMaps: false,

  async redirects() {
    return [
      { source: '/unblock-imei', destination: '/add-roamer', permanent: false },
    ];
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:3001';
    return [
      {
        source: '/create-qris',
        destination: `${backendUrl}/create-qris`
      },
      {
        source: '/check-payment',
        destination: `${backendUrl}/check-payment`
      },
      {
        source: '/api/create-qris',
        destination: `${backendUrl}/create-qris`
      },
      {
        source: '/api/check-payment',
        destination: `${backendUrl}/check-payment`
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`
      },
      {
        source: '/public/uploads/:path*',
        destination: `${backendUrl}/public/uploads/:path*`
      }
    ];
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/api/stream',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-transform' },
          { key: 'Connection', value: 'keep-alive' },
          { key: 'X-Accel-Buffering', value: 'no' }
        ]
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ]
      }
    ]
  }
};

export default withPWA(nextConfig);
