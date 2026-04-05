import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

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
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/**",
      },
    ],
  },
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  redirects: async () => [
    // Old dashboard tab routes
    {
      source: "/dashboard/overview",
      destination: "/dashboard",
      permanent: true,
    },
    {
      source: "/dashboard/notifications",
      destination: "/dashboard",
      permanent: true,
    },
    {
      source: "/dashboard/invitations",
      destination: "/dashboard",
      permanent: true,
    },
    {
      source: "/dashboard/inbox",
      destination: "/dashboard",
      permanent: true,
    },
    {
      source: "/dashboard/stats",
      destination: "/dashboard/tournaments",
      permanent: true,
    },
    {
      source: "/dashboard/history",
      destination: "/dashboard/tournaments",
      permanent: true,
    },
    {
      source: "/dashboard/settings",
      destination: "/dashboard/settings/profile",
      permanent: false,
    },
  ],
};

export default withBotId(nextConfig);
