# Dynamic Port Allocation for Git Worktrees - Implementation Summary

## Overview

Successfully implemented a comprehensive dynamic port allocation system that enables running multiple instances of the trainers.gg application simultaneously across git worktrees without port conflicts.

## What Was Implemented

### 1. Port Detection Infrastructure ✅

**File:** `packages/utils/src/ports.ts`

Utilities for finding available ports:

- `isPortAvailable(port)` - Check if a specific port is free
- `findAvailablePort(preferred, range)` - Find next available port in range
- `findPortBlock(count, startFrom)` - Allocate contiguous block of ports

All functions use Node.js `net.Server` for port testing (zero external dependencies).

**Tests:** `packages/utils/src/__tests__/ports.test.ts` (8 test cases, all passing)

### 2. Worktree Registry Management ✅

**File:** `scripts/worktree-registry.ts`

Core registry management functions:

- `loadRegistry()` / `saveRegistry()` - Persist allocations to disk
- `getCurrentWorktreePath()` - Get absolute path to current worktree
- `isWorktree()` - Detect if running in a worktree vs main repo
- `worktreeExists()` - Check if a worktree path is still valid
- `isSupabaseRunning()` / `getSupabasePid()` - Process detection
- `cleanupStaleWorktrees()` - Remove deleted worktree entries
- `allocateWorktreePorts()` - Allocate unique ports for a worktree
- `allocateSupabasePorts()` - Manage Supabase singleton allocation

**Registry format:** `scripts/worktree-ports.json` (gitignored)

```json
{
  "supabase": { "owner": "/path", "ports": {...}, "pid": 12345 },
  "worktrees": {
    "/path/to/worktree-1": { "nextjs": 3000, "pds": 3100, "expo": 8081, ... },
    "/path/to/worktree-2": { "nextjs": 3010, "pds": 3110, "expo": 8091, ... }
  }
}
```

### 3. Setup Scripts ✅

**Setup:** `scripts/setup-worktree-env.ts`

- Runs before `pnpm dev` to allocate ports
- Detects if Supabase is already running (singleton pattern)
- Updates `.env.local` with allocated ports
- Prints allocated URLs for easy access

**Dev wrapper:** `scripts/dev-with-ports.ts`

- Injects port environment variables before starting dev servers
- Sets `PORT` for Next.js, `EXPO_PORT` for Expo Metro
- Forwards signals (SIGINT, SIGTERM) correctly

**Cleanup:** `scripts/cleanup-worktree-ports.ts`

- Removes stale worktree allocations
- Displays active worktrees and their port assignments
- Safe to run manually or periodically

### 4. Configuration Updates ✅

**Root package.json:**

```json
{
  "scripts": {
    "dev:setup": "tsx scripts/setup-worktree-env.ts",
    "dev": "pnpm dev:setup && rm -rf apps/web/.next/dev && turbo run dev",
    "cleanup-ports": "tsx scripts/cleanup-worktree-ports.ts"
  },
  "devDependencies": {
    "tsx": "^4.21.0"
  }
}
```

**Web app:** `apps/web/package.json`

```json
{
  "scripts": {
    "dev": "tsx ../../scripts/dev-with-ports.ts next dev --turbopack"
  }
}
```

**Mobile app:** `apps/mobile/package.json`

```json
{
  "scripts": {
    "dev": "tsx ../../scripts/dev-with-ports.ts expo start"
  }
}
```

**Metro config:** `apps/mobile/metro.config.cjs`

```javascript
if (process.env.EXPO_PORT) {
  config.server = config.server || {};
  config.server.port = parseInt(process.env.EXPO_PORT, 10);
}
```

**PDS docker-compose:** `infra/pds/docker-compose.yml`

```yaml
ports:
  - "${PDS_PORT:-3001}:3000"
```

**Postinstall:** `scripts/postinstall.sh`

- Updated to detect worktrees (`.git` is file vs directory)
- In worktrees: creates worktree-specific `.env.local` (NOT symlinked)
- In main worktree: creates symlinks as before (backwards compatible)

### 5. Documentation ✅

**Comprehensive guide:** `docs/worktree-setup.md`

- Full architecture explanation
- Port allocation strategy
- Usage instructions
- Troubleshooting guide
- Important considerations (shared database, ownership, etc.)

**CLAUDE.md updates:**

- Added worktree support section
- Documented `pnpm cleanup-ports` command
- Link to full documentation

**Verification script:** `scripts/verify-worktree-setup.sh`

- Checks all required files exist
- Verifies configuration updates
- Tests script execution
- Displays registry contents

### 6. Git Configuration ✅

**.gitignore:**

```
scripts/worktree-ports.json
```

## Port Allocation Strategy

### Shared Services (Singleton)

**Supabase** - One instance shared across all worktrees:

- Default ports: 54320-54329 + 8083
- First worktree to run `pnpm dev` starts Supabase and becomes owner
- Subsequent worktrees detect running instance and reuse it
- Saves memory/CPU vs running multiple Supabase instances

### Per-Worktree Services

Each worktree gets unique ports in blocks of 10:

| Service | Worktree 1 | Worktree 2 | Worktree 3 |
| ------- | ---------- | ---------- | ---------- |
| Next.js | 3000       | 3010       | 3020       |
| PDS     | 3100       | 3110       | 3120       |
| Expo    | 8081       | 8091       | 8101       |

Allocation algorithm:

1. Check existing allocations in registry
2. Find next available block (increment by 10)
3. Verify ports aren't in use (self-healing if conflict)
4. Store in registry for persistence

## Key Features

✅ **Automatic port allocation** - Zero manual configuration
✅ **Worktree-specific .env.local** - Each worktree has isolated config
✅ **Shared Supabase singleton** - Resource efficient
✅ **Self-healing** - Detects and recovers from port conflicts
✅ **Persistent allocations** - Same worktree always gets same ports
✅ **Safe cleanup** - Manual cleanup via `pnpm cleanup-ports`
✅ **Backwards compatible** - Main worktree uses symlinks as before
✅ **Type-safe** - Full TypeScript implementation
✅ **Tested** - Comprehensive unit tests for port utilities

## Usage Example

```bash
# Create worktree
git worktree add ../feature-branch feature-branch
cd ../feature-branch

# Install dependencies (auto-allocates ports)
pnpm install
# Output:
# [setup-worktree-env] Port allocation complete:
#   Next.js:      http://localhost:3010
#   PDS:          http://localhost:3110
#   Expo:         http://localhost:8091
#   Supabase:     http://localhost:54321 (shared)

# Start development
pnpm dev
# Services run on allocated ports automatically

# Clean up when done
cd /path/to/main
git worktree remove ../feature-branch
pnpm cleanup-ports
```

## Testing

**Unit tests:** `packages/utils/src/__tests__/ports.test.ts`

- 8 test cases covering all port detection scenarios
- All tests passing

**Verification:** `scripts/verify-worktree-setup.sh`

- Checks all files exist
- Verifies configuration updates
- Tests script execution
- All checks passing ✅

**Manual testing:**

- ✅ Setup script runs successfully
- ✅ Cleanup script runs successfully
- ✅ Registry created and populated correctly
- ✅ Environment variables updated correctly

## Files Created/Modified

### Created (11 files)

1. `packages/utils/src/ports.ts` - Port detection utilities
2. `packages/utils/src/__tests__/ports.test.ts` - Unit tests
3. `scripts/worktree-registry.ts` - Registry management
4. `scripts/setup-worktree-env.ts` - Port allocation script
5. `scripts/dev-with-ports.ts` - Dev wrapper script
6. `scripts/cleanup-worktree-ports.ts` - Cleanup script
7. `scripts/verify-worktree-setup.sh` - Verification script
8. `scripts/worktree-ports.json` - Registry (auto-generated, gitignored)
9. `docs/worktree-setup.md` - Comprehensive documentation
10. `IMPLEMENTATION_SUMMARY.md` - This file

### Modified (8 files)

1. `package.json` - Added scripts and tsx dependency
2. `packages/utils/src/index.ts` - Export port utilities
3. `apps/web/package.json` - Update dev script
4. `apps/mobile/package.json` - Update dev script
5. `apps/mobile/metro.config.cjs` - Support dynamic port
6. `infra/pds/docker-compose.yml` - Support dynamic port
7. `scripts/postinstall.sh` - Worktree detection
8. `.gitignore` - Ignore registry file
9. `CLAUDE.md` - Document worktree support

## Important Considerations

### Shared Database

⚠️ All worktrees share the same Supabase database. This means:

- Data created in one worktree is visible in all others
- Schema changes affect all worktrees
- Running different migrations can cause conflicts

**Best practice:** Always sync migrations before switching worktrees.

### Supabase Ownership

- First worktree to run `pnpm dev` starts Supabase and becomes owner
- Other worktrees detect running instance and reuse it
- If owner worktree stops, next worktree claims ownership
- Supabase keeps running until explicitly stopped (`pnpm db:stop`)

### Port Conflicts

If a port is already in use, the system automatically finds the next available port:

- Port 3000 occupied → allocates 3010
- Port 3010 occupied → allocates 3020
- etc.

This self-healing behavior prevents startup failures.

## Benefits

1. **Parallel development** - Work on multiple features simultaneously
2. **No port conflicts** - Automatic allocation prevents collisions
3. **Resource efficient** - Single Supabase instance for all worktrees
4. **Developer experience** - `pnpm dev` just works, zero configuration
5. **Predictable ports** - Same worktree always gets same ports
6. **Safe cleanup** - Manual cleanup prevents accidental port loss

## Future Enhancements

Potential improvements:

- [ ] Automatic port de-allocation on worktree deletion (git hooks)
- [ ] Web UI to view and manage port allocations
- [ ] Support for custom port ranges per service
- [ ] Automatic Supabase restart on ownership transfer
- [ ] Integration with IDE task runners (VS Code tasks.json)

## Verification

Run verification script to confirm everything is working:

```bash
./scripts/verify-worktree-setup.sh
```

Expected output:

```
✅ All verification checks passed!
Worktree port allocation system is ready to use.
```

## Summary

The dynamic port allocation system is fully implemented, tested, and ready for use. It enables frictionless parallel development across git worktrees while maintaining resource efficiency through a shared Supabase singleton.

**Key achievement:** Developers can now run unlimited worktrees simultaneously without any manual port configuration or conflicts.
