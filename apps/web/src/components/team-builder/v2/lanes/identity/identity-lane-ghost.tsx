"use client";

import { cn } from "@/lib/utils";

import s from "../../builder.module.css";
import ids from "./identity-lane.module.css";

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
    <div className={ids.midRoot}>
      {/* MetaBar ghost — nickname placeholder, same height as real MetaBar */}
      <div className={ids.midMetaBar}>
        <span />
        <span className="text-muted-foreground/20 text-sm font-normal italic">
          Nickname
        </span>
        <span />
      </div>

      {/* Body — sprite + form stacked vertically, centered */}
      <div className={ids.midBody}>
        <div className={ids.midSpriteCol}>
          <SpeciesPillGhost />
          <SpriteGhost />
        </div>

        <div className={ids.midFormCol}>
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
    <div className={ids.vertRoot}>
      <div className={ids.vertSpriteFormRow}>
        <div className={ids.vertSpriteCol}>
          <SpriteGhost size={120} />
          <SpeciesPillGhost />
        </div>

        <div className={ids.vertFormCol}>
          {/* MetaBar ghost — nickname + level/gender/shiny placeholders */}
          <div className="flex h-[22px] items-center gap-2">
            <span className="text-muted-foreground/20 text-sm font-normal italic">
              Nickname
            </span>
            <span className="text-muted-foreground/20 text-xs">—</span>
            <span className="text-muted-foreground/20 text-xs">+</span>
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

function SpriteGhost({ size = 144 }: { size?: number }) {
  return <div className="bg-muted/40 rounded-xl" style={{ width: size, height: size }} />;
}

function BannerGhost() {
  return (
    <div className={s.idBanner}>
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
          <span
            className={cn(s.formValue, "text-muted-foreground/25 italic")}
          >
            —
          </span>
        </div>
      ))}
    </>
  );
}

function MidFormRowsGhost() {
  return (
    <>
      {(["Item", "Abil", "Nat"] as const).map((label) => (
        <div key={label} className={ids.midFormCell}>
          <span className={ids.midFormLbl}>{label}</span>
          <span
            className={cn(ids.midFormVal, "text-muted-foreground/25 italic")}
          >
            —
          </span>
        </div>
      ))}
    </>
  );
}
