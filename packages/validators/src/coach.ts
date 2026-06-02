import { z } from "zod";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

/** Service offerings a coach intends to provide (presets; pricing comes later). */
export const COACH_SERVICE_TYPES = [
  "live",
  "replay_review",
  "team_review",
  "mentorship",
] as const;

export const coachLinkSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    }),
  url: z.string().trim().url().max(300),
});

/** Coach-editable profile fields (no pricing/services in the foundation). */
export const coachProfileSchema = z.object({
  headline: z
    .string()
    .trim()
    .max(120)
    .refine((val) => !val || !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .default(""),
  bio: z
    .string()
    .trim()
    .max(2000)
    .refine((val) => !val || !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .default(""),
  formats: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(40)
        .refine((val) => !containsProfanity(val), {
          message: PROFANITY_ERROR_MESSAGE,
        })
    )
    .max(20)
    .default([]),
  links: z.array(coachLinkSchema).max(10).default([]),
  serviceTypes: z.array(z.enum(COACH_SERVICE_TYPES)).max(4).default([]),
});

export type CoachProfileInput = z.infer<typeof coachProfileSchema>;
