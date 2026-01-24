-- =============================================================================
-- AT Protocol OAuth Sessions
-- =============================================================================
-- Stores OAuth session data for AT Protocol authenticated users.
-- This enables users to log in with their Bluesky/AT Protocol accounts.

-- -----------------------------------------------------------------------------
-- atproto_sessions table
-- Stores AT Protocol OAuth session tokens per DID
-- -----------------------------------------------------------------------------
CREATE TABLE atproto_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The DID this session belongs to
  did text NOT NULL,
  -- The user this session is linked to (nullable for new users)
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  -- OAuth session data (tokens, etc.) - encrypted at rest
  session_data jsonb NOT NULL,
  -- Handle at time of login (may change)
  handle text,
  -- PDS URL for this account
  pds_url text,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  -- Ensure one session per DID
  CONSTRAINT atproto_sessions_did_unique UNIQUE (did)
);

-- Index for fast DID lookups
CREATE INDEX idx_atproto_sessions_did ON atproto_sessions(did);

-- Index for user lookups
CREATE INDEX idx_atproto_sessions_user_id ON atproto_sessions(user_id);

-- -----------------------------------------------------------------------------
-- atproto_oauth_state table
-- Temporary storage for OAuth state during authorization flow
-- -----------------------------------------------------------------------------
CREATE TABLE atproto_oauth_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- State key (random string used in OAuth flow)
  state_key text NOT NULL UNIQUE,
  -- State data (PKCE verifier, return URL, etc.)
  state_data jsonb NOT NULL,
  -- Short TTL - states should be used within minutes
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Index for state lookups
CREATE INDEX idx_atproto_oauth_state_key ON atproto_oauth_state(state_key);

-- Auto-cleanup expired states (will be handled by cron or on-access)
CREATE INDEX idx_atproto_oauth_state_expires ON atproto_oauth_state(expires_at);

-- -----------------------------------------------------------------------------
-- linked_atproto_accounts table
-- For users who want to link multiple AT Protocol accounts
-- (e.g., both @user.trainers.gg and @user.bsky.social)
-- -----------------------------------------------------------------------------
CREATE TABLE linked_atproto_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The user this account is linked to
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The AT Protocol DID
  did text NOT NULL,
  -- Handle at time of linking
  handle text,
  -- PDS URL for this account
  pds_url text,
  -- Whether this is the user's primary AT Protocol identity
  is_primary boolean NOT NULL DEFAULT false,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Each DID can only be linked to one user
  CONSTRAINT linked_atproto_accounts_did_unique UNIQUE (did),
  -- Each user can only have one primary account
  CONSTRAINT linked_atproto_accounts_one_primary UNIQUE (user_id, is_primary) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Index for DID lookups
CREATE INDEX idx_linked_atproto_did ON linked_atproto_accounts(did);

-- Index for user lookups
CREATE INDEX idx_linked_atproto_user_id ON linked_atproto_accounts(user_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

-- atproto_sessions: Only the system can manage sessions
ALTER TABLE atproto_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON atproto_sessions FOR SELECT
USING (user_id = auth.uid());

-- Only service role can insert/update/delete sessions
-- (handled via edge functions with service role key)

-- atproto_oauth_state: No user access (system only)
ALTER TABLE atproto_oauth_state ENABLE ROW LEVEL SECURITY;
-- No policies = only service role can access

-- linked_atproto_accounts: Users can manage their own
ALTER TABLE linked_atproto_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own linked accounts"
ON linked_atproto_accounts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can link accounts to themselves"
ON linked_atproto_accounts FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own linked accounts"
ON linked_atproto_accounts FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can unlink own accounts"
ON linked_atproto_accounts FOR DELETE
USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- Update updated_at on atproto_sessions
CREATE TRIGGER update_atproto_sessions_updated_at
  BEFORE UPDATE ON atproto_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at on linked_atproto_accounts
CREATE TRIGGER update_linked_atproto_accounts_updated_at
  BEFORE UPDATE ON linked_atproto_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Comments
-- -----------------------------------------------------------------------------
COMMENT ON TABLE atproto_sessions IS 'OAuth session data for AT Protocol authenticated users';
COMMENT ON TABLE atproto_oauth_state IS 'Temporary storage for OAuth state during authorization flow';
COMMENT ON TABLE linked_atproto_accounts IS 'AT Protocol accounts linked to trainers.gg users';
