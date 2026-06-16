import { Factory } from "fishery";
import type { Tables } from "@trainers/supabase/types";

// NOTE: email, first_name, last_name, birth_date, phone_number,
// external_accounts and public_metadata were removed from public.users in the
// PII-split migration (20260616100000). email now lives in auth.users; the
// name/DOB fields live in private.user_pii (see userPiiFactory).
export const userFactory = Factory.define<Tables<"users">>(({ sequence }) => ({
  id: `user-${sequence}`,
  username: `user_${sequence}`,
  bio: null,
  country: null,
  created_at: new Date().toISOString(),
  did: null,
  discord_dm_warn_until: null,
  image: null,
  is_coach: false,
  is_locked: false,
  last_active_at: null,
  last_sign_in_at: null,
  main_alt_id: null,
  name: `Test User ${sequence}`,
  pds_handle: null,
  pds_status: null,
  show_discord_publicly: false,
  sprite_preference: null,
  updated_at: new Date().toISOString(),
}));
