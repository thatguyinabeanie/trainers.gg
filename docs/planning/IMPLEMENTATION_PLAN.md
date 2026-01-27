# Implementation Plan - trainers.gg Phase 1

Phase 1 focuses on launching a social media platform for Pokemon trainers, powered by Bluesky/AT Protocol with Supabase as the backend.

---

## Tech Stack

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Auth            | Supabase Auth + Bluesky PDS             |
| Database        | Supabase (PostgreSQL)                   |
| Edge Functions  | Supabase Edge Functions (Deno)          |
| Web             | Next.js 16 (React 19, App Router)       |
| Mobile          | Expo 54 (React Native, Tamagui)         |
| Social/Identity | AT Protocol (Bluesky)                   |
| PDS             | Self-hosted on Fly.io (pds.trainers.gg) |

---

## Phase 1 Deliverables

- Web app (Next.js 16)
- Mobile app (Expo 54)
- Unified authentication (Supabase Auth + Bluesky PDS account)
- Social feed with Pokemon-curated and full views
- User profiles
- Post creation and interactions
- Coming soon placeholders for future features

---

## Feature Checklist

### Foundation

- [x] Monorepo setup (pnpm + Turborepo)
- [x] Shared tooling packages (TypeScript, ESLint, Prettier, Tailwind)
- [x] Next.js 16 web app with App Router
- [x] Expo 54 mobile app with Expo Router
- [x] Supabase project setup
- [x] Basic navigation structure

### Authentication

- [x] Supabase Auth integration (email/password)
- [x] Unified signup edge function (creates Supabase + PDS accounts)
- [x] `@username.trainers.gg` handle creation
- [x] DID storage in users table
- [x] Protected route middleware
- [x] Auth context/provider (web)
- [x] Auth provider (mobile)
- [ ] OAuth providers (Google, Discord, etc.)
- [ ] Password reset flow
- [ ] Email verification flow

### User Management

- [x] Users table with DID and PDS handle
- [x] User queries (getUser, getUserByHandle)
- [x] User mutations (createUser, updateProfile)
- [ ] Profile completion flow (after signup)
- [ ] Avatar upload

### Social Feed

- [ ] Feed component (web)
- [ ] Feed component (mobile)
- [ ] PostCard component
  - [ ] Author info (avatar, name, handle)
  - [ ] Post content (text, images)
  - [ ] Timestamp
  - [ ] Action buttons (like, repost, reply, share)
- [ ] Feed tabs (Pokemon-curated vs Full Bluesky)
- [ ] Infinite scroll / pagination
- [ ] Pull-to-refresh (mobile)

### Bluesky API Integration

- [ ] Bluesky API wrapper (Edge Functions or client-side)
- [ ] Fetch user timeline
- [ ] Fetch author feed
- [ ] Fetch post thread
- [ ] Rate limiting and error handling

### Post Creation

- [ ] PostComposer component
- [ ] Create post (via PDS)
- [ ] Character count (300 char limit)
- [ ] Image upload for posts

### Post Interactions

- [ ] Like post
- [ ] Unlike post
- [ ] Repost
- [ ] Delete repost
- [ ] Reply to post
- [ ] Delete post

### Profile Pages

- [ ] ProfileHeader component
  - [ ] Avatar, display name, handle
  - [ ] Bio
  - [ ] Stats (followers, following, posts)
  - [ ] Follow/Unfollow button
- [ ] ProfileTabs (Posts, Replies, Likes)
- [ ] Profile data fetching from Bluesky

### Follow System

- [ ] Follow user
- [ ] Unfollow user
- [ ] Show follow state on profiles
- [ ] Followers list
- [ ] Following list

### Settings Pages

- [ ] Settings layout with navigation
- [ ] Profile settings (display name, bio, avatar)
- [ ] trainers.gg-specific fields (game preferences, location, social links)
- [ ] Preferences (default feed view, etc.)
- [ ] Account settings (connected accounts, sign out)

### Coming Soon Pages

- [ ] Reusable ComingSoon component
- [ ] Tournaments page placeholder
- [ ] Draft Leagues page placeholder
- [ ] Teams/Team Builder page placeholder
- [ ] Email signup for notifications (optional)

### Mobile Parity

- [ ] All features working on mobile
- [ ] Tamagui component library setup
- [ ] Mobile-specific UI adjustments
- [ ] Deep linking

### Deployment

- [x] Vercel deployment (web)
- [x] Supabase production project
- [x] Bluesky PDS on Fly.io
- [x] Domain configuration (trainers.gg)
- [ ] EAS build profiles (dev, preview, production)
- [ ] App store submissions

### Polish

- [ ] Loading states
- [ ] Error handling and error boundaries
- [ ] Empty states
- [ ] Accessibility review (keyboard nav, screen readers)
- [ ] Performance review (bundle size, load times)

---

## Phase 2+ Features (Backlog)

- Reply functionality (view and create)
- Notifications
- Search functionality
- Better Pokemon content filtering (ML-based or keyword lists)
- Team Builder
- Tournament Management
- Draft League System
- Shiny Hunting Tracker
- ELO/Ranking System

---

## Risk Mitigation

| Risk                    | Mitigation                                               |
| ----------------------- | -------------------------------------------------------- |
| Bluesky API rate limits | Implement caching; show graceful degradation             |
| Mobile OAuth challenges | Test Expo AuthSession early; may need custom solution    |
| React version mismatch  | Keep shared packages React-agnostic; test both platforms |

---

## Success Criteria

- [ ] Users can sign up and get `@username.trainers.gg` handle
- [ ] Users can view their Bluesky feed
- [ ] Users can create posts that appear on Bluesky
- [ ] Users can like/repost/reply
- [ ] Users can view any profile
- [ ] Users can follow/unfollow
- [ ] Users can edit their settings
- [ ] Mobile app is fully functional
- [ ] All coming soon pages exist
- [ ] No critical bugs
