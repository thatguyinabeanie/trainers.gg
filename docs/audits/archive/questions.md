# questions from claude code

1. Pokemon Data Source 🎮

- Should I implement a Pokemon species database, or will you be integrating with an external API?
  not sure i understand the question. can you elaborate.

- For the team builder, do we need to show Pokemon sprites/images? If so, what's the preferred source?
  yes we should. there is a github repo that has all that. you can search for it.

2. Tournament Priorities 🏆

- What's more important right now:
  - Player Experience: Team submission, registration flow, bracket viewing
  - Organizer Tools: Registration approval, tournament management dashboard, pairing generation
  - Admin Features: Organization management, user roles, permissions

  i think admin features are the most important right now. we need to be able to manage the tournaments, users, and permissions effectively.
  then player experience is next. we need to make sure players can easily register, submit teams, and view brackets. then lastly organizer tools.

3. Design/UX Preferences 🎨

- Are you happy with the current shadcn/ui component style?
  yup. i picked it for that reason.
- Any specific design inspiration or competitor sites I should reference?
  i really like dev.to generally. i like their feed and organizatoin of content. i like battlefy's visual design. and toornament looks good too.
- Should the team builder be drag-and-drop or a simpler select-based interface?
  add this to todo. not a priority right now.

4. Testing & Deployment 🚀

- Do you want me to fix the failing tests first (4 tests failing related to database constraints)?
  yes fix that first
- Are you planning to deploy this soon? Should I prioritize production readiness?
  yes production readiness is important always. this is deployed right now just not publily available.

5. Feature Scope 📋

- The backend supports advanced features like:
  - Tournament templatek
  - Reputation/conduct tracking
  - Real-time updates

Should I focus on basic features first or implement these advanced features in the UI?
do basic first but with a roadmap plan for the advanced features. we can add them later.
j 6. Development Approach 💻

- Would you prefer I:
  - Complete full user flows (e.g., entire tournament experience)
  - Build all basic features first (breadth over depth)
  - Focus on polishing what we have before adding more

breadth over depth right now. we can polish later. i want to get the basic features working first.

7. Permissions Seeding 🔐

- The seed.ts file only seeds 12 basic permissions, but the PERMISSIONS constant defines 50+ permissions. Should I:
  - Update seed.ts to comprehensively seed ALL permissions from the PERMISSIONS constant?
  - Or keep it minimal and let permissions be created as needed via the UI?

My recommendation: seed all permissions to ensure RBAC works properly from the start.

8. Router Authorization Updates 🛡️

- Several routers (teamRouter, pokemonRouter, parts of registrationRouter) use protectedProcedure instead of authorizedProcedure. Should I:
  - Update them all to use proper permission-based authorization?
  - Or leave some operations as "any authenticated user can do this"?

My recommendation: use authorizedProcedure for data modification operations, keep protectedProcedure for viewing own data.
