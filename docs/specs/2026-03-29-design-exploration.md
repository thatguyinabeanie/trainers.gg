# Design Exploration — trainers.gg Visual Redesign

> Brainstormed on 2026-03-29. This is an ongoing exploration doc for visual design decisions. Not all decisions are finalized.

## Design References

### Pokémon Sites (primary inspiration)

| Site | URL | What we like |
|------|-----|-------------|
| **Pokopia** | https://pokopia.pokemon.com/en-us/ | Warmth, wholesome softness, rounded shapes, organic feel. NOT the childishness — just the warmth. |
| **Pokémon Champions** | https://champions.pokemon.com/en-us/ | Confident without being esports-y, bold headings, structured content sections |
| **Legends Z-A** | https://legends.pokemon.com/en-us | Elegant middle ground — airy, modern, light palette, soft translucent panels |
| **Pokémon 30** | https://30.pokemon.com/en-us | Bold, celebratory, high energy. Interesting gallery patterns. |
| **Corporate Pokémon (TPCi)** | https://corporate.pokemon.com/en-us/ | Professional warmth, clean hierarchy, approachable. Background color shifts for section separation. Most relevant for dashboard structure. |

### Non-Pokémon References

| Site | URL | What we like |
|------|-----|-------------|
| **Claude Code (Anthropic)** | https://claude.com/product/claude-code | Warm neutral base (cream, not white), serif headings + sans body, terracotta accent, generous whitespace, calm confidence. This is the closest single reference to our target feel. |
| **Headspace** | https://www.headspace.com/ | Warm, calm, generous whitespace, serif headings with sans body, soft rounded elements. Similar to Claude's approach but even softer. |
| **bored.com** | https://bored.com/ | Minimal color (black/white/yellow accent), dense but scannable card grid, personality through content not decoration. The card-based category pattern is interesting for community hub / resource directory. |
| **Wholesome Bowl (Dribbble)** | https://dribbble.com/shots/20431831-Wholesome-Bowl-Noodle | Warm coral/salmon base, hand-drawn script mixed with clean sans, organic wavy shapes, warm palette. "Wholesome" without being childish. Mood board reference for warmth and playfulness. |

### Anti-References (what NOT to do)

- Esports sites with dark/aggressive/neon aesthetics
- Angular/militaristic UI patterns
- Heavy gradients, scattered rainbow accents, heavy glassmorphism (thick blur + neon borders)
- start.gg's aesthetic

## Target Position

```
bored.com ←—— Corporate TPCi ←—— Claude/Headspace ←—— Legends Z-A ←—— Champions ←—— Pokopia
(minimal)     (clean/warm)        (warm neutral)       (airy/modern)   (bold)          (soft)
```

**trainers.gg sits around Claude/Headspace → Corporate TPCi**: warm neutral base, clean, confident, not aggressive, not childish.

## Decisions Made

### Warm Neutral Base (confirmed)
- Move away from pure white (`#ffffff`) backgrounds
- Use a warm cream/off-white as the base (like Claude does)
- This single change transforms the entire feel of the app

### Elevation System (confirmed)
| Level | Treatment | Usage |
|-------|-----------|-------|
| Surface | Background differentiation only | Static containers, sections |
| Card | Subtle shadow | Interactive elements, stat cards |
| Raised | Stronger shadow | Popovers, dropdowns |
| Overlay | Strongest shadow + backdrop | Modals, sheets |

No dotted/dashed borders on containers.

### Typography Hierarchy (confirmed)
| Level | Usage |
|-------|-------|
| Page title | `text-4xl font-bold` (h1) |
| Section heading | `text-2xl font-bold` (h2) |
| Subsection heading | `text-lg font-semibold` (h3) |
| Card/item title | `text-base font-semibold` (h4) |
| Body | `text-sm` |
| Label/caption | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |

### Transitions (confirmed)
- CSS-only to preserve SSR
- Fast: 100ms, Default: 150ms, Slow: 300ms
- View Transitions API for future page transitions

## Open Decisions

### Font Selection (exploring)

**Direction**: Both Claude and Headspace use serif headings + sans-serif body. This creates warmth and sophistication that pure sans-serif can't achieve.

**Current font**: Inter (sans) + Geist Mono (mono)

**Options under consideration**:

| # | Approach | Headings | Body | Vibe |
|---|----------|----------|------|------|
| 1 | Serif + Sans (recommended) | **Fraunces** (soft serif, variable, WONK/SOFT axes) | Plus Jakarta Sans | Warm, sophisticated, distinctive |
| 2 | Serif + Sans (editorial) | **Lora** (contemporary serif) | DM Sans | Clean editorial warmth |
| 3 | Rounded Sans only | Plus Jakarta Sans Bold | Plus Jakarta Sans | Simpler, modern, warm |
| 4 | Geometric Sans only | Outfit Bold | Outfit | Minimal, contemporary |
| 5 | Geometric-humanist | Figtree Bold | Figtree | Friendly, readable |
| 6 | Geometric warm | DM Sans Bold | DM Sans | Clean, subtle warmth |
| 7 | Contemporary | Instrument Sans Bold | Instrument Sans | Polished, premium |

**Mono font**: Keep Geist Mono (works well for code, stats, timestamps).

**Constraint**: Must work with `next/font/google` and be available for Expo (React Native).

### Color Palette (not started)
- Current: Teal primary on white
- Direction: Warm neutral base + teal accent — need to verify teal works on cream instead of white
- May need to adjust teal's lightness/chroma for warm backgrounds
- Consider adding a warm accent color (like Claude's terracotta) for CTAs

### Background Colors (not started)
- Need to define the warm neutral base color in OKLCH
- Need to verify shadcn/ui component compatibility with non-white backgrounds
- Dark mode: may need to warm up the dark palette too (dark warm gray instead of pure black)
