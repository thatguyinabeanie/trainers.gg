/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * Returns `false` immediately if the lengths differ (length leakage is
 * acceptable — short-circuiting on length is standard practice and the length
 * of a bearer token / service-role key is not sensitive). For equal-length
 * inputs it XOR-accumulates every char code so the loop always runs to
 * completion regardless of where the strings first diverge.
 *
 * `node:crypto`'s `timingSafeEqual` is intentionally NOT used here: it
 * requires `Buffer`, which is a Node.js built-in unavailable in the Supabase
 * edge runtime (Deno). The XOR-accumulate approach is Deno-safe and
 * sufficient for bearer-token comparison at the key lengths used in this
 * project.
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
