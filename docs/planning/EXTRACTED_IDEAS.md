# Extracted Feature Ideas

> **Status:** ✅ **PROCESSED** — All ideas reviewed and synced to Linear on 2026-01-27
>
> **Purpose:** Consolidated list of feature ideas extracted from archived brainstorming docs.

## Processing Summary

| Metric                            | Count |
| --------------------------------- | ----- |
| Total Ideas in File               | ~197  |
| Already Covered by Existing Epics | ~170  |
| New Issues Created                | 14    |

### New Issues Created

| ID     | Title                                    | Project             | Phase          |
| ------ | ---------------------------------------- | ------------------- | -------------- |
| BEA-78 | Subscription Tiers & Monetization System | Infrastructure      | phase:2-growth |
| BEA-79 | B2B Tournament Organizer Packages        | Tournaments         | phase:3-future |
| BEA-80 | Creator Marketplace & Content Economy    | Content & Streaming | phase:3-future |
| BEA-81 | Hardware Partnerships Program            | Infrastructure      | phase:3-future |
| BEA-82 | Discord Integration                      | Social & Feed       | phase:2-growth |
| BEA-83 | International Expansion & Localization   | Infrastructure      | phase:3-future |
| BEA-84 | Apple App Store Featuring Strategy       | Mobile App          | phase:3-future |
| BEA-85 | Pokemon Unite Integration                | Multi-Game          | phase:3-future |
| BEA-86 | QR Rental Team Scanner                   | Team Builder        | phase:2-growth |
| BEA-87 | Notification System                      | Infrastructure      | phase:2-growth |
| BEA-88 | Accessibility (WCAG Compliance)          | Infrastructure      | phase:1-mvp    |
| BEA-89 | Pokemon Sprites & Assets Integration     | Infrastructure      | phase:1-mvp    |
| BEA-90 | Performance Optimization                 | Infrastructure      | phase:2-growth |
| BEA-91 | Battle Stat Calculator                   | Team Builder        | phase:2-growth |

---

---

## Table of Contents

1. [AI/ML & Computer Vision](#aiml--computer-vision)
2. [Analytics & Meta](#analytics--meta)
3. [Tournament System](#tournament-system)
4. [Mobile App](#mobile-app)
5. [Multi-Game Platform](#multi-game-platform)
6. [Realtime & Social](#realtime--social)
7. [Replay Analysis](#replay-analysis)
8. [User Experience](#user-experience)
9. [Content Creation](#content-creation)
10. [Organization & Staff](#organization--staff)
11. [Business & Monetization](#business--monetization)
12. [Partnerships](#partnerships)
13. [International](#international)
14. [Infrastructure & Tooling](#infrastructure--tooling)
15. [Backlog from Audits](#backlog-from-audits)

---

## AI/ML & Computer Vision

### Core CV Features

| ID    | Idea                        | Description                                                     | Source                  |
| ----- | --------------------------- | --------------------------------------------------------------- | ----------------------- |
| CV-01 | Pokemon Species Recognition | Real-time CV to identify Pokemon species from video/screenshots | battle_stadium_overview |
| CV-02 | HP Bar Analysis             | Extract current HP percentages from battle visuals              | battle_stadium_overview |
| CV-03 | Move Text OCR               | Recognize move names from battle screens                        | battle_stadium_overview |
| CV-04 | Status Effect Detection     | Detect status conditions (burn, paralysis, etc.) from visuals   | technical_architecture  |
| CV-05 | Tera Type Detection         | Identify Tera type from visual indicators                       | mobile-cv-video         |
| CV-06 | Battle State Detection      | Full game state extraction (Pokemon, HP, status, moves)         | tournament-schema       |

### Advanced CV

| ID    | Idea                              | Description                                                                 | Source                  |
| ----- | --------------------------------- | --------------------------------------------------------------------------- | ----------------------- |
| CV-07 | Opponent Stat Reverse-Engineering | Calculate opponent EVs/IVs/natures from damage numbers using damage formula | battle_stadium_overview |
| CV-08 | Battle Flow Temporal Tracking     | Track game state changes and decisions across battle timeline               | battle_stadium_overview |
| CV-09 | Zero-Storage Architecture         | Process video, store only structured data (~100KB vs full video)            | technical_architecture  |
| CV-10 | Multi-Language OCR                | Support OCR in Japanese, Korean, Chinese, European languages                | vgc_cv_decisions        |

### AI Features

| ID    | Idea                           | Description                                                          | Source                  |
| ----- | ------------------------------ | -------------------------------------------------------------------- | ----------------------- |
| AI-01 | Multi-Model Architecture       | Support OpenAI, Anthropic, Google with model selection by query type | ai_integration          |
| AI-02 | Tier-Based AI Prompts          | Different prompt quality by subscription tier                        | ai_integration          |
| AI-03 | RAG for Tournament Data        | Retrieval-augmented generation for meta insights, player profiles    | ai_integration          |
| AI-04 | Prompt Caching by Tier         | 40-80% cost savings via intelligent cache by subscription level      | ai_integration          |
| AI-05 | BYOK Support                   | Bring Your Own Key for power users                                   | ai_integration          |
| AI-06 | Meta Prediction AI             | Predict upcoming meta shifts using historical data                   | battle_stadium_overview |
| AI-07 | Automated Highlight Generation | AI identifies key moments and auto-generates clips                   | battle_stadium_overview |

### ML Models

| ID    | Idea                    | Description                                 | Source              |
| ----- | ----------------------- | ------------------------------------------- | ------------------- |
| ML-01 | Pokemon Sprite Detector | YOLO-based model for Pokemon identification | mobile-cv-video     |
| ML-02 | HP Bar Reader           | OpenCV-based HP percentage extraction       | mobile-cv-video     |
| ML-03 | Status/Tera Classifier  | CNN for status conditions and Tera type     | mobile-cv-video     |
| ML-04 | Custom Feed Generator   | ML-powered Pokemon-curated Bluesky feed     | bluesky_integration |

---

## Analytics & Meta

### Meta Analysis

| ID      | Idea                            | Description                                                              | Source                  |
| ------- | ------------------------------- | ------------------------------------------------------------------------ | ----------------------- |
| META-01 | Real Tournament Meta Database   | Aggregate actual cartridge tournament data, not just ladder stats        | battle_stadium_overview |
| META-02 | Team Preview Decision Analysis  | Track "bring 4 out of 6" selection patterns                              | battle_stadium_overview |
| META-03 | Regional Meta Differences       | Visualize meta by geography (Japan vs US vs EU)                          | battle_stadium_overview |
| META-04 | Skill Tier Meta Evolution       | Show how meta differs across skill brackets                              | skill_weighted          |
| META-05 | Tournament vs Ladder Comparison | Compare high-stakes tournament vs online ladder strategies               | battle_stadium_overview |
| META-06 | Cross-Bracket Analysis          | Identify "skill traps" - Pokemon that work at low skill but fail at high | skill_weighted          |
| META-07 | Bring Rate Optimization         | Analyze optimal team selection patterns                                  | meta_analytics          |
| META-08 | Real-time Meta Tracking         | Live meta tracking during multi-day tournaments                          | meta_analytics          |
| META-09 | Predictive Meta Modeling        | Trend forecasting for upcoming meta shifts                               | meta_analytics          |

### Player Analytics

| ID        | Idea                            | Description                                                                       | Source            |
| --------- | ------------------------------- | --------------------------------------------------------------------------------- | ----------------- |
| PLAYER-01 | Modified ELO Rating             | Tournament-weighted rating with game importance                                   | skill_weighted    |
| PLAYER-02 | Multi-Source Rating Integration | Combine Showdown, IRL, platform ratings                                           | skill_weighted    |
| PLAYER-03 | Skill Brackets                  | Developing (800-1350), Competitive (1350-1650), Expert (1650-1900), Elite (1900+) | skill_weighted    |
| PLAYER-04 | Personal Performance Tracking   | Goal setting and progress visualization                                           | skill_weighted    |
| PLAYER-05 | Anomaly Detection               | Flag rating manipulation or collusion                                             | skill_weighted    |
| PLAYER-06 | Matchup Statistics              | Win rates for specific team/Pokemon matchups                                      | tournament-schema |

### Tournament Analytics

| ID             | Idea                                | Description                                                        | Source            |
| -------------- | ----------------------------------- | ------------------------------------------------------------------ | ----------------- |
| T-ANALYTICS-01 | Tournament Tier Weighting           | Weight data by tournament importance (casual 0.2x → official 2.0x) | skill_weighted    |
| T-ANALYTICS-02 | Statistical Significance Validation | Ensure meta insights have sufficient sample size                   | skill_weighted    |
| T-ANALYTICS-03 | Archetype Classification            | Auto-categorize teams into meta archetypes                         | tournament-schema |

---

## Tournament System

### Match Management

| ID       | Idea                       | Description                                                    | Source            |
| -------- | -------------------------- | -------------------------------------------------------------- | ----------------- |
| MATCH-01 | Self-Report Match Results  | Players independently report with auto-confirm when both agree | tournament-schema |
| MATCH-02 | Judge Request System       | Disputed results trigger "Request a Judge" workflow            | tournament-schema |
| MATCH-03 | Auto-Confirm Timeout       | 45-second timeout before auto-confirming submitted result      | tournament-schema |
| MATCH-04 | Match Override Permissions | Role-based permissions for judges/admins to reset/override     | tournament-schema |

### Tournament Structure

| ID        | Idea                       | Description                                               | Source            |
| --------- | -------------------------- | --------------------------------------------------------- | ----------------- |
| STRUCT-01 | Multi-Phase Tournaments    | Swiss → Top Cut progression with configurable phase rules | tournament-schema |
| STRUCT-02 | Tournament Templates       | Reusable configs (swiss_only, swiss_with_cut)             | tournament-schema |
| STRUCT-03 | Custom Org Templates       | Organizations save their own tournament configurations    | tournament-schema |
| STRUCT-04 | Tiebreaker Calculations    | Pre-calculate and store tiebreaker values                 | tournament-schema |
| STRUCT-05 | Individual Bracket Records | Store bracket positions as separate records               | tournament-schema |
| STRUCT-06 | Real-time Bracket Updates  | Live bracket changes via Supabase Realtime                | tournament-schema |

### Tournament Operations

| ID     | Idea                         | Description                                            | Source                  |
| ------ | ---------------------------- | ------------------------------------------------------ | ----------------------- |
| OPS-01 | Tournament Registration Flow | End-to-end player registration experience              | audits                  |
| OPS-02 | Team Submission Interface    | UI for submitting Pokemon teams                        | audits                  |
| OPS-03 | Team Format Validation       | Validate teams against tournament format rules         | tournament-schema       |
| OPS-04 | Limitless Data Import        | Pull historical data from Limitless API                | tournament-schema       |
| OPS-05 | Tournament Fraud Detection   | Flag impossible damage calculations or suspicious data | battle_stadium_overview |
| OPS-06 | Video Dispute Resolution     | 7-day video retention for dispute resolution           | vgc_cv_decisions        |

### Live Tournament

| ID      | Idea                       | Description                                                                     | Source              |
| ------- | -------------------------- | ------------------------------------------------------------------------------- | ------------------- |
| LIVE-01 | Live Field Analysis        | Real-time analysis by record group                                              | realtime_tournament |
| LIVE-02 | Personal Coaching Insights | Threats, advantages, mental coaching (60-second SLA)                            | realtime_tournament |
| LIVE-03 | Between-Rounds Coaching    | Quick insights during round breaks                                              | realtime_tournament |
| LIVE-04 | Coaching Insight Types     | threat_warning, advantage_opportunity, strategy_recommendation, mental_coaching | realtime_tournament |
| LIVE-05 | SLA Monitoring             | Track and alert on insight delivery times                                       | realtime_tournament |

---

## Mobile App

### Core Mobile

| ID     | Idea                       | Description                                          | Source                  |
| ------ | -------------------------- | ---------------------------------------------------- | ----------------------- |
| MOB-01 | Camera Roll Import         | Import battle videos from camera roll for analysis   | battle_stadium_overview |
| MOB-02 | On-Device Processing       | Process videos locally without upload (privacy mode) | battle_stadium_overview |
| MOB-03 | Selective Analysis Sharing | Choose which analyses to upload vs keep private      | battle_stadium_overview |
| MOB-04 | Local Video Library        | SQLite storage for match recordings with Drizzle ORM | mobile-cv-video         |
| MOB-05 | VisionCamera Integration   | Frame processors for real-time CV                    | mobile-cv-video         |
| MOB-06 | H.265 Video Recording      | Efficient codec for match recordings                 | mobile-cv-video         |

### Team Management

| ID      | Idea                         | Description                               | Source            |
| ------- | ---------------------------- | ----------------------------------------- | ----------------- |
| TEAM-01 | Pokepaste Import             | Import teams from Pokepaste format        | tournament-schema |
| TEAM-02 | Showdown Export Parser       | Parse Showdown team exports               | tournament-schema |
| TEAM-03 | QR Rental Team Scan          | Scan in-game QR codes to import teams     | tournament-schema |
| TEAM-04 | Stat Calculator              | Calculate battle stats with all modifiers | tournament-schema |
| TEAM-05 | Team Builder (Drag-and-Drop) | Visual team building interface            | audits            |

---

## Multi-Game Platform

### Pokemon GO

| ID    | Idea                           | Description                                         | Source            |
| ----- | ------------------------------ | --------------------------------------------------- | ----------------- |
| GO-01 | Real-time IV Calculation       | Calculate opponent IVs from CP and level during PvP | mobile_ai_pokemon |
| GO-02 | Energy Management Optimization | Track energy and recommend charge move timing       | mobile_ai_pokemon |
| GO-03 | Switch Timing Recommendations  | AI suggestions for optimal switch timing            | mobile_ai_pokemon |
| GO-04 | League Meta Analytics          | Great/Ultra/Master League comprehensive meta        | mobile_ai_pokemon |

### Pokemon TCG Pocket

| ID     | Idea                      | Description                              | Source            |
| ------ | ------------------------- | ---------------------------------------- | ----------------- |
| TCG-01 | Card Recognition AI       | Identify cards from screen capture       | mobile_ai_pokemon |
| TCG-02 | Deck Composition Tracking | Monitor deck builds across matches       | mobile_ai_pokemon |
| TCG-03 | Pack Opening Analytics    | Track pull rates and collection progress | mobile_ai_pokemon |

### Pokemon Unite

| ID       | Idea                     | Description                                     | Source            |
| -------- | ------------------------ | ----------------------------------------------- | ----------------- |
| UNITE-01 | Positioning Analysis     | MOBA-style positioning and map control analysis | mobile_ai_pokemon |
| UNITE-02 | Objective Timing Tracker | Alerts for key objective spawns                 | mobile_ai_pokemon |
| UNITE-03 | Team Fight Breakdown     | Post-match team fight analysis                  | mobile_ai_pokemon |

---

## Realtime & Social

### Chat System

| ID      | Idea                          | Description                                | Source            |
| ------- | ----------------------------- | ------------------------------------------ | ----------------- |
| CHAT-01 | Tournament Chat Channels      | Real-time chat for participants and staff  | tournament-schema |
| CHAT-02 | Message History               | Persistent storage with conversation fetch | tournament-schema |
| CHAT-03 | Fine-grained Chat Permissions | Role-based posting permissions             | tournament-schema |
| CHAT-04 | Typing Indicators             | Show when others are typing                | tournament-schema |

### Presence

| ID      | Idea                       | Description                     | Source            |
| ------- | -------------------------- | ------------------------------- | ----------------- |
| PRES-01 | Online Presence Indicators | Show who's online/viewing       | tournament-schema |
| PRES-02 | Live Match Viewers         | Count of users watching a match | tournament-schema |
| PRES-03 | Admin Live Dashboard       | Real-time user activity for TOs | tournament-schema |

### Social Features

| ID        | Idea                    | Description                               | Source                  |
| --------- | ----------------------- | ----------------------------------------- | ----------------------- |
| SOCIAL-01 | Pokemon-Curated Feed    | Bluesky feed filtered for Pokemon content | bluesky_integration     |
| SOCIAL-02 | Full Bluesky Feed View  | View complete Bluesky timeline            | bluesky_integration     |
| SOCIAL-03 | Cross-Posting Toggle    | Post to both trainers.gg and Bluesky      | bluesky_integration     |
| SOCIAL-04 | Image Upload for Posts  | Attach images to posts                    | bluesky_integration     |
| SOCIAL-05 | Like/Repost/Follow      | Standard social interactions              | bluesky_integration     |
| SOCIAL-06 | Battle Analysis Sharing | Share analyzed battles for discussion     | battle_stadium_overview |

---

## Replay Analysis

### Input Methods

| ID        | Idea                       | Description                                                 | Source            |
| --------- | -------------------------- | ----------------------------------------------------------- | ----------------- |
| REPLAY-01 | Universal Game State Model | Support Showdown, manual input, video, tournament recording | replay_analysis   |
| REPLAY-02 | Manual Input System        | Smart validation and auto-suggestions for manual entry      | replay_analysis   |
| REPLAY-03 | Browser Extension          | One-click Showdown capture                                  | replay_analysis   |
| REPLAY-04 | Showdown Replay Export     | Convert cartridge battles to Showdown format                | tournament-schema |

### Analysis Features

| ID        | Idea                           | Description                             | Source          |
| --------- | ------------------------------ | --------------------------------------- | --------------- |
| REPLAY-05 | Decision Point Analysis        | Identify critical moments in battles    | replay_analysis |
| REPLAY-06 | "What If" Scenario Branching   | Explore alternate decision paths        | replay_analysis |
| REPLAY-07 | RNG Modification               | "What if crit didn't happen?" scenarios | replay_analysis |
| REPLAY-08 | Cross-Game Pattern Recognition | Identify patterns across multiple games | replay_analysis |
| REPLAY-09 | Practice Recommendations       | Suggestions based on replay analysis    | replay_analysis |

### Replay Viewer

| ID        | Idea                  | Description                     | Source                 |
| --------- | --------------------- | ------------------------------- | ---------------------- |
| REPLAY-10 | Turn Timeline         | Visual timeline of battle turns | feature_specifications |
| REPLAY-11 | Decision Highlighting | Highlight key decision points   | feature_specifications |
| REPLAY-12 | Drag-Drop Upload      | Easy replay file upload         | feature_specifications |

---

## User Experience

### Onboarding

| ID    | Idea                          | Description                                                   | Source          |
| ----- | ----------------------------- | ------------------------------------------------------------- | --------------- |
| UX-01 | Adaptive Onboarding           | Different flows by skill level (beginner/intermediate/expert) | user_experience |
| UX-02 | User Personas                 | Casey (beginner), Alex (intermediate), Morgan (expert)        | user_experience |
| UX-03 | Progressive Feature Discovery | Reveal features as user advances                              | user_experience |

### Goals & Progress

| ID    | Idea                   | Description                             | Source          |
| ----- | ---------------------- | --------------------------------------- | --------------- |
| UX-04 | Goal Tracking System   | Set and track competitive goals         | user_experience |
| UX-05 | Milestone Celebrations | Celebrate progress achievements         | user_experience |
| UX-06 | Journey Analytics      | Track user progression through platform | user_experience |

### Mobile UX

| ID    | Idea                          | Description                        | Source          |
| ----- | ----------------------------- | ---------------------------------- | --------------- |
| UX-07 | Mobile-First Tournament Flows | Optimized for live event use       | user_experience |
| UX-08 | Mobile Responsiveness         | All pages work on mobile devices   | audits          |
| UX-09 | Loading States                | User feedback for async operations | audits          |
| UX-10 | Error Handling                | Graceful error states              | audits          |

### Accessibility

| ID      | Idea                  | Description                       | Source                 |
| ------- | --------------------- | --------------------------------- | ---------------------- |
| A11Y-01 | Keyboard Navigation   | Full keyboard nav support         | feature_specifications |
| A11Y-02 | Screen Reader Support | ARIA labels and accessible markup | feature_specifications |
| A11Y-03 | WCAG Compliance       | Meet accessibility standards      | audits                 |

---

## Content Creation

### Overlays & Graphics

| ID         | Idea                            | Description                                 | Source                  |
| ---------- | ------------------------------- | ------------------------------------------- | ----------------------- |
| CONTENT-01 | Professional Broadcast Overlays | TV-quality overlays for streams             | battle_stadium_overview |
| CONTENT-02 | Opponent Team Reveal Graphics   | Predicted opponent spreads with EVs/natures | battle_stadium_overview |
| CONTENT-03 | Real-time Analysis Overlays     | Live stat overlays during broadcast         | tournament-schema       |

### Content Tools

| ID         | Idea                        | Description                                   | Source                  |
| ---------- | --------------------------- | --------------------------------------------- | ----------------------- |
| CONTENT-04 | Battle Replay Format Export | Shareable replay format                       | battle_stadium_overview |
| CONTENT-05 | Meta Narrative Content      | AI-generated insights about tournament trends | battle_stadium_overview |
| CONTENT-06 | Live Commentary Dashboard   | Real-time data panel for commentators         | partnership_strategy    |
| CONTENT-07 | Automated Highlight Clips   | AI-generated highlight reels                  | partnership_strategy    |

### Streaming Integration

| ID        | Idea                    | Description                          | Source               |
| --------- | ----------------------- | ------------------------------------ | -------------------- |
| STREAM-01 | Twitch Extension        | Real-time Battle Stadium overlays    | partnership_strategy |
| STREAM-02 | Twitch Markers          | Auto-mark key moments                | vgc_cv_decisions     |
| STREAM-03 | YouTube Chapters        | Auto-generate chapter markers        | vgc_cv_decisions     |
| STREAM-04 | YouTube Export Workflow | AI-optimized thumbnails and metadata | partnership_strategy |

---

## Organization & Staff

### Role Management

| ID     | Idea                  | Description                              | Source            |
| ------ | --------------------- | ---------------------------------------- | ----------------- |
| ORG-01 | Custom Staff Roles    | Define roles beyond defaults             | tournament-schema |
| ORG-02 | Temporary Event Roles | Roles that expire after tournament       | tournament-schema |
| ORG-03 | Audit Log System      | Track sensitive actions                  | tournament-schema |
| ORG-04 | RBAC Frontend UI      | Role and permission management interface | audits            |
| ORG-05 | Member Management UI  | Org member management interface          | audits            |

### TO Tools

| ID    | Idea                            | Description                           | Source                 |
| ----- | ------------------------------- | ------------------------------------- | ---------------------- |
| TO-01 | Tournament Management Dashboard | Comprehensive TO interface            | audits                 |
| TO-02 | Round Controls                  | Advance rounds, manage pairings       | feature_specifications |
| TO-03 | Result Entry                    | Easy match result entry               | feature_specifications |
| TO-04 | Announcements                   | Push announcements to participants    | feature_specifications |
| TO-05 | Team/Decklist Verification      | Verify submitted teams                | tournament-schema      |
| TO-06 | Penalty & Appeals System        | Warnings, penalties, appeals workflow | tournament-schema      |
| TO-07 | Post-Tournament Reports         | Comprehensive event analytics         | partnership_strategy   |

---

## Business & Monetization

### Subscription Tiers

| ID     | Idea                      | Description                                                            | Source               |
| ------ | ------------------------- | ---------------------------------------------------------------------- | -------------------- |
| BIZ-01 | 4-Tier Subscription Model | Free, Competitor ($14.99), Professional ($39.99), Enterprise ($199.99) | partnership_strategy |
| BIZ-02 | Premium Analytics Tiers   | Free, Competitive ($9.99), Professional ($29.99), Team ($99.99)        | meta_analytics       |
| BIZ-03 | Privacy by Tier           | Free: data used for training, Premium: user-controlled                 | ai_integration       |

### B2B

| ID     | Idea                       | Description                          | Source                  |
| ------ | -------------------------- | ------------------------------------ | ----------------------- |
| B2B-01 | Tournament Organizer Tools | B2B package for TOs                  | battle_stadium_overview |
| B2B-02 | Local TO Free Tier         | Free for events <50 participants     | partnership_strategy    |
| B2B-03 | Regional TO Enterprise     | $500-2000/event with broadcast tools | partnership_strategy    |
| B2B-04 | Data Licensing Program     | Anonymized meta data for researchers | partnership_strategy    |
| B2B-05 | Academic Research Datasets | Curated data for academic use        | meta_analytics          |

### Marketplace

| ID        | Idea                | Description                                | Source                  |
| --------- | ------------------- | ------------------------------------------ | ----------------------- |
| MARKET-01 | Creator Marketplace | Platform for templates, overlays, insights | battle_stadium_overview |
| MARKET-02 | Content Marketplace | Transaction fees for creator content       | partnership_strategy    |

---

## Partnerships

### Hardware

| ID         | Idea                         | Description                       | Source               |
| ---------- | ---------------------------- | --------------------------------- | -------------------- |
| PARTNER-01 | Anker Co-Branded Products    | PowerCore Pro for tournament use  | partnership_strategy |
| PARTNER-02 | Tournament Charging Stations | 10-device stations for TOs        | partnership_strategy |
| PARTNER-03 | Creator Content Kit Bundle   | Power bank, charger, mount bundle | partnership_strategy |
| PARTNER-04 | GoPro Partnership            | Recording presets and pipeline    | partnership_strategy |
| PARTNER-05 | Hardware Revenue Sharing     | 20-30% commission structure       | partnership_strategy |

### Platform Integrations

| ID         | Idea                  | Description                       | Source               |
| ---------- | --------------------- | --------------------------------- | -------------------- |
| PARTNER-06 | Challonge Integration | Bracket sync and result reporting | partnership_strategy |
| PARTNER-07 | Battlefy Integration  | Tournament platform integration   | partnership_strategy |
| PARTNER-08 | Start.gg Integration  | Major platform integration        | partnership_strategy |
| PARTNER-09 | Discord Integration   | Community integration             | audits               |

### Creator Program

| ID         | Idea                           | Description                                               | Source                  |
| ---------- | ------------------------------ | --------------------------------------------------------- | ----------------------- |
| CREATOR-01 | Tiered Creator Program         | Elite (500k+), Professional (50k-500k), Emerging (5k-50k) | partnership_strategy    |
| CREATOR-02 | Creator Collaboration Platform | Shared workspaces for cross-promotion                     | partnership_strategy    |
| CREATOR-03 | Creator Performance Dashboard  | Engagement and attribution analytics                      | partnership_strategy    |
| CREATOR-04 | Elite Player Endorsement       | Featured endorsements from top players                    | battle_stadium_overview |
| CREATOR-05 | Early Access Program           | Beta features for major creators                          | battle_stadium_overview |

### App Store

| ID         | Idea                      | Description                         | Source               |
| ---------- | ------------------------- | ----------------------------------- | -------------------- |
| PARTNER-10 | Apple App Store Featuring | Pursue AI/gaming category featuring | partnership_strategy |

---

## International

| ID      | Idea                  | Description                             | Source               |
| ------- | --------------------- | --------------------------------------- | -------------------- |
| INTL-01 | Japan Market Entry    | Full Japanese localization with OCR     | partnership_strategy |
| INTL-02 | Europe Expansion      | Multi-language support, GDPR compliance | partnership_strategy |
| INTL-03 | South America Pricing | Affordable tiers, mobile-first approach | partnership_strategy |

---

## Infrastructure & Tooling

| ID       | Idea                          | Description                                       | Source                |
| -------- | ----------------------------- | ------------------------------------------------- | --------------------- |
| INFRA-01 | ML Model Directory            | Separate `ml/` dir for training artifacts         | implementation_guides |
| INFRA-02 | Chart Color Token System      | Dedicated CSS variables for data viz              | implementation_guides |
| INFRA-03 | Permission-Aware Components   | UI components that respect RBAC                   | implementation_guides |
| INFRA-04 | Design-to-Code Workflow       | Figma MCP integration                             | implementation_guides |
| INFRA-05 | WebSocket Notification System | Real-time notifications                           | realtime_tournament   |
| INFRA-06 | Horizontal Scaling            | Tournament-aware scaling architecture             | realtime_tournament   |
| INFRA-07 | Cost Tracking                 | Real-time AI cost monitoring                      | ai_integration        |
| INFRA-08 | Cache Invalidation Triggers   | Major tournament, format change, user data update | ai_integration        |

---

## Backlog from Audits

> These items were identified in September 2025 audits. Some may already be complete.

### Critical

| ID       | Idea                         | Description                              | Status    |
| -------- | ---------------------------- | ---------------------------------------- | --------- |
| AUDIT-01 | Tournament Registration Flow | End-to-end registration                  | ❓ Verify |
| AUDIT-02 | Team Submission Interface    | UI for team submission                   | ❓ Verify |
| AUDIT-03 | Match Reporting System       | Report match results                     | ❓ Verify |
| AUDIT-04 | Dashboard Data Integration   | Replace hardcoded data with real queries | ❓ Verify |
| AUDIT-05 | Tournament Browsing          | Browse/search tournaments                | ❓ Verify |
| AUDIT-06 | Tournament Viewing/Editing   | View and edit tournaments                | ❓ Verify |

### Medium

| ID       | Idea                         | Description                | Status    |
| -------- | ---------------------------- | -------------------------- | --------- |
| AUDIT-07 | Real-time Tournament Updates | Live updates during events | ❓ Verify |
| AUDIT-08 | Live Bracket Updates         | Real-time bracket viz      | ❓ Verify |
| AUDIT-09 | Real-time Chat/Messaging     | Tournament communication   | ❓ Verify |
| AUDIT-10 | Player Rankings              | Ranking system             | ❓ Verify |
| AUDIT-11 | Advanced Analytics           | Performance tracking       | ❓ Verify |

### Low

| ID       | Idea                        | Description                         | Status    |
| -------- | --------------------------- | ----------------------------------- | --------- |
| AUDIT-12 | Performance Optimization    | Image optimization, bundle analysis | ❓ Verify |
| AUDIT-13 | Notification System         | Push/in-app notifications           | ❓ Verify |
| AUDIT-14 | Pokemon Sprites Integration | Reference sprite assets             | ❓ Verify |

---

## Summary

| Category                 | Count    |
| ------------------------ | -------- |
| AI/ML & Computer Vision  | 21       |
| Analytics & Meta         | 18       |
| Tournament System        | 23       |
| Mobile App               | 11       |
| Multi-Game Platform      | 10       |
| Realtime & Social        | 15       |
| Replay Analysis          | 12       |
| User Experience          | 13       |
| Content Creation         | 11       |
| Organization & Staff     | 13       |
| Business & Monetization  | 10       |
| Partnerships             | 15       |
| International            | 3        |
| Infrastructure & Tooling | 8        |
| Backlog from Audits      | 14       |
| **Total**                | **~197** |

---

## Next Steps

~~1. Review and deduplicate similar ideas~~ ✅ Done
~~2. Prioritize by Phase (see PROJECT_BRIEF.md)~~ ✅ Done (labels applied)
~~3. Verify audit items against current implementation~~ ✅ Most covered by existing epics
~~4. Create Linear labels matching categories above~~ ✅ Using existing labels
~~5. Create Linear tickets with appropriate labels and priorities~~ ✅ Done (14 new issues created)

**This file has been fully processed.** All ideas are now tracked in Linear across 16 projects.
