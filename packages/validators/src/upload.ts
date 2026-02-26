import { z } from "zod";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** 2 MiB in bytes */
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

/**
 * Validates image upload constraints (size, type).
 * Accepts any object with `size` and `type` properties (works with File, Blob, etc.)
 * so this schema stays framework-agnostic (no DOM dependency).
 */
export const imageUploadSchema = z.object({
  file: z
    .object({
      size: z.number(),
      type: z.string(),
    })
    .passthrough()
    .refine((f) => f.size > 0, "File is empty")
    .refine((f) => f.size <= MAX_IMAGE_SIZE, "File must be smaller than 2 MB")
    .refine(
      (f) => (ALLOWED_IMAGE_TYPES as readonly string[]).includes(f.type),
      "File must be a JPEG, PNG, WebP, or GIF image"
    ),
});

export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
