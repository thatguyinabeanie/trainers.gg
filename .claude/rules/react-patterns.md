---
paths:
  - "**/*.tsx"
---

# React Patterns

Best practices for React component design, state management, and rendering patterns across the trainers.gg monorepo. These apply to both web (Next.js) and mobile (Expo) apps.

## React Compiler

React Compiler is enabled across all packages. Prefer letting the compiler handle memoization automatically. See `code-style.md` for the full React Compiler rules.

## Server vs Client Components

- **Default to Server Components** — pages and layouts are Server Components by default (no directive needed)
- Add `"use client"` only when the component needs: state, effects, event handlers, browser APIs, or custom hooks
- Push `"use client"` as **deep as possible** in the component tree — mark the leaf interactive component, not the parent

```tsx
// Good — only the interactive part is a Client Component
// page.tsx (Server Component)
import { LikeButton } from "./like-button"; // "use client"

export default async function Page() {
  const post = await getPost();
  return (
    <div>
      <h1>{post.title}</h1>
      <LikeButton likes={post.likes} />
    </div>
  );
}
```

## Composition Patterns

- **Pass Server Components as `children` to Client Components** — the slot pattern allows server-rendered content inside client wrappers

```tsx
// layout.tsx (Server Component)
import { Modal } from "./modal"; // "use client"
import { Cart } from "./cart"; // Server Component

export default function Layout() {
  return (
    <Modal>
      <Cart />
    </Modal>
  );
}
```

- **Context providers** — create in Client Components, import into Server Component layouts. Render providers as deep in the tree as possible

## Derived State

Calculate values during render when they can be derived from existing props or state. Do not store derived values in `useState` — React Compiler handles the memoization.

```tsx
// Good — calculated during render, compiler optimizes
function TodoList({ todos, showActive }: Props) {
  const activeTodos = todos.filter((t) => !t.completed);
  const visible = showActive ? activeTodos : todos;
  return (
    <ul>
      {visible.map((t) => (
        <li key={t.id}>{t.text}</li>
      ))}
    </ul>
  );
}

// Avoid — redundant state + unnecessary effect
function TodoList({ todos, showActive }: Props) {
  const [visible, setVisible] = useState(todos);
  useEffect(() => {
    setVisible(showActive ? todos.filter((t) => !t.completed) : todos);
  }, [todos, showActive]);
}
```

## State Resets

Use the `key` prop to reset component state when an identity changes — not `useEffect` watching a prop.

```tsx
// Good — key change resets all state in Profile
<Profile userId={userId} key={userId} />;

// Avoid — effect-based reset is a render behind
useEffect(() => {
  setComment("");
}, [userId]);
```

## No setState in Effects (`set-state-in-effect`)

The `react-hooks/set-state-in-effect` rule forbids calling `setState` synchronously in an effect body. Here are the approved alternatives:

**Client detection / SSR hydration** — use `useSyncExternalStore`:

```tsx
import { useSyncExternalStore } from "react";
const emptySubscribe = () => () => {};
export function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
```

**Reset state when a dependency changes** — render-time adjustment with `Symbol` sentinel:

```tsx
const UNINITIALIZED = Symbol();
const [prevFilter, setPrevFilter] = useState<typeof filter | symbol>(
  UNINITIALIZED
);
if (filter !== prevFilter) {
  setPrevFilter(filter);
  setPage(0); // setState during render is fine — React handles it
}
```

The `Symbol` sentinel ensures the condition fires on the first render even when data is immediately available (e.g., in tests with mocks).

**Imperative API calls (form.reset, router.push)** — move to event handlers, not render:

```tsx
// Good — reset in event handler
const handleOpenChange = (nextOpen: boolean) => {
  if (!nextOpen) form.reset();
  onOpenChange(nextOpen);
};

// Avoid — imperative calls during render
if (open !== prevOpen) {
  form.reset();
} // breaks StrictMode
```

**Debounce effects with early exits** — wrap setState in the timer, not at the top:

```tsx
// Good — setState only inside the timer callback (not directly in the effect body)
useEffect(() => {
  if (!searchTerm) return; // no setState here
  const timer = setTimeout(() => {
    setResults([]);
  }, 300);
  return () => clearTimeout(timer);
}, [searchTerm]);
```

## Refs

`useRef` holds mutable values that don't trigger re-renders. Refs are the correct tool for:

- **DOM access** — focusing inputs, measuring elements, scrolling
- **Stable callback refs** — keeping the latest version of a callback accessible to long-lived subscriptions without tearing them down
- **Instance-scoped mutable values** — timers, abort controllers, previous-value tracking, subscription channels

**Rules:**

- Never **read or write** refs during render — the `react-hooks/refs` rule catches this
- Update refs in `useLayoutEffect` (runs before subscriptions) or `useEffect`
- Read refs inside effects, event handlers, and subscription callbacks

**Stable callback pattern** — for long-lived subscriptions (Realtime, WebSocket, intervals) that need the latest handler without re-subscribing:

```tsx
const triggerRefreshRef = useRef(() => {
  // uses only refs and stable setters — safe across closures
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(() => setKey((k) => k + 1), 500);
});

useEffect(() => {
  const channel = supabase.channel("events")
    .on("postgres_changes", { ... }, () => triggerRefreshRef.current())
    .subscribe();
  return () => supabase.removeChannel(channel);
}, [supabase]);
```

**Updating refs from props** — use `useLayoutEffect` so the ref is current before any `useEffect` subscriptions fire:

```tsx
const onChangeRef = useRef(onChange);
useLayoutEffect(() => {
  onChangeRef.current = onChange;
});
```

## Effects

Effects are an escape hatch for synchronizing with external systems. Reach for them only when needed.

**Use effects for:**

- External system sync (WebSocket subscriptions, DOM APIs, timers)
- Analytics events triggered by component display
- Data fetching cleanup (ignore stale responses)

**Do not use effects for:**

- Deriving state from props/state — calculate during render instead
- Responding to user events — put logic in the event handler
- Notifying parent components of state changes — call the parent callback in the handler
- Chaining state updates — compute all next state in a single handler

```tsx
// Good — event-specific logic in the handler
function ProductPage({ product, addToCart }: Props) {
  function handleBuy() {
    addToCart(product);
    showNotification(`Added ${product.name}`);
  }
  return <button onClick={handleBuy}>Buy</button>;
}

// Avoid — effect reacts to state that was set by an event
useEffect(() => {
  if (product.isInCart) showNotification(`Added ${product.name}`);
}, [product]);
```

**Always include cleanup** for data fetching effects to prevent race conditions:

```tsx
useEffect(() => {
  let ignore = false;
  fetchResults(query).then((json) => {
    if (!ignore) setResults(json);
  });
  return () => {
    ignore = true;
  };
}, [query]);
```

**Use `useSyncExternalStore`** for subscribing to external stores instead of manual `useEffect` + `addEventListener`.

## Keys in Lists

- Use stable unique IDs (`item.id`) — never array indices for dynamic lists
- Array indices are acceptable only for static, never-reordered lists

## Props Serialization

Props passed from Server Components to Client Components must be serializable (no functions, classes, or Date objects). Pass primitive values or plain objects, and reconstruct complex types on the client side.

## Third-Party Client Libraries

If a third-party component uses client-only features but lacks `"use client"`, wrap it in a thin Client Component re-export:

```tsx
// components/carousel.tsx
"use client";
export { Carousel } from "acme-carousel";
```
