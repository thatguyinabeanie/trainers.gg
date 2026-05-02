import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RolePresetsPanel } from "../pickers/role-presets-panel";

describe("RolePresetsPanel", () => {
  const noop = () => {};
  const zero = () => 0;

  it("renders all 7 group headers", () => {
    render(<RolePresetsPanel selected={[]} onChange={noop} bucketCount={zero} />);
    for (const label of ["Damage Type", "Speed Control", "Status", "Stat Changes", "Defensive", "Field", "Utility"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders bucket counts from the prop", () => {
    render(<RolePresetsPanel selected={[]} onChange={noop} bucketCount={(id) => id === "spread" ? 54 : 0} />);
    expect(screen.getByText("54")).toBeInTheDocument();
  });

  it("clicking a role toggles it on", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<RolePresetsPanel selected={[]} onChange={onChange} bucketCount={zero} />);
    await user.click(screen.getByText("Spread"));
    expect(onChange).toHaveBeenCalledWith(["spread"]);
  });

  it("clicking an active role toggles it off", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<RolePresetsPanel selected={["spread"]} onChange={onChange} bucketCount={zero} />);
    await user.click(screen.getByText("Spread"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("clicking a different role stacks (multi-select OR)", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<RolePresetsPanel selected={["spread"]} onChange={onChange} bucketCount={zero} />);
    await user.click(screen.getByText("Priority"));
    expect(onChange).toHaveBeenCalledWith(["spread", "priority"]);
  });
});
