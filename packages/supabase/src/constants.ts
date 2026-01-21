/**
 * Constants for the Supabase backend package
 */

/**
 * Number of days before an invitation expires
 */
export const INVITATION_EXPIRY_DAYS = 7;

/**
 * Invitation expiry duration in milliseconds
 */
export const INVITATION_EXPIRY_MS =
  INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Helper function to get expiry date for invitations
 */
export function getInvitationExpiryDate(): string {
  return new Date(Date.now() + INVITATION_EXPIRY_MS).toISOString();
}
