# Database Diagram

## 🗺️ Master System Diagram (Full Reference)

> This diagram shows all entities and all relationships in the system, including cross-domain links. Use this for a holistic view. See below for focused, split diagrams.

```mermaid
classDiagram
  %% Users & Profiles
  class User {
    id
    email
    username
    password_hash
    main_profile_id
    created_at
    updated_at
  }
  class Profile {
    id
    user_id
    display_name
    bio
    avatar_url
    created_at
    updated_at
  }
  class UserReputationScore {
    user_id
    current_score
    last_updated
  }
  class UserIP {
    user_id
    ip_address
    first_seen
    last_seen
    is_banned
  }

  %% Conduct & Reputation
  class PlayerConductEvent {
    id
    profile_id
    tournament_id
    organizer_id
    event_type
    event_level
    reason
    points
    evidence_url
    created_at
    decay_date
    appeal_status
  }

  %% Tournaments & Registration
  class Tournament {
    id
    organization_id
    name
    slug
    format
    start_date
    end_date
    status
    created_at
    updated_at
  }
  class Registration {
    id
    profile_id
    tournament_id
    team_id
    status
    registered_at
    completed_at
  }
  class Team {
    id
    profile_id
    name
    showdown_text
    is_public
    version
    created_at
    updated_at
  }
  class Article {
    id
    author_profile_id
    title
    content
    tags
    created_at
    updated_at
  }
  class Analytics {
    id
    tournament_id
    data_type
    data_json
    created_at
  }

  %% RBAC & Organizations
  class Organization {
    id
    name
    slug
    logo_url
    owner_profile_id
    created_at
    updated_at
  }
  class Group {
    id
    organization_id
    name
    description
  }
  class Role {
    id
    name
    description
  }
  class Permission {
    id
    name
    description
  }
  class GroupRole {
    id
    group_id
    role_id
  }
  class ProfileGroupRole {
    id
    profile_id
    group_role_id
  }
  class RolePermission {
    id
    role_id
    permission_id
  }
  class AuditLog {
    id
    actor_user_id
    action
    entity_type
    entity_id
    details_json
    created_at
  }

  %% Relationships
  User "1" -- "*" Profile : has
  User "1" -- "1" UserReputationScore : reputation
  User "1" -- "*" UserIP : ip_history
  Profile "1" -- "*" PlayerConductEvent : conduct_event
  Profile "1" -- "*" Registration : registers
  Profile "1" -- "*" Team : owns
  Profile "1" -- "*" Article : writes
  Profile "1" -- "*" ProfileGroupRole : group_roles
  PlayerConductEvent "*" -- "1" Tournament : in_tournament
  PlayerConductEvent "*" -- "1" Organization : by_organizer
  Registration "*" -- "1" Tournament : for_tournament
  Registration "*" -- "0..1" Team : uses
  Tournament "1" -- "*" Analytics : has
  Tournament "1" -- "*" Registration : has
  Team "1" -- "*" Article : featured_in
  Organization "1" -- "*" Group : has
  Organization "1" -- "*" Tournament : runs
  Organization "1" -- "*" AuditLog : logs
  Group "1" -- "*" GroupRole : has
  Role "1" -- "*" GroupRole : assigned
  ProfileGroupRole "*" -- "1" GroupRole : links
  Role "1" -- "*" RolePermission : grants
  Permission "1" -- "*" RolePermission : part_of
```

<!--
Legend (for use in Mermaid Live Editor):
- Blue: Users & Profiles
- Orange: Conduct & Reputation
- Green: Tournaments & Registration
- Purple: RBAC & Organizations
-->

---

## 1️⃣ Profile & Reputation

```mermaid
classDiagram
  class User {
    id
    email
    username
    password_hash
    main_profile_id
    created_at
    updated_at
  }
  class Profile {
    id
    user_id
    display_name
    bio
    avatar_url
    created_at
    updated_at
  }
  class PlayerConductEvent {
    id
    profile_id
    tournament_id
    organizer_id
    event_type
    event_level
    reason
    points
    evidence_url
    created_at
    decay_date
    appeal_status
  }
  class UserReputationScore {
    user_id
    current_score
    last_updated
  }
  class UserIP {
    user_id
    ip_address
    first_seen
    last_seen
    is_banned
  }

  User "1" -- "*" Profile : has
  User "1" -- "1" UserReputationScore : reputation
  User "1" -- "*" UserIP : ip_history
  Profile "1" -- "*" PlayerConductEvent : conduct_event
```

---

> **Note:** Mermaid color-coding and grouping (classDef, etc.) are not rendered in Obsidian.
> Use the Mermaid Live Editor or export to SVG/PNG for color/grouping visualization.

---

## 2️⃣ Tournaments & Registration

```mermaid
classDiagram
  class Tournament {
    id
    organization_id
    name
    slug
    format
    start_date
    end_date
    status
    created_at
    updated_at
  }
  class Registration {
    id
    profile_id
    tournament_id
    team_id
    status
    registered_at
    completed_at
  }
  class Team {
    id
    profile_id
    name
    showdown_text
    is_public
    version
    created_at
    updated_at
  }
  class Article {
    id
    author_profile_id
    title
    content
    tags
    created_at
    updated_at
  }
  class Analytics {
    id
    tournament_id
    data_type
    data_json
    created_at
  }

  Tournament "1" -- "*" Registration : has
  Registration "*" -- "0..1" Team : uses
  Team "1" -- "*" Article : featured_in
  Tournament "1" -- "*" Analytics : has
```

---

## 3️⃣ RBAC & Organizations

```mermaid
classDiagram
  class Organization {
    id
    name
    slug
    logo_url
    owner_profile_id
    created_at
    updated_at
  }
  class Group {
    id
    organization_id
    name
    description
  }
  class Role {
    id
    name
    description
  }
  class Permission {
    id
    name
    description
  }
  class GroupRole {
    id
    group_id
    role_id
  }
  class ProfileGroupRole {
    id
    profile_id
    group_role_id
  }
  class RolePermission {
    id
    role_id
    permission_id
  }
  class AuditLog {
    id
    actor_user_id
    action
    entity_type
    entity_id
    details_json
    created_at
  }

  Organization "1" -- "*" Group : has
  Group "1" -- "*" GroupRole : has
  Role "1" -- "*" GroupRole : assigned
  ProfileGroupRole "*" -- "1" GroupRole : links
  Role "1" -- "*" RolePermission : grants
  Permission "1" -- "*" RolePermission : part_of
  Organization "1" -- "*" AuditLog : logs
```

---

**Legend:**

- `id` is always the primary key for each table.
- Fields ending in `_id` are foreign keys referencing other tables.

---

_This diagram is a living document and should be updated as the data model evolves._
