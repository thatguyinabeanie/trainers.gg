/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/react";
import React from "react";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({
    children,
    render: renderProp,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) => (
    <div>
      {renderProp}
      {children}
    </div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("../../pickers/number-picker", () => ({
  NumberPicker: () => <div data-testid="number-picker" />,
}));

jest.mock("../../validation/field-error", () => ({
  FieldErrors: ({ errors }: { errors: any[] }) =>
    errors.length > 0 ? <span data-testid="field-error" /> : null,
}));

import { MetaBar } from "../meta-bar";

// =============================================================================
// Helpers
// =============================================================================

const baseProps = {
  nickDraft: "Chomp",
  setNickDraft: jest.fn(),
  nicknameRef: { current: null } as React.RefObject<HTMLInputElement | null>,
  gender: "Male" as const,
  isShiny: false,
  level: 50,
  showLevel: true,
  handleNickBlur: jest.fn(),
  handleGenderToggle: jest.fn(),
  handleShinyToggle: jest.fn(),
  onUpdate: jest.fn(),
  nicknameErrors: [],
  genderErrors: [],
};

// =============================================================================
// Tests
// =============================================================================

describe("MetaBar", () => {
  describe("variant=banner", () => {
    it("renders nickname input with value", () => {
      render(<MetaBar {...baseProps} variant="banner" />);
      expect(screen.getByRole("textbox", { name: "Nickname" })).toHaveValue("Chomp");
    });

    it("renders gender toggle button with male symbol", () => {
      render(<MetaBar {...baseProps} variant="banner" />);
      expect(screen.getByTitle("Toggle gender")).toHaveTextContent("♂");
    });

    it("renders shiny button with not-shiny state", () => {
      render(<MetaBar {...baseProps} variant="banner" />);
      expect(screen.getByTitle("Not shiny (click to set)")).toBeInTheDocument();
    });

    it("renders shiny button pressed when isShiny", () => {
      render(<MetaBar {...baseProps} variant="banner" isShiny />);
      expect(screen.getByTitle("Shiny (click to clear)")).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });
  });

  describe("variant=row", () => {
    it("renders nickname input", () => {
      render(<MetaBar {...baseProps} variant="row" />);
      expect(screen.getByRole("textbox", { name: "Nickname" })).toHaveValue("Chomp");
    });

    it("renders Lv pill when showLevel is true", () => {
      render(<MetaBar {...baseProps} variant="row" />);
      expect(screen.getByText("Lv 50")).toBeInTheDocument();
    });

    it("hides Lv pill when showLevel is false", () => {
      render(<MetaBar {...baseProps} variant="row" showLevel={false} />);
      expect(screen.queryByText("Lv 50")).not.toBeInTheDocument();
    });

    it("renders female symbol for Female gender", () => {
      render(<MetaBar {...baseProps} variant="row" gender="Female" />);
      expect(screen.getByTitle("Toggle gender")).toHaveTextContent("♀");
    });
  });
});
