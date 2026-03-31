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

## Data Fetching

### Server Components

Use `unstable_cache` with cache tags for on-demand revalidation:

```tsx
export const revalidate = false; // On-demand only

const getCachedTournaments = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    return listTournamentsGrouped(supabase, { completedLimit: 20 });
  },
  ["tournaments-grouped"],
  { tags: [CacheTags.TOURNAMENTS_LIST] }
);
```

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
- Call `updateTag(CacheTags.xxx)` in server actions after mutations
- Pair with `revalidatePath()` when the entire route needs refreshing

## Server Actions

Located in `src/actions/`, one file per domain (e.g., `tournaments.ts`, `communities.ts`, `profile.ts`).

### Return Type

Every server action returns `Promise<ActionResult<T>>`:

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
    updateTag(CacheTags.TOURNAMENTS_LIST);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create tournament"),
    };
  }
}
```

Key steps: `rejectBots()` → `createClient()` → mutation → `updateTag()` → return result.

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

## Environment Safety

- Never expose server-only secrets to client code
- Only `NEXT_PUBLIC_*` env vars are available in the browser
- Declare build-time env vars in `turbo.json` under the task's `env` array for cache invalidation
- All env vars live in root `.env.local`, symlinked into apps/packages via `postinstall.sh`
