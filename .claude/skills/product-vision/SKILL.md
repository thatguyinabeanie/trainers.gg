---
name: product-vision
description: Product vision, feature roadmap, killer differentiators, user types, and monetization. Use when brainstorming features, making product decisions, or prioritizing work.
---

# trainers.gg — Product Vision

trainers.gg is the all-in-one integrated platform for Pokemon fans. It connects tools that currently exist in isolation — tournaments, analytics, team building, coaching, collection tracking, and community — into a single cohesive experience. There is no central hub for Pokemon today. trainers.gg is that hub.

The platform is built community-first. It is not an esports site. It is a warm, clean, playful space where competitive players, casual fans, coaches, content creators, and community organizers all feel at home. Monetization follows community — not the other way around.

**What trainers.gg is NOT:**

- Not an esports site with dark/aggressive/neon "gamer" aesthetics
- Not a walled garden — data is imported from external sources (Limitless, Showdown, RK9.gg) so the platform is valuable even without native tournament adoption
- Not a gatekeeper — editorial, coaching, and community features are open to everyone

## Killer Differentiators

**Analytics-powered team builder:** Format-specific meta data tracked over time with predictive insights. Users can see what's trending, what's falling off, and what's emerging — per format, per time period. These insights feed directly into the team building workflow. Users who don't want analytics can ignore them and use the builder as a straightforward team management tool. Managing teams on the same platform where tournaments happen eliminates the copy-paste-and-link-sharing workflow that exists today.

**Integrated coaching marketplace:** Coaches are not siloed in a separate marketplace. A coach badge appears in tournament results, match lists, and player profiles — making discovery organic. Users see someone perform well in a tournament and immediately see they offer coaching. Coach profiles live at `/coaching` AND on the coach's personal profile page. The platform undercuts Metafy and Patreon on fees, giving top players a financial reason to list services on trainers.gg. The presence of top players as coaches attracts casual players, creating a growth flywheel. Coaching starts with VGC but can expand to other games (speed run coaching, for example).

**Team versioning and branching:** Players currently manage team iterations by maintaining multiple PASRS spreadsheets or separate vsrecorder entries — losing the connection between versions. trainers.gg makes this native: "fork" a team to create a new iteration while preserving all analytics from previous versions. Variants live under a parent team with clear separation between iterations. The full history of how a team evolved — and how each version performed — is tracked over time and available directly in the team builder. This is the core differentiator: historical performance data across team iterations, integrated into the building workflow.

**Collaborative team building:** Real-time co-editing via websockets so players can build teams together remotely. Private sharing with revocable access — share a team with someone temporarily (manually or with auto-expiry) for collaboration, then revoke when done. This solves the real problem of competitive players wanting to work together on teams without broadcasting them publicly.

**Open editorial platform:** Anyone can write and publish articles — no gatekeeping like Devonscope. Topics include team reports, format analyses, beginner guides, tournament recaps, or anything Pokemon-related. Articles can also be set to private, functioning as a personal journal for team notes and match reflections. This makes the editorial feature useful for both content creators and individual players.

**Data aggregation:** Tournament data is imported from multiple external sources — RK9.gg for official Play! Pokemon events, Limitless for community VGC events, official Pokemon tournament data (Regionals, Internationals, Worlds) for major results. Display standings and team sheets natively on trainers.gg. Feed all imported data into analytics and the team builder. Makes trainers.gg the single destination for VGC results and history regardless of where tournaments are hosted.

**Social integration via AT Protocol:** trainers.gg leverages Bluesky's AT Protocol rather than building social features from scratch. Every user automatically gets a `@username.trainers.gg` handle backed by a self-hosted PDS. The long-term vision: users can share tournament results, team publications, and achievements directly to Bluesky from within trainers.gg — making it feel like a fully integrated social platform without the cost of building and maintaining a standalone social network. When social features are reintroduced, they will feel native because they are — posts published through trainers.gg are real Bluesky posts visible across the entire AT Protocol network.

## Feature Pillars & Roadmap

| Pillar                               | Status                 | Description                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tournaments & Competitive**        | **Live**               | Swiss pairings, brackets, standings, check-in, match reporting. Supports VGC formats. Tournament creation and management for community organizers.                                                                                                                                           |
| **Team Builder**                     | **Live**               | Team sheet parsing, validation, legality checking. Integrated with tournament registration.                                                                                                                                                                                                  |
| **Communities**                      | **Live**               | Formerly "Organizations / Tournament Organizers" — rebranded to support both competitive and non-competitive groups. Community listings at `/communities`. Staff roles for event management.                                                                                                 |
| **Player Identity & Alts**           | **Live**               | Multiple player identities per account. Each alt can register independently for tournaments. Main alt matches account username.                                                                                                                                                              |
| **User Profiles & Settings**         | **Live**               | Pokemon sprite avatars, bio, birth date, country. Linked accounts (Bluesky, X, Discord, Twitch). Display preferences for sprite styles.                                                                                                                                                      |
| **Notifications & Invitations**      | **Live**               | Tournament invitations and notification system with category filters. Invitations may merge into notifications in a future redesign.                                                                                                                                                         |
| **Analytics**                        | **Under Construction** | Format-specific meta data tracked over time. Usage stats, trend analysis, and predictive insights on a per-format basis. Will feed directly into the team builder.                                                                                                                           |
| **Social Integration (AT Protocol)** | **Under Construction** | Infrastructure deployed (self-hosted PDS, automatic account creation, `@username.trainers.gg` handles). User-facing social features descoped from initial launch but the foundation is ready.                                                                                                |
| **Analytics-Powered Team Builder**   | **Coming Soon**        | Extends the existing team builder with analytics integration — trending picks, falling usage, emerging threats. Collaborative real-time editing via websockets. Private sharing with revocable access. Team versioning and branching with historical performance tracking across iterations. |
| **Data Aggregation**                 | **Coming Soon**        | Import tournament data from RK9.gg, Limitless, and official Pokemon tournament sources. Display standings and team sheets natively. Feed all imported data into analytics and the team builder.                                                                                              |
| **Articles / Editorial**             | **Coming Soon**        | Open publishing platform — no gatekeeping. Team reports, format guides, tournament recaps, beginner content. Private mode for personal team journals.                                                                                                                                        |
| **Coaching Marketplace**             | **Coming Soon**        | Coaches list services, players browse and book. Coach badge visible in tournament results, match lists, and profiles for organic discovery. Undercuts Metafy/Patreon on fees. Starts with VGC, expandable to other games.                                                                    |
| **Shiny Dex / Collection Tracking**  | **Coming Soon**        | Personal collection tracker inspired by shinydex.com / shinyhunt.com. First non-competitive feature pillar — signals the platform is for all Pokemon fans.                                                                                                                                   |
| **Achievements & Progression**       | **Coming Soon**        | Badges for milestones, seasonal rankings/leaderboards, profile flair/cosmetics earned through participation.                                                                                                                                                                                 |
| **Pokemon GO Support**               | **Planned**            | Similar tournament structure to VGC makes this the natural next game to support.                                                                                                                                                                                                             |
| **Pokemon TCG Support**              | **Not Planned**        | play.limitlesstcg.com handles TCG well. No need to compete — direct players to Limitless for TCG needs.                                                                                                                                                                                      |

## User Types

| User Type                | What they get from trainers.gg                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Competitive player**   | Tournament entry, team building with analytics, match history, performance tracking across team iterations, rating/standings, achievements       |
| **Casual fan**           | Shiny Dex collection tracking, articles, community membership, Pokemon content, achievements                                                     |
| **Coach**                | Marketplace listing with organic discovery (badge in tournament results/match lists/profiles), client management, lower fees than Metafy/Patreon |
| **Content creator**      | Open editorial platform for articles, team reports, guides — no gatekeeping, reach the community directly                                        |
| **Tournament organizer** | Tournament creation and management tools, community hub, player management, staff roles                                                          |
| **Community organizer**  | Non-competitive community listings, member management, community presence on the platform                                                        |

## Monetization

| Revenue stream                | Status              | Details                                                                                                          |
| ----------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Coaching marketplace fees** | **Coming Soon**     | Platform takes a cut on coaching transactions. Fees undercut Metafy/Patreon to attract top coaches.              |
| **Advertising**               | **Planned**         | General site ads. Not a priority — will be added once the community is established.                              |
| **Premium features**          | **Not yet defined** | Community-first approach — monetization follows adoption. Premium tiers may emerge naturally as features mature. |
