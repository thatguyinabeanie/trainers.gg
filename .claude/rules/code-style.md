---
paths:
  - "**/*.{ts,tsx}"
---

# Code Style

Project-wide coding standards for all TypeScript and TSX code in the trainers.gg monorepo.

## TypeScript

- **Strict mode** with `noUncheckedIndexedAccess` and `noImplicitOverride` enabled
- **Type-only imports**: `import { type Foo }` — never import types as values
- **Unused vars**: prefix with `_` (e.g., `_unused`)
- **No `any`** — use `unknown` instead
- **No `@ts-expect-error` or `@ts-ignore`** — fix the type error instead
- **No `globalThis`** for accessing Node.js globals — use proper imports or configure `tsconfig`/`jest.config` instead
- **Never `eslint-disable` `react-hooks/exhaustive-deps`** — fix the dependency issue instead (extract to a ref, restructure the effect, or move the function outside the component)

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

## Naming Conventions

| Kind           | Convention        | Example                  |
| -------------- | ----------------- | ------------------------ |
| Files          | `kebab-case`      | `tournament-card.tsx`    |
| Components     | `PascalCase`      | `TournamentCard`         |
| Functions/vars | `camelCase`       | `getTournament`          |
| Constants      | `SCREAMING_SNAKE` | `MAX_TEAM_SIZE`          |
| Zod schemas    | `camelCaseSchema` | `createTournamentSchema` |

## Dynamic Classes (Web Only)

In `apps/web/`, always use `cn()` from `@/lib/utils` for combining class names — template literals cause Tailwind purge issues. Shared packages and mobile do not use `@/` aliases or Tailwind.

```tsx
// Good
<div className={cn("base-class", isActive && "active-class")} />

// Bad — Tailwind cannot purge dynamic template literals
<div className={`base-class ${isActive ? "active-class" : ""}`} />
```

## Error Handling

| Context           | Pattern                                       |
| ----------------- | --------------------------------------------- |
| Validation errors | `throw new Error("message")`                  |
| Query not found   | Return `null`                                 |
| Server Actions    | Return `{ success: boolean, error?: string }` |
