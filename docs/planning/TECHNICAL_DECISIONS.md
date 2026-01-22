# Technical Decisions - trainers.gg

This document captures all technical decisions made during the planning phase for trainers.gg.

## Tech Stack Summary

| Layer                      | Technology                  | Version |
| -------------------------- | --------------------------- | ------- |
| **Web Framework**          | Next.js                     | 16      |
| **Web React**              | React                       | 19.2    |
| **Mobile Framework**       | Expo                        | 54      |
| **Mobile React**           | React                       | 18      |
| **Database**               | Convex                      | Latest  |
| **Authentication**         | Bluesky OAuth (AT Protocol) | -       |
| **UI Components (Web)**    | shadcn/ui with Base UI      | Latest  |
| **UI Components (Mobile)** | NativeWind + custom         | Latest  |
| **Styling**                | Tailwind CSS                | 4.x     |
| **Monorepo**               | Turborepo + pnpm            | Latest  |
| **Package Namespace**      | `@trainers`                 | -       |
| **Deployment (Web)**       | Vercel                      | -       |
| **Deployment (Mobile)**    | EAS / Expo                  | -       |

---

## Detailed Decisions

### 1. Platforms

**Decision**: Build both web (Next.js) and mobile (Expo) apps in parallel from the start.

**Rationale**:

- Pokemon community is heavily mobile-focused
- Parallel development ensures consistent feature parity
- Shared business logic reduces duplication

**Note**: Different React versions between platforms (19.2 for web, 18 for mobile) - shared code must be compatible with both.

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
- `tooling/` - Developer experience and configuration

---

### 3. Database

**Decision**: Use Convex as the database and backend.

**Rationale**:

- Real-time sync out of the box (great for live tournament brackets later)
- Works with both React (Next.js) and React Native (Expo)
- Combines database + serverless functions in one
- TypeScript-first with excellent type inference

**Note**: Convex account is already set up.

---

### 4. Authentication Strategy

**Decision**: Phase 1 uses Bluesky's existing PDS infrastructure. Fast follow to deploy our own containerized PDS for `@username.trainers.gg` handles.

**Phase 1 Flow**:

1. User signs in with existing Bluesky account
2. OR creates new `@username.bsky.social` account
3. trainers.gg stores user profile data in Convex (linked via DID)

**Phase 2 (Fast Follow)**:

1. Deploy containerized PDS (likely Fly.io or similar)
2. Users can create `@username.trainers.gg` handles
3. Full control over user accounts and data

**Rationale**:

- Bluesky OAuth is complex (DPoP, PAR, PKCE requirements)
- Using existing infrastructure reduces initial complexity
- Can add own PDS without breaking existing accounts (account migration is supported)

---

### 5. UI Components (Web)

**Decision**: Use shadcn/ui with Base UI (not Radix UI).

**Rationale**:

- shadcn/ui provides beautiful, accessible components
- Base UI is actively maintained (MUI backing) vs Radix concerns
- shadcn/ui officially supports Base UI as an alternative to Radix
- Components are copied into project for full customization control

**Implementation**:

- Use shadcn CLI with Base UI variant
- Components available at `/docs/components/base/*` in shadcn docs

---

### 6. UI Components (Mobile)

**Decision**: Use NativeWind for Tailwind-style classes in React Native.

**Rationale**:

- Maintains design language consistency with web
- Developers can use familiar Tailwind utility classes
- Single design system across platforms

**Note**: Mobile will have custom components built with NativeWind, not shared with web (different component primitives).

---

### 7. Package Namespace

**Decision**: Use `@trainers` as the package namespace.

**Examples**:

- `@trainers/ui` - Shared UI components
- `@trainers/backend` - Convex functions
- `@trainers/validators` - Shared Zod schemas

---

### 8. Bluesky Integration Approach

#### Account Handles

**Decision**: Default to `username.trainers.gg` handles (when own PDS is ready), but allow users to choose their provider during signup.

**Phase 1**: Users use existing Bluesky handles or create `@username.bsky.social`

**Phase 2**: Users can create `@username.trainers.gg` handles on our PDS

#### Feed Strategy

**Decision**: Hybrid with tabs - default to Pokemon-curated feed, allow switching to full Bluesky feed.

**Implementation (Phase 1)**: Keep it simple

- Pokemon feed: Filter by hashtags/keywords related to Pokemon
- Full feed: Show complete Bluesky feed from follows
- Prioritize trainers.gg content in Pokemon feed (when we have our own posts)

#### Cross-posting

**Decision**: Always cross-post to Bluesky by default.

**Options available**:

1. Default behavior: All posts go to Bluesky automatically
2. User settings: Global preference to change default
3. Per-post override: Toggle on composer to skip Bluesky

#### Profiles

**Decision**: trainers.gg profiles are independent from Bluesky.

**Flow**:

1. On initial setup, pull avatar/name/bio from Bluesky profile
2. User can edit/override any field
3. trainers.gg profile stored in Convex, lives independently
4. Pokemon-specific fields added (game preferences, tournament history, etc.)

---

### 9. Team Sharing in Posts

**Decision**: Simple text posts only for Phase 1.

**Rationale**:

- Team builder is a complex feature that deserves proper design
- Don't want to half-bake the implementation
- Can add team attachments to posts when team builder is ready

---

### 10. Deployment

**Decision**:

- Web: Vercel
- Mobile: EAS (Expo Application Services)

**Rationale**:

- Vercel has first-class Next.js support
- EAS provides streamlined Expo builds and OTA updates
- Both integrate well with the chosen stack

---

## Open Questions / Future Decisions

1. ~~**Domain**: `trainers.gg` needs to be purchased before OAuth can fully work (client metadata must be hosted at a public URL)~~ **RESOLVED**: Domain purchased January 2026

2. **PDS Hosting**: When ready for Phase 2, decide between Fly.io, Railway, Render, or dedicated VPS for containerized PDS

3. **Caching Strategy**: May need to cache Bluesky feed data in Convex for performance (rate limits consideration)

4. **Mobile OAuth**: Need to verify Expo WebBrowser/AuthSession works with atproto OAuth requirements (DPoP)

---

## Status

| Item                 | Status      |
| -------------------- | ----------- |
| Domain (trainers.gg) | Purchased   |
| Convex Account       | Ready       |
| Vercel Account       | TBD         |
| Planning Docs        | Complete    |
| Implementation       | Not Started |
