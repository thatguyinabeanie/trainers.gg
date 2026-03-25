import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationPreferencesForm } from "../notification-preferences-form";
import { NOTIFICATION_CATEGORIES } from "@trainers/validators";

// Mock the server action
jest.mock("@/actions/notification-preferences", () => ({
  updateNotificationPreferencesAction: jest.fn(),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("NotificationPreferencesForm", () => {
  it("should render all non-staff categories for regular users", () => {
    render(
      <NotificationPreferencesForm initialPreferences={null} isStaff={false} />
    );

    // Non-staff categories should be visible
    const nonStaffCategories = NOTIFICATION_CATEGORIES.filter(
      (c) => !c.staffOnly
    );
    for (const cat of nonStaffCategories) {
      expect(screen.getByText(cat.label)).toBeInTheDocument();
    }

    // Staff category should NOT be visible
    expect(screen.queryByText("Staff")).not.toBeInTheDocument();
  });

  it("should render staff category for staff users", () => {
    render(
      <NotificationPreferencesForm initialPreferences={null} isStaff={true} />
    );

    // All categories should be visible, including Staff
    expect(screen.getByText("Staff")).toBeInTheDocument();
    expect(screen.getByText("Judge Call")).toBeInTheDocument();
    expect(screen.getByText("Judge Resolved")).toBeInTheDocument();
  });

  it("should default all toggles to enabled when no preferences exist", () => {
    render(
      <NotificationPreferencesForm initialPreferences={null} isStaff={true} />
    );

    // All switches should be checked by default
    const switches = screen.getAllByRole("checkbox");
    for (const switchEl of switches) {
      expect(switchEl).toBeChecked();
    }
  });

  it("should respect saved preferences", () => {
    const saved = {
      match_ready: true,
      match_result: false,
      match_disputed: true,
      match_no_show: true,
      tournament_start: false,
      tournament_round: true,
      tournament_complete: true,
      org_request_approved: true,
      org_request_rejected: true,
    };

    render(
      <NotificationPreferencesForm initialPreferences={saved} isStaff={false} />
    );

    // Find the Match Result switch - it should be unchecked
    const matchResultSwitch = screen.getByLabelText("Match Result");
    expect(matchResultSwitch).not.toBeChecked();

    // Match Ready should be checked
    const matchReadySwitch = screen.getByLabelText("Match Ready");
    expect(matchReadySwitch).toBeChecked();
  });

  it("should render the save button", () => {
    render(
      <NotificationPreferencesForm initialPreferences={null} isStaff={false} />
    );

    expect(
      screen.getByRole("button", { name: /save preferences/i })
    ).toBeInTheDocument();
  });

  it("should call updateNotificationPreferencesAction on save", async () => {
    const { updateNotificationPreferencesAction: mockAction } =
      jest.requireMock("@/actions/notification-preferences") as {
        updateNotificationPreferencesAction: jest.Mock;
      };
    mockAction.mockResolvedValue({ success: true });

    render(
      <NotificationPreferencesForm initialPreferences={null} isStaff={false} />
    );

    const saveButton = screen.getByRole("button", {
      name: /save preferences/i,
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockAction).toHaveBeenCalled();
    });
  });

  it("should render category descriptions", () => {
    render(
      <NotificationPreferencesForm initialPreferences={null} isStaff={false} />
    );

    expect(
      screen.getByText("Notifications about your matches")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Notifications about tournament events")
    ).toBeInTheDocument();
  });
});
