import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@trainers/ui", "@trainers/validators"],
  reactCompiler: true,
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io"],
  experimental: {
    authInterrupts: true,
  },
};

export default withBotId(nextConfig);
