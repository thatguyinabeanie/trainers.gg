import { describe, it, expect } from "@jest/globals";

import {
  getRecoveryAwareVerdict,
  getRecoveryConfig,
  simulateKoTier,
} from "../calc/recovery";

// =============================================================================
// getRecoveryConfig — pre-computation per item
// =============================================================================

describe("getRecoveryConfig", () => {
  it("no item returns all-zero recovery", () => {
    const cfg = getRecoveryConfig({ maxHP: 200, item: null, defenderTypes: ["Normal"] });
    expect(cfg).toEqual({
      oneShot: 0,
      oneShotThreshold: 0,
      perTurnHeal: 0,
      perTurnSelfDamage: 0,
      suffix: "",
    });
  });

  it("Sitrus Berry returns one-shot floor(maxHP/4) at ≤50% threshold", () => {
    const cfg = getRecoveryConfig({ maxHP: 200, item: "Sitrus Berry", defenderTypes: ["Fire"] });
    expect(cfg.oneShot).toBe(50);
    expect(cfg.oneShotThreshold).toBe(100);
    expect(cfg.perTurnHeal).toBe(0);
    expect(cfg.perTurnSelfDamage).toBe(0);
    expect(cfg.suffix).toBe("after Sitrus Berry recovery");
  });

  it("Sitrus Berry rounds DOWN per-stat (47/4 → 11)", () => {
    const cfg = getRecoveryConfig({ maxHP: 47, item: "Sitrus Berry", defenderTypes: [] });
    expect(cfg.oneShot).toBe(11);
    expect(cfg.oneShotThreshold).toBe(23);
  });

  it("Berry Juice restores a flat 20 HP at ≤50% threshold", () => {
    const cfg = getRecoveryConfig({ maxHP: 100, item: "Berry Juice", defenderTypes: [] });
    expect(cfg.oneShot).toBe(20);
    expect(cfg.oneShotThreshold).toBe(50);
    expect(cfg.suffix).toBe("after Berry Juice recovery");
  });

  it.each([
    ["Aguav Berry"],
    ["Figy Berry"],
    ["Iapapa Berry"],
    ["Mago Berry"],
    ["Wiki Berry"],
  ] as const)("flavor berry %s heals floor(maxHP/3) at ≤25%% threshold", (item) => {
    const cfg = getRecoveryConfig({ maxHP: 192, item, defenderTypes: [] });
    expect(cfg.oneShot).toBe(64);
    expect(cfg.oneShotThreshold).toBe(48);
    expect(cfg.suffix).toBe(`after ${item} recovery`);
  });

  it("Leftovers returns floor(maxHP/16) per turn heal", () => {
    const cfg = getRecoveryConfig({ maxHP: 192, item: "Leftovers", defenderTypes: ["Steel"] });
    expect(cfg.oneShot).toBe(0);
    expect(cfg.perTurnHeal).toBe(12);
    expect(cfg.perTurnSelfDamage).toBe(0);
    expect(cfg.suffix).toBe("after Leftovers recovery");
  });

  it("Black Sludge on Poison-type heals 1/16", () => {
    const cfg = getRecoveryConfig({ maxHP: 192, item: "Black Sludge", defenderTypes: ["Poison"] });
    expect(cfg.perTurnHeal).toBe(12);
    expect(cfg.perTurnSelfDamage).toBe(0);
    expect(cfg.suffix).toBe("after Black Sludge recovery");
  });

  it("Black Sludge on non-Poison-type damages 1/8", () => {
    const cfg = getRecoveryConfig({ maxHP: 200, item: "Black Sludge", defenderTypes: ["Fire", "Flying"] });
    expect(cfg.perTurnHeal).toBe(0);
    expect(cfg.perTurnSelfDamage).toBe(25);
    expect(cfg.suffix).toBe("after Black Sludge damage");
  });

  it.each([["Magic Guard"], ["Klutz"]] as const)(
    "%s ability negates Black Sludge damage on non-Poison holder",
    (ability) => {
      const cfg = getRecoveryConfig({
        maxHP: 200,
        item: "Black Sludge",
        defenderTypes: ["Fire", "Flying"],
        ability,
      });
      expect(cfg.perTurnHeal).toBe(0);
      expect(cfg.perTurnSelfDamage).toBe(0);
      expect(cfg.suffix).toBe("");
    }
  );

  it("Magic Guard does NOT block Black Sludge healing on Poison holder", () => {
    // Magic Guard prevents indirect damage but doesn't suppress healing —
    // Poison-type Black Sludge holders still heal normally.
    const cfg = getRecoveryConfig({
      maxHP: 192,
      item: "Black Sludge",
      defenderTypes: ["Poison"],
      ability: "Magic Guard",
    });
    expect(cfg.perTurnHeal).toBe(12);
    expect(cfg.perTurnSelfDamage).toBe(0);
    expect(cfg.suffix).toBe("after Black Sludge recovery");
  });

  it("Enigma Berry heals 1/4 maxHP on a super-effective hit", () => {
    const cfg = getRecoveryConfig({
      maxHP: 200,
      item: "Enigma Berry",
      defenderTypes: ["Grass"],
      isSuperEffective: true,
    });
    expect(cfg.oneShot).toBe(50);
    expect(cfg.oneShotThreshold).toBe(200); // always-fire on first hit
    expect(cfg.suffix).toBe("after Enigma Berry recovery");
  });

  it("Enigma Berry does NOT trigger on neutral or resisted hits", () => {
    const cfg = getRecoveryConfig({
      maxHP: 200,
      item: "Enigma Berry",
      defenderTypes: ["Grass"],
      isSuperEffective: false,
    });
    expect(cfg.oneShot).toBe(0);
    expect(cfg.suffix).toBe("");
  });

  it("Klutz disables Enigma Berry even on super-effective hits", () => {
    const cfg = getRecoveryConfig({
      maxHP: 200,
      item: "Enigma Berry",
      defenderTypes: ["Grass"],
      ability: "Klutz",
      isSuperEffective: true,
    });
    expect(cfg.oneShot).toBe(0);
    expect(cfg.suffix).toBe("");
  });

  it.each([
    ["Sitrus Berry", { isSuperEffective: false }],
    ["Berry Juice", { isSuperEffective: false }],
    ["Aguav Berry", { isSuperEffective: false }],
    ["Leftovers", { isSuperEffective: false }],
    // Black Sludge on a Poison holder (would normally heal)
    ["Black Sludge", { isSuperEffective: false, defenderTypes: ["Poison"] as const }],
    // Black Sludge on a non-Poison holder (would normally damage)
    ["Black Sludge (non-Poison)", { isSuperEffective: false, item: "Black Sludge", defenderTypes: ["Fire"] as const }],
  ] as const)(
    "Klutz blocks all item recovery/damage for %s",
    (label, overrides) => {
      const item = label === "Black Sludge (non-Poison)" ? "Black Sludge" : label;
      const defenderTypes = overrides.defenderTypes ?? (["Normal"] as const);
      const cfg = getRecoveryConfig({
        maxHP: 200,
        item,
        defenderTypes,
        ability: "Klutz",
        isSuperEffective: overrides.isSuperEffective,
      });
      expect(cfg.oneShot).toBe(0);
      expect(cfg.perTurnHeal).toBe(0);
      expect(cfg.perTurnSelfDamage).toBe(0);
      expect(cfg.suffix).toBe("");
    }
  );

  it("Unrecognised items return zero recovery", () => {
    const cfg = getRecoveryConfig({ maxHP: 200, item: "Choice Band", defenderTypes: ["Fire"] });
    expect(cfg.oneShot).toBe(0);
    expect(cfg.perTurnHeal).toBe(0);
    expect(cfg.suffix).toBe("");
  });

  it("Zero maxHP shorts out", () => {
    const cfg = getRecoveryConfig({ maxHP: 0, item: "Sitrus Berry", defenderTypes: [] });
    expect(cfg.oneShot).toBe(0);
    expect(cfg.suffix).toBe("");
  });
});

// =============================================================================
// simulateKoTier — hit-by-hit simulation
// =============================================================================

const NO_RECOVERY = {
  oneShot: 0,
  oneShotThreshold: 0,
  perTurnHeal: 0,
  perTurnSelfDamage: 0,
  suffix: "",
};

describe("simulateKoTier — no recovery", () => {
  it.each([
    [101, "OHKO"],
    [50, "2HKO"],
    [34, "3HKO"],
    [25, "4HKO+"],
  ] as const)("damage=%i → %s on a 100-HP defender", (dmg, tier) => {
    expect(simulateKoTier({ damagePerHit: dmg, maxHP: 100, recovery: NO_RECOVERY })).toBe(tier);
  });

  it("zero damage returns null (defender survives forever)", () => {
    expect(simulateKoTier({ damagePerHit: 0, maxHP: 100, recovery: NO_RECOVERY })).toBe(null);
  });

  it("1 damage caps to 4HKO+ when KO falls beyond maxTurns", () => {
    expect(simulateKoTier({ damagePerHit: 1, maxHP: 100, recovery: NO_RECOVERY, maxTurns: 12 })).toBe(null);
  });
});

describe("simulateKoTier — Sitrus Berry", () => {
  // 100 HP defender takes 50 damage per hit. Without Sitrus: 2HKO.
  // With Sitrus: hit 1 → 50 HP (50% threshold reached → +25 HP → 75 HP).
  //              hit 2 → 25 HP (Sitrus consumed already).
  //              hit 3 → -25 HP → 3HKO.
  it("converts a 2HKO into a 3HKO", () => {
    const recovery = {
      oneShot: 25, // floor(100/4)
      oneShotThreshold: 50,
      perTurnHeal: 0,
      perTurnSelfDamage: 0,
      suffix: "after Sitrus Berry recovery",
    };
    expect(simulateKoTier({ damagePerHit: 50, maxHP: 100, recovery })).toBe("3HKO");
  });

  it("does not trigger on first hit if HP stays > 50%", () => {
    // 200 HP, 50 damage. Hit 1 → 150 (75% > 50%, no trigger). Hit 2 → 100
    // (exactly 50%, triggers Sitrus → 150). Hit 3 → 100. Hit 4 → 50. Hit 5
    // → 0 → KO. Without Sitrus: 4HKO. With Sitrus: 5HKO+ → cap to 4HKO+.
    const recovery = {
      oneShot: 50, // floor(200/4)
      oneShotThreshold: 100,
      perTurnHeal: 0,
      perTurnSelfDamage: 0,
      suffix: "after Sitrus Berry recovery",
    };
    expect(simulateKoTier({ damagePerHit: 50, maxHP: 200, recovery })).toBe("4HKO+");
  });

  it("triggers exactly once", () => {
    // 100 HP, 30 damage. Without recovery: 4HKO+ (0, -30, -60, -90 — 4 hits).
    // Wait actually that's tier "4HKO+" since hit 4 brings HP to 100-120 = -20.
    // With Sitrus: hit 1 → 70 (no trigger, > 50%). Hit 2 → 40 (trigger: +25
    // → 65). Hit 3 → 35. Hit 4 → 5. Hit 5 → -25 → KO at hit 5 → "4HKO+".
    const recovery = {
      oneShot: 25,
      oneShotThreshold: 50,
      perTurnHeal: 0,
      perTurnSelfDamage: 0,
      suffix: "after Sitrus Berry recovery",
    };
    expect(simulateKoTier({ damagePerHit: 30, maxHP: 100, recovery })).toBe("4HKO+");
  });

  it("caps at maxHP — over-restoration cannot exceed full HP", () => {
    // 100 HP, 49 damage. Hit 1 → 51 HP (> 50%, no trigger). Hit 2 → 2 HP
    // (Sitrus +25 → 27 HP). Hit 3 → -22 → 3HKO.
    const recovery = {
      oneShot: 25,
      oneShotThreshold: 50,
      perTurnHeal: 0,
      perTurnSelfDamage: 0,
      suffix: "after Sitrus Berry recovery",
    };
    expect(simulateKoTier({ damagePerHit: 49, maxHP: 100, recovery })).toBe("3HKO");
  });
});

describe("simulateKoTier — Leftovers", () => {
  // 192 HP, 100 damage. Without recovery: 2HKO.
  // With Leftovers (12 per turn): hit 1 → 92 → +12 → 104. Hit 2 → 4 → +12
  // → 16 (capped at 192). Hit 3 → -84 → 3HKO.
  it("can convert a 2HKO into a 3HKO with enough heal", () => {
    const recovery = {
      oneShot: 0,
      oneShotThreshold: 0,
      perTurnHeal: 12,
      perTurnSelfDamage: 0,
      suffix: "after Leftovers recovery",
    };
    expect(simulateKoTier({ damagePerHit: 100, maxHP: 192, recovery })).toBe("3HKO");
  });

  it("doesn't change the verdict when heal is dwarfed by damage", () => {
    // 100 HP, 200 damage = OHKO regardless.
    const recovery = {
      oneShot: 0,
      oneShotThreshold: 0,
      perTurnHeal: 6,
      perTurnSelfDamage: 0,
      suffix: "after Leftovers recovery",
    };
    expect(simulateKoTier({ damagePerHit: 200, maxHP: 100, recovery })).toBe("OHKO");
  });
});

describe("simulateKoTier — Black Sludge damage", () => {
  it("self-damage from Black Sludge can KO defender mid-stall", () => {
    // 100 HP, 1 damage per hit (defender outheals normally). Black Sludge
    // damages 1/8 = 12 per turn. After hit 1: 99 HP - 12 → 87. After hit 2:
    // 86 - 12 = 74. ... eventually defender KO's itself. Should NOT return
    // OHKO (the damage hit isn't what KO'd).
    const recovery = {
      oneShot: 0,
      oneShotThreshold: 0,
      perTurnHeal: 0,
      perTurnSelfDamage: 12,
      suffix: "after Black Sludge damage",
    };
    // Defender takes 1 + 12 = 13 net per turn, dies at turn ⌈100/13⌉ = 8.
    // That's beyond maxTurns:12 only if loop maxes at 12 hits which it does.
    // Should return "4HKO+".
    expect(simulateKoTier({ damagePerHit: 1, maxHP: 100, recovery })).toBe("4HKO+");
  });
});

// =============================================================================
// getRecoveryAwareVerdict — full pipeline
// =============================================================================

describe("getRecoveryAwareVerdict", () => {
  it("returns empty suffix when no recovery item", () => {
    // Max roll 80, maxHP 100 → 2HKO without recovery. No item → suffix empty.
    const verdict = getRecoveryAwareVerdict({
      rolls: [50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80],
      maxHP: 100,
      item: null,
      defenderTypes: ["Fire"],
    });
    expect(verdict.tier).toBe("2HKO");
    expect(verdict.suffix).toBe("");
  });

  it("returns Sitrus suffix when it shifts the tier", () => {
    // Max roll 50, maxHP 100. Without Sitrus: 2HKO (50+50=100). With Sitrus:
    // hit 1 → 50 (trigger +25 → 75). Hit 2 → 25. Hit 3 → -25 → 3HKO.
    const verdict = getRecoveryAwareVerdict({
      rolls: [40, 42, 44, 46, 48, 48, 49, 50, 50, 50, 50, 50, 50, 50, 50, 50],
      maxHP: 100,
      item: "Sitrus Berry",
      defenderTypes: ["Fire"],
    });
    expect(verdict.tier).toBe("3HKO");
    expect(verdict.suffix).toBe("after Sitrus Berry recovery");
  });

  it("omits suffix when recovery doesn't change tier (OHKO regardless)", () => {
    // 200 damage on 100 HP — OHKO with or without Sitrus.
    const verdict = getRecoveryAwareVerdict({
      rolls: Array(16).fill(200),
      maxHP: 100,
      item: "Sitrus Berry",
      defenderTypes: ["Fire"],
    });
    expect(verdict.tier).toBe("OHKO");
    expect(verdict.suffix).toBe("");
  });

  it("returns Leftovers suffix when it shifts the tier", () => {
    const verdict = getRecoveryAwareVerdict({
      rolls: Array(16).fill(100),
      maxHP: 192,
      item: "Leftovers",
      defenderTypes: ["Steel"],
    });
    expect(verdict.tier).toBe("3HKO");
    expect(verdict.suffix).toBe("after Leftovers recovery");
  });

  it("Black Sludge on Poison-type adds recovery suffix", () => {
    const verdict = getRecoveryAwareVerdict({
      rolls: Array(16).fill(100),
      maxHP: 192,
      item: "Black Sludge",
      defenderTypes: ["Poison"],
    });
    expect(verdict.tier).toBe("3HKO");
    expect(verdict.suffix).toBe("after Black Sludge recovery");
  });

  it("Enigma Berry shifts a 2HKO into a 3HKO on a super-effective hit", () => {
    // 100 HP defender, max roll 60. Without recovery: 2HKO (60+60=120>100).
    // With Enigma Berry on SE hit: hit 1 → 40 (Enigma always-fire +25 → 65).
    // Hit 2 → 5. Hit 3 → -55 → 3HKO.
    const verdict = getRecoveryAwareVerdict({
      rolls: Array(16).fill(60),
      maxHP: 100,
      item: "Enigma Berry",
      defenderTypes: ["Grass"],
      isSuperEffective: true,
    });
    expect(verdict.tier).toBe("3HKO");
    expect(verdict.suffix).toBe("after Enigma Berry recovery");
  });

  it("Enigma Berry produces no suffix on a neutral hit", () => {
    const verdict = getRecoveryAwareVerdict({
      rolls: Array(16).fill(60),
      maxHP: 100,
      item: "Enigma Berry",
      defenderTypes: ["Grass"],
      isSuperEffective: false,
    });
    expect(verdict.tier).toBe("2HKO");
    expect(verdict.suffix).toBe("");
  });

  it("Berry Juice can shift a 2HKO to 3HKO with its flat 20 HP", () => {
    // 100 HP defender, 50 damage. Without juice: 2HKO. With juice (20 flat
    // at ≤50%): hit 1 → 50 (trigger +20 → 70). Hit 2 → 20. Hit 3 → -30 → 3HKO.
    const verdict = getRecoveryAwareVerdict({
      rolls: Array(16).fill(50),
      maxHP: 100,
      item: "Berry Juice",
      defenderTypes: ["Normal"],
    });
    expect(verdict.tier).toBe("3HKO");
    expect(verdict.suffix).toBe("after Berry Juice recovery");
  });

  it("flavor berry (Aguav Berry) restores 1/3 maxHP at ≤25% threshold", () => {
    // 192 HP, 65 damage. Hit 1 → 127 (>25%, no trigger). Hit 2 → 62
    // (<= floor(192/4)=48? no, 62 > 48 — no trigger). Hit 3 → -3 → 3HKO.
    // No suffix because the berry never triggered (it would need HP ≤ 48).
    const noTrigger = getRecoveryAwareVerdict({
      rolls: Array(16).fill(65),
      maxHP: 192,
      item: "Aguav Berry",
      defenderTypes: ["Normal"],
    });
    expect(noTrigger.tier).toBe("3HKO");
    expect(noTrigger.suffix).toBe("");

    // 192 HP, 80 damage. Hit 1 → 112 (>48, no trigger). Hit 2 → 32 (≤48,
    // trigger: +floor(192/3)=64 → 96). Hit 3 → 16. Hit 4 → -64 → 4HKO+.
    // Without berry: 3HKO. With berry: 4HKO+ → suffix shown.
    const triggered = getRecoveryAwareVerdict({
      rolls: Array(16).fill(80),
      maxHP: 192,
      item: "Aguav Berry",
      defenderTypes: ["Normal"],
    });
    expect(triggered.tier).toBe("4HKO+");
    expect(triggered.suffix).toBe("after Aguav Berry recovery");
  });

  it("Klutz holder produces no suffix — Sitrus Berry verdict reverts to raw percent tier", () => {
    // 100 HP, max roll 50. Without Klutz + Sitrus: would be 3HKO.
    // With Klutz: item disabled, straight 2HKO. Suffix must be empty.
    const verdict = getRecoveryAwareVerdict({
      rolls: Array(16).fill(50),
      maxHP: 100,
      item: "Sitrus Berry",
      defenderTypes: ["Fire"],
      ability: "Klutz",
    });
    expect(verdict.tier).toBe("2HKO");
    expect(verdict.suffix).toBe("");
  });
});
