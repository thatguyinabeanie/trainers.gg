#!/usr/bin/env node
/**
 * AT Protocol OAuth Setup Script
 *
 * Automatically generates OAuth credentials for local development:
 * 1. Generates ES256 key pair for JWT signing
 * 2. Creates JWKS file (public key JSON)
 * 3. Updates .env.local with private key and site URL
 *
 * This script is idempotent - it will skip generation if credentials already exist.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicKey, generateKeyPairSync } from "node:crypto";
import { exportJWK } from "jose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");
const PDS_DIR = join(__dirname, "..");
const WEB_APP_DIR = join(REPO_ROOT, "apps/web");
const ENV_FILE = join(REPO_ROOT, ".env.local");
const JWKS_DIR = join(WEB_APP_DIR, "public/oauth");
const JWKS_FILE = join(JWKS_DIR, "jwks.json");
const NGROK_URL_FILE = join(PDS_DIR, ".ngrok-url");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(msg, color = colors.reset) {
  console.log(`${color}🔐 [OAuth]${colors.reset} ${msg}`);
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
 * Check if OAuth is already configured
 */
function isOAuthConfigured() {
  if (!existsSync(ENV_FILE)) {
    return false;
  }

  const envContent = readFileSync(ENV_FILE, "utf-8");
  return (
    envContent.includes("ATPROTO_PRIVATE_KEY=") &&
    envContent.includes("NEXT_PUBLIC_SITE_URL=")
  );
}

/**
 * Get ngrok URL from file
 */
function getNgrokUrl() {
  if (!existsSync(NGROK_URL_FILE)) {
    logError("ngrok URL file not found. Please start PDS first.");
    return null;
  }

  const url = readFileSync(NGROK_URL_FILE, "utf-8").trim();
  if (!url || !url.startsWith("https://")) {
    logError(`Invalid ngrok URL: ${url}`);
    return null;
  }

  return url;
}

/**
 * Generate ES256 key pair and JWKS
 */
async function generateKeys() {
  logInfo("Generating ES256 key pair...");

  try {
    // Generate ES256 key pair using Node's built-in crypto
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
  } catch (error) {
    logError(`Failed to generate keys: ${error.message}`);
    console.error(error);
    return null;
  }
}

/**
 * Create JWKS file
 */
function createJwksFile(jwk) {
  try {
    // Create directory if it doesn't exist
    if (!existsSync(JWKS_DIR)) {
      mkdirSync(JWKS_DIR, { recursive: true });
    }

    // Write JWKS file
    const jwks = {
      keys: [jwk],
    };

    writeFileSync(JWKS_FILE, JSON.stringify(jwks, null, 2));
    logSuccess(`Created JWKS file at ${JWKS_FILE}`);
    return true;
  } catch (error) {
    logError(`Failed to create JWKS file: ${error.message}`);
    return false;
  }
}

/**
 * Update .env.local with OAuth credentials
 */
function updateEnvFile(privatePem, siteUrl) {
  try {
    let envContent = "";

    // Read existing .env.local if it exists
    if (existsSync(ENV_FILE)) {
      envContent = readFileSync(ENV_FILE, "utf-8");
    }

    // Escape newlines in private key for .env format
    const escapedKey = privatePem.replace(/\n/g, "\\n");

    // Prepare OAuth section
    const oauthSection = `
# AT Protocol / Bluesky OAuth (auto-generated)
ATPROTO_PRIVATE_KEY="${escapedKey}"
NEXT_PUBLIC_SITE_URL=${siteUrl}
`;

    // Remove existing OAuth section if present
    envContent = envContent.replace(
      /# AT Protocol \/ Bluesky OAuth.*\nATPROTO_PRIVATE_KEY=.*\nNEXT_PUBLIC_SITE_URL=.*\n/s,
      ""
    );

    // Append new OAuth section
    envContent = envContent.trim() + "\n" + oauthSection;

    // Write back to file
    writeFileSync(ENV_FILE, envContent);
    logSuccess(`Updated ${ENV_FILE} with OAuth credentials`);
    return true;
  } catch (error) {
    logError(`Failed to update .env.local: ${error.message}`);
    return false;
  }
}

/**
 * Main setup function
 */
async function main() {
  logInfo("Setting up AT Protocol OAuth credentials...");

  // Check if already configured
  if (isOAuthConfigured()) {
    logSuccess("OAuth already configured, skipping generation");
    return 0;
  }

  // Get ngrok URL
  const ngrokUrl = getNgrokUrl();
  if (!ngrokUrl) {
    logError("Cannot setup OAuth without ngrok URL");
    return 1;
  }

  logInfo(`Using site URL: ${ngrokUrl}`);

  // Generate keys
  const keys = await generateKeys();
  if (!keys) {
    logError("Failed to generate OAuth keys");
    return 1;
  }

  // Create JWKS file
  if (!createJwksFile(keys.jwk)) {
    logError("Failed to create JWKS file");
    return 1;
  }

  // Update .env.local
  if (!updateEnvFile(keys.privatePem, ngrokUrl)) {
    logError("Failed to update .env.local");
    return 1;
  }

  console.log("");
  logSuccess("OAuth credentials configured successfully!");
  console.log("");
  logInfo(`Site URL: ${ngrokUrl}`);
  logInfo(`JWKS available at: ${ngrokUrl}/oauth/jwks.json`);
  logInfo("Bluesky login should now work in your local app");
  console.log("");

  return 0;
}

// Run main and exit with appropriate code
main()
  .then((code) => process.exit(code))
  .catch((error) => {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
