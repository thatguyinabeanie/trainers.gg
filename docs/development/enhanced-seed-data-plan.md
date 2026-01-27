# Enhanced Seed Data Implementation Plan

## Overview

This document outlines the implementation plan for comprehensive, realistic seed data for trainers.gg development and testing environments.

**Goal**: Create seed data that supports:

- Stress testing with 256-player tournaments
- 12 weeks of tournament history
- 5 organizations with non-conflicting weekly schedules
- ~300-350 users with multiple alts
- ~120 total tournaments across all organizations

---

## Quick Reference

| Item                    | Count                                            |
| ----------------------- | ------------------------------------------------ |
| **Users**               | ~300-350 (6 existing + ~25 staff + ~300 players) |
| **Alts per User**       | 2-5 (stress test multi-alt system)               |
| **Organizations**       | 5 (3 existing + 2 new)                           |
| **Staff Members**       | ~20-25 (can work for multiple orgs)              |
| **Tournaments**         | ~120 (12 weeks x 5 orgs x 2/week)                |
| **Matches**             | ~15,000-20,000 (across all tournaments)          |
| **Flagship Tournament** | 1-2 with 256 players                             |

---

## Design Decisions Summary

| Decision            | Choice                     | Notes                                                      |
| ------------------- | -------------------------- | ---------------------------------------------------------- |
| User scale          | ~300-350                   | Supports 256-player tournaments                            |
| Tournament formats  | Mixed                      | 1 Single Elim + 1 Double Elim per org; rest Swiss + Cut    |
| Match results       | Deterministic (hash-based) | Consistent across resets; add comments for future ELO      |
| Tournament schedule | Weekly per org             | Non-conflicting days; 2 tournaments/week (main + practice) |
| Staff overlap       | Allowed                    | Staff can work for multiple organizations                  |
| User generation     | Faker.js                   | Realistic names, not player1/player2                       |
| Alts per user       | 2-5                        | Stress test multi-alt system                               |

---

## Important Technical Notes

### Game-Specific Match Rules

> **Current Scope**: Pokemon VGC and Pokemon GO
>
> - No ties in matches - always a clear winner
> - Match scores: 2-0 or 2-1 (Best of 3)

> **Future Scope**: Pokemon TCG
>
> - Will require tie-breaker support
> - Matches can end in draws
> - TODO: Add tie-breaker logic when TCG support is added

### Future ELO System

The current implementation uses deterministic hash-based seeding for match results.

> **TODO**: Implement ELO rating system for:
>
> - Tournament seeding (Round 1 pairings)
> - Skill-based matchmaking
> - Player rankings across seasons

When implementing match result generation, add code comments like:

```sql
-- TODO: Replace with ELO-based win probability when ELO system is implemented
-- Current: Deterministic hash-based winner selection for consistent test data
```

---

## Database Schema Reference

### Key Tables

```
auth.users (id, email, encrypted_password, ...)
    └── trigger creates: public.users + public.alts

public.users (id, username, first_name, last_name, did, pds_status, ...)
    └── public.alts (id, user_id, username, display_name, bio, tier, ...)

public.organizations (id, name, slug, owner_user_id, ...)
    └── public.organization_staff (id, organization_id, user_id)

public.roles (id, name, scope, description)
    └── public.user_roles (id, user_id, role_id)

public.tournaments (id, organization_id, name, slug, status, format, ...)
    └── public.tournament_phases (id, tournament_id, phase_type, phase_order, ...)
        └── public.tournament_rounds (id, phase_id, round_number, status, ...)
            └── public.tournament_matches (id, round_id, alt1_id, alt2_id, winner_alt_id, ...)

public.tournament_registrations (id, tournament_id, alt_id, status, ...)
public.tournament_standings (id, tournament_id, alt_id, wins, losses, final_rank, ...)
```

### Key Enums

```sql
tournament_status: 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled'
tournament_format: 'swiss_only' | 'swiss_with_cut' | 'single_elimination' | 'double_elimination'
phase_type: 'swiss' | 'single_elimination' | 'double_elimination'
registration_status: 'registered' | 'confirmed' | 'checked_in' | 'waitlist' | 'dropped' | 'disqualified'
match_status: 'pending' | 'active' | 'completed' | 'bye'
```

---

## Implementation Structure

### Approach: TypeScript Generator + SQL Output

Instead of writing raw SQL with 300+ users and 15,000+ matches by hand, we'll create a TypeScript generator script that:

1. Uses Faker.js for realistic user data
2. Generates deterministic match results (seeded random)
3. Outputs SQL files that can be run as seeds

### File Structure

```
packages/supabase/
├── scripts/
│   └── generate-seed-data/
│       ├── index.ts              # Main generator entry point
│       ├── config.ts             # Configuration constants
│       ├── generators/
│       │   ├── users.ts          # User + alt generation
│       │   ├── organizations.ts  # Org + staff generation
│       │   ├── tournaments.ts    # Tournament generation
│       │   ├── matches.ts        # Match result generation
│       │   └── standings.ts      # Standings calculation
│       ├── utils/
│       │   ├── deterministic.ts  # Seeded random utilities
│       │   ├── uuid.ts           # Deterministic UUID generation
│       │   └── sql-builder.ts    # SQL string building helpers
│       └── output/
│           └── (generated SQL files go here)
│
└── supabase/seeds/
    ├── 01_extensions.sql         # (existing)
    ├── 02_roles.sql              # (existing)
    ├── 03_users.sql              # Will be replaced/extended
    ├── 04_organizations.sql      # Will be replaced/extended
    ├── 05_invitations.sql        # (existing)
    ├── 06_pokemon.sql            # (existing)
    ├── 07_teams.sql              # (existing)
    ├── 08_tournaments.sql        # Will be replaced with comprehensive data
    └── 09_social.sql             # (existing)
```

---

## Detailed Specifications

### 1. Organizations (5 total)

| Organization         | Slug               | Owner         | Tournament Day (Main) | Practice Day |
| -------------------- | ------------------ | ------------- | --------------------- | ------------ |
| VGC League           | `vgc-league`       | admin_trainer | Saturday              | Tuesday      |
| Pallet Town Trainers | `pallet-town`      | ash_ketchum   | Sunday                | Monday       |
| Sinnoh Champions     | `sinnoh-champions` | cynthia       | Friday                | Wednesday    |
| Kanto Elite Series   | `kanto-elite`      | admin_trainer | Thursday              | Monday       |
| Johto Masters League | `johto-masters`    | lance (new)   | Wednesday             | Tuesday      |

**Note**: admin_trainer owns 2 organizations (VGC League + Kanto Elite Series)

### 2. Tournament Schedule (12 weeks)

Each organization runs **2 tournaments per week**:

**Main Tournament (Primary Day)**:

- Format: Swiss + Top Cut
- Player counts: 32, 64, 128, or 256
- 1-2 flagship events with 256 players across all orgs
- Most tournaments: 64-128 players

**Practice Tournament (Secondary Day)**:

- Formats rotate: Swiss-only, Single Elimination, Double Elimination
- Player counts: 16-32 players
- Lower stakes, experimental formats

**Total Tournaments**: 5 orgs × 12 weeks × 2/week = **120 tournaments**

### 3. Users (~300-350)

#### Existing Users (Keep as-is: 6)

| Email                    | Username      | Role                                            |
| ------------------------ | ------------- | ----------------------------------------------- |
| admin@trainers.local     | admin_trainer | Site Admin, Org Owner (VGC League, Kanto Elite) |
| player@trainers.local    | ash_ketchum   | Org Owner (Pallet Town)                         |
| champion@trainers.local  | cynthia       | Org Owner (Sinnoh Champions)                    |
| gymleader@trainers.local | brock         | Staff                                           |
| elite@trainers.local     | karen         | Staff                                           |
| casual@trainers.local    | red           | Player                                          |

#### New Users to Create

| Category              | Count    | Generation Method                |
| --------------------- | -------- | -------------------------------- |
| New org owner (lance) | 1        | Manual - known Pokemon character |
| Staff members         | ~20      | Faker.js - realistic names       |
| Tournament players    | ~280-320 | Faker.js - realistic names       |

**Username Generation**:

- Use Faker.js `internet.username()` or custom Pokemon-themed generator
- Ensure uniqueness via deterministic seeding
- Format: `{firstName}_{randomNumber}` or Pokemon-themed names

**Email Pattern**: `{username}@trainers.local`

### 4. Alts (2-5 per user)

Each user gets 2-5 alts for stress testing:

```typescript
// Deterministic alt count based on user index
function getAltCount(userIndex: number): number {
  const seed = hash(userIndex);
  // Distribution: 30% get 2 alts, 30% get 3, 20% get 4, 20% get 5
  if (seed < 0.3) return 2;
  if (seed < 0.6) return 3;
  if (seed < 0.8) return 4;
  return 5;
}
```

**Alt naming**:

- Primary alt: Same as username
- Additional alts: `{username}_vgc`, `{username}_draft`, `{username}_anon`, etc.

### 5. Staff Assignments (~20-25 staff across 5 orgs)

Staff can work for multiple organizations:

| Staff Role               | Per Org | Total Unique Staff |
| ------------------------ | ------- | ------------------ |
| org_admin                | 1       | ~5-7 (some shared) |
| org_judge (head)         | 2       | ~8-10              |
| org_judge (regular)      | 3       | ~10-12             |
| org_moderator            | 1-2     | ~5-8               |
| org_tournament_organizer | 1-2     | ~5-8               |

**Overlap Strategy**:

- 30% of staff work for 2 orgs
- 10% of staff work for 3 orgs
- Rest work for 1 org only

### 6. Match Result Generation (Deterministic)

```typescript
/**
 * Deterministic match winner selection.
 * Uses hash of match participants to consistently select winner.
 *
 * TODO: Replace with ELO-based win probability when ELO system is implemented.
 * Current implementation uses hash-based selection for consistent test data.
 */
function determineMatchWinner(
  alt1Id: number,
  alt2Id: number,
  roundNumber: number,
  tournamentSeed: string
): { winnerId: number; score: [number, number] } {
  // Create deterministic hash from match identifiers
  const matchHash = hash(
    `${tournamentSeed}-${roundNumber}-${alt1Id}-${alt2Id}`
  );

  // Determine winner (consistent for same inputs)
  const winnerId = matchHash < 0.5 ? alt1Id : alt2Id;

  // Determine score distribution
  // ~60% of matches are 2-0, ~40% are 2-1
  const scoreHash = hash(`${matchHash}-score`);
  const score: [number, number] =
    scoreHash < 0.6
      ? [2, 0] // Dominant win
      : [2, 1]; // Close match

  // Flip score if alt2 won
  if (winnerId === alt2Id) {
    score.reverse();
  }

  return { winnerId, score };
}
```

### 7. Swiss Pairing Algorithm

```typescript
/**
 * Generate Swiss pairings for a round.
 * Players with same record are paired together.
 * Uses deterministic shuffling within record groups.
 */
function generateSwissPairings(
  standings: PlayerStanding[],
  roundNumber: number,
  tournamentSeed: string
): Match[] {
  // Group by record (wins-losses)
  const groups = groupBy(standings, (s) => `${s.wins}-${s.losses}`);

  // Within each group, pair players deterministically
  const matches: Match[] = [];

  for (const [record, players] of Object.entries(groups)) {
    // Deterministic shuffle within group
    const shuffled = deterministicShuffle(
      players,
      `${tournamentSeed}-round${roundNumber}-${record}`
    );

    // Pair adjacent players
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        matches.push({
          alt1Id: shuffled[i].altId,
          alt2Id: shuffled[i + 1].altId,
        });
      } else {
        // Odd player gets a bye
        matches.push({
          alt1Id: shuffled[i].altId,
          alt2Id: null, // BYE
        });
      }
    }
  }

  return matches;
}
```

---

## Tournament Size Distribution

### Main Tournaments (60 total = 5 orgs × 12 weeks)

| Size        | Count | %   | Swiss Rounds | Top Cut        |
| ----------- | ----- | --- | ------------ | -------------- |
| 256 players | 2     | 3%  | 8 rounds     | Top 8          |
| 128 players | 12    | 20% | 7 rounds     | Top 8          |
| 64 players  | 28    | 47% | 6 rounds     | Top 8          |
| 32 players  | 18    | 30% | 5 rounds     | Top 4 or Top 8 |

**Flagship 256-player tournaments**:

- VGC League: "VGC League Championship" (Week 6)
- Sinnoh Champions: "Sinnoh Grand Finals" (Week 10)

### Practice Tournaments (60 total = 5 orgs × 12 weeks)

| Format             | Count | %   | Player Count |
| ------------------ | ----- | --- | ------------ |
| Swiss Only         | 40    | 67% | 16-32        |
| Single Elimination | 10    | 17% | 16-32        |
| Double Elimination | 10    | 17% | 16-32        |

**Distribution per org** (12 practice tournaments each):

- ~8 Swiss Only
- ~2 Single Elimination
- ~2 Double Elimination

---

## Match Count Estimates

### Swiss + Top Cut Tournaments

| Size        | Swiss Matches       | Top Cut Matches | Total  |
| ----------- | ------------------- | --------------- | ------ |
| 256 players | 256 × 8 ÷ 2 = 1,024 | 7               | ~1,031 |
| 128 players | 128 × 7 ÷ 2 = 448   | 7               | ~455   |
| 64 players  | 64 × 6 ÷ 2 = 192    | 7               | ~199   |
| 32 players  | 32 × 5 ÷ 2 = 80     | 3-7             | ~85    |

### Total Match Estimate

```
Flagship (256p × 2):     2 × 1,031 = 2,062
Large (128p × 12):      12 × 455  = 5,460
Medium (64p × 28):      28 × 199  = 5,572
Small (32p × 18):       18 × 85   = 1,530
Practice Swiss (~40):   40 × 40   = 1,600
Practice Elim (~20):    20 × 31   = 620
                        ─────────────────
Total:                  ~16,844 matches
```

---

## Implementation Steps

### Phase 1: Setup Generator Infrastructure

1. **Create generator directory structure**

   ```bash
   mkdir -p packages/supabase/scripts/generate-seed-data/{generators,utils,output}
   ```

2. **Install dependencies**

   ```bash
   cd packages/supabase
   pnpm add -D @faker-js/faker
   ```

3. **Create configuration file** (`config.ts`)
   - Organization definitions
   - Tournament schedule parameters
   - User count targets
   - Random seed for determinism

### Phase 2: Implement Generators

4. **User Generator** (`generators/users.ts`)
   - Generate 300+ users with Faker.js
   - Deterministic UUIDs based on index
   - Email pattern: `{username}@trainers.local`
   - Password: `Password123!` for all

5. **Alt Generator** (part of users.ts)
   - 2-5 alts per user
   - Deterministic alt count
   - Naming conventions for alt types

6. **Organization Generator** (`generators/organizations.ts`)
   - Create 2 new organizations
   - Assign owners
   - Generate staff assignments

7. **Tournament Generator** (`generators/tournaments.ts`)
   - 120 tournaments over 12 weeks
   - Non-conflicting schedules
   - Proper format distribution
   - Generate phases and rounds

8. **Match Generator** (`generators/matches.ts`)
   - Swiss pairing algorithm
   - Deterministic winner selection
   - Score generation (2-0 or 2-1)
   - Handle byes

9. **Standings Calculator** (`generators/standings.ts`)
   - Calculate wins/losses
   - Game wins/losses for tiebreakers
   - Final rankings

### Phase 3: SQL Output

10. **SQL Builder** (`utils/sql-builder.ts`)
    - Escape strings properly
    - Format INSERT statements
    - Handle large batches (chunk inserts)

11. **Generate SQL files**
    - Run generator: `pnpm generate-seeds`
    - Output to `supabase/seeds/` directory

### Phase 4: Testing

12. **Local Testing**

    ```bash
    cd packages/supabase
    supabase db reset  # Applies migrations + seeds
    ```

13. **Verification Checklist**
    - [ ] All 300+ users created
    - [ ] Each user has 2-5 alts
    - [ ] 5 organizations exist with proper ownership
    - [ ] Staff assignments correct (multi-org overlap)
    - [ ] 120 tournaments created
    - [ ] All completed tournaments have matches and standings
    - [ ] 256-player flagship tournament works
    - [ ] Match results consistent across resets
    - [ ] TO Dashboard displays data correctly

---

## Generator Configuration

```typescript
// config.ts
export const SEED_CONFIG = {
  // Random seed for deterministic generation
  RANDOM_SEED: "trainers-gg-seed-2026",

  // User counts
  EXISTING_USERS: 6,
  STAFF_USERS: 25,
  PLAYER_USERS: 320,

  // Alt distribution
  MIN_ALTS_PER_USER: 2,
  MAX_ALTS_PER_USER: 5,

  // Tournament schedule
  WEEKS_OF_HISTORY: 12,
  TOURNAMENTS_PER_WEEK_PER_ORG: 2,

  // Tournament sizes
  FLAGSHIP_TOURNAMENT_SIZE: 256,
  FLAGSHIP_COUNT: 2,

  // Organizations
  ORGANIZATIONS: [
    { slug: "vgc-league", mainDay: "Saturday", practiceDay: "Tuesday" },
    { slug: "pallet-town", mainDay: "Sunday", practiceDay: "Monday" },
    { slug: "sinnoh-champions", mainDay: "Friday", practiceDay: "Wednesday" },
    { slug: "kanto-elite", mainDay: "Thursday", practiceDay: "Monday" },
    { slug: "johto-masters", mainDay: "Wednesday", practiceDay: "Tuesday" },
  ],

  // Password for all test users
  DEFAULT_PASSWORD: "Password123!",
};
```

---

## Appendix: Deterministic Utilities

### Seeded Random Number Generator

```typescript
// utils/deterministic.ts
import { createHash } from "crypto";

/**
 * Create a deterministic hash from a string.
 * Returns a number between 0 and 1.
 */
export function hash(input: string): number {
  const hash = createHash("sha256").update(input).digest("hex");
  // Use first 8 characters as a hex number, normalize to 0-1
  return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
}

/**
 * Create a seeded random number generator.
 * Always produces the same sequence for the same seed.
 */
export function createSeededRandom(seed: string) {
  let state = hash(seed);

  return function random(): number {
    // Simple LCG for deterministic sequence
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/**
 * Deterministic shuffle using Fisher-Yates with seeded random.
 */
export function deterministicShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  const random = createSeededRandom(seed);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
```

### Deterministic UUID Generation

```typescript
// utils/uuid.ts
import { createHash } from "crypto";

/**
 * Generate a deterministic UUID v4-like string from an index.
 * Same index always produces same UUID.
 */
export function deterministicUUID(namespace: string, index: number): string {
  const hash = createHash("sha256")
    .update(`${namespace}-${index}`)
    .digest("hex");

  // Format as UUID v4
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    "4" + hash.substring(13, 16), // Version 4
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) +
      hash.substring(17, 20), // Variant
    hash.substring(20, 32),
  ].join("-");
}
```

---

## Testing Commands

```bash
# Generate seed data (from packages/supabase)
pnpm generate-seeds

# Reset database with new seeds
pnpm db:reset

# Verify data counts
pnpm supabase db execute --file scripts/verify-seeds.sql

# Quick verification queries
psql -c "SELECT COUNT(*) FROM auth.users;"           # ~350
psql -c "SELECT COUNT(*) FROM public.alts;"          # ~1000+
psql -c "SELECT COUNT(*) FROM public.organizations;" # 5
psql -c "SELECT COUNT(*) FROM public.tournaments;"   # ~120
psql -c "SELECT COUNT(*) FROM public.tournament_matches;" # ~16,000+
```

---

## Success Criteria

- [ ] `supabase db reset` completes without errors
- [ ] 300+ users exist in auth.users
- [ ] Each user has 2-5 alts
- [ ] 5 organizations with correct ownership
- [ ] Staff properly assigned with role overlap
- [ ] 120 tournaments across 12 weeks
- [ ] Non-conflicting tournament schedules
- [ ] At least 1 tournament with 256 players completed
- [ ] All completed tournaments have matches and standings
- [ ] Match results are deterministic (same on every reset)
- [ ] TO Dashboard loads without errors
- [ ] Tournament detail pages display matches correctly
- [ ] Standings page shows correct rankings

---

## Related Documentation

- [AGENTS.md](/AGENTS.md) - Project guidelines and architecture
- [docs/tournaments/index.md](/docs/tournaments/index.md) - Tournament system overview
- [docs/organizations/ORGANIZATIONS.md](/docs/organizations/ORGANIZATIONS.md) - Organization system
- [docs/tournaments/data-integration-and-elo.md](/docs/tournaments/data-integration-and-elo.md) - Future ELO system plans
