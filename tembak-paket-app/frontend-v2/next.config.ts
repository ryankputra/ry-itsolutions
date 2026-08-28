import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
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

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*' // Proxy to Backend
      },
      {
        source: '/public/uploads/:path*',
        destination: 'http://localhost:3001/public/uploads/:path*' // Proxy uploaded images to Backend
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/api/stream',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-transform' },
          { key: 'Connection', value: 'keep-alive' },
          { key: 'X-Accel-Buffering', value: 'no' }
        ]
      }
    ]
  }
};

export default withPWA(nextConfig);
