import { getCorsHeaders } from "../cors";

// Helper to create a Request with a given Origin header
function requestWithOrigin(origin: string): Request {
  return new Request("https://example.com", {
    headers: { Origin: origin },
  });
}

function requestWithoutOrigin(): Request {
  return new Request("https://example.com");
}

describe("getCorsHeaders", () => {
  it("allows https://trainers.gg", () => {
    const headers = getCorsHeaders(requestWithOrigin("https://trainers.gg"));
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://trainers.gg");
  });

  it("allows https://www.trainers.gg", () => {
    const headers = getCorsHeaders(
      requestWithOrigin("https://www.trainers.gg")
    );
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://www.trainers.gg"
    );
  });

  it("allows http://localhost:3000", () => {
    const headers = getCorsHeaders(requestWithOrigin("http://localhost:3000"));
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:3000"
    );
  });

  it("allows http://127.0.0.1:3000", () => {
    const headers = getCorsHeaders(requestWithOrigin("http://127.0.0.1:3000"));
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "http://127.0.0.1:3000"
    );
  });

  it("returns empty origin for disallowed origins", () => {
    const headers = getCorsHeaders(requestWithOrigin("https://evil-site.com"));
    expect(headers["Access-Control-Allow-Origin"]).toBe("");
  });

  it("returns empty origin for requests without Origin header", () => {
    const headers = getCorsHeaders(requestWithoutOrigin());
    expect(headers["Access-Control-Allow-Origin"]).toBe("");
  });

  it("includes expected CORS headers", () => {
    const headers = getCorsHeaders(requestWithOrigin("https://trainers.gg"));
    expect(headers["Access-Control-Allow-Methods"]).toBe(
      "GET, POST, PATCH, DELETE, OPTIONS"
    );
    expect(headers["Access-Control-Allow-Headers"]).toContain("authorization");
    expect(headers["Access-Control-Allow-Headers"]).toContain("content-type");
  });

  it("does not return wildcard origin", () => {
    const headers = getCorsHeaders(requestWithOrigin("https://trainers.gg"));
    expect(headers["Access-Control-Allow-Origin"]).not.toBe("*");
  });
});
