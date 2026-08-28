import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  // Optimasi Build Khusus Perangkat Low-Resource (Armbian STB / VPS 1GB-2GB RAM)
  typescript: {
    // Lewati type-check saat build di STB karena sudah divalidasi saat development di komputer lokal
    ignoreBuildErrors: true,
  },
  experimental: {
    // Batasi worker thread menjadi 1 agar tidak menghabiskan RAM STB
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
