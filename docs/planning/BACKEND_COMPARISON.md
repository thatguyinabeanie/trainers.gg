# Backend Architecture: Convex + Supabase Dual-Backend Strategy

This document captures comprehensive research comparing Convex and Supabase, and outlines a dual-backend architecture strategy for trainers.gg.

**Research Date:** January 2026  
**Status:** Exploration Phase  
**Decision:** Keep Convex, explore adding Supabase for analytics/specific features

---

## Table of Contents

1. [Overview & Context](#1-overview--context)
2. [Package Structure](#2-package-structure)
3. [Platform Deep Dive: Convex](#3-platform-deep-dive-convex)
4. [Platform Deep Dive: Supabase](#4-platform-deep-dive-supabase)
5. [Feature Comparison](#5-feature-comparison)
6. [Code Pattern Examples](#6-code-pattern-examples)
7. [Data Sync Strategies](#7-data-sync-strategies)
8. [Use Case Recommendations](#8-use-case-recommendations)
9. [Cost Analysis](#9-cost-analysis)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Appendix: References](#appendix-references)

---

## 1. Overview & Context

### Current Stack

| Layer                | Technology            |
| -------------------- | --------------------- |
| Web Framework        | Next.js 16 (React 19) |
| Mobile Framework     | Expo 54 (React 19)    |
| **Database/Backend** | **Convex**            |
| Authentication       | Clerk                 |
| UI Components        | shadcn/ui + Base UI   |

### Why Explore Supabase?

1. **Future Analytics Needs** (6-12 months)
   - In-app dashboards with complex aggregations
   - External BI tool integration (Metabase, Tableau)
   - Tournament statistics, player rankings, usage metrics

2. **Specific Feature Gaps in Convex**
   - No native Presence ("who's online") feature
   - Complex aggregations require JavaScript, not SQL
   - No direct BI tool connections (no SQL access)

3. **Flexibility**
   - Different tools for different jobs
   - Avoid vendor lock-in for all features

### Decision Outcome

**Keep Convex as primary backend**, but structure packages to support adding Supabase for:

- Analytics and reporting
- Features requiring Presence/Broadcast
- BI tool integration

This is NOT a migration—it's a dual-backend architecture.

---

## 2. Package Structure

### Current State

```
packages/
├── backend/              # @trainers/backend (Convex)
│   ├── convex/
│   │   ├── _generated/   # Auto-generated API
│   │   ├── schema.ts     # 39 tables, 700+ lines
│   │   ├── users/
│   │   ├── tournaments/
│   │   └── ...
│   └── package.json
├── validators/           # @trainers/validators (shared Zod schemas)
├── ui/                   # @trainers/ui
└── theme/                # @trainers/theme
```

**Current Import Pattern:**

```typescript
// apps/web/src/lib/convex/api.ts
export { api } from "@trainers/backend/convex/_generated/api";
```

### Proposed Structure

```
packages/
├── backend-convex/       # @trainers/backend-convex (renamed)
│   ├── convex/
│   │   ├── _generated/
│   │   ├── schema.ts
│   │   └── ...
│   └── package.json
│
├── backend-supabase/     # @trainers/backend-supabase (new)
│   ├── src/
│   │   ├── client.ts     # Supabase client
│   │   ├── types.ts      # Generated types
│   │   ├── queries/      # Query functions
│   │   └── mutations/    # Mutation functions
│   ├── supabase/
│   │   └── migrations/   # SQL migrations
│   └── package.json
│
├── validators/           # @trainers/validators (unchanged - shared)
├── ui/
└── theme/
```

### Migration Steps

#### Phase 1: Rename Existing Package

1. Rename directory:

   ```bash
   mv packages/backend packages/backend-convex
   ```

2. Update `packages/backend-convex/package.json`:

   ```json
   {
     "name": "@trainers/backend-convex",
     "exports": {
       "./convex/_generated/api": { ... },
       "./convex/_generated/dataModel": { ... },
       "./convex/permissionKeys": { ... }
     }
   }
   ```

3. Update imports in `apps/web/src/lib/convex/api.ts`:

   ```typescript
   // Before
   export { api } from "@trainers/backend/convex/_generated/api";
   // After
   export { api } from "@trainers/backend-convex/convex/_generated/api";
   ```

4. Run `pnpm install` to update workspace links

#### Phase 2: Create Supabase Package

```bash
mkdir -p packages/backend-supabase/src
mkdir -p packages/backend-supabase/supabase/migrations
```

Create `packages/backend-supabase/package.json`:

```json
{
  "name": "@trainers/backend-supabase",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts",
    "./types": "./src/types.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "generate-types": "supabase gen types typescript --local > src/types.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@trainers/typescript-config": "workspace:*",
    "supabase": "^1.x",
    "typescript": "^5.9.3"
  }
}
```

### Shared Validators Strategy

The `@trainers/validators` package remains the source of truth for domain types:

```typescript
// packages/validators/src/tournament.ts
import { z } from "zod";

export const tournamentSchema = z.object({
  name: z.string().min(1).max(100),
  game: z.string(),
  maxParticipants: z.number().int().positive(),
  startDate: z.date(),
  status: z.enum(["draft", "open", "in_progress", "completed"]),
  prizePool: z.number().nonnegative().optional(),
});

export type Tournament = z.infer<typeof tournamentSchema>;
```

Both backends use these schemas:

- **Convex**: Converts Zod to Convex validators
- **Supabase**: Uses Zod for runtime validation, generates DB types from schema

---

## 3. Platform Deep Dive: Convex

### Database Architecture

| Characteristic     | Convex                                           |
| ------------------ | ------------------------------------------------ |
| **Type**           | Hybrid document-relational                       |
| **Data Format**    | JSON-like documents                              |
| **Schema**         | Optional but recommended (TypeScript validators) |
| **Query Language** | JavaScript/TypeScript (no SQL)                   |
| **Transactions**   | Automatic, serializable (OCC)                    |

### ACID Transactions

Convex provides **true serializability** via Optimistic Concurrency Control:

```
Transaction Flow:
1. Read documents (records versions in "read set")
2. Propose writes
3. At commit: verify all read versions still current
4. Conflict detected → automatic retry (deterministic functions)
5. Success → atomic commit
```

**Key insight**: Every mutation is automatically a transaction. No explicit `BEGIN`/`COMMIT`.

### Data Modeling

**Relationships via Document IDs:**

```typescript
// Reference pattern
await ctx.db.insert("matches", {
  tournamentId: tournament._id, // Reference to tournaments table
  player1Id: user1._id,
  player2Id: user2._id,
});

// Following references (manual "join")
const tournament = await ctx.db.get(match.tournamentId);
```

**No Native JOINs** - use JavaScript:

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

### Indexes

```typescript
// Schema definition
matches: defineTable({
  tournamentId: v.id("tournaments"),
  round: v.number(),
  status: v.string(),
})
  .index("by_tournament", ["tournamentId"])
  .index("by_tournament_round", ["tournamentId", "round"])
  .index("by_status", ["status"]),
```

| Constraint                    | Limit  |
| ----------------------------- | ------ |
| Max indexes per table         | 32     |
| Max fields per index          | 16     |
| `_creationTime` auto-appended | Always |

### Query Capabilities

| Feature          | Support                            |
| ---------------- | ---------------------------------- |
| Filter by index  | Yes (`.withIndex()`)               |
| In-memory filter | Yes (`.filter()`) - scans all docs |
| Sorting          | Asc/desc on index fields           |
| Pagination       | Cursor-based (`.paginate()`)       |
| Full-text search | Yes (built-in)                     |
| Vector search    | Yes (for AI/RAG)                   |
| Aggregations     | **No native** - use JS             |

**Aggregation Example (JavaScript):**

```typescript
const matches = await ctx.db.query("matches").collect();
const wins = matches.filter((m) => m.winnerId === playerId).length;
const avgScore = matches.reduce((sum, m) => sum + m.score, 0) / matches.length;
```

### Limits

| Resource                       | Limit    |
| ------------------------------ | -------- |
| Document size                  | 1 MiB    |
| Fields per document            | 1,024    |
| Array elements                 | 8,192    |
| Documents scanned per query    | 32,000   |
| Documents written per mutation | 16,000   |
| Execution time (user code)     | 1 second |

### Realtime

**Automatic Reactivity:**

```typescript
// Client - automatically subscribes and re-renders
const matches = useQuery(api.matches.getLive, { tournamentId });
// No subscription setup needed - just works!
```

**No Built-in Presence** - must build custom:

```typescript
// Custom presence requires:
// 1. Store last-seen timestamps in DB
// 2. Heartbeat mutations every 30s
// 3. Cron job to clean up stale records
```

### Pricing Summary

| Tier         | Cost          | Function Calls | Storage |
| ------------ | ------------- | -------------- | ------- |
| Free         | $0            | 1M/month       | 0.5 GB  |
| Professional | $25/dev/month | 25M/month      | 50 GB   |

**Key insight**: Realtime subscriptions count as function calls. Heavy realtime usage can escalate costs.

---

## 4. Platform Deep Dive: Supabase

### PostgreSQL Foundation

| Characteristic     | Supabase                                |
| ------------------ | --------------------------------------- |
| **Database**       | PostgreSQL 15.x                         |
| **Extensions**     | 50+ pre-installed                       |
| **Query Language** | SQL (full PostgreSQL)                   |
| **Transactions**   | Explicit (`BEGIN`/`COMMIT`) or via RPC  |
| **Access**         | Direct SQL, REST API, or client library |

### Key Extensions

| Extension            | Purpose                     |
| -------------------- | --------------------------- |
| `pg_stat_statements` | Query performance analytics |
| `pgvector`           | Vector embeddings for AI    |
| `pg_cron`            | Scheduled jobs              |
| `PostGIS`            | Geospatial queries          |
| `pg_graphql`         | GraphQL API                 |
| `http`               | HTTP requests from SQL      |

### Query Capabilities

**Full SQL Support:**

```sql
-- Complex aggregation with window functions
SELECT
  player_id,
  COUNT(*) as matches_played,
  COUNT(*) FILTER (WHERE winner_id = player_id) as wins,
  ROUND(
    COUNT(*) FILTER (WHERE winner_id = player_id)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 2
  ) as win_rate,
  RANK() OVER (ORDER BY COUNT(*) FILTER (WHERE winner_id = player_id) DESC) as rank
FROM matches
WHERE status = 'completed'
GROUP BY player_id
ORDER BY wins DESC
LIMIT 100;
```

| Feature             | Support                                  |
| ------------------- | ---------------------------------------- |
| JOINs               | Yes (all types)                          |
| CTEs                | Yes (recursive too)                      |
| Window functions    | Yes                                      |
| Aggregations        | Yes (native SQL)                         |
| Full-text search    | Yes (native + extensions)                |
| JSON operations     | Yes (JSONB)                              |
| Prepared statements | Partial (not in transaction pooler mode) |

### Realtime Features

Supabase has **three distinct realtime features**:

#### 1. Postgres Changes (CDC)

```typescript
supabase
  .channel("matches")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "matches",
      filter: "tournament_id=eq.123",
    },
    (payload) => {
      console.log("Match updated:", payload);
    }
  )
  .subscribe();
```

#### 2. Presence (Who's Online)

```typescript
const channel = supabase.channel("tournament:123");

channel
  .on("presence", { event: "sync" }, () => {
    const state = channel.presenceState();
    console.log("Online users:", Object.keys(state));
  })
  .subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track({
        user_id: currentUser.id,
        username: currentUser.name,
        online_at: new Date().toISOString(),
      });
    }
  });
```

#### 3. Broadcast (Pub/Sub)

```typescript
// Send
channel.send({
  type: "broadcast",
  event: "cursor-move",
  payload: { x: 100, y: 200 },
});

// Receive
channel.on("broadcast", { event: "cursor-move" }, (payload) => {
  console.log("Cursor:", payload);
});
```

### Realtime Performance

| Metric                       | Value       |
| ---------------------------- | ----------- |
| Concurrent connections (Pro) | 500-10,000  |
| Messages/month (Pro)         | 5M included |
| Broadcast latency (median)   | 6ms         |
| Broadcast latency (p99)      | 213ms       |

### Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tournaments
CREATE POLICY "Users view own tournaments"
ON tournaments FOR SELECT
TO authenticated
USING (organizer_id = (SELECT auth.uid()));

-- Policy: Anyone can view public tournaments
CREATE POLICY "Public tournaments visible to all"
ON tournaments FOR SELECT
USING (status = 'open' OR status = 'in_progress');
```

### Edge Functions

Deno-based serverless functions:

```typescript
// supabase/functions/process-match/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { matchId, winnerId } = await req.json();

  // Process match result
  const { error } = await supabase.rpc("submit_match_result", {
    p_match_id: matchId,
    p_winner_id: winnerId,
  });

  return new Response(JSON.stringify({ success: !error }));
});
```

### Pricing Summary

| Tier | Cost      | Database | Realtime                     |
| ---- | --------- | -------- | ---------------------------- |
| Free | $0        | 500 MB   | 200 connections, 2M messages |
| Pro  | $25/month | 8 GB     | 500 connections, 5M messages |

**Key insight**: Flat pricing regardless of team size (unlike Convex per-developer).

---

## 5. Feature Comparison

### Side-by-Side Matrix

| Feature              | Convex                | Supabase                | Notes                             |
| -------------------- | --------------------- | ----------------------- | --------------------------------- |
| **Database Model**   | Document store        | PostgreSQL (relational) | Different paradigms               |
| **Schema**           | TypeScript validators | SQL DDL                 | Both enforce types                |
| **Transactions**     | Automatic (OCC)       | Explicit or RPC         | Convex simpler                    |
| **JOINs**            | Manual (JS)           | Native SQL              | Supabase wins for complex queries |
| **Aggregations**     | JavaScript            | Native SQL              | Supabase wins for analytics       |
| **Realtime Queries** | Automatic             | Explicit subscriptions  | Convex simpler                    |
| **Presence**         | Build custom          | Native                  | Supabase wins                     |
| **Broadcast**        | Via DB writes         | Native pub/sub          | Supabase wins                     |
| **Full-text Search** | Built-in              | Native + extensions     | Both good                         |
| **Vector Search**    | Built-in              | pgvector extension      | Both good                         |
| **Auth Integration** | Clerk via JWT         | Native or Clerk         | Both work                         |
| **BI Tools**         | No direct access      | Direct SQL              | Supabase wins                     |
| **Self-hosting**     | Open source           | Open source             | Both available                    |
| **Pricing Model**    | Per-developer         | Flat + usage            | Supabase cheaper for teams        |

### Winner by Category

| Category                 | Winner   | Rationale                              |
| ------------------------ | -------- | -------------------------------------- |
| **Developer Experience** | Convex   | TypeScript-first, automatic reactivity |
| **Complex Queries**      | Supabase | SQL JOINs, CTEs, window functions      |
| **Analytics/BI**         | Supabase | Direct SQL access, aggregations        |
| **Realtime (basic)**     | Convex   | Zero-config reactivity                 |
| **Realtime (advanced)**  | Supabase | Presence, Broadcast built-in           |
| **Transactions**         | Convex   | Automatic, no explicit handling        |
| **Team Cost**            | Supabase | Flat pricing vs per-developer          |

---

## 6. Code Pattern Examples

### Creating a Record

**Convex:**

```typescript
// convex/tournaments/mutations.ts
export const create = mutation({
  args: {
    name: v.string(),
    game: v.string(),
    maxParticipants: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("tournaments", {
      ...args,
      organizerId: identity.subject,
      status: "draft",
      createdAt: Date.now(),
    });
  },
});

// Client
const createTournament = useMutation(api.tournaments.mutations.create);
await createTournament({
  name: "VGC Weekly",
  game: "VGC",
  maxParticipants: 32,
});
```

**Supabase:**

```typescript
// services/tournaments.ts
export async function createTournament(data: {
  name: string;
  game: string;
  maxParticipants: number;
}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .insert({
      name: data.name,
      game: data.game,
      max_participants: data.maxParticipants,
      organizer_id: user.user.id,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw error;
  return tournament;
}
```

### Reading with Relationships

**Convex:**

```typescript
export const getWithMatches = query({
  args: { id: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.id);
    if (!tournament) return null;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.id))
      .collect();

    // Enrich with player data
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => ({
        ...match,
        player1: match.player1Id ? await ctx.db.get(match.player1Id) : null,
        player2: match.player2Id ? await ctx.db.get(match.player2Id) : null,
      }))
    );

    return { ...tournament, matches: enrichedMatches };
  },
});
```

**Supabase:**

```typescript
export async function getTournamentWithMatches(id: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      matches (
        *,
        player1:users!player1_id (id, username, avatar_url),
        player2:users!player2_id (id, username, avatar_url)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}
```

### Aggregations

**Convex:**

```typescript
export const getPlayerStats = query({
  args: { playerId: v.id("users") },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .filter((q) =>
        q.or(
          q.eq(q.field("player1Id"), args.playerId),
          q.eq(q.field("player2Id"), args.playerId)
        )
      )
      .collect();

    const completed = matches.filter((m) => m.status === "completed");
    const wins = completed.filter((m) => m.winnerId === args.playerId);

    return {
      totalMatches: completed.length,
      wins: wins.length,
      losses: completed.length - wins.length,
      winRate:
        completed.length > 0
          ? Math.round((wins.length / completed.length) * 100)
          : 0,
    };
  },
});
```

**Supabase:**

```typescript
export async function getPlayerStats(playerId: string) {
  const { data, error } = await supabase.rpc("get_player_stats", {
    p_player_id: playerId,
  });
  if (error) throw error;
  return data;
}
```

```sql
-- Database function (efficient!)
CREATE FUNCTION get_player_stats(p_player_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'totalMatches', COUNT(*),
    'wins', COUNT(*) FILTER (WHERE winner_id = p_player_id),
    'losses', COUNT(*) FILTER (WHERE winner_id != p_player_id),
    'winRate', ROUND(
      COUNT(*) FILTER (WHERE winner_id = p_player_id)::NUMERIC /
      NULLIF(COUNT(*), 0) * 100
    )
  )
  FROM matches
  WHERE (player1_id = p_player_id OR player2_id = p_player_id)
    AND status = 'completed';
$$ LANGUAGE SQL;
```

### Realtime Subscriptions

**Convex:**

```typescript
// Just use useQuery - it's automatically reactive!
function TournamentBracket({ id }: { id: Id<"tournaments"> }) {
  const matches = useQuery(api.matches.getByTournament, { tournamentId: id });

  // Component re-renders when ANY match changes
  return <Bracket matches={matches} />;
}
```

**Supabase:**

```typescript
function TournamentBracket({ id }: { id: string }) {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    // Initial fetch
    supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", id)
      .then(({ data }) => setMatches(data ?? []));

    // Subscribe to changes
    const channel = supabase
      .channel(`matches:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${id}`,
        },
        (payload) => {
          // Handle insert/update/delete
          if (payload.eventType === "UPDATE") {
            setMatches((prev) =>
              prev.map((m) => (m.id === payload.new.id ? payload.new : m))
            );
          }
          // ... handle other events
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  return <Bracket matches={matches} />;
}
```

### Presence (Who's Online)

**Convex (Custom Implementation):**

```typescript
// convex/presence.ts
export const heartbeat = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_tournament", (q) =>
        q
          .eq("externalId", identity.subject)
          .eq("tournamentId", args.tournamentId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: Date.now() });
    } else {
      await ctx.db.insert("presence", {
        externalId: identity.subject,
        tournamentId: args.tournamentId,
        lastSeen: Date.now(),
      });
    }
  },
});

export const getOnline = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - 60000; // 1 minute
    return await ctx.db
      .query("presence")
      .withIndex("by_tournament", (q) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .filter((q) => q.gte(q.field("lastSeen"), cutoff))
      .collect();
  },
});

// Client hook
function usePresence(tournamentId: Id<"tournaments">) {
  const heartbeat = useMutation(api.presence.heartbeat);
  const online = useQuery(api.presence.getOnline, { tournamentId });

  useEffect(() => {
    heartbeat({ tournamentId });
    const interval = setInterval(() => heartbeat({ tournamentId }), 30000);
    return () => clearInterval(interval);
  }, [tournamentId]);

  return online ?? [];
}
```

**Supabase (Native):**

```typescript
function usePresence(tournamentId: string) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const channel = supabase.channel(`tournament:${tournamentId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineUsers(Object.values(state).flat());
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUser.id,
            username: currentUser.name,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  return onlineUsers;
}
```

### Transactions

**Convex (Automatic):**

```typescript
// Everything in a mutation is automatically atomic!
export const submitMatchResult = mutation({
  args: {
    matchId: v.id("matches"),
    winnerId: v.id("users"),
    score: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    // All these writes are atomic - if any fails, all rollback
    await ctx.db.patch(args.matchId, {
      winnerId: args.winnerId,
      score: args.score,
      status: "completed",
    });

    await ctx.db.patch(args.winnerId, { wins: existingWins + 1 });

    // Advance to next round...
    const nextMatch = await findNextMatch(ctx, match);
    if (nextMatch) {
      await ctx.db.patch(nextMatch._id, { player1Id: args.winnerId });
    }

    return { success: true };
  },
});
```

**Supabase (Explicit via RPC):**

```typescript
export async function submitMatchResult(
  matchId: string,
  winnerId: string,
  score: string
) {
  const { data, error } = await supabase.rpc("submit_match_result", {
    p_match_id: matchId,
    p_winner_id: winnerId,
    p_score: score,
  });
  if (error) throw error;
  return data;
}
```

```sql
CREATE FUNCTION submit_match_result(
  p_match_id UUID,
  p_winner_id UUID,
  p_score TEXT
) RETURNS JSON AS $$
DECLARE
  v_match RECORD;
BEGIN
  -- Lock the row
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;

  IF v_match IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Update match
  UPDATE matches SET
    winner_id = p_winner_id,
    score = p_score,
    status = 'completed'
  WHERE id = p_match_id;

  -- Update player stats
  UPDATE users SET wins = wins + 1 WHERE id = p_winner_id;

  -- Advance to next round (if applicable)
  -- ...

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

---

## 7. Data Sync Strategies

If you need data in both systems (e.g., Convex for app, Supabase for analytics):

### Option 1: Airbyte (Recommended)

| Feature              | Details                              |
| -------------------- | ------------------------------------ |
| **Type**             | Managed ETL                          |
| **Convex Connector** | Official (source)                    |
| **Sync Modes**       | Full refresh, incremental, CDC       |
| **Destinations**     | PostgreSQL, BigQuery, Snowflake, 50+ |
| **Cost**             | Free (OSS) or Cloud pricing          |

**Setup:**

1. Get Convex deploy key from Dashboard → Settings
2. Configure Airbyte source connector
3. Map to Supabase PostgreSQL destination
4. Schedule sync (every 5 min, hourly, etc.)

### Option 2: Fivetran

| Feature              | Details                                   |
| -------------------- | ----------------------------------------- |
| **Type**             | Managed ETL                               |
| **Convex Connector** | Official (maintained by Convex)           |
| **Sync Modes**       | Incremental                               |
| **Destinations**     | Snowflake, BigQuery, Databricks, Postgres |
| **Cost**             | Usage-based pricing                       |

### Option 3: Custom Sync via Actions

For real-time sync or custom logic:

```typescript
// convex/sync.ts
"use node";
import { internalAction } from "./_generated/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });

export const syncMatch = internalAction({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.runQuery(internal.matches.get, { id: matchId });
    if (!match) return;

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO matches_analytics (convex_id, tournament_id, winner_id, score, completed_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (convex_id) DO UPDATE SET
           winner_id = EXCLUDED.winner_id,
           score = EXCLUDED.score,
           completed_at = EXCLUDED.completed_at`,
        [
          match._id,
          match.tournamentId,
          match.winnerId,
          match.score,
          match.completedAt,
        ]
      );
    } finally {
      client.release();
    }
  },
});

// Trigger from mutation
export const submitMatchResult = mutation({
  // ... args
  handler: async (ctx, args) => {
    // ... update match

    // Schedule sync to Supabase
    await ctx.scheduler.runAfter(0, internal.sync.syncMatch, {
      matchId: args.matchId,
    });
  },
});
```

### Option 4: Batch Sync via Cron

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("sync-to-supabase", { hours: 1 }, internal.sync.batchSync);

export default crons;
```

### When to Sync

| Scenario                  | Sync Strategy                     |
| ------------------------- | --------------------------------- |
| BI dashboards (daily)     | Airbyte/Fivetran scheduled        |
| Analytics (near-realtime) | Custom action on write            |
| Historical reporting      | Batch export                      |
| Supabase-only features    | No sync needed (independent data) |

---

## 8. Use Case Recommendations

Based on the comparison, here's where each platform excels:

### Feature Mapping

| Feature                      | Recommended Backend | Rationale                                  |
| ---------------------------- | ------------------- | ------------------------------------------ |
| **Live tournament brackets** | Convex              | Automatic reactivity, no subscription code |
| **Match scoring**            | Convex              | Atomic transactions, realtime updates      |
| **User profiles**            | Either              | Simple CRUD, no strong preference          |
| **Registration flow**        | Convex              | Already implemented, working well          |
| **"Who's online"**           | Supabase            | Native Presence feature                    |
| **Live chat**                | Supabase            | Broadcast for typing indicators            |
| **Player statistics**        | Supabase            | SQL aggregations, window functions         |
| **Leaderboards**             | Supabase            | Complex ranking queries                    |
| **Tournament analytics**     | Supabase            | Direct BI tool access                      |
| **Usage metrics**            | Supabase            | pg_stat, aggregations                      |
| **Team builder**             | Convex              | Collaborative editing via reactivity       |

### Proposed Split

**Phase 1: Keep Everything on Convex**

- All current features stay on Convex
- No immediate changes needed

**Phase 2: Add Supabase for Analytics**

- Sync match/tournament data to Supabase
- Build analytics dashboards on Supabase
- Connect BI tools (Metabase) to Supabase

**Phase 3: Native Supabase Features**

- Implement Presence on Supabase (tournament lobbies)
- Add Broadcast for live features (chat, notifications)
- Keep core tournament logic on Convex

---

## 9. Cost Analysis

### Your Scale

| Metric                | Estimate    |
| --------------------- | ----------- |
| Monthly active users  | ~1,000      |
| Tournaments per month | ~100        |
| Matches per month     | ~10,000     |
| Peak concurrent users | ~50-100     |
| Database size         | ~100-500 MB |

### Convex Costs

**Free Tier Viability:** Tight - may exceed function calls

| Resource           | Usage       | Free Limit | Status     |
| ------------------ | ----------- | ---------- | ---------- |
| Function calls     | ~2-5M/month | 1M         | May exceed |
| Database storage   | ~0.3 GB     | 0.5 GB     | OK         |
| Database bandwidth | ~2-5 GB     | 1 GB       | May exceed |

**Professional (2 developers):**

- Base: $50/month
- Overages: ~$0-25/month
- **Total: ~$50-75/month**

### Supabase Costs

**Free Tier Viability:** Sufficient initially (but pauses after inactivity)

| Resource             | Usage     | Free Limit | Status |
| -------------------- | --------- | ---------- | ------ |
| Database             | ~0.3 GB   | 500 MB     | OK     |
| Realtime connections | ~100 peak | 200        | OK     |
| Realtime messages    | ~500K     | 2M         | OK     |

**Pro Tier:**

- Base: $25/month
- Overages: ~$0-10/month
- **Total: ~$25-35/month**

### Dual-Backend Cost

Running both platforms:

| Scenario                          | Convex    | Supabase  | Total           |
| --------------------------------- | --------- | --------- | --------------- |
| Minimal (Supabase analytics only) | $50/month | $25/month | **~$75/month**  |
| Full (both active)                | $75/month | $35/month | **~$110/month** |

### Cost Optimization Tips

1. **Convex**: Reduce subscription updates by batching reads
2. **Supabase**: Use read replicas to keep Pro tier sufficient
3. **Sync**: Use Airbyte OSS to avoid ETL costs
4. **Evaluate**: After 3 months, assess if dual-backend is worth the cost

---

## 10. Implementation Roadmap

### Phase 1: Package Restructure (Low Risk)

**Effort:** 1-2 hours

1. Rename `packages/backend` → `packages/backend-convex`
2. Update `package.json` name to `@trainers/backend-convex`
3. Update imports in `apps/web`:
   ```typescript
   // apps/web/src/lib/convex/api.ts
   export { api } from "@trainers/backend-convex/convex/_generated/api";
   ```
4. Run `pnpm install` and verify build

### Phase 2: Create Supabase Package Scaffold

**Effort:** 2-4 hours

1. Create `packages/backend-supabase/` structure
2. Set up Supabase project (supabase.com)
3. Configure environment variables
4. Create basic client setup

```typescript
// packages/backend-supabase/src/client.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Phase 3: Implement First Supabase Feature

**Candidates:**

- Analytics dashboard (sync data from Convex)
- Presence feature (new, independent)
- Player statistics (read-only, synced data)

### Phase 4: Evaluate and Expand

After 1-2 months:

- Assess performance and cost
- Decide on additional features
- Consider whether to keep dual-backend or consolidate

---

## Appendix: References

### Convex Documentation

- [Convex Docs](https://docs.convex.dev)
- [Database Guide](https://docs.convex.dev/database)
- [Queries](https://docs.convex.dev/functions/query-functions)
- [Mutations](https://docs.convex.dev/functions/mutation-functions)
- [Actions](https://docs.convex.dev/functions/actions)
- [Streaming Export](https://docs.convex.dev/production/integrations/streaming-import-export)
- [Pricing](https://convex.dev/pricing)

### Supabase Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Database](https://supabase.com/docs/guides/database)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [Presence](https://supabase.com/docs/guides/realtime/presence)
- [Broadcast](https://supabase.com/docs/guides/realtime/broadcast)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [Pricing](https://supabase.com/pricing)

### ETL Tools

- [Airbyte Convex Connector](https://docs.airbyte.com/integrations/sources/convex)
- [Fivetran](https://fivetran.com)

---

**Document Maintainer:** trainers.gg team  
**Last Updated:** January 2026
