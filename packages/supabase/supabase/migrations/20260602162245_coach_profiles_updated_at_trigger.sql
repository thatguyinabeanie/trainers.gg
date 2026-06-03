-- Wire the shared updated_at trigger on coach_profiles (parity with other tables).
DROP TRIGGER IF EXISTS set_coach_profiles_updated_at ON public.coach_profiles;
CREATE TRIGGER set_coach_profiles_updated_at
  BEFORE UPDATE ON public.coach_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
