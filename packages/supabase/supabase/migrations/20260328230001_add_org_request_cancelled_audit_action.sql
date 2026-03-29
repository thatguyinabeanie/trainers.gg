-- Add missing audit_action enum value.
-- admin.org_request_cancelled was referenced in application code but never
-- added to the database enum.
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.org_request_cancelled';
