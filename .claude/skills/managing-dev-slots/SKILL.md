---
name: managing-dev-slots
description: Use when working with the dev-slot system — port allocation, multi-instance dev, slot lifecycle, cleanup, or debugging port conflicts
---

# Dev Slots

Port isolation system that lets multiple developers (or multiple worktrees) run `pnpm dev` simultaneously without port collisions.

## How It Works

Every `pnpm dev*` command sources `scripts/claim-dev-slot.sh` before starting Turbo. The script:

1. Scans slot numbers (0, 1, 2, ...) until a free one is found
2. Writes a lockfile to `~/.local/state/trainers.gg/dev-slots/slot-N.lock`
3. Writes the slot number to `.dev-slot` (gitignored)
4. Rewrites `.env.local` with slot-specific ports
5. For slot > 0: backs up and modifies `config.toml` (ports + `project_id`)
6. Registers a `trap cleanup EXIT INT TERM` to release on shutdown

A slot is "free" when no lockfile exists (or the lockfile's PID is dead) AND the slot's key ports are not in use.

## File Map

| File                                                 | Role                                                     |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `scripts/lib/dev-slots.sh`                           | Shared library: port math, slot reading, port/PID checks |
| `scripts/claim-dev-slot.sh`                          | Main orchestrator: claim, configure, release             |
| `.dev-slot`                                          | Current slot number (gitignored)                         |
| `~/.local/state/trainers.gg/dev-slots/slot-N.lock`   | Per-slot lockfile with PID, worktree, timestamp          |
| `packages/supabase/supabase/config.toml.slot-backup` | Original config backup for slot > 0 (gitignored)         |

### Downstream Consumers

These scripts source `dev-slots.sh` and call `read_slot()` to derive their ports:

- `packages/supabase/scripts/setup-local.sh` — Supabase/PDS/web ports
- `packages/supabase/scripts/dev.sh` — Docker container name (`supabase` vs `supabase-slot-N`)
- `infra/ngrok/scripts/dev.sh` — web + ngrok API ports
- `infra/pds/local-dev.sh` — PDS + web ports

## Port Scheme

Formula: `port = base + (slot * 100)`

| Service            | Base (Slot 0) | Slot 1 | Slot 2 |
| ------------------ | ------------- | ------ | ------ |
| Web (Next.js)      | 3000          | 3100   | 3200   |
| PDS                | 3001          | 3101   | 3201   |
| Supabase API       | 54321         | 54421  | 54521  |
| Supabase DB        | 54322         | 54422  | 54522  |
| Supabase Shadow    | 54320         | 54420  | 54520  |
| Supabase Studio    | 54323         | 54423  | 54523  |
| Supabase Inbucket  | 54324         | 54424  | 54524  |
| Supabase Analytics | 54327         | 54427  | 54527  |
| Supabase Pooler    | 54329         | 54429  | 54529  |
| Expo               | 8081          | 8181   | 8281   |
| ngrok API          | 4040          | 4140   | 4240   |
| Edge Debug         | 8083          | 8183   | 8283   |

## Slot Lifecycle

### Claim

```bash
# Atomic claim via mkdir trick (prevents race conditions)
mkdir "$DEV_SLOT_DIR/.claiming-slot-N" 2>/dev/null
# Write lockfile
cat > slot-N.lock << EOF
{ "pid": $$, "worktree": "/path/to/repo", "claimedAt": "..." }
EOF
```

### Reuse

If `.dev-slot` already exists and its lockfile's PID is alive and worktree matches, the slot is reused without re-claiming. Reused slots do NOT register a cleanup trap (the original process owns cleanup).

### Release

The `cleanup()` function runs on `EXIT`, `INT`, or `TERM`:

1. Removes the lockfile
2. Restores `config.toml` from backup (if slot > 0)
3. Removes `.dev-slot`

### Crash Recovery

On startup, if `config.toml.slot-backup` exists from a previous unclean exit, it is restored before claiming a new slot.

## Known Issues

### Duplicate "Releasing dev slot" Messages

The trap is registered for `EXIT INT TERM`. When Ctrl+C fires `INT`, bash also fires `EXIT` afterward, so `cleanup()` runs twice. The operations are idempotent (`rm -f`), but the log messages appear twice.

**Fix**: Add a re-entry guard at the top of `cleanup()`:

```bash
cleanup() {
  trap - EXIT INT TERM   # prevent re-entry
  # ... rest of cleanup
}
```

### No Proactive Stale-Slot Cleanup

Stale lockfiles are only cleaned up reactively — when `claim_slot()` encounters one during its linear scan. If slot 3 is stale but new processes only need slot 0, the stale lockfile persists indefinitely.

**Fix**: Add a `cleanup_stale_slots()` function to `dev-slots.sh` that iterates all `slot-*.lock` files, checks PIDs, and removes dead ones. Call it at startup in `claim-dev-slot.sh` before the claim loop.

### Reused Slot Has No Cleanup Trap

When `REUSE_SLOT=true`, no trap is registered. If the original owning process has already exited but PID recycling makes it appear alive, the reusing process will not clean up on exit.

## Modifying the Slot System

### Adding a New Port

1. Add `PORT_BASE_NEW_SERVICE=XXXX` to `scripts/lib/dev-slots.sh`
2. Add `NEW_PORT=$(slot_port "$PORT_BASE_NEW_SERVICE" "$SLOT")` to `claim-dev-slot.sh` (port calculation section)
3. Add a `sed` rewrite for the new port in the `.env.local` section of `claim-dev-slot.sh`
4. If the port appears in `config.toml`, add a `sed` rewrite in the config.toml section too
5. Update the port summary table in the print summary section

### Adding a New Consumer

Source the shared library and call `read_slot()`:

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../scripts/lib/dev-slots.sh"
SLOT=$(read_slot)
MY_PORT=$(slot_port 9000 "$SLOT")
```

### CI / Production

The slot system is skipped entirely when `$CI`, `$VERCEL`, or `$GITHUB_ACTIONS` is set. Slot 0 is written and the script exits immediately.

## Debugging

### Check Current Slot

```bash
cat .dev-slot
```

### List All Active Slots

```bash
ls -la ~/.local/state/trainers.gg/dev-slots/
cat ~/.local/state/trainers.gg/dev-slots/slot-*.lock
```

### Check for Port Conflicts

```bash
lsof -iTCP:3000 -sTCP:LISTEN  # web
lsof -iTCP:54321 -sTCP:LISTEN # supabase API
```

### Force-Release a Stuck Slot

```bash
rm ~/.local/state/trainers.gg/dev-slots/slot-N.lock
rm .dev-slot
# If config.toml was modified:
cp packages/supabase/supabase/config.toml.slot-backup packages/supabase/supabase/config.toml
rm packages/supabase/supabase/config.toml.slot-backup
```
