-- =============================================================================
-- 01_extensions.sql - Enable Required Extensions
-- =============================================================================
-- IDEMPOTENT: Uses CREATE EXTENSION IF NOT EXISTS
-- =============================================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
