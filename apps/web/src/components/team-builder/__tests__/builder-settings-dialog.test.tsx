import { render, screen, fireEvent } from "@testing-library/react";

import { type BuilderPreferences, DEFAULT_BUILDER_PREFERENCES } from "@trainers/validators";

import { BuilderSettingsDialog } from "../builder-settings-dialog";

// Sidepane-default preferences (Open on load controls are enabled in this state)
const SIDEPANE_PREFERENCES: BuilderPreferences = {
  ...DEFAULT_BUILDER_PREFERENCES,
  speedTiers: { ...DEFAULT_BUILDER_PREFERENCES.speedTiers, defaultView: "sidepane" },
};

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

  // ─── Open-on-load On/Off (sidepane default required) ─────────────────────

  it("clicking 'On' in Open-on-load emits onChange with openOnLoad=true when sidepane is default", () => {
    const onChange = jest.fn();
    render(
      <BuilderSettingsDialog
        open
        onOpenChange={() => {}}
        preferences={SIDEPANE_PREFERENCES}
        onChange={onChange}
      />
    );
    // The Speed Tiers On button (not the Damage Calc disabled one)
    fireEvent.click(screen.getByRole("button", { name: /^On$/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        speedTiers: expect.objectContaining({ openOnLoad: true }),
      })
    );
  });

  it("clicking 'Off' in Open-on-load emits onChange with openOnLoad=false when sidepane is default", () => {
    const onChange = jest.fn();
    // Start with openOnLoad=true so we can click Off to toggle it
    const prefs: BuilderPreferences = {
      ...SIDEPANE_PREFERENCES,
      speedTiers: { ...SIDEPANE_PREFERENCES.speedTiers, openOnLoad: true },
    };
    render(
      <BuilderSettingsDialog
        open
        onOpenChange={() => {}}
        preferences={prefs}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^Off$/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        speedTiers: expect.objectContaining({ openOnLoad: false }),
      })
    );
  });

  it("Open-on-load group is NOT disabled when defaultView is sidepane", () => {
    render(
      <BuilderSettingsDialog
        open
        onOpenChange={() => {}}
        preferences={SIDEPANE_PREFERENCES}
        onChange={() => {}}
      />
    );
    const openOnLoad = screen.getByRole("group", { name: /open on load/i });
    expect(openOnLoad).not.toHaveAttribute("aria-disabled", "true");
  });

  // ─── Damage Calc group is inert (disabled buttons) ────────────────────────

  it("Damage Calc default view buttons are disabled", () => {
    render(
      <BuilderSettingsDialog
        open
        onOpenChange={() => {}}
        preferences={DEFAULT_BUILDER_PREFERENCES}
        onChange={() => {}}
      />
    );
    const sidepaneBtn = screen.getByRole("button", {
      name: /damage calc default view sidepane/i,
    });
    const dialogBtn = screen.getByRole("button", {
      name: /damage calc default view dialog/i,
    });
    expect(sidepaneBtn).toBeDisabled();
    expect(dialogBtn).toBeDisabled();
  });

  it("Damage Calc open-on-load buttons are disabled", () => {
    render(
      <BuilderSettingsDialog
        open
        onOpenChange={() => {}}
        preferences={DEFAULT_BUILDER_PREFERENCES}
        onChange={() => {}}
      />
    );
    const offBtn = screen.getByRole("button", {
      name: /damage calc open on load off/i,
    });
    const onBtn = screen.getByRole("button", {
      name: /damage calc open on load on/i,
    });
    expect(offBtn).toBeDisabled();
    expect(onBtn).toBeDisabled();
  });
});
