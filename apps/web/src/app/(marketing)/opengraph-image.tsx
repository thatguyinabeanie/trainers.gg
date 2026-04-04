import { ImageResponse } from "next/og";
import { hero } from "./copy";

// Image dimensions — 1200x630 is the standard for OG/Twitter cards
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${hero.brand} — ${hero.tagline}`;

// Load Inter font from Google Fonts for brand consistency
async function loadFont(font: string, weight: number): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${font}:wght@${weight}&display=swap`;
  const css = await (await fetch(url)).text();
  const match = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype|woff2?)'\)/
  );
  if (!match?.[1]) throw new Error(`Failed to load font: ${font}`);
  const response = await fetch(match[1]);
  return response.arrayBuffer();
}

export default async function OGImage() {
  // Load both weights in parallel
  const [interBold, interRegular] = await Promise.all([
    loadFont("Inter", 800),
    loadFont("Inter", 400),
  ]);

  // Primary teal from theme: oklch(0.600 0.100 185.00) ≈ #3d9e96
  const primaryColor = "#3d9e96";

  // Strip the trailing " — all from one platform." for the OG image
  // since it's redundant in a visual context
  const shortDescription = hero.description.replace(
    / — all from one platform\.$/,
    ""
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fafafa",
        fontFamily: "Inter",
      }}
    >
      {/* Dot pattern overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          backgroundImage:
            "radial-gradient(circle, rgba(61,158,150,0.2) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.5,
        }}
      />

      {/* Brand name */}
      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          color: primaryColor,
          letterSpacing: "0.1em",
          marginBottom: 16,
        }}
      >
        {hero.brand}
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 400,
          color: "#333",
          marginBottom: 12,
        }}
      >
        {hero.tagline}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 400,
          color: "#888",
          maxWidth: 700,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {shortDescription}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Inter", data: interBold, weight: 800, style: "normal" },
        { name: "Inter", data: interRegular, weight: 400, style: "normal" },
      ],
    }
  );
}
