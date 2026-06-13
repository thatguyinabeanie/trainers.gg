-- =============================================================================
-- Atomic sliding-window rate-limit RPC
-- =============================================================================
--
-- WHY: `enforceRateLimit` (apps/web/src/lib/api/rate-limit.ts) previously did
-- read (SELECT request_timestamps) -> compute -> write (UPSERT) as three
-- separate statements. Two concurrent requests for the same identifier could
-- both read the pre-limit state, both decide "allowed", and both append a
-- timestamp -- so the limit was not actually enforced under concurrency
-- (CodeRabbit flagged this as a Major read-then-write race).
--
-- FIX: `check_rate_limit` performs the entire decision in a SINGLE statement
-- against the `rate_limits` row, serializing concurrent callers:
--
--   1. INSERT ... ON CONFLICT (identifier) DO UPDATE takes a row lock on the
--      conflicting row, so concurrent callers for the same identifier block
--      until the in-flight one commits -- no lost updates.
--   2. Stale timestamps (older than the window) are pruned in-statement.
--   3. The in-window count is compared against p_limit to decide `allowed`.
--   4. `now()` is appended only when allowed. now() is taken inside SQL so the
--      window is server-authoritative -- the client never supplies time.
--   5. Returns the decision plus the reset time (when the oldest in-window
--      timestamp leaves the window).
--
-- SECURITY: SECURITY DEFINER with a pinned search_path. The function is the
-- only intended write path for `rate_limits`; the table's RLS denies all
-- non-service-role access (`USING (false)`). `enforceRateLimit` calls this via
-- the service-role client, but EXECUTE is also granted to authenticated/anon
-- defensively so the limiter works for anon IP-keyed callers regardless of the
-- client used.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_limit integer,
  p_window_ms bigint
)
RETURNS TABLE (allowed boolean, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_window interval := make_interval(secs => p_window_ms / 1000.0);
  v_window_start timestamptz := v_now - v_window;
  v_in_window timestamptz[];
  v_count integer;
  v_allowed boolean;
  v_oldest timestamptz;
BEGIN
  -- Take a row lock on the identifier's row (or create it). Concurrent callers
  -- for the same identifier serialize here, eliminating the read-then-write
  -- race. We seed/refresh window_start and expires_at in the same statement so
  -- the GC index (idx_rate_limits_expires) stays accurate.
  INSERT INTO public.rate_limits (
    identifier,
    request_timestamps,
    window_start,
    expires_at
  )
  VALUES (
    p_identifier,
    ARRAY[]::timestamptz[],
    v_window_start,
    v_now + v_window
  )
  ON CONFLICT (identifier) DO UPDATE
    SET window_start = v_window_start,
        expires_at = v_now + v_window
  RETURNING request_timestamps INTO v_in_window;

  -- Prune timestamps that have fallen outside the current window.
  SELECT COALESCE(
    array_agg(ts ORDER BY ts),
    ARRAY[]::timestamptz[]
  )
  INTO v_in_window
  FROM unnest(v_in_window) AS ts
  WHERE ts > v_window_start;

  v_count := COALESCE(array_length(v_in_window, 1), 0);
  v_allowed := v_count < p_limit;

  -- Append the current request only when allowed; persist the pruned (and
  -- possibly appended) array either way so stale entries don't accumulate.
  IF v_allowed THEN
    v_in_window := array_append(v_in_window, v_now);
  END IF;

  UPDATE public.rate_limits
  SET request_timestamps = v_in_window
  WHERE identifier = p_identifier;

  -- reset_at: when the oldest in-window timestamp leaves the window. With no
  -- in-window timestamps capacity is available immediately (reset = now()).
  v_oldest := v_in_window[1];
  reset_at := COALESCE(v_oldest, v_now) + v_window;
  allowed := v_allowed;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit(text, integer, bigint) IS
  'Atomic sliding-window rate limiter. Locks the rate_limits row for p_identifier, prunes timestamps older than p_window_ms, allows the request when the in-window count is below p_limit (appending now()), and returns (allowed, reset_at). Server-authoritative time via now(). See apps/web/src/lib/api/rate-limit.ts.';

-- The function is SECURITY DEFINER and runs as its owner, so callers do not
-- need direct table grants. Grant EXECUTE to every role that can reach the
-- limiter: service_role (how enforceRateLimit connects) plus authenticated and
-- anon (defensive -- anon IP-keyed callers).
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, bigint)
  TO service_role, authenticated, anon;
