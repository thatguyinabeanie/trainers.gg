import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@trainers/ui", "@trainers/validators"],
};

export default nextConfig;
