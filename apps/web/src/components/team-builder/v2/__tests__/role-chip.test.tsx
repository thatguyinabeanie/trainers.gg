import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RoleChip } from "../pickers/role-chip";

describe("RoleChip", () => {
  it("renders the role label", () => {
    render(<RoleChip roleId="spread" />);
    expect(screen.getByText("Spread")).toBeInTheDocument();
  });

  it("calls onClick with the role id", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<RoleChip roleId="spread" onClick={onClick} />);
    await user.click(screen.getByText("Spread"));
    expect(onClick).toHaveBeenCalledWith("spread");
  });

  it("renders nothing for an unknown role id", () => {
    const { container } = render(<RoleChip roleId="bogus" />);
    expect(container.firstChild).toBeNull();
  });

  it("applies the group's chip class", () => {
    render(<RoleChip roleId="spread" />);
    expect(screen.getByText("Spread").className).toMatch(/rose/);
  });
});
