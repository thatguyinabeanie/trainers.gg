import { render } from "@testing-library/react";

// --- Skeleton ---
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// --- Card / CardContent ---
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

import DashboardHomeLoading from "../loading";

describe("DashboardHomeLoading", () => {
  it("renders without crashing", () => {
    const { container } = render(<DashboardHomeLoading />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders 4 stat card skeletons", () => {
    const { getAllByTestId } = render(<DashboardHomeLoading />);
    const cards = getAllByTestId("card");
    expect(cards).toHaveLength(4);
  });

  it("renders multiple skeleton elements for the full layout", () => {
    const { getAllByTestId } = render(<DashboardHomeLoading />);
    const skeletons = getAllByTestId("skeleton");
    // Welcome header (2) + 4 cards × 3 each (12) + activity (2) + community (3) + alts (1) = 20+
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
  });
});
