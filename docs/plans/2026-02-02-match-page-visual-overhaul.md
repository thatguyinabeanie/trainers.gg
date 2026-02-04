# Match Page Visual Overhaul

## Context

The match page (`/tournaments/[slug]/matches/[matchId]`) is the primary page players have open during active tournament play. Players sit at their table with this page on their phone, checking opponent info, team sheets, reporting results, and chatting. It needs to feel like a proper match lobby, not a utility page.

## Current Problems

1. **Information-sparse header** — generic user icons, small score, round/table info doesn't stand out
2. **Oversized game cards** — three separate Card components for pending games, each with minimal content
3. **Unbalanced desktop layout** — 2/3 games + 1/3 chat, team sheets buried below
4. **No visual feedback on realtime updates** — state changes happen but nothing animates
5. **Staff/judge view is an afterthought** — tools are functional but tucked away

## Design Decisions

- Stay within shadcn/ui + Tailwind CSS 4 + @trainers/theme design system
- Use `PageContainer` wide variant (max-w-screen-2xl, 1536px)
- Inline state changes with animated CSS transitions (no toasts for reporting)
- Game progress bar indicator instead of dots
- Teams flank chat in three-column desktop layout

## Layout

### Desktop (>= 1024px)

```
[Breadcrumb: Tournaments / Tournament Name / Round 1 - Match]

+-----------------------------------------------------------+
| Match Header (full width)                                 |
| Round 1       [Table 29]                       [Active]   |
|                                                           |
| [Avatar] admin_trainer   0 - 0   candid_breeder [Avatar] |
|          W2-L0          ** Bo3 **           W1-L1         |
|          IGN: Ash [copy]                                  |
| Staff: [Judge badge visible]                              |
+-----------------------------------------------------------+

+--------------+------------------+--------------+
|  Your Team   |   Match Chat     |  Opp's Team  |
|  (1/4 width) |  (2/4 width)     |  (1/4 width) |
|              |                  |              |
|  Pokemon 1   |   [Viewers]      |  Pokemon 1   |
|  Pokemon 2   |   [Messages]     |  Pokemon 2   |
|  Pokemon 3   |   [Messages]     |  Pokemon 3   |
|  Pokemon 4   |   [Typing...]    |  Pokemon 4   |
|  Pokemon 5   |   [Input]        |  Pokemon 5   |
|  Pokemon 6   |   [Call Judge]   |  Pokemon 6   |
+--------------+------------------+--------------+

+-----------------------------------------------------------+
| Games (single card, full width)                           |
|-----------------------------------------------------------|
| Game 1   [ I Won ]  [ I Lost ]     1/2 reported  [Active]|
|-----------------------------------------------------------|
| Game 2                                        (upcoming)  |
|-----------------------------------------------------------|
| Game 3                                        (upcoming)  |
+-----------------------------------------------------------+
```

Grid: `grid-cols-4` with your team `col-span-1`, chat `col-span-2`, opponent team `col-span-1`.

When no team sheets are available, the three-column section collapses: chat takes full width or a narrower centered layout.

### Mobile (< 768px)

```
[Match Header — players stacked vertically]
  Opponent on top, score middle, you below

[Tab Bar: Games | Teams | Chat]
  Games tab: Single card with game rows
  Teams tab: Your team + Opponent's team stacked
  Chat tab: Full chat experience with presence
```

Both players always visible in header (no `hidden lg:flex`).

## Component Changes

### Match Header (match-header.tsx)

- Table number as prominent pill badge (`bg-muted rounded-full px-3 py-1`)
- Score `text-4xl font-bold tabular-nums` (up from `text-3xl`)
- Both players always visible on all breakpoints
- Mobile layout: stacked vertically with score between
- Desktop layout: horizontal with score centered
- Staff view: "Judge" badge next to status badge
- W-L record badge under each player name

### Game Cards (game-card.tsx)

**Single container approach:**

- Wrap all games in one Card with divider rows between them
- Each game is a row within the card, not a separate Card

**Reporting status is subtle, score/result is prominent:**

- Reporting status shown as small muted text: "1 of 2 reported" or tiny icon pair (two small circles: filled = reported, empty = pending)
- When a game resolves, the score pips in the header update and the game row transitions smoothly to a compact resolved state
- The moment of resolution (animated transition from active to resolved) is the main visual payoff
- Background highlight flash when state changes via realtime: brief `bg-primary/5` that fades back via `transition-colors duration-500`

**Active game:** expanded with I Won / I Lost buttons, subtle reporting status
**Future games:** visually muted, no buttons
**Resolved games:** compact single row (existing collapsed design)

**Staff/Judge view:**

- Sees explicit detail: who submitted what, in small muted text
- Collapsible "Judge Tools" section per game row (expand icon)
- Override dropdown + Reset button inside collapsible

### Chat (match-chat.tsx)

- Empty state: "Send a message to your opponent" prompt with input ready (not "No messages yet" in a void)
- Presence indicators prominent at top — opponent avatar with green ring when live
- Fade-in animation when a new viewer joins
- Call Judge button stays in chat panel
- Judge messages: distinct card-within-chat styling (gavel icon, amber background, slightly different shape)
- Full height on desktop, grows to fill available space

### Team Sheets (team-sheet.tsx)

- In three-column layout, teams are single-column stacks of 6 Pokemon cards
- Section headers: "Your Team" (left), "Opponent's Team" (right)
- Pokemon cards use existing design, stacked vertically
- When teams aren't available, that column shows a placeholder message

### Page Container

- Switch from default variant to `wide` variant for the match page
- This gives max-w-screen-2xl (1536px) instead of max-w-screen-xl (1280px)

## Realtime

Existing subscriptions (no new channels needed):

- `match-messages-{matchId}` — Postgres Changes INSERT on match_messages
- `match-status-{matchId}` — Postgres Changes UPDATE on tournament_matches
- `match-games-{matchId}` — Postgres Changes \* on match_games
- `match-presence-{matchId}` — Presence for viewers/typing

Visual feedback on realtime events:

- Game state change: progress bar animates, game row background briefly highlights
- New message: message appears with fade-in
- Viewer joins/leaves: avatar fade-in/out
- Match status change: status badge updates with transition

All animations use CSS transitions (`transition-*` utilities) — no Framer Motion.

## Implementation Steps

### Step 1: Match Header Redesign

- Rework match-header.tsx layout for mobile-first (stacked) + desktop (horizontal)
- Table number as badge, larger score, both players always visible
- Staff "Judge" badge

### Step 2: Game Cards Consolidation

- Create new GamesList component that wraps all games in single Card
- Build progress bar indicator component
- Add animated transitions for state changes
- Staff collapsible judge tools

### Step 3: Chat Polish

- Better empty state
- Prominent presence indicators with green ring
- Viewer fade-in animations

### Step 4: Three-Column Desktop Layout

- Rewrite match-page-client.tsx layout
- grid-cols-4 with team | chat | team
- Conditional layout when no teams available

### Step 5: Page Container + Server Component

- Switch to PageContainer wide variant in page.tsx
- Ensure all data props flow correctly

### Step 6: Verify

- Typecheck + lint
- Visual review on mobile and desktop viewports
- Test as participant, staff, and spectator
- Test realtime updates (opponent reports, chat, presence)

## Verification

1. `pnpm turbo run typecheck --filter=@trainers/web` passes
2. `pnpm turbo run lint --filter=@trainers/web` passes
3. Desktop: three-column layout with teams flanking chat
4. Mobile: tab navigation works, both players visible in header
5. Game progress bar animates when opponent submits
6. Chat presence shows opponent with green ring
7. Staff view: Judge badge, expandable tools per game
8. No teams: layout adapts gracefully
