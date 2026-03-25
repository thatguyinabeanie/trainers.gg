# Hero Page Design Spec

## Overview

A landing page at `/` that advertises what trainers.gg is about. Replaces the current redirect to `/tournaments` with a warm, calm, community-focused page that speaks primarily to competitive Pokemon players and curious fans.

## Audience

- **Primary:** Competitive Pokemon players who already know what VGC/competitive formats are
- **Secondary:** Pokemon fans curious about competitive play who haven't jumped in yet
- **Tone:** Calm, chill, warm, wholesome. Not esports-corporate, not bold/hype.

## Goals

- Communicate what trainers.gg offers
- Convert visitors to sign-ups (primary CTA)
- Let visitors explore tournaments without commitment (secondary CTA)
- Show the platform is active via live tournament data
- Tease upcoming features to build momentum

## Page Structure

### Section 1: Hero Banner

Full-width, generous vertical padding, centered content.

- **Headline:** Warm and direct (e.g. "Your home for competitive Pokemon")
- **Subheadline:** One sentence that expands (e.g. "Find tournaments, join communities, and track your journey as a trainer.")
- **CTAs (side by side):**
  - Primary (teal, filled): "Get Started" → `/sign-up`
  - Secondary (outline): "Browse Tournaments" → `/tournaments`
- **Authenticated users:** Swap CTAs to "Go to Dashboard" + "Browse Tournaments"
- **Visual treatment:** Soft teal-to-transparent gradient background or subtle pattern. No hero image — typographic and clean. The teal primary carries the warmth.

### Section 2: Feature Cards Grid

Three cards in a row (desktop), stacked (mobile).

**Section heading:** "Everything you need to compete" (centered)

1. **Tournaments**
   - Icon: Trophy (Lucide)
   - Copy: "Browse and register for tournaments. Track rounds, standings, and results in real time."
   - Link: "View Tournaments" → `/tournaments`

2. **Organizations**
   - Icon: Users (Lucide)
   - Copy: "Join communities that run events in your area or format. Request to join and stay connected."
   - Link: "Find Organizations" → `/organizations`

3. **Analytics**
   - Icon: BarChart3 (Lucide)
   - Copy: "See your match history, win rates, and trends. Understand how you're improving over time."
   - Link: "View Analytics" → `/analytics`

**Card style:** Existing `Card` component. Subtle background differentiation (neutral-50 light / neutral-900 dark), no heavy borders. Minimal flat design. Icon, title, 1-2 sentences, text link at bottom.

### Section 3: Live Upcoming Tournaments

Real tournament data proving the platform is active.

- **Section heading:** "Upcoming Tournaments" with "View All" link to `/tournaments` on the right
- **Content:** Compact list of 3-5 upcoming tournaments showing:
  - Tournament name
  - Organization name
  - Date
  - Format (if available)
  - Register/view button
- **Empty state:** "No upcoming tournaments right now. Check back soon!"
- **Technical:** Server Component with `revalidate` interval for freshness without full dynamic rendering on every request.

### Section 4: Coming Soon Teasers

Two smaller cards side by side (desktop), stacked (mobile).

**Section heading:** "More on the way" (centered)

1. **Team Builder**
   - Icon: Swords or Puzzle (Lucide)
   - Copy: "Build, share, and analyze your Pokemon teams."
   - Badge: "Coming Soon" (StatusBadge, muted/amber style)

2. **Coaching**
   - Icon: GraduationCap (Lucide)
   - Copy: "Get guidance from experienced competitive players."
   - Badge: "Coming Soon" (StatusBadge, muted/amber style)

**Card style:** Same `Card` component but visually muted (lower opacity or subtler background) to read as "not yet" compared to active feature cards. No links.

### Section 5: Closing CTA

Simple call-to-action block bookending the page.

- **Copy:** Warm closing line (e.g. "Ready to start your journey?")
- **CTAs:** Same dual CTAs as hero — "Get Started" + "Browse Tournaments"
- **Authenticated users:** "Go to Dashboard" + "Browse Tournaments"
- **Visual treatment:** Subtle background tint (similar to hero) for bookend effect.

## Technical Notes

- **Route:** Replace redirect in `apps/web/src/app/page.tsx` with the hero page
- **Components:** Use existing `Card`, `Button`, `StatusBadge` from `apps/web/src/components/ui/`
- **Icons:** Lucide icons (already a project dependency)
- **Styling:** Tailwind CSS 4, `cn()` for dynamic classes, OKLCH theme tokens
- **Auth-aware CTAs:** Use existing auth context to determine signed-in state
- **Live data:** Server Component fetching upcoming tournaments from Supabase
- **Responsive:** Mobile-first, cards stack on small screens, row on desktop
- **Dark mode:** Supported via existing theme token system

## Design Principles (from project)

- Minimal flat design: no borders, subtle background differentiation, consistent spacing
- Teal primary (OKLCH tokens): single accent across all interactive elements
- `StatusBadge` for semantic status colors

## Exclusions

- No Bluesky/AT Protocol mentions
- No social features
- No hero images or illustrations
- No esports/hype aesthetic
