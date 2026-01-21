"use client";

import { ConvexReactClient } from "convex/react";

// Use a placeholder URL during build time to prevent errors
// The actual URL will be used at runtime
const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";

export const convex = new ConvexReactClient(convexUrl);
