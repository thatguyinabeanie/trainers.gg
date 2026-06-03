import { render, screen } from "@testing-library/react";

import { TeamsTab } from "../teams-tab";

describe("TeamsTab", () => {
  it("renders the coming soon placeholder", () => {
    render(<TeamsTab altIds={[1, 2]} handle="ash_ketchum" />);

    expect(screen.getByText("Teams coming soon.")).toBeInTheDocument();
  });

  it("accepts altIds and handle props without error", () => {
    // Ensures the component renders with empty altIds
    const { container } = render(<TeamsTab altIds={[]} handle="misty" />);

    expect(container.firstChild).toBeInTheDocument();
  });
});
