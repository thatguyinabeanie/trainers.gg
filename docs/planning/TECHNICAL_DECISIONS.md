# Technical Decisions - trainers.gg

This document captures all technical decisions made for trainers.gg.

---

## Tech Stack Summary

| Layer                      | Technology                  | Version |
| -------------------------- | --------------------------- | ------- |
| **Web Framework**          | Next.js                     | 16      |
| **Mobile Framework**       | Expo                        | 54      |
| **React (Both Platforms)** | React                       | 19      |
| **Database**               | Supabase (PostgreSQL)       | Latest  |
| **Authentication**         | Supabase Auth + Bluesky PDS | -       |
| **Edge Functions**         | Supabase Edge Functions     | Deno    |
| **UI Components (Web)**    | shadcn/ui                   | Latest  |
| **UI Components (Mobile)** | Tamagui                     | Latest  |
| **Styling (Web)**          | Tailwind CSS                | 4.x     |
| **Styling (Mobile)**       | Tamagui                     | Latest  |
| **Theme Tokens**           | @trainers/theme (OKLCH)     | -       |
| **Monorepo**               | Turborepo + pnpm            | Latest  |
| **Package Namespace**      | `@trainers`                 | -       |
| **Deployment (Web)**       | Vercel                      | -       |
| **Deployment (Database)**  | Supabase Cloud              | -       |
| **Deployment (PDS)**       | Fly.io                      | -       |
| **Deployment (Mobile)**    | EAS / Expo                  | -       |

---

## Detailed Decisions

### 1. Platforms

**Decision**: Build both web (Next.js) and mobile (Expo) apps in parallel from the start.

**Rationale**:

- Pokemon community is heavily mobile-focused
- Parallel development ensures consistent feature parity
- Shared business logic reduces duplication

**Note**: Both platforms now use React 19, simplifying shared code.

---

### 2. Monorepo Structure

**Decision**: Use pnpm workspaces with Turborepo for build orchestration.

**Rationale**:

- Follows T3 stack patterns for proven monorepo organization
- Turborepo provides build caching and task orchestration
- pnpm is faster and more efficient than npm/yarn for monorepos

**Structure**:

- `apps/` - User-facing applications (web, mobile)
- `packages/` - Shared business logic and data layer
- `infra/` - Infrastructure (PDS deployment)
- `tooling/` - Developer experience and configuration

---

### 3. Database

**Decision**: Use Supabase (PostgreSQL) as the database and backend.

**Rationale**:

- PostgreSQL is battle-tested and scales well
- Row Level Security (RLS) provides declarative access control
- Edge Functions (Deno) for server-side logic
- Realtime subscriptions for live updates
- Excellent TypeScript support with generated types
- Git-based migrations for version control

**Previous Decision**: Originally planned to use Convex, but migrated to Supabase for better control over data and compatibility with self-hosted PDS requirements.

---

### 4. Authentication Strategy

**Decision**: Unified Supabase Auth + Bluesky PDS account creation.

**Flow**:

1. User signs up with email, username, password
2. Edge function creates Supabase Auth account
3. Edge function creates PDS account (`@username.trainers.gg`)
4. DID stored in users table, linked to Supabase auth.uid()
5. User receives session tokens for both systems

**Rationale**:

- Single signup flow creates both accounts atomically
- Users get a Bluesky identity immediately
- Supabase Auth handles session management, password reset, etc.
- PDS handles decentralized social features

**Note**: We now run our own PDS at `pds.trainers.gg` (deployed on Fly.io).

---

### 5. UI Components (Web)

**Decision**: Use shadcn/ui components.

**Rationale**:

- Beautiful, accessible components out of the box
- Components are copied into project for full customization control
- Works great with Tailwind CSS 4

**Implementation**:

- Components live in `packages/ui/`
- Shared across web app via `@trainers/ui`

---

### 6. UI Components (Mobile)

**Decision**: Use Tamagui for React Native UI.

**Rationale**:

- Universal components with excellent performance
- Theme tokens can be shared via `@trainers/theme`
- Better DX than NativeWind for complex components
- Supports web compilation if needed later

**Previous Decision**: Originally planned NativeWind, but Tamagui provides better component primitives for mobile-first design.

---

### 7. Theme System

**Decision**: OKLCH color space with generated outputs for each platform.

**Implementation**:

- Colors defined in OKLCH in `@trainers/theme`
- Build script generates:
  - CSS variables for web (`theme.css`)
  - Hex colors for mobile (`mobile-theme.ts`)
- Light and dark modes supported

**Rationale**:

- OKLCH provides perceptually uniform colors
- Single source of truth for design tokens
- Works across Tailwind (web) and Tamagui (mobile)

---

### 8. Package Namespace

**Decision**: Use `@trainers` as the package namespace.

**Examples**:

- `@trainers/supabase` - Database client, queries, edge functions
- `@trainers/atproto` - AT Protocol / Bluesky utilities
- `@trainers/ui` - Shared web UI components
- `@trainers/theme` - Shared theme tokens
- `@trainers/validators` - Shared Zod schemas

---

### 9. Bluesky Integration Approach

#### Account Handles

**Decision**: Every user gets an `@username.trainers.gg` handle on signup.

**Implementation**:

- Self-hosted PDS at `pds.trainers.gg` (Fly.io)
- Signup edge function creates PDS account automatically
- Handle resolution via wildcard DNS (`*.trainers.gg` → PDS)
- Users can login to bsky.app with their trainers.gg handle

#### Feed Strategy

**Decision**: Hybrid with tabs - default to Pokemon-curated feed, allow switching to full Bluesky feed.

**Implementation**:

- Pokemon feed: Filter by hashtags/keywords related to Pokemon
- Full feed: Show complete Bluesky feed from follows
- Prioritize trainers.gg content in Pokemon feed

#### Cross-posting

**Decision**: Posts created on trainers.gg are stored on the user's PDS and federate to Bluesky network automatically.

**Options available**:

1. Default behavior: All posts federate to Bluesky
2. Future: Per-post privacy controls

#### Profiles

**Decision**: trainers.gg profiles extend Bluesky profiles with Pokemon-specific fields.

**Flow**:

1. On signup, profile created with username
2. User can add Pokemon-specific fields (game preferences, tournament history, etc.)
3. Profile stored in Supabase `users` table
4. Avatar/bio can sync with PDS profile or be independent

---

### 10. Team Sharing in Posts

**Decision**: Simple text posts only for Phase 1.

**Rationale**:

- Team builder is a complex feature that deserves proper design
- Don't want to half-bake the implementation
- Can add team attachments to posts when team builder is ready

---

### 11. Deployment

**Decision**:

- Web: Vercel (auto-deploy from main branch)
- Database: Supabase Cloud (Git integration for migrations)
- PDS: Fly.io (manual deploy via `infra/pds/deploy.sh`)
- Mobile: EAS (Expo Application Services)

**Rationale**:

- Vercel has first-class Next.js support
- Supabase Git integration handles preview branches
- Fly.io is cost-effective for containerized PDS
- EAS provides streamlined Expo builds and OTA updates

---

## Resolved Decisions

| Question             | Resolution                            |
| -------------------- | ------------------------------------- |
| Domain (trainers.gg) | ✅ Purchased January 2026             |
| PDS Hosting          | ✅ Fly.io at pds.trainers.gg          |
| Database choice      | ✅ Supabase (migrated from Convex)    |
| Mobile UI library    | ✅ Tamagui (migrated from NativeWind) |
| React version        | ✅ React 19 on both platforms         |

---

## Open Questions / Future Decisions

1. **OAuth Providers**: Add Google, Discord, etc. via Supabase Auth?

2. **Caching Strategy**: May need to cache Bluesky feed data for performance

3. **Mobile Deep Linking**: Universal links configuration for both platforms

4. **Push Notifications**: Expo notifications vs native implementation

---

## Status

| Item                  | Status         |
| --------------------- | -------------- |
| Domain (trainers.gg)  | ✅ Active      |
| Supabase Project      | ✅ Ready       |
| PDS (pds.trainers.gg) | ✅ Deployed    |
| Vercel Deployment     | ✅ Active      |
| Web App               | 🔶 In Progress |
| Mobile App            | 🔶 In Progress |
