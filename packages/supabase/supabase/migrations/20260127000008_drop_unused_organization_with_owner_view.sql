-- Drop unused organization_with_owner view
-- This view is not used anywhere in the application code
-- and was only recreated during migration for backward compatibility

DROP VIEW IF EXISTS "public"."organization_with_owner";
