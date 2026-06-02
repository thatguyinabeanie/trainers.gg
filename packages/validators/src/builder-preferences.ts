import { z } from "zod";

/** How a builder panel is presented when its dockbar pill is opened. */
export const panelViewSchema = z.enum(["sidepane", "dialog"]);
export type PanelView = z.infer<typeof panelViewSchema>;

/** Per-feature preference: default presentation + whether the sidepane auto-opens. */
export const panelPreferenceSchema = z.object({
  defaultView: panelViewSchema.default("dialog"),
  openOnLoad: z.boolean().default(false),
});
export type PanelPreference = z.infer<typeof panelPreferenceSchema>;

/**
 * Builder UI preferences. Phase 1 ships only speedTiers; damageCalc is
 * reserved for a later phase (its settings rows render disabled for now).
 */
export const builderPreferencesSchema = z.object({
  speedTiers: panelPreferenceSchema.default({
    defaultView: "dialog",
    openOnLoad: false,
  }),
});
export type BuilderPreferences = z.infer<typeof builderPreferencesSchema>;

export const DEFAULT_BUILDER_PREFERENCES: BuilderPreferences =
  builderPreferencesSchema.parse({});
