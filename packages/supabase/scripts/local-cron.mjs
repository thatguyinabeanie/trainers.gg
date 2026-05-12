// Local dev cron — fast poller that fires every second. Edge functions handle their
// own gating via site_config (auto-import flag + cron interval), so this script just
// calls them and lets them decide whether to do work.
//
// Run alongside `pnpm dev` (starts as a Turbo panel automatically).
//
// Usage:
//   pnpm dev
//   # or standalone:
//   pnpm --filter @trainers/supabase cron

const SUPABASE_URL = "http://127.0.0.1:54321";
const POLL_INTERVAL_MS = 1_000; // 1 second — fast polling, edge functions gate themselves

async function invokeEdgeFunction(name, body) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const action = data?.data?.action ?? data?.action ?? "unknown";
    if (action !== "skipped" && action !== "idle") {
      console.log(`[local-cron] ${name} → ${action}`, data?.data ?? "");
    }
  } catch (err) {
    // Edge functions might not be ready yet during startup — silent skip
    if (err?.cause?.code !== "ECONNREFUSED") {
      console.error(`[local-cron] ${name} fetch failed:`, err.message);
    }
  }
}

async function tick() {
  await Promise.all([
    invokeEdgeFunction("rk9-worker", {}),
    invokeEdgeFunction("limitless-import", { action: "sync" }),
    invokeEdgeFunction("limitless-import", { action: "process-queue", batchSize: 20 }),
  ]);
}

console.log("[local-cron] Starting — polling edge functions every 1s");
console.log(`[local-cron]   rk9-worker            → http://127.0.0.1:54321/functions/v1/rk9-worker`);
console.log(`[local-cron]   limitless-import sync  → http://127.0.0.1:54321/functions/v1/limitless-import`);
console.log(`[local-cron]   limitless-import queue → http://127.0.0.1:54321/functions/v1/limitless-import`);

// Fire immediately, then every POLL_INTERVAL_MS
tick();
setInterval(tick, POLL_INTERVAL_MS);

// Keep alive
process.on("SIGINT", () => {
  console.log("\n[local-cron] Stopping");
  process.exit(0);
});
