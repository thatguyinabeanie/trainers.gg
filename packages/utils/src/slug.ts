/**
 * Generate a URL-friendly slug from a human-readable name.
 *
 * - Lowercases the input
 * - Trims leading/trailing whitespace
 * - Strips characters that are not alphanumeric, whitespace, or hyphens
 * - Normalizes underscores and whitespace runs to a single hyphen
 * - Collapses consecutive hyphens
 * - Removes leading/trailing hyphens
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
