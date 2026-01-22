# Build Plan

This document outlines exactly what will be built for the Battle Stadium platform, blending requirements, product specification,
and technical implementation details, as derived from the complete documentation set.

---

## 1. Vision & Mission

- **Goal:** Create the definitive, community-driven platform for competitive Pokémon tournaments, analytics, and player engagement
  -with a focus on VGC and extensibility to all formats.
- **Values:** Love, kindness, respect, honesty, community, fairness, equity, equality, accountability.

---

## 2. Core Features & Requirements

### 2.1. User Types & Roles

- **Players:** Register, manage teams, join tournaments, view analytics, drop from events.
- **Organizers:** Create/manage organizations, run tournaments, assign staff, manage branding.
- **Judges/Staff:** Enter results, resolve disputes, verify teams, manage check-in, handle penalties.
- **Admins:** Full org control, manage staff, analytics, settings (except billing/ownership).
- **Spectators:** (Future) View public brackets, standings, streams, follow players/teams.
- **Site Admins:** Platform-level superusers, manage all orgs/tournaments/users.

### 2.2. Organizations & Groups

- Each user can own one organization (tied to main profile).
- Organizations have groups (Admins, Judges, Staff, Players, Spectators) and granular roles (see below).
- Customizable group/role assignments; default template provided.

### 2.3. Roles & Permissions

- Full matrix of roles (Owner, Admin, Tournament Director, Head Judge, Judge, Scorekeeper, etc.)
- Fine-grained permission matrix (see [[organizations/permissions/ORG_PERMISSIONS]]).
- Support for custom roles, temporary/event-based roles, and audit logs.

### 2.4. Tournaments

- Owned by organizations; only org owners can create tournaments.
- Unique, slug-based URLs per tournament (scoped to org).
- Tournament structure: registration, check-in, pairings, results, analytics, archiving.
- Staff assignment, player management, deck/teamlist verification, penalty/appeals system.

### 2.5. Player Profiles & Teams

- Unique, case-insensitive profile names.
- Team management: import/export (Showdown text), validation, privacy controls, versioning (future).
- Player dashboards: tournament history, analytics, team management.

### 2.6. Analytics

- Metagame trends, win rates, archetypes, player rankings, matchup stats.
- Public and advanced analytics (premium users).
- Data sources: Limitless TCG, Showdown, RK9, Falinks Team Builder.
- Raw data is not public; privacy and data protection enforced.

### 2.7. Articles & Content

- Team reports, guides, event coverage, tagging/recommendation system (future).
- Media uploads (photos, videos, overlays) by staff/streamers.

### 2.8. Dashboard & User Flows

- User home: settings, profiles, teams, tournaments, analytics.
- Expandable, sortable tournament tables.
- Organization creation requests, team privacy/sharing rules.

### 2.9. Subscriptions & Monetization

- Free platform; optional monthly subscription ("Battle Pass") for perks (profile aesthetics, uncapped profiles, etc.).
- No essential features paywalled; organizers may run paid-entry tournaments.

### 2.10. Security & Privacy

- Strict profanity filtering, role-based authorization, audit logs.
- Data protection, privacy best practices, legal compliance.

---

## 3. Product Specification

### 3.1. Web App (Next.js)

- Main UI for all user types.
- Responsive, modern, clean design (inspired by Limitless TCG, Battlefy, DEV, Landbook).
- Obsidian-compatible docs with [WikiLinks].

### 3.2. API Layer (Convex)

- End-to-end typesafe API for the web app using Convex functions.
- Shared types, validation, and auth logic within the Convex backend.

### 3.3. Database (Convex)

- Type-safe schema for users, orgs, tournaments, teams, analytics, permissions, and audit logs, all managed within Convex.

### 3.4. Authentication (Convex Auth)

- Secure user authentication and role assignment using Convex's built-in authentication.

### 3.5. CI/CD & Deployment

- Web App: Vercel
- Backend: Convex

---

## 4. Technical Implementation Plan

### 4.1. Monorepo Structure

- All apps, packages, and tooling in a single monorepo.
- Shared types, UI, and validation across web/mobile.
- Modular package structure for easy feature addition.

### 4.2. Extensibility & Modularity

- Add new formats by extending routers, schemas, and UI.
- Support for custom org templates, roles, and permissions.
- Future-proofing: localization, changelog, release notes, community/feedback features.

### 4.3. Data Flow

1. User interacts with app (web/mobile).
2. API processes request, validates, interacts with DB.
3. Response returned, UI updates.
4. Analytics collected, access controlled.

### 4.4. Security & Compliance

- Role-based access control at all layers.
- Audit logs for sensitive actions.
- Privacy, copyright, and user-generated content policies.

### 4.5. Documentation & Community

- Obsidian-compatible docs, persistent navigation, diagrams, user/developer guides.
- Community features: Discord/forums, "Suggest an Edit", feedback links.

---

## 5. Inspirations & References

- [Limitless TCG](https://play.limitlesstcg.com/), [Battlefy](https://battlefy.com/), [Toornament](https://play.toornament.com/en_US/)
- [DEV](https://dev.to), [Landbook](https://land-book.com)

---

## 6. Future Enhancements

- Article system with tagging/recommendations
- Team sharing (private/public)
- Nextra-powered docs app
- Full-text doc search, diagram rendering, localization
- More as project evolves

---

_This build plan is a living document and will evolve as the project and community grow. For detailed permission matrices, role definitions, and group templates, see the linked docs in the organizations section._
