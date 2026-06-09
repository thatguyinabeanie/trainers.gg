-- Document the is_legal column semantics (the prior migration only commented
-- legality_reason). Kept as a separate migration because committed migration
-- files are never edited in place. COMMENT is inherently idempotent.

COMMENT ON COLUMN rk9.team_pokemon.is_legal IS
  'False when the Pokemon was flagged illegal at import time. Defaults to true (fail-open): rows imported before legality validation existed, or whose event format was unknown/unreadable, are treated as legal rather than dropped.';
