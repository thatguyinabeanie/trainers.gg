/**
 * Shared vertical rib component used by Calc and Speed side panels.
 * Renders a teal-accented vertical label with a close button.
 */

interface PanelRibProps {
  label: string;
  onClose: () => void;
  closeAriaLabel: string;
}

export function PanelRib({ label, onClose, closeAriaLabel }: PanelRibProps) {
  return (
    <div className="flex w-7 shrink-0 flex-col items-center justify-between border-r border-border/60 border-dashed bg-primary/10 py-2">
      <span className="font-mono text-[9px] font-bold tracking-[0.1em] text-primary [writing-mode:vertical-rl] rotate-180">
        {label}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeAriaLabel}
        className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive flex size-5 items-center justify-center rounded transition-colors"
      >
        ×
      </button>
    </div>
  );
}
