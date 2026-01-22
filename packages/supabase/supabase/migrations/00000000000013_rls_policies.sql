-- =============================================================================
-- Row Level Security Policies
-- =============================================================================
-- RLS policies for all tables.
-- Uses DROP POLICY IF EXISTS before CREATE POLICY for idempotency
-- (PostgreSQL doesn't support CREATE OR REPLACE POLICY).

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================
-- Note: ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent.

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."group_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profile_group_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."feature_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pokemon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_pokemon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_template_phases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournaments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_phases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_rounds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_matches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_pairings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_registration_pokemon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_player_stats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_standings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tournament_opponent_history" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Users Policies
-- =============================================================================

DROP POLICY IF EXISTS "Users are viewable by everyone" ON "public"."users";
CREATE POLICY "Users are viewable by everyone" 
    ON "public"."users" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow user creation" ON "public"."users";
CREATE POLICY "Allow user creation" 
    ON "public"."users" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own record" ON "public"."users";
CREATE POLICY "Users can update own record" 
    ON "public"."users" FOR UPDATE USING (("id" = "auth"."uid"()));

-- =============================================================================
-- Profiles Policies
-- =============================================================================

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON "public"."profiles";
CREATE POLICY "Profiles are viewable by everyone" 
    ON "public"."profiles" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."profiles";
CREATE POLICY "Users can insert own profile" 
    ON "public"."profiles" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));

DROP POLICY IF EXISTS "Users can update own profile" ON "public"."profiles";
CREATE POLICY "Users can update own profile" 
    ON "public"."profiles" FOR UPDATE USING (("user_id" = "auth"."uid"()));

-- =============================================================================
-- Rate Limits Policies
-- =============================================================================

DROP POLICY IF EXISTS "Rate limits service only" ON "public"."rate_limits";
CREATE POLICY "Rate limits service only" 
    ON "public"."rate_limits" USING (false);

-- =============================================================================
-- Organizations Policies
-- =============================================================================

DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON "public"."organizations";
CREATE POLICY "Organizations are viewable by everyone" 
    ON "public"."organizations" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON "public"."organizations";
CREATE POLICY "Authenticated users can create organizations" 
    ON "public"."organizations" FOR INSERT WITH CHECK (("owner_profile_id" = "public"."get_current_profile_id"()));

DROP POLICY IF EXISTS "Org owners can update" ON "public"."organizations";
CREATE POLICY "Org owners can update" 
    ON "public"."organizations" FOR UPDATE USING (("owner_profile_id" IN ( 
        SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
    )));

-- =============================================================================
-- Organization Members Policies
-- =============================================================================

DROP POLICY IF EXISTS "Org members are viewable by everyone" ON "public"."organization_members";
CREATE POLICY "Org members are viewable by everyone" 
    ON "public"."organization_members" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Org owners can add members" ON "public"."organization_members";
CREATE POLICY "Org owners can add members" 
    ON "public"."organization_members" FOR INSERT WITH CHECK ((EXISTS ( 
        SELECT 1 FROM "public"."organizations" "o"
        WHERE (("o"."id" = "organization_members"."organization_id") 
        AND ("o"."owner_profile_id" = "public"."get_current_profile_id"()))
    )));

DROP POLICY IF EXISTS "Org owners can remove members" ON "public"."organization_members";
CREATE POLICY "Org owners can remove members" 
    ON "public"."organization_members" FOR DELETE USING (
        ((EXISTS ( 
            SELECT 1 FROM "public"."organizations" "o"
            WHERE (("o"."id" = "organization_members"."organization_id") 
            AND ("o"."owner_profile_id" = "public"."get_current_profile_id"()))
        )) OR ("profile_id" = "public"."get_current_profile_id"()))
    );

-- =============================================================================
-- Organization Invitations Policies
-- =============================================================================

DROP POLICY IF EXISTS "Org invitations viewable by involved parties" ON "public"."organization_invitations";
CREATE POLICY "Org invitations viewable by involved parties" 
    ON "public"."organization_invitations" FOR SELECT USING (
        (("invited_profile_id" IN ( 
            SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
        )) OR ("invited_by_profile_id" IN ( 
            SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
        )))
    );

-- =============================================================================
-- Organization Requests Policies
-- =============================================================================

DROP POLICY IF EXISTS "Org requests viewable by requester" ON "public"."organization_requests";
CREATE POLICY "Org requests viewable by requester" 
    ON "public"."organization_requests" FOR SELECT USING (
        ("requested_by_profile_id" IN ( 
            SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
        ))
    );

DROP POLICY IF EXISTS "Users can create org requests" ON "public"."organization_requests";
CREATE POLICY "Users can create org requests" 
    ON "public"."organization_requests" FOR INSERT WITH CHECK (
        ("requested_by_profile_id" = "public"."get_current_profile_id"())
    );

-- =============================================================================
-- RBAC Policies (Groups, Roles, Permissions)
-- =============================================================================

DROP POLICY IF EXISTS "Groups are viewable by everyone" ON "public"."groups";
CREATE POLICY "Groups are viewable by everyone" 
    ON "public"."groups" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Roles are viewable by everyone" ON "public"."roles";
CREATE POLICY "Roles are viewable by everyone" 
    ON "public"."roles" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Group roles are viewable by everyone" ON "public"."group_roles";
CREATE POLICY "Group roles are viewable by everyone" 
    ON "public"."group_roles" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permissions are viewable by everyone" ON "public"."permissions";
CREATE POLICY "Permissions are viewable by everyone" 
    ON "public"."permissions" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Role permissions are viewable by everyone" ON "public"."role_permissions";
CREATE POLICY "Role permissions are viewable by everyone" 
    ON "public"."role_permissions" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Profile group roles are viewable by everyone" ON "public"."profile_group_roles";
CREATE POLICY "Profile group roles are viewable by everyone" 
    ON "public"."profile_group_roles" FOR SELECT USING (true);

-- =============================================================================
-- Feature Usage Policies
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own feature usage" ON "public"."feature_usage";
CREATE POLICY "Users can view own feature usage" 
    ON "public"."feature_usage" FOR SELECT USING (
        ((("entity_type" = 'profile'::"public"."entity_type") 
            AND ("entity_id" IN ( 
                SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
            ))) 
        OR (("entity_type" = 'organization'::"public"."entity_type") 
            AND ("entity_id" IN ( 
                SELECT "o"."id" FROM ("public"."organizations" "o"
                JOIN "public"."profiles" "p" ON (("o"."owner_profile_id" = "p"."id")))
                WHERE ("p"."user_id" = "auth"."uid"())
            ))))
    );

-- =============================================================================
-- Subscriptions Policies
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own subscriptions" ON "public"."subscriptions";
CREATE POLICY "Users can view own subscriptions" 
    ON "public"."subscriptions" FOR SELECT USING (
        ((("entity_type" = 'profile'::"public"."entity_type") 
            AND ("entity_id" IN ( 
                SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
            ))) 
        OR (("entity_type" = 'organization'::"public"."entity_type") 
            AND ("entity_id" IN ( 
                SELECT "o"."id" FROM ("public"."organizations" "o"
                JOIN "public"."profiles" "p" ON (("o"."owner_profile_id" = "p"."id")))
                WHERE ("p"."user_id" = "auth"."uid"())
            ))))
    );

-- =============================================================================
-- Pokemon Policies
-- =============================================================================

DROP POLICY IF EXISTS "Pokemon viewable via teams" ON "public"."pokemon";
CREATE POLICY "Pokemon viewable via teams" 
    ON "public"."pokemon" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create pokemon" ON "public"."pokemon";
CREATE POLICY "Users can create pokemon" 
    ON "public"."pokemon" FOR INSERT WITH CHECK (true);

-- =============================================================================
-- Teams Policies
-- =============================================================================

DROP POLICY IF EXISTS "Public teams are viewable" ON "public"."teams";
CREATE POLICY "Public teams are viewable" 
    ON "public"."teams" FOR SELECT USING (
        (("is_public" = true) OR ("created_by" IN ( 
            SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
        )))
    );

DROP POLICY IF EXISTS "Users can insert own teams" ON "public"."teams";
CREATE POLICY "Users can insert own teams" 
    ON "public"."teams" FOR INSERT WITH CHECK (
        ("created_by" IN ( 
            SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
        ))
    );

DROP POLICY IF EXISTS "Users can update own teams" ON "public"."teams";
CREATE POLICY "Users can update own teams" 
    ON "public"."teams" FOR UPDATE USING (
        ("created_by" IN ( 
            SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
        ))
    );

DROP POLICY IF EXISTS "Users can delete own teams" ON "public"."teams";
CREATE POLICY "Users can delete own teams" 
    ON "public"."teams" FOR DELETE USING (
        ("created_by" IN ( 
            SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
        ))
    );

-- =============================================================================
-- Team Pokemon Policies
-- =============================================================================

DROP POLICY IF EXISTS "Team pokemon viewable" ON "public"."team_pokemon";
CREATE POLICY "Team pokemon viewable" 
    ON "public"."team_pokemon" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Team owners can manage team pokemon" ON "public"."team_pokemon";
CREATE POLICY "Team owners can manage team pokemon" 
    ON "public"."team_pokemon" FOR INSERT WITH CHECK ((EXISTS ( 
        SELECT 1 FROM "public"."teams" "t"
        WHERE (("t"."id" = "team_pokemon"."team_id") 
        AND ("t"."created_by" = "public"."get_current_profile_id"()))
    )));

DROP POLICY IF EXISTS "Team owners can delete team pokemon" ON "public"."team_pokemon";
CREATE POLICY "Team owners can delete team pokemon" 
    ON "public"."team_pokemon" FOR DELETE USING ((EXISTS ( 
        SELECT 1 FROM "public"."teams" "t"
        WHERE (("t"."id" = "team_pokemon"."team_id") 
        AND ("t"."created_by" = "public"."get_current_profile_id"()))
    )));

-- =============================================================================
-- Tournament Templates Policies
-- =============================================================================

DROP POLICY IF EXISTS "Public templates are viewable" ON "public"."tournament_templates";
CREATE POLICY "Public templates are viewable" 
    ON "public"."tournament_templates" FOR SELECT USING (
        (("is_public" = true) OR ("created_by" IN ( 
            SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
        )))
    );

DROP POLICY IF EXISTS "Template phases are viewable" ON "public"."tournament_template_phases";
CREATE POLICY "Template phases are viewable" 
    ON "public"."tournament_template_phases" FOR SELECT USING (true);

-- =============================================================================
-- Tournaments Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON "public"."tournaments";
CREATE POLICY "Tournaments are viewable by everyone" 
    ON "public"."tournaments" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Org members can create tournaments" ON "public"."tournaments";
CREATE POLICY "Org members can create tournaments" 
    ON "public"."tournaments" FOR INSERT WITH CHECK ((EXISTS ( 
        SELECT 1 FROM "public"."organizations" "o"
        WHERE (("o"."id" = "tournaments"."organization_id") 
        AND (("o"."owner_profile_id" = "public"."get_current_profile_id"()) 
        OR (EXISTS ( 
            SELECT 1 FROM "public"."organization_members" "om"
            WHERE (("om"."organization_id" = "o"."id") 
            AND ("om"."profile_id" = "public"."get_current_profile_id"()))
        ))))
    )));

DROP POLICY IF EXISTS "Org members can update tournaments" ON "public"."tournaments";
CREATE POLICY "Org members can update tournaments" 
    ON "public"."tournaments" FOR UPDATE USING ((EXISTS ( 
        SELECT 1 FROM "public"."organizations" "o"
        WHERE (("o"."id" = "tournaments"."organization_id") 
        AND (("o"."owner_profile_id" = "public"."get_current_profile_id"()) 
        OR (EXISTS ( 
            SELECT 1 FROM "public"."organization_members" "om"
            WHERE (("om"."organization_id" = "o"."id") 
            AND ("om"."profile_id" = "public"."get_current_profile_id"()))
        ))))
    )));

-- =============================================================================
-- Tournament Phases Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournament phases are viewable" ON "public"."tournament_phases";
CREATE POLICY "Tournament phases are viewable" 
    ON "public"."tournament_phases" FOR SELECT USING (true);

-- =============================================================================
-- Tournament Rounds Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournament rounds are viewable" ON "public"."tournament_rounds";
CREATE POLICY "Tournament rounds are viewable" 
    ON "public"."tournament_rounds" FOR SELECT USING (true);

-- =============================================================================
-- Tournament Matches Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournament matches are viewable" ON "public"."tournament_matches";
CREATE POLICY "Tournament matches are viewable" 
    ON "public"."tournament_matches" FOR SELECT USING (true);

-- =============================================================================
-- Tournament Pairings Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournament pairings are viewable" ON "public"."tournament_pairings";
CREATE POLICY "Tournament pairings are viewable" 
    ON "public"."tournament_pairings" FOR SELECT USING (true);

-- =============================================================================
-- Tournament Registrations Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournament registrations are viewable" ON "public"."tournament_registrations";
CREATE POLICY "Tournament registrations are viewable" 
    ON "public"."tournament_registrations" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can register for tournaments" ON "public"."tournament_registrations";
CREATE POLICY "Users can register for tournaments" 
    ON "public"."tournament_registrations" FOR INSERT WITH CHECK (
        ("profile_id" = "public"."get_current_profile_id"())
    );

DROP POLICY IF EXISTS "Users can update own registration" ON "public"."tournament_registrations";
CREATE POLICY "Users can update own registration" 
    ON "public"."tournament_registrations" FOR UPDATE USING (
        ("profile_id" = "public"."get_current_profile_id"())
    );

DROP POLICY IF EXISTS "Users can cancel own registration" ON "public"."tournament_registrations";
CREATE POLICY "Users can cancel own registration" 
    ON "public"."tournament_registrations" FOR DELETE USING (
        ("profile_id" = "public"."get_current_profile_id"())
    );

-- =============================================================================
-- Tournament Registration Pokemon Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournament registration pokemon viewable" ON "public"."tournament_registration_pokemon";
CREATE POLICY "Tournament registration pokemon viewable" 
    ON "public"."tournament_registration_pokemon" FOR SELECT USING (true);

-- =============================================================================
-- Tournament Invitations Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournament invitations viewable by involved" ON "public"."tournament_invitations";
CREATE POLICY "Tournament invitations viewable by involved" 
    ON "public"."tournament_invitations" FOR SELECT USING (
        (("invited_profile_id" IN ( 
            SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
        )) OR ("invited_by_profile_id" IN ( 
            SELECT "profiles"."id" FROM "public"."profiles" WHERE ("profiles"."user_id" = "auth"."uid"())
        )))
    );

-- =============================================================================
-- Tournament Events Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournament events are viewable" ON "public"."tournament_events";
CREATE POLICY "Tournament events are viewable" 
    ON "public"."tournament_events" FOR SELECT USING (true);

-- =============================================================================
-- Tournament Player Stats Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournament player stats are viewable" ON "public"."tournament_player_stats";
CREATE POLICY "Tournament player stats are viewable" 
    ON "public"."tournament_player_stats" FOR SELECT USING (true);

-- =============================================================================
-- Tournament Standings Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournament standings are viewable" ON "public"."tournament_standings";
CREATE POLICY "Tournament standings are viewable" 
    ON "public"."tournament_standings" FOR SELECT USING (true);

-- =============================================================================
-- Tournament Opponent History Policies
-- =============================================================================

DROP POLICY IF EXISTS "Tournament opponent history is viewable" ON "public"."tournament_opponent_history";
CREATE POLICY "Tournament opponent history is viewable" 
    ON "public"."tournament_opponent_history" FOR SELECT USING (true);
