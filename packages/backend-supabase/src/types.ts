export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      feature_usage: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          feature_key: string
          id: string
          period_end: string
          period_start: string
          updated_at: string | null
          usage: number | null
          usage_limit: number | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          feature_key: string
          id?: string
          period_end: string
          period_start: string
          updated_at?: string | null
          usage?: number | null
          usage_limit?: number | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          feature_key?: string
          id?: string
          period_end?: string
          period_start?: string
          updated_at?: string | null
          usage?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      group_roles: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_roles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invited_by_profile_id: string
          invited_profile_id: string
          organization_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"] | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by_profile_id: string
          invited_profile_id: string
          organization_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by_profile_id?: string
          invited_profile_id?: string
          organization_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_invited_by_profile_id_fkey"
            columns: ["invited_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          profile_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_requests: {
        Row: {
          created_at: string | null
          created_organization_id: string | null
          description: string | null
          id: string
          name: string
          rejection_reason: string | null
          requested_by_profile_id: string
          reviewed_at: string | null
          reviewed_by_profile_id: string | null
          slug: string
          status: Database["public"]["Enums"]["org_request_status"] | null
        }
        Insert: {
          created_at?: string | null
          created_organization_id?: string | null
          description?: string | null
          id?: string
          name: string
          rejection_reason?: string | null
          requested_by_profile_id: string
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["org_request_status"] | null
        }
        Update: {
          created_at?: string | null
          created_organization_id?: string | null
          description?: string | null
          id?: string
          name?: string
          rejection_reason?: string | null
          requested_by_profile_id?: string
          reviewed_at?: string | null
          reviewed_by_profile_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["org_request_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_requests_created_organization_id_fkey"
            columns: ["created_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_requests_requested_by_profile_id_fkey"
            columns: ["requested_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_requests_reviewed_by_profile_id_fkey"
            columns: ["reviewed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          description: string | null
          discord_url: string | null
          icon: string | null
          id: string
          logo_url: string | null
          name: string
          owner_profile_id: string
          platform_fee_percentage: number | null
          slug: string
          status: Database["public"]["Enums"]["organization_status"] | null
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_tier:
            | Database["public"]["Enums"]["organization_subscription_tier"]
            | null
          tier: Database["public"]["Enums"]["organization_tier"] | null
          twitter_url: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discord_url?: string | null
          icon?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_profile_id: string
          platform_fee_percentage?: number | null
          slug: string
          status?: Database["public"]["Enums"]["organization_status"] | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["organization_subscription_tier"]
            | null
          tier?: Database["public"]["Enums"]["organization_tier"] | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discord_url?: string | null
          icon?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_profile_id?: string
          platform_fee_percentage?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["organization_status"] | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["organization_subscription_tier"]
            | null
          tier?: Database["public"]["Enums"]["organization_tier"] | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      pokemon: {
        Row: {
          ability: string
          created_at: string | null
          ev_attack: number | null
          ev_defense: number | null
          ev_hp: number | null
          ev_special_attack: number | null
          ev_special_defense: number | null
          ev_speed: number | null
          format_legal: boolean | null
          gender: Database["public"]["Enums"]["pokemon_gender"] | null
          held_item: string | null
          id: string
          is_shiny: boolean | null
          iv_attack: number | null
          iv_defense: number | null
          iv_hp: number | null
          iv_special_attack: number | null
          iv_special_defense: number | null
          iv_speed: number | null
          level: number | null
          move1: string
          move2: string | null
          move3: string | null
          move4: string | null
          nature: string
          nickname: string | null
          species: string
          tera_type: string | null
        }
        Insert: {
          ability: string
          created_at?: string | null
          ev_attack?: number | null
          ev_defense?: number | null
          ev_hp?: number | null
          ev_special_attack?: number | null
          ev_special_defense?: number | null
          ev_speed?: number | null
          format_legal?: boolean | null
          gender?: Database["public"]["Enums"]["pokemon_gender"] | null
          held_item?: string | null
          id?: string
          is_shiny?: boolean | null
          iv_attack?: number | null
          iv_defense?: number | null
          iv_hp?: number | null
          iv_special_attack?: number | null
          iv_special_defense?: number | null
          iv_speed?: number | null
          level?: number | null
          move1: string
          move2?: string | null
          move3?: string | null
          move4?: string | null
          nature: string
          nickname?: string | null
          species: string
          tera_type?: string | null
        }
        Update: {
          ability?: string
          created_at?: string | null
          ev_attack?: number | null
          ev_defense?: number | null
          ev_hp?: number | null
          ev_special_attack?: number | null
          ev_special_defense?: number | null
          ev_speed?: number | null
          format_legal?: boolean | null
          gender?: Database["public"]["Enums"]["pokemon_gender"] | null
          held_item?: string | null
          id?: string
          is_shiny?: boolean | null
          iv_attack?: number | null
          iv_defense?: number | null
          iv_hp?: number | null
          iv_special_attack?: number | null
          iv_special_defense?: number | null
          iv_speed?: number | null
          level?: number | null
          move1?: string
          move2?: string | null
          move3?: string | null
          move4?: string | null
          nature?: string
          nickname?: string | null
          species?: string
          tera_type?: string | null
        }
        Relationships: []
      }
      profile_group_roles: {
        Row: {
          created_at: string | null
          group_role_id: string
          id: string
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          group_role_id: string
          id?: string
          profile_id: string
        }
        Update: {
          created_at?: string | null
          group_role_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_group_roles_group_role_id_fkey"
            columns: ["group_role_id"]
            isOneToOne: false
            referencedRelation: "group_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_group_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          battle_tag: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          id: string
          tier: Database["public"]["Enums"]["user_tier"] | null
          tier_expires_at: string | null
          tier_started_at: string | null
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          battle_tag?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          tier?: Database["public"]["Enums"]["user_tier"] | null
          tier_expires_at?: string | null
          tier_started_at?: string | null
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          battle_tag?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          tier?: Database["public"]["Enums"]["user_tier"] | null
          tier_expires_at?: string | null
          tier_started_at?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          identifier: string
          request_timestamps: string[] | null
          window_start: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          identifier: string
          request_timestamps?: string[] | null
          window_start: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          identifier?: string
          request_timestamps?: string[] | null
          window_start?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          billing_interval:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          cancelled_at: string | null
          created_at: string | null
          currency: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          expires_at: string | null
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          billing_interval?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          expires_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id?: string | null
          tier: string
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          billing_interval?:
            | Database["public"]["Enums"]["billing_interval"]
            | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          expires_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      team_pokemon: {
        Row: {
          created_at: string | null
          id: string
          pokemon_id: string
          team_id: string
          team_position: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          pokemon_id: string
          team_id: string
          team_position: number
        }
        Update: {
          created_at?: string | null
          id?: string
          pokemon_id?: string
          team_id?: string
          team_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_pokemon_pokemon_id_fkey"
            columns: ["pokemon_id"]
            isOneToOne: false
            referencedRelation: "pokemon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_pokemon_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          format_legal: boolean | null
          id: string
          is_public: boolean | null
          name: string
          notes: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          format_legal?: boolean | null
          id?: string
          is_public?: boolean | null
          name: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          format_legal?: boolean | null
          id?: string
          is_public?: boolean | null
          name?: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_data: Json | null
          event_type: string
          id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_events_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_invitations: {
        Row: {
          expires_at: string | null
          id: string
          invited_at: string | null
          invited_by_profile_id: string
          invited_profile_id: string
          message: string | null
          registration_id: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"] | null
          tournament_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by_profile_id: string
          invited_profile_id: string
          message?: string | null
          registration_id?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
          tournament_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by_profile_id?: string
          invited_profile_id?: string
          message?: string | null
          registration_id?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_invitations_invited_by_profile_id_fkey"
            columns: ["invited_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_invitations_invited_profile_id_fkey"
            columns: ["invited_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_invitations_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_invitations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          created_at: string | null
          end_time: string | null
          game_wins1: number | null
          game_wins2: number | null
          id: string
          is_bye: boolean | null
          match_confirmed_at: string | null
          match_points1: number | null
          match_points2: number | null
          player1_match_confirmed: boolean | null
          player2_match_confirmed: boolean | null
          profile1_id: string | null
          profile2_id: string | null
          round_id: string
          staff_notes: string | null
          staff_requested: boolean | null
          staff_requested_at: string | null
          staff_resolved_by: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["phase_status"] | null
          table_number: number | null
          winner_profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          game_wins1?: number | null
          game_wins2?: number | null
          id?: string
          is_bye?: boolean | null
          match_confirmed_at?: string | null
          match_points1?: number | null
          match_points2?: number | null
          player1_match_confirmed?: boolean | null
          player2_match_confirmed?: boolean | null
          profile1_id?: string | null
          profile2_id?: string | null
          round_id: string
          staff_notes?: string | null
          staff_requested?: boolean | null
          staff_requested_at?: string | null
          staff_resolved_by?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          table_number?: number | null
          winner_profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          game_wins1?: number | null
          game_wins2?: number | null
          id?: string
          is_bye?: boolean | null
          match_confirmed_at?: string | null
          match_points1?: number | null
          match_points2?: number | null
          player1_match_confirmed?: boolean | null
          player2_match_confirmed?: boolean | null
          profile1_id?: string | null
          profile2_id?: string | null
          round_id?: string
          staff_notes?: string | null
          staff_requested?: boolean | null
          staff_requested_at?: string | null
          staff_resolved_by?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          table_number?: number | null
          winner_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_profile1_id_fkey"
            columns: ["profile1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_profile2_id_fkey"
            columns: ["profile2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tournament_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_staff_resolved_by_fkey"
            columns: ["staff_resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_profile_id_fkey"
            columns: ["winner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_opponent_history: {
        Row: {
          created_at: string | null
          id: string
          opponent_id: string
          profile_id: string
          round_number: number
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          opponent_id: string
          profile_id: string
          round_number: number
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          opponent_id?: string
          profile_id?: string
          round_number?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_opponent_history_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_opponent_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_opponent_history_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_pairings: {
        Row: {
          algorithm_notes: string | null
          created_at: string | null
          id: string
          is_bye: boolean | null
          match_id: string | null
          pairing_reason: string | null
          pairing_type: string
          profile1_id: string | null
          profile1_seed: number | null
          profile2_id: string | null
          profile2_seed: number | null
          round_id: string
          table_number: number | null
          tournament_id: string
        }
        Insert: {
          algorithm_notes?: string | null
          created_at?: string | null
          id?: string
          is_bye?: boolean | null
          match_id?: string | null
          pairing_reason?: string | null
          pairing_type: string
          profile1_id?: string | null
          profile1_seed?: number | null
          profile2_id?: string | null
          profile2_seed?: number | null
          round_id: string
          table_number?: number | null
          tournament_id: string
        }
        Update: {
          algorithm_notes?: string | null
          created_at?: string | null
          id?: string
          is_bye?: boolean | null
          match_id?: string | null
          pairing_reason?: string | null
          pairing_type?: string
          profile1_id?: string | null
          profile1_seed?: number | null
          profile2_id?: string | null
          profile2_seed?: number | null
          round_id?: string
          table_number?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_pairings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_pairings_profile1_id_fkey"
            columns: ["profile1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_pairings_profile2_id_fkey"
            columns: ["profile2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_pairings_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tournament_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_pairings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_phases: {
        Row: {
          advancement_count: number | null
          advancement_type: string | null
          bracket_format: string | null
          bracket_size: number | null
          completed_at: string | null
          created_at: string | null
          current_round: number | null
          id: string
          match_format: string
          name: string
          phase_order: number
          phase_type: string
          planned_rounds: number | null
          round_time_minutes: number | null
          seeding_method: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["phase_status"] | null
          total_rounds: number | null
          tournament_id: string
        }
        Insert: {
          advancement_count?: number | null
          advancement_type?: string | null
          bracket_format?: string | null
          bracket_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_round?: number | null
          id?: string
          match_format: string
          name: string
          phase_order: number
          phase_type: string
          planned_rounds?: number | null
          round_time_minutes?: number | null
          seeding_method?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          total_rounds?: number | null
          tournament_id: string
        }
        Update: {
          advancement_count?: number | null
          advancement_type?: string | null
          bracket_format?: string | null
          bracket_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_round?: number | null
          id?: string
          match_format?: string
          name?: string
          phase_order?: number
          phase_type?: string
          planned_rounds?: number | null
          round_time_minutes?: number | null
          seeding_method?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          total_rounds?: number | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_phases_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_player_stats: {
        Row: {
          buchholz_score: number | null
          created_at: string | null
          current_seed: number | null
          current_standing: number | null
          final_ranking: number | null
          game_losses: number | null
          game_win_percentage: number | null
          game_wins: number | null
          has_received_bye: boolean | null
          id: string
          is_dropped: boolean | null
          last_tiebreaker_update: string | null
          match_losses: number | null
          match_points: number | null
          match_win_percentage: number | null
          match_wins: number | null
          matches_played: number | null
          modified_buchholz_score: number | null
          opponent_game_win_percentage: number | null
          opponent_history: string[] | null
          opponent_match_win_percentage: number | null
          opponent_opponent_match_win_percentage: number | null
          profile_id: string
          rounds_played: number | null
          standings_need_recalc: boolean | null
          strength_of_schedule: number | null
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          buchholz_score?: number | null
          created_at?: string | null
          current_seed?: number | null
          current_standing?: number | null
          final_ranking?: number | null
          game_losses?: number | null
          game_win_percentage?: number | null
          game_wins?: number | null
          has_received_bye?: boolean | null
          id?: string
          is_dropped?: boolean | null
          last_tiebreaker_update?: string | null
          match_losses?: number | null
          match_points?: number | null
          match_win_percentage?: number | null
          match_wins?: number | null
          matches_played?: number | null
          modified_buchholz_score?: number | null
          opponent_game_win_percentage?: number | null
          opponent_history?: string[] | null
          opponent_match_win_percentage?: number | null
          opponent_opponent_match_win_percentage?: number | null
          profile_id: string
          rounds_played?: number | null
          standings_need_recalc?: boolean | null
          strength_of_schedule?: number | null
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          buchholz_score?: number | null
          created_at?: string | null
          current_seed?: number | null
          current_standing?: number | null
          final_ranking?: number | null
          game_losses?: number | null
          game_win_percentage?: number | null
          game_wins?: number | null
          has_received_bye?: boolean | null
          id?: string
          is_dropped?: boolean | null
          last_tiebreaker_update?: string | null
          match_losses?: number | null
          match_points?: number | null
          match_win_percentage?: number | null
          match_wins?: number | null
          matches_played?: number | null
          modified_buchholz_score?: number | null
          opponent_game_win_percentage?: number | null
          opponent_history?: string[] | null
          opponent_match_win_percentage?: number | null
          opponent_opponent_match_win_percentage?: number | null
          profile_id?: string
          rounds_played?: number | null
          standings_need_recalc?: boolean | null
          strength_of_schedule?: number | null
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_player_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_player_stats_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registration_pokemon: {
        Row: {
          created_at: string | null
          id: string
          pokemon_id: string
          team_position: number
          tournament_registration_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pokemon_id: string
          team_position: number
          tournament_registration_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pokemon_id?: string
          team_position?: number
          tournament_registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registration_pokemon_pokemon_id_fkey"
            columns: ["pokemon_id"]
            isOneToOne: false
            referencedRelation: "pokemon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registration_pokemon_tournament_registration_id_fkey"
            columns: ["tournament_registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          checked_in_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          profile_id: string
          registered_at: string | null
          rental_team_photo_key: string | null
          rental_team_photo_uploaded_at: string | null
          rental_team_photo_url: string | null
          rental_team_photo_verified: boolean | null
          rental_team_photo_verified_at: string | null
          rental_team_photo_verified_by: string | null
          status: Database["public"]["Enums"]["registration_status"] | null
          team_id: string | null
          team_name: string | null
          tournament_id: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          registered_at?: string | null
          rental_team_photo_key?: string | null
          rental_team_photo_uploaded_at?: string | null
          rental_team_photo_url?: string | null
          rental_team_photo_verified?: boolean | null
          rental_team_photo_verified_at?: string | null
          rental_team_photo_verified_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          team_id?: string | null
          team_name?: string | null
          tournament_id: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          registered_at?: string | null
          rental_team_photo_key?: string | null
          rental_team_photo_uploaded_at?: string | null
          rental_team_photo_url?: string | null
          rental_team_photo_verified?: boolean | null
          rental_team_photo_verified_at?: string | null
          rental_team_photo_verified_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          team_id?: string | null
          team_name?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_rental_team_photo_verified_by_fkey"
            columns: ["rental_team_photo_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_rounds: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          name: string | null
          phase_id: string
          round_number: number
          start_time: string | null
          status: Database["public"]["Enums"]["phase_status"] | null
          time_extension_minutes: number | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          name?: string | null
          phase_id: string
          round_number: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          time_extension_minutes?: number | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          name?: string | null
          phase_id?: string
          round_number?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          time_extension_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_rounds_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "tournament_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_standings: {
        Row: {
          created_at: string | null
          game_losses: number | null
          game_win_percentage: number | null
          game_wins: number | null
          id: string
          match_points: number | null
          match_win_percentage: number | null
          opponent_game_win_percentage: number | null
          opponent_match_win_percentage: number | null
          profile_id: string
          rank: number | null
          round_number: number
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          game_losses?: number | null
          game_win_percentage?: number | null
          game_wins?: number | null
          id?: string
          match_points?: number | null
          match_win_percentage?: number | null
          opponent_game_win_percentage?: number | null
          opponent_match_win_percentage?: number | null
          profile_id: string
          rank?: number | null
          round_number: number
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          game_losses?: number | null
          game_win_percentage?: number | null
          game_wins?: number | null
          id?: string
          match_points?: number | null
          match_win_percentage?: number | null
          opponent_game_win_percentage?: number | null
          opponent_match_win_percentage?: number | null
          profile_id?: string
          rank?: number | null
          round_number?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_standings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_standings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_template_phases: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phase_config: Json | null
          phase_order: number
          phase_type: string
          template_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phase_config?: Json | null
          phase_order: number
          phase_type: string
          template_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phase_config?: Json | null
          phase_order?: number
          phase_type?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_template_phases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "tournament_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_templates: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_official: boolean | null
          is_public: boolean | null
          name: string
          organization_id: string | null
          tags: string[] | null
          template_config: Json | null
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_official?: boolean | null
          is_public?: boolean | null
          name: string
          organization_id?: string | null
          tags?: string[] | null
          template_config?: Json | null
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_official?: boolean | null
          is_public?: boolean | null
          name?: string
          organization_id?: string | null
          tags?: string[] | null
          template_config?: Json | null
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          check_in_window_minutes: number | null
          created_at: string | null
          current_phase_id: string | null
          current_round: number | null
          description: string | null
          end_date: string | null
          featured: boolean | null
          format: string | null
          id: string
          max_participants: number | null
          name: string
          organization_id: string
          participants: string[] | null
          prize_pool: string | null
          registration_deadline: string | null
          rental_team_photos_enabled: boolean | null
          rental_team_photos_required: boolean | null
          round_time_minutes: number | null
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["tournament_status"] | null
          swiss_rounds: number | null
          template_id: string | null
          top_cut_size: number | null
          tournament_format:
            | Database["public"]["Enums"]["tournament_format"]
            | null
          tournament_state: Json | null
          updated_at: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          check_in_window_minutes?: number | null
          created_at?: string | null
          current_phase_id?: string | null
          current_round?: number | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          format?: string | null
          id?: string
          max_participants?: number | null
          name: string
          organization_id: string
          participants?: string[] | null
          prize_pool?: string | null
          registration_deadline?: string | null
          rental_team_photos_enabled?: boolean | null
          rental_team_photos_required?: boolean | null
          round_time_minutes?: number | null
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["tournament_status"] | null
          swiss_rounds?: number | null
          template_id?: string | null
          top_cut_size?: number | null
          tournament_format?:
            | Database["public"]["Enums"]["tournament_format"]
            | null
          tournament_state?: Json | null
          updated_at?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          check_in_window_minutes?: number | null
          created_at?: string | null
          current_phase_id?: string | null
          current_round?: number | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          format?: string | null
          id?: string
          max_participants?: number | null
          name?: string
          organization_id?: string
          participants?: string[] | null
          prize_pool?: string | null
          registration_deadline?: string | null
          rental_team_photos_enabled?: boolean | null
          rental_team_photos_required?: boolean | null
          round_time_minutes?: number | null
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["tournament_status"] | null
          swiss_rounds?: number | null
          template_id?: string | null
          top_cut_size?: number | null
          tournament_format?:
            | Database["public"]["Enums"]["tournament_format"]
            | null
          tournament_state?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_current_phase_fk"
            columns: ["current_phase_id"]
            isOneToOne: false
            referencedRelation: "tournament_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "tournament_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          clerk_id: string | null
          created_at: string | null
          email: string | null
          external_accounts: Json | null
          id: string
          image: string | null
          is_locked: boolean | null
          last_active_at: string | null
          last_sign_in_at: string | null
          main_profile_id: string | null
          name: string | null
          phone_number: string | null
          public_metadata: Json | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          clerk_id?: string | null
          created_at?: string | null
          email?: string | null
          external_accounts?: Json | null
          id: string
          image?: string | null
          is_locked?: boolean | null
          last_active_at?: string | null
          last_sign_in_at?: string | null
          main_profile_id?: string | null
          name?: string | null
          phone_number?: string | null
          public_metadata?: Json | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          clerk_id?: string | null
          created_at?: string | null
          email?: string | null
          external_accounts?: Json | null
          id?: string
          image?: string | null
          is_locked?: boolean | null
          last_active_at?: string | null
          last_sign_in_at?: string | null
          main_profile_id?: string | null
          name?: string | null
          phone_number?: string | null
          public_metadata?: Json | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_main_profile_fk"
            columns: ["main_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      billing_interval: "monthly" | "annual"
      entity_type: "profile" | "organization"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      org_request_status: "pending" | "approved" | "rejected"
      organization_status: "pending" | "active" | "rejected"
      organization_subscription_tier:
        | "free"
        | "organization_plus"
        | "enterprise"
      organization_tier: "regular" | "verified" | "partner"
      phase_status: "pending" | "active" | "completed"
      pokemon_gender: "Male" | "Female"
      registration_status:
        | "pending"
        | "registered"
        | "confirmed"
        | "waitlist"
        | "checked_in"
        | "dropped"
        | "withdrawn"
      subscription_status: "active" | "cancelled" | "expired" | "past_due"
      tournament_format:
        | "swiss_only"
        | "swiss_with_cut"
        | "single_elimination"
        | "double_elimination"
      tournament_status:
        | "draft"
        | "upcoming"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      user_tier: "free" | "player_pro" | "coach_premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      billing_interval: ["monthly", "annual"],
      entity_type: ["profile", "organization"],
      invitation_status: ["pending", "accepted", "declined", "expired"],
      org_request_status: ["pending", "approved", "rejected"],
      organization_status: ["pending", "active", "rejected"],
      organization_subscription_tier: [
        "free",
        "organization_plus",
        "enterprise",
      ],
      organization_tier: ["regular", "verified", "partner"],
      phase_status: ["pending", "active", "completed"],
      pokemon_gender: ["Male", "Female"],
      registration_status: [
        "pending",
        "registered",
        "confirmed",
        "waitlist",
        "checked_in",
        "dropped",
        "withdrawn",
      ],
      subscription_status: ["active", "cancelled", "expired", "past_due"],
      tournament_format: [
        "swiss_only",
        "swiss_with_cut",
        "single_elimination",
        "double_elimination",
      ],
      tournament_status: [
        "draft",
        "upcoming",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      user_tier: ["free", "player_pro", "coach_premium"],
    },
  },
} as const

