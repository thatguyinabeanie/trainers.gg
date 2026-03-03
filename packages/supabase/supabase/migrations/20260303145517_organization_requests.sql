-- Migrate organization_requests table from alt-based to user-based schema
-- and add missing columns/constraints for the new request flow.

-- Step 1: Add new columns
ALTER TABLE public.organization_requests
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Step 2: Populate user_id from alts table
UPDATE public.organization_requests r
SET user_id = a.user_id
FROM public.alts a
WHERE r.requested_by_alt_id = a.id
  AND r.user_id IS NULL;

-- Step 3: Populate reviewed_by from alts table
UPDATE public.organization_requests r
SET reviewed_by = a.user_id
FROM public.alts a
WHERE r.reviewed_by_alt_id = a.id
  AND r.reviewed_by IS NULL
  AND r.reviewed_by_alt_id IS NOT NULL;

-- Step 4: Copy rejection_reason to admin_notes
UPDATE public.organization_requests
SET admin_notes = rejection_reason
WHERE admin_notes IS NULL
  AND rejection_reason IS NOT NULL;

-- Step 5: Make user_id NOT NULL and add FK
ALTER TABLE public.organization_requests
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.organization_requests
  ADD CONSTRAINT organization_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.organization_requests
  ADD CONSTRAINT organization_requests_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 6: Drop old RLS policies that depend on old columns (must happen before column drops)
DROP POLICY IF EXISTS "Org requests viewable by requester or site admin" ON public.organization_requests;
DROP POLICY IF EXISTS "Users can create org requests" ON public.organization_requests;
DROP POLICY IF EXISTS "Site admins can update org requests" ON public.organization_requests;

-- Step 7: Drop old columns and constraints
ALTER TABLE public.organization_requests
  DROP CONSTRAINT IF EXISTS organization_requests_requested_by_alt_id_fkey;
ALTER TABLE public.organization_requests
  DROP CONSTRAINT IF EXISTS organization_requests_reviewed_by_alt_id_fkey;
ALTER TABLE public.organization_requests
  DROP CONSTRAINT IF EXISTS organization_requests_created_organization_id_fkey;

DROP INDEX IF EXISTS public.org_requests_created_organization_id_idx;
DROP INDEX IF EXISTS public.org_requests_requested_by_alt_id_idx;
DROP INDEX IF EXISTS public.org_requests_reviewed_by_alt_id_idx;

ALTER TABLE public.organization_requests
  DROP COLUMN IF EXISTS requested_by_alt_id,
  DROP COLUMN IF EXISTS reviewed_by_alt_id,
  DROP COLUMN IF EXISTS rejection_reason,
  DROP COLUMN IF EXISTS created_organization_id;

-- Step 8: Make status NOT NULL with default
ALTER TABLE public.organization_requests
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'pending';

-- Step 9: Add constraints
ALTER TABLE public.organization_requests
  ADD CONSTRAINT org_requests_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT org_requests_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  ADD CONSTRAINT org_requests_slug_length CHECK (char_length(slug) BETWEEN 1 AND 100),
  ADD CONSTRAINT org_requests_description_length CHECK (description IS NULL OR char_length(description) <= 500),
  ADD CONSTRAINT org_requests_admin_notes_length CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 1000);

-- Step 10: Indexes
CREATE INDEX IF NOT EXISTS org_requests_user_id_idx ON public.organization_requests (user_id);
CREATE INDEX IF NOT EXISTS org_requests_status_idx ON public.organization_requests (status);
CREATE INDEX IF NOT EXISTS org_requests_slug_idx ON public.organization_requests (slug) WHERE status = 'pending';

-- One pending request per user
CREATE UNIQUE INDEX IF NOT EXISTS org_requests_one_pending_per_user
  ON public.organization_requests (user_id) WHERE status = 'pending';

-- One pending request per slug
CREATE UNIQUE INDEX IF NOT EXISTS org_requests_one_pending_per_slug
  ON public.organization_requests (slug) WHERE status = 'pending';

-- Step 11: RLS policies (create new — old ones dropped in Step 6)
CREATE POLICY "Users can view own org requests"
  ON public.organization_requests FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create org requests"
  ON public.organization_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Site admins can view all org requests"
  ON public.organization_requests FOR SELECT TO authenticated
  USING (public.is_site_admin());

CREATE POLICY "Site admins can update org requests"
  ON public.organization_requests FOR UPDATE TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- Step 12: Notification types for org requests
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'org_request_approved';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'org_request_rejected';

-- Step 13: Audit actions for org requests
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.org_request_approved';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.org_request_rejected';

-- Step 14: Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_org_request_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_org_request_updated_at ON public.organization_requests;
CREATE TRIGGER update_org_request_updated_at
  BEFORE UPDATE ON public.organization_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_org_request_updated_at();
