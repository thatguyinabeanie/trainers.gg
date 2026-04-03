import { render, screen } from "@testing-library/react";
import { SudoCommunityBanner } from "../sudo-community-banner";

describe("SudoCommunityBanner", () => {
  it("renders the community name", () => {
    render(<SudoCommunityBanner communityName="Pallet Town VGC" />);
    expect(screen.getByText(/Pallet Town VGC/)).toBeInTheDocument();
  });

  it("includes the sudo mode notice", () => {
    render(<SudoCommunityBanner communityName="Any Community" />);
    expect(
      screen.getByText(/Viewing Any Community via sudo mode/)
    ).toBeInTheDocument();
  });

  it("indicates read-only access", () => {
    render(<SudoCommunityBanner communityName="Test Org" />);
    expect(screen.getByText(/read-only access/)).toBeInTheDocument();
  });
});
