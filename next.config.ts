import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: import.meta.dirname },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "t.me" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
      ],
    },
  ],
};

export default nextConfig;
