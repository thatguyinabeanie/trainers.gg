import { getCommunityInitials } from "../community-helpers";

describe("getCommunityInitials", () => {
  it("returns a single initial for a one-word name", () => {
    expect(getCommunityInitials("Trainers")).toBe("T");
  });

  it("returns two initials for a two-word name", () => {
    expect(getCommunityInitials("VGC League")).toBe("VL");
  });

  it("returns only the first two initials for a three-word name", () => {
    expect(getCommunityInitials("Battle Stadium Online")).toBe("BS");
  });

  it("returns only the first two initials for a four-word name", () => {
    expect(getCommunityInitials("Pallet Town VGC Club")).toBe("PT");
  });

  it("converts initials to uppercase", () => {
    expect(getCommunityInitials("vgc league")).toBe("VL");
  });

  it("handles a single lowercase word", () => {
    expect(getCommunityInitials("trainers")).toBe("T");
  });

  it("handles an empty string without throwing", () => {
    expect(getCommunityInitials("")).toBe("");
  });

  it.each([
    ["Cerulean City Gym", "CC"],
    ["Elite Four", "EF"],
    ["Pokemon Champions", "PC"],
    ["Showdown", "S"],
  ])('returns "%s" initials as "%s"', (name, expected) => {
    expect(getCommunityInitials(name)).toBe(expected);
  });
});
