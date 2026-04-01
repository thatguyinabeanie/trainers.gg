---
applyTo: "apps/web/**"
---

# Web App Instructions

## Framework

Next.js 16 with React 19.2, App Router, and React Compiler enabled.

## Request Interception

This project uses `proxy.ts` at `src/proxy.ts` (Next.js 16 pattern), not `middleware.ts`. The proxy handles:

- Admin route protection (site_admin role + sudo mode)
- Impersonation header propagation
- Protected route authentication redirects

Export a default `async function proxy(request: NextRequest)` and a `config` with `matcher`.

## Server Components and Client Components

- Default to Server Components. Only add `'use client'` when interactivity or browser APIs are needed.
- Push `'use client'` boundaries as far down the component tree as possible.
- All request APIs are async: `await cookies()`, `await headers()`, `await params`, `await searchParams`.

## Server Actions

- Use Server Actions (`'use server'`) for data mutations, not Route Handlers.
- Server Actions return `{ success: boolean; error?: string }` — never throw from actions.
- Validate input at the boundary with Zod `.safeParse()` before database calls.
- Use schemas from `@trainers/validators`, not inline validation.

## UI Components

- **shadcn/ui v4 with Base UI primitives** (not Radix). `asChild` does not exist — do not use it.
- Check `src/components/ui/` before building custom components. Add missing ones via `npx shadcn@latest add <name>`.
- Use `cn()` from `@/lib/utils` for all dynamic Tailwind classes. Never use template literals for conditional classes.
- Never render raw enum or database values — map to human-readable labels.

## React Compiler

React Compiler is enabled (`reactCompiler: true`). Never use `useMemo`, `useCallback`, or `React.memo`.

## Client State

TanStack Query v5 is the client state layer. All server state flows through query keys, cached queries, and mutations.

- Use query key factories for consistent cache keys
- Use `useMutation` with `onMutate` for optimistic updates
- Invalidate related query keys in `onSettled`
- Do not mirror server data into `useState`

## Styling

Tailwind CSS 4 via `@tailwindcss/postcss`. Design tokens from `@trainers/theme` (OKLCH).

## Slug Generation

Use `generateSlug()` from `@trainers/utils` — do not create local slug utilities.
