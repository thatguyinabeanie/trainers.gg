import { z } from "zod";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

/**
 * Password requirements matching Supabase Auth settings:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one symbol
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/,
    "Password must contain at least one symbol"
  );

/**
 * Username requirements:
 * - 3-20 characters
 * - Letters (any case/script), numbers, underscores, and hyphens
 * - Cannot start with temp_ or user_ (reserved for system-generated placeholders)
 * - Cannot contain profanity, slurs, or offensive language
 * - Case-insensitive uniqueness is enforced at the query layer (not here)
 */
export const usernameSchema = z
  .string()
  .min(1, "Username is required")
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    /^[\p{L}\p{N}_-]+$/u,
    "Username can only contain letters, numbers, underscores, and hyphens"
  )
  .refine((val) => !val.startsWith("temp_") && !val.startsWith("user_"), {
    message: "Please choose a custom username",
  })
  .refine((val) => !containsProfanity(val), {
    message: PROFANITY_ERROR_MESSAGE,
  });

/**
 * Email schema with standard validation
 */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

/**
 * Helper function to validate a password and return all errors
 * Useful for showing password strength indicators
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("At least 8 characters");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("One lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("One uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("One number");
  }
  if (!/[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/.test(password)) {
    errors.push("One symbol (!@#$%^&*...)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Login identifier — trims whitespace, then validates non-empty.
 * Works for both email and username login flows.
 */
export const loginIdentifierSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().min(1, "Email or username is required"));

/**
 * Waitlist email — trims and lowercases for consistent storage.
 * Uses a pipeline: trim/lowercase first, then validate email format.
 */
export const waitlistEmailSchema = z
  .string()
  .min(1, "Email is required")
  .transform((v) => v.trim().toLowerCase())
  .pipe(emailSchema);

/**
 * Full signup request body validation.
 * Replaces ~80 lines of manual validation in the signup edge function.
 */
export const signupRequestSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  birthDate: z.string().optional(),
  country: z.string().optional(),
  inviteToken: z.string().optional(),
});

// Types
export type Password = z.infer<typeof passwordSchema>;
export type Username = z.infer<typeof usernameSchema>;
export type Email = z.infer<typeof emailSchema>;
export type SignupRequestInput = z.infer<typeof signupRequestSchema>;
