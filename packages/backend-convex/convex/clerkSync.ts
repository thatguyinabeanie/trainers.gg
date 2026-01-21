import {
  httpAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import type { FunctionReference } from "convex/server";
import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";

function createQueryRef(name: string): FunctionReference<"query", "internal"> {
  return name as unknown as FunctionReference<"query", "internal">;
}

function createMutationRef(
  name: string
): FunctionReference<"mutation", "internal"> {
  return name as unknown as FunctionReference<"mutation", "internal">;
}

export const syncWithClerk = httpAction(async (ctx, request) => {
  console.log("🔄 Clerk sync endpoint called");

  // 🚨 CRITICAL: Production safety check
  if (process.env.ENABLE_SEEDING !== "true") {
    console.error("🚨 PRODUCTION SAFETY: Clerk sync is DISABLED");
    return new Response(
      JSON.stringify({
        error: "Clerk sync disabled",
        message:
          "Set ENABLE_SEEDING=true environment variable ONLY in development. NEVER enable in production or preview.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check if credentials should be included in response (opt-in via query param)
  const url = new URL(request.url);
  const includeCredentials =
    url.searchParams.get("includeCredentials") === "true";

  // Get Clerk secret key
  const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
  if (!CLERK_SECRET_KEY) {
    console.error("❌ CLERK_SECRET_KEY not configured");
    return new Response(
      JSON.stringify({
        error: "CLERK_SECRET_KEY environment variable is required",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Get users needing sync
    const usersToSync = await ctx.runQuery(
      createQueryRef("clerkSync:getUsersWithoutClerkIds")
    );

    if (usersToSync.length === 0) {
      console.log("✅ All users are already synced with Clerk");
      return new Response(
        JSON.stringify({
          success: true,
          message: "All users already synced",
          synced: 0,
          errors: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Found ${usersToSync.length} users to sync with Clerk`);

    const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });
    let successCount = 0;
    let errorCount = 0;
    const credentials: Array<{ email: string; password: string }> = [];

    for (const user of usersToSync) {
      try {
        if (!user.email) {
          console.log(`⏭️  Skipping user ${user._id} - no email address`);
          errorCount++;
          continue;
        }

        console.log(`🔨 Creating Clerk user for: ${user.email}`);

        // 🚨 DEV ONLY: Generate cryptographically secure random password for development accounts
        // ⚠️ WARNING: These accounts are for development/testing ONLY. NEVER use in production.
        // Password is 16 characters of random hex (128 bits of entropy)
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        const password = Array.from(randomBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        const clerkUser = await clerkClient.users.createUser({
          emailAddress: [user.email],
          password,
          firstName: user.name?.split(" ")[0],
          lastName: user.name?.split(" ").slice(1).join(" "),
          username: user.username || user.email.split("@")[0],
          skipPasswordChecks: true,
        });

        await ctx.runMutation(
          createMutationRef("clerkSync:updateUserClerkId"),
          {
            userId: user._id,
            clerkUserId: clerkUser.id,
          }
        );

        console.log(`✅ Synced ${user.email} -> Clerk ID: ${clerkUser.id}`);
        credentials.push({ email: user.email, password });
        successCount++;

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error syncing user ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log(
      `\n📊 Sync Results: ${successCount} synced, ${errorCount} errors`
    );

    // Build response object
    const responseData: {
      success: boolean;
      synced: number;
      errors: number;
      total: number;
      credentials?: Array<{ email: string; password: string }>;
      credentialsNote?: string;
    } = {
      success: true,
      synced: successCount,
      errors: errorCount,
      total: usersToSync.length,
    };

    // 🔐 SECURITY: Only include credentials if explicitly requested via query parameter
    // Add ?includeCredentials=true to URL to receive passwords
    if (includeCredentials) {
      responseData.credentials = credentials;
      responseData.credentialsNote =
        "⚠️ DEV ONLY - Passwords included in response. NEVER use in production.";
    } else {
      responseData.credentialsNote =
        "Passwords generated but not included in response. Add ?includeCredentials=true to URL to receive them.";
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Fatal error during Clerk sync:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// Internal query to get users needing Clerk sync
export const getUsersWithoutClerkIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    const usersNeedingClerkSync = users.filter(
      (user) => user.clerkUserId && user.clerkUserId.startsWith("clerk_")
    );

    return usersNeedingClerkSync.map((user) => ({
      _id: user._id,
      email: user.email,
      name: user.name,
      username: user.username,
      clerkUserId: user.clerkUserId!,
    }));
  },
});

// Internal mutation to update user Clerk ID
export const updateUserClerkId = internalMutation({
  args: {
    userId: v.id("users"),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      clerkUserId: args.clerkUserId,
    });

    return { success: true };
  },
});
