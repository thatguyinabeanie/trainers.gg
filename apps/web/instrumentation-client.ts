import { initBotId } from "botid/client/core";

// BotID client-side protection
// Attaches challenge headers to requests matching these routes so the server
// can classify them with checkBotId(). Server actions send POST requests to
// the page URL they're invoked from, so we protect those page paths too.

initBotId({
  protect: [
    // All API POST routes
    { path: "/api/*", method: "POST" },

    // Auth pages (server actions: login, waitlist, password reset)
    { path: "/sign-in", method: "POST" },
    { path: "/sign-up", method: "POST" },
    { path: "/forgot-password", method: "POST" },

    // Onboarding (server action: completeProfile)
    { path: "/onboarding", method: "POST" },

    // Tournament pages (registration, check-in, team submission, match reporting)
    { path: "/tournaments/*", method: "POST" },

    // Dashboard (tournament management, organization actions)
    { path: "/dashboard/*", method: "POST" },

    // Feed (Bluesky post creation, likes, reposts, follows)
    { path: "/feed", method: "POST" },
    { path: "/feed/*", method: "POST" },
  ],
});
