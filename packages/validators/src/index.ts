// Re-export Zod for consumers — single entry point for all Zod usage
export { z, ZodError } from "zod";

// Action result type
export { type ActionResult } from "./action-result";

// Profanity filtering
export {
  containsProfanity,
  getProfanityMatches,
  censorProfanity,
  PROFANITY_ERROR_MESSAGE,
  CUSTOM_PATTERNS,
} from "./profanity";

// Common validators
export {
  positiveIntSchema,
  uuidSchema,
  pdsStatusSchema,
  type PdsStatus,
} from "./common";

// Auth validators
export {
  passwordSchema,
  usernameSchema,
  emailSchema,
  validatePassword,
  loginIdentifierSchema,
  waitlistEmailSchema,
  signupRequestSchema,
  type Password,
  type Username,
  type Email,
  type SignupRequestInput,
} from "./auth";

// User validators
export {
  socialLinksSchema,
  userSettingsSchema,
  gamePreferencesSchema,
  updateProfileSchema,
  updateSettingsSchema,
  blueskyUserSchema,
  spritePreferenceSchema,
  updateSpritePreferenceSchema,
  type SocialLinks,
  type UserSettings,
  type GamePreferences,
  type UpdateProfileInput,
  type UpdateSettingsInput,
  type BlueskyUser,
  type SpritePreference,
} from "./user";

// Post validators
export {
  createPostSchema,
  postEngagementSchema,
  type CreatePostInput,
  type PostEngagement,
} from "./post";

// Team validators
export {
  parseShowdownText,
  parseAndValidateTeam,
  validateTeamStructure,
  validateTeamFormat,
  parsePokepaseUrl,
  getPokepaseRawUrl,
  getPkmnFormat,
  FORMAT_MAP,
  teamSubmissionSchema,
  type ParsedPokemon,
  type ParsedTeam,
  type ValidationError,
  type ValidationResult,
  type TeamSubmissionInput,
} from "./team";

// Organization validators
export {
  createOrganizationSchema,
  updateOrganizationSchema,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from "./organization";

// Alt validators
export {
  createAltSchema,
  updateAltSchema,
  type CreateAltInput,
  type UpdateAltInput,
} from "./alt";

// Tournament validators
export {
  tournamentNameSchema,
  tournamentDescriptionSchema,
  tournamentSlugSchema,
  createTournamentSchema,
  updateTournamentSchema,
  dropCategorySchema,
  dropNotesSchema,
  tournamentRegistrationSchema,
  type CreateTournamentInput,
  type UpdateTournamentInput,
  type DropCategory,
  type TournamentRegistrationInput,
} from "./tournament";

// Admin validators
export {
  announcementTypeSchema,
  createFeatureFlagSchema,
  updateFeatureFlagSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  adminReasonSchema,
  type AnnouncementType,
  type CreateFeatureFlagInput,
  type UpdateFeatureFlagInput,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from "./admin";

// Match validators
export {
  submitGameSelectionSchema,
  sendMatchMessageSchema,
  createMatchGamesSchema,
  judgeOverrideSchema,
  judgeResetSchema,
  type SubmitGameSelectionInput,
  type SendMatchMessageInput,
  type CreateMatchGamesInput,
  type JudgeOverrideInput,
  type JudgeResetInput,
} from "./match";
