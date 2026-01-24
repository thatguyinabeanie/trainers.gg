#!/usr/bin/env node

/**
 * Generate AT Protocol OAuth Keys
 *
 * This script generates a new ES256 keypair for AT Protocol OAuth authentication.
 * It outputs:
 * - Updated jwks.json (public key) for apps/web/public/oauth/
 * - Private key PEM for ATPROTO_PRIVATE_KEY environment variable
 *
 * Usage:
 *   node apps/web/scripts/generate-atproto-keys.cjs
 *   node apps/web/scripts/generate-atproto-keys.cjs --update  # Also updates jwks.json
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Generate ES256 keypair
const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
  namedCurve: "P-256",
});

// Export as JWK
const privateJwk = privateKey.export({ format: "jwk" });
const publicJwk = {
  kty: privateJwk.kty,
  crv: privateJwk.crv,
  x: privateJwk.x,
  y: privateJwk.y,
  kid: "key-1",
  use: "sig",
  alg: "ES256",
};

// Export private key as PEM
const privatePem = privateKey.export({ type: "sec1", format: "pem" });

// JWKS structure
const jwks = {
  keys: [publicJwk],
};

console.log("=".repeat(70));
console.log("AT Protocol OAuth Key Generation");
console.log("=".repeat(70));
console.log("");

// Check for --update flag
const shouldUpdate = process.argv.includes("--update");

if (shouldUpdate) {
  const jwksPath = path.join(__dirname, "..", "public", "oauth", "jwks.json");
  fs.writeFileSync(jwksPath, JSON.stringify(jwks, null, 2) + "\n");
  console.log("Updated: apps/web/public/oauth/jwks.json");
  console.log("");
}

console.log("JWKS (public key for jwks.json):");
console.log("-".repeat(70));
console.log(JSON.stringify(jwks, null, 2));
console.log("");

console.log("Private Key (for ATPROTO_PRIVATE_KEY environment variable):");
console.log("-".repeat(70));
console.log(privatePem);

console.log("Setup Instructions:");
console.log("-".repeat(70));
console.log("");
console.log("1. For Vercel, add this environment variable:");
console.log("");
console.log(
  '   ATPROTO_PRIVATE_KEY="' + privatePem.trim().replace(/\n/g, "\\n") + '"'
);
console.log("");
console.log("2. If you haven't already, run with --update to save jwks.json:");
console.log("");
console.log("   node apps/web/scripts/generate-atproto-keys.cjs --update");
console.log("");
console.log("3. Commit the updated jwks.json and deploy to Vercel");
console.log("");
console.log("=".repeat(70));
