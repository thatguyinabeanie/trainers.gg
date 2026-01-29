import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@trainers/ui", "@trainers/validators"],
  reactCompiler: true,
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
