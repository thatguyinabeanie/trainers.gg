import { type NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// E2E test users matching apps/web/e2e/fixtures/auth.ts
// The handle_new_user() trigger auto-creates public.users + public.alts
const E2E_USERS = [
  {
    id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    email: "admin@trainers.local",
    password: "Password123!",
    username: "admin_trainer",
    firstName: "Admin",
    lastName: "Trainer",
    isAdmin: true,
  },
  {
    id: "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
    email: "player@trainers.local",
    password: "Password123!",
    username: "ash_ketchum",
    firstName: "Ash",
    lastName: "Ketchum",
    isAdmin: false,
  },
  {
    id: "c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f",
    email: "champion@trainers.local",
    password: "Password123!",
    username: "cynthia",
    firstName: "Cynthia",
    lastName: "Shirona",
    isAdmin: false,
  },
  {
    id: "d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a",
    email: "gymleader@trainers.local",
    password: "Password123!",
    username: "brock",
    firstName: "Brock",
    lastName: "Harrison",
    isAdmin: false,
  },
] as const;

// Error codes from @supabase/auth-js that indicate user already exists
const USER_EXISTS_CODES = new Set([
  "email_exists",
  "user_already_exists",
  "identity_already_exists",
]);

export async function POST(request: NextRequest) {
  // Only allow in explicit non-production environments (default-deny)
  if (
    process.env.VERCEL_ENV !== "development" &&
    process.env.VERCEL_ENV !== "preview"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Validate secret
  const secret = request.headers.get("x-e2e-seed-secret");
  const expectedSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const results: Array<{ email: string; status: string; error?: string }> = [];
  let hasErrors = false;

  // Ensure site_admin role exists (only in seeds, not migrations)
  const { error: roleUpsertError } = await supabase.from("roles").upsert(
    {
      name: "site_admin",
      description: "Full administrative access to the entire platform",
      scope: "site",
    },
    { onConflict: "name,scope" }
  );

  if (roleUpsertError) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to upsert site_admin role: ${roleUpsertError.message}`,
      },
      { status: 500 }
    );
  }

  for (const user of E2E_USERS) {
    try {
      // Create auth user — the handle_new_user() trigger auto-creates
      // public.users and public.alts rows
      const { error } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          first_name: user.firstName,
          last_name: user.lastName,
        },
      });

      if (error) {
        // Check structured error code for "already exists" (stable across versions)
        if (error.code && USER_EXISTS_CODES.has(error.code)) {
          results.push({ email: user.email, status: "already_exists" });
        } else {
          hasErrors = true;
          results.push({
            email: user.email,
            status: "error",
            error: `[${error.code ?? error.status}] ${error.message}`,
          });
          continue;
        }
      } else {
        results.push({ email: user.email, status: "created" });
      }

      // Update public.users with PDS fields
      const { error: updateError } = await supabase
        .from("users")
        .update({
          did: `did:plc:${user.username}`,
          pds_status: "active",
          pds_handle: `${user.username}.trainers.gg`,
        })
        .eq("id", user.id);

      if (updateError) {
        hasErrors = true;
        results.push({
          email: user.email,
          status: "error",
          error: `users.update failed: ${updateError.message}`,
        });
      }

      // Assign site_admin role to admin user
      if (user.isAdmin) {
        const { data: roleData, error: roleFetchError } = await supabase
          .from("roles")
          .select("id")
          .eq("name", "site_admin")
          .eq("scope", "site")
          .maybeSingle();

        if (roleFetchError) {
          hasErrors = true;
          results.push({
            email: user.email,
            status: "error",
            error: `roles.select failed: ${roleFetchError.message}`,
          });
        } else if (roleData) {
          const { error: roleAssignError } = await supabase
            .from("user_roles")
            .upsert(
              { user_id: user.id, role_id: roleData.id },
              { onConflict: "user_id,role_id" }
            );

          if (roleAssignError) {
            hasErrors = true;
            results.push({
              email: user.email,
              status: "error",
              error: `user_roles.upsert failed: ${roleAssignError.message}`,
            });
          }
        }
      }
    } catch (err) {
      hasErrors = true;
      results.push({
        email: user.email,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json(
    { success: !hasErrors, results },
    { status: hasErrors ? 207 : 200 }
  );
}
