/**
 * @jest-environment jsdom
 */

import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EmbedColorPicker } from "../embed-color-picker";

jest.mock("@/actions/discord-integration", () => ({
  updateServerSettingsAction: jest
    .fn()
    .mockResolvedValue({ success: true, data: undefined }),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("EmbedColorPicker", () => {
  const defaultProps = {
    currentColor: "#FF5733",
    serverId: 1,
    communityId: 1,
  };

  it("renders with current color and Save button", () => {
    render(<EmbedColorPicker {...defaultProps} />);
    expect(screen.getByText("Embed Color")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("#FF5733")).toBeInTheDocument();
  });

  it("Save button is disabled when color has not changed", () => {
    render(<EmbedColorPicker {...defaultProps} />);
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("clicking Save calls updateServerSettingsAction after changing color", async () => {
    const { updateServerSettingsAction } = jest.requireMock(
      "@/actions/discord-integration"
    ) as { updateServerSettingsAction: jest.Mock };

    render(<EmbedColorPicker {...defaultProps} />);
    const input = screen.getByDisplayValue("#FF5733");
    const user = userEvent.setup();

    await user.clear(input);
    await user.type(input, "#00FF00");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(updateServerSettingsAction).toHaveBeenCalledWith({
      serverId: 1,
      communityId: 1,
      settings: { embed_color: "#00FF00" },
    });
  });
});
