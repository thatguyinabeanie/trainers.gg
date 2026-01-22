---
title: Authentication Setup for Battle Stadium
description: Documentation for authentication configuration and protection during development
category: setup
type: documentation
status: current
---

This document explains how authentication is configured to protect the production site at battlestadium.gg while it's under development.

## Current Implementation

### Public Landing Page

- **URL**: <https://battlestadium.gg>
- **Access**: Public (no authentication required)
- **Content**: "Coming Soon" page with feature preview
- **Sign In Link**: Available for team members

### Protected App Pages

All app functionality requires authentication:

- `/tournaments` - Tournament management
- `/orgs` - Organization management
- `/analytics` - Analytics dashboard
- `/settings` - User settings
- `/admin` - Admin panel

### Authentication Flow

1. **Unauthenticated Users**:
   - See "Coming Soon" landing page
   - Can access sign-in/sign-up pages
   - Redirected to sign-in if trying to access app pages

2. **Authenticated Users**:
   - Land on "Coming Soon" page (can navigate to app)
   - Full access to all app features
   - See complete navigation menu

3. **Redirect Logic**:
   - Attempting to access protected pages redirects to `/sign-in`
   - After sign-in, users are redirected to their intended page
   - Default redirect is to `/tournaments`

## Key Files

### Middleware (`middleware.ts`)

- Manages session cookies
- Defines public vs protected paths
- Handles authentication redirects

### Home Page (`src/app/page.tsx`)

- Shows "Coming Soon" for non-authenticated users
- Redirects authenticated users to `/tournaments`

### Navigation (`src/components/topnav.tsx`)

- Shows full navigation for authenticated users
- Shows minimal navigation for public users

### Sign In (`src/app/(auth-pages)/sign-in/page.tsx`)

- Handles authentication
- Supports redirect after login

## Team Member Access

Team members can access the full application by:

1. Visiting <https://battlestadium.gg>
2. Clicking "Team member? Sign in"
3. Using their credentials
4. Being redirected to the app

## Removing Protection

When ready to launch publicly:

1. Update `src/app/page.tsx` to show the full landing page
2. Remove authentication check from home page
3. Update marketing content as needed

## Security Notes

- All API endpoints are protected by Convex functions
- Database access requires authentication
- Convex provides built-in security and access control
- Sessions are managed automatically by Convex Auth
