import { describe, it, expect } from "@jest/globals";
import {
  CHANNEL_EVENT_LABELS,
  getChannelEventMeta,
  getEventLabel,
} from "../channel-mapping-shared";

// ---------------------------------------------------------------------------
// CHANNEL_EVENT_LABELS
// ---------------------------------------------------------------------------

describe("CHANNEL_EVENT_LABELS", () => {
  const expectedKeys = [
    "tournament_created",
    "registration_opens",
    "registration_closing_soon",
    "tournament_ended",
    "match_result_reported",
    "round_posted",
    "standings_posted",
    "check_in_opened",
  ];

  it("has entries for all 8 channel event types", () => {
    expect(Object.keys(CHANNEL_EVENT_LABELS).sort()).toEqual(
      expectedKeys.sort()
    );
  });

  it.each(expectedKeys)(
    "entry for %s has label and description strings",
    (key) => {
      const entry =
        CHANNEL_EVENT_LABELS[key as keyof typeof CHANNEL_EVENT_LABELS];
      expect(typeof entry.label).toBe("string");
      expect(entry.label.length).toBeGreaterThan(0);
      expect(typeof entry.description).toBe("string");
      expect(entry.description.length).toBeGreaterThan(0);
    }
  );
});

// ---------------------------------------------------------------------------
// getChannelEventMeta
// ---------------------------------------------------------------------------

describe("getChannelEventMeta", () => {
  it("returns known meta for tournament_created", () => {
    const meta = getChannelEventMeta("tournament_created");
    expect(meta).toEqual({
      label: "Tournament created",
      description: "When a draft tournament is created",
    });
  });

  it("returns known meta for round_posted", () => {
    const meta = getChannelEventMeta("round_posted");
    expect(meta).toEqual({
      label: "Round posted",
      description: "When new round pairings are published",
    });
  });

  it("returns humanized fallback for unknown event", () => {
    const meta = getChannelEventMeta("some_new_event");
    expect(meta).toEqual({
      label: "Some new event",
      description: "",
    });
  });

  it("returns humanized fallback for another unknown type", () => {
    const meta = getChannelEventMeta("unknown_type");
    expect(meta).toEqual({
      label: "Unknown type",
      description: "",
    });
  });
});

// ---------------------------------------------------------------------------
// getEventLabel
// ---------------------------------------------------------------------------

describe("getEventLabel", () => {
  // Channel events — title-cased
  it("returns title-cased label for channel event tournament_created", () => {
    expect(getEventLabel("tournament_created")).toBe("Tournament Created");
  });

  it("returns title-cased label for channel event match_result_reported", () => {
    expect(getEventLabel("match_result_reported")).toBe(
      "Match Result Reported"
    );
  });

  // DM events
  it("returns DM event label for match_ready", () => {
    expect(getEventLabel("match_ready")).toBe("Match Ready");
  });

  it("returns DM event label for team_sheet_needed", () => {
    expect(getEventLabel("team_sheet_needed")).toBe("Team Sheet Needed");
  });

  // Role events
  it("returns role label for staff", () => {
    expect(getEventLabel("staff")).toBe("Staff Role");
  });

  it("returns overridden role label for winner", () => {
    expect(getEventLabel("winner")).toBe("Tournament Winner Role");
  });

  // Fallback
  it("returns title-cased fallback for totally unknown event", () => {
    expect(getEventLabel("totally_unknown_event")).toBe(
      "Totally Unknown Event"
    );
  });
});
