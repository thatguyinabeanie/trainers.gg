/**
 * Cron authorization helper.
 *
 * Verifies a request carries the correct `Authorization: Bearer <CRON_SECRET>`
 * header. Fails CLOSED if `CRON_SECRET` is not configured — the route returns
 * 500 rather than accepting the literal string `"Bearer undefined"` that an
 * inline `` `Bearer ${process.env.CRON_SECRET}` `` comparison would otherwise
 * allow through.
 *
 * Returns `null` when the request is authorized; otherwise returns a Response
 * the caller should return directly.
 */
export function requireCronAuth(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron-auth] CRON_SECRET is not configured");
    return new Response("Server misconfigured: CRON_SECRET unset", {
      status: 500,
    });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}
