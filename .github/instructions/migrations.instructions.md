---
applyTo: "**/migrations/**"
excludeAgent: "coding-agent"
---

# Code Review — Migrations

All migrations must be idempotent — Supabase preview branches replay every migration on a fresh database.

`DROP IF EXISTS` before `ADD CONSTRAINT` is the standard idempotency pattern — not redundant. Do not suggest removing it.

`CHECK (col = '' OR col ~ '^https?://')` accounts for backfilled empty strings from `DEFAULT ''` columns. This is intentional.

Never suggest editing or renaming a committed migration file — timestamps are recorded in production history and renaming breaks preview branches.

Supabase JSONB columns use `as unknown as Json` for type casting. Do not suggest `Json[]` — the generated type is `Json | null`.

`USING(true)` on `tournament_team_sheets` is intentional — the security boundary is when rows are created (at tournament start), not column-level gating. Do not flag this as a vulnerability.

`(SELECT auth.uid())` and `(SELECT auth.role())` use the initplan pattern for performance — do not suggest removing the subselect wrapper.

`DROP POLICY IF EXISTS` before `CREATE POLICY` is required for idempotency — do not suggest removing the DROP.
