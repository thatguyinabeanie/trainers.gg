export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  limitless: {
    Tables: {
      match_results: {
        Row: {
          id: number
          imported_at: string
          match_label: string | null
          phase: number
          player1_id: number
          player2_id: number | null
          round: number
          table_number: number | null
          tournament_id: string
          winner_id: number | null
        }
        Insert: {
          id?: never
          imported_at?: string
          match_label?: string | null
          phase: number
          player1_id: number
          player2_id?: number | null
          round: number
          table_number?: number | null
          tournament_id: string
          winner_id?: number | null
        }
        Update: {
          id?: never
          imported_at?: string
          match_label?: string | null
          phase?: number
          player1_id?: number
          player2_id?: number | null
          round?: number
          table_number?: number | null
          tournament_id?: string
          winner_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_match_phase"
            columns: ["tournament_id", "phase"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["tournament_id", "phase_number"]
          },
          {
            foreignKeyName: "match_results_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          created_at: string
          id: number
          limitless_id: number
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          limitless_id: number
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          limitless_id?: number
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      phases: {
        Row: {
          mode: string
          phase_number: number
          rounds: number
          tournament_id: string
          type: string
        }
        Insert: {
          mode: string
          phase_number: number
          rounds: number
          tournament_id: string
          type: string
        }
        Update: {
          mode?: string
          phase_number?: number
          rounds?: number
          tournament_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "phases_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["tournament_id"]
          },
        ]
      }
      players: {
        Row: {
          country: string | null
          created_at: string
          display_name: string | null
          id: number
          username: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: never
          username: string
        }
        Update: {
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: never
          username?: string
        }
        Relationships: []
      }
      standings: {
        Row: {
          drop_round: number | null
          id: number
          placement: number
          player_id: number
          record_losses: number
          record_ties: number
          record_wins: number
          tournament_id: string
        }
        Insert: {
          drop_round?: number | null
          id?: never
          placement: number
          player_id: number
          record_losses?: number
          record_ties?: number
          record_wins?: number
          tournament_id: string
        }
        Update: {
          drop_round?: number | null
          id?: never
          placement?: number
          player_id?: number
          record_losses?: number
          record_ties?: number
          record_wins?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["tournament_id"]
          },
        ]
      }
      team_pokemon: {
        Row: {
          ability: string | null
          held_item: string | null
          id: number
          moves: string[] | null
          nature: string | null
          position: number
          species: string
          standing_id: number
          tera_type: string | null
        }
        Insert: {
          ability?: string | null
          held_item?: string | null
          id?: never
          moves?: string[] | null
          nature?: string | null
          position: number
          species: string
          standing_id: number
          tera_type?: string | null
        }
        Update: {
          ability?: string | null
          held_item?: string | null
          id?: never
          moves?: string[] | null
          nature?: string | null
          position?: number
          species?: string
          standing_id?: number
          tera_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_pokemon_standing_id_fkey"
            columns: ["standing_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          data_imported_at: string | null
          date: string
          decklists: boolean
          format_id: string
          import_attempts: number | null
          import_error: string | null
          import_page: number | null
          import_phase: string | null
          import_requested_at: string | null
          import_started_at: string | null
          import_status: string | null
          imported_at: string
          is_online: boolean
          name: string
          organizer_id: number | null
          organizer_name: string | null
          platform: string | null
          player_count: number
          tournament_id: string
        }
        Insert: {
          data_imported_at?: string | null
          date: string
          decklists?: boolean
          format_id: string
          import_attempts?: number | null
          import_error?: string | null
          import_page?: number | null
          import_phase?: string | null
          import_requested_at?: string | null
          import_started_at?: string | null
          import_status?: string | null
          imported_at?: string
          is_online?: boolean
          name: string
          organizer_id?: number | null
          organizer_name?: string | null
          platform?: string | null
          player_count?: number
          tournament_id: string
        }
        Update: {
          data_imported_at?: string | null
          date?: string
          decklists?: boolean
          format_id?: string
          import_attempts?: number | null
          import_error?: string | null
          import_page?: number | null
          import_phase?: string | null
          import_requested_at?: string | null
          import_started_at?: string | null
          import_status?: string | null
          imported_at?: string
          is_online?: boolean
          name?: string
          organizer_id?: number | null
          organizer_name?: string | null
          platform?: string | null
          player_count?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atomic_clear_tournament: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      tournament_stats: {
        Args: never
        Returns: {
          format_id: string
          imported: number
          synced: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  private: {
    Tables: {
      user_pii: {
        Row: {
          birth_date: string | null
          first_name: string | null
          last_name: string | null
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          first_name?: string | null
          last_name?: string | null
          user_id: string
        }
        Update: {
          birth_date?: string | null
          first_name?: string | null
          last_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alts: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: number
          is_public: boolean
          tier: Database["public"]["Enums"]["user_tier"] | null
          tier_expires_at: string | null
          tier_started_at: string | null
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: never
          is_public?: boolean
          tier?: Database["public"]["Enums"]["user_tier"] | null
          tier_expires_at?: string | null
          tier_started_at?: string | null
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: never
          is_public?: boolean
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
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string | null
          id: number
          is_active: boolean
          message: string
          start_at: string
          title: string
          type: Database["public"]["Enums"]["announcement_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: never
          is_active?: boolean
          message: string
          start_at?: string
          title: string
          type?: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: never
          is_active?: boolean
          message?: string
          start_at?: string
          title?: string
          type?: Database["public"]["Enums"]["announcement_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      atproto_oauth_state: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          state_data: Json
          state_key: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          state_data: Json
          state_key: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          state_data?: Json
          state_key?: string
        }
        Relationships: []
      }
      atproto_sessions: {
        Row: {
          created_at: string
          did: string
          expires_at: string | null
          handle: string | null
          id: string
          pds_url: string | null
          session_data: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          did: string
          expires_at?: string | null
          handle?: string | null
          id?: string
          pds_url?: string | null
          session_data: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          did?: string
          expires_at?: string | null
          handle?: string | null
          id?: string
          pds_url?: string | null
          session_data?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atproto_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atproto_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_alt_id: number | null
          actor_user_id: string | null
          community_id: number | null
          created_at: string
          game_id: number | null
          id: number
          match_id: number | null
          metadata: Json
          tournament_id: number | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_alt_id?: number | null
          actor_user_id?: string | null
          community_id?: number | null
          created_at?: string
          game_id?: number | null
          id?: never
          match_id?: number | null
          metadata?: Json
          tournament_id?: number | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_alt_id?: number | null
          actor_user_id?: string | null
          community_id?: number | null
          created_at?: string
          game_id?: number | null
          id?: never
          match_id?: number | null
          metadata?: Json
          tournament_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_alt_id_fkey"
            columns: ["actor_alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "match_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_profiles: {
        Row: {
          bio: string | null
          created_at: string
          formats: string[]
          headline: string | null
          links: Json
          service_types: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          formats?: string[]
          headline?: string | null
          links?: Json
          service_types?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          formats?: string[]
          headline?: string | null
          links?: Json
          service_types?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          about: string | null
          banner_url: string | null
          bluesky_did: string | null
          bluesky_handle: string | null
          created_at: string | null
          description: string | null
          discord_invite_url: string | null
          featured_order: number | null
          icon: string | null
          id: number
          is_featured: boolean
          logo_url: string | null
          name: string
          owner_user_id: string
          pds_status: Database["public"]["Enums"]["pds_account_status"] | null
          platform_fee_percentage: number | null
          slug: string
          social_links: Json
          status: Database["public"]["Enums"]["community_status"] | null
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_tier:
            | Database["public"]["Enums"]["community_subscription_tier"]
            | null
          tier: Database["public"]["Enums"]["community_tier"] | null
          updated_at: string | null
        }
        Insert: {
          about?: string | null
          banner_url?: string | null
          bluesky_did?: string | null
          bluesky_handle?: string | null
          created_at?: string | null
          description?: string | null
          discord_invite_url?: string | null
          featured_order?: number | null
          icon?: string | null
          id?: never
          is_featured?: boolean
          logo_url?: string | null
          name: string
          owner_user_id: string
          pds_status?: Database["public"]["Enums"]["pds_account_status"] | null
          platform_fee_percentage?: number | null
          slug: string
          social_links?: Json
          status?: Database["public"]["Enums"]["community_status"] | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["community_subscription_tier"]
            | null
          tier?: Database["public"]["Enums"]["community_tier"] | null
          updated_at?: string | null
        }
        Update: {
          about?: string | null
          banner_url?: string | null
          bluesky_did?: string | null
          bluesky_handle?: string | null
          created_at?: string | null
          description?: string | null
          discord_invite_url?: string | null
          featured_order?: number | null
          icon?: string | null
          id?: never
          is_featured?: boolean
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          pds_status?: Database["public"]["Enums"]["pds_account_status"] | null
          platform_fee_percentage?: number | null
          slug?: string
          social_links?: Json
          status?: Database["public"]["Enums"]["community_status"] | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["community_subscription_tier"]
            | null
          tier?: Database["public"]["Enums"]["community_tier"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      community_admin_notes: {
        Row: {
          community_id: number
          id: number
          notes: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          community_id: number
          id?: never
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          community_id?: number
          id?: never
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_admin_notes_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: true
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_invitations: {
        Row: {
          community_id: number
          created_at: string | null
          expires_at: string | null
          id: number
          invited_by_user_id: string
          invited_user_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"] | null
        }
        Insert: {
          community_id: number
          created_at?: string | null
          expires_at?: string | null
          id?: never
          invited_by_user_id: string
          invited_user_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
        }
        Update: {
          community_id?: number
          created_at?: string | null
          expires_at?: string | null
          id?: never
          invited_by_user_id?: string
          invited_user_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "community_invitations_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invitations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invitations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      community_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string | null
          discord_invite_url: string
          id: number
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          social_links: Json | null
          status: Database["public"]["Enums"]["community_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          discord_invite_url: string
          id?: never
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          social_links?: Json | null
          status?: Database["public"]["Enums"]["community_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          discord_invite_url?: string
          id?: never
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          social_links?: Json | null
          status?: Database["public"]["Enums"]["community_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      community_staff: {
        Row: {
          community_id: number
          created_at: string | null
          id: number
          user_id: string
        }
        Insert: {
          community_id: number
          created_at?: string | null
          id?: never
          user_id: string
        }
        Update: {
          community_id?: number
          created_at?: string | null
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_staff_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_channel_failures: {
        Row: {
          channel_id: string
          consecutive_failures: number
          discord_server_id: number
          email_sent_at: string | null
          id: number
          last_failed_at: string | null
        }
        Insert: {
          channel_id: string
          consecutive_failures?: number
          discord_server_id: number
          email_sent_at?: string | null
          id?: never
          last_failed_at?: string | null
        }
        Update: {
          channel_id?: string
          consecutive_failures?: number
          discord_server_id?: number
          email_sent_at?: string | null
          id?: never
          last_failed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_channel_failures_discord_server_id_fkey"
            columns: ["discord_server_id"]
            isOneToOne: false
            referencedRelation: "discord_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_channels: {
        Row: {
          channel_id: string
          created_at: string
          discord_server_id: number
          event_type: string
          id: number
          ping_role_id: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          discord_server_id: number
          event_type: string
          id?: never
          ping_role_id?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          discord_server_id?: number
          event_type?: string
          id?: never
          ping_role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_channels_discord_server_id_fkey"
            columns: ["discord_server_id"]
            isOneToOne: false
            referencedRelation: "discord_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_delivery_failures: {
        Row: {
          community_id: number
          created_at: string
          delivered_via_fallback: boolean
          discord_server_id: number
          error_code: string | null
          error_reason: string
          event_type: string
          id: number
          payload: Json | null
          target: string
          type: string
        }
        Insert: {
          community_id: number
          created_at?: string
          delivered_via_fallback?: boolean
          discord_server_id: number
          error_code?: string | null
          error_reason: string
          event_type: string
          id?: never
          payload?: Json | null
          target: string
          type: string
        }
        Update: {
          community_id?: number
          created_at?: string
          delivered_via_fallback?: boolean
          discord_server_id?: number
          error_code?: string | null
          error_reason?: string
          event_type?: string
          id?: never
          payload?: Json | null
          target?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_delivery_failures_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_delivery_failures_discord_server_id_fkey"
            columns: ["discord_server_id"]
            isOneToOne: false
            referencedRelation: "discord_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_delivery_log: {
        Row: {
          community_id: number
          created_at: string
          discord_server_id: number
          event_type: string
          id: number
          metadata: Json | null
          target: string
          type: string
        }
        Insert: {
          community_id: number
          created_at?: string
          discord_server_id: number
          event_type: string
          id?: never
          metadata?: Json | null
          target: string
          type: string
        }
        Update: {
          community_id?: number
          created_at?: string
          discord_server_id?: number
          event_type?: string
          id?: never
          metadata?: Json | null
          target?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_delivery_log_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discord_delivery_log_discord_server_id_fkey"
            columns: ["discord_server_id"]
            isOneToOne: false
            referencedRelation: "discord_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_dm_settings: {
        Row: {
          created_at: string
          delivery_mode: string
          discord_server_id: number
          event_type: Database["public"]["Enums"]["discord_dm_event_type"]
          fallback_channel_id: string | null
          id: number
        }
        Insert: {
          created_at?: string
          delivery_mode?: string
          discord_server_id: number
          event_type: Database["public"]["Enums"]["discord_dm_event_type"]
          fallback_channel_id?: string | null
          id?: never
        }
        Update: {
          created_at?: string
          delivery_mode?: string
          discord_server_id?: number
          event_type?: Database["public"]["Enums"]["discord_dm_event_type"]
          fallback_channel_id?: string | null
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "discord_dm_settings_discord_server_id_fkey"
            columns: ["discord_server_id"]
            isOneToOne: false
            referencedRelation: "discord_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_role_mappings: {
        Row: {
          created_at: string
          discord_role_id: string
          discord_server_id: number
          enabled: boolean
          id: number
          role_type: Database["public"]["Enums"]["discord_role_type"]
        }
        Insert: {
          created_at?: string
          discord_role_id: string
          discord_server_id: number
          enabled?: boolean
          id?: never
          role_type: Database["public"]["Enums"]["discord_role_type"]
        }
        Update: {
          created_at?: string
          discord_role_id?: string
          discord_server_id?: number
          enabled?: boolean
          id?: never
          role_type?: Database["public"]["Enums"]["discord_role_type"]
        }
        Relationships: [
          {
            foreignKeyName: "discord_role_mappings_discord_server_id_fkey"
            columns: ["discord_server_id"]
            isOneToOne: false
            referencedRelation: "discord_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_servers: {
        Row: {
          community_id: number
          created_at: string
          guild_id: string
          id: number
          installed_by: string
          settings: Json
        }
        Insert: {
          community_id: number
          created_at?: string
          guild_id: string
          id?: never
          installed_by: string
          settings?: Json
        }
        Update: {
          community_id?: number
          created_at?: string
          guild_id?: string
          id?: never
          installed_by?: string
          settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "discord_servers_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: true
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_user_dm_preferences: {
        Row: {
          enabled: boolean
          event_type: Database["public"]["Enums"]["discord_dm_event_type"]
          user_id: string
        }
        Insert: {
          enabled?: boolean
          event_type: Database["public"]["Enums"]["discord_dm_event_type"]
          user_id: string
        }
        Update: {
          enabled?: boolean
          event_type?: Database["public"]["Enums"]["discord_dm_event_type"]
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          id: number
          key: string
          metadata: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: never
          key: string
          metadata?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: never
          key?: string
          metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_usage: {
        Row: {
          created_at: string | null
          entity_id: number
          entity_type: Database["public"]["Enums"]["entity_type"]
          feature_key: string
          id: number
          period_end: string
          period_start: string
          updated_at: string | null
          usage: number | null
          usage_limit: number | null
        }
        Insert: {
          created_at?: string | null
          entity_id: number
          entity_type: Database["public"]["Enums"]["entity_type"]
          feature_key: string
          id?: never
          period_end: string
          period_start: string
          updated_at?: string | null
          usage?: number | null
          usage_limit?: number | null
        }
        Update: {
          created_at?: string | null
          entity_id?: number
          entity_type?: Database["public"]["Enums"]["entity_type"]
          feature_key?: string
          id?: never
          period_end?: string
          period_start?: string
          updated_at?: string | null
          usage?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_user_id: string
          following_user_id: string
          id: number
        }
        Insert: {
          created_at?: string | null
          follower_user_id: string
          following_user_id: string
          id?: never
        }
        Update: {
          created_at?: string | null
          follower_user_id?: string
          following_user_id?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_user_id_fkey"
            columns: ["follower_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_user_id_fkey"
            columns: ["follower_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_user_id_fkey"
            columns: ["following_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_user_id_fkey"
            columns: ["following_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_roles: {
        Row: {
          created_at: string | null
          group_id: number
          id: number
          role_id: number
        }
        Insert: {
          created_at?: string | null
          group_id: number
          id?: never
          role_id: number
        }
        Update: {
          created_at?: string | null
          group_id?: number
          id?: never
          role_id?: number
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
          community_id: number
          created_at: string | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          community_id: number
          created_at?: string | null
          description?: string | null
          id?: never
          name: string
        }
        Update: {
          community_id?: number
          created_at?: string | null
          description?: string | null
          id?: never
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          admin_user_id: string
          ended_at: string | null
          id: number
          ip_address: unknown
          reason: string | null
          started_at: string
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          ended_at?: string | null
          id?: never
          ip_address?: unknown
          reason?: string | null
          started_at?: string
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          ended_at?: string | null
          id?: never
          ip_address?: unknown
          reason?: string | null
          started_at?: string
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_sessions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      import_exclusions: {
        Row: {
          excluded_at: string
          excluded_by: string | null
          id: number
          reason: string | null
          source: string
          source_event_id: string
        }
        Insert: {
          excluded_at?: string
          excluded_by?: string | null
          id?: never
          reason?: string | null
          source: string
          source_event_id: string
        }
        Update: {
          excluded_at?: string
          excluded_by?: string | null
          id?: never
          reason?: string | null
          source?: string
          source_event_id?: string
        }
        Relationships: []
      }
      import_runs: {
        Row: {
          detail: Json | null
          errors: number
          finished_at: string | null
          id: number
          processed: number
          remaining: number | null
          skip_reason: string | null
          source: string
          started_at: string
          status: string
          trigger: string
        }
        Insert: {
          detail?: Json | null
          errors?: number
          finished_at?: string | null
          id?: never
          processed?: number
          remaining?: number | null
          skip_reason?: string | null
          source: string
          started_at?: string
          status?: string
          trigger: string
        }
        Update: {
          detail?: Json | null
          errors?: number
          finished_at?: string | null
          id?: never
          processed?: number
          remaining?: number | null
          skip_reason?: string | null
          source?: string
          started_at?: string
          status?: string
          trigger?: string
        }
        Relationships: []
      }
      linked_atproto_accounts: {
        Row: {
          created_at: string
          did: string
          handle: string | null
          id: string
          is_primary: boolean
          pds_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          did: string
          handle?: string | null
          id?: string
          is_primary?: boolean
          pds_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          did?: string
          handle?: string | null
          id?: string
          is_primary?: boolean
          pds_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linked_atproto_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linked_atproto_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_games: {
        Row: {
          alt1_selection: number | null
          alt1_submitted_at: string | null
          alt2_selection: number | null
          alt2_submitted_at: string | null
          community_id: number | null
          created_at: string
          game_number: number
          id: number
          is_no_show: boolean
          match_id: number
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: number | null
          status: Database["public"]["Enums"]["match_game_status"]
          tournament_id: number | null
          updated_at: string
          winner_alt_id: number | null
        }
        Insert: {
          alt1_selection?: number | null
          alt1_submitted_at?: string | null
          alt2_selection?: number | null
          alt2_submitted_at?: string | null
          community_id?: number | null
          created_at?: string
          game_number: number
          id?: never
          is_no_show?: boolean
          match_id: number
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: number | null
          status?: Database["public"]["Enums"]["match_game_status"]
          tournament_id?: number | null
          updated_at?: string
          winner_alt_id?: number | null
        }
        Update: {
          alt1_selection?: number | null
          alt1_submitted_at?: string | null
          alt2_selection?: number | null
          alt2_submitted_at?: string | null
          community_id?: number | null
          created_at?: string
          game_number?: number
          id?: never
          is_no_show?: boolean
          match_id?: number
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: number | null
          status?: Database["public"]["Enums"]["match_game_status"]
          tournament_id?: number | null
          updated_at?: string
          winner_alt_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_games_alt1_selection_fkey"
            columns: ["alt1_selection"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_alt2_selection_fkey"
            columns: ["alt2_selection"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_winner_alt_id_fkey"
            columns: ["winner_alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
        ]
      }
      match_messages: {
        Row: {
          alt_id: number | null
          community_id: number | null
          content: string
          created_at: string
          id: number
          match_id: number
          message_type: Database["public"]["Enums"]["match_message_type"]
          tournament_id: number | null
        }
        Insert: {
          alt_id?: number | null
          community_id?: number | null
          content: string
          created_at?: string
          id?: never
          match_id: number
          message_type?: Database["public"]["Enums"]["match_message_type"]
          tournament_id?: number | null
        }
        Update: {
          alt_id?: number | null
          community_id?: number | null
          content?: string
          created_at?: string
          id?: never
          match_id?: number
          message_type?: Database["public"]["Enums"]["match_message_type"]
          tournament_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_messages_alt_id_fkey"
            columns: ["alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_messages_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: number
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          id: number
          match_id: number | null
          read_at: string | null
          title: string
          tournament_id: number | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: never
          match_id?: number | null
          read_at?: string | null
          title: string
          tournament_id?: number | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: never
          match_id?: number | null
          read_at?: string | null
          title?: string
          tournament_id?: number | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pds_handles: {
        Row: {
          created_at: string
          did: string | null
          entity_id: string
          entity_type: string
          handle: string
        }
        Insert: {
          created_at?: string
          did?: string | null
          entity_id: string
          entity_type: string
          handle: string
        }
        Update: {
          created_at?: string
          did?: string | null
          entity_id?: string
          entity_type?: string
          handle?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          key: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: never
          key: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: never
          key?: string
          name?: string
        }
        Relationships: []
      }
      player_ratings: {
        Row: {
          alt_id: number
          created_at: string
          format: string
          games_played: number
          id: number
          peak_rating: number
          rating: number
          skill_bracket: string
          updated_at: string
        }
        Insert: {
          alt_id: number
          created_at?: string
          format?: string
          games_played?: number
          id?: never
          peak_rating?: number
          rating?: number
          skill_bracket?: string
          updated_at?: string
        }
        Update: {
          alt_id?: number
          created_at?: string
          format?: string
          games_played?: number
          id?: never
          peak_rating?: number
          rating?: number
          skill_bracket?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_alt_id_fkey"
            columns: ["alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
        ]
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
          id: number
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
          notes: string | null
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
          id?: never
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
          notes?: string | null
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
          id?: never
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
          notes?: string | null
          species?: string
          tera_type?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          expires_at: string
          id: number
          identifier: string
          request_timestamps: string[] | null
          window_start: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: never
          identifier: string
          request_timestamps?: string[] | null
          window_start: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: never
          identifier?: string
          request_timestamps?: string[] | null
          window_start?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: number
          permission_id: number
          role_id: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          permission_id: number
          role_id: number
        }
        Update: {
          created_at?: string | null
          id?: never
          permission_id?: number
          role_id?: number
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
          id: number
          name: string
          scope: Database["public"]["Enums"]["role_scope"]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: never
          name: string
          scope?: Database["public"]["Enums"]["role_scope"]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: never
          name?: string
          scope?: Database["public"]["Enums"]["role_scope"]
        }
        Relationships: []
      }
      site_config: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      smart_folders: {
        Row: {
          created_at: string
          criteria: Json
          id: number
          is_seeded: boolean
          name: string
          owner_user_id: string
        }
        Insert: {
          created_at?: string
          criteria?: Json
          id?: never
          is_seeded?: boolean
          name: string
          owner_user_id: string
        }
        Update: {
          created_at?: string
          criteria?: Json
          id?: never
          is_seeded?: boolean
          name?: string
          owner_user_id?: string
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
          entity_id: number
          entity_type: Database["public"]["Enums"]["entity_type"]
          expires_at: string | null
          id: number
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
          entity_id: number
          entity_type: Database["public"]["Enums"]["entity_type"]
          expires_at?: string | null
          id?: never
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
          entity_id?: number
          entity_type?: Database["public"]["Enums"]["entity_type"]
          expires_at?: string | null
          id?: never
          started_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sudo_sessions: {
        Row: {
          ended_at: string | null
          id: number
          ip_address: unknown
          started_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: never
          ip_address?: unknown
          started_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          id?: never
          ip_address?: unknown
          started_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sudo_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sudo_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_folder_members: {
        Row: {
          created_at: string
          folder_id: number
          id: number
          team_id: number
        }
        Insert: {
          created_at?: string
          folder_id: number
          id?: never
          team_id: number
        }
        Update: {
          created_at?: string
          folder_id?: number
          id?: never
          team_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_folder_members_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "team_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_folder_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_folders: {
        Row: {
          created_at: string
          id: number
          name: string
          owner_user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          owner_user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          owner_user_id?: string
        }
        Relationships: []
      }
      team_pokemon: {
        Row: {
          created_at: string | null
          id: number
          pokemon_id: number
          team_id: number
          team_position: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          pokemon_id: number
          team_id: number
          team_position: number
        }
        Update: {
          created_at?: string | null
          id?: never
          pokemon_id?: number
          team_id?: number
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
      team_slots: {
        Row: {
          ability: string | null
          compiled_at: string
          country: string | null
          division: string | null
          event_date: string
          event_key: string
          event_tier: string | null
          format: string
          held_item: string | null
          id: number
          is_online: boolean
          limitless_tournament_id: string | null
          losses: number | null
          moves: string[]
          nature: string | null
          placement: number | null
          player_key: string
          position: number
          rk9_event_id: string | null
          source: string
          species: string
          tera_type: string | null
          ties: number | null
          total_players: number
          wins: number | null
        }
        Insert: {
          ability?: string | null
          compiled_at?: string
          country?: string | null
          division?: string | null
          event_date: string
          event_key: string
          event_tier?: string | null
          format: string
          held_item?: string | null
          id?: never
          is_online: boolean
          limitless_tournament_id?: string | null
          losses?: number | null
          moves?: string[]
          nature?: string | null
          placement?: number | null
          player_key: string
          position: number
          rk9_event_id?: string | null
          source: string
          species: string
          tera_type?: string | null
          ties?: number | null
          total_players: number
          wins?: number | null
        }
        Update: {
          ability?: string | null
          compiled_at?: string
          country?: string | null
          division?: string | null
          event_date?: string
          event_key?: string
          event_tier?: string | null
          format?: string
          held_item?: string | null
          id?: never
          is_online?: boolean
          limitless_tournament_id?: string | null
          losses?: number | null
          moves?: string[]
          nature?: string | null
          placement?: number | null
          player_key?: string
          position?: number
          rk9_event_id?: string | null
          source?: string
          species?: string
          tera_type?: string | null
          ties?: number | null
          total_players?: number
          wins?: number | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          archived: boolean
          created_at: string | null
          created_by: number
          description: string | null
          format: string | null
          format_legal: boolean | null
          id: number
          is_public: boolean | null
          name: string
          notes: string | null
          parent_team_id: number | null
          pinned: boolean
          sort_order: number | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          archived?: boolean
          created_at?: string | null
          created_by: number
          description?: string | null
          format?: string | null
          format_legal?: boolean | null
          id?: never
          is_public?: boolean | null
          name: string
          notes?: string | null
          parent_team_id?: number | null
          pinned?: boolean
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          archived?: boolean
          created_at?: string | null
          created_by?: number
          description?: string | null
          format?: string | null
          format_legal?: boolean | null
          id?: never
          is_public?: boolean | null
          name?: string
          notes?: string | null
          parent_team_id?: number | null
          pinned?: boolean
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_parent_team_id_fkey"
            columns: ["parent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_events: {
        Row: {
          created_at: string | null
          created_by: number | null
          event_data: Json | null
          event_type: string
          id: number
          tournament_id: number
        }
        Insert: {
          created_at?: string | null
          created_by?: number | null
          event_data?: Json | null
          event_type: string
          id?: never
          tournament_id: number
        }
        Update: {
          created_at?: string | null
          created_by?: number | null
          event_data?: Json | null
          event_type?: string
          id?: never
          tournament_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "alts"
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
          id: number
          invited_alt_id: number
          invited_at: string | null
          invited_by_alt_id: number
          message: string | null
          registration_id: number | null
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"] | null
          tournament_id: number
        }
        Insert: {
          expires_at?: string | null
          id?: never
          invited_alt_id: number
          invited_at?: string | null
          invited_by_alt_id: number
          message?: string | null
          registration_id?: number | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
          tournament_id: number
        }
        Update: {
          expires_at?: string | null
          id?: never
          invited_alt_id?: number
          invited_at?: string | null
          invited_by_alt_id?: number
          message?: string | null
          registration_id?: number | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
          tournament_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_invitations_invited_alt_id_fkey"
            columns: ["invited_alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_invitations_invited_by_alt_id_fkey"
            columns: ["invited_by_alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_invitations_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "public_tournament_registrations"
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
          alt1_games_before: number | null
          alt1_id: number | null
          alt1_overall_games_before: number | null
          alt1_overall_rating_before: number | null
          alt1_rating_before: number | null
          alt2_games_before: number | null
          alt2_id: number | null
          alt2_overall_games_before: number | null
          alt2_overall_rating_before: number | null
          alt2_rating_before: number | null
          created_at: string | null
          elo_applied: boolean
          end_time: string | null
          game_wins1: number | null
          game_wins2: number | null
          id: number
          is_bye: boolean | null
          match_confirmed_at: string | null
          match_points1: number | null
          match_points2: number | null
          player1_match_confirmed: boolean | null
          player2_match_confirmed: boolean | null
          round_id: number
          staff_notes: string | null
          staff_requested: boolean | null
          staff_requested_at: string | null
          staff_resolved_by: number | null
          start_time: string | null
          status: Database["public"]["Enums"]["phase_status"] | null
          table_number: number | null
          winner_alt_id: number | null
        }
        Insert: {
          alt1_games_before?: number | null
          alt1_id?: number | null
          alt1_overall_games_before?: number | null
          alt1_overall_rating_before?: number | null
          alt1_rating_before?: number | null
          alt2_games_before?: number | null
          alt2_id?: number | null
          alt2_overall_games_before?: number | null
          alt2_overall_rating_before?: number | null
          alt2_rating_before?: number | null
          created_at?: string | null
          elo_applied?: boolean
          end_time?: string | null
          game_wins1?: number | null
          game_wins2?: number | null
          id?: never
          is_bye?: boolean | null
          match_confirmed_at?: string | null
          match_points1?: number | null
          match_points2?: number | null
          player1_match_confirmed?: boolean | null
          player2_match_confirmed?: boolean | null
          round_id: number
          staff_notes?: string | null
          staff_requested?: boolean | null
          staff_requested_at?: string | null
          staff_resolved_by?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          table_number?: number | null
          winner_alt_id?: number | null
        }
        Update: {
          alt1_games_before?: number | null
          alt1_id?: number | null
          alt1_overall_games_before?: number | null
          alt1_overall_rating_before?: number | null
          alt1_rating_before?: number | null
          alt2_games_before?: number | null
          alt2_id?: number | null
          alt2_overall_games_before?: number | null
          alt2_overall_rating_before?: number | null
          alt2_rating_before?: number | null
          created_at?: string | null
          elo_applied?: boolean
          end_time?: string | null
          game_wins1?: number | null
          game_wins2?: number | null
          id?: never
          is_bye?: boolean | null
          match_confirmed_at?: string | null
          match_points1?: number | null
          match_points2?: number | null
          player1_match_confirmed?: boolean | null
          player2_match_confirmed?: boolean | null
          round_id?: number
          staff_notes?: string | null
          staff_requested?: boolean | null
          staff_requested_at?: string | null
          staff_resolved_by?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          table_number?: number | null
          winner_alt_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_alt1_id_fkey"
            columns: ["alt1_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_alt2_id_fkey"
            columns: ["alt2_id"]
            isOneToOne: false
            referencedRelation: "alts"
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
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_alt_id_fkey"
            columns: ["winner_alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_opponent_history: {
        Row: {
          alt_id: number
          created_at: string | null
          id: number
          opponent_alt_id: number
          round_number: number
          tournament_id: number
        }
        Insert: {
          alt_id: number
          created_at?: string | null
          id?: never
          opponent_alt_id: number
          round_number: number
          tournament_id: number
        }
        Update: {
          alt_id?: number
          created_at?: string | null
          id?: never
          opponent_alt_id?: number
          round_number?: number
          tournament_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_opponent_history_alt_id_fkey"
            columns: ["alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_opponent_history_opponent_alt_id_fkey"
            columns: ["opponent_alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
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
          alt1_id: number | null
          alt1_seed: number | null
          alt2_id: number | null
          alt2_seed: number | null
          created_at: string | null
          id: number
          is_bye: boolean | null
          match_id: number | null
          pairing_reason: string | null
          pairing_type: string
          round_id: number
          table_number: number | null
          tournament_id: number
        }
        Insert: {
          algorithm_notes?: string | null
          alt1_id?: number | null
          alt1_seed?: number | null
          alt2_id?: number | null
          alt2_seed?: number | null
          created_at?: string | null
          id?: never
          is_bye?: boolean | null
          match_id?: number | null
          pairing_reason?: string | null
          pairing_type: string
          round_id: number
          table_number?: number | null
          tournament_id: number
        }
        Update: {
          algorithm_notes?: string | null
          alt1_id?: number | null
          alt1_seed?: number | null
          alt2_id?: number | null
          alt2_seed?: number | null
          created_at?: string | null
          id?: never
          is_bye?: boolean | null
          match_id?: number | null
          pairing_reason?: string | null
          pairing_type?: string
          round_id?: number
          table_number?: number | null
          tournament_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_pairings_alt1_id_fkey"
            columns: ["alt1_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_pairings_alt2_id_fkey"
            columns: ["alt2_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_pairings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
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
          best_of: number | null
          check_in_time_minutes: number | null
          completed_at: string | null
          created_at: string | null
          current_round: number | null
          cut_rule: string | null
          id: number
          name: string
          phase_order: number
          phase_type: string
          planned_rounds: number | null
          round_time_minutes: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["phase_status"] | null
          tournament_id: number
        }
        Insert: {
          best_of?: number | null
          check_in_time_minutes?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_round?: number | null
          cut_rule?: string | null
          id?: never
          name: string
          phase_order: number
          phase_type: string
          planned_rounds?: number | null
          round_time_minutes?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          tournament_id: number
        }
        Update: {
          best_of?: number | null
          check_in_time_minutes?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_round?: number | null
          cut_rule?: string | null
          id?: never
          name?: string
          phase_order?: number
          phase_type?: string
          planned_rounds?: number | null
          round_time_minutes?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          tournament_id?: number
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
          alt_id: number
          buchholz_score: number | null
          created_at: string | null
          current_seed: number | null
          current_standing: number | null
          final_ranking: number | null
          game_losses: number | null
          game_win_percentage: number | null
          game_wins: number | null
          has_received_bye: boolean | null
          id: number
          is_dropped: boolean | null
          last_tiebreaker_update: string | null
          match_losses: number | null
          match_points: number | null
          match_win_percentage: number | null
          match_wins: number | null
          matches_played: number | null
          modified_buchholz_score: number | null
          opponent_game_win_percentage: number | null
          opponent_history: number[] | null
          opponent_match_win_percentage: number | null
          opponent_opponent_match_win_percentage: number | null
          rounds_played: number | null
          standings_need_recalc: boolean | null
          strength_of_schedule: number | null
          tournament_id: number
          updated_at: string | null
        }
        Insert: {
          alt_id: number
          buchholz_score?: number | null
          created_at?: string | null
          current_seed?: number | null
          current_standing?: number | null
          final_ranking?: number | null
          game_losses?: number | null
          game_win_percentage?: number | null
          game_wins?: number | null
          has_received_bye?: boolean | null
          id?: never
          is_dropped?: boolean | null
          last_tiebreaker_update?: string | null
          match_losses?: number | null
          match_points?: number | null
          match_win_percentage?: number | null
          match_wins?: number | null
          matches_played?: number | null
          modified_buchholz_score?: number | null
          opponent_game_win_percentage?: number | null
          opponent_history?: number[] | null
          opponent_match_win_percentage?: number | null
          opponent_opponent_match_win_percentage?: number | null
          rounds_played?: number | null
          standings_need_recalc?: boolean | null
          strength_of_schedule?: number | null
          tournament_id: number
          updated_at?: string | null
        }
        Update: {
          alt_id?: number
          buchholz_score?: number | null
          created_at?: string | null
          current_seed?: number | null
          current_standing?: number | null
          final_ranking?: number | null
          game_losses?: number | null
          game_win_percentage?: number | null
          game_wins?: number | null
          has_received_bye?: boolean | null
          id?: never
          is_dropped?: boolean | null
          last_tiebreaker_update?: string | null
          match_losses?: number | null
          match_points?: number | null
          match_win_percentage?: number | null
          match_wins?: number | null
          matches_played?: number | null
          modified_buchholz_score?: number | null
          opponent_game_win_percentage?: number | null
          opponent_history?: number[] | null
          opponent_match_win_percentage?: number | null
          opponent_opponent_match_win_percentage?: number | null
          rounds_played?: number | null
          standings_need_recalc?: boolean | null
          strength_of_schedule?: number | null
          tournament_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_player_stats_alt_id_fkey"
            columns: ["alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
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
          id: number
          pokemon_id: number
          team_position: number
          tournament_registration_id: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          pokemon_id: number
          team_position: number
          tournament_registration_id: number
        }
        Update: {
          created_at?: string | null
          id?: never
          pokemon_id?: number
          team_position?: number
          tournament_registration_id?: number
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
            referencedRelation: "public_tournament_registrations"
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
      tournament_registration_staff: {
        Row: {
          drop_category: Database["public"]["Enums"]["drop_category"] | null
          drop_notes: string | null
          dropped_at: string | null
          dropped_by: string | null
          registration_id: number
          rental_team_photo_key: string | null
          rental_team_photo_uploaded_at: string | null
          rental_team_photo_url: string | null
          rental_team_photo_verified: boolean | null
          rental_team_photo_verified_at: string | null
          rental_team_photo_verified_by: number | null
        }
        Insert: {
          drop_category?: Database["public"]["Enums"]["drop_category"] | null
          drop_notes?: string | null
          dropped_at?: string | null
          dropped_by?: string | null
          registration_id: number
          rental_team_photo_key?: string | null
          rental_team_photo_uploaded_at?: string | null
          rental_team_photo_url?: string | null
          rental_team_photo_verified?: boolean | null
          rental_team_photo_verified_at?: string | null
          rental_team_photo_verified_by?: number | null
        }
        Update: {
          drop_category?: Database["public"]["Enums"]["drop_category"] | null
          drop_notes?: string | null
          dropped_at?: string | null
          dropped_by?: string | null
          registration_id?: number
          rental_team_photo_key?: string | null
          rental_team_photo_uploaded_at?: string | null
          rental_team_photo_url?: string | null
          rental_team_photo_verified?: boolean | null
          rental_team_photo_verified_at?: string | null
          rental_team_photo_verified_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registration_staff_dropped_by_fkey"
            columns: ["dropped_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registration_staff_dropped_by_fkey"
            columns: ["dropped_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registration_staff_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "public_tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registration_staff_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registration_staff_rental_team_photo_verified_b_fkey"
            columns: ["rental_team_photo_verified_by"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          alt_id: number
          checked_in_at: string | null
          created_at: string | null
          display_name_option: string | null
          id: number
          in_game_name: string | null
          registered_at: string | null
          show_country_flag: boolean | null
          status: Database["public"]["Enums"]["registration_status"] | null
          team_id: number | null
          team_locked: boolean | null
          team_name: string | null
          team_submitted_at: string | null
          tournament_id: number
        }
        Insert: {
          alt_id: number
          checked_in_at?: string | null
          created_at?: string | null
          display_name_option?: string | null
          id?: never
          in_game_name?: string | null
          registered_at?: string | null
          show_country_flag?: boolean | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          team_id?: number | null
          team_locked?: boolean | null
          team_name?: string | null
          team_submitted_at?: string | null
          tournament_id: number
        }
        Update: {
          alt_id?: number
          checked_in_at?: string | null
          created_at?: string | null
          display_name_option?: string | null
          id?: never
          in_game_name?: string | null
          registered_at?: string | null
          show_country_flag?: boolean | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          team_id?: number | null
          team_locked?: boolean | null
          team_name?: string | null
          team_submitted_at?: string | null
          tournament_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_alt_id_fkey"
            columns: ["alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
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
          id: number
          name: string | null
          phase_id: number
          round_number: number
          start_time: string | null
          status: Database["public"]["Enums"]["phase_status"] | null
          time_extension_minutes: number | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: never
          name?: string | null
          phase_id: number
          round_number: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["phase_status"] | null
          time_extension_minutes?: number | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: never
          name?: string | null
          phase_id?: number
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
          alt_id: number
          created_at: string | null
          game_losses: number | null
          game_win_percentage: number | null
          game_wins: number | null
          id: number
          match_points: number | null
          match_win_percentage: number | null
          opponent_game_win_percentage: number | null
          opponent_match_win_percentage: number | null
          rank: number | null
          round_number: number
          tournament_id: number
        }
        Insert: {
          alt_id: number
          created_at?: string | null
          game_losses?: number | null
          game_win_percentage?: number | null
          game_wins?: number | null
          id?: never
          match_points?: number | null
          match_win_percentage?: number | null
          opponent_game_win_percentage?: number | null
          opponent_match_win_percentage?: number | null
          rank?: number | null
          round_number: number
          tournament_id: number
        }
        Update: {
          alt_id?: number
          created_at?: string | null
          game_losses?: number | null
          game_win_percentage?: number | null
          game_wins?: number | null
          id?: never
          match_points?: number | null
          match_win_percentage?: number | null
          opponent_game_win_percentage?: number | null
          opponent_match_win_percentage?: number | null
          rank?: number | null
          round_number?: number
          tournament_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_standings_alt_id_fkey"
            columns: ["alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
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
      tournament_team_sheets: {
        Row: {
          ability: string
          alt_id: number
          created_at: string
          format: string
          held_item: string | null
          id: number
          move1: string
          move2: string | null
          move3: string | null
          move4: string | null
          nature: string | null
          position: number
          registration_id: number
          species: string
          team_id: number
          tera_type: string | null
          tournament_id: number
        }
        Insert: {
          ability: string
          alt_id: number
          created_at?: string
          format: string
          held_item?: string | null
          id?: never
          move1: string
          move2?: string | null
          move3?: string | null
          move4?: string | null
          nature?: string | null
          position: number
          registration_id: number
          species: string
          team_id: number
          tera_type?: string | null
          tournament_id: number
        }
        Update: {
          ability?: string
          alt_id?: number
          created_at?: string
          format?: string
          held_item?: string | null
          id?: never
          move1?: string
          move2?: string | null
          move3?: string | null
          move4?: string | null
          nature?: string | null
          position?: number
          registration_id?: number
          species?: string
          team_id?: number
          tera_type?: string | null
          tournament_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournament_team_sheets_alt_id_fkey"
            columns: ["alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_team_sheets_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "public_tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_team_sheets_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_team_sheets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_team_sheets_tournament_id_fkey"
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
          id: number
          name: string
          phase_config: Json | null
          phase_order: number
          phase_type: string
          template_id: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          name: string
          phase_config?: Json | null
          phase_order: number
          phase_type: string
          template_id: number
        }
        Update: {
          created_at?: string | null
          id?: never
          name?: string
          phase_config?: Json | null
          phase_order?: number
          phase_type?: string
          template_id?: number
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
          community_id: number | null
          created_at: string | null
          created_by: number
          description: string | null
          id: number
          is_official: boolean | null
          is_public: boolean | null
          name: string
          tags: string[] | null
          template_config: Json | null
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          community_id?: number | null
          created_at?: string | null
          created_by: number
          description?: string | null
          id?: never
          is_official?: boolean | null
          is_public?: boolean | null
          name: string
          tags?: string[] | null
          template_config?: Json | null
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          community_id?: number | null
          created_at?: string | null
          created_by?: number
          description?: string | null
          id?: never
          is_official?: boolean | null
          is_public?: boolean | null
          name?: string
          tags?: string[] | null
          template_config?: Json | null
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_templates_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          allow_late_registration: boolean | null
          archive_reason: string | null
          archived_at: string | null
          archived_by: number | null
          battle_format: string | null
          check_in_required: boolean | null
          check_in_window_minutes: number | null
          community_id: number
          created_at: string | null
          current_phase_id: number | null
          current_round: number | null
          description: string | null
          end_date: string | null
          featured: boolean | null
          format: string | null
          game: string | null
          game_format: string | null
          id: number
          late_check_in_max_round: number | null
          max_participants: number | null
          name: string
          open_team_sheets: boolean | null
          participants: number[] | null
          platform: string | null
          prize_pool: string | null
          registration_type: string | null
          rental_team_photos_enabled: boolean | null
          rental_team_photos_required: boolean | null
          round_time_minutes: number | null
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["tournament_status"] | null
          swiss_rounds: number | null
          template_id: number | null
          top_cut_size: number | null
          tournament_format:
            | Database["public"]["Enums"]["tournament_format"]
            | null
          tournament_state: Json | null
          updated_at: string | null
        }
        Insert: {
          allow_late_registration?: boolean | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: number | null
          battle_format?: string | null
          check_in_required?: boolean | null
          check_in_window_minutes?: number | null
          community_id: number
          created_at?: string | null
          current_phase_id?: number | null
          current_round?: number | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          format?: string | null
          game?: string | null
          game_format?: string | null
          id?: never
          late_check_in_max_round?: number | null
          max_participants?: number | null
          name: string
          open_team_sheets?: boolean | null
          participants?: number[] | null
          platform?: string | null
          prize_pool?: string | null
          registration_type?: string | null
          rental_team_photos_enabled?: boolean | null
          rental_team_photos_required?: boolean | null
          round_time_minutes?: number | null
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["tournament_status"] | null
          swiss_rounds?: number | null
          template_id?: number | null
          top_cut_size?: number | null
          tournament_format?:
            | Database["public"]["Enums"]["tournament_format"]
            | null
          tournament_state?: Json | null
          updated_at?: string | null
        }
        Update: {
          allow_late_registration?: boolean | null
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: number | null
          battle_format?: string | null
          check_in_required?: boolean | null
          check_in_window_minutes?: number | null
          community_id?: number
          created_at?: string | null
          current_phase_id?: number | null
          current_round?: number | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          format?: string | null
          game?: string | null
          game_format?: string | null
          id?: never
          late_check_in_max_round?: number | null
          max_participants?: number | null
          name?: string
          open_team_sheets?: boolean | null
          participants?: number[] | null
          platform?: string | null
          prize_pool?: string | null
          registration_type?: string | null
          rental_team_photos_enabled?: boolean | null
          rental_team_photos_required?: boolean | null
          round_time_minutes?: number | null
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["tournament_status"] | null
          swiss_rounds?: number | null
          template_id?: number | null
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
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
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
            foreignKeyName: "tournaments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "tournament_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_roles: {
        Row: {
          created_at: string | null
          group_role_id: number
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_role_id: number
          id?: never
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_role_id?: number
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alt_group_roles_group_role_id_fkey"
            columns: ["group_role_id"]
            isOneToOne: false
            referencedRelation: "group_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: number
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: number
          role_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          role_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: never
          role_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          bio: string | null
          country: string | null
          created_at: string | null
          did: string | null
          discord_dm_warn_until: string | null
          id: string
          image: string | null
          is_coach: boolean
          is_locked: boolean | null
          last_active_at: string | null
          last_sign_in_at: string | null
          main_alt_id: number | null
          name: string | null
          pds_handle: string | null
          pds_status: Database["public"]["Enums"]["pds_account_status"] | null
          show_discord_publicly: boolean
          sprite_preference:
            | Database["public"]["Enums"]["sprite_preference"]
            | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          country?: string | null
          created_at?: string | null
          did?: string | null
          discord_dm_warn_until?: string | null
          id: string
          image?: string | null
          is_coach?: boolean
          is_locked?: boolean | null
          last_active_at?: string | null
          last_sign_in_at?: string | null
          main_alt_id?: number | null
          name?: string | null
          pds_handle?: string | null
          pds_status?: Database["public"]["Enums"]["pds_account_status"] | null
          show_discord_publicly?: boolean
          sprite_preference?:
            | Database["public"]["Enums"]["sprite_preference"]
            | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          country?: string | null
          created_at?: string | null
          did?: string | null
          discord_dm_warn_until?: string | null
          id?: string
          image?: string | null
          is_coach?: boolean
          is_locked?: boolean | null
          last_active_at?: string | null
          last_sign_in_at?: string | null
          main_alt_id?: number | null
          name?: string | null
          pds_handle?: string | null
          pds_status?: Database["public"]["Enums"]["pds_account_status"] | null
          show_discord_publicly?: boolean
          sprite_preference?:
            | Database["public"]["Enums"]["sprite_preference"]
            | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_main_alt_fk"
            columns: ["main_alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_tournament_registrations: {
        Row: {
          alt_id: number | null
          checked_in_at: string | null
          display_name_option: string | null
          id: number | null
          in_game_name: string | null
          registered_at: string | null
          show_country_flag: boolean | null
          status: Database["public"]["Enums"]["registration_status"] | null
          team_id: number | null
          team_name: string | null
          team_submitted_at: string | null
          tournament_id: number | null
        }
        Insert: {
          alt_id?: number | null
          checked_in_at?: string | null
          display_name_option?: string | null
          id?: number | null
          in_game_name?: string | null
          registered_at?: string | null
          show_country_flag?: boolean | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          team_id?: number | null
          team_name?: string | null
          team_submitted_at?: string | null
          tournament_id?: number | null
        }
        Update: {
          alt_id?: number | null
          checked_in_at?: string | null
          display_name_option?: string | null
          id?: number | null
          in_game_name?: string | null
          registered_at?: string | null
          show_country_flag?: boolean | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          team_id?: number | null
          team_name?: string | null
          team_submitted_at?: string | null
          tournament_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_alt_id_fkey"
            columns: ["alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
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
      public_user_profiles: {
        Row: {
          bio: string | null
          country: string | null
          created_at: string | null
          did: string | null
          id: string | null
          image: string | null
          is_coach: boolean | null
          main_alt_id: number | null
          name: string | null
          pds_handle: string | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          country?: string | null
          created_at?: string | null
          did?: string | null
          id?: string | null
          image?: string | null
          is_coach?: boolean | null
          main_alt_id?: number | null
          name?: string | null
          pds_handle?: string | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          country?: string | null
          created_at?: string | null
          did?: string | null
          id?: string | null
          image?: string | null
          is_coach?: boolean | null
          main_alt_id?: number | null
          name?: string | null
          pds_handle?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_main_alt_fk"
            columns: ["main_alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_tournament_invitation_atomic: {
        Args: { p_invitation_id: number }
        Returns: Json
      }
      add_pokemon_to_team: {
        Args: { p_pokemon: Json; p_position: number; p_team_id: number }
        Returns: number
      }
      admin_alter_cron_schedule: {
        Args: { p_job_name: string; p_schedule: string }
        Returns: undefined
      }
      admin_get_cron_schedules: {
        Args: never
        Returns: {
          job_name: string
          schedule: string
        }[]
      }
      advance_to_top_cut: {
        Args: { p_top_cut_size?: number; p_tournament_id: number }
        Returns: Json
      }
      apply_elo_result: {
        Args: {
          p_alt_id: number
          p_format: string
          p_opponent_rating: number
          p_score: number
        }
        Returns: undefined
      }
      cancel_judge_request: { Args: { p_match_id: number }; Returns: undefined }
      check_no_show_escalation: { Args: never; Returns: undefined }
      check_rate_limit: {
        Args: { p_identifier: string; p_limit: number; p_window_ms: number }
        Returns: {
          allowed: boolean
          reset_at: string
        }[]
      }
      check_table_privilege: {
        Args: { p_privilege: string; p_role: string; p_table: string }
        Returns: boolean
      }
      clear_judge_request: { Args: { p_match_id: number }; Returns: undefined }
      compute_tournament_elo: {
        Args: { p_tournament_id: number }
        Returns: undefined
      }
      confirm_match_checkin: {
        Args: { p_alt_id?: number; p_match_id: number }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      delete_team: { Args: { p_team_id: number }; Returns: undefined }
      drop_registrations: {
        Args: {
          p_drop_category: Database["public"]["Enums"]["drop_category"]
          p_drop_notes: string
          p_registration_ids: number[]
        }
        Returns: number[]
      }
      fork_team: {
        Args: {
          p_new_name?: string
          p_source_team_id: number
          p_target_alt_id: number
        }
        Returns: number
      }
      generate_bracket_order: {
        Args: { p_bracket_size: number }
        Returns: number[]
      }
      get_active_impersonation_session: {
        Args: { timeout_minutes?: number }
        Returns: {
          admin_user_id: string
          ended_at: string
          id: number
          ip_address: unknown
          reason: string
          started_at: string
          target_user_id: string
          user_agent: string
        }[]
      }
      get_active_sudo_session: {
        Args: { timeout_minutes?: number }
        Returns: {
          ended_at: string
          id: number
          ip_address: unknown
          started_at: string
          user_agent: string
          user_id: string
        }[]
      }
      get_coach_badges: {
        Args: { p_alt_ids: number[] }
        Returns: {
          alt_id: number
          coach_handle: string
          show_coach_badge: boolean
        }[]
      }
      get_community_id_from_group_role: {
        Args: { p_group_role_id: number }
        Returns: number
      }
      get_community_tournament_counts: {
        Args: { community_ids: number[] }
        Returns: {
          active_count: number
          community_id: number
          total_count: number
        }[]
      }
      get_current_alt_id: { Args: never; Returns: number }
      get_current_user_id: { Args: never; Returns: string }
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      get_format_events: {
        Args: { p_format: string }
        Returns: {
          event_date: string
          event_key: string
          source: string
        }[]
      }
      get_match_games_for_player: {
        Args: { p_match_id: number }
        Returns: {
          alt1_selection: number
          alt2_selection: number
          game_number: number
          id: number
          is_no_show: boolean
          match_id: number
          my_selection: number
          my_submitted_at: string
          opponent_submitted: boolean
          resolution_notes: string
          resolved_at: string
          resolved_by: number
          status: Database["public"]["Enums"]["match_game_status"]
          winner_alt_id: number
        }[]
      }
      get_my_user_pii: {
        Args: never
        Returns: {
          birth_date: string
          first_name: string
          last_name: string
        }[]
      }
      get_org_id_from_group_role: {
        Args: { p_group_role_id: number }
        Returns: number
      }
      get_organization_counts: { Args: never; Returns: Json }
      get_organization_tournament_counts: {
        Args: { org_ids: number[] }
        Returns: {
          active_count: number
          organization_id: number
          total_count: number
        }[]
      }
      get_player_ratings_with_rank: {
        Args: { p_alt_ids: number[]; p_format?: string }
        Returns: {
          alt_id: number
          format: string
          games_played: number
          global_rank: number
          peak_rating: number
          rating: number
          skill_bracket: string
        }[]
      }
      get_registration_counts: {
        Args: { tournament_ids: number[] }
        Returns: {
          registration_count: number
          tournament_id: number
        }[]
      }
      get_role_name_from_group_role: {
        Args: { p_group_role_id: number }
        Returns: string
      }
      get_species_move_combos: {
        Args: {
          p_end?: string
          p_format: string
          p_limit?: number
          p_min_players?: number
          p_source?: string
          p_species: string
          p_start?: string
        }
        Returns: {
          combo_pct: number
          moves: string[]
          players: number
          rank: number
        }[]
      }
      get_species_teammates: {
        Args: {
          p_end?: string
          p_format: string
          p_min_players?: number
          p_source?: string
          p_species: string
          p_start?: string
          p_top_n?: number
        }
        Returns: {
          focal_players: number
          matrix: Json
          pair_count: number
          pair_pct: number
          teammate: string
          teammate_rank: number
        }[]
      }
      get_species_usage: {
        Args: {
          p_format: string
          p_min_players?: number
          p_period_type?: string
          p_source?: string
        }
        Returns: {
          rank: number
          species: string
          usage_change_7d: number
          usage_pct: number
        }[]
      }
      get_species_usage_detail: {
        Args: {
          p_format: string
          p_limit?: number
          p_min_players?: number
          p_period_type?: string
          p_source?: string
          p_species: string
        }
        Returns: {
          abilities: Json
          ability_items: Json
          items: Json
          moves: Json
          natures: Json
          period_end: string
          period_start: string
          rank: number
          sample_size: number
          tera_types: Json
          usage_change_30d: number
          usage_change_7d: number
          usage_pct: number
        }[]
      }
      get_top_returning_players: {
        Args: { p_community_id: number; p_limit?: number }
        Returns: {
          avatar_url: string
          event_count: number
          user_id: string
          username: string
        }[]
      }
      get_tournament_counts_by_status: {
        Args: never
        Returns: {
          count: number
          status: string
        }[]
      }
      get_usage_by_source: {
        Args: {
          p_end?: string
          p_format: string
          p_min_players?: number
          p_start?: string
        }
        Returns: {
          players: number
          source: string
          species: string
          usage_pct: number
        }[]
      }
      get_usage_conversion: {
        Args: {
          p_end?: string
          p_format: string
          p_min_players?: number
          p_source?: string
          p_start?: string
          p_top_percentile?: number
        }
        Returns: {
          conversion_pct: number
          players: number
          ranked_players: number
          species: string
          top_field: number
          top_players: number
          top_share_pct: number
          usage_pct: number
        }[]
      }
      get_usage_pipeline: {
        Args: {
          p_end?: string
          p_format: string
          p_min_players?: number
          p_source?: string
          p_start?: string
        }
        Returns: {
          abilities: Json
          ability_items: Json
          items: Json
          moves: Json
          natures: Json
          period_end: string
          period_start: string
          players: number
          rank: number
          species: string
          tera_types: Json
          usage_pct: number
        }[]
      }
      get_usage_timeseries: {
        Args: {
          p_end?: string
          p_format: string
          p_min_players?: number
          p_period_type?: string
          p_source?: string
          p_start?: string
        }
        Returns: {
          period_end: string
          period_start: string
          players: number
          species: string
          total_players: number
          usage_pct: number
        }[]
      }
      get_user_growth_stats: {
        Args: { lookback_days?: number }
        Returns: {
          count: number
          date: string
        }[]
      }
      get_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_users_pii: {
        Args: { p_user_ids: string[] }
        Returns: {
          first_name: string
          last_name: string
          user_id: string
        }[]
      }
      has_community_permission: {
        Args: { p_community_id: number; permission_key: string }
        Returns: boolean
      }
      has_org_permission: {
        Args: { org_id: number; permission_key: string }
        Returns: boolean
      }
      is_community_owner: {
        Args: { p_community_id: number; p_user_id: string }
        Returns: boolean
      }
      is_impersonating: { Args: never; Returns: boolean }
      is_org_owner: {
        Args: { p_org_id: number; p_user_id: string }
        Returns: boolean
      }
      is_site_admin: { Args: never; Returns: boolean }
      is_sudo_active: { Args: never; Returns: boolean }
      recalculate_tournament_elo: {
        Args: { p_tournament_id: number }
        Returns: undefined
      }
      register_for_tournament_atomic: {
        Args: {
          p_alt_id?: number
          p_display_name_option?: string
          p_in_game_name?: string
          p_show_country_flag?: boolean
          p_team_name?: string
          p_tournament_id: number
        }
        Returns: Json
      }
      remove_pokemon_from_team: {
        Args: { p_pokemon_id: number; p_team_id: number }
        Returns: undefined
      }
      reorder_team_pokemon: {
        Args: { p_positions: Json; p_team_id: number }
        Returns: undefined
      }
      reorder_teams: { Args: { p_orders: Json }; Returns: undefined }
      report_match_result: {
        Args: {
          p_match_id: number
          p_score1: number
          p_score2: number
          p_winner_id: number
        }
        Returns: undefined
      }
      request_judge: { Args: { p_match_id: number }; Returns: undefined }
      reset_match: { Args: { p_match_id: number }; Returns: undefined }
      send_tournament_invitations_atomic: {
        Args: {
          p_invited_alt_ids: number[]
          p_invited_by_alt_id: number
          p_message?: string
          p_tournament_id: number
        }
        Returns: Json
      }
      should_send_notification: {
        Args: { p_notification_type: string; p_user_id: string }
        Returns: boolean
      }
      skill_bracket_for_rating: { Args: { p_rating: number }; Returns: string }
      start_match: { Args: { p_match_id: number }; Returns: undefined }
      start_round: {
        Args: { p_best_of_override?: number; p_round_id: number }
        Returns: Json
      }
      submit_game_selection: {
        Args: { p_game_id: number; p_selected_winner_alt_id: number }
        Returns: Json
      }
      update_my_user_pii: {
        Args: {
          p_birth_date?: string
          p_clear_birth_date?: boolean
          p_first_name?: string
          p_last_name?: string
        }
        Returns: {
          birth_date: string
          first_name: string
          last_name: string
        }[]
      }
      user_has_community_role: {
        Args: { p_community_id: number; p_role_name: string; p_user_id: string }
        Returns: boolean
      }
      user_has_org_role: {
        Args: { p_org_id: number; p_role_name: string; p_user_id: string }
        Returns: boolean
      }
      vault_create_secret: {
        Args: {
          secret_description?: string
          secret_name: string
          secret_value: string
        }
        Returns: string
      }
      vault_read_secret: { Args: { secret_name: string }; Returns: string }
    }
    Enums: {
      announcement_type: "info" | "warning" | "error" | "success"
      audit_action:
        | "match.score_submitted"
        | "match.score_agreed"
        | "match.score_disputed"
        | "match.result_reported"
        | "match.staff_requested"
        | "match.staff_resolved"
        | "judge.game_reset"
        | "judge.match_reset"
        | "judge.game_override"
        | "judge.match_override"
        | "tournament.started"
        | "tournament.round_created"
        | "tournament.round_started"
        | "tournament.round_completed"
        | "tournament.phase_advanced"
        | "tournament.completed"
        | "team.submitted"
        | "team.locked"
        | "team.unlocked"
        | "registration.checked_in"
        | "registration.dropped"
        | "registration.late_checkin"
        | "admin.sudo_activated"
        | "admin.sudo_deactivated"
        | "admin.user_suspended"
        | "admin.user_unsuspended"
        | "admin.role_granted"
        | "admin.role_revoked"
        | "admin.impersonation_started"
        | "admin.impersonation_ended"
        | "admin.org_approved"
        | "admin.org_rejected"
        | "admin.org_suspended"
        | "admin.org_unsuspended"
        | "admin.org_ownership_transferred"
        | "admin.flag_created"
        | "admin.flag_toggled"
        | "admin.flag_deleted"
        | "admin.announcement_created"
        | "admin.announcement_updated"
        | "admin.announcement_deleted"
        | "admin.org_request_approved"
        | "admin.org_request_rejected"
        | "admin.org_request_cancelled"
        | "admin.coach_granted"
        | "admin.coach_revoked"
      billing_interval: "monthly" | "annual"
      community_request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
      community_status: "pending" | "active" | "rejected" | "suspended"
      community_subscription_tier: "free" | "community_plus" | "enterprise"
      community_tier: "partner"
      discord_dm_event_type:
        | "match_ready"
        | "match_starting_soon"
        | "match_result_to_confirm"
        | "match_disputed"
        | "team_sheet_needed"
        | "team_sheet_approved"
        | "team_sheet_rejected"
        | "you_dropped"
        | "top_cut_made"
        | "tournament_starting"
        | "tournament_cancelled"
        | "check_in_reminder"
      discord_role_type:
        | "member"
        | "participant"
        | "winner"
        | "staff"
        | "currently_playing"
        | "verified"
      drop_category: "no_show" | "conduct" | "disqualification" | "other"
      entity_type: "profile" | "community" | "alt"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      match_game_status:
        | "pending"
        | "awaiting_both"
        | "awaiting_one"
        | "agreed"
        | "disputed"
        | "resolved"
        | "cancelled"
      match_message_type: "player" | "system" | "judge"
      notification_type:
        | "match_ready"
        | "match_result"
        | "match_disputed"
        | "judge_call"
        | "judge_resolved"
        | "tournament_start"
        | "tournament_round"
        | "tournament_complete"
        | "match_no_show"
        | "org_request_approved"
        | "org_request_rejected"
      pds_account_status:
        | "pending"
        | "active"
        | "failed"
        | "suspended"
        | "external"
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
      role_scope: "site" | "community"
      sprite_preference: "gen5" | "gen5ani" | "ani"
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
  rk9: {
    Tables: {
      events: {
        Row: {
          date_end: string | null
          date_start: string
          event_id: string
          format_id: string | null
          has_team_lists: boolean
          import_attempts: number
          import_error: string | null
          import_requested_at: string | null
          import_status: Database["rk9"]["Enums"]["import_status"]
          imported_at: string
          location_city: string | null
          location_country: string | null
          name: string
          player_count: number | null
          teams_imported_count: number
          tier: Database["rk9"]["Enums"]["event_tier"]
          worker_claimed_at: string | null
        }
        Insert: {
          date_end?: string | null
          date_start: string
          event_id: string
          format_id?: string | null
          has_team_lists?: boolean
          import_attempts?: number
          import_error?: string | null
          import_requested_at?: string | null
          import_status?: Database["rk9"]["Enums"]["import_status"]
          imported_at?: string
          location_city?: string | null
          location_country?: string | null
          name: string
          player_count?: number | null
          teams_imported_count?: number
          tier: Database["rk9"]["Enums"]["event_tier"]
          worker_claimed_at?: string | null
        }
        Update: {
          date_end?: string | null
          date_start?: string
          event_id?: string
          format_id?: string | null
          has_team_lists?: boolean
          import_attempts?: number
          import_error?: string | null
          import_requested_at?: string | null
          import_status?: Database["rk9"]["Enums"]["import_status"]
          imported_at?: string
          location_city?: string | null
          location_country?: string | null
          name?: string
          player_count?: number | null
          teams_imported_count?: number
          tier?: Database["rk9"]["Enums"]["event_tier"]
          worker_claimed_at?: string | null
        }
        Relationships: []
      }
      match_results: {
        Row: {
          division: Database["rk9"]["Enums"]["division"]
          event_id: string
          id: number
          imported_at: string
          match_label: string | null
          phase_number: number
          player1_id: number | null
          player2_id: number | null
          round: number
          table_number: number | null
          winner_id: number | null
        }
        Insert: {
          division: Database["rk9"]["Enums"]["division"]
          event_id: string
          id?: never
          imported_at?: string
          match_label?: string | null
          phase_number: number
          player1_id?: number | null
          player2_id?: number | null
          round: number
          table_number?: number | null
          winner_id?: number | null
        }
        Update: {
          division?: Database["rk9"]["Enums"]["division"]
          event_id?: string
          id?: never
          imported_at?: string
          match_label?: string | null
          phase_number?: number
          player1_id?: number | null
          player2_id?: number | null
          round?: number
          table_number?: number | null
          winner_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_match_phase"
            columns: ["event_id", "division", "phase_number"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["event_id", "division", "phase_number"]
          },
          {
            foreignKeyName: "match_results_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      phases: {
        Row: {
          division: Database["rk9"]["Enums"]["division"]
          event_id: string
          phase_number: number
          rounds: number | null
          type: Database["rk9"]["Enums"]["phase_type"]
        }
        Insert: {
          division: Database["rk9"]["Enums"]["division"]
          event_id: string
          phase_number: number
          rounds?: number | null
          type: Database["rk9"]["Enums"]["phase_type"]
        }
        Update: {
          division?: Database["rk9"]["Enums"]["division"]
          event_id?: string
          phase_number?: number
          rounds?: number | null
          type?: Database["rk9"]["Enums"]["phase_type"]
        }
        Relationships: [
          {
            foreignKeyName: "phases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["event_id"]
          },
        ]
      }
      players: {
        Row: {
          country: string | null
          created_at: string
          first_name: string
          id: number
          last_name: string
          player_id_masked: string
          trainer_names: string[]
        }
        Insert: {
          country?: string | null
          created_at?: string
          first_name: string
          id?: never
          last_name: string
          player_id_masked?: string
          trainer_names?: string[]
        }
        Update: {
          country?: string | null
          created_at?: string
          first_name?: string
          id?: never
          last_name?: string
          player_id_masked?: string
          trainer_names?: string[]
        }
        Relationships: []
      }
      species_map: {
        Row: {
          created_at: string
          raw_name: string
          species_slug: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          raw_name: string
          species_slug: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          raw_name?: string
          species_slug?: string
          verified?: boolean
        }
        Relationships: []
      }
      standings: {
        Row: {
          division: Database["rk9"]["Enums"]["division"]
          drop_round: number | null
          event_id: string
          id: number
          import_flag: string | null
          placement: number | null
          player_id: number | null
          roster_entry_id: string | null
          team_scrape_attempted_at: string | null
          trainer_name: string | null
        }
        Insert: {
          division: Database["rk9"]["Enums"]["division"]
          drop_round?: number | null
          event_id: string
          id?: never
          import_flag?: string | null
          placement?: number | null
          player_id?: number | null
          roster_entry_id?: string | null
          team_scrape_attempted_at?: string | null
          trainer_name?: string | null
        }
        Update: {
          division?: Database["rk9"]["Enums"]["division"]
          drop_round?: number | null
          event_id?: string
          id?: never
          import_flag?: string | null
          placement?: number | null
          player_id?: number | null
          roster_entry_id?: string | null
          team_scrape_attempted_at?: string | null
          trainer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "standings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      team_pokemon: {
        Row: {
          ability: string | null
          held_item: string | null
          id: number
          is_legal: boolean
          legality_reason: string | null
          moves: string[] | null
          position: number
          species: string
          species_raw: string
          standing_id: number
          stat_alignment: string | null
          tera_type: string | null
        }
        Insert: {
          ability?: string | null
          held_item?: string | null
          id?: never
          is_legal?: boolean
          legality_reason?: string | null
          moves?: string[] | null
          position: number
          species: string
          species_raw: string
          standing_id: number
          stat_alignment?: string | null
          tera_type?: string | null
        }
        Update: {
          ability?: string | null
          held_item?: string | null
          id?: never
          is_legal?: boolean
          legality_reason?: string | null
          moves?: string[] | null
          position?: number
          species?: string
          species_raw?: string
          standing_id?: number
          stat_alignment?: string | null
          tera_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_pokemon_standing_id_fkey"
            columns: ["standing_id"]
            isOneToOne: false
            referencedRelation: "standings"
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
      division: "masters" | "senior" | "junior"
      event_tier: "regional" | "international" | "special" | "worlds"
      import_status:
        | "pending"
        | "roster"
        | "teams"
        | "pairings"
        | "complete"
        | "failed"
        | "queued"
      phase_type: "swiss" | "single_elimination"
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
  graphql_public: {
    Enums: {},
  },
  limitless: {
    Enums: {},
  },
  private: {
    Enums: {},
  },
  public: {
    Enums: {
      announcement_type: ["info", "warning", "error", "success"],
      audit_action: [
        "match.score_submitted",
        "match.score_agreed",
        "match.score_disputed",
        "match.result_reported",
        "match.staff_requested",
        "match.staff_resolved",
        "judge.game_reset",
        "judge.match_reset",
        "judge.game_override",
        "judge.match_override",
        "tournament.started",
        "tournament.round_created",
        "tournament.round_started",
        "tournament.round_completed",
        "tournament.phase_advanced",
        "tournament.completed",
        "team.submitted",
        "team.locked",
        "team.unlocked",
        "registration.checked_in",
        "registration.dropped",
        "registration.late_checkin",
        "admin.sudo_activated",
        "admin.sudo_deactivated",
        "admin.user_suspended",
        "admin.user_unsuspended",
        "admin.role_granted",
        "admin.role_revoked",
        "admin.impersonation_started",
        "admin.impersonation_ended",
        "admin.org_approved",
        "admin.org_rejected",
        "admin.org_suspended",
        "admin.org_unsuspended",
        "admin.org_ownership_transferred",
        "admin.flag_created",
        "admin.flag_toggled",
        "admin.flag_deleted",
        "admin.announcement_created",
        "admin.announcement_updated",
        "admin.announcement_deleted",
        "admin.org_request_approved",
        "admin.org_request_rejected",
        "admin.org_request_cancelled",
        "admin.coach_granted",
        "admin.coach_revoked",
      ],
      billing_interval: ["monthly", "annual"],
      community_request_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ],
      community_status: ["pending", "active", "rejected", "suspended"],
      community_subscription_tier: ["free", "community_plus", "enterprise"],
      community_tier: ["partner"],
      discord_dm_event_type: [
        "match_ready",
        "match_starting_soon",
        "match_result_to_confirm",
        "match_disputed",
        "team_sheet_needed",
        "team_sheet_approved",
        "team_sheet_rejected",
        "you_dropped",
        "top_cut_made",
        "tournament_starting",
        "tournament_cancelled",
        "check_in_reminder",
      ],
      discord_role_type: [
        "member",
        "participant",
        "winner",
        "staff",
        "currently_playing",
        "verified",
      ],
      drop_category: ["no_show", "conduct", "disqualification", "other"],
      entity_type: ["profile", "community", "alt"],
      invitation_status: ["pending", "accepted", "declined", "expired"],
      match_game_status: [
        "pending",
        "awaiting_both",
        "awaiting_one",
        "agreed",
        "disputed",
        "resolved",
        "cancelled",
      ],
      match_message_type: ["player", "system", "judge"],
      notification_type: [
        "match_ready",
        "match_result",
        "match_disputed",
        "judge_call",
        "judge_resolved",
        "tournament_start",
        "tournament_round",
        "tournament_complete",
        "match_no_show",
        "org_request_approved",
        "org_request_rejected",
      ],
      pds_account_status: [
        "pending",
        "active",
        "failed",
        "suspended",
        "external",
      ],
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
      role_scope: ["site", "community"],
      sprite_preference: ["gen5", "gen5ani", "ani"],
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
  rk9: {
    Enums: {
      division: ["masters", "senior", "junior"],
      event_tier: ["regional", "international", "special", "worlds"],
      import_status: [
        "pending",
        "roster",
        "teams",
        "pairings",
        "complete",
        "failed",
        "queued",
      ],
      phase_type: ["swiss", "single_elimination"],
    },
  },
} as const

