"use client";

import { cn } from "@/lib/utils";

import { cellClasses } from "./cells/identity-cell-shared";
import s from "../../builder.module.css";

// Migrated identity-lane.module.css class strings used by ghost variants only.
// Most cell-level chrome lives in cellClasses (shared with the real cells);
// the layout-shell classes below are ghost-specific.
const midRoot =
  "flex shrink-0 grow-0 basis-[380px] min-w-0 flex-col border-r border-dashed border-border";
const midMetaBar =
  "grid h-9 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2.5 border-b border-dashed border-border px-3 py-2";
const midMetaBarNoLv = "grid-cols-[1fr_auto]";
const midNickname =
  "w-full min-w-0 border-0 border-b border-dashed border-b-transparent bg-transparent px-1 py-0.5 text-center text-[13px] font-semibold leading-none text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground placeholder:opacity-70 hover:border-b-border focus:border-b-primary focus:border-solid";
const midPill =
  "inline-flex h-[22px] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[5px] border border-border bg-background px-2 font-mono text-[11px] font-semibold leading-none text-muted-foreground transition-colors hover:bg-muted";
const midRightPills = "inline-flex items-center gap-1.5";
const midBody =
  "flex flex-auto flex-col items-center justify-center gap-2 min-h-0 min-w-0 px-2 py-3";
const midSpriteCol =
  "mx-auto flex w-full max-w-[240px] flex-col items-center gap-1.5";
const midFormCol =
  "mx-auto flex w-full min-w-0 max-w-[240px] flex-col gap-1";
const vertRoot =
  "flex w-full flex-col border-b border-dashed border-border";
const vertSpriteFormRow =
  "flex flex-auto flex-row items-center justify-center min-w-0";
const vertSpriteCol =
  "flex shrink-0 grow-0 basis-[140px] flex-col items-center justify-center gap-1.5 px-1 py-2";
const vertFormCol =
  "flex min-w-0 shrink basis-auto flex-col justify-center gap-1 px-1.5 py-2 [&_input]:text-left";

// =============================================================================
// IdentityLaneGhost — static visual placeholder (no interactive elements)
//
// Rendered by the dispatcher when pokemon == null. No buttons, inputs, or
// popovers — safe to place inside an outer <button> wrapper (EmptyRow)
// without violating nested-button constraints.
//
// variant="compact" — 1x6 layout, horizontal sprite+form (IdentitySingleRow)
// variant="mid"     — 2x3 layout, vertical column stack (IdentityMidStack)
// =============================================================================

interface IdentityLaneGhostProps {
  variant: "compact" | "mid" | "vertical";
}

export function IdentityLaneGhost({ variant }: IdentityLaneGhostProps) {
  if (variant === "vertical") return <VerticalGhost />;
  if (variant === "mid") return <MidGhost />;
  return <CompactGhost />;
}

// ---------------------------------------------------------------------------
// CompactGhost — horizontal layout matching IdentitySingleRow
// ---------------------------------------------------------------------------

function CompactGhost() {
  return (
    <div className="flex min-w-0 gap-3 p-3">
      {/* Sprite column — w-52 matches the filled SpeciesPicker pill width */}
      <div className="flex w-52 shrink-0 flex-col items-center justify-center gap-2 self-center">
        <SpeciesPillGhost />
        <SpriteGhost />
      </div>

      {/* Form column — w-64 matches IdentitySingleRow */}
      <div className="flex w-64 min-w-0 shrink-0 flex-col justify-center gap-0.5">
        <BannerGhost />
        <FormRowsGhost />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MidGhost — vertical column layout matching IdentityMidStack
//   midRoot (380px column) → MetaBar → midBody → midSpriteCol → midFormCol
// ---------------------------------------------------------------------------

function MidGhost() {
  return (
    <div className={midRoot}>
      {/* MetaBar ghost — nickname placeholder, same height as real MetaBar */}
      <div className={midMetaBar}>
        <span />
        <span
          className={cn(
            midNickname,
            "pointer-events-none text-muted-foreground/20 italic"
          )}
        >
          Nickname
        </span>
        <span />
      </div>

      {/* Body — sprite + form stacked vertically, centered */}
      <div className={midBody}>
        <div className={midSpriteCol}>
          <SpeciesPillGhost />
          <SpriteGhost />
        </div>

        <div className={midFormCol}>
          <MidFormRowsGhost />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VerticalGhost — side-by-side sprite+form matching IdentityVertical
//   vertRoot → vertSpriteFormRow → vertSpriteCol + vertFormCol (with MetaBar)
// ---------------------------------------------------------------------------

function VerticalGhost() {
  return (
    <div className={vertRoot}>
      <div className={vertSpriteFormRow}>
        <div className={vertSpriteCol}>
          <SpriteGhost />
          <SpeciesPillGhost />
        </div>

        <div className={vertFormCol} style={{ minWidth: 263 }}>
          {/* MetaBar ghost — matches midMetaBar grid (1fr auto) */}
          <div className={cn(midMetaBar, midMetaBarNoLv)}>
            <span
              className={cn(midNickname, "text-muted-foreground/20 italic")}
            >
              Nickname
            </span>
            <span className={midRightPills}>
              <span
                className={cn(midPill, "pointer-events-none opacity-30")}
              >
                —
              </span>
              <span
                className={cn(midPill, "pointer-events-none opacity-30")}
              >
                ✦
              </span>
            </span>
          </div>
          <MidFormRowsGhost />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared ghost pieces
// ---------------------------------------------------------------------------

function SpeciesPillGhost() {
  return (
    <div className="border-border bg-background flex w-full items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-left text-xs">
      <span className="text-muted-foreground/50 min-w-0 flex-1 truncate">
        + Add Pokémon
      </span>
      <span aria-hidden className="text-muted-foreground/30 text-[9px]">
        ▾
      </span>
    </div>
  );
}

interface SpriteGhostProps {
  size?: number;
}

function SpriteGhost({ size = 144 }: SpriteGhostProps) {
  return (
    <div
      className="bg-muted/40 rounded-xl"
      style={{ width: size, height: size }}
    />
  );
}

function BannerGhost() {
  return (
    <div className="mb-1 flex flex-col gap-[3px] border-b border-border pb-1.5">
      <div className="flex h-[22px] items-center">
        <span className="text-muted-foreground/20 text-sm font-normal italic">
          Nickname
        </span>
      </div>
      <div className="flex h-[18px] items-center gap-1">
        <div className="bg-muted/30 h-3.5 w-10 rounded" />
      </div>
    </div>
  );
}

function FormRowsGhost() {
  return (
    <>
      {(["Item", "Abil", "Nat"] as const).map((label) => (
        <div key={label} className={s.formRow}>
          <span className={s.formLabel}>{label}</span>
          <span className={cn(s.formValue, "text-muted-foreground/25 italic")}>
            —
          </span>
        </div>
      ))}
      {/* Type row — two circle placeholders matching TypePill size */}
      <div className={cn(s.formRow, "cursor-default")}>
        <span className={s.formLabel}>Type</span>
        <span className={cn(s.formValue, "flex items-center gap-1")}>
          <div className="bg-muted/40 size-[18px] rounded-full" />
          <div className="bg-muted/40 size-[18px] rounded-full" />
        </span>
      </div>
    </>
  );
}

function MidFormRowsGhost() {
  return (
    <>
      {(["Item", "Abil", "Nat"] as const).map((label) => (
        <div key={label} className={cellClasses.midFormCell}>
          <span className={cellClasses.midFormLbl}>{label}</span>
          <span
            className={cn(
              cellClasses.midFormVal,
              "text-muted-foreground/25 italic"
            )}
          >
            —
          </span>
        </div>
      ))}
    </>
  );
}
