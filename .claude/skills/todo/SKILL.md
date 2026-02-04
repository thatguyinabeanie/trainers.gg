---
name: todo
description: Use when the user asks to add a to-do item, track a task, remember something to do later, or add to the task list
---

# Add To-Do

Add an item to the session task list using `TaskCreate`.

## Arguments

- `description` (required): What needs to be done

## Steps

1. Parse the user's description into a clear, actionable task
2. Use `TaskCreate` with:
   - `subject`: Short imperative title (e.g., "Fix login redirect on mobile")
   - `description`: Fuller context from the user's input — what, why, and any details mentioned
   - `activeForm`: Present continuous form (e.g., "Fixing login redirect")
3. Confirm the task was added
