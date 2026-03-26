import { render, screen } from "@testing-library/react";
import { HeroCTA } from "../hero-cta";

// Mock Next.js Link to render a plain anchor so href is accessible in tests
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock the auth provider so we can control auth state per test
jest.mock("@/components/auth/auth-provider", () => ({
  useAuthContext: jest.fn(),
}));

// Mock buttonVariants — returns empty string so className assertions stay simple
jest.mock("@/components/ui/button", () => ({
  buttonVariants: () => "",
}));

// Mock cn — just returns empty string; we're not testing styles
jest.mock("@/lib/utils", () => ({
  cn: () => "",
}));

import { useAuthContext } from "@/components/auth/auth-provider";

const mockUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;

describe("HeroCTA", () => {
  // "Explore Players" always appears regardless of auth state
  it("always renders Explore Players link to /players", () => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
      signOut: jest.fn(),
      refetchUser: jest.fn(),
    });

    render(<HeroCTA />);

    const exploreLink = screen.getByRole("link", { name: "Explore Players" });
    expect(exploreLink).toHaveAttribute("href", "/players");
  });

  it.each([
    {
      scenario: "loading",
      loading: true,
      isAuthenticated: false,
      expectedText: "Get Started",
      expectedHref: "/sign-up",
    },
    {
      scenario: "unauthenticated",
      loading: false,
      isAuthenticated: false,
      expectedText: "Get Started",
      expectedHref: "/sign-up",
    },
    {
      scenario: "authenticated",
      loading: false,
      isAuthenticated: true,
      expectedText: "Go to Dashboard",
      expectedHref: "/dashboard",
    },
  ])(
    "when $scenario: renders '$expectedText' link to $expectedHref",
    ({ loading, isAuthenticated, expectedText, expectedHref }) => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated,
        loading,
        user: null,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });

      render(<HeroCTA />);

      const primaryLink = screen.getByRole("link", { name: expectedText });
      expect(primaryLink).toHaveAttribute("href", expectedHref);
    }
  );

  it.each([
    {
      scenario: "loading",
      loading: true,
      isAuthenticated: false,
      absentText: "Go to Dashboard",
    },
    {
      scenario: "unauthenticated",
      loading: false,
      isAuthenticated: false,
      absentText: "Go to Dashboard",
    },
    {
      scenario: "authenticated",
      loading: false,
      isAuthenticated: true,
      absentText: "Get Started",
    },
  ])(
    "when $scenario: does NOT render '$absentText'",
    ({ loading, isAuthenticated, absentText }) => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated,
        loading,
        user: null,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });

      render(<HeroCTA />);

      expect(
        screen.queryByRole("link", { name: absentText })
      ).not.toBeInTheDocument();
    }
  );
});
