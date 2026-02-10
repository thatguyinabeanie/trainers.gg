import { escapeLike } from "../sql";

describe("escapeLike", () => {
  it("returns plain strings unchanged", () => {
    expect(escapeLike("hello")).toBe("hello");
    expect(escapeLike("user123")).toBe("user123");
  });

  it("escapes percent signs", () => {
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("%wildcard%")).toBe("\\%wildcard\\%");
  });

  it("escapes underscores", () => {
    expect(escapeLike("user_name")).toBe("user\\_name");
    expect(escapeLike("_prefix")).toBe("\\_prefix");
  });

  it("escapes backslashes", () => {
    expect(escapeLike("path\\to")).toBe("path\\\\to");
    expect(escapeLike("\\\\double")).toBe("\\\\\\\\double");
  });

  it("escapes multiple special characters together", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });

  it("handles empty string", () => {
    expect(escapeLike("")).toBe("");
  });

  it("leaves Unicode and emoji unchanged", () => {
    expect(escapeLike("pikachu")).toBe("pikachu");
    expect(escapeLike("user-name")).toBe("user-name");
  });
});
