import { render } from "@testing-library/react";

// --- Skeleton (renders a div) ---
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// --- PageContainer ---
jest.mock("@/components/layout/page-container", () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import PlayerProfileLoading from "../loading";

describe("PlayerProfileLoading", () => {
  it("renders without crashing", () => {
    const { container } = render(<PlayerProfileLoading />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders multiple skeleton elements", () => {
    const { getAllByTestId } = render(<PlayerProfileLoading />);
    const skeletons = getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
