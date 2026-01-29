#!/usr/bin/env node
/**
 * Production JWKS Generation Script
 *
 * Generates JWKS file from ATPROTO_PRIVATE_KEY environment variable
 * during Vercel builds. This allows the OAuth client metadata endpoint
 * to serve the public key for JWT verification.
 *
 * If ATPROTO_PRIVATE_KEY is not set, this script will skip generation
 * (OAuth will be disabled but the app will still build).
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicKey, createPrivateKey } from "node:crypto";
import { exportJWK } from "jose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "../public");
const OAUTH_DIR = join(PUBLIC_DIR, "oauth");
const JWKS_FILE = join(OAUTH_DIR, "jwks.json");

/**
 * Convert PEM private key to JWK using jose library
 */
async function pemToJwk(privatePem) {
  try {
    // Create a KeyObject from the private key PEM
    const privateKeyObject = createPrivateKey(privatePem);

    // Extract public key from private key
    const publicKeyObject = createPublicKey(privateKeyObject);

    // Convert public key to JWK
    const publicJwk = await exportJWK(publicKeyObject);

    // Add required fields for JWKS
    return {
      ...publicJwk,
      kid: "key-1",
      use: "sig",
      alg: "ES256",
    };
  } catch (error) {
    throw new Error(`Failed to parse private key: ${error.message}`);
  }
}

/**
 * Main generation function
 */
async function main() {
  console.log("🔐 Checking for OAuth configuration...");

  // Check if ATPROTO_PRIVATE_KEY is set
  const privateKey = process.env.ATPROTO_PRIVATE_KEY;
  if (!privateKey) {
    console.log("⚠️  ATPROTO_PRIVATE_KEY not set, skipping JWKS generation");
    console.log("   Bluesky OAuth will be disabled for this deployment");
    return 0;
  }

  console.log("🔑 Generating JWKS from private key...");

  try {
    // Unescape newlines and remove quotes (they may be escaped in .env)
    let pemKey = privateKey.replace(/\\n/g, "\n");

    // Remove surrounding quotes if present
    if (pemKey.startsWith('"') && pemKey.endsWith('"')) {
      pemKey = pemKey.slice(1, -1);
    }

    // Unescape again in case of double escaping
    pemKey = pemKey.replace(/\\n/g, "\n");

    // Convert to JWK
    const jwk = await pemToJwk(pemKey);

    // Create JWKS structure
    const jwks = {
      keys: [jwk],
    };

    // Ensure oauth directory exists
    if (!existsSync(OAUTH_DIR)) {
      mkdirSync(OAUTH_DIR, { recursive: true });
    }

    // Write JWKS file
    writeFileSync(JWKS_FILE, JSON.stringify(jwks, null, 2));

    console.log("✅ JWKS generated successfully");
    console.log(`   File: ${JWKS_FILE}`);
    console.log(
      "   Public key will be available at /oauth/jwks.json"
    );

    return 0;
  } catch (error) {
    console.error("❌ Failed to generate JWKS:", error.message);
    console.error(error.stack);
    console.log("");
    console.log("⚠️  Build will continue, but Bluesky OAuth will not work");
    console.log("   Check that ATPROTO_PRIVATE_KEY is a valid ES256 private key");
    return 0; // Don't fail the build
  }
}

// Run main and exit with appropriate code
main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("❌ Unexpected error:", error.message);
    console.error(error.stack);
    process.exit(1);
  });
