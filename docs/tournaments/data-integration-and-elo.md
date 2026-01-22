---
title: Tournament Data Integration & ELO Systems
---

# 📊 Tournament Data Integration & ELO Systems

## TL;DR

- Integrate data from official sources (e.g., RK9 Labs) and community tools (e.g., Top Cut Explorer) to include all players, not just top performers.
- Build a comprehensive, inclusive player database and ranking system.
- Develop ELO-based ranking systems for both online and live tournaments.

---

## 1. Data Sources & Integration

### A. RK9 Labs

- **What:** Official platform for live Pokémon tournament registration, pairings, and results.
- **Why:** Contains the most complete, authoritative data for live events.
- **Goal:** Pull in _all_ player data (not just top cut), including match results, standings, and participation history.
- **Reference:** [RK9 Labs](https://rk9.gg/)

### B. Top Cut Explorer

- **What:** Community tool that compiles top cut data from major tournaments ([see example](https://cut-explorer.stalruth.dev/)).
- **Why:** Useful for historical data and event summaries, but currently only includes top performers.
- **Goal:** Expand beyond top cut—include every participant and match result.
- **Reference:** [VGC Top Cut Explorer](https://cut-explorer.stalruth.dev/)

### C. Other Sources

- **Pokémon Showdown:** For online tournaments and ladder data.
- **Manual Uploads:** For smaller or custom events.

---

## 2. Inclusive Player Database

- **No Discrimination:** Every player, every match, every result is included—regardless of performance.
- **Player Profiles:** Track participation, match history, teams used, and results for all players.
- **Privacy:** Allow players to claim profiles, manage visibility, and opt out if desired.

---

## 3. ELO Ranking Systems

### A. Online Tournaments

- **Separate ELO:** Track online events (e.g., Showdown, in-house tournaments) with their own ELO system.
- **Features:**
  - ELO updates after every match
  - Public leaderboards
  - Decay/inactivity handling

### B. Live Tournaments (RK9 Data)

- **Official ELO:** Use RK9 data to calculate ELO for live, in-person events.
- **Features:**
  - ELO updates after each official match
  - Regional/national leaderboards
  - Integration with event standings

### C. Customization

- **Multiple Formats:** Support ELO for VGC, singles, draft, and other formats.
- **Transparency:** Publish ELO calculation method and allow community feedback.

---

## 4. MVP Implementation Checklist

- [ ] Integrate RK9 API or data exports (all players, all matches)
- [ ] Ingest Top Cut Explorer and similar data sources
- [ ] Build player profile system (with privacy controls)
- [ ] Implement ELO calculation for online tournaments
- [ ] Implement ELO calculation for live tournaments (RK9)
- [ ] Create public leaderboards and player stats pages
- [ ] Allow manual event uploads for unsupported formats
- [ ] Document data sources and update policies

---

## 5. Open Questions / Next Steps

- What is the best way to access RK9 data (API, scraping, manual exports)?
- How to handle privacy and opt-out requests?
- How to merge duplicate player identities across sources?
- What ELO formula to use (standard, Glicko, custom)?
- How to handle team events or multi-format tournaments?

---

## 6. Resources

- [RK9 Labs](https://rk9.gg/)
- [VGC Top Cut Explorer](https://cut-explorer.stalruth.dev/)
- [Pokémon Showdown](https://pokemonshowdown.com/)
- [Smogon ELO Explanation](https://www.smogon.com/forums/threads/ladder-elo-implementation.3508016/)

---

## 7. PTLadder-Style Features & Advanced Stats

### A. Glicko & GXE Ratings

- **Glicko:** An alternative to ELO, Glicko adds a ratings deviation (RD) to measure confidence in a player's rating. Lower RD means more certainty. [Learn more about Glicko](https://www.glicko.net/glicko.html)
- **GXE (Glicko X-act Estimate):** Used by Pokémon Showdown, GXE estimates a player's probability of winning against a random opponent. [See X-Act's post](https://www.smogon.com/forums/threads/ladder-elo-implementation.3508016/)
- **Plan:** Offer both ELO and Glicko/GXE ratings for players, with clear explanations and stats pages.

### B. Player Identity & Merging

- **Problem:** Players may appear under multiple names or share names with others (as seen on PTLadder and RK9).
- **Solution:**
  - Allow players to claim and merge profiles (with admin review).
  - Use additional data (country, team, event history) to help disambiguate identities.
  - Provide a way to report and resolve mistaken merges.

### C. Advanced Stats & Player Pages

- **Tournament Performance:** Track not just wins, but Day 2s, top cuts, and other milestones.
- **Winrate Analysis:** Show winrates vs. top players, by round, and by event stage.
- **Streaks:** Longest win streaks, top cut streaks, etc.
- **Biggest Upset:** Highlight matches where a player defeated a much higher-rated opponent.
- **Country Flags:** Scrape and display country data from RK9 when available.

### D. Transparency & Community Feedback

- **Open FAQ:** Like PTLadder, maintain a public FAQ explaining rating systems, data sources, and how to resolve issues.
- **Support:** Provide clear channels for players to request merges, report issues, or suggest features.

**Reference:** [PTLadder FAQ](https://ptladder.bennbuild.io/faq)

---

## 8. Technical Breakdown: Implementing Glicko/GXE Alongside ELO

> **Note:** This section is for future technical reference and not for immediate implementation.

### A. ELO System

- **Formula:**
  - New Rating = Old Rating + K × (Actual Score − Expected Score)
  - Expected Score = 1 / (1 + 10^((Opponent Rating − Player Rating)/400))
  - K-factor: Start high (e.g., 100), then reduce (e.g., 32) after initial games (as in PTLadder)
- **Update Steps:**
  1. Calculate expected score for both players
  2. Update both ratings after each match
  3. Optionally, handle rating decay for inactivity

### B. Glicko System

- **Key Concepts:**
  - Each player has a rating (R), a rating deviation (RD), and a volatility (σ)
  - Lower RD = more confidence in rating
- **Update Steps:**
  1. Convert ratings to Glicko scale (multiply by 173.7178 and add 1500)
  2. For each match, calculate expected outcome and update R, RD, and σ
  3. After all matches in a rating period, recalculate RD and R
  4. Convert back to standard scale for display
- **References:**
  - [Glicko System Details](https://www.glicko.net/glicko.html)
  - [Glicko-2 System](https://www.glicko.net/glicko.html)

### C. GXE (Glicko X-act Estimate)

- **What:** Probability of beating a random opponent, derived from Glicko rating and RD
- **Formula:**
  - GXE = 1 / (1 + 10^((Opponent Rating − Player Rating)/400)), adjusted for RD
  - See [X-Act's post](https://www.smogon.com/forums/threads/ladder-elo-implementation.3508016/) for details
- **Display:**
  - Only show GXE if RD < 100 (as in Showdown/PTLadder)

### D. Integration Notes

- Store ELO, Glicko, RD, and GXE for each player
- Allow users to view both ELO and Glicko/GXE on their profile
- Use ELO for simple leaderboards, Glicko/GXE for advanced stats
- Document formulas and update logic for transparency

---
