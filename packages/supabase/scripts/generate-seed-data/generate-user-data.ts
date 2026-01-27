#!/usr/bin/env npx tsx
/**
 * Generate User Data (Faker → JSON)
 *
 * This script uses Faker.js to generate deterministic user data and saves it to
 * data/users.json. This is a ONE-TIME script - run it once to bake in the user
 * names, then the main generator reads from the JSON.
 *
 * Usage:
 *   pnpm generate-seed-json
 *
 * Output:
 *   packages/supabase/scripts/generate-seed-data/data/users.json
 */

import { faker } from "@faker-js/faker";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const SEED = 42; // Deterministic seed for Faker
const DEFAULT_PASSWORD = "Password123!";

// User counts
const STAFF_COUNT = 25;
const PLAYER_COUNT = 320;

// ============================================================================
// Types
// ============================================================================

interface UserData {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: "special" | "staff" | "player";
  birthDate: string;
  country: string;
}

interface UsersJson {
  generatedAt: string;
  seed: number;
  password: string;
  users: UserData[];
}

// ============================================================================
// Special Users (always included, deterministic IDs)
// ============================================================================

const SPECIAL_USERS: UserData[] = [
  {
    id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    email: "admin@trainers.local",
    username: "admin_trainer",
    firstName: "Admin",
    lastName: "Trainer",
    role: "special",
    birthDate: "1990-01-15",
    country: "US",
  },
  {
    id: "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
    email: "player@trainers.local",
    username: "ash_ketchum",
    firstName: "Ash",
    lastName: "Ketchum",
    role: "special",
    birthDate: "1997-05-22",
    country: "JP",
  },
  {
    id: "c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f",
    email: "champion@trainers.local",
    username: "cynthia",
    firstName: "Cynthia",
    lastName: "Shirona",
    role: "special",
    birthDate: "1988-07-10",
    country: "JP",
  },
  {
    id: "d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a",
    email: "gymleader@trainers.local",
    username: "brock",
    firstName: "Brock",
    lastName: "Harrison",
    role: "special",
    birthDate: "1995-11-03",
    country: "US",
  },
  {
    id: "e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b",
    email: "elite@trainers.local",
    username: "karen",
    firstName: "Karen",
    lastName: "Dark",
    role: "special",
    birthDate: "1992-08-18",
    country: "JP",
  },
  {
    id: "f6a7b8c9-d0e1-9f0a-3b4c-5d6e7f8a9b0c",
    email: "casual@trainers.local",
    username: "red",
    firstName: "Red",
    lastName: "Champion",
    role: "special",
    birthDate: "1996-02-27",
    country: "JP",
  },
  {
    id: "a7b8c9d0-e1f2-0a1b-4c5d-6e7f8a9b0c1d",
    email: "lance@trainers.local",
    username: "lance",
    firstName: "Lance",
    lastName: "Dragon",
    role: "special",
    birthDate: "1985-04-01",
    country: "JP",
  },
];

// ============================================================================
// UUID Generation (deterministic)
// ============================================================================

function generateDeterministicUUID(namespace: string, index: number): string {
  // Create a deterministic UUID based on namespace and index
  // This uses a simple hash approach for consistency
  const str = `${namespace}-${index}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  // Convert to positive and pad
  const hex = Math.abs(hash).toString(16).padStart(8, "0");

  // Create UUID v4-like format
  const part1 = hex.slice(0, 8);
  const part2 = faker.string
    .hexadecimal({ length: 4, casing: "lower" })
    .slice(2);
  const part3 = faker.string
    .hexadecimal({ length: 4, casing: "lower" })
    .slice(2);
  const part4 = faker.string
    .hexadecimal({ length: 4, casing: "lower" })
    .slice(2);
  const part5 = faker.string
    .hexadecimal({ length: 12, casing: "lower" })
    .slice(2);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

// ============================================================================
// Username Generation
// ============================================================================

const usedUsernames = new Set<string>();
const usedEmails = new Set<string>();

// Reserve special usernames
SPECIAL_USERS.forEach((u) => {
  usedUsernames.add(u.username.toLowerCase());
  usedEmails.add(u.email.toLowerCase());
});

function generateUniqueUsername(): string {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    // Mix of different username styles
    const style = faker.number.int({ min: 0, max: 4 });
    let username: string;

    switch (style) {
      case 0:
        // pokemon_trainer_123
        username = `${faker.word.adjective()}_trainer_${faker.number.int({ min: 1, max: 999 })}`;
        break;
      case 1:
        // FirstnameLastname99
        username = `${faker.person.firstName()}${faker.person.lastName()}${faker.number.int({ min: 10, max: 99 })}`;
        break;
      case 2:
        // cool_username
        username = faker.internet.username();
        break;
      case 3:
        // Pokemon-themed
        const pokemonWords = [
          "trainer",
          "master",
          "champion",
          "elite",
          "gym",
          "leader",
          "breeder",
          "ranger",
          "ace",
          "pro",
        ];
        username = `${faker.word.adjective()}_${pokemonWords[faker.number.int({ min: 0, max: pokemonWords.length - 1 })]}`;
        break;
      default:
        username = faker.internet.username();
    }

    // Clean username
    username = username
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 20);

    if (username.length >= 3 && !usedUsernames.has(username)) {
      usedUsernames.add(username);
      return username;
    }

    attempts++;
  }

  // Fallback with guaranteed unique suffix
  const fallback = `user_${Date.now()}_${faker.number.int({ min: 1000, max: 9999 })}`;
  usedUsernames.add(fallback);
  return fallback;
}

function generateUniqueEmail(username: string): string {
  const domains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "proton.me",
    "icloud.com",
  ];
  const domain = domains[faker.number.int({ min: 0, max: domains.length - 1 })];

  let email = `${username}@${domain}`;
  let suffix = 1;

  while (usedEmails.has(email.toLowerCase())) {
    email = `${username}${suffix}@${domain}`;
    suffix++;
  }

  usedEmails.add(email.toLowerCase());
  return email;
}

// ============================================================================
// Country Distribution
// ============================================================================

const COUNTRIES = [
  { code: "US", weight: 0.35 },
  { code: "JP", weight: 0.2 },
  { code: "GB", weight: 0.1 },
  { code: "DE", weight: 0.08 },
  { code: "CA", weight: 0.07 },
  { code: "AU", weight: 0.05 },
  { code: "FR", weight: 0.05 },
  { code: "ES", weight: 0.03 },
  { code: "IT", weight: 0.03 },
  { code: "BR", weight: 0.02 },
  { code: "MX", weight: 0.02 },
];

function selectCountry(): string {
  const roll = faker.number.float({ min: 0, max: 1 });
  let cumulative = 0;

  for (const country of COUNTRIES) {
    cumulative += country.weight;
    if (roll <= cumulative) {
      return country.code;
    }
  }

  return "US"; // fallback
}

// ============================================================================
// User Generation
// ============================================================================

function generateUser(
  namespace: string,
  index: number,
  role: "staff" | "player"
): UserData {
  const username = generateUniqueUsername();
  const email = generateUniqueEmail(username);
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const birthDate = faker.date
    .birthdate({ min: 18, max: 45, mode: "age" })
    .toISOString()
    .split("T")[0];
  const country = selectCountry();
  const id = generateDeterministicUUID(namespace, index);

  return {
    id,
    email,
    username,
    firstName,
    lastName,
    role,
    birthDate,
    country,
  };
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log("🎲 Generating user data with Faker.js...\n");

  // Set deterministic seed
  faker.seed(SEED);
  console.log(`  Seed: ${SEED}`);
  console.log(`  Special users: ${SPECIAL_USERS.length}`);
  console.log(`  Staff users: ${STAFF_COUNT}`);
  console.log(`  Player users: ${PLAYER_COUNT}`);
  console.log("");

  const users: UserData[] = [...SPECIAL_USERS];

  // Generate staff users
  console.log("👥 Generating staff users...");
  for (let i = 0; i < STAFF_COUNT; i++) {
    users.push(generateUser("staff", i, "staff"));
  }
  console.log(`  ✓ Generated ${STAFF_COUNT} staff users`);

  // Generate player users
  console.log("🎮 Generating player users...");
  for (let i = 0; i < PLAYER_COUNT; i++) {
    users.push(generateUser("player", i, "player"));
  }
  console.log(`  ✓ Generated ${PLAYER_COUNT} player users`);

  // Build output
  const output: UsersJson = {
    generatedAt: new Date().toISOString(),
    seed: SEED,
    password: DEFAULT_PASSWORD,
    users,
  };

  // Write to file
  const outputPath = join(__dirname, "data", "users.json");
  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n✅ Generated ${users.length} total users`);
  console.log(`📁 Output: ${outputPath}\n`);

  // Print sample
  console.log("📋 Sample users:");
  console.log("  Special:");
  SPECIAL_USERS.slice(0, 3).forEach((u) => {
    console.log(`    - ${u.username} (${u.email})`);
  });
  console.log("  Staff:");
  users
    .filter((u) => u.role === "staff")
    .slice(0, 3)
    .forEach((u) => {
      console.log(`    - ${u.username} (${u.email})`);
    });
  console.log("  Players:");
  users
    .filter((u) => u.role === "player")
    .slice(0, 3)
    .forEach((u) => {
      console.log(`    - ${u.username} (${u.email})`);
    });
}

main();
