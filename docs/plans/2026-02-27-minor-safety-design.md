# Minor Safety Compliance — Design Document

**Date:** 2026-02-27
**Status:** Draft — awaiting approval
**Linear Tickets:** TGG-235, TGG-237
**Approach:** All-or-nothing (single feature branch)
**Timeline:** Must be complete before public launch. Private beta continues as-is.

---

## Table of Contents

1. [Scoping Decisions](#1-scoping-decisions)
2. [Data Model Changes](#2-data-model-changes)
3. [Age Gate (Signup Flow)](#3-age-gate-signup-flow)
4. [Country-Aware Consent Age Logic](#4-country-aware-consent-age-logic)
5. [Parental Consent Flow](#5-parental-consent-flow)
6. [Age-Tiered Feature Gating](#6-age-tiered-feature-gating)
7. [PostHog Changes](#7-posthog-changes)
8. [AT Protocol Restrictions](#8-at-protocol-restrictions)
9. [Anti-Circumvention](#9-anti-circumvention)
10. [Right to Erasure](#10-right-to-erasure)
11. [Data Retention Policy](#11-data-retention-policy)
12. [DPIA Document](#12-dpia-document)
13. [Edge Function Changes](#13-edge-function-changes)
14. [Validators (New Schemas)](#14-validators-new-schemas)
15. [Testing Strategy](#15-testing-strategy)
16. [Out of Scope](#16-out-of-scope)

---

## 1. Scoping Decisions

Decisions made during brainstorming:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Timeline** | Before public launch | Private beta has invited adults; compliance needed before opening up |
| **Jurisdictions** | Global (US, EU, UK, AU, BR, KR, JP, CA) | Pokemon is a global community; competitive players come from all these regions |
| **AT Protocol for minors** | Disabled at launch | Federation = third-party disclosure under COPPA 2025; requires enhanced consent method we're deferring |
| **Enhanced consent** | Deferred | Email-plus covers internal-only data at launch. Stronger method (credit card, KBA, etc.) built later for AT Protocol opt-in |
| **Consent method (launch)** | Email-plus | Low cost, high conversion, FTC-approved for internal data use |
| **Legal pages (privacy/terms)** | Out of scope | Content from attorney; routes can be built separately |
| **DPIA** | In scope | Draft document based on ICO gaming template |
| **Implementation approach** | All-or-nothing | Single feature branch with complete compliance system |

---

## 2. Data Model Changes

### 2.1 New Enum Types

```sql
CREATE TYPE consent_status AS ENUM (
  'pending',    -- Consent email sent, awaiting parent action
  'verified',   -- Parent clicked verify link + confirmatory sent
  'revoked',    -- Parent revoked consent
  'expired'     -- Token expired without verification
);

CREATE TYPE parental_consent_status AS ENUM (
  'not_required',  -- User is above consent age
  'pending',       -- Awaiting parental consent
  'verified',      -- Consent obtained
  'revoked'        -- Consent revoked
);
```

### 2.2 New Table: `parental_consents`

Tracks consent status for minor users.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `auth.users`, NOT NULL | The minor's user ID |
| `parent_email` | `text` | NOT NULL | Parent/guardian email |
| `consent_status` | `consent_status` | NOT NULL, DEFAULT `'pending'` | |
| `verification_token` | `text` | UNIQUE, NOT NULL | Token sent in consent email |
| `token_expires_at` | `timestamptz` | NOT NULL | 48 hours from creation |
| `consent_granted_at` | `timestamptz` | | When parent verified |
| `consent_revoked_at` | `timestamptz` | | If parent revokes |
| `consent_method` | `text` | NOT NULL, DEFAULT `'email_plus'` | For future expansion |
| `ip_address` | `inet` | | Parent's IP at consent time |
| `data_practices_version` | `text` | NOT NULL | Version of privacy notice shown to parent |
| `metadata` | `jsonb` | DEFAULT `'{}'` | Future-proofing |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**Indexes:**
- `idx_parental_consents_user_id` ON `user_id`
- `idx_parental_consents_token` ON `verification_token` (UNIQUE)
- `idx_parental_consents_parent_email` ON `parent_email`

**RLS:**
- Minor can SELECT own records
- No client INSERT/UPDATE/DELETE — server-only via edge functions
- Parent access via verification token (edge function, not RLS)

### 2.3 New Table: `age_gate_blocks`

Server-side anti-circumvention tracking. Supplements client-side cookie/localStorage.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `fingerprint_hash` | `text` | NOT NULL | SHA-256 of browser fingerprint components |
| `blocked_at` | `timestamptz` | DEFAULT `now()` | |
| `expires_at` | `timestamptz` | NOT NULL | 30 days from creation |

**Indexes:**
- `idx_age_gate_blocks_fingerprint` ON `fingerprint_hash`
- `idx_age_gate_blocks_expires` ON `expires_at` (for cleanup)

**RLS:**
- No client access — server-only
- Periodic cleanup job deletes expired rows

### 2.4 Modifications to `users` Table

Add the following columns:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `requires_parental_consent` | `boolean` | `false` | Computed during signup based on DOB + country |
| `parental_consent_status` | `parental_consent_status` | `'not_required'` | Denormalized from `parental_consents` for fast access in RLS policies and queries |
| `consent_country` | `text` | | 2-letter ISO code used to determine consent age |

**Why denormalize `parental_consent_status`?** RLS policies and frequent queries need to check consent status. Joining to `parental_consents` on every query is expensive. This column is updated by edge functions when consent status changes.

### 2.5 Migration Strategy

Single migration file: `YYYYMMDDHHMMSS_add_minor_safety.sql`

- All operations idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`)
- Existing users get `requires_parental_consent = false` and `parental_consent_status = 'not_required'` (beta users are adults)
- No data migration needed for existing users

---

## 3. Age Gate (Signup Flow)

### 3.1 Current State

The signup form at `apps/web/src/app/(auth-pages)/sign-up/page.tsx` collects username, email, password, confirmPassword. The backend accepts `birthDate` and `country` as optional metadata but the **UI does not ask for them**.

### 3.2 Required Changes

**Make DOB and country required fields in the signup form:**

1. Add a **neutral date-of-birth field** — three separate dropdowns (month, day, year) with no pre-selected values
2. Add a **country dropdown** — 2-letter ISO codes, no pre-selected value
3. No text, labels, or hints that indicate what age is required
4. DOB field should appear naturally among other fields, not as a separate "age verification" step

**Signup form field order:**
1. Username
2. Email
3. Password
4. Confirm Password
5. Date of Birth (Month / Day / Year dropdowns)
6. Country

### 3.3 Age Calculation and Routing

After DOB + country submission, calculate age and determine the consent age threshold for the user's country (see Section 4). Route the user:

```
DOB + Country submitted
        │
        ├─ Age < consent_age(country)
        │       │
        │       ▼
        │   Parental Consent Flow (Section 5)
        │   Account created in "pending consent" state
        │   AT Protocol account NOT created
        │
        ├─ Age >= consent_age(country) AND Age < 18
        │       │
        │       ▼
        │   Standard signup with age-tiered restrictions
        │   High-privacy defaults applied
        │   AT Protocol account NOT created (under 18 at launch)
        │
        └─ Age >= 18
                │
                ▼
            Standard signup (current flow)
            AT Protocol account created as today
```

### 3.4 OAuth Signup Considerations

OAuth providers (Google, X, Discord, GitHub, Bluesky) currently bypass the signup form entirely. After OAuth callback, we need to:

1. Check if the user has a `birth_date` and `country` set
2. If not, redirect to a **profile completion page** that collects DOB + country before allowing platform access
3. Apply the same age routing logic

This is a new intermediate page: `/complete-profile` — shown after OAuth signup if DOB or country is missing.

### 3.5 Existing Users (Beta)

Existing beta users who don't have `birth_date` set will need to provide it. On next login:

1. Check if `birth_date` is null
2. If null, redirect to `/complete-profile`
3. They provide DOB + country
4. Route through the same age logic
5. Since beta users are invited adults, they'll land in the standard flow

---

## 4. Country-Aware Consent Age Logic

### 4.1 Consent Age Map

A utility function in `packages/utils/` that returns the consent age for a given country code:

```typescript
// packages/utils/src/consent-age.ts

const CONSENT_AGES: Record<string, number> = {
  // COPPA
  US: 13,

  // EU — GDPR Art. 8
  AT: 14, // Austria
  BE: 13, // Belgium
  BG: 14, // Bulgaria
  HR: 16, // Croatia
  CY: 14, // Cyprus
  CZ: 15, // Czech Republic
  DK: 13, // Denmark
  EE: 13, // Estonia
  FI: 13, // Finland
  FR: 15, // France
  DE: 16, // Germany
  GR: 15, // Greece
  HU: 16, // Hungary
  IE: 16, // Ireland
  IT: 14, // Italy
  LV: 13, // Latvia
  LT: 14, // Lithuania
  LU: 16, // Luxembourg
  MT: 13, // Malta
  NL: 16, // Netherlands
  PL: 16, // Poland
  PT: 13, // Portugal
  RO: 16, // Romania
  SK: 16, // Slovakia
  SI: 16, // Slovenia
  ES: 14, // Spain
  SE: 13, // Sweden

  // UK
  GB: 13,

  // Other jurisdictions
  AU: 16, // Australia (social media age)
  BR: 18, // Brazil (strictest — all minors)
  KR: 14, // South Korea
  JP: 16, // Japan (de facto, aligning with global best practice)
  CA: 13, // Canada (federal)
};

const DEFAULT_CONSENT_AGE = 16; // Safe default for unlisted countries

export function getConsentAge(countryCode: string): number {
  return CONSENT_AGES[countryCode.toUpperCase()] ?? DEFAULT_CONSENT_AGE;
}

export function requiresParentalConsent(
  birthDate: Date,
  countryCode: string
): boolean {
  const age = calculateAge(birthDate);
  return age < getConsentAge(countryCode);
}

export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
```

### 4.2 Age Tier Determination

For feature gating, determine the user's tier:

```typescript
export type AgeTier = "child" | "teen" | "adult";

export function getAgeTier(birthDate: Date, countryCode: string): AgeTier {
  const age = calculateAge(birthDate);
  const consentAge = getConsentAge(countryCode);

  if (age < consentAge) return "child";   // Requires parental consent
  if (age < 18) return "teen";            // Above consent age but under 18
  return "adult";                          // 18+
}
```

**Note:** The three-tier model (`child` / `teen` / `adult`) is simpler than the four-tier model initially proposed. The `child` tier boundary is country-specific, covering the range of consent ages (13-18). `teen` covers consent-age to 17. `adult` is 18+.

### 4.3 Where This Logic Lives

- `packages/utils/src/consent-age.ts` — pure functions, no framework imports
- Usable by web, mobile, and edge functions
- Exported from `packages/utils/src/index.ts`

---

## 5. Parental Consent Flow

### 5.1 Overview

When a user is identified as under the consent age for their country, they enter the parental consent flow. The account is created in a restricted "pending consent" state.

### 5.2 Flow

```
Minor enters DOB + Country during signup
        │
        ▼
Age < consent_age(country) detected
        │
        ▼
┌──────────────────────────────────────┐
│  "To create your account, we need    │
│   permission from a parent or        │
│   guardian."                          │
│                                      │
│  Parent/Guardian Email:              │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  (Brief explanation of what data     │
│   we collect and why)                │
│                                      │
│        [ Send Permission Request ]   │
└──────────────────────────────────────┘
        │
        ▼
Account created with:
  - parental_consent_status = 'pending'
  - requires_parental_consent = true
  - AT Protocol account NOT created
  - PostHog NOT loaded
  - All features restricted
        │
        ▼
Email sent to parent with:
  1. Platform name and description
  2. What data is collected (username, email, DOB, country, tournament data)
  3. How data is used (tournament management, account administration)
  4. Statement that data is NOT shared with third parties
  5. Consent link (with verification_token)
  6. 48-hour expiry notice
        │
        ▼
Parent clicks consent link → /consent/verify?token=xxx
        │
        ├─ Token valid + not expired
        │       │
        │       ▼
        │   Consent recorded:
        │     - consent_status = 'verified'
        │     - consent_granted_at = now()
        │     - user.parental_consent_status = 'verified'
        │   Confirmatory email sent to parent
        │   Minor's account activated with age-tiered restrictions
        │
        └─ Token invalid or expired
                │
                ▼
            Error page with option to request new consent email
```

### 5.3 Pending Consent State

While consent is pending, the minor user can:
- ✅ Log in
- ✅ See a "waiting for permission" status page
- ✅ Resend consent email (rate-limited)
- ❌ Cannot access any platform features
- ❌ Cannot participate in tournaments
- ❌ Cannot view other users' profiles
- ❌ No PostHog tracking

### 5.4 Email-Plus Confirmatory Step

The "email-plus" method requires a **confirmatory follow-up** after initial consent:

1. Parent clicks consent link → consent recorded
2. System sends a **second email** confirming consent was received
3. This second email includes:
   - Confirmation that consent was granted
   - Instructions for revoking consent
   - Contact information for questions
   - Reminder that this only covers internal data use

### 5.5 Consent Revocation

Parents can revoke consent at any time:

1. Every consent confirmation email includes a revocation link
2. Clicking it → `/consent/revoke?token=xxx`
3. Sets `consent_status = 'revoked'`, `consent_revoked_at = now()`
4. Sets `user.parental_consent_status = 'revoked'`
5. Account returns to restricted state
6. Data can be deleted upon request (see Section 10)

### 5.6 New Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/complete-profile` | Page | Collect DOB + country for OAuth users and existing beta users |
| `/consent/pending` | Page | "Waiting for permission" status page for minors |
| `/consent/verify` | API/Page | Parent clicks to verify consent |
| `/consent/revoke` | API/Page | Parent clicks to revoke consent |
| `/consent/resend` | API | Resend consent email (rate-limited) |

### 5.7 New Edge Functions

| Function | Purpose |
|----------|---------|
| `consent-verify` | Validates token, updates consent status, sends confirmatory email |
| `consent-revoke` | Validates revocation, updates status |
| `consent-resend` | Rate-limited resend of consent email |

---

## 6. Age-Tiered Feature Gating

### 6.1 Feature Matrix

| Feature | `child` (under consent age, consent verified) | `teen` (consent age to 17) | `adult` (18+) |
|---------|:------:|:------:|:------:|
| Account creation | ✅ (with parental consent) | ✅ | ✅ |
| Tournament browsing | ✅ | ✅ | ✅ |
| Tournament participation | ✅ | ✅ | ✅ |
| Tournament results (public) | ✅ (username only) | ✅ | ✅ |
| Profile visibility | 🔒 Private only | 🔒 Private by default (configurable) | Configurable |
| Avatar | 🖼️ Preset options only | 🖼️ Preset options only | Full upload |
| Bio/about text | ❌ Disabled | ✅ Limited (280 chars) | ✅ Full |
| Social links | ❌ Disabled | ⚠️ Display only (no clickable links for youngest teens) | ✅ Full |
| Chat/messaging | ❌ Disabled | ❌ Disabled by default | ✅ Enabled by default |
| Bluesky/AT Protocol | ❌ Disabled | ❌ Disabled (launch) | ✅ Full |
| DID/Handle creation | ❌ Disabled | ❌ Disabled (launch) | ✅ Auto-created |
| PostHog analytics | ❌ Disabled | ⚠️ Anonymous cookieless only | ✅ With consent |
| Public in search engines | ❌ Disabled | ❌ Disabled by default | Configurable |
| Prize acceptance | ⚠️ With parental consent + guardian payment | ✅ (check jurisdiction) | ✅ |

### 6.2 Implementation Pattern

A server-side utility that checks permissions based on user age tier:

```typescript
// packages/utils/src/age-permissions.ts

export type AgeFeature =
  | "tournament_participation"
  | "profile_public"
  | "avatar_upload"
  | "bio_text"
  | "social_links"
  | "chat_messaging"
  | "at_protocol"
  | "posthog_tracking"
  | "search_engine_index";

type FeatureAccess = "enabled" | "disabled" | "opt_in" | "restricted";

const FEATURE_MATRIX: Record<AgeTier, Record<AgeFeature, FeatureAccess>> = {
  child: {
    tournament_participation: "enabled",
    profile_public: "disabled",
    avatar_upload: "disabled",
    bio_text: "disabled",
    social_links: "disabled",
    chat_messaging: "disabled",
    at_protocol: "disabled",
    posthog_tracking: "disabled",
    search_engine_index: "disabled",
  },
  teen: {
    tournament_participation: "enabled",
    profile_public: "opt_in",
    avatar_upload: "disabled",
    bio_text: "restricted",
    social_links: "restricted",
    chat_messaging: "opt_in",
    at_protocol: "disabled",
    posthog_tracking: "restricted",
    search_engine_index: "opt_in",
  },
  adult: {
    tournament_participation: "enabled",
    profile_public: "opt_in",
    avatar_upload: "enabled",
    bio_text: "enabled",
    social_links: "enabled",
    chat_messaging: "enabled",
    at_protocol: "enabled",
    posthog_tracking: "opt_in",
    search_engine_index: "opt_in",
  },
};

export function getFeatureAccess(
  tier: AgeTier,
  feature: AgeFeature
): FeatureAccess {
  return FEATURE_MATRIX[tier][feature];
}

export function isFeatureEnabled(
  tier: AgeTier,
  feature: AgeFeature
): boolean {
  return FEATURE_MATRIX[tier][feature] === "enabled";
}
```

### 6.3 Where Feature Gating Is Enforced

Feature gating must be enforced at **multiple levels** — not just the UI:

1. **UI layer** (React components): Hide/disable features based on age tier. Use a React context provider that exposes the user's age tier and a `canAccess(feature)` helper.

2. **Server Actions**: Validate age tier before performing actions. A user changing their client-side code should not bypass restrictions.

3. **RLS policies**: Where applicable, restrict data visibility based on `parental_consent_status` and age tier.

4. **Edge functions**: Check age tier in relevant edge functions (e.g., signup, consent verification).

### 6.4 React Context: `AgeGateProvider`

A context provider in `apps/web/src/components/auth/` that:

1. Reads the current user's `birth_date`, `consent_country`, `parental_consent_status`
2. Calculates age tier
3. Provides `canAccess(feature: AgeFeature): boolean` to child components
4. Provides `ageTier: AgeTier` directly for conditional rendering

---

## 7. PostHog Changes

### 7.1 Current State

PostHog is already **opted out by default** (`opt_out_capturing_by_default: true`). This is a great foundation.

### 7.2 Required Changes

| User Type | PostHog Behavior |
|-----------|-----------------|
| `child` (under consent age) | **Do not initialize PostHog at all.** Don't load the script. Even cookieless mode is risky under COPPA. |
| `teen` (consent age to 17) | Initialize in **anonymous cookieless mode only.** No persistent identifiers, no session recording. |
| `adult` (18+) | Current behavior — opt-out by default, user consents via banner. |
| Unauthenticated visitor | Do not initialize until cookie consent is given. Current behavior is already correct (opted out by default). |

### 7.3 Implementation

Modify PostHog initialization in `apps/web/src/lib/posthog/client.ts` to accept an age tier parameter:

```typescript
export function initializePostHog(ageTier: AgeTier | null) {
  if (ageTier === "child") {
    // Do not initialize PostHog at all
    return;
  }

  if (ageTier === "teen") {
    posthog.init(key, {
      persistence: "memory",           // No cookies, no localStorage
      opt_out_capturing_by_default: true,
      capture_pageview: false,
      autocapture: false,              // No autocapture for teens
      disable_session_recording: true, // No session recording
    });
    return;
  }

  // Adult or unauthenticated — current behavior
  posthog.init(key, {
    persistence: "localStorage+cookie",
    opt_out_capturing_by_default: true,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: false,
  });
}
```

### 7.4 PostHog Event Changes

Add age tier as a property on events where it's relevant (but never for `child` tier since PostHog won't be initialized):

```typescript
// Do NOT include age_tier for child users — PostHog shouldn't be running
posthog.capture(EVENT_NAME, {
  age_tier: ageTier, // "teen" or "adult" only
  // ... other properties
});
```

---

## 8. AT Protocol Restrictions

### 8.1 Current State

The signup edge function automatically creates a PDS account for every user, storing the `did`, `pds_handle`, and `pds_status` on the user record.

### 8.2 Required Changes

**At launch, AT Protocol is disabled for all users under 18:**

1. **Signup edge function**: Skip PDS account creation if `age < 18`
   - Set `pds_status = 'age_restricted'` (new enum value)
   - Leave `did` and `pds_handle` as null

2. **OAuth Bluesky signup**: Still allowed — authenticates with existing Bluesky account, but the trainers.gg PDS account is not created for minors

3. **UI**: Hide all Bluesky/AT Protocol features for users with `pds_status = 'age_restricted'`

4. **Future**: When enhanced consent is built, minors with parental consent can opt into AT Protocol

### 8.3 Migration

Add `'age_restricted'` to the `pds_status` enum:

```sql
ALTER TYPE pds_status ADD VALUE IF NOT EXISTS 'age_restricted';
```

---

## 9. Anti-Circumvention

### 9.1 Client-Side

When a user enters a DOB that makes them under the consent age:

1. Set `localStorage` key: `tgg_age_gate = { blocked: true, expires: <30 days from now> }`
2. Set a cookie: `tgg_age_gate=blocked; Max-Age=2592000; Path=/; SameSite=Strict`
3. On the signup page, check for this flag before showing the form
4. If flag exists, show a message: "To create an account, ask a parent or guardian for help" with a link to the parental consent flow

### 9.2 Server-Side

In addition to client-side flags:

1. Compute a fingerprint hash from: `User-Agent + Accept-Language + screen resolution (from form hidden field)`
2. Store hash in `age_gate_blocks` table with 30-day expiry
3. On signup page load, send the fingerprint hash to the server to check for blocks
4. This prevents circumvention by clearing cookies/localStorage

### 9.3 What NOT to Do

- Do NOT use aggressive browser fingerprinting (canvas, WebGL, fonts) — this creates its own privacy issues
- Do NOT store raw fingerprint data — only the hash
- Do NOT make the system "unbeatable" — the FTC accepts reasonable good-faith efforts
- Do NOT show error messages that reveal the age threshold

---

## 10. Right to Erasure

### 10.1 Requirements

GDPR Art. 17 requires full deletion of all data, and this is "particularly important" for data collected during childhood.

### 10.2 What Must Be Deleted

When a user (or parent on behalf of a minor) requests deletion:

| Data Category | Location | Deletion Method |
|---------------|----------|----------------|
| User account | `auth.users` | Supabase Auth admin API |
| User profile | `users` table | CASCADE from auth deletion or explicit DELETE |
| Alts/profiles | `alts` table | CASCADE or explicit DELETE |
| Tournament registrations | `tournament_registrations` | Anonymize (replace user references with "deleted user") |
| Match results | `match_results` | Anonymize |
| Team sheets | `team_sheets` | DELETE |
| Parental consent records | `parental_consents` | DELETE |
| PostHog data | PostHog | Use PostHog API to delete user data |
| AT Protocol data | PDS | Delete PDS account via admin API (if created) |
| Age gate blocks | `age_gate_blocks` | DELETE matching records |

### 10.3 Anonymization vs Deletion

For tournament results and match history, full deletion would break tournament integrity. Instead:

- Replace user references with a generic "Deleted User" placeholder
- Remove all personally identifiable data (username, email, etc.)
- Retain the competitive data (wins, losses, team compositions) without attribution

### 10.4 Implementation

A new edge function `account-delete` that:

1. Validates the request (user requesting own deletion, or parent with valid consent token)
2. Anonymizes tournament/match records
3. Deletes all personal data
4. Calls PostHog API to delete user events
5. Deletes PDS account if exists
6. Deletes Supabase Auth account
7. Returns confirmation

### 10.5 UI

Add to `/dashboard/settings/`:

- "Delete my account" section with clear explanation
- Requires password re-entry or sudo mode
- For minor accounts: parent can request deletion via a link in consent emails

---

## 11. Data Retention Policy

### 11.1 Retention Schedule

| Data Category | Retention Period | Justification |
|---------------|:----------------:|--------------|
| User account data | Until deletion requested | Core service functionality |
| Parental consent records | 3 years after consent or revocation | Legal compliance — proof of consent |
| Age gate blocks | 30 days | Anti-circumvention; no longer needed after expiry |
| Tournament results | Indefinite (anonymized after account deletion) | Competition integrity |
| Team sheets | Until tournament ends + 90 days | Dispute resolution |
| PostHog events | 12 months (configurable) | Analytics; PostHog handles this via project settings |
| IP addresses (anti-abuse) | 90 days | Fraud prevention; COPPA internal operations exception |
| Verification tokens | 48 hours (auto-expire) | Single-use consent flow |

### 11.2 Automated Cleanup

A scheduled edge function or cron job that:

1. Expires pending consent tokens older than 48 hours
2. Deletes age gate blocks older than 30 days
3. Deletes team sheets 90 days after tournament completion
4. Logs cleanup actions for audit trail

---

## 12. DPIA Document

### 12.1 Scope

A Data Protection Impact Assessment based on the ICO gaming template, covering:

1. Description of trainers.gg processing operations
2. Assessment of necessity and proportionality
3. Risks to children's rights and freedoms
4. Measures to address those risks
5. Consideration of developmental needs by age group

### 12.2 Deliverable

A document at `docs/minor-safety/dpia.md` structured per ICO guidance:

- Part 1: Identify the need for a DPIA
- Part 2: Describe the processing
- Part 3: Consultation process
- Part 4: Assess necessity and proportionality
- Part 5: Identify and assess risks
- Part 6: Identify measures to reduce risk
- Part 7: Sign off and record outcomes

### 12.3 Timing

The DPIA should be completed as part of this feature branch, before the minor safety system goes live.

---

## 13. Edge Function Changes

### 13.1 Modified: `signup`

Current: Creates user + PDS account
Changes:

1. `birthDate` and `country` become **required** fields (not optional)
2. After account creation, calculate age tier
3. If `child` tier:
   - Set `requires_parental_consent = true`
   - Set `parental_consent_status = 'pending'`
   - Do NOT create PDS account (`pds_status = 'age_restricted'`)
   - Do NOT fire PostHog event (no tracking for children)
4. If `teen` tier:
   - Set `requires_parental_consent = false`
   - Do NOT create PDS account (`pds_status = 'age_restricted'`)
   - Fire PostHog event without persistent identifiers
5. If `adult` tier:
   - Current behavior (create PDS account, fire events)

### 13.2 New: `consent-send`

Sends (or resends) parental consent email.

1. Validate user is in `pending` consent state
2. Rate limit: max 3 emails per 24 hours per user
3. Generate verification token (crypto random, 48-hour expiry)
4. Create/update `parental_consents` record
5. Send email to parent via Supabase Auth email or Resend
6. Return success

### 13.3 New: `consent-verify`

Validates parental consent.

1. Look up token in `parental_consents`
2. Validate: not expired, status is `pending`
3. Update: `consent_status = 'verified'`, `consent_granted_at = now()`, record IP
4. Update user: `parental_consent_status = 'verified'`
5. Send confirmatory email to parent (email-plus requirement)
6. Redirect to success page

### 13.4 New: `consent-revoke`

Revokes parental consent.

1. Look up token/user in `parental_consents`
2. Validate: status is `verified`
3. Update: `consent_status = 'revoked'`, `consent_revoked_at = now()`
4. Update user: `parental_consent_status = 'revoked'`
5. Restrict account (same as pending state)
6. Send confirmation email to parent

### 13.5 New: `account-delete`

See Section 10.4.

### 13.6 New: `age-gate-check`

Server-side anti-circumvention check.

1. Receive fingerprint hash
2. Check `age_gate_blocks` for matching, non-expired record
3. Return `{ blocked: boolean }`

---

## 14. Validators (New Schemas)

### 14.1 Updated: `signupRequestSchema`

Make `birthDate` and `country` required:

```typescript
// packages/validators/src/auth.ts

export const signupRequestSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  username: usernameSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must be YYYY-MM-DD"),
  country: z.string().length(2, "Country must be a 2-letter ISO code"),
  inviteToken: z.string().optional(),
});
```

### 14.2 New: `parentalConsentSchema`

```typescript
// packages/validators/src/consent.ts

export const parentalConsentRequestSchema = z.object({
  parentEmail: z.string().email("Valid parent email required"),
  userId: z.string().uuid(),
});

export const consentVerifySchema = z.object({
  token: z.string().min(1),
});

export const consentRevokeSchema = z.object({
  token: z.string().min(1),
});
```

### 14.3 New: `profileCompletionSchema`

For the `/complete-profile` page (OAuth users and existing beta users):

```typescript
// packages/validators/src/consent.ts

export const profileCompletionSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must be YYYY-MM-DD"),
  country: z.string().length(2, "Country must be a 2-letter ISO code"),
});
```

---

## 15. Testing Strategy

### 15.1 Unit Tests

| Module | Key Tests |
|--------|-----------|
| `consent-age.ts` | `getConsentAge()` for all mapped countries + default; `calculateAge()` edge cases (leap years, boundary dates); `requiresParentalConsent()` combinations; `getAgeTier()` all tiers |
| `age-permissions.ts` | `getFeatureAccess()` for all feature × tier combinations; `isFeatureEnabled()` boundary cases |
| Validator schemas | All new schemas with valid/invalid inputs |

### 15.2 Integration Tests

| Flow | What to Test |
|------|-------------|
| Signup (child) | DOB under consent age → account created in pending state, no PDS, PostHog not initialized |
| Signup (teen) | DOB above consent age but under 18 → standard account, no PDS, PostHog anonymous only |
| Signup (adult) | DOB 18+ → current behavior preserved |
| Consent flow | Token generation → parent email → verification → account activation → confirmatory email |
| Consent revocation | Verified → revoked → account restricted |
| Consent expiry | Token expires after 48 hours → status updated |
| OAuth completion | OAuth login → missing DOB → redirect to /complete-profile → age routing |
| Anti-circumvention | Under-age entry → cookie set → retry blocked |
| Feature gating | Each feature disabled/enabled correctly per tier |
| Account deletion | Full deletion flow with anonymization |

### 15.3 Test Data (Factories)

New factories needed in `tooling/test-utils/src/factories/`:

- `parentalConsentFactory` — builds `parental_consents` rows
- `ageGateBlockFactory` — builds `age_gate_blocks` rows
- Update `userFactory` to support `requires_parental_consent`, `parental_consent_status`, `consent_country`

---

## 16. Out of Scope

Explicitly excluded from this work:

| Item | Reason |
|------|--------|
| **Privacy policy / terms of service content** | Attorney responsibility; pages/routes can be built separately |
| **Enhanced parental consent (credit card, KBA, etc.)** | Deferred; needed for AT Protocol opt-in for minors |
| **AT Protocol opt-in for minors** | Blocked on enhanced consent method |
| **Multi-language privacy notices** | Nice-to-have for later |
| **Parental dashboard** | Nice-to-have for later |
| **ESRB Privacy Certified enrollment** | Administrative process, not code |
| **Child-friendly "bite-sized" privacy explanations** | Nice-to-have; requires UX research |
| **Chat/messaging system** | Doesn't exist yet; when built, must respect age tier |
| **Cookie consent banner redesign** | Current opt-out-by-default is already compliant |
| **Mobile app (Expo) changes** | Focus on web; mobile follows same patterns later |
