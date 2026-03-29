---
applyTo: "**/actions/**"
excludeAgent: "coding-agent"
---

# Code Review — Server Actions

Server Actions return `{ success: boolean; error?: string }`. Do not suggest throwing errors — errors are returned as values.

Zod validation uses `.transform(v => v.trim()).pipe(z.string().max(N))`. Do not suggest `.preprocess()`.

`checkBotId()` from `botid/server` rejects headless Playwright browsers (flagged as bots). Server actions called during E2E tests must check the `x-vercel-protection-bypass` header against `VERCEL_AUTOMATION_BYPASS_SECRET` to skip BotID for automation. This is the same trust model used by `/api/e2e/*` endpoints.
