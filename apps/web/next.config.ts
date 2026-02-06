import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@trainers/ui", "@trainers/validators"],
  reactCompiler: true,
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "play.pokemonshowdown.com",
        pathname: "/sprites/**",
      },
    ],
  },
  experimental: {
    authInterrupts: true,
  },
};

// Sentry configuration options
const sentryOptions = {
  // Suppresses source map uploading logs during build
  silent: true,

  // Upload source maps in production for better error traces
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to avoid ad-blockers
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
};

// Wrap with Sentry first, then botId
export default withBotId(withSentryConfig(nextConfig, sentryOptions));
