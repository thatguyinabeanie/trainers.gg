/**
 * User Generator
 *
 * Reads users from pre-generated data/users.json and generates alts deterministically.
 * The users.json file is created by running generate-user-data.ts (uses Faker.js).
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { SEED_CONFIG } from "../config.js";
import {
  createSeededRandom,
  deterministicInt,
} from "../utils/deterministic.js";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface UserJsonData {
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
  users: UserJsonData[];
}

export interface GeneratedUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  country: string;
  isStaff: boolean;
  isSpecial: boolean;
}

export interface GeneratedAlt {
  id: number;
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  tier: "free" | "player_pro";
  isPrimary: boolean;
}

// ============================================================================
// Load Users from JSON
// ============================================================================

let _usersCache: UsersJson | null = null;

function loadUsersJson(): UsersJson {
  if (_usersCache) return _usersCache;

  const jsonPath = join(__dirname, "..", "data", "users.json");

  try {
    const content = readFileSync(jsonPath, "utf-8");
    _usersCache = JSON.parse(content) as UsersJson;
    return _usersCache;
  } catch {
    throw new Error(
      `Failed to load users.json from ${jsonPath}. ` +
        `Run 'pnpm generate-seed-json' first to create the file.`
    );
  }
}

/**
 * Get the password for all seed users
 */
export function getSeedPassword(): string {
  const data = loadUsersJson();
  return data.password;
}

// ============================================================================
// Generate Users
// ============================================================================

/**
 * Generate all users from JSON data
 */
export function generateUsers(): GeneratedUser[] {
  const data = loadUsersJson();

  return data.users.map((user) => ({
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    birthDate: user.birthDate,
    country: user.country,
    isStaff: user.role === "staff",
    isSpecial: user.role === "special",
  }));
}

/**
 * Get special users (admin, ash, cynthia, etc.)
 */
export function getSpecialUsers(): GeneratedUser[] {
  return generateUsers().filter((u) => u.isSpecial);
}

/**
 * Get staff users (non-special, staff role)
 */
export function getStaffUsers(): GeneratedUser[] {
  return generateUsers().filter((u) => u.isStaff && !u.isSpecial);
}

/**
 * Get player users (non-special, non-staff)
 */
export function getPlayerUsers(): GeneratedUser[] {
  return generateUsers().filter((u) => !u.isStaff && !u.isSpecial);
}

// ============================================================================
// Generate Alts
// ============================================================================

/**
 * Generate alts for all users
 */
export function generateAlts(users: GeneratedUser[]): GeneratedAlt[] {
  const alts: GeneratedAlt[] = [];
  let altId = 1;

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const user = users[userIndex]!;
    const altCount = getAltCount(userIndex);

    for (let altIndex = 0; altIndex < altCount; altIndex++) {
      const isPrimary = altIndex === 0;
      alts.push({
        id: altId++,
        userId: user.id,
        username: generateAltUsername(user.username, altIndex),
        displayName: generateAltDisplayName(
          user.firstName,
          user.lastName,
          altIndex
        ),
        bio: generateAltBio(userIndex, altIndex),
        tier: isPrimary && user.isStaff ? "player_pro" : "free",
        isPrimary,
      });
    }
  }

  return alts;
}

/**
 * Determine number of alts for a user (2-5)
 */
function getAltCount(userIndex: number): number {
  return deterministicInt(
    SEED_CONFIG.MIN_ALTS_PER_USER,
    SEED_CONFIG.MAX_ALTS_PER_USER,
    `alt-count-${userIndex}`
  );
}

/**
 * Generate alt username
 */
function generateAltUsername(baseUsername: string, altIndex: number): string {
  if (altIndex === 0) return baseUsername;

  const suffixes = ["_vgc", "_draft", "_anon", "_alt", "_2"];
  return `${baseUsername}${suffixes[altIndex - 1] || `_${altIndex}`}`;
}

/**
 * Generate alt display name
 */
function generateAltDisplayName(
  firstName: string,
  lastName: string,
  altIndex: number
): string {
  if (altIndex === 0) return `${firstName} ${lastName.charAt(0)}.`;

  const variations = [
    `${firstName} (VGC)`,
    `${firstName} Draft`,
    "Anonymous Trainer",
    `${firstName.charAt(0)}${lastName}`,
  ];
  return variations[altIndex - 1] || `${firstName} Alt`;
}

/**
 * Generate alt bio (generic, no Faker)
 */
function generateAltBio(userIndex: number, altIndex: number): string {
  // Generic bios - no Faker-generated content
  const bios = [
    "Competitive Pokemon player",
    "Training hard every day!",
    "VGC enthusiast",
    "Draft league player",
    "Looking for practice partners",
    "Always learning",
    "Pokemon trainer",
    "",
  ];

  const random = createSeededRandom(`bio-${userIndex}-${altIndex}`);
  const index = Math.floor(random() * bios.length);
  return bios[index] || "";
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user by username
 */
export function getUserByUsername(
  users: GeneratedUser[],
  username: string
): GeneratedUser | undefined {
  return users.find((u) => u.username === username);
}

/**
 * Get user by ID
 */
export function getUserById(
  users: GeneratedUser[],
  id: string
): GeneratedUser | undefined {
  return users.find((u) => u.id === id);
}

/**
 * Get alt by user ID (primary alt)
 */
export function getPrimaryAlt(
  alts: GeneratedAlt[],
  userId: string
): GeneratedAlt | undefined {
  return alts.find((a) => a.userId === userId && a.isPrimary);
}

/**
 * Get all alts for a user
 */
export function getAltsForUser(
  alts: GeneratedAlt[],
  userId: string
): GeneratedAlt[] {
  return alts.filter((a) => a.userId === userId);
}
