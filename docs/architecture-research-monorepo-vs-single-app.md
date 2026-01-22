# Architecture Research: Monorepo vs Single App for BattleStadium

> Research conducted January 2026 for adding mobile app support to BattleStadium tournament platform

> **📌 Decision Status: ADOPTED**
>
> BattleStadium has adopted **Option 2: Monorepo with Next.js (web) + Expo (mobile)**. This architecture provides full Next.js capabilities for web (SSR, SEO) while enabling native mobile UX with Expo. See [monorepo-implementation-guide.md](./monorepo-implementation-guide.md) for setup instructions.

This document explores all viable architectural approaches for supporting both web (desktop browser) and mobile (iOS/Android) platforms for the BattleStadium Pokemon VGC tournament hosting platform. Options 1, 3, and 4 are retained for historical reference.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Your Current Stack](#your-current-stack)
3. [Architectural Options Overview](#architectural-options-overview)
4. [Option 1: Single Expo Universal App](#option-1-single-expo-universal-app)
5. [Option 2: Monorepo with Next.js + Expo](#option-2-monorepo-with-nextjs--expo)
6. [Option 3: Next.js + Capacitor](#option-3-nextjs--capacitor)
7. [Option 4: Solito (Hybrid Navigation)](#option-4-solito-hybrid-navigation)
8. [Decision Framework](#decision-framework)
9. [Recommendation for BattleStadium](#recommendation-for-battlestadium)
10. [Implementation Guidance](#implementation-guidance)
11. [Sources](#sources)

---

## Executive Summary

After extensive research, there are **four viable architectural approaches** for adding mobile support to BattleStadium:

| Approach                      | Code Sharing | Web Features         | Mobile UX      | Complexity  | Recommended For       |
| ----------------------------- | ------------ | -------------------- | -------------- | ----------- | --------------------- |
| **Expo Universal App**        | 95%+         | Limited (no SSR/ISR) | Excellent      | Low         | Mobile-first apps     |
| **Monorepo (Next.js + Expo)** | 60-80%       | Full (SSR/ISR/SEO)   | Excellent      | Medium-High | Your situation        |
| **Next.js + Capacitor**       | 100%         | Full                 | Good (WebView) | Low         | Web-first apps        |
| **Solito**                    | 80-90%       | Full                 | Excellent      | Medium      | Navigation-heavy apps |

**For BattleStadium specifically:** Given your existing Next.js + Convex + Clerk stack, need for SEO, and real-time tournament features, a **monorepo with Next.js (web) + Expo (mobile) sharing a Convex backend** is the most appropriate choice.

---

## Your Current Stack

Based on analysis of your codebase:

```
Current Architecture:
├── Next.js 15 (App Router)
├── React 19
├── Convex (real-time backend)
├── Clerk (authentication)
├── Tailwind CSS 4 + shadcn/ui
├── TypeScript (strict)
└── Vercel (deployment)
```

**Key Characteristics:**

- Heavy use of Next.js App Router features (layouts, route groups)
- Real-time data via Convex subscriptions
- Complex routing with dynamic segments (`[slug]`, `[org_slug]`, etc.)
- Form handling with react-hook-form + Zod
- Radix UI primitives throughout

---

## Architectural Options Overview

### The Core Trade-off

```
┌─────────────────────────────────────────────────────────────────┐
│                     THE SPECTRUM                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SINGLE CODEBASE ←─────────────────────────→ SEPARATE CODEBASES │
│                                                                  │
│  • Less code duplication        • Platform-optimized UX         │
│  • Simpler maintenance          • Best-in-class tools per platform│
│  • Harder to optimize per platform  • More code to maintain     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Option 1: Single Expo Universal App

### What It Is

Replace Next.js entirely with Expo, using Expo Router for web, iOS, and Android from a single codebase.

### Architecture

```
battle-stadium/
├── app/                    # Expo Router (file-based)
│   ├── (tabs)/
│   ├── tournaments/
│   └── _layout.tsx
├── components/             # Shared components
├── convex/                 # Backend (unchanged)
└── package.json
```

### Pros

- **Maximum code sharing** (95%+)
- **Single mental model** — one router, one styling system
- **Simpler CI/CD** — one build pipeline
- **Expo SDK 54** automatically detects monorepo setups
- **Real-time works identically** — Convex hooks work everywhere

### Cons

- **No SSR/ISR support** — only static generation (SSG)
- **SEO limitations** — static rendering only, no dynamic meta tags at request time
- **Lose Next.js features:**
  - No API routes (use Convex actions instead)
  - No middleware
  - No ISR (Incremental Static Regeneration)
  - No React Server Components (experimental in Expo)
- **Web UX may suffer** — Expo Router's web support is mobile-first
- **Migration effort** — must rewrite all routes to Expo Router conventions

### When to Choose This

- Your app is mobile-first
- SEO is not critical (e.g., authenticated app only)
- You don't need SSR or ISR
- You want maximum simplicity

### Technical Gotchas

- Dynamic routes require `generateStaticParams()` for web
- No DOM portals — use `<PortalHost>` for modals
- Platform extensions (`.web.tsx`) have inconsistent behavior in `app/` folder
- ScrollView needs fixed height parents on web

---

## Option 2: Monorepo with Next.js + Expo

### What It Is

Keep Next.js for web (with full SSR/ISR/SEO), add Expo for mobile, share business logic and Convex backend.

### Architecture

```
battle-stadium/
├── apps/
│   ├── web/                    # Next.js 15 (existing, moved)
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   └── components/     # Web-specific components
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── mobile/                 # Expo (new)
│       ├── app/                # Expo Router pages
│       ├── components/         # Mobile-specific components
│       ├── app.json
│       └── package.json
│
├── packages/
│   ├── ui/                     # Shared UI primitives
│   │   ├── button.tsx          # Platform-agnostic or branched
│   │   └── card.tsx
│   │
│   ├── lib/                    # Shared business logic
│   │   ├── tournament/         # Tournament utilities
│   │   ├── pokemon/            # Pokemon data utilities
│   │   └── validation/         # Zod schemas
│   │
│   ├── types/                  # Shared TypeScript types
│   │   └── index.ts
│   │
│   └── config/                 # Shared configs
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── convex/                     # Backend (shared by both apps)
│   ├── schema.ts
│   ├── tournaments/
│   └── ...
│
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml         # Workspace config
└── package.json
```

### Pros

- **Full Next.js features** — SSR, ISR, middleware, API routes, RSC
- **Full SEO support** — dynamic meta tags, sitemaps, etc.
- **Native mobile UX** — true React Native performance
- **Convex works perfectly** — same backend serves both apps
- **Official Convex template exists** — `turbo-expo-nextjs-clerk-convex-monorepo`
- **60-80% code sharing** — business logic, types, validation, backend
- **Platform-optimized UI** — can tune each platform's UX independently
- **Turborepo** handles caching and parallel builds efficiently

### Cons

- **Two routers to maintain** — Next.js App Router + Expo Router
- **UI components may diverge** — shadcn/ui (web) vs React Native Reusables (mobile)
- **More complex setup** — workspaces, Metro config, etc.
- **Dependency management** — React version mismatches can cause issues
- **Two deployment pipelines** — Vercel (web) + EAS Build (mobile)

### When to Choose This

- You need full Next.js features (SSR, ISR, SEO)
- Web and mobile UX should be optimized independently
- You have an existing Next.js app (your situation)
- Real-time features are critical (Convex shines here)

### Technical Gotchas

- **React version conflicts** — Expo and Next.js may want different React versions
- **Metro + symlinks** — SDK 52+ handles this automatically
- **EAS Build** must run from package folder, not root
- **yarn classic recommended** — pnpm/bun have issues with React Native in monorepos

### Convex Integration

Both apps share the same Convex backend:

```typescript
// packages/lib/convex.ts (shared)
import { ConvexProvider, ConvexReactClient } from "convex/react";

export const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL! // Same URL for both apps
);

// apps/web/src/app/layout.tsx
<ConvexProvider client={convex}>
  {children}
</ConvexProvider>

// apps/mobile/app/_layout.tsx
<ConvexProvider client={convex}>
  {children}
</ConvexProvider>
```

---

## Option 3: Next.js + Capacitor

### What It Is

Keep your Next.js app exactly as-is, wrap it in Capacitor to create iOS/Android apps. The mobile apps run your web app in a WebView.

### Architecture

```
battle-stadium/
├── src/                    # Next.js (unchanged)
├── ios/                    # Capacitor iOS project
├── android/                # Capacitor Android project
├── capacitor.config.ts
└── package.json
```

### Pros

- **100% code sharing** — literally the same code
- **Zero migration** — keep everything as-is
- **Web developers stay productive** — familiar tools
- **Native features via plugins** — camera, push notifications, etc.
- **Fastest time to market** — minimal changes needed

### Cons

- **WebView performance** — not truly native
- **Mobile UX suffers** — web UI patterns don't feel native
- **Limited offline support** — depends on service workers
- **App store rejections risk** — Apple can reject "wrapped web apps"
- **Animations feel different** — not native 60fps transitions

### When to Choose This

- Speed to market is critical
- Mobile is secondary to web
- Your web app already has good mobile CSS
- You don't need native-feeling animations

### Not Recommended For BattleStadium Because

- Tournament apps benefit from native UX (quick score entry, push notifications)
- Real-time updates are better with native rendering
- Competitive gaming users expect polished mobile experiences

---

## Option 4: Solito (Hybrid Navigation)

### What It Is

Solito unifies navigation between Next.js (web) and React Navigation (native), letting you share navigation logic while using platform-optimal routers.

### Architecture

```
battle-stadium/
├── apps/
│   ├── next/               # Next.js with Solito
│   └── expo/               # Expo with Solito
├── packages/
│   ├── app/                # Shared screens and navigation
│   │   ├── features/
│   │   └── navigation/
│   └── ui/                 # Shared components
└── package.json
```

### Solito 5 (October 2025)

Solito 5 made a major shift:

- **Dropped react-native-web dependency** — pure Next.js on web
- **Pure React Native on mobile** — no web compromises
- **Navigation as glue** — only navigation logic is shared

### Pros

- **Platform-optimal rendering** — Next.js DOM on web, React Native on mobile
- **Shared navigation logic** — URLs as source of truth
- **Works with Expo Router** — since both use React Navigation under the hood
- **80-90% code sharing** — screens, hooks, state

### Cons

- **Another abstraction layer** — more to learn
- **Less mature than alternatives** — smaller community
- **Navigation focus** — doesn't solve UI component sharing

### When to Choose This

- You want URL-based navigation everywhere
- You need platform-optimal rendering
- Navigation patterns are complex (deep linking, etc.)

---

## Decision Framework

### Critical Questions

#### 1. How important is SEO?

| Answer                                | Recommendation        |
| ------------------------------------- | --------------------- |
| Critical (public pages need indexing) | Monorepo or Capacitor |
| Moderate (some public pages)          | Monorepo              |
| Not important (authenticated app)     | Expo Universal        |

**For BattleStadium:** Tournament listings, organization pages, and event pages benefit from SEO. **SEO is important.**

#### 2. How important is native mobile UX?

| Answer                     | Recommendation             |
| -------------------------- | -------------------------- |
| Critical (competitive app) | Monorepo or Expo Universal |
| Nice to have               | Capacitor                  |
| Not important              | Capacitor                  |

**For BattleStadium:** Tournament participants expect quick, responsive score entry and real-time updates. **Native UX is important.**

#### 3. What's your team's expertise?

| Expertise      | Recommendation        |
| -------------- | --------------------- |
| Web-focused    | Capacitor or Monorepo |
| Mobile-focused | Expo Universal        |
| Full-stack     | Monorepo              |

**For BattleStadium:** Based on the codebase, you're full-stack with strong web skills. **Monorepo works.**

#### 4. How different should web vs mobile be?

| Answer                            | Recommendation           |
| --------------------------------- | ------------------------ |
| Very different (dashboard vs app) | Monorepo                 |
| Similar with platform tweaks      | Expo Universal or Solito |
| Identical                         | Capacitor                |

**For BattleStadium:** Web needs dashboard views, mobile needs quick-action interfaces. **Somewhat different.**

#### 5. What's your timeline?

| Timeline | Recommendation |
| -------- | -------------- |
| ASAP     | Capacitor      |
| Moderate | Monorepo       |
| Flexible | Any option     |

---

## Recommendation for BattleStadium

### Primary Recommendation: Monorepo with Next.js + Expo

Based on your specific situation:

```
✅ Existing Next.js 15 app with complex routing
✅ Convex backend (works perfectly in monorepo)
✅ Clerk authentication (has React Native SDK)
✅ Need for SEO on tournament/organization pages
✅ Real-time features (Convex subscriptions)
✅ Tournament UX benefits from native feel
```

### Recommended Architecture

```
battle-stadium/
├── apps/
│   ├── web/                        # Current app, restructured
│   │   ├── src/app/                # Next.js App Router
│   │   ├── src/components/         # Web-specific components
│   │   └── package.json
│   │
│   └── mobile/                     # New Expo app
│       ├── app/                    # Expo Router
│       │   ├── (tabs)/
│       │   │   ├── index.tsx       # Home/Dashboard
│       │   │   ├── tournaments.tsx # Tournament list
│       │   │   └── profile.tsx     # User profile
│       │   ├── tournaments/
│       │   │   ├── [slug].tsx      # Tournament detail
│       │   │   └── [slug]/
│       │   │       └── manage.tsx  # Tournament management
│       │   └── _layout.tsx
│       ├── components/             # Mobile-specific components
│       └── package.json
│
├── packages/
│   ├── ui/                         # Shared design tokens
│   │   ├── tokens.ts               # Colors, spacing, etc.
│   │   └── index.ts
│   │
│   ├── lib/                        # Shared business logic
│   │   ├── tournament/
│   │   │   ├── swiss-pairing.ts
│   │   │   ├── standings.ts
│   │   │   └── validation.ts
│   │   ├── pokemon/
│   │   │   └── team-validation.ts
│   │   └── utils/
│   │       └── format.ts
│   │
│   ├── types/                      # Shared TypeScript types
│   │   ├── tournament.ts
│   │   ├── organization.ts
│   │   └── index.ts
│   │
│   └── validation/                 # Shared Zod schemas
│       ├── tournament.ts
│       └── team.ts
│
├── convex/                         # Backend (shared)
│   └── ... (unchanged)
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### What Gets Shared

| Category         | Shared? | Notes                                  |
| ---------------- | ------- | -------------------------------------- |
| Convex backend   | 100%    | Same queries/mutations                 |
| TypeScript types | 100%    | Same `Doc<>`, `Id<>` types             |
| Zod schemas      | 100%    | Same validation                        |
| Business logic   | 100%    | Swiss pairing, standings, etc.         |
| Design tokens    | 90%     | Colors, spacing (some platform tweaks) |
| UI components    | 30-50%  | Different per platform                 |
| Routing          | 0%      | Next.js vs Expo Router                 |

### UI Component Strategy

For UI, use:

- **Web:** Continue with shadcn/ui + Tailwind
- **Mobile:** Use React Native Reusables + NativeWind

Both use the same design language (Tailwind-based), making visual consistency easier.

---

## Implementation Guidance

### Phase 1: Restructure to Monorepo

1. **Set up Turborepo:**

   ```bash
   # From project root
   pnpm dlx create-turbo@latest --skip-install
   ```

2. **Move existing app to `apps/web/`:**

   ```bash
   mkdir -p apps/web
   mv src apps/web/
   mv next.config.ts apps/web/
   mv tailwind.config.ts apps/web/
   # ... move other web-specific files
   ```

3. **Extract shared code to `packages/`:**
   - Move business logic to `packages/lib/`
   - Move shared types to `packages/types/`
   - Move Zod schemas to `packages/validation/`

4. **Keep Convex at root** (it serves both apps)

### Phase 2: Create Expo App

1. **Create Expo app:**

   ```bash
   cd apps
   npx create-expo-app mobile --template tabs
   ```

2. **Configure for monorepo:**
   - Update Metro config to watch workspace packages
   - Set up path aliases matching web app

3. **Add Convex + Clerk:**

   ```bash
   cd mobile
   npx expo install convex
   npx expo install @clerk/clerk-expo
   ```

4. **Set up NativeWind:**
   ```bash
   npx expo install nativewind tailwindcss
   ```

### Phase 3: Build Core Mobile Screens

Priority screens for tournament app:

1. Tournament list (browse/search)
2. Tournament detail (view standings, bracket)
3. Match reporting (quick score entry)
4. Check-in flow
5. Profile/settings

### Estimated Code Sharing

Based on similar projects:

- **40-50% reduction** in total code vs two separate apps
- **60-80% shared** business logic and types
- **30-50% shared** component patterns (not code, but patterns)

---

## Alternative: Quick Start with Convex Template

Convex provides an official template that matches your stack:

```bash
npx create-convex@latest -t get-convex/turbo-expo-nextjs-clerk-convex-monorepo
```

This gives you:

- Turborepo setup
- Next.js 16 (web)
- Expo with React Native (mobile)
- Convex backend
- Clerk authentication
- Example note-taking app

You could use this as a reference or starting point, then migrate your existing code into it.

---

## Sources

### Official Documentation

- [Expo Router Introduction](https://docs.expo.dev/router/introduction/)
- [Using Next.js with Expo](https://docs.expo.dev/guides/using-nextjs/)
- [Expo Static Rendering](https://docs.expo.dev/router/reference/static-rendering/)
- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/)
- [Convex Monorepo Template](https://www.convex.dev/templates/monorepo)

### Solito

- [Solito Documentation](https://solito.dev/)
- [Solito 5 Announcement](https://dev.to/redbar0n/solito-5-is-now-web-first-but-still-unifies-nextjs-and-react-native-2lek)
- [Solito GitHub](https://github.com/nandorojo/solito)

### Monorepo Resources

- [Turborepo + React Native Starter](https://vercel.com/templates/next.js/turborepo-react-native)
- [Convex Turbo-Expo-NextJS-Clerk Template](https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo)
- [Expo Monorepo Example (pnpm)](https://github.com/byCedric/expo-monorepo-example)
- [Universal React Monorepo Template](https://github.com/gurselcakar/universal-react-monorepo)

### Comparison Articles

- [What I Wish I Knew - Expo Web, React Navigation & Next.js](https://gist.github.com/nandorojo/627ef0097fffa94f095bb4e94d9da4c7)
- [Next.js + Capacitor vs Expo](https://nextnative.dev/comparisons/nextjs-vs-expo)
- [Monorepo for React Native: When to Use](https://medium.com/squad-engineering/monorepo-for-react-native-when-to-use-when-not-to-use-32dfd6dea635)
- [Ditching Monorepos for React Native](https://davotisolutions.com/blog/ditching-monorepos-for-react-native)
- [Turborepo Monorepo 2025 Guide](https://medium.com/@beenakumawat002/turborepo-monorepo-in-2025-next-js-react-native-shared-ui-type-safe-api-%EF%B8%8F-6194c83adff9)
- [Setting up Turborepo with React Native and Next.js: 2025 Production Guide](https://medium.com/better-dev-nextjs-react/setting-up-turborepo-with-react-native-and-next-js-the-2025-production-guide-690478ad75af)

### React Strict DOM (Future)

- [React Strict DOM vs React Native for Web in 2025](https://shift.infinite.red/react-strict-dom-vs-react-native-for-web-in-2025-bb91582ef261)
- [React Strict DOM: The Future of Universal Apps](https://blog.theodo.com/2024/04/react-strict-dom-react-native-web/)

### Tournament App Best Practices

- [Sports Tournament Management App Development Guide](https://www.sportsfirst.net/post/sports-tournament-management-app-development-complete-guide)
- [Esports Tournament Website Development Guide 2026](https://www.brsoftech.com/blog/esports-tournament-website/)

### Known Issues

- [Expo Router GitHub Issues](https://github.com/expo/router/issues)
- [Expo Router Production Readiness Discussion](https://github.com/expo/router/discussions/603)
- [Expo Router Breaking Changes v3→v4](https://github.com/expo/expo/issues/35212)

---

## Future Considerations

### React Strict DOM

Meta is investing heavily in React Strict DOM (RSD), which may become the standard for cross-platform React apps. RSD:

- Takes a web-first approach (opposite of React Native Web)
- Has Meta's official backing
- Integrates with StyleX for styling
- Is already used in production at Meta

**Recommendation:** Monitor RSD development. It may simplify cross-platform development significantly, potentially making monorepos unnecessary.

### Expo Server Components

Expo is adding experimental React Server Component support. When stable, this could bring SSR-like capabilities to Expo, reducing the gap between Next.js and Expo for web.

---

_Last updated: January 2026_
