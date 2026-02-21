import {
  submitGameSelectionSchema,
  sendMatchMessageSchema,
  createMatchGamesSchema,
  judgeOverrideSchema,
  judgeResetSchema,
} from "../match";

describe("submitGameSelectionSchema", () => {
  it("accepts valid input", () => {
    const result = submitGameSelectionSchema.safeParse({
      gameId: 1,
      selectedWinnerAltId: 42,
    });
    expect(result.success).toBe(true);
  });

  it.each([
    [{ gameId: 0, selectedWinnerAltId: 1 }, "zero gameId"],
    [{ gameId: -1, selectedWinnerAltId: 1 }, "negative gameId"],
    [{ gameId: 1, selectedWinnerAltId: 0 }, "zero selectedWinnerAltId"],
    [{ gameId: 1.5, selectedWinnerAltId: 1 }, "non-integer gameId"],
    [{}, "missing fields"],
  ])("rejects %s (%s)", (input, _desc) => {
    expect(submitGameSelectionSchema.safeParse(input).success).toBe(false);
  });
});

describe("sendMatchMessageSchema", () => {
  it("accepts valid player message", () => {
    const result = sendMatchMessageSchema.safeParse({
      altId: 1,
      content: "Hello",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.messageType).toBe("player");
  });

  it("accepts valid judge message", () => {
    const result = sendMatchMessageSchema.safeParse({
      altId: 1,
      content: "Override",
      messageType: "judge",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.messageType).toBe("judge");
  });

  it("rejects empty content", () => {
    expect(
      sendMatchMessageSchema.safeParse({ altId: 1, content: "" }).success
    ).toBe(false);
  });

  it("rejects content exceeding 500 characters", () => {
    expect(
      sendMatchMessageSchema.safeParse({
        altId: 1,
        content: "a".repeat(501),
      }).success
    ).toBe(false);
  });

  it("rejects invalid messageType", () => {
    expect(
      sendMatchMessageSchema.safeParse({
        altId: 1,
        content: "hi",
        messageType: "spectator",
      }).success
    ).toBe(false);
  });
});

describe("createMatchGamesSchema", () => {
  it.each([1, 3, 5, 9])("accepts %d games", (n) => {
    expect(createMatchGamesSchema.safeParse({ numberOfGames: n }).success).toBe(
      true
    );
  });

  it.each([0, -1, 10, 1.5])("rejects %d games", (n) => {
    expect(createMatchGamesSchema.safeParse({ numberOfGames: n }).success).toBe(
      false
    );
  });
});

describe("judgeOverrideSchema", () => {
  it("accepts valid input", () => {
    expect(
      judgeOverrideSchema.safeParse({ gameId: 1, winnerAltId: 42 }).success
    ).toBe(true);
  });

  it("rejects missing winnerAltId", () => {
    expect(judgeOverrideSchema.safeParse({ gameId: 1 }).success).toBe(false);
  });
});

describe("judgeResetSchema", () => {
  it("accepts valid input", () => {
    expect(judgeResetSchema.safeParse({ gameId: 5 }).success).toBe(true);
  });

  it("rejects missing gameId", () => {
    expect(judgeResetSchema.safeParse({}).success).toBe(false);
  });
});
