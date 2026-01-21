# trainers.gg - Agent Guidelines

A Pokemon community platform powered by Bluesky/AT Protocol. Monorepo with Next.js 16 web app, Expo 54 mobile app, and Convex backend.

## Monorepo Structure

```
apps/web        → Next.js 16 (React 19) - @trainers/web
apps/mobile     → Expo 54 (React 19) - @trainers/mobile
packages/backend   → Convex database/functions - @trainers/backend
packages/ui        → Shared UI components - @trainers/ui
packages/validators → Zod schemas - @trainers/validators
tooling/*          → Shared configs (typescript, eslint, prettier, tailwind)
```

---

## Build / Lint / Test Commands

### Root Commands (from repo root)

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Run all apps in parallel
pnpm dev:web              # Run web app only
pnpm dev:mobile           # Run mobile app only
pnpm build                # Build all packages
pnpm build:web            # Build web app only
pnpm lint                 # Lint all packages
pnpm typecheck            # TypeScript check all packages
pnpm format               # Format all files with Prettier
pnpm format:check         # Check formatting without fixing
pnpm clean                # Remove all build artifacts and node_modules
```

### Running Commands for Single Package

```bash
pnpm turbo run <task> --filter=@trainers/web
pnpm turbo run <task> --filter=@trainers/mobile
pnpm turbo run <task> --filter=@trainers/backend
pnpm turbo run <task> --filter=@trainers/ui
pnpm turbo run <task> --filter=@trainers/validators
```

### Convex Backend

```bash
cd packages/backend && pnpm dev    # Start Convex dev server (requires login)
cd packages/backend && pnpm deploy # Deploy to production
```

### Testing (when added)

```bash
pnpm test                 # Run all tests
pnpm test:web             # Run web tests only
pnpm turbo run test --filter=@trainers/web -- --run src/path/to/file.test.ts
```

---

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** with `noUncheckedIndexedAccess` and `noImplicitOverride`
- Use `type` keyword for type-only imports (inline style):
  ```typescript
  import { type Metadata } from "next";
  import { type VariantProps } from "class-variance-authority";
  ```
- Prefix unused variables with `_` to silence warnings:
  ```typescript
  const [_unused, setUsed] = useState();
  ```
- Avoid `any` - use `unknown` and narrow types instead
- Export types alongside their schemas/functions

### Prettier (enforced)

```javascript
{
  semi: true,              // Always use semicolons
  singleQuote: false,      // Use double quotes "
  tabWidth: 2,             // 2 space indentation
  trailingComma: "es5",    // Trailing commas where valid in ES5
  printWidth: 80,          // Line width limit
}
```

Tailwind classes are auto-sorted via `prettier-plugin-tailwindcss`.

### ESLint Rules

- `@typescript-eslint/consistent-type-imports`: Enforces `type` imports
- `@typescript-eslint/no-unused-vars`: Warn (use `_` prefix to ignore)
- `@typescript-eslint/no-empty-object-type`: Off (allows `{}` types)

### Naming Conventions

| Item                | Convention         | Example                                 |
| ------------------- | ------------------ | --------------------------------------- |
| Files (components)  | kebab-case         | `post-card.tsx`, `like-button.tsx`      |
| Files (utilities)   | kebab-case         | `format-date.ts`, `cn.ts`               |
| React Components    | PascalCase         | `PostCard`, `LikeButton`                |
| Functions/variables | camelCase          | `getUserById`, `isLoading`              |
| Constants           | SCREAMING_SNAKE    | `MAX_POST_LENGTH`, `API_URL`            |
| Types/Interfaces    | PascalCase         | `UserProfile`, `PostData`               |
| Zod schemas         | camelCase + Schema | `userProfileSchema`, `createPostSchema` |

### Component Patterns

```typescript
// Use forwardRef for components that need ref access
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button ref={ref} className={cn(...)} {...props} />;
  }
);
Button.displayName = "Button"; // Always set displayName
```

### Error Handling

- Use `throw new Error("message")` in Convex mutations for auth/validation errors
- Return `null` from queries when data not found (don't throw)
- Use try/catch in Server Actions, return error objects:
  ```typescript
  try {
    await doSomething();
    return { success: true };
  } catch (error) {
    return { success: false, error: "Something went wrong" };
  }
  ```

---

## Architecture Guidelines

### React Server Components (RSC)

- **Server Components are the default** - no directive needed
- Use `"use client"` only at leaf nodes for interactivity
- Push client boundaries down as far as possible

| Use Server Component | Use Client Component        |
| -------------------- | --------------------------- |
| Data fetching        | useState/useEffect          |
| Static content       | Event handlers (onClick)    |
| Layouts, pages       | Form inputs with live state |
| SEO-critical content | Optimistic UI updates       |

### Data Fetching Strategy

| Context                        | Tool                             |
| ------------------------------ | -------------------------------- |
| Server Components              | Direct Convex/API calls          |
| Form submissions               | Server Actions                   |
| Client-side polling/pagination | TanStack Query                   |
| Optimistic updates             | Client component + Server Action |

### Server Actions

Place in `apps/web/src/actions/` directory:

```typescript
"use server";

export async function createPost(formData: FormData) {
  const text = formData.get("text") as string;
  // Validate, call Convex, return result
}
```

### Convex Patterns

```typescript
// Queries - return null if not found, don't throw
export const getUser = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_id", (q) => q.eq("id", args.id))
      .unique();
  },
});

// Mutations - throw on auth/validation errors
export const updateUser = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    // ...
  },
});
```

---

## Platform-Specific Notes

### React Version

Both web and mobile use **React 19.1** for consistency across the monorepo (Next.js 16 + Expo 54).

**Important:** Always use the lowest common denominator React version across the monorepo. This is typically dictated by Expo/React Native, which lags behind web frameworks. Check the [Expo SDK bundledNativeModules.json](https://github.com/expo/expo/blob/sdk-54/packages/expo/bundledNativeModules.json) for the required React version before upgrading.

### Tailwind Versions

- **Web**: Tailwind CSS 4.x (uses `@tailwindcss/postcss`, `@import "tailwindcss"`)
- **Mobile**: Tailwind CSS 3.x via NativeWind (uses `@tailwind base/components/utilities`)

### Import Aliases

| App    | Alias | Path      |
| ------ | ----- | --------- |
| Web    | `@/*` | `./src/*` |
| Mobile | `@/*` | `./src/*` |

---

## File Organization

```
apps/web/src/
├── app/           # Next.js App Router pages
├── components/    # App-specific components
│   ├── layout/    # Header, sidebar, nav (Server)
│   ├── feed/      # Feed components (mostly Server)
│   ├── post/      # Post components (mixed)
│   └── ui/        # Local UI primitives
├── actions/       # Server Actions
├── lib/           # Utilities, API clients
└── styles/        # Global CSS

packages/ui/src/   # Shared components (Button, Card, Input, etc.)
packages/validators/src/  # Zod schemas and inferred types
packages/backend/convex/  # Convex schema, queries, mutations
```

---

## Environment Variables

Required variables (create `.env.local` from `.env.example`):

```bash
# Convex
CONVEX_DEPLOYMENT=         # Convex deployment URL
NEXT_PUBLIC_CONVEX_URL=    # Public Convex URL for web

# Bluesky OAuth (Phase 2)
BLUESKY_CLIENT_ID=         # OAuth client ID
BLUESKY_REDIRECT_URI=      # OAuth callback URL
```

Never commit `.env`, `.env.local`, or files containing secrets.
