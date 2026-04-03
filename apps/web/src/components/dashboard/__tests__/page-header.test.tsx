import { render, screen } from "@testing-library/react";

// Mock sidebar trigger — it requires SidebarProvider context
jest.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: ({ className }: { className?: string }) => (
    <button className={className} aria-label="Toggle sidebar" />
  ),
}));

// Mock separator
jest.mock("@/components/ui/separator", () => ({
  Separator: ({ orientation }: { orientation?: string }) => (
    <hr aria-orientation={orientation ?? "horizontal"} />
  ),
}));

// Mock notifications popover
jest.mock("@/components/dashboard/notifications-popover", () => ({
  NotificationsPopover: () => <div data-testid="notifications-popover" />,
}));

import { PageHeader } from "../page-header";

describe("PageHeader", () => {
  it("renders without crashing", () => {
    render(<PageHeader />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders the title when provided", () => {
    render(<PageHeader title="My Dashboard" />);
    expect(screen.getByText("My Dashboard")).toBeInTheDocument();
  });

  it("does not render a title span when title is omitted", () => {
    render(<PageHeader />);
    // No text node for the title
    expect(screen.queryByText("My Dashboard")).not.toBeInTheDocument();
  });

  it("renders children alongside the title", () => {
    render(
      <PageHeader title="Settings">
        <span>Extra action</span>
      </PageHeader>
    );
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Extra action")).toBeInTheDocument();
  });

  it("always renders the notifications popover", () => {
    render(<PageHeader />);
    expect(screen.getByTestId("notifications-popover")).toBeInTheDocument();
  });
});
