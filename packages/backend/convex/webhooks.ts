import type { WebhookEvent } from "@clerk/nextjs/server";
import type { FunctionReference } from "convex/server";
import { Webhook } from "svix";
import { httpAction } from "./_generated/server";

// Helper to create typed mutation references
function createMutationRef(
  name: string
): FunctionReference<"mutation", "internal"> {
  return name as unknown as FunctionReference<"mutation", "internal">;
}

// Using Clerk's official WebhookEvent type from @clerk/nextjs/server
// This provides proper TypeScript inference for all webhook event types

export const clerk = httpAction(async (ctx, request) => {
  // Security is handled in middleware, but let's add extra validation
  console.log("🔗 Clerk webhook received directly in Convex");

  // Get webhook secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("❌ CLERK_WEBHOOK_SECRET not configured");
    return new Response(
      JSON.stringify({ error: "Webhook secret not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get the request body and headers
  const payload = await request.text();
  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("❌ Missing Svix headers");
    return new Response(JSON.stringify({ error: "Missing webhook headers" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify webhook signature
  let evt: WebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
    console.log("✅ Webhook signature verified for event:", evt.type);
  } catch (error) {
    console.error("❌ Webhook signature verification failed:", error);
    return new Response(
      JSON.stringify({ error: "Invalid webhook signature" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Handle different event types using internal mutations
  try {
    switch (evt.type) {
      // ========== USER LIFECYCLE EVENTS ==========
      case "user.created":
        console.log("🆕 Processing user.created event");
        await ctx.runMutation(createMutationRef("auth:handleUserCreated"), {
          clerkUserId: evt.data.id,
          email: evt.data.email_addresses?.[0]?.email_address,
          name:
            `${evt.data.first_name || ""} ${evt.data.last_name || ""}`.trim() ||
            undefined,
          image: evt.data.image_url,
          username: evt.data.username,
          createdAt: evt.data.created_at,
          lastSignInAt: evt.data.last_sign_in_at,
          phoneNumber: evt.data.phone_numbers?.[0]?.phone_number,
          externalAccounts: evt.data.external_accounts,
          publicMetadata: evt.data.public_metadata,
        });
        break;

      case "user.updated":
        console.log("📝 Processing user.updated event");
        await ctx.runMutation(createMutationRef("auth:handleUserUpdated"), {
          clerkUserId: evt.data.id,
          email: evt.data.email_addresses?.[0]?.email_address,
          name:
            `${evt.data.first_name || ""} ${evt.data.last_name || ""}`.trim() ||
            undefined,
          image: evt.data.image_url,
          username: evt.data.username,
          updatedAt: evt.data.updated_at,
          lastSignInAt: evt.data.last_sign_in_at,
          phoneNumber: evt.data.phone_numbers?.[0]?.phone_number,
          externalAccounts: evt.data.external_accounts,
          publicMetadata: evt.data.public_metadata,
          isLocked: evt.data.locked,
        });
        break;

      case "user.deleted":
        console.log("🗑️ Processing user.deleted event");
        await ctx.runMutation(createMutationRef("auth:handleUserDeleted"), {
          clerkUserId: evt.data.id,
        });
        break;

      // ========== SESSION TRACKING EVENTS ==========
      case "session.created":
        console.log("🔐 Processing session.created event");
        await ctx.runMutation(createMutationRef("auth:handleSessionCreated"), {
          clerkUserId: evt.data.user_id!,
          sessionId: evt.data.id,
          createdAt: evt.data.created_at!,
          lastActiveAt: evt.data.last_active_at!,
          // Note: IP address and user agent may not be available in session events
          ipAddress: undefined, // evt.data.last_active_ip_address not available
          userAgent: undefined, // evt.data.last_active_user_agent not available
        });
        break;

      case "session.ended":
        console.log("🚪 Processing session.ended event");
        await ctx.runMutation(createMutationRef("auth:handleSessionEnded"), {
          clerkUserId: evt.data.user_id!,
          sessionId: evt.data.id,
          endedAt: Date.now(), // ended_at not available, use current timestamp
        });
        break;

      case "session.removed":
        console.log("❌ Processing session.removed event");
        await ctx.runMutation(createMutationRef("auth:handleSessionRemoved"), {
          clerkUserId: evt.data.user_id!,
          sessionId: evt.data.id,
        });
        break;

      case "session.revoked":
        console.log("🚫 Processing session.revoked event");
        await ctx.runMutation(createMutationRef("auth:handleSessionRevoked"), {
          clerkUserId: evt.data.user_id!,
          sessionId: evt.data.id,
          revokedAt: Date.now(), // revoked_at not available, use current timestamp
        });
        break;

      // ========== ACCOUNT STATUS EVENTS ==========
      // Note: user.banned and user.unbanned events don't exist in Clerk
      // Removed these handlers as they're not available

      // ========== CONTACT INFO EVENTS ==========
      case "email.created":
        console.log("📧 Processing email.created event");
        await ctx.runMutation(createMutationRef("auth:handleEmailCreated"), {
          clerkUserId: evt.data.user_id!,
          emailAddress: evt.data.to_email_address || "unknown@example.com",
          isPrimary: false, // primary status not available in email events
          isVerified: false, // verification status not available in email events
        });
        break;

      // Note: email.updated and email.deleted events don't exist in Clerk
      // Only email.created is available

      default:
        console.log(`⚠️ Unhandled webhook event type: ${evt.type}`);
        // Log the full event for debugging new event types
        console.log("Event data:", JSON.stringify(evt.data, null, 2));
    }

    console.log("✅ Webhook processed successfully");
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
