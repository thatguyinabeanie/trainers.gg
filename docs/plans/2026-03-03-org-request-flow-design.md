# Organization Request Flow Design

## Overview

During private beta (and beyond), users cannot directly create organizations. Instead, they submit a **request** that goes through site admin approval. Approval creates the actual organization with the requester as owner.

There is no "direct create" path. Every organization goes through request → admin review → approval/rejection.

## Data Model

### New table: `organization_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint (identity PK) | |
| `user_id` | uuid (FK → users) | Requesting user |
| `name` | text (1–100 chars) | Requested org name |
| `slug` | text (1–100 chars) | Requested URL slug |
| `description` | text (≤500 chars, nullable) | Optional description |
| `status` | enum: `pending` / `approved` / `rejected` | |
| `admin_notes` | text (≤1000 chars, nullable) | Rejection reason or admin feedback |
| `reviewed_by` | uuid (FK → auth.users, nullable) | Which admin reviewed |
| `reviewed_at` | timestamptz (nullable) | When reviewed |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Constraints

- **One pending request per user** — unique partial index on `(user_id) WHERE status = 'pending'`
- **Unique pending slug** — unique partial index on `(slug) WHERE status = 'pending'`
- **7-day cooldown** after rejection — enforced in mutation by checking `reviewed_at` on most recent rejected request

### RLS policies

- Users can **view** and **insert** their own requests
- Site admins can **view all** and **update** (approve/reject)

### New enum values

- `notification_type`: `org_request_approved`, `org_request_rejected`
- `audit_action`: `admin.org_request_approved`, `admin.org_request_rejected`

### Slug validation

Validated at request time for format (regex, profanity) and uniqueness against both `organizations.slug` and `organization_requests.slug` (pending). Re-validated at approval time before creating the org.

## User-Facing UI

### Entry points

1. **`/organizations` page** — "Request an Organization" button, visible to authenticated users only
2. **TO dashboard empty state** (`/to-dashboard`) — update button text to "Request an Organization"

### `/organizations/create` — Conditional views

The page renders one of four states:

**State A: Request form** — No pending request and no active cooldown. Shows the form (name, slug, description). Button: "Submit Request".

**State B: Pending review** — Has a pending request. Shows status card with request details and message: "We'll notify you when it's reviewed."

**State C: Rejected + cooldown active** — Most recent request rejected, within 7-day cooldown. Shows rejection reason and date when they can resubmit.

**State D: Rejected + can resubmit** — Most recent request rejected, cooldown expired. Shows rejection reason and the form again.

## Admin UI

### Navigation

Add "Org Requests" to admin sidebar nav.

### `/admin/org-requests` page

Follows the existing `/admin/organizations` pattern (TanStack Table + detail sheet):

- Status filter tabs: All, Pending, Approved, Rejected
- Search by requester name/email or requested org name
- Paginated table: Name, Status (badge), Requester, Submitted date
- Row click opens detail sheet

### Detail sheet

Shows full request info (name, slug, description, requester profile, submission date).

- **Approve** — confirmation dialog → creates the org + sets requester as owner + sends notification + email
- **Reject** — textarea for reason (required) → sends notification + email with reason

## Notifications

### In-app

Created by admin approve/reject mutations via service role client:

| Action | Title | Body | Links to |
|--------|-------|------|----------|
| Approved | "Organization request approved" | `Your organization "{name}" has been approved!` | `/organizations/{slug}` |
| Rejected | "Organization request update" | `Your request for "{name}" was not approved.` | `/organizations/create` |

Both types use the `Building2` icon in the notification bell.

### Email

New edge function `send-org-request-notification` following the `send-invite` pattern:

- Auth: JWT (site_admin required)
- Input: `{ requestId, action: "approved" | "rejected" }`
- Sends via Resend API (`noreply@trainers.gg`)
- **Approval email**: congratulations + link to org page
- **Rejection email**: reason + mention of resubmit cooldown + link to `/organizations/create`
- Called fire-and-forget from admin actions — if email fails, in-app notification still works

## What gets removed / changed

| Current | After |
|---------|-------|
| `createOrganization` server action (user-facing) | Removed — replaced by `submitOrganizationRequestAction` |
| `CreateOrganizationForm` component | Replaced by `RequestOrganizationForm` (same fields, different action) |
| Page title "Create Organization" | "Request an Organization" |
| TO dashboard button "Create Organization" | "Request an Organization" |
| Direct org creation mutation (user-facing) | Internal only, called by admin approval flow |

The existing `/admin/organizations` page stays as-is for managing orgs that already exist.

## Files

### New

- `packages/supabase/supabase/migrations/YYYYMMDDHHMMSS_organization_requests.sql`
- `packages/validators/src/organization-request.ts`
- `packages/supabase/src/queries/organization-requests.ts`
- `packages/supabase/src/mutations/organization-requests.ts`
- `apps/web/src/actions/organization-requests.ts`
- `apps/web/src/app/organizations/create/request-organization-form.tsx`
- `apps/web/src/app/organizations/create/request-status.tsx`
- `apps/web/src/app/admin/org-requests/page.tsx`
- `apps/web/src/app/admin/org-requests/columns.tsx`
- `apps/web/src/app/admin/org-requests/request-detail-sheet.tsx`
- `apps/web/src/app/admin/org-requests/actions.ts`
- `apps/web/src/app/admin/org-requests/loading.tsx`
- `packages/supabase/supabase/functions/send-org-request-notification/index.ts`
- `tooling/test-utils/src/factories/organization-request.ts`
- Tests for validators, mutations, server actions

### Modified

- `apps/web/src/app/organizations/create/page.tsx` — conditional rendering
- `apps/web/src/app/organizations/page.tsx` — add request button
- `apps/web/src/app/to-dashboard/org-selector-client.tsx` — update button text
- `apps/web/src/app/admin/admin-nav.tsx` — add nav item
- `apps/web/src/components/notification-bell.tsx` — add icon mappings
- `packages/posthog/src/events.ts` — add analytics events
- `packages/utils/src/labels.ts` — add request status labels
- `packages/validators/src/index.ts` — re-export new schemas
- `packages/supabase/src/queries/index.ts` — re-export
- `packages/supabase/src/mutations/index.ts` — re-export

## Analytics events

- `ORG_REQUEST_SUBMITTED` — user submits a request
- `ORG_REQUEST_APPROVED` — admin approves
- `ORG_REQUEST_REJECTED` — admin rejects
