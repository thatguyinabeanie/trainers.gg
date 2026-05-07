/**
 * Scenario: 8-Player Swiss (3 rounds, no drops)
 *
 * A clean 8-player Swiss tournament with deterministic outcomes.
 * Strength order determines all match results.
 * No overrides — just a simple tournament from start to finish.
 */

import type { Scenario } from "../types";

const PASSWORD = "Password123!";

export const swiss8: Scenario = {
  config: {
    community: "vgc-league",
    name: "E2E Swiss 8 Player Test",
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

  // Strongest first: cynthia always wins, halliefay16 always loses
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

  overrides: [],

  // Note: exact standings depend on pairings (which are partially random
  // for round 1). These can be filled in after running once, or left empty
  // for initial development.
  assertions: [],
};
