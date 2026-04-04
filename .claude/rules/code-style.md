---
paths:
  - "**/*.{ts,tsx}"
---

# Code Style

Project-wide coding standards for all TypeScript and TSX code in the trainers.gg monorepo.

## TypeScript

- **Strict mode** with `noUncheckedIndexedAccess` and `noImplicitOverride` enabled
- **Type-only imports**: `import { type Foo }` inline style (ESLint enforced) — not `import type { Foo }`
- **Unused vars**: prefix with `_` (e.g., `_unused`)
- **No `any`** — use `unknown` instead
- **No `@ts-expect-error` or `@ts-ignore`** — fix the type error instead
- **No `globalThis`** for accessing Node.js globals — use proper imports or configure `tsconfig`/`jest.config` instead

## React Compiler

This project uses React Compiler for automatic memoization across all packages (web and mobile). ESLint uses `eslint-plugin-react-hooks` v7 with `recommended-latest` (bundles compiler rules). `exhaustive-deps` is disabled — the compiler handles memoization and stale closure prevention.

- **Do not write `useMemo`, `useCallback`, or `React.memo`** — the compiler handles it. Effect dependency arrays only need values that should trigger re-execution (state, props), not functions
- If a component re-renders too often, fix the data flow first — manual memoization should be a last resort, not a first instinct
- When manual memoization is genuinely needed (e.g., stabilizing a reference for a third-party library with strict reference checks), add a comment explaining why
- The compiler assumes components are pure — avoid side effects during render
- **Do not call `setState` synchronously in effects** — the `set-state-in-effect` rule catches this. See `react-patterns.md` for approved alternatives

```tsx
// Preferred — compiler optimizes automatically
const filtered = items.filter((i) => i.active);
const handleClick = () => setOpen(true);

// Avoid unless justified with a comment
const filtered = useMemo(() => items.filter((i) => i.active), [items]);
```

## Import Ordering

Group imports in this order, separated by blank lines:

1. **Directive** — `"use server"` or `"use client"` on line 1
2. **Framework/library** — `react`, `next/*`, `expo-router`, third-party packages
3. **Monorepo packages** — `@trainers/supabase`, `@trainers/validators`, `@trainers/utils`
4. **Internal aliases** — `@/lib/...`, `@/components/...`, `@/actions/...`
5. **Relative imports** — `./tournament-search`, `../utils`
6. **Side-effect imports** — `@/styles/globals.css` (last)

```tsx
"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { createTournamentMutation } from "@trainers/supabase";
import { type CreateTournamentInput } from "@trainers/validators";

import { createClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

import { validateSlug } from "./utils";
```

## Prettier

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

Tailwind class sorting is handled by `prettier-plugin-tailwindcss`.

## Naming Conventions

| Kind           | Convention        | Example                    |
| -------------- | ----------------- | -------------------------- |
| Files          | `kebab-case`      | `tournament-card.tsx`      |
| Directories    | `kebab-case`      | `tournament-detail/`       |
| Components     | `PascalCase`      | `TournamentCard`           |
| Functions/vars | `camelCase`       | `getTournament`            |
| Constants      | `SCREAMING_SNAKE` | `MAX_TEAM_SIZE`            |
| Zod schemas    | `camelCaseSchema` | `createTournamentSchema`   |
| Hooks          | `useCamelCase`    | `useAuth`, `usePermission` |

## Component Patterns

- **Function declarations** — always use `function` declarations for components, not arrow functions

```tsx
// Good
export function TournamentCard({ name }: TournamentCardProps) { ... }

// Avoid
export const TournamentCard = ({ name }: TournamentCardProps) => { ... };
```

- **Props** — define with `interface XxxProps` directly above the component. Inline props only for trivial cases (e.g., layouts with just `children`)

```tsx
interface TournamentCardProps {
  name: string;
  status: TournamentStatus;
  className?: string;
}

export function TournamentCard({ name, status, className }: TournamentCardProps) { ... }
```

- **Exports** — named exports for all components. `export default` only for Next.js pages/layouts (App Router requirement)

## Hook Patterns

- `"use client"` directive on line 1
- Named with `use` prefix: `useAuth`, `usePermission`, `useCurrentUser`
- Return named-property objects, not positional arrays

```tsx
export function useAuth() {
  return { user, session, loading, isAuthenticated, signOut };
}
```

- Barrel-export from `hooks/index.ts` with explicit named re-exports

## Dynamic Classes (Web Only)

In `apps/web/`, always use `cn()` from `@/lib/utils` for combining class names — template literals cause Tailwind purge issues. Shared packages and mobile do not use `@/` aliases or Tailwind.

```tsx
// Good
<div className={cn("base-class", isActive && "active-class")} />

// Bad — Tailwind cannot purge dynamic template literals
<div className={`base-class ${isActive ? "active-class" : ""}`} />
```

## Error Handling

| Context                | Pattern                                                     |
| ---------------------- | ----------------------------------------------------------- |
| Validation errors      | `throw new Error("message")`                                |
| Query not found        | Return `null`                                               |
| Server Actions         | Return `ActionResult<T>` (see nextjs-conventions)           |
| User-facing extraction | `getErrorMessage(error, "fallback")` from `@trainers/utils` |

- Never suppress errors with `2>/dev/null`, `|| true`, or empty catch blocks
- When a catch block is intentionally empty, add a comment explaining why

```tsx
} catch {
  // Expected during static generation — cookies() unavailable
}
```

## Documentation

- **JSDoc on exported functions** — required for all public API functions in shared packages and server action files
- **File-level JSDoc** — use on server action files to describe the domain
- **Section dividers** — use `// =====` block comments to separate logical groups in large files

```tsx
// =============================================================================
// Tournament CRUD
// =============================================================================
```

## Barrel Files

- Every package has `src/index.ts` with explicit named exports
- Organize exports with `//` section comments describing each group
- Avoid `export *` — prefer explicit named re-exports for discoverability
