---
name: auditing-code
description: Use when conducting a codebase audit for type safety, code reuse, architecture, and maintainability
---

# Code Audit

Structured methodology for conducting comprehensive code audits of the trainers.gg monorepo. Produces a written report in `.audit-reports/` (gitignored) with prioritized findings.

## When to Use

- Periodic codebase health checks
- Before major refactoring efforts
- After a sprint of rapid feature development
- When onboarding to understand technical debt

## Audit Process

### 1. Scope Definition

Confirm the audit scope with the user. Default focus areas:

| Area | What to Look For |
|---|---|
| **TypeScript Type Safety** | `as unknown as`, `as any`, `CallableFunction` casts, missing generics, weak return types, non-null assertions |
| **Code Reuse** | Duplicated patterns, missed shared package extractions, underused utilities |
| **Next.js 16 Architecture** | Server/client boundaries, server action patterns, data fetching, route organization |
| **Package Architecture** | Package boundaries, export surfaces, cross-package types, dependency graph |
| **Server Action Data Flow** | Return types, validation at boundaries, end-to-end type chains, error handling |

### 2. Dispatch Parallel Agents

Launch 5 subagents simultaneously, one per focus area. Each agent:
- Performs **research only** (no file modifications)
- Searches for specific anti-patterns via Grep/Glob
- Reads key files to understand patterns in context
- Produces a structured report with file paths, line numbers, and severity

**Agent prompts must include**:
- The specific scope (directories and file patterns)
- The project context (tech stack, conventions from CLAUDE.md)
- Concrete patterns to search for (regex, glob)
- The output format (Summary → Critical → Improvements → Observations)

### 3. Synthesize Report

After all agents complete, deduplicate overlapping findings and produce a single report:

```markdown
# Code Audit Report — YYYY-MM-DD

## Scoreboard
[table of findings by category and severity]

## Critical Issues
[must-fix: correctness, type safety gaps, architectural violations]

## Improvement Items
[should-fix: better types, less duplication, clearer patterns]

## Observations
[nice-to-have: emerging patterns, future considerations]

## Recommended Priority Order
### Phase 1 — Quick wins (high value, low effort)
### Phase 2 — Systematic improvements (medium effort)
### Phase 3 — Architectural alignment (larger effort)
```

Save to `.audit-reports/YYYY-MM-DD-code-audit-report.md` (gitignored, local reference only).

### 4. Do NOT Implement

The audit session produces a report only. Implementation happens in a separate branch/session using the report as a guide.

## Agent Search Patterns

### TypeScript Type Safety Agent

```bash
# Dangerous casts
rg "as unknown as" --type ts
rg "as any" --type ts
rg "as CallableFunction" --type ts
rg "@ts-expect-error|@ts-ignore" --type ts

# Weak types
rg "Record<string, any>" --type ts
rg "Record<string, unknown>" --type ts
rg ": any[^)]" --type ts  # return types or params typed as any

# Non-null assertions (excluding test files)
rg "\w+!(?!=)" --type ts --glob '!**/*.test.*' --glob '!**/__tests__/**'

# Missing Database generic on Supabase client
rg "createClient\(" --type ts  # check for missing <Database>
```

### Code Reuse Agent

```bash
# Duplicate error handling
rg "catch \(error\)" --type ts -c  # count catch blocks per file

# Local schema definitions that might belong in @trainers/validators
rg "z\.object\(" apps/web/src/actions/ --type ts

# Local type definitions that shadow shared ones
rg "type ActionResult" --type ts
rg "type ActionResponse" --type ts

# Utility functions that might already exist
rg "function get.*Name" --type ts
rg "function format" --type ts
```

### Next.js 16 Architecture Agent

```bash
# Client component boundaries
rg '"use client"' apps/web/src/ --type ts --type tsx -c

# Server action patterns
rg '"use server"' apps/web/src/ --type ts
rg "revalidatePath|updateTag|revalidateTag" apps/web/src/ --type ts

# Data fetching patterns
rg "Promise\.all" apps/web/src/app/ --type ts
rg "await.*await.*await" apps/web/src/app/ --type ts  # sequential waterfalls

# Manual memoization (should not exist with React Compiler)
rg "useMemo|useCallback|React\.memo" apps/web/src/ --type ts --type tsx

# File sizes
find apps/web/src -name '*.tsx' -exec wc -l {} + | sort -rn | head -20
```

### Package Architecture Agent

```bash
# Cross-package imports
rg "from ['\"]@trainers/" packages/ --type ts  # inter-package deps
rg "from ['\"]apps/" packages/ --type ts  # violation: package imports app

# Barrel exports
cat packages/*/src/index.ts  # review export surfaces

# Circular dependency check
rg "from ['\"]@trainers/supabase" packages/tournaments/ --type ts
rg "from ['\"]@trainers/tournaments" packages/supabase/ --type ts
```

### Server Action Data Flow Agent

```bash
# Actions without return types
rg "export async function \w+\(" apps/web/src/actions/ --type ts

# Actions without Zod validation
rg "safeParse|\.parse\(" apps/web/src/actions/ --type ts -c

# Supabase error handling
rg "\.data!" packages/supabase/ --type ts  # non-null on query data
rg "as unknown as" packages/supabase/src/ --type ts
```

## Severity Definitions

| Severity | Criteria |
|---|---|
| **Critical** | Could cause runtime errors, silently hides bugs, violates architectural boundaries, or duplicates entire subsystems |
| **Improvement** | Reduces type safety, increases maintenance burden, or violates established patterns — but works today |
| **Observation** | Not broken, but worth tracking. Emerging duplication, future migration targets, design decisions to document |

## Tips

- Focus on **production code** — test file casts (`as unknown as MockClient`) are generally justified
- Check if generated types are stale before flagging type assertion issues
- Look for patterns, not individual instances — "this pattern appears 40 times" is more useful than listing all 40
- Note where the codebase already does something well — good patterns should be propagated, not just bad ones flagged
- Cross-reference with CLAUDE.md rules — violations of documented conventions are higher severity
