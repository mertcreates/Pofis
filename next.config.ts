import type { NextConfig } from "next";

const config: NextConfig = {
  output: process.env.POFIS_STANDALONE === "1" ? "standalone" : undefined,
  // Runtime cache files would change the signed macOS bundle.
  experimental: process.env.POFIS_STANDALONE === "1" ? { isrFlushToDisk: false } : undefined,
  outputFileTracingExcludes: { "/*": ["./dist/**/*"] },
  // Next's standalone trace omits the runtime loaded by Turbopack API routes.
  outputFileTracingIncludes: {
    "/api/*": ["./node_modules/next/dist/compiled/next-server/app-route-turbo.runtime.prod.js"],
  },
  poweredByHeader: false,
  devIndicators: false,
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default config;
