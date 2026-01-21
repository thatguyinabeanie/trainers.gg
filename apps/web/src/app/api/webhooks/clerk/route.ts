import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@trainers/supabase";
import type { WebhookEvent } from "@clerk/nextjs/server";
import type { Json } from "@trainers/supabase/types";

/**
 * Clerk Webhook Handler
 *
 * Syncs Clerk user events to Supabase:
 * - user.created: Creates user + default profile in Supabase
 * - user.updated: Updates user data in Supabase
 * - user.deleted: Deletes user from Supabase (cascades to profiles)
 *
 * Requires CLERK_WEBHOOK_SECRET environment variable.
 * Configure webhook at: https://dashboard.clerk.com/webhooks
 */

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Get Svix headers for verification
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn("Missing Svix headers in webhook request");
    return NextResponse.json(
      { error: "Missing webhook headers" },
      { status: 400 }
    );
  }

  // Get the raw body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Verify the webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  // Create admin Supabase client (bypasses RLS)
  const supabase = createAdminSupabaseClient();
  const eventType = event.type;

  console.log(`Processing Clerk webhook: ${eventType}`);

  try {
    switch (eventType) {
      case "user.created": {
        const { id: clerkId, email_addresses, first_name, last_name, image_url, username, phone_numbers, external_accounts, public_metadata, created_at } = event.data;

        // Get primary email
        const primaryEmail = email_addresses?.find(
          (e) => e.id === event.data.primary_email_address_id
        )?.email_address;

        // Get primary phone
        const primaryPhone = phone_numbers?.find(
          (p) => p.id === event.data.primary_phone_number_id
        )?.phone_number;

        // Build display name
        const displayName = [first_name, last_name].filter(Boolean).join(" ") || username || primaryEmail?.split("@")[0] || "User";

        // Generate a UUID for the user
        const userId = crypto.randomUUID();

        // Generate a unique username
        const baseUsername = (username || primaryEmail?.split("@")[0] || `user_${clerkId.slice(-8)}`)
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
          external_accounts: external_accounts as unknown as Json ?? null,
          public_metadata: public_metadata as unknown as Json ?? null,
          created_at: created_at ? new Date(created_at).toISOString() : new Date().toISOString(),
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

        console.log(`Created user ${userId} with profile ${profile?.id} for Clerk user ${clerkId}`);
        break;
      }

      case "user.updated": {
        const { id: clerkId, email_addresses, first_name, last_name, image_url, username, phone_numbers, external_accounts, public_metadata, last_sign_in_at, last_active_at } = event.data;

        // Get primary email
        const primaryEmail = email_addresses?.find(
          (e) => e.id === event.data.primary_email_address_id
        )?.email_address;

        // Get primary phone
        const primaryPhone = phone_numbers?.find(
          (p) => p.id === event.data.primary_phone_number_id
        )?.phone_number;

        // Build display name
        const displayName = [first_name, last_name].filter(Boolean).join(" ") || username || primaryEmail?.split("@")[0] || "User";

        // Update user by clerk_id
        const { error: userError } = await supabase
          .from("users")
          .update({
            email: primaryEmail ?? null,
            name: displayName,
            image: image_url ?? null,
            username: username ?? null,
            phone_number: primaryPhone ?? null,
            external_accounts: external_accounts as unknown as Json ?? null,
            public_metadata: public_metadata as unknown as Json ?? null,
            last_sign_in_at: last_sign_in_at ? new Date(last_sign_in_at).toISOString() : null,
            last_active_at: last_active_at ? new Date(last_active_at).toISOString() : null,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Reject other HTTP methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
