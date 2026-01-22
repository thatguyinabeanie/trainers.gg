# Figma Integration & Design System Guide

This document provides comprehensive guidelines for integrating Figma designs into the BattleStadium codebase using the Model Context Protocol (MCP) and following the established design system patterns.

---

## Table of Contents

1. [Design System Structure](#design-system-structure)
2. [Token Definitions](#token-definitions)
3. [Component Library](#component-library)
4. [Frameworks & Libraries](#frameworks--libraries)
5. [Styling Approach](#styling-approach)
6. [Icon System](#icon-system)
7. [Form Patterns](#form-patterns)
8. [Project Structure](#project-structure)
9. [Figma-to-Code Workflow](#figma-to-code-workflow)

---

## Design System Structure

### Architecture Overview

The BattleStadium design system is built on:

- **Design Tokens**: CSS custom properties (CSS variables) with HSL color format
- **Component Primitives**: Radix UI for accessibility and behavior
- **Styling Layer**: Tailwind CSS 4 utility-first framework
- **Component Variants**: `class-variance-authority` (cva) for systematic variant management
- **Theme System**: Dark/light mode via `next-themes`

---

## Token Definitions

### Location

**Primary Token File**: `/src/app/globals.css`

### Token Structure

Design tokens are defined using CSS custom properties with HSL values for easy theme manipulation:

```css
/* globals.css */
:root {
  /* Semantic color tokens */
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 3.9%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(0 0% 3.9%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(0 0% 3.9%);
  --primary: hsl(0 0% 9%);
  --primary-foreground: hsl(0 0% 98%);
  --secondary: hsl(0 0% 96.1%);
  --secondary-foreground: hsl(0 0% 9%);
  --muted: hsl(0 0% 96.1%);
  --muted-foreground: hsl(0 0% 45.1%);
  --accent: hsl(0 0% 96.1%);
  --accent-foreground: hsl(0 0% 9%);
  --destructive: hsl(0 84.2% 60.2%);
  --destructive-foreground: hsl(0 0% 98%);

  /* Border & input tokens */
  --border: hsl(0 0% 89.8%);
  --input: hsl(0 0% 89.8%);
  --ring: hsl(0 0% 3.9%);

  /* Radius token */
  --radius: 0.5rem;

  /* Chart color tokens */
  --chart-1: hsl(12 76% 61%);
  --chart-2: hsl(173 58% 39%);
  --chart-3: hsl(197 37% 24%);
  --chart-4: hsl(43 74% 66%);
  --chart-5: hsl(27 87% 67%);
}

.dark {
  /* Dark mode overrides */
  --background: hsl(0 0% 3.9%);
  --foreground: hsl(0 0% 98%);
  --primary: hsl(0 0% 98%);
  --primary-foreground: hsl(0 0% 9%);
  /* ... etc */
}
```

### Tailwind Integration

Tokens are mapped to Tailwind utilities in `tailwind.config.ts`:

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      ring: "hsl(var(--ring))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
      // ... etc
    },
    borderRadius: {
      lg: "var(--radius)",
      md: "calc(var(--radius) - 2px)",
      sm: "calc(var(--radius) - 4px)",
    },
  },
}
```

### Mapping Figma Colors to Tokens

When extracting colors from Figma designs:

1. **Identify semantic purpose** (not just color value)
2. **Map to existing tokens** when possible:
   - Primary actions → `primary` / `primary-foreground`
   - Secondary actions → `secondary` / `secondary-foreground`
   - Destructive actions → `destructive` / `destructive-foreground`
   - Muted/disabled states → `muted` / `muted-foreground`
   - Backgrounds → `background` / `card`
   - Text → `foreground` / `muted-foreground`
   - Borders → `border` / `input`
3. **Add custom tokens** only when semantic meaning doesn't match existing tokens
4. **Use HSL format** for all new color tokens

**Example Mapping**:

```typescript
// ✅ Good: Using semantic tokens
className="bg-primary text-primary-foreground"

// ❌ Bad: Hardcoding colors
className="bg-black text-white"

// ✅ Good: Custom token for brand color
:root {
  --pokemon-red: hsl(0 100% 50%);
}
```

---

## Component Library

### Core Component System

**Location**: `/src/components/ui/`

**Technology**: shadcn/ui components built on Radix UI primitives

### Available Components

Complete shadcn/ui component library including:

```
accordion       alert-dialog    alert           avatar
badge           breadcrumb      button          calendar
card            carousel        checkbox        collapsible
command         context-menu    dialog          drawer
dropdown-menu   form            hover-card      input
label           menubar         pagination      popover
progress        radio-group     resizable       scroll-area
select          separator       sheet           skeleton
slider          sonner          switch          table
tabs            textarea        toast           toaster
toggle-group    toggle          tooltip
```

**Custom Components**:

- `permission-button.tsx` - Permission-aware button component

### Component Architecture Pattern

All shadcn/ui components follow this structure:

```typescript
// Example: button.tsx
import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// 1. Define variants using class-variance-authority
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// 2. Component accepts variant props + standard HTML props
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> &
  { asChild?: boolean }) {

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

### Key Patterns

1. **Variant System**: Use `cva` for systematic variant management
2. **Composition**: Use `asChild` prop with Radix Slot for component composition
3. **Type Safety**: Leverage `VariantProps` for TypeScript variant types
4. **ClassName Merging**: Always use `cn()` utility for className conflicts
5. **Data Attributes**: Use `data-slot` for component identification

### Composing Complex Components

Example of card composition:

```typescript
// card.tsx
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

function Card({ className, asChild = false, ...props }: CardProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
```

**Usage**:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Tournament Bracket</CardTitle>
    <CardDescription>Round 1 matchups</CardDescription>
  </CardHeader>
  <CardContent>{/* Content here */}</CardContent>
  <CardFooter>
    <Button>View Full Bracket</Button>
  </CardFooter>
</Card>
```

---

## Frameworks & Libraries

### Core Technology Stack

```json
{
  "runtime": "bun",
  "framework": "next@15.5.4",
  "react": "19.1.1",
  "backend": "convex@1.27.3",
  "ui": {
    "primitives": "@radix-ui/react-*",
    "styling": "tailwindcss@4.1.13",
    "variants": "class-variance-authority@0.7.1",
    "utils": ["clsx@2.1.1", "tailwind-merge@3.3.1"],
    "icons": "lucide-react@0.511.0",
    "theme": "next-themes@0.4.6"
  },
  "forms": {
    "validation": "zod@3.25.76",
    "management": "react-hook-form@7.63.0",
    "resolver": "@hookform/resolvers@5.2.2"
  },
  "testing": {
    "unit": "vitest@3.2.4",
    "e2e": "@playwright/test@1.55.1",
    "mcp": "@playwright/mcp@0.0.40"
  }
}
```

### Build System

- **Package Manager**: Bun (always use `bun` or `bunx`)
- **Bundler**: Next.js built-in (Turbopack in dev mode)
- **PostCSS**: Tailwind CSS 4 integration via `@tailwindcss/postcss`
- **TypeScript**: v5.9.2 with strict mode

---

## Styling Approach

### Utility-First with Tailwind CSS 4

**Philosophy**: Compose styles using Tailwind utility classes, avoid custom CSS unless absolutely necessary.

### The `cn()` Utility

**Location**: `/src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Purpose**:

- Merges multiple className strings
- Resolves Tailwind class conflicts (e.g., `p-4` + `p-2` → `p-2`)
- Handles conditional classes

**Usage**:

```typescript
// ✅ Always use cn() for className composition
<div className={cn("flex items-center", isActive && "bg-primary", className)} />

// ❌ Never concatenate classNames directly
<div className={`flex items-center ${isActive ? "bg-primary" : ""} ${className}`} />
```

### Responsive Design Patterns

```tsx
// Mobile-first approach
<div className="flex flex-col md:flex-row lg:gap-8">
  <div className="w-full md:w-1/2 lg:w-1/3">{/* Content */}</div>
</div>
```

### Dark Mode Implementation

```tsx
// Dark mode variants
<div className="bg-background text-foreground dark:bg-accent/50">
  <p className="text-muted-foreground">This text adapts to theme</p>
</div>
```

### Container Queries

```tsx
// Use @container for component-level responsive design
<div className="@container">
  <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3">
    {/* Responsive to container, not viewport */}
  </div>
</div>
```

### Spacing System

Follow Tailwind's spacing scale (4px base unit):

```tsx
// ✅ Good: Use Tailwind spacing scale
className = "gap-2 p-4 mb-6"; // 8px, 16px, 24px

// ❌ Bad: Arbitrary values without reason
className = "gap-[13px] p-[17px]";
```

**When to use arbitrary values**:

- Matching exact Figma specs that don't align with spacing scale
- Unique brand requirements
- One-off design exceptions

```tsx
// ✅ Acceptable: Matching specific Figma design
className = "h-[52px]"; // Exact height from Figma
```

---

## Icon System

### Lucide React Icons

**Package**: `lucide-react@0.511.0`

**Usage Pattern**:

```typescript
import { Loader2, Plus, Search, Eye, Edit, Users, Trophy } from "lucide-react";

// In component
<Button>
  <Plus className="size-4" />
  Create Tournament
</Button>

// Loading state
{isLoading && <Loader2 className="size-4 animate-spin" />}

// Icon-only button
<Button size="icon" variant="ghost">
  <Search className="size-4" />
</Button>
```

### Icon Guidelines

1. **Sizing**: Use `size-{n}` utility for consistent icon sizes
   - Small icons: `size-4` (16px)
   - Medium icons: `size-5` (20px)
   - Large icons: `size-6` (24px)

2. **Color**: Icons inherit text color by default

   ```tsx
   <Users className="text-muted-foreground" />
   ```

3. **Accessibility**: Always provide context

   ```tsx
   <Button aria-label="Search tournaments">
     <Search className="size-4" />
   </Button>
   ```

4. **Animated Icons**: Use for loading states
   ```tsx
   <Loader2 className="size-4 animate-spin" />
   ```

### Custom SVG Icons

If custom icons are needed:

1. **Inline SVG** for simple, one-off icons
2. **Component wrapper** for reusable custom icons
3. **Follow Lucide sizing conventions**

```typescript
// Custom icon component
export function CustomIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {/* SVG paths */}
    </svg>
  );
}
```

---

## Form Patterns

### React Hook Form + Zod Integration

**Standard Pattern** for all forms in BattleStadium:

```typescript
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex/api";
import { useToast } from "@/hooks/use-toast";

// 1. Define Zod schema for validation
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  maxParticipants: z.number().int().positive().max(1024),
});

// 2. Infer TypeScript type from schema
type FormData = z.infer<typeof formSchema>;

export default function CreateTournamentForm() {
  const createTournament = useMutation(api.tournaments.mutations.create);
  const { toast } = useToast();

  // 3. Initialize form with zodResolver
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      maxParticipants: 32,
    },
  });

  // 4. Handle form submission
  async function onSubmit(values: FormData) {
    try {
      await createTournament(values);
      toast({ title: "Tournament created successfully" });
      form.reset();
    } catch (error) {
      toast({
        title: "Error creating tournament",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }

  // 5. Render form with Form components
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tournament Name</FormLabel>
              <FormControl>
                <Input placeholder="Summer Championship" {...field} />
              </FormControl>
              <FormDescription>
                This is your tournament's public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="organizer@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating..." : "Create Tournament"}
        </Button>
      </form>
    </Form>
  );
}
```

### Zod Schema Patterns

**Common validation patterns**:

```typescript
// String validations
z.string().min(3).max(20);
z.string().email();
z.string().url();
z.string().regex(
  /^[a-zA-Z0-9_-]+$/,
  "Only letters, numbers, dash, and underscore"
);

// Number validations
z.number().int();
z.number().positive();
z.number().min(1).max(1024);

// Enum/union validations
z.enum(["swiss", "single-elimination", "round-robin"]);
z.union([z.string(), z.number()]);

// Optional/nullable fields
z.string().optional();
z.string().nullable();
z.string().nullish(); // Both optional and nullable

// Date validations
z.string().datetime();
z.date();

// Object validations
z.object({
  name: z.string(),
  settings: z.object({
    maxRounds: z.number(),
  }),
});

// Array validations
z.array(z.string());
z.array(z.object({ id: z.string() }))
  .min(1)
  .max(10);

// Refinements (custom validation)
z.string().refine((val) => val.length > 0, {
  message: "Value cannot be empty",
});

// Transform values
z.string().transform((val) => val.trim());
```

### Form Accessibility

Always include:

1. **FormLabel** - Associates label with input
2. **FormDescription** - Provides context and hints
3. **FormMessage** - Displays validation errors
4. **aria-invalid** - Automatically handled by FormControl
5. **aria-describedby** - Automatically handled by FormControl

---

## Project Structure

### Next.js App Router Organization

```
src/
├── app/                          # Next.js App Router
│   ├── (auth-pages)/            # Auth route group (separate layout)
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── create-profile/
│   ├── (app-pages)/             # Main app route group
│   │   ├── admin/               # Admin pages
│   │   ├── organizations/       # Organization pages
│   │   ├── tournaments/         # Tournament pages
│   │   ├── settings/            # User settings
│   │   ├── analytics/           # Analytics pages
│   │   └── articles/            # Content pages
│   ├── auth/                    # Auth callback routes
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles & tokens
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── typography/              # Typography components
│   ├── auth/                    # Auth-related components
│   ├── admin/                   # Admin components
│   ├── dashboard/               # Dashboard components
│   └── [feature-components].tsx # Feature-specific components
│
├── hooks/                        # Custom React hooks
│   ├── use-permissions.ts
│   ├── use-toast.ts
│   └── use-is-client.ts
│
├── lib/                          # Shared utilities & domain logic
│   ├── constants/               # Application constants
│   │   └── permissions.ts
│   ├── convex/                  # Convex client utilities
│   ├── pokemon/                 # Pokemon domain logic
│   ├── tournament/              # Tournament domain logic
│   ├── types/                   # Shared TypeScript types
│   └── utils.ts                 # Utility functions (cn(), etc.)
│
├── types/                        # Global TypeScript types
│
└── _tests_/                      # Test files (colocated structure)
    ├── database/
    ├── lib/
    └── scripts/

convex/                           # Convex backend
├── schema.ts                     # Database schema
├── auth.ts                       # Auth functions
├── permissions.ts                # Permission utilities
├── permissionKeys.ts             # Permission constants
├── tournaments/                  # Tournament domain
│   ├── queries.ts
│   └── mutations.ts
├── organizations/                # Organization domain
│   ├── queries.ts
│   └── mutations.ts
└── _generated/                   # Auto-generated types
```

### Path Aliases

**CRITICAL**: Always use path aliases for imports in frontend code (`src/` directory):

```typescript
// ✅ Correct: Use path aliases
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/use-permissions";
import { api } from "@/lib/convex/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { PermissionKey } from "@/lib/constants/permissions";

// ❌ Wrong: Relative imports in frontend
import { Button } from "../../components/ui/button";
import { usePermission } from "../hooks/use-permissions";
```

**Available Aliases**:

| Alias            | Target                        | Usage                    |
| ---------------- | ----------------------------- | ------------------------ |
| `@/*`            | `src/*`                       | General imports from src |
| `@/components/*` | `src/components/*`            | UI components            |
| `@/ui/*`         | `src/components/ui/*`         | shadcn/ui components     |
| `@/typography/*` | `src/components/typography/*` | Typography               |
| `@/hooks/*`      | `src/hooks/*`                 | Custom hooks             |
| `@/lib/*`        | `src/lib/*`                   | Utilities & domain logic |
| `@/constants/*`  | `src/lib/constants/*`         | Constants                |
| `@/utils/*`      | `src/lib/utils/*`             | Utility functions        |
| `@/types/*`      | `src/types/*`                 | Type definitions         |
| `@/app/*`        | `src/app/*`                   | App Router pages         |
| `@/convex`       | `convex/`                     | Convex backend root      |
| `@/convex/*`     | `convex/*`                    | Convex functions         |

**⚠️ IMPORTANT: Convex Backend Exception**

**Convex backend code (files in `convex/` directory) CANNOT use path aliases**. Always use relative imports:

```typescript
// ✅ Correct: Relative imports in Convex backend
import { query, mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { hasPermission } from "./permissions";
import { PermissionKey } from "./permissionKeys";

// ❌ Wrong: Path aliases in Convex backend (will cause errors!)
import { PermissionKey } from "@/lib/constants/permissions";
```

**Sharing Types Between Frontend and Backend**:

1. Define type in `convex/` directory (e.g., `convex/permissionKeys.ts`)
2. Frontend imports via path alias: `import type { PermissionKey } from "@/convex/permissionKeys";`
3. Backend imports via relative path: `import { PermissionKey } from "./permissionKeys";`

### Component Organization

**Feature Components** should be colocated with their routes when possible:

```
app/(app-pages)/tournaments/
├── page.tsx                 # Main tournaments list
├── [id]/
│   ├── page.tsx            # Tournament detail page
│   ├── edit/
│   │   └── page.tsx        # Edit tournament page
│   └── components/         # Components specific to this route
│       ├── BracketView.tsx
│       └── ParticipantList.tsx
```

**Shared Components** should be in `/src/components/`:

```
components/
├── ui/                     # shadcn/ui base components
├── dashboard/              # Dashboard-specific shared components
├── organization-switcher.tsx
└── notification-bell.tsx
```

---

## Figma-to-Code Workflow

### 🚨 MANDATORY: Figma-First Development

**Before writing ANY UI code, you MUST consult Figma designs first.** Figma is the single source of truth for all visual design.

### Step-by-Step Workflow

#### 1. Obtain Figma Reference

Users provide Figma reference in one of two ways:

**Option A: Figma URL**

URL format:

```
https://figma.com/design/:fileKey/:fileName?node-id=:int1-:int2
```

Example:

```
https://figma.com/design/pqrs/ExampleFile?node-id=1-2
```

Extract parameters:

- **fileKey**: `pqrs`
- **nodeId**: `1:2` (replace `-` with `:`)

**Option B: Figma Desktop Selection**

User selects a frame in Figma Desktop app and provides:

- **fileKey**: Direct value (e.g., `"abc123"`)
- **nodeId**: Direct value (e.g., `"45:67"`)

#### 2. Fetch Design from Figma via MCP

Use Figma MCP tools in this order:

```typescript
// 1. Get screenshot to visualize the design
mcp__figma -
  remote -
  mcp__get_screenshot({
    fileKey: "pqrs",
    nodeId: "1:2",
    clientLanguages: "typescript",
    clientFrameworks: "react,nextjs",
  });

// 2. Get generated code as starting point
mcp__figma -
  remote -
  mcp__get_code({
    fileKey: "pqrs",
    nodeId: "1:2",
    clientLanguages: "typescript",
    clientFrameworks: "react,nextjs",
  });

// 3. (Optional) Get metadata for structure understanding
mcp__figma -
  remote -
  mcp__get_metadata({
    fileKey: "pqrs",
    nodeId: "1:2",
    clientLanguages: "typescript",
    clientFrameworks: "react,nextjs",
  });
```

#### 3. Extract Design Tokens from Figma

Analyze the Figma design and map to Tailwind utilities:

**Colors**:

```typescript
// Figma: #000000 (primary button background)
// Token: --primary: hsl(0 0% 9%)
// Tailwind: bg-primary text-primary-foreground
```

**Spacing**:

```typescript
// Figma: 16px padding
// Tailwind: p-4

// Figma: 8px gap between items
// Tailwind: gap-2

// Figma: 24px margin bottom
// Tailwind: mb-6
```

**Typography**:

```typescript
// Figma: 14px, 500 weight, 20px line height
// Tailwind: text-sm font-medium leading-5

// Figma: 32px, 700 weight
// Tailwind: text-3xl font-bold
```

**Border Radius**:

```typescript
// Figma: 8px radius
// Token: var(--radius) = 0.5rem
// Tailwind: rounded-md

// Figma: 12px radius
// Tailwind: rounded-xl
```

**Shadows**:

```typescript
// Figma: 0 1px 2px rgba(0,0,0,0.05)
// Tailwind: shadow-sm

// Figma: 0 4px 6px rgba(0,0,0,0.1)
// Tailwind: shadow
```

#### 4. Adapt Figma-Generated Code

Figma-generated code is a **starting point**, not the final implementation. You must:

1. **Replace generic components** with shadcn/ui equivalents:

   ```typescript
   // ❌ Figma generated
   <button className="...">Click</button>

   // ✅ Adapt to project standards
   <Button variant="default" size="default">Click</Button>
   ```

2. **Use path aliases** for all imports:

   ```typescript
   // ❌ Figma generated
   import { Button } from "./components/Button";

   // ✅ Adapt to project standards
   import { Button } from "@/components/ui/button";
   ```

3. **Apply design tokens** instead of hardcoded values:

   ```typescript
   // ❌ Figma generated
   <div style={{ backgroundColor: "#000000", color: "#FFFFFF" }}>

   // ✅ Adapt to project standards
   <div className="bg-primary text-primary-foreground">
   ```

4. **Use Convex types** for data:

   ```typescript
   // ❌ Figma generated
   interface Tournament {
     id: string;
     name: string;
   }

   // ✅ Adapt to project standards
   import type { Doc } from "@/convex/_generated/dataModel";
   type Tournament = Doc<"tournaments">;
   ```

5. **Add form validation** with Zod:

   ```typescript
   // ❌ Figma generated
   const [name, setName] = useState("");

   // ✅ Adapt to project standards
   const formSchema = z.object({
     name: z.string().min(2).max(100),
   });
   const form = useForm<z.infer<typeof formSchema>>({
     resolver: zodResolver(formSchema),
   });
   ```

6. **Add Figma reference** in component comments:
   ```typescript
   /**
    * TournamentCard component
    * Figma: https://figma.com/design/pqrs/ExampleFile?node-id=1-2
    */
   export function TournamentCard({ tournament }: TournamentCardProps) {
     // ...
   }
   ```

#### 5. Verify Pixel-Perfect Implementation

Cross-reference your implementation with the Figma screenshot:

- ✅ Spacing matches (padding, margin, gap)
- ✅ Colors match semantic tokens
- ✅ Typography matches (size, weight, line height)
- ✅ Border radius matches
- ✅ Layout structure matches (flex, grid)
- ✅ Responsive behavior considered
- ✅ Dark mode handled (if applicable)

#### 6. Test with Playwright MCP

Use Playwright MCP to verify UI functionality:

```typescript
// Navigate to page
mcp__playwright__browser_navigate({ url: "http://localhost:3000/tournaments" });

// Take screenshot to compare with Figma
mcp__playwright__browser_take_screenshot({ filename: "tournament-page.png" });

// Test interactions
mcp__playwright__browser_click({
  element: "Create Tournament button",
  ref: "button[type='button']",
});

// Verify form submission
mcp__playwright__browser_type({
  element: "Tournament Name input",
  ref: "input[name='name']",
  text: "Summer Championship",
});
```

### DO NOT Implement UI Without Figma

If no Figma design exists:

1. **STOP** immediately
2. **Ask the user** for the Figma URL or to select a frame in Figma Desktop
3. **Never guess** at UI implementation
4. **Never proceed** without design reference

**Exception**: Minor tweaks to existing components (e.g., changing button text, adding a loading state) do not require Figma reference.

---

## Best Practices Summary

### Design Tokens

- ✅ Use semantic CSS variables from `globals.css`
- ✅ Map Figma colors to existing tokens when possible
- ✅ Use HSL format for all color values
- ✅ Support dark mode with `.dark` class overrides

### Components

- ✅ Use shadcn/ui components from `@/components/ui/`
- ✅ Use `cva` for systematic variant management
- ✅ Always use `cn()` utility for className composition
- ✅ Leverage Radix UI primitives for accessibility
- ✅ Export both component and variant types

### Styling

- ✅ Utility-first approach with Tailwind CSS 4
- ✅ Use path aliases for all imports (`@/`)
- ✅ Follow Tailwind spacing scale (4px base unit)
- ✅ Use container queries for component-level responsive design
- ✅ Dark mode classes (e.g., `dark:bg-accent`)

### Icons

- ✅ Use lucide-react for all icons
- ✅ Consistent sizing with `size-{n}` utilities
- ✅ Icons inherit text color by default
- ✅ Provide aria-labels for icon-only buttons

### Forms

- ✅ Use react-hook-form + zodResolver pattern
- ✅ Define Zod schemas for all validation
- ✅ Use shadcn/ui Form components for structure
- ✅ Handle errors with toast notifications
- ✅ Show loading states during submission

### Figma Integration

- ✅ **ALWAYS fetch Figma design first** before implementing UI
- ✅ Extract fileKey and nodeId correctly (URL or Desktop selection)
- ✅ Use `get_screenshot` to visualize, `get_code` for starting point
- ✅ Map Figma colors to semantic design tokens
- ✅ Adapt generated code to project patterns
- ✅ Verify pixel-perfect implementation against Figma
- ✅ Add Figma URL reference in component comments
- ✅ Test with Playwright MCP after implementation

### Project Organization

- ✅ Use route groups in App Router: `(auth-pages)`, `(app-pages)`
- ✅ Colocate feature components with routes
- ✅ Shared components in `/src/components/`
- ✅ Custom hooks in `/src/hooks/`
- ✅ Path aliases for all frontend imports
- ✅ Relative imports only for Convex backend

---

## Additional Resources

- **Figma MCP Documentation**: [MCP Figma Tools](https://github.com/modelcontextprotocol/servers/tree/main/src/figma)
- **shadcn/ui Documentation**: [https://ui.shadcn.com/](https://ui.shadcn.com/)
- **Tailwind CSS Documentation**: [https://tailwindcss.com/](https://tailwindcss.com/)
- **Radix UI Documentation**: [https://www.radix-ui.com/](https://www.radix-ui.com/)
- **React Hook Form**: [https://react-hook-form.com/](https://react-hook-form.com/)
- **Zod Documentation**: [https://zod.dev/](https://zod.dev/)
- **Lucide Icons**: [https://lucide.dev/](https://lucide.dev/)

---

## Quick Reference

### Common Component Imports

```typescript
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Form Components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Icons
import { Plus, Search, Edit, Trash, Loader2 } from "lucide-react";

// Utilities
import { cn } from "@/lib/utils";

// Validation
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Convex
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

// Hooks
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/use-permissions";
```

### Common Figma MCP Commands

```typescript
// Get screenshot of Figma design
mcp__figma -
  remote -
  mcp__get_screenshot({
    fileKey: "YOUR_FILE_KEY",
    nodeId: "NODE:ID",
    clientLanguages: "typescript",
    clientFrameworks: "react,nextjs",
  });

// Get generated code from Figma
mcp__figma -
  remote -
  mcp__get_code({
    fileKey: "YOUR_FILE_KEY",
    nodeId: "NODE:ID",
    clientLanguages: "typescript",
    clientFrameworks: "react,nextjs",
  });
```

### Common Tailwind Patterns

```typescript
// Layout
"flex items-center justify-between";
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
"container mx-auto px-4 py-8";

// Spacing
"p-4"; // padding: 16px
"px-6 py-4"; // padding: 24px 16px
"gap-2"; // gap: 8px
"mb-6"; // margin-bottom: 24px

// Typography
"text-sm font-medium leading-5";
"text-3xl font-bold";
"text-muted-foreground";

// Borders & Radius
"border rounded-md";
"rounded-xl";
"border-border";

// Colors
"bg-primary text-primary-foreground";
"bg-card text-card-foreground";
"text-destructive";

// Shadows
"shadow-sm";
"shadow";

// Dark Mode
"dark:bg-accent/50";
"dark:text-foreground";
```

---

**Document Version**: 1.0
**Last Updated**: 2025-09-27
**Maintained By**: tournament-app-developer agent
