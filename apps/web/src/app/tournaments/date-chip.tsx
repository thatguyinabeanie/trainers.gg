"use client";

/**
 * Client-side date chip that displays dates in the user's local timezone.
 * This must be a client component because it uses browser APIs to detect timezone.
 */

function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getDateParts(dateString: string | null): {
  month: string;
  day: string;
  time: string;
  year: string;
} | null {
  if (!dateString) return null;

  const date = new Date(dateString);
  const timeZone = getUserTimeZone();

  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone })
      .format(date)
      .toUpperCase(),
    day: new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone }).format(
      date
    ),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone,
    }).format(date),
    year: new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone,
    }).format(date),
  };
}

export function DateChip({
  dateString,
  showTime = true,
  showYear = false,
}: {
  dateString: string | null;
  showTime?: boolean;
  showYear?: boolean;
}) {
  const parts = getDateParts(dateString);

  if (!parts) {
    return <span className="text-muted-foreground text-sm">TBD</span>;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="bg-muted rounded px-2 py-0.5 text-xs font-medium">
        <span className="text-primary">{parts.month}</span>
        <span className="text-foreground"> {parts.day}</span>
        {showYear && (
          <span className="text-muted-foreground">, {parts.year}</span>
        )}
      </span>
      {showTime && (
        <span className="text-muted-foreground text-xs">{parts.time}</span>
      )}
    </div>
  );
}
