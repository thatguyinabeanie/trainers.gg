import { Factory } from "fishery";
import type { Tables } from "@trainers/supabase/types";

export const organizationFactory = Factory.define<Tables<"organizations">>(
  ({ sequence }) => ({
    id: sequence,
    name: `Organization ${sequence}`,
    slug: `org-${sequence}`,
    owner_user_id: `user-${sequence}`,
    created_at: new Date().toISOString(),
    description: null,
    icon: null,
    logo_url: null,
    platform_fee_percentage: null,
    social_links: [],
    status: "active",
    subscription_expires_at: null,
    subscription_started_at: null,
    subscription_tier: null,
    tier: null,
    updated_at: new Date().toISOString(),
  })
);
