import { type NextRequest, NextResponse } from "next/server";
import { verifyAccess, type ApiData } from "flags";
import { getProviderData } from "flags/next";
import { createClient } from "@/lib/supabase/server";
import { listFeatureFlags } from "@trainers/supabase";
import * as flags from "@/flags";

/**
 * Vercel Flags Discovery Endpoint
 *
 * This `.well-known` endpoint is called by the Vercel Toolbar to discover
 * available feature flags. It combines:
 *
 * 1. Code-defined flags (from `src/flags.ts`) — have rich metadata (description, options)
 * 2. Database-defined flags (from `feature_flags` table) — dynamically created via admin panel
 *
 * Vercel Toolbar uses this to:
 * - Show available flags in the Flag Explorer
 * - Allow overriding flag values during development/preview
 * - Display flag metadata and descriptions
 *
 * Protected by FLAGS_SECRET to prevent public access to flag definitions.
 */
export async function GET(request: NextRequest) {
  const access = await verifyAccess(request.headers.get("Authorization"));
  if (!access) {
    return NextResponse.json(null, { status: 401 });
  }

  // Get definitions from code-defined flags (these have rich metadata)
  const codeProviderData = getProviderData(flags);

  // Merge in database-defined flags that aren't already in code
  const dbDefinitions = await getDatabaseFlagDefinitions();

  const mergedDefinitions = {
    ...dbDefinitions,
    ...codeProviderData.definitions, // Code-defined flags take precedence
  };

  return NextResponse.json({
    definitions: mergedDefinitions,
    hints: codeProviderData.hints,
  } satisfies ApiData);
}

/**
 * Fetch all feature flags from the database and convert them
 * to Vercel Flags SDK definition format.
 */
async function getDatabaseFlagDefinitions(): Promise<
  Record<
    string,
    {
      description?: string;
      origin?: string;
      options?: { value: boolean; label: string }[];
    }
  >
> {
  try {
    const supabase = await createClient();
    const dbFlags = await listFeatureFlags(supabase);

    const definitions: Record<
      string,
      {
        description?: string;
        origin?: string;
        options?: { value: boolean; label: string }[];
      }
    > = {};

    for (const dbFlag of dbFlags) {
      definitions[dbFlag.key] = {
        description: dbFlag.description ?? undefined,
        origin: "/admin/config",
        options: [
          { value: false, label: "Off" },
          { value: true, label: "On" },
        ],
      };
    }

    return definitions;
  } catch {
    // If DB is unreachable, return empty — code-defined flags still work
    return {};
  }
}
