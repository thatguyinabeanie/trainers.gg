import { render, screen } from "@testing-library/react";
import { AnalyticsCardLink } from "../analytics-card-link";

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

import { useAuthContext } from "@/components/auth/auth-provider";

const mockUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;

describe("AnalyticsCardLink", () => {
  it.each([
    {
      scenario: "unauthenticated",
      isAuthenticated: false,
      expectedText: "Sign up to track your stats",
      expectedHref: "/sign-up",
    },
    {
      scenario: "authenticated",
      isAuthenticated: true,
      expectedText: "View Analytics",
      expectedHref: "/analytics",
    },
  ])(
    "when $scenario: renders '$expectedText' link to $expectedHref",
    ({ isAuthenticated, expectedText, expectedHref }) => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated,
        loading: false,
        user: null,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });

      render(<AnalyticsCardLink />);

      const link = screen.getByRole("link", { name: expectedText });
      expect(link).toHaveAttribute("href", expectedHref);
    }
  );

  it.each([
    {
      scenario: "unauthenticated",
      isAuthenticated: false,
      absentText: "View Analytics",
    },
    {
      scenario: "authenticated",
      isAuthenticated: true,
      absentText: "Sign up to track your stats",
    },
  ])(
    "when $scenario: does NOT render '$absentText'",
    ({ isAuthenticated, absentText }) => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated,
        loading: false,
        user: null,
        signOut: jest.fn(),
        refetchUser: jest.fn(),
      });

      render(<AnalyticsCardLink />);

      expect(
        screen.queryByRole("link", { name: absentText })
      ).not.toBeInTheDocument();
    }
  );
});
