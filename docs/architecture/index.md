---
title: Architecture Overview
description: Comprehensive system design and architecture documentation for trainers.gg
category: architecture
---

# Architecture Overview

Welcome to the architecture documentation for **trainers.gg**!

trainers.gg is a grassroots, community-driven platform for the Pokemon competitive community. This architecture documentation covers our monorepo structure, technical decisions, and feature-specific designs.

---

## 🏗️ Monorepo Structure

trainers.gg uses a **Turborepo monorepo** with pnpm workspaces:

```
trainers.gg/
├── apps/
│   ├── web/                 # Next.js 16 (React 19) - @trainers/web
│   └── mobile/              # Expo 54 (React 19) - @trainers/mobile
├── packages/
│   ├── supabase/            # Supabase client, queries, edge functions - @trainers/supabase
│   ├── atproto/             # AT Protocol / Bluesky utilities - @trainers/atproto
│   ├── ui/                  # Shared UI components - @trainers/ui
│   ├── theme/               # Shared theme tokens - @trainers/theme
│   └── validators/          # Zod schemas - @trainers/validators
├── infra/
│   └── pds/                 # Bluesky PDS deployment (Fly.io) - pds.trainers.gg
└── tooling/
    ├── eslint/              # @trainers/eslint-config
    ├── prettier/            # @trainers/prettier-config
    ├── tailwind/            # @trainers/tailwind-config
    └── typescript/          # @trainers/typescript-config
```

**Related Docs:**

- [Monorepo Implementation Guide](../monorepo-implementation-guide.md) - Complete implementation details
- [Architecture Decision](../architecture-research-monorepo-vs-single-app.md) - Why we chose this approach

---

## ⚙️ Tech Stack

| Layer            | Technology            | Notes                                   |
| ---------------- | --------------------- | --------------------------------------- |
| Auth             | Supabase Auth         | Email/password + OAuth providers        |
| Database         | Supabase (PostgreSQL) | Row Level Security with auth.uid()      |
| Edge Functions   | Supabase              | Deno runtime                            |
| Social/Identity  | AT Protocol (Bluesky) | Decentralized identity and federation   |
| PDS              | Fly.io                | Self-hosted at pds.trainers.gg          |
| Web              | Next.js 16            | React 19, App Router, Server Components |
| Mobile           | Expo 54               | React Native with Tamagui               |
| Styling (Web)    | Tailwind CSS 4        | Uses @tailwindcss/postcss               |
| Styling (Mobile) | Tamagui               | Universal UI with shared theme tokens   |

---

## 🗄️ Database

- [Database Diagram](./database/database-diagram.md) - Main database schema and relationships
- [Database Gaps & Questions](./database/database-gaps-and-questions.md) - Open questions and discussion
- [Database Schema Audit](../database-schema-audit.md) - Recent audit of table usage

---

## 👤 Identity Architecture

trainers.gg has two levels of identity:

| Level    | Table   | Purpose                                                  |
| -------- | ------- | -------------------------------------------------------- |
| **User** | `users` | The actual person (linked to `auth.users` + Bluesky DID) |
| **Alt**  | `alts`  | Tournament-specific alternate identity (anonymity)       |

**Key Principle:** Social features (posts, follows, likes) use `user_id` because they federate to Bluesky. Tournament features use `alt_id` for competitive anonymity.

- [USER_VS_ALT_ARCHITECTURE.md](./USER_VS_ALT_ARCHITECTURE.md) - **Authoritative guide** for user vs alt decisions
- [Profiles Architecture](./profiles-architecture.md) - Multi-profile system design, tiers, data management

---

## 📊 Reputation System

- [Reputation System Spec](./reputation/reputation-system.md) - Main specification and overview
- [Deep Dive & Q&A](./reputation/reputation-system-deep-dive.md) - Detailed design, open questions, UI/UX

---

## 🔐 Role-Based Access Control (RBAC)

- [RBAC Explained](./rbac/rbac-explained.md) - Permissions, roles, and access control

---

## 📱 Mobile Strategy

- [Mobile App Strategy](./mobile-app-strategy.md) - React Native / Expo architecture
- [Cross-Platform UI Libraries](../cross-platform-ui-libraries.md) - Tamagui for shared components

---

## 🎥 Computer Vision

- [Computer Vision System](./computer-vision-system.md) - VGC battle analysis and replay generation
- [Mobile CV Video Architecture](../mobile-cv-video-architecture.md) - Camera, ML models, video recording

---

## 📝 Planning & Research

- [Build Plan](./planning/build-plan.md) - Roadmap and implementation phases
- [Feature Survey](./planning/feature-survey.md) - Feature prioritization
- [CMS Research](./planning/cms-research.md) - Content management research

---

## 🔵 Bluesky / AT Protocol

trainers.gg integrates with the AT Protocol for decentralized social features:

- Every user gets a Bluesky handle (`@username.trainers.gg`)
- Posts federate to the Bluesky network
- Self-hosted PDS at `pds.trainers.gg` on Fly.io

**Related Docs:**

- [BLUESKY_INTEGRATION.md](../planning/BLUESKY_INTEGRATION.md) - Integration overview
- [PDS Production Setup](../pds/production-setup.md) - Fly.io hosting configuration

---

## Related Documentation

- [Planning Docs](../planning/) - Project vision, implementation plans
- [Organizations](../organizations/ORGANIZATIONS.md) - Organization system
- [Tournaments](../tournaments/index.md) - Tournament system
