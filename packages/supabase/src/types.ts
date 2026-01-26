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
  public: {
    Tables: {
      alts: {
        Row: {
          avatar_url: string | null
          battle_tag: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          id: number
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
          id?: never
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
          id?: never
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
            referencedRelation: "users"
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
          created_at: string | null
          description: string | null
          id: number
          name: string
          organization_id: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: never
          name: string
          organization_id: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: never
          name?: string
          organization_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_with_owner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: number
          invited_by_user_id: string
          invited_user_id: string
          organization_id: number
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"] | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: never
          invited_by_user_id: string
          invited_user_id: string
          organization_id: number
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: never
          invited_by_user_id?: string
          invited_user_id?: string
          organization_id?: number
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_with_owner"
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
      organization_requests: {
        Row: {
          created_at: string | null
          created_organization_id: number | null
          description: string | null
          id: number
          name: string
          rejection_reason: string | null
          requested_by_alt_id: number
          reviewed_at: string | null
          reviewed_by_alt_id: number | null
          slug: string
          status: Database["public"]["Enums"]["org_request_status"] | null
        }
        Insert: {
          created_at?: string | null
          created_organization_id?: number | null
          description?: string | null
          id?: never
          name: string
          rejection_reason?: string | null
          requested_by_alt_id: number
          reviewed_at?: string | null
          reviewed_by_alt_id?: number | null
          slug: string
          status?: Database["public"]["Enums"]["org_request_status"] | null
        }
        Update: {
          created_at?: string | null
          created_organization_id?: number | null
          description?: string | null
          id?: never
          name?: string
          rejection_reason?: string | null
          requested_by_alt_id?: number
          reviewed_at?: string | null
          reviewed_by_alt_id?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["org_request_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_requests_created_organization_id_fkey"
            columns: ["created_organization_id"]
            isOneToOne: false
            referencedRelation: "organization_with_owner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_requests_created_organization_id_fkey"
            columns: ["created_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_requests_requested_by_alt_id_fkey"
            columns: ["requested_by_alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_requests_reviewed_by_alt_id_fkey"
            columns: ["reviewed_by_alt_id"]
            isOneToOne: false
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_staff: {
        Row: {
          created_at: string | null
          id: number
          organization_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          organization_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: never
          organization_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_with_owner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          id: number
          logo_url: string | null
          name: string
          owner_user_id: string
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
          id?: never
          logo_url?: string | null
          name: string
          owner_user_id: string
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
          id?: never
          logo_url?: string | null
          name?: string
          owner_user_id?: string
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
            foreignKeyName: "organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          species?: string
          tera_type?: string | null
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: number
          post_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          post_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: never
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          id: number
          is_deleted: boolean | null
          is_pinned: boolean | null
          likes_count: number | null
          quote_content: string | null
          replies_count: number | null
          reply_to_id: number | null
          repost_of_id: number | null
          reposts_count: number | null
          updated_at: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: never
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          quote_content?: string | null
          replies_count?: number | null
          reply_to_id?: number | null
          repost_of_id?: number | null
          reposts_count?: number | null
          updated_at?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: never
          is_deleted?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          quote_content?: string | null
          replies_count?: number | null
          reply_to_id?: number | null
          repost_of_id?: number | null
          reposts_count?: number | null
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_repost_of_id_fkey"
            columns: ["repost_of_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
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
      teams: {
        Row: {
          created_at: string | null
          created_by: number
          description: string | null
          format_legal: boolean | null
          id: number
          is_public: boolean | null
          name: string
          notes: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: number
          description?: string | null
          format_legal?: boolean | null
          id?: never
          is_public?: boolean | null
          name: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: number
          description?: string | null
          format_legal?: boolean | null
          id?: never
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
            referencedRelation: "alts"
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
          alt1_id: number | null
          alt2_id: number | null
          created_at: string | null
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
          alt1_id?: number | null
          alt2_id?: number | null
          created_at?: string | null
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
          alt1_id?: number | null
          alt2_id?: number | null
          created_at?: string | null
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
          advancement_count: number | null
          advancement_type: string | null
          bracket_format: string | null
          bracket_size: number | null
          completed_at: string | null
          created_at: string | null
          current_round: number | null
          id: number
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
          tournament_id: number
        }
        Insert: {
          advancement_count?: number | null
          advancement_type?: string | null
          bracket_format?: string | null
          bracket_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_round?: number | null
          id?: never
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
          tournament_id: number
        }
        Update: {
          advancement_count?: number | null
          advancement_type?: string | null
          bracket_format?: string | null
          bracket_size?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_round?: number | null
          id?: never
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
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          alt_id: number
          checked_in_at: string | null
          created_at: string | null
          id: number
          notes: string | null
          registered_at: string | null
          rental_team_photo_key: string | null
          rental_team_photo_uploaded_at: string | null
          rental_team_photo_url: string | null
          rental_team_photo_verified: boolean | null
          rental_team_photo_verified_at: string | null
          rental_team_photo_verified_by: number | null
          status: Database["public"]["Enums"]["registration_status"] | null
          team_id: number | null
          team_name: string | null
          tournament_id: number
        }
        Insert: {
          alt_id: number
          checked_in_at?: string | null
          created_at?: string | null
          id?: never
          notes?: string | null
          registered_at?: string | null
          rental_team_photo_key?: string | null
          rental_team_photo_uploaded_at?: string | null
          rental_team_photo_url?: string | null
          rental_team_photo_verified?: boolean | null
          rental_team_photo_verified_at?: string | null
          rental_team_photo_verified_by?: number | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          team_id?: number | null
          team_name?: string | null
          tournament_id: number
        }
        Update: {
          alt_id?: number
          checked_in_at?: string | null
          created_at?: string | null
          id?: never
          notes?: string | null
          registered_at?: string | null
          rental_team_photo_key?: string | null
          rental_team_photo_uploaded_at?: string | null
          rental_team_photo_url?: string | null
          rental_team_photo_verified?: boolean | null
          rental_team_photo_verified_at?: string | null
          rental_team_photo_verified_by?: number | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          team_id?: number | null
          team_name?: string | null
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
            foreignKeyName: "tournament_registrations_rental_team_photo_verified_by_fkey"
            columns: ["rental_team_photo_verified_by"]
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
          created_at: string | null
          created_by: number
          description: string | null
          id: number
          is_official: boolean | null
          is_public: boolean | null
          name: string
          organization_id: number | null
          tags: string[] | null
          template_config: Json | null
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: number
          description?: string | null
          id?: never
          is_official?: boolean | null
          is_public?: boolean | null
          name: string
          organization_id?: number | null
          tags?: string[] | null
          template_config?: Json | null
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: number
          description?: string | null
          id?: never
          is_official?: boolean | null
          is_public?: boolean | null
          name?: string
          organization_id?: number | null
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
            referencedRelation: "alts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_with_owner"
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
          archived_by: number | null
          check_in_window_minutes: number | null
          created_at: string | null
          current_phase_id: number | null
          current_round: number | null
          description: string | null
          end_date: string | null
          featured: boolean | null
          format: string | null
          id: number
          max_participants: number | null
          name: string
          organization_id: number
          participants: number[] | null
          prize_pool: string | null
          registration_deadline: string | null
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
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: number | null
          check_in_window_minutes?: number | null
          created_at?: string | null
          current_phase_id?: number | null
          current_round?: number | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          format?: string | null
          id?: never
          max_participants?: number | null
          name: string
          organization_id: number
          participants?: number[] | null
          prize_pool?: string | null
          registration_deadline?: string | null
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
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: number | null
          check_in_window_minutes?: number | null
          created_at?: string | null
          current_phase_id?: number | null
          current_round?: number | null
          description?: string | null
          end_date?: string | null
          featured?: boolean | null
          format?: string | null
          id?: never
          max_participants?: number | null
          name?: string
          organization_id?: number
          participants?: number[] | null
          prize_pool?: string | null
          registration_deadline?: string | null
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
            referencedRelation: "organization_with_owner"
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          bio: string | null
          birth_date: string | null
          country: string | null
          created_at: string | null
          did: string | null
          email: string | null
          external_accounts: Json | null
          first_name: string | null
          id: string
          image: string | null
          is_locked: boolean | null
          last_active_at: string | null
          last_name: string | null
          last_sign_in_at: string | null
          main_alt_id: number | null
          name: string | null
          pds_handle: string | null
          pds_status: Database["public"]["Enums"]["pds_account_status"] | null
          phone_number: string | null
          public_metadata: Json | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          birth_date?: string | null
          country?: string | null
          created_at?: string | null
          did?: string | null
          email?: string | null
          external_accounts?: Json | null
          first_name?: string | null
          id: string
          image?: string | null
          is_locked?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          last_sign_in_at?: string | null
          main_alt_id?: number | null
          name?: string | null
          pds_handle?: string | null
          pds_status?: Database["public"]["Enums"]["pds_account_status"] | null
          phone_number?: string | null
          public_metadata?: Json | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          birth_date?: string | null
          country?: string | null
          created_at?: string | null
          did?: string | null
          email?: string | null
          external_accounts?: Json | null
          first_name?: string | null
          id?: string
          image?: string | null
          is_locked?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          last_sign_in_at?: string | null
          main_alt_id?: number | null
          name?: string | null
          pds_handle?: string | null
          pds_status?: Database["public"]["Enums"]["pds_account_status"] | null
          phone_number?: string | null
          public_metadata?: Json | null
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
      organization_with_owner: {
        Row: {
          created_at: string | null
          description: string | null
          discord_url: string | null
          icon: string | null
          id: number | null
          logo_url: string | null
          name: string | null
          owner_image: string | null
          owner_name: string | null
          owner_user_id: string | null
          owner_username: string | null
          platform_fee_percentage: number | null
          slug: string | null
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
        Relationships: [
          {
            foreignKeyName: "organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_current_alt_id: { Args: never; Returns: number }
      get_current_user_id: { Args: never; Returns: string }
      has_org_permission: {
        Args: { org_id: number; permission_key: string }
        Returns: boolean
      }
      is_site_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      billing_interval: "monthly" | "annual"
      entity_type: "profile" | "organization" | "alt"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      org_request_status: "pending" | "approved" | "rejected"
      organization_status: "pending" | "active" | "rejected"
      organization_subscription_tier:
        | "free"
        | "organization_plus"
        | "enterprise"
      organization_tier: "regular" | "verified" | "partner"
      pds_account_status: "pending" | "active" | "failed" | "suspended"
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
      role_scope: "site" | "organization"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      billing_interval: ["monthly", "annual"],
      entity_type: ["profile", "organization", "alt"],
      invitation_status: ["pending", "accepted", "declined", "expired"],
      org_request_status: ["pending", "approved", "rejected"],
      organization_status: ["pending", "active", "rejected"],
      organization_subscription_tier: [
        "free",
        "organization_plus",
        "enterprise",
      ],
      organization_tier: ["regular", "verified", "partner"],
      pds_account_status: ["pending", "active", "failed", "suspended"],
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
      role_scope: ["site", "organization"],
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

