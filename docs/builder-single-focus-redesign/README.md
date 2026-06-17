# Builder — Single-Focus Pokémon View redesign

Design package for the team-builder middle-section refactor: a single-focus carousel view, an interactive radial hexagon EV/SP stat editor, and a "versus" damage-calc view (your mon vs a fully-editable target). Produced via a visual-companion brainstorm.

## Contents

- **[`spec.md`](./spec.md)** — the full design spec: locked decisions, the radial stat editor, the versus subsystem, mobile, the implementation specifics that close the known code-integration gaps, files-at-a-glance, and end-to-end verification.
- **[`mockups/`](./mockups/)** — HTML wireframes from the brainstorm (open in a browser). They show the design's evolution; the **latest version of each view** is the reference.

## Mockup index

Open the **latest** of each view first:

| View | Latest file | Earlier iterations |
| --- | --- | --- |
| Single-focus (resting, calc off) | **`mockups/builder-context-v6.html`** | `builder-context.html` → `v5` (centering, tera-adjacent-to-types, per-stat effective+allocation, nature moved into stats card, move metadata) |
| Versus / damage-calc | **`mockups/calc-versus-v6.html`** | `calc-versus.html` → `v5` (stats adjacent to sprite, field controls to center, full field surface, symmetric panels, aligned bands, per-mon boosts) |
| Empty slot | **`mockups/empty-single-focus.html`** | — |
| Mobile (single-focus + versus) | **`mockups/mobile-v2.html`** | `mobile.html` (v2 adds tap-to-edit stats summary + field bottom-sheet) |
| Early immersive concept | `mockups/single-focus-immersive-v2.html` | `single-focus-immersive.html` |

## Status

Design + visuals validated; spec includes concrete resolutions for the code-integration gaps (calc-target adapter, moves direction seam, nature-helper extraction, tab-strip reorder, test blast radius). Not yet implemented.
