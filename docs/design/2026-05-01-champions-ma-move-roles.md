# Champions Reg M-A Move-Role Registry

> Generated 2026-05-01 by a one-off classifier script (transient — not committed).
> Move names match `@pkmn/dex` (`Dex.forGen(9)`) — the source of truth for the team builder.

## Source notes

- **In-repo verification (primary source).** `packages/pokemon/src/format-legality.ts` line 725-732 documents that Champions: VGC 2026 Reg M-A has **no format-level move bans** on top of per-species learnsets. This was verified 2026-04-15 via serebii.net/pokemonchampions, the Reg M-A rules page, and serebii.net/pokemonchampions/moves.shtml. The codebase's `CHAMPIONS_MA_MOVE_BANLIST` is an empty `Set`.
- **Move pool = standard Gen 9 movepool, gated by per-species learnsets.** `computeLegalMovesForChampions` (line 833) iterates `Dex.forGen(9).moves.all()`, skips `isNonstandard != null` (except `"Unobtainable"`), and uses `[Gen 9] Anything Goes` as a permissive base validator for `checkCanLearn`. So the universe of moves we classify is *the same* universe @pkmn/dex exposes for Gen 9.
- **Classifier method.** This registry was generated programmatically — every Gen 9 dex move (after the same filter the codebase uses) was bucketed into roles by checking the move's data fields: `target`, `priority`, `multihit`, `weather`, `terrain`, `sideCondition`, `volatileStatus`, `status`, `secondary.status`, `secondary.boosts`, `secondary.volatileStatus`, `boosts`, `self.boosts`, `selfSwitch`, `drain`, `heal`. Hand-curated lists supplement the data-driven buckets where intent isn't expressible as a field check (Disruption — Trick, Knock Off, Defog; Redirection — Follow Me, Rage Powder, Spotlight, Ally Switch; Boost Ally — Helping Hand, Decorate; Pivot — U-turn, Volt Switch, Teleport).
- **Cross-reference confidence.** High for Spread, Priority, Multi-hit, Trick Room, Tailwind, Screens, Protect, Drain, Weather, Terrain, Hazards, Pivot, Sleep, Burn, Paralysis, Poison (these all map cleanly to data fields). Medium for Boost Self / Speed Boost / Speed Drop / Drop Atk / Drop SpA (correctness depends on `target` + sign-of-boost — verified for the common entries; rare moves with edge targets may be miscategorized). Lower for Disruption and Boost Ally (rely heavily on hand-curated lists — see the curated sets in the script).
- **Excluded categories.** `isZ`, `isMax`, `isNonstandard === "CAP"`, and `isNonstandard === "Future"` moves are filtered out upstream (matching `format-legality.ts`). Unobtainable (e.g. event-only) moves are kept because `format-legality.ts` keeps them.
- **Regeneration recipe** (if the role taxonomy changes). Iterate `Dex.forGen(9).moves.all()` from `@pkmn/dex`, apply the same filter `format-legality.ts` uses (`!move.isNonstandard || move.isNonstandard === "Unobtainable"`), then bucket each move using these field rules: `target ∈ {allAdjacent, allAdjacentFoes, foeSide}` → Spread; `priority > 0` (damaging) → Priority; `multihit` set → Multi-hit; `weather` → Weather; `terrain` → Terrain; `sideCondition ∈ {reflect, lightscreen, auroraveil}` → Screens; `sideCondition ∈ {stealthrock, spikes, toxicspikes, stickyweb}` → Hazards; `volatileStatus ∈ {protect, endure, spikyshield, kingsshield, banefulbunker, obstruct, silktrap, burningbulwark}` or `sideCondition ∈ {wideguard, quickguard, matblock, craftyshield}` → Protect; `selfSwitch` → Pivot; `drain` → Drain; `heal` (positive) → Healing; `status === "slp"` or `secondary.status === "slp"` or `volatileStatus === "yawn"` → Sleep; same pattern for `par`/`brn`/`psn|tox` → Paralysis/Burn/Poison; `secondary.volatileStatus === "flinch"` → Flinching; `boosts` (positive, target self/allies) or `self.boosts` or `secondary.self.boosts` → Boost Self; `boosts.spe` (positive self / negative foe) → Speed Boost / Speed Drop; `boosts.atk < 0` (target foe) or `secondary.boosts.atk < 0` → Drop Atk; same for `boosts.spa` → Drop SpA. Then apply curated supplement sets for: Disruption (Trick, Switcheroo, Knock Off, Encore, Taunt, Disable, Defog, Rapid Spin, Court Change, Tidy Up, Whirlwind, Roar, Dragon Tail, Circle Throw, Haze, Clear Smog, Mortal Spin, Trick Room, Block, Mean Look, Spider Web, Fairy Lock, Doodle, Entrainment, Worry Seed, Simple Beam, Skill Swap, Role Play); Redirection (Follow Me, Rage Powder, Spotlight, Ally Switch); Boost Ally (Helping Hand, Coaching, Decorate, Acupressure, After You, Ally Switch, Heal Pulse, Floral Healing, Pollen Puff, Life Dew, Howl, Aromatic Mist, Gear Up, Magnetic Flux, Dragon Cheer); Boost Self (Belly Drum, Tidy Up, Curse, Power Trick); Drop Atk / Drop SpA (Strength Sap, Parting Shot); Drain (Strength Sap, Pain Split). Cross-list Sticky Web → Speed Drop and Toxic Spikes → Poison. Pivot (U-turn, Volt Switch, Flip Turn, Parting Shot, Teleport, Chilly Reception, Baton Pass, Shed Tail) is mostly captured by `selfSwitch` but kept curated as a safety net.

## Roles

### Damage Type → Spread
**id:** `spread`

- Acid
- Air Cutter
- Astral Barrage
- Bleakwind Storm
- Blizzard
- Boomburst
- Breaking Swipe
- Brutal Swing
- Bulldoze
- Burning Jealousy
- Clanging Scales
- Dazzling Gleam
- Diamond Storm
- Disarming Voice
- Discharge
- Dragon Energy
- Earthquake
- Electroweb
- Eruption
- Explosion
- Fiery Wrath
- Glacial Lance
- Glaciate
- Heat Wave
- Hyper Voice
- Icy Wind
- Incinerate
- Lava Plume
- Make It Rain
- Matcha Gotcha
- Misty Explosion
- Mortal Spin
- Muddy Water
- Origin Pulse
- Overdrive
- Parabolic Charge
- Petal Blizzard
- Powder Snow
- Precipice Blades
- Razor Leaf
- Relic Song
- Rock Slide
- Sandsear Storm
- Self-Destruct
- Sludge Wave
- Snarl
- Sparkling Aria
- Springtide Storm
- Struggle Bug
- Surf
- Swift
- Twister
- Water Spout
- Wildbolt Storm

### Damage Type → Priority
**id:** `priority`

- Accelerock
- Aqua Jet
- Bullet Punch
- Extreme Speed
- Fake Out
- Feint
- First Impression
- Ice Shard
- Jet Punch
- Mach Punch
- Quick Attack
- Shadow Sneak
- Sucker Punch
- Thunderclap
- Upper Hand
- Vacuum Wave
- Water Shuriken

### Damage Type → Multi-hit
**id:** `multi-hit`

- Arm Thrust
- Bone Rush
- Bullet Seed
- Double Hit
- Double Kick
- Dragon Darts
- Dual Wingbeat
- Fury Attack
- Fury Swipes
- Icicle Spear
- Pin Missile
- Population Bomb
- Rock Blast
- Scale Shot
- Surging Strikes
- Tachyon Cutter
- Tail Slap
- Triple Axel
- Triple Dive
- Triple Kick
- Twin Beam
- Water Shuriken

### Speed Control → Trick Room
**id:** `trick-room`

- Trick Room

### Speed Control → Tailwind
**id:** `tailwind`

- Tailwind

### Speed Control → Speed Drop
**id:** `speed-drop`

- Bleakwind Storm
- Body Slam
- Bolt Strike
- Bounce
- Bubble Beam
- Bulldoze
- Combat Torque
- Cotton Spore
- Discharge
- Dragon Breath
- Drum Beating
- Electroweb
- Force Palm
- Freeze Shock
- Glaciate
- Glare
- Icy Wind
- Lick
- Low Sweep
- Mud Shot
- Nuzzle
- Pounce
- Rock Tomb
- Scary Face
- Spark
- Sticky Web
- String Shot
- Stun Spore
- Tar Shot
- Thunder
- Thunder Punch
- Thunder Shock
- Thunder Wave
- Thunderbolt
- Toxic Thread
- Volt Tackle
- Wildbolt Storm
- Zap Cannon

### Speed Control → Speed Boost
**id:** `speed-boost`

- Agility
- Ancient Power
- Aqua Step
- Aura Wheel
- Clangorous Soul
- Dragon Dance
- Esper Wing
- Fillet Away
- Flame Charge
- No Retreat
- Quiver Dance
- Rapid Spin
- Rock Polish
- Shell Smash
- Shift Gear
- Trailblaze
- Victory Dance

### Status → Sleep
**id:** `sleep`

- Dark Void
- Hypnosis
- Relic Song
- Sing
- Sleep Powder
- Spore
- Wicked Torque
- Yawn

### Status → Paralysis
**id:** `paralysis`

- Body Slam
- Bolt Strike
- Bounce
- Combat Torque
- Discharge
- Dragon Breath
- Force Palm
- Freeze Shock
- Glare
- Lick
- Nuzzle
- Spark
- Stun Spore
- Thunder
- Thunder Punch
- Thunder Shock
- Thunder Wave
- Thunderbolt
- Volt Tackle
- Wildbolt Storm
- Zap Cannon

### Status → Burn
**id:** `burn`

- Blaze Kick
- Blazing Torque
- Blue Flare
- Ember
- Fire Blast
- Fire Punch
- Flame Wheel
- Flamethrower
- Flare Blitz
- Heat Wave
- Ice Burn
- Infernal Parade
- Inferno
- Lava Plume
- Matcha Gotcha
- Pyro Ball
- Sacred Fire
- Sandsear Storm
- Scald
- Scorching Sands
- Steam Eruption
- Will-O-Wisp

### Status → Poison
**id:** `poison`

- Barb Barrage
- Cross Poison
- Gunk Shot
- Malignant Chain
- Mortal Spin
- Noxious Torque
- Poison Fang
- Poison Gas
- Poison Jab
- Poison Powder
- Poison Sting
- Poison Tail
- Shell Side Arm
- Sludge
- Sludge Bomb
- Sludge Wave
- Smog
- Toxic
- Toxic Spikes
- Toxic Thread

### Stat Changes → Boost Self
**id:** `boost-self`

- Acid Armor
- Agility
- Amnesia
- Ancient Power
- Aqua Step
- Aura Wheel
- Belly Drum
- Bulk Up
- Calm Mind
- Charge
- Charge Beam
- Clangorous Soul
- Coil
- Cosmic Power
- Cotton Guard
- Curse
- Defend Order
- Defense Curl
- Diamond Storm
- Double Team
- Dragon Dance
- Esper Wing
- Fiery Dance
- Fillet Away
- Flame Charge
- Growth
- Harden
- Hone Claws
- Howl
- Iron Defense
- Metal Claw
- Meteor Mash
- Minimize
- Mystical Power
- Nasty Plot
- No Retreat
- Power Trick
- Psyshield Bash
- Quiver Dance
- Rapid Spin
- Rock Polish
- Shell Smash
- Shelter
- Shift Gear
- Steel Wing
- Swords Dance
- Tail Glow
- Tidy Up
- Torch Song
- Trailblaze
- Victory Dance
- Withdraw
- Work Up

### Stat Changes → Boost Ally
**id:** `boost-ally`

- Acupressure
- After You
- Ally Switch
- Aromatic Mist
- Coaching
- Decorate
- Dragon Cheer
- Floral Healing
- Heal Pulse
- Helping Hand
- Howl
- Life Dew
- Magnetic Flux
- Pollen Puff

### Stat Changes → Drop Atk
**id:** `drop-atk`

- Aurora Beam
- Baby-Doll Eyes
- Bitter Malice
- Breaking Swipe
- Charm
- Chilling Water
- Feather Dance
- Growl
- Lunge
- Memento
- Noble Roar
- Parting Shot
- Play Nice
- Play Rough
- Springtide Storm
- Strength Sap
- Tearful Look
- Tickle
- Trop Kick

### Stat Changes → Drop SpA
**id:** `drop-spa`

- Confide
- Eerie Impulse
- Memento
- Mist Ball
- Moonblast
- Mystical Fire
- Noble Roar
- Parting Shot
- Skitter Smack
- Snarl
- Spirit Break
- Struggle Bug
- Tearful Look

### Defensive → Screens
**id:** `screens`

- Aurora Veil
- Light Screen
- Reflect

### Defensive → Protect
**id:** `protect`

- Baneful Bunker
- Burning Bulwark
- Detect
- Endure
- Protect
- Quick Guard
- Silk Trap
- Spiky Shield
- Wide Guard

### Defensive → Healing
**id:** `healing`

- Aqua Ring
- Floral Healing
- Heal Pulse
- Healing Wish
- Ingrain
- Jungle Healing
- Life Dew
- Lunar Dance
- Milk Drink
- Moonlight
- Morning Sun
- Pain Split
- Pollen Puff
- Recover
- Rest
- Roost
- Shore Up
- Slack Off
- Soft-Boiled
- Strength Sap
- Synthesis
- Wish

### Defensive → Drain
**id:** `drain`

- Absorb
- Bitter Blade
- Drain Punch
- Draining Kiss
- Dream Eater
- Giga Drain
- Horn Leech
- Leech Life
- Matcha Gotcha
- Mega Drain
- Pain Split
- Parabolic Charge
- Strength Sap

### Field → Weather
**id:** `weather`

- Chilly Reception
- Rain Dance
- Sandstorm
- Snowscape
- Sunny Day

### Field → Terrain
**id:** `terrain`

- Electric Terrain
- Grassy Terrain
- Misty Terrain
- Psychic Terrain

### Field → Hazards
**id:** `hazards`

- Ceaseless Edge
- Spikes
- Stealth Rock
- Sticky Web
- Stone Axe
- Toxic Spikes

### Utility → Redirection
**id:** `redirection`

- Ally Switch
- Follow Me
- Rage Powder

### Utility → Pivot
**id:** `pivot`

- Baton Pass
- Chilly Reception
- Flip Turn
- Parting Shot
- Shed Tail
- Teleport
- U-turn
- Volt Switch

### Utility → Flinching
**id:** `flinching`

- Air Slash
- Astonish
- Bite
- Dark Pulse
- Dragon Rush
- Extrasensory
- Fake Out
- Fiery Wrath
- Fire Fang
- Headbutt
- Ice Fang
- Icicle Crash
- Iron Head
- Mountain Gale
- Rock Slide
- Sky Attack
- Snore
- Stomp
- Thunder Fang
- Triple Arrows
- Twister
- Upper Hand
- Waterfall
- Zen Headbutt
- Zing Zap

### Utility → Disruption
**id:** `disruption`

- Block
- Circle Throw
- Clear Smog
- Court Change
- Defog
- Disable
- Doodle
- Dragon Tail
- Encore
- Entrainment
- Fairy Lock
- Haze
- Imprison
- Knock Off
- Mean Look
- Mortal Spin
- Rapid Spin
- Roar
- Role Play
- Simple Beam
- Skill Swap
- Switcheroo
- Taunt
- Tidy Up
- Torment
- Trick
- Trick Room
- Whirlwind
- Worry Seed

## Cross-reference: Moves NOT classified

Moves in the Gen 9 dex (with the same filters Champions M-A uses) that didn't fall into any of the 26 strategic roles. These are mostly:

- Generic single-target damaging attacks with no special effect (Tackle, Pound, Vine Whip, Slash, Mega Punch, etc.) — they hit one target and that's it.
- Damaging moves with secondary effects that aren't in our taxonomy (recoil-only moves like Double-Edge, Brave Bird; OHKO moves like Fissure, Sheer Cold; charge-up moves like Solar Beam without secondary boosts; fixed-damage moves like Seismic Toss; counter-class moves like Counter, Mirror Coat; type-changing moves like Conversion; field/scripted moves like Sleep Talk, Snore, Round, Echoed Voice; weather-conditional power moves like Weather Ball; type-set moves; etc.).
- Status moves whose effect doesn't map to our 26 roles (e.g. Substitute, Curse [non-Ghost variant], Belly Drum, Final Gambit, Memento, Healing Wish — though these are partially covered by Boost Self / Healing where applicable).

Full unclassified list (alphabetical):

- Acid Spray
- Acrobatics
- Aerial Ace
- Aeroblast
- Alluring Voice
- Apple Acid
- Aqua Cutter
- Aqua Tail
- Armor Cannon
- Assurance
- Attack Order
- Attract
- Aura Sphere
- Avalanche
- Axe Kick
- Beak Blast
- Beat Up
- Behemoth Bash
- Behemoth Blade
- Belch
- Bind
- Blast Burn
- Blood Moon
- Body Press
- Branch Poke
- Brave Bird
- Brick Break
- Brine
- Bug Bite
- Bug Buzz
- Burn Up
- Celebrate
- Chloroblast
- Close Combat
- Collision Course
- Comeuppance
- Confuse Ray
- Confusion
- Conversion
- Conversion 2
- Copycat
- Corrosive Gas
- Counter
- Covet
- Crabhammer
- Cross Chop
- Crunch
- Crush Claw
- Crush Grip
- Cut
- Darkest Lariat
- Destiny Bond
- Dig
- Dire Claw
- Dive
- Doom Desire
- Double Shock
- Double-Edge
- Draco Meteor
- Dragon Ascent
- Dragon Claw
- Dragon Hammer
- Dragon Pulse
- Drill Peck
- Drill Run
- Dynamax Cannon
- Dynamic Punch
- Earth Power
- Echoed Voice
- Eerie Spell
- Electro Ball
- Electro Drift
- Electro Shot
- Endeavor
- Energy Ball
- Expanding Force
- Facade
- Fairy Wind
- Fake Tears
- False Surrender
- False Swipe
- Fell Stinger
- Fickle Beam
- Final Gambit
- Fire Lash
- Fire Pledge
- Fire Spin
- Fissure
- Flail
- Flash Cannon
- Flatter
- Fleur Cannon
- Fling
- Flower Trick
- Fly
- Flying Press
- Focus Blast
- Focus Energy
- Focus Punch
- Forest's Curse
- Foul Play
- Freeze-Dry
- Freezing Glare
- Frenzy Plant
- Frost Breath
- Fury Cutter
- Fusion Bolt
- Fusion Flare
- Future Sight
- Gastro Acid
- Giga Impact
- Gigaton Hammer
- Glaive Rush
- Grass Knot
- Grass Pledge
- Grassy Glide
- Grav Apple
- Gravity
- Guard Split
- Guard Swap
- Guillotine
- Gust
- Gyro Ball
- Hammer Arm
- Happy Hour
- Hard Press
- Head Smash
- Headlong Rush
- Heal Bell
- Heart Swap
- Heat Crash
- Heavy Slam
- Hex
- High Horsepower
- High Jump Kick
- Hold Back
- Hold Hands
- Horn Attack
- Horn Drill
- Hurricane
- Hydro Cannon
- Hydro Pump
- Hydro Steam
- Hyper Beam
- Hyper Drill
- Hyperspace Fury
- Hyperspace Hole
- Ice Beam
- Ice Hammer
- Ice Punch
- Ice Spinner
- Infestation
- Instruct
- Iron Tail
- Ivy Cudgel
- Jaw Lock
- Judgment
- Kowtow Cleave
- Lash Out
- Last Resort
- Last Respects
- Leaf Blade
- Leaf Storm
- Leafage
- Leech Seed
- Leer
- Liquidation
- Lock-On
- Low Kick
- Lumina Crash
- Lunar Blessing
- Luster Purge
- Magic Powder
- Magic Room
- Magical Leaf
- Magical Torque
- Magma Storm
- Magnet Rise
- Mega Kick
- Mega Punch
- Megahorn
- Metal Burst
- Metal Sound
- Meteor Beam
- Metronome
- Mighty Cleave
- Mimic
- Mirror Coat
- Mist
- Moongeist Beam
- Mud-Slap
- Night Daze
- Night Shade
- Night Slash
- Order Up
- Outrage
- Overheat
- Pay Day
- Payback
- Peck
- Perish Song
- Petal Dance
- Phantom Force
- Photon Geyser
- Pluck
- Poltergeist
- Pound
- Power Gem
- Power Shift
- Power Split
- Power Swap
- Power Trip
- Power Whip
- Present
- Prismatic Laser
- Psybeam
- Psyblade
- Psych Up
- Psychic
- Psychic Fangs
- Psychic Noise
- Psycho Boost
- Psycho Cut
- Psyshock
- Psystrike
- Quash
- Rage Fist
- Raging Bull
- Raging Fury
- Razor Shell
- Recycle
- Reflect Type
- Retaliate
- Revelation Dance
- Reversal
- Rising Voltage
- Roar of Time
- Rock Smash
- Rock Throw
- Rock Wrecker
- Rollout
- Round
- Ruination
- Sacred Sword
- Safeguard
- Salt Cure
- Sand Attack
- Sand Tomb
- Scratch
- Screech
- Secret Sword
- Seed Bomb
- Seed Flare
- Seismic Toss
- Shadow Ball
- Shadow Claw
- Shadow Force
- Shadow Punch
- Sheer Cold
- Shock Wave
- Sketch
- Slam
- Slash
- Sleep Talk
- Smack Down
- Smart Strike
- Smokescreen
- Snipe Shot
- Soak
- Solar Beam
- Solar Blade
- Spacial Rend
- Speed Swap
- Spicy Extract
- Spin Out
- Spirit Shackle
- Spit Up
- Spite
- Splash
- Steel Beam
- Steel Roller
- Stockpile
- Stomping Tantrum
- Stone Edge
- Stored Power
- Strange Steam
- Strength
- Struggle
- Stuff Cheeks
- Substitute
- Sunsteel Strike
- Super Fang
- Supercell Slam
- Superpower
- Supersonic
- Swagger
- Swallow
- Sweet Kiss
- Sweet Scent
- Syrup Bomb
- Tackle
- Tail Whip
- Take Down
- Take Heart
- Teatime
- Teeter Dance
- Temper Flare
- Tera Blast
- Tera Starstorm
- Terrain Pulse
- Thief
- Thrash
- Throat Chop
- Thunder Cage
- Thunderous Kick
- Topsy-Turvy
- Transform
- Tri Attack
- Uproar
- V-create
- Venoshock
- Vine Whip
- Vise Grip
- Water Gun
- Water Pledge
- Water Pulse
- Wave Crash
- Weather Ball
- Whirlpool
- Wicked Blow
- Wild Charge
- Wing Attack
- Wonder Room
- Wood Hammer
- Wrap
- X-Scissor

## Cross-reference: Moves we deliberately excluded

- **Z-moves** (`isZ`) — not legal in Reg M-A; Mega Evolution is the format's gimmick.
- **Max moves** (`isMax`) — Dynamax/Gigantamax are not in Champions.
- **CAP moves** (`isNonstandard === "CAP"`) — Smogon-only fan-made moves.
- **Future moves** (`isNonstandard === "Future"`) — moves that exist in the @pkmn/dex but aren't released in any obtainable form.
- All other `isNonstandard` values (e.g. `"Past"`) — already filtered out by `computeLegalMovesForChampions`.

## Bucket counts (sanity check)

- **Damage Type → Spread** — 54 moves
- **Damage Type → Priority** — 17 moves
- **Damage Type → Multi-hit** — 22 moves
- **Speed Control → Trick Room** — 1 moves
- **Speed Control → Tailwind** — 1 moves
- **Speed Control → Speed Drop** — 38 moves (+ Sticky Web, hand-cross-listed from Hazards per task taxonomy)
- **Speed Control → Speed Boost** — 17 moves
- **Status → Sleep** — 8 moves
- **Status → Paralysis** — 21 moves
- **Status → Burn** — 22 moves
- **Status → Poison** — 20 moves (+ Toxic Spikes, hand-cross-listed from Hazards per task taxonomy)
- **Stat Changes → Boost Self** — 53 moves
- **Stat Changes → Boost Ally** — 14 moves
- **Stat Changes → Drop Atk** — 19 moves
- **Stat Changes → Drop SpA** — 13 moves
- **Defensive → Screens** — 3 moves
- **Defensive → Protect** — 9 moves
- **Defensive → Healing** — 22 moves
- **Defensive → Drain** — 13 moves
- **Field → Weather** — 5 moves
- **Field → Terrain** — 4 moves
- **Field → Hazards** — 6 moves
- **Utility → Redirection** — 3 moves
- **Utility → Pivot** — 9 moves
- **Utility → Flinching** — 25 moves
- **Utility → Disruption** — 29 moves
- **Unclassified (cross-reference)** — 336 moves
- **Total moves classified at least once** — 361 moves
- **Total moves considered (Gen 9 filtered)** — 697 moves
