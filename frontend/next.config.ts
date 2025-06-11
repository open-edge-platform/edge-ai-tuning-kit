import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  async rewrites() {
    const hostname = process.env.NEXT_PUBLIC_HOSTNAME || 'localhost';
    return [
      {
        source: "/v1/:path*",
        destination: `http://${hostname}:5999/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
