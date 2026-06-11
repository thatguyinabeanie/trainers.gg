/**
 * Limitless queue drain helper.
 *
 * Designed for cron routes: keeps calling `processImportQueue` in a loop
 * until the queue is empty, a deadline is reached, or no forward progress
 * can be made (all failures or unknown-format rows).
 *
 * Not a Server Action — no auth checks. Caller must supply a service-role
 * Supabase client and ensure the invocation is trusted.
 */

import { type TypedClient } from "../../client";

import { processImportQueue } from "./import";

export interface DrainResult {
  /** Total tournaments successfully processed across all passes. */
  processed: number;
  /** Total errors encountered across all passes. */
  errors: number;
  /** Remaining queued count as of the last pass. */
  remaining: number;
  /** Number of processImportQueue calls made. */
  passes: number;
}

/**
 * Drain the Limitless import queue until:
 * - The queue is empty (`remaining === 0`)
 * - No forward progress in a pass (`totalProcessed === 0`) — only
 *   undrainable rows remain (unknown format, etc.)
 * - All rows in a pass failed — the Limitless API is likely down.
 *   processOne counts failures as processed and requeues with attempts+1,
 *   so continuing would burn all 3 attempts and mass-fail the queue.
 * - The deadline is reached (`Date.now() >= deadline`)
 *
 * @param supabase - Service-role Supabase client (caller's responsibility)
 * @param apiKey - Limitless API key. Optional: the Limitless API serves
 *   unauthenticated requests at a lower rate limit, so a missing key degrades
 *   throughput rather than disabling imports.
 * @param batchSize - Max tournaments to process per pass
 * @param deadline - Unix epoch ms — stop after this time
 */
export async function drainLimitlessQueue(
  supabase: TypedClient,
  apiKey: string | undefined,
  batchSize: number,
  deadline: number
): Promise<DrainResult> {
  let processed = 0;
  let errors = 0;
  let remaining = 0;
  let passes = 0;

  while (Date.now() < deadline) {
    const r = await processImportQueue(supabase, apiKey, batchSize);

    processed += r.totalProcessed;
    errors += r.totalErrors;
    remaining = r.remaining;
    passes++;

    // Queue drained
    if (r.remaining === 0) break;

    // No forward progress — only undrainable (unknown-format) rows remain
    if (r.totalProcessed === 0) break;

    // All-failure pass: the Limitless API is likely down.
    // processOne counts failures as processed and requeues with attempts+1,
    // so a tight loop would burn all 3 attempts and mass-fail the queue.
    // Stop here and let the next cron run retry.
    if (r.totalErrors === r.totalProcessed && r.totalProcessed > 0) break;
  }

  return { processed, errors, remaining, passes };
}
