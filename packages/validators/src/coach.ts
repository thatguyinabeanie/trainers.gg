import { z } from "zod";

/** Service offerings a coach intends to provide (presets; pricing comes later). */
export const COACH_SERVICE_TYPES = [
  "live",
  "replay_review",
  "team_review",
  "mentorship",
] as const;

export const coachLinkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  url: z.string().trim().url().max(300),
});

/** Coach-editable profile fields (no pricing/services in the foundation). */
export const coachProfileSchema = z.object({
  headline: z.string().trim().max(120).default(""),
  bio: z.string().trim().max(2000).default(""),
  formats: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  links: z.array(coachLinkSchema).max(10).default([]),
  serviceTypes: z.array(z.enum(COACH_SERVICE_TYPES)).max(4).default([]),
});

export type CoachProfileInput = z.infer<typeof coachProfileSchema>;
