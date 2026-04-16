import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DiscordNotificationsInfoBanner } from "../_components/discord-notifications-info-banner";

describe("DiscordNotificationsInfoBanner", () => {
  it("renders the banner on mount", () => {
    render(<DiscordNotificationsInfoBanner />);

    expect(
      screen.getByText(
        /Discord notifications are configured for this community/i
      )
    ).toBeInTheDocument();
  });

  it("renders the dismiss button", () => {
    render(<DiscordNotificationsInfoBanner />);

    expect(
      screen.getByRole("button", { name: /dismiss/i })
    ).toBeInTheDocument();
  });

  it("hides the banner after clicking dismiss", async () => {
    const user = userEvent.setup();
    render(<DiscordNotificationsInfoBanner />);

    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(
      screen.queryByText(
        /Discord notifications are configured for this community/i
      )
    ).not.toBeInTheDocument();
  });

  it("renders the robot emoji", () => {
    render(<DiscordNotificationsInfoBanner />);

    expect(screen.getByText("🤖")).toBeInTheDocument();
  });
});
