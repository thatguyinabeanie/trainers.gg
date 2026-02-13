-- Grant execution permission for atomic registration RPC
GRANT EXECUTE ON FUNCTION public.register_for_tournament_atomic(
  bigint, bigint, text, text, text, boolean
) TO authenticated;
