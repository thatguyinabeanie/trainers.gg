/**
 * Tests for Organization Settings page
 * Covers parseSocialLinks, SocialLinksEditor, and OrgProfileForm
 */

import React, { Suspense } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { organizationFactory } from "@trainers/test-utils/factories";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUseSupabaseQuery = jest.fn();

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: (...args: unknown[]) => mockUseSupabaseQuery(...args),
}));

const mockUpdateOrganization = jest.fn();

jest.mock("@/actions/organizations", () => ({
  updateOrganization: (...args: unknown[]) => mockUpdateOrganization(...args),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
}));

// Mock PlatformIcon as a simple span to avoid SVG complexity
jest.mock("@/components/organizations/social-link-icons", () => ({
  PlatformIcon: ({ platform }: { platform: string }) => (
    <span data-testid={`platform-icon-${platform}`}>{platform}</span>
  ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildOrg(overrides: Record<string, unknown> = {}) {
  const base = organizationFactory.build();
  return {
    id: base.id,
    name: base.name,
    slug: base.slug,
    description: base.description,
    social_links: base.social_links,
    logo_url: base.logo_url,
    ...overrides,
  };
}

// The page uses React.use(params) which requires Suspense.
// We wrap the page in Suspense and flush the promise with act().
import OrgSettingsPage from "../page";

async function renderPage(org: ReturnType<typeof buildOrg> | null = null) {
  // Mock useSupabaseQuery to return org data
  mockUseSupabaseQuery.mockReturnValue({
    data: org,
    isLoading: false,
    refetch: jest.fn(),
  });

  // The page expects params as a Promise — React.use() resolves it
  const params = Promise.resolve({ orgSlug: org?.slug ?? "test-org" });

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={<div>Loading...</div>}>
        <OrgSettingsPage params={params} />
      </Suspense>
    );
  });

  return result!;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("OrgSettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loading and empty states", () => {
    it("shows skeleton when loading", async () => {
      mockUseSupabaseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: jest.fn(),
      });

      const params = Promise.resolve({ orgSlug: "test-org" });
      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <OrgSettingsPage params={params} />
          </Suspense>
        );
      });

      // Skeletons are present (no heading text yet)
      expect(
        screen.queryByText("Organization Settings")
      ).not.toBeInTheDocument();
    });

    it("shows not found message when org is null", async () => {
      await renderPage(null);

      expect(screen.getByText("Organization not found.")).toBeInTheDocument();
    });
  });

  describe("OrgProfileForm rendering", () => {
    it("renders org name and description fields", async () => {
      const org = buildOrg({
        name: "Cool Org",
        description: "A cool description",
      });
      await renderPage(org);

      expect(screen.getByLabelText("Organization Name")).toHaveValue(
        "Cool Org"
      );
      expect(screen.getByLabelText("Description")).toHaveValue(
        "A cool description"
      );
    });

    it("renders the slug card with the org slug", async () => {
      const org = buildOrg({ slug: "my-org" });
      await renderPage(org);

      expect(
        screen.getByText("trainers.gg/organizations/my-org")
      ).toBeInTheDocument();
    });

    it("renders save button", async () => {
      await renderPage(buildOrg());

      expect(
        screen.getByRole("button", { name: /save changes/i })
      ).toBeInTheDocument();
    });
  });

  describe("parseSocialLinks (via initial state)", () => {
    it("initializes social links from valid JSONB data", async () => {
      const org = buildOrg({
        social_links: [
          { platform: "discord", url: "https://discord.gg/test" },
          { platform: "twitter", url: "https://x.com/test" },
        ],
      });
      await renderPage(org);

      // Two social link rows should be rendered — each has a remove button
      const removeButtons = screen.getAllByRole("button", {
        name: /remove social link/i,
      });
      expect(removeButtons).toHaveLength(2);
    });

    it("handles invalid social_links gracefully (returns empty array)", async () => {
      const org = buildOrg({
        social_links: "not-an-array",
      });
      await renderPage(org);

      // Should show "No social links added yet."
      expect(
        screen.getByText("No social links added yet.")
      ).toBeInTheDocument();
    });

    it("handles null social_links gracefully", async () => {
      const org = buildOrg({
        social_links: null,
      });
      await renderPage(org);

      expect(
        screen.getByText("No social links added yet.")
      ).toBeInTheDocument();
    });
  });

  describe("SocialLinksEditor interactions", () => {
    it("adds a new social link with default platform 'website'", async () => {
      const user = userEvent.setup();
      const org = buildOrg({ social_links: [] });
      await renderPage(org);

      // Click "Add Social Link"
      const addButton = screen.getByRole("button", {
        name: /add social link/i,
      });
      await user.click(addButton);

      // Should now have one link row with a remove button
      expect(
        screen.getByRole("button", { name: /remove social link/i })
      ).toBeInTheDocument();

      // The platform icon for "website" should be rendered
      expect(screen.getByTestId("platform-icon-website")).toBeInTheDocument();
    });

    it("removes a social link when clicking remove button", async () => {
      const user = userEvent.setup();
      const org = buildOrg({
        social_links: [{ platform: "discord", url: "https://discord.gg/test" }],
      });
      await renderPage(org);

      // Should start with one link
      expect(
        screen.getByRole("button", { name: /remove social link/i })
      ).toBeInTheDocument();

      // Click remove
      await user.click(
        screen.getByRole("button", { name: /remove social link/i })
      );

      // Should show empty state
      expect(
        screen.getByText("No social links added yet.")
      ).toBeInTheDocument();
    });

    it("updates URL value when typing in URL input", async () => {
      const user = userEvent.setup();
      const org = buildOrg({ social_links: [] });
      await renderPage(org);

      // Add a link via button (creates { platform: "website", url: "" } in state)
      await user.click(
        screen.getByRole("button", { name: /add social link/i })
      );

      const urlInput = screen.getByPlaceholderText("https://example.com");
      await user.type(urlInput, "https://mysite.com");

      expect(urlInput).toHaveValue("https://mysite.com");
    });

    it("shows label input only for custom platform", async () => {
      const org = buildOrg({
        social_links: [
          { platform: "custom", url: "https://example.com", label: "" },
        ],
      });
      await renderPage(org);

      // Label input should be visible for custom
      expect(
        screen.getByPlaceholderText("Display label (e.g. My Blog)")
      ).toBeInTheDocument();
    });

    it("does not show label input for non-custom platforms", async () => {
      const org = buildOrg({
        social_links: [{ platform: "discord", url: "https://discord.gg/test" }],
      });
      await renderPage(org);

      expect(
        screen.queryByPlaceholderText("Display label (e.g. My Blog)")
      ).not.toBeInTheDocument();
    });

    it("can add multiple links", async () => {
      const user = userEvent.setup();
      const org = buildOrg({ social_links: [] });
      await renderPage(org);

      const addButton = screen.getByRole("button", {
        name: /add social link/i,
      });

      // Add three links
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);

      // Should have three remove buttons
      expect(
        screen.getAllByRole("button", { name: /remove social link/i })
      ).toHaveLength(3);
    });
  });

  describe("OrgProfileForm save behavior", () => {
    it("shows error toast when name is empty", async () => {
      const user = userEvent.setup();
      const org = buildOrg({ name: "Test" });
      await renderPage(org);

      // Clear the name field
      const nameInput = screen.getByLabelText("Organization Name");
      await user.clear(nameInput);

      // Click save
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(toast.error).toHaveBeenCalledWith("Organization name is required");
      // Should NOT call updateOrganization
      expect(mockUpdateOrganization).not.toHaveBeenCalled();
    });

    it("shows error toast when social links have invalid URLs", async () => {
      const user = userEvent.setup();
      const org = buildOrg({ social_links: [] });
      await renderPage(org);

      // Add a link via button, then type an invalid URL
      await user.click(
        screen.getByRole("button", { name: /add social link/i })
      );

      const urlInput = screen.getByPlaceholderText("https://example.com");
      await user.type(urlInput, "not-a-url");

      // Click save
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      // The validator should reject non-URL values
      expect(toast.error).toHaveBeenCalled();
      expect(mockUpdateOrganization).not.toHaveBeenCalled();
    });

    it("calls updateOrganization on successful save", async () => {
      const user = userEvent.setup();
      const org = buildOrg({
        id: 42,
        name: "My Org",
        slug: "my-org",
        description: "A description",
        social_links: [{ platform: "discord", url: "https://discord.gg/test" }],
      });
      mockUpdateOrganization.mockResolvedValue({ success: true });
      await renderPage(org);

      // Click save without changes
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith(
          42,
          expect.objectContaining({
            name: "My Org",
          }),
          "my-org"
        );
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Organization settings updated"
        );
      });
    });

    it("shows error toast when updateOrganization returns error", async () => {
      const user = userEvent.setup();
      const org = buildOrg({ name: "Test Org" });
      mockUpdateOrganization.mockResolvedValue({
        success: false,
        error: "Something went wrong",
      });
      await renderPage(org);

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
    });

    it("filters out empty URL links before saving", async () => {
      const user = userEvent.setup();
      const org = buildOrg({
        name: "Test Org",
        social_links: [{ platform: "discord", url: "https://discord.gg/test" }],
      });
      mockUpdateOrganization.mockResolvedValue({ success: true });
      await renderPage(org);

      // Add a second link via button (creates { platform: "website", url: "" })
      await user.click(
        screen.getByRole("button", { name: /add social link/i })
      );

      // Now we have 2 links: discord (valid) + website (empty)
      // Click save — the empty one should be filtered out
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith(
          org.id,
          expect.objectContaining({
            socialLinks: [
              { platform: "discord", url: "https://discord.gg/test" },
            ],
          }),
          org.slug
        );
      });
    });

    it("trims URL whitespace before saving", async () => {
      const user = userEvent.setup();
      const org = buildOrg({
        name: "Test Org",
        social_links: [
          { platform: "discord", url: "  https://discord.gg/test  " },
        ],
      });
      mockUpdateOrganization.mockResolvedValue({ success: true });
      await renderPage(org);

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith(
          org.id,
          expect.objectContaining({
            socialLinks: [
              { platform: "discord", url: "https://discord.gg/test" },
            ],
          }),
          org.slug
        );
      });
    });

    it("sends undefined socialLinks when all links are empty", async () => {
      const user = userEvent.setup();
      const org = buildOrg({
        name: "Test Org",
        social_links: [],
      });
      mockUpdateOrganization.mockResolvedValue({ success: true });
      await renderPage(org);

      // Add a link via button (creates empty URL)
      await user.click(
        screen.getByRole("button", { name: /add social link/i })
      );

      // Save — the empty-URL link should be filtered, resulting in undefined socialLinks
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith(
          org.id,
          expect.objectContaining({
            socialLinks: undefined,
          }),
          org.slug
        );
      });
    });
  });
});
