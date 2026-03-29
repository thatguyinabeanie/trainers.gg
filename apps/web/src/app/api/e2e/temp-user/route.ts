import { type NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Creates or deletes temporary users for E2E onboarding tests.
 * Runs on the preview deployment which has the correct Supabase credentials.
 * Protected by the same secret as the seed endpoint.
 */

function validateRequest(request: NextRequest): NextResponse | null {
  // Only allow in non-production environments
  const vercelEnv = process.env.VERCEL_ENV;
  const isAllowedEnvironment =
    vercelEnv === "development" ||
    vercelEnv === "preview" ||
    (!vercelEnv && process.env.NODE_ENV === "development");

  if (!isAllowedEnvironment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Validate secret
  const secret = request.headers.get("x-e2e-seed-secret");
  const expectedSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

// POST: Create a temporary user for onboarding tests
export async function POST(request: NextRequest) {
  const errorResponse = validateRequest(request);
  if (errorResponse) return errorResponse;

  const supabase = createServiceRoleClient();
  const timestamp = Date.now();
  const email = `e2e-onboarding-${timestamp}@trainers.local`;
  const password = "Password123!";
  const username = `temp_${timestamp.toString(36)}`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    userId: data.user.id,
    email,
    password,
    username,
  });
}

// DELETE: Clean up a temporary user by ID
export async function DELETE(request: NextRequest) {
  const errorResponse = validateRequest(request);
  if (errorResponse) return errorResponse;

  const { userId } = await request.json();

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
