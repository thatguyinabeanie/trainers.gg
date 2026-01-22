# Pokemon Showdown VGC replay scraping technical guide

**Bottom Line Up Front**: As of June 2025, Pokemon VGC is running Regulation Set I with format name `gen9vgc2025regi` on Pokemon Showdown. The platform provides official JSON APIs for replay access at `{replay-url}.json` with no explicit rate limits but recommends 1-2 second delays. The poke-env Python library is the most mature tool for replay analysis, while thousands of VGC battles generate rich, structured data daily that's legally accessible for research purposes.

Pokemon Showdown has deliberately designed their replay system to be developer-friendly, offering official API endpoints and CORS-enabled access that makes respectful data collection straightforward. The current VGC regulation allows dual restricted legendary Pokemon, creating a diverse and powerful meta that generates substantial replay data across multiple skill levels.

## Current VGC regulation details

The competitive Pokemon scene operates under **Regulation Set I** as of June 2025, which runs from May 1st through August 31st, 2025. This regulation marks a significant shift in the competitive landscape by allowing **two restricted legendary Pokemon** per team - the first dual-restricted format since VGC 2016. The exact Pokemon Showdown format identifier is `gen9vgc2025regi`, following their standardized naming pattern of `gen[generation]vgc[year]reg[letter]`.

The format naming convention remains consistent across all VGC regulations. Previous formats followed the same pattern: `gen9vgc2025regg` for Regulation G, `gen9vgc2024regh` for Regulation H, always using lowercase letters for the regulation identifier. This predictable structure makes it easy to programmatically access replays from different regulation periods.

## Technical implementation for replay access

Pokemon Showdown provides **official JSON API access** by simply appending `.json` to any replay URL. A standard replay URL like `https://replay.pokemonshowdown.com/gen9vgc2025regi-1234567890` becomes accessible as structured data at `https://replay.pokemonshowdown.com/gen9vgc2025regi-1234567890.json`. This deliberate design choice eliminates the need for HTML parsing and indicates the developers expect programmatic access.

The JSON response contains comprehensive battle data including the full battle log, player information, team compositions, and turn-by-turn actions. Additional formats are available: `.log` provides the raw battle log text, while `.inputlog` contains player decision sequences. The search API at `https://replay.pokemonshowdown.com/search.json` supports queries by username, format, and date ranges, returning up to 51 results per page.

For implementation, the recommended approach uses simple HTTP requests with appropriate headers:

```python
import requests
import time

headers = {
    'User-Agent': 'YourApplication/1.0 (contact@example.com)'
}

def get_replay_data(replay_id, delay=1.5):
    time.sleep(delay)  # Rate limiting
    url = f"https://replay.pokemonshowdown.com/{replay_id}.json"
    response = requests.get(url, headers=headers)
    return response.json() if response.status_code == 200 else None
```

## Rate limiting and best practices

While Pokemon Showdown doesn't publish explicit rate limits, the community consensus recommends **1-2 second delays between requests** as a respectful baseline. The platform's developers have stated "Obviously don't scrape it" regarding HTML pages, but simultaneously provide JSON APIs with CORS headers allowing direct browser access - a clear signal that programmatic access through proper channels is expected and supported.

Best practices emerging from the community include implementing exponential backoff for errors, limiting concurrent connections to 3-5 simultaneous requests, and caching data locally to avoid redundant requests. The absence of robots.txt and the provision of official APIs suggest reasonable usage patterns are tolerated, with several popular tools and Chrome extensions for batch downloading operating openly.

## Replay data structure and available information

Each replay contains remarkably detailed battle information structured in a parseable format. The battle log uses pipe-delimited commands that record every action: `|move|p1a: Urshifu|Surging Strikes|p2a: Flutter Mane` shows move usage, while `|-damage|p2a: Flutter Mane|203/349` reveals exact HP values. Team data includes complete Pokemon details - species, abilities, items, moves, natures, and even IV/EV spreads when visible.

The extractable data extends beyond basic battle flow to include damage calculations, speed order determinations, ability activations, weather and terrain changes, and critical hit occurrences. This granular detail enables sophisticated analysis of team compositions, move usage patterns, damage roll distributions, and win condition tracking. The structured format makes it feasible to build comprehensive databases of competitive strategies and meta trends.

## Existing tools and community resources

The **poke-env** library stands out as the most mature and actively maintained tool for Pokemon Showdown interaction. Created by researchers at Ecole Polytechnique, it provides a high-level Python interface for parsing battle states, handling team data, and even training reinforcement learning agents. With over 1,000 GitHub stars and comprehensive documentation, it's become the de facto standard for programmatic Pokemon battle analysis.

Other notable tools include Reportworm for VGC-specific team analysis, PASRS for performance tracking across multiple replays, and various Smogon community parsers. Pikalytics aggregates Showdown ladder statistics into a searchable database, while Smogon publishes monthly usage statistics covering millions of battles. These established tools demonstrate the community's acceptance of data analysis projects and provide validation for respectful scraping practices.

## Volume estimates and scalability considerations

While exact numbers aren't publicly available, multiple indicators suggest VGC formats generate thousands of battles daily. The search API's pagination limit of 51 results per query and the existence of monthly statistical reports covering 10+ million battles across all formats indicate substantial data volume. Storage remains manageable as individual replay JSON files are relatively small, typically under 100KB even for lengthy battles.

The platform's infrastructure handles batch processing well, with established tools successfully downloading hundreds of replays without issues. The directory structure organizing replays by format and date enables targeted data collection for specific regulations or time periods. For large-scale analysis, focusing on specific ELO brackets (1500+, 1630+) can reduce noise while maintaining statistical significance.

## Legal and ethical framework

Pokemon Showdown operates in a legally complex but practically stable position. While using Nintendo's intellectual property, the platform has operated openly for over a decade without legal challenges, suggesting an implicit acceptance of its educational and competitive value. Replay data represents player-generated content built on top of copyrighted material, generally considered transformative use for analytical purposes.

Ethical considerations center on player privacy and respectful resource usage. While replays contain usernames and strategic choices, they're voluntarily shared in public formats. Best practices include anonymizing player data in research datasets, respecting private replay designations, and avoiding individual player tracking over time. The established precedent of academic research using esports data provides additional support for analytical projects that contribute to competitive understanding.

## Conclusion

Pokemon Showdown's replay system offers an unusually accessible and well-structured dataset for competitive gaming analysis. The combination of official API support, detailed battle logging, and an active tool ecosystem creates ideal conditions for VGC replay scraping projects. By following established community practices - using JSON APIs, implementing reasonable delays, and respecting the platform's resources - researchers can access rich competitive data while maintaining positive relationships with the Pokemon Showdown community.
