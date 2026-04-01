import { describe, it, expect } from "@jest/globals";
import {
  getCommunitySlug,
  DASHBOARD_ALT_COOKIE,
  COOKIE_MAX_AGE,
} from "../sidebar-helpers";

describe("getCommunitySlug", () => {
  it("returns null for the dashboard root", () => {
    expect(getCommunitySlug("/dashboard")).toBeNull();
  });

  it("returns null for non-community dashboard pages", () => {
    expect(getCommunitySlug("/dashboard/alts")).toBeNull();
    expect(getCommunitySlug("/dashboard/tournaments")).toBeNull();
    expect(getCommunitySlug("/dashboard/settings")).toBeNull();
    expect(getCommunitySlug("/dashboard/settings/profile")).toBeNull();
  });

  it("extracts slug from community path", () => {
    expect(getCommunitySlug("/dashboard/community/vgc-league")).toBe(
      "vgc-league"
    );
  });

  it("extracts slug from nested community path", () => {
    expect(
      getCommunitySlug("/dashboard/community/vgc-league/tournaments")
    ).toBe("vgc-league");
    expect(getCommunitySlug("/dashboard/community/pallet-town/staff")).toBe(
      "pallet-town"
    );
    expect(
      getCommunitySlug(
        "/dashboard/community/my-org/tournaments/summer-cup/manage"
      )
    ).toBe("my-org");
  });

  it("returns null for non-dashboard paths", () => {
    expect(getCommunitySlug("/tournaments")).toBeNull();
    expect(getCommunitySlug("/community/vgc-league")).toBeNull();
    expect(getCommunitySlug("/")).toBeNull();
  });
});

describe("constants", () => {
  it("exports the cookie name", () => {
    expect(DASHBOARD_ALT_COOKIE).toBe("dashboard-alt");
  });

  it("exports a 1-year max-age", () => {
    expect(COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365);
  });
});
