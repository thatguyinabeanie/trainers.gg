---
applyTo: "**/*.tsx"
excludeAgent: "coding-agent"
---

# Code Review — UI Components

- shadcn/ui v4 with **Base UI** primitives (not Radix). `asChild` does not exist in Base UI — do not suggest it.
- Never render raw enum/DB values in UI — map through label constants (e.g., `SOCIAL_PLATFORM_LABELS`).
- Use `cn()` from `@/lib/utils` for dynamic Tailwind classes — never template literals (causes purge issues).
- Next.js 16 uses `proxy.ts` (at `src/proxy.ts`), not `middleware.ts`. Do not reference middleware patterns.
