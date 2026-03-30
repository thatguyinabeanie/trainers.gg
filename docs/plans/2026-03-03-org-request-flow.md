# Organization Request Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace direct org creation with a request → admin approval flow. Users submit requests; site admins review and approve/reject; approval creates the org.

**Architecture:** New `organization_requests` table stores requests separately from orgs. User-facing `/organizations/create` becomes a request form with status display. New admin page at `/admin/org-requests` for review. Notifications (in-app + email) on approval/rejection.

**Tech Stack:** Supabase (PostgreSQL + RLS + Edge Functions), Next.js 16 Server Actions, Zod validators, TanStack Table, Resend email, PostHog analytics.

---

## Task 1: Database Migration

**Files:**

- Create: `packages/supabase/supabase/migrations/YYYYMMDDHHMMSS_organization_requests.sql`

**Step 1: Create the migration file**

Generate the timestamp and create the file:

```bash
TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
touch "packages/supabase/supabase/migrations/${TIMESTAMP}_organization_requests.sql"
```

Write the migration SQL:

```sql
-- Organization request status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_request_status') THEN
    CREATE TYPE public.org_request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- Organization requests table
CREATE TABLE IF NOT EXISTS public.organization_requests (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  status public.org_request_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT org_requests_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT org_requests_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT org_requests_slug_length CHECK (char_length(slug) BETWEEN 1 AND 100),
  CONSTRAINT org_requests_description_length CHECK (description IS NULL OR char_length(description) <= 500),
  CONSTRAINT org_requests_admin_notes_length CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 1000)
);

-- Indexes
CREATE INDEX IF NOT EXISTS org_requests_user_id_idx ON public.organization_requests (user_id);
CREATE INDEX IF NOT EXISTS org_requests_status_idx ON public.organization_requests (status);
CREATE INDEX IF NOT EXISTS org_requests_slug_idx ON public.organization_requests (slug) WHERE status = 'pending';

-- One pending request per user
CREATE UNIQUE INDEX IF NOT EXISTS org_requests_one_pending_per_user
  ON public.organization_requests (user_id) WHERE status = 'pending';

-- One pending request per slug
CREATE UNIQUE INDEX IF NOT EXISTS org_requests_one_pending_per_slug
  ON public.organization_requests (slug) WHERE status = 'pending';

-- RLS
ALTER TABLE public.organization_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org requests" ON public.organization_requests;
CREATE POLICY "Users can view own org requests"
  ON public.organization_requests FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create org requests" ON public.organization_requests;
CREATE POLICY "Users can create org requests"
  ON public.organization_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Site admins can view all org requests" ON public.organization_requests;
CREATE POLICY "Site admins can view all org requests"
  ON public.organization_requests FOR SELECT TO authenticated
  USING (public.is_site_admin());

DROP POLICY IF EXISTS "Site admins can update org requests" ON public.organization_requests;
CREATE POLICY "Site admins can update org requests"
  ON public.organization_requests FOR UPDATE TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- Notification types for org requests
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'org_request_approved';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'org_request_rejected';

-- Audit actions for org requests
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.org_request_approved';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.org_request_rejected';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_org_request_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_org_request_updated_at ON public.organization_requests;
CREATE TRIGGER update_org_request_updated_at
  BEFORE UPDATE ON public.organization_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_org_request_updated_at();
```

**Step 2: Apply migration and regenerate types**

```bash
pnpm db:migrate && pnpm generate-types
```

**Step 3: Commit**

```bash
git add packages/supabase/supabase/migrations/*_organization_requests.sql packages/supabase/src/types.ts
git commit -m "feat: add organization_requests table and notification/audit enum values"
```

---

## Task 2: Zod Validators

**Files:**

- Create: `packages/validators/src/organization-request.ts`
- Modify: `packages/validators/src/index.ts`

**Step 1: Create the schema file**

```typescript
// packages/validators/src/organization-request.ts
import { z } from "zod";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

/**
 * Schema for submitting an organization request.
 * Same fields as createOrganizationSchema — name, slug, description.
 */
export const submitOrganizationRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100)
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    }),
  slug: z
    .string()
    .min(1, "URL slug is required")
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "URL can only contain lowercase letters, numbers, and hyphens"
    )
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    }),
  description: z
    .string()
    .max(500)
    .refine((val) => !val || !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    })
    .optional(),
});

export type SubmitOrganizationRequestInput = z.infer<
  typeof submitOrganizationRequestSchema
>;
```

**Step 2: Re-export from index.ts**

Add to `packages/validators/src/index.ts`:

```typescript
export {
  submitOrganizationRequestSchema,
  type SubmitOrganizationRequestInput,
} from "./organization-request";
```

**Step 3: Commit**

```bash
git add packages/validators/src/organization-request.ts packages/validators/src/index.ts
git commit -m "feat: add submitOrganizationRequestSchema validator"
```

---

## Task 3: Test Factory

**Files:**

- Create: `tooling/test-utils/src/factories/organization-request.ts`
- Modify: `tooling/test-utils/src/factories/index.ts`

**Step 1: Create the factory**

```typescript
// tooling/test-utils/src/factories/organization-request.ts
import { Factory } from "fishery";
import type { Tables } from "@trainers/supabase/types";

export const organizationRequestFactory = Factory.define<
  Tables<"organization_requests">
>(({ sequence }) => ({
  id: sequence,
  user_id: `user-uuid-${sequence}`,
  name: `Organization Request ${sequence}`,
  slug: `org-request-${sequence}`,
  description: null,
  status: "pending",
  admin_notes: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));
```

**Step 2: Re-export from index.ts**

Add to `tooling/test-utils/src/factories/index.ts`:

```typescript
export { organizationRequestFactory } from "./organization-request";
```

**Step 3: Commit**

```bash
git add tooling/test-utils/src/factories/organization-request.ts tooling/test-utils/src/factories/index.ts
git commit -m "feat: add organizationRequestFactory for tests"
```

---

## Task 4: Supabase Queries

**Files:**

- Create: `packages/supabase/src/queries/organization-requests.ts`
- Modify: `packages/supabase/src/queries/index.ts`

**Step 1: Write the query functions**

```typescript
// packages/supabase/src/queries/organization-requests.ts
import { escapeLike } from "@trainers/utils";
import type { TypedClient } from "../client";

/**
 * Get the current user's most recent organization request.
 * Returns the pending request if one exists, otherwise the most recent rejected request.
 * Used to determine which state to show on the request form page.
 */
export async function getMyOrganizationRequest(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get pending request first
  const { data: pending } = await supabase
    .from("organization_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) return pending;

  // Get most recent rejected request (for cooldown display)
  const { data: rejected } = await supabase
    .from("organization_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "rejected")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return rejected;
}

// --- Admin queries ---

export interface ListOrgRequestsAdminOptions {
  search?: string;
  status?: "pending" | "approved" | "rejected";
  limit?: number;
  offset?: number;
}

/**
 * List organization requests for the admin panel.
 * Joins to users table for requester info.
 */
export async function listOrgRequestsAdmin(
  supabase: TypedClient,
  options: ListOrgRequestsAdminOptions = {}
) {
  const { search, status, limit = 25, offset = 0 } = options;

  let query = supabase
    .from("organization_requests")
    .select(
      `
      id,
      name,
      slug,
      description,
      status,
      admin_notes,
      reviewed_by,
      reviewed_at,
      created_at,
      updated_at,
      requester:users!organization_requests_user_id_fkey(id, username, first_name, last_name, image, email)
    `,
      { count: "exact", head: false }
    )
    .order("created_at", { ascending: false });

  if (search) {
    const escaped = escapeLike(search);
    query = query.or(`name.ilike.%${escaped}%,slug.ilike.%${escaped}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) throw error;

  return { data: data ?? [], count: count ?? 0 };
}
```

**Step 2: Re-export from index.ts**

Add to `packages/supabase/src/queries/index.ts`:

```typescript
export {
  getMyOrganizationRequest,
  listOrgRequestsAdmin,
  type ListOrgRequestsAdminOptions,
} from "./organization-requests";
```

**Step 3: Commit**

```bash
git add packages/supabase/src/queries/organization-requests.ts packages/supabase/src/queries/index.ts
git commit -m "feat: add organization request queries (user + admin)"
```

---

## Task 5: Supabase Mutations

**Files:**

- Create: `packages/supabase/src/mutations/organization-requests.ts`
- Modify: `packages/supabase/src/mutations/index.ts`

**Step 1: Write the mutation functions**

```typescript
// packages/supabase/src/mutations/organization-requests.ts
import type { TypedClient } from "../client";

const COOLDOWN_DAYS = 7;

/**
 * Submit an organization request.
 * Validates: no pending request, cooldown after rejection, slug uniqueness.
 */
export async function submitOrganizationRequest(
  supabase: TypedClient,
  data: { name: string; slug: string; description?: string }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const slug = data.slug.toLowerCase();

  // Check for existing pending request
  const { data: pendingRequest } = await supabase
    .from("organization_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingRequest) {
    throw new Error("You already have a pending organization request");
  }

  // Check cooldown after rejection
  const { data: recentRejection } = await supabase
    .from("organization_requests")
    .select("reviewed_at")
    .eq("user_id", user.id)
    .eq("status", "rejected")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentRejection?.reviewed_at) {
    const rejectedAt = new Date(recentRejection.reviewed_at);
    const cooldownEnd = new Date(rejectedAt);
    cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);

    if (new Date() < cooldownEnd) {
      const formatted = cooldownEnd.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      throw new Error(`You can submit a new request after ${formatted}`);
    }
  }

  // Check slug uniqueness against organizations table
  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingOrg) {
    throw new Error(
      "This URL slug is already taken by an existing organization"
    );
  }

  // Check slug uniqueness against pending requests
  const { data: existingRequest } = await supabase
    .from("organization_requests")
    .select("id")
    .eq("slug", slug)
    .eq("status", "pending")
    .maybeSingle();

  if (existingRequest) {
    throw new Error("This URL slug is already requested by another user");
  }

  // Insert the request
  const { data: request, error } = await supabase
    .from("organization_requests")
    .insert({
      user_id: user.id,
      name: data.name,
      slug,
      description: data.description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return request;
}

/**
 * Approve an organization request (admin action).
 * Creates the org, sets requester as owner/staff, creates notification.
 * Uses service role client (bypasses RLS).
 */
export async function approveOrganizationRequest(
  supabase: TypedClient,
  requestId: number,
  adminUserId: string
) {
  // Fetch the request
  const { data: request, error: fetchError } = await supabase
    .from("organization_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) throw new Error("Request not found");
  if (request.status !== "pending") {
    throw new Error("Request is no longer pending");
  }

  // Re-check slug uniqueness against organizations
  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", request.slug)
    .maybeSingle();

  if (existingOrg) {
    throw new Error(
      `Slug "${request.slug}" is now taken by an existing organization`
    );
  }

  // Create the organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: request.name,
      slug: request.slug,
      description: request.description,
      owner_user_id: request.user_id,
      status: "active",
    })
    .select()
    .single();

  if (orgError) throw orgError;

  // Add requester as staff
  await supabase.from("organization_staff").insert({
    organization_id: org.id,
    user_id: request.user_id,
  });

  // Update request status
  const { error: updateError } = await supabase
    .from("organization_requests")
    .update({
      status: "approved" as const,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) throw updateError;

  // Create in-app notification
  await supabase.from("notifications").insert({
    user_id: request.user_id,
    type: "org_request_approved" as const,
    title: "Organization request approved",
    body: `Your organization "${request.name}" has been approved!`,
    action_url: `/organizations/${request.slug}`,
  });

  // Audit log
  await supabase.from("audit_log").insert({
    action: "admin.org_request_approved" as const,
    actor_user_id: adminUserId,
    organization_id: org.id,
    metadata: {
      request_id: requestId,
      organization_id: org.id,
      requester_user_id: request.user_id,
    },
  });

  return { request, organization: org };
}

/**
 * Reject an organization request (admin action).
 * Stores reason, creates notification.
 */
export async function rejectOrganizationRequest(
  supabase: TypedClient,
  requestId: number,
  adminUserId: string,
  reason: string
) {
  // Fetch the request
  const { data: request, error: fetchError } = await supabase
    .from("organization_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) throw new Error("Request not found");
  if (request.status !== "pending") {
    throw new Error("Request is no longer pending");
  }

  // Update request status
  const { error: updateError } = await supabase
    .from("organization_requests")
    .update({
      status: "rejected" as const,
      admin_notes: reason,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) throw updateError;

  // Create in-app notification
  await supabase.from("notifications").insert({
    user_id: request.user_id,
    type: "org_request_rejected" as const,
    title: "Organization request update",
    body: `Your request for "${request.name}" was not approved.`,
    action_url: "/organizations/create",
  });

  // Audit log
  await supabase.from("audit_log").insert({
    action: "admin.org_request_rejected" as const,
    actor_user_id: adminUserId,
    metadata: {
      request_id: requestId,
      requester_user_id: request.user_id,
      reason,
    },
  });

  return request;
}
```

**Step 2: Re-export from index.ts**

Add to `packages/supabase/src/mutations/index.ts`:

```typescript
export {
  submitOrganizationRequest,
  approveOrganizationRequest,
  rejectOrganizationRequest,
} from "./organization-requests";
```

**Step 3: Commit**

```bash
git add packages/supabase/src/mutations/organization-requests.ts packages/supabase/src/mutations/index.ts
git commit -m "feat: add organization request mutations (submit, approve, reject)"
```

---

## Task 6: PostHog Events + Cache Tags + Labels

**Files:**

- Modify: `packages/posthog/src/events.ts`
- Modify: `apps/web/src/lib/cache.ts`

**Step 1: Add PostHog events**

Add to `packages/posthog/src/events.ts`:

```typescript
// Organization request events
export const ORG_REQUEST_SUBMITTED = "org_request_submitted" as const;
export const ORG_REQUEST_APPROVED = "org_request_approved" as const;
export const ORG_REQUEST_REJECTED = "org_request_rejected" as const;
```

Re-export from `packages/posthog/src/index.ts`.

**Step 2: Add cache tags**

Add to `apps/web/src/lib/cache.ts` inside the `CacheTags` object:

```typescript
/** Tag for admin org requests list */
ORG_REQUESTS_LIST: "org-requests-list",
```

**Step 3: Commit**

```bash
git add packages/posthog/src/events.ts packages/posthog/src/index.ts apps/web/src/lib/cache.ts
git commit -m "feat: add org request PostHog events and cache tags"
```

---

## Task 7: User-Facing Server Action

**Files:**

- Create: `apps/web/src/actions/organization-requests.ts`

**Step 1: Create the server action**

```typescript
// apps/web/src/actions/organization-requests.ts
"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import { submitOrganizationRequestSchema } from "@trainers/validators";
import { submitOrganizationRequest as submitOrganizationRequestMutation } from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Submit an organization request.
 * Validates input, creates the request, revalidates cache.
 */
export async function submitOrganizationRequestAction(data: {
  name: string;
  slug: string;
  description?: string;
}): Promise<ActionResult<{ id: number; slug: string }>> {
  // Validate input
  const parsed = submitOrganizationRequestSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const supabase = await createClient();
    const result = await submitOrganizationRequestMutation(supabase, {
      name: parsed.data.name.trim(),
      slug: parsed.data.slug.trim(),
      description: parsed.data.description?.trim(),
    });

    updateTag(CacheTags.ORG_REQUESTS_LIST);

    return {
      success: true,
      data: { id: result.id, slug: result.slug },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to submit organization request"),
    };
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/src/actions/organization-requests.ts
git commit -m "feat: add submitOrganizationRequestAction server action"
```

---

## Task 8: User-Facing UI — Request Form + Status Components

**Files:**

- Create: `apps/web/src/app/organizations/create/request-organization-form.tsx`
- Create: `apps/web/src/app/organizations/create/request-status.tsx`
- Modify: `apps/web/src/app/organizations/create/page.tsx`

**Step 1: Create the request form component**

Model after the existing `CreateOrganizationForm` in the same directory. Same fields (name, slug, description), same auto-slug behavior, but calls `submitOrganizationRequestAction` and shows different success text.

Key differences from `CreateOrganizationForm`:

- Import `submitOrganizationRequestAction` from `@/actions/organization-requests`
- On success: call `router.refresh()` instead of redirecting (page will re-render showing pending status)
- Toast: "Organization request submitted"
- Button text: "Submit Request" / "Submitting..."
- Use the same `organizationSchema` inline (or import from `@trainers/validators`)

**Step 2: Create the request status component**

Props: `request` (the organization_requests row from `getMyOrganizationRequest`).

Renders different cards based on `request.status`:

- **pending**: Clock icon, "Your request is pending review", shows name/slug/submitted date, helper text "We'll notify you when it's reviewed."
- **rejected + cooldown active**: AlertCircle icon, "Your previous request was not approved", shows rejection reason from `admin_notes`, shows cooldown end date
- **rejected + cooldown expired**: Same rejection info but includes a "Submit a New Request" button that shows the form

Calculate cooldown: `reviewed_at + 7 days > now()`.

Use `Card`, `CardContent`, `Badge` from `@/components/ui/`.

**Step 3: Update the page.tsx**

Replace the current page content. The page is a Server Component:

```typescript
// apps/web/src/app/organizations/create/page.tsx
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { getMyOrganizationRequest } from "@trainers/supabase/queries";
import Link from "next/link";
import { Building2, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequestOrganizationForm } from "./request-organization-form";
import { RequestStatus } from "./request-status";

export default async function CreateOrganizationPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in?redirect=/organizations/create");
  }

  const supabase = await createClient();
  const request = await getMyOrganizationRequest(supabase);

  // Determine if we should show the form or status
  const showForm = !request || (request.status === "rejected" && isCooldownExpired(request.reviewed_at));
  const showStatus = request && !showForm;

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <Link
        href="/organizations"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Organizations
      </Link>

      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Building2 className="h-8 w-8" />
          Request an Organization
        </h1>
        <p className="text-muted-foreground mt-1">
          Submit a request to create your community
        </p>
      </div>

      {showStatus && <RequestStatus request={request} />}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Fill in the details for your organization request
            </CardDescription>
          </CardHeader>
          <CardContent>
            {request?.status === "rejected" && (
              <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                Your previous request for &ldquo;{request.name}&rdquo; was not approved.
                {request.admin_notes && (
                  <> Reason: {request.admin_notes}</>
                )}
              </div>
            )}
            <RequestOrganizationForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function isCooldownExpired(reviewedAt: string | null): boolean {
  if (!reviewedAt) return true;
  const cooldownEnd = new Date(reviewedAt);
  cooldownEnd.setDate(cooldownEnd.getDate() + 7);
  return new Date() >= cooldownEnd;
}
```

**Step 4: Commit**

```bash
git add apps/web/src/app/organizations/create/
git commit -m "feat: replace org creation form with request flow"
```

---

## Task 9: Update Entry Points (Org List + TO Dashboard)

**Files:**

- Modify: `apps/web/src/app/organizations/page.tsx`
- Modify: `apps/web/src/app/to-dashboard/org-selector-client.tsx`

**Step 1: Add "Request an Organization" button to /organizations page**

In `apps/web/src/app/organizations/page.tsx`, add a button in the header section (next to the search). Needs to be conditionally rendered for authenticated users only — use `getUser()` in the server component.

```tsx
import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Inside the component, after getting user:
const user = await getUser();

// In the header JSX, after the search:
{
  user && (
    <Link href="/organizations/create">
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Request an Organization
      </Button>
    </Link>
  );
}
```

**Step 2: Update TO dashboard button text**

In `apps/web/src/app/to-dashboard/org-selector-client.tsx`:

- Line 50: Change `href="/organizations/create"` → keep as is (same URL)
- Line 53: Change `"Create Organization"` → `"Request an Organization"`
- Line 77: Change `href="/organizations/create"` → keep as is
- Line 79: Change `"New Organization"` → `"Request Organization"`

**Step 3: Commit**

```bash
git add apps/web/src/app/organizations/page.tsx apps/web/src/app/to-dashboard/org-selector-client.tsx
git commit -m "feat: update org creation entry points to request flow"
```

---

## Task 10: Admin Page — Org Requests

**Files:**

- Create: `apps/web/src/app/admin/org-requests/page.tsx`
- Create: `apps/web/src/app/admin/org-requests/columns.tsx`
- Create: `apps/web/src/app/admin/org-requests/request-detail-sheet.tsx`
- Create: `apps/web/src/app/admin/org-requests/actions.ts`
- Create: `apps/web/src/app/admin/org-requests/loading.tsx`
- Modify: `apps/web/src/app/admin/admin-nav.tsx`

**Step 1: Add admin nav item**

In `apps/web/src/app/admin/admin-nav.tsx`, add to the `navItems` array:

```typescript
{ href: "/admin/org-requests", label: "Org Requests" },
```

**Step 2: Create columns.tsx**

Follow the exact pattern of `apps/web/src/app/admin/organizations/columns.tsx`.

Row type `OrgRequestRow`:

```typescript
export interface OrgRequestRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  requester: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
    email: string | null;
  } | null;
}
```

Status labels and classes:

```typescript
export const requestStatusLabels: Record<OrgRequestRow["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const requestStatusClasses: Record<OrgRequestRow["status"], string> = {
  pending:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  approved:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  rejected:
    "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
};
```

Columns: Name (with slug), Status (badge), Requester (avatar + username), Submitted (date).

**Step 3: Create actions.ts**

Follow the pattern from `apps/web/src/app/admin/organizations/actions.ts` exactly:

```typescript
"use server";

import { positiveIntSchema, adminReasonSchema } from "@trainers/validators";
import {
  withAdminAction,
  type ActionResult,
} from "@/lib/auth/with-admin-action";
import {
  approveOrganizationRequest,
  rejectOrganizationRequest,
} from "@trainers/supabase";

export async function approveOrgRequestAction(
  requestId: number
): Promise<ActionResult> {
  const parsed = positiveIntSchema.safeParse(requestId);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid input: ${parsed.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await approveOrganizationRequest(supabase, parsed.data, adminUserId);
    return { success: true };
  }, "Failed to approve organization request");
}

export async function rejectOrgRequestAction(
  requestId: number,
  reason: string
): Promise<ActionResult> {
  const parsedId = positiveIntSchema.safeParse(requestId);
  if (!parsedId.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedId.error.issues[0]?.message}`,
    };
  }
  const parsedReason = adminReasonSchema.safeParse(reason);
  if (!parsedReason.success) {
    return {
      success: false,
      error: `Invalid input: ${parsedReason.error.issues[0]?.message}`,
    };
  }

  return withAdminAction(async (supabase, adminUserId) => {
    await rejectOrganizationRequest(
      supabase,
      parsedId.data,
      adminUserId,
      parsedReason.data
    );
    return { success: true };
  }, "Failed to reject organization request");
}
```

**Step 4: Create request-detail-sheet.tsx**

Follow the pattern from `org-detail-sheet.tsx`. Simplified version — only two actions (approve, reject). Show request info, requester profile, approve button, reject textarea + button, confirmation dialog.

**Step 5: Create page.tsx**

Follow the pattern from `/admin/organizations/page.tsx` exactly. Status tabs: All, Pending, Approved, Rejected. Uses `useSupabaseQuery` with `listOrgRequestsAdmin`. TanStack table rendering with row click → detail sheet.

**Step 6: Create loading.tsx**

```typescript
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
```

**Step 7: Commit**

```bash
git add apps/web/src/app/admin/org-requests/ apps/web/src/app/admin/admin-nav.tsx
git commit -m "feat: add admin org requests page with approve/reject flow"
```

---

## Task 11: Notification Bell Icon Mapping

**Files:**

- Modify: `apps/web/src/components/notification-bell.tsx`

**Step 1: Add icon mappings**

Add `Building2` to the lucide-react imports, then add two entries to the `notificationIcons` record:

```typescript
import { Building2 } from "lucide-react"; // add to existing imports

// Add to notificationIcons:
org_request_approved: Building2,
org_request_rejected: Building2,
```

**Step 2: Commit**

```bash
git add apps/web/src/components/notification-bell.tsx
git commit -m "feat: add org request notification icons to bell component"
```

---

## Task 12: Edge Function — Email Notifications

**Files:**

- Create: `packages/supabase/supabase/functions/send-org-request-notification/index.ts`

**Step 1: Create the edge function**

Follow the `send-invite` pattern exactly. JWT auth (site_admin), POST body `{ requestId, action }`, looks up request + user email via service role client, sends HTML email via Resend.

Two email templates:

- **Approval**: "Your organization has been approved!" + link to org page
- **Rejection**: "Organization request update" + rejection reason + cooldown info

Both use the same teal header brand styling as the invite email.

The admin server actions (Task 10) call this edge function via `fetch` after the DB mutation, fire-and-forget.

**Step 2: Commit**

```bash
git add packages/supabase/supabase/functions/send-org-request-notification/
git commit -m "feat: add edge function for org request email notifications"
```

---

## Task 13: Tests

**Files:**

- Create: `packages/validators/src/__tests__/organization-request.test.ts`
- Create: `packages/supabase/src/mutations/__tests__/organization-requests.test.ts`
- Create: `apps/web/src/app/admin/org-requests/__tests__/actions.test.ts`

**Step 1: Validator tests**

Test `submitOrganizationRequestSchema`:

- Valid input passes
- Empty name fails
- Name over 100 chars fails
- Invalid slug format fails (uppercase, special chars)
- Profanity in name/slug/description fails
- Missing slug fails
- Description over 500 chars fails
- Use `it.each` for input/output pairs

**Step 2: Mutation tests**

Test `submitOrganizationRequest`:

- Happy path: creates request with correct fields
- Fails when user has pending request
- Fails during cooldown period
- Fails when slug taken by existing org
- Fails when slug taken by pending request
- Fails when not authenticated

Use `createMockClient` from `@trainers/test-utils/mocks` and `organizationRequestFactory`.

**Step 3: Admin action tests**

Follow the pattern from `apps/web/src/app/admin/organizations/__tests__/actions.test.ts`. Mock `requireAdminWithSudo`, `createServiceRoleClient`, and the mutation functions. Test validation, auth failures, success paths.

**Step 4: Commit**

```bash
git add packages/validators/src/__tests__/organization-request.test.ts packages/supabase/src/mutations/__tests__/organization-requests.test.ts apps/web/src/app/admin/org-requests/__tests__/actions.test.ts
git commit -m "test: add tests for org request validators, mutations, and admin actions"
```

---

## Task 14: Remove Old Direct Create Action

**Files:**

- Modify: `apps/web/src/actions/organizations.ts`

**Step 1: Remove user-facing createOrganization action**

The `createOrganization` export in `apps/web/src/actions/organizations.ts` (lines 40-64) is no longer called by any user-facing code. Remove it. The `createOrganizationMutation` import can also be removed from this file — it's now only called internally by `approveOrganizationRequest` in the supabase mutations package.

Also remove the old `CreateOrganizationForm` component file if it's no longer imported:

- `apps/web/src/app/organizations/create/create-organization-form.tsx` — delete if unused

**Step 2: Verify no other references**

Search for imports of `createOrganization` from `@/actions/organizations` across the codebase to confirm nothing else uses it.

**Step 3: Commit**

```bash
git add apps/web/src/actions/organizations.ts
git rm apps/web/src/app/organizations/create/create-organization-form.tsx  # if unused
git commit -m "refactor: remove user-facing createOrganization action"
```

---

## Task 15: Verify Everything Works

**Step 1: Run tests**

```bash
pnpm test
```

**Step 2: Run type checking**

```bash
pnpm typecheck
```

**Step 3: Run linting**

```bash
pnpm lint
```

**Step 4: Manual smoke test**

```bash
pnpm db:reset && pnpm dev:web+backend
```

Test flows:

1. Log in as `player@trainers.local` → go to `/organizations/create` → see request form
2. Submit a request → see "pending review" status
3. Log in as `admin@trainers.local` → go to `/admin/org-requests` → see the request
4. Approve the request → verify org is created
5. Check notification bell for the player
6. Test rejection flow with a new request

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete organization request flow (TGG-207)"
```
