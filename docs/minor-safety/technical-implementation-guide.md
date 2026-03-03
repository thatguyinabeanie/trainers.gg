# 🔧 Technical Implementation Guide

Actionable implementation patterns for minor safety compliance in trainers.gg — age gates, consent flows, data minimization, age-tiered features, and analytics.

---

## 📋 Table of Contents

- [Neutral Age Gate](#neutral-age-gate)
- [Anti-Circumvention Measures](#anti-circumvention-measures)
- [Parental Consent Methods](#parental-consent-methods)
- [Recommended Consent Flow for trainers.gg](#recommended-consent-flow-for-trainersg)
- [Data Minimization Strategies](#data-minimization-strategies)
- [Age-Tiered Feature Access Model](#age-tiered-feature-access-model)
- [Cookie & Analytics Consent for Minors](#cookie--analytics-consent-for-minors)
- [IP Tracking for Anti-Abuse](#ip-tracking-for-anti-abuse)

---

## Neutral Age Gate

### FTC Requirements

The FTC has specific guidance on how age gates must be implemented:

| Requirement | Details |
|-------------|---------|
| **Ask for date of birth** | Month and year, or full date — NOT "Are you over 13?" |
| **No leading questions** | Do not indicate what age is required to access the service |
| **Free-form entry** | Dropdowns acceptable; checkboxes stating "I am over 13" are NOT neutral |
| **No retry circumvention** | Must prevent users from pressing "back" and entering a different age |
| **No retention** | Do not retain age data longer than necessary for verification |
| **No secondary use** | Do not use age data for any other purpose than verification |
| **Clear notice** | Provide clear notice about the age verification process |

### Implementation Pattern

```
┌─────────────────────────────────────────┐
│         Create Your Account             │
│                                         │
│  Date of Birth                          │
│  ┌──────┐ ┌──────┐ ┌──────────┐        │
│  │ Month│ │ Day  │ │   Year   │        │
│  └──────┘ └──────┘ └──────────┘        │
│                                         │
│  (No hint about age requirements)       │
│                                         │
│         [ Continue ]                    │
└─────────────────────────────────────────┘
```

### Implementation Steps

1. Present a date-of-birth entry field during account creation
2. Use a neutral format — separate month/day/year dropdowns or a date picker with no pre-selected values
3. Do NOT display any messaging that hints at the age threshold
4. Route based on calculated age:
   - **Under 13:** Redirect to parental consent flow (not a rejection screen)
   - **13-15:** Apply GDPR country-specific rules for EU users; standard flow for US users
   - **16+:** Standard registration flow
5. Set a persistent cookie/localStorage flag if a user enters an age under the threshold (see anti-circumvention below)

### What NOT to Do

| Anti-Pattern | Why It's Wrong |
|-------------|----------------|
| "Are you 13 or older?" checkbox | Not a neutral age gate — tells users the threshold |
| "You must be 13 to use this site" on rejection | Teaches children to lie about their age on retry |
| Birth year-only dropdown starting at "2010" | Implies a threshold |
| No age gate at all with "we don't knowingly collect..." | Not credible for a Pokemon platform (actual knowledge through subject matter) |
| Allow retry with different DOB | Circumvention — FTC violation |

---

## Anti-Circumvention Measures

The FTC expects platforms to prevent users from simply retrying with a different age.

### Required Measures

1. **Persistent cookie/localStorage flag**
   - When a user enters a DOB that makes them under 13, set a flag
   - On subsequent visits/registration attempts, detect the flag and maintain the under-13 routing
   - Do NOT clear this flag when the user navigates away

2. **Session-based blocking**
   - Within the same session, do not allow re-entry of date of birth after an under-threshold result
   - Show the parental consent flow, not a "try again" option

3. **No "back button" workaround**
   - After DOB submission, the flow should not allow navigating back to change the DOB
   - Use form state management to prevent this

### Implementation Notes

- The cookie/localStorage approach is the FTC-standard pattern
- It is not perfect (users can clear cookies), but the FTC accepts it as "reasonable"
- Do NOT use fingerprinting or aggressive tracking — that creates its own privacy issues
- The goal is to demonstrate **good faith effort**, not to build an unbeatable system

---

## Parental Consent Methods

### FTC-Approved Methods (Complete Table)

#### Pre-2025 Methods

| Method | Description | Cost | Conversion | Third-Party Sharing OK? |
|--------|-------------|:----:|:----------:|:-----------------------:|
| Signed consent form | Mail/fax signed form | Low | Low | ✅ |
| Credit card transaction | Actual monetary charge | Medium | Medium | ✅ |
| Toll-free number | Parent calls trained staff | High | Medium | ✅ |
| Video conference | Parent verifies via video | High | Low | ✅ |
| Government ID check | ID checked against database; must delete after | Medium | Medium | ✅ |
| **Email-plus** | Email + confirmatory follow-up | **Low** | **High** | ❌ Internal use only |

#### New Methods (2025 Amendments)

| Method | Description | Cost | Conversion | Third-Party Sharing OK? |
|--------|-------------|:----:|:----------:|:-----------------------:|
| Knowledge-based auth | Dynamic questions verifying parent identity | Medium | Medium | ✅ |
| **Text-plus** | Text message + confirmatory follow-up | **Low** | **High** | ❌ Internal use only |
| Facial recognition | Compare parent photo to government ID | High | Low | ✅ |

---

## Recommended Consent Flow for trainers.gg

### Primary Method: Email-Plus

Email-plus is the recommended method — low cost, high conversion, well-established pattern.

### Flow

```
Child enters DOB (under 13)
        │
        ▼
┌──────────────────────────┐
│ "Ask a parent or guardian │
│  to help set up your     │
│  account"                │
│                          │
│  Parent's email:         │
│  ┌──────────────────┐    │
│  │                  │    │
│  └──────────────────┘    │
│                          │
│      [ Send Request ]    │
└──────────────────────────┘
        │
        ▼
Email sent to parent with:
  - Clear explanation of data practices
  - What data will be collected
  - How data will be used
  - Consent link
        │
        ▼
Parent clicks consent link
        │
        ▼
Confirmatory follow-up email sent
        │
        ▼
Child's account activated with
age-appropriate restrictions
```

### Limitation

Email-plus is only valid if data is used **internally** and not shared with third parties for advertising or non-integral purposes.

If trainers.gg shares data with third parties (including AT Protocol federation), a more robust method is required. This is a key consideration — see [pokemon-platform-considerations.md](pokemon-platform-considerations.md) for AT Protocol federation analysis.

### Alternative: Text-Plus (2025)

Same flow as email-plus but using text messages instead of email. Also limited to internal-use-only data.

---

## Data Minimization Strategies

### Per Data Category

| Data Category | What to Collect | What NOT to Collect | Notes |
|---------------|----------------|-------------------|-------|
| **Account creation** | Username, email (or parent email), DOB | Real name, phone number, address | Real name only if needed for prize fulfillment |
| **Avatars** | Selection from preset images | Photo uploads | Avoids collecting children's images entirely |
| **Profiles** | Username, VGC division, favorite Pokemon | Location, school, bio text for under-13 | Minimal public info for minors |
| **Tournament registration** | Username, team sheet, division | Additional personal details | Only what's needed for pairing and results |
| **Team sheets** | Pokemon, moves, items, abilities | — | Pokemon team data is NOT personal information |
| **Chat/messaging** | — | Any chat for under-13 | **Disabled entirely** for under-13 (Epic Games lesson) |
| **Social/Bluesky** | — | Any AT Protocol data for under-13 | Disabled for under-13; opt-in for 13-15 |
| **Analytics** | Anonymous aggregate only (under-13) | PostHog tracking with persistent IDs | Disable or use cookieless anonymous mode |
| **IP addresses** | For anti-abuse only, with retention limit | Long-term storage, secondary uses | Document legitimate interest; 30-90 day retention |

### Principles

1. **Collect at the point of need** — don't front-load data collection
2. **Delete when no longer needed** — implement automated retention policies
3. **Preset over custom** — preset avatars instead of uploads, predefined fields instead of free text
4. **Internal over shared** — keep data internal unless federation/sharing is explicitly consented

---

## Age-Tiered Feature Access Model

### Feature Matrix

| Feature | Under 13 | 13-15 | 16-17 | 18+ |
|---------|:--------:|:-----:|:-----:|:---:|
| **Account creation** | With parental consent | With parental consent (EU) / Self (US) | Self (most jurisdictions) | Self |
| **Tournament participation** | ✅ (with consent) | ✅ | ✅ | ✅ |
| **Tournament results (public)** | Visible (competition integrity) | Visible | Visible | Visible |
| **Profile visibility** | Private only | Private by default | Configurable | Configurable |
| **Avatar** | Preset options only | Preset options only | Full upload | Full upload |
| **Bio/about text** | Disabled | Limited | Full | Full |
| **Chat/messaging** | ❌ Disabled | Opt-in with parental consent (EU) | Opt-in | Enabled by default |
| **Bluesky/AT Protocol** | ❌ Disabled | Limited (opt-in, no federation) | Full | Full |
| **DID/Handle creation** | ❌ Disabled | With parental consent | Self | Self |
| **Analytics tracking** | ❌ Disabled or anonymous only | With consent | With consent | With consent |
| **Public profile in search engines** | ❌ Disabled | Disabled by default | Configurable | Configurable |
| **Social links** | ❌ Disabled | Limited | Full | Full |
| **Prize acceptance** | With parental consent + guardian payment | With parental consent | Self (check jurisdiction) | Self |

### Implementation Notes

- Age is determined from DOB collected during registration
- EU users: use country-specific GDPR consent age (13-16) for the 13-15 tier boundary
- The `birth_date` field already exists in the database — validation logic needs to be added
- Feature flags can be used to gate features by age tier
- Settings changes by minors should not be able to exceed their tier's maximum permissions

---

## Cookie & Analytics Consent for Minors

### COPPA Requirements

- Cookies and persistent identifiers ARE personal information under COPPA
- **Cannot place tracking cookies** on children under 13 without verifiable parental consent
- Do NOT load analytics scripts before obtaining consent
- Even "analytics-only" cookies require consent for under-13 users

### GDPR Requirements

- Consent required for all non-essential cookies (all users, stricter for minors)
- Must be as easy to reject as to accept
- Pre-ticked boxes are not valid consent
- Cookie consent language must be age-appropriate

### PostHog-Specific Implementation

PostHog offers features that support compliance:

| Feature | How to Use |
|---------|-----------|
| **Cookieless tracking mode** | Operate without cookies or local/session storage |
| **Opt-in mode** | Only track after explicit consent |
| **Privacy controls** | Fine-grained control over captured data |
| **Property masking** | Redact specific properties before sending |
| **Self-hosted option** | Keep data within your infrastructure (GDPR transfer concerns) |

### Recommended Implementation

| User Type | PostHog Configuration |
|-----------|----------------------|
| **Under 13 (no consent)** | **PostHog completely disabled** — do not load the script |
| **Under 13 (with parental consent)** | Anonymous, cookieless mode only — no persistent identifiers |
| **13-15 (EU, no consent)** | PostHog disabled until explicit consent obtained |
| **13-15 (EU, with consent)** | Standard tracking with property masking for sensitive data |
| **13-15 (US)** | Standard tracking with consent banner |
| **16+ (no consent)** | PostHog disabled until consent obtained |
| **16+ (with consent)** | Full tracking |

### Implementation Pattern

```
// Pseudo-code for PostHog initialization
const userAge = calculateAge(user.birthDate);
const userCountry = detectCountry();
const consentAge = getConsentAge(userCountry);

if (userAge < 13) {
  // COPPA: Do not load PostHog at all without parental consent
  // Even cookieless mode should be avoided
  if (hasVerifiedParentalConsent(user)) {
    initPostHog({ cookieless: true, anonymousOnly: true });
  }
} else if (userAge < consentAge) {
  // GDPR: Require explicit consent before loading
  if (hasAnalyticsConsent(user)) {
    initPostHog({ maskProperties: true });
  }
} else {
  // Adult: Load with consent banner
  showConsentBanner({
    onAccept: () => initPostHog(),
    onReject: () => { /* Do not load PostHog */ }
  });
}
```

---

## IP Tracking for Anti-Abuse

IP addresses are personal information under both COPPA and GDPR. However, limited IP tracking for anti-abuse purposes is permitted.

### COPPA Exception

Collecting a persistent identifier (including IP address) for the **sole purpose of supporting internal operations** does NOT require parental consent. Qualifying purposes:

- Site maintenance and diagnostics
- Frequency capping
- **Fraud prevention / anti-abuse**
- Legal compliance
- Responding to operator requests

Anti-abuse/fraud prevention qualifies under this exception, **but must be documented**.

### GDPR Legal Basis

- **Legitimate interest** (Art. 6(1)(f)) can be used as the legal basis for anti-abuse IP tracking
- Must conduct a **legitimate interest assessment**
- Must disclose in the privacy notice
- Must have a data retention policy

### Requirements for trainers.gg

| Requirement | Implementation |
|-------------|---------------|
| **Purpose limitation** | IP data used ONLY for anti-abuse — not analytics, personalization, or advertising |
| **Retention limit** | Delete IP data after 30-90 days |
| **Documentation** | Document the legitimate interest and COPPA exception in internal records |
| **Privacy policy disclosure** | Disclose IP collection and anti-abuse purpose in the privacy policy |
| **Access controls** | Restrict access to IP data to security/admin personnel only |
| **No secondary use** | Never use IP data for geolocation, personalization, analytics, or any other purpose |

---

## 🔗 Cross-References

- [coppa.md](coppa.md) — COPPA consent requirements and personal information definitions
- [gdpr-minors.md](gdpr-minors.md) — GDPR consent requirements and country-specific ages
- [pokemon-platform-considerations.md](pokemon-platform-considerations.md) — AT Protocol federation implications for consent
- [risk-assessment.md](risk-assessment.md) — Gap analysis identifying what needs to be built

## 📚 Sources

- [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [FTC Verifiable Parental Consent](https://www.ftc.gov/business-guidance/privacy-security/verifiable-parental-consent-childrens-online-privacy-rule)
- [PostHog GDPR Compliance](https://posthog.com/docs/privacy/gdpr-compliance)
- [PostHog Privacy Controls](https://posthog.com/docs/product-analytics/privacy)
- [CookieHub COPPA Guide](https://www.cookiehub.com/coppa)
- [NTIA Recommended Practices](https://www.ntia.gov/report/2024/kids-online-health-and-safety/online-health-and-safety-for-children-and-youth/taskforce-guidance/recommended-practices-for-industry)
- [IAPP Compliance Considerations](https://iapp.org/news/a/kids-and-teens-online-privacy-and-safety-8-compliance-considerations)
