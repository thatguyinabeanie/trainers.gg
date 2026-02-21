import { Factory } from "fishery";
import type { Tables } from "@trainers/supabase/types";

export const notificationFactory = Factory.define<Tables<"notifications">>(
  ({ sequence }) => ({
    id: sequence,
    user_id: `user-${sequence}`,
    title: `Notification ${sequence}`,
    body: null,
    type: "match_ready",
    action_url: null,
    created_at: new Date().toISOString(),
    match_id: null,
    read_at: null,
    tournament_id: null,
  })
);
