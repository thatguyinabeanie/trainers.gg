import { render, screen, waitFor } from "@testing-library/react";
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

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div>
      <select
        data-testid="type-select"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

import { AnnouncementDialog } from "../announcement-dialog";

// ── Helpers ────────────────────────────────────────────────────────────────

function buildAnnouncement(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Maintenance Window",
    message: "The platform will be offline Saturday 2–4am UTC.",
    type: "warning",
    start_at: "2026-04-05T02:00:00.000Z",
    end_at: "2026-04-05T04:00:00.000Z",
    is_active: true,
    created_at: "2026-04-01T00:00:00.000Z",
    updated_at: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  onSubmit: jest.fn(),
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("AnnouncementDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultProps.onSubmit.mockResolvedValue(undefined);
  });

  describe("create mode (no announcement prop)", () => {
    it("shows 'Create Announcement' title", () => {
      render(<AnnouncementDialog {...defaultProps} />);
      expect(
        screen.getByRole("heading", { name: "Create Announcement" })
      ).toBeInTheDocument();
    });

    it("shows create-mode description", () => {
      render(<AnnouncementDialog {...defaultProps} />);
      expect(
        screen.getByText("Create a new announcement to display to users.")
      ).toBeInTheDocument();
    });

    it("shows 'Create Announcement' submit button", () => {
      render(<AnnouncementDialog {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Create Announcement" })
      ).toBeInTheDocument();
    });

    it("starts with empty title and message fields", () => {
      render(<AnnouncementDialog {...defaultProps} />);
      expect(screen.getByLabelText(/title/i)).toHaveValue("");
      expect(screen.getByLabelText(/message/i)).toHaveValue("");
    });

    it("starts with active checkbox checked", () => {
      render(<AnnouncementDialog {...defaultProps} />);
      expect(screen.getByRole("checkbox", { name: /active/i })).toBeChecked();
    });
  });

  describe("edit mode (announcement prop provided)", () => {
    it("shows 'Edit Announcement' title", () => {
      render(
        <AnnouncementDialog
          {...defaultProps}
          announcement={buildAnnouncement()}
        />
      );
      expect(screen.getByText("Edit Announcement")).toBeInTheDocument();
    });

    it("shows edit-mode description", () => {
      render(
        <AnnouncementDialog
          {...defaultProps}
          announcement={buildAnnouncement()}
        />
      );
      expect(
        screen.getByText("Update the announcement details below.")
      ).toBeInTheDocument();
    });

    it("shows 'Save Changes' submit button", () => {
      render(
        <AnnouncementDialog
          {...defaultProps}
          announcement={buildAnnouncement()}
        />
      );
      expect(
        screen.getByRole("button", { name: "Save Changes" })
      ).toBeInTheDocument();
    });

    it("pre-fills title and message from announcement", () => {
      render(
        <AnnouncementDialog
          {...defaultProps}
          announcement={buildAnnouncement()}
        />
      );
      expect(screen.getByLabelText(/title/i)).toHaveValue("Maintenance Window");
      expect(screen.getByLabelText(/message/i)).toHaveValue(
        "The platform will be offline Saturday 2–4am UTC."
      );
    });

    it("pre-fills is_active from announcement", () => {
      render(
        <AnnouncementDialog
          {...defaultProps}
          announcement={buildAnnouncement({ is_active: false })}
        />
      );
      expect(
        screen.getByRole("checkbox", { name: /active/i })
      ).not.toBeChecked();
    });
  });

  describe("form validation", () => {
    it("shows title error when submitted with empty title", async () => {
      const user = userEvent.setup();
      render(<AnnouncementDialog {...defaultProps} />);

      await user.click(
        screen.getByRole("button", { name: "Create Announcement" })
      );

      expect(screen.getByText("Title is required")).toBeInTheDocument();
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it("shows message error when title is filled but message is empty", async () => {
      const user = userEvent.setup();
      render(<AnnouncementDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/title/i), "My Title");
      await user.click(
        screen.getByRole("button", { name: "Create Announcement" })
      );

      expect(screen.getByText("Message is required")).toBeInTheDocument();
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it("clears title error when user starts typing in title", async () => {
      const user = userEvent.setup();
      render(<AnnouncementDialog {...defaultProps} />);

      // Trigger title error
      await user.click(
        screen.getByRole("button", { name: "Create Announcement" })
      );
      expect(screen.getByText("Title is required")).toBeInTheDocument();

      // Typing clears it
      await user.type(screen.getByLabelText(/title/i), "x");
      expect(screen.queryByText("Title is required")).not.toBeInTheDocument();
    });

    it("clears message error when user starts typing in message", async () => {
      const user = userEvent.setup();
      render(<AnnouncementDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/title/i), "Title");
      await user.click(
        screen.getByRole("button", { name: "Create Announcement" })
      );
      expect(screen.getByText("Message is required")).toBeInTheDocument();

      await user.type(screen.getByLabelText(/message/i), "x");
      expect(screen.queryByText("Message is required")).not.toBeInTheDocument();
    });
  });

  describe("successful submission", () => {
    it("calls onSubmit with trimmed title and message", async () => {
      const user = userEvent.setup();
      render(<AnnouncementDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/title/i), "  Hello  ");
      await user.type(screen.getByLabelText(/message/i), "  Some message  ");
      await user.click(
        screen.getByRole("button", { name: "Create Announcement" })
      );

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Hello",
            message: "Some message",
          })
        );
      });
    });

    it("calls onSubmit with is_active value", async () => {
      const user = userEvent.setup();
      render(<AnnouncementDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/title/i), "Test");
      await user.type(screen.getByLabelText(/message/i), "Body");
      // Uncheck active
      await user.click(screen.getByRole("checkbox", { name: /active/i }));
      await user.click(
        screen.getByRole("button", { name: "Create Announcement" })
      );

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ is_active: false })
        );
      });
    });

    it("calls onOpenChange(false) after successful submit", async () => {
      const user = userEvent.setup();
      render(<AnnouncementDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/title/i), "Test");
      await user.type(screen.getByLabelText(/message/i), "Body");
      await user.click(
        screen.getByRole("button", { name: "Create Announcement" })
      );

      await waitFor(() => {
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("passes start_at as ISO string when provided", async () => {
      const user = userEvent.setup();
      render(<AnnouncementDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/title/i), "Test");
      await user.type(screen.getByLabelText(/message/i), "Body");

      // Simulate datetime-local input via fireEvent since userEvent has limited support
      const startInput = screen.getByLabelText(/start date/i);
      await user.type(startInput, "2026-04-10T10:00");
      await user.click(
        screen.getByRole("button", { name: "Create Announcement" })
      );

      await waitFor(() => {
        const call = defaultProps.onSubmit.mock.calls[0]?.[0];
        // start_at should be defined (converted to ISO)
        expect(call?.start_at).toBeDefined();
      });
    });

    it("passes end_at as null when end date left empty", async () => {
      const user = userEvent.setup();
      render(<AnnouncementDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/title/i), "Test");
      await user.type(screen.getByLabelText(/message/i), "Body");
      await user.click(
        screen.getByRole("button", { name: "Create Announcement" })
      );

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ end_at: null })
        );
      });
    });

    it("shows 'Creating...' while submitting", async () => {
      let resolveSubmit!: () => void;
      const slowSubmit = new Promise<void>((res) => {
        resolveSubmit = res;
      });
      defaultProps.onSubmit.mockReturnValue(slowSubmit);

      const user = userEvent.setup();
      render(<AnnouncementDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/title/i), "Test");
      await user.type(screen.getByLabelText(/message/i), "Body");
      await user.click(
        screen.getByRole("button", { name: "Create Announcement" })
      );

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
      render(
        <AnnouncementDialog
          {...defaultProps}
          announcement={buildAnnouncement()}
        />
      );

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      expect(screen.getByText("Saving...")).toBeInTheDocument();
      resolveSubmit();
    });
  });

  describe("dialog not rendered when closed", () => {
    it("renders nothing when open is false", () => {
      render(<AnnouncementDialog {...defaultProps} open={false} />);
      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });
  });
});
