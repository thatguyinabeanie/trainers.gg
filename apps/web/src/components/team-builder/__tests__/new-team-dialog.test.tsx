import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// =============================================================================
// Module-level mocks — must be hoisted before imports
// =============================================================================

const mockSubmitNewTeam = jest.fn();

jest.mock("../new-team-submit", () => ({
  submitNewTeam: (...args: unknown[]) => mockSubmitNewTeam(...args),
}));

// teams-list-client imports useSupabase at module load — mock the whole module
// so the import chain doesn't try to create a real Supabase client.
jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(() => ({})),
}));

// teams-list-client also calls useQuery — mock enough of TanStack Query for it.
// We use a real QueryClient in the Wrapper for useQueryClient() to work.
jest.mock("@trainers/supabase", () => ({
  getTeamsForAltList: jest.fn(),
}));

const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const mockToast = {
  error: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
};

jest.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock @base-ui/react/dialog with a minimal portal-free implementation.
// We use jest.requireActual to get React without a require() call.
jest.mock("@base-ui/react/dialog", () => {
  const ReactLib = jest.requireActual("react") as typeof React;

  function Root({
    children,
    open,
    onOpenChange: _onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) {
    return ReactLib.createElement(
      "div",
      { "data-testid": "dialog-root", "data-open": open },
      open ? children : null
    );
  }

  function Popup({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) {
    return ReactLib.createElement(
      "div",
      { role: "dialog", className },
      children
    );
  }

  function Title({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) {
    return ReactLib.createElement("h2", { className }, children);
  }

  function Description({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) {
    return ReactLib.createElement("p", { className }, children);
  }

  function Close({
    children,
    render: renderProp,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) {
    if (renderProp) {
      return ReactLib.cloneElement(renderProp, {}, children);
    }
    return ReactLib.createElement("button", { type: "button" }, children);
  }

  function Portal({ children }: { children: React.ReactNode }) {
    return ReactLib.createElement(ReactLib.Fragment, null, children);
  }

  function Backdrop() {
    return null;
  }

  return {
    Dialog: { Root, Popup, Title, Description, Close, Portal, Backdrop },
  };
});

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { NewTeamDialog } from "../new-team-dialog";

// =============================================================================
// Helpers
// =============================================================================

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = makeQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const ACTIVE_FORMATS = [
  { id: "gen9vgc2024regg", label: "Reg G", game: "Scarlet & Violet" },
  { id: "gen9vgc2024regh", label: "Reg H", game: "Scarlet & Violet" },
];

const ALTS = [
  { id: 1, username: "ash_ketchum" },
  { id: 2, username: "misty_cerulean" },
];

function renderSingleAlt(
  overrides: Partial<React.ComponentProps<typeof NewTeamDialog>> = {}
) {
  const onOpenChange = jest.fn();
  render(
    <Wrapper>
      <NewTeamDialog
        open={true}
        onOpenChange={onOpenChange}
        activeFormats={ACTIVE_FORMATS}
        initialMode="empty"
        altId={1}
        altUsername="ash_ketchum"
        {...overrides}
      />
    </Wrapper>
  );
  return { onOpenChange };
}

function renderCrossAlt(
  overrides: Partial<React.ComponentProps<typeof NewTeamDialog>> = {}
) {
  const onOpenChange = jest.fn();
  render(
    <Wrapper>
      <NewTeamDialog
        open={true}
        onOpenChange={onOpenChange}
        activeFormats={ACTIVE_FORMATS}
        initialMode="empty"
        alts={ALTS}
        {...overrides}
      />
    </Wrapper>
  );
  return { onOpenChange };
}

// =============================================================================
// Tests
// =============================================================================

describe("NewTeamDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitNewTeam.mockResolvedValue({ status: "ok", teamId: 99 });
  });

  // ---------------------------------------------------------------------------
  // 1. Alt selector visibility
  // ---------------------------------------------------------------------------

  it("renders alt selector when alts prop is provided", () => {
    renderCrossAlt();
    expect(screen.getByLabelText("Alt")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "ash_ketchum" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "misty_cerulean" })
    ).toBeInTheDocument();
  });

  it("does NOT render alt selector when altId + altUsername are provided", () => {
    renderSingleAlt();
    expect(screen.queryByLabelText("Alt")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. Mode toggle swaps paste textarea visibility
  // ---------------------------------------------------------------------------

  it("mode toggle shows paste textarea when Import paste is clicked and hides it on Empty team", () => {
    renderSingleAlt();

    // Initially empty mode — no textarea
    expect(screen.queryByLabelText("Showdown Paste")).not.toBeInTheDocument();

    // Switch to import
    fireEvent.click(screen.getByRole("button", { name: "Import paste" }));
    expect(screen.getByLabelText("Showdown Paste")).toBeInTheDocument();

    // Switch back to empty
    fireEvent.click(screen.getByRole("button", { name: "Empty team" }));
    expect(screen.queryByLabelText("Showdown Paste")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 3. Initial mode respected
  // ---------------------------------------------------------------------------

  it("renders paste textarea from the start when initialMode='import'", () => {
    renderSingleAlt({ initialMode: "import" });
    expect(screen.getByLabelText("Showdown Paste")).toBeInTheDocument();
  });

  it("shows 'Import team' title when initialMode='import'", () => {
    renderSingleAlt({ initialMode: "import" });
    expect(screen.getByText("Import team")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 4. Submit happy path (empty mode)
  // ---------------------------------------------------------------------------

  it("calls submitNewTeam with correct args and shows success toast on empty-mode submit", async () => {
    const { onOpenChange } = renderSingleAlt();

    fireEvent.change(screen.getByLabelText("Team Name"), {
      target: { value: "My Awesome Team" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mockSubmitNewTeam).toHaveBeenCalledWith({
        altId: 1,
        name: "My Awesome Team",
        format: "gen9vgc2024regg",
        mode: "empty",
        paste: "",
      });
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Team created!");
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockRouterPush).toHaveBeenCalledWith("/builder/t/acct-99");
  });

  // ---------------------------------------------------------------------------
  // 5. Submit failure
  // ---------------------------------------------------------------------------

  it("shows toast.error when submitNewTeam returns error status", async () => {
    mockSubmitNewTeam.mockResolvedValueOnce({
      status: "error",
      error: "boom",
    });

    renderSingleAlt();

    fireEvent.change(screen.getByLabelText("Team Name"), {
      target: { value: "Test Team" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("boom");
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 6. Cancel closes dialog
  // ---------------------------------------------------------------------------

  it("calls onOpenChange(false) when Cancel is clicked", () => {
    const { onOpenChange } = renderSingleAlt();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ---------------------------------------------------------------------------
  // 7. Closing resets form
  // ---------------------------------------------------------------------------

  it("resets name field to empty after Cancel is clicked and dialog reopens", () => {
    // Track open state locally so we can control rerender
    let isOpen = true;
    const handleOpenChange = jest.fn((next: boolean) => {
      isOpen = next;
    });

    const { rerender } = render(
      <Wrapper>
        <NewTeamDialog
          open={isOpen}
          onOpenChange={handleOpenChange}
          activeFormats={ACTIVE_FORMATS}
          initialMode="empty"
          altId={1}
          altUsername="ash_ketchum"
        />
      </Wrapper>
    );

    // Type a name
    fireEvent.change(screen.getByLabelText("Team Name"), {
      target: { value: "Draft Team" },
    });
    expect(screen.getByLabelText("Team Name")).toHaveValue("Draft Team");

    // Click Cancel — triggers handleOpenChange(false) which resets state
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(handleOpenChange).toHaveBeenCalledWith(false);

    // Reopen the dialog
    rerender(
      <Wrapper>
        <NewTeamDialog
          open={true}
          onOpenChange={handleOpenChange}
          activeFormats={ACTIVE_FORMATS}
          initialMode="empty"
          altId={1}
          altUsername="ash_ketchum"
        />
      </Wrapper>
    );

    expect(screen.getByLabelText("Team Name")).toHaveValue("");
  });

  // ---------------------------------------------------------------------------
  // 8. Alt selector submits with the selected alt
  // ---------------------------------------------------------------------------

  it("submits with the selected alt's id when user picks a different alt", async () => {
    renderCrossAlt();

    // Change to second alt
    fireEvent.change(screen.getByLabelText("Alt"), {
      target: { value: "2" },
    });

    fireEvent.change(screen.getByLabelText("Team Name"), {
      target: { value: "Misty Team" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mockSubmitNewTeam).toHaveBeenCalledWith(
        expect.objectContaining({ altId: 2 })
      );
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/builder/t/acct-99");
    });
  });

  // ---------------------------------------------------------------------------
  // Additional: warning toasts
  // ---------------------------------------------------------------------------

  it("shows warning toast for empty-paste status", async () => {
    mockSubmitNewTeam.mockResolvedValueOnce({
      status: "empty-paste",
      teamId: 99,
    });

    renderSingleAlt({ initialMode: "import" });

    fireEvent.change(screen.getByLabelText("Team Name"), {
      target: { value: "Test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import & Create" }));

    await waitFor(() => {
      expect(mockToast.warning).toHaveBeenCalledWith(
        "Showdown paste could not be parsed. Team created empty."
      );
    });
  });

  it("shows warning toast with failed species for partial status", async () => {
    mockSubmitNewTeam.mockResolvedValueOnce({
      status: "partial",
      teamId: 99,
      failedSpecies: ["Rillaboom", "Incineroar"],
    });

    renderSingleAlt({ initialMode: "import" });

    fireEvent.change(screen.getByLabelText("Team Name"), {
      target: { value: "Test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import & Create" }));

    await waitFor(() => {
      expect(mockToast.warning).toHaveBeenCalledWith(
        "Team created, but failed to import: Rillaboom, Incineroar"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Validation: empty name
  // ---------------------------------------------------------------------------

  it("shows error toast and does not submit when name is blank", async () => {
    renderSingleAlt();

    // Submit the form directly — bypasses browser native required-field
    // validation (which JSDOM doesn't fully honour) so our JS guard runs.
    const form = screen.getByRole("dialog").querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Please enter a team name.");
    });

    expect(mockSubmitNewTeam).not.toHaveBeenCalled();
  });
});
