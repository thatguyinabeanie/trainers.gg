#!/usr/bin/env node
/**
 * AT Protocol OAuth Key Generator
 *
 * Standalone script that generates OAuth credentials for local development:
 * 1. Generates ES256 key pair for JWT signing
 * 2. Creates JWKS file (public key JSON) at apps/web/public/oauth/jwks.json
 * 3. Updates .env.local with the private key
 *
 * Unlike infra/pds/scripts/setup-oauth.mjs, this script:
 * - Does NOT depend on ngrok running (reads NEXT_PUBLIC_SITE_URL from .env.local)
 * - Can run at postinstall time (no network, no Docker)
 * - Is idempotent (skips if credentials already exist)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicKey, generateKeyPairSync } from "node:crypto";
import { exportJWK } from "jose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const ENV_FILE = join(ROOT_DIR, ".env.local");
const JWKS_DIR = join(ROOT_DIR, "apps/web/public/oauth");
const JWKS_FILE = join(JWKS_DIR, "jwks.json");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(msg, color = colors.reset) {
  console.log(`${color}[OAuth]${colors.reset} ${msg}`);
}

function logError(msg) {
  log(msg, colors.red);
}

function logSuccess(msg) {
  log(msg, colors.green);
}

function logInfo(msg) {
  log(msg, colors.blue);
}

/**
 * Check if OAuth keys are already fully configured
 */
function isFullyConfigured() {
  if (!existsSync(ENV_FILE) || !existsSync(JWKS_FILE)) {
    return false;
  }

  const envContent = readFileSync(ENV_FILE, "utf-8");
  // Check that ATPROTO_PRIVATE_KEY has an actual value (not empty)
  const keyMatch = envContent.match(/^ATPROTO_PRIVATE_KEY=(.+)$/m);
  return keyMatch && keyMatch[1].trim().length > 0;
}

/**
 * Generate ES256 key pair and JWKS
 */
async function generateKeys() {
  logInfo("Generating ES256 key pair...");

  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1", // P-256 curve for ES256
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  // Convert PEM to KeyObject for jose
  const publicKeyObject = createPublicKey(publicKey);

  // Convert public key to JWK using jose library
  const publicJwk = await exportJWK(publicKeyObject);

  // Add required fields for JWKS
  const jwk = {
    ...publicJwk,
    kid: "key-1",
    use: "sig",
    alg: "ES256",
  };

  return {
    privatePem: privateKey,
    jwk,
  };
}

/**
 * Create JWKS file at apps/web/public/oauth/jwks.json
 */
function createJwksFile(jwk) {
  if (!existsSync(JWKS_DIR)) {
    mkdirSync(JWKS_DIR, { recursive: true });
  }

  const jwks = { keys: [jwk] };
  writeFileSync(JWKS_FILE, JSON.stringify(jwks, null, 2));
  logSuccess(`Created JWKS file at ${JWKS_FILE}`);
}

/**
 * Update .env.local with the private key
 */
function updateEnvFile(privatePem) {
  if (!existsSync(ENV_FILE)) {
    logError(".env.local does not exist. Run postinstall.sh first.");
    return false;
  }

  let envContent = readFileSync(ENV_FILE, "utf-8");

  // Escape newlines in private key for .env format
  const escapedKey = privatePem.replace(/\n/g, "\\n");

  // Replace the ATPROTO_PRIVATE_KEY line (which postinstall.sh created empty)
  envContent = envContent.replace(
    /^ATPROTO_PRIVATE_KEY=.*$/m,
    `ATPROTO_PRIVATE_KEY="${escapedKey}"`
  );

  writeFileSync(ENV_FILE, envContent);
  logSuccess("Updated .env.local with ATPROTO_PRIVATE_KEY");
  return true;
}

/**
 * Main
 */
async function main() {
  // Check if already configured
  if (isFullyConfigured()) {
    logSuccess("OAuth keys already configured, skipping");
    return 0;
  }

  // Generate keys
  const keys = await generateKeys();

  // Create JWKS file
  createJwksFile(keys.jwk);

  // Update .env.local with private key
  if (!updateEnvFile(keys.privatePem)) {
    return 1;
  }

  logSuccess("OAuth credentials configured");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
