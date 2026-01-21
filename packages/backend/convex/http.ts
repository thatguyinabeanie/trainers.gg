import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { clerk } from "./webhooks";
import { syncWithClerk } from "./clerkSync";

const http = httpRouter();

console.log("HTTP router initialized");

// Test endpoint
http.route({
  path: "/test",
  method: "GET",
  handler: httpAction(async () => {
    console.log("Test endpoint hit!");
    return new Response("Hello from Convex!", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }),
});

// Clerk webhook endpoint - called directly by Clerk
http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: clerk,
});

// Seed data endpoint - Clerk sync (development only)
http.route({
  path: "/api/seed/clerk-sync",
  method: "POST",
  handler: syncWithClerk,
});

export default http;
