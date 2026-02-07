/**
 * Organization API Edge Function
 *
 * RESTful endpoints for organization operations:
 * - GET /api-organizations → List organizations
 * - GET /api-organizations/:slug → Get organization details
 * - POST /api-organizations → Create organization
 * - PATCH /api-organizations/:id → Update organization
 * - POST /api-organizations/:id/invite → Invite staff member
 * - POST /api-organizations/:id/invitations/:inviteId/accept → Accept invitation
 * - POST /api-organizations/:id/invitations/:inviteId/decline → Decline invitation
 * - DELETE /api-organizations/:id/staff/:userId → Remove staff member
 * - DELETE /api-organizations/:id/leave → Leave organization
 */

import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCacheHeaders, CACHE_TTL } from "../_shared/cache.ts";
import type { ActionResult } from "@trainers/validators";
import {
  listPublicOrganizations,
  getOrganizationBySlug,
  getOrganizationById,
} from "@trainers/supabase/queries";
import {
  createOrganization as createOrganizationMutation,
  updateOrganization as updateOrganizationMutation,
  inviteToOrganization as inviteToOrganizationMutation,
  acceptOrganizationInvitation as acceptOrganizationInvitationMutation,
  declineOrganizationInvitation as declineOrganizationInvitationMutation,
  removeStaff as removeStaffMutation,
  leaveOrganization as leaveOrganizationMutation,
} from "@trainers/supabase/mutations";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function authenticateUser(jwt: string | null) {
  if (!jwt) {
    return {
      success: false as const,
      error: "Missing authorization header",
      code: "UNAUTHORIZED",
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      success: false as const,
      error: "Invalid or expired token",
      code: "UNAUTHORIZED",
    };
  }

  return { success: true as const, user, supabase };
}

function jsonResponse(
  data: ActionResult<unknown>,
  status: number,
  cors: Record<string, string>,
  cacheHeaders?: Record<string, string>
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      ...cacheHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const jwt =
      req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const authResult = await authenticateUser(jwt);

    if (!authResult.success) {
      return jsonResponse(
        { success: false, error: authResult.error, code: authResult.code },
        401,
        cors
      );
    }

    const { supabase } = authResult;

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    // GET /api-organizations → List organizations
    if (method === "GET" && pathParts.length === 1) {
      const result = await listPublicOrganizations(supabase);

      return jsonResponse(
        { success: true, data: result },
        200,
        cors,
        getCacheHeaders(CACHE_TTL.ORGANIZATION, 60, true)
      );
    }

    // GET /api-organizations/:slug → Get organization details
    if (method === "GET" && pathParts.length === 2) {
      const slug = pathParts[1];

      const result = await getOrganizationBySlug(supabase, slug);

      if (!result) {
        return jsonResponse(
          {
            success: false,
            error: "Organization not found",
            code: "NOT_FOUND",
          },
          404,
          cors
        );
      }

      return jsonResponse(
        { success: true, data: result },
        200,
        cors,
        getCacheHeaders(CACHE_TTL.ORGANIZATION, 60, true)
      );
    }

    // POST /api-organizations → Create organization
    if (method === "POST" && pathParts.length === 1) {
      const body = await req.json();

      // TODO: Add Zod validation for createOrganizationSchema

      const result = await createOrganizationMutation(supabase, body);

      return jsonResponse(
        {
          success: true,
          data: { id: result.id, slug: result.slug, name: result.name },
        },
        201,
        cors
      );
    }

    // PATCH /api-organizations/:id → Update organization
    if (method === "PATCH" && pathParts.length === 2) {
      const organizationId = parseInt(pathParts[1], 10);

      if (isNaN(organizationId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid organization ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      const body = await req.json();

      // TODO: Add Zod validation for updateOrganizationSchema

      await updateOrganizationMutation(supabase, organizationId, body);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-organizations/:id/invite → Invite staff member
    if (method === "POST" && pathParts[2] === "invite") {
      const organizationId = parseInt(pathParts[1], 10);

      if (isNaN(organizationId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid organization ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      const body = await req.json();
      const { email, role } = body;

      if (!email || !role) {
        return jsonResponse(
          {
            success: false,
            error: "Email and role required",
            code: "MISSING_FIELDS",
          },
          400,
          cors
        );
      }

      await inviteToOrganizationMutation(supabase, organizationId, email, role);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-organizations/:id/invitations/:inviteId/accept → Accept invitation
    if (
      method === "POST" &&
      pathParts[2] === "invitations" &&
      pathParts[4] === "accept"
    ) {
      const invitationId = parseInt(pathParts[3], 10);

      if (isNaN(invitationId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid invitation ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      await acceptOrganizationInvitationMutation(supabase, invitationId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-organizations/:id/invitations/:inviteId/decline → Decline invitation
    if (
      method === "POST" &&
      pathParts[2] === "invitations" &&
      pathParts[4] === "decline"
    ) {
      const invitationId = parseInt(pathParts[3], 10);

      if (isNaN(invitationId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid invitation ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      await declineOrganizationInvitationMutation(supabase, invitationId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // DELETE /api-organizations/:id/staff/:userId → Remove staff member
    if (method === "DELETE" && pathParts[2] === "staff") {
      const organizationId = parseInt(pathParts[1], 10);
      const userId = pathParts[3];

      if (isNaN(organizationId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid organization ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      if (!userId) {
        return jsonResponse(
          {
            success: false,
            error: "User ID required",
            code: "MISSING_FIELD",
          },
          400,
          cors
        );
      }

      await removeStaffMutation(supabase, organizationId, userId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // DELETE /api-organizations/:id/leave → Leave organization
    if (method === "DELETE" && pathParts[2] === "leave") {
      const organizationId = parseInt(pathParts[1], 10);

      if (isNaN(organizationId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid organization ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      await leaveOrganizationMutation(supabase, organizationId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // No matching route
    return jsonResponse(
      { success: false, error: "Not found", code: "NOT_FOUND" },
      404,
      cors
    );
  } catch (error) {
    console.error("[api-organizations]", error);

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        code: "INTERNAL_ERROR",
      },
      500,
      cors
    );
  }
});
