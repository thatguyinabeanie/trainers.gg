// @ts-nocheck - Deno runtime, not Node.js
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { Webhook } from "svix";

/**
 * Clerk Webhook Handler (Supabase Edge Function)
 *
 * Syncs Clerk user events to Supabase:
 * - user.created: Creates user + default profile in Supabase
 * - user.updated: Updates user data in Supabase
 * - user.deleted: Deletes user from Supabase (cascades to profiles)
 *
 * Environment variables required:
 * - CLERK_WEBHOOK_SECRET: Webhook signing secret from Clerk dashboard
 * - SUPABASE_URL: Supabase project URL (auto-injected)
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (auto-injected)
 */

interface ClerkUserData {
  id: string;
  email_addresses?: Array<{ id: string; email_address: string }>;
  primary_email_address_id?: string;
  phone_numbers?: Array<{ id: string; phone_number: string }>;
  primary_phone_number_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  username?: string | null;
  external_accounts?: unknown[];
  public_metadata?: Record<string, unknown>;
  created_at?: number;
  last_sign_in_at?: number | null;
  last_active_at?: number | null;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserData;
}

Deno.serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const WEBHOOK_SECRET = Deno.env.get("CLERK_WEBHOOK_SECRET");

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Get Svix headers for verification
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn("Missing Svix headers in webhook request");
    return new Response(JSON.stringify({ error: "Missing webhook headers" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get the raw body
  const body = await req.text();

  // Verify the webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(
      JSON.stringify({ error: "Invalid webhook signature" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Create admin Supabase client (bypasses RLS)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const eventType = event.type;
  console.log(`Processing Clerk webhook: ${eventType}`);

  try {
    switch (eventType) {
      case "user.created": {
        const {
          id: clerkId,
          email_addresses,
          primary_email_address_id,
          first_name,
          last_name,
          image_url,
          username,
          phone_numbers,
          primary_phone_number_id,
          external_accounts,
          public_metadata,
          created_at,
        } = event.data;

        // Get primary email
        const primaryEmail = email_addresses?.find(
          (e) => e.id === primary_email_address_id
        )?.email_address;

        // Get primary phone
        const primaryPhone = phone_numbers?.find(
          (p) => p.id === primary_phone_number_id
        )?.phone_number;

        // Build display name
        const displayName =
          [first_name, last_name].filter(Boolean).join(" ") ||
          username ||
          primaryEmail?.split("@")[0] ||
          "User";

        // Generate a UUID for the user
        const userId = crypto.randomUUID();

        // Generate a unique username
        const baseUsername = (
          username ||
          primaryEmail?.split("@")[0] ||
          `user_${clerkId.slice(-8)}`
        )
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .slice(0, 30);

        let finalUsername = baseUsername;
        let attempts = 0;

        // Check username uniqueness
        while (attempts < 5) {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", finalUsername)
            .maybeSingle();

          if (!existingProfile) break;
          finalUsername = `${baseUsername}_${Math.random().toString(36).slice(2, 6)}`;
          attempts++;
        }

        // Insert user
        const { error: userError } = await supabase.from("users").insert({
          id: userId,
          clerk_id: clerkId,
          email: primaryEmail ?? null,
          name: displayName,
          image: image_url ?? null,
          username: username ?? null,
          phone_number: primaryPhone ?? null,
          external_accounts: external_accounts ?? null,
          public_metadata: public_metadata ?? null,
          created_at: created_at
            ? new Date(created_at).toISOString()
            : new Date().toISOString(),
        });

        if (userError) {
          console.error("Failed to create user:", userError);
          throw userError;
        }

        // Create default profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: userId,
            username: finalUsername,
            display_name: displayName,
            avatar_url: image_url ?? null,
          })
          .select("id")
          .single();

        if (profileError) {
          console.error("Failed to create profile:", profileError);
          throw profileError;
        }

        // Set main_profile_id on user
        if (profile) {
          await supabase
            .from("users")
            .update({ main_profile_id: profile.id })
            .eq("id", userId);
        }

        console.log(
          `Created user ${userId} with profile ${profile?.id} for Clerk user ${clerkId}`
        );
        break;
      }

      case "user.updated": {
        const {
          id: clerkId,
          email_addresses,
          primary_email_address_id,
          first_name,
          last_name,
          image_url,
          username,
          phone_numbers,
          primary_phone_number_id,
          external_accounts,
          public_metadata,
          last_sign_in_at,
          last_active_at,
        } = event.data;

        // Get primary email
        const primaryEmail = email_addresses?.find(
          (e) => e.id === primary_email_address_id
        )?.email_address;

        // Get primary phone
        const primaryPhone = phone_numbers?.find(
          (p) => p.id === primary_phone_number_id
        )?.phone_number;

        // Build display name
        const displayName =
          [first_name, last_name].filter(Boolean).join(" ") ||
          username ||
          primaryEmail?.split("@")[0] ||
          "User";

        // Update user by clerk_id
        const { error: userError } = await supabase
          .from("users")
          .update({
            email: primaryEmail ?? null,
            name: displayName,
            image: image_url ?? null,
            username: username ?? null,
            phone_number: primaryPhone ?? null,
            external_accounts: external_accounts ?? null,
            public_metadata: public_metadata ?? null,
            last_sign_in_at: last_sign_in_at
              ? new Date(last_sign_in_at).toISOString()
              : null,
            last_active_at: last_active_at
              ? new Date(last_active_at).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("clerk_id", clerkId);

        if (userError) {
          console.error("Failed to update user:", userError);
          throw userError;
        }

        // Optionally update profile avatar if changed
        // Get user to find their profile
        const { data: user } = await supabase
          .from("users")
          .select("id, main_profile_id")
          .eq("clerk_id", clerkId)
          .maybeSingle();

        if (user?.main_profile_id && image_url) {
          await supabase
            .from("profiles")
            .update({
              avatar_url: image_url,
              display_name: displayName,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.main_profile_id);
        }

        console.log(`Updated user for Clerk user ${clerkId}`);
        break;
      }

      case "user.deleted": {
        const { id: clerkId } = event.data;

        if (!clerkId) {
          console.warn("user.deleted event missing clerk_id");
          break;
        }

        // Delete user by clerk_id (profiles will cascade delete if FK is set up)
        const { error: deleteError } = await supabase
          .from("users")
          .delete()
          .eq("clerk_id", clerkId);

        if (deleteError) {
          console.error("Failed to delete user:", deleteError);
          throw deleteError;
        }

        console.log(`Deleted user for Clerk user ${clerkId}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
