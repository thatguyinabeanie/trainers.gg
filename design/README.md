# Design

Version-controlled design assets for trainers.gg.

## Structure

| Directory | Contents |
|---|---|
| `tokens/` | W3C DTCG tokens generated from `@trainers/theme` |
| `exports/` | SVG/PNG assets exported from Penpot |

## Token Sync Workflow

1. Change tokens in `packages/theme/src/`
2. Run `pnpm --filter @trainers/theme export:penpot`
3. Commit both the TS change and `design/tokens/tokens.json`
4. In Penpot Cloud: Assets → Design Tokens → Import → select `design/tokens/tokens.json`

## Penpot

We use [Penpot Cloud](https://design.penpot.app) (free tier).
