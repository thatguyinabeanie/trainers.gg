import type { ReactNode } from "react";
import Link from "next/link";
import type { AppBskyRichtextFacet } from "@atproto/api";
import { cn } from "@/lib/utils";

interface PostTextProps {
  text: string;
  facets?: AppBskyRichtextFacet.Main[];
  className?: string;
}

/**
 * Renders post text with rich text formatting (links, mentions, hashtags).
 * Facets are byte-indexed ranges that define formatting.
 */
export function PostText({ text, facets, className }: PostTextProps) {
  if (!facets || facets.length === 0) {
    return <span className={cn("whitespace-pre-wrap", className)}>{text}</span>;
  }

  // Convert string to byte array for proper facet indexing
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const textBytes = encoder.encode(text);

  // Sort facets by start index
  const sortedFacets = [...facets].sort(
    (a, b) => a.index.byteStart - b.index.byteStart
  );

  const elements: ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < sortedFacets.length; i++) {
    const facet = sortedFacets[i];
    if (!facet) continue;

    const { byteStart, byteEnd } = facet.index;

    // Add text before this facet
    if (byteStart > lastEnd) {
      const beforeText = decoder.decode(textBytes.slice(lastEnd, byteStart));
      elements.push(
        <span key={`text-${i}`} className="whitespace-pre-wrap">
          {beforeText}
        </span>
      );
    }

    // Get the faceted text
    const facetText = decoder.decode(textBytes.slice(byteStart, byteEnd));

    // Render based on facet type
    const feature = facet.features[0];
    if (feature) {
      if (feature.$type === "app.bsky.richtext.facet#link") {
        const linkFeature = feature as AppBskyRichtextFacet.Link;
        elements.push(
          <a
            key={`facet-${i}`}
            href={linkFeature.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {facetText}
          </a>
        );
      } else if (feature.$type === "app.bsky.richtext.facet#mention") {
        const mentionFeature = feature as AppBskyRichtextFacet.Mention;
        elements.push(
          <Link
            key={`facet-${i}`}
            href={`/profile/${mentionFeature.did}`}
            className="text-primary hover:underline"
          >
            {facetText}
          </Link>
        );
      } else if (feature.$type === "app.bsky.richtext.facet#tag") {
        const tagFeature = feature as AppBskyRichtextFacet.Tag;
        elements.push(
          <Link
            key={`facet-${i}`}
            href={`/search?q=%23${tagFeature.tag}`}
            className="text-primary hover:underline"
          >
            {facetText}
          </Link>
        );
      } else {
        // Unknown facet type, render as plain text
        elements.push(
          <span key={`facet-${i}`} className="whitespace-pre-wrap">
            {facetText}
          </span>
        );
      }
    }

    lastEnd = byteEnd;
  }

  // Add remaining text after last facet
  if (lastEnd < textBytes.length) {
    const remainingText = decoder.decode(textBytes.slice(lastEnd));
    elements.push(
      <span key="text-end" className="whitespace-pre-wrap">
        {remainingText}
      </span>
    );
  }

  return <span className={cn(className)}>{elements}</span>;
}
