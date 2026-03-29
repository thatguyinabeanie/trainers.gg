import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { CreateTournamentClient } from "../create-tournament-client";
import { useSupabaseQuery, useSupabaseMutation } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/use-current-user";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(),
  useSupabaseMutation: jest.fn(),
}));

jest.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: jest.fn(),
}));

// Mock child components, capturing props so we can assert on formData
const mockScheduleProps = jest.fn();
const mockRegistrationProps = jest.fn();

jest.mock("@/components/tournaments", () => ({
  TournamentSchedule: (props: Record<string, unknown>) => {
    mockScheduleProps(props);
    return (
      <div data-testid="tournament-schedule">
        <button
          data-testid="set-start-date"
          onClick={() =>
            (props.updateFormData as (u: Record<string, unknown>) => void)({
              startDate: 1700000000000,
            })
          }
        >
          Set Date
        </button>
        <span data-testid="start-date-value">
          {String((props.formData as { startDate?: number }).startDate ?? "")}
        </span>
      </div>
    );
  },
  TournamentRegistration: (props: Record<string, unknown>) => {
    mockRegistrationProps(props);
    return <div data-testid="tournament-registration" />;
  },
  TournamentFormat: () => <div data-testid="tournament-format" />,
  TournamentReview: () => <div data-testid="tournament-review" />,
  TournamentGameSettings: () => <div data-testid="game-settings" />,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const mockOrganization = {
  id: 1,
  name: "Test Org",
  slug: "test-org",
  owner_user_id: "user-1",
};

function setupMocks() {
  (useRouter as jest.Mock).mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
  });
  (useCurrentUser as jest.Mock).mockReturnValue({
    user: { id: "user-1" },
    isLoading: false,
  });
  (useSupabaseQuery as jest.Mock).mockReturnValue({
    data: mockOrganization,
    isLoading: false,
  });
  (useSupabaseMutation as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn(),
  });
  mockScheduleProps.mockClear();
  mockRegistrationProps.mockClear();
}

describe("CreateTournamentClient", () => {
  beforeEach(setupMocks);

  it("renders the wizard form with schedule and registration sections", () => {
    render(<CreateTournamentClient communitySlug="test-org" />);

    expect(screen.getByText("Create Tournament")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-schedule")).toBeInTheDocument();
    expect(screen.getByTestId("tournament-registration")).toBeInTheDocument();
  });

  it("passes formData to child components via form.watch()", () => {
    render(<CreateTournamentClient communitySlug="test-org" />);

    // form.watch() is called during render, providing reactive formData
    expect(mockScheduleProps).toHaveBeenCalled();
    const scheduleCall = mockScheduleProps.mock.calls[0]?.[0];
    expect(scheduleCall).toHaveProperty("formData");
    expect(scheduleCall).toHaveProperty("updateFormData");
  });

  it("re-renders child components when updateFormData is called", async () => {
    const user = userEvent.setup();
    render(<CreateTournamentClient communitySlug="test-org" />);

    // Initially no start date
    expect(screen.getByTestId("start-date-value").textContent).toBe("");

    // Simulate date picker selection via updateFormData
    await user.click(screen.getByTestId("set-start-date"));

    // form.watch() triggers a re-render, so the child sees the updated value
    await waitFor(() => {
      expect(screen.getByTestId("start-date-value").textContent).toBe(
        "1700000000000"
      );
    });
  });
});
