import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@trainers/ui", "@trainers/validators"],
  reactCompiler: true,
  cacheComponents: true,
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
  rewrites: async () => ({
    beforeFiles: [
      // Vanity profile URLs: /@username → /user/username (internal route)
      { source: "/@:handle/alts/:alt", destination: "/user/:handle/alts/:alt" },
      { source: "/@:handle", destination: "/user/:handle" },
    ],
    afterFiles: [],
    fallback: [],
  }),
  redirects: async () => [
    // Old /u/ URLs redirect to vanity /@handle format
    {
      source: "/u/:handle",
      destination: "/@:handle",
      permanent: true,
    },
    // Old dashboard tab routes
    {
      source: "/dashboard/overview",
      destination: "/dashboard",
      permanent: true,
    },
    // /dashboard/alts index redirects to the dashboard home. Config-level
    // because a bare redirect() page has no static shell under
    // cacheComponents/PPR and fails the prerender. [username] subroutes
    // are real pages and unaffected.
    {
      source: "/dashboard/alts",
      destination: "/dashboard",
      permanent: false,
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

export default withWorkflow(withBotId(nextConfig));
