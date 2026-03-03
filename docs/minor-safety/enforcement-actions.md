# ⚖️ Enforcement Actions & Case Law

Regulatory enforcement actions and court decisions related to children's online privacy — with lessons for trainers.gg. Covers FTC actions (2022-2026), EU DPA decisions, and Pokemon/Nintendo precedents.

---

## 📋 Table of Contents

- [FTC Actions Against Gaming/Social Platforms](#ftc-actions-against-gamingsocial-platforms)
- [EU DPA Decisions](#eu-dpa-decisions)
- [Pokemon/Nintendo Precedents](#pokemonnintendo-precedents)
- [Key Lessons for trainers.gg](#key-lessons-for-trainersg)
- [US State Laws to Monitor](#us-state-laws-to-monitor)

---

## FTC Actions Against Gaming/Social Platforms

### Epic Games / Fortnite (December 2022)

| Detail | Value |
|--------|-------|
| **Total settlement** | **$520 million** |
| **COPPA penalty** | $275 million |
| **Dark patterns refunds** | $245 million |
| **Record** | Largest COPPA enforcement action in history |

#### Key Violations

1. **Knew children were playing** through surveys, merchandise licensing, and support communications — had "actual knowledge"
2. **Failed to obtain parental consent** before collecting children's personal data
3. **Live text and voice communications enabled by default** — matched children with adult strangers
4. **Used dark patterns** to trick users into unwanted purchases (billing without confirmation, confusing UI)

#### 🚨 Critical Lesson for trainers.gg

> **Default-on communication features between minors and strangers are a severe violation.** The voice/text chat enabled by default was the centerpiece of the FTC's case. Chat and messaging must be **OFF by default** for all minor users. This single issue drove the largest COPPA fine ever.

---

### TikTok / ByteDance (August 2024)

| Detail | Value |
|--------|-------|
| **Previous penalty (2019)** | $5.7 million |
| **Current status** | DOJ lawsuit filed, pending as of February 2026 |
| **Seeking** | Civil penalties of **$51,744 per violation per day** |

#### Key Allegations

1. Knowingly allowed **millions of children under 13** on the platform
2. Failed to notify parents and obtain consent
3. Collected and retained children's data (email, phone, location)
4. **Failed to comply with deletion requests** from parents
5. Violated the terms of the 2019 consent order

#### Lesson for trainers.gg

> **Repeat violations bring massively increased penalties.** TikTok paid $5.7M in 2019 and now faces per-violation-per-day penalties. Also: failing to honor deletion requests is a standalone violation — right to erasure must work.

---

### Cognosphere / Genshin Impact (January 2025)

| Detail | Value |
|--------|-------|
| **Settlement** | **$20 million** |
| **Key relief** | Must block children under 16 from in-game purchases without parental consent |

#### Key Violations

1. Collected personal information from children **in violation of COPPA**
2. **Deceived users** about in-game transaction costs and odds (gacha mechanics)

#### Lesson for trainers.gg

> **Even games not specifically "for kids" face COPPA enforcement if children use them.** Genshin Impact is not marketed to young children, but enough children played it to trigger COPPA obligations. A Pokemon tournament platform, with subject matter that directly appeals to children, faces even more scrutiny.

---

### Disney (September 2024)

| Detail | Value |
|--------|-------|
| **Issue** | Mislabeled child-directed YouTube videos |

#### Lesson for trainers.gg

> **Content classification matters.** Incorrectly claiming content isn't for children doesn't shield from liability. trainers.gg cannot credibly claim it's not a child-directed or mixed-audience service.

---

### Apitor (September 2024)

| Detail | Value |
|--------|-------|
| **Issue** | Collected children's data without consent; sold it through third-party SDK to advertisers |

#### Lesson for trainers.gg

> **Third-party SDKs that collect data count as data collection by the platform operator.** Every SDK and third-party service integrated into trainers.gg (PostHog, Supabase Analytics, AT Protocol relays, etc.) must be evaluated for COPPA compliance. The platform operator is responsible for the actions of third-party code running in their service.

---

### NGL Labs (July 2024)

| Detail | Value |
|--------|-------|
| **Action** | Joint FTC / LA District Attorney settlement |
| **Issue** | COPPA violations + other federal and state laws for anonymous chat app popular with young users |

#### Lesson for trainers.gg

> **Anonymous/pseudonymous features don't shield from COPPA.** Even services that don't collect "real names" must comply if they collect persistent identifiers from children.

---

## EU DPA Decisions

### TikTok — Irish DPC (2023)

| Detail | Value |
|--------|-------|
| **Fine** | **EUR 345 million** |
| **DPA** | Irish Data Protection Commission |
| **Violations** | Platform settings, age verification failures, communication with children |
| **GDPR articles breached** | Multiple — data processing, transparency, fairness |

#### Key Issues

- Default platform settings were not privacy-protective for children
- Age verification was insufficient
- Children could receive messages from strangers

#### Lesson for trainers.gg

> **EU DPAs enforce actively against platforms with inadequate age verification and non-private defaults.** The EUR 345M fine demonstrates that EU enforcement is serious and substantial.

---

### Meta/Facebook — Irish DPC (December 2024)

| Detail | Value |
|--------|-------|
| **Fine** | **EUR 251 million** |
| **Issue** | 2018 data breach exposed data of 29 million accounts including children's personal data |

#### Lesson for trainers.gg

> **Data breaches involving children's data draw enhanced scrutiny and larger fines.** Security is a compliance issue, not just a technical one. Children's data must be protected with appropriate security measures.

---

### LinkedIn — Irish DPC (October 2024)

| Detail | Value |
|--------|-------|
| **Fine** | **EUR 310 million** |
| **Issue** | Mishandling user data for targeted advertising and behavioral analysis |

#### Lesson for trainers.gg

> **Behavioral analysis and targeted advertising are high-risk activities** under GDPR, even for platforms not primarily serving children. For a platform serving children, these activities face even more scrutiny.

---

### Broader EU Enforcement Trend

- Cumulative GDPR fines reached approximately **EUR 5.88 billion** by January 2025
- Children's data protection is a **key enforcement focus**
- Major tech companies face increasing scrutiny
- DPAs are becoming more aggressive and coordinated

---

## Pokemon/Nintendo Precedents

### Nintendo Privacy Practices

- Subject to frequent audits as part of **ESRB Privacy Certified** program
- All Nintendo sites with ESRB certification seals are reviewed for compliance
- Does not knowingly collect information from children below applicable age thresholds without parental consent

### The Pokemon Company Privacy Approach

| Practice | Implementation |
|----------|---------------|
| Safe Harbor program | ESRB Privacy Certified |
| Under-13 consent | Parental consent required for PTC accounts |
| Under-16 consent (EU) | Jurisdiction-specific parental consent |
| Advertising for minors | Restricted unless parental permission obtained |
| Data collection | Minimized for minor accounts |
| Auditing | Regular ESRB audits |

### Pokemon GO (Niantic)

- Collects geolocation, contact info, photos
- Implements age-gated restrictions
- Demonstrates that even Pokemon services with heavy data collection can comply with COPPA and GDPR

### Enforcement Record

> **No known FTC enforcement actions or GDPR fines against The Pokemon Company or Nintendo for children's privacy violations** as of February 2026.

Their ESRB certification and cautious approach to children's data appears to have kept them in compliance. This is a strong signal that the ESRB Privacy Certified approach works.

---

## Key Lessons for trainers.gg

### Ranked by Severity

| # | Lesson | Source Case | Priority |
|:-:|--------|-------------|:--------:|
| 1 | **Chat/messaging must be OFF by default for minors** | Epic Games ($520M) | 🔴 CRITICAL |
| 2 | **Age gate must be neutral and anti-circumvention measures must exist** | TikTok, Genshin Impact | 🔴 CRITICAL |
| 3 | **Parental consent must be obtained BEFORE collecting data from under-13** | All FTC cases | 🔴 CRITICAL |
| 4 | **Third-party SDKs count as your data collection** | Apitor | 🔴 CRITICAL |
| 5 | **Right to erasure must actually work** | TikTok (deletion request failures) | 🟡 HIGH |
| 6 | **Repeat violations bring massively increased penalties** | TikTok ($5.7M → per-day penalties) | 🟡 HIGH |
| 7 | **"Not specifically for kids" is not a defense** | Genshin Impact, Disney | 🟡 HIGH |
| 8 | **Default settings must be high-privacy for minors** | TikTok (EU), UK Code | 🟡 HIGH |
| 9 | **Data breaches involving children = enhanced penalties** | Meta (EU) | 🟡 HIGH |
| 10 | **ESRB certification provides a defensible compliance framework** | Nintendo/TPC (no violations) | 🟢 MEDIUM |
| 11 | **Content classification must be honest** | Disney | 🟢 MEDIUM |

---

## US State Laws to Monitor

Several US states have enacted or are enacting children's online safety laws that may affect trainers.gg:

| Law | Jurisdiction | Status | Key Provision |
|-----|-------------|--------|---------------|
| **California AADC** | California | Enacted (enforcement paused pending legal challenges) | Age Appropriate Design Code modeled on UK Children's Code |
| **Utah App Store Accountability Act** | Utah | Enacted | Requires age verification for app downloads; parental consent for minors |
| **KOSA (Kids Online Safety Act)** | Federal | Reintroduced May 2025; not yet enacted | Duty of care for platforms; FTC enforcement |
| **COPPA 2.0** | Federal | Not yet enacted | Would extend COPPA protections to ages 13-17 |
| **Social media age restrictions** | Arkansas, Louisiana, Nebraska, Oregon, Virginia | Various stages | Age verification for social media access |

### Monitoring Recommendation

Track federal legislation (KOSA, COPPA 2.0) as the highest priority — if enacted, they would significantly expand compliance obligations. California AADC enforcement status should also be monitored, as it could set precedent for other states.

---

## 🔗 Cross-References

- [coppa.md](coppa.md) — COPPA penalty structure and enforcement trends
- [gdpr-minors.md](gdpr-minors.md) — EU enforcement context
- [risk-assessment.md](risk-assessment.md) — How these lessons inform our priority matrix
- [pokemon-platform-considerations.md](pokemon-platform-considerations.md) — TPC compliance model as blueprint
- [technical-implementation-guide.md](technical-implementation-guide.md) — How to implement the lessons (age gates, consent flows, defaults)

## 📚 Sources

- [FTC Epic Games Press Release](https://www.ftc.gov/news-events/news/press-releases/2022/12/fortnite-video-game-maker-epic-games-pay-more-half-billion-dollars-over-ftc-allegations)
- [FTC TikTok Lawsuit](https://www.ftc.gov/news-events/news/press-releases/2024/08/ftc-investigation-leads-lawsuit-against-tiktok-bytedance-flagrantly-violating-childrens-privacy-law)
- [Reed Smith Analysis](https://www.reedsmith.com/articles/ftc-starts-2025-with-a-focus-on-safeguarding-kids/)
- [GDPR Enforcement Tracker](https://www.enforcementtracker.com/?insights=)
- [Mayer Brown Analysis](https://www.mayerbrown.com/en/insights/publications/2025/02/protecting-the-next-generation-how-states-and-the-ftc-are-holding-businesses-accountable-for-childrens-online-privacy)
- [Inside Privacy State Developments](https://www.insideprivacy.com/childrens-privacy/state-and-federal-developments-in-minors-privacy-in-2025/)
- [Davis Wright Tremaine Federal Legislation](https://www.dwt.com/insights/2026/01/federal-online-safety-legislation-hits-congress)
