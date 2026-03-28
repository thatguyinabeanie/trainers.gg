# Grant Rejected Community Requests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow site admins to approve previously rejected community requests from the admin dashboard.

**Architecture:** Extend the existing `approveCommunityRequest` mutation (renamed to `grantCommunityRequest`) to accept both `pending` and `rejected` statuses, add duplicate-request cancellation, and surface an Approve button on rejected requests in the admin UI.

**Tech Stack:** TypeScript, Supabase (PostgreSQL), Next.js 16 Server Actions, React (shadcn/ui)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/supabase/src/mutations/organization-requests.ts` | Rename `approveCommunityRequest` → `grantCommunityRequest`, relax status guard, add `reason` param, add duplicate cancellation |
| Modify | `packages/supabase/src/mutations/index.ts` | Update barrel export name |
| Modify | `apps/web/src/app/(app)/admin/org-requests/actions.ts` | Rename action, add optional `reason` parameter |
| Modify | `apps/web/src/app/(app)/admin/org-requests/request-detail-sheet.tsx` | Show Approve on rejected requests, display rejection context in dialog |
| Modify | `packages/supabase/src/mutations/__tests__/organization-requests.test.ts` | Rename references, add tests for rejected→approved + duplicate cancellation |
| Modify | `apps/web/src/app/(app)/admin/org-requests/__tests__/actions.test.ts` | Rename references, add test for optional reason |
| Regenerate | `packages/supabase/src/clients/server.ts`, `client.ts`, `mobile.ts` | Auto-generated — run `pnpm --filter @trainers/supabase generate-clients` |

---

## Task 1: Rename and extend the mutation

**Files:**
- Modify: `packages/supabase/src/mutations/organization-requests.ts:111-224`
- Modify: `packages/supabase/src/mutations/index.ts:76-79`

- [ ] **Step 1: Write the failing test — approve a rejected request**

Add this test to `packages/supabase/src/mutations/__tests__/organization-requests.test.ts`. Place it inside a new `describe("grantCommunityRequest")` block, replacing the existing `describe("approveCommunityRequest")` block header.

First, update the import at line 3 to rename:

```typescript
import {
  submitCommunityRequest,
  grantCommunityRequest,
  rejectCommunityRequest,
} from "../organization-requests";
```

Then rename the `describe` block from `"approveCommunityRequest"` to `"grantCommunityRequest"` and update all calls from `approveCommunityRequest(...)` to `grantCommunityRequest(...)` inside it.

Then add this new test inside the renamed `describe("grantCommunityRequest")` block, after the existing tests:

```typescript
it("approves a rejected request with reason and creates community", async () => {
  const request = organizationRequestFactory.build({
    status: "rejected",
    user_id: "requester-789",
    admin_notes: "Original rejection reason",
  });
  const org = { id: "org-1", name: request.name, slug: request.slug };
  const updatedRequest = { ...request, status: "approved" };

  let requestCallCount = 0;
  const fromSpy = jest.spyOn(mockClient, "from");
  fromSpy.mockImplementation((table: string) => {
    const builder: MockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    if (table === "community_requests") {
      requestCallCount++;
      if (requestCallCount === 1) {
        // Fetch request — returns rejected request
        builder.single.mockResolvedValue({
          data: request,
          error: null,
        });
      } else if (requestCallCount === 2) {
        // Update request status
        builder.single.mockResolvedValue({
          data: updatedRequest,
          error: null,
        });
      } else if (requestCallCount === 3) {
        // Duplicate cancellation query — no pending duplicates
        builder.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              neq: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });
      }
    } else if (table === "communities") {
      builder.maybeSingle.mockResolvedValue({ data: null });
      builder.single.mockResolvedValue({ data: org, error: null });
    } else if (table === "community_staff") {
      builder.insert.mockReturnValue({ error: null });
    } else if (table === "notifications") {
      builder.insert.mockReturnValue({ error: null });
    } else if (table === "audit_log") {
      builder.insert.mockReturnValue({ error: null });
    }

    return builder;
  });

  const result = await grantCommunityRequest(
    mockClient,
    request.id,
    ADMIN_USER_ID,
    "Changed my mind after reviewing additional context"
  );

  expect(result.organization).toEqual(org);
  expect(result.request).toEqual(updatedRequest);
  expect(fromSpy).toHaveBeenCalledWith("communities");
  expect(fromSpy).toHaveBeenCalledWith("community_staff");
  expect(fromSpy).toHaveBeenCalledWith("notifications");
  expect(fromSpy).toHaveBeenCalledWith("audit_log");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests && pnpm test -- --testPathPattern='packages/supabase/src/mutations/__tests__/organization-requests' --no-coverage`

Expected: FAIL — `grantCommunityRequest` is not exported (still named `approveCommunityRequest`).

- [ ] **Step 3: Rename the mutation and relax the status guard**

In `packages/supabase/src/mutations/organization-requests.ts`, make these changes:

1. Rename `approveCommunityRequest` to `grantCommunityRequest` and add the optional `reason` parameter:

```typescript
export async function grantCommunityRequest(
  supabase: TypedClient,
  requestId: number,
  adminUserId: string,
  reason?: string
) {
```

2. Replace the status guard (line 124-126) from:

```typescript
  if (request.status !== "pending") {
    throw new Error("Request is no longer pending");
  }
```

to:

```typescript
  if (request.status !== "pending" && request.status !== "rejected") {
    throw new Error("Request has already been approved");
  }
```

3. Update the audit log metadata (around line 212-221) to include `reason` and `from_status`:

```typescript
  // Audit log
  await supabase.from("audit_log").insert({
    action: "admin.org_request_approved" as const,
    actor_user_id: adminUserId,
    community_id: community.id,
    metadata: {
      request_id: requestId,
      community_id: community.id,
      requester_user_id: request.user_id,
      ...(reason && { reason }),
      ...(request.status === "rejected" && { from_status: "rejected" }),
    },
  });
```

4. Add duplicate cancellation logic right before the `return` statement (after the audit log insert, before `return { request: updatedRequest, organization: community }`):

```typescript
  // Cancel any other pending requests from the same user
  if (request.status === "rejected") {
    const { data: duplicates } = await supabase
      .from("community_requests")
      .select("id")
      .eq("user_id", request.user_id)
      .eq("status", "pending")
      .neq("id", requestId);

    if (duplicates && duplicates.length > 0) {
      for (const dup of duplicates) {
        await supabase
          .from("community_requests")
          .update({
            status: "rejected" as const,
            admin_notes: `Automatically closed — community granted via request #${requestId}`,
            reviewed_by: adminUserId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", dup.id);

        await supabase.from("audit_log").insert({
          action: "admin.org_request_rejected" as const,
          actor_user_id: adminUserId,
          metadata: {
            request_id: dup.id,
            requester_user_id: request.user_id,
            reason: `Automatically closed — community granted via request #${requestId}`,
            auto_cancelled: true,
          },
        });
      }
    }
  }
```

- [ ] **Step 4: Update the barrel export**

In `packages/supabase/src/mutations/index.ts`, change line 77:

From:
```typescript
export {
  submitCommunityRequest,
  approveCommunityRequest,
  rejectCommunityRequest,
} from "./organization-requests";
```

To:
```typescript
export {
  submitCommunityRequest,
  grantCommunityRequest,
  rejectCommunityRequest,
} from "./organization-requests";
```

- [ ] **Step 5: Update existing tests to use new name and fix the "not pending" test**

In `packages/supabase/src/mutations/__tests__/organization-requests.test.ts`:

The existing test `"throws when request is not pending"` currently uses a `rejected` status and expects `"Request is no longer pending"`. Since rejected is now a valid status, change this test to use `approved` status instead:

```typescript
it("throws when request is already approved", async () => {
  const request = organizationRequestFactory.build({
    status: "approved",
  });

  const fromSpy = jest.spyOn(mockClient, "from");
  fromSpy.mockImplementation(() => {
    const builder: MockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: request,
        error: null,
      }),
      maybeSingle: jest.fn(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
    return builder;
  });

  await expect(
    grantCommunityRequest(mockClient, request.id, ADMIN_USER_ID)
  ).rejects.toThrow("Request has already been approved");
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests && pnpm test -- --testPathPattern='packages/supabase/src/mutations/__tests__/organization-requests' --no-coverage`

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests
git add packages/supabase/src/mutations/organization-requests.ts packages/supabase/src/mutations/index.ts packages/supabase/src/mutations/__tests__/organization-requests.test.ts
git commit -m "feat: rename approveCommunityRequest to grantCommunityRequest

Relax status guard to accept both pending and rejected requests.
Add optional reason parameter for audit context.
Add duplicate pending request cancellation when granting a rejected request."
```

---

## Task 2: Add test for duplicate cancellation

**Files:**
- Modify: `packages/supabase/src/mutations/__tests__/organization-requests.test.ts`

- [ ] **Step 1: Write the failing test — duplicate pending request gets cancelled**

Add this test inside the `describe("grantCommunityRequest")` block:

```typescript
it("cancels duplicate pending requests when granting a rejected request", async () => {
  const request = organizationRequestFactory.build({
    status: "rejected",
    user_id: "requester-789",
  });
  const duplicatePending = organizationRequestFactory.build({
    id: 999,
    status: "pending",
    user_id: "requester-789",
  });
  const org = { id: "org-1", name: request.name, slug: request.slug };
  const updatedRequest = { ...request, status: "approved" };

  let requestCallCount = 0;
  const updateCalls: Array<{ table: string; id: number }> = [];
  const auditInserts: Array<Record<string, unknown>> = [];
  const fromSpy = jest.spyOn(mockClient, "from");
  fromSpy.mockImplementation((table: string) => {
    const builder: MockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    if (table === "community_requests") {
      requestCallCount++;
      if (requestCallCount === 1) {
        // Fetch request
        builder.single.mockResolvedValue({ data: request, error: null });
      } else if (requestCallCount === 2) {
        // Update request status
        builder.single.mockResolvedValue({ data: updatedRequest, error: null });
      } else if (requestCallCount === 3) {
        // Duplicate query — returns one pending duplicate
        builder.select.mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              neq: jest.fn().mockResolvedValue({
                data: [{ id: duplicatePending.id }],
                error: null,
              }),
            }),
          }),
        });
      } else if (requestCallCount === 4) {
        // Update duplicate to rejected
        builder.eq.mockReturnValue({ error: null });
        updateCalls.push({ table, id: duplicatePending.id });
      }
    } else if (table === "communities") {
      builder.maybeSingle.mockResolvedValue({ data: null });
      builder.single.mockResolvedValue({ data: org, error: null });
    } else if (table === "community_staff") {
      builder.insert.mockReturnValue({ error: null });
    } else if (table === "notifications") {
      builder.insert.mockReturnValue({ error: null });
    } else if (table === "audit_log") {
      const mockInsert = jest.fn().mockReturnValue({ error: null });
      builder.insert = mockInsert;
      // Track audit inserts for assertions
      mockInsert.mockImplementation((data: Record<string, unknown>) => {
        auditInserts.push(data);
        return { error: null };
      });
    }

    return builder;
  });

  await grantCommunityRequest(mockClient, request.id, ADMIN_USER_ID);

  // Verify audit_log was called at least twice (original approval + duplicate cancellation)
  const auditCalls = fromSpy.mock.calls.filter(([t]) => t === "audit_log");
  expect(auditCalls.length).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests && pnpm test -- --testPathPattern='packages/supabase/src/mutations/__tests__/organization-requests' --no-coverage`

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests
git add packages/supabase/src/mutations/__tests__/organization-requests.test.ts
git commit -m "test: add duplicate cancellation test for grantCommunityRequest"
```

---

## Task 3: Rename and extend the server action

**Files:**
- Modify: `apps/web/src/app/(app)/admin/org-requests/actions.ts`
- Modify: `apps/web/src/app/(app)/admin/org-requests/__tests__/actions.test.ts`

- [ ] **Step 1: Write the failing test — action accepts optional reason**

In `apps/web/src/app/(app)/admin/org-requests/__tests__/actions.test.ts`:

1. Update the mock declaration (around line 22-25):

```typescript
jest.mock("@trainers/supabase/mutations", () => ({
  grantCommunityRequest: jest.fn(),
  rejectCommunityRequest: jest.fn(),
}));
```

2. Update the imports (around line 28-36):

```typescript
import {
  grantCommunityRequestAction,
  rejectCommunityRequestAction,
} from "../actions";
import { requireAdminWithSudo } from "@/lib/auth/require-admin";
import {
  grantCommunityRequest,
  rejectCommunityRequest,
} from "@trainers/supabase/mutations";

const mockRequireAdminWithSudo = requireAdminWithSudo as jest.Mock;
const mockGrantCommunityRequest = grantCommunityRequest as jest.Mock;
const mockRejectCommunityRequest = rejectCommunityRequest as jest.Mock;
```

3. Rename the `describe` block from `"approveCommunityRequestAction"` to `"grantCommunityRequestAction"`. Update all references from `approveCommunityRequestAction` to `grantCommunityRequestAction` and `mockApproveCommunityRequest` to `mockGrantCommunityRequest` inside it.

4. Add this new test inside the renamed describe block:

```typescript
it("passes optional reason to the mutation", async () => {
  const result = await grantCommunityRequestAction(
    REQUEST_ID,
    "Reconsidered after community discussion"
  );

  expect(result).toEqual({ success: true });
  expect(mockGrantCommunityRequest).toHaveBeenCalledWith(
    mockServiceClient,
    REQUEST_ID,
    ADMIN_USER_ID,
    "Reconsidered after community discussion"
  );
});

it("passes undefined reason when not provided", async () => {
  await grantCommunityRequestAction(REQUEST_ID);

  expect(mockGrantCommunityRequest).toHaveBeenCalledWith(
    mockServiceClient,
    REQUEST_ID,
    ADMIN_USER_ID,
    undefined
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests && pnpm test -- --testPathPattern='admin/org-requests/__tests__/actions' --no-coverage`

Expected: FAIL — `grantCommunityRequestAction` is not exported.

- [ ] **Step 3: Update the server action**

In `apps/web/src/app/(app)/admin/org-requests/actions.ts`:

1. Update the import:

```typescript
import {
  grantCommunityRequest,
  rejectCommunityRequest,
} from "@trainers/supabase/mutations";
```

2. Replace the approve action:

```typescript
// --- Grant (approve pending or rejected) ---

export async function grantCommunityRequestAction(
  requestId: number,
  reason?: string
): Promise<ActionResult> {
  const parsed = positiveIntSchema.safeParse(requestId);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid input: ${parsed.error.issues[0]?.message}`,
    };
  }

  if (reason !== undefined) {
    const parsedReason = adminReasonSchema.safeParse(reason);
    if (!parsedReason.success) {
      return {
        success: false,
        error: `Invalid input: ${parsedReason.error.issues[0]?.message}`,
      };
    }
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await grantCommunityRequest(supabase, parsed.data, adminUserId, reason);

    // Fire-and-forget email notification
    supabase.functions
      .invoke("send-org-request-notification", {
        body: { requestId: parsed.data, action: "approved" },
      })
      .catch((err: unknown) =>
        console.error("Failed to send approval email:", err)
      );

    return { success: true };
  }, "Failed to approve community request");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests && pnpm test -- --testPathPattern='admin/org-requests/__tests__/actions' --no-coverage`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests
git add apps/web/src/app/(app)/admin/org-requests/actions.ts apps/web/src/app/(app)/admin/org-requests/__tests__/actions.test.ts
git commit -m "feat: rename approveCommunityRequestAction to grantCommunityRequestAction

Add optional reason parameter for audit trail context."
```

---

## Task 4: Update the UI to show Approve on rejected requests

**Files:**
- Modify: `apps/web/src/app/(app)/admin/org-requests/request-detail-sheet.tsx`

- [ ] **Step 1: Update the action import**

Change:
```typescript
import {
  approveCommunityRequestAction,
  rejectCommunityRequestAction,
} from "./actions";
```

To:
```typescript
import {
  grantCommunityRequestAction,
  rejectCommunityRequestAction,
} from "./actions";
```

- [ ] **Step 2: Add `approveReason` state and update `ConfirmAction` type**

Add a new state variable alongside the existing `rejectReason`:

```typescript
const [approveReason, setApproveReason] = useState("");
```

Update the `useEffect` reset to also clear `approveReason`:

```typescript
useEffect(() => {
  setRejectReason("");
  setApproveReason("");
  setConfirmAction(null);
}, [request?.id]);
```

- [ ] **Step 3: Update the `isPending` logic to show actions on rejected too**

Change:
```typescript
const isPending = request.status === "pending";
```

To:
```typescript
const isPending = request.status === "pending";
const isRejected = request.status === "rejected";
const canApprove = isPending || isRejected;
```

- [ ] **Step 4: Update the actions section**

Replace the entire actions section (the `{isPending && ( ... )}` block, around lines 267-301) with:

```tsx
{canApprove && (
  <>
    <Separator />
    <section className="space-y-4">
      <h3 className="text-sm font-medium">Actions</h3>

      <Button
        className="w-full"
        onClick={() => setConfirmAction({ type: "approve" })}
      >
        <Check className="size-4" />
        Approve Request
      </Button>

      {isPending && (
        <div className="space-y-2">
          <Label htmlFor="reject-reason">Rejection Reason</Label>
          <Textarea
            id="reject-reason"
            placeholder="Explain why this request is being rejected..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setConfirmAction({ type: "reject" })}
            disabled={!rejectReason.trim()}
          >
            <X className="size-4" />
            Reject Request
          </Button>
        </div>
      )}
    </section>
  </>
)}
```

- [ ] **Step 5: Update the `handleConfirm` function**

Change the approve branch to pass the optional reason:

```typescript
async function handleConfirm() {
  if (!request || !confirmAction) return;
  setIsSubmitting(true);

  try {
    let result;
    if (confirmAction.type === "approve") {
      const reason = approveReason.trim() || undefined;
      result = await grantCommunityRequestAction(request.id, reason);
    } else {
      result = await rejectCommunityRequestAction(request.id, rejectReason);
    }

    if (result.success) {
      toast.success(
        confirmAction.type === "approve"
          ? "Request approved — community created"
          : "Request rejected"
      );
      setConfirmAction(null);
      setRejectReason("");
      setApproveReason("");
      onOpenChange(false);
      onActionComplete?.();
    } else {
      toast.error(result.error);
    }
  } finally {
    setIsSubmitting(false);
  }
}
```

- [ ] **Step 6: Update the confirmation dialog to show context for rejected requests**

Replace the `AlertDialogContent` with:

```tsx
<AlertDialogContent>
  <AlertDialogHeader>
    <AlertDialogTitle>
      {confirmAction?.type === "approve"
        ? "Approve this request?"
        : "Reject this request?"}
    </AlertDialogTitle>
    <AlertDialogDescription>
      {confirmAction?.type === "approve"
        ? `This will create the community "${request.name}" and notify the requester.`
        : `This will reject the request and notify the requester. They can reapply after 7 days.`}
    </AlertDialogDescription>
  </AlertDialogHeader>

  {/* Show original rejection reason when approving a previously rejected request */}
  {confirmAction?.type === "approve" && isRejected && request.admin_notes && (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs">
        Original rejection reason
      </Label>
      <p className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
        {request.admin_notes}
      </p>
    </div>
  )}

  {/* Optional reason for approving a rejected request */}
  {confirmAction?.type === "approve" && isRejected && (
    <div className="space-y-2">
      <Label htmlFor="approve-reason">Reason (optional)</Label>
      <Textarea
        id="approve-reason"
        placeholder="Why are you approving this previously rejected request?"
        value={approveReason}
        onChange={(e) => setApproveReason(e.target.value)}
        rows={2}
      />
    </div>
  )}

  <AlertDialogFooter>
    <AlertDialogCancel disabled={isSubmitting}>
      Cancel
    </AlertDialogCancel>
    <AlertDialogAction
      onClick={handleConfirm}
      disabled={isSubmitting}
      variant={
        confirmAction?.type === "reject" ? "destructive" : "default"
      }
    >
      {isSubmitting
        ? "Processing..."
        : confirmAction?.type === "approve"
          ? "Approve"
          : "Reject"}
    </AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
```

- [ ] **Step 7: Commit**

```bash
cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests
git add apps/web/src/app/(app)/admin/org-requests/request-detail-sheet.tsx
git commit -m "feat: show Approve button on rejected community requests

Display original rejection reason and optional reason field in
the confirmation dialog when approving a previously rejected request."
```

---

## Task 5: Regenerate client wrappers and run full checks

**Files:**
- Regenerate: `packages/supabase/src/clients/server.ts`, `client.ts`, `mobile.ts`

- [ ] **Step 1: Regenerate auto-generated client wrappers**

Run: `cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests && pnpm --filter @trainers/supabase generate-clients`

This propagates the `grantCommunityRequest` rename to all three client wrapper files (`server.ts`, `client.ts`, `mobile.ts`).

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests && pnpm typecheck`

Expected: PASS — no type errors. If any remaining references to `approveCommunityRequest` exist, fix them.

- [ ] **Step 3: Run lint**

Run: `cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests && pnpm lint`

Expected: PASS.

- [ ] **Step 4: Run all tests**

Run: `cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests && pnpm test`

Expected: PASS.

- [ ] **Step 5: Run format check**

Run: `cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests && pnpm format:check`

Expected: PASS. If formatting issues, run `pnpm format` first then re-check.

- [ ] **Step 6: Commit generated files**

```bash
cd /Users/beanie/source/trainers.gg/.worktrees/grant-rejected-requests
git add packages/supabase/src/clients/server.ts packages/supabase/src/clients/client.ts packages/supabase/src/clients/mobile.ts
git commit -m "chore: regenerate client wrappers after grantCommunityRequest rename"
```
