export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS guild_config (
  guild_id TEXT PRIMARY KEY,
  config TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  case_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_id TEXT NOT NULL,
  reason TEXT,
  duration_ms INTEGER,
  expires_at INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  extra TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (guild_id, case_id)
);
CREATE INDEX IF NOT EXISTS idx_cases_user ON cases (guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_cases_active_expiry ON cases (active, expires_at);

CREATE TABLE IF NOT EXISTS members (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar TEXT,
  bot INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER,
  left_at INTEGER,
  roles TEXT,
  warnings INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS levels (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  messages INTEGER NOT NULL DEFAULT 0,
  voice_seconds INTEGER NOT NULL DEFAULT 0,
  last_xp_at INTEGER NOT NULL DEFAULT 0,
  level_ping INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_levels_xp ON levels (guild_id, xp DESC);

CREATE TABLE IF NOT EXISTS role_rewards (
  guild_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (guild_id, level)
);

CREATE TABLE IF NOT EXISTS voice_sessions (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_tick_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS temp_voices (
  channel_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  hub_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT UNIQUE,
  opener_id TEXT NOT NULL,
  claimed_by TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  ai_enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  closed_at INTEGER,
  close_reason TEXT
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  message_id TEXT,
  author_id TEXT NOT NULL,
  author_tag TEXT,
  content TEXT,
  original_content TEXT,
  attachments TEXT,
  created_at INTEGER NOT NULL,
  edited_at INTEGER,
  deleted_at INTEGER,
  is_bot INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);
CREATE INDEX IF NOT EXISTS idx_ticket_msgs ON ticket_messages (ticket_id, created_at);

CREATE TABLE IF NOT EXISTS giveaways (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  host_id TEXT NOT NULL,
  prize TEXT NOT NULL,
  winners INTEGER NOT NULL DEFAULT 1,
  ends_at INTEGER NOT NULL,
  ended INTEGER NOT NULL DEFAULT 0,
  required_role TEXT,
  min_level INTEGER,
  booster_only INTEGER NOT NULL DEFAULT 0,
  paused INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS giveaway_entries (
  giveaway_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  entries INTEGER NOT NULL DEFAULT 1,
  boost_count INTEGER NOT NULL DEFAULT 0,
  invite_count INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (giveaway_id, user_id),
  FOREIGN KEY (giveaway_id) REFERENCES giveaways(id)
);

CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  path TEXT NOT NULL,
  size INTEGER,
  includes TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS log_channels (
  guild_id TEXT NOT NULL,
  log_type TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  PRIMARY KEY (guild_id, log_type)
);

CREATE TABLE IF NOT EXISTS message_archive (
  message_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_tag TEXT,
  content TEXT,
  attachments TEXT,
  created_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  edited INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_archive_channel ON message_archive (channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS snipes (
  channel_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  author_id TEXT,
  author_tag TEXT,
  content TEXT,
  attachments TEXT,
  deleted_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  guild_id TEXT NOT NULL,
  code TEXT NOT NULL,
  inviter_id TEXT,
  uses INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, code)
);

CREATE TABLE IF NOT EXISTS join_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  code TEXT,
  inviter_id TEXT,
  joined_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS automod_hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_ai_memory (
  ticket_id INTEGER PRIMARY KEY,
  summary TEXT,
  facts TEXT,
  last_provider TEXT,
  last_model TEXT,
  turn_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  channel_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages ON ai_chat_messages (channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS economy (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  wallet INTEGER NOT NULL DEFAULT 0,
  bank INTEGER NOT NULL DEFAULT 0,
  last_work INTEGER NOT NULL DEFAULT 0,
  last_daily INTEGER NOT NULL DEFAULT 0,
  last_crime INTEGER NOT NULL DEFAULT 0,
  last_rob INTEGER NOT NULL DEFAULT 0,
  last_hack INTEGER NOT NULL DEFAULT 0,
  last_weekly INTEGER NOT NULL DEFAULT 0,
  last_fish INTEGER NOT NULL DEFAULT 0,
  last_hunt INTEGER NOT NULL DEFAULT 0,
  last_beg INTEGER NOT NULL DEFAULT 0,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  earned INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  work_boost_until INTEGER NOT NULL DEFAULT 0,
  inventory TEXT NOT NULL DEFAULT '{}',
  jailed_until INTEGER NOT NULL DEFAULT 0,
  week_earned INTEGER NOT NULL DEFAULT 0,
  week_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_eco_wallet ON economy (guild_id, wallet DESC);
CREATE INDEX IF NOT EXISTS idx_eco_bank ON economy (guild_id, bank DESC);
CREATE INDEX IF NOT EXISTS idx_eco_net ON economy (guild_id, wallet DESC, bank DESC);

CREATE TABLE IF NOT EXISTS loans (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  principal INTEGER NOT NULL,
  owed INTEGER NOT NULL,
  rate REAL NOT NULL,
  taken_at INTEGER NOT NULL,
  due_at INTEGER NOT NULL,
  last_penalty_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS lottery (
  guild_id TEXT PRIMARY KEY,
  pot INTEGER NOT NULL DEFAULT 0,
  last_draw INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS shop_items (
  guild_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'item',
  role_id TEXT,
  unique_own INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, item_id)
);

CREATE TABLE IF NOT EXISTS shop_overrides (
  guild_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  price INTEGER,
  hidden INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, item_id)
);

CREATE TABLE IF NOT EXISTS voice_stats (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  week_id TEXT NOT NULL DEFAULT '',
  week_seconds INTEGER NOT NULL DEFAULT 0,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_voice_day TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS voice_pairs (
  guild_id TEXT NOT NULL,
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  week_id TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_a, user_b, week_id)
);
CREATE INDEX IF NOT EXISTS idx_voice_pairs_week ON voice_pairs (guild_id, week_id, seconds DESC);

CREATE TABLE IF NOT EXISTS birthdays (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS birthday_sent (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id, year)
);

CREATE TABLE IF NOT EXISTS server_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  host_id TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  starts_at INTEGER NOT NULL,
  capacity INTEGER,
  reminded INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_start ON server_events (guild_id, starts_at);

CREATE TABLE IF NOT EXISTS event_rsvp (
  event_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES server_events(id)
);

CREATE TABLE IF NOT EXISTS missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward INTEGER NOT NULL DEFAULT 0,
  goal INTEGER NOT NULL DEFAULT 1,
  week_id TEXT,
  kind TEXT NOT NULL DEFAULT 'auto',
  active INTEGER NOT NULL DEFAULT 1,
  event_id INTEGER,
  channel_id TEXT,
  message_id TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_missions_guild ON missions (guild_id, active, week_id);

CREATE TABLE IF NOT EXISTS mission_progress (
  mission_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  claimed INTEGER NOT NULL DEFAULT 0,
  extra TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (mission_id, user_id)
);

CREATE TABLE IF NOT EXISTS market_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_market_guild ON market_listings (guild_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tax_runs (
  guild_id TEXT NOT NULL,
  week_id TEXT NOT NULL,
  collected INTEGER NOT NULL DEFAULT 0,
  taxed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, week_id)
);

CREATE TABLE IF NOT EXISTS mission_board (
  guild_id TEXT NOT NULL,
  week_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  PRIMARY KEY (guild_id, week_id)
);

CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  text TEXT NOT NULL,
  author_id TEXT,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quote_daily (
  guild_id TEXT NOT NULL,
  day TEXT NOT NULL,
  quote_text TEXT,
  PRIMARY KEY (guild_id, day)
);

CREATE TABLE IF NOT EXISTS auctions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  seller_tag TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  starting_bid INTEGER NOT NULL,
  current_bid INTEGER NOT NULL,
  highest_bidder_id TEXT,
  highest_bidder_tag TEXT,
  channel_id TEXT,
  message_id TEXT,
  ends_at INTEGER NOT NULL,
  closed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auctions_guild ON auctions (guild_id, closed, ends_at);

CREATE TABLE IF NOT EXISTS asset_prices (
  asset_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL,
  current_price REAL NOT NULL,
  open_24h_price REAL NOT NULL,
  high_24h_price REAL NOT NULL,
  low_24h_price REAL NOT NULL,
  history TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_portfolio (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  invested REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id, asset_id)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON user_portfolio (guild_id, user_id);

CREATE TABLE IF NOT EXISTS appeals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_tag TEXT NOT NULL,
  case_id INTEGER,
  type TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  channel_id TEXT,
  message_id TEXT,
  reviewed_by TEXT,
  reviewed_at INTEGER,
  review_notes TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_appeals_user ON appeals (guild_id, user_id, status);

CREATE TABLE IF NOT EXISTS collection_claims (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  reward_amount INTEGER NOT NULL DEFAULT 10000,
  claimed_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id, collection_id)
);

CREATE TABLE IF NOT EXISTS p2p_offers (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message_id TEXT,
  channel_id TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_p2p_offers_target ON p2p_offers (guild_id, target_id, status);

CREATE TABLE IF NOT EXISTS rpg_players (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  class TEXT NOT NULL DEFAULT 'guerrero',
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  hp INTEGER NOT NULL DEFAULT 100,
  max_hp INTEGER NOT NULL DEFAULT 100,
  attack INTEGER NOT NULL DEFAULT 15,
  defense INTEGER NOT NULL DEFAULT 10,
  speed INTEGER NOT NULL DEFAULT 10,
  potions INTEGER NOT NULL DEFAULT 3,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  dungeon_floor INTEGER NOT NULL DEFAULT 1,
  clan_id INTEGER,
  last_battle_at INTEGER NOT NULL DEFAULT 0,
  last_dungeon_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_rpg_players_lvl ON rpg_players (guild_id, level DESC);

CREATE TABLE IF NOT EXISTS rpg_clans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  description TEXT,
  leader_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE (guild_id, name)
);

CREATE TABLE IF NOT EXISTS rpg_clan_members (
  guild_id TEXT NOT NULL,
  clan_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON rpg_clan_members (guild_id, clan_id);

CREATE TABLE IF NOT EXISTS rpg_clan_applications (
  guild_id TEXT NOT NULL,
  clan_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  requested_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, clan_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_clan_applications_clan ON rpg_clan_applications (guild_id, clan_id, requested_at);
CREATE INDEX IF NOT EXISTS idx_clan_applications_user ON rpg_clan_applications (guild_id, user_id, requested_at);

CREATE TABLE IF NOT EXISTS daily_dividends_log (
  date_key TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  total_distributed REAL NOT NULL DEFAULT 0,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  paid_at INTEGER NOT NULL,
  PRIMARY KEY (date_key, guild_id)
);

CREATE TABLE IF NOT EXISTS crypto_miners (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rig_tier INTEGER NOT NULL DEFAULT 1,
  target_asset TEXT NOT NULL DEFAULT 'nexocoin',
  last_claim INTEGER NOT NULL,
  overclock_until INTEGER NOT NULL DEFAULT 0,
  total_mined REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS bank_fixed_deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  plan_days INTEGER NOT NULL,
  interest_rate REAL NOT NULL,
  reward_amount INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  claimed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fixed_deposits_user ON bank_fixed_deposits (guild_id, user_id, claimed);

CREATE TABLE IF NOT EXISTS bump_streaks (
  guild_id TEXT PRIMARY KEY,
  last_user_id TEXT,
  streak INTEGER NOT NULL DEFAULT 0,
  last_bump_at INTEGER NOT NULL DEFAULT 0,
  total_bumps INTEGER NOT NULL DEFAULT 0,
  reminder_sent INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bump_logs (
  message_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  streak INTEGER NOT NULL,
  reward INTEGER NOT NULL,
  bonus INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS bump_user_stats (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  total_bumps INTEGER NOT NULL DEFAULT 0,
  highest_streak INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  last_bump_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bump_user_stats_bumps ON bump_user_stats (guild_id, total_bumps DESC);

CREATE TABLE IF NOT EXISTS member_boosts (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  boost_count INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS invite_stats (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  total_invites INTEGER NOT NULL DEFAULT 0,
  active_invites INTEGER NOT NULL DEFAULT 0,
  leaves INTEGER NOT NULL DEFAULT 0,
  bonus_invites INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS boost_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message_id TEXT UNIQUE,
  server_boosts INTEGER DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'unknown',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_boost_events_user ON boost_events (guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_boost_events_recent ON boost_events (guild_id, user_id, created_at);

CREATE TABLE IF NOT EXISTS counting_game (
  guild_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  last_user_id TEXT,
  highest_record INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 2,
  max_saves INTEGER NOT NULL DEFAULT 5,
  total_counts INTEGER NOT NULL DEFAULT 0,
  last_count_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS counting_user_stats (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  correct_counts INTEGER NOT NULL DEFAULT 0,
  ruined_counts INTEGER NOT NULL DEFAULT 0,
  last_count_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_counting_user_stats_correct ON counting_user_stats (guild_id, correct_counts DESC);

CREATE TABLE IF NOT EXISTS casino_jackpot (
  guild_id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL DEFAULT 50000,
  last_winner_id TEXT,
  last_winner_tag TEXT,
  last_won_amount INTEGER DEFAULT 0,
  last_won_at INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS user_titles (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id, title_id)
);

CREATE TABLE IF NOT EXISTS user_title_equipped (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  equipped_title TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  pet_type TEXT NOT NULL,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  exp INTEGER NOT NULL DEFAULT 0,
  happiness INTEGER NOT NULL DEFAULT 100,
  last_feed INTEGER NOT NULL DEFAULT 0,
  last_pet INTEGER NOT NULL DEFAULT 0,
  on_expedition_until INTEGER NOT NULL DEFAULT 0,
  expedition_hours INTEGER NOT NULL DEFAULT 0,
  expedition_reward TEXT,
  created_at INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_user_pets_user ON user_pets (guild_id, user_id);

CREATE TABLE IF NOT EXISTS user_pokedex (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  species_id TEXT NOT NULL,
  caught_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id, species_id)
);
CREATE INDEX IF NOT EXISTS idx_user_pokedex_user ON user_pokedex (guild_id, user_id);

CREATE TABLE IF NOT EXISTS user_gym_badges (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  beaten_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_user_gym_badges ON user_gym_badges (guild_id, user_id);

CREATE TABLE IF NOT EXISTS user_pokemon_daycare (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  pet_id INTEGER NOT NULL,
  deposited_at INTEGER NOT NULL,
  cost_per_hour INTEGER NOT NULL DEFAULT 100,
  PRIMARY KEY (guild_id, user_id, pet_id)
);

CREATE TABLE IF NOT EXISTS user_pokemon_salary (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  last_claimed_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);


CREATE TABLE IF NOT EXISTS voice_rewards_claimed (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  streak INTEGER NOT NULL DEFAULT 1,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  claimed_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id, day)
);

CREATE TABLE IF NOT EXISTS bank_heists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  leader_id TEXT NOT NULL,
  participants TEXT NOT NULL,
  loot_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planning',
  ends_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bank_heists_guild ON bank_heists (guild_id, created_at DESC);

CREATE TABLE IF NOT EXISTS scheduled_unpins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  unpin_at INTEGER NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL UNIQUE,
  author_id TEXT NOT NULL,
  question TEXT NOT NULL,
  options_json TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'single',
  ends_at INTEGER,
  closed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_polls_guild ON polls (guild_id);
CREATE INDEX IF NOT EXISTS idx_polls_message ON polls (message_id);
CREATE INDEX IF NOT EXISTS idx_polls_active ON polls (closed, ends_at);

CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  votes_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS marriages (
  guild_id TEXT NOT NULL,
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  married_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user1_id)
);
CREATE INDEX IF NOT EXISTS idx_marriages_user2 ON marriages (guild_id, user2_id);

CREATE TABLE IF NOT EXISTS properties (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  last_collect INTEGER NOT NULL DEFAULT 0,
  purchased_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id, property_id)
);
CREATE INDEX IF NOT EXISTS idx_properties_user ON properties (guild_id, user_id);

CREATE TABLE IF NOT EXISTS user_jobs (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  shifts_worked INTEGER NOT NULL DEFAULT 0,
  assigned_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_cards (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  obtained_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id, card_id)
);
CREATE INDEX IF NOT EXISTS idx_user_cards_user ON user_cards (guild_id, user_id);

CREATE TABLE IF NOT EXISTS card_trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  offered_cards TEXT NOT NULL,
  requested_cards TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message_id TEXT,
  channel_id TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS selfrole_panels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL DEFAULT 'toggle',
  max_roles INTEGER,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_selfrole_panels_guild ON selfrole_panels (guild_id);

CREATE TABLE IF NOT EXISTS selfrole_options (
  panel_id INTEGER NOT NULL,
  role_id TEXT NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (panel_id, role_id),
  FOREIGN KEY (panel_id) REFERENCES selfrole_panels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bank_security (
  guild_id TEXT PRIMARY KEY,
  security_level INTEGER NOT NULL DEFAULT 1,
  consecutive_wins INTEGER NOT NULL DEFAULT 0,
  last_heist_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_heist_profiles (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  total_heists INTEGER NOT NULL DEFAULT 0,
  heists_won INTEGER NOT NULL DEFAULT 0,
  total_loot INTEGER NOT NULL DEFAULT 0,
  reputation INTEGER NOT NULL DEFAULT 0,
  active_role TEXT NOT NULL DEFAULT 'tirador',
  PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_heist_profiles_rep ON user_heist_profiles (guild_id, reputation DESC);

CREATE TABLE IF NOT EXISTS user_heist_roles (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id, role_id)
);

CREATE TABLE IF NOT EXISTS economy_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  delta_wallet INTEGER NOT NULL DEFAULT 0,
  delta_bank INTEGER NOT NULL DEFAULT 0,
  net_delta INTEGER NOT NULL DEFAULT 0,
  new_wallet INTEGER NOT NULL DEFAULT 0,
  new_bank INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eco_tx_guild_user ON economy_transactions (guild_id, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS heist_target_security (
  guild_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  security_level INTEGER NOT NULL DEFAULT 1,
  consecutive_wins INTEGER NOT NULL DEFAULT 0,
  last_heist_at INTEGER NOT NULL DEFAULT 0,
  max_level_reached INTEGER NOT NULL DEFAULT 1,
  level_10_reached INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, target_id)
);
CREATE INDEX IF NOT EXISTS idx_heist_target_sec ON heist_target_security (guild_id, target_id);

CREATE TABLE IF NOT EXISTS item_daily_purchases (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, user_id, item_id, date_key)
);
CREATE INDEX IF NOT EXISTS idx_item_daily_purchases ON item_daily_purchases (guild_id, user_id, item_id, date_key);

CREATE TABLE IF NOT EXISTS gangs (
  id TEXT NOT NULL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  leader_id TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  balance INTEGER NOT NULL DEFAULT 0,
  total_loot_earned INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  last_tribute_at INTEGER NOT NULL DEFAULT 0,
  role_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gangs_guild ON gangs (guild_id, total_loot_earned DESC);

CREATE TABLE IF NOT EXISTS gang_members (
  guild_id TEXT NOT NULL,
  gang_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at INTEGER NOT NULL,
  contribution INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_gang_members_gang ON gang_members (guild_id, gang_id);

CREATE TABLE IF NOT EXISTS gang_upgrades (
  guild_id TEXT NOT NULL,
  gang_id TEXT NOT NULL,
  upgrade_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (guild_id, gang_id, upgrade_id)
);

CREATE TABLE IF NOT EXISTS user_heist_relics (
  id TEXT NOT NULL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  relic_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  obtained_at INTEGER NOT NULL,
  is_displayed INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_user_relics_user ON user_heist_relics (guild_id, user_id, obtained_at DESC);

CREATE TABLE IF NOT EXISTS police_officers (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rank TEXT NOT NULL DEFAULT 'Cadete',
  joined_at INTEGER NOT NULL,
  intercepts_won INTEGER NOT NULL DEFAULT 0,
  total_fines_collected INTEGER NOT NULL DEFAULT 0,
  cooldown_until INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_police_officers ON police_officers (guild_id, user_id);

CREATE TABLE IF NOT EXISTS gang_territories (
  guild_id TEXT NOT NULL,
  district_id TEXT NOT NULL,
  controlling_gang_id TEXT,
  influence_points INTEGER NOT NULL DEFAULT 0,
  last_tribute_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, district_id)
);
CREATE INDEX IF NOT EXISTS idx_gang_territories ON gang_territories (guild_id, district_id);

CREATE TABLE IF NOT EXISTS gang_territory_influence (
  guild_id TEXT NOT NULL,
  district_id TEXT NOT NULL,
  gang_id TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, district_id, gang_id)
);

CREATE TABLE IF NOT EXISTS gang_contracts (
  guild_id TEXT NOT NULL,
  gang_id TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  target_value INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (guild_id, gang_id, contract_id)
);

CREATE TABLE IF NOT EXISTS gang_investments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  gang_id TEXT NOT NULL,
  investor_id TEXT NOT NULL,
  amount_invested INTEGER NOT NULL,
  accumulated_dividends INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_collected_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gang_inv_user ON gang_investments (guild_id, investor_id);
CREATE INDEX IF NOT EXISTS idx_gang_inv_gang ON gang_investments (guild_id, gang_id);

CREATE TABLE IF NOT EXISTS user_reputation (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  last_given_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS reputation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rep_to_user ON reputation_logs (guild_id, to_user_id);

CREATE TABLE IF NOT EXISTS ticket_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  ticket_id INTEGER NOT NULL,
  opener_id TEXT NOT NULL,
  staff_id TEXT,
  rating INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profile_customization (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'cyberpunk',
  bio TEXT,
  PRIMARY KEY (guild_id, user_id)
);



CREATE TABLE IF NOT EXISTS store_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  plan_name TEXT,
  price TEXT,
  payment_method TEXT,
  claimed_by TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  closed_at INTEGER,
  close_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_store_orders_user ON store_orders (guild_id, user_id, status);

CREATE TABLE IF NOT EXISTS store_order_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  author_id TEXT NOT NULL,
  author_tag TEXT,
  content TEXT,
  attachments TEXT,
  created_at INTEGER NOT NULL,
  is_bot INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES store_orders(id)
);
CREATE INDEX IF NOT EXISTS idx_store_order_msgs ON store_order_messages (order_id, created_at);
CREATE TABLE IF NOT EXISTS server_stats_channels (
  guild_id TEXT PRIMARY KEY,
  category_id TEXT,
  clock_channel_id TEXT,
  members_channel_id TEXT,
  online_channel_id TEXT,
  boost_channel_id TEXT,
  last_updated INTEGER NOT NULL DEFAULT 0
);
`;

