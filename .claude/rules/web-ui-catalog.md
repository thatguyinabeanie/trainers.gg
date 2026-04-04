---
paths:
  - "apps/web/src/**/*.{ts,tsx}"
---

# Web UI Component Catalog

Available UI components in `apps/web/src/components/ui/`. Check this catalog before creating new components — if something similar exists, read the file and use or extend it.

Install missing shadcn components with `npx shadcn@latest add <name>`. Check the shadcn registry first with the shadcn MCP `search_items_in_registries` tool.

## Layout

Card, Sidebar, Separator, Tabs, Accordion, Collapsible, Resizable, ScrollArea, AspectRatio

## Overlays

Dialog, AlertDialog, Sheet (side panel), Drawer (slide-in via Vaul), Popover, HoverCard, Tooltip

## Forms

Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, Label, Form (react-hook-form + zod integration), Field (wrapper with label/description/error), InputGroup (prefix/suffix addons), Combobox (searchable dropdown, multi-select, chips), DateTimeField (date + time picker), InputOTP (one-time password slots), PasswordInput (show/hide toggle), UsernameInput (.trainers.gg suffix)

## Actions

Button (6 variants, 7 sizes), ButtonGroup, Toggle, ToggleGroup, DropdownMenu, ContextMenu, Menubar, NavigationMenu

## Data Display

Table, DataTable (TanStack Table v5 — sorting, filtering, pagination), ResponsiveTable (horizontal scroll with fade shadows), Badge, StatusBadge (semantic status colors — emerald/blue/amber/gray/red), Avatar (with badge and group support), Progress, Skeleton, Calendar, Chart (Recharts wrapper), Carousel, Pagination

## Feedback

Alert (with action slot), EmptyState (illustrated/minimal/inline variants), Empty (composable — header, title, description, media), Spinner, toast notifications via `toast()` from sonner

## Content Rendering

MarkdownContent — renders a markdown string safely using react-markdown + remark-gfm + rehype-sanitize, with design-system–aware Tailwind styles (teal links, muted code blocks, etc.). Props: `content: string`, `className?: string`.

## Utility

CopyButton (clipboard with feedback), Kbd (keyboard key display), Breadcrumb, Command (command palette via cmdk), Item (list item with media/actions)

## Keeping This Catalog in Sync

When you **create, rename, or delete** a UI component in `components/ui/`, update this catalog so future agents see accurate information. Also update the custom components table in `shadcn-ui-primitives.md` if the component is project-specific (not from shadcn).
