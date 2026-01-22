# Cross-Platform UI Libraries for React + React Native/Expo

> Research conducted January 2026 for BattleStadium - a Pokemon VGC tournament hosting platform

> **📌 Architecture Context:**
>
> BattleStadium uses a [Next.js + Expo monorepo](./architecture-research-monorepo-vs-single-app.md). This guide recommends **React Native Reusables + NativeWind** for mobile to maintain consistency with the existing shadcn/ui + Tailwind web stack.

This document explores UI libraries that work across both React (web) and React Native + Expo (mobile) to enable code sharing and consistent design language across platforms.

---

## Table of Contents

1. [Quick Comparison](#quick-comparison)
2. [NativeWind v4/v5](#1-nativewind-v4v5)
3. [React Native Reusables](#2-react-native-reusables)
4. [Gluestack UI v3](#3-gluestack-ui-v3)
5. [Tamagui](#4-tamagui)
6. [Monorepo Architecture Patterns](#monorepo-architecture-patterns)
7. [Recommendation for BattleStadium](#recommendation-for-battlestadium)
8. [Sources](#sources)

---

## Quick Comparison

### Stats & Adoption (January 2026)

| Library                    | GitHub Stars | Weekly Downloads | Last Updated | Bundle Impact          |
| -------------------------- | ------------ | ---------------- | ------------ | ---------------------- |
| **NativeWind**             | 7,489        | 515,562          | 4 months ago | Minimal (compile-time) |
| **Tamagui**                | 13,546       | 92,581           | 5 days ago   | ~28KB core             |
| **Gluestack UI**           | 20,000+      | —                | Active       | ~150KB                 |
| **React Native Reusables** | 7,700        | Growing          | Nov 2025     | Copy-paste (minimal)   |

### Feature Matrix

| Library                    | Styling Approach      | Web Support | Expo Ready   | shadcn/ui Compatibility  |
| -------------------------- | --------------------- | ----------- | ------------ | ------------------------ |
| **React Native Reusables** | NativeWind (Tailwind) | Universal   | Expo SDK 54  | Direct port of shadcn/ui |
| **Gluestack UI v3**        | NativeWind (Tailwind) | Universal   | Expo SDK 54  | Similar philosophy       |
| **Tamagui**                | Custom tokens/themes  | Universal   | Full support | Different paradigm       |
| **NativeWind**             | Tailwind utilities    | Universal   | Full support | Same styling system      |

---

## 1. NativeWind v4/v5

### What It Is

The **styling layer** that brings Tailwind CSS to React Native. Not a component library itself, but the foundation for libraries like React Native Reusables and Gluestack UI.

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    BUILD TIME                           │
│  Tailwind classes → LightningCSS → StyleSheet.create   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    RUNTIME                              │
│  Efficient conditional logic (hover, focus, media)      │
└─────────────────────────────────────────────────────────┘
```

### Key Features (v4)

| Feature                       | Description                                              |
| ----------------------------- | -------------------------------------------------------- |
| **jsxImportSource transform** | No more wrapping every component with `styled()`         |
| **CSS Variables**             | Full custom property support with dark mode              |
| **Animations**                | Tailwind animation classes via `react-native-reanimated` |
| **Transitions**               | Dynamic property transitions                             |
| **Container Queries**         | Style based on container size (not just viewport)        |
| **Hot Reload**                | Even changes to `tailwind.config.js` hot reload          |
| **rem scaling**               | Inlines rem→px at build time (configurable)              |

### Performance

- **Compile-time optimization** — no runtime style object overhead
- **LightningCSS** compiler — significantly faster than v2
- **Web SSR** — reuses existing Tailwind CSS stylesheet
- Beats every library in web performance benchmarks

### Breaking Changes from v2

- `styled()` wrapper removed; use third-party libraries like `tw-classed` instead
- `gap-` now compiles to native `columnGap` and `rowGap`
- `divide-` and `spacing-` utilities temporarily unavailable
- `rem` base scaling changed from 16px to 14px
- CSS specificity algorithm modified

### v5 Preview

NativeWind v5 is built on Tailwind v4.1+ and requires React Native 0.81+. It focuses on cleaner setup, better performance, and better consistency with Tailwind on the web.

### Resources

- Documentation: https://www.nativewind.dev/
- v4 Announcement: https://www.nativewind.dev/blog/announcement-nativewind-v4
- GitHub: https://github.com/nativewind/nativewind

---

## 2. React Native Reusables

### What It Is

**shadcn/ui for React Native** — the same copy-paste philosophy, built on NativeWind and Radix primitives.

### Complete Component List (27 components)

| Category         | Components                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------- |
| **Inputs**       | Button, Checkbox, Input, Label, Radio Group, Select, Switch, Textarea, Toggle, Toggle Group |
| **Feedback**     | Alert, Alert Dialog, Progress, Skeleton, Tooltip                                            |
| **Layout**       | Accordion, Aspect Ratio, Card, Collapsible, Separator, Tabs                                 |
| **Overlays**     | Context Menu, Dialog, Dropdown Menu, Hover Card, Menubar, Popover                           |
| **Data Display** | Avatar, Badge, Text                                                                         |

### Authentication Blocks (7 pre-built flows)

- Sign in / Sign up forms
- Email verification
- Password reset / forgot password
- Social connections
- User menu

### Technical Architecture

```typescript
// Built on these primitives:
import { View, Text, Pressable } from "react-native"; // Core RN
import { cn } from "@/lib/utils"; // Class merging
import * as Primitives from "@rn-primitives/..."; // Radix for RN
import Animated from "react-native-reanimated"; // Animations
import { LucideIcon } from "lucide-react-native"; // Icons
```

### Key Differences from Web shadcn/ui

| Web (shadcn/ui)                  | Mobile (RN Reusables)             |
| -------------------------------- | --------------------------------- |
| DOM portals for modals           | `<PortalHost>` component required |
| Cascading CSS styles             | Each element styled directly      |
| `data-*` attributes for variants | Props/state for variants          |
| Radix UI primitives              | rn-primitives (universal port)    |

### CLI Usage

```bash
# Create new project
npx create-expo-app my-app --template react-native-reusables

# Add components to existing project
npx @react-native-reusables/cli add button
npx @react-native-reusables/cli add dialog accordion tabs
```

### Theming

```typescript
// Uses CSS variables via NativeWind
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... same pattern as shadcn/ui
      },
    },
  },
};
```

### Pros

- **Familiar** — same as existing shadcn/ui setup
- **Lightweight** — copy-paste means no extra bundle
- **Accessible** — Radix primitives built-in
- **Well-documented** — follows shadcn/ui patterns

### Cons

- **Newer project** — smaller community than Gluestack
- **Missing components** — no calendars, charts, data tables (by design)
- **Manual adaptation** — some components need platform-specific tweaks

### Resources

- Documentation: https://reactnativereusables.com/
- GitHub: https://github.com/founded-labs/react-native-reusables
- Component Examples: https://reactnativereusables.com/docs

---

## 3. Gluestack UI v3

### What It Is

**Comprehensive universal component library** with 30+ components, built on NativeWind. The successor to NativeBase.

### Complete Component List (30+ components)

| Category         | Components                                                                    |
| ---------------- | ----------------------------------------------------------------------------- |
| **Typography**   | Heading, Text                                                                 |
| **Layout**       | Box, Center, Divider, HStack, VStack, Grid                                    |
| **Forms**        | Button, Checkbox, Input, Radio, Select, Slider, Switch, Textarea, FormControl |
| **Feedback**     | Alert, Progress, Spinner, Toast                                               |
| **Data Display** | Badge, Card, Table, Avatar, Image, Icon                                       |
| **Overlay**      | Modal, Drawer, AlertDialog, Popover, Tooltip, Menu, Actionsheet, BottomSheet  |
| **Disclosure**   | Accordion                                                                     |
| **Other**        | Fab, Skeleton                                                                 |

### Performance Benchmarks (iPhone 15, 1000 components)

| Test                      | React Native | Gluestack v2 | Overhead |
| ------------------------- | ------------ | ------------ | -------- |
| Simple Component          | 68 ms        | 99 ms        | 1.45x    |
| With Variants             | 73 ms        | 144 ms       | 1.97x    |
| Complex (themes + inline) | —            | 241 ms       | —        |
| Layout (HStack/VStack)    | 58 ms        | 76 ms        | 1.31x    |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│               GLUESTACK UI v3                           │
├─────────────────────────────────────────────────────────┤
│  Copy-paste components (not npm package)                │
│  ↓                                                      │
│  NativeWind styling engine                              │
│  ↓                                                      │
│  React Native primitives (View, Text, Pressable)        │
└─────────────────────────────────────────────────────────┘
```

### Theming System

```typescript
// CSS custom properties with comprehensive tokens
const tokens = {
  colors: {
    primary: { 0: "...", 50: "...", /* ... */ 950: "..." },
    secondary: {
      /* 0-950 shades */
    },
    error: {
      /* status colors */
    },
    success: {
      /* status colors */
    },
    // Dark mode: inverted color schemes
  },
  typography: {
    /* font scales */
  },
  spacing: {
    /* spacing scale */
  },
};
```

### Pros

- **Most components** — 30+ out of the box
- **Mature ecosystem** — successor to NativeBase (20k+ stars)
- **GeekyAnts backing** — professional support available
- **Universal** — semantic `<div>` on web, `View` on native
- **MCP Server** — AI-powered code generation

### Cons

- **Bundle size** — ~150KB contribution
- **Overhead** — 1.3-2x performance overhead vs raw RN
- **Different from shadcn/ui** — migration from shadcn required

### Resources

- Documentation: https://gluestack.io/
- Performance Benchmarks: https://gluestack.io/ui/docs/home/performance/benchmarks
- GitHub: https://github.com/gluestack/gluestack-ui

---

## 4. Tamagui

### What It Is

**Style system + UI kit with optimizing compiler** — the most comprehensive cross-platform solution, but steepest learning curve.

### Complete Component List

| Category      | Components                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| **Forms**     | Button, Checkbox, Form, Input, TextArea, Label, Progress, RadioGroup, Select, Slider, Switch, ToggleGroup |
| **Panels**    | AlertDialog, Dialog, Popover, Sheet, Tooltip, Toast                                                       |
| **Organize**  | Accordion, Group, Tabs                                                                                    |
| **Content**   | Avatar, Card, Image, ListItem                                                                             |
| **Visual**    | LinearGradient, Separator, Square, Circle                                                                 |
| **Layout**    | Stacks (XStack, YStack, ZStack), Headings, Text                                                           |
| **Utilities** | Lucide Icons, FocusScope, Anchor, HTML Elements, ScrollView, Spinner, Unspaced, VisuallyHidden            |

### The Optimizing Compiler

Tamagui's secret weapon is its **multi-faceted optimizing compiler**:

```
┌─────────────────────────────────────────────────────────┐
│                 TAMAGUI COMPILER                        │
├─────────────────────────────────────────────────────────┤
│  1. Partial Evaluation    - Pre-computes what it can    │
│  2. CSS Extraction        - Atomic CSS on web           │
│  3. Tree Flattening       - Removes wrapper components  │
│  4. Dead Code Elimination - Strips unused styles        │
└─────────────────────────────────────────────────────────┘
```

**Impact:** Without compiler = ~125ms, With compiler = ~12% faster. Even bigger gains on web (bundle size + render performance).

### Theming System

```typescript
// tokens.ts
export const tokens = createTokens({
  color: {
    background: "#fff",
    primary: "#007AFF",
    // ...typed color scale
  },
  space: { 1: 4, 2: 8, 3: 12 /* ...etc */ },
  size: {
    /* ... */
  },
  radius: {
    /* ... */
  },
});

// tamagui.config.ts
export default createTamagui({
  tokens,
  themes: {
    light: { background: "$background" },
    dark: { background: "$backgroundDark" },
  },
});
```

### Performance

- **On par with vanilla React Native** when compiler is enabled
- Extracts styles to CSS on web (no runtime overhead)
- Optimizes native views on mobile
- `useTheme` and `useMedia` hooks with signal-like granularity

### Universal Styling Example

```typescript
// Write once, runs everywhere
import { styled, Stack, Text } from "tamagui";

const Card = styled(Stack, {
  backgroundColor: "$background",
  padding: "$4",
  borderRadius: "$2",

  // Responsive (compiles to CSS media queries on web)
  $sm: { padding: "$2" },
  $lg: { padding: "$6" },

  // Variants
  variants: {
    elevated: {
      true: { elevation: 4, shadowColor: "$shadow" },
    },
  },
});
```

### Pros

- **Best performance** — compiler optimization
- **Most powerful theming** — typed tokens, nested themes, no re-renders
- **Truly universal** — same code, optimized per platform
- **Animations** — swappable drivers (springs, timing)
- **Active development** — frequently updated

### Cons

- **Steep learning curve** — different paradigm from Tailwind
- **Lower adoption** — 92k weekly downloads vs NativeWind's 515k
- **Setup complexity** — compiler configuration required
- **Not Tailwind** — can't use Tailwind classes directly

### Resources

- Documentation: https://tamagui.dev/
- Benchmarks: https://tamagui.dev/docs/intro/benchmarks
- GitHub: https://github.com/tamagui/tamagui

---

## Component Comparison Matrix

| Component    | React Native Reusables | Gluestack UI v3 | Tamagui        |
| ------------ | ---------------------- | --------------- | -------------- |
| Accordion    | ✅                     | ✅              | ✅             |
| Alert        | ✅                     | ✅              | —              |
| Alert Dialog | ✅                     | ✅              | ✅             |
| Aspect Ratio | ✅                     | —               | —              |
| Avatar       | ✅                     | ✅              | ✅             |
| Badge        | ✅                     | ✅              | —              |
| Bottom Sheet | —                      | ✅              | ✅ (Sheet)     |
| Button       | ✅                     | ✅              | ✅             |
| Card         | ✅                     | ✅              | ✅             |
| Checkbox     | ✅                     | ✅              | ✅             |
| Dialog       | ✅                     | ✅              | ✅             |
| Divider      | —                      | ✅              | ✅ (Separator) |
| Input        | ✅                     | ✅              | ✅             |
| Modal        | ✅                     | ✅              | ✅             |
| Popover      | ✅                     | ✅              | ✅             |
| Progress     | ✅                     | ✅              | ✅             |
| Radio Group  | ✅                     | ✅              | ✅             |
| Select       | ✅                     | ✅              | ✅             |
| Skeleton     | ✅                     | ✅              | —              |
| Slider       | —                      | ✅              | ✅             |
| Switch       | ✅                     | ✅              | ✅             |
| Tabs         | ✅                     | ✅              | ✅             |
| Toast        | —                      | ✅              | ✅             |
| Tooltip      | ✅                     | ✅              | ✅             |

---

## Monorepo Architecture Patterns

For sharing code between Next.js (web) and Expo (mobile):

### Recommended Structure (Turborepo + pnpm)

```
battle-stadium/
├── apps/
│   ├── web/                    # Next.js 15 (existing)
│   │   ├── src/
│   │   └── package.json
│   └── mobile/                 # Expo SDK 54 (new)
│       ├── app/
│       └── package.json
├── packages/
│   ├── ui/                     # Shared UI primitives
│   │   ├── src/
│   │   │   ├── button.tsx      # Universal components
│   │   │   ├── card.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   ├── lib/                    # Shared business logic
│   │   ├── tournament/
│   │   ├── pokemon/
│   │   └── utils/
│   ├── types/                  # Shared TypeScript types
│   └── config/                 # Shared configs (ESLint, TSConfig)
├── convex/                     # Backend (already shared)
├── turbo.json
└── package.json
```

### Key Technical Considerations

| Challenge               | Solution                                    |
| ----------------------- | ------------------------------------------- |
| React version conflicts | Each app maintains own `node_modules`       |
| Metro configuration     | Configure to watch all monorepo packages    |
| Tailwind sharing        | Shared config in `packages/config/tailwind` |
| Path aliases            | Consistent aliases across apps              |

### Monorepo Starter Templates

- **Universal React Monorepo**: https://github.com/gurselcakar/universal-react-monorepo
  - Next.js 16 or Vite (web) + Expo SDK 54 (mobile)
  - Turborepo + pnpm workspaces + TypeScript
  - NativeWind with shared UI out of the box

- **Expo + Next.js Monorepo**: https://github.com/rphlmr/expo-nextjs-monorepo
  - Shared packages example
  - Metro configuration for monorepos

- **NX + Next.js + Expo**: https://www.make-it.run/blog/complete-guide-to-setting-up-nx-next-js-expo-project-modern-monorepo-architecture-part-2-tailwind-configuration
  - Feature-based library organization
  - Pages-sections-components pattern
  - Unified Tailwind CSS configuration

---

## Recommendation for BattleStadium

Given the existing stack (Next.js + shadcn/ui + Tailwind + Convex):

### Primary Recommendation: React Native Reusables + NativeWind

```
┌─────────────────────────────────────────────────────────┐
│                    WEB (Existing)                       │
│  Next.js 15 + shadcn/ui + Tailwind CSS                  │
└─────────────────────────────────────────────────────────┘
                          ↕ Shared: Convex, types, business logic
┌─────────────────────────────────────────────────────────┐
│                    MOBILE (New)                         │
│  Expo + React Native Reusables + NativeWind             │
└─────────────────────────────────────────────────────────┘
```

**Why this works best:**

1. **Same mental model** — Tailwind classes you already know
2. **Same components** — shadcn/ui patterns on both platforms
3. **Minimal learning curve** — focus on tournament features, not new styling
4. **Shared design tokens** — same colors, spacing, typography
5. **Active development** — both projects actively maintained
6. **Lightweight** — copy-paste means no bundle bloat

### Alternative: Gluestack UI

Choose Gluestack if:

- You want 30+ components immediately available
- You're okay migrating from shadcn/ui
- You want professional support (GeekyAnts)
- Bundle size isn't a primary concern

### Alternative: Tamagui

Choose Tamagui if:

- Performance is absolutely critical
- You need advanced theming with nested themes
- You're building a complex design system
- You're comfortable with a steeper learning curve

---

## Sources

### Official Documentation

- [NativeWind](https://www.nativewind.dev/)
- [NativeWind v4 Announcement](https://www.nativewind.dev/blog/announcement-nativewind-v4)
- [React Native Reusables](https://reactnativereusables.com/)
- [Gluestack UI](https://gluestack.io/)
- [Gluestack Performance Benchmarks](https://gluestack.io/ui/docs/home/performance/benchmarks)
- [Tamagui](https://tamagui.dev/)
- [Tamagui Benchmarks](https://tamagui.dev/docs/intro/benchmarks)
- [Expo Documentation](https://expo.dev/)

### GitHub Repositories

- [NativeWind](https://github.com/nativewind/nativewind)
- [React Native Reusables](https://github.com/founded-labs/react-native-reusables)
- [Gluestack UI](https://github.com/gluestack/gluestack-ui)
- [Tamagui](https://github.com/tamagui/tamagui)
- [Universal React Monorepo Template](https://github.com/gurselcakar/universal-react-monorepo)
- [Expo + Next.js Monorepo](https://github.com/rphlmr/expo-nextjs-monorepo)

### Articles & Comparisons

- [NPM Trends: NativeWind vs Tamagui](https://npmtrends.com/nativewind-vs-tamagui)
- [Component Comparison Gist](https://gist.github.com/CarlosZiegler/5f9ea468ee3906d466b496af35d68aff)
- [LogRocket: Best React Native UI Libraries 2026](https://blog.logrocket.com/best-react-native-ui-component-libraries/)
- [BrowserStack: React Native UI Components 2025](https://www.browserstack.com/guide/react-native-ui-components)
- [DEV: Building Universal React App with Expo + Next.js + NativeWind](https://dev.to/adebayoileri/building-a-universal-react-app-with-expo-nextjs-nativewind-3829)
- [Turborepo Monorepo Guide 2025](https://medium.com/@beenakumawat002/turborepo-monorepo-in-2025-next-js-react-native-shared-ui-type-safe-api-%EF%B8%8F-6194c83adff9)

---

_Last updated: January 2026_
