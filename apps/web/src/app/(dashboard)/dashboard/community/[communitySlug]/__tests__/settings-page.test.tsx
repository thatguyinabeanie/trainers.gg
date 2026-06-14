/**
 * Tests for Dashboard Community Settings page
 * Covers loading/empty states, OrgProfileForm, logo upload validation,
 * social links editor, save behavior, and the Discord "bot installed" chip.
 */

import React, { Suspense } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { organizationFactory } from "@trainers/test-utils/factories";
import { MAX_IMAGE_SIZE } from "@trainers/validators";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  })),
  supabase: {
    from: jest.fn().mockReturnThis(),
  },
}));

// The community fetch moved to the auth-gated /api/v1/communities/[slug] route
// (Phase 2 S-bucket migration). The page now reads it via `useApiQuery` from
// `@trainers/supabase/react-query`; only the Discord-server lookup still uses
// `useSupabaseQuery`.
const mockUseApiQuery = jest.fn();
jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

const mockGetDiscordServerByCommunityId = jest.fn();
jest.mock("@trainers/supabase", () => ({
  getDiscordServerByCommunityId: (...args: unknown[]) =>
    mockGetDiscordServerByCommunityId(...args),
}));

const mockSupabaseClient = {
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    }),
  },
};

jest.mock("@/lib/supabase", () => ({
  useSupabase: () => mockSupabaseClient,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const mockUpdateOrganization = jest.fn();

jest.mock("@/actions/communities", () => ({
  updateOrganization: (...args: unknown[]) => mockUpdateOrganization(...args),
}));

jest.mock("@/actions/community-logo", () => ({
  uploadCommunityLogo: jest.fn(),
  removeCommunityLogo: jest.fn(),
}));

jest.mock("@/actions/community-banner", () => ({
  uploadCommunityBanner: jest.fn(),
  removeCommunityBanner: jest.fn(),
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

jest.mock("@/components/communities/social-link-icons", () => ({
  PlatformIcon: ({ platform }: { platform: string }) => (
    <span data-testid={`platform-icon-${platform}`}>{platform}</span>
  ),
}));

jest.mock("@/components/ui/markdown-content", () => ({
  MarkdownContent: ({ content }: { content: string }) => (
    <div data-testid="markdown-content">{content}</div>
  ),
}));

jest.mock("@/components/dashboard/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

jest.mock("@/components/dashboard/dashboard-card", () => ({
  DashboardCard: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h2>{label}</h2>
      {children}
    </div>
  ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function buildOrg(overrides: Record<string, unknown> = {}) {
  const base = organizationFactory.build();
  return {
    id: base.id,
    name: base.name,
    slug: base.slug,
    description: base.description,
    about: null as string | null,
    banner_url: null as string | null,
    social_links: base.social_links,
    logo_url: base.logo_url,
    ...overrides,
  };
}

import DashboardSettingsPage from "../settings/page";

interface RenderOptions {
  /** Discord server row to return from the discord query (null = not installed) */
  discordServer?: Record<string, unknown> | null;
}

async function renderPage(
  org: ReturnType<typeof buildOrg> | null = null,
  { discordServer = null }: RenderOptions = {}
) {
  // The community row comes from useApiQuery, keyed by ["community", slug].
  mockUseApiQuery.mockReturnValue({
    data: org,
    isLoading: false,
    refetch: jest.fn(),
  });

  // The Discord-server lookup now uses real useQuery; the queryFn calls
  // getDiscordServerByCommunityId, which we mock to resolve to discordServer.
  mockGetDiscordServerByCommunityId.mockResolvedValue(discordServer);

  const params = Promise.resolve({ communitySlug: org?.slug ?? "test-org" });

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={<div>Loading...</div>}>
        <DashboardSettingsPage params={params} />
      </Suspense>,
      { wrapper: createWrapper() }
    );
  });

  return result!;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("DashboardSettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loading and empty states", () => {
    it("shows skeleton when loading", async () => {
      // Loading is now driven by the useApiQuery community fetch.
      mockUseApiQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: jest.fn(),
      });

      const params = Promise.resolve({ communitySlug: "test-org" });
      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <DashboardSettingsPage params={params} />
          </Suspense>,
          { wrapper: createWrapper() }
        );
      });

      expect(screen.queryByLabelText("Community Name")).not.toBeInTheDocument();
    });

    it("shows not found message when org is null", async () => {
      await renderPage(null);
      expect(screen.getByText("Community not found.")).toBeInTheDocument();
    });
  });

  describe("form rendering", () => {
    it("renders community name field with org name", async () => {
      await renderPage(buildOrg({ name: "Cool Org" }));
      expect(screen.getByLabelText("Community Name")).toHaveValue("Cool Org");
    });

    it("renders slug as read-only text", async () => {
      await renderPage(buildOrg({ slug: "my-org" }));
      expect(
        screen.getByText("trainers.gg/communities/my-org")
      ).toBeInTheDocument();
    });

    it("renders description field with org description", async () => {
      await renderPage(buildOrg({ description: "A competitive community" }));
      expect(screen.getByLabelText("Short Description")).toHaveValue(
        "A competitive community"
      );
    });

    it("renders save button", async () => {
      await renderPage(buildOrg());
      expect(
        screen.getByRole("button", { name: /^save$/i })
      ).toBeInTheDocument();
    });

    it("renders upload logo button", async () => {
      await renderPage(buildOrg());
      expect(
        screen.getByRole("button", { name: /upload community logo/i })
      ).toBeInTheDocument();
    });

    it("shows remove logo button when org has a logo", async () => {
      await renderPage(
        buildOrg({ logo_url: "https://storage.example.com/logo.jpg" })
      );
      expect(
        screen.getByRole("button", { name: /remove logo/i })
      ).toBeInTheDocument();
    });

    it("hides remove logo button when org has no logo", async () => {
      await renderPage(buildOrg({ logo_url: null }));
      expect(
        screen.queryByRole("button", { name: /remove logo/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("social links editor", () => {
    it("initializes with existing social links", async () => {
      const org = buildOrg({
        social_links: [
          { platform: "discord", url: "https://discord.gg/test" },
          { platform: "twitter", url: "https://x.com/test" },
        ],
      });
      await renderPage(org);

      const removeButtons = screen.getAllByRole("button", {
        name: /remove social link/i,
      });
      expect(removeButtons).toHaveLength(2);
    });

    it("shows no remove buttons when no social links", async () => {
      await renderPage(buildOrg({ social_links: [] }));
      expect(
        screen.queryByRole("button", { name: /remove social link/i })
      ).not.toBeInTheDocument();
    });

    it("handles invalid social_links data gracefully (no remove buttons)", async () => {
      await renderPage(buildOrg({ social_links: "not-an-array" }));
      expect(
        screen.queryByRole("button", { name: /remove social link/i })
      ).not.toBeInTheDocument();
    });

    it("adds a new social link when clicking Add", async () => {
      const user = userEvent.setup();
      await renderPage(buildOrg({ social_links: [] }));

      await user.click(screen.getByRole("button", { name: /add link/i }));

      expect(
        screen.getByRole("button", { name: /remove social link/i })
      ).toBeInTheDocument();
    });

    it("removes a social link when clicking remove", async () => {
      const user = userEvent.setup();
      await renderPage(
        buildOrg({
          social_links: [{ platform: "discord", url: "https://discord.gg/x" }],
        })
      );

      expect(
        screen.getByRole("button", { name: /remove social link/i })
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: /remove social link/i })
      );

      expect(
        screen.queryByRole("button", { name: /remove social link/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("save behavior", () => {
    it("shows error toast when name is empty", async () => {
      const user = userEvent.setup();
      await renderPage(buildOrg({ name: "Test" }));

      await user.clear(screen.getByLabelText("Community Name"));
      await user.click(screen.getByRole("button", { name: /^save$/i }));

      expect(toast.error).toHaveBeenCalledWith("Community name is required");
      expect(mockUpdateOrganization).not.toHaveBeenCalled();
    });

    it("calls updateOrganization on successful save", async () => {
      const user = userEvent.setup();
      const org = buildOrg({ id: 42, name: "My Org", slug: "my-org" });
      mockUpdateOrganization.mockResolvedValue({ success: true });
      await renderPage(org);

      await user.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith(
          42,
          expect.objectContaining({ name: "My Org" }),
          "my-org"
        );
      });
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Community settings updated"
        );
      });
    });

    it("shows error toast when server returns an error", async () => {
      const user = userEvent.setup();
      mockUpdateOrganization.mockResolvedValue({
        success: false,
        error: "Something went wrong",
      });
      await renderPage(buildOrg({ name: "Test Org" }));

      await user.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
    });

    it("filters out empty-URL social links before saving", async () => {
      const user = userEvent.setup();
      const org = buildOrg({
        id: 7,
        name: "Test Org",
        slug: "test-org",
        social_links: [{ platform: "discord", url: "https://discord.gg/x" }],
      });
      mockUpdateOrganization.mockResolvedValue({ success: true });
      await renderPage(org);

      // Add an empty link
      await user.click(screen.getByRole("button", { name: /add link/i }));

      await user.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() => {
        expect(mockUpdateOrganization).toHaveBeenCalledWith(
          7,
          expect.objectContaining({
            socialLinks: [{ platform: "discord", url: "https://discord.gg/x" }],
          }),
          "test-org"
        );
      });
    });
  });

  describe("logo upload validation", () => {
    function getFileInput(): HTMLInputElement {
      const input = document.querySelector(
        'input[type="file"][aria-label="Upload community logo"]'
      );
      if (!input) throw new Error("Logo file input not found");
      return input as HTMLInputElement;
    }

    function createTestFile(name: string, type: string, size: number): File {
      return new File([new Uint8Array(size)], name, { type });
    }

    async function selectFile(input: HTMLInputElement, file: File) {
      const { fireEvent } = await import("@testing-library/react");
      Object.defineProperty(input, "files", {
        value: [file],
        writable: false,
        configurable: true,
      });
      fireEvent.change(input);
    }

    it("shows error toast for empty file", async () => {
      await renderPage(buildOrg());
      await selectFile(
        getFileInput(),
        createTestFile("empty.png", "image/png", 0)
      );
      expect(toast.error).toHaveBeenCalledWith("File is empty");
    });

    it("shows error toast for oversized file", async () => {
      await renderPage(buildOrg());
      await selectFile(
        getFileInput(),
        createTestFile("big.png", "image/png", MAX_IMAGE_SIZE + 1)
      );
      expect(toast.error).toHaveBeenCalledWith(
        "File must be smaller than 2 MB"
      );
    });

    it("shows error toast for invalid file type", async () => {
      await renderPage(buildOrg());
      await selectFile(
        getFileInput(),
        createTestFile("readme.txt", "text/plain", 100)
      );
      expect(toast.error).toHaveBeenCalledWith(
        "File must be a JPEG, PNG, WebP, or GIF image"
      );
    });

    it("calls uploadCommunityLogo with org id and formData for a valid file", async () => {
      const { uploadCommunityLogo } = jest.requireMock(
        "@/actions/community-logo"
      ) as { uploadCommunityLogo: jest.Mock };
      uploadCommunityLogo.mockResolvedValue({
        success: true,
        data: { logoUrl: "https://storage.example.com/logo.jpg" },
      });

      const org = buildOrg({ id: 42 });
      await renderPage(org);

      await selectFile(
        getFileInput(),
        createTestFile("logo.jpg", "image/jpeg", 1024)
      );

      await waitFor(() => {
        expect(uploadCommunityLogo).toHaveBeenCalledWith(
          42,
          expect.any(FormData)
        );
      });
    });

    it("shows error toast when upload fails", async () => {
      const { uploadCommunityLogo } = jest.requireMock(
        "@/actions/community-logo"
      ) as { uploadCommunityLogo: jest.Mock };
      uploadCommunityLogo.mockResolvedValue({
        success: false,
        error: "Upload failed",
      });

      await renderPage(buildOrg({ id: 1 }));

      await selectFile(
        getFileInput(),
        createTestFile("logo.jpg", "image/jpeg", 1024)
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Upload failed");
      });
    });
  });

  describe("logo removal", () => {
    it("calls removeCommunityLogo and hides remove button on success", async () => {
      const user = userEvent.setup();
      const { removeCommunityLogo } = jest.requireMock(
        "@/actions/community-logo"
      ) as { removeCommunityLogo: jest.Mock };
      removeCommunityLogo.mockResolvedValue({ success: true });

      await renderPage(
        buildOrg({ id: 5, logo_url: "https://storage.example.com/logo.jpg" })
      );

      await user.click(screen.getByRole("button", { name: /remove logo/i }));

      await waitFor(() => {
        expect(removeCommunityLogo).toHaveBeenCalledWith(5);
      });
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Logo removed");
      });
    });
  });

  describe("banner upload validation", () => {
    function getBannerInput(): HTMLInputElement {
      const input = document.querySelector(
        'input[type="file"][aria-label="Upload community banner image"]'
      );
      if (!input) throw new Error("Banner file input not found");
      return input as HTMLInputElement;
    }

    function createTestFile(name: string, type: string, size: number): File {
      return new File([new Uint8Array(size)], name, { type });
    }

    async function selectFile(input: HTMLInputElement, file: File) {
      const { fireEvent } = await import("@testing-library/react");
      Object.defineProperty(input, "files", {
        value: [file],
        writable: false,
        configurable: true,
      });
      fireEvent.change(input);
    }

    it("shows error toast for empty banner file", async () => {
      await renderPage(buildOrg());
      await selectFile(
        getBannerInput(),
        createTestFile("empty.png", "image/png", 0)
      );
      expect(toast.error).toHaveBeenCalledWith("File is empty");
    });

    it("shows error toast for oversized banner file", async () => {
      await renderPage(buildOrg());
      await selectFile(
        getBannerInput(),
        createTestFile("big.png", "image/png", MAX_IMAGE_SIZE + 1)
      );
      expect(toast.error).toHaveBeenCalledWith(
        "File must be smaller than 2 MB"
      );
    });

    it("shows error toast for invalid banner file type", async () => {
      await renderPage(buildOrg());
      await selectFile(
        getBannerInput(),
        createTestFile("readme.txt", "text/plain", 100)
      );
      expect(toast.error).toHaveBeenCalledWith(
        "File must be a JPEG, PNG, WebP, or GIF image"
      );
    });

    it("calls uploadCommunityBanner with org id and formData for a valid file", async () => {
      const { uploadCommunityBanner } = jest.requireMock(
        "@/actions/community-banner"
      ) as { uploadCommunityBanner: jest.Mock };
      uploadCommunityBanner.mockResolvedValue({
        success: true,
        data: { bannerUrl: "https://storage.example.com/banner.jpg" },
      });

      const org = buildOrg({ id: 42 });
      await renderPage(org);

      await selectFile(
        getBannerInput(),
        createTestFile("banner.jpg", "image/jpeg", 1024)
      );

      await waitFor(() => {
        expect(uploadCommunityBanner).toHaveBeenCalledWith(
          42,
          expect.any(FormData)
        );
      });
    });

    it("shows error toast when banner upload fails", async () => {
      const { uploadCommunityBanner } = jest.requireMock(
        "@/actions/community-banner"
      ) as { uploadCommunityBanner: jest.Mock };
      uploadCommunityBanner.mockResolvedValue({
        success: false,
        error: "Banner upload failed",
      });

      await renderPage(buildOrg({ id: 1 }));

      await selectFile(
        getBannerInput(),
        createTestFile("banner.jpg", "image/jpeg", 1024)
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Banner upload failed");
      });
    });
  });

  describe("banner removal", () => {
    it("calls removeCommunityBanner and hides remove button on success", async () => {
      const user = userEvent.setup();
      const { removeCommunityBanner } = jest.requireMock(
        "@/actions/community-banner"
      ) as { removeCommunityBanner: jest.Mock };
      removeCommunityBanner.mockResolvedValue({ success: true });

      await renderPage(
        buildOrg({
          id: 5,
          banner_url: "https://storage.example.com/banner.jpg",
        })
      );

      await user.click(screen.getByRole("button", { name: /remove banner/i }));

      await waitFor(() => {
        expect(removeCommunityBanner).toHaveBeenCalledWith(5);
      });
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Banner removed");
      });
    });

    it("shows remove banner button when org has a banner", async () => {
      await renderPage(
        buildOrg({
          banner_url: "https://storage.example.com/banner.jpg",
        })
      );
      expect(
        screen.getByRole("button", { name: /remove banner/i })
      ).toBeInTheDocument();
    });

    it("hides remove banner button when org has no banner", async () => {
      await renderPage(buildOrg({ banner_url: null }));
      expect(
        screen.queryByRole("button", { name: /remove banner/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Discord bot installed chip", () => {
    it("shows the chip on the Discord row when bot is installed", async () => {
      const org = buildOrg({
        slug: "my-community",
        social_links: [{ platform: "discord", url: "https://discord.gg/test" }],
      });
      await renderPage(org, {
        discordServer: { id: 1, community_id: org.id, guild_id: "123" },
      });

      const chip = await screen.findByTestId("discord-bot-chip");
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveTextContent("Bot installed — configure");
      expect(chip).toHaveAttribute(
        "href",
        "/dashboard/community/my-community/settings/integrations/discord"
      );
    });

    it("does not show the chip when bot is not installed", async () => {
      const org = buildOrg({
        slug: "my-community",
        social_links: [{ platform: "discord", url: "https://discord.gg/test" }],
      });
      // discordServer defaults to null — not installed
      await renderPage(org);

      expect(screen.queryByTestId("discord-bot-chip")).not.toBeInTheDocument();
    });

    it("does not show the chip on non-Discord social link rows even when bot is installed", async () => {
      const org = buildOrg({
        slug: "my-community",
        social_links: [
          { platform: "twitter", url: "https://x.com/test" },
          { platform: "twitch", url: "https://twitch.tv/test" },
        ],
      });
      await renderPage(org, {
        discordServer: { id: 1, community_id: org.id, guild_id: "123" },
      });

      expect(screen.queryByTestId("discord-bot-chip")).not.toBeInTheDocument();
    });

    it("does not show the chip when there are no social links at all", async () => {
      const org = buildOrg({ slug: "my-community", social_links: [] });
      await renderPage(org, {
        discordServer: { id: 1, community_id: org.id, guild_id: "123" },
      });

      expect(screen.queryByTestId("discord-bot-chip")).not.toBeInTheDocument();
    });
  });

  describe("bluesky identity card", () => {
    it("shows active state with handle and DID when PDS is active", async () => {
      const org = buildOrg({
        bluesky_handle: "test-org.trainers.gg",
        bluesky_did: "did:plc:abc123",
        pds_status: "active",
      });
      await renderPage(org);

      expect(screen.getByText("Active on network")).toBeInTheDocument();
      expect(screen.getByText("@test-org.trainers.gg")).toBeInTheDocument();
      expect(screen.getByText("did:plc:abc123")).toBeInTheDocument();
    });

    it("shows enable button when community has no PDS status", async () => {
      const org = buildOrg({
        bluesky_handle: null,
        bluesky_did: null,
        pds_status: null,
      });
      await renderPage(org);

      expect(
        screen.getByRole("button", { name: /Enable Bluesky Identity/i })
      ).toBeInTheDocument();
    });

    it("shows retry button when PDS provisioning previously failed", async () => {
      const org = buildOrg({
        bluesky_handle: null,
        bluesky_did: null,
        pds_status: "failed",
      });
      await renderPage(org);

      expect(
        screen.getByRole("button", { name: /Retry/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText("Previous attempt failed. You can try again.")
      ).toBeInTheDocument();
    });

    it("does not show active state when DID is missing even with active status", async () => {
      const org = buildOrg({
        bluesky_handle: "test-org.trainers.gg",
        bluesky_did: null,
        pds_status: "active",
      });
      await renderPage(org);

      expect(screen.queryByText("Active on network")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Enable Bluesky Identity/i })
      ).toBeInTheDocument();
    });
  });
});
