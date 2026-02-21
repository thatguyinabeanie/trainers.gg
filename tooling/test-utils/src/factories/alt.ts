import { Factory } from "fishery";
import type { Tables } from "@trainers/supabase/types";

export const altFactory = Factory.define<Tables<"alts">>(({ sequence }) => ({
  id: sequence,
  user_id: `user-${sequence}`,
  username: `alt_${sequence}`,
  avatar_url: null,
  bio: null,
  created_at: new Date().toISOString(),
  tier: null,
  tier_expires_at: null,
  tier_started_at: null,
  updated_at: new Date().toISOString(),
}));
