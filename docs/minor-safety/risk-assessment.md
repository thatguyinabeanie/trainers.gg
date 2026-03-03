# 📊 trainers.gg Risk Assessment

Platform-specific risk analysis, compliance priority matrix, codebase gap analysis, and relationship to existing Linear tickets. This is the most actionable document in this directory — start here.

---

## 📋 Table of Contents

- [Risk Classification](#risk-classification)
- [Compliance Priority Matrix](#compliance-priority-matrix)
- [Current Codebase Gap Analysis](#current-codebase-gap-analysis)
- [Relationship to Existing Tickets](#relationship-to-existing-tickets)

---

## Risk Classification

### Overall Risk: 🔴 HIGH

trainers.gg is a **high-risk platform** from a children's data protection perspective. The combination of Pokemon subject matter, explicitly child-serving VGC divisions, social features, and global reach creates significant regulatory exposure across multiple jurisdictions.

### Factor-by-Factor Assessment

| Factor | Risk Level | Reasoning |
|--------|:----------:|-----------|
| **Subject matter** | 🔴 HIGH | Pokemon franchise is fundamentally child-appealing; triggers "directed to children" or "mixed audience" classification under COPPA |
| **Expected audience** | 🔴 HIGH | VGC Junior Division includes children under 13; Senior Division includes 13-16; no minimum age for participation |
| **Data collection scope** | 🟡 MEDIUM | User accounts, profiles, avatars, tournament data, analytics — broader than minimal but not excessive |
| **Social features** | 🔴 HIGH | Bluesky/AT Protocol integration, potential chat/messaging — the Epic Games case ($520M) centered on default-on communication |
| **Analytics/tracking** | 🟡 MEDIUM | PostHog tracking, IP collection for anti-abuse — persistent identifiers are personal information under COPPA |
| **Global reach** | 🔴 HIGH | Users expected from US, EU, UK, Australia, Japan, South Korea, Brazil — multi-jurisdiction compliance required |
| **Communication features** | 🔴 HIGH | Any chat/messaging between users creates the exact risk pattern that cost Epic Games $520M |

---

## Compliance Priority Matrix

### 🔴 Must-Have (Launch Blockers)

These items **must be completed before public launch**. Launching without them creates immediate regulatory exposure.

| # | Item | Regulatory Basis | Notes |
|:-:|------|-----------------|-------|
| 1 | **Neutral age gate** during account creation | COPPA (mixed audience), GDPR Art. 8, UK Code Std. 3 | DOB collection with no age-threshold hints; anti-circumvention via cookie/localStorage |
| 2 | **Parental consent flow** for under-13 (US) and under-16 (EU) | COPPA, GDPR Art. 8 | Email-plus method recommended; must be implemented before any data collection |
| 3 | **Privacy policy** with child-specific sections | COPPA, GDPR Art. 13-14, UK Code Std. 4 | Must disclose: what data is collected, how it's used, who it's shared with, children's rights, parental rights |
| 4 | **Data minimization** | COPPA, GDPR Art. 5(1)(c), UK Code Std. 8 | Only collect data necessary for core tournament functionality; preset avatars instead of uploads for minors |
| 5 | **Analytics disabled/anonymous for under-13** | COPPA (persistent identifiers = personal information) | PostHog must not load for under-13 users without parental consent |
| 6 | **Chat/messaging OFF by default for minors** | COPPA, UK Code Std. 7 (defaults), Epic Games precedent | The single most important feature restriction — this was the core of the $520M Epic fine |
| 7 | **DPIA conducted** | GDPR Art. 35, UK Code Std. 2 | Mandatory before processing children's data; use ICO gaming template |

### 🟡 Should-Have (Near-Term Post-Launch)

These items significantly reduce risk and should be implemented soon after launch.

| # | Item | Regulatory Basis | Notes |
|:-:|------|-----------------|-------|
| 1 | **ESRB Privacy Certified** enrollment | COPPA Safe Harbor | Best fit for gaming platform; TPC uses this; provides audit framework and liability reduction |
| 2 | **Age-tiered feature access** (under 13 / 13-15 / 16-17 / 18+) | COPPA, GDPR, UK Code | See [technical-implementation-guide.md](technical-implementation-guide.md) for full feature matrix |
| 3 | **Country-specific consent ages** for EU member states | GDPR Art. 8 | 13-16 range; start with 16 as universal, refine later |
| 4 | **Right to erasure** capability | GDPR Art. 17, COPPA | Full deletion of all user data including tournament history, analytics, federated data |
| 5 | **Cookie consent mechanism** | GDPR ePrivacy, COPPA | Opt-in for analytics; age-appropriate language |
| 6 | **Data retention policy** | COPPA 2025, GDPR Art. 5(1)(e) | Defined deletion schedules per data category |

### 🟢 Nice-to-Have (Longer Term)

These items represent best practices and additional compliance maturity.

| # | Item | Regulatory Basis | Notes |
|:-:|------|-----------------|-------|
| 1 | **Child-friendly privacy information** | UK Code Std. 4 | "Bite-sized" explanations at collection points; age-appropriate language per group |
| 2 | **Parental dashboard** | UK Code Std. 11 | Parents can view/manage children's accounts, consent status, data |
| 3 | **Regular privacy audits** | ESRB program, GDPR accountability | Annual review of data practices, policy compliance |
| 4 | **Child-specific content moderation** | UK Code Std. 5 | Policies for protecting minors in tournament contexts |
| 5 | **Multi-language privacy notices** | GDPR Art. 12, international compliance | At minimum: English, French (Canada), Portuguese (Brazil), Japanese, Korean |

---

## Current Codebase Gap Analysis

Assessment of what exists in the codebase today vs. what's needed for compliance.

### What Exists

| Component | Status | Location | Notes |
|-----------|:------:|----------|-------|
| `birth_date` field in database | ✅ Exists | User profiles table | Collected during registration — provides age data |
| User authentication | ✅ Exists | Supabase Auth | Email/password + OAuth providers |
| PostHog integration | ✅ Exists | `packages/posthog` | Tracks all users equally — no age-based differentiation |
| AT Protocol integration | ✅ Exists | `packages/atproto` | Bluesky features available to all users |

### What's Missing

| Component | Status | Priority | Notes |
|-----------|:------:|:--------:|-------|
| **Age gate (neutral DOB entry)** | ❌ Missing | 🔴 Launch blocker | DOB is collected but no neutral age verification flow exists |
| **Age validation logic** | ❌ Missing | 🔴 Launch blocker | No code calculates age from DOB or routes users by age tier |
| **Parental consent flow** | ❌ Missing | 🔴 Launch blocker | No mechanism for parent email collection, consent verification, or status tracking |
| **Privacy policy pages** | ❌ Missing | 🔴 Launch blocker | No `/privacy` or `/terms` routes; no child-specific privacy notice |
| **Age-based feature gating** | ❌ Missing | 🔴 Launch blocker | Chat, social, analytics features are not gated by age |
| **PostHog age-based config** | ❌ Missing | 🔴 Launch blocker | PostHog loads for all users regardless of age |
| **Chat/messaging restrictions** | ❌ Missing | 🔴 Launch blocker | If/when chat is implemented, it must be disabled by default for minors |
| **Anti-circumvention (age gate)** | ❌ Missing | 🔴 Launch blocker | No cookie/localStorage to prevent age re-entry |
| **DPIA document** | ❌ Missing | 🔴 Launch blocker | Not a code change but a required document |
| **Parental consent database tables** | ❌ Missing | 🟡 Near-term | Tables for tracking consent status, parent emails, verification tokens |
| **Right to erasure flow** | ❌ Missing | 🟡 Near-term | No account deletion or data export functionality |
| **Cookie consent banner** | ❌ Missing | 🟡 Near-term | No opt-in consent mechanism for analytics cookies |
| **Data retention automation** | ❌ Missing | 🟡 Near-term | No automated deletion schedules |
| **AT Protocol restrictions for minors** | ❌ Missing | 🟡 Near-term | Bluesky features available to all users; no age gating |
| **Country-specific consent ages** | ❌ Missing | 🟡 Near-term | No country detection or variable consent age thresholds |

### Summary

The platform currently has **no minor safety compliance mechanisms in place**. The `birth_date` field provides the foundation for age-based routing, but no validation, gating, or consent flows have been implemented. This is expected for a pre-release platform, but all 🔴 items must be addressed before public launch.

---

## Relationship to Existing Tickets

### TGG-235: Minor Safety Compliance Implementation

This ticket covers the technical implementation of minor safety features. The documentation in this directory provides the **requirements and specifications** for TGG-235.

**Key deliverables for TGG-235:**
- Neutral age gate implementation
- Parental consent flow (email-plus method)
- Age-based feature gating
- PostHog age-based configuration
- Anti-circumvention measures
- Database schema for consent tracking

### TGG-237: Privacy Policy and Terms of Service

This ticket covers the creation of legal documents. This documentation provides the **regulatory requirements** that the privacy policy must address.

**Key deliverables for TGG-237:**
- COPPA-compliant privacy policy
- GDPR-compliant privacy notice
- Child-specific privacy sections
- Terms of service with age-appropriate language
- Cookie policy

### How These Docs Support the Tickets

```
docs/minor-safety/          TGG-235              TGG-237
┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│ risk-assessment  │───▶│ Age gate     │    │ Privacy      │
│ (gap analysis)   │    │ Consent flow │    │ policy       │
├─────────────────┤    │ Feature gates│    │ Terms of     │
│ technical-impl   │───▶│ PostHog conf │    │ service      │
│ (patterns)       │    │ DB schema    │    │ Cookie       │
├─────────────────┤    └──────────────┘    │ policy       │
│ coppa            │                       │              │
│ gdpr-minors      │──────────────────────▶│ (regulatory  │
│ uk-childrens-code│                       │  requirements│
│ international    │                       │  for content)│
├─────────────────┤                       └──────────────┘
│ enforcement      │
│ (lessons learned)│───▶ Both tickets (informs priority decisions)
│ pokemon-platform │
│ (classification) │
└─────────────────┘
```

---

## 🔗 Cross-References

- [coppa.md](coppa.md) — Primary US regulation details (April 2026 deadline)
- [gdpr-minors.md](gdpr-minors.md) — EU regulation details
- [uk-childrens-code.md](uk-childrens-code.md) — UK Code requirements
- [international.md](international.md) — Other jurisdictions
- [technical-implementation-guide.md](technical-implementation-guide.md) — Implementation patterns for all gap items
- [enforcement-actions.md](enforcement-actions.md) — Lessons that inform priority decisions
- [pokemon-platform-considerations.md](pokemon-platform-considerations.md) — Why trainers.gg is classified as high risk
