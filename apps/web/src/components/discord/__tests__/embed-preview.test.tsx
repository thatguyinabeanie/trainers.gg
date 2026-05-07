/**
 * @jest-environment jsdom
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { EmbedPreview } from "../embed-preview";

describe("EmbedPreview", () => {
  it("renders the bot name", () => {
    render(
      <EmbedPreview eventType="tournament_created" communityName="VGC League" />
    );
    expect(screen.getByText("Beanie Bot")).toBeInTheDocument();
    expect(screen.getByText("BOT")).toBeInTheDocument();
  });

  it("renders the community name", () => {
    render(
      <EmbedPreview eventType="tournament_created" communityName="VGC League" />
    );
    expect(screen.getByText("VGC League")).toBeInTheDocument();
  });

  it("renders sample message for tournament_created", () => {
    render(
      <EmbedPreview eventType="tournament_created" communityName="Test" />
    );
    expect(screen.getByText(/registration is now open/)).toBeInTheDocument();
  });

  it("renders fallback message for unknown event type", () => {
    render(<EmbedPreview eventType="custom_event" communityName="Test" />);
    expect(screen.getByText(/custom_event/)).toBeInTheDocument();
  });

  it("applies custom embed color as border style", () => {
    const { container } = render(
      <EmbedPreview
        embedColor="#FF5500"
        eventType="tournament_created"
        communityName="Test"
      />
    );
    const embed = container.querySelector("[style*='border-left-color']");
    expect(embed).toHaveStyle({ borderLeftColor: "#FF5500" });
  });
});
