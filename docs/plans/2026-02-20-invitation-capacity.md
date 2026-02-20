# Invitation Capacity Enforcement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce tournament capacity across all invitation paths — sending, accepting, and direct registration — using atomic SQL RPCs with `SELECT ... FOR UPDATE` locking. Wire orphaned `InviteForm` and `TournamentInvitationsView` components into the TO dashboard and player dashboard.

**Architecture:** Three new/modified PostgreSQL RPCs eliminate all TOCTOU races. TypeScript mutations delegate to RPCs instead of direct table operations. The Registrations tab gains Registered/Invitations sub-tabs; a new `/dashboard/invitations` page surfaces player invitations.

**Tech Stack:** PostgreSQL (SECURITY DEFINER RPCs, `FOR UPDATE`), Supabase client (`rpc()`), React 19 + Next.js 16, shadcn/ui v4 Tabs, TanStack Query / `useSupabaseQuery`.

---

## Task 1: Write the SQL migration

**Files:**
- Create: `packages/supabase/supabase/migrations/20260220000001_atomic_invitation_capacity.sql`

**Step 1: Create the migration file**

```sql
-- =============================================================================
-- Atomic invitation capacity enforcement
-- =============================================================================
-- 1. Modify register_for_tournament_atomic: capacity check now includes pending
--    non-expired invitations so direct registrations can't bypass reserved spots.
-- 2. New send_tournament_invitations_atomic: atomic capacity-aware invite sending.
-- 3. New accept_tournament_invitation_atomic: atomic invite acceptance.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Modify register_for_tournament_atomic
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_for_tournament_atomic(
  p_tournament_id bigint,
  p_alt_id bigint DEFAULT NULL,
  p_team_name text DEFAULT NULL,
  p_in_game_name text DEFAULT NULL,
  p_display_name_option text DEFAULT NULL,
  p_show_country_flag boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_alt record;
  v_tournament record;
  v_existing_registration_id bigint;
  v_current_count integer;
  v_registration_status public.registration_status;
  v_new_registration_id bigint;
  v_is_registration_open boolean;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_alt_id IS NOT NULL THEN
    SELECT a.id, a.user_id INTO v_alt
    FROM public.alts a
    WHERE a.id = p_alt_id AND a.user_id = v_user_id;
  ELSE
    SELECT a.id, a.user_id INTO v_alt
    FROM public.alts a
    WHERE a.user_id = v_user_id
      AND a.id = (SELECT u.main_alt_id FROM public.users u WHERE u.id = v_user_id)
    LIMIT 1;
  END IF;

  IF v_alt IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unable to load your account. Please try signing out and back in, or contact support.'
    );
  END IF;

  SELECT tr.id INTO v_existing_registration_id
  FROM public.tournament_registrations tr
  WHERE tr.tournament_id = p_tournament_id AND tr.alt_id = v_alt.id;

  IF v_existing_registration_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already registered for this tournament');
  END IF;

  SELECT t.id, t.status, t.max_participants, t.allow_late_registration
  INTO v_tournament
  FROM public.tournaments t
  WHERE t.id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  v_is_registration_open := (
    v_tournament.status = 'draft'
    OR v_tournament.status = 'upcoming'
    OR (v_tournament.status = 'active' AND v_tournament.allow_late_registration = true)
  );

  IF NOT v_is_registration_open THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament is not open for registration');
  END IF;

  -- Count registered + pending non-expired invitations (both reserve spots)
  SELECT (
    (SELECT COUNT(*) FROM public.tournament_registrations
     WHERE tournament_id = p_tournament_id AND status = 'registered') +
    (SELECT COUNT(*) FROM public.tournament_invitations
     WHERE tournament_id = p_tournament_id
       AND status = 'pending'
       AND (expires_at IS NULL OR expires_at > now()))
  )::integer INTO v_current_count;

  IF v_tournament.max_participants IS NOT NULL
     AND v_current_count >= v_tournament.max_participants THEN
    v_registration_status := 'waitlist';
  ELSE
    v_registration_status := 'registered';
  END IF;

  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at,
    team_name, in_game_name, display_name_option, show_country_flag
  ) VALUES (
    p_tournament_id, v_alt.id, v_registration_status, now(),
    p_team_name, p_in_game_name, p_display_name_option, p_show_country_flag
  )
  RETURNING id INTO v_new_registration_id;

  RETURN jsonb_build_object(
    'success', true,
    'registrationId', v_new_registration_id,
    'status', v_registration_status
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'register_for_tournament_atomic failed for tournament % alt %: %',
      p_tournament_id, p_alt_id, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Registration failed. Please try again or contact support if the issue persists.'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. New send_tournament_invitations_atomic
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_tournament_invitations_atomic(
  p_tournament_id bigint,
  p_invited_alt_ids bigint[],
  p_invited_by_alt_id bigint,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_tournament record;
  v_occupied integer;
  v_available integer;
  v_new_ids bigint[];
  v_new_count integer;
  v_already_count integer;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock tournament row and fetch details
  SELECT t.id, t.max_participants, t.organization_id
  INTO v_tournament
  FROM public.tournaments t
  WHERE t.id = p_tournament_id
  FOR UPDATE;

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tournament not found');
  END IF;

  -- Check permission using existing has_org_permission function
  IF NOT public.has_org_permission(v_tournament.organization_id, 'tournament.manage') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You don''t have permission to send invitations');
  END IF;

  -- Count occupied spots: registered + pending non-expired
  SELECT (
    (SELECT COUNT(*) FROM public.tournament_registrations
     WHERE tournament_id = p_tournament_id AND status = 'registered') +
    (SELECT COUNT(*) FROM public.tournament_invitations
     WHERE tournament_id = p_tournament_id
       AND status = 'pending'
       AND (expires_at IS NULL OR expires_at > now()))
  )::integer INTO v_occupied;

  -- Filter to only alts not already invited (any status)
  SELECT ARRAY(
    SELECT unnest(p_invited_alt_ids)
    EXCEPT
    SELECT invited_alt_id FROM public.tournament_invitations
    WHERE tournament_id = p_tournament_id
  ) INTO v_new_ids;

  v_new_count := COALESCE(array_length(v_new_ids, 1), 0);
  v_already_count := array_length(p_invited_alt_ids, 1) - v_new_count;

  -- Check capacity only for new invitations
  IF v_tournament.max_participants IS NOT NULL AND
     v_occupied + v_new_count > v_tournament.max_participants THEN
    v_available := GREATEST(v_tournament.max_participants - v_occupied, 0);
    RETURN jsonb_build_object(
      'success', false,
      'error', format(
        'Not enough spots available. %s spot(s) available, %s requested.',
        v_available, v_new_count
      ),
      'availableSpots', v_available
    );
  END IF;

  -- Insert invitations for new alts only
  IF v_new_count > 0 THEN
    INSERT INTO public.tournament_invitations (
      tournament_id, invited_alt_id, invited_by_alt_id,
      status, message, invited_at, expires_at
    )
    SELECT
      p_tournament_id,
      unnest(v_new_ids),
      p_invited_by_alt_id,
      'pending',
      p_message,
      now(),
      now() + interval '14 days';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invitationsSent', v_new_count,
    'alreadyInvited', v_already_count,
    'availableSpots', CASE
      WHEN v_tournament.max_participants IS NULL THEN NULL
      ELSE v_tournament.max_participants - v_occupied - v_new_count
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'send_tournament_invitations_atomic failed for tournament %: %',
      p_tournament_id, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to send invitations. Please try again or contact support.'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. New accept_tournament_invitation_atomic
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_tournament_invitation_atomic(
  p_invitation_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_invitation record;
  v_new_reg_id bigint;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Fetch invitation
  SELECT i.id, i.invited_alt_id, i.tournament_id, i.status, i.expires_at
  INTO v_invitation
  FROM public.tournament_invitations i
  WHERE i.id = p_invitation_id;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  -- Verify invitation belongs to caller's alt
  IF NOT EXISTS (
    SELECT 1 FROM public.alts a
    WHERE a.id = v_invitation.invited_alt_id AND a.user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation is not for you');
  END IF;

  -- Validate state
  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation already responded to');
  END IF;

  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- Lock tournament row (prevents concurrent duplicate accepts for the same invitation)
  PERFORM 1 FROM public.tournaments WHERE id = v_invitation.tournament_id FOR UPDATE;

  -- Accept: update invitation + insert registration atomically
  UPDATE public.tournament_invitations
  SET status = 'accepted', responded_at = now()
  WHERE id = p_invitation_id;

  INSERT INTO public.tournament_registrations (
    tournament_id, alt_id, status, registered_at
  ) VALUES (
    v_invitation.tournament_id, v_invitation.invited_alt_id, 'registered', now()
  )
  RETURNING id INTO v_new_reg_id;

  RETURN jsonb_build_object(
    'success', true,
    'registrationId', v_new_reg_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'accept_tournament_invitation_atomic failed for invitation %: %',
      p_invitation_id, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to accept invitation. Please try again or contact support.'
    );
END;
$$;
```

**Step 2: Verify the file exists**

Run: `ls packages/supabase/supabase/migrations/ | grep atomic`
Expected: `20260220000001_atomic_invitation_capacity.sql`

**Step 3: Commit**

```bash
git add packages/supabase/supabase/migrations/20260220000001_atomic_invitation_capacity.sql
git commit -m "feat(db): atomic invitation capacity enforcement RPCs"
```

---

## Task 2: Apply migration & regenerate types

**Files:**
- Modify: `packages/supabase/src/types.ts` (auto-generated)

**Step 1: Start local Supabase (if not running)**

Run: `pnpm db:start`
Expected: Supabase running on local ports (or already running message)

**Step 2: Apply migration**

Run: `pnpm db:migrate`
Expected: `Applying migration 20260220000001_atomic_invitation_capacity.sql... done`

**Step 3: Regenerate types**

Run: `pnpm generate-types`
Expected: `types.ts` updated, no errors

**Step 4: Verify new RPCs appear in types**

Run: `grep -n "send_tournament_invitations_atomic\|accept_tournament_invitation_atomic" packages/supabase/src/types.ts | head -5`
Expected: Lines showing the new functions in `Database["public"]["Functions"]`

**Step 5: Commit**

```bash
git add packages/supabase/src/types.ts
git commit -m "chore: regenerate types for invitation capacity RPCs"
```

---

## Task 3: Update `sendTournamentInvitations` mutation (test-first)

**Files:**
- Modify: `packages/supabase/src/mutations/tournaments/__tests__/registration.test.ts`
- Modify: `packages/supabase/src/mutations/tournaments/registration.ts`

**Step 1: Replace the `sendTournamentInvitations` describe block in the test file**

Replace the entire `describe("sendTournamentInvitations", ...)` block (lines 763–899) with:

```typescript
describe("sendTournamentInvitations", () => {
  const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
  const tournamentId = 100;
  const profileIds = [20, 21, 22];

  beforeEach(() => {
    (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
  });

  it("should send invitations via atomic RPC and return counts", async () => {
    (mockClient.rpc as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        invitationsSent: 3,
        alreadyInvited: 0,
        availableSpots: 7,
      },
      error: null,
    });

    const result = await sendTournamentInvitations(mockClient, tournamentId, profileIds);

    expect(mockClient.rpc).toHaveBeenCalledWith(
      "send_tournament_invitations_atomic",
      {
        p_tournament_id: tournamentId,
        p_invited_alt_ids: profileIds,
        p_invited_by_alt_id: mockAlt.id,
        p_message: null,
      }
    );
    expect(result).toEqual({ invitationsSent: 3, alreadyInvited: 0, availableSpots: 7 });
  });

  it("should report already-invited players from RPC dedup", async () => {
    (mockClient.rpc as jest.Mock).mockResolvedValue({
      data: { success: true, invitationsSent: 1, alreadyInvited: 2, availableSpots: 9 },
      error: null,
    });

    const result = await sendTournamentInvitations(mockClient, tournamentId, profileIds);

    expect(result.invitationsSent).toBe(1);
    expect(result.alreadyInvited).toBe(2);
  });

  it("should throw error when capacity exceeded", async () => {
    (mockClient.rpc as jest.Mock).mockResolvedValue({
      data: {
        success: false,
        error: "Not enough spots available. 2 spot(s) available, 3 requested.",
        availableSpots: 2,
      },
      error: null,
    });

    await expect(
      sendTournamentInvitations(mockClient, tournamentId, profileIds)
    ).rejects.toThrow("Not enough spots available");
  });

  it("should throw error when caller lacks permission", async () => {
    (mockClient.rpc as jest.Mock).mockResolvedValue({
      data: { success: false, error: "You don't have permission to send invitations" },
      error: null,
    });

    await expect(
      sendTournamentInvitations(mockClient, tournamentId, profileIds)
    ).rejects.toThrow("You don't have permission to send invitations");
  });

  it("should pass optional message to RPC", async () => {
    (mockClient.rpc as jest.Mock).mockResolvedValue({
      data: { success: true, invitationsSent: 1, alreadyInvited: 0, availableSpots: 9 },
      error: null,
    });

    await sendTournamentInvitations(mockClient, tournamentId, [20], "Join us!");

    expect(mockClient.rpc).toHaveBeenCalledWith(
      "send_tournament_invitations_atomic",
      expect.objectContaining({ p_message: "Join us!" })
    );
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm turbo run test --filter=@trainers/supabase -- --testPathPattern=registration`
Expected: `sendTournamentInvitations` tests fail (implementation still uses `from` chain)

**Step 3: Replace `sendTournamentInvitations` in `registration.ts`**

Replace the entire function (lines 343–417):

```typescript
/**
 * Send tournament invitations to players (atomic — capacity-checked)
 */
export async function sendTournamentInvitations(
  supabase: TypedClient,
  tournamentId: number,
  profileIds: number[],
  message?: string
) {
  const alt = await getCurrentAlt(supabase);
  if (!alt) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc(
    "send_tournament_invitations_atomic",
    {
      p_tournament_id: tournamentId,
      p_invited_alt_ids: profileIds,
      p_invited_by_alt_id: alt.id,
      p_message: message ?? null,
    }
  );

  if (error) throw error;
  if (!data.success) throw new Error(data.error as string);

  return {
    invitationsSent: data.invitationsSent as number,
    alreadyInvited: data.alreadyInvited as number,
    availableSpots: data.availableSpots as number | null,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm turbo run test --filter=@trainers/supabase -- --testPathPattern=registration`
Expected: All `sendTournamentInvitations` tests pass

**Step 5: Commit**

```bash
git add packages/supabase/src/mutations/tournaments/registration.ts \
        packages/supabase/src/mutations/tournaments/__tests__/registration.test.ts
git commit -m "feat: sendTournamentInvitations now uses atomic capacity-checked RPC"
```

---

## Task 4: Update `respondToTournamentInvitation` mutation (test-first)

**Files:**
- Modify: `packages/supabase/src/mutations/tournaments/__tests__/registration.test.ts`
- Modify: `packages/supabase/src/mutations/tournaments/registration.ts`

**Step 1: Replace the `respondToTournamentInvitation` describe block in the test file**

Replace the entire `describe("respondToTournamentInvitation", ...)` block (lines 901–1044):

```typescript
describe("respondToTournamentInvitation", () => {
  const mockAlt = { id: 10, username: "test-player", user_id: "user-123" };
  const invitationId = 300;

  beforeEach(() => {
    (getCurrentAlt as jest.Mock).mockResolvedValue(mockAlt);
  });

  describe("accept path (uses atomic RPC)", () => {
    it("should accept invitation via RPC and return registration", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: { success: true, registrationId: 700 },
        error: null,
      });

      const result = await respondToTournamentInvitation(mockClient, invitationId, "accept");

      expect(mockClient.rpc).toHaveBeenCalledWith(
        "accept_tournament_invitation_atomic",
        { p_invitation_id: invitationId }
      );
      expect(result.success).toBe(true);
      expect(result.registration).toBeTruthy();
    });

    it("should throw when RPC reports invitation has expired", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: { success: false, error: "Invitation has expired" },
        error: null,
      });

      await expect(
        respondToTournamentInvitation(mockClient, invitationId, "accept")
      ).rejects.toThrow("Invitation has expired");
    });

    it("should throw when RPC reports invitation already responded to", async () => {
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: { success: false, error: "Invitation already responded to" },
        error: null,
      });

      await expect(
        respondToTournamentInvitation(mockClient, invitationId, "accept")
      ).rejects.toThrow("Invitation already responded to");
    });
  });

  describe("decline path (direct update)", () => {
    it("should decline invitation without calling RPC", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: invitationId,
            invited_alt_id: mockAlt.id,
            tournament_id: 100,
            status: "pending",
            expires_at: "2026-03-05T00:00:00Z",
          },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await respondToTournamentInvitation(mockClient, invitationId, "decline");

      expect(result.success).toBe(true);
      expect(result.registration).toBeNull();
      expect(mockClient.rpc).not.toHaveBeenCalled();
    });

    it("should throw error if invitation not for current user", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: invitationId,
            invited_alt_id: 999,
            tournament_id: 100,
            status: "pending",
            expires_at: "2026-03-05T00:00:00Z",
          },
          error: null,
        }),
      });

      await expect(
        respondToTournamentInvitation(mockClient, invitationId, "decline")
      ).rejects.toThrow("This invitation is not for you");
    });

    it("should throw error if invitation already responded to", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: invitationId,
            invited_alt_id: mockAlt.id,
            tournament_id: 100,
            status: "accepted",
            expires_at: "2026-03-05T00:00:00Z",
          },
          error: null,
        }),
      });

      await expect(
        respondToTournamentInvitation(mockClient, invitationId, "decline")
      ).rejects.toThrow("Invitation has already been responded to");
    });

    it("should throw error if invitation has expired", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: invitationId,
            invited_alt_id: mockAlt.id,
            tournament_id: 100,
            status: "pending",
            expires_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
      });

      await expect(
        respondToTournamentInvitation(mockClient, invitationId, "decline")
      ).rejects.toThrow("Invitation has expired");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm turbo run test --filter=@trainers/supabase -- --testPathPattern=registration`
Expected: New accept-path tests fail (implementation still uses `from` chains)

**Step 3: Replace `respondToTournamentInvitation` in `registration.ts`**

Replace the entire function (lines 419–489):

```typescript
/**
 * Respond to a tournament invitation.
 * Accept uses an atomic RPC; decline uses a direct update.
 */
export async function respondToTournamentInvitation(
  supabase: TypedClient,
  invitationId: number,
  response: "accept" | "decline"
) {
  const alt = await getCurrentAlt(supabase);
  if (!alt) {
    throw new Error(
      "Unable to load your account. Please try signing out and back in, or contact support."
    );
  }

  if (response === "decline") {
    const { data: invitation } = await supabase
      .from("tournament_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (!invitation) throw new Error("Invitation not found");
    if (invitation.invited_alt_id !== alt.id) {
      throw new Error("This invitation is not for you");
    }
    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been responded to");
    }
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      throw new Error("Invitation has expired");
    }

    const { error } = await supabase
      .from("tournament_invitations")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", invitationId);

    if (error) throw error;
    return { success: true, registration: null };
  }

  // Accept: atomic RPC handles ownership check, expiry, and registration insert
  const { data, error } = await supabase.rpc(
    "accept_tournament_invitation_atomic",
    { p_invitation_id: invitationId }
  );

  if (error) throw error;
  if (!data.success) throw new Error(data.error as string);

  return {
    success: true,
    registration: { message: `Registration ID: ${data.registrationId}` },
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm turbo run test --filter=@trainers/supabase -- --testPathPattern=registration`
Expected: All registration tests pass

**Step 5: Commit**

```bash
git add packages/supabase/src/mutations/tournaments/registration.ts \
        packages/supabase/src/mutations/tournaments/__tests__/registration.test.ts
git commit -m "feat: respondToTournamentInvitation accept uses atomic RPC"
```

---

## Task 5: Enhance `TournamentRegistrations` with Invitations sub-tab (test-first)

**Files:**
- Modify: `apps/web/src/components/tournaments/manage/__tests__/tournament-registrations.test.tsx`
- Modify: `apps/web/src/components/tournaments/manage/tournament-registrations.tsx`

**Step 1: Add the failing test**

Open `apps/web/src/components/tournaments/manage/__tests__/tournament-registrations.test.tsx`.

Add these imports near the top (after existing mocks):

```typescript
import {
  getTournamentRegistrations,
  getTournamentInvitationsSent,
} from "@trainers/supabase";
```

Add this mock after the existing `@trainers/supabase` mock:

```typescript
jest.mock("@trainers/supabase", () => ({
  getTournamentRegistrations: jest.fn(),
  getTournamentInvitationsSent: jest.fn(),
}));
```

Add this test describe block at the end of the file (before the closing `}`):

```typescript
describe("TournamentRegistrations — invitations sub-tab", () => {
  const tournament = { id: 1, status: "upcoming", maxParticipants: 10 };

  beforeEach(() => {
    // 6 registered players
    mockGetTournamentRegistrations.mockReturnValue([
      { id: 1, status: "registered", alt: { username: "p1", avatar_url: null }, team_name: null, registered_at: null },
      { id: 2, status: "registered", alt: { username: "p2", avatar_url: null }, team_name: null, registered_at: null },
      { id: 3, status: "registered", alt: { username: "p3", avatar_url: null }, team_name: null, registered_at: null },
      { id: 4, status: "registered", alt: { username: "p4", avatar_url: null }, team_name: null, registered_at: null },
      { id: 5, status: "registered", alt: { username: "p5", avatar_url: null }, team_name: null, registered_at: null },
      { id: 6, status: "registered", alt: { username: "p6", avatar_url: null }, team_name: null, registered_at: null },
    ]);

    // 2 pending non-expired invitations, 1 expired
    (getTournamentInvitationsSent as jest.MockedFunction<() => unknown[]>).mockReturnValue([
      { id: 10, status: "pending", expires_at: "2026-03-05T00:00:00Z", invited_at: null, invitedPlayer: { username: "inv1" }, invitedByAlt: null },
      { id: 11, status: "pending", expires_at: "2026-03-10T00:00:00Z", invited_at: null, invitedPlayer: { username: "inv2" }, invitedByAlt: null },
      { id: 12, status: "pending", expires_at: "2024-01-01T00:00:00Z", invited_at: null, invitedPlayer: { username: "inv3_expired" }, invitedByAlt: null },
    ]);
  });

  it("shows available spots as maxParticipants minus registered minus pending non-expired", () => {
    // 10 max - 6 registered - 2 pending non-expired = 2 available
    render(<TournamentRegistrations tournament={tournament} />);
    expect(screen.getByText(/2 spots? available/i)).toBeInTheDocument();
  });

  it("shows zero available spots when fully booked", () => {
    // Override: 8 registered + 2 pending = 10 = maxParticipants → 0 available
    mockGetTournamentRegistrations.mockReturnValue(
      Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        status: "registered",
        alt: { username: `p${i + 1}`, avatar_url: null },
        team_name: null,
        registered_at: null,
      }))
    );

    render(<TournamentRegistrations tournament={tournament} />);
    expect(screen.getByText(/0 spots? available/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm turbo run test --filter=@trainers/web -- --testPathPattern=tournament-registrations`
Expected: New tests fail — `getTournamentInvitationsSent` not mocked / available spots text not found

**Step 3: Update `TournamentRegistrations` component**

Replace `apps/web/src/components/tournaments/manage/tournament-registrations.tsx` entirely:

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import {
  getTournamentRegistrations,
  getTournamentInvitationsSent,
} from "@trainers/supabase";
import { InviteForm } from "@/components/tournaments/invite/invite-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  Mail,
  Loader2,
  Mail as MailIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  forceCheckInPlayer,
  removePlayerFromTournament,
  bulkForceCheckIn,
  bulkRemovePlayers,
} from "@/actions/tournaments";
import {
  RealtimeStatusBadge,
  type RealtimeStatus,
} from "./realtime-status-badge";

interface TournamentRegistrationsProps {
  tournament: {
    id: number;
    status: string;
    maxParticipants?: number;
  };
}

export function TournamentRegistrations({
  tournament,
}: TournamentRegistrationsProps) {
  const supabase = useSupabase();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [invitationsRefreshKey, setInvitationsRefreshKey] = useState(0);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connected");
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const invRefreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const triggerRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => setRefreshKey((k) => k + 1), 500);
  }, []);

  const triggerInvitationsRefresh = useCallback(() => {
    if (invRefreshTimeoutRef.current) clearTimeout(invRefreshTimeoutRef.current);
    invRefreshTimeoutRef.current = setTimeout(
      () => setInvitationsRefreshKey((k) => k + 1),
      500
    );
  }, []);

  // Realtime: registrations
  useEffect(() => {
    const channel = supabase
      .channel(`registrations-${tournament.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_registrations", filter: `tournament_id=eq.${tournament.id}` },
        () => triggerRefresh()
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (status === "CLOSED") setRealtimeStatus("disconnected");
        else if (err) { console.error("[Realtime] registrations error:", err); setRealtimeStatus("error"); }
      });

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      channel.unsubscribe();
    };
  }, [supabase, tournament.id, triggerRefresh]);

  // Realtime: invitations
  useEffect(() => {
    const channel = supabase
      .channel(`invitations-${tournament.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_invitations", filter: `tournament_id=eq.${tournament.id}` },
        () => { triggerRefresh(); triggerInvitationsRefresh(); }
      )
      .subscribe();

    return () => {
      if (invRefreshTimeoutRef.current) clearTimeout(invRefreshTimeoutRef.current);
      channel.unsubscribe();
    };
  }, [supabase, tournament.id, triggerRefresh, triggerInvitationsRefresh]);

  const { data: registrations, refetch } = useSupabaseQuery(
    (supabase) => getTournamentRegistrations(supabase, tournament.id),
    [tournament.id, refreshKey]
  );

  const { data: invitationsSent, refetch: refetchInvitations } = useSupabaseQuery(
    (supabase) => getTournamentInvitationsSent(supabase, tournament.id),
    [tournament.id, invitationsRefreshKey]
  );

  const now = new Date();
  const registeredCount = registrations?.filter((r) => r.status === "registered").length ?? 0;
  const pendingNonExpiredCount =
    invitationsSent?.filter(
      (inv) =>
        inv.status === "pending" &&
        (!inv.expires_at || new Date(inv.expires_at) > now)
    ).length ?? 0;
  const availableSpots =
    tournament.maxParticipants != null
      ? Math.max(tournament.maxParticipants - registeredCount - pendingNonExpiredCount, 0)
      : null;

  const filteredRegistrations =
    registrations?.filter(
      (reg) =>
        reg.alt?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.team_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleSelection = (registrationId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(registrationId)) newSelected.delete(registrationId);
    else newSelected.add(registrationId);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRegistrations.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredRegistrations.map((r) => r.id)));
  };

  const handleForceCheckIn = async (registrationId: number) => {
    setIsProcessing(true);
    try {
      const result = await forceCheckInPlayer(registrationId);
      if (result.success) { toast.success("Player checked in successfully"); refetch(); }
      else toast.error(result.error || "Failed to check in player");
    } catch { toast.error("An unexpected error occurred"); }
    finally { setIsProcessing(false); }
  };

  const handleRemovePlayer = async (registrationId: number) => {
    if (!confirm("Are you sure you want to remove this player?")) return;
    setIsProcessing(true);
    try {
      const result = await removePlayerFromTournament(registrationId);
      if (result.success) { toast.success("Player removed successfully"); refetch(); }
      else toast.error(result.error || "Failed to remove player");
    } catch { toast.error("An unexpected error occurred"); }
    finally { setIsProcessing(false); }
  };

  const handleBulkForceCheckIn = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const result = await bulkForceCheckIn(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.data.checkedIn} player(s) checked in${result.data.failed > 0 ? `, ${result.data.failed} failed` : ""}`);
        setSelectedIds(new Set());
        refetch();
      } else toast.error(result.error || "Failed to check in players");
    } catch { toast.error("An unexpected error occurred"); }
    finally { setIsProcessing(false); }
  };

  const handleBulkRemove = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to remove ${selectedIds.size} player(s)?`)) return;
    setIsProcessing(true);
    try {
      const result = await bulkRemovePlayers(Array.from(selectedIds));
      if (result.success) {
        toast.success(`${result.data.removed} player(s) removed${result.data.failed > 0 ? `, ${result.data.failed} failed` : ""}`);
        setSelectedIds(new Set());
        refetch();
      } else toast.error(result.error || "Failed to remove players");
    } catch { toast.error("An unexpected error occurred"); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Registrations</h2>
          <p className="text-muted-foreground">
            Manage player registrations and invitations
          </p>
        </div>
        <RealtimeStatusBadge status={realtimeStatus} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registrations?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {registrations?.filter((r) => r.status === "checked_in").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Not Checked In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {registrations?.filter(
                (r) =>
                  r.status === "registered" ||
                  r.status === "confirmed" ||
                  r.status === "pending" ||
                  r.status === "waitlist"
              ).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dropped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {registrations?.filter((r) => r.status === "dropped").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="registered">
        <TabsList>
          <TabsTrigger value="registered">
            Registered ({registrations?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({invitationsSent?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Registered tab */}
        <TabsContent value="registered" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Player Registrations</CardTitle>
                  <CardDescription>
                    {filteredRegistrations.length} of {registrations?.length || 0} registrations
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleBulkForceCheckIn} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                        Force Check-in ({selectedIds.size})
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleBulkRemove} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
                        Remove ({selectedIds.size})
                      </Button>
                    </>
                  )}
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      placeholder="Search players..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64 pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRegistrations.length === 0 ? (
                <div className="py-8 text-center">
                  <UserCheck className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                  <h3 className="mb-2 text-lg font-semibold">No registrations yet</h3>
                  <p className="text-muted-foreground">Players will appear here once they register.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={filteredRegistrations.length > 0 && selectedIds.size === filteredRegistrations.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all registrations"
                        />
                      </TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.map((registration) => (
                      <TableRow key={registration.id}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(registration.id)} onCheckedChange={() => toggleSelection(registration.id)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={registration.alt?.avatar_url ?? undefined} />
                              <AvatarFallback>{registration.alt?.username?.charAt(0) || "?"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{registration.alt?.username || "Unknown Player"}</div>
                              <div className="text-muted-foreground text-sm">@{registration.alt?.username || "unknown"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {registration.team_name || <span className="text-muted-foreground italic">No team name</span>}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={(registration.status ?? "pending") as Status} />
                        </TableCell>
                        <TableCell>{formatDate(registration.registered_at)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleForceCheckIn(registration.id)} disabled={isProcessing || registration.status === "checked_in"}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Force Check-in
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleRemovePlayer(registration.id)} disabled={isProcessing}>
                                <UserX className="mr-2 h-4 w-4" />
                                Remove Player
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations tab */}
        <TabsContent value="invitations" className="mt-4 space-y-6">
          {/* Capacity bar */}
          {tournament.maxParticipants != null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {registeredCount} of {tournament.maxParticipants} spots filled
                  {pendingNonExpiredCount > 0 && ` (${pendingNonExpiredCount} pending invitation${pendingNonExpiredCount !== 1 ? "s" : ""})`}
                  {" · "}
                  <span className="font-medium">{availableSpots} spot{availableSpots !== 1 ? "s" : ""} available</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Invite form */}
          <InviteForm
            tournamentId={tournament.id}
            tournamentName=""
            maxInvitations={availableSpots ?? undefined}
            onSuccess={() => { refetchInvitations(); triggerRefresh(); }}
          />

          {/* Sent invitations table */}
          <Card>
            <CardHeader>
              <CardTitle>Sent Invitations</CardTitle>
              <CardDescription>{invitationsSent?.length ?? 0} invitation(s) sent</CardDescription>
            </CardHeader>
            <CardContent>
              {!invitationsSent || invitationsSent.length === 0 ? (
                <div className="py-8 text-center">
                  <MailIcon className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                  <h3 className="mb-2 text-lg font-semibold">No invitations sent</h3>
                  <p className="text-muted-foreground">Use the form above to invite players.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Invited At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitationsSent.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <span className="font-medium">
                            {inv.invitedPlayer?.username ?? "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={(inv.status ?? "pending") as Status} />
                        </TableCell>
                        <TableCell>{formatDate(inv.expires_at)}</TableCell>
                        <TableCell>{formatDate(inv.invited_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm turbo run test --filter=@trainers/web -- --testPathPattern=tournament-registrations`
Expected: All tests pass including new capacity tests

**Step 5: Commit**

```bash
git add apps/web/src/components/tournaments/manage/tournament-registrations.tsx \
        apps/web/src/components/tournaments/manage/__tests__/tournament-registrations.test.tsx
git commit -m "feat: TournamentRegistrations adds Invitations sub-tab with capacity bar"
```

---

## Task 6: Pass `maxParticipants` from `tournament-manage-client.tsx`

**Files:**
- Modify: `apps/web/src/app/to-dashboard/[orgSlug]/tournaments/[tournamentSlug]/manage/tournament-manage-client.tsx`

**Step 1: Update `tournamentForRegistrations` and `TournamentRegistrations` usage**

In `tournament-manage-client.tsx`, find `tournamentForRegistrations` (around line 218):

```typescript
// Before:
const tournamentForRegistrations = {
  id: tournament.id,
  status: tournament.status ?? "draft",
  rental_team_photos_enabled: tournament.rental_team_photos_enabled,
};
```

```typescript
// After:
const tournamentForRegistrations = {
  id: tournament.id,
  status: tournament.status ?? "draft",
  rental_team_photos_enabled: tournament.rental_team_photos_enabled,
  maxParticipants: tournament.max_participants ?? undefined,
};
```

**Step 2: Run typecheck**

Run: `pnpm turbo run typecheck --filter=@trainers/web`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/src/app/to-dashboard/[orgSlug]/tournaments/[tournamentSlug]/manage/tournament-manage-client.tsx
git commit -m "feat: pass maxParticipants to TournamentRegistrations"
```

---

## Task 7: Add pending invitation count to dashboard layout and nav

**Files:**
- Modify: `apps/web/src/app/dashboard/layout.tsx`
- Modify: `apps/web/src/app/dashboard/dashboard-nav.tsx`

**Step 1: Update `dashboard-nav.tsx`**

Replace the file:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const allTabs = [
  { href: "/dashboard/overview", label: "Overview" },
  { href: "/dashboard/alts", label: "Alts" },
  { href: "/dashboard/stats", label: "Stats", requiresFlag: true },
  { href: "/dashboard/invitations", label: "Invitations" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav({
  showStats = false,
  pendingInvitationsCount = 0,
}: {
  showStats?: boolean;
  pendingInvitationsCount?: number;
}) {
  const pathname = usePathname();

  const tabs = allTabs.filter((tab) => !tab.requiresFlag || showStats);

  return (
    <nav className="mb-6 border-b bg-transparent p-0">
      <div className="flex gap-0">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const isPendingInvitations =
            tab.href === "/dashboard/invitations" && pendingInvitationsCount > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              {tab.label}
              {isPendingInvitations && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
                  {pendingInvitationsCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Step 2: Update `dashboard/layout.tsx`**

Replace the file:

```typescript
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getTournamentInvitationsReceived } from "@trainers/supabase";
import { checkFeatureAccess } from "@/lib/feature-flags/check-flag";
import { PageContainer } from "@/components/layout/page-container";
import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in?redirect=/dashboard");
  }

  const supabase = await createClient();
  const [showStats, invitations] = await Promise.all([
    checkFeatureAccess("dashboard_stats", user.id),
    getTournamentInvitationsReceived(supabase),
  ]);

  const now = new Date();
  const pendingInvitationsCount =
    invitations?.filter(
      (inv) =>
        inv.status === "pending" &&
        (!inv.expires_at || new Date(inv.expires_at) > now)
    ).length ?? 0;

  return (
    <PageContainer variant="wide">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your account, profiles, and tournament activity
          </p>
        </div>
      </div>
      <DashboardNav showStats={showStats} pendingInvitationsCount={pendingInvitationsCount} />
      {children}
    </PageContainer>
  );
}
```

**Step 3: Run typecheck**

Run: `pnpm turbo run typecheck --filter=@trainers/web`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/dashboard-nav.tsx \
        apps/web/src/app/dashboard/layout.tsx
git commit -m "feat: dashboard nav shows Invitations link with pending count badge"
```

---

## Task 8: Create `/dashboard/invitations` page

**Files:**
- Create: `apps/web/src/app/dashboard/invitations/page.tsx`

**Step 1: Create the page**

```typescript
import type { Metadata } from "next";
import { TournamentInvitationsView } from "@/components/tournaments/tournament-invitations-view";

export const metadata: Metadata = {
  title: "Invitations",
};

export default function InvitationsPage() {
  return <TournamentInvitationsView />;
}
```

**Step 2: Run typecheck**

Run: `pnpm turbo run typecheck --filter=@trainers/web`
Expected: No errors

**Step 3: Run all tests**

Run: `pnpm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/invitations/page.tsx
git commit -m "feat: add /dashboard/invitations page for player invitation management"
```

---

## Task 9: Final verification

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass, no failures

**Step 2: Run typecheck across all packages**

Run: `pnpm typecheck`
Expected: No TypeScript errors

**Step 3: Run linter**

Run: `pnpm lint`
Expected: No lint errors

**Step 4: Manual smoke test (if Supabase is running)**

- Navigate to a tournament manage page → Registrations tab → Invitations sub-tab
  - Capacity bar appears if `maxParticipants` is set
  - `InviteForm` is visible
  - Sent invitations table is visible
- Navigate to `/dashboard/invitations`
  - `TournamentInvitationsView` renders
  - Nav shows "Invitations" with badge if pending invitations exist
