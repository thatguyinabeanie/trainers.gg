import { render, screen, waitFor, act } from "@testing-library/react";
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

  it("resets form state when dialog closes and reopens", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DropPlayerDialog {...defaultProps} />);

    // Select a category and type notes
    const conductRadio = screen.getByLabelText("Conduct");
    await user.click(conductRadio);

    const textarea = screen.getByPlaceholderText(
      "Provide additional context..."
    );
    await user.type(textarea, "Some misconduct notes");

    // Close the dialog
    rerender(<DropPlayerDialog {...defaultProps} open={false} />);

    // Reopen the dialog
    rerender(<DropPlayerDialog {...defaultProps} open={true} />);

    // Verify the category is deselected (confirm button should be disabled)
    const confirmButton = screen.getByRole("button", {
      name: /confirm drop/i,
    });
    expect(confirmButton).toBeDisabled();

    // Verify notes are empty
    const newTextarea = screen.getByPlaceholderText(
      "Provide additional context..."
    );
    expect(newTextarea).toHaveValue("");
  });

  it("re-enables confirm button after onConfirm settles", async () => {
    const user = userEvent.setup();

    // Use a deferred promise so we can observe the intermediate
    // isSubmitting state. handleConfirm uses try/finally, so the
    // finally block always resets isSubmitting regardless of outcome.
    let resolveFn!: () => void;
    const slowOnConfirm = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = resolve;
        })
    );

    render(<DropPlayerDialog {...defaultProps} onConfirm={slowOnConfirm} />);

    // Select the No-Show radio option
    const noShowRadio = screen.getByLabelText("No-Show");
    await user.click(noShowRadio);

    // Click confirm — starts the submission
    const confirmButton = screen.getByRole("button", {
      name: /confirm drop/i,
    });
    await user.click(confirmButton);

    // Button should be disabled while onConfirm is pending
    expect(confirmButton).toBeDisabled();
    expect(slowOnConfirm).toHaveBeenCalledWith("no_show", undefined);

    // Resolve the promise — the finally block resets isSubmitting
    await act(async () => {
      resolveFn();
    });

    // After settlement, the button should be re-enabled
    await waitFor(() => {
      expect(confirmButton).toBeEnabled();
    });
  });
});
