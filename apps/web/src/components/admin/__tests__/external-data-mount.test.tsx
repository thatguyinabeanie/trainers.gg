import { render, screen } from "@testing-library/react";

import { EventList } from "../external-data-cards";
import type { UnifiedRow } from "../external-data-shared";

const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mockUseIsMobile() }));
const mockUseIsClient = jest.fn();
jest.mock("@/hooks/use-is-client", () => ({
  useIsClient: () => mockUseIsClient(),
}));

const rows: UnifiedRow[] = [];

beforeEach(() => {
  mockUseIsClient.mockReturnValue(true);
  mockUseIsMobile.mockReturnValue(true);
});

describe("EventList (mobile cards)", () => {
  it("renders an empty state when there are no rows", () => {
    render(
      <EventList
        rows={rows}
        renderActions={() => null}
        onToggleExpand={() => {}}
        expandedRowId={null}
      />
    );
    expect(screen.getByText(/no events/i)).toBeInTheDocument();
  });
});
