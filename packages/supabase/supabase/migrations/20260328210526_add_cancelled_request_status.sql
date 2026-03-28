-- Add 'cancelled' to community_request_status enum for auto-cancelled duplicate requests.
-- This prevents auto-cancelled duplicates from triggering the rejection cooldown UX.
ALTER TYPE public.community_request_status ADD VALUE IF NOT EXISTS 'cancelled';
