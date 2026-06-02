import { render, screen, fireEvent } from "@testing-library/react";

import { DEFAULT_BUILDER_PREFERENCES } from "@trainers/validators";

import { BuilderSettingsDialog } from "../builder-settings-dialog";

describe("BuilderSettingsDialog", () => {
  it("disables Open-on-load when default view is Dialog", () => {
    render(
      <BuilderSettingsDialog
        open
        onOpenChange={() => {}}
        preferences={DEFAULT_BUILDER_PREFERENCES}
        onChange={() => {}}
      />
    );
    const openOnLoad = screen.getByRole("group", { name: /open on load/i });
    expect(openOnLoad).toHaveAttribute("aria-disabled", "true");
  });

  it("enables Open-on-load and emits change when switching to Sidepane", () => {
    const onChange = jest.fn();
    render(
      <BuilderSettingsDialog
        open
        onOpenChange={() => {}}
        preferences={DEFAULT_BUILDER_PREFERENCES}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^sidepane$/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        speedTiers: expect.objectContaining({ defaultView: "sidepane" }),
      })
    );
  });

  it("renders the Damage Calc group as disabled", () => {
    render(
      <BuilderSettingsDialog
        open
        onOpenChange={() => {}}
        preferences={DEFAULT_BUILDER_PREFERENCES}
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});
