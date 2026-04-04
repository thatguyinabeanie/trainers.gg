/**
 * Get initials from a community name (first letter of first two words, uppercase).
 */
export function getCommunityInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
