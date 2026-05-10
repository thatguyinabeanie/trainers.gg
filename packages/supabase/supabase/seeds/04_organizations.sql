-- =============================================================================
-- 04_organizations.sql - Create Communities and Staff
-- =============================================================================
-- GENERATED FILE - DO NOT EDIT MANUALLY
-- IDEMPOTENT: Uses ON CONFLICT and existence checks
-- Depends on: 03_users.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Communities
-- -----------------------------------------------------------------------------

-- logo_url: official Pokemon artwork via PokeAPI (raw.githubusercontent.com, freely accessible)

INSERT INTO public.communities (
  name, slug, description, about, icon, logo_url, banner_url, status, owner_user_id, tier, subscription_tier
) VALUES (
  'VGC League', 'vgc-league',
  'The premier online Pokemon VGC tournament community. Weekly Swiss-format tournaments open to all skill levels.',
  '## Welcome to VGC League

VGC League is the premier online Pokemon VGC tournament community on trainers.gg. We run **weekly Swiss-format tournaments** every Saturday, open to players of all skill levels. Whether you''re a seasoned competitor or just starting your VGC journey, there''s a place for you here.

### What We Offer

- **Weekly Tournaments** — Swiss + Top Cut format, streamed on [Twitch](https://twitch.tv/vgcleague)
- **Competitive Coaching** — Free mentoring sessions for newer players every Wednesday evening
- **Team Building Resources** — Sample teams, rental codes, and meta analysis posted weekly
- **Active Discord** — 500+ members discussing VGC strategy daily
- **Monthly Invitationals** — Top performers from weekly events qualify for our end-of-month championship

### Tournament Schedule

Our regular tournaments follow this structure:

> **Saturdays at 12:00 PM EST** — Weekly Championship (Swiss + Top Cut)
> Open registration, check-in opens 1 hour before start

All tournaments use the current VGC regulation format on **Pokemon Showdown**. Best of 3 matches with open team sheets. Round times are 50 minutes with a 5-minute check-in window between rounds.

### Community Guidelines

We believe in a welcoming, inclusive environment. Respect your opponents, play fair, and have fun. Unsportsmanlike conduct, stalling, and harassment will not be tolerated. Full rules are available in our [Discord server](https://discord.gg/vgc-league).

### Resources

- [VGC Regulation I Rules](https://www.pokemon.com/us/pokemon-news/pokemon-vgc-regulation-i)
- [Pokemon Showdown](https://play.pokemonshowdown.com/)
- [Pikalytics Meta Analysis](https://pikalytics.com/)
- [Our Discord Server](https://discord.gg/vgc-league)',
  '🏆',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png',
  'https://picsum.photos/seed/vgc-league/1200/300',
  'active', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'partner', 'community_plus'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, about, icon, logo_url, banner_url, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Pallet Town Trainers', 'pallet-town',
  'A casual-friendly local community for Pokemon trainers of all levels. No pressure, just good battles.',
  '## Welcome to Pallet Town Trainers!

Every great journey starts somewhere — and this is yours. Pallet Town Trainers is a casual-friendly community where trainers of **all skill levels** come together to battle, learn, and have fun. We don''t care about your win rate. We care about whether you''re having a good time.

### Who We Are

We''re a community built by players who love Pokemon but don''t always have time to grind the ladder. Our tournaments are relaxed, our members are supportive, and we''re always happy to help someone build their first competitive team. If you''ve ever felt intimidated by the competitive scene, this is the place to start.

### What We Do

- **Weekly Casual Tournaments** — Low-stakes Swiss events every Saturday
- **Team Clinics** — Bring your team, get feedback from experienced players
- **Friendly Matches** — Open lobbies for practice and casual play throughout the week
- **New Player Guides** — Resources for getting into competitive Pokemon

### Tournament Format

Our tournaments are designed to be approachable:

> **Saturdays at 2:00 PM EST** — Weekly Casual Tournament
> Swiss format, no top cut — everyone plays all rounds!

We use **Best of 1** for most events to keep things moving. Open team sheets so you can learn from your opponents'' teams. No penalties for late registration — join when you can!

### House Rules

Be kind. Be patient. Be helpful. We''re all here to enjoy Pokemon together. Toxicity, elitism, and gatekeeping have no place in Pallet Town. Check our Discord for the full community guidelines.

### Links

- [Our Discord](https://discord.gg/pallet-town)
- [Pokemon Showdown](https://play.pokemonshowdown.com/)',
  '🌱',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  'https://picsum.photos/seed/pallet-town/1200/300',
  'active', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', NULL, 'free'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, about, icon, logo_url, banner_url, discord_invite_url, social_links, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Stellar Novas', 'stellar-novas',
  'A long-running competitive Pokemon community with over 5 years of tournaments, coaching, and high-level play.',
  '## Welcome to Stellar Novas

Stellar Novas has been a cornerstone of the competitive Pokemon community for over **five years**. We''ve hosted hundreds of tournaments, produced top-placing players at major events, and built a community that values both competitive excellence and good sportsmanship.

### Our History

Founded in 2021, Stellar Novas started as a small Discord server of friends who wanted to run better-organized online tournaments. Since then, we''ve grown into one of the most respected communities in the Pokemon competitive space. Our alumni include regional champions, national qualifiers, and World Championship competitors.

### What We Offer

- **Weekly Ranked Tournaments** — Swiss + Top Cut with seasonal standings and leaderboards
- **Seasonal Championships** — Quarterly invitationals for top performers
- **VOD Review Sessions** — Community coaches break down high-level matches on [YouTube](https://youtube.com/@stellarnovas)
- **Live Streaming** — All major events streamed on [Twitch](https://twitch.tv/stellarnovas) with commentary
- **Team Reports** — Players share detailed team breakdowns after events

### Tournament Schedule

We run a full competitive circuit:

> **Fridays at 7:00 PM EST** — Weekly Ranked Swiss (standings count toward seasonal invite)
> **Last Saturday of each month** — Monthly Championship (Top 16 from weeklies)
> **End of Season** — Seasonal Invitational (Top 32 from monthly standings)

All events use the current VGC regulation format. Best of 3, open team sheets, 50-minute rounds.

### Competitive Standards

We take competitive integrity seriously. All matches are played on **Pokemon Showdown** with replays saved. Disputes are handled by our experienced TO team. We follow official VGC rules with minor adaptations for online play.

### Connect With Us

- [Discord](https://discord.gg/stellar-novas)
- [Twitter/X](https://x.com/stellarnovas)
- [YouTube](https://youtube.com/@stellarnovas)
- [Twitch](https://twitch.tv/stellarnovas)',
  '⭐',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/385.png',
  'https://picsum.photos/seed/stellar-novas/1200/300',
  'https://discord.gg/stellar-novas',
  '[{"platform": "discord", "url": "https://discord.gg/stellar-novas"}, {"platform": "twitter", "url": "https://x.com/stellarnovas"}, {"platform": "youtube", "url": "https://youtube.com/@stellarnovas"}, {"platform": "twitch", "url": "https://twitch.tv/stellarnovas"}]'::jsonb,
  'active', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'partner', 'community_plus'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, about, icon, logo_url, banner_url, discord_invite_url, social_links, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Hatterene Series', 'hatterene-series',
  'A tournament series and community for women and femme-oriented players in competitive Pokemon.',
  '## Welcome to the Hatterene Series

The Hatterene Series is a tournament community created **by women and femme players, for women and femme players** in the competitive Pokemon scene. Named after the elegant and powerful Hatterene, we''re here to carve out space where everyone can compete comfortably and confidently.

### Why We Exist

The competitive Pokemon community is wonderful, but it can sometimes feel unwelcoming to women and femme-identifying players. We created the Hatterene Series to provide a space where our members can compete without dealing with harassment, condescension, or being made to feel like they don''t belong. **All skill levels are welcome** — from first-time competitors to seasoned veterans.

### What We Do

- **Biweekly Tournaments** — Swiss format events every other Saturday, exclusively for our community
- **Open Events** — Monthly tournaments open to all genders, with our community values front and center
- **Mentoring Program** — Experienced players paired with newcomers for 1-on-1 coaching
- **Team Building Workshops** — Collaborative teambuilding sessions where we theory-craft together
- **Community Game Nights** — Casual battles, drafts, and other Pokemon fun beyond VGC

### Tournament Format

> **Every other Saturday at 1:00 PM EST** — Community Tournament (members only)
> **First Saturday of each month** — Open Invitational (all welcome)

We run Swiss format with Best of 3. Open team sheets. Relaxed round timers (60 minutes) because we want you to enjoy your games, not rush through them.

### Community Standards

Respect and inclusivity are non-negotiable. We have a zero-tolerance policy for harassment, sexism, and discriminatory behavior. Our moderation team is active and responsive. This is a safe space first, a competitive space second.

### Join Us

- [Discord](https://discord.gg/hatterene)
- [Twitter/X](https://x.com/hatterene-series)',
  '🎀',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/858.png',
  'https://picsum.photos/seed/hatterene/1200/300',
  'https://discord.gg/hatterene',
  '[{"platform": "discord", "url": "https://discord.gg/hatterene"}, {"platform": "twitter", "url": "https://x.com/hatterene-series"}]'::jsonb,
  'active', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', NULL, 'free'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.communities (
  name, slug, description, about, icon, logo_url, banner_url, discord_invite_url, social_links, status, owner_user_id, tier, subscription_tier
) VALUES (
  'Showdown Academy', 'showdown-academy',
  'Learn competitive Pokemon from the ground up. Weekly workshops, mentoring, and beginner-friendly tournaments on Pokemon Showdown.',
  '## Welcome to Showdown Academy

Showdown Academy is the place to **learn competitive Pokemon** from the ground up. Whether you''ve never touched Pokemon Showdown or you''re stuck in the mid-ladder and want to improve, our community of teachers and students will help you get there.

### Our Philosophy

We believe that competitive Pokemon is for everyone — but the learning curve can be brutal without guidance. Tier lists, damage calcs, speed tiers, team archetypes... it''s a lot. Showdown Academy breaks it all down into digestible lessons and gives you a supportive environment to practice in.

### What We Offer

- **Weekly Workshops** — Live teaching sessions on topics like teambuilding, prediction, and positioning
- **Beginner Tournaments** — Low-pressure events designed for learning, not winning
- **Replay Review** — Submit your replays and get detailed feedback from our coaches
- **Structured Curriculum** — Self-paced learning path from "What is a nature?" to "How do I read my opponent?"
- **Study Groups** — Small groups that meet weekly to practice and discuss strategy

### Workshop Schedule

> **Tuesdays at 7:00 PM EST** — Weekly Workshop (topic announced in Discord)
> **Thursdays at 8:00 PM EST** — Replay Review Night
> **Saturdays at 3:00 PM EST** — Beginner Tournament (open to all, but designed for learners)

### Tournament Format

Our tournaments are specifically designed to be educational:

- **Best of 1** with extended timers so you can think through your plays
- **Open team sheets** so you can practice team preview skills
- Post-tournament replay review where we discuss interesting games as a group
- No elimination — Swiss format so everyone plays all rounds

### Getting Started

New here? Start with these steps:

1. Join our [Discord server](https://discord.gg/showdown-academy)
2. Create a [Pokemon Showdown](https://play.pokemonshowdown.com/) account
3. Check out our **#getting-started** channel for the beginner curriculum
4. Sign up for the next beginner tournament!

### Resources

- [Pokemon Showdown](https://play.pokemonshowdown.com/)
- [Our YouTube Channel](https://youtube.com/@showdownacademy) — workshop recordings and tutorials
- [Damage Calculator](https://calc.pokemonshowdown.com/)
- [Smogon University](https://www.smogon.com/) — in-depth competitive resources',
  '📚',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/65.png',
  'https://picsum.photos/seed/showdown-academy/1200/300',
  'https://discord.gg/showdown-academy',
  '[{"platform": "discord", "url": "https://discord.gg/showdown-academy"}, {"platform": "youtube", "url": "https://youtube.com/@showdownacademy"}, {"platform": "website", "url": "https://showdownacademy.gg"}]'::jsonb,
  'active', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', NULL, 'free'
) ON CONFLICT (slug) DO NOTHING;


-- Mark some communities as featured for local development
UPDATE public.communities SET is_featured = true, featured_order = 1 WHERE slug = 'stellar-novas';
UPDATE public.communities SET is_featured = true, featured_order = 2 WHERE slug = 'vgc-league';
UPDATE public.communities SET is_featured = true, featured_order = 3 WHERE slug = 'hatterene-series';
UPDATE public.communities SET is_featured = true, featured_order = 4 WHERE slug = 'showdown-academy';
UPDATE public.communities SET is_featured = true, featured_order = 5 WHERE slug = 'pallet-town';

-- -----------------------------------------------------------------------------
-- Community Staff
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  vgc_league_id bigint;
  pallet_town_id bigint;
BEGIN
  SELECT id INTO vgc_league_id FROM public.communities WHERE slug = 'vgc-league';
  SELECT id INTO pallet_town_id FROM public.communities WHERE slug = 'pallet-town';

  -- Add staff members
  INSERT INTO public.community_staff (community_id, user_id) VALUES
    (vgc_league_id, '711a6f78-b52d-dd77-fddb-e13dd02e03cf'),
    (vgc_league_id, '711a6f77-c285-5f8d-dbbc-a4f60e3eee80'),
    (vgc_league_id, '4dcc802f-cf86-d4f0-f0db-f1cfbdf9dcd0'),
    (vgc_league_id, '4dcc804e-2edb-d817-b078-be77a94933a9'),
    (vgc_league_id, '711a6f7b-d716-7aed-a2fa-caab9020e6bd'),
    (vgc_league_id, '4dcc8033-2a48-bf0b-d1de-16ba448ad8aa'),
    (vgc_league_id, '4dcc802e-3ad2-1f1c-f11f-88befa81bc9d'),
    (vgc_league_id, '4dcc8035-9f28-fdb5-3eec-c6a479b52d6c'),
    (vgc_league_id, '711a6f7c-c4fb-edde-1407-85c76b3b1fa4'),
    (vgc_league_id, '4dcc804b-b5ea-da97-ecf2-ae31acc3b433'),
    (pallet_town_id, '4dcc804c-5d8b-dd2e-d73b-dbdb365a0cad'),
    (pallet_town_id, '4dcc8034-5580-7472-ddeb-a1bca9267ec7'),
    (pallet_town_id, '4dcc804e-2edb-d817-b078-be77a94933a9'),
    (pallet_town_id, '711a6f77-c285-5f8d-dbbc-a4f60e3eee80'),
    (pallet_town_id, '4dcc8031-c592-ed5e-d72e-babcccd820ad'),
    (pallet_town_id, '4dcc802c-ace8-fd41-202f-17c0b62fddab'),
    (pallet_town_id, '711a6f76-2df3-bdaf-f76b-bdebbbefbd78'),
    (pallet_town_id, '4dcc8032-7bb8-dce3-ea5a-fa7d512233e4'),
    (pallet_town_id, '711a6f74-57a0-210c-fa2a-a398dd08dbce'),
    (pallet_town_id, '4dcc802d-9aa2-dbc7-d80d-27eecd967eab')
  ON CONFLICT DO NOTHING;
END $$;
