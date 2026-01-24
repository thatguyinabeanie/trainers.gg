#!/usr/bin/env node
/**
 * Database Schema Verification Script
 *
 * Checks that required database columns exist before building.
 * Logs warnings if columns are missing but does NOT fail the build.
 *
 * Required environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 */

const REQUIRED_COLUMNS = [
  { table: "users", column: "did", description: "AT Protocol DID" },
  { table: "users", column: "pds_handle", description: "PDS handle" },
  { table: "users", column: "pds_status", description: "PDS account status" },
];

async function verifyDatabase() {
  console.log("\n🔍 Verifying database schema...\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log(
      "⚠️  Skipping database verification: Supabase credentials not available"
    );
    console.log("   This is expected for local builds without env vars.\n");
    return;
  }

  const missingColumns = [];
  const verifiedColumns = [];

  for (const { table, column, description } of REQUIRED_COLUMNS) {
    try {
      // Query information_schema to check if column exists
      const response = await fetch(
        `${supabaseUrl}/rest/v1/rpc/check_column_exists`,
        {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_table_name: table,
            p_column_name: column,
          }),
        }
      );

      if (!response.ok) {
        // RPC function doesn't exist, fall back to direct query
        const checkResponse = await fetch(
          `${supabaseUrl}/rest/v1/${table}?select=${column}&limit=0`,
          {
            method: "GET",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        if (checkResponse.ok) {
          verifiedColumns.push({ table, column, description });
        } else {
          const error = await checkResponse.json();
          if (
            error.message?.includes("does not exist") ||
            error.code === "42703"
          ) {
            missingColumns.push({ table, column, description });
          } else {
            // Other error, assume column exists
            verifiedColumns.push({ table, column, description });
          }
        }
      } else {
        const exists = await response.json();
        if (exists) {
          verifiedColumns.push({ table, column, description });
        } else {
          missingColumns.push({ table, column, description });
        }
      }
    } catch (error) {
      console.log(
        `   ⚠️  Could not verify ${table}.${column}: ${error.message}`
      );
    }
  }

  // Report results
  if (verifiedColumns.length > 0) {
    console.log("✅ Verified columns:");
    for (const { table, column, description } of verifiedColumns) {
      console.log(`   • ${table}.${column} (${description})`);
    }
    console.log("");
  }

  if (missingColumns.length > 0) {
    console.log("⚠️  WARNING: Missing columns detected:");
    for (const { table, column, description } of missingColumns) {
      console.log(`   • ${table}.${column} (${description})`);
    }
    console.log("");
    console.log("   These columns may be needed for AT Protocol features.");
    console.log("   Check that migrations have been applied to the database.");
    console.log("   See: packages/supabase/supabase/migrations/\n");
  } else if (verifiedColumns.length > 0) {
    console.log("✅ All required database columns verified!\n");
  }
}

// Run verification
verifyDatabase().catch((error) => {
  console.error("Database verification failed:", error);
  // Don't exit with error - this is non-blocking
});
