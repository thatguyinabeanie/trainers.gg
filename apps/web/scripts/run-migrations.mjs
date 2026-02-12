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
 * - SUPABASE_POSTGRES_PASSWORD: Database password
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
  const sensitiveVars = ["SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD"];
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
 */
const PRODUCTION_PROJECT_REF = "shsijtmbiibknwygcdtc";

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
function validateEnv() {
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
  if (!process.env.SUPABASE_POSTGRES_PASSWORD) {
    errors.push(
      "SUPABASE_POSTGRES_PASSWORD - Should be provided by Supabase Vercel Integration"
    );
  }

  if (errors.length > 0) {
    console.error("\n❌ Missing required environment variables:\n");
    errors.forEach((err) => console.error(`   - ${err}`));
    console.error("\n");
    process.exit(1);
  }
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
 * Priority:
 * 1. SUPABASE_POSTGRES_URL_NON_POOLING - Direct connection (preferred for seeding)
 * 2. SUPABASE_POSTGRES_URL - Pooled connection (may work for simple seeds)
 * 3. Build URL from project ref and password (uses direct connection on port 5432)
 */
function getDatabaseUrl(projectRef) {
  // Prefer non-pooling URL for seeding (required for auth.users writes)
  if (process.env.SUPABASE_POSTGRES_URL_NON_POOLING) {
    console.log(`   Using non-pooling connection (direct)`);
    return process.env.SUPABASE_POSTGRES_URL_NON_POOLING;
  }

  // Fall back to pooled URL (may not work for auth schema)
  if (process.env.SUPABASE_POSTGRES_URL) {
    console.log(`   ⚠️  Using pooled connection (may fail for auth.users)`);
    return process.env.SUPABASE_POSTGRES_URL;
  }

  // Build direct connection URL (port 5432, not pooler)
  const password = process.env.SUPABASE_POSTGRES_PASSWORD;
  if (!password) {
    return null;
  }

  console.log(`   Building direct connection URL`);
  // Use direct connection (port 5432) for seeding, not pooler (port 6543)
  return `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
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

  const connectionUrl = getDatabaseUrl(projectRef);
  if (!connectionUrl) {
    console.log(`   ❌ No database connection URL available`);
    return false;
  }

  console.log(`   Connecting to database...`);

  const sql = postgres(connectionUrl, {
    // Increase timeout for seed operations
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

  // Validate environment variables
  validateEnv();

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
  const cliEnv = {
    SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
    SUPABASE_DB_PASSWORD: process.env.SUPABASE_POSTGRES_PASSWORD,
  };

  // For preview environments, skip migrations - Supabase applies them automatically
  // when creating the preview branch. Running migrations again causes conflicts.
  if (env.type === "preview" && !isProductionDb) {
    console.log("\n⏭️  Skipping migrations for preview branch");
    console.log("   Supabase automatically applies migrations when creating preview branches.");
    console.log("   Running migrations again would cause duplicate schema objects.");
  } else {
    // Link to project (only needed for production)
    console.log("\n🔗 Linking to Supabase project...");
    exec(`npx supabase link --project-ref ${projectRef}`, { env: cliEnv });

    // For production, only push new migrations (never reset)
    console.log("\n📤 Applying migrations...");
    exec("npx supabase db push --linked", { env: cliEnv });
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
