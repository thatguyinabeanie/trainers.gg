# QA Engineer Memory Index

- [E2E spec location rule](e2e-testdir.md) — playwright.config.ts uses testDir `./e2e/tests` — specs must go in `e2e/tests/`, NOT `e2e/` root
- [Untracked Test Files Pattern](feedback-untracked-tests.md) — codecov/patch fails when test files exist on disk but are never `git add`ed; always check `git status` before writing new tests