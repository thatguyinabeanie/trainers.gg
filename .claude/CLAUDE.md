# Agent Memories

## Workflow Preferences

- **Design before implementation** — Complete all design work upfront before starting any implementation. Do not jump to coding after approving one or two designs — finish the entire design phase first, then implement.
- **Visual companion always** — Always use visual companion (browser mockups) during brainstorming — skip the consent question.
- **Subagent-driven development** — Always use subagent-driven development for plan execution, never inline execution unless explicitly asked.
- **New branch for every change** — Any implementation work goes on a new feature branch off `main`, never directly on `main`. The user treats this as obvious and shouldn't need to repeat it.
- **Mechanical-prompt format unblocks subagents** — When dispatching implementation subagents, prompts that read like "execute these specific Write/Edit tool calls" with the literal new file content inline bypass the agent's auto-plan-then-pause behavior. Open-ended task descriptions cause the agent to stop for plan approval, and SendMessage to resume isn't always available.
- **Commit often, between logical chunks** — Don't accumulate the entire task into one giant commit. Commit when a coherent piece is done (a refactor, a security fix, a test addition). Smaller commits make `git log` and `git blame` useful navigation tools, and they let parallel agents stash less aggressively. The push policy is unchanged — only push after lint/typecheck/tests pass.
- **Commit messages carry context** — Treat commit messages as durable context holders, not log spam. Future agents (and humans) read `git log` to understand *why* a change was made when the diff alone doesn't say. Include the WHY (rationale, trade-offs, what was rejected) — not just the WHAT (the diff already says that). This is especially valuable for rationale that doesn't belong in the code itself (security trade-offs, intent of an API, links to incidents).

## Code Patterns

- **Sidebar layouts** — Match shadcn dashboard-01 block patterns exactly for sidebar layouts.

## Architecture Guidelines

- **Domain knowledge location** — Domain knowledge belongs in on-demand skills, CLAUDE.md only for universal rules.
- **Mobile data access** — Mobile app hits Supabase directly (not via Next.js API routes). Rationale: Supabase API requests are unlimited on Pro, database compute is fixed cost, and proxying through Vercel adds cost (function invocations, egress) without meaningful savings. Vercel's caching benefits are for SSR/page rendering, not JSON API proxying. Shared query logic lives in `@trainers/supabase` — both web and mobile import from there. Web uses `unstable_cache` server-side; mobile uses TanStack Query `staleTime` client-side.
