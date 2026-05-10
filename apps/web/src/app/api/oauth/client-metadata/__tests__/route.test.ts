import { GET } from "../route";

// Mock NextResponse.json since Response.json() isn't available in jsdom
jest.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { headers?: Record<string, string> }) => {
      const headers = new Headers(init?.headers);
      headers.set("Content-Type", "application/json");
      return {
        json: async () => data,
        headers,
        status: 200,
      };
    },
  },
}));

const ENDPOINT_PATH = "/api/oauth/client-metadata";

// jsdom's Request implementation may not populate .url correctly.
function createRequest(url: string): Request {
  return { url } as unknown as Request;
}

describe("GET /api/oauth/client-metadata", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns correct metadata with client_id matching the endpoint URL", async () => {
    const response = await GET(createRequest("https://trainers.gg" + ENDPOINT_PATH));
    const body = await response.json();

    expect(body.client_id).toBe("https://trainers.gg" + ENDPOINT_PATH);
    expect(body.client_name).toBe("trainers.gg");
    expect(body.grant_types).toEqual(["authorization_code", "refresh_token"]);
    expect(body.response_types).toEqual(["code"]);
    expect(body.application_type).toBe("web");
    expect(body.token_endpoint_auth_method).toBe("private_key_jwt");
    expect(body.token_endpoint_auth_signing_alg).toBe("ES256");
    expect(body.dpop_bound_access_tokens).toBe(true);
    expect(body.scope).toBe("atproto transition:generic");
  });

  it("uses NEXT_PUBLIC_SITE_URL when set", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.trainers.gg";

    const response = await GET(createRequest("http://localhost:3000" + ENDPOINT_PATH));
    const body = await response.json();

    expect(body.client_id).toBe("https://app.trainers.gg" + ENDPOINT_PATH);
    expect(body.client_uri).toBe("https://app.trainers.gg");
    expect(body.redirect_uris).toEqual(["https://app.trainers.gg/api/oauth/callback"]);
  });

  it("falls back to request host when NEXT_PUBLIC_SITE_URL is not set", async () => {
    const response = await GET(createRequest("https://localhost:3000" + ENDPOINT_PATH));
    const body = await response.json();

    expect(body.client_id).toBe("https://localhost:3000" + ENDPOINT_PATH);
    expect(body.client_uri).toBe("https://localhost:3000");
  });

  it("sets Cache-Control header", async () => {
    const response = await GET(createRequest("https://trainers.gg" + ENDPOINT_PATH));

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
  });

  it("all URLs in metadata use the correct base URL", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://trainers.gg";

    const response = await GET(createRequest("https://trainers.gg" + ENDPOINT_PATH));
    const body = await response.json();

    expect(body.logo_uri).toBe("https://trainers.gg/logo.png");
    expect(body.tos_uri).toBe("https://trainers.gg/terms");
    expect(body.policy_uri).toBe("https://trainers.gg/privacy");
    expect(body.redirect_uris).toEqual(["https://trainers.gg/api/oauth/callback"]);
    expect(body.jwks_uri).toBe("https://trainers.gg/oauth/jwks.json");
  });
});
