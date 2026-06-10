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

### postgres_changes — reactive DB row push

```tsx
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
      () => refetch() // payload available but refetching is simpler
    )
    .subscribe((status, err) => {
      if (err) console.error("[registrations-realtime] subscribe error:", err);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [supabase, entityId, refetch]);
```

`event` is `"*" | "INSERT" | "UPDATE" | "DELETE"`. Use the narrowest event type possible.

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

## Invalidating TanStack Query on an Event

When client state lives in TanStack Query, call `queryClient.invalidateQueries()` in the callback instead of local state:

```tsx
const queryClient = useQueryClient();
channel.on("postgres_changes", { ... }, () => {
  queryClient.invalidateQueries({ queryKey: ["registrations", id] });
});
```

Use `refetch()` from `useSupabaseQuery` when that hook already owns the data (simpler).

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

Mobile (Expo) hits Supabase directly via `@trainers/supabase/mobile` — same channel naming convention applies. See `building-mobile-app` for mobile client setup.
