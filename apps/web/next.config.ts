import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@trainers/ui", "@trainers/validators"],
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
