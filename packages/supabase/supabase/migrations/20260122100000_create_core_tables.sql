-- Migration: Create core tables (users, profiles)
-- Uses Supabase Auth - users.id matches auth.users.id

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
-- id is the same as auth.users.id (set by trigger on auth.users insert)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text,
  first_name text,
  last_name text,
  name text, -- Display name (computed or legacy)
  username text UNIQUE,
  image text,
  phone_number text,
  birth_date date,
  country text, -- ISO 3166-1 alpha-2 country code
  main_profile_id uuid,
  is_locked boolean DEFAULT false,
  external_accounts jsonb,
  public_metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_sign_in_at timestamptz,
  last_active_at timestamptz
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key for main_profile_id after profiles table exists
ALTER TABLE public.users 
  ADD CONSTRAINT users_main_profile_id_fkey 
  FOREIGN KEY (main_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS users_username_idx ON public.users (username);
CREATE INDEX IF NOT EXISTS users_first_name_idx ON public.users (first_name);
CREATE INDEX IF NOT EXISTS users_last_name_idx ON public.users (last_name);
CREATE INDEX IF NOT EXISTS users_country_idx ON public.users (country);
CREATE INDEX IF NOT EXISTS users_birth_date_idx ON public.users (birth_date);
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users are viewable by everyone" 
ON public.users FOR SELECT
USING (true);

CREATE POLICY "Users can update own record" 
ON public.users FOR UPDATE
USING (id = auth.uid());

-- Note: User creation is handled by trigger, not direct insert
-- So we need a policy that allows the trigger (running as service role) to insert
CREATE POLICY "Allow user creation" 
ON public.users FOR INSERT
WITH CHECK (true);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS uuid AS $$
  SELECT p.id FROM profiles p
  WHERE p.user_id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
