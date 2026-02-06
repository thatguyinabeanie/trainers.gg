# Git Worktree Development Setup

This project supports running multiple instances of the application simultaneously using git worktrees. Each worktree gets its own port allocation to prevent conflicts.

## Overview

**Key Features:**

- ✅ **Automatic port allocation** - Each worktree gets unique ports for Next.js, PDS, and Expo
- ✅ **Shared Supabase instance** - All worktrees connect to the same local database (saves resources)
- ✅ **Worktree-specific configuration** - Each worktree has its own `.env.local` file
- ✅ **Zero configuration** - `pnpm install` automatically sets up port allocation
- ✅ **Self-healing** - Automatically detects and recovers from port conflicts

## Port Allocation

### Shared Services (Singleton)

**Supabase** runs once and is shared across all worktrees:

- API: `54321`
- Database: `54322`
- Studio: `54323`
- Inbucket: `54324`
- Pooler: `54329`
- Analytics: `54327`
- Edge Functions: `8083`
- Shadow DB: `54320`

The first worktree to run `pnpm dev` starts Supabase and becomes the "owner." Other worktrees detect the running instance and reuse it.

### Per-Worktree Services

Each worktree gets allocated in blocks of 10 ports:

| Service | Worktree 1 | Worktree 2 | Worktree 3 |
| ------- | ---------- | ---------- | ---------- |
| Next.js | 3000       | 3010       | 3020       |
| PDS     | 3100       | 3110       | 3120       |
| Expo    | 8081       | 8091       | 8101       |

## Usage

### Creating a New Worktree

```bash
# From main worktree
git worktree add ../feature-branch feature-branch
cd ../feature-branch

# Install dependencies (automatically allocates ports)
pnpm install

# Start development servers
pnpm dev
```

The setup script (`setup-worktree-env.ts`) runs automatically during `pnpm install` and:

1. Detects if you're in a worktree
2. Allocates unique ports for this worktree
3. Updates `.env.local` with allocated ports
4. Registers the allocation in `scripts/worktree-ports.json`

### Starting Development

```bash
# Start all services (backend + web app)
pnpm dev

# Start only web app
pnpm dev:web

# Start only mobile app
pnpm dev:mobile
```

Each service automatically uses the ports allocated to the current worktree.

### Viewing Port Allocations

Check the registry to see all active worktrees and their port allocations:

```bash
cat scripts/worktree-ports.json
```

Or run the cleanup script (which also displays allocations):

```bash
pnpm cleanup-ports
```

### Cleaning Up Stale Allocations

When you delete a worktree, its port allocation remains in the registry. Clean it up with:

```bash
pnpm cleanup-ports
```

This removes allocations for worktrees that no longer exist. It does NOT stop Supabase (other worktrees may still be using it).

## How It Works

### Port Registry

Port allocations are tracked in `scripts/worktree-ports.json` (gitignored):

```json
{
  "supabase": {
    "owner": "/path/to/first-worktree",
    "ports": { ... },
    "pid": 12345,
    "lastStarted": "2026-02-06T10:30:00Z"
  },
  "worktrees": {
    "/path/to/worktree-1": {
      "nextjs": 3000,
      "pds": 3100,
      "expo": 8081,
      "lastUsed": "2026-02-06T10:30:00Z",
      "isSupabaseOwner": true
    },
    "/path/to/worktree-2": {
      "nextjs": 3010,
      "pds": 3110,
      "expo": 8091,
      "lastUsed": "2026-02-06T11:15:00Z",
      "isSupabaseOwner": false
    }
  }
}
```

### Setup Flow

1. **`pnpm install`** runs `postinstall.sh`
2. `postinstall.sh` detects if running in a worktree (`.git` is a file, not a directory)
3. In worktrees: creates worktree-specific `.env.local` (NOT a symlink)
4. In main worktree: creates symlinks to root `.env.local` (backwards compatible)
5. `pnpm dev` runs `setup-worktree-env.ts` which:
   - Loads the port registry
   - Cleans up stale entries
   - Checks if Supabase is running
   - Allocates ports for this worktree
   - Updates `.env.local` with allocated ports
6. Dev servers (`next dev`, `expo start`) read ports from environment variables

### Service Wrappers

**Web app** (`apps/web/package.json`):

```json
"dev": "tsx ../../scripts/dev-with-ports.ts next dev --turbopack"
```

**Mobile app** (`apps/mobile/package.json`):

```json
"dev": "tsx ../../scripts/dev-with-ports.ts expo start"
```

The `dev-with-ports.ts` wrapper:

1. Reads port allocation from registry
2. Sets `PORT` or `EXPO_PORT` environment variable
3. Spawns the actual dev command with correct port

## Important Considerations

### Shared Database

**All worktrees share the same Supabase database.** This means:

- ⚠️ Running different migrations in different worktrees can cause conflicts
- ⚠️ Data created in one worktree is visible in all others
- ⚠️ Schema changes affect all worktrees immediately

**Best practice:** Always sync migrations to latest before switching worktrees:

```bash
cd /path/to/worktree
git pull origin main
pnpm db:migrate
```

If you need truly isolated databases, use remote Supabase preview branches instead:

```bash
# In your feature branch
git push origin feature-branch
# Supabase auto-creates a preview branch with isolated database
```

### Supabase Ownership

The first worktree to run `pnpm dev` starts Supabase and becomes the owner. If you stop that worktree:

1. Supabase keeps running (other worktrees may depend on it)
2. Next worktree to run `pnpm dev` claims ownership
3. If Supabase process dies, next `pnpm dev` restarts it

To manually stop Supabase:

```bash
pnpm db:stop
```

### Port Conflicts

If a port is already in use, the allocation system automatically finds the next available port. For example:

- Port 3000 occupied → allocates 3010 instead
- Port 3010 occupied → allocates 3020 instead

This self-healing behavior prevents startup failures.

### Deleting Worktrees

When deleting a worktree, run cleanup to free its port allocation:

```bash
git worktree remove /path/to/worktree
pnpm cleanup-ports
```

If you forget to clean up, the stale entry will be removed automatically next time you run `pnpm dev` in any worktree.

## Troubleshooting

### Ports Not Updating

If you run `pnpm dev` and see port conflicts, try:

```bash
# Manually trigger port allocation
pnpm dev:setup

# Check allocated ports
cat scripts/worktree-ports.json

# Clean up and re-allocate
pnpm cleanup-ports
pnpm dev:setup
```

### Supabase Not Starting

Check Supabase status:

```bash
pnpm db:status
```

If Supabase is stuck, restart it:

```bash
pnpm db:stop
pnpm db:start
```

### Registry Corrupted

If `scripts/worktree-ports.json` becomes corrupted, delete it and re-run setup:

```bash
rm scripts/worktree-ports.json
pnpm dev:setup
```

### Can't Access Services

Verify your allocated ports:

```bash
pnpm cleanup-ports
```

Then access services at the displayed URLs:

- Next.js: `http://localhost:<nextjs_port>`
- Supabase Studio: `http://localhost:54323`
- PDS: `http://localhost:<pds_port>`

## Architecture

### Key Files

| File                                | Purpose                                     |
| ----------------------------------- | ------------------------------------------- |
| `packages/utils/src/ports.ts`       | Port detection utilities                    |
| `scripts/worktree-registry.ts`      | Registry management functions               |
| `scripts/setup-worktree-env.ts`     | Port allocation and .env.local setup        |
| `scripts/dev-with-ports.ts`         | Service startup wrapper with port injection |
| `scripts/cleanup-worktree-ports.ts` | Cleanup stale allocations                   |
| `scripts/postinstall.sh`            | Worktree detection and initial setup        |
| `scripts/worktree-ports.json`       | Port allocation registry (gitignored)       |

### Port Detection Algorithm

1. **Find available port in range:**
   - Try preferred port first
   - If occupied, search sequentially through range
   - Return `null` if no ports available

2. **Allocate contiguous block (for Supabase):**
   - Try to allocate N contiguous ports starting from preferred
   - If any port in block is occupied, skip to next block
   - Return `null` after 100 attempts

3. **Worktree port allocation:**
   - Allocate in blocks of 10 (e.g., 3000-3009, 3010-3019)
   - Ensure no overlap with existing allocations
   - Store in registry for persistence

## Migration from Single Worktree

If you're migrating from a single-worktree setup:

1. Your main worktree continues to use the same ports (3000, 3100, 8081)
2. `.env.local` remains symlinked (backwards compatible)
3. New worktrees get unique port allocations automatically
4. No changes needed to your workflow

## Future Improvements

Potential enhancements:

- [ ] Automatic port de-allocation on worktree deletion (git hooks)
- [ ] Web UI to view and manage port allocations
- [ ] Support for custom port ranges per service
- [ ] Automatic Supabase restart on ownership transfer
- [ ] Integration with IDE task runners (VS Code tasks.json)

## Summary

Git worktrees + automatic port allocation = frictionless parallel development. Each worktree gets its own isolated environment while sharing a single Supabase instance for efficiency.

**Quick start:**

```bash
git worktree add ../feature-branch feature-branch
cd ../feature-branch
pnpm install
pnpm dev  # Auto-allocates ports, just works!
```
