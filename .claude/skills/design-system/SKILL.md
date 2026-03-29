---
name: design-system
description: Design system conventions — elevation, typography hierarchy, transitions, layout patterns. Use when building or reviewing UI components, pages, or layouts.
---

# Design System

Platform-agnostic design conventions for trainers.gg. Tokens are defined in `@trainers/theme` and consumed by web (CSS variables / Tailwind) and mobile (Tamagui / NativeWind). See `design-tokens` skill for theme package mechanics.

**Personality:** Clean, Playful, Community-driven. Data-rich and precise where it matters, but warm, friendly, and never cold or intimidating. NOT an esports/gaming site.

## Layout

| Token | Value | Notes |
|-------|-------|-------|
| Container max-width | `max-w-screen-2xl` (1536px) | Via `PageContainer` component |
| Container narrow | `max-w-2xl` (672px) | `PageContainer` narrow variant |
| Horizontal padding | `px-4` / `md:px-6` | 16px mobile, 24px desktop |
| Vertical padding | `py-8` | 32px default page padding |
| Nav height | `h-16` | 64px |
| Spacing grid | Tailwind default (4px base) | No customization needed |
| Breakpoints | Tailwind defaults | sm:640 md:768 lg:1024 xl:1280 2xl:1536 |

## Typography Hierarchy

Fonts: **Inter** (sans) and **Geist Mono** (mono), configured via `next/font` in layout.tsx and in `@trainers/theme` primitives.

| Level | Classes | Usage |
|-------|---------|-------|
| Page title | `text-4xl font-bold` | One per page (h1) |
| Section heading | `text-2xl font-bold` | Major sections (h2) |
| Subsection heading | `text-lg font-semibold` | Within sections (h3) |
| Card/item title | `text-base font-semibold` | Card headings, list items (h4) |
| Body | `text-sm` | Default text |
| Label/caption | `text-xs font-medium uppercase tracking-wide text-muted-foreground` | Stat labels, table headers, form labels |

Apply this hierarchy consistently rather than choosing ad-hoc text sizes per component.

## Elevation

Prefer background differentiation and shadows over borders. Borders are only used as dividers (table rows, nav separators), not as container outlines.

| Level | Treatment | Usage |
|-------|-----------|-------|
| **Surface** | Background differentiation only (e.g., `bg-muted/50`) | Static containers, info panels, section backgrounds |
| **Card** | Subtle shadow (`shadow-sm`) | Interactive elements, stat cards, clickable list items |
| **Raised** | Stronger shadow (`shadow-md`) | Popovers, dropdowns, tooltips |
| **Overlay** | Strongest shadow (`shadow-lg`) + backdrop | Modals, sheets, dialogs |

**No dotted/dashed borders on containers.** Replace with the appropriate elevation level.

## Transitions

CSS-only transitions to preserve server-side rendering. Do not add JS-driven animations that would force server components to become client components.

| Token | Duration | Usage | Client Component Required? |
|-------|----------|-------|---------------------------|
| Fast | 100ms | Focus rings, hover color changes | No (CSS-only) |
| Default | 150ms | Hover states, button active states | No (CSS-only) |
| Slow | 300ms | Modals, sheets (already client components) | Already client |

**View Transition API:** planned for page transitions and layout shifts once browser adoption and library support mature. No JS-driven mount/unmount animations until then.

- [Chrome docs](https://developer.chrome.com/docs/web-platform/view-transitions)
- [MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [Practical examples](https://piccalil.li/blog/some-practical-examples-of-view-transitions-to-elevate-your-ui/)

## Color

Full OKLCH color system in `@trainers/theme`. See `design-tokens` skill for details.

| Role | Light | Dark |
|------|-------|------|
| Primary (teal) | `oklch(0.600 0.100 185)` | `oklch(0.700 0.120 183)` |
| Destructive (red) | `oklch(0.580 0.220 27)` | lighter variant |
| Neutral | True neutral (0 chroma) | True neutral |
| Semantic status | emerald=active, blue=upcoming, amber=draft, gray=completed, red=cancelled | Same mapping |

## Cross-Platform

These conventions apply to both `apps/web` (shadcn/ui + Tailwind) and `apps/mobile` (Tamagui + NativeWind). The values are shared through `@trainers/theme`; only the format differs.

- **Web:** CSS variables consumed by Tailwind classes
- **Mobile:** Direct token imports into Tamagui theme config
- **Shared:** All elevation, typography, and color decisions are platform-agnostic
