-- Add descriptions to all columns across all public tables
-- This improves documentation and helps with schema understanding

-- =============================================================================
-- users table
-- =============================================================================
COMMENT ON COLUMN public.users.id IS 'Primary key, matches auth.users.id';
COMMENT ON COLUMN public.users.email IS 'Primary email address from auth provider';
COMMENT ON COLUMN public.users.name IS 'Full display name';
COMMENT ON COLUMN public.users.image IS 'Profile image URL';
COMMENT ON COLUMN public.users.username IS 'Unique username for @mentions and URLs';
COMMENT ON COLUMN public.users.phone_number IS 'Phone number for notifications';
COMMENT ON COLUMN public.users.main_alt_id IS 'Primary alt/profile for this user';
COMMENT ON COLUMN public.users.is_locked IS 'Whether the account is locked/suspended';
COMMENT ON COLUMN public.users.external_accounts IS 'Linked external accounts (Discord, etc.)';
COMMENT ON COLUMN public.users.public_metadata IS 'Public metadata visible to other users';
COMMENT ON COLUMN public.users.created_at IS 'Account creation timestamp';
COMMENT ON COLUMN public.users.updated_at IS 'Last profile update timestamp';
COMMENT ON COLUMN public.users.last_sign_in_at IS 'Last successful sign-in timestamp';
COMMENT ON COLUMN public.users.last_active_at IS 'Last activity timestamp';
COMMENT ON COLUMN public.users.first_name IS 'User first name';
COMMENT ON COLUMN public.users.last_name IS 'User last name';
COMMENT ON COLUMN public.users.birth_date IS 'Date of birth for age verification';
COMMENT ON COLUMN public.users.country IS 'Country code (ISO 3166-1 alpha-2)';

-- =============================================================================
-- alts table
-- Alts are alternate player identities for tournaments. A user can have multiple
-- alts for different competitive formats, anonymity, or personas. Alts are NOT
-- the same as "profiles" - that term is reserved for a future feature.
-- =============================================================================
COMMENT ON COLUMN public.alts.id IS 'Primary key';
COMMENT ON COLUMN public.alts.user_id IS 'Owner user ID (references users.id)';
COMMENT ON COLUMN public.alts.display_name IS 'Public display name for this alt';
COMMENT ON COLUMN public.alts.username IS 'Unique username for this alt';
COMMENT ON COLUMN public.alts.bio IS 'Alt biography/description';
COMMENT ON COLUMN public.alts.avatar_url IS 'Alt avatar image URL';
COMMENT ON COLUMN public.alts.battle_tag IS 'In-game battle tag or player ID';
COMMENT ON COLUMN public.alts.tier IS 'Subscription tier for this alt';
COMMENT ON COLUMN public.alts.tier_expires_at IS 'When the subscription tier expires';
COMMENT ON COLUMN public.alts.tier_started_at IS 'When the subscription tier started';
COMMENT ON COLUMN public.alts.created_at IS 'Alt creation timestamp';
COMMENT ON COLUMN public.alts.updated_at IS 'Last alt update timestamp';

-- =============================================================================
-- organizations table
-- =============================================================================
COMMENT ON COLUMN public.organizations.id IS 'Primary key';
COMMENT ON COLUMN public.organizations.name IS 'Organization display name';
COMMENT ON COLUMN public.organizations.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN public.organizations.description IS 'Organization description/about';
COMMENT ON COLUMN public.organizations.icon IS 'Small icon/emoji for the organization';
COMMENT ON COLUMN public.organizations.logo_url IS 'Full logo image URL';
COMMENT ON COLUMN public.organizations.status IS 'Organization status (active, suspended, etc.)';
COMMENT ON COLUMN public.organizations.discord_url IS 'Discord server invite URL';
COMMENT ON COLUMN public.organizations.twitter_url IS 'Twitter/X profile URL';
COMMENT ON COLUMN public.organizations.website_url IS 'Official website URL';
COMMENT ON COLUMN public.organizations.tier IS 'Legacy tier field';
COMMENT ON COLUMN public.organizations.subscription_tier IS 'Current subscription tier';
COMMENT ON COLUMN public.organizations.subscription_expires_at IS 'When subscription expires';
COMMENT ON COLUMN public.organizations.subscription_started_at IS 'When subscription started';
COMMENT ON COLUMN public.organizations.platform_fee_percentage IS 'Platform fee for paid events (0-100)';
COMMENT ON COLUMN public.organizations.created_at IS 'Organization creation timestamp';
COMMENT ON COLUMN public.organizations.updated_at IS 'Last update timestamp';

-- =============================================================================
-- organization_members table (renamed to organization_staff in later migration)
-- =============================================================================
COMMENT ON COLUMN public.organization_members.id IS 'Primary key';
COMMENT ON COLUMN public.organization_members.organization_id IS 'Organization this member belongs to';
COMMENT ON COLUMN public.organization_members.created_at IS 'When membership was created';

-- =============================================================================
-- organization_invitations table
-- =============================================================================
COMMENT ON COLUMN public.organization_invitations.id IS 'Primary key';
COMMENT ON COLUMN public.organization_invitations.organization_id IS 'Organization sending the invitation';
COMMENT ON COLUMN public.organization_invitations.expires_at IS 'When the invitation expires';
COMMENT ON COLUMN public.organization_invitations.created_at IS 'When invitation was created';
COMMENT ON COLUMN public.organization_invitations.responded_at IS 'When invitee responded';

-- =============================================================================
-- organization_requests table
-- =============================================================================
COMMENT ON COLUMN public.organization_requests.id IS 'Primary key';
COMMENT ON COLUMN public.organization_requests.requested_by_alt_id IS 'Alt/profile that requested the organization';
COMMENT ON COLUMN public.organization_requests.name IS 'Requested organization name';
COMMENT ON COLUMN public.organization_requests.slug IS 'Requested URL slug';
COMMENT ON COLUMN public.organization_requests.description IS 'Requested organization description';
COMMENT ON COLUMN public.organization_requests.status IS 'Request status (pending, approved, rejected)';
COMMENT ON COLUMN public.organization_requests.reviewed_by_alt_id IS 'Staff member who reviewed the request';
COMMENT ON COLUMN public.organization_requests.reviewed_at IS 'When the request was reviewed';
COMMENT ON COLUMN public.organization_requests.rejection_reason IS 'Reason for rejection if applicable';
COMMENT ON COLUMN public.organization_requests.created_organization_id IS 'Created organization ID if approved';
COMMENT ON COLUMN public.organization_requests.created_at IS 'Request creation timestamp';

-- =============================================================================
-- groups table
-- =============================================================================
COMMENT ON COLUMN public.groups.id IS 'Primary key';
COMMENT ON COLUMN public.groups.organization_id IS 'Organization this group belongs to';
COMMENT ON COLUMN public.groups.name IS 'Group name (e.g., Admins, Moderators)';
COMMENT ON COLUMN public.groups.description IS 'Group description';
COMMENT ON COLUMN public.groups.created_at IS 'Group creation timestamp';

-- =============================================================================
-- group_roles table
-- =============================================================================
COMMENT ON COLUMN public.group_roles.id IS 'Primary key';
COMMENT ON COLUMN public.group_roles.group_id IS 'Group this role assignment belongs to';
COMMENT ON COLUMN public.group_roles.role_id IS 'Role being assigned to the group';
COMMENT ON COLUMN public.group_roles.created_at IS 'Assignment creation timestamp';

-- =============================================================================
-- alt_group_roles table (renamed to user_group_roles in later migration)
-- =============================================================================
COMMENT ON COLUMN public.alt_group_roles.id IS 'Primary key';
COMMENT ON COLUMN public.alt_group_roles.created_at IS 'Assignment creation timestamp';

-- =============================================================================
-- roles table
-- =============================================================================
COMMENT ON COLUMN public.roles.id IS 'Primary key';
COMMENT ON COLUMN public.roles.name IS 'Role name (e.g., org_admin, site_admin)';
COMMENT ON COLUMN public.roles.description IS 'Human-readable role description';
COMMENT ON COLUMN public.roles.created_at IS 'Role creation timestamp';
COMMENT ON COLUMN public.roles.scope IS 'Role scope (site, organization, tournament)';

-- =============================================================================
-- user_roles table
-- =============================================================================
COMMENT ON COLUMN public.user_roles.id IS 'Primary key';
COMMENT ON COLUMN public.user_roles.user_id IS 'User receiving this role';
COMMENT ON COLUMN public.user_roles.role_id IS 'Role being assigned';
COMMENT ON COLUMN public.user_roles.created_at IS 'Assignment creation timestamp';

-- =============================================================================
-- permissions table
-- =============================================================================
COMMENT ON COLUMN public.permissions.id IS 'Primary key';
COMMENT ON COLUMN public.permissions.key IS 'Permission key (e.g., org:manage, tournament:create)';
COMMENT ON COLUMN public.permissions.name IS 'Human-readable permission name';
COMMENT ON COLUMN public.permissions.description IS 'Permission description';
COMMENT ON COLUMN public.permissions.created_at IS 'Permission creation timestamp';

-- =============================================================================
-- role_permissions table
-- =============================================================================
COMMENT ON COLUMN public.role_permissions.id IS 'Primary key';
COMMENT ON COLUMN public.role_permissions.role_id IS 'Role receiving this permission';
COMMENT ON COLUMN public.role_permissions.permission_id IS 'Permission being granted';
COMMENT ON COLUMN public.role_permissions.created_at IS 'Assignment creation timestamp';

-- =============================================================================
-- tournaments table
-- =============================================================================
COMMENT ON COLUMN public.tournaments.id IS 'Primary key';
COMMENT ON COLUMN public.tournaments.organization_id IS 'Hosting organization';
COMMENT ON COLUMN public.tournaments.name IS 'Tournament display name';
COMMENT ON COLUMN public.tournaments.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN public.tournaments.description IS 'Tournament description and rules';
COMMENT ON COLUMN public.tournaments.format IS 'Game format (e.g., VGC 2024, Series 1)';
COMMENT ON COLUMN public.tournaments.status IS 'Tournament status (draft, open, in_progress, completed)';
COMMENT ON COLUMN public.tournaments.start_date IS 'Tournament start date/time';
COMMENT ON COLUMN public.tournaments.end_date IS 'Tournament end date/time';
COMMENT ON COLUMN public.tournaments.registration_deadline IS 'Registration cutoff time';
COMMENT ON COLUMN public.tournaments.max_participants IS 'Maximum player capacity';
COMMENT ON COLUMN public.tournaments.top_cut_size IS 'Number of players advancing to top cut';
COMMENT ON COLUMN public.tournaments.swiss_rounds IS 'Number of Swiss rounds';
COMMENT ON COLUMN public.tournaments.tournament_format IS 'Tournament structure (swiss, single_elim, double_elim)';
COMMENT ON COLUMN public.tournaments.round_time_minutes IS 'Time limit per round in minutes';
COMMENT ON COLUMN public.tournaments.check_in_window_minutes IS 'Check-in window before tournament start';
COMMENT ON COLUMN public.tournaments.featured IS 'Whether tournament is featured on homepage';
COMMENT ON COLUMN public.tournaments.prize_pool IS 'Prize pool description or amount';
COMMENT ON COLUMN public.tournaments.rental_team_photos_enabled IS 'Allow rental team photo uploads';
COMMENT ON COLUMN public.tournaments.rental_team_photos_required IS 'Require rental team photos';
COMMENT ON COLUMN public.tournaments.template_id IS 'Tournament template used';
COMMENT ON COLUMN public.tournaments.current_phase_id IS 'Currently active phase';
COMMENT ON COLUMN public.tournaments.current_round IS 'Current round number';
COMMENT ON COLUMN public.tournaments.participants IS 'Current participant count';
COMMENT ON COLUMN public.tournaments.tournament_state IS 'Full tournament state JSON';
COMMENT ON COLUMN public.tournaments.archived_at IS 'When tournament was archived';
COMMENT ON COLUMN public.tournaments.archived_by IS 'Who archived the tournament';
COMMENT ON COLUMN public.tournaments.archive_reason IS 'Reason for archival';
COMMENT ON COLUMN public.tournaments.created_at IS 'Tournament creation timestamp';
COMMENT ON COLUMN public.tournaments.updated_at IS 'Last update timestamp';

-- =============================================================================
-- tournament_phases table
-- =============================================================================
COMMENT ON COLUMN public.tournament_phases.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_phases.tournament_id IS 'Parent tournament';
COMMENT ON COLUMN public.tournament_phases.name IS 'Phase name (e.g., Swiss Rounds, Top Cut)';
COMMENT ON COLUMN public.tournament_phases.phase_order IS 'Order of this phase in tournament';
COMMENT ON COLUMN public.tournament_phases.phase_type IS 'Phase type (swiss, single_elimination, etc.)';
COMMENT ON COLUMN public.tournament_phases.status IS 'Phase status (pending, active, completed)';
COMMENT ON COLUMN public.tournament_phases.match_format IS 'Match format (best_of_1, best_of_3)';
COMMENT ON COLUMN public.tournament_phases.round_time_minutes IS 'Time limit per round';
COMMENT ON COLUMN public.tournament_phases.planned_rounds IS 'Planned number of rounds';
COMMENT ON COLUMN public.tournament_phases.current_round IS 'Current round number';
COMMENT ON COLUMN public.tournament_phases.advancement_type IS 'How players advance (top_n, threshold)';
COMMENT ON COLUMN public.tournament_phases.advancement_count IS 'Number of players advancing';
COMMENT ON COLUMN public.tournament_phases.bracket_size IS 'Size of elimination bracket';
COMMENT ON COLUMN public.tournament_phases.total_rounds IS 'Total rounds in this phase';
COMMENT ON COLUMN public.tournament_phases.bracket_format IS 'Bracket format for elimination phases';
COMMENT ON COLUMN public.tournament_phases.seeding_method IS 'How players are seeded';
COMMENT ON COLUMN public.tournament_phases.started_at IS 'When phase started';
COMMENT ON COLUMN public.tournament_phases.completed_at IS 'When phase completed';
COMMENT ON COLUMN public.tournament_phases.created_at IS 'Phase creation timestamp';

-- =============================================================================
-- tournament_rounds table
-- =============================================================================
COMMENT ON COLUMN public.tournament_rounds.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_rounds.phase_id IS 'Parent phase';
COMMENT ON COLUMN public.tournament_rounds.round_number IS 'Round number within phase';
COMMENT ON COLUMN public.tournament_rounds.name IS 'Round name (e.g., Round 1, Finals)';
COMMENT ON COLUMN public.tournament_rounds.status IS 'Round status (pending, active, completed)';
COMMENT ON COLUMN public.tournament_rounds.start_time IS 'When round started';
COMMENT ON COLUMN public.tournament_rounds.end_time IS 'When round ended';
COMMENT ON COLUMN public.tournament_rounds.time_extension_minutes IS 'Additional time added to round';
COMMENT ON COLUMN public.tournament_rounds.created_at IS 'Round creation timestamp';

-- =============================================================================
-- tournament_matches table
-- =============================================================================
COMMENT ON COLUMN public.tournament_matches.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_matches.round_id IS 'Parent round';
COMMENT ON COLUMN public.tournament_matches.alt1_id IS 'First player alt ID';
COMMENT ON COLUMN public.tournament_matches.alt2_id IS 'Second player alt ID';
COMMENT ON COLUMN public.tournament_matches.winner_alt_id IS 'Winner alt ID';
COMMENT ON COLUMN public.tournament_matches.match_points1 IS 'Match points for player 1';
COMMENT ON COLUMN public.tournament_matches.match_points2 IS 'Match points for player 2';
COMMENT ON COLUMN public.tournament_matches.game_wins1 IS 'Game wins for player 1';
COMMENT ON COLUMN public.tournament_matches.game_wins2 IS 'Game wins for player 2';
COMMENT ON COLUMN public.tournament_matches.is_bye IS 'Whether this is a bye match';
COMMENT ON COLUMN public.tournament_matches.status IS 'Match status (pending, in_progress, completed)';
COMMENT ON COLUMN public.tournament_matches.table_number IS 'Assigned table number';
COMMENT ON COLUMN public.tournament_matches.player1_match_confirmed IS 'Player 1 confirmed result';
COMMENT ON COLUMN public.tournament_matches.player2_match_confirmed IS 'Player 2 confirmed result';
COMMENT ON COLUMN public.tournament_matches.match_confirmed_at IS 'When match was confirmed';
COMMENT ON COLUMN public.tournament_matches.staff_requested IS 'Whether staff assistance requested';
COMMENT ON COLUMN public.tournament_matches.staff_requested_at IS 'When staff was requested';
COMMENT ON COLUMN public.tournament_matches.staff_resolved_by IS 'Staff member who resolved issue';
COMMENT ON COLUMN public.tournament_matches.staff_notes IS 'Staff notes about the match';
COMMENT ON COLUMN public.tournament_matches.start_time IS 'When match started';
COMMENT ON COLUMN public.tournament_matches.end_time IS 'When match ended';
COMMENT ON COLUMN public.tournament_matches.created_at IS 'Match creation timestamp';

-- =============================================================================
-- tournament_registrations table
-- =============================================================================
COMMENT ON COLUMN public.tournament_registrations.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_registrations.tournament_id IS 'Tournament being registered for';
COMMENT ON COLUMN public.tournament_registrations.alt_id IS 'Player alt/profile ID';
COMMENT ON COLUMN public.tournament_registrations.status IS 'Registration status (pending, confirmed, dropped)';
COMMENT ON COLUMN public.tournament_registrations.registered_at IS 'When player registered';
COMMENT ON COLUMN public.tournament_registrations.checked_in_at IS 'When player checked in';
COMMENT ON COLUMN public.tournament_registrations.team_name IS 'Optional team name';
COMMENT ON COLUMN public.tournament_registrations.notes IS 'Registration notes';
COMMENT ON COLUMN public.tournament_registrations.team_id IS 'Linked Pokemon team ID';
COMMENT ON COLUMN public.tournament_registrations.rental_team_photo_url IS 'Rental team screenshot URL';
COMMENT ON COLUMN public.tournament_registrations.rental_team_photo_key IS 'Storage key for rental photo';
COMMENT ON COLUMN public.tournament_registrations.rental_team_photo_uploaded_at IS 'When photo was uploaded';
COMMENT ON COLUMN public.tournament_registrations.rental_team_photo_verified IS 'Whether photo was verified';
COMMENT ON COLUMN public.tournament_registrations.rental_team_photo_verified_by IS 'Who verified the photo';
COMMENT ON COLUMN public.tournament_registrations.rental_team_photo_verified_at IS 'When photo was verified';
COMMENT ON COLUMN public.tournament_registrations.created_at IS 'Registration creation timestamp';

-- =============================================================================
-- tournament_registration_pokemon table
-- =============================================================================
COMMENT ON COLUMN public.tournament_registration_pokemon.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_registration_pokemon.tournament_registration_id IS 'Parent registration';
COMMENT ON COLUMN public.tournament_registration_pokemon.pokemon_id IS 'Pokemon on the team';
COMMENT ON COLUMN public.tournament_registration_pokemon.team_position IS 'Position in team (1-6)';
COMMENT ON COLUMN public.tournament_registration_pokemon.created_at IS 'Creation timestamp';

-- =============================================================================
-- tournament_player_stats table
-- =============================================================================
COMMENT ON COLUMN public.tournament_player_stats.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_player_stats.tournament_id IS 'Tournament these stats belong to';
COMMENT ON COLUMN public.tournament_player_stats.alt_id IS 'Player alt ID';
COMMENT ON COLUMN public.tournament_player_stats.match_points IS 'Total match points earned';
COMMENT ON COLUMN public.tournament_player_stats.matches_played IS 'Number of matches played';
COMMENT ON COLUMN public.tournament_player_stats.match_wins IS 'Number of match wins';
COMMENT ON COLUMN public.tournament_player_stats.match_losses IS 'Number of match losses';
COMMENT ON COLUMN public.tournament_player_stats.match_win_percentage IS 'Match win percentage (0-1)';
COMMENT ON COLUMN public.tournament_player_stats.game_wins IS 'Total game wins';
COMMENT ON COLUMN public.tournament_player_stats.game_losses IS 'Total game losses';
COMMENT ON COLUMN public.tournament_player_stats.game_win_percentage IS 'Game win percentage (0-1)';
COMMENT ON COLUMN public.tournament_player_stats.opponent_match_win_percentage IS 'Average opponent match win % (tiebreaker)';
COMMENT ON COLUMN public.tournament_player_stats.opponent_game_win_percentage IS 'Average opponent game win % (tiebreaker)';
COMMENT ON COLUMN public.tournament_player_stats.opponent_opponent_match_win_percentage IS 'Average opponent''s opponents'' match win %';
COMMENT ON COLUMN public.tournament_player_stats.strength_of_schedule IS 'Strength of schedule metric';
COMMENT ON COLUMN public.tournament_player_stats.buchholz_score IS 'Buchholz tiebreaker score';
COMMENT ON COLUMN public.tournament_player_stats.modified_buchholz_score IS 'Modified Buchholz score';
COMMENT ON COLUMN public.tournament_player_stats.last_tiebreaker_update IS 'When tiebreakers were last calculated';
COMMENT ON COLUMN public.tournament_player_stats.current_standing IS 'Current tournament standing/rank';
COMMENT ON COLUMN public.tournament_player_stats.standings_need_recalc IS 'Flag for standings recalculation';
COMMENT ON COLUMN public.tournament_player_stats.has_received_bye IS 'Whether player has had a bye';
COMMENT ON COLUMN public.tournament_player_stats.is_dropped IS 'Whether player has dropped';
COMMENT ON COLUMN public.tournament_player_stats.current_seed IS 'Current seeding for pairings';
COMMENT ON COLUMN public.tournament_player_stats.final_ranking IS 'Final tournament placement';
COMMENT ON COLUMN public.tournament_player_stats.opponent_history IS 'Array of opponent alt IDs faced';
COMMENT ON COLUMN public.tournament_player_stats.rounds_played IS 'Number of rounds played';
COMMENT ON COLUMN public.tournament_player_stats.created_at IS 'Stats creation timestamp';
COMMENT ON COLUMN public.tournament_player_stats.updated_at IS 'Last stats update timestamp';

-- =============================================================================
-- tournament_standings table
-- =============================================================================
COMMENT ON COLUMN public.tournament_standings.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_standings.tournament_id IS 'Tournament these standings belong to';
COMMENT ON COLUMN public.tournament_standings.alt_id IS 'Player alt ID';
COMMENT ON COLUMN public.tournament_standings.round_number IS 'Round number for historical standings';
COMMENT ON COLUMN public.tournament_standings.match_points IS 'Match points at this round';
COMMENT ON COLUMN public.tournament_standings.game_wins IS 'Game wins at this round';
COMMENT ON COLUMN public.tournament_standings.game_losses IS 'Game losses at this round';
COMMENT ON COLUMN public.tournament_standings.match_win_percentage IS 'Match win % at this round';
COMMENT ON COLUMN public.tournament_standings.game_win_percentage IS 'Game win % at this round';
COMMENT ON COLUMN public.tournament_standings.opponent_match_win_percentage IS 'Opponent match win % at this round';
COMMENT ON COLUMN public.tournament_standings.opponent_game_win_percentage IS 'Opponent game win % at this round';
COMMENT ON COLUMN public.tournament_standings.rank IS 'Standing rank at this round';
COMMENT ON COLUMN public.tournament_standings.created_at IS 'Standing creation timestamp';

-- =============================================================================
-- tournament_pairings table
-- =============================================================================
COMMENT ON COLUMN public.tournament_pairings.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_pairings.tournament_id IS 'Tournament this pairing belongs to';
COMMENT ON COLUMN public.tournament_pairings.round_id IS 'Round this pairing is for';
COMMENT ON COLUMN public.tournament_pairings.match_id IS 'Associated match';
COMMENT ON COLUMN public.tournament_pairings.alt1_id IS 'First player alt ID';
COMMENT ON COLUMN public.tournament_pairings.alt2_id IS 'Second player alt ID';
COMMENT ON COLUMN public.tournament_pairings.pairing_type IS 'Type of pairing (swiss, bracket)';
COMMENT ON COLUMN public.tournament_pairings.is_bye IS 'Whether this is a bye';
COMMENT ON COLUMN public.tournament_pairings.table_number IS 'Assigned table number';
COMMENT ON COLUMN public.tournament_pairings.alt1_seed IS 'Player 1 seed at pairing time';
COMMENT ON COLUMN public.tournament_pairings.alt2_seed IS 'Player 2 seed at pairing time';
COMMENT ON COLUMN public.tournament_pairings.pairing_reason IS 'Why these players were paired';
COMMENT ON COLUMN public.tournament_pairings.algorithm_notes IS 'Pairing algorithm debug info';
COMMENT ON COLUMN public.tournament_pairings.created_at IS 'Pairing creation timestamp';

-- =============================================================================
-- tournament_opponent_history table
-- =============================================================================
COMMENT ON COLUMN public.tournament_opponent_history.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_opponent_history.tournament_id IS 'Tournament this history belongs to';
COMMENT ON COLUMN public.tournament_opponent_history.alt_id IS 'Player alt ID';
COMMENT ON COLUMN public.tournament_opponent_history.opponent_alt_id IS 'Opponent alt ID';
COMMENT ON COLUMN public.tournament_opponent_history.round_number IS 'Round when they played';
COMMENT ON COLUMN public.tournament_opponent_history.created_at IS 'History entry creation timestamp';

-- =============================================================================
-- tournament_invitations table
-- =============================================================================
COMMENT ON COLUMN public.tournament_invitations.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_invitations.tournament_id IS 'Tournament for the invitation';
COMMENT ON COLUMN public.tournament_invitations.invited_alt_id IS 'Invited player alt ID';
COMMENT ON COLUMN public.tournament_invitations.invited_by_alt_id IS 'Who sent the invitation';
COMMENT ON COLUMN public.tournament_invitations.status IS 'Invitation status (pending, accepted, declined)';
COMMENT ON COLUMN public.tournament_invitations.message IS 'Optional invitation message';
COMMENT ON COLUMN public.tournament_invitations.expires_at IS 'When invitation expires';
COMMENT ON COLUMN public.tournament_invitations.invited_at IS 'When invitation was sent';
COMMENT ON COLUMN public.tournament_invitations.responded_at IS 'When invitee responded';
COMMENT ON COLUMN public.tournament_invitations.registration_id IS 'Created registration if accepted';

-- =============================================================================
-- tournament_events table
-- =============================================================================
COMMENT ON COLUMN public.tournament_events.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_events.tournament_id IS 'Tournament this event belongs to';
COMMENT ON COLUMN public.tournament_events.event_type IS 'Type of event (round_start, match_complete, etc.)';
COMMENT ON COLUMN public.tournament_events.event_data IS 'Event data JSON';
COMMENT ON COLUMN public.tournament_events.created_by IS 'Who triggered the event';
COMMENT ON COLUMN public.tournament_events.created_at IS 'Event timestamp';

-- =============================================================================
-- tournament_templates table
-- =============================================================================
COMMENT ON COLUMN public.tournament_templates.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_templates.name IS 'Template name';
COMMENT ON COLUMN public.tournament_templates.description IS 'Template description';
COMMENT ON COLUMN public.tournament_templates.organization_id IS 'Owning organization (null for global)';
COMMENT ON COLUMN public.tournament_templates.is_public IS 'Whether template is publicly visible';
COMMENT ON COLUMN public.tournament_templates.template_config IS 'Full template configuration JSON';
COMMENT ON COLUMN public.tournament_templates.created_by IS 'Who created the template';
COMMENT ON COLUMN public.tournament_templates.use_count IS 'Number of times template was used';
COMMENT ON COLUMN public.tournament_templates.is_official IS 'Whether this is an official template';
COMMENT ON COLUMN public.tournament_templates.tags IS 'Template tags for searching';
COMMENT ON COLUMN public.tournament_templates.created_at IS 'Template creation timestamp';
COMMENT ON COLUMN public.tournament_templates.updated_at IS 'Last update timestamp';

-- =============================================================================
-- tournament_template_phases table
-- =============================================================================
COMMENT ON COLUMN public.tournament_template_phases.id IS 'Primary key';
COMMENT ON COLUMN public.tournament_template_phases.template_id IS 'Parent template';
COMMENT ON COLUMN public.tournament_template_phases.name IS 'Phase name';
COMMENT ON COLUMN public.tournament_template_phases.phase_order IS 'Order in template';
COMMENT ON COLUMN public.tournament_template_phases.phase_type IS 'Phase type (swiss, elimination)';
COMMENT ON COLUMN public.tournament_template_phases.phase_config IS 'Phase configuration JSON';
COMMENT ON COLUMN public.tournament_template_phases.created_at IS 'Creation timestamp';

-- =============================================================================
-- teams table
-- =============================================================================
COMMENT ON COLUMN public.teams.id IS 'Primary key';
COMMENT ON COLUMN public.teams.name IS 'Team name';
COMMENT ON COLUMN public.teams.description IS 'Team description/strategy notes';
COMMENT ON COLUMN public.teams.created_by IS 'User who created the team';
COMMENT ON COLUMN public.teams.is_public IS 'Whether team is publicly visible';
COMMENT ON COLUMN public.teams.format_legal IS 'Format this team is legal in';
COMMENT ON COLUMN public.teams.tags IS 'Team tags for searching';
COMMENT ON COLUMN public.teams.notes IS 'Private notes about the team';
COMMENT ON COLUMN public.teams.created_at IS 'Team creation timestamp';
COMMENT ON COLUMN public.teams.updated_at IS 'Last update timestamp';

-- =============================================================================
-- team_pokemon table
-- =============================================================================
COMMENT ON COLUMN public.team_pokemon.id IS 'Primary key';
COMMENT ON COLUMN public.team_pokemon.team_id IS 'Parent team';
COMMENT ON COLUMN public.team_pokemon.pokemon_id IS 'Pokemon on the team';
COMMENT ON COLUMN public.team_pokemon.team_position IS 'Position in team (1-6)';
COMMENT ON COLUMN public.team_pokemon.created_at IS 'Creation timestamp';

-- =============================================================================
-- pokemon table
-- =============================================================================
COMMENT ON COLUMN public.pokemon.id IS 'Primary key';
COMMENT ON COLUMN public.pokemon.species IS 'Pokemon species name';
COMMENT ON COLUMN public.pokemon.nickname IS 'Pokemon nickname';
COMMENT ON COLUMN public.pokemon.level IS 'Pokemon level (1-100)';
COMMENT ON COLUMN public.pokemon.nature IS 'Pokemon nature';
COMMENT ON COLUMN public.pokemon.ability IS 'Pokemon ability';
COMMENT ON COLUMN public.pokemon.held_item IS 'Held item';
COMMENT ON COLUMN public.pokemon.gender IS 'Pokemon gender (M/F/N)';
COMMENT ON COLUMN public.pokemon.is_shiny IS 'Whether Pokemon is shiny';
COMMENT ON COLUMN public.pokemon.move1 IS 'First move';
COMMENT ON COLUMN public.pokemon.move2 IS 'Second move';
COMMENT ON COLUMN public.pokemon.move3 IS 'Third move';
COMMENT ON COLUMN public.pokemon.move4 IS 'Fourth move';
COMMENT ON COLUMN public.pokemon.ev_hp IS 'HP effort values (0-252)';
COMMENT ON COLUMN public.pokemon.ev_attack IS 'Attack effort values (0-252)';
COMMENT ON COLUMN public.pokemon.ev_defense IS 'Defense effort values (0-252)';
COMMENT ON COLUMN public.pokemon.ev_special_attack IS 'Special Attack effort values (0-252)';
COMMENT ON COLUMN public.pokemon.ev_special_defense IS 'Special Defense effort values (0-252)';
COMMENT ON COLUMN public.pokemon.ev_speed IS 'Speed effort values (0-252)';
COMMENT ON COLUMN public.pokemon.iv_hp IS 'HP individual values (0-31)';
COMMENT ON COLUMN public.pokemon.iv_attack IS 'Attack individual values (0-31)';
COMMENT ON COLUMN public.pokemon.iv_defense IS 'Defense individual values (0-31)';
COMMENT ON COLUMN public.pokemon.iv_special_attack IS 'Special Attack individual values (0-31)';
COMMENT ON COLUMN public.pokemon.iv_special_defense IS 'Special Defense individual values (0-31)';
COMMENT ON COLUMN public.pokemon.iv_speed IS 'Speed individual values (0-31)';
COMMENT ON COLUMN public.pokemon.tera_type IS 'Tera type for Terastallization';
COMMENT ON COLUMN public.pokemon.format_legal IS 'Formats this Pokemon is legal in';
COMMENT ON COLUMN public.pokemon.created_at IS 'Pokemon creation timestamp';

-- =============================================================================
-- posts table
-- =============================================================================
COMMENT ON COLUMN public.posts.id IS 'Primary key';
COMMENT ON COLUMN public.posts.content IS 'Post text content';
COMMENT ON COLUMN public.posts.reply_to_id IS 'Parent post if this is a reply';
COMMENT ON COLUMN public.posts.repost_of_id IS 'Original post if this is a repost';
COMMENT ON COLUMN public.posts.quote_content IS 'Quote text for quote reposts';
COMMENT ON COLUMN public.posts.likes_count IS 'Cached like count';
COMMENT ON COLUMN public.posts.replies_count IS 'Cached reply count';
COMMENT ON COLUMN public.posts.reposts_count IS 'Cached repost count';
COMMENT ON COLUMN public.posts.views_count IS 'Cached view count';
COMMENT ON COLUMN public.posts.is_pinned IS 'Whether post is pinned to profile';
COMMENT ON COLUMN public.posts.is_deleted IS 'Soft delete flag';
COMMENT ON COLUMN public.posts.deleted_at IS 'When post was deleted';
COMMENT ON COLUMN public.posts.created_at IS 'Post creation timestamp';
COMMENT ON COLUMN public.posts.updated_at IS 'Last update timestamp';

-- =============================================================================
-- post_likes table
-- =============================================================================
COMMENT ON COLUMN public.post_likes.id IS 'Primary key';
COMMENT ON COLUMN public.post_likes.post_id IS 'Post being liked';
COMMENT ON COLUMN public.post_likes.user_id IS 'User who liked the post';
COMMENT ON COLUMN public.post_likes.created_at IS 'Like timestamp';

-- =============================================================================
-- follows table
-- =============================================================================
COMMENT ON COLUMN public.follows.id IS 'Primary key';
COMMENT ON COLUMN public.follows.follower_user_id IS 'User who is following';
COMMENT ON COLUMN public.follows.following_user_id IS 'User being followed';
COMMENT ON COLUMN public.follows.created_at IS 'Follow timestamp';

-- =============================================================================
-- subscriptions table
-- =============================================================================
COMMENT ON COLUMN public.subscriptions.id IS 'Primary key';
COMMENT ON COLUMN public.subscriptions.entity_id IS 'Entity ID (user or org)';
COMMENT ON COLUMN public.subscriptions.entity_type IS 'Entity type (user, organization)';
COMMENT ON COLUMN public.subscriptions.tier IS 'Subscription tier';
COMMENT ON COLUMN public.subscriptions.status IS 'Subscription status (active, cancelled, expired)';
COMMENT ON COLUMN public.subscriptions.started_at IS 'When subscription started';
COMMENT ON COLUMN public.subscriptions.expires_at IS 'When subscription expires';
COMMENT ON COLUMN public.subscriptions.cancelled_at IS 'When subscription was cancelled';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN public.subscriptions.billing_interval IS 'Billing interval (monthly, yearly)';
COMMENT ON COLUMN public.subscriptions.amount IS 'Subscription amount in cents';
COMMENT ON COLUMN public.subscriptions.currency IS 'Currency code (USD, EUR, etc.)';
COMMENT ON COLUMN public.subscriptions.created_at IS 'Subscription creation timestamp';
COMMENT ON COLUMN public.subscriptions.updated_at IS 'Last update timestamp';

-- =============================================================================
-- feature_usage table
-- =============================================================================
COMMENT ON COLUMN public.feature_usage.id IS 'Primary key';
COMMENT ON COLUMN public.feature_usage.entity_id IS 'Entity using the feature';
COMMENT ON COLUMN public.feature_usage.entity_type IS 'Entity type (user, organization)';
COMMENT ON COLUMN public.feature_usage.feature_key IS 'Feature identifier';
COMMENT ON COLUMN public.feature_usage.period_start IS 'Usage period start';
COMMENT ON COLUMN public.feature_usage.period_end IS 'Usage period end';
COMMENT ON COLUMN public.feature_usage.usage IS 'Current usage count';
COMMENT ON COLUMN public.feature_usage.usage_limit IS 'Usage limit for this period';
COMMENT ON COLUMN public.feature_usage.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.feature_usage.updated_at IS 'Last update timestamp';

-- =============================================================================
-- atproto_sessions table
-- =============================================================================
COMMENT ON COLUMN public.atproto_sessions.id IS 'Primary key';
COMMENT ON COLUMN public.atproto_sessions.did IS 'AT Protocol DID';
COMMENT ON COLUMN public.atproto_sessions.user_id IS 'Linked user ID';
COMMENT ON COLUMN public.atproto_sessions.session_data IS 'Encrypted session data';
COMMENT ON COLUMN public.atproto_sessions.handle IS 'Current Bluesky handle';
COMMENT ON COLUMN public.atproto_sessions.pds_url IS 'Personal Data Server URL';
COMMENT ON COLUMN public.atproto_sessions.created_at IS 'Session creation timestamp';
COMMENT ON COLUMN public.atproto_sessions.updated_at IS 'Last session update';
COMMENT ON COLUMN public.atproto_sessions.expires_at IS 'When session expires';

-- =============================================================================
-- atproto_oauth_state table
-- =============================================================================
COMMENT ON COLUMN public.atproto_oauth_state.id IS 'Primary key';
COMMENT ON COLUMN public.atproto_oauth_state.state_key IS 'OAuth state key';
COMMENT ON COLUMN public.atproto_oauth_state.state_data IS 'OAuth state data';
COMMENT ON COLUMN public.atproto_oauth_state.created_at IS 'State creation timestamp';
COMMENT ON COLUMN public.atproto_oauth_state.expires_at IS 'When state expires';

-- =============================================================================
-- linked_atproto_accounts table
-- =============================================================================
COMMENT ON COLUMN public.linked_atproto_accounts.id IS 'Primary key';
COMMENT ON COLUMN public.linked_atproto_accounts.user_id IS 'User who owns this link';
COMMENT ON COLUMN public.linked_atproto_accounts.did IS 'AT Protocol DID';
COMMENT ON COLUMN public.linked_atproto_accounts.handle IS 'Bluesky handle';
COMMENT ON COLUMN public.linked_atproto_accounts.pds_url IS 'Personal Data Server URL';
COMMENT ON COLUMN public.linked_atproto_accounts.is_primary IS 'Whether this is the primary AT account';
COMMENT ON COLUMN public.linked_atproto_accounts.created_at IS 'Link creation timestamp';
COMMENT ON COLUMN public.linked_atproto_accounts.updated_at IS 'Last update timestamp';

-- =============================================================================
-- rate_limits table
-- =============================================================================
COMMENT ON COLUMN public.rate_limits.id IS 'Primary key';
COMMENT ON COLUMN public.rate_limits.identifier IS 'Rate limit identifier (IP, user ID, etc.)';
COMMENT ON COLUMN public.rate_limits.request_timestamps IS 'Array of request timestamps';
COMMENT ON COLUMN public.rate_limits.window_start IS 'Current rate limit window start';
COMMENT ON COLUMN public.rate_limits.expires_at IS 'When this rate limit record expires';
COMMENT ON COLUMN public.rate_limits.created_at IS 'Record creation timestamp';
