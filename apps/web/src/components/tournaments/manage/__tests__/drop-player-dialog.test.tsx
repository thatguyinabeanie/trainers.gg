import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropPlayerDialog } from "../drop-player-dialog";

describe("DropPlayerDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    playerName: "ash_ketchum",
    onConfirm: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("disables confirm button until category is selected", () => {
    render(<DropPlayerDialog {...defaultProps} />);

    const confirmButton = screen.getByRole("button", {
      name: /confirm drop/i,
    });
    expect(confirmButton).toBeDisabled();
  });

  it("allows submit with no_show and no notes", async () => {
    const user = userEvent.setup();
    render(<DropPlayerDialog {...defaultProps} />);

    // Select the No-Show radio option
    const noShowRadio = screen.getByLabelText("No-Show");
    await user.click(noShowRadio);

    // Confirm button should now be enabled
    const confirmButton = screen.getByRole("button", {
      name: /confirm drop/i,
    });
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalledWith("no_show", undefined);
    });
  });

  it.each([
    { category: "Conduct", value: "conduct" },
    { category: "Disqualification", value: "disqualification" },
    { category: "Other", value: "other" },
  ] as const)(
    "requires notes for $value category",
    async ({ category, value }) => {
      const user = userEvent.setup();
      render(<DropPlayerDialog {...defaultProps} />);

      // Select the radio option
      const radio = screen.getByLabelText(category);
      await user.click(radio);

      // Confirm button should still be disabled (notes required)
      const confirmButton = screen.getByRole("button", {
        name: /confirm drop/i,
      });
      expect(confirmButton).toBeDisabled();

      // Type notes
      const textarea = screen.getByPlaceholderText(
        "Provide additional context..."
      );
      await user.type(textarea, "Some notes");

      // Confirm button should now be enabled
      expect(confirmButton).toBeEnabled();

      await user.click(confirmButton);

      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalledWith(
          value,
          "Some notes"
        );
      });
    }
  );

  it("shows player name for single drop", () => {
    render(<DropPlayerDialog {...defaultProps} playerName="ash_ketchum" />);

    expect(screen.getByText("Drop ash_ketchum")).toBeInTheDocument();
  });

  it("shows player count for bulk drop", () => {
    render(
      <DropPlayerDialog
        {...defaultProps}
        playerName={undefined}
        playerCount={5}
      />
    );

    expect(screen.getByText("Drop 5 Players")).toBeInTheDocument();
  });
});
