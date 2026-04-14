/**
 * Discord embed builder helpers with Discord's size limits enforced at construction time.
 *
 * Limits (from Discord docs):
 * - Title:                 256 chars
 * - Description:          4096 chars
 * - Field name:            256 chars
 * - Field value:          1024 chars
 * - Fields total:           25 per embed
 * - Total embed chars:    6000 across all text fields
 */

import { type DiscordEmbed, type DiscordEmbedField } from "./types";

// =============================================================================
// Brand color
// =============================================================================

/**
 * trainers.gg teal brand color as a Discord embed integer (0x14b8a6).
 * Derived from the `primary.DEFAULT` token in `@trainers/theme`.
 */
export const trainersggColor = 0x14b8a6;

// =============================================================================
// Limits
// =============================================================================

const TITLE_MAX = 256;
const DESCRIPTION_MAX = 4096;
const FIELD_NAME_MAX = 256;
const FIELD_VALUE_MAX = 1024;
const FIELDS_MAX = 25;
const TOTAL_CHARS_MAX = 6000;
const ELLIPSIS = "…";

// =============================================================================
// Truncation utilities
// =============================================================================

/**
 * Truncate a string to `max` characters, appending an ellipsis if cut.
 */
function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max - ELLIPSIS.length) + ELLIPSIS;
}

/**
 * Truncate a field name/value pair to their respective Discord limits.
 *
 * @param name - Field name (max 256 chars)
 * @param value - Field value (max 1024 chars by default)
 * @param maxValueChars - Override for the value character cap
 */
export function truncateField(
  name: string,
  value: string,
  maxValueChars = FIELD_VALUE_MAX
): DiscordEmbedField {
  return {
    name: truncate(name, FIELD_NAME_MAX),
    value: truncate(value, maxValueChars),
  };
}

// =============================================================================
// Total character budget enforcement
// =============================================================================

/** Count total characters across the text-bearing embed fields. */
function countEmbedChars(embed: DiscordEmbed): number {
  let count = 0;
  if (embed.title) count += embed.title.length;
  if (embed.description) count += embed.description.length;
  if (embed.author?.name) count += embed.author.name.length;
  if (embed.footer?.text) count += embed.footer.text.length;
  for (const field of embed.fields ?? []) {
    count += field.name.length + field.value.length;
  }
  return count;
}

/**
 * Trim an embed's description so the total character count stays under 6000.
 * Called after all other fields are resolved.
 */
function enforceTotalLimit(embed: DiscordEmbed): DiscordEmbed {
  const total = countEmbedChars(embed);
  if (total <= TOTAL_CHARS_MAX) return embed;

  const overage = total - TOTAL_CHARS_MAX;
  const desc = embed.description ?? "";
  if (desc.length <= overage) {
    // Can't trim description enough — drop it entirely
    return { ...embed, description: undefined };
  }

  const newMax = desc.length - overage;
  return {
    ...embed,
    description: truncate(desc, Math.max(newMax, ELLIPSIS.length)),
  };
}

// =============================================================================
// Main builder
// =============================================================================

export interface BuildEmbedOptions {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  author?: { name: string; url?: string; icon_url?: string };
  thumbnail?: { url: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string; icon_url?: string };
  timestamp?: string | Date;
}

/**
 * Build a `DiscordEmbed` with all values automatically truncated to Discord's
 * documented size limits. Values that exceed limits have "…" appended.
 *
 * @param options - Embed fields to include
 * @returns A valid `DiscordEmbed` safe to include in any Discord API payload
 */
export function buildEmbed(options: BuildEmbedOptions): DiscordEmbed {
  const {
    title,
    description,
    url,
    color = trainersggColor,
    author,
    thumbnail,
    fields,
    footer,
    timestamp,
  } = options;

  // Truncate fields and cap at 25
  let truncatedFields: DiscordEmbedField[] | undefined;
  if (fields && fields.length > 0) {
    const capped = fields.slice(0, FIELDS_MAX);
    const overCount = fields.length - FIELDS_MAX;

    if (overCount > 0) {
      // Replace last retained field's value with a "…and N more" notice
      const last = capped[capped.length - 1];
      capped[capped.length - 1] = {
        name: last?.name ?? "",
        value: `…and ${overCount} more`,
        inline: last?.inline,
      };
    }

    truncatedFields = capped.map((f) => ({
      name: truncate(f.name, FIELD_NAME_MAX),
      value: truncate(f.value, FIELD_VALUE_MAX),
      inline: f.inline,
    }));
  }

  const embed: DiscordEmbed = {
    ...(title !== undefined ? { title: truncate(title, TITLE_MAX) } : {}),
    ...(description !== undefined
      ? { description: truncate(description, DESCRIPTION_MAX) }
      : {}),
    ...(url !== undefined ? { url } : {}),
    color,
    ...(author !== undefined
      ? {
          author: {
            name: truncate(author.name, TITLE_MAX),
            url: author.url,
            icon_url: author.icon_url,
          },
        }
      : {}),
    ...(thumbnail !== undefined ? { thumbnail } : {}),
    ...(truncatedFields !== undefined ? { fields: truncatedFields } : {}),
    ...(footer !== undefined
      ? {
          footer: {
            text: truncate(footer.text, TITLE_MAX),
            icon_url: footer.icon_url,
          },
        }
      : {}),
    ...(timestamp !== undefined
      ? {
          timestamp:
            timestamp instanceof Date ? timestamp.toISOString() : timestamp,
        }
      : {}),
  };

  return enforceTotalLimit(embed);
}

// =============================================================================
// Shortcut patterns
// =============================================================================

/**
 * Build a standard "preview lines + link" embed — the most common bot response
 * pattern where we show a truncated preview of data and a link to see more.
 *
 * @param title - Embed title
 * @param previewLines - Lines to join as the embed description
 * @param linkUrl - URL of the full page on trainers.gg
 * @param linkLabel - Anchor text for the link appended to description
 */
export function previewPlusLink(
  title: string,
  previewLines: string[],
  linkUrl: string,
  linkLabel: string
): DiscordEmbed {
  const preview = previewLines.join("\n");
  const link = `\n\n[${linkLabel}](${linkUrl})`;
  const description = `${preview}${link}`;

  return buildEmbed({ title, description });
}
