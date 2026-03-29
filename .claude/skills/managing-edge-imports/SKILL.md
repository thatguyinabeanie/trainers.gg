---
name: managing-edge-imports
description: Use when managing deno.json import maps for Supabase edge functions, adding new package imports, or debugging import resolution failures
---

# Edge Function Imports

Manage the Deno import map for Supabase edge functions. See `creating-edge-functions` skill for core patterns (CORS, auth, response format).

## Import Map (`deno.json`)

Edge functions run in Deno, not Node.js. All bare specifier imports (anything that isn't a relative path or URL) **must** be mapped in `packages/supabase/supabase/functions/deno.json`. The Supabase GitHub integration uses this import map when bundling functions for preview branches. Missing entries cause `failed to bundle function: exit status 1`.

**When you add a new monorepo package import to any file reachable from an edge function, you must add a corresponding entry to `deno.json`.**

This includes transitive dependencies — if edge function A imports `@trainers/supabase/mutations`, and a mutation file imports `@trainers/foo`, then `@trainers/foo` must be in the import map even though no edge function directly imports it.

## Import Map Entry Formats

| Source | Format | Example |
|--------|--------|---------|
| Monorepo package | Relative path to source | `"@trainers/utils": "../../../utils/src/index.ts"` |
| npm package | `npm:` specifier | `"zod": "npm:zod@^3"` |
| ESM URL | Full URL | `"@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.49.4"` |

## Verification

After modifying the import map or adding imports to files in the edge function dependency chain, verify all functions resolve:

```bash
cd packages/supabase/supabase/functions
for fn in */; do
  fname=$(basename "$fn")
  [ "$fname" = "_shared" ] && continue
  result=$(DENO_FUTURE=1 deno cache --config deno.json --allow-import --node-modules-dir=false --unstable-sloppy-imports "$fname/index.ts" 2>&1 | grep -i "error" | head -1)
  if [ -n "$result" ]; then echo "FAIL $fname: $result"; else echo "OK   $fname"; fi
done
```

## Context

The CLAUDE.md has a one-line critical rule: "Keep the `deno.json` import map in sync." This skill contains the full details of what that means and how to verify it.
