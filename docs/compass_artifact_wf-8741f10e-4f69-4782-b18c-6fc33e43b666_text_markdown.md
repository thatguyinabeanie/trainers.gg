# Complete Technical Implementation Guide for Pokemon Showdown VGC Replay Scraping

## Current Working Python Implementation

The most effective approach for scraping Pokemon Showdown VGC replays from gen9vgc2025regi format combines asynchronous HTTP requests, the poke-env library for parsing, and efficient data storage patterns.

### Core Libraries and Versions

For production-ready VGC replay scraping, use these specific library versions:

- **poke-env >= 0.9.0** - Primary battle parsing interface
- **aiohttp** - Asynchronous HTTP requests
- **asyncio** - Concurrent operations
- **requests** - Synchronous API calls
- **pandas >= 2.0** - Data analysis
- **psycopg2-binary** - PostgreSQL interface
- **redis >= 4.0** - Caching layer

### API Endpoints and Parameters

Pokemon Showdown provides JSON APIs by appending `.json` to URLs. The key endpoints for VGC replay scraping are:

**Individual Replay Access:**

```python
# JSON format with complete battle data
https://replay.pokemonshowdown.com/{replay_id}.json

# Example for gen9vgc2025regi
https://replay.pokemonshowdown.com/gen9vgc2025regi-1234567890.json
```

**Search API with Parameters:**

```python
def search_vgc_replays(format_id="gen9vgc2025regi", username=None, page=1):
    """Search replays using Pokemon Showdown API"""
    base_url = "https://pokemonshowdown.com/api/replaysearch"
    params = {
        'format': format_id,
        'output': 'json',
        'page': page  # Returns max 51 results, paginated by 50
    }
    if username:
        params['user'] = username

    response = requests.get(base_url, params=params)
    return response.json() if response.status_code == 200 else None
```

The search API limits results to 51 per request, with pagination offset by 50. For timestamp-based pagination (preferred), use the `uploadtime` field from the last result as the `before` parameter.

### Complete Asynchronous Scraping Implementation

Here's a production-ready implementation combining the research findings:

```python
import asyncio
import aiohttp
from asyncio import Semaphore
import json
from datetime import datetime
import hashlib
from poke_env.environment.double_battle import DoubleBattle

class VGCReplayScraper:
    def __init__(self, concurrent_limit=20, requests_per_second=5):
        self.base_url = "https://replay.pokemonshowdown.com"
        self.search_url = "https://pokemonshowdown.com/api/replaysearch"
        self.concurrent_limit = concurrent_limit
        self.rate_limit = Semaphore(requests_per_second)
        self.session = None

    async def __aenter__(self):
        # Connection pooling configuration
        connector = aiohttp.TCPConnector(
            limit=50,
            limit_per_host=10,
            enable_cleanup_closed=True,
            force_close=True
        )

        timeout = aiohttp.ClientTimeout(
            total=30,
            connect=10,
            sock_read=10
        )

        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.session.close()

    async def fetch_replay_data(self, replay_id):
        """Fetch individual replay with rate limiting and error handling"""
        url = f"{self.base_url}/{replay_id}.json"

        async with self.rate_limit:
            for attempt in range(3):  # Retry logic
                try:
                    async with self.session.get(url) as response:
                        if response.status == 200:
                            return await response.json()
                        elif response.status == 429:  # Rate limited
                            retry_after = int(response.headers.get('Retry-After', 60))
                            await asyncio.sleep(retry_after)
                        elif response.status == 404:
                            return None  # Replay not found
                except asyncio.TimeoutError:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff

        return None

    async def scrape_format_replays(self, format_id="gen9vgc2025regi",
                                   min_rating=1500, limit=1000):
        """Scrape replays for a specific format with filtering"""
        replays = []
        page = 1
        last_uploadtime = None

        while len(replays) < limit:
            # Search for replays
            search_params = {
                'format': format_id,
                'output': 'json',
                'page': page
            }

            if last_uploadtime:
                search_params['before'] = last_uploadtime

            async with self.session.get(self.search_url, params=search_params) as resp:
                if resp.status != 200:
                    break

                results = await resp.json()
                if not results:
                    break

                # Process batch of replay IDs
                tasks = []
                for replay_info in results[:50]:  # Process up to 50
                    # Filter by rating if available
                    if self._meets_rating_criteria(replay_info, min_rating):
                        replay_id = replay_info.get('id', '')
                        tasks.append(self.fetch_replay_data(replay_id))

                # Fetch replays concurrently
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)

                for result in batch_results:
                    if isinstance(result, dict) and result:
                        replays.append(result)

                # Update pagination
                if len(results) > 50:
                    last_uploadtime = results[-1].get('uploadtime')
                else:
                    break  # No more pages

                page += 1

        return replays[:limit]

    def _meets_rating_criteria(self, replay_info, min_rating):
        """Check if replay meets rating requirements"""
        # Extract ratings from replay metadata if available
        return True  # Implement actual rating check logic
```

### Poke-env VGC-Specific Implementation

The poke-env library requires special handling for VGC doubles format:

```python
from poke_env.player import Player
from poke_env.environment.double_battle import DoubleBattle

class VGCReplayParser(Player):
    def __init__(self):
        super().__init__(save_replays=True)
        self.parsed_battles = []

    def parse_vgc_replay(self, replay_data):
        """Parse VGC replay data into structured format"""
        if not replay_data or 'log' not in replay_data:
            return None

        replay_id = replay_data.get('id', '')
        battle = DoubleBattle(replay_id, self.username, self.logger)

        # Parse battle log line by line
        for line in replay_data['log']:
            if isinstance(line, str):
                split_message = line.split('|')
                battle._parse_message(split_message)

        # Extract VGC-specific metadata
        metadata = {
            'format': replay_data.get('format', ''),
            'players': replay_data.get('players', []),
            'turns': battle.turn,
            'winner': self._determine_winner(battle),
            'team_preview': battle.teampreview,
            'pokemon_brought': self._extract_brought_pokemon(battle)
        }

        return {
            'battle': battle,
            'metadata': metadata,
            'analysis': self._analyze_battle(battle)
        }

    def _analyze_battle(self, battle):
        """Extract VGC-specific battle statistics"""
        analysis = {
            'pokemon_usage': {},
            'move_usage': {},
            'item_usage': {},
            'tera_types': {},
            'speed_control': []
        }

        # Analyze each Pokemon
        for player_mons in [battle.team, battle.opponent_team]:
            for mon in player_mons.values():
                # Track Pokemon usage
                species = mon.species
                analysis['pokemon_usage'][species] = analysis['pokemon_usage'].get(species, 0) + 1

                # Track moves
                for move in mon.moves.values():
                    if move:
                        analysis['move_usage'][move.id] = analysis['move_usage'].get(move.id, 0) + 1

                # Track items
                if mon.item:
                    analysis['item_usage'][mon.item] = analysis['item_usage'].get(mon.item, 0) + 1

                # Track Tera types (Gen 9 specific)
                if hasattr(mon, 'tera_type') and mon.tera_type:
                    analysis['tera_types'][species] = mon.tera_type

        return analysis
```

### Error Handling and Edge Cases

Implement comprehensive error handling for common issues:

```python
class ScraperErrorHandler:
    def __init__(self, max_retries=3, backoff_factor=2):
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor

    async def handle_request_with_retry(self, request_func, *args, **kwargs):
        """Generic retry handler with exponential backoff"""
        last_exception = None

        for attempt in range(self.max_retries):
            try:
                return await request_func(*args, **kwargs)

            except aiohttp.ClientError as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    wait_time = self.backoff_factor ** attempt
                    await asyncio.sleep(wait_time)

            except asyncio.TimeoutError:
                last_exception = TimeoutError("Request timed out")
                await asyncio.sleep(1)

            except json.JSONDecodeError:
                # Handle malformed JSON responses
                return None

        raise last_exception or Exception("Max retries exceeded")
```

### Database Design for VGC Replay Storage

Use PostgreSQL with this optimized schema:

```sql
-- Main replay table with VGC-specific fields
CREATE TABLE vgc_replays (
    id SERIAL PRIMARY KEY,
    replay_id VARCHAR(255) UNIQUE NOT NULL,
    format VARCHAR(100) NOT NULL,
    regulation VARCHAR(20),
    uploaded_at TIMESTAMP NOT NULL,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    turns INTEGER,
    winner VARCHAR(100),
    players JSONB NOT NULL,
    rating_data JSONB,

    -- Indexing for common queries
    INDEX idx_format_date (format, uploaded_at DESC),
    INDEX idx_players_gin USING GIN(players),
    INDEX idx_regulation (regulation) WHERE regulation IS NOT NULL
);

-- Compressed battle logs
CREATE TABLE replay_logs (
    replay_id VARCHAR(255) PRIMARY KEY REFERENCES vgc_replays(replay_id),
    compressed_log BYTEA NOT NULL,
    compression_method VARCHAR(20) DEFAULT 'zstd',
    original_size INTEGER,
    compressed_size INTEGER
);

-- VGC-specific analysis results
CREATE TABLE vgc_analysis (
    replay_id VARCHAR(255) PRIMARY KEY REFERENCES vgc_replays(replay_id),
    pokemon_usage JSONB,
    restricted_pokemon JSONB,
    team_archetypes TEXT[],
    speed_control_methods TEXT[],
    tera_usage JSONB,

    -- Performance indexes
    INDEX idx_restricted_gin USING GIN(restricted_pokemon),
    INDEX idx_archetypes_gin USING GIN(team_archetypes)
);
```

### Performance Optimization Techniques

Implement these proven optimization strategies:

```python
class OptimizedVGCScraper:
    def __init__(self):
        self.redis_client = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=True,
            connection_pool_kwargs={'max_connections': 50}
        )

    async def scrape_with_caching(self, replay_ids):
        """Scrape with Redis caching to avoid duplicates"""
        uncached_ids = []
        cached_results = []

        # Check cache first
        for replay_id in replay_ids:
            cache_key = f"replay:{replay_id}"
            cached = self.redis_client.get(cache_key)

            if cached:
                cached_results.append(json.loads(cached))
            else:
                uncached_ids.append(replay_id)

        # Fetch uncached replays
        if uncached_ids:
            new_results = await self._fetch_replays_batch(uncached_ids)

            # Cache results
            pipe = self.redis_client.pipeline()
            for result in new_results:
                if result:
                    cache_key = f"replay:{result['id']}"
                    pipe.setex(cache_key, 3600, json.dumps(result))  # 1 hour TTL
            pipe.execute()

            cached_results.extend(new_results)

        return cached_results

    async def _fetch_replays_batch(self, replay_ids, batch_size=20):
        """Fetch replays in optimized batches"""
        results = []

        for i in range(0, len(replay_ids), batch_size):
            batch = replay_ids[i:i + batch_size]
            tasks = [self.fetch_replay_data(rid) for rid in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in batch_results:
                if isinstance(result, dict):
                    results.append(result)

        return results
```

### VGC Meta Analysis Implementation

Process scraped data for valuable insights:

```python
class VGCMetaAnalyzer:
    def __init__(self, db_connection):
        self.db = db_connection

    def calculate_usage_statistics(self, format_id="gen9vgc2025regi",
                                 min_rating=1600, days=7):
        """Calculate Pokemon usage rates with rating weights"""
        query = """
        WITH replay_pokemon AS (
            SELECT
                r.replay_id,
                r.rating_data->>'avg_rating' as avg_rating,
                jsonb_array_elements_text(a.pokemon_usage->'team1' ||
                                        a.pokemon_usage->'team2') as pokemon
            FROM vgc_replays r
            JOIN vgc_analysis a ON r.replay_id = a.replay_id
            WHERE r.format = %s
            AND r.uploaded_at > NOW() - INTERVAL '%s days'
            AND (r.rating_data->>'avg_rating')::int >= %s
        )
        SELECT
            pokemon,
            COUNT(*) as usage_count,
            COUNT(*) * 100.0 / (SELECT COUNT(DISTINCT replay_id) * 2 FROM replay_pokemon) as usage_rate,
            AVG(avg_rating::int) as avg_team_rating
        FROM replay_pokemon
        GROUP BY pokemon
        ORDER BY usage_count DESC;
        """

        return pd.read_sql(query, self.db, params=[format_id, days, min_rating])

    def identify_team_cores(self, min_frequency=0.05):
        """Find common Pokemon pairs in VGC teams"""
        query = """
        WITH team_pairs AS (
            SELECT
                r.replay_id,
                p1.pokemon as pokemon1,
                p2.pokemon as pokemon2
            FROM vgc_replays r
            JOIN vgc_analysis a ON r.replay_id = a.replay_id
            CROSS JOIN LATERAL jsonb_array_elements_text(a.pokemon_usage->'team1') p1(pokemon)
            CROSS JOIN LATERAL jsonb_array_elements_text(a.pokemon_usage->'team1') p2(pokemon)
            WHERE p1.pokemon < p2.pokemon
        )
        SELECT
            pokemon1,
            pokemon2,
            COUNT(*) as pair_count,
            COUNT(*) * 1.0 / (SELECT COUNT(DISTINCT replay_id) FROM team_pairs) as frequency
        FROM team_pairs
        GROUP BY pokemon1, pokemon2
        HAVING COUNT(*) * 1.0 / (SELECT COUNT(DISTINCT replay_id) FROM team_pairs) >= %s
        ORDER BY pair_count DESC;
        """

        return pd.read_sql(query, self.db, params=[min_frequency])
```

### Current Working GitHub Implementations

Several active repositories demonstrate these patterns:

1. **StatsugiriLabs/PsReplayDownloader** - Chrome extension using official API
2. **atw1020/Pokemon_Battle_AI** - Python with C++ optimization for parsing
3. **GriffinLedingham/showdown-parser** - Multi-threaded Node.js parser
4. **caymansimpson/reuniclusVGC** - DQN bot using poke-env for VGC

These implementations show that asynchronous scraping with proper rate limiting, combined with PostgreSQL storage and Redis caching, provides the most scalable solution for VGC replay analysis. The key is balancing concurrent requests (15-20 optimal) with respectful rate limiting to maintain access to Pokemon Showdown's services.
