# Backend Comparison: Convex vs Supabase

This document captures the research comparing Convex and Supabase that led to the decision to migrate to Supabase.

**Research Date:** January 2026  
**Status:** ✅ Decision Made  
**Final Decision:** Migrate fully to Supabase

---

## Table of Contents

1. [Decision Summary](#1-decision-summary)
2. [Feature Comparison](#2-feature-comparison)
3. [Why Supabase Won](#3-why-supabase-won)
4. [Future Capabilities](#4-future-capabilities)
5. [Appendix: Detailed Research](#appendix-detailed-research)

---

## 1. Decision Summary

### Original Question

Should we keep Convex as the primary backend and add Supabase for analytics, or migrate fully to Supabase?

### Final Decision

**Migrate fully to Supabase.**

The project now uses Supabase as the sole backend for:

- PostgreSQL database with Row Level Security (RLS)
- Supabase Auth for authentication
- Edge Functions (Deno) for server-side logic
- Integration with self-hosted Bluesky PDS

### Current Architecture

| Layer           | Technology                     |
| --------------- | ------------------------------ |
| Database        | Supabase (PostgreSQL)          |
| Auth            | Supabase Auth                  |
| Edge Functions  | Supabase Edge Functions (Deno) |
| Social/Identity | AT Protocol (Bluesky PDS)      |
| Realtime        | Supabase Realtime (future)     |

---

## 2. Feature Comparison

| Feature              | Convex           | Supabase                | Winner                       |
| -------------------- | ---------------- | ----------------------- | ---------------------------- |
| **Database Model**   | Document store   | PostgreSQL (relational) | Supabase (flexibility)       |
| **Transactions**     | Automatic (OCC)  | Explicit or RPC         | Convex (simpler)             |
| **JOINs**            | Manual (JS)      | Native SQL              | Supabase                     |
| **Aggregations**     | JavaScript       | Native SQL              | Supabase                     |
| **Realtime Queries** | Automatic        | Explicit subscriptions  | Convex (simpler)             |
| **Presence**         | Build custom     | Native                  | Supabase                     |
| **Broadcast**        | Via DB writes    | Native pub/sub          | Supabase                     |
| **BI Tools**         | No direct access | Direct SQL              | Supabase                     |
| **Self-hosting**     | Open source      | Open source             | Tie                          |
| **Pricing Model**    | Per-developer    | Flat + usage            | Supabase (cheaper for teams) |
| **PDS Integration**  | Complex          | Easier (Edge Functions) | Supabase                     |

---

## 3. Why Supabase Won

### Primary Reasons

1. **PDS Integration** — Edge Functions work well for calling PDS APIs during signup
2. **SQL Power** — Complex queries for analytics, leaderboards, player stats
3. **Direct Database Access** — Can connect BI tools directly
4. **Cost** — Flat pricing vs per-developer pricing
5. **Realtime Features** — Native Presence and Broadcast for future features

### Secondary Reasons

1. **PostgreSQL Ecosystem** — Vast tooling, extensions, community
2. **Git-based Migrations** — Version-controlled schema changes
3. **Row Level Security** — Declarative access control at database level
4. **Supabase Cloud** — Managed hosting with preview branches

### Trade-offs Accepted

1. **More Boilerplate** — Realtime subscriptions require explicit setup (vs Convex's automatic reactivity)
2. **Manual Transactions** — Need to use RPC functions for atomic operations
3. **No TypeScript Schema** — Schema defined in SQL, types generated separately

---

## 4. Future Capabilities

These Supabase features are available but not yet implemented:

### Presence (Who's Online)

```typescript
const channel = supabase.channel("tournament:123");
channel
  .on("presence", { event: "sync" }, () => {
    const state = channel.presenceState();
    console.log("Online users:", Object.keys(state));
  })
  .subscribe();
```

**Use cases:**

- Show who's viewing a tournament
- Tournament lobby with live participant list
- "X users online" indicator

### Broadcast (Pub/Sub)

```typescript
// Send
channel.send({ type: "broadcast", event: "cursor-move", payload: { x: 100, y: 200 } });

// Receive
channel.on("broadcast", { event: "cursor-move" }, (payload) => { ... });
```

**Use cases:**

- Live chat in tournament lobbies
- Typing indicators
- Real-time notifications
- Collaborative team builder

### Analytics Dashboards

With direct SQL access, we can build:

- Player statistics (win rate, ranking, etc.)
- Tournament analytics (participation, completion, etc.)
- Meta analysis (popular teams, Pokemon usage)
- Leaderboards with complex ranking algorithms

### BI Tool Integration

Connect tools like Metabase, Tableau, or Looker directly to the database for:

- Admin dashboards
- Usage metrics
- Business intelligence

---

## Appendix: Detailed Research

### A. Convex Deep Dive

#### Database Architecture

| Characteristic | Convex                         |
| -------------- | ------------------------------ |
| Type           | Hybrid document-relational     |
| Data Format    | JSON-like documents            |
| Schema         | Optional TypeScript validators |
| Query Language | JavaScript/TypeScript          |
| Transactions   | Automatic (OCC)                |

#### Strengths

- **Automatic Reactivity**: `useQuery()` auto-subscribes to changes
- **TypeScript-First**: Schema and functions all in TypeScript
- **Atomic Transactions**: Every mutation is automatically transactional
- **Built-in Full-text Search**: No external service needed
- **Vector Search**: Built-in for AI/RAG applications

#### Limitations

- **No Native JOINs**: Must fetch related documents manually
- **Aggregations in JS**: No SQL, complex aggregations require loading all docs
- **No Direct SQL Access**: Cannot connect BI tools
- **Per-Developer Pricing**: $25/dev/month on Professional tier
- **No Native Presence**: Must build custom heartbeat system

#### Example: Manual "JOIN"

```typescript
export const getTournamentWithMatches = query({
  args: { id: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.id);
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.id))
      .collect();
    return { ...tournament, matches };
  },
});
```

### B. Supabase Deep Dive

#### Database Architecture

| Characteristic | Supabase                             |
| -------------- | ------------------------------------ |
| Database       | PostgreSQL 15.x                      |
| Extensions     | 50+ pre-installed                    |
| Query Language | SQL                                  |
| Transactions   | Explicit or via RPC                  |
| Access         | REST API, client library, direct SQL |

#### Key Extensions

| Extension            | Purpose                     |
| -------------------- | --------------------------- |
| `pg_stat_statements` | Query performance analytics |
| `pgvector`           | Vector embeddings for AI    |
| `pg_cron`            | Scheduled jobs              |
| `PostGIS`            | Geospatial queries          |
| `pg_graphql`         | GraphQL API                 |

#### Strengths

- **Full SQL**: JOINs, CTEs, window functions, aggregations
- **Native Presence**: Built-in "who's online" feature
- **Native Broadcast**: Pub/sub for real-time events
- **Row Level Security**: Declarative access control
- **Direct SQL Access**: Connect BI tools, run complex reports
- **Flat Pricing**: $25/month regardless of team size

#### Limitations

- **Explicit Subscriptions**: Must set up realtime listeners manually
- **SQL Schema**: Not TypeScript-native (types generated)
- **Transaction Boilerplate**: Need RPC functions for atomicity

#### Example: SQL Aggregation

```sql
SELECT
  player_id,
  COUNT(*) as matches_played,
  COUNT(*) FILTER (WHERE winner_id = player_id) as wins,
  ROUND(
    COUNT(*) FILTER (WHERE winner_id = player_id)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2
  ) as win_rate
FROM matches
WHERE status = 'completed'
GROUP BY player_id
ORDER BY wins DESC;
```

### C. Cost Comparison (At Our Scale)

| Metric                | Estimate    |
| --------------------- | ----------- |
| Monthly active users  | ~1,000      |
| Tournaments per month | ~100        |
| Matches per month     | ~10,000     |
| Database size         | ~100-500 MB |

| Platform | Tier                  | Monthly Cost |
| -------- | --------------------- | ------------ |
| Convex   | Professional (2 devs) | ~$50-75      |
| Supabase | Pro                   | ~$25-35      |

**Conclusion**: Supabase is approximately half the cost for a small team.

---

## References

### Supabase Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Database](https://supabase.com/docs/guides/database)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [Presence](https://supabase.com/docs/guides/realtime/presence)
- [Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- [Edge Functions](https://supabase.com/docs/guides/functions)

### Convex Documentation (Historical)

- [Convex Docs](https://docs.convex.dev)
- [Database Guide](https://docs.convex.dev/database)

---

**Last Updated:** January 2026
