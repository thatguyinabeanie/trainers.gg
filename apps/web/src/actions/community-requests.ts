"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import {
  type ActionResult,
  type CommunitySocialLink,
  type SocialLinkPlatform,
  submitOrganizationRequestSchema,
  type SubmitOrganizationRequestInput,
} from "@trainers/validators";
import { submitCommunityRequest as submitCommunityRequestMutation } from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";

const HANDLE_TO_URL: {
  field: keyof SubmitOrganizationRequestInput;
  platform: SocialLinkPlatform;
  prefix: string;
}[] = [
  { field: "twitter_handle", platform: "twitter", prefix: "https://x.com/" },
  {
    field: "bluesky_handle",
    platform: "bluesky",
    prefix: "https://bsky.app/profile/",
  },
  {
    field: "instagram_handle",
    platform: "instagram",
    prefix: "https://instagram.com/",
  },
  {
    field: "youtube_handle",
    platform: "youtube",
    prefix: "https://youtube.com/@",
  },
  { field: "twitch_handle", platform: "twitch", prefix: "https://twitch.tv/" },
];

function buildSocialLinks(
  data: SubmitOrganizationRequestInput
): CommunitySocialLink[] {
  const links: CommunitySocialLink[] = [];

  for (const m of HANDLE_TO_URL) {
    const handle = data[m.field] as string | undefined;
    if (handle) {
      links.push({ platform: m.platform, url: `${m.prefix}${handle}` });
    }
  }

  if (data.other_url) {
    links.push({ platform: "website", url: data.other_url });
  }

  return links;
}

/**
 * Submit an organization request.
 * Validates input, creates the request, revalidates cache.
 */
export async function submitCommunityRequestAction(
  data: SubmitOrganizationRequestInput
): Promise<ActionResult<{ id: number; slug: string }>> {
  const parsed = submitOrganizationRequestSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const supabase = await createClient();
    const result = await submitCommunityRequestMutation(supabase, {
      name: parsed.data.name.trim(),
      slug: parsed.data.slug.trim(),
      description: parsed.data.description?.trim(),
      discord_invite_url: `https://discord.gg/${parsed.data.discord_invite_code.trim()}`,
      social_links: buildSocialLinks(parsed.data),
    });

    updateTag(CacheTags.ORG_REQUESTS_LIST);

    return {
      success: true,
      data: { id: result.id, slug: result.slug },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to submit community request"),
    };
  }
}
