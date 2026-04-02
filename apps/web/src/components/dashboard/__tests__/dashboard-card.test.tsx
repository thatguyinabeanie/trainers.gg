import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { DashboardCard } from "../dashboard-card";

describe("DashboardCard", () => {
  describe("children", () => {
    it("renders children inside the card", () => {
      render(<DashboardCard>Hello world</DashboardCard>);
      expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    it("renders complex children", () => {
      render(
        <DashboardCard>
          <span data-testid="inner">Inner content</span>
        </DashboardCard>
      );
      expect(screen.getByTestId("inner")).toBeInTheDocument();
    });
  });

  describe("label", () => {
    it("renders the label when provided", () => {
      render(<DashboardCard label="My Section">content</DashboardCard>);
      expect(screen.getByText("My Section")).toBeInTheDocument();
    });

    it("does not render a label element when label prop is omitted", () => {
      const { container } = render(<DashboardCard>content</DashboardCard>);
      // Only the children text should exist — no <p> for label
      expect(screen.getByText("content")).toBeInTheDocument();
      expect(container.querySelectorAll("p")).toHaveLength(0);
    });

    it("does not render a label when label is an empty string", () => {
      const { container } = render(
        <DashboardCard label="">content</DashboardCard>
      );
      // Empty string is falsy — the label <p> should not be rendered
      const paragraphs = container.querySelectorAll("p");
      expect(paragraphs).toHaveLength(0);
    });
  });

  describe("className", () => {
    it("applies a custom className to the outer wrapper", () => {
      const { container } = render(
        <DashboardCard className="my-custom-class">content</DashboardCard>
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("my-custom-class");
    });

    it("keeps the base card classes alongside the custom className", () => {
      const { container } = render(
        <DashboardCard className="extra-class">content</DashboardCard>
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("rounded-lg");
      expect(wrapper).toHaveClass("extra-class");
    });

    it("renders correctly without a className prop", () => {
      const { container } = render(<DashboardCard>content</DashboardCard>);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("rounded-lg");
    });
  });

  describe("labelClassName", () => {
    it("applies labelClassName to the label element", () => {
      render(
        <DashboardCard label="Section" labelClassName="text-red-500">
          content
        </DashboardCard>
      );
      const label = screen.getByText("Section");
      expect(label).toHaveClass("text-red-500");
    });

    it("keeps the base label classes alongside the labelClassName", () => {
      render(
        <DashboardCard label="Section" labelClassName="custom-label">
          content
        </DashboardCard>
      );
      const label = screen.getByText("Section");
      // Base class from the component
      expect(label).toHaveClass("font-semibold");
      expect(label).toHaveClass("custom-label");
    });

    it("labelClassName is ignored when label is not provided", () => {
      // Should not throw — simply no label to apply the class to
      const { container } = render(
        <DashboardCard labelClassName="text-red-500">content</DashboardCard>
      );
      expect(container.querySelector(".text-red-500")).toBeNull();
    });
  });
});
