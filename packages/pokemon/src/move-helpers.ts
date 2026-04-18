/**
 * Plain-English helper text for Pokemon moves.
 *
 * Derives a single-line description of a move's notable side effects
 * (priority, recoil, secondary stat drops, switch-out, status, weather,
 * terrain, screens, healing, etc.) from the move's data fields.
 *
 * Designed for inline display under the move name in the team builder
 * editor. Effects that can't be derived from data alone return an empty
 * string — we never invent specific numbers.
 */

/** Subset of `@pkmn/types` we need — inlined to keep the helper self-contained. */
type BoostStat = "atk" | "def" | "spa" | "spd" | "spe" | "accuracy" | "evasion";
export type BoostsTable = { [k in BoostStat]?: number };
export type StatusName = "slp" | "psn" | "brn" | "frz" | "par" | "tox";

/**
 * Structural subset of `@pkmn/dex`'s `Move` that this helper needs.
 *
 * Defined structurally (not imported) so the function stays pure and
 * testable without spinning up the dex; callers can pass either a full
 * `Move` from `@pkmn/dex` or a hand-built object.
 */
export interface MoveHelperInput {
  category: "Physical" | "Special" | "Status";
  /**
   * Move target — used to disambiguate user-side vs. target-side boosts on
   * Status moves (Swords Dance is `self`; Parting Shot is `normal`).
   * Defaults to `"normal"` if omitted.
   */
  target?: string;
  priority?: number;
  recoil?: readonly [number, number];
  drain?: readonly [number, number];
  heal?: readonly number[] | null;
  selfSwitch?: "copyvolatile" | "shedtail" | boolean;
  forceSwitch?: boolean;
  selfdestruct?: boolean | "ifHit" | "always";
  ohko?: boolean | "Ice";
  multihit?: number | readonly number[];
  status?: StatusName;
  volatileStatus?: string;
  sideCondition?: string;
  weather?: string;
  terrain?: string;
  pseudoWeather?: string;
  boosts?: BoostsTable;
  self?: {
    boosts?: BoostsTable;
  } | null;
  secondary?: {
    chance?: number;
    status?: StatusName;
    volatileStatus?: string;
    boosts?: BoostsTable;
    self?: { boosts?: BoostsTable } | null;
  } | null;
  flags?: {
    contact?: 0 | 1;
    sound?: 0 | 1;
    powder?: 0 | 1;
    punch?: 0 | 1;
    bite?: 0 | 1;
    heal?: 0 | 1;
  };
}

const STAT_LABELS: Record<string, string> = {
  atk: "Attack",
  def: "Defense",
  spa: "Sp. Atk",
  spd: "Sp. Def",
  spe: "Speed",
  accuracy: "accuracy",
  evasion: "evasion",
};

/**
 * Two forms per status:
 *   - `verb` — third-person singular for primary status moves ("burns the target")
 *   - `infinitive` — bare verb phrase for secondary chances ("10% chance to burn target")
 */
const STATUS_LABELS: Record<StatusName, { verb: string; infinitive: string }> =
  {
    brn: { verb: "burns", infinitive: "burn" },
    par: { verb: "paralyzes", infinitive: "paralyze" },
    psn: { verb: "poisons", infinitive: "poison" },
    tox: { verb: "badly poisons", infinitive: "badly poison" },
    slp: { verb: "puts target to sleep", infinitive: "put target to sleep" },
    frz: { verb: "freezes", infinitive: "freeze" },
  };

const WEATHER_LABELS: Record<string, string> = {
  raindance: "rain",
  sunnyday: "harsh sunlight",
  sandstorm: "a sandstorm",
  snowscape: "snow",
  snow: "snow",
  hail: "hail",
};

const TERRAIN_LABELS: Record<string, string> = {
  electricterrain: "Electric Terrain",
  grassyterrain: "Grassy Terrain",
  mistyterrain: "Misty Terrain",
  psychicterrain: "Psychic Terrain",
};

// Each entry is a complete, self-describing phrase. Most read as "sets <thing>",
// but Tailwind's verb is "doubles", so we store the full phrase here rather
// than special-casing it at the call site.
const SCREEN_LABELS: Record<string, string> = {
  reflect: "sets Reflect (halves physical damage for 5 turns)",
  lightscreen: "sets Light Screen (halves special damage for 5 turns)",
  auroraveil: "sets Aurora Veil (halves damage for 5 turns)",
  safeguard: "sets Safeguard (prevents status for 5 turns)",
  tailwind: "doubles team Speed for 4 turns",
  mist: "sets Mist (prevents stat drops for 5 turns)",
};

function statKey(key: string): string {
  return STAT_LABELS[key] ?? key;
}

/** Format a boosts table into a phrase like "Sp. Atk by 1" or "Atk and Speed by 2". */
function formatBoosts(
  boosts: BoostsTable,
  target: "user" | "target"
): string | null {
  const entries = Object.entries(boosts).filter(
    ([, v]) => typeof v === "number" && v !== 0
  ) as Array<[string, number]>;
  if (entries.length === 0) return null;

  // Group stats by magnitude+sign so "+1 Atk, +1 Spe" → "raises user's Atk and Speed by 1".
  const groups = new Map<number, string[]>();
  for (const [stat, amt] of entries) {
    const list = groups.get(amt) ?? [];
    list.push(statKey(stat));
    groups.set(amt, list);
  }

  const parts: string[] = [];
  for (const [amt, stats] of groups) {
    const verb = amt > 0 ? "raises" : "lowers";
    const magnitude = Math.abs(amt);
    const statList = joinList(stats);
    const possessive = target === "user" ? "user's" : "target's";
    parts.push(`${verb} ${possessive} ${statList} by ${magnitude}`);
  }
  return parts.join(" · ");
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function formatRecoil(recoil: readonly [number, number]): string | null {
  const [num, den] = recoil;
  if (!num || !den) return null;
  // Common ratios get pretty fractions; otherwise show as percent.
  if (num === 1 && den === 3) return "user takes 1/3 recoil";
  if (num === 1 && den === 4) return "user takes 1/4 recoil";
  if (num === 33 && den === 100) return "user takes 1/3 recoil";
  if (num === 25 && den === 100) return "user takes 1/4 recoil";
  if (num === 50 && den === 100) return "user takes 1/2 recoil";
  const pct = Math.round((num / den) * 100);
  return `user takes ${pct}% recoil`;
}

function formatDrain(drain: readonly [number, number]): string | null {
  const [num, den] = drain;
  if (!num || !den) return null;
  if (num === 1 && den === 2) return "heals user for 1/2 damage dealt";
  if (num === 3 && den === 4) return "heals user for 3/4 damage dealt";
  const pct = Math.round((num / den) * 100);
  return `heals user for ${pct}% damage dealt`;
}

function formatHeal(heal: readonly [number, number]): string | null {
  // heal: [num, den] → fraction of max HP restored
  const [num, den] = heal;
  if (!num || !den) return null;
  if (num === 1 && den === 2) return "restores 1/2 max HP";
  if (num === 1 && den === 4) return "restores 1/4 max HP";
  if (num === 2 && den === 3) return "restores 2/3 max HP";
  const pct = Math.round((num / den) * 100);
  return `restores ${pct}% max HP`;
}

function formatSelfSwitch(
  value: NonNullable<MoveHelperInput["selfSwitch"]>
): string {
  if (value === "copyvolatile")
    return "switches user out (passes stat changes)";
  if (value === "shedtail") return "switches user out and leaves a substitute";
  return "switches user out after damage";
}

/**
 * Build a single-line, plain-English description of a move's notable
 * side effects, suitable for inline display under the move name.
 *
 * Returns an empty string for moves with no machine-derivable effects
 * (e.g., scripted/unique moves) — never invents specific numbers.
 */
export function getMoveHelperText(move: MoveHelperInput): string {
  const parts: string[] = [];

  // Priority — only worth mentioning when non-zero.
  if (typeof move.priority === "number" && move.priority !== 0) {
    const sign = move.priority > 0 ? "+" : "";
    parts.push(`${sign}${move.priority} priority`);
  }

  // OHKO moves are dramatic enough to call out before anything else.
  if (move.ohko) {
    parts.push("one-hit KO if it lands");
  }

  // Multi-hit (e.g., Bullet Seed = 2-5 hits, Double Hit = 2 hits).
  if (typeof move.multihit === "number" && move.multihit > 1) {
    parts.push(`hits ${move.multihit} times`);
  } else if (Array.isArray(move.multihit)) {
    if (move.multihit.length === 1) {
      parts.push(`hits ${move.multihit[0]} times`);
    } else if (move.multihit.length >= 2) {
      const [min, max] = move.multihit;
      parts.push(`hits ${min}–${max} times`);
    }
  }

  // Recoil / drain.
  if (move.recoil) {
    const r = formatRecoil(move.recoil);
    if (r) parts.push(r);
  }
  if (move.drain) {
    const d = formatDrain(move.drain);
    if (d) parts.push(d);
  }

  // Self-destruct.
  if (move.selfdestruct === "ifHit") {
    // "ifHit" means the user faints only when the move connects.
    parts.push("user faints if it hits");
  } else if (move.selfdestruct) {
    parts.push("user faints");
  }

  // Healing moves (e.g., Recover, Roost).
  if (move.heal && move.heal.length === 2) {
    // Length check above narrows `readonly number[]` to a 2-tuple at runtime;
    // assert the tuple shape here so `formatHeal`'s contract is enforced.
    const h = formatHeal(move.heal as readonly [number, number]);
    if (h) parts.push(h);
  }

  // Force the target to switch (Whirlwind, Roar, Dragon Tail).
  if (move.forceSwitch) {
    parts.push("forces target to switch");
  }

  // Self-switch (U-turn, Volt Switch, Flip Turn, Parting Shot).
  if (move.selfSwitch) {
    parts.push(formatSelfSwitch(move.selfSwitch));
  }

  // Side conditions — screens, Tailwind, Safeguard, etc.
  // Each `SCREEN_LABELS` entry is already a complete phrase; for unknown
  // side conditions, fall back to "sets <id>".
  if (move.sideCondition) {
    const label = SCREEN_LABELS[move.sideCondition];
    if (label) {
      parts.push(label);
    } else {
      parts.push(`sets ${move.sideCondition}`);
    }
  }

  // Weather / terrain / pseudo-weather (Trick Room, Gravity, etc.).
  if (move.weather) {
    const label = WEATHER_LABELS[move.weather.toLowerCase()] ?? move.weather;
    parts.push(`summons ${label}`);
  }
  if (move.terrain) {
    const label = TERRAIN_LABELS[move.terrain.toLowerCase()] ?? move.terrain;
    parts.push(`sets ${label} for 5 turns`);
  }
  if (move.pseudoWeather) {
    parts.push(`sets ${move.pseudoWeather}`);
  }

  // Primary status effect (status moves like Will-O-Wisp, Spore, Sleep Powder).
  if (move.status && move.category === "Status") {
    const label = STATUS_LABELS[move.status];
    if (label) {
      // "puts target to sleep" already includes "target"; others need it appended.
      if (label.verb.includes("target")) {
        parts.push(label.verb);
      } else {
        parts.push(`${label.verb} the target`);
      }
    }
  }

  // Volatile status from a status move (Protect, Substitute, Taunt, Encore, etc.).
  if (move.volatileStatus && move.category === "Status") {
    const v = move.volatileStatus.toLowerCase();
    if (
      v === "protect" ||
      v === "endure" ||
      v === "spikyshield" ||
      v === "kingsshield" ||
      v === "banefulbunker"
    ) {
      parts.push("shields user this turn — fails if used in succession");
    } else if (v === "substitute") {
      parts.push("creates a substitute using 1/4 max HP");
    } else if (v === "taunt") {
      parts.push("prevents target from using status moves for 3 turns");
    } else if (v === "encore") {
      parts.push("locks target into its last move for 3 turns");
    } else if (v === "confusion") {
      parts.push("confuses the target");
    } else if (v === "flinch") {
      parts.push("flinches the target");
    } else if (v === "leechseed") {
      parts.push("drains 1/8 of target's HP each turn");
    } else if (v === "yawn") {
      parts.push("puts target to sleep next turn");
    } else if (v === "disable") {
      parts.push("disables target's last move for 4 turns");
    }
  }

  // Stat boosts on a status move (Swords Dance, Nasty Plot, Calm Mind for
  // self-targeted; Parting Shot, Memento for foe-targeted).
  if (move.boosts && move.category === "Status") {
    const isSelfTargeted = move.target === "self" || move.target === "allies";
    const b = formatBoosts(move.boosts, isSelfTargeted ? "user" : "target");
    if (b) parts.push(b);
  }

  // Self-applied boosts on a damaging move (Power-Up Punch, Scale Shot).
  if (move.self?.boosts) {
    const b = formatBoosts(move.self.boosts, "user");
    if (b) parts.push(b);
  }

  // Secondary effect on a damaging move.
  if (move.secondary) {
    const sec = move.secondary;
    const chance = sec.chance ?? 100;
    const chancePrefix = chance >= 100 ? "always" : `${chance}% chance to`;

    if (sec.status) {
      const label = STATUS_LABELS[sec.status];
      if (label) {
        if (chance >= 100) {
          // e.g., "burns target"
          parts.push(
            label.verb.includes("target") ? label.verb : `${label.verb} target`
          );
        } else {
          // e.g., "10% chance to burn target"
          parts.push(
            label.infinitive.includes("target")
              ? `${chancePrefix} ${label.infinitive}`
              : `${chancePrefix} ${label.infinitive} target`
          );
        }
      }
    }
    if (sec.volatileStatus === "flinch") {
      parts.push(
        chance >= 100 ? "flinches target" : `${chance}% flinch chance`
      );
    }
    if (sec.boosts) {
      const phrase = formatBoosts(sec.boosts, "target");
      if (phrase) {
        parts.push(chance >= 100 ? phrase : `${chance}% chance — ${phrase}`);
      }
    }
    if (sec.self?.boosts) {
      const phrase = formatBoosts(sec.self.boosts, "user");
      if (phrase) {
        parts.push(chance >= 100 ? phrase : `${chance}% chance — ${phrase}`);
      }
    }
  }

  return parts.join(" · ");
}
