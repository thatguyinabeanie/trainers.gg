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
