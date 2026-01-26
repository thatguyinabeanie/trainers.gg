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
import { existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const SUPABASE_DIR = resolve(__dirname, "../../../packages/supabase");
const MIGRATIONS_DIR = resolve(SUPABASE_DIR, "supabase/migrations");

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
 * Check if we're in a Vercel environment
 */
function getEnvironment() {
  const vercelEnv = process.env.VERCEL_ENV;

  if (!vercelEnv) {
    return { type: "local", shouldRun: false };
  }

  if (vercelEnv === "production") {
    return { type: "production", shouldRun: true, shouldSeed: false };
  }

  if (vercelEnv === "preview") {
    return { type: "preview", shouldRun: true, shouldSeed: true };
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
 * Main migration runner
 */
async function runMigrations() {
  console.log("\n🚀 Supabase Migration Runner\n");
  console.log("=".repeat(50));

  // Check environment
  const env = getEnvironment();
  console.log(`\n📍 Environment: ${env.type}`);

  if (!env.shouldRun) {
    console.log("\n⏭️  Skipping migrations (local development)");
    console.log("   Use `pnpm db:reset` to reset local database.\n");
    process.exit(0);
  }

  // Validate environment variables
  validateEnv();

  // Extract project ref from SUPABASE_URL
  const projectRef = extractProjectRef();

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

  console.log(`\n📦 Project: ${projectRef}`);
  console.log(`📁 Migrations: ${migrationCount} files`);
  console.log(
    `🌱 Seeding: ${env.shouldSeed ? "Yes (preview)" : "No (production)"}`
  );

  // Build environment for Supabase CLI
  const cliEnv = {
    SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
    SUPABASE_DB_PASSWORD: process.env.SUPABASE_POSTGRES_PASSWORD,
  };

  // Link to project
  console.log("\n🔗 Linking to Supabase project...");
  exec(`npx supabase link --project-ref ${projectRef}`, { env: cliEnv });

  // Push migrations
  console.log("\n📤 Applying migrations...");
  exec("npx supabase db push --linked", { env: cliEnv });

  // Run seeds for preview environments only
  if (env.shouldSeed) {
    console.log("\n🌱 Running seed data...");
    exec("npx supabase db seed --linked", {
      env: cliEnv,
      ignoreError: true,
    });
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
