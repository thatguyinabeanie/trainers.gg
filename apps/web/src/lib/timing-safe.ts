import { timingSafeEqual } from "node:crypto";

/**
 * Compares two strings in constant time to prevent timing attacks.
 *
 * Always returns false when lengths differ (fast path, no secret info leaked
 * since length differences are usually observable anyway). When lengths match,
 * delegates to Node's `timingSafeEqual` so the comparison time is independent
 * of how many bytes match.
 *
 * Use this for all secret / token comparisons (bearer tokens, cron secrets,
 * webhook shared secrets) — never use `===` for those.
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
