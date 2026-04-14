/**
 * Command barrel — imports all command files for side-effect registration.
 *
 * Phase 3c will populate this file with imports like:
 *   import "./tournament";
 *   import "./standings";
 *   import "./team";
 *   etc.
 *
 * Each command file calls `registerCommand(...)` at module scope so that
 * importing it here is sufficient to register it in the global registry.
 */

// Phase 3c: add command imports here

export { commandRegistry, registerCommand } from "./registry";

export type {
  CommandContext,
  CommandHandler,
  AutocompleteContext,
  AutocompleteHandler,
  CommandDefinition,
} from "./registry";
