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

const ENDPOINT_PATH = "/api/oauth/mobile-client-metadata";

// jsdom's Request implementation may not populate .url correctly.
function createRequest(url: string): Request {
  return { url } as unknown as Request;
}

describe("GET /api/oauth/mobile-client-metadata", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns correct metadata for native app", async () => {
    const response = await GET(createRequest("https://trainers.gg" + ENDPOINT_PATH));
    const body = await response.json();

    expect(body.client_id).toBe("https://trainers.gg" + ENDPOINT_PATH);
    expect(body.client_name).toBe("trainers.gg");
    expect(body.grant_types).toEqual(["authorization_code", "refresh_token"]);
    expect(body.response_types).toEqual(["code"]);
    expect(body.scope).toBe("atproto transition:generic");
    expect(body.dpop_bound_access_tokens).toBe(true);
  });

  it("uses native deep link redirect URI", async () => {
    const response = await GET(createRequest("https://trainers.gg" + ENDPOINT_PATH));
    const body = await response.json();

    expect(body.redirect_uris).toEqual(["gg.trainers:/oauth/atproto-callback"]);
  });

  it("application_type is native", async () => {
    const response = await GET(createRequest("https://trainers.gg" + ENDPOINT_PATH));
    const body = await response.json();

    expect(body.application_type).toBe("native");
  });

  it("token_endpoint_auth_method is none (public client)", async () => {
    const response = await GET(createRequest("https://trainers.gg" + ENDPOINT_PATH));
    const body = await response.json();

    expect(body.token_endpoint_auth_method).toBe("none");
  });

  it("does not include jwks_uri (public clients do not sign)", async () => {
    const response = await GET(createRequest("https://trainers.gg" + ENDPOINT_PATH));
    const body = await response.json();

    expect(body.jwks_uri).toBeUndefined();
  });

  it("uses NEXT_PUBLIC_SITE_URL for base URLs", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.trainers.gg";

    const response = await GET(createRequest("http://localhost:3000" + ENDPOINT_PATH));
    const body = await response.json();

    expect(body.client_id).toBe("https://app.trainers.gg" + ENDPOINT_PATH);
    expect(body.client_uri).toBe("https://app.trainers.gg");
    expect(body.logo_uri).toBe("https://app.trainers.gg/logo.png");
  });

  it("falls back to request host when NEXT_PUBLIC_SITE_URL is not set", async () => {
    const response = await GET(createRequest("https://localhost:3000" + ENDPOINT_PATH));
    const body = await response.json();

    expect(body.client_id).toBe("https://localhost:3000" + ENDPOINT_PATH);
    expect(body.client_uri).toBe("https://localhost:3000");
  });
});
