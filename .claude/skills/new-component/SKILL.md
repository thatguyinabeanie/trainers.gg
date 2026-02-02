---
name: new-component
description: Add or create a UI component following project conventions (shadcn/ui v4, Base UI primitives, no asChild)
---

# New Component

Add or create a UI component in the trainers.gg web app following project conventions.

## Arguments

- `name` (required): Component name in kebab-case (e.g., `status-badge`, `team-card`)

## Before Creating

1. **Check if it already exists**: Search `apps/web/src/components/ui/` for the component
2. **Check shadcn registry**: Use the shadcn MCP `search_items_in_registries` tool with `["@shadcn"]` to find existing components
3. **If shadcn has it**: Install with `npx shadcn@latest add <component-name>` — do NOT manually create it

## Creating a Custom Component

### File Location

- **UI primitives** (reusable, generic): `apps/web/src/components/ui/<name>.tsx`
- **Feature components** (domain-specific): `apps/web/src/components/<feature>/<name>.tsx`

### Naming

- **File**: kebab-case (e.g., `status-badge.tsx`)
- **Component export**: PascalCase (e.g., `StatusBadge`)
- **Props type**: PascalCase + Props (e.g., `StatusBadgeProps`)

## Critical Rules

1. **Base UI, NOT Radix**: This project uses `@base-ui/react` primitives. NEVER import from `@radix-ui/*`
2. **No `asChild` prop**: Base UI does not support `asChild`. Use `render` prop or direct composition instead
3. **Use `cn()` for classes**: Always import from `@/lib/utils` for conditional/merged class names
4. **Tailwind CSS 4**: Use Tailwind utility classes. Avoid inline styles
5. **Server Components by default**: Only add `"use client"` if the component needs interactivity (event handlers, hooks, browser APIs)
6. **CSS-first animations**: Use Tailwind animation utilities (`tw-animate-css`), NOT Framer Motion (which forces client components)
7. **Type imports**: Use `import { type X } from "..."` for type-only imports

## Component Template

```tsx
import { cn } from "@/lib/utils";

interface ComponentNameProps {
  className?: string;
  children?: React.ReactNode;
}

export function ComponentName({ className, children }: ComponentNameProps) {
  return <div className={cn("base-classes-here", className)}>{children}</div>;
}
```

## Client Component Template

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ComponentNameProps {
  className?: string;
}

export function ComponentName({ className }: ComponentNameProps) {
  const [state, setState] = useState(false);

  return (
    <div className={cn("base-classes-here", className)}>
      {/* interactive content */}
    </div>
  );
}
```

## Design Tokens & Conventions

- **Theme colors**: Use CSS variables via Tailwind classes (`text-primary`, `bg-muted`, `border-border`, `text-muted-foreground`)
- **Status colors**: emerald = active, blue = upcoming, amber = draft, gray = completed, red = cancelled
- **Design style**: Minimal flat design — no borders unless necessary, subtle background differentiation, consistent spacing
- **Icons**: Use `lucide-react` for icons
- **Teal primary**: Single accent color across interactive elements (buttons, links, focus rings)

## Conditional Classes Example

```tsx
// Always use cn() — never template literal concatenation (breaks Tailwind purge)
import { cn } from "@/lib/utils";

<div
  className={cn(
    "rounded-lg p-4",
    isActive
      ? "bg-primary text-primary-foreground"
      : "bg-muted text-muted-foreground",
    className
  )}
/>;
```

## After Creating

1. Verify the component renders correctly in the browser (use Playwright MCP if available)
2. Check that no `@radix-ui` imports were accidentally included
3. Confirm `"use client"` is only present if genuinely needed
