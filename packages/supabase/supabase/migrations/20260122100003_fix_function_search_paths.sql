-- Fix function search_path security warnings
-- Set explicit search_path for helper functions

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS uuid AS $$
  SELECT p.id FROM public.profiles p
  WHERE p.user_id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;
