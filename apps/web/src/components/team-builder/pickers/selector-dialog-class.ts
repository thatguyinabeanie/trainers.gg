/**
 * Shared DialogContent className for the full-screen team-builder selector
 * dialogs (species picker + move picker).
 *
 * WHY a shared constant: the species and move selectors are presented in the
 * same kind of near-fullscreen dialog and must render at the SAME standard
 * size. They previously drifted (species capped at 1400px tall, move at
 * 1080px), which only showed on tall monitors. Defining the class once and
 * referencing it from both dialogs guarantees they stay identical.
 *
 * The pixel values here are intentional workspace-scale caps (per
 * code-style.md's allowed exceptions): the dialog fills the viewport minus a
 * 1rem gutter, capped at 1600px wide / 1400px tall on very large displays.
 */
export const SELECTOR_DIALOG_CONTENT_CLASS =
  "ring-primary/50 flex h-[calc(100vh-2rem)] max-h-[1400px] w-[calc(100vw-2rem)] max-w-[1600px] flex-col gap-0 overflow-hidden rounded-xl p-0 ring-2 sm:max-w-[1600px]";
