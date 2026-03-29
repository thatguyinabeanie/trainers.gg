---
name: writing-skills
description: Use when creating new skills, editing existing skills, creating agents, or maintaining the CLAUDE.md and skills/agents architecture
---

# Writing Skills

How to create, maintain, and organize skills and agents for the trainers.gg project.

## Three-Tier Architecture

The project uses a three-tier system for providing context to Claude:

### Tier 1: CLAUDE.md (Always-On)

- **Location**: Project root `CLAUDE.md`
- **Target size**: Aim for roughly 180–200 lines (current CLAUDE.md is ~190 lines; treat this as an aspirational range, not a hard limit)
- **Loaded**: Every conversation, every task
- **Contains**: Project identity, monorepo structure, tech stack, commands, universal critical rules (push policy, parallel work, React Compiler), glossary
- **Rule**: Only content that applies to EVERY task belongs here. Domain-specific knowledge goes in skills.

### Tier 2: Skills (On-Demand)

- **Location**: `.claude/skills/<skill-name>/SKILL.md`
- **Loaded**: When relevant, via two mechanisms:
  - **Hook-based**: File pattern matching triggers skill injection (e.g., editing `apps/web/**` loads `building-web-app`)
  - **Description-based**: Claude reads the skill description and decides to load it based on task relevance
- **Contains**: Domain-specific knowledge, patterns, examples, checklists for a particular area
- **Rule**: Each skill is self-contained. It should make sense without requiring the reader to load other skills.

### Tier 3: Agents (Isolated Execution)

- **Location**: `.claude/agents/<agent-name>.md`
- **Loaded**: When delegated to via the Agent tool or subagent dispatch
- **Contains**: Task-specific workflows with their own context windows
- **Rule**: Agents reference skills via `skills:` frontmatter — they do not inherit the parent conversation's loaded skills.

## Decision Framework: Where Does Content Belong?

| If the content... | Put it in... |
|---|---|
| Applies to EVERY task regardless of context | CLAUDE.md |
| Is domain-specific knowledge for a particular area | A skill |
| Is a workflow requiring isolated execution with fresh context | An agent |
| Is duplicated between CLAUDE.md and a skill | The skill (single source of truth) |

### Common Mistakes

- Putting domain rules in CLAUDE.md that only matter for one area (bloats always-on context)
- Duplicating content between CLAUDE.md and a skill (creates drift when one is updated but not the other)
- Making a skill too generic (if it applies to everything, it belongs in CLAUDE.md)
- Making an agent when a skill would suffice (agents have overhead — use them for isolated execution, not just knowledge)

## Skill Writing Conventions

### Naming

- **Gerund** for auto-triggered skills: `building-web-app`, `writing-tests`, `building-mobile-app`
- **Imperative** for slash commands: `commit`, `create-migration`, `finish-branch`
- **Noun/adjective** for reference-only rules: `code-style`, `architecture-principles`

### Description

- Always start with **"Use when..."** — describe the triggering conditions
- Never summarize the skill's workflow in the description
- The description helps Claude decide whether to load the skill, so focus on WHEN, not WHAT

```yaml
# Good — describes when to load
description: Use when writing or reviewing TypeScript/TSX code — covers strict type rules, naming conventions, Prettier config

# Bad — summarizes content instead of triggering conditions
description: Contains TypeScript strict mode rules, Prettier config, naming conventions, and error handling patterns
```

### Frontmatter

- Required fields: `name` and `description`
- Maximum 1024 characters total for all frontmatter
- Use `---` delimiters (YAML format)

```yaml
---
name: skill-name
description: Use when [triggering conditions]
---
```

### Body Structure

1. **H1 heading** matching the skill name (human-readable)
2. **One-line summary** of what the skill covers
3. **Sections** organized by topic with H2/H3 headings
4. **Tables** for reference data (conventions, mappings, comparisons)
5. **Code blocks** for examples and patterns
6. **Cross-references** to other skills where relevant

### Sizing Guidelines

| Lines | Assessment | Action |
|---|---|---|
| < 30 | Too thin | Expand with usage examples, common patterns, and gotchas |
| 30-150 | Good range | Most skills should land here |
| 150-200 | Getting dense | Review whether everything is essential |
| > 200 | Too thick | Split into focused sub-skills with cross-references |

### Cross-Referencing

Reference other skills by name, not by file path:

```markdown
<!-- Good -->
See `creating-edge-functions` skill for core patterns (CORS, auth, response format).

<!-- Bad -->
See `.claude/skills/edge-function/SKILL.md` for core patterns.
```

## Agent Writing Conventions

### Frontmatter Fields

```yaml
---
name: agent-name
description: When to delegate to this agent
model: sonnet          # haiku | sonnet | opus
skills:
  - skill-one
  - skill-two
tools:
  - Read
  - Edit
  - Bash
maxTurns: 20
permissionMode: default
---
```

### Model Assignment

| Model | Use For | Examples |
|---|---|---|
| Haiku | Command running, reporting, simple checks | CI status check, file listing, formatting |
| Sonnet | Code writing, code review, implementation | Feature implementation, test writing, refactoring |
| Opus | Architecture, planning, complex analysis | Design decisions, audit reports, migration planning |

Match the model to the cognitive demand of the task. Over-specifying wastes tokens; under-specifying produces lower quality.

### Skills Injection

The `skills:` field in agent frontmatter injects those skills' content into the agent's context at startup. Agents do NOT inherit skills from the parent conversation.

```yaml
# This agent gets building-web-app and writing-tests content
skills:
  - building-web-app
  - writing-tests
```

Only include skills the agent actually needs — each injected skill consumes context window space.

### Tool Allowlists

Be explicit about which tools the agent needs. Don't grant everything by default.

```yaml
# A read-only analysis agent
tools:
  - Read
  - Glob
  - Grep
  - Bash

# A code-writing agent
tools:
  - Read
  - Edit
  - Write
  - Bash
  - Glob
  - Grep
```

### Description

Should clearly state WHEN to delegate to this agent, not what it does internally:

```yaml
# Good
description: Use after creating a PR — monitors CI checks and addresses review feedback

# Bad
description: Runs CI checks, reads review comments, fixes lint errors, and updates the PR
```

## Hook-Based Auto-Injection

### How Hooks Work

- PreToolUse hooks fire when Claude uses Edit or Write tools
- The hook checks the target file path against configured patterns
- If a pattern matches, the associated skill is loaded (advisory, non-blocking)
- Configured in `.claude/settings.json`

### File Pattern to Skill Mapping

Hooks map file globs to skills. When Claude edits a file matching the glob, the skill is suggested:

```
apps/web/**          -> building-web-app
apps/mobile/**       -> building-mobile-app
packages/supabase/** -> querying-supabase
**/*.test.*          -> writing-tests
```

### Description-Based Loading (Fallback)

When no hook matches, Claude reads skill descriptions and decides whether to load a skill based on task relevance. This is why descriptions must clearly state "Use when..." — they are the matching criteria.

## Model Strategy

### Context Windows

- **Planning and brainstorming**: Use Opus or Sonnet with extended context (deep analysis, architecture decisions)
- **Agent execution**: Use standard Sonnet (code writing, reviews) or Haiku (command running, reporting)

### Cost-Quality Tradeoff

- Match model to cognitive demand — don't use Opus for running `git status`
- Agents with many turns should use cheaper models unless the task demands reasoning quality
- Planning agents that run once can justify Opus for higher quality output

## Community Patterns (Reference)

Proven agent architectures used across Claude Code projects:

### 3-Agent Pipeline
Spec agent -> Architect agent -> Implementer agent. Each phase produces a document consumed by the next.

### QA Council
Multiple review phases with blocking gates. A reviewer agent must approve before the pipeline continues.

### Test Writer + Reviewer Pair
Separate agents for writing tests vs reviewing them. The reviewer catches gaps the writer misses.

### Agent Pipeline with File Handoffs
Agents communicate through markdown files in a shared directory. Each agent reads the previous agent's output file and writes its own.

## v2 Architecture

### Rules Declare, Hooks Enforce

The project uses a layered system where `.claude/rules/` files declare conventions and hooks automatically enforce them.

| Rule Type | Example | Hook Needed? |
|-----------|---------|-------------|
| Machine-verifiable | "Use 2-space indent" | Yes — Prettier enforces |
| Judgment-based | "Minimal flat design" | No — Claude internalizes |
| Structural | "Server Actions in src/actions/" | Maybe — depends on strictness |

### Path-Scoped Rules (`.claude/rules/`)

Rules with `paths` frontmatter auto-load when Claude touches matching files:

```yaml
---
paths:
  - "**/*.{ts,tsx}"
---
```

Use rules for enforcement and conventions. Use skills for reference guides and workflows.

### Nested CLAUDE.md (Orientation Cards)

Lightweight files in `apps/web/CLAUDE.md`, `apps/mobile/CLAUDE.md`, `packages/supabase/CLAUDE.md` that auto-load when entering those directories. They answer "where things are" — key files, paths, and skill pointers. Keep them under 30 lines.

### Agent Memory

Agents with `memory: project` accumulate learnings across sessions. Enable for agents that benefit from remembering patterns (qa-engineer, code-reviewer, feature-implementer). Don't enable for purely mechanical agents (pre-push-checker).

### Decision Framework

| If the content... | Put it in... |
|---|---|
| Applies to EVERY task | Root `CLAUDE.md` |
| Is enforcement for certain file types | `.claude/rules/` with paths |
| Is "where things are" for a directory | Nested `CLAUDE.md` |
| Is a reference guide, template, or workflow | `.claude/skills/` |
| Needs isolated execution | `.claude/agents/` |
