/**
 * 15 minimal valid Showdown-format teams for tournament simulation.
 * Each team has 6 Pokemon with enough data to pass parseAndValidateTeam.
 * Competitive viability is not a concern — these just need to be structurally valid.
 */
export const SAMPLE_TEAMS: string[] = [
  // Team 1: Electric/Fire
  `Pikachu
Ability: Static
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Thunderbolt
- Volt Switch
- Surf
- Protect

Charizard
Ability: Blaze
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Flamethrower
- Air Slash
- Dragon Pulse
- Protect

Gyarados
Ability: Intimidate
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Waterfall
- Bounce
- Earthquake
- Protect

Garchomp
Ability: Rough Skin
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Earthquake
- Dragon Claw
- Rock Slide
- Protect

Togekiss
Ability: Serene Grace
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Air Slash
- Dazzling Gleam
- Follow Me
- Protect

Ferrothorn
Ability: Iron Barbs
Level: 50
EVs: 252 HP / 252 Def / 4 SpD
Relaxed Nature
IVs: 0 Spe
- Gyro Ball
- Power Whip
- Leech Seed
- Protect`,

  // Team 2: Water/Grass
  `Blastoise
Ability: Torrent
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Water Spout
- Ice Beam
- Dark Pulse
- Protect

Venusaur
Ability: Overgrow
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Sludge Bomb
- Giga Drain
- Sleep Powder
- Protect

Arcanine
Ability: Intimidate
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Flare Blitz
- Wild Charge
- Extreme Speed
- Protect

Tyranitar
Ability: Sand Stream
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Rock Slide
- Crunch
- Superpower
- Protect

Metagross
Ability: Clear Body
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Iron Head
- Zen Headbutt
- Ice Punch
- Protect

Amoonguss
Ability: Regenerator
Level: 50
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Spore
- Rage Powder
- Giga Drain
- Protect`,

  // Team 3: Dragon/Steel
  `Dragonite
Ability: Multiscale
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Dragon Claw
- Extreme Speed
- Fire Punch
- Protect

Excadrill
Ability: Sand Rush
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Iron Head
- Earthquake
- Rock Slide
- Protect

Rotom-Wash
Ability: Levitate
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Hydro Pump
- Thunderbolt
- Will-O-Wisp
- Protect

Landorus-Therian
Ability: Intimidate
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Earthquake
- Rock Slide
- U-turn
- Protect

Heatran
Ability: Flash Fire
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Heat Wave
- Flash Cannon
- Earth Power
- Protect

Cresselia
Ability: Levitate
Level: 50
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Psychic
- Icy Wind
- Helping Hand
- Protect`,

  // Team 4: Fairy/Dark
  `Grimmsnarl
Ability: Prankster
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Spirit Break
- Sucker Punch
- Thunder Wave
- Protect

Whimsicott
Ability: Prankster
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Moonblast
- Tailwind
- Helping Hand
- Protect

Incineroar
Ability: Intimidate
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Flare Blitz
- Darkest Lariat
- Fake Out
- Protect

Rillaboom
Ability: Grassy Surge
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Grassy Glide
- Wood Hammer
- Fake Out
- Protect

Urshifu-Rapid-Strike
Ability: Unseen Fist
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- Protect

Porygon2
Ability: Download
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Quiet Nature
IVs: 0 Spe
- Tri Attack
- Ice Beam
- Trick Room
- Recover`,

  // Team 5: Ghost/Psychic
  `Gengar
Ability: Cursed Body
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Shadow Ball
- Sludge Bomb
- Will-O-Wisp
- Protect

Alakazam
Ability: Magic Guard
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Psychic
- Shadow Ball
- Energy Ball
- Protect

Scizor
Ability: Technician
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Bullet Punch
- Bug Bite
- Swords Dance
- Protect

Milotic
Ability: Competitive
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Scald
- Ice Beam
- Recover
- Protect

Conkeldurr
Ability: Guts
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Brave Nature
IVs: 0 Spe
- Drain Punch
- Mach Punch
- Ice Punch
- Protect

Chandelure
Ability: Flash Fire
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Heat Wave
- Shadow Ball
- Energy Ball
- Protect`,

  // Team 6: Ground/Rock
  `Excadrill
Ability: Mold Breaker
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Iron Head
- Earthquake
- Rock Slide
- Protect

Hippowdon
Ability: Sand Stream
Level: 50
EVs: 252 HP / 252 Def / 4 SpD
Impish Nature
- Earthquake
- Rock Slide
- Yawn
- Protect

Volcarona
Ability: Flame Body
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Heat Wave
- Bug Buzz
- Quiver Dance
- Protect

Jellicent
Ability: Water Absorb
Level: 50
EVs: 252 HP / 252 SpD / 4 Def
Calm Nature
- Scald
- Shadow Ball
- Will-O-Wisp
- Protect

Breloom
Ability: Technician
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Mach Punch
- Bullet Seed
- Spore
- Protect

Hydreigon
Ability: Levitate
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Dark Pulse
- Draco Meteor
- Flamethrower
- Protect`,

  // Team 7: Ice/Fighting
  `Mamoswine
Ability: Thick Fat
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Earthquake
- Ice Shard
- Icicle Crash
- Protect

Lucario
Ability: Inner Focus
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Aura Sphere
- Flash Cannon
- Dark Pulse
- Protect

Salamence
Ability: Intimidate
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Draco Meteor
- Flamethrower
- Hydro Pump
- Protect

Aegislash
Ability: Stance Change
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Quiet Nature
IVs: 0 Spe
- Shadow Ball
- Flash Cannon
- King's Shield
- Wide Guard

Clefairy
Ability: Friend Guard
Level: 50
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Moonblast
- Follow Me
- Helping Hand
- Protect

Suicune
Ability: Pressure
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Scald
- Ice Beam
- Tailwind
- Protect`,

  // Team 8: Poison/Bug
  `Toxapex
Ability: Regenerator
Level: 50
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Scald
- Sludge Bomb
- Haze
- Protect

Scizor
Ability: Technician
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Bullet Punch
- U-turn
- Superpower
- Protect

Zapdos
Ability: Static
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Thunderbolt
- Heat Wave
- Tailwind
- Protect

Kingdra
Ability: Swift Swim
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Muddy Water
- Draco Meteor
- Ice Beam
- Protect

Pelipper
Ability: Drizzle
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Scald
- Hurricane
- Tailwind
- Protect

Ferrothorn
Ability: Iron Barbs
Level: 50
EVs: 252 HP / 252 SpD / 4 Def
Sassy Nature
IVs: 0 Spe
- Power Whip
- Gyro Ball
- Leech Seed
- Protect`,

  // Team 9: Normal/Flying
  `Snorlax
Ability: Thick Fat
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Body Slam
- Earthquake
- Curse
- Protect

Talonflame
Ability: Gale Wings
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Brave Bird
- Flare Blitz
- Tailwind
- Protect

Gastrodon
Ability: Storm Drain
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Earth Power
- Scald
- Ice Beam
- Protect

Thundurus
Ability: Prankster
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Thunderbolt
- Dark Pulse
- Thunder Wave
- Protect

Kartana
Ability: Beast Boost
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Leaf Blade
- Sacred Sword
- Smart Strike
- Protect

Tapu Fini
Ability: Misty Surge
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Muddy Water
- Moonblast
- Calm Mind
- Protect`,

  // Team 10: Fire/Water
  `Cinderace
Ability: Libero
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Pyro Ball
- High Jump Kick
- Sucker Punch
- Protect

Primarina
Ability: Torrent
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Moonblast
- Sparkling Aria
- Energy Ball
- Protect

Dracovish
Ability: Strong Jaw
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Fishious Rend
- Dragon Rush
- Psychic Fangs
- Protect

Togekiss
Ability: Super Luck
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Air Slash
- Dazzling Gleam
- Follow Me
- Protect

Dusclops
Ability: Frisk
Level: 50
EVs: 252 HP / 252 Def / 4 SpD
Relaxed Nature
IVs: 0 Spe
- Night Shade
- Will-O-Wisp
- Trick Room
- Pain Split

Rhyperior
Ability: Solid Rock
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Brave Nature
IVs: 0 Spe
- Rock Slide
- Earthquake
- High Horsepower
- Protect`,

  // Team 11: Electric/Grass
  `Magnezone
Ability: Magnet Pull
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Thunderbolt
- Flash Cannon
- Volt Switch
- Protect

Tsareena
Ability: Queenly Majesty
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Power Whip
- High Jump Kick
- U-turn
- Protect

Torkoal
Ability: Drought
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Quiet Nature
IVs: 0 Spe
- Heat Wave
- Solar Beam
- Earth Power
- Protect

Lilligant
Ability: Chlorophyll
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Leaf Storm
- Sleep Powder
- After You
- Protect

Stakataka
Ability: Beast Boost
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Lonely Nature
- Gyro Ball
- Rock Slide
- Trick Room
- Protect

Gothitelle
Ability: Shadow Tag
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Psychic
- Dark Pulse
- Trick Room
- Protect`,

  // Team 12: Dark/Fairy
  `Tyranitar
Ability: Sand Stream
Level: 50
EVs: 252 HP / 252 SpD / 4 Atk
Careful Nature
- Rock Slide
- Crunch
- Low Kick
- Protect

Mimikyu
Ability: Disguise
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Play Rough
- Shadow Sneak
- Swords Dance
- Protect

Porygon-Z
Ability: Adaptability
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Hyper Beam
- Thunderbolt
- Ice Beam
- Protect

Celesteela
Ability: Beast Boost
Level: 50
EVs: 252 HP / 252 SpD / 4 SpA
Calm Nature
- Flash Cannon
- Air Slash
- Leech Seed
- Protect

Comfey
Ability: Triage
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Draining Kiss
- Floral Healing
- Trick Room
- Protect

Mudsdale
Ability: Stamina
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- High Horsepower
- Rock Slide
- Close Combat
- Protect`,

  // Team 13: Water/Ghost
  `Politoed
Ability: Drizzle
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Scald
- Ice Beam
- Helping Hand
- Protect

Ludicolo
Ability: Swift Swim
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Hydro Pump
- Giga Drain
- Ice Beam
- Protect

Drifblim
Ability: Unburden
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Modest Nature
- Shadow Ball
- Thunderbolt
- Tailwind
- Protect

Hariyama
Ability: Guts
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Brave Nature
IVs: 0 Spe
- Close Combat
- Fake Out
- Ice Punch
- Protect

Araquanid
Ability: Water Bubble
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Brave Nature
IVs: 0 Spe
- Liquidation
- Lunge
- Wide Guard
- Protect

Marowak-Alola
Ability: Lightning Rod
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Brave Nature
IVs: 0 Spe
- Shadow Bone
- Flare Blitz
- Bonemerang
- Protect`,

  // Team 14: Steel/Dragon
  `Metagross
Ability: Clear Body
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Iron Head
- Zen Headbutt
- Stomping Tantrum
- Protect

Kommo-o
Ability: Bulletproof
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Clanging Scales
- Focus Blast
- Flamethrower
- Protect

Ninetales-Alola
Ability: Snow Warning
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Blizzard
- Moonblast
- Aurora Veil
- Protect

Sandslash-Alola
Ability: Slush Rush
Level: 50
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Iron Head
- Icicle Crash
- Earthquake
- Protect

Tapu Lele
Ability: Psychic Surge
Level: 50
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Psychic
- Moonblast
- Shadow Ball
- Protect

Arcanine
Ability: Intimidate
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Flare Blitz
- Wild Charge
- Extreme Speed
- Protect`,

  // Team 15: Trick Room
  `Hatterene
Ability: Magic Bounce
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Quiet Nature
IVs: 0 Spe
- Dazzling Gleam
- Psychic
- Trick Room
- Protect

Torkoal
Ability: Drought
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Quiet Nature
IVs: 0 Spe
- Eruption
- Heat Wave
- Solar Beam
- Protect

Oranguru
Ability: Inner Focus
Level: 50
EVs: 252 HP / 252 SpA / 4 SpD
Quiet Nature
IVs: 0 Spe
- Psychic
- Instruct
- Trick Room
- Protect

Snorlax
Ability: Gluttony
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Brave Nature
IVs: 0 Spe
- Double-Edge
- High Horsepower
- Darkest Lariat
- Protect

Copperajah
Ability: Sheer Force
Level: 50
EVs: 252 HP / 252 Atk / 4 SpD
Brave Nature
IVs: 0 Spe
- Iron Head
- High Horsepower
- Heat Crash
- Protect

Indeedee-F
Ability: Psychic Surge
Level: 50
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
IVs: 0 Spe
- Psychic
- Follow Me
- Helping Hand
- Protect`,
];
