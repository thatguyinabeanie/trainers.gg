# trainers.gg — Product Vision Design Spec

> Brainstormed on 2026-03-29. This is the canonical record of the product vision brainstorming session. Curated extracts live in the `product-vision` and `competitive-landscape` skills.

## Mission & Identity

trainers.gg is the all-in-one integrated platform for Pokemon fans. It connects tools that currently exist in isolation — tournaments, analytics, team building, coaching, collection tracking, and community — into a single cohesive experience. There is no central hub for Pokemon today. trainers.gg is that hub.

The platform is built community-first. It is not an esports site. It is a warm, clean, playful space where competitive players, casual fans, coaches, content creators, and community organizers all feel at home. Monetization follows community — not the other way around.

**Design personality:** Clean, Playful, Community-driven. Data-rich and precise where it matters, but never cold or intimidating. Accessible to all ages and comfort levels. Equal priority for desktop and mobile experiences.

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

**Social integration via AT Protocol:** trainers.gg leverages Bluesky's AT Protocol rather than building social features from scratch. Every user automatically gets a `@username.trainers.gg` handle backed by a self-hosted PDS. The long-term vision: users can share tournament results, team publications, and achievements directly to Bluesky from within trainers.gg — making it feel like a fully integrated social platform without the cost of building and maintaining a standalone social network. The feed and social features were descoped from the initial launch to focus on core functionality, but the infrastructure is deployed and ready. When social features are reintroduced, they will feel native because they are — posts published through trainers.gg are real Bluesky posts visible across the entire AT Protocol network.

## Feature Pillars & Roadmap

| Pillar | Status | Description |
|--------|--------|-------------|
| **Tournaments & Competitive** | **Live** | Swiss pairings, brackets, standings, check-in, match reporting. Supports VGC formats. Tournament creation and management for community organizers. |
| **Team Builder** | **Live** | Team sheet parsing, validation, legality checking. Integrated with tournament registration. |
| **Communities** | **Live** | Formerly "Organizations / Tournament Organizers" — rebranded to support both competitive and non-competitive groups. Community listings at `/communities`. Staff roles for event management. |
| **Player Identity & Alts** | **Live** | Multiple player identities per account. Each alt can register independently for tournaments. Main alt matches account username. |
| **User Profiles & Settings** | **Live** | Pokemon sprite avatars, bio, birth date, country. Linked accounts (Bluesky, X, Discord, Twitch). Display preferences for sprite styles. |
| **Notifications & Invitations** | **Live** | Tournament invitations and notification system with category filters. Invitations may merge into notifications in a future redesign. |
| **Analytics** | **Under Construction** | Format-specific meta data tracked over time. Usage stats, trend analysis, and predictive insights on a per-format basis. Will feed directly into the team builder. |
| **Social Integration (AT Protocol)** | **Under Construction** | Infrastructure deployed (self-hosted PDS, automatic account creation, `@username.trainers.gg` handles). User-facing social features (sharing results to Bluesky, activity feeds) descoped from initial launch but the foundation is ready. |
| **Analytics-Powered Team Builder** | **Coming Soon** | Extends the existing team builder with analytics integration — trending picks, falling usage, emerging threats. Collaborative real-time editing via websockets. Private sharing with revocable access (manual or auto-expiry). Team versioning and branching with historical performance tracking across iterations. |
| **Data Aggregation** | **Coming Soon** | Import tournament data from multiple external sources — RK9.gg for official Play! Pokemon events, Limitless for community VGC events, official Pokemon tournament data (Regionals, Internationals, Worlds) for major results. Display standings and team sheets natively on trainers.gg. Feed all imported data into analytics and the team builder. Makes trainers.gg the single destination for VGC results and history regardless of where tournaments are hosted. |
| **Articles / Editorial** | **Coming Soon** | Open publishing platform — no gatekeeping. Team reports, format guides, tournament recaps, beginner content. Private mode for personal team journals. |
| **Coaching Marketplace** | **Coming Soon** | Coaches list services, players browse and book. Coach badge visible in tournament results, match lists, and profiles for organic discovery. Undercuts Metafy/Patreon on fees. Starts with VGC, expandable to other games (speed runs, etc.). |
| **Shiny Dex / Collection Tracking** | **Coming Soon** | Personal collection tracker inspired by shinydex.com / shinyhunt.com. First non-competitive feature pillar — signals the platform is for all Pokemon fans. |
| **Achievements & Progression** | **Coming Soon** | Badges for milestones, seasonal rankings/leaderboards, profile flair/cosmetics earned through participation. |
| **Pokemon GO Support** | **Planned** | Similar tournament structure to VGC makes this the natural next game to support. |
| **Pokemon TCG Support** | **Not Planned** | play.limitlesstcg.com handles TCG well. No need to compete — direct players to Limitless for TCG needs. |

## Competitive Landscape

trainers.gg does not need to replace every existing tool. It needs to be the place that connects them — and be better than any of them at the integrated experience.

### Tournament Platforms

| Competitor | What they do well | Where trainers.gg fits |
|-----------|-------------------|----------------------|
| **start.gg** | Tournament hosting for esports broadly | trainers.gg is Pokemon-focused with deeper game-specific features (team sheets, legality validation, format-aware analytics). Not trying to be a general esports platform. |
| **Battlefy** | General-purpose esports tournament platform. De facto standard for community-run VGC events. | Battlefy is generic — no Pokemon-specific features. trainers.gg is purpose-built for Pokemon with native team sheet parsing and format-aware tournament tools. |
| **RK9.gg** | Official Play! Pokemon event registration and management. The platform of record for official tournament participation. | Not competing with RK9 for official event registration — that's Pokemon Company infrastructure. trainers.gg imports RK9 data and adds analytics, history, and team building on top. |
| **Limitless** | Community VGC tournament hosting and results. Extensive historical data. Also handles TCG. | trainers.gg imports Limitless VGC data for analytics and historical tracking. For community hosting, trainers.gg offers deeper Pokemon-specific tools. Limitless owns TCG — no need to compete there. |

### Analytics & Data Tools

| Competitor | What they do well | Where trainers.gg fits |
|-----------|-------------------|----------------------|
| **Pikalytics** | Pokemon usage stats and analytics | trainers.gg goes further — analytics feed directly into the team builder with predictive insights, tracked over time per format. Analytics are a feature within the platform, not a standalone tool. |
| **Munchstats** | Usage stats and popular sets/spreads for VGC formats | trainers.gg incorporates usage analytics natively — tracked over time with trends and predictions, fed directly into the team builder. |
| **statcrusher.com** | EV usage statistics with graphical visualizations | trainers.gg's analytics cover EV distribution data with visualizations, integrated alongside usage stats, trends, and the team builder. |
| **Reportworm Standings** | Full standings and team sheets for official VGC majors. Open source (GitHub: mikewVGC/vgc-standings). | trainers.gg imports official tournament data to display standings and team sheets natively, while feeding that data into analytics and the team builder. |
| **Labmaus.net / cut-explorer** | Browse team sheets from players who made tournament cut | trainers.gg displays tournament team sheets natively from imported data, with analytics to understand why teams performed well. |
| **vsrecorder.app / PASRS** | Match replay analysis — win rates, usage stats, lead pair analysis, matchup breakdowns. Damage calculator. Evolved from the PASRS Google Sheet. | trainers.gg covers this functionality and integrates it directly into tournaments and team building. Match analytics captured automatically. Team versioning tracks iteration performance over time. |

### Team Building & Calculators

| Competitor | What they do well | Where trainers.gg fits |
|-----------|-------------------|----------------------|
| **Pokemon Showdown (team builder)** | Built-in team builder within the battle simulator. Import/export in paste format. | trainers.gg's team builder adds analytics integration, team versioning/branching, collaborative editing, and private sharing. Exports remain Showdown-compatible. |
| **Gabby's Team Builder** | Type resistance and coverage matrix for a team of 6. Visual indicator of defensive/offensive balance gaps. | trainers.gg integrates type coverage analysis directly into the team builder alongside analytics, damage calcs, and meta data — no need for a separate tool. |
| **nerd-of-now.github.io** | Damage calculator for VGC | trainers.gg integrates damage calculation directly into the team builder workflow — no context-switching. |
| **PokePaste** | Simple team sharing via shareable links. Paste a Showdown team, get a URL. | trainers.gg's team sharing goes further — private sharing with revocable access, auto-expiry, collaborative editing. Teams live on the platform with full analytics history, not just a static paste. |

### Community & Content

| Competitor | What they do well | Where trainers.gg fits |
|-----------|-------------------|----------------------|
| **Nugget Bridge** (defunct) | Was the premier VGC community (~2012-2016). Gold-standard team reports, forums. Its closure left a void. | trainers.gg is the spiritual successor — combining Nugget Bridge's community identity and editorial culture with modern tournament infrastructure, analytics, and decentralized identity. |
| **Nimbasa City Post** | VGC news — tournament recaps, metagame analysis, player interviews | NCP is a media outlet with editorial staff. trainers.gg's open editorial platform lets anyone publish — democratizes what NCP does with a curated team. |
| **Victory Road** | VGC community hub — tournament listings, player rankings/stats, event discovery. Maintains a curated resource directory linking to dozens of external tools. | The fact that Victory Road needs a resource page linking to separate tools proves the fragmentation problem. trainers.gg is the integrated platform that makes that resource page unnecessary. |
| **Smogon** | Competitive Pokemon community and resources | Smogon is a forum/wiki. trainers.gg is an integrated application. Different models — can coexist. |
| **Devonscope** | Pokemon VGC articles and content | trainers.gg opens editorial to everyone — no gatekeeping. Articles can also serve as private journals. |
| **VGC Guide** | Educational resource — beginner to advanced guides on competitive Pokemon fundamentals, team building, battling. | trainers.gg's open editorial platform covers educational content. Community members can write beginner guides, advanced strategy, and everything in between. |
| **VGC Pastes** | Curated rental team database | trainers.gg's team builder with sharing and publishing features covers this — users can share and discover teams natively on the platform. |
| **Liberty Note** | Japanese VGC community counterpart — resources and content for the JP competitive scene. | Worth noting for internationalization. trainers.gg can serve the global community in one place. |

### Coaching

| Competitor | What they do well | Where trainers.gg fits |
|-----------|-------------------|----------------------|
| **Metafy / Patreon** | Coaching marketplaces | trainers.gg undercuts on fees and offers organic discovery — coach badges in tournament results and match lists make coaching visible without browsing a separate marketplace. |

### Collection Tracking

| Competitor | What they do well | Where trainers.gg fits |
|-----------|-------------------|----------------------|
| **shinydex.com / shinyhunt.com** | Shiny collection tracking | trainers.gg brings collection tracking into the same platform as everything else. One account, one profile, one place. |

### TCG (Not Competing)

| Competitor | What they do well | Where trainers.gg fits |
|-----------|-------------------|----------------------|
| **play.limitlesstcg.com** | Pokemon TCG tournaments and data | Limitless owns TCG. No need to compete — direct players to Limitless for TCG needs. |

## User Types

| User Type | What they get from trainers.gg |
|-----------|-------------------------------|
| **Competitive player** | Tournament entry, team building with analytics, match history, performance tracking across team iterations, rating/standings, achievements |
| **Casual fan** | Shiny Dex collection tracking, articles, community membership, Pokemon content, achievements |
| **Coach** | Marketplace listing with organic discovery (badge in tournament results/match lists/profiles), client management, lower fees than Metafy/Patreon |
| **Content creator** | Open editorial platform for articles, team reports, guides — no gatekeeping, reach the community directly |
| **Tournament organizer** | Tournament creation and management tools, community hub, player management, staff roles |
| **Community organizer** | Non-competitive community listings, member management, community presence on the platform |

## Monetization

| Revenue stream | Status | Details |
|---------------|--------|---------|
| **Coaching marketplace fees** | **Coming Soon** | Platform takes a cut on coaching transactions. Fees undercut Metafy/Patreon to attract top coaches. |
| **Advertising** | **Planned** | General site ads. Not a priority — will be added once the community is established. |
| **Premium features** | **Not yet defined** | Community-first approach — monetization follows adoption. Premium tiers may emerge naturally as features mature. |

## Design Direction

| Dimension | Direction |
|-----------|-----------|
| **Personality** | Clean, Playful, Community-driven |
| **Data treatment** | Rich and precise where it matters, never cold or intimidating |
| **Tone** | Warm, friendly, accessible |
| **Anti-reference** | NOT an esports/gaming site. No dark aggressive "gamer" aesthetic, no neon accents, no angular/militaristic UI. |
| **Audience** | All ages, mixed tech comfort, equal desktop/mobile priority |
| **Brand** | Teal primary (OKLCH tokens from `@trainers/theme`) |
| **UI framework** | shadcn/ui + Base UI, Tailwind CSS 4 |
| **Accessibility** | WCAG AA minimum |
