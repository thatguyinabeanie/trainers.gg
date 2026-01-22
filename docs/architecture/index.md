---
title: Architecture Overview
description: Comprehensive system design and architecture documentation for Battle Stadium
category: architecture
obsidian_compatible: true
---

Welcome to the architecture documentation for Battle Stadium!

**Battle Stadium is a grassroots, community-driven platform** designed to empower content creators, Discord communities, and grassroots organizers to host online Pokemon tournaments. This architecture is built with simplicity, accessibility, and community needs at its core.

This index provides an overview and links to all major technical and design documents, grouped by feature.

---

## 📊 Reputation System

- [Reputation System Spec](./reputation/reputation-system.md): Main specification and overview
- [Deep Dive & Q&A](./reputation/reputation-system-deep-dive.md): Detailed design, open questions, UI/UX, privacy
- [Master Diagram (PlantUML)](./reputation/reputation-system-master-diagram.puml): Full system diagram

## 🗄️ Database

- [Database Diagram](./database/database-diagram.md): Main database schema and relationships
- [Database Gaps & Questions](./database/database-gaps-and-questions.md): Open questions and discussion

## ⚡ Real-Time & Integration

- [Real-Time DB Integration](./real-time/real-time-db-integration.md): Real-time data architecture
- [Websockets](./real-time/websockets.md): Websocket and real-time communication design
- [Computer Vision System](./computer-vision-system.md): VGC battle analysis and replay generation

## 📱 Mobile Strategy

- [Mobile App Strategy](./mobile-app-strategy.md): React Native migration plan and architecture
- [Computer Vision System](./computer-vision-system.md): VGC battle analysis and replay generation

## 🏗️ Monorepo Architecture

Battle Stadium uses a **Turborepo monorepo** with pnpm workspaces:

```
battle-stadium/
├── apps/
│   ├── web/        # Next.js 15 (React 19, Tailwind v4)
│   └── mobile/     # Expo (React Native, NativeWind)
├── packages/
│   ├── lib/        # Shared business logic
│   ├── types/      # Shared TypeScript types
│   ├── validation/ # Shared Zod schemas
│   └── ui/         # Shared design tokens
├── convex/         # Shared backend (queries, mutations, schema)
└── docs/           # Documentation
```

- [Monorepo Implementation Guide](../monorepo-implementation-guide.md): Complete implementation details and history
- [Architecture Decision](../architecture-research-monorepo-vs-single-app.md): Why we chose this approach
- [Cross-Platform UI Libraries](../cross-platform-ui-libraries.md): React Native Reusables + NativeWind

## 🛠️ Technical Stack

- [T3 Stack Integration](./t3-stack-integration.md): Original shared code strategy (superseded by monorepo)

## 🔐 Role-Based Access Control (RBAC)

- [RBAC Explained](./rbac/rbac-explained.md): Permissions, roles, and access control

## 👤 User & Profile Management

- [Profiles Architecture](./profiles-architecture.md): Multi-profile system design, tiers, and data management

## 📝 Planning & Roadmap

- [Build Plan](./planning/build-plan.md): Roadmap and implementation plan
- [Feature Survey](./planning/feature-survey.md): Feature prioritization and survey results

---

Each folder contains all related specs, diagrams, and deep dives for that feature area.
For questions or suggestions, see the relevant doc or contact the project maintainers.
