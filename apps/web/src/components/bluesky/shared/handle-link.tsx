import Link from "next/link";
import { cn } from "@/lib/utils";

interface HandleLinkProps {
  handle: string;
  did?: string;
  className?: string;
  showAt?: boolean;
}

/**
 * Renders a Bluesky handle as a clickable link.
 * Links to the user's profile page.
 */
export function HandleLink({
  handle,
  did,
  className,
  showAt = true,
}: HandleLinkProps) {
  // Remove @ if already present for consistency
  const cleanHandle = handle.replace(/^@/, "");
  const displayHandle = showAt ? `@${cleanHandle}` : cleanHandle;

  // Link to profile page - prefer DID for stability, fallback to handle
  const href = did ? `/profile/${did}` : `/profile/${cleanHandle}`;

  return (
    <Link
      href={href}
      className={cn(
        "text-muted-foreground hover:text-primary transition-colors hover:underline",
        className
      )}
    >
      {displayHandle}
    </Link>
  );
}
