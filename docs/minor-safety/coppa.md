# 🇺🇸 COPPA (US) Compliance Guide

Children's Online Privacy Protection Act — the primary US federal law governing online collection of personal information from children under 13.

> **⚠️ Key Deadline:** The 2025 COPPA Rule amendments require full compliance by **April 22, 2026**.

---

## 📋 Table of Contents

- [Overview & Key Dates](#overview--key-dates)
- [Age Threshold](#age-threshold)
- [Personal Information Definition](#personal-information-definition)
- [Who Must Comply](#who-must-comply)
- [trainers.gg Classification](#trainersg-classification)
- [Parental Consent Requirements](#parental-consent-requirements)
- [Data Retention Limits](#data-retention-limits)
- [Safe Harbor Programs](#safe-harbor-programs)
- [Penalties & Enforcement Trends](#penalties--enforcement-trends)
- [2025 Amendments Summary](#2025-amendments-summary)

---

## Overview & Key Dates

| Date | Event |
|------|-------|
| 1998 | COPPA enacted |
| April 2000 | COPPA effective |
| 2013 | Major rule revision (expanded personal information definition, added persistent identifiers) |
| January 16, 2025 | 2025 amendments finalized |
| June 23, 2025 | 2025 amendments effective |
| **April 22, 2026** | **Full compliance deadline for 2025 amendments** |

COPPA is enforced by the FTC through the COPPA Rule (16 CFR Part 312).

---

## Age Threshold

- **Under 13 years old** — this is the hard threshold
- A "child" is defined as an individual under the age of 13
- The proposed COPPA 2.0 / Kids Online Safety and Privacy Act would extend coverage to under 17, but this has **not yet been enacted** as of February 2026

---

## Personal Information Definition

Under COPPA, "personal information" includes all of the following:

| Data Type | Notes | New in 2025? |
|-----------|-------|:------------:|
| First and last name | — | |
| Home or physical address (street + city/town) | — | |
| Online contact information (email) | — | |
| Screen/user name that functions as online contact info | — | |
| Telephone number | Including mobile | |
| Social Security number | — | |
| **Persistent identifier** | Cookies, IP addresses, device serial numbers, unique device IDs — recognizes a user over time and across sites | |
| Photo, video, or audio file containing a child's image or voice | — | |
| Geolocation sufficient to identify street + city/town | — | |
| **Biometric identifiers** | Fingerprints, retina/iris patterns, voiceprints, facial templates, gait patterns, DNA | ✅ |
| **Government-issued identifiers** | SSN, state ID numbers, birth certificate numbers, passport numbers | ✅ |

### 🚨 Critical for trainers.gg

**Persistent identifiers (cookies, IP addresses) ARE personal information under COPPA.** Passive tracking through analytics (PostHog) constitutes "collection" even without active user input. Loading PostHog for an under-13 user without parental consent = COPPA violation.

---

## Who Must Comply

COPPA applies in **two scenarios**:

### Scenario A: Website/Service "Directed to Children"

The FTC uses a **multi-factor test**:

- Subject matter of the site/service
- Visual content (characters, activities, incentives)
- Use of animated characters or child-oriented activities
- Music or other audio content
- Age of models
- Presence of child celebrities or celebrities who appeal to children
- Language or other characteristics of the website/service
- Advertising that is directed to children

**New in 2025** — additional factors:

- Marketing materials and promotional plans
- Representations to third parties
- Reviews by users or third parties
- Age of users on similar websites/services

### Scenario B: "Actual Knowledge"

A general-audience website must comply if it has **actual knowledge** that it is collecting personal information from children under 13. Established through:

- Age information provided during registration
- Correspondence/communications revealing age
- Knowledge from a third party (e.g., a parent notifying you)

### Mixed Audience Websites (New in 2025)

A **"mixed audience website"** is one that:

1. Is "child-directed" under the multi-factor test, BUT
2. Does **not** target children as the primary audience, AND
3. Does **not** collect personal information from users prior to verifying their age

Mixed audience sites may implement **neutral age screens** to determine which users need COPPA protections — allowing adult users to proceed without restrictions while routing child users through the consent flow.

---

## trainers.gg Classification

### Assessment: Likely "Mixed Audience" at Minimum

| Factor | Analysis | Direction |
|--------|----------|-----------|
| Subject matter | Pokemon — franchise with significant child audience | ➡️ Child-directed |
| Visual content | Pokemon imagery, game-related graphics | ➡️ Child-directed |
| User demographics on similar services | Official Pokemon platforms have Junior divisions (under 13) | ➡️ Child-directed |
| Primary audience | Competitive players skew older (Seniors/Masters) | ➡️ General audience |
| Actual knowledge | Birth date collected at registration; VGC divisions by age | ➡️ Actual knowledge |

**Conclusion:** trainers.gg is highly likely to be classified as a **mixed audience website** under the 2025 amendments. The subject matter (Pokemon), the existence of Junior divisions in official competitions, and the collection of birth dates during registration all point to this classification.

**What this means:** We MUST implement a neutral age gate and apply full COPPA protections for users identified as under 13.

---

## Parental Consent Requirements

### FTC-Approved Verification Methods

#### Pre-2025 Methods

| Method | Description | Practical for trainers.gg? |
|--------|-------------|:--------------------------:|
| Signed consent form | Mail or fax a consent form | ❌ Slow, low conversion |
| Credit card transaction | Actual monetary charge on parent's card | ❌ Friction |
| Toll-free number | Parent calls with trained personnel | ❌ Requires staffing |
| Video conference | Parent verifies via video call | ❌ Requires staffing |
| Government ID check | Parent provides ID checked against database; must delete after verification | ⚠️ Possible but complex |
| **Email-plus** | Email to parent + confirmatory follow-up (email, letter, or phone call) | ✅ **Recommended** |

#### New Methods Added in 2025

| Method | Description | Practical for trainers.gg? |
|--------|-------------|:--------------------------:|
| Knowledge-based authentication | Dynamic multiple-choice questions that verify parent identity | ⚠️ Requires third-party service |
| Text-plus | Text message consent + confirmatory follow-up | ✅ Good alternative |
| Facial recognition | Comparing parent's photo to government ID; must delete biometric data after | ❌ Complex |

### Recommended Approach: Email-Plus

1. Collect parent's email address during the child's registration
2. Send email to parent with clear explanation of data practices
3. Parent clicks consent link in email
4. Send confirmatory follow-up email after consent is received

**Limitation:** Email-plus is only valid if data is used **internally** and not shared with third parties for advertising. If trainers.gg shares data with third parties, a more robust method is required.

### Separate Consent for Third-Party Sharing (New in 2025)

Operators must obtain **separate** parental consent for disclosing children's data to third parties for:
- Targeted advertising
- Non-integral purposes

This is a **separate consent** from the initial collection consent.

---

## Data Retention Limits

The 2025 amendments add explicit data retention requirements:

- Must retain children's personal information **only as long as reasonably necessary** to fulfill the purpose for which it was collected
- Must delete data when no longer needed
- Must have a **documented data retention policy**
- Applies to both the operator and any third parties with whom data was shared

---

## Safe Harbor Programs

FTC-approved COPPA Safe Harbor programs provide a framework for self-regulation. Members are deemed compliant with COPPA if they follow the program's guidelines.

| Program | Notes | Recommended? |
|---------|-------|:------------:|
| **ESRB Privacy Certified** | Specifically relevant for gaming platforms; conducts audits | ✅ **Best fit** |
| **PRIVO** | FTC-approved since 2004; offers consent management tools | ⚠️ Good alternative |
| **kidSAFE** | Provides "same or greater protections" as COPPA Rule | ⚠️ |
| **CARU** (BBB) | Children's Advertising Review Unit | ⚠️ |
| **iKeepSafe** | — | ⚠️ |
| **TRUSTe/TrustArc** | — | ⚠️ |

### 2025 Update

Safe Harbor programs must now:
- **Publicly disclose** their membership lists
- Report additional information to the FTC for transparency and accountability

### Recommendation

Joining **ESRB Privacy Certified** is the most natural fit for trainers.gg given the gaming/tournament context. The Pokemon Company itself uses ESRB Privacy Certified — following their model provides a reasonable blueprint.

---

## Penalties & Enforcement Trends

### Penalty Structure

- **Up to $53,088 per violation** (adjusted for inflation)
- Factors: egregiousness, previous violations, number of children, type of data, how data was used, whether shared, company size

### Record Penalties

| Company | Amount | Year | Key Issue |
|---------|--------|------|-----------|
| Epic Games (Fortnite) | **$520M** ($275M COPPA + $245M dark patterns) | 2022 | Default-on voice/text chat matching children with adult strangers |
| TikTok | $5.7M (2019) + pending DOJ lawsuit seeking $51,744/violation/day | 2024 | Knowingly allowing millions of children under 13; failing to delete data |
| Cognosphere (Genshin Impact) | **$20M** | 2025 | Collecting children's data without consent; deceptive in-game purchases |

### Enforcement Trend

The FTC has made children's online privacy its **top enforcement priority**:

- **2024:** DOJ/FTC lawsuit against TikTok; Disney and Apitor settlements; NGL Labs settlement
- **2025:** Genshin Impact $20M settlement; COPPA Rule amendments finalized; FTC stated protecting kids is "biggest priority"
- **2026 outlook:** Vigorous enforcement of 2025 amendments expected, **especially against gaming platforms**

> **The trend is unmistakable: gaming and social platforms serving children are the primary enforcement targets.**

See [enforcement-actions.md](enforcement-actions.md) for detailed case analysis.

---

## 2025 Amendments Summary

| Change | Details |
|--------|---------|
| **Separate consent for third-party sharing** | Must obtain separate parental consent for disclosing children's data to third parties for targeted advertising and non-integral purposes |
| **Expanded "personal information"** | Now includes biometric identifiers and government-issued identifiers |
| **New consent methods** | Added knowledge-based authentication, text-plus method, facial recognition |
| **Data retention limits** | Must retain children's data only as long as reasonably necessary |
| **Mixed audience website** | New category with specific age-screening requirements |
| **Enhanced safe harbor transparency** | Programs must disclose membership lists and report to FTC |
| **Expanded "directed to children" factors** | Marketing materials, third-party reviews, user demographics on similar services |

---

## 🔗 Cross-References

- [technical-implementation-guide.md](technical-implementation-guide.md) — Age gate implementation, consent flow patterns
- [enforcement-actions.md](enforcement-actions.md) — Detailed case analysis of FTC actions
- [risk-assessment.md](risk-assessment.md) — trainers.gg-specific compliance priorities
- [pokemon-platform-considerations.md](pokemon-platform-considerations.md) — Why Pokemon = "directed to children"

## 📚 Sources

- [FTC COPPA Rule](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)
- [FTC Six-Step Compliance Plan](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business)
- [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [Federal Register 2025 Amendments](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)
- [Securiti COPPA Analysis](https://securiti.ai/ftc-coppa-final-rule-amendments/)
- [White & Case COPPA Analysis](https://www.whitecase.com/insight-alert/unpacking-ftcs-coppa-amendments-what-you-need-know)
- [Davis Wright Tremaine Analysis](https://www.dwt.com/blogs/privacy--security-law-blog/2025/05/coppa-rule-ftc-amended-childrens-privacy)
