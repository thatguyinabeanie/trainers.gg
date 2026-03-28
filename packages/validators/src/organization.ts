/**
 * @deprecated Import from "./community" instead.
 * This file re-exports community schemas under the old organization names
 * for backward compatibility.
 */
export {
  // New names
  communitySocialLinkSchema,
  communitySocialLinksSchema,
  createCommunitySchema,
  updateCommunitySchema,
  type CommunitySocialLink,
  type CreateCommunityInput,
  type UpdateCommunityInput,
  // Deprecated aliases
  organizationSocialLinkSchema,
  organizationSocialLinksSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
  type OrganizationSocialLink,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  // Unchanged exports
  SOCIAL_LINK_PLATFORMS,
  type SocialLinkPlatform,
} from "./community";
