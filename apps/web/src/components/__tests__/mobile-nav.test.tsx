import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNav } from "../mobile-nav";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

type UseAuthReturn = { user: unknown };
let mockUseAuthReturn: UseAuthReturn = { user: null };

jest.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => mockUseAuthReturn,
}));

describe("MobileNav", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthReturn = { user: null };
  });

  it("renders the menu trigger button", () => {
    render(<MobileNav />);
    expect(
      screen.getByRole("button", { name: "Toggle menu" })
    ).toBeInTheDocument();
  });

  it("shows public nav items when unauthenticated", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));

    expect(
      screen.getByRole("button", { name: /Tournaments/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Communities/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Dashboard/ })
    ).not.toBeInTheDocument();
  });

  it("shows Sign In and Sign Up buttons when unauthenticated", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));

    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
  });

  it("shows authenticated nav items (including Dashboard) when user is logged in", async () => {
    mockUseAuthReturn = { user: { id: "u1" } };
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));

    expect(
      screen.getByRole("button", { name: /Dashboard/ })
    ).toBeInTheDocument();
  });

  it("hides Sign In and Sign Up buttons when authenticated", async () => {
    mockUseAuthReturn = { user: { id: "u1" } };
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));

    expect(
      screen.queryByRole("button", { name: "Sign In" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign Up" })
    ).not.toBeInTheDocument();
  });

  it("navigates to the correct path when a nav item is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));
    await user.click(screen.getByRole("button", { name: /Tournaments/ }));

    expect(mockPush).toHaveBeenCalledWith("/tournaments");
  });

  it("navigates to /sign-in when Sign In is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(mockPush).toHaveBeenCalledWith("/sign-in");
  });

  it("navigates to /sign-up when Sign Up is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(mockPush).toHaveBeenCalledWith("/sign-up");
  });

  it("shows trainers.gg in the sheet header", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));

    expect(screen.getByText("trainers.gg")).toBeInTheDocument();
  });

  it.each([
    ["/tournaments", "Tournaments"],
    ["/communities", "Communities"],
    ["/analytics", "Analytics"],
    ["/coaching", "Coaching"],
  ])(
    "navigates to %s when %s nav item is clicked (unauthenticated)",
    async (path, label) => {
      const user = userEvent.setup();
      render(<MobileNav />);

      await user.click(screen.getByRole("button", { name: "Toggle menu" }));
      await user.click(screen.getByRole("button", { name: new RegExp(label) }));

      expect(mockPush).toHaveBeenCalledWith(path);
    }
  );
});
