import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    type,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button type={type ?? "button"} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

import { FlagDialog } from "../flag-dialog";

// ── Helpers ────────────────────────────────────────────────────────────────

function buildFlag(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    key: "my_feature_flag",
    description: "Controls the new feature",
    enabled: true,
    metadata: { rollout: 50 },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  onSubmit: jest.fn(),
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("FlagDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultProps.onSubmit.mockResolvedValue(undefined);
  });

  describe("create mode (no flag prop)", () => {
    it("shows 'Create Feature Flag' title", () => {
      render(<FlagDialog {...defaultProps} />);
      expect(screen.getByText("Create Feature Flag")).toBeInTheDocument();
    });

    it("shows create-mode description", () => {
      render(<FlagDialog {...defaultProps} />);
      expect(
        screen.getByText(
          "Define a new feature flag to control platform behavior."
        )
      ).toBeInTheDocument();
    });

    it("shows 'Create Flag' submit button", () => {
      render(<FlagDialog {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Create Flag" })
      ).toBeInTheDocument();
    });

    it("starts with empty key field", () => {
      render(<FlagDialog {...defaultProps} />);
      expect(screen.getByLabelText(/key/i)).toHaveValue("");
    });

    it("starts with enabled checkbox unchecked", () => {
      render(<FlagDialog {...defaultProps} />);
      expect(
        screen.getByRole("checkbox", { name: /enabled/i })
      ).not.toBeChecked();
    });

    it("shows snake_case hint text in create mode", () => {
      render(<FlagDialog {...defaultProps} />);
      expect(screen.getByText(/must be snake_case/i)).toBeInTheDocument();
    });

    it("key input is enabled in create mode", () => {
      render(<FlagDialog {...defaultProps} />);
      expect(screen.getByLabelText(/key/i)).not.toBeDisabled();
    });
  });

  describe("edit mode (flag prop provided)", () => {
    it("shows 'Edit Feature Flag' title", () => {
      render(<FlagDialog {...defaultProps} flag={buildFlag()} />);
      expect(screen.getByText("Edit Feature Flag")).toBeInTheDocument();
    });

    it("shows 'Save Changes' submit button", () => {
      render(<FlagDialog {...defaultProps} flag={buildFlag()} />);
      expect(
        screen.getByRole("button", { name: "Save Changes" })
      ).toBeInTheDocument();
    });

    it("pre-fills key from flag", () => {
      render(<FlagDialog {...defaultProps} flag={buildFlag()} />);
      expect(screen.getByLabelText(/key/i)).toHaveValue("my_feature_flag");
    });

    it("disables the key input in edit mode", () => {
      render(<FlagDialog {...defaultProps} flag={buildFlag()} />);
      expect(screen.getByLabelText(/key/i)).toBeDisabled();
    });

    it("pre-fills enabled from flag", () => {
      render(
        <FlagDialog {...defaultProps} flag={buildFlag({ enabled: true })} />
      );
      expect(screen.getByRole("checkbox", { name: /enabled/i })).toBeChecked();
    });

    it("pre-fills description from flag", () => {
      render(<FlagDialog {...defaultProps} flag={buildFlag()} />);
      expect(screen.getByLabelText(/description/i)).toHaveValue(
        "Controls the new feature"
      );
    });

    it("pre-fills metadata as formatted JSON", () => {
      render(<FlagDialog {...defaultProps} flag={buildFlag()} />);
      const metadataTextarea = screen.getByLabelText(/metadata/i);
      expect(metadataTextarea).toHaveValue(
        JSON.stringify({ rollout: 50 }, null, 2)
      );
    });

    it("hides snake_case hint text in edit mode", () => {
      render(<FlagDialog {...defaultProps} flag={buildFlag()} />);
      expect(screen.queryByText(/must be snake_case/i)).not.toBeInTheDocument();
    });
  });

  describe("key validation", () => {
    it("shows error when key is empty on submit", async () => {
      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Create Flag" }));

      expect(screen.getByText("Key is required")).toBeInTheDocument();
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it.each([
      ["My Flag", "Key must be snake_case"],
      ["myFlag", "Key must be snake_case"],
      ["my-flag", "Key must be snake_case"],
      ["_flag", "Key must be snake_case"],
      ["123flag", "Key must be snake_case"],
      ["my flag", "Key must be snake_case"],
    ])(
      "shows snake_case error for invalid key '%s'",
      async (invalidKey, errorMsg) => {
        const user = userEvent.setup();
        render(<FlagDialog {...defaultProps} />);

        await user.type(screen.getByLabelText(/key/i), invalidKey);
        await user.click(screen.getByRole("button", { name: "Create Flag" }));

        expect(screen.getByText(new RegExp(errorMsg, "i"))).toBeInTheDocument();
        expect(defaultProps.onSubmit).not.toHaveBeenCalled();
      }
    );

    it.each(["my_flag", "feature_flag", "flag123", "a", "my_feature_flag_v2"])(
      "accepts valid snake_case key '%s'",
      async (validKey) => {
        const user = userEvent.setup();
        render(<FlagDialog {...defaultProps} />);

        await user.type(screen.getByLabelText(/key/i), validKey);
        await user.click(screen.getByRole("button", { name: "Create Flag" }));

        // No key error shown
        expect(screen.queryByText("Key is required")).not.toBeInTheDocument();
        expect(
          screen.queryByText("Key must be snake_case (e.g. my_feature_flag)")
        ).not.toBeInTheDocument();
      }
    );

    it("clears key error when user types after an error", async () => {
      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Create Flag" }));
      expect(screen.getByText("Key is required")).toBeInTheDocument();

      await user.type(screen.getByLabelText(/key/i), "x");
      expect(screen.queryByText("Key is required")).not.toBeInTheDocument();
    });
  });

  describe("metadata JSON validation", () => {
    it("shows error when metadata contains invalid JSON", async () => {
      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/key/i), "my_flag");
      // Use fireEvent to bypass userEvent's special-char handling for `{`
      fireEvent.change(screen.getByLabelText(/metadata/i), {
        target: { value: "{invalid json" },
      });
      await user.click(screen.getByRole("button", { name: "Create Flag" }));

      expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it("accepts valid JSON in metadata", async () => {
      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/key/i), "my_flag");
      fireEvent.change(screen.getByLabelText(/metadata/i), {
        target: { value: '{"rollout": 100}' },
      });
      await user.click(screen.getByRole("button", { name: "Create Flag" }));

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: { rollout: 100 },
          })
        );
      });
    });

    it("omits metadata when field is empty", async () => {
      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/key/i), "my_flag");
      await user.click(screen.getByRole("button", { name: "Create Flag" }));

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: undefined,
          })
        );
      });
    });

    it("clears metadata error when user edits the field", async () => {
      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/key/i), "my_flag");
      fireEvent.change(screen.getByLabelText(/metadata/i), {
        target: { value: "bad{" },
      });
      await user.click(screen.getByRole("button", { name: "Create Flag" }));
      expect(screen.getByText("Invalid JSON")).toBeInTheDocument();

      // Editing the field clears the error
      fireEvent.change(screen.getByLabelText(/metadata/i), {
        target: { value: "" },
      });
      expect(screen.queryByText("Invalid JSON")).not.toBeInTheDocument();
    });
  });

  describe("successful submission", () => {
    it("calls onSubmit with trimmed key and empty description as undefined", async () => {
      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/key/i), "  my_flag  ");
      await user.click(screen.getByRole("button", { name: "Create Flag" }));

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            key: "my_flag",
            description: undefined,
          })
        );
      });
    });

    it("passes description when provided", async () => {
      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/key/i), "my_flag");
      await user.type(screen.getByLabelText(/description/i), "My description");
      await user.click(screen.getByRole("button", { name: "Create Flag" }));

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ description: "My description" })
        );
      });
    });

    it("passes enabled: true when checkbox is checked", async () => {
      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/key/i), "my_flag");
      await user.click(screen.getByRole("checkbox", { name: /enabled/i }));
      await user.click(screen.getByRole("button", { name: "Create Flag" }));

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ enabled: true })
        );
      });
    });

    it("calls onOpenChange(false) after successful submit", async () => {
      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/key/i), "my_flag");
      await user.click(screen.getByRole("button", { name: "Create Flag" }));

      await waitFor(() => {
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("shows 'Creating...' while submitting in create mode", async () => {
      let resolveSubmit!: () => void;
      const slowSubmit = new Promise<void>((res) => {
        resolveSubmit = res;
      });
      defaultProps.onSubmit.mockReturnValue(slowSubmit);

      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/key/i), "my_flag");
      await user.click(screen.getByRole("button", { name: "Create Flag" }));

      expect(screen.getByText("Creating...")).toBeInTheDocument();
      resolveSubmit();
    });

    it("shows 'Saving...' while submitting in edit mode", async () => {
      let resolveSubmit!: () => void;
      const slowSubmit = new Promise<void>((res) => {
        resolveSubmit = res;
      });
      defaultProps.onSubmit.mockReturnValue(slowSubmit);

      const user = userEvent.setup();
      render(<FlagDialog {...defaultProps} flag={buildFlag()} />);

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      expect(screen.getByText("Saving...")).toBeInTheDocument();
      resolveSubmit();
    });
  });

  describe("dialog not rendered when closed", () => {
    it("renders nothing when open is false", () => {
      render(<FlagDialog {...defaultProps} open={false} />);
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });
});
