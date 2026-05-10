---
paths:
  - "apps/web/src/**/*.tsx"
---

# Mobile Responsiveness

Authoring-time rules so dashboard and public pages don't break at phone viewports. Distilled from the `feat/dashboard-mobile-responsiveness` pass. The audit-time companion is the `auditing-mobile-responsiveness` skill.

## Two probes that must always be true

```js
// Page-level horizontal overflow
document.documentElement.scrollWidth > window.innerWidth   // false on every page

// Sub-40px tap targets
[...document.querySelectorAll("button,a,[role=button]")]
  .filter(el => { const r = el.getBoundingClientRect();
                  return r.width && r.height && (r.width < 40 || r.height < 40); })
  // empty (decorative icons inside larger hit areas are fine)
```

## Tables → cards on mobile

A table with ≥4 columns will not fit on a phone. **Wrapping it in `overflow-x-auto` is not the answer** — horizontal scroll inside a vertical-scroll page is broken UX. Swap to a card layout via conditional mount.

```tsx
// In the wrapper component
const isClient = useIsClient();
const isMobile = useIsMobile();

if (entries.length === 0) return <EmptyState />;
return !isClient ? (
  <div
    aria-hidden
    className="bg-muted/30 animate-pulse rounded-lg"
    style={{ height: `${Math.max(entries.length, 3) * 52 + 32}px` }}
  />
) : isMobile ? (
  <FooCards entries={entries} {...handlers} />
) : (
  <FooTable entries={entries} {...handlers} />
);
```

**Never use `hidden md:block` / `md:hidden` for the swap** — both variants would mount, doubling Supabase fetches and creating keyboard/a11y collisions. Use `useIsMobile()` from `@/hooks/use-mobile` (768px breakpoint).

**Skeleton height derives from row count** so swapping in the real layout doesn't cause CLS. Skeleton must be `aria-hidden`.

**Extract shared display helpers** to a co-located `*-row-helpers.tsx` so table and cards stay in sync — see `apps/web/src/app/(dashboard)/dashboard/tournaments/tournament-row-helpers.tsx` for the pattern.

## Drag-and-drop has no mobile equivalent

Drag UI assumes side-by-side columns. On a phone the columns stack vertically, so dragging from "Unassigned" at the top to "Judges" at the bottom is broken UX. Always pair drag with a tap-to-X mobile alternative — typically a `DropdownMenu` "Move to ▾" trigger per row, or a Sheet picker. See `staff-client.tsx` for the desktop-drag + `StaffMobileList` split.

## Dialog/Sheet sizing

Bare `sm:max-w-md` lets content run viewport-edge on phones. Always include a mobile clamp:

```tsx
// Dialog
<DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">

// Sheet
<SheetContent
  side="right"
  className="w-full max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-lg"
>
```

## Fixed-width filter selects

Filter pickers (`SelectTrigger className="w-[140px]"`, `w-[200px]`) are desktop-only. On phones they sit awkwardly next to the page heading. Make them full-width:

```tsx
<SelectTrigger className="h-9 w-full text-xs sm:h-8 sm:w-[140px]">
```

When the heading + filters can't fit a single row on phone, stack them:

```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
  <h1>...</h1>
  <div className="flex items-center gap-2">{/* filters */}</div>
</div>
```

## Wide grids must collapse

`grid-cols-4` at 360px gives 4 columns of ~80px each — labels truncate. Always step down on mobile:

```tsx
// 4-col stat strip
<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

// 2-col form fields
<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
```

## Tap targets

Icon buttons that live in PageHeader, navigation rows, or card headers must be ≥40px on phones. Common pattern — bigger on phone, original on desktop:

```tsx
<SidebarTrigger className="-ml-1 size-10 sm:size-7" />
<PopoverTrigger className="size-10 rounded-md sm:size-8">
```

For a 14×14 icon (close ✕, drag handle), wrap it in a 40×40 invisible button:

```tsx
<button className="flex size-10 items-center justify-center sm:size-7" aria-label="...">
  <X className="size-3.5" />
</button>
```

## Status pill rows that nearly fill the viewport

If a row of pills is 391px wide on a 393px viewport, it'll clip the next time someone adds a status. Wrap in horizontal-scroll on phones:

```tsx
<div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
  <TabsList>...</TabsList>
</div>
```

## Test infrastructure

`useIsMobile()` calls `window.matchMedia` at mount via `useSyncExternalStore`. JSDOM doesn't implement matchMedia, so without a polyfill every component using the hook crashes in tests. The polyfill lives in `apps/web/src/test-setup.ts` — leave it alone.

When testing a component that uses `useIsMobile()`:

```tsx
const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

const mockUseIsClient = jest.fn();
jest.mock("@/hooks/use-is-client", () => ({
  useIsClient: () => mockUseIsClient(),
}));

beforeEach(() => {
  // Default to desktop + hydrated so existing tests stay on the desktop path
  mockUseIsClient.mockReturnValue(true);
  mockUseIsMobile.mockReturnValue(false);
});
```

Add a `describe("conditional mount")` block whenever you introduce a wrapper that switches between table and cards: skeleton when `!isClient`, table when desktop, cards stub when mobile.

## Preventing flash of wrong initial state on mobile

SSR renders with `useIsMobile() === false` (desktop assumption). When React hydrates on mobile, it re-renders to the mobile layout — but any state initialized to "desktop-open" values will still be open, and the user sees them before JavaScript can correct it.

**Use `useLayoutEffect` to close panels/UI that should be hidden on mobile before the first browser paint:**

```tsx
useLayoutEffect(() => {
  /* eslint-disable react-hooks/set-state-in-effect */
  if (window.innerWidth < 768) {
    setPanelOpen(false);   // or setSideDrawer(null), etc.
  }
  /* eslint-enable react-hooks/set-state-in-effect */
}, []);
```

`useLayoutEffect` fires synchronously after React's DOM mutations but before the browser paints — so users never see the panel open. `useEffect` fires after paint, causing a visible flash of the panel closing.

This is the correct approach for any piece of state that defaults to "open/visible" for desktop but should be "closed/hidden" on mobile. See `use-builder-state.ts` for a real example (Speed Tiers and Damage Calc panels).

## What NOT to do

- Don't gate the desktop drag UI behind `hidden md:block` — keep the wrapper unconditional and split the render only.
- Don't add a `min-w-[Npx]` to a card or row that's wider than the smallest target viewport (360px).
- Don't write CSS that uses `100vw` for width without subtracting padding — content jumps to the right of the page.
- Don't manually memoize (`useMemo`/`useCallback`/`React.memo`) the new card components — React Compiler handles it.
