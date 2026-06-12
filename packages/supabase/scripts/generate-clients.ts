/**
 * Generate Client Wrappers
 *
 * Auto-generates platform-specific client wrappers (server.ts, client.ts, mobile.ts)
 * that inject the appropriate Supabase client into core queries and mutations.
 *
 * This eliminates the need for service layer files by generating thin wrappers
 * that handle client creation and injection automatically.
 *
 * Run: pnpm --filter @trainers/supabase generate-clients
 */

import { writeFileSync, readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC_DIR = join(__dirname, "../src");
const CLIENTS_DIR = join(SRC_DIR, "clients");

interface FunctionExport {
  name: string;
  isDefault: boolean;
}

/**
 * Recognized first-parameter types that mark a function as a DI-client query or
 * mutation — i.e. its first argument is a Supabase client that the generated
 * wrapper should inject. Any other first-param type means the function is a
 * pure helper (or a service-role-only function) that must NOT be wrapped.
 *
 * - `TypedClient` / `TypedSupabaseClient`: the standard injectable client.
 * - `ServiceRoleClient`: a service-role-only client. These are deliberately
 *   EXCLUDED from the auto-injected anon/session/mobile wrappers — callers must
 *   supply the service-role client explicitly (e.g. via `withAdminAction`), so
 *   it is intentionally absent from this set.
 */
const INJECTABLE_CLIENT_TYPES = new Set([
  "TypedClient",
  "TypedSupabaseClient",
]);

/**
 * Read the first parameter's type annotation for a named exported function.
 *
 * `matchIndex` points to the content immediately after the function's opening
 * `(`. We match the first `<name>: <Type>` token — that is the first
 * parameter's type. Returns `null` when there is no annotated first parameter
 * (e.g. a zero-arg function or an unannotated/destructured first param).
 */
function firstParamType(content: string, matchIndex: number): string | null {
  const afterParen = content.slice(matchIndex);
  // Match the first parameter annotation: <name>: <Type>
  const firstParamTypeMatch = /^\s*\w+\s*:\s*(\w+)/.exec(afterParen);
  return firstParamTypeMatch ? firstParamTypeMatch[1]! : null;
}

/**
 * Extract function exports from a TypeScript file, keeping ONLY functions whose
 * first parameter is an injectable Supabase client (see
 * `INJECTABLE_CLIENT_TYPES`).
 *
 * Two kinds of exported functions are intentionally skipped:
 *  - Pure helpers whose first param is not a client (e.g. `toDisplayStatus`,
 *    `computeStatusCounts`, `eventKeyFor`). Wrapping these would inject a client
 *    where a plain value is expected — a type error by construction.
 *  - Service-role-only functions (first param `ServiceRoleClient`). These must
 *    not be exposed through the anon/session/mobile wrappers — callers supply
 *    the service-role client explicitly (e.g. via `withAdminAction`).
 */
function extractExports(filePath: string): FunctionExport[] {
  const content = readFileSync(filePath, "utf-8");
  const exports: FunctionExport[] = [];

  // Match: export function functionName(
  // Match: export async function functionName(
  // Capture index points to right after the `(` so we can inspect parameters.
  const functionRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*\(/g;
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const name = match[1]!;
    // Index of content immediately after the opening `(`.
    const afterParenIndex = match.index + match[0].length;
    const paramType = firstParamType(content, afterParenIndex);
    if (paramType === null || !INJECTABLE_CLIENT_TYPES.has(paramType)) {
      // Skip — not a DI-client query/mutation. Either a pure helper or a
      // service-role-only function; neither should be auto-wrapped.
      continue;
    }
    exports.push({
      name,
      isDefault: false,
    });
  }

  return exports;
}

/**
 * Get all query and mutation files
 */
function getAllFunctionFiles() {
  const queriesDir = join(SRC_DIR, "queries");
  const mutationsDir = join(SRC_DIR, "mutations");

  const queryFiles = readdirSync(queriesDir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts" && !f.includes("test"))
    .map((f) => ({
      type: "queries" as const,
      file: f,
      path: join(queriesDir, f),
    }));

  const mutationFiles = readdirSync(mutationsDir)
    .filter(
      (f) =>
        f.endsWith(".ts") &&
        f !== "index.ts" &&
        !f.includes("test") &&
        !f.includes("helper")
    )
    .map((f) => ({
      type: "mutations" as const,
      file: f,
      path: join(mutationsDir, f),
    }));

  // Also check for subdirectories (like tournaments/)
  const tournamentsMutationsDir = join(mutationsDir, "tournaments");
  const tournamentMutationFiles = readdirSync(tournamentsMutationsDir)
    .filter(
      (f) => f.endsWith(".ts") && !f.includes("test") && !f.includes("helper")
    )
    .map((f) => ({
      type: "mutations" as const,
      file: `tournaments/${f}`,
      path: join(tournamentsMutationsDir, f),
    }));

  return [...queryFiles, ...mutationFiles, ...tournamentMutationFiles];
}

/**
 * Generate server.ts (Next.js SSR)
 */
function generateServerClient() {
  const files = getAllFunctionFiles();
  const allExports = files.flatMap((f) =>
    extractExports(f.path).map((exp) => ({
      ...exp,
      modulePath: `../${f.type}/${f.file.replace(/\.ts$/, "")}`,
    }))
  );

  const content = `/**
 * AUTO-GENERATED - DO NOT EDIT
 * Generated by: pnpm --filter @trainers/supabase generate-clients
 *
 * Server Client Wrapper (Next.js SSR)
 *
 * All queries and mutations auto-injected with Next.js server Supabase client.
 * This eliminates the need for a service layer - just import from @trainers/supabase/server.
 */

import { createServerSupabaseClient } from "./base/server-client";
${allExports
  .map(
    (exp) =>
      `import { ${exp.name} as ${exp.name}_core } from "${exp.modulePath}";`
  )
  .join("\n")}

${allExports
  .map((exp) => {
    return `/**
 * ${exp.name} (auto-injected with server client)
 */
export async function ${exp.name}(
  ...args: Parameters<typeof ${exp.name}_core> extends [first: infer _F, ...rest: infer R] ? R : never
): Promise<Awaited<ReturnType<typeof ${exp.name}_core>>> {
  const client = await createServerSupabaseClient();
  return ${exp.name}_core(client, ...args);
}`;
  })
  .join("\n\n")}
`;

  writeFileSync(join(CLIENTS_DIR, "server.ts"), content);
  console.log("✅ Generated server.ts");
}

/**
 * Generate client.ts (Next.js Browser)
 */
function generateBrowserClient() {
  const files = getAllFunctionFiles();
  const allExports = files.flatMap((f) =>
    extractExports(f.path).map((exp) => ({
      ...exp,
      modulePath: `../${f.type}/${f.file.replace(/\.ts$/, "")}`,
    }))
  );

  const content = `/**
 * AUTO-GENERATED - DO NOT EDIT
 * Generated by: pnpm --filter @trainers/supabase generate-clients
 *
 * Browser Client Wrapper (Next.js Client Components)
 *
 * All queries and mutations auto-injected with Next.js browser Supabase client.
 * This eliminates the need for a service layer - just import from @trainers/supabase/client.
 */

import { createBrowserSupabaseClient } from "./base/browser-client";
${allExports
  .map(
    (exp) =>
      `import { ${exp.name} as ${exp.name}_core } from "${exp.modulePath}";`
  )
  .join("\n")}

${allExports
  .map((exp) => {
    return `/**
 * ${exp.name} (auto-injected with browser client)
 */
export async function ${exp.name}(
  ...args: Parameters<typeof ${exp.name}_core> extends [first: infer _F, ...rest: infer R] ? R : never
): Promise<Awaited<ReturnType<typeof ${exp.name}_core>>> {
  const client = createBrowserSupabaseClient();
  return ${exp.name}_core(client, ...args);
}`;
  })
  .join("\n\n")}
`;

  writeFileSync(join(CLIENTS_DIR, "client.ts"), content);
  console.log("✅ Generated client.ts");
}

/**
 * Generate mobile.ts (Expo)
 */
function generateMobileClient() {
  const files = getAllFunctionFiles();
  const allExports = files.flatMap((f) =>
    extractExports(f.path).map((exp) => ({
      ...exp,
      modulePath: `../${f.type}/${f.file.replace(/\.ts$/, "")}`,
    }))
  );

  const content = `/**
 * AUTO-GENERATED - DO NOT EDIT
 * Generated by: pnpm --filter @trainers/supabase generate-clients
 *
 * Mobile Client Wrapper (Expo)
 *
 * All queries and mutations auto-injected with Expo Supabase client.
 * This eliminates the need for a service layer - just import from @trainers/supabase/mobile.
 */

import { createMobileSupabaseClient } from "./base/mobile-client";
${allExports
  .map(
    (exp) =>
      `import { ${exp.name} as ${exp.name}_core } from "${exp.modulePath}";`
  )
  .join("\n")}

${allExports
  .map((exp) => {
    return `/**
 * ${exp.name} (auto-injected with mobile client)
 */
export async function ${exp.name}(
  ...args: Parameters<typeof ${exp.name}_core> extends [first: infer _F, ...rest: infer R] ? R : never
): Promise<Awaited<ReturnType<typeof ${exp.name}_core>>> {
  const client = createMobileSupabaseClient();
  return ${exp.name}_core(client, ...args);
}`;
  })
  .join("\n\n")}
`;

  writeFileSync(join(CLIENTS_DIR, "mobile.ts"), content);
  console.log("✅ Generated mobile.ts");
}

/**
 * Main execution
 */
console.log("🤖 Generating client wrappers...\n");

generateServerClient();
generateBrowserClient();
generateMobileClient();

console.log("\n🎉 Client generation complete!");
console.log("\nUsage:");
console.log(
  '  Web SSR:     import { getTournamentById } from "@trainers/supabase/server"'
);
console.log(
  '  Web Client:  import { getTournamentById } from "@trainers/supabase/client"'
);
console.log(
  '  Mobile:      import { getTournamentById } from "@trainers/supabase/mobile"'
);
