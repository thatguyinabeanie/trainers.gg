---
name: using-realtime
description: Use when adding Supabase Realtime — presence, broadcast, or postgres_changes subscriptions in web or mobile
---

# Using Realtime

Supabase Realtime for live data push in Client Components. Get the client via `useSupabase()` from `@/lib/supabase`.

## Channel Naming Convention

`<domain>-<entityId>` — lowercase, hyphenated, always ends with a specific ID:

| Pattern                        | Example              | Where                                                         |
| ------------------------------ | -------------------- | ------------------------------------------------------------- |
| `notifications-{userId}`       | `notifications-abc`  | `components/notification-bell.tsx`                            |
| `match-presence-{matchId}`     | `match-presence-42`  | `components/match/presence-indicator.tsx`                     |
| `match-messages-{matchId}`     | `match-messages-42`  | `components/match/match-page-client.tsx`                      |
| `registrations-{tournamentId}` | `registrations-7`    | `components/tournament/tournament-sidebar-card.tsx`           |
| `pairings-matches-{roundId}`   | `pairings-matches-3` | `components/tournaments/manage/tournament-pairings-judge.tsx` |

## Subscription Types

### postgres_changes — reactive DB row push (payload-driven mandate)

**Handlers MUST be payload-driven.** Call `queryClient.setQueryData(queryKey, prev => upsertById(prev, payload.new))` — **never** `invalidateQueries` or `refetch` per event. Triggering a network round-trip on every event erases the cost savings at scale (~50k live reads/round at 7k concurrent players). The one allowed refetch is a single reconnect-resync on channel re-subscribe (i.e., after a disconnect).

```tsx
const queryClient = useQueryClient();

useEffect(() => {
  if (!entityId) return;

  const channel = supabase
    .channel(`registrations-${entityId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tournament_registrations",
        filter: `tournament_id=eq.${entityId}`,
      },
      (payload) => {
        // Payload-driven: update the cache directly, no refetch
        queryClient.setQueryData(
          ["registrations", entityId],
          (prev: Registration[] | undefined) =>
            upsertById(prev ?? [], payload.new as Registration)
        );
      }
    )
    .subscribe((status, err) => {
      if (err) console.error("[registrations-realtime] subscribe error:", err);
      if (status === "SUBSCRIBED") {
        // One-time reconnect-resync: the only allowed refetch
        queryClient.invalidateQueries({ queryKey: ["registrations", entityId] });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [supabase, entityId, queryClient]);
```

`event` is `"*" | "INSERT" | "UPDATE" | "DELETE"`. Use the narrowest event type possible.

**Keep `postgres_changes`** — no migration to Broadcast. Broadcast would only be considered in future if the Supabase connection ceiling forces it; for now `postgres_changes` is the standard.

#### Publication rules

A table may be realtime-published for an audience only if **every column** in the table is safe for that audience — payloads cannot be column-filtered, so any sensitive column on the row makes the whole row unsafe to broadcast (column-homogeneous-sensitivity rule).

**The realtime six** — the only S-bucket tables published for authenticated users:

| Table | Audience |
| --- | --- |
| `notifications` | per-user (filter `user_id=eq.{userId}`) |
| `match_games` | match participants + staff |
| `match_messages` | match participants + staff |
| `tournament_matches` | tournament participants + staff |
| `tournament_registrations` | tournament participants + staff |
| `tournament_rounds` | tournament participants + staff |

`match_games` and `match_messages` carry flattened `tournament_id` / `community_id` columns (added in Phase 3), which simplifies subscription filters and RLS checks — use those columns in filters rather than joining.

**Spectators and logged-out users get no realtime.** Public-facing pages (spectator views, tournament listings, community pages) use SSR/ISR with tag revalidation only. No websocket connections for unauthenticated readers.

### presence — who is in the room

```tsx
const channelRef = useRef<RealtimeChannel | null>(null);

useEffect(() => {
  if (!username) return;
  const channel = supabase.channel(`match-presence-${matchId}`);
  channelRef.current = channel;

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState<PresenceUser>();
    setViewers(Object.values(state).flat());
  });

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED")
      await channel.track({ username, displayName, isStaff });
  });

  return () => {
    supabase.removeChannel(channel);
    channelRef.current = null;
  };
}, [supabase, matchId, username, displayName, isStaff]);

// To update tracked state (e.g. typing indicator):
await channelRef.current?.track({ ...presenceRef.current, isTyping: true });
```

Real example: `apps/web/src/components/match/presence-indicator.tsx` (also shows broadcast on the same channel).

### broadcast — ephemeral peer events (no DB persistence)

Chain onto a channel before `.subscribe()`:

```tsx
// Send
await channelRef.current.send({
  type: "broadcast",
  event: "judge-request",
  payload: { requested: true },
});

// Receive
channel.on("broadcast", { event: "judge-request" }, ({ payload }) => {
  onJudgeRequestRef.current?.(payload.requested);
});
```

### Multiple channels — collect and tear down together

```tsx
useEffect(() => {
  const channels: RealtimeChannel[] = [];
  channels.push(
    supabase.channel(`match-messages-${matchId}`).on(/* ... */).subscribe()
  );
  channels.push(
    supabase.channel(`match-status-${matchId}`).on(/* ... */).subscribe()
  );
  return () => {
    channels.forEach((ch) => supabase.removeChannel(ch));
  };
}, [supabase, matchId]);
```

Real example: `apps/web/src/components/match/match-page-client.tsx` (3 channels).

## RLS and Realtime

`postgres_changes` respects RLS — users only receive events for rows they can SELECT. The `filter` parameter is a secondary guard. Presence and broadcast bypass RLS (no DB rows).

## Updating TanStack Query Cache on an Event

When client state lives in TanStack Query, use **`queryClient.setQueryData`** to apply the payload directly — do NOT call `queryClient.invalidateQueries()` or `refetch()` per event:

```tsx
const queryClient = useQueryClient();
channel.on("postgres_changes", { event: "*", ... }, (payload) => {
  // Direct cache write — no network round-trip
  queryClient.setQueryData(
    ["registrations", id],
    (prev: Registration[] | undefined) =>
      upsertById(prev ?? [], payload.new as Registration)
  );
});
```

`invalidateQueries` is allowed only once on channel re-subscribe (reconnect-resync), never per event.

## Stable Callback Pattern

For handlers that read local state, store in a ref to avoid re-subscribing. Update in `useLayoutEffect` (runs before subscriptions fire):

```tsx
const onJudgeRequestRef = useRef(onJudgeRequest);
useLayoutEffect(() => {
  onJudgeRequestRef.current = onJudgeRequest;
});
// Inside channel.on(): onJudgeRequestRef.current?.(payload.requested);
```

No `useCallback` — React Compiler handles that. See `react-patterns.md` "Stable callback pattern".

## Testing Realtime

Mock the chained builder; verify channel name, event config, and cleanup:

```ts
const mockSubscribe = jest.fn().mockReturnValue({ unsubscribe: jest.fn() });
const mockOn = jest.fn().mockReturnValue({ subscribe: mockSubscribe });
const mockRemoveChannel = jest.fn();
const mockChannel = jest.fn().mockReturnValue({ on: mockOn });

jest.mock("@/lib/supabase", () => ({ useSupabase: () => ({ channel: mockChannel, removeChannel: mockRemoveChannel, /* ... */ }) }));

it("creates channel with correct name", () => {
  render(<MyComponent tournamentId={7} />);
  expect(mockChannel).toHaveBeenCalledWith("registrations-7");
});
it("removes channel on unmount", () => {
  const { unmount } = render(<MyComponent tournamentId={7} />);
  unmount();
  expect(mockRemoveChannel).toHaveBeenCalled();
});
```

Real example: `apps/web/src/components/tournament/__tests__/sidebar-realtime.test.tsx`.

See `writing-tests` for factory patterns and full Jest config.

## Mobile Parity

Mobile (Expo) realtime subscriptions use `@trainers/supabase/mobile` — same channel naming convention and payload-driven mandate apply. Realtime on mobile is only valid for authenticated users (the channel uses the SecureStore session). See `building-mobile-app` for the hybrid data-access model and mobile client setup.
