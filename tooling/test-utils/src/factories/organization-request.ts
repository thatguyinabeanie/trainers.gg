import { Factory } from "fishery";
import type { Tables } from "@trainers/supabase/types";

export const organizationRequestFactory = Factory.define<
  Tables<"organization_requests">
>(({ sequence }) => ({
  id: sequence,
  user_id: `user-uuid-${sequence}`,
  name: `Organization Request ${sequence}`,
  slug: `org-request-${sequence}`,
  description: null,
  status: "pending",
  admin_notes: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));
