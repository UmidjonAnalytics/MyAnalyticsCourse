import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server build: used by the Dockerfile (VPS). Netlify ignores it safely.
  output: "standalone",
  turbopack: { root: import.meta.dirname },
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
};

export default nextConfig;
