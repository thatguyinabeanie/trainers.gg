# 🇪🇺 GDPR Article 8 & EU Children's Data

GDPR Article 8 governs the processing of children's personal data in relation to "information society services" — which includes online platforms like trainers.gg.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Consent Age by Country](#consent-age-by-country)
- [Valid Parental Consent](#valid-parental-consent)
- [Data Minimization for Minors](#data-minimization-for-minors)
- [Right to Erasure](#right-to-erasure)
- [DPIA Requirements](#dpia-requirements)
- [Private-by-Default Settings](#private-by-default-settings)
- [Profiling Restrictions](#profiling-restrictions)

---

## Overview

- **Default age of digital consent:** 16 years old
- **Member states may lower to:** no less than 13
- **Range across EU/EEA:** 13–16
- **Applies to:** any "information society service" that processes children's personal data
- trainers.gg is unquestionably an "information society service" under this definition

### Key Difference from COPPA

GDPR is **less prescriptive** about verification methods but sets a **higher bar** for the quality of consent:
- Consent must be **freely given, specific, informed, and unambiguous** (Art. 4(11))
- Must be as easy to **withdraw** as to give
- "Reasonable efforts" to verify parental consent, considering available technology

---

## Consent Age by Country

### Full EU/EEA + UK Table

| Country | Age | | Country | Age |
|---------|:---:|-|---------|:---:|
| Austria | 14 | | Latvia | 13 |
| Belgium | 13 | | Lithuania | 14 |
| Bulgaria | 14 | | Luxembourg | 16 |
| Croatia | 16 | | Malta | 13 |
| Cyprus | 14 | | Netherlands | 16 |
| Czech Republic | 15 | | Poland | 16 |
| Denmark | 13 | | Portugal | 13 |
| Estonia | 13 | | Romania | 16 |
| Finland | 13 | | Slovakia | 16 |
| France | 15 | | Slovenia | 16* |
| Germany | 16 | | Spain | 14 |
| Greece | 15 | | Sweden | 13 |
| Hungary | 16 | | **United Kingdom** | **13** |
| Ireland | 16 | | | |

*Slovenia has a pending proposal to lower to 15.

### By Age Threshold

| Age | Countries |
|:---:|-----------|
| **13** | Belgium, Denmark, Estonia, Finland, Latvia, Malta, Portugal, Sweden, UK |
| **14** | Austria, Bulgaria, Cyprus, Lithuania, Spain |
| **15** | Czech Republic, France, Greece |
| **16** | Croatia, Germany, Hungary, Ireland, Luxembourg, Netherlands, Poland, Romania, Slovakia, Slovenia |

### Practical Impact for trainers.gg

Two compliance approaches:

| Approach | Pros | Cons |
|----------|------|------|
| **Apply 16 as universal EU threshold** | Simplest implementation; safest | More users require parental consent than legally necessary |
| **Country-specific thresholds** | More user-friendly; fewer unnecessary consent flows | More complex to implement; need to detect user's country |

**Recommendation:** Start with 16 as the universal EU threshold for launch. Implement country-specific thresholds as a near-term improvement.

---

## Valid Parental Consent

For children below the applicable age threshold, GDPR requires:

### Requirements

1. Consent must be given or authorized by the **holder of parental responsibility**
2. The controller must make **reasonable efforts** to verify that consent was given by the parent/guardian
3. Verification efforts must be **proportionate to the risk** of the processing, considering available technology
4. Consent must be:
   - **Freely given** — no bundling with unrelated terms
   - **Specific** — for each distinct purpose
   - **Informed** — clear explanation of what data is collected and why
   - **Unambiguous** — an affirmative act (no pre-ticked boxes)
5. Must be **as easy to withdraw** as to give

### How GDPR Differs from COPPA

| Aspect | COPPA | GDPR |
|--------|-------|------|
| Verification methods | FTC-approved enumerated list | "Reasonable efforts" — not prescriptive |
| Consent quality | Must be "verifiable" | Must be freely given, specific, informed, unambiguous |
| Withdrawal | Not specifically addressed | Must be as easy to withdraw as to give |
| Separate consent | Required for third-party sharing (2025) | Required per purpose |
| Documentation | Required | Required — and must be demonstrable |

---

## Data Minimization for Minors

GDPR Art. 5(1)(c) requires data minimization generally, but it is **especially important** for children:

- Collect only data that is **adequate, relevant, and limited to what is necessary**
- The Digital Services Act recognizes minors as a **distinct risk group** requiring stronger safeguards
- From 2025, the EU requires **private-by-default settings** for minors
- Targeted advertising to minors is increasingly restricted

### What This Means for trainers.gg

| Data Category | Allowed? | Notes |
|---------------|:--------:|-------|
| Username | ✅ | Necessary for platform functionality |
| Email (or parent email for minors) | ✅ | Necessary for account management |
| Date of birth | ✅ | Necessary for age verification and VGC division placement |
| Pokemon team data | ✅ | Not personal information |
| Real name | ⚠️ | Only if necessary for prize fulfillment |
| Profile photo (upload) | ❌ | Use preset avatars instead — avoids collecting children's images |
| Location/address | ❌ | Not necessary for online tournament functionality |
| Analytics (PostHog) | ⚠️ | Requires consent; disable for under-consent-age users |
| Chat messages | ⚠️ | Disable by default for minors |

---

## Right to Erasure

GDPR Article 17 (Right to Erasure / "Right to be Forgotten") has **special importance** for minors:

### Key Points

- **Recital 65:** The right to erasure is "particularly important" where data was collected when the person was a **child** and may not have been fully aware of the risks
- A person can request deletion of data collected during childhood **even after reaching adulthood**
- The controller must erase data **"without undue delay"** (typically within one month)
- This applies **regardless of the legal basis** originally used for processing

### What trainers.gg Must Support

Full deletion of all data associated with a minor's account, including:

- Account information (username, email, DOB)
- Tournament history and results
- Team sheets
- Chat logs (if applicable)
- Analytics data (PostHog events)
- Any data shared with third parties (must notify them to delete too)
- Bluesky/AT Protocol data (if federated)

### Implementation Note

The ability to fully delete a user's data should be built into the platform from the start — retrofitting erasure is significantly harder than designing for it.

---

## DPIA Requirements

A Data Protection Impact Assessment (DPIA) is **mandatory** for trainers.gg.

### When a DPIA is Required

A DPIA must be conducted when processing involves:

- ✅ Use of children's personal data for marketing purposes
- ✅ Profiling or other automated decision-making involving children
- ✅ **Offering online services directly to children**
- ✅ Systematic monitoring of a publicly accessible area
- ✅ Large-scale processing of sensitive categories of data

trainers.gg triggers multiple criteria — a DPIA is **not optional**.

### What the DPIA Must Include

1. Description of the processing operations and purposes
2. Assessment of the **necessity and proportionality** of the processing
3. Assessment of **risks to children's rights and freedoms**
4. Identification of **measures to address those risks**
5. Consideration of the **developmental needs, capacities, and ages** of the children

### Timing

The DPIA should be conducted **before launch** and reviewed/updated regularly (at least annually, or when processing changes significantly).

---

## Private-by-Default Settings

From 2025, the EU requires private-by-default settings for minors:

- All privacy settings must be set to the **most restrictive option** by default
- Users (or parents) can then choose to relax settings
- This aligns with the UK Children's Code Standard 7 (Default Settings)

### For trainers.gg

| Setting | Default for Minors |
|---------|-------------------|
| Profile visibility | Private |
| Tournament results visibility | Visible (necessary for competition integrity) |
| Chat/messaging | Disabled |
| Social/Bluesky integration | Disabled |
| Analytics tracking | Disabled |
| Search engine indexing of profile | Disabled |

---

## Profiling Restrictions

- Profiling of children is **strongly discouraged** under GDPR
- Only allowed if there are **appropriate measures** to protect children from harmful effects
- Automated decision-making that produces legal or similarly significant effects is prohibited for children
- Targeted advertising based on profiling is increasingly restricted for minors

### For trainers.gg

- Do **not** build recommendation systems or personalization for minor users
- Do **not** use minor users' data for any form of profiling
- Tournament seeding/pairing algorithms based on game data are acceptable (competitive integrity purpose, not profiling)

---

## 🔗 Cross-References

- [uk-childrens-code.md](uk-childrens-code.md) — UK-specific requirements (extends to under 18)
- [coppa.md](coppa.md) — US requirements (different consent mechanisms)
- [international.md](international.md) — Other jurisdictions with different age thresholds
- [technical-implementation-guide.md](technical-implementation-guide.md) — Country-specific age detection implementation

## 📚 Sources

- [Art. 8 GDPR](https://gdpr-info.eu/art-8-gdpr/)
- [EuConsent Digital Age of Consent](https://euconsent.eu/digital-age-of-consent-under-the-gdpr/)
- [European Commission Guidance](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/legal-grounds-processing-data/are-there-any-specific-safeguards-data-about-children_en)
- [EU Children's Data Privacy 2025 Changes](https://www.gdprregister.eu/gdpr/eu-childrens-data-privacy-2025-7-changes/)
- [Clarip GDPR-K Analysis](https://www.clarip.com/data-privacy/gdpr-child-consent/)
- [ICO DPIA Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/2-data-protection-impact-assessments/)
