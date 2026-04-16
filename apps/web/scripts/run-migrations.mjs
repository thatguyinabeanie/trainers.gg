#!/usr/bin/env node
/**
 * Vercel Migration Runner
 *
 * Runs Supabase migrations during Vercel builds using the Supabase CLI.
 * - Production: Runs migrations only
 * - Preview: Runs migrations + seeds (on dynamically created Supabase branches)
 * - Local: Skips entirely (use `pnpm db:reset` instead)
 *
 * Environment variables (provided by Supabase Vercel Integration):
 * - SUPABASE_URL: Project URL (contains project ref)
 *   Format: https://<project-ref>.supabase.co
 * - POSTGRES_PASSWORD: Database password
 *
 * Required (add manually to Vercel for both Production and Preview):
 * - SUPABASE_ACCESS_TOKEN: Personal access token
 *   Get from: https://supabase.com/dashboard/account/tokens
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const SUPABASE_DIR = resolve(__dirname, "../../../packages/supabase");
const MIGRATIONS_DIR = resolve(SUPABASE_DIR, "supabase/migrations");
const SEEDS_DIR = resolve(SUPABASE_DIR, "supabase/seeds");

// Ordered seed files (must match config.toml sql_paths order)
const SEED_FILES = [
  "01_extensions.sql",
  "02_roles.sql",
  "03_users.sql",
  "04_organizations.sql",
  "05_invitations.sql",
  "09_teams.sql",
  "10_tournaments.sql",
  "11_matches.sql",
  "12_standings.sql",
];

/**
 * Execute a command and stream output
 */
function exec(command, options = {}) {
  // Mask sensitive values in logged command
  let logCommand = command;
  const sensitiveVars = ["SUPABASE_DB_PASSWORD", "POSTGRES_PASSWORD"];
  for (const varName of sensitiveVars) {
    if (options.env?.[varName]) {
      logCommand = logCommand.replace(options.env[varName], "[REDACTED]");
    }
  }
  console.log(`\n$ ${logCommand}\n`);

  try {
    execSync(command, {
      stdio: "inherit",
      cwd: options.cwd || SUPABASE_DIR,
      env: { ...process.env, ...options.env },
    });
    return true;
  } catch (error) {
    if (options.ignoreError) {
      console.log(`Command failed (ignored): ${error.message}`);
      return false;
    }
    throw error;
  }
}

/**
 * Production Supabase project ref - NEVER seed this database
 * Even if VERCEL_ENV=preview, if we're connected to production Supabase, skip seeding
 *
 * Set via SUPABASE_PRODUCTION_PROJECT_REF env var.
 * If unset, seeding is blocked as a safety precaution.
 */
const PRODUCTION_PROJECT_REF = process.env.SUPABASE_PRODUCTION_PROJECT_REF;

/**
 * Check if we're in a Vercel environment
 * @param {string|null} projectRef - The Supabase project ref (optional, used for safety check)
 */
function getEnvironment(projectRef = null) {
  const vercelEnv = process.env.VERCEL_ENV;

  if (!vercelEnv) {
    return { type: "local", shouldRun: false };
  }

  if (vercelEnv === "production") {
    return { type: "production", shouldRun: true, shouldSeed: false };
  }

  if (vercelEnv === "preview") {
    // SAFETY CHECK: Even in preview mode, never seed the production database
    // This can happen when:
    // 1. A branch push triggers a preview deploy before a PR is created
    // 2. Supabase branching is not enabled or the branch doesn't exist yet
    // 3. The Supabase Vercel integration falls back to production URL
    if (!PRODUCTION_PROJECT_REF) {
      console.log(`\n⚠️  WARNING: SUPABASE_PRODUCTION_PROJECT_REF is not set!`);
      console.log(`   Cannot verify whether this is the production database.`);
      console.log(`   Seeding will be SKIPPED as a safety precaution.\n`);
      return { type: "preview", shouldRun: true, shouldSeed: false };
    }

    const isProductionDatabase = projectRef === PRODUCTION_PROJECT_REF;

    if (isProductionDatabase) {
      console.log(
        `\n⚠️  WARNING: Preview environment connected to PRODUCTION Supabase!`
      );
      console.log(`   Project ref ${projectRef} is the production database.`);
      console.log(`   Seeding will be SKIPPED to protect production data.\n`);
    }

    return {
      type: "preview",
      shouldRun: true,
      shouldSeed: !isProductionDatabase,
    };
  }

  // development or unknown
  return { type: vercelEnv, shouldRun: false };
}

/**
 * Extract project ref from SUPABASE_URL
 * Format: https://<project-ref>.supabase.co
 */
function extractProjectRef() {
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  const match = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match ? match[1] : null;
}

/**
 * Validate required environment variables
 */
/**
 * @param {"production" | "preview"} envType
 * @returns {boolean} true if validation passes, false if preview should skip
 */
function validateEnv(envType) {
  const errors = [];

  // Access token is always required (added manually)
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    errors.push(
      "SUPABASE_ACCESS_TOKEN - Get from https://supabase.com/dashboard/account/tokens"
    );
  }

  // SUPABASE_URL (provided by integration)
  if (!process.env.SUPABASE_URL) {
    errors.push(
      "SUPABASE_URL - Should be provided by Supabase Vercel Integration"
    );
  }

  // Database password (provided by integration)
  if (!process.env.POSTGRES_PASSWORD) {
    errors.push(
      "POSTGRES_PASSWORD - Should be provided by Supabase Vercel Integration"
    );
  }

  if (errors.length > 0) {
    if (envType === "preview") {
      // In preview mode, missing env vars means the Supabase branch integration
      // hasn't injected credentials yet. Skip gracefully — CI will handle
      // redeployment once env vars are set, or the branch may already have
      // migrations applied via Supabase branching.
      console.log("\n⚠️  Missing environment variables for preview:");
      errors.forEach((err) => console.log(`   - ${err}`));
      console.log(
        "\n⏭️  Skipping migrations — preview env vars not ready yet.\n"
      );
      return false;
    }
    // Production mode: fail hard
    console.error("\n❌ Missing required environment variables:\n");
    errors.forEach((err) => console.error(`   - ${err}`));
    console.error("\n");
    process.exit(1);
  }
  return true;
}

/**
 * Count migration files
 */
function countMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) {
    return 0;
  }
  const files = readdirSync(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith(".sql")).length;
}

/**
 * Get database connection URL for seeding
 *
 * IMPORTANT: For seeding that writes to auth.users, we need a NON-POOLING connection.
 * The pooler (PgBouncer) can't handle multi-statement transactions or auth schema writes.
 *
 * Priority (check both SUPABASE_* and bare POSTGRES_* — the Supabase Vercel Integration
 * provides the unprefixed variants, while some setups use the prefixed ones):
 * 1. SUPABASE_POSTGRES_URL_NON_POOLING / POSTGRES_URL_NON_POOLING - Direct (preferred)
 * 2. SUPABASE_POSTGRES_URL / POSTGRES_URL - Pooled (may work for simple seeds)
 * 3. Build URL from project ref and password (direct connection via db host)
 */
function getDatabaseUrl(projectRef) {
  // Prefer non-pooling URL for seeding (required for auth.users writes).
  // Pooled/non-pooling URLs from the Supabase integration embed credentials —
  // we must NOT pass an explicit `password` option when using them, because
  // postgres.js options take precedence over URL auth and would either
  // override the real password or pass `undefined` when the env var is unset.
  const nonPoolingUrl =
    process.env.SUPABASE_POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (nonPoolingUrl) {
    console.log(`   Using non-pooling connection (direct)`);
    return { url: nonPoolingUrl, needsExplicitPassword: false };
  }

  // Fall back to pooled URL (may not work for auth schema)
  const pooledUrl =
    process.env.SUPABASE_POSTGRES_URL || process.env.POSTGRES_URL;
  if (pooledUrl) {
    console.log(`   ⚠️  Using pooled connection (may fail for auth.users)`);
    return { url: pooledUrl, needsExplicitPassword: false };
  }

  // Build direct connection URL — use db.<ref>.supabase.co (region-independent).
  // Password is NOT embedded in the URL — callers must pass it via the
  // `password` option so the secret never appears in logs or error messages.
  if (!process.env.POSTGRES_PASSWORD) {
    return null;
  }

  console.log(`   Building direct connection URL`);
  return {
    url: `postgresql://postgres@db.${projectRef}.supabase.co:5432/postgres`,
    needsExplicitPassword: true,
  };
}

/**
 * Run seed files against the database using postgres client
 */
async function runSeedSql(projectRef) {
  if (!existsSync(SEEDS_DIR)) {
    console.log(`   Seeds directory not found: ${SEEDS_DIR}`);
    return false;
  }

  // Filter to only existing seed files
  const existingSeeds = SEED_FILES.filter((file) =>
    existsSync(resolve(SEEDS_DIR, file))
  );

  if (existingSeeds.length === 0) {
    console.log(`   No seed files found in: ${SEEDS_DIR}`);
    return false;
  }

  console.log(`   Found ${existingSeeds.length} seed files`);

  const connection = getDatabaseUrl(projectRef);
  if (!connection) {
    console.log(`   ❌ No database connection URL available`);
    return false;
  }

  console.log(`   Connecting to database...`);

  // postgres.js options:
  //   ssl: true — widely-supported across postgres.js versions; Supabase
  //   direct/pooled connections require TLS.
  //   password — only supply when the URL came from the fallback branch
  //   (the only branch that intentionally omits credentials). Supplying it
  //   on pooled/non-pooling URLs would either override the embedded password
  //   or pass `undefined` in environments that only provide the URL, both
  //   of which break auth.
  //   connect_timeout / idle_timeout / max_lifetime — increased for seeding.
  const sql = postgres(connection.url, {
    ssl: true,
    ...(connection.needsExplicitPassword
      ? { password: process.env.POSTGRES_PASSWORD }
      : {}),
    connect_timeout: 30,
    idle_timeout: 30,
    max_lifetime: 60,
  });

  try {
    // Execute each seed file in order
    for (const seedFile of existingSeeds) {
      const seedPath = resolve(SEEDS_DIR, seedFile);
      const seedSql = readFileSync(seedPath, "utf-8");

      console.log(`   Running ${seedFile}...`);
      await sql.unsafe(seedSql);
    }

    console.log(`   ✅ All seed data applied successfully!`);
    return true;
  } catch (error) {
    // Log detailed error info
    console.error(`   ❌ Seed failed: ${error.message}`);
    console.error(`   Error code: ${error.code}`);
    console.error(`   Error detail: ${error.detail || "none"}`);
    console.error(`   Error hint: ${error.hint || "none"}`);
    // Log first 200 chars of query that failed if available
    if (error.query) {
      console.error(
        `   Failed query (truncated): ${error.query.substring(0, 200)}...`
      );
    }
    // Don't fail the build for seed errors
    return false;
  } finally {
    await sql.end();
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log("\n🚀 Supabase Migration Runner\n");
  console.log("=".repeat(50));

  // Extract project ref early (needed for environment safety check)
  const projectRef = extractProjectRef();

  // Check environment (pass projectRef for production database safety check)
  const env = getEnvironment(projectRef);
  console.log(`\n📍 Environment: ${env.type}`);

  if (!env.shouldRun) {
    console.log("\n⏭️  Skipping migrations (local development)");
    console.log("   Use `pnpm db:reset` to reset local database.\n");
    process.exit(0);
  }

  // Validate environment variables — preview skips gracefully if vars missing
  const envReady = validateEnv(env.type);
  if (!envReady) {
    process.exit(0);
  }

  if (!projectRef) {
    console.error("\n❌ Could not extract project ref from SUPABASE_URL");
    console.error(`   SUPABASE_URL: ${process.env.SUPABASE_URL}`);
    console.error("   Expected format: https://<project-ref>.supabase.co\n");
    process.exit(1);
  }

  // Check migrations directory exists
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`\n❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const migrationCount = countMigrations();
  const isProductionDb = projectRef === PRODUCTION_PROJECT_REF;

  console.log(
    `\n📦 Project: ${projectRef}${isProductionDb ? " (PRODUCTION)" : ""}`
  );
  console.log(`📁 Migrations: ${migrationCount} files`);
  console.log(
    `🌱 Seeding: ${env.shouldSeed ? "Yes (preview branch)" : `No (${isProductionDb ? "production database" : "production env"})`}`
  );

  // Build environment for Supabase CLI
  // SUPABASE_ACCESS_TOKEN passes through from process.env automatically.
  // SUPABASE_DB_PASSWORD is the env var the CLI expects for the database password.
  const cliEnv = {
    SUPABASE_DB_PASSWORD: process.env.POSTGRES_PASSWORD,
  };

  // --- Migrations ---
  if (env.type === "preview" && !isProductionDb) {
    console.log("\n🔗 Linking to preview Supabase project...");
    exec(`npx supabase link --project-ref ${projectRef}`, { env: cliEnv });
    console.log("\n📤 Applying migrations to preview database...");
    // db push is safe here: all migrations are idempotent (IF NOT EXISTS /
    // DROP ... IF EXISTS guards), so replaying previously-applied migrations
    // on a preview branch database is a no-op with no side effects.
    exec("npx supabase db push --linked", { env: cliEnv }); // noqa: exec-ok — cliEnv is fully controlled, no user input
  } else if (env.type === "preview" && isProductionDb) {
    // SAFETY: Never push unmerged branch migrations to production.
    console.log(
      "\n⛔ Skipping migrations — preview deploy connected to production DB"
    );
    console.log("   Unmerged migrations must not be applied to production.");
    console.log("   Migrations will run when the branch is merged to main.\n");
  } else {
    // Production deploy from main — push new migrations
    console.log("\n🔗 Linking to Supabase project...");
    exec(`npx supabase link --project-ref ${projectRef}`, { env: cliEnv });

    console.log("\n📤 Applying migrations...");
    exec("npx supabase db push --linked", { env: cliEnv });
  }

  // --- Edge Functions ---
  // Deploy edge functions from the Vercel build for both production and preview.
  // The Supabase GitHub integration's remote bundler cannot resolve monorepo
  // imports, so function declarations are NOT in config.toml — this build
  // pipeline is the sole deployment path for edge functions.
  if (env.type === "preview" && isProductionDb) {
    console.log(
      "\n⏭️  Skipping edge function deploy — connected to production DB"
    );
  } else {
    console.log("\n📦 Vendoring monorepo packages for edge functions...");
    exec("npx tsx scripts/vendor-packages.ts --deploy", {
      cwd: SUPABASE_DIR,
    });

    console.log("\n🚀 Deploying edge functions...");
    exec(
      `npx supabase functions deploy --project-ref ${projectRef} --use-api`,
      { env: cliEnv }
    );
  }

  // Run seed data for preview environments
  if (env.shouldSeed) {
    console.log("\n🌱 Running seed data...");
    await runSeedSql(projectRef);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Migration runner complete!\n");
}

// Run
runMigrations().catch((error) => {
  console.error("\n❌ Migration runner failed:");
  console.error(error.message);
  console.error("\nBuild will fail due to migration error.\n");
  process.exit(1);
});
