# 🎮 Pokemon Platform-Specific Considerations

Analysis of compliance considerations specific to trainers.gg as a competitive Pokemon tournament platform — covering audience demographics, VGC age divisions, competitive gaming law, The Pokemon Company's approach, and AT Protocol implications.

---

## 📋 Table of Contents

- [Pokemon Audience Demographics](#pokemon-audience-demographics)
- [VGC Age Divisions](#vgc-age-divisions)
- [In-Person vs Online Tournament Compliance](#in-person-vs-online-tournament-compliance)
- [Competitive Gaming Legal Considerations](#competitive-gaming-legal-considerations)
- [How The Pokemon Company Handles Compliance](#how-the-pokemon-company-handles-compliance)
- [AT Protocol / Bluesky Federation Implications](#at-protocol--bluesky-federation-implications)

---

## Pokemon Audience Demographics

### Why This Matters for Regulatory Classification

Pokemon is a franchise that **fundamentally targets children and young people**:

| Factor | Evidence |
|--------|----------|
| **Game ratings** | Rated E (Everyone) / PEGI 7 — the lowest non-universal age ratings |
| **Merchandise** | Toys, cards, clothing heavily marketed to children |
| **Media** | Animated series, movies targeting young audiences |
| **Official events** | Junior Division starts at **no minimum age** |
| **Character design** | Bright, colorful, appealing to young children |
| **Brand positioning** | Pokemon is synonymous with childhood for multiple generations |

### The "Mixed Audience" Reality

While Pokemon has a massive adult fan base (competitive players, collectors, nostalgic fans), the franchise's core identity is child-friendly. Under regulatory frameworks:

- **COPPA:** The subject matter, visual content, and user demographics on similar services (official Pokemon platforms) make trainers.gg at minimum a **"mixed audience website"** under the 2025 amendments
- **UK Children's Code:** Pokemon games are PEGI 7/12, well below the 16 threshold — the Code **definitely applies**
- **Regulators' perspective:** "We also have adult users" is not a defense if the subject matter inherently appeals to children

> **This is the single most important factor for compliance analysis.** A Pokemon tournament platform will almost certainly be deemed "directed to children" or at minimum a "mixed audience" service. Planning otherwise is not a credible position.

---

## VGC Age Divisions

### 2025 Season

| Division | Birth Year | Approximate Age |
|----------|:----------:|:---------------:|
| **Junior Division** | Born in or after 2013 | ~12 and under |
| **Senior Division** | Born 2009-2012 | ~13-16 |
| **Masters Division** | Born in or before 2008 | ~17+ |

### 2026 Season

Similar structure with birth year thresholds shifted by one year.

### Key Facts

- Age divisions are set at the **beginning of the season** based on birth year — they do not change mid-season
- Players are paired with others in the same age division when possible
- Prizes are awarded per age division
- All events require a **Pokemon Trainer Club (PTC) account**
- **No age minimum** for participation — children of any age can enter

### Regulatory Implications

| Fact | Implication |
|------|------------|
| Junior Division includes children under 13 | COPPA compliance is **mandatory**, not optional |
| trainers.gg collects birth dates | We have **actual knowledge** of users' ages |
| No age minimum for participation | Children as young as 5-6 may have accounts |
| Age divisions are public knowledge | Regulators can easily determine we serve children |

> The existence of a Junior Division (under 13) in official Pokemon competitions means that trainers.gg **MUST** assume children under 13 will use the platform. There is no credible argument that the platform is not expected to serve this demographic.

---

## In-Person vs Online Tournament Compliance

### In-Person Tournaments

| Aspect | How It Works | Compliance Impact |
|--------|-------------|-------------------|
| **Parental presence** | Often required/expected for minors | Natural supervision |
| **Consent** | Physical waivers and consent forms; parent/guardian co-signs | Straightforward verification |
| **Data collection** | Primarily name, age, contact info for pairings | Limited scope |
| **Communication** | Face-to-face | No digital communication risk |
| **Photo/video** | Separate consent often required for media capture of minors | Controlled environment |
| **Duration** | Single event | Data not continuously processed |

### Online Tournaments (trainers.gg)

| Aspect | How It Works | Compliance Impact |
|--------|-------------|-------------------|
| **Parental presence** | Not possible to verify | Must implement digital consent mechanisms |
| **Consent** | Digital consent flows required | More complex, must meet FTC standards |
| **Data collection** | IP addresses, device info, persistent identifiers, analytics, chat logs, social data | Significantly broader scope |
| **Communication** | Digital chat/messaging between users | **Key risk** — see Epic Games case ($520M) |
| **Photo/video** | Avatar uploads possible | Must restrict for minors |
| **Duration** | Ongoing platform with continuous data processing | Continuous compliance obligation |
| **Cross-border** | Users from multiple jurisdictions | Multi-regulation compliance |

### Key Takeaway

Online tournaments have a **fundamentally different compliance profile** from in-person events. The continuous data processing, digital communication between users, and cross-border nature of an online platform create obligations that don't exist for in-person events.

---

## Competitive Gaming Legal Considerations

### No Universal Age Restriction for Esports

- Tournament organizers set their own rules
- Ages 13+ is common for most competitive games
- Some tournaments require 18+
- Pokemon VGC has **no minimum age**

### Prizes for Minors

If trainers.gg offers prizes (cash, gift cards, merchandise):

| Consideration | Details |
|---------------|---------|
| **Child labor laws** | Cash prizes to minors may implicate child labor regulations in some jurisdictions |
| **Tax implications** | Prize winnings may be taxable; parents/guardians may need to be involved in reporting |
| **Parental consent** | Consent forms should cover prize acceptance |
| **Payment methods** | Cannot send payments directly to minors in many jurisdictions |

### Consent Forms for Competitive Participation

| Age Group | Typical Requirements |
|-----------|---------------------|
| Under 13 | Full parental consent for account creation AND tournament participation |
| 13-15 | Parental consent in many jurisdictions; may self-consent in some (US) |
| 16-17 | Parental consent for prizes; may self-consent for participation in most jurisdictions |
| 18+ | Self-consent |

---

## How The Pokemon Company Handles Compliance

### ESRB Privacy Certified

- The Pokemon Company uses **ESRB Privacy Certified** for its online services
- This is an FTC-approved COPPA Safe Harbor program
- Subject to **frequent audits** reviewing all sites with ESRB certification seals
- No known FTC enforcement actions or GDPR fines against The Pokemon Company or Nintendo

### Pokemon Trainer Club (PTC) Accounts

| Feature | Implementation |
|---------|---------------|
| **Under-13 accounts** | Require parental consent |
| **Under-16 accounts (EU)** | Require parental consent (varies by jurisdiction) |
| **Consent method** | Parent/guardian email verification |
| **Advertising restrictions** | Restricted for minors unless parental permission obtained |
| **Data minimization** | Limited data collection for minor accounts |

### Pokemon GO (Niantic)

- Collects geolocation, contact info, photos
- Implements age-gated restrictions
- Separate consent for location tracking for minors
- Demonstrates that even Pokemon services with heavy data collection can comply

### Key Takeaway

> Following the Pokemon Company's own model — **ESRB certification, age-gated accounts, parental consent for under-13** — provides a reasonable and defensible blueprint for trainers.gg compliance.

---

## AT Protocol / Bluesky Federation Implications

trainers.gg integrates with the AT Protocol (Bluesky) for social features and identity. This creates unique compliance considerations for minor data.

### How AT Protocol Works

- Users have a **DID** (Decentralized Identifier) — a permanent, public identity
- User data is stored on a **PDS** (Personal Data Server) — trainers.gg hosts one at `pds.trainers.gg`
- Data on the AT Protocol is designed to be **public and federated** — it propagates across the network
- Handles (`@username.trainers.gg`) are public identifiers

### Compliance Concerns

| Concern | Details | Severity |
|---------|---------|:--------:|
| **Data federation** | AT Protocol data is shared across the federated network by design | 🔴 HIGH |
| **Public identifiers** | DIDs and handles are permanent, public records | 🔴 HIGH |
| **Right to erasure** | Federated data is difficult to fully delete across all nodes | 🔴 HIGH |
| **Data minimization** | Federation inherently involves wider data distribution | 🟡 MEDIUM |
| **Cross-border transfers** | Federated data crosses jurisdictions automatically | 🟡 MEDIUM |
| **Parental consent scope** | Must consent cover data federation to third-party servers? | 🔴 HIGH |

### Recommendations for Minor Users

| Feature | Recommendation |
|---------|---------------|
| **AT Protocol integration** | **Disabled by default** for users under 16 |
| **Bluesky posting** | Disabled for users under 13; opt-in with parental consent for 13-15 |
| **DID creation** | Do not create DIDs for users under 13 without parental consent |
| **Handle provisioning** | Do not provision `@username.trainers.gg` handles for minors without parental consent |
| **PDS data** | Do not store minor's data on the PDS unless parental consent covers federation |
| **Profile federation** | Minor profiles should not federate to the broader AT Protocol network |

### Legal Analysis

The 2025 COPPA amendments require **separate parental consent** for disclosing children's data to third parties. AT Protocol federation arguably constitutes disclosure to third parties (other PDS servers, relay operators, app view providers). This means:

1. Federation of a minor's data may require separate, explicit parental consent beyond basic account consent
2. The consent must clearly explain that data will be shared across a federated network
3. Parents must understand the implications of federation (data on multiple servers, harder to delete)

### Open Questions

- Does AT Protocol federation constitute "disclosure to third parties" under COPPA?
- Can federated data be fully deleted to satisfy GDPR Art. 17 right to erasure?
- Should trainers.gg operate a "walled garden" mode for minor users, separate from federation?

These questions should be addressed with legal counsel before enabling AT Protocol features for minor users.

---

## 🔗 Cross-References

- [coppa.md](coppa.md) — "Mixed audience" classification analysis
- [risk-assessment.md](risk-assessment.md) — Social features and AT Protocol assessed as HIGH risk
- [technical-implementation-guide.md](technical-implementation-guide.md) — Age-tiered feature access model
- [enforcement-actions.md](enforcement-actions.md) — Epic Games case (default-on communication = $520M)

## 📚 Sources

- [Pokemon.com Age Divisions 2025](https://www.pokemon.com/us/pokemon-news/age-divisions-in-2025-official-competitions)
- [Victory Road 2026 Season Structure](https://victoryroad.pro/2026-season-structure/)
- [Pokemon.com Privacy Notice](https://www.pokemon.com/us/legal/privacy-notice)
- [Nintendo Privacy Policy](https://www.nintendo.com/us/privacy-policy/)
- [Pokemon Support FAQ](https://support.pokemon.com/hc/en-us/articles/360022644892-Why-do-we-need-a-parent-s-personal-information-for-a-kid-s-account)
- [DLA Piper Minors in Esports](https://www.dlapiper.com/en/insights/publications/2020/07/minors-in-pro-esports-bring-3-critical-legal-considerations)
- [ESRB Privacy Certified](https://www.esrb.org/privacy/)
