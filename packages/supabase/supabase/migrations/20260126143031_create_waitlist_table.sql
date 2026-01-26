-- Create waitlist table for maintenance mode signups
-- Users can submit their email to be notified when the platform launches

CREATE TABLE public.waitlist (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  converted_user_id uuid REFERENCES public.users(id),
  source text DEFAULT 'web',
  metadata jsonb DEFAULT '{}'::jsonb,
  
  CONSTRAINT waitlist_email_unique UNIQUE (email),
  CONSTRAINT waitlist_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Add column descriptions
COMMENT ON TABLE public.waitlist IS 'Email waitlist for users who sign up during maintenance mode';
COMMENT ON COLUMN public.waitlist.id IS 'Primary key';
COMMENT ON COLUMN public.waitlist.email IS 'Email address for waitlist notification';
COMMENT ON COLUMN public.waitlist.created_at IS 'When the user joined the waitlist';
COMMENT ON COLUMN public.waitlist.notified_at IS 'When the user was notified of launch';
COMMENT ON COLUMN public.waitlist.converted_user_id IS 'User ID if they converted to a full account';
COMMENT ON COLUMN public.waitlist.source IS 'Where the signup came from (web, mobile, etc.)';
COMMENT ON COLUMN public.waitlist.metadata IS 'Additional metadata (referral, campaign, etc.)';

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for public waitlist signup)
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view/manage waitlist
CREATE POLICY "Admins can view waitlist"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'site_admin'
    )
  );

CREATE POLICY "Admins can update waitlist"
  ON public.waitlist
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'site_admin'
    )
  );

-- Index for email lookups
CREATE INDEX waitlist_email_idx ON public.waitlist (email);
CREATE INDEX waitlist_created_at_idx ON public.waitlist (created_at DESC);
