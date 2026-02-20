# @trainers/web

Next.js 16 (React 19) web app. App Router, Server Components by default.

## Route Groups

| Group              | Path                               | Purpose                               |
| ------------------ | ---------------------------------- | ------------------------------------- |
| `(auth-pages)`     | /sign-in, /sign-up, etc.           | Unauthenticated auth flows            |
| `(dashboard)`      | /dashboard, /settings, /onboarding | Protected — requires auth             |
| `(org)`            | /organizations/[id]                | Org hub pages                         |
| `tournaments/[id]` | /tournaments/[id]                  | Tournament detail, matches, standings |
| `admin`            | /admin/\*                          | Site admin only (site_admin role)     |

## Component Organization

```
src/components/
  ui/           # shadcn/ui + Base UI primitives — check here first before building custom
  auth/         # Auth forms, providers
  tournament/   # Tournament views, match tables, standings
  match/        # Match scoring, blind selection, dispute resolution
  organizations/# Org management
  layout/       # Shell, nav, header
```

Always check `components/ui/` before creating new components. Add missing shadcn components via:

```bash
npx shadcn@latest add <component-name>
```

## Server Actions

Live in `src/actions/`. Return `{ success, error }` — use `@trainers/validators/action-result` type.

```typescript
"use server";
export async function myAction(data: FormData) {
  try {
    // ...
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Something went wrong"),
    };
  }
}
```

## Key Files

| File                                    | Purpose                                                                |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `src/proxy.ts`                          | Request interception — auth checks, route protection, maintenance mode |
| `src/lib/supabase/server.ts`            | Server-side Supabase client (use in RSC + Server Actions)              |
| `src/lib/supabase/client.ts`            | Browser Supabase client (use in client components)                     |
| `src/hooks/use-auth.ts`                 | Client-side auth state                                                 |
| `src/components/auth/auth-provider.tsx` | Auth context provider                                                  |

## Feature Flags

Feature gating via `src/lib/feature-flags/`. Check flags before building new gated features.
