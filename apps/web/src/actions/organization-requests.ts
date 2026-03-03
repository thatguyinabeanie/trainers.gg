"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import { submitOrganizationRequestSchema } from "@trainers/validators";
import { submitOrganizationRequest as submitOrganizationRequestMutation } from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Submit an organization request.
 * Validates input, creates the request, revalidates cache.
 */
export async function submitOrganizationRequestAction(data: {
  name: string;
  slug: string;
  description?: string;
}): Promise<ActionResult<{ id: number; slug: string }>> {
  const parsed = submitOrganizationRequestSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const supabase = await createClient();
    const result = await submitOrganizationRequestMutation(supabase, {
      name: parsed.data.name.trim(),
      slug: parsed.data.slug.trim(),
      description: parsed.data.description?.trim(),
    });

    updateTag(CacheTags.ORG_REQUESTS_LIST);

    return {
      success: true,
      data: { id: result.id, slug: result.slug },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to submit organization request"),
    };
  }
}
