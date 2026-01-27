# Profiles Architecture

> ⚠️ **Note:** This document references "profiles" but the current trainers.gg implementation uses the term "**alts**" for alternate identities. The concepts are the same - see [USER_VS_ALT_ARCHITECTURE.md](./USER_VS_ALT_ARCHITECTURE.md) for the authoritative guide.

## Overview

trainers.gg implements a multi-profile (alt) system that allows users to maintain separate gaming identities for tournament anonymity while preventing name squatting and encouraging active usage. This document outlines the architecture and business logic for profile/alt management across free and paid tiers.

## Core Concepts

### Main Profile

Every user account automatically receives a **main profile** upon registration:

- **Username Binding**: The main profile username is permanently bound to the account username
- **Immutability**: The main profile cannot be deleted or renamed
- **Data Persistence**: Serves as the permanent home for user data
- **Free by Default**: Does not count against profile limits

### Default Profile

Users can designate any of their profiles as the **default profile**:

- **Tournament Registration**: Automatically selected in tournament registration dropdowns
- **Flexible Assignment**: Can be changed at any time
- **Initial State**: Initially set to the main profile
- **User Preference**: Allows users to maintain their preferred gaming identity

## Profile Tiers

### Free Tier

Free accounts receive:

- 1 Main Profile (permanent, free)
- Up to 5 Additional Profiles
- **Total: 6 profiles maximum**

### Paid Tier

Paid accounts receive:

- 1 Main Profile (permanent)
- **Unlimited Additional Profiles**
- All profile management features

## Profile Management

### Creation Rules

1. **Free Accounts**:
   - Can create profiles until reaching the 5 additional profile limit
   - Must delete or merge existing profiles to create new ones after limit

2. **Paid Accounts**:
   - Can create unlimited profiles
   - No restrictions on profile creation

### Deletion and Data Management

When deleting a profile, users have three options:

#### 1. Complete Deletion

- Permanently removes the profile and all associated data
- Cannot be undone
- Frees up a profile slot for free tier users

#### 2. Transfer to Main Profile

- Moves all data (tournament history, stats, etc.) to the main profile
- Deletes the source profile
- Recommended default option for data preservation

#### 3. Merge with Another Profile

- User selects source and destination profiles
- All data from source profile transfers to destination
- User chooses which profile name to keep
- Source profile is deleted, freeing up a slot

### Data Transfer Rules

When transferring or merging profile data:

1. **Tournament History**: All past tournament participations transfer
2. **Statistics**: Win/loss records, ratings, and achievements merge
3. **Reputation/Conduct**: Conduct history follows the data
4. **Team Data**: Saved teams and configurations transfer
5. **Settings**: User must reconfigure preferences for destination profile

## Technical Implementation

### Database Schema Additions

```typescript
// User model additions
interface User {
  mainProfileId: Id<"profiles">; // Immutable reference to main profile
  defaultProfileId: Id<"profiles">; // User-selectable default profile
  tier: "free" | "paid"; // Account tier
}

// Profile model additions
interface Profile {
  isMain: boolean; // Marks the main profile
  createdAt: number; // For tracking profile age
  lastActiveAt: number; // For tracking active usage
}
```

### Profile Limits Enforcement

```typescript
// Check profile creation eligibility
async function canCreateProfile(userId: Id<"users">) {
  const user = await getUser(userId);

  if (user.tier === "paid") return true;

  const profileCount = await countUserProfiles(userId);
  // Subtract 1 for main profile, check against limit of 5
  return profileCount - 1 < 5;
}
```

### Profile Operations

```typescript
// Profile deletion with data handling
async function deleteProfile(
  profileId: Id<"profiles">,
  dataOption: "delete" | "transfer_main" | "merge",
  targetProfileId?: Id<"profiles">
) {
  // Validate profile is not main
  // Handle data based on option
  // Update user's defaultProfileId if needed
  // Delete profile
}
```

## Business Rationale

This architecture achieves several goals:

1. **Prevents Name Squatting**: Limited free profiles discourage hoarding usernames
2. **Encourages Active Use**: Users must manage profiles thoughtfully
3. **Generous Free Tier**: 6 total profiles is sufficient for most users
4. **Clear Upgrade Path**: Unlimited profiles provides value for paid users
5. **Data Safety**: Multiple options ensure users never lose important data
6. **Identity Flexibility**: Default profile system respects user preferences

## Future Considerations

### Profile Inactivity

Consider implementing:

- Inactive profile warnings after 6-12 months
- Automatic archival of unused profiles
- Name release for extremely inactive profiles

### Profile Verification

For competitive integrity:

- Verified main profiles for tournament organizers
- Badge system for profile achievements
- Profile reputation scoring
