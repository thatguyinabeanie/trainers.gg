# Implementation Plan - trainers.gg Phase 1

This document outlines the sprint-by-sprint implementation plan for Phase 1 of trainers.gg, focusing on social media features with Bluesky integration.

---

## Overview

**Phase 1 Goal**: Launch a social media platform for Pokemon trainers, powered by Bluesky/AT Protocol.

**Timeline**: 5 sprints (estimated 5 weeks)

**Key Deliverables**:
- Web app (Next.js 16)
- Mobile app (Expo 54)
- Bluesky OAuth authentication
- Social feed with Pokemon-curated and full views
- User profiles
- Post creation and interactions
- Coming soon placeholders for future features

---

## Sprint 1: Foundation

**Focus**: Set up the monorepo, configure tooling, and create basic app shells.

### Tasks

#### Monorepo Setup
- [ ] Initialize pnpm workspace
- [ ] Configure Turborepo (`turbo.json`)
- [ ] Create `pnpm-workspace.yaml`
- [ ] Set up root `package.json` with scripts

#### Tooling Packages
- [ ] Create `tooling/typescript` with shared tsconfigs
  - `base.json` - shared base config
  - `nextjs.json` - Next.js specific
  - `expo.json` - Expo specific
- [ ] Create `tooling/eslint` with shared ESLint configs
- [ ] Create `tooling/prettier` with shared Prettier config
- [ ] Create `tooling/tailwind` with shared theme/tokens

#### Web App (Next.js)
- [ ] Initialize Next.js 16 app in `apps/web`
- [ ] Configure Tailwind CSS 4.x
- [ ] Set up basic app structure (App Router)
- [ ] Create placeholder pages:
  - `/` - Landing page
  - `/home` - Feed (protected)
  - `/profile/[handle]` - Profile
  - `/settings` - Settings
  - `/tournaments` - Coming soon
  - `/draft-leagues` - Coming soon
  - `/teams` - Coming soon

#### Mobile App (Expo)
- [ ] Initialize Expo 54 app in `apps/mobile`
- [ ] Configure NativeWind
- [ ] Set up Expo Router
- [ ] Create placeholder screens matching web

#### Convex Setup
- [ ] Create `packages/backend` with Convex
- [ ] Initialize Convex project
- [ ] Create initial schema (users table)
- [ ] Connect Convex to both apps

### Deliverables
- Working monorepo with both apps running locally
- Shared tooling configured
- Basic navigation structure in place

---

## Sprint 2: Authentication & Core UI

**Focus**: Implement Bluesky OAuth and build core UI component library.

### Tasks

#### Bluesky OAuth Research & Setup
- [ ] Research `@atproto/oauth-client-browser` package
- [ ] Create OAuth client metadata JSON file
- [ ] Set up OAuth callback route in Next.js
- [ ] Implement OAuth flow for web

#### User Management
- [ ] Define full Convex schema for users
- [ ] Create user queries:
  - `getUser` - get current user
  - `getUserByDid` - lookup by DID
  - `getUserByHandle` - lookup by handle
- [ ] Create user mutations:
  - `createOrUpdateUser` - upsert on OAuth callback
  - `updateProfile` - edit profile fields
  - `updateSettings` - edit preferences

#### Auth Context
- [ ] Create React auth context/provider
- [ ] Implement protected route wrapper
- [ ] Handle auth state persistence
- [ ] Create sign in / sign out flows

#### UI Components (Web)
- [ ] Set up `packages/ui` with shadcn CLI (Base UI)
- [ ] Create core components:
  - Button (variants: primary, secondary, ghost, etc.)
  - Input, Textarea
  - Card
  - Avatar
  - Label
  - Spinner/Loading
- [ ] Create layout components:
  - AppShell (header, main, optional sidebar)
  - Header with navigation
  - MobileNav (responsive)

#### UI Components (Mobile)
- [ ] Set up NativeWind in Expo
- [ ] Create matching component primitives
- [ ] Ensure design consistency

### Deliverables
- Users can sign in with Bluesky account
- User record created in Convex on first login
- Core UI components available
- Protected routes working

---

## Sprint 3: Social Features - Feed & Posts

**Focus**: Implement the main social feed and post creation.

### Tasks

#### Bluesky API Integration
- [ ] Create Bluesky API wrapper in Convex actions
- [ ] Implement `getTimeline` action (fetch user's feed)
- [ ] Implement `getAuthorFeed` action (fetch specific user's posts)
- [ ] Implement `getPostThread` action (fetch post with replies)
- [ ] Handle rate limiting and errors

#### Feed Display
- [ ] Create Feed component
- [ ] Create PostCard component:
  - Author info (avatar, name, handle)
  - Post content (text, images)
  - Timestamp
  - Action buttons (like, repost, reply, share)
- [ ] Implement feed tabs:
  - "For You" / Pokemon-curated (simple keyword/hashtag filter)
  - "Following" / Full Bluesky feed
- [ ] Implement infinite scroll / pagination
- [ ] Implement pull-to-refresh (mobile)

#### Post Creation
- [ ] Create PostComposer component
- [ ] Implement `createPost` action in Convex:
  - Call Bluesky API to create post
  - Handle cross-posting logic (always by default)
- [ ] Add character count (300 char limit for Bluesky)
- [ ] Add image upload (future - defer if time constrained)

#### Post Interactions
- [ ] Implement `likePost` action
- [ ] Implement `unlikePost` action
- [ ] Implement `repost` action
- [ ] Implement `deleteRepost` action
- [ ] Update PostCard to show interaction states

### Deliverables
- Users can view their Bluesky feed
- Users can switch between Pokemon-curated and full feed
- Users can create posts (cross-posted to Bluesky)
- Users can like and repost

---

## Sprint 4: Profiles & Settings

**Focus**: Implement user profiles, following, and settings.

### Tasks

#### Profile Pages
- [ ] Create ProfileHeader component:
  - Avatar, display name, handle
  - Bio
  - Stats (followers, following, posts)
  - Follow/Unfollow button
- [ ] Create ProfileTabs component:
  - Posts tab
  - Replies tab (optional)
  - Likes tab
- [ ] Implement profile data fetching from Bluesky

#### Follow System
- [ ] Implement `followUser` action
- [ ] Implement `unfollowUser` action
- [ ] Update follow button to reflect state
- [ ] Show follow state on profiles

#### Settings Pages
- [ ] Create Settings layout with navigation
- [ ] Implement Profile Settings:
  - Edit display name
  - Edit bio
  - Edit avatar (future)
  - Edit trainers.gg-specific fields (game preferences, location, social links)
- [ ] Implement Preferences Settings:
  - Cross-posting default (on/off)
  - Default feed view (Pokemon/All)
- [ ] Implement Account Settings:
  - Connected Bluesky account info
  - Sign out

#### Mobile Parity
- [ ] Implement OAuth flow for mobile (Expo AuthSession)
- [ ] Ensure all features work on mobile
- [ ] Test and fix mobile-specific issues

### Deliverables
- Full profile pages with user's posts
- Follow/unfollow functionality
- Settings pages with profile editing
- Mobile app at feature parity with web

---

## Sprint 5: Polish, Placeholders & Deployment

**Focus**: Add coming soon pages, polish UI, deploy to production.

### Tasks

#### Coming Soon Pages
- [ ] Create ComingSoon component (reusable)
- [ ] Implement Tournaments page with teaser content
- [ ] Implement Draft Leagues page with teaser content
- [ ] Implement Teams/Team Builder page with teaser content
- [ ] Add email signup for notifications (optional)

#### Polish & Bug Fixes
- [ ] Review and fix UI inconsistencies
- [ ] Improve loading states
- [ ] Add error handling and error boundaries
- [ ] Improve empty states
- [ ] Accessibility review (keyboard nav, screen readers)
- [ ] Performance review (bundle size, load times)

#### Testing
- [ ] Manual testing of all flows
- [ ] Test on multiple browsers
- [ ] Test on iOS and Android devices
- [ ] Fix critical bugs

#### Deployment - Web
- [ ] Create Vercel project
- [ ] Configure environment variables
- [ ] Set up preview deployments
- [ ] Deploy to production
- [ ] Configure domain (when purchased)

#### Deployment - Mobile
- [ ] Configure EAS project
- [ ] Set up build profiles (dev, preview, production)
- [ ] Create development builds
- [ ] Submit to app stores (or prepare for submission)

#### Documentation
- [ ] Update README with setup instructions
- [ ] Document environment variables
- [ ] Create contributing guide (optional)

### Deliverables
- Polished, production-ready web app
- Mobile apps ready for testing/distribution
- Deployed to Vercel
- All coming soon pages in place

---

## Post-Sprint 5: Fast Follows

After the initial launch, prioritize these items:

### Own PDS (High Priority)
- [ ] Deploy containerized PDS (Fly.io or similar)
- [ ] Configure `trainers.gg` domain for PDS
- [ ] Enable `@username.trainers.gg` handle creation
- [ ] Update OAuth to support own PDS

### Enhanced Features
- [ ] Reply functionality (view and create replies)
- [ ] Image upload for posts
- [ ] Notifications
- [ ] Search functionality
- [ ] Better Pokemon content filtering (ML-based or keyword lists)

### Team Builder (Phase 2)
- [ ] Design team builder data model
- [ ] Implement team creation and management
- [ ] Add team sharing to posts

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Bluesky OAuth complexity (DPoP, PAR) | Start OAuth research early in Sprint 2; have fallback plan |
| Mobile OAuth challenges | Test Expo AuthSession early; may need custom WebView solution |
| Rate limits from Bluesky | Implement caching in Convex; show graceful degradation |
| Domain not purchased | Use preview URLs for development; OAuth won't work without domain |
| React version mismatch (19 vs 18) | Keep shared packages React-agnostic; test both platforms |

---

## Success Criteria

### Sprint 1
- [ ] `pnpm dev` runs both apps successfully
- [ ] Navigation works on both platforms

### Sprint 2
- [ ] User can sign in with Bluesky account
- [ ] User record exists in Convex after sign in
- [ ] Core UI components render correctly

### Sprint 3
- [ ] User can view their Bluesky feed
- [ ] User can create a post that appears on Bluesky
- [ ] User can like/repost

### Sprint 4
- [ ] User can view any profile
- [ ] User can follow/unfollow
- [ ] User can edit their settings
- [ ] Mobile app is fully functional

### Sprint 5
- [ ] App is deployed and accessible
- [ ] All coming soon pages exist
- [ ] No critical bugs
- [ ] Ready for beta users
