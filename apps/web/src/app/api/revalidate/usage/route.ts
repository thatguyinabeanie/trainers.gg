/**
 * Usage Stats Cache Revalidation Endpoint
 *
 * Called by Supabase edge functions and CLI import scripts after new usage data
 * lands in the database. These non-Next.js contexts cannot call `updateTag()`
 * (a Server Action–only API), so they POST here to trigger revalidation via
 * `revalidateTag(tag, "max")` instead.
 *
 * Why `revalidateTag` and not `updateTag`:
 * - `updateTag()` is only available inside Server Actions and provides
 *   read-your-own-writes semantics for the current request.
 * - `revalidateTag(tag, "max")` is the correct Route Handler form; it uses
 *   stale-while-revalidate semantics so the next request after invalidation
 *   receives fresh data. The single-arg form of `revalidateTag` is deprecated.
 *
 * Authorization: Bearer ${USAGE_REVALIDATE_SECRET}
 * Fails closed — returns 401 if the env var is unset OR the token does not match.
 *
 * POST /api/revalidate/usage
 */

import { z, ZodError } from "@trainers/validators";

import { revalidateUsageStatsCaches } from "@/lib/cache-invalidation";

// =============================================================================
// Schema
// =============================================================================

const bodySchema = z.object({
  // trim() rejects whitespace-only entries before min(1) — a blank tag would
  // trigger a pointless revalidation and confuse the logs.
  formats: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
});

// =============================================================================
// Route handler
// =============================================================================

export async function POST(request: Request): Promise<Response> {
  // Verify Bearer token. Fail closed if USAGE_REVALIDATE_SECRET is unset.
  const secret = process.env.USAGE_REVALIDATE_SECRET;
  if (!secret) {
    console.error(
      "[revalidate/usage] USAGE_REVALIDATE_SECRET is not configured"
    );
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body — empty or absent body is valid (revalidates the broad tag only).
  let parsed: z.infer<typeof bodySchema>;
  try {
    const text = await request.text();
    const json = text.trim() ? (JSON.parse(text) as unknown) : {};
    parsed = bodySchema.parse(json);
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const formats = parsed.formats ?? [];
  revalidateUsageStatsCaches(formats);

  return Response.json({ revalidated: true, formats });
}
