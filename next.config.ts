// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // Aumente para 10MB (ou o quanto precisar)
    },
  },
};

export default nextConfig;