import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
  allowedDevOrigins: ["21.0.12.155"],
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/serve-upload/:path*",
      },
    ];
  },
};

export default nextConfig;
