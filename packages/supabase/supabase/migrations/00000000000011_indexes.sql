-- =============================================================================
-- Indexes
-- =============================================================================
-- Performance indexes for all tables.

-- Users indexes
CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");
CREATE INDEX "idx_users_username" ON "public"."users" USING "btree" ("username");
CREATE INDEX "idx_users_main_profile" ON "public"."users" USING "btree" ("main_profile_id");
CREATE INDEX "idx_users_last_active" ON "public"."users" USING "btree" ("last_active_at");
CREATE INDEX "users_first_name_idx" ON "public"."users" USING "btree" ("first_name");
CREATE INDEX "users_last_name_idx" ON "public"."users" USING "btree" ("last_name");
CREATE INDEX "users_birth_date_idx" ON "public"."users" USING "btree" ("birth_date");
CREATE INDEX "users_country_idx" ON "public"."users" USING "btree" ("country");

-- Profiles indexes
CREATE INDEX "idx_profiles_user" ON "public"."profiles" USING "btree" ("user_id");
CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");
CREATE INDEX "idx_profiles_tier" ON "public"."profiles" USING "btree" ("tier");
CREATE INDEX "idx_profiles_tier_expiry" ON "public"."profiles" USING "btree" ("tier_expires_at");

-- Rate limits indexes
CREATE INDEX "idx_rate_limits_identifier" ON "public"."rate_limits" USING "btree" ("identifier");
CREATE INDEX "idx_rate_limits_expires" ON "public"."rate_limits" USING "btree" ("expires_at");

-- Organizations indexes
CREATE INDEX "idx_organizations_slug" ON "public"."organizations" USING "btree" ("slug");
CREATE INDEX "idx_organizations_owner" ON "public"."organizations" USING "btree" ("owner_profile_id");
CREATE INDEX "idx_organizations_tier" ON "public"."organizations" USING "btree" ("tier");
CREATE INDEX "idx_organizations_subscription_tier" ON "public"."organizations" USING "btree" ("subscription_tier");

-- Organization members indexes
CREATE INDEX "idx_org_members_org" ON "public"."organization_members" USING "btree" ("organization_id");
CREATE INDEX "idx_org_members_profile" ON "public"."organization_members" USING "btree" ("profile_id");

-- Organization invitations indexes
CREATE INDEX "idx_org_invitations_org" ON "public"."organization_invitations" USING "btree" ("organization_id");
CREATE INDEX "idx_org_invitations_invited" ON "public"."organization_invitations" USING "btree" ("invited_profile_id");
CREATE INDEX "idx_org_invitations_status" ON "public"."organization_invitations" USING "btree" ("status");

-- Groups indexes
CREATE INDEX "idx_groups_org" ON "public"."groups" USING "btree" ("organization_id");

-- Group roles indexes
CREATE INDEX "idx_group_roles_group" ON "public"."group_roles" USING "btree" ("group_id");
CREATE INDEX "idx_group_roles_role" ON "public"."group_roles" USING "btree" ("role_id");

-- Role permissions indexes
CREATE INDEX "idx_role_permissions_role" ON "public"."role_permissions" USING "btree" ("role_id");

-- Profile group roles indexes
CREATE INDEX "idx_profile_group_roles_profile" ON "public"."profile_group_roles" USING "btree" ("profile_id");

-- Feature usage indexes
CREATE INDEX "idx_feature_usage_entity" ON "public"."feature_usage" USING "btree" ("entity_id", "entity_type");
CREATE INDEX "idx_feature_usage_feature" ON "public"."feature_usage" USING "btree" ("entity_id", "entity_type", "feature_key");
CREATE INDEX "idx_feature_usage_period" ON "public"."feature_usage" USING "btree" ("period_start", "period_end");

-- Subscriptions indexes
CREATE INDEX "idx_subscriptions_entity" ON "public"."subscriptions" USING "btree" ("entity_id", "entity_type");
CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");
CREATE INDEX "idx_subscriptions_expires" ON "public"."subscriptions" USING "btree" ("expires_at");
CREATE INDEX "idx_subscriptions_stripe" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");

-- Pokemon indexes
CREATE INDEX "idx_pokemon_species" ON "public"."pokemon" USING "btree" ("species");

-- Teams indexes
CREATE INDEX "idx_teams_creator" ON "public"."teams" USING "btree" ("created_by");
CREATE INDEX "idx_teams_public" ON "public"."teams" USING "btree" ("is_public") WHERE ("is_public" = true);

-- Team pokemon indexes
CREATE INDEX "idx_team_pokemon_team" ON "public"."team_pokemon" USING "btree" ("team_id");
CREATE INDEX "idx_team_pokemon_pokemon" ON "public"."team_pokemon" USING "btree" ("pokemon_id");

-- Tournament templates indexes
CREATE INDEX "idx_templates_org" ON "public"."tournament_templates" USING "btree" ("organization_id");
CREATE INDEX "idx_templates_creator" ON "public"."tournament_templates" USING "btree" ("created_by");
CREATE INDEX "idx_templates_public" ON "public"."tournament_templates" USING "btree" ("is_public");
CREATE INDEX "idx_templates_official" ON "public"."tournament_templates" USING "btree" ("is_official");

-- Tournament template phases indexes
CREATE INDEX "idx_template_phases_template" ON "public"."tournament_template_phases" USING "btree" ("template_id");

-- Tournaments indexes
CREATE INDEX "idx_tournaments_org" ON "public"."tournaments" USING "btree" ("organization_id");
CREATE INDEX "idx_tournaments_slug" ON "public"."tournaments" USING "btree" ("slug");
CREATE INDEX "idx_tournaments_status" ON "public"."tournaments" USING "btree" ("status");
CREATE INDEX "idx_tournaments_featured" ON "public"."tournaments" USING "btree" ("featured") WHERE ("featured" = true);
CREATE INDEX "idx_tournaments_archived" ON "public"."tournaments" USING "btree" ("archived_at");
CREATE INDEX "idx_tournaments_org_archived" ON "public"."tournaments" USING "btree" ("organization_id", "archived_at");

-- Tournament phases indexes
CREATE INDEX "idx_phases_tournament" ON "public"."tournament_phases" USING "btree" ("tournament_id");
CREATE INDEX "idx_phases_tournament_order" ON "public"."tournament_phases" USING "btree" ("tournament_id", "phase_order");

-- Tournament rounds indexes
CREATE INDEX "idx_rounds_phase" ON "public"."tournament_rounds" USING "btree" ("phase_id");

-- Tournament matches indexes
CREATE INDEX "idx_matches_round" ON "public"."tournament_matches" USING "btree" ("round_id");
CREATE INDEX "idx_matches_round_status" ON "public"."tournament_matches" USING "btree" ("round_id", "status");
CREATE INDEX "idx_matches_profile1" ON "public"."tournament_matches" USING "btree" ("profile1_id");
CREATE INDEX "idx_matches_profile2" ON "public"."tournament_matches" USING "btree" ("profile2_id");

-- Tournament pairings indexes
CREATE INDEX "idx_pairings_tournament" ON "public"."tournament_pairings" USING "btree" ("tournament_id");
CREATE INDEX "idx_pairings_round" ON "public"."tournament_pairings" USING "btree" ("round_id");

-- Tournament registrations indexes
CREATE INDEX "idx_registrations_tournament" ON "public"."tournament_registrations" USING "btree" ("tournament_id");
CREATE INDEX "idx_registrations_profile" ON "public"."tournament_registrations" USING "btree" ("profile_id");
CREATE INDEX "idx_registrations_tournament_status" ON "public"."tournament_registrations" USING "btree" ("tournament_id", "status");

-- Tournament registration pokemon indexes
CREATE INDEX "idx_reg_pokemon_registration" ON "public"."tournament_registration_pokemon" USING "btree" ("tournament_registration_id");

-- Tournament invitations indexes
CREATE INDEX "idx_tournament_invitations_tournament" ON "public"."tournament_invitations" USING "btree" ("tournament_id");
CREATE INDEX "idx_tournament_invitations_invited" ON "public"."tournament_invitations" USING "btree" ("invited_profile_id");
CREATE INDEX "idx_tournament_invitations_status" ON "public"."tournament_invitations" USING "btree" ("status");

-- Tournament events indexes
CREATE INDEX "idx_events_tournament" ON "public"."tournament_events" USING "btree" ("tournament_id");
CREATE INDEX "idx_events_type" ON "public"."tournament_events" USING "btree" ("event_type");
CREATE INDEX "idx_events_tournament_type" ON "public"."tournament_events" USING "btree" ("tournament_id", "event_type");

-- Tournament player stats indexes
CREATE INDEX "idx_player_stats_tournament" ON "public"."tournament_player_stats" USING "btree" ("tournament_id");
CREATE INDEX "idx_player_stats_profile" ON "public"."tournament_player_stats" USING "btree" ("profile_id");

-- Tournament standings indexes
CREATE INDEX "idx_standings_tournament_round" ON "public"."tournament_standings" USING "btree" ("tournament_id", "round_number");

-- Tournament opponent history indexes
CREATE INDEX "idx_opponent_history_tournament" ON "public"."tournament_opponent_history" USING "btree" ("tournament_id");
CREATE INDEX "idx_opponent_history_tournament_profile" ON "public"."tournament_opponent_history" USING "btree" ("tournament_id", "profile_id");
