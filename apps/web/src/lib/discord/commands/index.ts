/**
 * Command barrel — imports all command files for side-effect registration.
 *
 * Each command file calls `registerCommand(...)` at module scope so that
 * importing it here is sufficient to register it in the global registry.
 */

// Register all commands by importing for side effects.
import "./tournament";
import "./standings";
import "./pairings";
import "./events";
import "./player";
import "./team";
import "./leaderboard";
import "./drop";
import "./link";
import "./setchannel";
import "./unsetchannel";
import "./channels";
import "./help";

export { commandRegistry, registerCommand } from "./registry";

export type {
  CommandContext,
  CommandHandler,
  AutocompleteContext,
  AutocompleteHandler,
  CommandDefinition,
} from "./registry";

// Re-export shared helpers for tests and other consumers
export { resolveTournament } from "./shared/resolve-tournament";
export type { ResolveTournamentResult } from "./shared/resolve-tournament";
export { requireLinkedAccount } from "./shared/require-linked-account";
export type { RequireLinkedAccountResult } from "./shared/require-linked-account";
export { requireCommunityLeader } from "./shared/require-community-leader";
export type { RequireCommunityLeaderResult } from "./shared/require-community-leader";
export { SITE_URL } from "./shared/site-url";
