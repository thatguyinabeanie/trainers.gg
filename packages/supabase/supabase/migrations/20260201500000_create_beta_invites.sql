-- Create beta_invites table for private beta invite system
-- Admins send one-time-use invite links (7-day expiry) via email.
-- Recipients click the link to create an account, bypassing the waitlist.

CREATE TABLE public.beta_invites (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  converted_user_id uuid REFERENCES public.users(id),

  CONSTRAINT beta_invites_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- No UNIQUE on email — admins can re-invite after expiry

-- Column descriptions
COMMENT ON TABLE public.beta_invites IS 'One-time-use invite links for private beta access';
COMMENT ON COLUMN public.beta_invites.id IS 'Primary key';
COMMENT ON COLUMN public.beta_invites.email IS 'Email address the invite was sent to';
COMMENT ON COLUMN public.beta_invites.token IS 'Unique invite token used in the invite URL';
COMMENT ON COLUMN public.beta_invites.invited_by IS 'Admin user who sent the invite';
COMMENT ON COLUMN public.beta_invites.created_at IS 'When the invite was created';
COMMENT ON COLUMN public.beta_invites.expires_at IS 'When the invite expires (default 7 days)';
COMMENT ON COLUMN public.beta_invites.used_at IS 'When the invite was redeemed (null if unused)';
COMMENT ON COLUMN public.beta_invites.converted_user_id IS 'User ID of the account created from this invite';

-- Enable RLS
ALTER TABLE public.beta_invites ENABLE ROW LEVEL SECURITY;

-- Anon users can SELECT (for token validation on the invite page)
CREATE POLICY "Anyone can validate invite tokens"
  ON public.beta_invites
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can insert (via edge function using service role, but also for direct admin access)
CREATE POLICY "Admins can create invites"
  ON public.beta_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
      AND r.name = 'site_admin'
    )
  );

-- Admins can update (for marking used, revoking)
CREATE POLICY "Admins can update invites"
  ON public.beta_invites
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
      AND r.name = 'site_admin'
    )
  );

-- Admins can delete (for revoking invites)
CREATE POLICY "Admins can delete invites"
  ON public.beta_invites
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
      AND r.name = 'site_admin'
    )
  );

-- Indexes for common queries
CREATE INDEX beta_invites_token_idx ON public.beta_invites (token);
CREATE INDEX beta_invites_email_idx ON public.beta_invites (email);
CREATE INDEX beta_invites_expires_at_idx ON public.beta_invites (expires_at);
CREATE INDEX beta_invites_invited_by_idx ON public.beta_invites (invited_by);
