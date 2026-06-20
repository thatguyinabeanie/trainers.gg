---
name: syncing-calc-fork-upstream
description: Use when pulling upstream @smogon/calc improvements into our fork (vendor/damage-calc), or auditing whether upstream has caught up with something we forked to add (Champions data, custom mechanics).
---

# Syncing the calc Fork with Upstream

Keeps `thatguyinabeanie/damage-calc` (`vendor/damage-calc`) in sync with `smogon/damage-calc`.

For **adding or editing Champions move/ability rebalances** see `applying-move-rebalances`.
For **auditing whether our overrides can now be pruned** see `reconciling-pkmn-overrides`.

## When to Use

| Scenario | Action |
| --- | --- |
| Upstream shipped new calc features, fixes, or species data | Merge upstream into the fork, rebuild dist, bump submodule pointer |
| Wondering whether upstream now covers something we hand-added | Run the "Has upstream caught up?" audit below, then `reconciling-pkmn-overrides` |

## Our Customizations — Must Survive Every Merge

These files carry Champions-specific additions. **Never let a merge silently clobber them.**

| File | What we own |
| --- | --- |
| `calc/src/data/species.ts` | `CHAMPIONS_LIST` + `CHAMPIONS_PATCH` + the `CHAMPIONS` export |
| `calc/src/data/moves.ts` | `CHAMPIONS_LIST` + `CHAMPIONS_PATCH` + the `CHAMPIONS` export |
| `calc/src/data/abilities.ts` | `CHAMPIONS` array |
| `calc/src/data/items.ts` | `CHAMPIONS` array |
| `calc/src/mechanics/champions.ts` | Full Champions damage-calc mechanics |
| `calc/dist/` | Committed pre-built output (required by pnpm `file:` symlink) |

## Step 1 — Configure the Upstream Remote

Add the remote once (skip if already present):

```bash
git -C vendor/damage-calc remote -v            # check existing remotes
git -C vendor/damage-calc remote add upstream https://github.com/smogon/damage-calc.git
```

Fetch latest upstream state:

```bash
git -C vendor/damage-calc fetch upstream
```

## Step 2 — Inspect Divergence

```bash
# Commits in our fork that upstream doesn't have (our customizations)
git -C vendor/damage-calc log --oneline upstream/master..HEAD

# Commits in upstream that we haven't merged yet (what we're evaluating)
git -C vendor/damage-calc log --oneline HEAD..upstream/master
```

If `HEAD..upstream/master` is empty, the fork is already up to date — stop here.

## Step 3 — Merge Upstream into the Fork

```bash
git -C vendor/damage-calc merge upstream/master
```

Conflicts will surface in the Champions-owned files listed above. Resolve with these rules:

- **`CHAMPIONS_LIST`, `CHAMPIONS_PATCH`, `CHAMPIONS` blocks** — always keep our version; upstream doesn't know about these symbols.
- **Surrounding SV/SS data blocks** — take upstream's changes (the reason we're syncing).
- **`calc/dist/`** — if git tries to merge dist files, accept neither side; you will rebuild from scratch in Step 4.

After resolving:

```bash
git -C vendor/damage-calc add -A
git -C vendor/damage-calc commit -m "chore: merge upstream smogon/damage-calc into fork"
```

## Step 4 — Rebuild dist/ and Run Tests

dist/ is never merged — it is always regenerated from the post-merge source:

```bash
# Build the calc package (compiles TS + bundles)
cd vendor/damage-calc/calc
npm run build   # runs: tsc -p . && node bundle

# Run the calc test suite
npm test        # pretest compiles again; posttest runs eslint
cd -
```

Fix any compile or test failures before proceeding. Common causes: upstream renamed a type we reference in `champions.ts`, or new strict TypeScript rules conflict with our additions.

Once tests pass, stage the regenerated dist:

```bash
git -C vendor/damage-calc add calc/dist/
git -C vendor/damage-calc commit -m "chore: rebuild dist/ after upstream merge"
```

## Step 5 — Bump the Submodule Pointer and Verify the Main Repo

The main repo pins the submodule to a specific commit. After the fork advances, update the pointer:

```bash
# In the main repo root
git add vendor/damage-calc
git commit -m "chore: bump @smogon/calc fork to include upstream sync"
```

Then verify the main repo still resolves and types-check:

```bash
pnpm --filter @trainers/web typecheck
pnpm --filter @trainers/web test
```

A broken `vendor/damage-calc/calc/dist/` (missing or stale) will surface as
`Cannot find module '@smogon/calc'` — the dist must be committed in the fork before bumping.

## Step 6 — Push the Fork

CI and Vercel fetch the pinned submodule commit from `origin`. After committing to the fork locally, push:

```bash
git -C vendor/damage-calc push origin master
```

Then push the main repo (with the updated submodule pointer) as normal.

## "Has Upstream Caught Up?" Audit

Before adding a new Champions customization, and on any upstream bump, check whether the smogon repo now ships what we hand-rolled:

1. Search `upstream/master` for the species name, move name, or mechanic you own:
   ```bash
   git -C vendor/damage-calc show upstream/master:calc/src/data/species.ts | grep -i "<YourSpecies>"
   git -C vendor/damage-calc show upstream/master:calc/src/mechanics/gen789.ts | grep -i "<YourMechanic>"
   ```
2. If upstream now covers it identically → our override can be removed. Run `reconciling-pkmn-overrides` to prune it safely.
3. If upstream covers it differently (different values) → keep ours, add a comment explaining the divergence.
4. If upstream doesn't cover it → nothing to prune; our customization stays.

## Gotchas

- **Never re-pin `@smogon/calc` to a git tarball** (`github:thatguyinabeanie/damage-calc#<sha>&path:/calc`). The git-tarball form cannot be resolved by pnpm under `--frozen-lockfile` in CI/Vercel — it either lands with no `dist/` or as an unresolvable store mismatch. The `file:../../vendor/damage-calc/calc` symlink is the only form that works deterministically. See root `CLAUDE.md` "Gotchas" for the full explanation.
- **dist/ must be committed in the fork.** pnpm symlinks the directory; if `dist/` is absent or stale (pre-merge), `@smogon/calc` won't resolve. Always rebuild and commit dist/ before bumping the pointer in the main repo.
- **Submodule must be initialized.** On a fresh clone: `git submodule update --init --recursive`. GitHub Actions uses `submodules: recursive` in `actions/checkout`; Vercel has "Git submodules" enabled in project settings.
- **Merge vs rebase** — prefer `merge` over `rebase` for upstream integration. A rebase rewrites our Champions commits and makes the fork's history harder to audit. Merge creates a clear "merged upstream at <sha>" commit.
- **`calc/dist/` in merge conflicts** — if git surfaces dist files as conflicts, always choose "ours" or delete the conflict markers and regenerate from scratch. Never hand-edit compiled output.
