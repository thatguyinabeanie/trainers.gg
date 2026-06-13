/**
 * @jest-environment node
 *
 * Tests for the AdminConfigPage server component (T3f, Phase 2 Task 9).
 *
 * Verifies:
 *   1. The page reads site roles + admins via `createServiceRoleClient()` (not the
 *      browser anon client), so it survives the Phase 2 Task 9 REVOKE on S-bucket
 *      base tables.
 *   2. Both queries run in parallel via `Promise.all` — neither blocks the other.
 *   3. The results are forwarded as props to `AdminConfigPageClient`.
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetSiteRoles = jest.fn();
const mockGetSiteAdmins = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getSiteRoles: (...args: unknown[]) => mockGetSiteRoles(...args),
  getSiteAdmins: (...args: unknown[]) => mockGetSiteAdmins(...args),
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}));

/** Stub the client island — we only care that it receives the correct props. */
const mockAdminConfigPageClient = jest.fn();
jest.mock("../admin-config-client", () => ({
  AdminConfigPageClient: (props: unknown) => mockAdminConfigPageClient(props),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import AdminConfigPage from "../page";

// =============================================================================
// Fixtures
// =============================================================================

const SITE_ROLES = [
  {
    id: 1,
    name: "site_admin",
    description: "Site administrator",
    scope: "site",
  },
];

const SITE_ADMINS = [
  {
    id: 10,
    created_at: "2026-01-01T00:00:00.000Z",
    user: {
      id: "user-uuid-1",
      email: "admin@trainers.local",
      username: "admin_trainer",
      first_name: "Admin",
      last_name: "Trainer",
      image: null,
    },
    role: { id: 1, name: "site_admin", scope: "site" },
  },
];

const SERVICE_ROLE_CLIENT = { __serviceRole: true };

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateServiceRoleClient.mockReturnValue(SERVICE_ROLE_CLIENT);
  mockGetSiteRoles.mockResolvedValue(SITE_ROLES);
  mockGetSiteAdmins.mockResolvedValue(SITE_ADMINS);
  // AdminConfigPageClient is a client component — just return null in the server test
  mockAdminConfigPageClient.mockReturnValue(null);
});

// =============================================================================
// Tests
// =============================================================================

describe("AdminConfigPage (server component)", () => {
  it("creates a service-role client — not an anon client (Phase 2 Task 9 T3f)", async () => {
    await AdminConfigPage();

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("calls getSiteRoles with the service-role client", async () => {
    await AdminConfigPage();

    expect(mockGetSiteRoles).toHaveBeenCalledTimes(1);
    expect(mockGetSiteRoles).toHaveBeenCalledWith(SERVICE_ROLE_CLIENT);
  });

  it("calls getSiteAdmins with the service-role client", async () => {
    await AdminConfigPage();

    expect(mockGetSiteAdmins).toHaveBeenCalledTimes(1);
    expect(mockGetSiteAdmins).toHaveBeenCalledWith(SERVICE_ROLE_CLIENT);
  });

  it("runs getSiteRoles and getSiteAdmins in parallel (both called before either resolves)", async () => {
    // Track resolution order — if queries are sequential, the second won't be
    // called until the first resolves. With Promise.all they're fired together.
    const callOrder: string[] = [];
    let resolveRoles!: (v: typeof SITE_ROLES) => void;
    let resolveAdmins!: (v: typeof SITE_ADMINS) => void;

    mockGetSiteRoles.mockImplementation(
      () =>
        new Promise<typeof SITE_ROLES>((res) => {
          callOrder.push("roles:started");
          resolveRoles = res;
        })
    );
    mockGetSiteAdmins.mockImplementation(
      () =>
        new Promise<typeof SITE_ADMINS>((res) => {
          callOrder.push("admins:started");
          resolveAdmins = res;
        })
    );

    const pagePromise = AdminConfigPage();

    // Both should be started before any resolve (Promise.all fires both immediately)
    await Promise.resolve(); // flush microtasks
    expect(callOrder).toEqual(["roles:started", "admins:started"]);

    // Resolve both so the page can complete
    resolveRoles(SITE_ROLES);
    resolveAdmins(SITE_ADMINS);
    await pagePromise;
  });

  it("passes siteRoles from getSiteRoles to AdminConfigPageClient", async () => {
    // AdminConfigPage returns a React element — it does NOT call the client
    // component (JSX element creation stores the type + props without invoking
    // the function). Assert on the returned element's props, not on the mock.
    const element = await AdminConfigPage();

    expect(element.props).toEqual(
      expect.objectContaining({ siteRoles: SITE_ROLES })
    );
  });

  it("passes siteAdmins from getSiteAdmins to AdminConfigPageClient", async () => {
    const element = await AdminConfigPage();

    expect(element.props).toEqual(
      expect.objectContaining({ siteAdmins: SITE_ADMINS })
    );
  });

  it("handles empty roles and admins gracefully", async () => {
    mockGetSiteRoles.mockResolvedValue([]);
    mockGetSiteAdmins.mockResolvedValue([]);

    const element = await AdminConfigPage();

    expect(element.props).toEqual(
      expect.objectContaining({ siteRoles: [], siteAdmins: [] })
    );
  });
});
