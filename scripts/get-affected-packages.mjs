#!/usr/bin/env node

/**
 * Detects which workspace packages have staged files
 * Used by pre-commit hook to run typecheck only on affected packages
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

async function main() {
  try {
    // Get list of staged files using execFile (safer than exec)
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "--cached", "--name-only"],
      { cwd: rootDir }
    );

    const stagedFiles = stdout.trim().split("\n").filter(Boolean);

    if (stagedFiles.length === 0) {
      process.exit(0);
    }

    // Read pnpm-workspace.yaml to get workspace patterns
    const workspaceYaml = await readFile(
      resolve(rootDir, "pnpm-workspace.yaml"),
      "utf-8"
    );

    const workspacePatterns =
      workspaceYaml
        .match(/packages:\s*\n([\s\S]*?)(?:\n\S|$)/)?.[1]
        .split("\n")
        .map((line) =>
          line.trim().replace(/^-\s*['"]?/, "").replace(/['"]?$/, "")
        )
        .filter(Boolean) || [];

    // Convert glob patterns to regex
    const workspaceRegexes = workspacePatterns.map((pattern) => {
      const regexStr = pattern
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\//g, "\\/");
      return new RegExp(`^${regexStr}`);
    });

    // Map staged files to workspace packages
    const affectedPackages = new Set();

    for (const file of stagedFiles) {
      for (const regex of workspaceRegexes) {
        if (regex.test(file)) {
          // Extract package path (e.g., "apps/web" from "apps/web/src/file.ts")
          const match = file.match(/^([^/]+\/[^/]+)/);
          if (match) {
            const pkgPath = match[1];
            try {
              // Read package.json to get package name
              const pkgJson = JSON.parse(
                await readFile(resolve(rootDir, pkgPath, "package.json"), "utf-8")
              );
              if (pkgJson.name) {
                affectedPackages.add(pkgJson.name);
              }
            } catch {
              // Skip if package.json doesn't exist or can't be read
            }
          }
          break;
        }
      }
    }

    // Output as space-separated list for Turbo --filter flags
    const packages = Array.from(affectedPackages);
    if (packages.length > 0) {
      console.log(packages.join(" "));
    }
  } catch (error) {
    console.error("Error detecting affected packages:", error.message);
    process.exit(1);
  }
}

main();
