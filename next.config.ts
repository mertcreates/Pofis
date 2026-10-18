import type { NextConfig } from "next";

const config: NextConfig = {
  output: process.env.POFIS_STANDALONE === "1" ? "standalone" : undefined,
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
