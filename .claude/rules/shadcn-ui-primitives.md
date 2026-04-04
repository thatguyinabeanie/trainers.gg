---
paths:
  - "apps/web/src/components/ui/**"
---

# shadcn/ui Primitives

Guardrails for viewing or editing files in `apps/web/src/components/ui/`. Most files here are shadcn-installed components — treat them carefully.

## Identifying shadcn vs Custom Components

**shadcn components** import from `@base-ui/react/*` and use compound sub-components (e.g., `DialogPrimitive.Root`, `SelectPrimitive.Trigger`). They follow a consistent pattern: Base UI primitive wrapper + `data-slot` attributes + `cn()` styling.

**Custom components** don't import Base UI primitives. They are project-specific and safe to modify freely.

## shadcn Component Rules

- **Never import from `@radix-ui/*`** — this project uses `@base-ui/react` (shadcn style: `base-nova`)
- **No `asChild` prop** — Base UI does not support it. Use the `render` prop for composition
- **Preserve `data-slot` attributes** — used for CSS targeting (`data-[slot=...]`) and testing
- **Preserve export patterns** — don't restructure the named exports block at the bottom of the file
- **Don't rewrite from scratch** — to update from upstream: `npx shadcn@latest add <component-name>`
- **Preserve CVA variant structure** — don't inline variant classes or remove the `cva()` call

## Custom Components (Safe to Modify Freely)

These files in `components/ui/` are NOT from shadcn — they are project-specific:

| File                   | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `status-badge.tsx`     | Semantic status labels with color mapping                   |
| `empty-state.tsx`      | Empty state — illustrated/minimal/inline variants           |
| `empty.tsx`            | Composable empty state (header, title, description, media)  |
| `copy-button.tsx`      | Clipboard copy with feedback animation                      |
| `data-table.tsx`       | TanStack Table v5 wrapper with sorting/filtering/pagination |
| `responsive-table.tsx` | Horizontal-scrollable table with fade shadows               |
| `spinner.tsx`          | Animated loading spinner                                    |
| `username-input.tsx`   | Input with `.trainers.gg` domain suffix                     |
| `password-input.tsx`   | Input with show/hide password toggle                        |
| `field.tsx`            | Form field wrapper with legend, label, description, error   |
| `item.tsx`             | List item with media, title, description, actions           |
| `kbd.tsx`              | Keyboard key display                                        |
| `markdown-content.tsx` | Renders markdown safely (react-markdown + remark-gfm + rehype-sanitize) with design-system styles |

## Keeping Catalogs in Sync

When you **add, rename, or delete** a component in this directory, update the corresponding catalog rule (`web-ui-catalog.md`) and the custom components table above so future agents see accurate information.
