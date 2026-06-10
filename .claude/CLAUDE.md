# Agent Memories

## Workflow Preferences

- **Design before implementation** — Complete all design work upfront before starting any implementation. Do not jump to coding after approving one or two designs — finish the entire design phase first, then implement.
- **Visual companion always** — Always use visual companion (browser mockups) during brainstorming — skip the consent question.
- **New branch for every change** — Any implementation work goes on a new feature branch off `main`, never directly on `main`. The user treats this as obvious and shouldn't need to repeat it.
- **Mechanical-prompt format unblocks subagents** — When dispatching implementation subagents, prompts that read like "execute these specific Write/Edit tool calls" with the literal new file content inline bypass the agent's auto-plan-then-pause behavior. Open-ended task descriptions cause the agent to stop for plan approval, and SendMessage to resume isn't always available.
- **Commit often, between logical chunks** — Don't accumulate the entire task into one giant commit. Commit when a coherent piece is done (a refactor, a security fix, a test addition). Smaller commits make `git log` and `git blame` useful navigation tools, and they let parallel agents stash less aggressively. Lint/typecheck/tests/E2E do NOT need to run locally before commit or push — CI runs them; check CI after every push instead (see the Push Policy in the project `CLAUDE.md`). After each push, `background-checker` (haiku) runs scoped lint/typecheck in the background — never block on it.
- **Parallel waves, cheapest model, orchestrator commits** — Execute plan tasks in parallel waves (single message, multiple Agent calls, disjoint file allowlists); sequence only true dependencies. Subagents never commit or push — they report changed files plus a suggested commit message, and the orchestrator commits between waves. Pass `model` explicitly: haiku for mechanical work, sonnet for implementation, opus orchestrates only.
- **Commit messages carry context** — Treat commit messages as durable context holders, not log spam. Future agents (and humans) read `git log` to understand _why_ a change was made when the diff alone doesn't say. Include the WHY (rationale, trade-offs, what was rejected) — not just the WHAT (the diff already says that). This is especially valuable for rationale that doesn't belong in the code itself (security trade-offs, intent of an API, links to incidents).

## Code Patterns

- **Sidebar layouts** — Match shadcn dashboard-01 block patterns exactly for sidebar layouts.
- **Bottom Sheet internal scroll** — `SheetContent side="bottom"` has `data-[side=bottom]:h-auto` built in, which overrides any explicit `h-[Xvh]` class. For a sticky header + scrollable body inside a bottom sheet: use `max-h-[Xvh] overflow-hidden flex flex-col` on SheetContent, and wrap the inner content in `<div className="flex min-h-0 flex-1 flex-col overflow-hidden">`. The inner scrollable div then uses `flex-1 min-h-0 overflow-y-auto`.
- **Mobile-dedicated components** — When desktop and mobile layouts diverge significantly (e.g. wide table grid vs compact card list), create a separate `*-mobile.tsx` component rather than adding isMobile branches throughout the desktop component. Use `SpeciesPickerMobile` / `SpeciesPickerDialog` as the reference pattern.
- **`getPokemonSprite()` returns `{ url, w, h, pixelated }`** — not a raw string. Use `src={getPokemonSprite(species).url}` and apply `[image-rendering:pixelated]` when `.pixelated` is true. Tests mock this away so the type error only surfaces at typecheck time.

## Architecture Guidelines

- **Domain knowledge location** — Domain knowledge belongs in on-demand skills, CLAUDE.md only for universal rules.
- **Mobile data access** — Mobile app hits Supabase directly (not via Next.js API routes). Rationale: Supabase API requests are unlimited on Pro, database compute is fixed cost, and proxying through Vercel adds cost (function invocations, egress) without meaningful savings. Vercel's caching benefits are for SSR/page rendering, not JSON API proxying. Shared query logic lives in `@trainers/supabase` — both web and mobile import from there. Web uses `'use cache'` (Cache Components) server-side; mobile uses TanStack Query `staleTime` client-side.
