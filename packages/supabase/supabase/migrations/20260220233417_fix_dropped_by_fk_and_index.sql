-- =============================================================================
-- Fix dropped_by FK reference and add missing index
-- =============================================================================
-- Corrects the dropped_by foreign key to reference public.users(id) instead of
-- auth.users(id) for consistency with the rest of the codebase. Also adds an
-- index on dropped_by for FK cascade performance.

-- Drop the existing FK constraint and recreate with public.users reference
DO $$
BEGIN
  -- Find and drop the auto-generated FK constraint on dropped_by
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'tournament_registrations'
      AND kcu.column_name = 'dropped_by'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.tournament_registrations DROP CONSTRAINT ' || quote_ident(tc.constraint_name)
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'tournament_registrations'
        AND kcu.column_name = 'dropped_by'
        AND tc.constraint_type = 'FOREIGN KEY'
      LIMIT 1
    );
  END IF;
END $$;

-- Add FK referencing public.users(id) for consistency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'tournament_registrations'
      AND kcu.column_name = 'dropped_by'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.tournament_registrations
      ADD CONSTRAINT tournament_registrations_dropped_by_fkey
      FOREIGN KEY (dropped_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add partial index on dropped_by for FK cascade performance
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_dropped_by
  ON public.tournament_registrations (dropped_by)
  WHERE dropped_by IS NOT NULL;
