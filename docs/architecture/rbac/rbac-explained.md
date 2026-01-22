---
Obsidian-compatible: All internal links use [[WikiLinks]]
---

# RBAC Explained

This document explains how the groups, roles, and permissions system (Role-Based Access Control, or RBAC) works in Battle Stadium. It is designed to be accessible for anyone new to the concept.

---

## 1. The Problem: Who Can Do What?

In a tournament platform, you need to control:

- Who can create tournaments?
- Who can enter results?
- Who can drop players?
- Who can view analytics?
- ...and so on.

Assigning every permission to every user individually would be a nightmare to manage!

---

## 2. The Solution: Role-Based Access Control (RBAC)

### A. Permissions

- **Definition:** A permission is a single, specific action a user can take.
- **Examples:**
  - `create_tournament`
  - `enter_results`
  - `drop_player`
  - `view_analytics`

### B. Roles

- **Definition:** A role is a named collection of permissions.
- **Examples:**
  - **Admin:** Can do everything.
  - **Judge:** Can enter results, issue penalties.
  - **Player:** Can register for tournaments, upload teams.
- **How it works:** Assigning a role to a user gives them all the permissions bundled in that role.

### C. Groups

- **Definition:** A group is a collection of users within an organization, often representing a department or function (e.g., "Judges", "Staff", "Players").
- **Purpose:** Makes it easier to assign roles to many users at once. For example, everyone in the "Judges" group might get the "Judge" role.

---

## 3. How It Works in Battle Stadium

### Step-by-Step Example

1. **Define Permissions:**
   - `create_tournament`, `edit_tournament`, `enter_results`, `drop_player`, etc.
2. **Define Roles:**
   - **Admin:** All permissions.
   - **Judge:** `enter_results`, `issue_penalty`.
   - **Player:** `register_tournament`, `upload_team`.
3. **Assign Roles to Groups:**
   - The "Judges" group gets the "Judge" role.
   - The "Admins" group gets the "Admin" role.
4. **Add Users to Groups:**
   - Alice is added to the "Judges" group.
   - Bob is added to the "Admins" group.
5. **Result:**
   - Alice can enter results and issue penalties (because she's a Judge).
   - Bob can do everything (because he's an Admin).

---

## 4. Why Use Groups?

- **Scalability:** Assign roles to groups, not individuals. When someone joins/leaves a group, their permissions update automatically.
- **Clarity:** Easy to see who can do what by looking at group memberships and roles.

---

## 5. How It's Modeled in the Database

- **User** is linked to **PlayerProfile**.
- **PlayerProfile** can be assigned to one or more **Groups**.
- **Groups** have **Roles**.
- **Roles** are linked to **Permissions**.
- When a user acts, the system checks their group memberships, roles, and permissions to decide if they're allowed to do something.

---

## 6. Summary Table

| Entity       | What is it?                 | Example         |
| ------------ | --------------------------- | --------------- |
| Permission   | A single action             | `enter_results` |
| Role         | A bundle of permissions     | `Judge`         |
| Group        | A set of users in an org    | `Judges`        |
| User/Profile | The person using the system | Alice, Bob      |

---

## 7. In Short

- **Permissions** = "What can be done"
- **Roles** = "A named set of permissions"
- **Groups** = "A set of people who get certain roles"
- **Users/Profiles** = "People who are in groups and get roles (and thus permissions)"

---

_If you want a real-world analogy or a visual, see the main architecture diagram or ask for a custom example!_
