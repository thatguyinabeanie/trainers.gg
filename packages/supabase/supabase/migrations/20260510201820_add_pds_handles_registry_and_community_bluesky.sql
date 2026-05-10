-- PDS Handles Registry & Community Bluesky Identity
-- Creates a shared handle registry for the PDS namespace (users + communities)
-- and adds Bluesky identity columns to the communities table.

-- =============================================================================
-- 1. Create pds_handles registry table
-- =============================================================================
-- Single source of truth for all handles on our PDS.
-- Prevents collisions between user handles and community handles.

CREATE TABLE IF NOT EXISTS public.pds_handles (
  handle text PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('user', 'community')),
  entity_id text NOT NULL,
  did text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for looking up handles by entity
CREATE INDEX IF NOT EXISTS idx_pds_handles_entity
  ON public.pds_handles (entity_type, entity_id);

-- Index for DID lookups
CREATE INDEX IF NOT EXISTS idx_pds_handles_did
  ON public.pds_handles (did) WHERE did IS NOT NULL;

-- Enable RLS
ALTER TABLE public.pds_handles ENABLE ROW LEVEL SECURITY;

-- Anyone can read handles (they're public identities)
CREATE POLICY "Anyone can read handles"
  ON public.pds_handles FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only service role can insert/update/delete (provisioning happens server-side)
-- No INSERT/UPDATE/DELETE policies for authenticated users — only service_role bypasses RLS

-- =============================================================================
-- 2. Add Bluesky identity columns to communities
-- =============================================================================

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS bluesky_did text,
  ADD COLUMN IF NOT EXISTS bluesky_handle text,
  ADD COLUMN IF NOT EXISTS pds_status pds_account_status DEFAULT 'pending'::pds_account_status;

-- Unique constraint on bluesky_did (one DID per community)
CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_bluesky_did
  ON public.communities (bluesky_did) WHERE bluesky_did IS NOT NULL;

-- Unique constraint on bluesky_handle
CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_bluesky_handle
  ON public.communities (bluesky_handle) WHERE bluesky_handle IS NOT NULL;

-- =============================================================================
-- 3. Backfill pds_handles with existing user handles
-- =============================================================================
-- Populate the registry with existing active user PDS handles

INSERT INTO public.pds_handles (handle, entity_type, entity_id, did, created_at)
SELECT
  u.pds_handle,
  'user',
  u.id::text,
  u.did,
  COALESCE(u.created_at, now())
FROM public.users u
WHERE u.pds_handle IS NOT NULL
  AND u.pds_status = 'active'
ON CONFLICT (handle) DO NOTHING;
