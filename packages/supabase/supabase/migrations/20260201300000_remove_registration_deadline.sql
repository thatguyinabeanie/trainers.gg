-- Remove registration_deadline column from tournaments.
-- Registration now simply closes when the tournament starts (status = 'active').
-- Late registration is handled by the existing allow_late_registration flag.
ALTER TABLE public.tournaments DROP COLUMN IF EXISTS registration_deadline;
