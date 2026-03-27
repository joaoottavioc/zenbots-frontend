import type { NextConfig } from "next";

// Validate required env vars at build time (not in dev mode)
if (process.env.NODE_ENV === 'production') {
  const required = [
    'NEXT_PUBLIC_API_BASE_URL',
    'NEXT_PUBLIC_FB_APP_ID',
    'NEXT_PUBLIC_FB_CONFIG_ID',
    'NEXT_PUBLIC_FB_LOGIN_CONFIG_ID',
  ];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

const nextConfig: NextConfig = {
  output: 'export',

  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.facebook.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
    ],
  },

  // headers() removed — security headers served by CloudFront Response Headers Policy
  // experimental.serverActions removed — incompatible with static export and unused
};

export default nextConfig;