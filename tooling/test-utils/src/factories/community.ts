import { Factory } from "fishery";
import type { Tables } from "@trainers/supabase/types";

export const organizationFactory = Factory.define<Tables<"communities">>(
  ({ sequence }) => ({
    id: sequence,
    name: `Organization ${sequence}`,
    slug: `org-${sequence}`,
    owner_user_id: `user-${sequence}`,
    created_at: new Date().toISOString(),
    description: null,
    discord_invite_url: null,
    icon: null,
    logo_url: null,
    platform_fee_percentage: null,
    social_links: [],
    is_public: true,
    registration_mode: "anyone",
    staff_invite_mode: "owner_only",
    status: "active",
    subscription_expires_at: null,
    subscription_started_at: null,
    subscription_tier: null,
    team_sheet_visibility: "after_tournament",
    tier: null,
    updated_at: new Date().toISOString(),
  })
);
