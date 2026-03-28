import * as esbuild from "esbuild";
import {
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = resolve(__dirname, "../../..");
const functionsDir = resolve(__dirname, "../supabase/functions");
const vendorDir = resolve(functionsDir, "_shared/vendor");
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
  "community",
  "organization-request",
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

  console.log("  ✅ Vendor complete: _shared/vendor/ ready");

  if (isDeploy) {
    // Known specifier overrides (esm.sh URLs, pinned versions)
    const specifierOverrides: Record<string, string> = {
      "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.49.4",
    };

    // Rewrite all bare specifiers in vendored .js bundles and source files.
    // The --use-api server-side bundler does not read the deno.json import map,
    // so any bare specifier (not starting with . / http npm: jsr:) must be
    // converted to a Deno-native specifier (npm:<pkg> or a URL).
    const bareSpecifierRegex = /from\s+["']([^"'./][^"']*)["']/g;

    const vendorFiles = [
      resolve(vendorDir, "posthog/index.js"),
      ...validatorSubpaths.map((name) =>
        resolve(vendorDir, `validators/${name}.js`)
      ),
      resolve(vendorDir, "supabase/queries.js"),
      resolve(vendorDir, "supabase/mutations.js"),
    ];

    for (const filePath of vendorFiles) {
      let content = readFileSync(filePath, "utf-8");
      const rewritten = content.replace(
        bareSpecifierRegex,
        (_match, specifier: string) => {
          if (
            specifier.startsWith("npm:") ||
            specifier.startsWith("jsr:") ||
            specifier.startsWith("http")
          ) {
            return _match;
          }
          const override = specifierOverrides[specifier];
          return override ? `from "${override}"` : `from "npm:${specifier}"`;
        }
      );
      if (rewritten !== content) writeFileSync(filePath, rewritten);
    }

    // Build a map of @trainers/* specifiers to vendor file names
    const vendorMap: Record<string, string> = {
      "@trainers/posthog": "vendor/posthog/index.js",
      "@trainers/validators": "vendor/validators/index.js",
      ...Object.fromEntries(
        validatorSubpaths
          .filter((name) => name !== "index")
          .map((name) => [
            `@trainers/validators/${name}`,
            `vendor/validators/${name}.js`,
          ])
      ),
      "@trainers/supabase/queries": "vendor/supabase/queries.js",
      "@trainers/supabase/mutations": "vendor/supabase/mutations.js",
    };

    // Rewrite imports in all function index.ts files and _shared/*.ts files
    const filesToRewrite: string[] = [];

    // Collect function index.ts files
    for (const entry of readdirSync(functionsDir)) {
      if (entry.startsWith("_")) continue;
      const indexPath = resolve(functionsDir, entry, "index.ts");
      try {
        statSync(indexPath);
        filesToRewrite.push(indexPath);
      } catch {
        // not a function directory
      }
    }

    // Collect _shared/*.ts files
    const sharedDir = resolve(functionsDir, "_shared");
    for (const entry of readdirSync(sharedDir)) {
      if (entry === "vendor") continue;
      const filePath = resolve(sharedDir, entry);
      if (entry.endsWith(".ts")) {
        filesToRewrite.push(filePath);
      }
    }

    let rewriteCount = 0;
    for (const filePath of filesToRewrite) {
      let content = readFileSync(filePath, "utf-8");
      let changed = false;

      for (const [specifier, vendorFile] of Object.entries(vendorMap)) {
        if (!content.includes(specifier)) continue;

        // Compute relative path from file's directory to _shared/vendor file
        const fileDir = dirname(filePath);
        const vendorPath = resolve(functionsDir, "_shared", vendorFile);
        let rel = relative(fileDir, vendorPath);
        if (!rel.startsWith(".")) rel = "./" + rel;

        // Replace the specifier in import/export statements
        content = content.replaceAll(`"${specifier}"`, `"${rel}"`);
        content = content.replaceAll(`'${specifier}'`, `'${rel}'`);
        changed = true;
      }

      // Also rewrite any remaining bare specifiers in source files
      const rewritten = content.replace(
        bareSpecifierRegex,
        (_match, specifier: string) => {
          if (
            specifier.startsWith("npm:") ||
            specifier.startsWith("jsr:") ||
            specifier.startsWith("http")
          ) {
            return _match;
          }
          const override = specifierOverrides[specifier];
          return override ? `from "${override}"` : `from "npm:${specifier}"`;
        }
      );
      if (rewritten !== content) {
        content = rewritten;
        changed = true;
      }

      if (changed) {
        writeFileSync(filePath, content);
        rewriteCount++;
      }
    }

    console.log(`  📝 Rewrote imports in ${rewriteCount} source files`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
