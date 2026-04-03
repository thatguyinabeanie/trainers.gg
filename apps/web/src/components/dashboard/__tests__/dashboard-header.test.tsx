import { render, screen } from "@testing-library/react";

const mockUseAuth = jest.fn();

jest.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
  useAuthContext: () => mockUseAuth(),
}));

import { DashboardHeader } from "../dashboard-header";

describe("DashboardHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("greets with profile displayName when available", () => {
    mockUseAuth.mockReturnValue({
      user: { profile: { displayName: "Ash Ketchum" } },
    });
    render(<DashboardHeader />);
    expect(screen.getByText(/Welcome back,/)).toBeInTheDocument();
    expect(screen.getByText(/Ash Ketchum/)).toBeInTheDocument();
  });

  it("falls back to user_metadata.full_name when no profile displayName", () => {
    mockUseAuth.mockReturnValue({
      user: {
        profile: null,
        user_metadata: { full_name: "Misty" },
      },
    });
    render(<DashboardHeader />);
    expect(screen.getByText(/Misty/)).toBeInTheDocument();
  });

  it("falls back to user_metadata.name when no full_name", () => {
    mockUseAuth.mockReturnValue({
      user: {
        profile: null,
        user_metadata: { name: "Brock" },
      },
    });
    render(<DashboardHeader />);
    expect(screen.getByText(/Brock/)).toBeInTheDocument();
  });

  it("falls back to 'Trainer' when no user", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<DashboardHeader />);
    expect(screen.getByText(/Trainer/)).toBeInTheDocument();
  });

  it("falls back to 'Trainer' when no metadata or profile", () => {
    mockUseAuth.mockReturnValue({
      user: { profile: null, user_metadata: {} },
    });
    render(<DashboardHeader />);
    expect(screen.getByText(/Trainer/)).toBeInTheDocument();
  });

  it("renders the subtitle text", () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<DashboardHeader />);
    expect(
      screen.getByText(/Here's what's happening on trainers\.gg/)
    ).toBeInTheDocument();
  });
});
