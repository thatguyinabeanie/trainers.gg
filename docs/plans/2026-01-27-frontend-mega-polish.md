# Frontend Mega Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform trainers.gg into a polished, premium experience across all pages with responsive design and PWA readiness

**Architecture:** CSS-first animations, Server Components preserved, progressive disclosure UI, mobile-first responsive patterns

**Tech Stack:** Tailwind CSS 4, shadcn/ui (Base UI), CSS custom properties, Next.js 16 App Router

---

## Phase 1: Foundation & Design System

### Task 1: Add CSS Animation Utilities

**Files:**

- Modify: `apps/web/src/styles/globals.css`

**Step 1:** Add animation keyframes and utilities

```css
/* Animation keyframes */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes slide-in-from-bottom {
  from {
    transform: translateY(4px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slide-in-from-top {
  from {
    transform: translateY(-4px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pulse-subtle {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Utility classes */
.animate-in {
  animation-duration: 300ms;
  animation-timing-function: ease-out;
  animation-fill-mode: both;
}

.fade-in {
  animation-name: fade-in;
}

.slide-in-from-bottom {
  animation-name: slide-in-from-bottom;
}

.slide-in-from-top {
  animation-name: slide-in-from-top;
}

.duration-200 {
  animation-duration: 200ms;
}

.duration-300 {
  animation-duration: 300ms;
}

.duration-500 {
  animation-duration: 500ms;
}

/* Stagger delays for lists */
.delay-75 {
  animation-delay: 75ms;
}
.delay-150 {
  animation-delay: 150ms;
}
.delay-225 {
  animation-delay: 225ms;
}
.delay-300 {
  animation-delay: 300ms;
}
```

**Step 2:** Add scrollbar-hide utility for horizontal scroll containers

```css
/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

**Step 3:** Verify styles compile without errors

Run: `pnpm dev:web`

**Step 4:** Commit

```bash
git add apps/web/src/styles/globals.css
git commit -m "feat(ui): add CSS animation utilities and scrollbar-hide

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Create Status Color Utilities

**Files:**

- Modify: `apps/web/src/styles/globals.css`

**Step 1:** Add semantic status color variables

```css
/* Status colors - consistent across the app */
:root {
  --status-active: oklch(0.765 0.177 163.22); /* emerald-500 */
  --status-upcoming: oklch(0.623 0.214 259.13); /* blue-500 */
  --status-draft: oklch(0.769 0.188 70.08); /* amber-500 */
  --status-completed: oklch(0.551 0.027 264.36); /* gray-500 */
  --status-cancelled: oklch(0.637 0.237 25.33); /* red-500 */
}

.dark {
  --status-active: oklch(0.765 0.177 163.22);
  --status-upcoming: oklch(0.623 0.214 259.13);
  --status-draft: oklch(0.769 0.188 70.08);
  --status-completed: oklch(0.551 0.027 264.36);
  --status-cancelled: oklch(0.637 0.237 25.33);
}
```

**Step 2:** Commit

```bash
git add apps/web/src/styles/globals.css
git commit -m "feat(ui): add semantic status color variables

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Create StatusBadge Component

**Files:**

- Create: `apps/web/src/components/ui/status-badge.tsx`

**Step 1:** Create the component

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "active" | "upcoming" | "draft" | "completed" | "cancelled";

const statusConfig: Record<Status, { label: string; className: string }> = {
  active: {
    label: "Active",
    className:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  },
  upcoming: {
    label: "Upcoming",
    className:
      "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
  draft: {
    label: "Draft",
    className:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  },
  completed: {
    label: "Completed",
    className:
      "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25",
  },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
```

**Step 2:** Commit

```bash
git add apps/web/src/components/ui/status-badge.tsx
git commit -m "feat(ui): add StatusBadge component with semantic colors

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Responsive Fixes

### Task 4: Fix Tournament Management Tab Overflow

**Files:**

- Modify: `apps/web/src/app/to-dashboard/[orgSlug]/tournaments/[tournamentSlug]/manage/page.tsx`

**Step 1:** Read the current file to understand structure

**Step 2:** Wrap tabs in scrollable container with fade indicator

```tsx
{
  /* Scrollable tabs container */
}
<div className="relative">
  <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
    <Tabs defaultValue="overview" className="min-w-max md:min-w-0">
      <TabsList>
        {/* Use icons on mobile, text on larger screens */}
        <TabsTrigger value="overview" className="gap-2">
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="registrations" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Registrations</span>
        </TabsTrigger>
        <TabsTrigger value="bracket" className="gap-2">
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Bracket</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  </div>
  {/* Fade indicator for more content */}
  <div className="from-background pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l to-transparent md:hidden" />
</div>;
```

**Step 3:** Test at 375px viewport - no horizontal page scroll

**Step 4:** Commit

```bash
git add apps/web/src/app/to-dashboard/[orgSlug]/tournaments/[tournamentSlug]/manage/page.tsx
git commit -m "fix(responsive): scrollable tabs with icon-only mobile view

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Fix Header Username Overflow at Tablet

**Files:**

- Modify: `apps/web/src/components/layout/header.tsx` (or user menu component)

**Step 1:** Read the header component to find username display

**Step 2:** Change breakpoint from `sm:inline` to `lg:inline`

```tsx
{
  /* Hide username on mobile and tablet, show only on lg+ */
}
<span className="text-muted-foreground hidden max-w-32 truncate text-sm lg:inline">
  {user.username}
</span>;
```

**Step 3:** Test at 768px - username should be hidden, only avatar visible

**Step 4:** Test at 1024px+ - username should be visible

**Step 5:** Commit

```bash
git add apps/web/src/components/layout/header.tsx
git commit -m "fix(responsive): hide username at tablet breakpoint

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Create ResponsiveTable Component

**Files:**

- Create: `apps/web/src/components/ui/responsive-table.tsx`

**Step 1:** Create the component with scroll shadows

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const checkScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [checkScroll]);

  return (
    <div className="relative">
      {/* Left shadow */}
      <div
        className={cn(
          "from-background pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-4 bg-gradient-to-r to-transparent transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Scrollable container */}
      <div
        ref={containerRef}
        onScroll={checkScroll}
        className={cn("overflow-x-auto", className)}
      >
        {children}
      </div>

      {/* Right shadow */}
      <div
        className={cn(
          "from-background pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-4 bg-gradient-to-l to-transparent transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
```

**Step 2:** Commit

```bash
git add apps/web/src/components/ui/responsive-table.tsx
git commit -m "feat(ui): add ResponsiveTable with scroll shadow indicators

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Apply ResponsiveTable to Tournament List

**Files:**

- Modify: `apps/web/src/app/tournaments/page.tsx`

**Step 1:** Read the current tournament list page

**Step 2:** Wrap table sections with ResponsiveTable

```tsx
import { ResponsiveTable } from "@/components/ui/responsive-table";

// Wrap each table
<ResponsiveTable>
  <Table>{/* table content */}</Table>
</ResponsiveTable>;
```

**Step 3:** Test horizontal scroll at 768px - shadows should appear/disappear

**Step 4:** Commit

```bash
git add apps/web/src/app/tournaments/page.tsx
git commit -m "feat(responsive): wrap tournament tables in ResponsiveTable

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Add Scroll Affordance to TO Dashboard Nav

**Files:**

- Modify: `apps/web/src/app/to-dashboard/[orgSlug]/layout.tsx`

**Step 1:** Read the layout to find the navigation

**Step 2:** Add fade indicator to horizontal nav

```tsx
<div className="relative border-b">
  <div className="scrollbar-hide overflow-x-auto">
    <nav className="flex min-w-max gap-1 px-4 py-2">{/* nav items */}</nav>
  </div>
  <div className="from-background pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l to-transparent lg:hidden" />
</div>
```

**Step 3:** Commit

```bash
git add apps/web/src/app/to-dashboard/[orgSlug]/layout.tsx
git commit -m "feat(responsive): add scroll affordance to TO dashboard nav

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Interaction & Animation Polish

### Task 9: Add Card Hover Effects

**Files:**

- Modify: `apps/web/src/components/ui/card.tsx`

**Step 1:** Read the current Card component

**Step 2:** Add optional interactive variant with hover effects

```tsx
const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      interactive: {
        true: "transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      interactive: false,
    },
  }
);

interface CardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ interactive }), className)}
      {...props}
    />
  )
);
```

**Step 3:** Commit

```bash
git add apps/web/src/components/ui/card.tsx
git commit -m "feat(ui): add interactive hover variant to Card component

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Add Focus Ring Glow Effect

**Files:**

- Modify: `apps/web/src/styles/globals.css`

**Step 1:** Add focus glow utility

```css
/* Focus ring with glow effect */
.focus-glow:focus-visible {
  outline: none;
  ring: 2px;
  ring-offset: 2px;
  ring-color: hsl(var(--primary));
  box-shadow: 0 0 0 4px hsl(var(--primary) / 0.15);
}
```

**Step 2:** Commit

```bash
git add apps/web/src/styles/globals.css
git commit -m "feat(ui): add focus-glow utility class

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Add Page Entrance Animation

**Files:**

- Create: `apps/web/src/components/ui/page-container.tsx`

**Step 1:** Create a page wrapper with entrance animation

```tsx
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom duration-300",
        className
      )}
    >
      {children}
    </div>
  );
}
```

**Step 2:** Commit

```bash
git add apps/web/src/components/ui/page-container.tsx
git commit -m "feat(ui): add PageContainer with entrance animation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Empty States & Loading

### Task 12: Create EmptyState Component

**Files:**

- Create: `apps/web/src/components/ui/empty-state.tsx`

**Step 1:** Create flexible empty state component

```tsx
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "illustrated" | "minimal" | "inline";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "illustrated",
  className,
}: EmptyStateProps) {
  if (variant === "inline") {
    return (
      <p
        className={cn(
          "text-muted-foreground py-4 text-center text-sm",
          className
        )}
      >
        {title}
      </p>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn("py-8 text-center", className)}>
        <p className="text-muted-foreground">{title}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <div className="bg-muted mb-4 rounded-full p-4">
          <Icon className="text-muted-foreground h-8 w-8" />
        </div>
      )}
      <h3 className="mb-1 text-lg font-medium">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-4 max-w-sm text-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
```

**Step 2:** Commit

```bash
git add apps/web/src/components/ui/empty-state.tsx
git commit -m "feat(ui): add EmptyState component with multiple variants

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Create Skeleton Variants

**Files:**

- Modify: `apps/web/src/components/ui/skeleton.tsx`

**Step 1:** Read current skeleton component

**Step 2:** Add preset skeleton patterns

```tsx
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card space-y-3 rounded-lg border p-4", className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonTable };
```

**Step 3:** Commit

```bash
git add apps/web/src/components/ui/skeleton.tsx
git commit -m "feat(ui): add SkeletonCard and SkeletonTable presets

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Public Pages Polish

### Task 14: Add Entrance Animation to Tournament List

**Files:**

- Modify: `apps/web/src/app/tournaments/page.tsx`

**Step 1:** Read the current page

**Step 2:** Wrap content with PageContainer and add staggered card animations

```tsx
import { PageContainer } from "@/components/ui/page-container";

export default function TournamentsPage() {
  return <PageContainer>{/* existing content */}</PageContainer>;
}
```

**Step 3:** Add interactive prop to tournament cards if using Card component

**Step 4:** Commit

```bash
git add apps/web/src/app/tournaments/page.tsx
git commit -m "feat(tournaments): add page entrance animation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 15: Polish Tournament Detail Page

**Files:**

- Modify: `apps/web/src/app/tournaments/[slug]/page.tsx`

**Step 1:** Read the current page

**Step 2:** Add PageContainer wrapper

**Step 3:** Ensure status badges use StatusBadge component

**Step 4:** Commit

```bash
git add apps/web/src/app/tournaments/[slug]/page.tsx
git commit -m "feat(tournaments): polish tournament detail page

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 6: TO Dashboard Polish

### Task 16: Redesign Dashboard Overview for Clarity

**Files:**

- Modify: `apps/web/src/app/to-dashboard/[orgSlug]/tournaments/[tournamentSlug]/manage/page.tsx`

**Step 1:** Read the current overview tab content

**Step 2:** Redesign to focus on "What needs attention"

Structure:

- **Quick Actions Bar** - Primary actions in a row
- **Attention Needed** - Collapsible section with pending items
- **At a Glance** - Single row of key metrics
- **Recent Activity** - Compact activity feed

```tsx
{
  /* Overview Tab Content */
}
<div className="space-y-6">
  {/* Quick Actions */}
  <div className="flex flex-wrap gap-2">
    <Button>Start Round</Button>
    <Button variant="outline">View Bracket</Button>
    <Button variant="outline">Export Results</Button>
  </div>

  {/* Attention Needed - only show if items exist */}
  {attentionItems.length > 0 && (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Needs Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {attentionItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border-b py-2 last:border-0"
          >
            <span className="text-sm">{item.message}</span>
            <Button size="sm" variant="ghost">
              {item.action}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )}

  {/* At a Glance */}
  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
    <div className="bg-muted/50 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold">{registeredCount}</div>
      <div className="text-muted-foreground text-xs">Registered</div>
    </div>
    {/* ... other metrics */}
  </div>
</div>;
```

**Step 3:** Commit

```bash
git add apps/web/src/app/to-dashboard/[orgSlug]/tournaments/[tournamentSlug]/manage/page.tsx
git commit -m "feat(to-dashboard): redesign overview for clarity and focus

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 17: Simplify Tournament Creation Flow

**Files:**

- Modify: `apps/web/src/components/tournaments/create/` (stepper and step components)

**Step 1:** Read current step components

**Step 2:** Consolidate from 5 steps to 3:

1. **Basics** - Name, format, game, dates
2. **Rules** - Registration settings, team rules, match settings
3. **Review** - Summary and publish

**Step 3:** Update stepper component to reflect new steps

**Step 4:** Merge content from old steps into new structure

**Step 5:** Commit

```bash
git add apps/web/src/components/tournaments/create/
git commit -m "feat(tournaments): simplify creation flow to 3 steps

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 7: PWA Setup

### Task 18: Create Web App Manifest

**Files:**

- Create: `apps/web/public/manifest.json`

**Step 1:** Create manifest file

```json
{
  "name": "trainers.gg",
  "short_name": "trainers",
  "description": "Pokemon community for competitive play, shiny hunters, and everything in between",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#1db6a5",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Step 2:** Commit

```bash
git add apps/web/public/manifest.json
git commit -m "feat(pwa): add web app manifest

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 19: Add PWA Meta Tags to Layout

**Files:**

- Modify: `apps/web/src/app/layout.tsx`

**Step 1:** Read current layout

**Step 2:** Add PWA meta tags in metadata or head

```tsx
export const metadata: Metadata = {
  // ... existing metadata
  manifest: "/manifest.json",
  themeColor: "#1db6a5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "trainers.gg",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
};
```

**Step 3:** Commit

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(pwa): add PWA meta tags to layout

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 20: Add Safe Area CSS

**Files:**

- Modify: `apps/web/src/styles/globals.css`

**Step 1:** Add safe area handling for notched devices

```css
/* Safe area handling for notched devices (iPhone X+, etc.) */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-left {
  padding-left: env(safe-area-inset-left);
}

.safe-area-right {
  padding-right: env(safe-area-inset-right);
}

/* Apply to app shell */
.app-header {
  padding-top: max(1rem, env(safe-area-inset-top));
}

.app-footer {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

**Step 2:** Commit

```bash
git add apps/web/src/styles/globals.css
git commit -m "feat(pwa): add safe area CSS utilities

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 21: Create PWA Icon Placeholders

**Files:**

- Create: `apps/web/public/icons/` directory
- Note: Actual icons need to be designed/generated separately

**Step 1:** Create icons directory

```bash
mkdir -p apps/web/public/icons
```

**Step 2:** Add a README noting icon requirements

```markdown
# PWA Icons

Required icons:

- icon-192.png (192x192)
- icon-512.png (512x512)
- icon-512-maskable.png (512x512 with safe zone padding)
- apple-touch-icon.png (180x180)

Generate from trainers.gg logo. Maskable icons need 20% safe zone padding.
```

**Step 3:** Commit

```bash
git add apps/web/public/icons/
git commit -m "feat(pwa): add icons directory with requirements

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 8: Documentation

### Task 22: Update CLAUDE.md with Frontend Guidelines

**Files:**

- Modify: `CLAUDE.md`

**Step 1:** Read current CLAUDE.md

**Step 2:** Add new section after "Design Language" section

```markdown
---

## Frontend Polish Guidelines

When building or modifying UI components, follow these standards for a polished experience:

### Animation & Transitions

| Pattern       | Implementation                                                                        |
| ------------- | ------------------------------------------------------------------------------------- |
| Page entrance | `animate-in fade-in slide-in-from-bottom duration-300`                                |
| Card hover    | `hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200`               |
| Focus state   | Ring utilities with subtle glow: `focus-visible:ring-2 focus-visible:ring-primary/50` |
| Loading       | Pulsing skeletons: `animate-pulse`                                                    |

**Important:** Use CSS-first animations via Tailwind utilities. Do not use Motion/Framer Motion library as it forces client components.

### Status Colors

Use `StatusBadge` component with these semantic mappings:

| Status    | Color   | Usage                                |
| --------- | ------- | ------------------------------------ |
| active    | Emerald | Currently running tournaments/events |
| upcoming  | Blue    | Scheduled future events              |
| draft     | Amber   | Unpublished, work in progress        |
| completed | Gray    | Finished events                      |
| cancelled | Red     | Cancelled events                     |

### Responsive Patterns

| Viewport          | Pattern                                                             |
| ----------------- | ------------------------------------------------------------------- |
| Mobile (<640px)   | Icon-only tabs with tooltips, card layouts, stacked forms           |
| Tablet (768px)    | Scrollable containers with fade indicators, hide non-essential text |
| Desktop (1024px+) | Full text labels, table layouts, side-by-side forms                 |

### Loading & Empty States

| Scenario      | Component                             |
| ------------- | ------------------------------------- |
| Page loading  | `SkeletonCard` or `SkeletonTable`     |
| User action   | Optimistic UI with rollback on error  |
| Empty list    | `EmptyState` with appropriate variant |
| Empty section | `EmptyState variant="inline"`         |

### Component Checklist

When creating new components:

- [ ] Uses Server Component unless interactivity required
- [ ] Responsive at 375px, 768px, 1024px breakpoints
- [ ] Has appropriate loading state
- [ ] Has empty state if displays data
- [ ] Uses semantic status colors if applicable
- [ ] Follows existing naming patterns
- [ ] Interactive elements have hover/focus states

### Brand Voice in UI

- Professional warmth with Pokemon soul
- Not corporate sterile, not gaming chaos
- Celebrate the community: competitive players, shiny hunters, and everyone in between
- Use encouraging microcopy in empty states and confirmations
```

**Step 3:** Commit

```bash
git add CLAUDE.md
git commit -m "docs: add frontend polish guidelines to CLAUDE.md

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Testing Checklist

After completing all tasks, verify:

### Responsiveness

- [ ] No horizontal page scroll at 375px
- [ ] No horizontal page scroll at 768px
- [ ] Tabs show icons only on mobile, full text on desktop
- [ ] Tables are scrollable with shadow indicators
- [ ] Username hidden at tablet, visible at desktop

### Animations

- [ ] Page entrance animations work smoothly
- [ ] Card hover effects feel responsive
- [ ] Focus states have visible glow
- [ ] No animation jank or flicker

### Components

- [ ] StatusBadge displays correct colors
- [ ] EmptyState variants render correctly
- [ ] Skeleton loading states animate
- [ ] ResponsiveTable shadows appear/disappear

### PWA

- [ ] Manifest loads without errors
- [ ] Theme color shows in browser chrome
- [ ] "Add to Home Screen" option appears on mobile

---

## Priority Order

1. **Phase 1** - Foundation (Tasks 1-3)
2. **Phase 2** - Responsive Fixes (Tasks 4-8) - Critical for mobile
3. **Phase 3** - Interactions (Tasks 9-11)
4. **Phase 4** - Empty/Loading States (Tasks 12-13)
5. **Phase 5** - Public Pages (Tasks 14-15)
6. **Phase 6** - TO Dashboard (Tasks 16-17)
7. **Phase 7** - PWA (Tasks 18-21)
8. **Phase 8** - Documentation (Task 22)
