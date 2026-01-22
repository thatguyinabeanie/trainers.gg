---
title: Player Reputation System
description: Comprehensive specification for the player reputation and conduct tracking system
category: architecture
type: reputation
status: specification
obsidian_compatible: true
---

# 🏆 Player Reputation System

## Overview

This document outlines a comprehensive system for tracking player conduct and reputation across tournaments, empowering Tournament Organizers (TOs) to foster a positive, accountable, and transparent community. The system is designed with fairness, privacy, and growth in mind.

---

## 1️⃣ Core Concepts

### 🏅 User Reputation Score

- **Initial Value:** All users start at 90.
- **Range:** 0–100 (or configurable).
- **Visibility:**
  - Score is visible to TOs (for their tournaments) and to the user themselves.
  - Site admins can see all scores and conduct records.

### 📖 Player Conduct Record (formerly 'logs')

- **Event-based:** Each entry is a Conduct Event (positive or negative) associated with a profile, a tournament, and an organizer.
- **Event Levels:**
  - **Level 1 (Major):** Severe infractions (e.g., cheating, rudeness/abuse in chat, bans). Highest penalty, longest decay time.
  - **Level 2 (Moderate):** Medium infractions (e.g., repeated disconnects, unsportsmanlike conduct). Medium penalty, medium decay time.
  - **Level 3 (Minor):** Small infractions (e.g., tardiness, minor rule violations). Small penalty, shortest decay time.
  - **Level 0 (Positive):** Positive actions (e.g., sportsmanship, helping others). Rewards, positive impact, may also decay.
- **Decay:**
  - Each event level has a well-defined decay period after which its impact on the score is reduced or nullified, but the event itself remains permanently visible in the record.
  - Users can always see when an event will decay off their score.
- **Event Types:**
  - 🚫 Cheating (Level 1)
  - 😡 Rudeness/Abuse in chat (Level 1)
  - ⛔ Banned from tournament (Level 1)
  - ⬇️ Dropped from tournament for negative reason (Level 2)
  - 🔌 Disconnects (Level 2 or 3, depending on context)
  - 🕒 Tardiness (Level 3)
  - 🌟 Positive actions (Level 0)
- **Event Type Management:**
  - Only platform admins can add new event types. TOs may request new types for review.
- **Required Fields:**
  - Profile
  - Tournament
  - Organizer (who recorded the event)
  - Event type & level
  - Reason/notes (required for negative events)
  - Timestamp
  - Decay date (when impact on score ends)
  - Optional: Evidence (screenshot, chat log, etc.)

### 🧮 Score Calculation

- Each event level has a fixed point value (positive or negative).
- Score is recalculated as the sum of all active (non-decayed) events, starting from the initial value.
- Events never disappear, but their impact on the score decays according to their level.
- Users can always see their full conduct record and when each event will decay off their score.

---

## 2️⃣ Permissions & Transparency

- **Who Can Record Events:** Only tournament organizers (and optionally, trusted staff/judges) for their own tournaments.
- **Who Can See What:**
  - TOs see conduct records for profiles in their own tournaments only.
  - Organizations cannot see conduct records from other orgs' tournaments.
  - Users see their own full conduct record and score.
  - Site admins can see all conduct records and scores.
- **Appeals:**
  - Users can appeal any conduct event. Appeals are reviewed by site admins or a designated review board.
  - The appeal process is transparent and outcomes are logged.

---

## 3️⃣ Tournament Integration

- **Minimum Score Requirement:** TOs can set a minimum reputation score for registration.
- **Ban/Drop Integration:** When a profile is dropped or banned for a negative reason, a conduct event is automatically created.
- **Notifications:** Users are notified when their score changes or when a new conduct event is added.

---

## 4️⃣ Event Levels & Decay Table

| Level   | Example Event Types                | Penalty/Reward | Decay Period | Permanent Record |
| ------- | ---------------------------------- | -------------- | ------------ | ---------------- |
| Level 1 | Cheating, Rudeness/Abuse, Ban      | -30            | 12 months    | Yes              |
| Level 2 | Drop (negative), Disconnect (rage) | -15            | 6 months     | Yes              |
| Level 3 | Tardiness, Minor infractions       | -5             | 3 months     | Yes              |
| Level 0 | Positive actions                   | +5             | 3 months     | Yes              |

- **All events remain visible forever; only their impact on the score decays.**
- **Users can see the decay date for each event.**

---

## 5️⃣ Rewarding Positive Behavior

- Positive actions (sportsmanship, helping others, etc.) can be recorded as Level 0 events.
- These add points to a user's score for a set period (e.g., +5 for 3 months).
- TOs and staff are encouraged to recognize and reward positive conduct.
- The community can suggest additional ways to reward positive behavior.

---

## 6️⃣ Data Model Sketch

### **Tables/Entities**

#### `PlayerConductEvent`

- `id`
- `profile_id`
- `tournament_id`
- `organizer_id`
- `event_type` (enum: CHEATING, RUDENESS, etc.)
- `event_level` (int: 0–3)
- `reason` (text, required for negative)
- `points` (int, positive or negative)
- `evidence_url` (optional)
- `created_at`
- `decay_date`
- `appeal_status` (enum: NONE, PENDING, APPROVED, REJECTED)

#### `UserReputationScore`

- `user_id`
- `current_score`
- `last_updated`

#### `UserIP`

- `user_id`
- `ip_address`
- `first_seen`
- `last_seen`
- `is_banned` (bool)

---

## 7️⃣ IP Tracking & Privacy Law Considerations

### 🔒 Privacy & Security

- **IP Logging:** The system stores the last known IP(s) for each user to help prevent ban evasion and ensure fair play.
- **IP Bans:** If a user is banned, their IP can be flagged; new accounts from the same IP can be flagged for review.
- **Transparency:** Users are informed about IP tracking and its purpose in the privacy policy and during registration.

### ⚖️ Legal Compliance

- **GDPR (EU):**
  - IP addresses are considered personal data. You must have a lawful basis for processing (e.g., legitimate interest in preventing abuse).
  - Users must be informed about IP tracking and have access to their data.
  - Users can request deletion of their personal data (except where retention is required for legal or security reasons).
  - Data must be stored securely and only accessible to authorized staff.
- **CCPA (California):**
  - Users must be informed about what personal data is collected and how it is used.
  - Users have the right to request access to or deletion of their data.
  - Data must not be sold without consent.
- **General Best Practices:**
  - Only collect IP addresses when necessary.
  - Limit access to IP data to site admins and security staff.
  - Clearly document and communicate your data retention and privacy policies.
  - Allow users to contact you with privacy concerns or requests.

---

## 8️⃣ Additional Features & Considerations

- **Audit Trail:** All changes are logged for transparency.
- **Abuse Prevention:** Prevent malicious or unfair use by TOs (e.g., require evidence for major penalties, allow appeals).
- **Event Type Requests:** TOs can request new event types, but only platform admins can approve and add them.

---

## 9️⃣ Example User Stories

- As a TO, I can record a conduct event against a profile with a required reason and optional evidence.
- As a user, I can view my reputation score, my full conduct record, and see when each event will decay off my score.
- As a TO, I can set a minimum reputation score required for tournament registration.
- As an admin, I can review appeals and adjust events or scores if necessary.
- As a system, I automatically log a severe penalty if a profile is banned from a tournament.

---

## 🔟 Open Questions

- What additional positive behaviors should be rewarded, and how?
- Should decay periods be configurable per event type or fixed per level?
- How should the appeal process be structured (e.g., who reviews, what evidence is required)?
- Should users be able to see conduct records from previous years, or only recent history?
- Are there additional privacy or legal considerations for other regions?

---

_This system aims to create a fair, transparent, and positive environment for all participants!_ 🎉
