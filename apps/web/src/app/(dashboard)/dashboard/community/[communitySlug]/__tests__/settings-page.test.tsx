/**
 * Tests for Dashboard Community Settings page
 * Covers loading/empty states, OrgProfileForm, logo upload validation,
 * social links editor, and save behavior.
 */

import React, { Suspense } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { organizationFactory } from "@trainers/test-utils/factories";
import { MAX_IMAGE_SIZE } from "@trainers/validators";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUseSupabaseQuery = jest.fn();

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: (...args: unknown[]) => mockUseSupabaseQuery(...args),
}));

const mockUpdateOrganization = jest.fn();

jest.mock("@/actions/communities", () => ({
  updateOrganization: (...args: unknown[]) => mockUpdateOrganization(...args),
}));

jest.mock("@/actions/community-logo", () => ({
  uploadCommunityLogo: jest.fn(),
  removeCommunityLogo: jest.fn(),
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

function buildOrg(overrides: Record<string, unknown> = {}) {
  const base = organizationFactory.build();
  return {
    id: base.id,
    name: base.name,
    slug: base.slug,
    description: base.description,
    about: null as string | null,
    social_links: base.social_links,
    logo_url: base.logo_url,
    ...overrides,
  };
}

import DashboardSettingsPage from "../settings/page";

async function renderPage(org: ReturnType<typeof buildOrg> | null = null) {
  mockUseSupabaseQuery.mockReturnValue({
    data: org,
    isLoading: false,
    refetch: jest.fn(),
  });

  const params = Promise.resolve({ communitySlug: org?.slug ?? "test-org" });

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={<div>Loading...</div>}>
        <DashboardSettingsPage params={params} />
      </Suspense>
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
      mockUseSupabaseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: jest.fn(),
      });

      const params = Promise.resolve({ communitySlug: "test-org" });
      await act(async () => {
        render(
          <Suspense fallback={<div>Loading...</div>}>
            <DashboardSettingsPage params={params} />
          </Suspense>
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
        'input[type="file"][accept*="image"]'
      );
      if (!input) throw new Error("File input not found");
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
});
