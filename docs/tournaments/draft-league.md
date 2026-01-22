---
title: Pokémon Draft League Support
---

# 🏆 Pokémon Draft League Support

## TL;DR

- Pokémon Draft Leagues are competitive formats where players draft unique Pokémon teams and compete in a structured league.
- This document outlines how to support draft leagues in Battle Stadium, including data models and an MVP checklist.

---

## 1. What is a Pokémon Draft League?

- **Definition:** A competitive format where each player drafts a unique roster of Pokémon (no duplicates across teams), then competes in a league or tournament.
- **Key Elements:**
  - Draft phase (snake or auction style)
  - Team management (rosters, trades, free agency)
  - Scheduled matches
  - Match reporting (results, replays, stats)
  - Standings and playoffs

**References:**

- [Smogon Draft League Guide](https://www.smogon.com/forums/threads/draft-league-101.3668321/)
- [Draft League Hub](https://www.draftleague.nl/)
- [Reddit: r/draftleague](https://www.reddit.com/r/draftleague/)

---

## 2. Proposed Data Model / Schema

### Entities

- **League**
  - id
  - name
  - format (e.g., singles, doubles)
  - rules (custom rules, bans, etc.)
  - schedule (start/end dates)
  - owner (user/org)
  - participants (list of users/teams)

- **Draft**
  - id
  - league_id
  - draft_type (snake, auction, etc.)
  - draft_order (array of user/team ids)
  - picks (array of {round, pick_number, user_id, pokemon_id, timestamp})
  - status (pending, active, complete)

- **Team**
  - id
  - league_id
  - coach (user_id)
  - roster (array of pokemon_ids)
  - transactions (trades, pickups)

- **Match**
  - id
  - league_id
  - week/round
  - team1_id
  - team2_id
  - scheduled_date
  - result (win/loss/tie, score)
  - replay_url
  - stats (optional: Pokémon usage, KOs, etc.)

- **Pokémon Pool**
  - league_id
  - available_pokemon (array of pokemon_ids)
  - tiering/points (optional)

### Relationships

- A League has many Teams, Matches, and one Draft.
- Each Team belongs to a League and has a roster of Pokémon.
- Each Match is between two Teams in a League.
- The Draft is associated with a League and records all picks.

---

## 3. MVP Implementation Checklist

### League & Team Management

- [ ] Create/join league
- [ ] Invite/manage participants
- [ ] Team creation and roster management

### Draft Process

- [ ] Draft room UI (live or async)
- [ ] Enforce draft order and pick rules
- [ ] Update team rosters as picks are made
- [ ] Lock drafted Pokémon (no duplicates)

### Scheduling & Matches

- [ ] Auto-generate or manually set match schedule
- [ ] Match reporting form (results, replays)
- [ ] Standings table (W/L, points, etc.)

### Admin & Moderation

- [ ] League admin tools (edit settings, resolve disputes)
- [ ] Trade/transaction approval (optional)

### Data & Integration

- [ ] Pokémon data integration (e.g., PokéAPI)
- [ ] Store league, draft, team, and match data

---

## 4. Open Questions / Next Steps

- Which draft formats to support? (Snake, auction, custom)
- Real-time vs. asynchronous drafting?
- Level of stats tracking needed?
- Integration with external Pokémon data sources?

---

## 5. Resources

- [Smogon Draft League 101](https://www.smogon.com/forums/threads/draft-league-101.3668321/)
- [PokéAPI](https://pokeapi.co/)
- [Draft League Hub](https://www.draftleague.nl/)
- [Showdown! Replays](https://replay.pokemonshowdown.com/)
