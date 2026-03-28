# Grant Rejected Community Requests

Allow site admins to approve a previously rejected community request directly from the admin dashboard.

## Problem

Once a community request is rejected, the decision is final. Admins cannot reverse it — the only path forward is for the user to wait out a 7-day cooldown and reapply. This lacks flexibility for cases where the admin changes their mind or new context emerges.

## Solution

Add an "Approve" action to rejected community requests. This reuses the existing approval flow (community creation, staff insertion, notifications, audit logging) with minimal additions for duplicate handling and audit context.

## Scope

- Rename `approveCommunityRequest` → `grantCommunityRequest` (mutation + server action) to reflect that approval is no longer tied to a specific source status
- Relax the status guard from `pending`-only to `pending | rejected`
- Add optional `reason` parameter for audit context when approving a rejected request
- Auto-cancel duplicate pending requests from the same user
- Show the Approve button on rejected requests in the admin detail sheet

**Out of scope:** "Reconsider" (moving back to pending), new notification types, new database tables.

## Design

### Mutation: `grantCommunityRequest`

**File:** `packages/supabase/src/mutations/organization-requests.ts`

Rename `approveCommunityRequest` to `grantCommunityRequest`. Changes:

1. **Status guard:** Accept `pending` or `rejected` (currently only `pending`).
2. **Optional reason:** New parameter `reason?: string`. Stored in audit log metadata — does not overwrite `admin_notes` (preserves original rejection reason).
3. **Duplicate cancellation:** After community creation, query for other `pending` requests from the same `user_id`. Update each to `rejected` with `admin_notes`: "Automatically closed — community granted via request #X". Log each cancellation to the audit log.
4. **Existing flow unchanged:** Slug uniqueness re-check → community creation → staff insertion → request status update → in-app notification → audit log → return.

### Server Action: `grantCommunityRequestAction`

**File:** `apps/web/src/app/(app)/admin/org-requests/actions.ts`

Rename `approveCommunityRequestAction` to `grantCommunityRequestAction`. Add optional `reason` parameter (string, max 1000 chars). Email notification call unchanged — the edge function already handles `action: "approved"`.

### UI: Request Detail Sheet

**File:** `apps/web/src/app/(app)/admin/org-requests/request-detail-sheet.tsx`

- For `rejected` requests: show an **"Approve Request"** button.
- Confirmation dialog includes:
  - Optional reason textarea
  - Original rejection reason displayed as read-only context
  - Confirm / Cancel
- Reject button is **not** shown on rejected requests.
- Pending request behavior stays identical.

### Audit Trail

All actions are logged:

- Approving a rejected request: `admin.org_request_approved` with metadata `{ reason, from_status: "rejected" }`.
- Auto-cancelling duplicate pending requests: `admin.org_request_rejected` with metadata `{ reason: "Automatically closed — community granted via request #X", auto_cancelled: true }`.

### Notifications

- **Email:** Sent on approval only (standard approval email via `send-org-request-notification`).
- **In-app:** Standard `org_request_approved` notification.
- **Auto-cancelled duplicates:** No notification (the user's request was granted via the original — the cancellation is internal bookkeeping).

## Testing

### Mutation Tests

- Approve a rejected request (happy path): community created, staff added, request status updated.
- Approve a rejected request when user has a newer pending request: pending request auto-cancelled.
- Approve a rejected request with slug collision: returns error (slug taken by another community).
- Existing pending → approved flow still works unchanged.

### Server Action Tests

- Optional reason parameter passes through to mutation.
- Validation: reason max 1000 chars.

### UI Tests

- Approve button renders on rejected requests.
- Reject button does not render on rejected requests.
- Confirmation dialog shows original rejection reason.
- Optional reason textarea is present.
