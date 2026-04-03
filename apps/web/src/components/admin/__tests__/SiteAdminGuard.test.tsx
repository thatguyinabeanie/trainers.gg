import { render, screen } from "@testing-library/react";
import SiteAdminGuard from "../SiteAdminGuard";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

type UseSiteAdminReturn = {
  isSiteAdmin: boolean;
  isLoading: boolean;
  user: unknown;
};

let mockUseSiteAdminReturn: UseSiteAdminReturn = {
  isSiteAdmin: false,
  isLoading: false,
  user: null,
};

jest.mock("@/hooks/use-site-admin", () => ({
  useSiteAdmin: () => mockUseSiteAdminReturn,
}));

describe("SiteAdminGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSiteAdminReturn = { isSiteAdmin: false, isLoading: false, user: null };
  });

  it("renders loading skeletons when isLoading=true", () => {
    mockUseSiteAdminReturn = { isSiteAdmin: false, isLoading: true, user: null };
    render(
      <SiteAdminGuard>
        <div>Admin Content</div>
      </SiteAdminGuard>
    );
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("renders null and redirects to sign-in when not loading and user is null", () => {
    mockUseSiteAdminReturn = { isSiteAdmin: false, isLoading: false, user: null };
    render(
      <SiteAdminGuard>
        <div>Admin Content</div>
      </SiteAdminGuard>
    );
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/sign-in");
  });

  it("does not redirect a second time when user becomes null again (hasRedirected guard)", () => {
    mockUseSiteAdminReturn = { isSiteAdmin: false, isLoading: false, user: null };
    const { rerender } = render(
      <SiteAdminGuard>
        <div>Admin Content</div>
      </SiteAdminGuard>
    );
    expect(mockReplace).toHaveBeenCalledTimes(1);

    // Re-render with same state — should not redirect again
    rerender(
      <SiteAdminGuard>
        <div>Admin Content</div>
      </SiteAdminGuard>
    );
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it("shows Access Denied when user is authenticated but not a site admin", () => {
    mockUseSiteAdminReturn = {
      isSiteAdmin: false,
      isLoading: false,
      user: { id: "u1" },
    };
    render(
      <SiteAdminGuard>
        <div>Admin Content</div>
      </SiteAdminGuard>
    );
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("renders children when user is a site admin", () => {
    mockUseSiteAdminReturn = {
      isSiteAdmin: true,
      isLoading: false,
      user: { id: "u1" },
    };
    render(
      <SiteAdminGuard>
        <div>Admin Content</div>
      </SiteAdminGuard>
    );
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("Access Denied message mentions site administrator", () => {
    mockUseSiteAdminReturn = {
      isSiteAdmin: false,
      isLoading: false,
      user: { id: "u1" },
    };
    render(
      <SiteAdminGuard>
        <div>Admin Content</div>
      </SiteAdminGuard>
    );
    expect(
      screen.getByText(/site administrator privileges/i)
    ).toBeInTheDocument();
  });
});
