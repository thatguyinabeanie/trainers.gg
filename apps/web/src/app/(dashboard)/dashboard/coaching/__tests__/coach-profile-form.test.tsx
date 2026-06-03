import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- Mocks ---

// Mock shadcn/ui card components
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock shadcn/ui button
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant: _variant,
    size: _size,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
}));

// Mock shadcn/ui input
jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

// Mock shadcn/ui textarea
jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

// Mock shadcn/ui label
jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

// Mock shadcn/ui checkbox as a native checkbox so onCheckedChange is easy to invoke
jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
    className: _className,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    className?: string;
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked ?? false}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the server action
const mockUpdateCoachProfileAction = jest.fn();
jest.mock("../actions", () => ({
  updateCoachProfileAction: (...args: unknown[]) =>
    mockUpdateCoachProfileAction(...args),
}));

import { CoachProfileForm } from "../coach-profile-form";
import { toast } from "sonner";
import type { CoachProfileInput } from "@trainers/validators";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const EMPTY_INITIAL: CoachProfileInput = {
  headline: "",
  bio: "",
  formats: [],
  links: [],
  serviceTypes: [],
};

const POPULATED_INITIAL: CoachProfileInput = {
  headline: "VGC 2025 Specialist",
  bio: "Experienced coach with top finishes",
  formats: ["VGC 2025", "Reg G"],
  links: [{ label: "Twitter", url: "https://twitter.com/trainer" }],
  serviceTypes: ["live", "replay_review"],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CoachProfileForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateCoachProfileAction.mockResolvedValue({ success: true });
  });

  // -------------------------------------------------------------------------
  // Initial rendering
  // -------------------------------------------------------------------------

  describe("rendering with initial values", () => {
    it("renders the headline field pre-filled", () => {
      render(<CoachProfileForm initial={POPULATED_INITIAL} />);

      expect(
        screen.getByDisplayValue("VGC 2025 Specialist")
      ).toBeInTheDocument();
    });

    it("renders the bio field pre-filled", () => {
      render(<CoachProfileForm initial={POPULATED_INITIAL} />);

      expect(
        screen.getByDisplayValue("Experienced coach with top finishes")
      ).toBeInTheDocument();
    });

    it("renders formats as comma-separated string", () => {
      render(<CoachProfileForm initial={POPULATED_INITIAL} />);

      expect(screen.getByDisplayValue("VGC 2025, Reg G")).toBeInTheDocument();
    });

    it("shows pre-existing link rows", () => {
      render(<CoachProfileForm initial={POPULATED_INITIAL} />);

      expect(screen.getByDisplayValue("Twitter")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("https://twitter.com/trainer")
      ).toBeInTheDocument();
    });

    it("renders service type checkboxes for all service types", () => {
      render(<CoachProfileForm initial={EMPTY_INITIAL} />);

      expect(screen.getByLabelText("Live Sessions")).toBeInTheDocument();
      expect(screen.getByLabelText("Replay Review")).toBeInTheDocument();
      expect(screen.getByLabelText("Team Review")).toBeInTheDocument();
      expect(screen.getByLabelText("Mentorship")).toBeInTheDocument();
    });

    it("pre-checks service types from initial state", () => {
      render(<CoachProfileForm initial={POPULATED_INITIAL} />);

      expect(screen.getByLabelText("Live Sessions")).toBeChecked();
      expect(screen.getByLabelText("Replay Review")).toBeChecked();
      expect(screen.getByLabelText("Team Review")).not.toBeChecked();
      expect(screen.getByLabelText("Mentorship")).not.toBeChecked();
    });

    it("renders Save Profile button", () => {
      render(<CoachProfileForm initial={EMPTY_INITIAL} />);

      expect(
        screen.getByRole("button", { name: /save profile/i })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Submit — payload mapping logic (the core business logic to test)
  // -------------------------------------------------------------------------

  describe("handleSave payload mapping", () => {
    it("calls updateCoachProfileAction with headline and bio on submit", async () => {
      const user = userEvent.setup();
      render(<CoachProfileForm initial={EMPTY_INITIAL} />);

      await user.type(
        screen.getByPlaceholderText(/vgc 2025 regulation/i),
        "My headline"
      );
      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        expect(mockUpdateCoachProfileAction).toHaveBeenCalledWith(
          expect.objectContaining({ headline: "My headline" })
        );
      });
    });

    it("splits formats on comma and trims whitespace", async () => {
      const user = userEvent.setup();
      render(
        <CoachProfileForm
          initial={{ ...EMPTY_INITIAL, formats: ["VGC 2025", " Reg G "] }}
        />
      );
      // formats initially rendered as "VGC 2025,  Reg G " — simulate save
      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        const call = mockUpdateCoachProfileAction.mock
          .calls[0]?.[0] as CoachProfileInput;
        expect(call.formats).toEqual(["VGC 2025", "Reg G"]);
      });
    });

    it("drops empty format entries after splitting", async () => {
      const user = userEvent.setup();
      render(<CoachProfileForm initial={{ ...EMPTY_INITIAL, formats: [] }} />);

      // Clear the formats input and add trailing comma
      const formatsInput = screen.getByPlaceholderText(/vgc 2025, reg g/i);
      await user.type(formatsInput, "VGC 2025,,, Reg G,");
      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        const call = mockUpdateCoachProfileAction.mock
          .calls[0]?.[0] as CoachProfileInput;
        // Empties (from ",,,") should be filtered out
        expect(call.formats).not.toContain("");
        expect(call.formats).toContain("VGC 2025");
        expect(call.formats).toContain("Reg G");
      });
    });

    it("filters out link rows where label is blank", async () => {
      const user = userEvent.setup();
      render(
        <CoachProfileForm
          initial={{
            ...EMPTY_INITIAL,
            links: [
              { label: "", url: "https://example.com" },
              { label: "Twitter", url: "https://twitter.com" },
            ],
          }}
        />
      );

      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        const call = mockUpdateCoachProfileAction.mock
          .calls[0]?.[0] as CoachProfileInput;
        // The link with blank label should be filtered out
        expect(call.links).toHaveLength(1);
        expect(call.links[0]).toEqual({
          label: "Twitter",
          url: "https://twitter.com",
        });
      });
    });

    it("filters out link rows where URL is blank", async () => {
      const user = userEvent.setup();
      render(
        <CoachProfileForm
          initial={{
            ...EMPTY_INITIAL,
            links: [
              { label: "Twitter", url: "" },
              { label: "YouTube", url: "https://youtube.com/@trainer" },
            ],
          }}
        />
      );

      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        const call = mockUpdateCoachProfileAction.mock
          .calls[0]?.[0] as CoachProfileInput;
        expect(call.links).toHaveLength(1);
        expect(call.links[0]?.label).toBe("YouTube");
      });
    });

    it("sends serviceTypes as array from Set", async () => {
      const user = userEvent.setup();
      render(
        <CoachProfileForm
          initial={{ ...EMPTY_INITIAL, serviceTypes: ["live", "mentorship"] }}
        />
      );

      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        const call = mockUpdateCoachProfileAction.mock
          .calls[0]?.[0] as CoachProfileInput;
        expect(call.serviceTypes).toEqual(
          expect.arrayContaining(["live", "mentorship"])
        );
        expect(call.serviceTypes).toHaveLength(2);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Service type checkbox interactions
  // -------------------------------------------------------------------------

  describe("service type toggling", () => {
    it("unchecking a service type removes it from the payload", async () => {
      const user = userEvent.setup();
      render(
        <CoachProfileForm
          initial={{ ...EMPTY_INITIAL, serviceTypes: ["live"] }}
        />
      );

      // Uncheck "live"
      await user.click(screen.getByLabelText("Live Sessions"));
      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        const call = mockUpdateCoachProfileAction.mock
          .calls[0]?.[0] as CoachProfileInput;
        expect(call.serviceTypes).not.toContain("live");
      });
    });

    it("checking a service type adds it to the payload", async () => {
      const user = userEvent.setup();
      render(<CoachProfileForm initial={EMPTY_INITIAL} />);

      await user.click(screen.getByLabelText("Team Review"));
      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        const call = mockUpdateCoachProfileAction.mock
          .calls[0]?.[0] as CoachProfileInput;
        expect(call.serviceTypes).toContain("team_review");
      });
    });
  });

  // -------------------------------------------------------------------------
  // Link management
  // -------------------------------------------------------------------------

  describe("link row management", () => {
    it("clicking Add link adds a new row", async () => {
      const user = userEvent.setup();
      render(<CoachProfileForm initial={EMPTY_INITIAL} />);

      await user.click(screen.getByRole("button", { name: /add link/i }));

      expect(screen.getByLabelText("Link 1 label")).toBeInTheDocument();
      expect(screen.getByLabelText("Link 1 URL")).toBeInTheDocument();
    });

    it("clicking Remove deletes the link row", async () => {
      const user = userEvent.setup();
      render(
        <CoachProfileForm
          initial={{
            ...EMPTY_INITIAL,
            links: [{ label: "Twitter", url: "https://twitter.com" }],
          }}
        />
      );

      expect(screen.getByDisplayValue("Twitter")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /remove link 1/i }));

      expect(screen.queryByDisplayValue("Twitter")).not.toBeInTheDocument();
    });

    it("hides Add link button when 10 links are present", () => {
      const tenLinks = Array.from({ length: 10 }, (_, i) => ({
        label: `Link ${i + 1}`,
        url: `https://example.com/${i}`,
      }));
      render(
        <CoachProfileForm initial={{ ...EMPTY_INITIAL, links: tenLinks }} />
      );

      expect(
        screen.queryByRole("button", { name: /add link/i })
      ).not.toBeInTheDocument();
    });

    it("shows Add link button when fewer than 10 links are present", () => {
      render(
        <CoachProfileForm
          initial={{
            ...EMPTY_INITIAL,
            links: [{ label: "Twitter", url: "https://twitter.com" }],
          }}
        />
      );

      expect(
        screen.getByRole("button", { name: /add link/i })
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Toast feedback
  // -------------------------------------------------------------------------

  describe("toast feedback", () => {
    it("shows success toast when save succeeds", async () => {
      const user = userEvent.setup();
      render(<CoachProfileForm initial={EMPTY_INITIAL} />);

      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Coach profile saved");
      });
    });

    it("shows error toast when save fails with error message", async () => {
      mockUpdateCoachProfileAction.mockResolvedValue({
        success: false,
        error: "Headline contains profanity",
      });

      const user = userEvent.setup();
      render(<CoachProfileForm initial={EMPTY_INITIAL} />);

      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Headline contains profanity");
      });
    });

    it("shows fallback error toast when save fails with no error message", async () => {
      mockUpdateCoachProfileAction.mockResolvedValue({ success: false });

      const user = userEvent.setup();
      render(<CoachProfileForm initial={EMPTY_INITIAL} />);

      await user.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to save profile");
      });
    });
  });
});
