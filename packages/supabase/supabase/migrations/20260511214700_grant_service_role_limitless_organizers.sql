-- Grant service_role write access to limitless.organizers
-- (the original schema migration only granted on tables existing at that time,
--  so the later-created organizers table was missed)
--
-- Also set default privileges so future tables in the limitless schema
-- automatically receive service_role access.

GRANT ALL ON TABLE limitless.organizers TO service_role;
GRANT USAGE ON SEQUENCE limitless.organizers_id_seq TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA limitless
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA limitless
  GRANT USAGE ON SEQUENCES TO service_role;
