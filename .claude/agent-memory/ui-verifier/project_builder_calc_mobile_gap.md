---
name: builder-calc-mobile-gap
description: FocusCard single-focus + calc-ON on mobile renders full multi-column table instead of mobile row layout — internal horizontal scroll in the moves card
metadata:
  type: project
---

In `FocusCard` (`focus-card.tsx:323`), `MovesLane` is called with `presentation={isClient && isMobile ? "card-list" : "list"}`. However, `MovesLaneReal` (`moves-lane.tsx:836-859`) only uses the card-list path when `!calc.calcEnabled`. When calc is ON, it falls through to the full `<Table>` even on mobile.

The `Table` primitive wraps in `overflow-x-auto`, so no page-level overflow occurs, but there is an internal horizontal scrollbar inside the moves card on mobile when calc is enabled in single-focus view.

**Why:** The mobile fallback (`card-list`) was designed for calc-OFF. The calc-ON mobile path for the VERSUS view uses `MobileMoveRow` (moves-lane-mobile.tsx) and handles this correctly. The single-focus FocusCard calc-ON path has no equivalent mobile fallback.

**How to apply:** When building or auditing the builder moves table on mobile, check both: (1) calc-OFF → card-list renders correctly, (2) calc-ON → still uses full table → internal scroll inside the moves card. The fix would be a MobileMoveRow equivalent wired into MovesLane when calc is ON and isMobile.
