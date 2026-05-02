import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FilterChipsBar, type FilterChip } from "../pickers/filter-chips-bar";

describe("FilterChipsBar", () => {
  it("returns null when no chips", () => {
    const { container } = render(<FilterChipsBar chips={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one chip per item", () => {
    const chips: FilterChip[] = [
      { id: "fire", label: "Fire", onRemove: jest.fn() },
      { id: "spread", label: "Role: Spread", onRemove: jest.fn() },
    ];
    render(<FilterChipsBar chips={chips} />);
    expect(screen.getByText("Fire")).toBeInTheDocument();
    expect(screen.getByText("Role: Spread")).toBeInTheDocument();
  });

  it("calls onRemove on chip click", async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(<FilterChipsBar chips={[{ id: "fire", label: "Fire", onRemove }]} />);
    await user.click(screen.getByText("Fire"));
    expect(onRemove).toHaveBeenCalled();
  });
});
