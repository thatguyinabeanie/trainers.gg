"use client";

interface TeamsTabProps {
  altIds: number[];
  handle: string;
}

/**
 * Teams tab for the player profile — shows public team sheets from tournaments.
 * Stub implementation until team display is built out.
 */
export function TeamsTab({ altIds: _altIds, handle: _handle }: TeamsTabProps) {
  return (
    <div className="text-muted-foreground py-12 text-center text-sm">
      Teams coming soon.
    </div>
  );
}
