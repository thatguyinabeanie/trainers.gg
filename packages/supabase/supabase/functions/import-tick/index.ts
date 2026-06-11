// packages/supabase/supabase/functions/import-tick/index.ts
// Single edge function driving the autonomous import pipeline.
// Invoked by three pg_cron jobs via net.http_post with ?stage=sync|import|compile.
// Authenticated by comparing the Authorization bearer to the Vault-injected
// service-role key — there is no end-user JWT here.

import { createClient } from "@supabase/supabase-js";
import {
  runSyncStage,
  runImportStage,
  runCompileStage,
} from "@trainers/supabase/mutations/pipeline";
import { recordImportRuns } from "@trainers/supabase/mutations/import-runs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LIMITLESS_API_KEY = Deno.env.get("LIMITLESS_API_KEY") ?? undefined;

// Budget one tick to ~9 minutes (edge functions cap at 10).
const TICK_BUDGET_MS = 9 * 60 * 1000;

type Stage = "sync" | "import" | "compile";

function isValidStage(value: string | null): value is Stage {
  return value === "sync" || value === "import" || value === "compile";
}

Deno.serve(async (req) => {
  // 1. Auth: bearer must equal the service-role key passed by pg_net.
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!bearer || bearer !== SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", code: "UNAUTHORIZED" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Stage selection.
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage");
  if (!isValidStage(stage)) {
    return new Response(
      JSON.stringify({
        error: "Invalid or missing ?stage=sync|import|compile",
        code: "INVALID_STAGE",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Global kill-switch: no-op when pipeline_enabled is false.
  const { data: configRow, error: configError } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", "pipeline_enabled")
    .maybeSingle();
  if (configError) {
    console.error("[import-tick] config read failed:", configError);
    return new Response(
      JSON.stringify({
        error: "config read failed",
        code: "CONFIG_READ_FAILED",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const pipelineEnabled =
    configRow?.value === true || configRow?.value === "true";
  if (!pipelineEnabled) {
    return new Response(
      JSON.stringify({ stage, skipped: true, reason: "pipeline_disabled" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const deadlineMs = Date.now() + TICK_BUDGET_MS;

    if (stage === "sync") {
      const exclusions = await loadExclusions(supabase);
      const result = await runSyncStage(supabase, {
        limitlessApiKey: LIMITLESS_API_KEY,
        isExcluded: (source: "rk9" | "limitless", id: string) =>
          exclusions.has(`${source}:${id}`),
      });
      try {
        await recordImportRuns(supabase, "cron", [
          {
            source: "rk9",
            status: "ok",
            processed: result.rk9.discovered,
            errors: 0,
            remaining: null,
            detail: result.rk9,
          },
          {
            source: "limitless",
            status: "ok",
            processed: result.limitless.discovered,
            errors: 0,
            remaining: null,
            detail: result.limitless,
          },
        ]);
      } catch (e) {
        console.error("[import-tick] failed to record run:", e);
      }
      return json({ stage, result });
    }

    if (stage === "import") {
      const batchSize = await readNumberConfig(
        supabase,
        "limitless_import_batch_size",
        25
      );
      const result = await runImportStage(supabase, {
        limitlessApiKey: LIMITLESS_API_KEY,
        limitlessBatchSize: batchSize,
        deadlineMs,
      });
      try {
        await recordImportRuns(supabase, "cron", [
          {
            source: "rk9",
            status: result.rk9.errors > 0 ? "partial" : "ok",
            processed: result.rk9.processed,
            errors: result.rk9.errors,
            remaining: result.rk9.remaining,
            detail: result.rk9,
          },
          {
            source: "limitless",
            status: result.limitless.errors > 0 ? "partial" : "ok",
            processed: result.limitless.processed,
            errors: result.limitless.errors,
            remaining: result.limitless.remaining,
            detail: result.limitless,
          },
        ]);
      } catch (e) {
        console.error("[import-tick] failed to record run:", e);
      }
      return json({ stage, result });
    }

    // stage === "compile"
    const result = await runCompileStage(supabase);
    try {
      await recordImportRuns(supabase, "cron", [
        {
          source: "compile",
          status: "ok",
          processed: result.eventsCompiled,
          errors: 0,
          remaining: null,
          detail: result,
        },
      ]);
    } catch (e) {
      console.error("[import-tick] failed to record run:", e);
    }
    // Revalidate the public /data usage caches for affected formats.
    if (result.formats.length > 0) {
      await revalidateUsage(result.formats);
    }
    return json({ stage, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    try {
      await recordImportRuns(supabase, "cron", [
        {
          source: stage === "compile" ? "compile" : "rk9",
          status: "error",
          processed: 0,
          errors: 1,
          remaining: null,
          detail: { message },
        },
      ]);
    } catch (e) {
      console.error("[import-tick] failed to record run:", e);
    }
    return new Response(
      JSON.stringify({ stage, error: message, code: "STAGE_FAILED" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function loadExclusions(
  supabase: ReturnType<typeof createClient>
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("import_exclusions")
    .select("source, source_event_id");
  if (error) throw new Error(`exclusions read failed: ${error.message}`);
  return new Set((data ?? []).map((r) => `${r.source}:${r.source_event_id}`));
}

async function readNumberConfig(
  supabase: ReturnType<typeof createClient>,
  key: string,
  fallback: number
): Promise<number> {
  const { data, error } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`config read failed: ${error.message}`);
  const raw = data?.value;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function revalidateUsage(formats: string[]): Promise<void> {
  const secret = Deno.env.get("USAGE_REVALIDATE_SECRET");
  const siteUrl = Deno.env.get("SITE_URL");
  if (!secret || !siteUrl) {
    console.warn(
      "[import-tick] USAGE_REVALIDATE_SECRET or SITE_URL not set — skipping cache revalidation"
    );
    return; // best-effort; cron read-side cache will still age out
  }
  const res = await fetch(`${siteUrl}/api/revalidate/usage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ formats }),
  });
  if (!res.ok) {
    console.error(`[import-tick] usage revalidate failed: ${res.status}`);
  }
}
