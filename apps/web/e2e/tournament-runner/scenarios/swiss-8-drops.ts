/**
 * Scenario: 8-Player Swiss with Drops (3 rounds)
 *
 * Tests edge cases:
 * - Player drops after round 1
 * - Player no-shows in round 3
 * - One forced upset (weaker player wins)
 */

import type { Scenario } from "../types";

const PASSWORD = "Password123!";

export const swiss8Drops: Scenario = {
  config: {
    community: "vgc-league",
    name: "E2E Swiss 8 Player Drops Test",
    format: "swiss_only",
    bestOf: 3,
    rounds: 3,
  },

  host: {
    email: "admin@trainers.local",
    password: PASSWORD,
    username: "admin_trainer",
  },

  players: [
    { email: "champion@trainers.local", password: PASSWORD, username: "cynthia" },
    { email: "gymleader@trainers.local", password: PASSWORD, username: "brock" },
    { email: "elite@trainers.local", password: PASSWORD, username: "karen" },
    { email: "casual@trainers.local", password: PASSWORD, username: "red" },
    { email: "lance@trainers.local", password: PASSWORD, username: "lance" },
    { email: "valentinemiller24@trainers.local", password: PASSWORD, username: "valentinemiller24" },
    { email: "ellis_paucek@trainers.local", password: PASSWORD, username: "ellis_paucek" },
    { email: "halliefay16@trainers.local", password: PASSWORD, username: "halliefay16" },
  ],

  strengthOrder: [
    "cynthia",
    "lance",
    "karen",
    "brock",
    "red",
    "valentinemiller24",
    "ellis_paucek",
    "halliefay16",
  ],

  overrides: [
    // halliefay16 drops after round 1 (weakest player gives up)
    { round: 2, player: "halliefay16", outcome: "drop" },
    // ellis_paucek no-shows in round 3 (connection issues)
    { round: 3, player: "ellis_paucek", outcome: "no-show" },
    // Upset: red beats lance in round 2 (forced win for weaker player)
    { round: 2, player: "red", outcome: "win" },
  ],

  assertions: [],
};
