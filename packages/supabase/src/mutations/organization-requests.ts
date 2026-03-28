import type { CommunitySocialLink } from "@trainers/validators";
import type { Json } from "../types";
import type { TypedClient } from "../client";

const COOLDOWN_DAYS = 7;

/**
 * Submit an organization request.
 * Validates: no pending request, cooldown after rejection, slug uniqueness.
 */
export async function submitCommunityRequest(
  supabase: TypedClient,
  data: {
    name: string;
    slug: string;
    description?: string;
    discord_invite_url: string;
    social_links?: CommunitySocialLink[];
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const slug = data.slug.toLowerCase();

  // Check for existing pending request
  const { data: pendingRequest } = await supabase
    .from("community_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingRequest) {
    throw new Error("You already have a pending community request");
  }

  // Check cooldown after rejection
  const { data: recentRejection } = await supabase
    .from("community_requests")
    .select("reviewed_at")
    .eq("user_id", user.id)
    .eq("status", "rejected")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentRejection?.reviewed_at) {
    const rejectedAt = new Date(recentRejection.reviewed_at);
    const cooldownEnd = new Date(rejectedAt);
    cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);

    if (new Date() < cooldownEnd) {
      const formatted = cooldownEnd.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      throw new Error(`You can submit a new request after ${formatted}`);
    }
  }

  // Check slug uniqueness against organizations table
  const { data: existingCommunity } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingCommunity) {
    throw new Error("This URL slug is already taken by an existing community");
  }

  // Check slug uniqueness against pending requests
  const { data: existingRequest } = await supabase
    .from("community_requests")
    .select("id")
    .eq("slug", slug)
    .eq("status", "pending")
    .maybeSingle();

  if (existingRequest) {
    throw new Error("This URL slug is already requested by another user");
  }

  // Insert the request
  const { data: request, error } = await supabase
    .from("community_requests")
    .insert({
      user_id: user.id,
      name: data.name,
      slug,
      description: data.description || null,
      discord_invite_url: data.discord_invite_url,
      social_links: (data.social_links ?? []) as unknown as Json,
    })
    .select()
    .single();

  if (error) throw error;
  return request;
}

/**
 * Grant an organization request (admin action).
 * Accepts both pending and previously rejected requests.
 * Creates the org, sets requester as owner/staff, creates notification.
 * Uses service role client (bypasses RLS).
 */
export async function grantCommunityRequest(
  supabase: TypedClient,
  requestId: number,
  adminUserId: string,
  reason?: string
) {
  // Fetch the request
  const { data: request, error: fetchError } = await supabase
    .from("community_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) throw new Error("Request not found");
  if (request.status !== "pending" && request.status !== "rejected") {
    throw new Error("Request has already been approved");
  }

  // Re-check slug uniqueness against organizations
  const { data: existingCommunity } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", request.slug)
    .maybeSingle();

  if (existingCommunity) {
    throw new Error(
      `Slug "${request.slug}" is now taken by an existing community`
    );
  }

  // Assemble social links from request (Discord invite + any additional)
  const socialLinks: CommunitySocialLink[] = [];
  if (request.discord_invite_url) {
    socialLinks.push({ platform: "discord", url: request.discord_invite_url });
  }
  const requestSocialLinks = (request.social_links ??
    []) as CommunitySocialLink[];
  for (const link of requestSocialLinks) {
    if (link.platform && link.url) {
      socialLinks.push(link);
    }
  }

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .insert({
      name: request.name,
      slug: request.slug,
      description: request.description,
      owner_user_id: request.user_id,
      social_links: socialLinks as unknown as Json,
      discord_invite_url: request.discord_invite_url ?? null,
      status: "active" as const,
    })
    .select()
    .single();

  if (communityError) throw communityError;

  // Add requester as staff
  const { error: staffError } = await supabase.from("community_staff").insert({
    community_id: community.id,
    user_id: request.user_id,
  });

  if (staffError) throw staffError;

  // Update request status
  const { data: updatedRequest, error: updateError } = await supabase
    .from("community_requests")
    .update({
      status: "approved" as const,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Create in-app notification
  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      user_id: request.user_id,
      type: "org_request_approved" as const,
      title: "Organization request approved",
      body: `Your organization "${request.name}" has been approved!`,
      action_url: `/communities/${request.slug}`,
    });

  if (notificationError) {
    console.error("Failed to create org_request_approved notification", {
      requestId,
      userId: request.user_id,
      error: notificationError,
    });
  }

  // Audit log
  await supabase.from("audit_log").insert({
    action: "admin.org_request_approved" as const,
    actor_user_id: adminUserId,
    community_id: community.id,
    metadata: {
      request_id: requestId,
      community_id: community.id,
      requester_user_id: request.user_id,
      ...(reason && { reason }),
      ...(request.status === "rejected" && { from_status: "rejected" }),
    },
  });

  // Cancel any other pending requests from the same user
  if (request.status === "rejected") {
    const { data: duplicates, error: duplicatesError } = await supabase
      .from("community_requests")
      .select("id")
      .eq("user_id", request.user_id)
      .eq("status", "pending")
      .neq("id", requestId);

    if (duplicatesError) {
      console.error("Failed to lookup duplicate pending requests", {
        requestId,
        userId: request.user_id,
        error: duplicatesError,
      });
    } else if (duplicates && duplicates.length > 0) {
      for (const dup of duplicates) {
        const { error: cancelError } = await supabase
          .from("community_requests")
          .update({
            status: "cancelled" as const,
            admin_notes: `Automatically closed — community granted via request #${requestId}`,
            reviewed_by: adminUserId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", dup.id);

        if (cancelError) {
          console.error("Failed to cancel duplicate pending request", {
            duplicateId: dup.id,
            error: cancelError,
          });
        } else {
          await supabase.from("audit_log").insert({
            action: "admin.org_request_cancelled" as const,
            actor_user_id: adminUserId,
            metadata: {
              request_id: dup.id,
              requester_user_id: request.user_id,
              reason: `Automatically closed — community granted via request #${requestId}`,
              auto_cancelled: true,
            },
          });
        }
      }
    }
  }

  return { request: updatedRequest, organization: community };
}

/**
 * Reject an organization request (admin action).
 * Stores reason, creates notification.
 */
export async function rejectCommunityRequest(
  supabase: TypedClient,
  requestId: number,
  adminUserId: string,
  reason: string
) {
  // Fetch the request
  const { data: request, error: fetchError } = await supabase
    .from("community_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) throw new Error("Request not found");
  if (request.status !== "pending") {
    throw new Error("Request is no longer pending");
  }

  // Update request status
  const { error: updateError } = await supabase
    .from("community_requests")
    .update({
      status: "rejected" as const,
      admin_notes: reason,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) throw updateError;

  // Create in-app notification
  const { error: notificationError } = await supabase
    .from("notifications")
    .insert({
      user_id: request.user_id,
      type: "org_request_rejected" as const,
      title: "Organization request update",
      body: `Your request for "${request.name}" was not approved.`,
      action_url: "/communities/create",
    });

  if (notificationError) {
    console.error("Failed to create org_request_rejected notification", {
      requestId,
      userId: request.user_id,
      error: notificationError,
    });
  }

  // Audit log
  await supabase.from("audit_log").insert({
    action: "admin.org_request_rejected" as const,
    actor_user_id: adminUserId,
    metadata: {
      request_id: requestId,
      requester_user_id: request.user_id,
      reason,
    },
  });

  return request;
}
