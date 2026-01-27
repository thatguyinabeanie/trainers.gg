/**
 * AT Protocol Database Types Extension
 *
 * These types extend the auto-generated Supabase types with
 * AT Protocol tables that may not yet be in the generated types.
 *
 * Once `pnpm generate-types` is run after the migration is applied,
 * these types will be included in the main types.ts file automatically.
 */

import type { Database as BaseDatabase, Json } from "./types";

/**
 * PDS Account Status enum
 * Represents the status of a user's PDS account
 */
export type PdsAccountStatus =
  | "pending"
  | "active"
  | "failed"
  | "suspended"
  | "external";

/**
 * Extended Users Table with AT Protocol fields
 * Adds did, pds_handle, and pds_status fields to the base users table
 */
export interface UsersTableWithAtproto {
  Row: BaseDatabase["public"]["Tables"]["users"]["Row"] & {
    did: string | null;
    pds_handle: string | null;
    pds_status: PdsAccountStatus | null;
  };
  Insert: BaseDatabase["public"]["Tables"]["users"]["Insert"] & {
    did?: string | null;
    pds_handle?: string | null;
    pds_status?: PdsAccountStatus | null;
  };
  Update: BaseDatabase["public"]["Tables"]["users"]["Update"] & {
    did?: string | null;
    pds_handle?: string | null;
    pds_status?: PdsAccountStatus | null;
  };
  Relationships: BaseDatabase["public"]["Tables"]["users"]["Relationships"];
}

/**
 * AT Protocol Sessions Table
 * Stores OAuth session data for AT Protocol authenticated users
 */
export interface AtprotoSessionsTable {
  Row: {
    id: string;
    did: string;
    user_id: string | null;
    session_data: Json;
    handle: string | null;
    pds_url: string | null;
    created_at: string;
    updated_at: string;
    expires_at: string | null;
  };
  Insert: {
    id?: string;
    did: string;
    user_id?: string | null;
    session_data: Json;
    handle?: string | null;
    pds_url?: string | null;
    created_at?: string;
    updated_at?: string;
    expires_at?: string | null;
  };
  Update: {
    id?: string;
    did?: string;
    user_id?: string | null;
    session_data?: Json;
    handle?: string | null;
    pds_url?: string | null;
    created_at?: string;
    updated_at?: string;
    expires_at?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: "atproto_sessions_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "users";
      referencedColumns: ["id"];
    },
  ];
}

/**
 * AT Protocol OAuth State Table
 * Temporary storage for OAuth state during authorization flow
 */
export interface AtprotoOauthStateTable {
  Row: {
    id: string;
    state_key: string;
    state_data: Json;
    created_at: string;
    expires_at: string;
  };
  Insert: {
    id?: string;
    state_key: string;
    state_data: Json;
    created_at?: string;
    expires_at?: string;
  };
  Update: {
    id?: string;
    state_key?: string;
    state_data?: Json;
    created_at?: string;
    expires_at?: string;
  };
  Relationships: [];
}

/**
 * Linked AT Protocol Accounts Table
 * For users who want to link multiple AT Protocol accounts
 */
export interface LinkedAtprotoAccountsTable {
  Row: {
    id: string;
    user_id: string;
    did: string;
    handle: string | null;
    pds_url: string | null;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    did: string;
    handle?: string | null;
    pds_url?: string | null;
    is_primary?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    did?: string;
    handle?: string | null;
    pds_url?: string | null;
    is_primary?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "linked_atproto_accounts_user_id_fkey";
      columns: ["user_id"];
      isOneToOne: false;
      referencedRelation: "users";
      referencedColumns: ["id"];
    },
  ];
}

/**
 * Extended Database type that includes AT Protocol tables
 */
export interface DatabaseWithAtproto extends BaseDatabase {
  public: BaseDatabase["public"] & {
    Tables: Omit<BaseDatabase["public"]["Tables"], "users"> & {
      users: UsersTableWithAtproto;
      atproto_sessions: AtprotoSessionsTable;
      atproto_oauth_state: AtprotoOauthStateTable;
      linked_atproto_accounts: LinkedAtprotoAccountsTable;
    };
    Enums: BaseDatabase["public"]["Enums"] & {
      pds_account_status: PdsAccountStatus;
    };
  };
}

/**
 * Type alias for convenience
 */
export type AtprotoDatabase = DatabaseWithAtproto;
