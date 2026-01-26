# Pokemon Shiny Hunting App - Product Brief 🎮

**Project:** Auto Shiny Counter Competitor + trainers.gg Integration  
**Date:** January 26, 2026

---

## Product Vision 🎯

Build a shiny hunting app that's **affordable, social, and creator-friendly** - competing against Auto Shiny Counter ($40 lifetime) with better pricing ($5 lifetime) and deep trainers.gg integration for social features and content discovery.

---

## Core Features ✅

### What We're Building

**Manual Shiny Hunting Tool:**

- User visually inspects Pokemon (no automation)
- Manual counter with button mapped to controller
- Single button press → increments counter AND sends soft reset to 3DS
- Controller input forwarding via Luma3DS Input Redirection (UDP port 4950)

**trainers.gg Integration:**

- Cloud backup and cross-device sync
- Personal shiny living dex (catalog of all catches)
- Social feed: share catches, follow friends, community engagement
- Hunt statistics and history

**Creator Tools:**

- Embed YouTube/TikTok/Twitch clips in hunt posts
- Auto-import existing shiny videos from social platforms
- Portfolio showcase of all hunts
- Searchable content discovery

### What We're NOT Building ❌

- Automated shiny detection (no memory reading)
- Camera-based visual detection
- Unattended bot automation
- NTR CFW integration

_Rationale: Keep it simple and user-controlled._

---

## Technical Requirements 🛠️

### 3DS Setup (User-side)

**Required CFW Stack:**

1. Boot9strap (b9s) - coldboot foundation
2. Luma3DS - standard CFW with Rosalina
3. Rosalina Input Redirection enabled (L + D-Pad Down + Select → Start InputRedirection)

**Network:**

- 3DS and phone on same local 2.4GHz WiFi
- UDP port 4950 for input commands
- ~80-100ms typical latency

### Input Protocol

**UDP Packet Format (20 bytes, little-endian):**

| Offset | Size | Data                                   |
| ------ | ---- | -------------------------------------- |
| 0-3    | u32  | Button bitmask (inverted: 0 = pressed) |
| 4-7    | u32  | Touch screen state                     |
| 8-11   | u32  | Circle Pad position                    |
| 12-15  | u32  | C-Stick + ZL/ZR                        |
| 16-19  | u32  | Special buttons                        |

**Soft Reset Command:**

- 3DS Pokemon: L+R+Start or L+R+Select
- Hold for ~1 second
- Game reboots in 10-30 seconds

### App Architecture

**Mobile App (React Native/Flutter):**

- Bluetooth controller pairing
- Virtual gamepad UI
- UDP socket to 3DS
- trainers.gg API client

**Backend (trainers.gg):**

- REST API for hunt data
- OAuth authentication
- WebSocket for real-time feed updates
- Image/video storage and CDN
- Social graph (followers, likes, comments)

---

## trainers.gg Social Features 🌐

### Personal Shiny Dex

**Digital Collection:**

- Click any Pokemon → see all your catches of that species
- Hunt statistics per catch (date, encounters, method, game)
- Photos/videos attached to each entry
- Public/private visibility controls

**Auto-sync from App:**

1. Catch shiny in game
2. User confirms in app
3. Prompt to post to trainers.gg
4. Creates post with counter stats
5. Automatically adds to personal dex

### Social Feed

**Community Features:**

- Real-time feed of shiny catches from people you follow
- Like, comment, share on posts
- "Currently hunting" status updates
- Leaderboards (most encounters, fastest shiny, etc.)

**Engagement Hooks:**

- Followers notified when you complete a hunt
- Hunt duration creates competition/community
- Cross-promotion between hunters

---

## Creator Features 🎥

### The Problem We Solve

**Current creator workflow:**

1. Hunt for hours/days (manual counter somewhere)
2. Record the catch
3. Manually edit with counter overlay
4. Upload to platform
5. Post separately on social media
6. **No centralized showcase**

**Our workflow:**

1. Hunt using app (counter automatic)
2. Catch happens
3. Upload clip via app
4. Auto-posted with stats embedded
5. Added to searchable dex

### Video Integration

**Supported Platforms:**

- YouTube embeds
- TikTok embeds
- Twitch clips
- Direct video upload (premium feature)

**Content Organization:**

- Clip collections ("All legendary hunts", "Sub-100 encounters")
- Searchable by Pokemon species
- Filterable by game, method, rarity
- Shareable playlists

### Auto-Import System

**The Killer Feature:**

Instead of manually cataloging 100+ past shiny videos, creators can auto-import:

1. "Import from TikTok" button
2. OAuth login
3. App scans video library
4. **Parses metadata and titles:**
   - Pokemon names from titles/descriptions
   - Encounter counts ("2000 resets", "234 encounters")
   - Game names (BDSP, ORAS, Sword/Shield)
   - Hunt methods (Masuda, PokeRadar, soft reset)
   - Hashtags (#shinypokemon, #rayquaza)
5. Shows preview: "Found 47 potential shiny videos"
6. User reviews and confirms matches
7. Instant populated shiny dex

**Confidence Scoring:**

- **High confidence** (auto-add): Clear species + counter + "shiny" keyword
- **Medium confidence** (suggest): Species mentioned but no count
- **Low confidence** (manual entry): Generic title with #shinyhunting hashtag

**Parsing Examples:**

- "SHINY RAYQUAZA AFTER 2000 RESETS!" → Rayquaza, ~2000 encounters
- Title + hashtags: #pokemonoras #rayquaza → Game = ORAS
- Description mentions: "Masuda Method" → Hunt method identified

**Platform API Access:**

- TikTok for Developers - Login Kit + Video List API
- YouTube Data API - channel videos and metadata
- Twitch API - clips and VODs

### Creator Benefits

**Portfolio/Showcase:**

- Every hunt is a permanent portfolio entry
- "500+ shinies documented at trainers.gg/username" in bio
- Sponsorship metrics visible (views, engagement per hunt)

**Discoverability:**

- Search "shiny Rayquaza" → find all videos of that hunt
- Algorithm suggests related content
- Cross-promotion between creators

**Monetization:**

- Premium creator accounts ($10/month?) with analytics
- Ko-fi/Patreon links on profile
- Tip buttons on epic hunts
- Commission marketplace (hire creators to hunt specific shinies)

---

## Business Model 💰

### Pricing Strategy

**Free Tier (with ads):**

- Basic counter functionality
- Manual sync to trainers.gg
- Banner ads (non-intrusive)

**Premium ($5 lifetime, sales to $1-3):**

- Ad-free experience
- 3DS controller input
- Advanced hunt statistics
- Priority cloud sync
- Multiple active hunts

**Creator Premium ($10/month):**

- Analytics dashboard
- Verified badge
- Custom profile themes
- API access for integrations

### Revenue Streams

1. **Premium purchases** (impulse buy pricing)
2. **Creator subscriptions** (recurring revenue)
3. **Ad revenue** (free tier users)
4. **Platform commission** on tips/donations
5. **Sponsored content** (Pokemon Company promotions)

### Competitive Positioning

**vs Auto Shiny Counter:**

- 87.5% cheaper ($5 vs $40)
- Social features (they have none)
- Cloud backup (they don't offer)
- Creator tools (non-existent in competitor)

**vs Existing Platforms:**

- Serebii/Bulbapedia: Wiki, no social features
- Showdown: Competitive battling, not hunting-focused
- Discord: Fragmented, no persistent tracking
- **We're the first creator-focused shiny hunting platform**

---

## The Network Effect 🚀

### Content Flywheel

```
More creators join →
More shiny content cataloged →
Better search/discovery →
More viewers find content →
More engagement →
More creators join
```

### Viral Mechanics

**For Creators:**

- AdrivenPlays posts 500th shiny
- 10K followers get notified
- Video goes viral (rare full-odds hunt)
- New hunters discover him via search
- Everyone in comments uses your app

**For Casual Users:**

- See friends catching shinies
- Get inspired to start own hunt
- Download app to track their hunt
- Post their catch to celebrate
- More content in ecosystem

---

## MVP Feature Prioritization

### Phase 1: Core Hunting Tool

- [ ] Manual counter UI
- [ ] UDP input to 3DS (soft reset button)
- [ ] Controller button mapping
- [ ] Local hunt history
- [ ] Basic trainers.gg sync

### Phase 2: Social Features

- [ ] Personal shiny dex
- [ ] Social feed and profiles
- [ ] Follow system
- [ ] Like/comment on catches
- [ ] Hunt statistics dashboard

### Phase 3: Creator Tools

- [ ] Video embedding (YouTube/TikTok)
- [ ] Clip collections
- [ ] Search and discovery
- [ ] Creator profiles

### Phase 4: Auto-Import

- [ ] TikTok OAuth integration
- [ ] Video metadata parsing
- [ ] Pokemon name recognition
- [ ] Confidence scoring system
- [ ] YouTube/Twitch expansion

---

## Success Metrics 📊

**User Acquisition:**

- App downloads and active users
- Free-to-paid conversion rate
- Creator adoption percentage

**Engagement:**

- Average hunts per user
- Social interactions (posts, likes, comments)
- Daily/weekly active users
- Session duration

**Creator Success:**

- Videos imported per creator
- Profile views and follower growth
- Content discovery (search → profile visits)

**Revenue:**

- Premium purchase rate
- Creator subscription MRR
- Ad revenue per user (free tier)
- Average revenue per user (ARPU)

---

## Competitive Moat 🏰

**What makes this defensible:**

1. **Network effects** - More users = more content = more value
2. **Creator lock-in** - Their entire collection lives here
3. **Social graph** - Friend connections create stickiness
4. **Content corpus** - Largest searchable shiny hunt database
5. **Community** - Culture and identity around the platform

**First-mover advantage:** No one else is building this. Be the category leader.

---

## Next Steps 🎯

1. **Technical validation:** Build UDP input proof-of-concept
2. **trainers.gg API design:** Define endpoints for hunt data
3. **UI/UX mockups:** App screens and user flows
4. **Parser prototype:** Test TikTok metadata extraction
5. **Beta testing:** Small group of shiny hunters for feedback
