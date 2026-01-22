# Tournament Schema Design Decisions

> **Note: This document contains important design decisions about the tournament system. The implementation details have been adapted for Convex instead of the original Prisma/PostgreSQL approach.**

## 1. Tournament Bracket Model

**Decision:** Use individual documents/records for each bracket position rather than JSON fields.

**Rationale:**

- Better queryability
- Improved performance
- Easier to update individual bracket positions
- More type-safe with Convex schema

**Convex Implementation:**

- Separate `tournamentBrackets` table with individual records for each position
- Relationships defined through IDs rather than nested JSON

---

## 2. Match Reporting Flow

**Decision:** Players self-report results with automatic confirmation when both agree.

**Implementation Details:**

- Players report game results individually
- If both report the same result → auto-confirmed
- If they disagree → "Request a Judge" option available
- Auto-confirmation after 45 seconds if one player doesn't respond
- Only judges/admins can reset matches (permission-based)

**Required Permissions:**

- `tournament.match.report` - Players reporting their own matches
- `tournament.match.reset` - Judges/admins resetting matches
- `tournament.match.override` - Admins overriding results

---

## 3. Pokemon Team Data

**Decision:** Proper tables with full validation, not JSON storage.

**Convex Schema Structure:**

- `pokemon` table - Individual Pokemon with all details (name, nickname, ability, moves, etc.)
- Many-to-many relationship between `tournamentRegistrations` and `pokemon`
- Full validation for tournament format compliance

**Benefits:**

- Query Pokemon usage statistics
- Validate teams against tournament rules
- Track meta trends over time

---

## 4. Tournament Formats vs Structure

**Clarification:**

- **Format** = Game format (e.g., Regulation A-I, Series 1-13)
- **Structure** = Tournament progression (Swiss, Single Elimination, etc.)

**Implementation:**

- Tournament phases system for flexible structures
- Each phase can be: Swiss, Round Robin, Single/Double Elimination
- Pre-built templates for common structures (swiss_only, swiss_with_cut)
- Organizations can create custom templates

---

## 5. Tiebreaker Calculations

**Decision:** Both pre-calculated storage and on-demand calculation.

**Implementation:**

- Store tiebreaker values in database for performance
- Ability to recalculate from match results when needed
- Update stored values after each round completion

---

## 6. Real-time Updates

**Status:** Deferred for later implementation.

**Convex Advantage:**

- Built-in real-time subscriptions
- No need for separate WebSocket server
- Automatic real-time updates when data changes

**TODO:** Implement real-time features using Convex subscriptions

---

## 7. Additional Schema Requirements

Based on the decisions above, additional tables needed:

- `tournamentPhases` - For multi-phase tournaments
- `tournamentTemplates` - For reusable tournament configurations
- `matchReports` - For tracking individual player reports
- `judgeRequests` - For dispute resolution

---

## 8. Data Migration

**TODO:** Pull tournament data from Limitless Tournaments API

- Use API key to fetch historical data
- Import tournaments, results, and team data
- Useful for seeding and testing

---

## Current Implementation Status

**Completed in Schema:**

- Basic tournament structure
- Registration system
- Team management tables
- Match reporting flow
- Bracket management
- Phase system
- Tiebreaker calculations

**Partially Implemented:**

- Pokemon validation (schema is in place, but validation logic is not fully implemented)

**Not Yet Implemented:**

- Template system
