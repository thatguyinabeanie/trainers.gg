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
  signupRequestSchema,
  completeOnboardingSchema,
  type Password,
  type Username,
  type Email,
  type SignupRequestInput,
  type CompleteOnboardingInput,
} from "./auth";

// User validators
export {
  firstNameSchema,
  lastNameSchema,
  birthDateSchema,
  socialLinksSchema,
  userSettingsSchema,
  gamePreferencesSchema,
  updateProfileSchema,
  updateSettingsSchema,
  blueskyUserSchema,
  spritePreferenceSchema,
  updateSpritePreferenceSchema,
  type BirthDate,
  type SocialLinks,
  type UserSettings,
  type GamePreferences,
  type UpdateProfileInput,
  type UpdateSettingsInput,
  type BlueskyUser,
  type SpritePreference,
} from "./user";

// Team validators
export {
  parseShowdownText,
  parseAndValidateTeam,
  validateTeamStructure,
  validateTeamFormat,
  validateChampionsLegality,
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

// Community validators
export {
  SOCIAL_LINK_PLATFORMS,
  type SocialLinkPlatform,
  communitySocialLinkSchema,
  communitySocialLinksSchema,
  type CommunitySocialLink,
  createCommunitySchema,
  updateCommunitySchema,
  type CreateCommunityInput,
  type UpdateCommunityInput,
} from "./community";

// Organization request validators
export {
  submitOrganizationRequestSchema,
  type SubmitOrganizationRequestInput,
} from "./organization-request";

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
  tournamentStatusSchema,
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

// Upload validators
export {
  ALLOWED_IMAGE_TYPES,
  type AllowedImageType,
  MAX_IMAGE_SIZE,
  imageUploadSchema,
  type ImageUploadInput,
} from "./upload";

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

// Player validators
export {
  playerTournamentHistoryParamsSchema,
  type PlayerTournamentHistoryParams,
} from "./player";

// Player directory validators
export {
  PLAYER_SORT_OPTIONS,
  playerSearchParamsSchema,
  type PlayerSortOption,
  type PlayerSearchParams,
} from "./player-directory";

// Notification preference validators
export {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  notificationPreferencesSchema,
  type NotificationType,
  type NotificationPreferences,
} from "./notification-preferences";

// Coach validators
export {
  COACH_SERVICE_TYPES,
  coachLinkSchema,
  coachProfileSchema,
  type CoachProfileInput,
} from "./coach";

// Team builder validators
export {
  teamNameSchema,
  teamFormatSchema,
  createTeamInputSchema,
  type CreateTeamInput,
  updateTeamInputSchema,
  deleteTeamInputSchema,
  forkTeamInputSchema,
  type ForkTeamInput,
  transferTeamInputSchema,
  type TransferTeamInput,
  addPokemonInputSchema,
  type AddPokemonInput,
  updatePokemonInputSchema,
  removePokemonInputSchema,
  teamPositionSchema,
  reorderTeamPokemonInputSchema,
  type ReorderTeamPokemonInput,
  pokemonPayloadSchema,
  type PokemonPayload,
  pokemonUpdateSchema,
  type PokemonUpdate,
  teamUpdateDataSchema,
  type TeamUpdateData,
  // Phase 2 — landing page (flags, reorder, folders, smart-folder criteria)
  teamFlagsSchema,
  type TeamFlagsInput,
  reorderTeamsInputSchema,
  type ReorderTeamsInput,
  teamFolderNameSchema,
  type TeamFolderNameInput,
  bulkTeamIdsSchema,
  type BulkTeamIdsInput,
  smartFolderPredicateSchema,
  type SmartFolderPredicate,
  smartFolderCriteriaSchema,
  type SmartFolderCriteria,
  createSmartFolderInputSchema,
  type CreateSmartFolderInput,
  updateSmartFolderInputSchema,
  type UpdateSmartFolderInput,
} from "./team-builder";

// Builder UI preference validators
export {
  panelViewSchema,
  panelPreferenceSchema,
  builderPreferencesSchema,
  DEFAULT_BUILDER_PREFERENCES,
  type PanelView,
  type PanelPreference,
  type BuilderPreferences,
} from "./builder-preferences";
