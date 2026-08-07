import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "http2.mlstatic.com" },
      { protocol: "https", hostname: "*.media-amazon.com" }
    ]
  },
  turbopack: { root: process.cwd() }
};

export default nextConfig;
