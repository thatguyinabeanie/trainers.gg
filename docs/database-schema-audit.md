# Database Schema Audit Report

Generated: 2026-01-26

## Summary

| Category                   | Count | Status           |
| -------------------------- | ----- | ---------------- |
| Total Tables               | 38    | -                |
| Used in Application Code   | 21    | ✅ Active        |
| Unused in Application Code | 17    | ⚠️ Review Needed |
| Views                      | 0     | -                |
| Functions                  | 1     | ✅ Used          |

---

## ✅ Tables Used in Application Code (21)

These tables are actively queried by the application:

| Table                      | Usage Count | Purpose                            |
| -------------------------- | ----------- | ---------------------------------- |
| `alts`                     | 27          | Alternate player identities        |
| `atproto_oauth_state`      | 6           | AT Protocol OAuth state management |
| `atproto_sessions`         | 4           | AT Protocol session tracking       |
| `follows`                  | 1           | Social following relationships     |
| `organization_invitations` | 8           | Org staff invitations              |
| `organization_staff`       | 10          | Org staff membership               |
| `organizations`            | 20          | Organizations                      |
| `post_likes`               | 4           | Social post likes                  |
| `posts`                    | 5           | Social posts                       |
| `roles`                    | 2           | Site-level roles                   |
| `team_pokemon`             | 1           | Pokemon team compositions          |
| `teams`                    | 1           | Tournament teams                   |
| `tournament_invitations`   | 6           | Tournament player invitations      |
| `tournament_matches`       | 8           | Tournament match records           |
| `tournament_phases`        | 8           | Tournament phase management        |
| `tournament_player_stats`  | 2           | Player tournament statistics       |
| `tournament_registrations` | 27          | Tournament player registrations    |
| `tournament_rounds`        | 2           | Tournament round tracking          |
| `tournament_standings`     | 1           | Tournament leaderboards            |
| `tournaments`              | 26          | Tournaments                        |
| `user_roles`               | 6           | User site-level role assignments   |
| `users`                    | 26          | User accounts                      |

---

## ⚠️ Tables NOT Used in Application Code (17)

These tables exist in the schema but are not queried by application code. They may be:

- Infrastructure tables (used by triggers/constraints)
- Feature tables (planned but not implemented)
- Legacy tables (should be removed)

### 🔧 Infrastructure / RBAC System (Keep)

| Table              | Purpose                        | Reason to Keep                                                    |
| ------------------ | ------------------------------ | ----------------------------------------------------------------- |
| `group_roles`      | Organization permission groups | Used by RLS policies, referenced by 3 tables, part of RBAC system |
| `groups`           | Organization groups/teams      | Referenced by 2 tables, part of RBAC system                       |
| `permissions`      | Available permissions          | Referenced by 2 tables, RBAC infrastructure                       |
| `role_permissions` | Maps roles to permissions      | RBAC infrastructure table                                         |
| `user_group_roles` | User group assignments         | Part of RBAC system, used in permission checks                    |

**Status:** ✅ Keep - These are infrastructure tables for the organization permission system.

### 💳 Subscription / Monetization (Keep for Future)

| Table           | Purpose                    | Reason to Keep                              |
| --------------- | -------------------------- | ------------------------------------------- |
| `feature_usage` | Track feature usage limits | 27 migration references, RLS policies exist |
| `subscriptions` | User/org subscriptions     | 29 migration references, RLS policies exist |
| `rate_limits`   | API rate limiting          | 12 migration references                     |

**Status:** ⏳ Keep - Monetization features planned but not yet implemented.

### 🎮 Tournament Features (Evaluate)

| Table                             | Purpose                            | References               | Recommendation                |
| --------------------------------- | ---------------------------------- | ------------------------ | ----------------------------- |
| `tournament_events`               | Tournament events/games            | 34 migrations            | ❓ Check if needed            |
| `tournament_opponent_history`     | Player matchup history             | 47 migrations            | ❓ Analytics feature?         |
| `tournament_pairings`             | Match pairings                     | 55 migrations            | ❓ vs tournament_matches?     |
| `tournament_registration_pokemon` | Pokemon registered for tournaments | 35 migrations            | ❓ vs team_pokemon?           |
| `tournament_template_phases`      | Template phase definitions         | 26 migrations            | ⚠️ Remove if templates unused |
| `tournament_templates`            | Tournament templates               | 48 migrations, 4 FK refs | ⚠️ Feature not used?          |

**Status:** ⚠️ Review - These may be planned features or redundant with existing tables.

### 🔗 AT Protocol (Evaluate)

| Table                     | Purpose                 | References    | Recommendation               |
| ------------------------- | ----------------------- | ------------- | ---------------------------- |
| `linked_atproto_accounts` | Linked Bluesky accounts | 16 migrations | ❓ Check if PDS handles this |

**Status:** ❓ Review - May be redundant with PDS-native account linking.

### 🏢 Organization Features (Evaluate)

| Table                   | Purpose               | References    | Recommendation                 |
| ----------------------- | --------------------- | ------------- | ------------------------------ |
| `organization_requests` | Join requests to orgs | 52 migrations | ⚠️ Different from invitations? |

**Status:** ❓ Review - May be planned feature for user-initiated join requests vs admin invitations.

### 🎲 Pokemon Data (Keep)

| Table     | Purpose              | References                              | Recommendation                |
| --------- | -------------------- | --------------------------------------- | ----------------------------- |
| `pokemon` | Pokemon species data | 149 migrations, 4 FK refs, 19 seed refs | ✅ Keep - Core reference data |

**Status:** ✅ Keep - Referenced by multiple tournament tables, has seed data.

---

## 🔍 Functions

| Function             | Used?  | Purpose                                        |
| -------------------- | ------ | ---------------------------------------------- |
| `has_org_permission` | ✅ Yes | RLS policy helper for organization permissions |

---

## 📊 Recommendations

### High Priority Cleanup

1. ✅ **`organization_with_owner` view** - Already removed in migration `20260127000008`

### Medium Priority - Investigate

2. **Tournament Templates System**
   - Tables: `tournament_templates`, `tournament_template_phases`
   - Question: Is this feature actively used or planned?
   - Action: If not needed, create migration to drop tables

3. **Tournament Pairings vs Matches**
   - Tables: `tournament_pairings`, `tournament_matches`
   - Question: Are both needed? Seem to overlap
   - Action: Clarify distinction or consolidate

4. **Organization Requests**
   - Table: `organization_requests`
   - Question: Different from invitations? Is this implemented?
   - Action: Document usage or remove if redundant

5. **Linked AT Protocol Accounts**
   - Table: `linked_atproto_accounts`
   - Question: Does PDS handle this natively?
   - Action: Review if redundant with PDS account system

### Low Priority - Keep for Now

6. **RBAC Infrastructure** - Keep all (groups, group_roles, permissions, role_permissions, user_group_roles)
7. **Monetization Tables** - Keep all (feature_usage, subscriptions, rate_limits)
8. **Pokemon Reference Data** - Keep (pokemon table)

---

## 🎯 Next Steps

1. **Commit current cleanup** - `organization_with_owner` view removal
2. **Clarify tournament features** - Document which tournament tables are active vs planned
3. **Review organization requests** - Is this feature implemented or planned?
4. **Audit AT Protocol integration** - Ensure no redundancy with PDS
5. **Update documentation** - Document purpose of each "unused" table

---

## Notes

- "Unused" means not queried in TypeScript application code
- Tables may still be used by:
  - Database triggers
  - RLS policies
  - Foreign key constraints
  - Future features
- Do NOT drop tables without understanding their purpose and dependencies
