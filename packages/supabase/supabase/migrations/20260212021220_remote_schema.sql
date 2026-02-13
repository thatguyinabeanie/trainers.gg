-- Fix FK constraint ON DELETE behavior to match production.
-- organization_requests: NO ACTION -> SET NULL
-- tournament_templates: SET NULL -> CASCADE

-- Drop existing constraints (idempotent)
ALTER TABLE IF EXISTS "public"."organization_requests"
  DROP CONSTRAINT IF EXISTS "organization_requests_created_organization_id_fkey";

ALTER TABLE IF EXISTS "public"."tournament_templates"
  DROP CONSTRAINT IF EXISTS "tournament_templates_organization_id_fkey";

-- Re-create with correct ON DELETE behavior (idempotent via EXCEPTION handler)
DO $$ BEGIN
  ALTER TABLE "public"."organization_requests"
    ADD CONSTRAINT "organization_requests_created_organization_id_fkey"
    FOREIGN KEY ("created_organization_id")
    REFERENCES "public"."organizations"("id") ON DELETE SET NULL NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE IF EXISTS "public"."organization_requests"
  VALIDATE CONSTRAINT "organization_requests_created_organization_id_fkey";

DO $$ BEGIN
  ALTER TABLE "public"."tournament_templates"
    ADD CONSTRAINT "tournament_templates_organization_id_fkey"
    FOREIGN KEY ("organization_id")
    REFERENCES "public"."organizations"("id") ON DELETE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE IF EXISTS "public"."tournament_templates"
  VALIDATE CONSTRAINT "tournament_templates_organization_id_fkey";
