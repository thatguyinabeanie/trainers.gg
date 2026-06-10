---
paths:
  - "apps/web/**/*"
---

# Next.js Conventions

Coding standards for the Next.js 16 web application (`apps/web/`). App Router with React 19.2, Server Components by default.

## Route Organization

- **Route groups** — use `(group-name)` folders for layout organization: `(app)`, `(auth-pages)`, `(dashboard)`, `(marketing)`
- **Pages** — `export default async function Page()` for server-rendered pages
- **Layouts** — `export default async function Layout({ children })` — Server Components by default
- **Loading states** — prefer granular `<Suspense>` boundaries with skeleton fallbacks over page-level `loading.js`

### Dynamic Segment Naming

Next.js requires all dynamic segments at the same path level to use the **same slug name**. Before creating a new `[param]` directory, check what existing sibling routes use.

```
# BAD — Next.js will crash at build/dev:
dashboard/alts/[username]/page.tsx
dashboard/alts/[handle]/teams/page.tsx   ← different name, same level

# GOOD — consistent slug at the same level:
dashboard/alts/[username]/page.tsx
dashboard/alts/[username]/teams/page.tsx
```

When adding routes under an existing dynamic segment, `ls` the parent directory first and match the existing `[paramName]`.

### Component Placement: feature directory vs route co-location

Next.js permits route-co-located components in `_components/` (the underscore prefix prevents Next.js from treating the folder as a route segment). It works, but in this project's `(dashboard)` group the route prefix already runs ~70 characters before any filename — adding `_components/` plus a long filename produces 100+-char paths that overflow terminal `git status` output and make import lines wrap.

**Default to `apps/web/src/components/<feature>/` for any feature with more than one or two files.** That is the established pattern in this repo:

| Path pattern (✅ use)                    | Path pattern (❌ avoid for non-trivial features)                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/team-builder/*` | `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/team-builder/_components/*`                  |
| `apps/web/src/components/discord/*`      | `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/integrations/discord/_components/*` |
| `apps/web/src/components/communities/*`  | `apps/web/src/app/(public)/communities/_components/*`                                                          |

**Heuristic** — if the route prefix path is >60 characters, the components MUST live in `components/<feature>/`. Use route-colocated `_components/` only when:

1. The route is shallow (e.g., `apps/web/src/app/foo/page.tsx`), AND
2. The components are used by exactly ONE route, AND
3. The directory contains at most 2–3 files including tests.

**Tests follow source.** When you put components in `apps/web/src/components/<feature>/`, their tests go in `apps/web/src/components/<feature>/__tests__/` — not under `apps/web/src/__tests__/components/<feature>/` or anywhere else.

### Sibling components must not import from each other

When two sibling components in the same feature directory share types, constants, or small helpers (a frequent pattern with desktop-table + mobile-cards pairs from the `mobile-responsiveness` rule), put the shared symbols in a co-located `<feature>-shared.ts` (or `.tsx` if JSX is involved). **Both** siblings import from `*-shared`. **Neither** sibling imports from the other.

```text
# Good — shared module breaks the cycle
components/discord/
  channel-mapping-shared.ts      // exports ChannelMappingInnerProps, CHANNEL_EVENT_LABELS, getChannelEventMeta
  channel-mapping-table.tsx       // imports from ./channel-mapping-shared
  channel-mapping-cards.tsx       // imports from ./channel-mapping-shared

# Bad — cycle that bundlers tolerate but HMR / Fast Refresh can mishandle
components/discord/
  channel-mapping-table.tsx       // imports ./channel-mapping-cards
  channel-mapping-cards.tsx       // imports ./channel-mapping-table  ← cycle
```

If you're modifying an existing feature whose siblings already form a cycle, fix it before adding more files: extract the shared exports to a new `*-shared.ts` and re-export from both originals for back-compat. CodeRabbit and Copilot both flag these cycles in review.

## Data Fetching

### Server Components

Use `'use cache'` (Cache Components) with `cacheTag()` and `cacheLife()` for on-demand revalidation. The project runs with `cacheComponents: true` in `next.config.ts`.

**Segment-level config (`export const revalidate`, `export const dynamic`, `export const fetchCache`) are build errors under `cacheComponents` — do not add them.**

```tsx
import { cacheTag, cacheLife } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

async function getCachedTournaments() {
  "use cache";
  cacheTag(CacheTags.TOURNAMENTS_LIST);
  cacheLife("max"); // tag-invalidated entity — no time-based expiry needed

  const supabase = createStaticClient();
  return listTournamentsGrouped(supabase, { completedLimit: 20 });
}
```

Function arguments + closures are the cache key — no manual key arrays needed. Every distinguishing value (entity IDs, filter params) must be a function parameter.

### Supabase Client Selection

| Function                    | Use Case                                   |
| --------------------------- | ------------------------------------------ |
| `createStaticClient()`      | Public data, no cookies (ISR/static pages) |
| `createClient()`            | Authenticated, read-write cookies          |
| `createClientReadOnly()`    | Authenticated, read-only cookies           |
| `createServiceRoleClient()` | Bypass RLS (admin operations only)         |

### Parallel Fetching

Use `Promise.all` for independent data requests:

```tsx
const [tournaments, registeredIds] = await Promise.all([
  getCachedTournaments(),
  getRegisteredTournamentIds(supabase, userId),
]);
```

### Client Components

Use TanStack Query v5 for client-side server state. For streaming, pass promises from Server Components and resolve with React `use()`.

## Cache Invalidation

- `CacheTags` object in `@/lib/cache` provides both static keys (`TOURNAMENTS_LIST`) and dynamic key functions (`tournament(id)`)
- **Never call `updateTag()` directly in server actions** — always use the entity-scoped helpers in `@/lib/cache-invalidation` (see `reviewing-caching` skill for the full helper table)
- Server Actions use `updateTag(tag)` (via helper); route handlers and webhooks use `revalidateTag(tag, 'max')` (via helper) — single-arg `revalidateTag` is deprecated
- Pair with `revalidatePath()` when the entire route needs refreshing

## Server Actions

Located in `src/actions/`, one file per domain (e.g., `tournaments.ts`, `communities.ts`, `profile.ts`).

### Return Type

Every server action returns `Promise<ActionResult<T>>`. **Always specify the generic** — use `ActionResult<void>` for actions with no return data, not bare `ActionResult`:

```ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      code?: string;
      validationErrors?: string[];
    };
```

### Standard Pattern

```tsx
"use server";

export async function createTournament(
  data: CreateTournamentInput
): Promise<ActionResult<{ id: number; slug: string }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await createTournamentMutation(supabase, data);
    invalidateTournamentListCaches(result.id); // use helper, never bare updateTag()
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create tournament"),
    };
  }
}
```

Key steps: `rejectBots()` → `createClient()` → mutation → invalidation helper → return result.

### `withAction` Wrapper

For simple actions, use the `withAction` utility from `@/actions/utils`:

```tsx
export async function toggleVisibility(altId: number, isPublic: boolean) {
  return withAction(async () => {
    const supabase = await createClient();
    await updateAltVisibility(supabase, altId, isPublic);
  }, "Failed to update visibility");
}
```

## Forms

- `react-hook-form` + `zodResolver` + schemas from `@trainers/validators`
- shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>` structure
- `toast` (sonner) for user feedback on submit

```tsx
const form = useForm<CreateTournamentInput>({
  resolver: zodResolver(createTournamentSchema),
  defaultValues: { name: "", slug: "" },
});

async function onSubmit(data: CreateTournamentInput) {
  const result = await createTournamentAction(data);
  if (result.success) {
    toast.success("Tournament created");
    router.push(`/tournaments/${result.data.slug}`);
  } else {
    toast.error(result.error);
  }
}
```

## Streaming

- Wrap async Server Components in `<Suspense>` with meaningful skeleton fallbacks
- Prefer granular `<Suspense>` boundaries close to the data fetch over wrapping the whole page
- For client-side streaming, pass a promise from a Server Component and resolve with `use()` in a Client Component

## UI Primitives

- **Base UI** (`@base-ui/react`) — not Radix. No `asChild` prop
- **CVA** (`class-variance-authority`) for component variants
- **`cn()`** from `@/lib/utils` for all conditional class composition
- **StatusBadge** for semantic status colors (emerald=active, blue=upcoming, amber=draft, gray=completed, red=cancelled)

## Input Validation at Route Boundaries

Data from outside the current request — route params, cookies, query strings, localStorage — can be stale, malformed, or tampered with. Validate before use.

| Source             | Risk                                          | Guard                                                            |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------- |
| Route `params`     | Non-numeric IDs, non-existent slugs           | `Number()` + `Number.isNaN()` → `notFound()` before any query    |
| Cookies            | References to deleted entities (stale alt ID) | Look up the cookie value in current data; fall back if not found |
| `searchParams`     | Arbitrary strings, missing keys               | Default values; validate before passing to queries               |
| External redirects | Open redirect via `?redirect=` param          | `isSafeRelativeUrl()` from `@/lib/notification-utils`            |

```tsx
// Route param — validate before querying
const numericId = Number(params.id);
if (Number.isNaN(numericId)) notFound();

// Cookie — validate against current data
const selectedAlt = alts.find((a) => a.username === cookieValue) ?? null;
const currentAlt = selectedAlt ?? alts[0] ?? null;
```

Never pass unvalidated external input directly to database queries — a `NaN` or stale reference should produce a 404, not a 500.

## Environment Safety

- Never expose server-only secrets to client code
- Only `NEXT_PUBLIC_*` env vars are available in the browser
- Declare build-time env vars in `turbo.json` under the task's `env` array for cache invalidation
- All env vars live in root `.env.local`, symlinked into apps/packages via `postinstall.sh`

## Related Skills

- `building-web-app` — routes, Server Actions, data fetching, proactive caching checklist
- `reviewing-caching` — Next.js `unstable_cache`, TanStack Query, cache invalidation
- `creating-components` — UI components, design tokens
