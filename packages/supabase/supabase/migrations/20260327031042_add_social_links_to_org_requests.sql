-- Add optional social_links JSONB column to organization_requests
-- Stores social profile links submitted with the request for admin review
ALTER TABLE public.organization_requests
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '[]'::jsonb;
