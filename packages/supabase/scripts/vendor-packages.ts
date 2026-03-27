import * as esbuild from "esbuild";
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = resolve(__dirname, "../../..");
const functionsDir = resolve(__dirname, "../supabase/functions");
const vendorDir = resolve(functionsDir, "_vendor");
const posthogSrc = resolve(repoRoot, "packages/posthog/src");
const validatorsSrc = resolve(repoRoot, "packages/validators/src");
const supabaseSrc = resolve(__dirname, "../src");
const utilsSrc = resolve(repoRoot, "packages/utils/src");

const isDeploy = process.argv.includes("--deploy");

const pkmnExternals = [
  "@pkmn/sets",
  "@pkmn/sim",
  "@pkmn/streams",
  "@pkmn/data",
  "@pkmn/dex",
  "ts-chacha20",
];

const sharedConfig: esbuild.BuildOptions = {
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "esnext",
  treeShaking: true,
  external: ["@supabase/supabase-js", "zod", "obscenity", ...pkmnExternals],
};

const trainersResolvePlugin: esbuild.Plugin = {
  name: "trainers-resolve",
  setup(build) {
    build.onResolve({ filter: /^@trainers\/utils/ }, () => ({
      path: resolve(utilsSrc, "index.ts"),
    }));

    build.onResolve({ filter: /^@trainers\/validators$/ }, () => ({
      path: resolve(validatorsSrc, "index.ts"),
    }));

    build.onResolve({ filter: /^@trainers\/validators\/(.+)/ }, (args) => {
      const subpath = args.path.replace("@trainers/validators/", "");
      return { path: resolve(validatorsSrc, `${subpath}.ts`) };
    });
  },
};

const validatorSubpaths = [
  "index",
  "common",
  "match",
  "auth",
  "tournament",
  "alt",
  "organization",
  "admin",
  "action-result",
];

async function main() {
  console.log("📦 Vendoring monorepo packages for edge functions...");

  rmSync(vendorDir, { recursive: true, force: true });
  mkdirSync(resolve(vendorDir, "posthog"), { recursive: true });
  mkdirSync(resolve(vendorDir, "validators"), { recursive: true });
  mkdirSync(resolve(vendorDir, "supabase"), { recursive: true });

  console.log("  Bundling @trainers/posthog...");
  await esbuild.build({
    ...sharedConfig,
    entryPoints: [resolve(posthogSrc, "index.ts")],
    outfile: resolve(vendorDir, "posthog/index.js"),
  });

  console.log(
    `  Bundling @trainers/validators (${validatorSubpaths.length} subpaths)...`
  );
  await esbuild.build({
    ...sharedConfig,
    entryPoints: Object.fromEntries(
      validatorSubpaths.map((name) => [
        name,
        resolve(validatorsSrc, `${name}.ts`),
      ])
    ),
    outdir: resolve(vendorDir, "validators"),
  });

  console.log("  Bundling @trainers/supabase/queries...");
  await esbuild.build({
    ...sharedConfig,
    plugins: [trainersResolvePlugin],
    entryPoints: { queries: resolve(supabaseSrc, "queries/index.ts") },
    outdir: resolve(vendorDir, "supabase"),
  });

  console.log("  Bundling @trainers/supabase/mutations...");
  await esbuild.build({
    ...sharedConfig,
    plugins: [trainersResolvePlugin],
    entryPoints: { mutations: resolve(supabaseSrc, "mutations/index.ts") },
    outdir: resolve(vendorDir, "supabase"),
  });

  console.log("  ✅ Vendor complete: _vendor/ ready");

  if (isDeploy) {
    const denoJsonPath = resolve(functionsDir, "deno.json");
    const denoJson = JSON.parse(readFileSync(denoJsonPath, "utf-8"));

    const vendorImports: Record<string, string> = {
      "@trainers/posthog": "./_vendor/posthog/index.js",
      "@trainers/validators": "./_vendor/validators/index.js",
      ...Object.fromEntries(
        validatorSubpaths
          .filter((name) => name !== "index")
          .map((name) => [
            `@trainers/validators/${name}`,
            `./_vendor/validators/${name}.js`,
          ])
      ),
      "@trainers/supabase/queries": "./_vendor/supabase/queries.js",
      "@trainers/supabase/mutations": "./_vendor/supabase/mutations.js",
    };

    const updatedImports: Record<string, string> = {};
    for (const [key, value] of Object.entries(
      denoJson.imports as Record<string, string>
    )) {
      updatedImports[key] = key.startsWith("@trainers/")
        ? (vendorImports[key] ?? value)
        : value;
    }

    denoJson.imports = updatedImports;
    writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2) + "\n");
    console.log("  📝 Updated deno.json with vendor paths");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
