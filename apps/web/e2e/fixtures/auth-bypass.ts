import { type Page } from "@playwright/test";

export interface E2ETestUser {
  id: string;
  email: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export const E2E_MOCK_USERS = {
  player: {
    id: "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
    email: "player@trainers.local",
    app_metadata: {},
    user_metadata: {},
  },
  admin: {
    id: "a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d",
    email: "admin@trainers.local",
    app_metadata: { site_roles: ["site_admin"] },
    user_metadata: {},
  },
} as const;

/**
 * Injects mock authentication data into browser storage for E2E tests.
 * Sets BOTH localStorage (for Supabase client) AND cookie (for Server Component auth).
 * Must be called BEFORE navigating to the page that needs auth.
 */
export async function injectE2EMockAuth(
  page: Page,
  user: E2ETestUser = E2E_MOCK_USERS.player
) {
  // 1. Set e2e-test-mode cookie in the browser context BEFORE navigation
  // This ensures the cookie is sent with the initial page request
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  const domain = new URL(baseURL).hostname;

  await page.context().addCookies([
    {
      name: "e2e-test-mode",
      value: "true",
      domain,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // 2. Inject Supabase auth token into localStorage via addInitScript
  // This runs before any page scripts, so client components will see the user
  await page.addInitScript(
    ({ mockUser }) => {
      const mockAuthToken = {
        access_token: `mock-jwt-token-${mockUser.id}`,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: `mock-refresh-token-${mockUser.id}`,
        user: {
          id: mockUser.id,
          aud: "authenticated",
          role: "authenticated",
          email: mockUser.email,
          email_confirmed_at: new Date().toISOString(),
          phone: "",
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: mockUser.app_metadata || {},
          user_metadata: mockUser.user_metadata || {},
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      const projectRef = "shsijtmbiibknwygcdtc"; // From NEXT_PUBLIC_SUPABASE_URL
      const storageKey = `sb-${projectRef}-auth-token`;
      // eslint-disable-next-line no-undef -- window is available in browser context (addInitScript)
      window.localStorage.setItem(storageKey, JSON.stringify(mockAuthToken));

      console.log("[E2E] Mock auth injected:", {
        userId: mockUser.id,
        email: mockUser.email,
        // eslint-disable-next-line no-undef -- window is available in browser context (addInitScript)
        hasToken: !!window.localStorage.getItem(storageKey),
      });
    },
    { mockUser: user }
  );
}
