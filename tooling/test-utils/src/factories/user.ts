import { Factory } from "fishery";
import type { Tables } from "@trainers/supabase/types";

export const userFactory = Factory.define<Tables<"users">>(({ sequence }) => ({
  id: `user-${sequence}`,
  username: `user_${sequence}`,
  email: `user${sequence}@test.local`,
  bio: null,
  birth_date: null,
  country: null,
  created_at: new Date().toISOString(),
  did: null,
  external_accounts: null,
  first_name: null,
  image: null,
  is_locked: false,
  last_active_at: null,
  last_name: null,
  last_sign_in_at: null,
  main_alt_id: null,
  name: `Test User ${sequence}`,
  pds_handle: null,
  pds_status: null,
  phone_number: null,
  public_metadata: null,
  sprite_preference: null,
  updated_at: new Date().toISOString(),
}));
