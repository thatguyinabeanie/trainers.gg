-- Migration: Make tournament slugs globally unique
-- This enables /tournaments/{slug} URLs without needing org context

-- First, update any duplicate slugs by appending org slug
-- This handles existing data before adding the unique constraint
UPDATE public.tournaments t
SET slug = t.slug || '-' || o.slug
FROM public.organizations o
WHERE t.organization_id = o.id
AND t.slug IN (
    SELECT slug
    FROM public.tournaments
    GROUP BY slug
    HAVING COUNT(*) > 1
);

-- Drop the old composite unique constraint (org_id + slug)
ALTER TABLE public.tournaments
DROP CONSTRAINT IF EXISTS tournaments_organization_id_slug_key;

-- Add new global unique constraint on slug alone
ALTER TABLE public.tournaments
ADD CONSTRAINT tournaments_slug_key UNIQUE (slug);

-- Add comment explaining the change
COMMENT ON CONSTRAINT tournaments_slug_key ON public.tournaments IS 
'Tournament slugs must be globally unique to support /tournaments/{slug} URLs';
