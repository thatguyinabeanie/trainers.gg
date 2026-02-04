-- Revoke direct access to generate_bracket_order from authenticated users.
-- This recursive function has no input size limit and is only needed internally
-- by the advance_to_top_cut RPC (which is SECURITY DEFINER).
REVOKE EXECUTE ON FUNCTION public.generate_bracket_order(integer) FROM authenticated;
