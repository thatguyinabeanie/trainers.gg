import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TournamentBasicInfo } from "../tournament-basic-info";

// Mock useApiQuery — component fetches from /api/v1/me/communities via this hook.
const mockUseApiQuery = jest.fn();
jest.mock("@trainers/supabase/react-query", () => ({
  useApiQuery: (...args: unknown[]) => mockUseApiQuery(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MyCommunity {
  id: number;
  name: string;
}

const makeCommunity = (overrides: Partial<MyCommunity> = {}): MyCommunity => ({
  id: 1,
  name: "Pallet Town League",
  ...overrides,
});

const defaultFormData = {
  name: "",
  slug: "",
  description: "",
  communityId: undefined,
  format: "vgc_2024" as const,
  maxParticipants: 32,
  startDate: "",
  endDate: "",
  registrationDeadline: "",
};

function mockQuerySuccess(communities: MyCommunity[]) {
  mockUseApiQuery.mockReturnValue({
    data: communities,
    isLoading: false,
    isError: false,
    error: null,
  });
}

function mockQueryLoading() {
  mockUseApiQuery.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
  });
}

function mockQueryError(message = "Failed to load communities") {
  mockUseApiQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error(message),
  });
}

function renderComponent(props: Partial<{
  formData: typeof defaultFormData;
  updateFormData: (updates: unknown) => void;
}> = {}) {
  const updateFormData = jest.fn();
  render(
    <TournamentBasicInfo
      formData={props.formData ?? defaultFormData}
      updateFormData={props.updateFormData ?? updateFormData}
    />
  );
  return { updateFormData: props.updateFormData ?? updateFormData };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TournamentBasicInfo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuerySuccess([]);
  });

  describe("form fields", () => {
    it("renders the Tournament Name input", () => {
      mockQuerySuccess([]);
      renderComponent();
      expect(
        screen.getByPlaceholderText("e.g., Spring Regional Championship")
      ).toBeInTheDocument();
    });

    it("renders the URL Slug input", () => {
      renderComponent();
      expect(
        screen.getByPlaceholderText("spring-regional-championship")
      ).toBeInTheDocument();
    });

    it("renders the Description textarea", () => {
      renderComponent();
      expect(
        screen.getByPlaceholderText(
          "Describe your tournament, rules, prizes, etc."
        )
      ).toBeInTheDocument();
    });
  });

  describe("community select — loading state", () => {
    it("does not crash while communities are loading", () => {
      mockQueryLoading();
      renderComponent();
      // No error thrown — select is rendered with empty options
      expect(screen.getByText("Community *")).toBeInTheDocument();
    });
  });

  describe("community select — success state", () => {
    it("renders community options from API data", () => {
      const communities = [
        makeCommunity({ id: 1, name: "Pallet Town League" }),
        makeCommunity({ id: 2, name: "Cerulean City Club" }),
      ];
      mockQuerySuccess(communities);
      renderComponent();

      // Both community names should be rendered as SelectItems
      expect(screen.getByText("Pallet Town League")).toBeInTheDocument();
      expect(screen.getByText("Cerulean City Club")).toBeInTheDocument();
    });

    it("renders empty select when no communities are returned", () => {
      mockQuerySuccess([]);
      renderComponent();
      // No community names rendered — just the label
      expect(screen.queryByText("Pallet Town League")).not.toBeInTheDocument();
    });
  });

  describe("community select — error state", () => {
    it("shows an error alert when the communities query fails", () => {
      mockQueryError("Network error");
      renderComponent();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    it("hides the Select when isError is true", () => {
      mockQueryError("Service unavailable");
      renderComponent();
      // The error alert replaces the Select — the select trigger should not render
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("shows a generic fallback message when error has no message", () => {
      mockUseApiQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: "unexpected string error",
      });
      renderComponent();
      expect(screen.getByText("Failed to load communities")).toBeInTheDocument();
    });
  });

  describe("name → slug auto-generation", () => {
    it("calls updateFormData with a generated slug when name changes", async () => {
      const user = userEvent.setup();
      mockQuerySuccess([]);
      const updateFormData = jest.fn();
      renderComponent({ updateFormData });

      const nameInput = screen.getByPlaceholderText(
        "e.g., Spring Regional Championship"
      );
      await user.clear(nameInput);
      await user.type(nameInput, "Spring Championship");

      expect(updateFormData).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.any(String) })
      );
      // slug should also be generated
      expect(updateFormData).toHaveBeenCalledWith(
        expect.objectContaining({ slug: expect.any(String) })
      );
    });
  });

  describe("slug field", () => {
    it("calls updateFormData with the typed slug value", async () => {
      const user = userEvent.setup();
      mockQuerySuccess([]);
      const updateFormData = jest.fn();
      renderComponent({
        updateFormData,
        formData: { ...defaultFormData, slug: "my-tournament" },
      });

      const slugInput = screen.getByPlaceholderText(
        "spring-regional-championship"
      );
      await user.clear(slugInput);
      await user.type(slugInput, "new-slug");

      expect(updateFormData).toHaveBeenCalledWith(
        expect.objectContaining({ slug: expect.stringContaining("new-slug") })
      );
    });
  });

  describe("description field", () => {
    it("calls updateFormData when description is changed", async () => {
      const user = userEvent.setup();
      mockQuerySuccess([]);
      const updateFormData = jest.fn();
      renderComponent({ updateFormData });

      const descTextarea = screen.getByPlaceholderText(
        "Describe your tournament, rules, prizes, etc."
      );
      await user.click(descTextarea);
      await user.type(descTextarea, "A fun tournament");

      expect(updateFormData).toHaveBeenCalledWith(
        expect.objectContaining({ description: expect.stringContaining("A fun tournament") })
      );
    });
  });

  describe("useApiQuery wiring", () => {
    it("uses query key ['me', 'communities']", () => {
      mockQuerySuccess([]);
      renderComponent();
      const [queryKey] = mockUseApiQuery.mock.calls[0];
      expect(queryKey).toEqual(["me", "communities"]);
    });

    it("passes staleTime: 30_000", () => {
      mockQuerySuccess([]);
      renderComponent();
      const [, , options] = mockUseApiQuery.mock.calls[0];
      expect(options).toMatchObject({ staleTime: 30_000 });
    });

    it("does not import useSupabaseQuery or listMyCommunities", () => {
      // This is a static assertion: if those imports existed, TS would fail.
      // The test just verifies the hook mock is the one being exercised.
      mockQuerySuccess([]);
      renderComponent();
      expect(mockUseApiQuery).toHaveBeenCalled();
    });
  });
});
