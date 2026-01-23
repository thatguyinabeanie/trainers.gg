# First User Setup Guide

This guide explains how to set up the first user account on a fresh Battle Stadium installation.

## Overview

When you first deploy Battle Stadium, you'll need to create an initial user account that can access the platform and set up organizations, tournaments, and other features.

## Prerequisites

- Battle Stadium application deployed and running
- Access to Convex dashboard
- Environment variables configured correctly

## Setup Methods

### Method 1: Sign Up Through UI (Recommended)

1. **Navigate to the application**

   ```text
   https://your-domain.com/sign-up
   ```

2. **Create your account**
   - Fill in email, password, and profile information
   - Complete the sign-up process
   - Your profile will be automatically created via Convex Auth

3. **Access the platform**
   - Sign in at `/sign-in`
   - You'll be redirected to the main application

### Method 2: Database Seeding (Development)

For development environments, you can use the seed script:

1. **Run the seed script**

   ```bash
   bun run seed
   ```

2. **Default seeded permissions**
   The seed script creates:
   - Default permissions defined in `lib/constants/permissions.ts`
   - Initial role templates (org_owner, org_admin, org_moderator, org_tournament_organizer, org_judge)
   - Role-permission mappings

3. **Create test users**
   Currently, user seeding needs to be implemented. You'll need to sign up through the UI.

### Method 3: Convex Dashboard (Advanced)

If you need to modify data directly:

1. **Access Convex Dashboard**
   - Go to your Convex project dashboard
   - Navigate to Data tab

2. **View existing data**
   - Check `users` table for auth users
   - Check `profiles` table for user profiles
   - View `organizations` and related RBAC tables

## Post-Setup Configuration

### 1. Create Your First Organization

After signing up, create an organization:

1. Navigate to `/organizations/create` (once UI is implemented)
2. Fill in organization details:
   - Name: Your organization name
   - Slug: URL-friendly identifier
   - Description: Optional description

Note: Organization creation UI is not yet implemented. Currently, you can only view existing organizations.

### 2. Understanding Permissions

The RBAC system is defined but not yet implemented:

- **Roles**: Owner, Admin, Manager, Member (predefined)
- **Permissions**: Defined in `lib/constants/permissions.ts`
- **Groups**: Organizations have groups (e.g., "Members" group)
- **Assignment**: Role assignment functionality needs implementation

### 3. Create Your First Tournament

Tournament functionality is planned but not yet implemented:

1. Tournament CRUD operations
2. Registration and check-in flows
3. Team submission with validation

## Troubleshooting

### Authentication Issues

If you can't sign in:

1. **Check Convex Auth configuration**
   - Verify `NEXT_PUBLIC_CONVEX_URL` is set correctly
   - Check Convex dashboard for auth errors

2. **Verify profile creation**
   - Check if profile was created in `profiles` table
   - Profile should be created automatically on signup

### Permission Errors

Currently, all permission checks return `true` (bypassed). When implemented:

1. **Check user's groups**
   - Verify user is member of organization groups
   - Check `profileGroupRoles` for role assignments

2. **Verify role permissions**
   - Check `rolePermissions` table
   - Ensure role has required permissions

### Database Connection Issues

If the application can't connect to Convex:

1. **Verify environment variables**

   ```bash
   # Check this is set correctly
   echo $NEXT_PUBLIC_CONVEX_URL
   ```

2. **Check Convex deployment**
   - Verify Convex is deployed: `bunx convex deploy`
   - Check Convex dashboard for errors

## Security Considerations

### Production Deployments

1. **Implement permission checks**
   - Complete `convex/permissions.ts` implementation
   - Remove hardcoded `true` returns in mutations

2. **Set up proper RBAC**
   - Assign appropriate roles to users
   - Configure role permissions correctly

3. **Monitor user creation**
   - Add audit logging for user actions
   - Review organization membership regularly

## Current Limitations

Based on the current implementation:

1. **No permission enforcement** - All checks return true
2. **No role assignment UI** - Can't assign roles to users
3. **No group management** - Can't manage organization groups
4. **Limited organization features** - Can only view, not create
5. **No tournament system** - Not yet implemented

## Next Steps

Priority implementation tasks:

1. **Implement RBAC system**
   - Complete permission checking logic
   - Add role assignment functionality
   - Build group management

2. **Build organization features**
   - Organization creation UI
   - Member invitation system
   - Role management interface

3. **Develop tournament system**
   - Tournament creation and management
   - Team submission and validation
   - Registration flows

## Support

If you encounter issues during setup:

1. Check the [TODO.md](../../TODO.md) for current implementation status
2. Review Convex logs in the dashboard
3. Verify database schema in `convex/schema.ts`
4. Contact the development team for additional support
