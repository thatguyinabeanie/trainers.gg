# 🇬🇧 UK Age Appropriate Design Code (Children's Code)

The UK Children's Code is a statutory code of practice under the UK Data Protection Act 2018. It applies to any **information society service** likely to be accessed by a person **under 18** in the UK that processes personal data.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Applicability to trainers.gg](#applicability-to-trainersg)
- [The 15 Standards](#the-15-standards)
- [Gaming/Tournament Platform Guidance](#gamingtournament-platform-guidance)
- [Key Requirements for trainers.gg](#key-requirements-for-trainersg)
- [DPIA Template Reference](#dpia-template-reference)

---

## Overview

### Legal Basis

- Issued under Section 123 of the Data Protection Act 2018
- Statutory code of practice — the ICO "must take it into account" when considering enforcement
- Non-compliance can lead to ICO enforcement action, including fines under UK GDPR (up to £17.5M or 4% of global turnover)

### Scope

The Code applies to services that are:
1. **Likely to be accessed by a person under 18** in the UK — this is a low bar; you don't need to target children specifically
2. **Information society services** — websites, apps, connected devices, online games, social media, messaging services
3. **Processing personal data** — if your service processes any personal data, the Code applies

### Key Distinction from COPPA/GDPR Art. 8

| Regulation | Age Range |
|-----------|-----------|
| COPPA | Under 13 |
| GDPR Art. 8 | Under 13-16 (varies by country) |
| **UK Children's Code** | **Under 18** |

The UK Code has the **broadest age scope** — it covers all children and young people under 18.

### Data (Use and Access) Act 2025

The Data (Use and Access) Act became law on June 19, 2025. The ICO is reviewing the Code guidance in light of this new legislation. The 15 standards remain in effect.

---

## Applicability to trainers.gg

### Why the Code Definitely Applies

| Factor | Analysis |
|--------|----------|
| **PEGI rating of Pokemon games** | PEGI 7 or PEGI 12 — well below 16 threshold |
| **Subject matter** | Pokemon franchise targets children and young people |
| **VGC age divisions** | Junior (under 13) and Senior (13-16) divisions exist |
| **UK user base** | Expected to serve UK-based competitive players |
| **Personal data processing** | Accounts, profiles, tournament data, analytics |

**Conclusion:** A Pokemon tournament platform is unquestionably within scope. Services with a PEGI rating of 16 or lower must conform to the Code, and Pokemon games are rated PEGI 7/12.

---

## The 15 Standards

### Standard 1: Best Interests of the Child

> The best interests of the child should be a primary consideration when designing and developing online services likely to be accessed by children.

**trainers.gg relevance:** HIGH — All design decisions affecting child users must consider their best interests. This is an overarching principle that guides interpretation of all other standards.

---

### Standard 2: Data Protection Impact Assessments

> Conduct a DPIA to assess and mitigate risks to children's rights and freedoms, considering developmental needs, capacities, and ages.

**trainers.gg relevance:** CRITICAL — A DPIA is mandatory before launch. The ICO provides a gaming-specific DPIA template.

**Action required:**
- Conduct DPIA before launch
- Consider different age groups (under 13, 13-15, 16-17)
- Document risks and mitigations
- Review annually or when processing changes

---

### Standard 3: Age Appropriate Application

> Take a risk-based approach to recognizing the age of users and apply the standards appropriately to child users.

**trainers.gg relevance:** HIGH — Must implement age verification and apply different protections based on age group.

**Implementation:** trainers.gg already collects date of birth — use this to apply age-appropriate protections automatically.

---

### Standard 4: Transparency

> Provide clear, prominent privacy information in age-appropriate language; use "bite-sized" explanations at the point of data collection.

**trainers.gg relevance:** HIGH — Privacy information must be understandable by the youngest users of the platform.

**Implementation ideas:**
- Short, plain-language privacy notices
- "Just-in-time" explanations when collecting data (e.g., "We need your birthday to put you in the right age group for tournaments")
- Avoid legal jargon in child-facing interfaces

---

### Standard 5: Detrimental Use of Data

> Do not use children's personal data in ways that are detrimental to their health or wellbeing.

**trainers.gg relevance:** MEDIUM — Tournament platforms generally don't involve detrimental data use, but consider:
- Excessive engagement mechanisms
- Public shaming through visible loss records
- Social pressure through public rankings

---

### Standard 6: Policies and Community Standards

> Uphold your own published terms, policies, and community standards.

**trainers.gg relevance:** MEDIUM — Ensure that stated privacy policies, age restrictions, and behavior rules are actually enforced.

---

### Standard 7: Default Settings

> Settings must be "high privacy" by default unless there is a compelling reason otherwise.

**trainers.gg relevance:** CRITICAL — All privacy-relevant settings must default to the most restrictive option.

| Setting | Required Default |
|---------|-----------------|
| Profile visibility | Private |
| Chat/messaging | Disabled |
| Social integration | Disabled |
| Analytics | Disabled |
| Search engine indexing | Disabled |
| Location sharing | Disabled |

---

### Standard 8: Data Minimisation

> Collect and retain only the minimum amount of personal data needed to provide the service elements a child is actively and knowingly engaged with.

**trainers.gg relevance:** HIGH — Only collect what's needed for tournament participation.

---

### Standard 9: Data Sharing

> Do not disclose children's data unless there is a compelling reason, considering the best interests of the child.

**trainers.gg relevance:** HIGH — Be especially careful with:
- AT Protocol/Bluesky federation (data shared to federated network)
- Analytics services (PostHog)
- Any third-party integrations

---

### Standard 10: Geolocation

> Switch off geolocation services by default.

**trainers.gg relevance:** LOW — trainers.gg doesn't use precise geolocation. However, if country detection is used for regional features, this should be disclosed.

---

### Standard 11: Parental Controls

> If providing parental controls, give children age-appropriate information about them. If a child is being monitored, give the child indicators.

**trainers.gg relevance:** MEDIUM — If parental consent/control features are built, children must know about them.

---

### Standard 12: Profiling

> Switch off profiling options by default. Only allow profiling with appropriate protective measures.

**trainers.gg relevance:** HIGH — No behavioral profiling, personalization, or recommendation algorithms for child users.

**Note:** Tournament seeding based on competitive history is likely acceptable (it's a core service function, not behavioral profiling).

---

### Standard 13: Nudge Techniques

> Do not use nudge techniques to lead or encourage children to provide unnecessary personal data or weaken their privacy protections.

**trainers.gg relevance:** MEDIUM — Avoid:
- Pressuring users to make profiles public
- Gamifying data sharing
- Making it harder to choose privacy over sharing
- "Are you sure?" prompts when choosing privacy

---

### Standard 14: Connected Toys and Devices

> Ensure connected toys and devices comply with the Code.

**trainers.gg relevance:** N/A — Not applicable unless the platform integrates with gaming hardware/peripherals in the future.

---

### Standard 15: Online Tools

> Provide prominent, accessible tools to help children exercise their data protection rights and report concerns.

**trainers.gg relevance:** HIGH — Must provide:
- Easy-to-find account deletion option
- Data download/portability tool
- Report/concern mechanism
- Contact information for privacy questions

---

## Gaming/Tournament Platform Guidance

The ICO has created specific guidance for gaming platforms:

### ICO Gaming DPIA Template

The ICO provides a DPIA template specifically for gaming services. Use this as a starting point for the trainers.gg DPIA.

### Privacy Moments

Provide age-appropriate explanations at key data collection points:

| Moment | Explanation Example |
|--------|-------------------|
| Account creation | "We need a few details to set up your account. We'll keep your info safe." |
| Birthday entry | "We ask for your birthday so we can put you in the right tournament group." |
| Tournament registration | "We'll use your username and team to run the tournament." |
| Analytics consent | "We use cookies to understand how people use our site. You can say no." |

### Age-Appropriate Mindsets

Consider developmental capacity by age:

| Age Group | Capacity | Design Implications |
|-----------|----------|-------------------|
| Under 10 | Limited reading ability; cannot understand abstract concepts like "privacy" | Use simple language, icons, minimal text |
| 10-12 | Can read but may not understand consequences of data sharing | Concrete explanations ("your name will be visible to others") |
| 13-15 | Growing understanding but may underestimate risks | Clear warnings about public data; explain what "public" means |
| 16-17 | Near-adult understanding but may still be impulsive | Standard-level explanations with clear choices |

---

## Key Requirements for trainers.gg

### Summary Checklist

- [ ] Conduct DPIA using ICO gaming template
- [ ] Implement high-privacy defaults for all users under 18
- [ ] Provide age-appropriate privacy notices
- [ ] Disable profiling/personalization for minors
- [ ] Disable chat/messaging by default for minors
- [ ] Provide easy-to-use data rights tools (deletion, download)
- [ ] No nudge techniques around privacy choices
- [ ] Minimize data collection to tournament essentials
- [ ] Restrict data sharing (especially via AT Protocol) for minors
- [ ] Document all decisions and mitigations

---

## DPIA Template Reference

The ICO provides templates and guidance:

- [ICO DPIA Guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/2-data-protection-impact-assessments/)
- [ICO DPIA Template (Sample)](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/how-do-we-do-a-dpia/)
- [ICO Children's Code Introduction](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/introduction-to-the-childrens-code/)

---

## 🔗 Cross-References

- [gdpr-minors.md](gdpr-minors.md) — EU GDPR Art. 8 requirements (overlapping but distinct)
- [risk-assessment.md](risk-assessment.md) — DPIA referenced as a launch blocker
- [technical-implementation-guide.md](technical-implementation-guide.md) — Implementation patterns for defaults and age-tiering

## 📚 Sources

- [ICO Children's Code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/)
- [ICO 15 Standards FAQ](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/faqs-on-the-15-standards-of-the-children-s-code/)
- [ICO Children's Code Introduction](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/introduction-to-the-childrens-code/)
