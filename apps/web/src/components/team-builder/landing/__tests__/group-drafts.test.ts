/**
 * group-drafts.test.ts
 *
 * Exhaustive tests for the pure draft-grouping engine.
 * Covers: All-view pinned/auto sections, manual/smart/archived selected views,
 * all SortMode orderings, countDrafts correctness, and edge cases.
 */

import { describe, expect, it } from "@jest/globals";

import { type ManualFolder, type SmartFolder } from "../../persistence/local-folders-types";
import {
  ARCHIVED_VIEW_ID,
  type GroupOptions,
  countDrafts,
  groupDrafts,
} from "../group-drafts";
import { makeDraftRecord, makeFilledSlot } from "./fixtures";

// =============================================================================
// Shared constants
// =============================================================================

const BASE_OPTS: GroupOptions = {
  sort: "recent",
  selectedFolderId: null,
  manualFolders: [],
  smartFolders: [],
};

// =============================================================================
// Helpers
// =============================================================================

/** Build a minimal ManualFolder. */
function makeManualFolder(id: string, name: string): ManualFolder {
  return { id, name, createdAt: "2024-01-01T00:00:00Z" };
}

/** Build a smart folder with a single "flag: incomplete" predicate. */
function makeIncompleteSmartFolder(id: string, name: string): SmartFolder {
  return {
    id,
    name,
    criteria: [{ kind: "flag", flag: "incomplete" }],
    isSeeded: false,
  };
}

/** Build a smart folder with a specific format predicate. */
function makeFormatSmartFolder(
  id: string,
  name: string,
  formatValue: string
): SmartFolder {
  return {
    id,
    name,
    criteria: [{ kind: "format", value: formatValue }],
    isSeeded: false,
  };
}

// =============================================================================
// groupDrafts — All-view (selectedFolderId === null)
// =============================================================================

describe("groupDrafts — All-view: pinned section first", () => {
  it("returns a Pinned section before auto sections when pinned drafts exist", () => {
    const pinnedDraft = makeDraftRecord({ id: "local-pinned", pinned: true });
    const normalDraft = makeDraftRecord({ id: "local-normal" });
    const sections = groupDrafts([pinnedDraft, normalDraft], BASE_OPTS);

    expect(sections[0]).toBeDefined();
    expect(sections[0]!.kind).toBe("pinned");
    expect(sections[0]!.id).toBe("__pinned__");
    expect(sections[0]!.title).toBe("Pinned");
    expect(sections[0]!.drafts.map((d) => d.id)).toContain("local-pinned");
  });

  it("does NOT include a Pinned section when no drafts are pinned", () => {
    const d1 = makeDraftRecord({ id: "local-1" });
    const d2 = makeDraftRecord({ id: "local-2" });
    const sections = groupDrafts([d1, d2], BASE_OPTS);

    const pinnedSection = sections.find((s) => s.kind === "pinned");
    expect(pinnedSection).toBeUndefined();
  });

  it("does NOT include archived drafts in the Pinned section even if pinned is true", () => {
    // A draft that is both pinned AND archived should be excluded from All-view
    const draft = makeDraftRecord({
      id: "local-archived-pinned",
      pinned: true,
      archived: true,
    });
    const sections = groupDrafts([draft], BASE_OPTS);

    expect(sections.find((s) => s.kind === "pinned")).toBeUndefined();
    expect(sections).toHaveLength(0);
  });

  it("pinned drafts are excluded from auto sections", () => {
    const pinnedDraft = makeDraftRecord({
      id: "local-pinned",
      pinned: true,
      team: { format: "gen9vgc2026regi" },
    });
    const normalDraft = makeDraftRecord({
      id: "local-normal",
      pinned: false,
      team: { format: "gen9vgc2026regi" },
    });
    const sections = groupDrafts([pinnedDraft, normalDraft], BASE_OPTS);

    const autoSection = sections.find((s) => s.kind === "auto");
    expect(autoSection).toBeDefined();
    expect(autoSection!.drafts.map((d) => d.id)).not.toContain("local-pinned");
    expect(autoSection!.drafts.map((d) => d.id)).toContain("local-normal");
  });
});

describe("groupDrafts — All-view: auto gen→format grouping", () => {
  it("groups drafts into separate sections per format label", () => {
    const regI = makeDraftRecord({
      id: "local-regi",
      team: { format: "gen9vgc2026regi" },
    });
    const regF = makeDraftRecord({
      id: "local-regf",
      team: { format: "gen9vgc2026regf" },
    });
    const sections = groupDrafts([regI, regF], BASE_OPTS);

    const autoSections = sections.filter((s) => s.kind === "auto");
    expect(autoSections).toHaveLength(2);
    const ids = autoSections.map((s) => s.drafts.map((d) => d.id)).flat();
    expect(ids).toContain("local-regi");
    expect(ids).toContain("local-regf");
  });

  it("places multiple drafts of the same format in a single section", () => {
    const d1 = makeDraftRecord({ id: "d1", team: { format: "gen9vgc2026regi" } });
    const d2 = makeDraftRecord({ id: "d2", team: { format: "gen9vgc2026regi" } });
    const sections = groupDrafts([d1, d2], BASE_OPTS);

    const autoSections = sections.filter((s) => s.kind === "auto");
    expect(autoSections).toHaveLength(1);
    expect(autoSections[0]!.drafts).toHaveLength(2);
  });

  it("groups Champions M-A and M-B under Generation 9 (same generation as SV)", () => {
    const chMA = makeDraftRecord({
      id: "local-chma",
      team: { format: "gen9championsvgc2026regma" },
    });
    const chMB = makeDraftRecord({
      id: "local-chmb",
      team: { format: "gen9championsvgc2026regmb" },
    });
    const sv = makeDraftRecord({
      id: "local-sv",
      team: { format: "gen9vgc2026regi" },
    });

    const sections = groupDrafts([chMA, chMB, sv], BASE_OPTS);
    const autoSections = sections.filter((s) => s.kind === "auto");

    // Should have separate sections per format label, all gen9
    expect(autoSections.length).toBeGreaterThanOrEqual(3);
    const allIds = autoSections.map((s) => s.drafts.map((d) => d.id)).flat();
    expect(allIds).toContain("local-chma");
    expect(allIds).toContain("local-chmb");
    expect(allIds).toContain("local-sv");
  });

  it("Champions M-A and Champions M-B appear as separate sections (different format labels)", () => {
    const chMA = makeDraftRecord({
      id: "local-chma",
      team: { format: "gen9championsvgc2026regma" },
    });
    const chMB = makeDraftRecord({
      id: "local-chmb",
      team: { format: "gen9championsvgc2026regmb" },
    });
    const sections = groupDrafts([chMA, chMB], BASE_OPTS);

    const autoSections = sections.filter((s) => s.kind === "auto");
    expect(autoSections).toHaveLength(2);
    const titles = autoSections.map((s) => s.title);
    expect(titles).toContain("Champions: Reg M-A");
    expect(titles).toContain("Champions: Reg M-B");
  });

  it("drafts with unknown format IDs are grouped under 'Other'", () => {
    const d = makeDraftRecord({
      id: "local-unknown",
      team: { format: "gen99unknownformat" },
    });
    const sections = groupDrafts([d], BASE_OPTS);

    const autoSections = sections.filter((s) => s.kind === "auto");
    expect(autoSections).toHaveLength(1);
    // The raw unknown ID becomes the label (from getFormatLabel fallback)
    expect(autoSections[0]!.drafts.map((d) => d.id)).toContain("local-unknown");
  });

  it("drafts with null format are grouped under 'Other'", () => {
    const d = makeDraftRecord({
      id: "local-null-format",
      team: { format: null },
    });
    const sections = groupDrafts([d], BASE_OPTS);

    const autoSections = sections.filter((s) => s.kind === "auto");
    expect(autoSections).toHaveLength(1);
    expect(autoSections[0]!.title).toBe("Other");
  });

  it("excludes archived drafts from All-view auto sections", () => {
    const archived = makeDraftRecord({ id: "local-arch", archived: true });
    const normal = makeDraftRecord({ id: "local-norm" });
    const sections = groupDrafts([archived, normal], BASE_OPTS);

    const allDraftIds = sections.flatMap((s) => s.drafts.map((d) => d.id));
    expect(allDraftIds).not.toContain("local-arch");
    expect(allDraftIds).toContain("local-norm");
  });

  it("returns empty array when all drafts are archived", () => {
    const d1 = makeDraftRecord({ id: "d1", archived: true });
    const d2 = makeDraftRecord({ id: "d2", archived: true });
    const sections = groupDrafts([d1, d2], BASE_OPTS);
    expect(sections).toHaveLength(0);
  });

  it("returns empty array when drafts array is empty", () => {
    const sections = groupDrafts([], BASE_OPTS);
    expect(sections).toHaveLength(0);
  });

  it("auto sections all have kind 'auto'", () => {
    const d1 = makeDraftRecord({ id: "d1", team: { format: "gen9vgc2026regi" } });
    const d2 = makeDraftRecord({ id: "d2", team: { format: "gen8vgc2022" } });
    const sections = groupDrafts([d1, d2], BASE_OPTS);

    for (const s of sections) {
      expect(s.kind).toBe("auto");
    }
  });

  it("section titles match the format registry labels (not raw IDs)", () => {
    const d = makeDraftRecord({ id: "d1", team: { format: "gen9vgc2026regi" } });
    const sections = groupDrafts([d], BASE_OPTS);
    const auto = sections.find((s) => s.kind === "auto");
    expect(auto).toBeDefined();
    // Label from formats.ts: "SV: Reg I"
    expect(auto!.title).toBe("SV: Reg I");
  });
});

// =============================================================================
// groupDrafts — Manual folder view
// =============================================================================

describe("groupDrafts — manual folder view", () => {
  it("returns a single 'manual' section with matching non-archived drafts", () => {
    const folder = makeManualFolder("folder-1", "My Folder");
    const inFolder = makeDraftRecord({
      id: "local-in",
      folderIds: ["folder-1"],
    });
    const outFolder = makeDraftRecord({
      id: "local-out",
      folderIds: [],
    });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      selectedFolderId: "folder-1",
      manualFolders: [folder],
    };
    const sections = groupDrafts([inFolder, outFolder], opts);

    expect(sections).toHaveLength(1);
    expect(sections[0]!.kind).toBe("manual");
    expect(sections[0]!.title).toBe("My Folder");
    expect(sections[0]!.drafts.map((d) => d.id)).toContain("local-in");
    expect(sections[0]!.drafts.map((d) => d.id)).not.toContain("local-out");
  });

  it("excludes archived drafts from manual folder view", () => {
    const folder = makeManualFolder("folder-1", "My Folder");
    const archived = makeDraftRecord({
      id: "local-arch",
      archived: true,
      folderIds: ["folder-1"],
    });
    const normal = makeDraftRecord({
      id: "local-norm",
      archived: false,
      folderIds: ["folder-1"],
    });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      selectedFolderId: "folder-1",
      manualFolders: [folder],
    };
    const sections = groupDrafts([archived, normal], opts);

    expect(sections[0]!.drafts.map((d) => d.id)).not.toContain("local-arch");
    expect(sections[0]!.drafts.map((d) => d.id)).toContain("local-norm");
  });

  it("returns empty array when no drafts are in the manual folder", () => {
    const folder = makeManualFolder("folder-1", "Empty Folder");
    const notInFolder = makeDraftRecord({ id: "local-1", folderIds: [] });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      selectedFolderId: "folder-1",
      manualFolders: [folder],
    };
    const sections = groupDrafts([notInFolder], opts);
    expect(sections).toHaveLength(0);
  });

  it("supports drafts belonging to multiple folders", () => {
    const folder1 = makeManualFolder("folder-1", "Folder One");
    const folder2 = makeManualFolder("folder-2", "Folder Two");
    const multiFolderDraft = makeDraftRecord({
      id: "local-multi",
      folderIds: ["folder-1", "folder-2"],
    });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      selectedFolderId: "folder-1",
      manualFolders: [folder1, folder2],
    };
    const sections = groupDrafts([multiFolderDraft], opts);

    expect(sections[0]!.drafts.map((d) => d.id)).toContain("local-multi");
  });

  it("returns empty array for unknown folder ID", () => {
    const d = makeDraftRecord({ id: "local-1" });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      selectedFolderId: "folder-nonexistent",
    };
    const sections = groupDrafts([d], opts);
    expect(sections).toHaveLength(0);
  });
});

// =============================================================================
// groupDrafts — Smart folder view
// =============================================================================

describe("groupDrafts — smart folder view", () => {
  it("returns a single 'smart' section matching the folder's criteria", () => {
    const smartFolder = makeIncompleteSmartFolder("smart-incomplete", "Incomplete Teams");
    // incomplete draft: 0 slots filled
    const incompleteDraft = makeDraftRecord({
      id: "local-incomplete",
      team: { team_pokemon: [] },
    });
    // complete draft: 6 filled slots with ability + move1
    const completeDraft = makeDraftRecord({
      id: "local-complete",
      team: {
        team_pokemon: [
          makeFilledSlot("Rillaboom", { id: 1, position: 0 }),
          makeFilledSlot("Miraidon", { id: 2, position: 1 }),
          makeFilledSlot("Gholdengo", { id: 3, position: 2 }),
          makeFilledSlot("Amoonguss", { id: 4, position: 3 }),
          makeFilledSlot("Incineroar", { id: 5, position: 4 }),
          makeFilledSlot("Urshifu", { id: 6, position: 5 }),
        ],
      },
    });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      selectedFolderId: "smart-incomplete",
      smartFolders: [smartFolder],
    };
    const sections = groupDrafts([incompleteDraft, completeDraft], opts);

    expect(sections).toHaveLength(1);
    expect(sections[0]!.kind).toBe("smart");
    expect(sections[0]!.title).toBe("Incomplete Teams");
    expect(sections[0]!.drafts.map((d) => d.id)).toContain("local-incomplete");
    expect(sections[0]!.drafts.map((d) => d.id)).not.toContain("local-complete");
  });

  it("excludes archived drafts from smart folder view", () => {
    const smartFolder = makeIncompleteSmartFolder("smart-1", "Incomplete");
    const archivedIncomplete = makeDraftRecord({
      id: "local-arch-incomplete",
      archived: true,
      team: { team_pokemon: [] },
    });
    const visibleIncomplete = makeDraftRecord({
      id: "local-vis-incomplete",
      archived: false,
      team: { team_pokemon: [] },
    });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      selectedFolderId: "smart-1",
      smartFolders: [smartFolder],
    };
    const sections = groupDrafts([archivedIncomplete, visibleIncomplete], opts);

    expect(sections[0]!.drafts.map((d) => d.id)).not.toContain(
      "local-arch-incomplete"
    );
    expect(sections[0]!.drafts.map((d) => d.id)).toContain("local-vis-incomplete");
  });

  it("returns empty array when no drafts match the smart folder criteria", () => {
    const smartFolder = makeFormatSmartFolder("smart-1", "Champions", "champions");
    // All drafts are SV, not Champions
    const svDraft = makeDraftRecord({
      id: "local-sv",
      team: { format: "gen9vgc2026regi" },
    });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      selectedFolderId: "smart-1",
      smartFolders: [smartFolder],
    };
    const sections = groupDrafts([svDraft], opts);
    expect(sections).toHaveLength(0);
  });

  it("smart folder with empty criteria matches all non-archived drafts", () => {
    const smartFolder: SmartFolder = {
      id: "smart-all",
      name: "Everything",
      criteria: [],
      isSeeded: false,
    };
    const d1 = makeDraftRecord({ id: "d1" });
    const d2 = makeDraftRecord({ id: "d2" });
    const archivedD3 = makeDraftRecord({ id: "d3", archived: true });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      selectedFolderId: "smart-all",
      smartFolders: [smartFolder],
    };
    const sections = groupDrafts([d1, d2, archivedD3], opts);

    expect(sections).toHaveLength(1);
    expect(sections[0]!.drafts).toHaveLength(2);
    expect(sections[0]!.drafts.map((d) => d.id)).not.toContain("d3");
  });
});

// =============================================================================
// groupDrafts — Archived view
// =============================================================================

describe("groupDrafts — archived view", () => {
  it("returns a single 'archived' section with all archived drafts", () => {
    const archived1 = makeDraftRecord({ id: "arch-1", archived: true });
    const archived2 = makeDraftRecord({ id: "arch-2", archived: true });
    const normal = makeDraftRecord({ id: "normal-1", archived: false });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      selectedFolderId: ARCHIVED_VIEW_ID,
    };
    const sections = groupDrafts([archived1, archived2, normal], opts);

    expect(sections).toHaveLength(1);
    expect(sections[0]!.kind).toBe("archived");
    expect(sections[0]!.id).toBe(ARCHIVED_VIEW_ID);
    expect(sections[0]!.title).toBe("Archived");
    expect(sections[0]!.drafts.map((d) => d.id)).toContain("arch-1");
    expect(sections[0]!.drafts.map((d) => d.id)).toContain("arch-2");
    expect(sections[0]!.drafts.map((d) => d.id)).not.toContain("normal-1");
  });

  it("returns empty array when there are no archived drafts", () => {
    const normal = makeDraftRecord({ id: "normal-1", archived: false });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      selectedFolderId: ARCHIVED_VIEW_ID,
    };
    const sections = groupDrafts([normal], opts);
    expect(sections).toHaveLength(0);
  });
});

// =============================================================================
// groupDrafts — Sort modes
// =============================================================================

describe("groupDrafts — sort: recent", () => {
  it("sorts drafts by updatedAt descending", () => {
    const older = makeDraftRecord({
      id: "local-old",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    const newer = makeDraftRecord({
      id: "local-new",
      updatedAt: "2025-06-01T00:00:00Z",
    });
    const opts: GroupOptions = { ...BASE_OPTS, sort: "recent" };
    const sections = groupDrafts([older, newer], opts);

    // Both are in the same format → same section
    const section = sections[0];
    expect(section).toBeDefined();
    const ids = section!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("local-new");
    expect(ids[1]).toBe("local-old");
  });
});

describe("groupDrafts — sort: name", () => {
  it("sorts drafts alphabetically by team name (case-insensitive)", () => {
    const alpha = makeDraftRecord({ id: "a", team: { name: "Alpha Team" } });
    const zeta = makeDraftRecord({ id: "z", team: { name: "Zeta Team" } });
    const mid = makeDraftRecord({ id: "m", team: { name: "Mid Team" } });
    const opts: GroupOptions = { ...BASE_OPTS, sort: "name" };
    const sections = groupDrafts([zeta, alpha, mid], opts);

    const section = sections[0];
    expect(section).toBeDefined();
    const ids = section!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("a"); // Alpha
    expect(ids[1]).toBe("m"); // Mid
    expect(ids[2]).toBe("z"); // Zeta
  });

  it("name sort is case-insensitive (lowercase before uppercase within ASCII collation)", () => {
    const upper = makeDraftRecord({ id: "upper", team: { name: "BETA Team" } });
    const lower = makeDraftRecord({ id: "lower", team: { name: "alpha team" } });
    const opts: GroupOptions = { ...BASE_OPTS, sort: "name" };
    const sections = groupDrafts([upper, lower], opts);

    const ids = sections[0]!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("lower"); // "alpha team" < "beta team"
    expect(ids[1]).toBe("upper");
  });
});

describe("groupDrafts — sort: format", () => {
  it("sorts drafts by format label then name within a section", () => {
    // Two drafts with the same format but different names
    const b = makeDraftRecord({
      id: "b",
      team: { name: "Beta", format: "gen9vgc2026regi" },
    });
    const a = makeDraftRecord({
      id: "a",
      team: { name: "Alpha", format: "gen9vgc2026regi" },
    });
    const opts: GroupOptions = { ...BASE_OPTS, sort: "format" };
    const sections = groupDrafts([b, a], opts);

    const section = sections.find((s) => s.kind === "auto");
    expect(section).toBeDefined();
    const ids = section!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("a"); // Alpha comes before Beta
  });
});

describe("groupDrafts — sort: completeness", () => {
  it("sorts drafts by filledCount descending", () => {
    // Draft with 6 filled slots
    const full = makeDraftRecord({
      id: "full",
      team: {
        team_pokemon: [
          makeFilledSlot("Rillaboom", { id: 1, position: 0 }),
          makeFilledSlot("Miraidon", { id: 2, position: 1 }),
          makeFilledSlot("Gholdengo", { id: 3, position: 2 }),
          makeFilledSlot("Amoonguss", { id: 4, position: 3 }),
          makeFilledSlot("Incineroar", { id: 5, position: 4 }),
          makeFilledSlot("Urshifu", { id: 6, position: 5 }),
        ],
      },
    });
    // Draft with 2 filled slots
    const partial = makeDraftRecord({
      id: "partial",
      team: {
        team_pokemon: [
          makeFilledSlot("Pikachu", { id: 1, position: 0 }),
          makeFilledSlot("Eevee", { id: 2, position: 1 }),
        ],
      },
    });
    // Draft with 0 filled slots
    const empty = makeDraftRecord({ id: "empty", team: { team_pokemon: [] } });

    const opts: GroupOptions = { ...BASE_OPTS, sort: "completeness" };
    const sections = groupDrafts([empty, partial, full], opts);

    // All three have the same format → same section
    const section = sections[0];
    expect(section).toBeDefined();
    const ids = section!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("full");
    expect(ids[1]).toBe("partial");
    expect(ids[2]).toBe("empty");
  });

  it("uses updatedAt desc as a tiebreaker when filledCount is equal", () => {
    const older = makeDraftRecord({
      id: "older",
      updatedAt: "2024-01-01T00:00:00Z",
      team: { team_pokemon: [makeFilledSlot("Pikachu", { id: 1, position: 0 })] },
    });
    const newer = makeDraftRecord({
      id: "newer",
      updatedAt: "2025-06-01T00:00:00Z",
      team: { team_pokemon: [makeFilledSlot("Eevee", { id: 2, position: 0 })] },
    });
    const opts: GroupOptions = { ...BASE_OPTS, sort: "completeness" };
    const sections = groupDrafts([older, newer], opts);

    const ids = sections[0]!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("newer");
  });
});

describe("groupDrafts — sort: custom", () => {
  it("sorts by sortOrder asc with nulls last", () => {
    const first = makeDraftRecord({ id: "first", sortOrder: 1 });
    const third = makeDraftRecord({ id: "third", sortOrder: 3 });
    const second = makeDraftRecord({ id: "second", sortOrder: 2 });
    const nullOrder = makeDraftRecord({ id: "null-order", sortOrder: null });

    const opts: GroupOptions = { ...BASE_OPTS, sort: "custom" };
    const sections = groupDrafts([third, nullOrder, first, second], opts);

    expect(sections).toHaveLength(1);
    const section = sections[0];
    expect(section).toBeDefined();
    const ids = section!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("first");
    expect(ids[1]).toBe("second");
    expect(ids[2]).toBe("third");
    expect(ids[3]).toBe("null-order");
  });

  it("among null-sortOrder drafts, uses updatedAt desc as secondary sort", () => {
    const olderNull = makeDraftRecord({
      id: "older-null",
      sortOrder: null,
      updatedAt: "2024-01-01T00:00:00Z",
    });
    const newerNull = makeDraftRecord({
      id: "newer-null",
      sortOrder: null,
      updatedAt: "2025-06-01T00:00:00Z",
    });
    const opts: GroupOptions = { ...BASE_OPTS, sort: "custom" };
    const sections = groupDrafts([olderNull, newerNull], opts);

    expect(sections).toHaveLength(1);
    const ids = sections[0]!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("newer-null");
    expect(ids[1]).toBe("older-null");
  });

  it("drafts with explicit sortOrder come before drafts with null sortOrder", () => {
    const withOrder = makeDraftRecord({
      id: "with-order",
      sortOrder: 99,
    });
    const noOrder = makeDraftRecord({
      id: "no-order",
      sortOrder: null,
    });
    const opts: GroupOptions = { ...BASE_OPTS, sort: "custom" };
    const sections = groupDrafts([noOrder, withOrder], opts);

    expect(sections).toHaveLength(1);
    const ids = sections[0]!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("with-order");
    expect(ids[1]).toBe("no-order");
  });
});

// =============================================================================
// groupDrafts — Sort applies to pinned/manual/smart/archived sections
// =============================================================================

describe("groupDrafts — sort applies within all section kinds", () => {
  it("sort: recent applies to the Pinned section", () => {
    const olderPinned = makeDraftRecord({
      id: "older-pinned",
      pinned: true,
      updatedAt: "2024-01-01T00:00:00Z",
    });
    const newerPinned = makeDraftRecord({
      id: "newer-pinned",
      pinned: true,
      updatedAt: "2025-06-01T00:00:00Z",
    });
    const opts: GroupOptions = { ...BASE_OPTS, sort: "recent" };
    const sections = groupDrafts([olderPinned, newerPinned], opts);

    const pinned = sections.find((s) => s.kind === "pinned");
    expect(pinned).toBeDefined();
    const ids = pinned!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("newer-pinned");
  });

  it("sort: name applies to manual folder section", () => {
    const folder = makeManualFolder("folder-1", "My Folder");
    const zDraft = makeDraftRecord({
      id: "z",
      folderIds: ["folder-1"],
      team: { name: "Zeta" },
    });
    const aDraft = makeDraftRecord({
      id: "a",
      folderIds: ["folder-1"],
      team: { name: "Alpha" },
    });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      sort: "name",
      selectedFolderId: "folder-1",
      manualFolders: [folder],
    };
    const sections = groupDrafts([zDraft, aDraft], opts);

    const ids = sections[0]!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("a");
    expect(ids[1]).toBe("z");
  });

  it("sort: recent applies to archived section", () => {
    const olderArch = makeDraftRecord({
      id: "older-arch",
      archived: true,
      updatedAt: "2024-01-01T00:00:00Z",
    });
    const newerArch = makeDraftRecord({
      id: "newer-arch",
      archived: true,
      updatedAt: "2025-06-01T00:00:00Z",
    });
    const opts: GroupOptions = {
      ...BASE_OPTS,
      sort: "recent",
      selectedFolderId: ARCHIVED_VIEW_ID,
    };
    const sections = groupDrafts([olderArch, newerArch], opts);

    const ids = sections[0]!.drafts.map((d) => d.id);
    expect(ids[0]).toBe("newer-arch");
  });
});

// =============================================================================
// countDrafts
// =============================================================================

describe("countDrafts — all and archived counts", () => {
  it("all is the count of non-archived drafts", () => {
    const d1 = makeDraftRecord({ id: "d1", archived: false });
    const d2 = makeDraftRecord({ id: "d2", archived: false });
    const d3 = makeDraftRecord({ id: "d3", archived: true });
    const result = countDrafts([d1, d2, d3], [], []);
    expect(result.all).toBe(2);
  });

  it("archived is the count of archived drafts", () => {
    const d1 = makeDraftRecord({ id: "d1", archived: true });
    const d2 = makeDraftRecord({ id: "d2", archived: false });
    const result = countDrafts([d1, d2], [], []);
    expect(result.archived).toBe(1);
  });

  it("returns all:0 and archived:0 for empty input", () => {
    const result = countDrafts([], [], []);
    expect(result.all).toBe(0);
    expect(result.archived).toBe(0);
  });
});

describe("countDrafts — manual folder counts", () => {
  it("counts non-archived members per folder", () => {
    const folder = makeManualFolder("folder-1", "My Folder");
    const inFolder = makeDraftRecord({ id: "in", folderIds: ["folder-1"] });
    const inFolderArchived = makeDraftRecord({
      id: "in-arch",
      folderIds: ["folder-1"],
      archived: true,
    });
    const notInFolder = makeDraftRecord({ id: "out", folderIds: [] });

    const result = countDrafts(
      [inFolder, inFolderArchived, notInFolder],
      [folder],
      []
    );
    expect(result.manual["folder-1"]).toBe(1); // only the non-archived member
  });

  it("returns 0 for a folder with no members", () => {
    const folder = makeManualFolder("folder-1", "Empty");
    const d = makeDraftRecord({ id: "d1", folderIds: [] });
    const result = countDrafts([d], [folder], []);
    expect(result.manual["folder-1"]).toBe(0);
  });

  it("counts members across multiple manual folders independently", () => {
    const folderA = makeManualFolder("f-a", "A");
    const folderB = makeManualFolder("f-b", "B");
    const inA = makeDraftRecord({ id: "in-a", folderIds: ["f-a"] });
    const inBoth = makeDraftRecord({ id: "in-both", folderIds: ["f-a", "f-b"] });
    const inB = makeDraftRecord({ id: "in-b", folderIds: ["f-b"] });

    const result = countDrafts([inA, inBoth, inB], [folderA, folderB], []);
    expect(result.manual["f-a"]).toBe(2); // inA + inBoth
    expect(result.manual["f-b"]).toBe(2); // inBoth + inB
  });
});

describe("countDrafts — smart folder counts", () => {
  it("counts non-archived matches for a smart folder's criteria", () => {
    const smartFolder = makeIncompleteSmartFolder("smart-1", "Incomplete");
    const incomplete = makeDraftRecord({
      id: "incomplete",
      team: { team_pokemon: [] },
    });
    const complete = makeDraftRecord({
      id: "complete",
      team: {
        team_pokemon: [
          makeFilledSlot("Rillaboom", { id: 1, position: 0 }),
          makeFilledSlot("Miraidon", { id: 2, position: 1 }),
          makeFilledSlot("Gholdengo", { id: 3, position: 2 }),
          makeFilledSlot("Amoonguss", { id: 4, position: 3 }),
          makeFilledSlot("Incineroar", { id: 5, position: 4 }),
          makeFilledSlot("Urshifu", { id: 6, position: 5 }),
        ],
      },
    });
    const archivedIncomplete = makeDraftRecord({
      id: "arch-incomplete",
      archived: true,
      team: { team_pokemon: [] },
    });

    const result = countDrafts(
      [incomplete, complete, archivedIncomplete],
      [],
      [smartFolder]
    );
    expect(result.smart["smart-1"]).toBe(1); // only the visible incomplete draft
  });

  it("returns 0 for a smart folder that matches nothing", () => {
    const smartFolder = makeFormatSmartFolder(
      "smart-champ",
      "Champions",
      "champions"
    );
    const svDraft = makeDraftRecord({ team: { format: "gen9vgc2026regi" } });
    const result = countDrafts([svDraft], [], [smartFolder]);
    expect(result.smart["smart-champ"]).toBe(0);
  });

  it("counts across multiple smart folders independently", () => {
    const smartSV = makeFormatSmartFolder("smart-sv", "SV", "gen9vgc");
    const smartChamp = makeFormatSmartFolder(
      "smart-champ",
      "Champions",
      "champions"
    );
    const svDraft = makeDraftRecord({ team: { format: "gen9vgc2026regi" } });
    const champDraft = makeDraftRecord({
      team: { format: "gen9championsvgc2026regmb" },
    });

    const result = countDrafts([svDraft, champDraft], [], [smartSV, smartChamp]);
    expect(result.smart["smart-sv"]).toBe(1);
    expect(result.smart["smart-champ"]).toBe(1);
  });

  it("smart folder with empty criteria counts all non-archived drafts", () => {
    const allFolder: SmartFolder = {
      id: "smart-all",
      name: "Everything",
      criteria: [],
      isSeeded: false,
    };
    const d1 = makeDraftRecord({ id: "d1" });
    const d2 = makeDraftRecord({ id: "d2" });
    const arch = makeDraftRecord({ id: "arch", archived: true });

    const result = countDrafts([d1, d2, arch], [], [allFolder]);
    expect(result.smart["smart-all"]).toBe(2);
  });
});

describe("countDrafts — manual and smart counts coexist", () => {
  it("returns correct manual and smart counts in a single call", () => {
    const folder = makeManualFolder("folder-1", "My Folder");
    const smartFolder = makeIncompleteSmartFolder("smart-1", "Incomplete");

    const inFolderComplete = makeDraftRecord({
      id: "in-folder-complete",
      folderIds: ["folder-1"],
      team: {
        team_pokemon: [
          makeFilledSlot("Rillaboom", { id: 1, position: 0 }),
          makeFilledSlot("Miraidon", { id: 2, position: 1 }),
          makeFilledSlot("Gholdengo", { id: 3, position: 2 }),
          makeFilledSlot("Amoonguss", { id: 4, position: 3 }),
          makeFilledSlot("Incineroar", { id: 5, position: 4 }),
          makeFilledSlot("Urshifu", { id: 6, position: 5 }),
        ],
      },
    });
    const notInFolderIncomplete = makeDraftRecord({
      id: "not-folder-incomplete",
      folderIds: [],
      team: { team_pokemon: [] },
    });

    const result = countDrafts(
      [inFolderComplete, notInFolderIncomplete],
      [folder],
      [smartFolder]
    );

    expect(result.manual["folder-1"]).toBe(1); // inFolderComplete
    expect(result.smart["smart-1"]).toBe(1); // notInFolderIncomplete (incomplete)
    expect(result.all).toBe(2);
    expect(result.archived).toBe(0);
  });
});

// =============================================================================
// ARCHIVED_VIEW_ID constant
// =============================================================================

describe("ARCHIVED_VIEW_ID", () => {
  it("is a non-empty string", () => {
    expect(typeof ARCHIVED_VIEW_ID).toBe("string");
    expect(ARCHIVED_VIEW_ID.length).toBeGreaterThan(0);
  });
});
