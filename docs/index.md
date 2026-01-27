# trainers.gg Documentation

Welcome to the documentation for **trainers.gg** — a grassroots, community-driven platform for the Pokemon competitive community.

**Built by the community, for the community** — trainers.gg empowers content creators, Discord communities, friend groups, and grassroots organizers to easily host and manage online Pokemon tournaments without corporate barriers or complex systems.

---

## Quick Links

| Category            | Document                                                    | Description                   |
| ------------------- | ----------------------------------------------------------- | ----------------------------- |
| 📖 **Vision**       | [PROJECT_BRIEF.md](./planning/PROJECT_BRIEF.md)             | North star vision and roadmap |
| 🏗️ **Architecture** | [ARCHITECTURE.md](./planning/ARCHITECTURE.md)               | Current monorepo structure    |
| 🔧 **Tech Stack**   | [TECHNICAL_DECISIONS.md](./planning/TECHNICAL_DECISIONS.md) | Tech stack decisions          |
| 🔵 **Bluesky**      | [BLUESKY_INTEGRATION.md](./planning/BLUESKY_INTEGRATION.md) | AT Protocol / PDS integration |
| 🗄️ **Database**     | [database-schema-audit.md](./database-schema-audit.md)      | Recent schema audit           |

---

## Documentation Index

### 📁 Planning

Core planning documents for the project:

- [PROJECT_BRIEF.md](./planning/PROJECT_BRIEF.md) - Vision, features, target audience, phased rollout
- [ARCHITECTURE.md](./planning/ARCHITECTURE.md) - Monorepo structure, packages, apps
- [TECHNICAL_DECISIONS.md](./planning/TECHNICAL_DECISIONS.md) - Tech stack decisions and rationale
- [BACKEND_COMPARISON.md](./planning/BACKEND_COMPARISON.md) - Convex vs Supabase research (migrated to Supabase)
- [BLUESKY_INTEGRATION.md](./planning/BLUESKY_INTEGRATION.md) - AT Protocol, PDS, federation
- [IMPLEMENTATION_PLAN.md](./planning/IMPLEMENTATION_PLAN.md) - Phase 1 implementation plan
- [SOCIAL_MIGRATION_PLAN.md](./planning/SOCIAL_MIGRATION_PLAN.md) - ✅ Completed alt_id → user_id migration
- [CONVEX_SCHEMA.md](./planning/CONVEX_SCHEMA.md) - 📦 Archived (migrated to Supabase)

### 📁 Architecture

Technical architecture documentation:

- [index.md](./architecture/index.md) - Architecture overview
- [USER_VS_ALT_ARCHITECTURE.md](./architecture/USER_VS_ALT_ARCHITECTURE.md) - User vs Alt identity guide
- [profiles-architecture.md](./architecture/profiles-architecture.md) - Multi-profile system design
- [computer-vision-system.md](./architecture/computer-vision-system.md) - VGC battle analysis
- [mobile-app-strategy.md](./architecture/mobile-app-strategy.md) - React Native strategy
- [database/](./architecture/database/) - Database diagrams and schema docs
- [reputation/](./architecture/reputation/) - Reputation system specs
- [rbac/](./architecture/rbac/) - Role-based access control

### 📁 Organizations

Organization system documentation:

- [ORGANIZATIONS.md](./organizations/ORGANIZATIONS.md) - Organization system overview
- [USER_TYPES.md](./organizations/USER_TYPES.md) - User type definitions
- [roles/ORG_ROLES.md](./organizations/roles/ORG_ROLES.md) - Organization role definitions
- [permissions/ORG_PERMISSIONS.md](./organizations/permissions/ORG_PERMISSIONS.md) - Permission system
- [groups/ORG_GROUPS.md](./organizations/groups/ORG_GROUPS.md) - Group management

### 📁 Tournaments

Tournament system documentation:

- [index.md](./tournaments/index.md) - Tournament ownership and creation
- [draft-league.md](./tournaments/draft-league.md) - Pokemon Draft League support
- [data-integration-and-elo.md](./tournaments/data-integration-and-elo.md) - RK9 Labs integration, ELO

### 📁 Development

Development setup and guides:

- [seed-data-setup.md](./development/seed-data-setup.md) - Development seed data
- [local-oauth-setup.md](./development/local-oauth-setup.md) - Local OAuth configuration
- [bluesky-oauth-preview-deployments.md](./development/bluesky-oauth-preview-deployments.md) - Preview deployment OAuth

### 📁 Setup

Initial setup guides:

- [first-user-setup.md](./setup/first-user-setup.md) - First user creation guide

### 📁 PDS

Bluesky PDS documentation:

- [production-setup.md](./pds/production-setup.md) - PDS production setup on Fly.io

### 📁 Audits

Project audits and reports:

- [2026-01-13-audit-report.md](./audits/2026-01-13-audit-report.md) - Recent implementation audit
- [archive/](./audits/archive/) - Historical audit reports

### 📁 Feature Research

Feature research and brainstorming documents (may contain unimplemented ideas):

- [shiny_hunting_integration_architecture.md](./shiny_hunting_integration_architecture.md) - Shiny dex feature
- [ai_integration_architecture.md](./ai_integration_architecture.md) - AI service layer
- [feature_specifications.md](./feature_specifications.md) - Meta dashboard UI/UX specs
- [user_experience_flows.md](./user_experience_flows.md) - User personas and journeys
- [replay_analysis_engine.md](./replay_analysis_engine.md) - Replay parsing engine
- [realtime_tournament_analytics.md](./realtime_tournament_analytics.md) - Real-time tournament features
- [meta_analytics_data_strategy.md](./meta_analytics_data_strategy.md) - Tournament meta analytics
- [skill_weighted_analysis_algorithm.md](./skill_weighted_analysis_algorithm.md) - Skill-tier weighting

### 📁 Infrastructure Research

Infrastructure and tooling research:

- [monorepo-implementation-guide.md](./monorepo-implementation-guide.md) - Monorepo setup guide
- [architecture-research-monorepo-vs-single-app.md](./architecture-research-monorepo-vs-single-app.md) - Monorepo decision
- [cross-platform-ui-libraries.md](./cross-platform-ui-libraries.md) - UI library comparison
- [figma-integration-guide.md](./figma-integration-guide.md) - Design system tokens
- [mobile-cv-video-architecture.md](./mobile-cv-video-architecture.md) - Mobile CV pipeline

### 📁 Legacy / Archived

Documents that are outdated or reference old architecture:

- [battle_stadium_overview.md](./battle_stadium_overview.md) - Old project name executive summary
- [business_strategy_market_penetration.md](./business_strategy_market_penetration.md) - Business strategy
- [partnership_strategy_hardware.md](./partnership_strategy_hardware.md) - Hardware partnerships
- [vgc_cv_decisions.md](./vgc_cv_decisions.md) - Chrome extension architecture
- [mobile_ai_pokemon_replay_converter.md](./mobile_ai_pokemon_replay_converter.md) - Multi-game expansion
- [technical_architecture_deep_dive.md](./technical_architecture_deep_dive.md) - Mobile AI hardware
- `compass_artifact_*.md` - Research exports (miscellaneous)

---

## Tech Stack Summary

| Layer            | Technology            | Notes                                    |
| ---------------- | --------------------- | ---------------------------------------- |
| Auth             | Supabase Auth         | Email/password + OAuth                   |
| Database         | Supabase (PostgreSQL) | Row Level Security                       |
| Edge Functions   | Supabase              | Deno runtime                             |
| Social/Identity  | AT Protocol (Bluesky) | Self-hosted PDS at pds.trainers.gg       |
| Web              | Next.js 16            | React 19, App Router, Server Components  |
| Mobile           | Expo 54               | React Native with Tamagui                |
| Styling (Web)    | Tailwind CSS 4        | OKLCH color system                       |
| Styling (Mobile) | Tamagui               | Shared theme tokens from @trainers/theme |

---

## Contributing

See the root [AGENTS.md](../AGENTS.md) for development guidelines, commands, and conventions.
