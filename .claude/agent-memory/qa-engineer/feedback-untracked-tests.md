---
name: untracked-test-files
description: codecov/patch CI failures can be caused by test files that exist on disk but were never committed — check git status before writing new tests
metadata:
  type: feedback
---

When a `codecov/patch` CI check fails, the first step is NOT to write new tests. Check `git status` to see if the test files were written but never `git add`ed. In the speed-tiers-dialog branch, all four requested test files (`filter-dialog-shell.test.tsx`, `speed-tiers-dialog.test.tsx`, both `user-preferences.test.ts` files) existed on disk and were thorough, but were untracked — so CI never saw them.

**Why:** Test files can be authored in a session that ends before committing, or created by another agent without a staging step.

**How to apply:** Before starting any test-writing session, run `git status` to check for untracked test files in the target directories. If they exist and are thorough, just `git add` and commit them rather than duplicating work. Only write new tests if the files are genuinely missing or the existing ones have gaps.
