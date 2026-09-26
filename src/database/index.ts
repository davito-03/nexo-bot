import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";
import { DEFAULT_GUILD_CONFIG, type GuildConfig } from "../constants.js";
import { SCHEMA_SQL } from "./schema.js";

export type Db = Database.Database;

let db: Db;

export function getDb(): Db {
  if (!db) throw new Error("Base de datos no inicializada");
  return db;
}

export function initDatabase(): Db {
  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
  db = new Database(config.databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 8000");
  db.exec(SCHEMA_SQL);
  migrateEconomy(db);
  migrateLevels(db);
  migrateShowcaseCopy(db);
  migrateAiPrompt(db);
  migrateLevelRates(db);
  migrateTicketCategories(db);
  migrateTradingAssets(db);
  migrateCleanupBadQuotes(db);
  migratePassiveEconomy(db);
  migrateRpg(db);
  migrateBump(db);
  migrateGiveawaysAndInvites(db);
  migrateBoostTracking(db);
  migrateQuoteDaily(db);
  migrateBankHeists(db);
  migrateUserPets(db);
  migrateUserPokedex(db);
  migrateUserGymBadges(db);
  migratePokemonSystems(db);
  migrateSecurityItemLimits(db);
  migrateHeistExpansion(db);
  migrateHeistLevel10Milestones(db);
  migrateGangInvestments(db);
  migrateReputationAndFeedback(db);
  migrateTicketMessages(db);
  return db;
}

function migrateEconomy(database: Db): void {
  const cols = new Set(
    (database.prepare("PRAGMA table_info(economy)").all() as { name: string }[]).map((c) => c.name),
  );
  const add: [string, string][] = [
    ["last_weekly", "INTEGER NOT NULL DEFAULT 0"],
    ["last_fish", "INTEGER NOT NULL DEFAULT 0"],
    ["last_hunt", "INTEGER NOT NULL DEFAULT 0"],
    ["last_beg", "INTEGER NOT NULL DEFAULT 0"],
    ["earned", "INTEGER NOT NULL DEFAULT 0"],
    ["lost", "INTEGER NOT NULL DEFAULT 0"],
    ["work_boost_until", "INTEGER NOT NULL DEFAULT 0"],
    ["week_earned", "INTEGER NOT NULL DEFAULT 0"],
    ["week_id", "TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [name, def] of add) {
    if (!cols.has(name)) database.exec(`ALTER TABLE economy ADD COLUMN ${name} ${def}`);
  }
  database.exec("CREATE INDEX IF NOT EXISTS idx_eco_week ON economy (guild_id, week_id, week_earned DESC)");
}

function migrateLevels(database: Db): void {
  const cols = new Set(
    (database.prepare("PRAGMA table_info(levels)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has("level_ping")) {
    database.exec("ALTER TABLE levels ADD COLUMN level_ping INTEGER NOT NULL DEFAULT 1");
  }
}

function migrateShowcaseCopy(database: Db): void {
  const staleWelcome = new Set([
    "¡Bienvenido {user} a **Nexo**! Eres el miembro nº **{count}**. Pásate por voz, sé respetuoso y disfruta. 🐱",
    "BIENVENIDO A NEXO {user}",
  ]);
  const staleBoost = new Set([
    "¡{user} ha impulsado **Nexo**! Gracias por el boost 🌸 nivel del servidor: **{boosts}**.",
  ]);
  const rows = database.prepare("SELECT guild_id, config FROM guild_config").all() as {
    guild_id: string;
    config: string;
  }[];
  for (const row of rows) {
    let cfg: { welcome?: { message?: string }; boost?: { message?: string } };
    try {
      cfg = JSON.parse(row.config) as { welcome?: { message?: string }; boost?: { message?: string } };
    } catch {
      continue;
    }
    let changed = false;
    if (cfg.welcome?.message && staleWelcome.has(cfg.welcome.message)) {
      cfg.welcome.message = DEFAULT_GUILD_CONFIG.welcome.message;
      changed = true;
    }
    if (cfg.boost?.message && staleBoost.has(cfg.boost.message)) {
      cfg.boost.message = DEFAULT_GUILD_CONFIG.boost.message;
      changed = true;
    }
    if (changed) {
      database
        .prepare("UPDATE guild_config SET config = ?, updated_at = ? WHERE guild_id = ?")
        .run(JSON.stringify(cfg), Date.now(), row.guild_id);
    }
  }
}

function migrateLevelRates(database: Db): void {
  const rows = database.prepare("SELECT guild_id, config FROM guild_config").all() as {
    guild_id: string;
    config: string;
  }[];
  for (const row of rows) {
    let cfg: {
      levels?: {
        xpMin?: number;
        xpMax?: number;
        cooldownMs?: number;
        voiceXpPerMinute?: number;
        voiceXpMin?: number;
        voiceXpMax?: number;
      };
      ai?: { systemPrompt?: string };
    };
    try {
      cfg = JSON.parse(row.config) as typeof cfg;
    } catch {
      continue;
    }
    let changed = false;
    if (cfg.levels) {
      if (cfg.levels.xpMin !== 10 || cfg.levels.xpMax !== 20) {
        cfg.levels.xpMin = 10;
        cfg.levels.xpMax = 20;
        changed = true;
      }
      if (cfg.levels.voiceXpMin !== 5 || cfg.levels.voiceXpMax !== 10) {
        cfg.levels.voiceXpMin = 5;
        cfg.levels.voiceXpMax = 10;
        changed = true;
      }
      if (cfg.levels.voiceXpPerMinute !== undefined) {
        delete cfg.levels.voiceXpPerMinute;
        changed = true;
      }
      if (cfg.levels.cooldownMs !== 60_000) {
        cfg.levels.cooldownMs = 60_000;
        changed = true;
      }
    }
    if (cfg.ai?.systemPrompt?.includes("XP por chat (cooldown ~1 min)")) {
      cfg.ai.systemPrompt = cfg.ai.systemPrompt.replace(
        "XP por chat (cooldown ~1 min) y por minutos en VC con más gente. Quien impulsa el servidor gana ×1.5 XP.",
        "XP de texto: 10–20, una sola vez por minuto si escribes en cualquier canal (spamear no da más). XP de voz: 5–10 por minuto en VC. Quien impulsa el servidor gana ×1.5.",
      );
      changed = true;
    }
    if (changed) {
      database
        .prepare("UPDATE guild_config SET config = ?, updated_at = ? WHERE guild_id = ?")
        .run(JSON.stringify(cfg), Date.now(), row.guild_id);
    }
  }
}

function migrateAiPrompt(database: Db): void {
  const rows = database.prepare("SELECT guild_id, config FROM guild_config").all() as {
    guild_id: string;
    config: string;
  }[];
  for (const row of rows) {
    let cfg: { ai?: { systemPrompt?: string } };
    try {
      cfg = JSON.parse(row.config) as { ai?: { systemPrompt?: string } };
    } catch {
      continue;
    }
    const prompt = cfg.ai?.systemPrompt;
    if (typeof prompt !== "string") continue;
    const stock = (prompt.includes("Eres Neko, la asistente de soporte") || prompt.includes("Eres Neko, la asistente oficial de soporte")) && prompt.includes("NORMAS OFICIALES DE NEXO");
    if (!stock) continue;
    if (prompt.includes("UNIVERSO POKÉMON COMPLETO") && prompt.includes("ASALTOS COOPERATIVOS")) continue;
    cfg.ai = { ...cfg.ai, systemPrompt: DEFAULT_GUILD_CONFIG.ai.systemPrompt };
    database
      .prepare("UPDATE guild_config SET config = ?, updated_at = ? WHERE guild_id = ?")
      .run(JSON.stringify(cfg), Date.now(), row.guild_id);
  }
}

function migrateTicketCategories(database: Db): void {
  const rows = database.prepare("SELECT guild_id, config FROM guild_config").all() as {
    guild_id: string;
    config: string;
  }[];
  for (const row of rows) {
    let cfg: { tickets?: { categories?: { id: string; label: string; description: string; emoji: string }[] } };
    try {
      cfg = JSON.parse(row.config) as typeof cfg;
    } catch {
      continue;
    }
    if (cfg.tickets?.categories && Array.isArray(cfg.tickets.categories)) {
      if (!cfg.tickets.categories.some((c) => c.id === "sugerencias")) {
        // Insert right after 'soporte'
        const soporteIdx = cfg.tickets.categories.findIndex((c) => c.id === "soporte");
        const sugerenciasItem = {
          id: "sugerencias",
          label: "Sugerencias",
          description: "Ideas y propuestas para la comunidad · solo staff",
          emoji: "💡",
        };
        if (soporteIdx !== -1) {
          cfg.tickets.categories.splice(soporteIdx + 1, 0, sugerenciasItem);
        } else {
          cfg.tickets.categories.push(sugerenciasItem);
        }
        database
          .prepare("UPDATE guild_config SET config = ?, updated_at = ? WHERE guild_id = ?")
          .run(JSON.stringify(cfg), Date.now(), row.guild_id);
      }
    }
  }
}

function migrateTradingAssets(database: Db): void {
  const defaults = [
    { asset_id: "btc", name: "Bitcoin", symbol: "BTC", type: "cripto", price: 90000 },
    { asset_id: "eth", name: "Ethereum", symbol: "ETH", type: "cripto", price: 3400 },
    { asset_id: "sol", name: "Solana", symbol: "SOL", type: "cripto", price: 175 },
    { asset_id: "xrp", name: "XRP", symbol: "XRP", type: "cripto", price: 2.5 },
    { asset_id: "ada", name: "Cardano", symbol: "ADA", type: "cripto", price: 0.8 },
    { asset_id: "doge", name: "Dogecoin", symbol: "DOGE", type: "cripto", price: 0.18 },
    { asset_id: "dot", name: "Polkadot", symbol: "DOT", type: "cripto", price: 7.5 },
    { asset_id: "link", name: "Chainlink", symbol: "LINK", type: "cripto", price: 18 },
    { asset_id: "oro", name: "Oro (Oz)", symbol: "ORO", type: "metal", price: 2550 },
    { asset_id: "plata", name: "Plata (Oz)", symbol: "PLATA", type: "metal", price: 32 },
    { asset_id: "platino", name: "Platino (Oz)", symbol: "PLATINO", type: "metal", price: 1020 },
    { asset_id: "paladio", name: "Paladio (Oz)", symbol: "PALADIO", type: "metal", price: 980 },
    { asset_id: "aapl", name: "Apple Inc.", symbol: "AAPL", type: "empresa", price: 230 },
    { asset_id: "nvda", name: "NVIDIA Corp.", symbol: "NVDA", type: "empresa", price: 130 },
    { asset_id: "tsla", name: "Tesla Inc.", symbol: "TSLA", type: "empresa", price: 220 },
    { asset_id: "msft", name: "Microsoft Corp.", symbol: "MSFT", type: "empresa", price: 410 },
    { asset_id: "nexo", name: "Nexo Corp", symbol: "NEXO", type: "empresa", price: 650 },
    { asset_id: "amzn", name: "Amazon.com Inc.", symbol: "AMZN", type: "empresa", price: 185 },
    { asset_id: "googl", name: "Alphabet Inc.", symbol: "GOOGL", type: "empresa", price: 165 },
    { asset_id: "meta", name: "Meta Platforms Inc.", symbol: "META", type: "empresa", price: 510 },
    { asset_id: "dis", name: "The Walt Disney Co.", symbol: "DIS", type: "empresa", price: 95 },
    { asset_id: "amd", name: "AMD Inc.", symbol: "AMD", type: "empresa", price: 165 },
    { asset_id: "nflx", name: "Netflix Inc.", symbol: "NFLX", type: "empresa", price: 680 },
    { asset_id: "orcl", name: "Oracle Corp.", symbol: "ORCL", type: "empresa", price: 175 },
    { asset_id: "mcd", name: "McDonald's Corp.", symbol: "MCD", type: "empresa", price: 295 },
  ];
  const now = Date.now();
  const ins = database.prepare(`
    INSERT OR IGNORE INTO asset_prices (asset_id, name, symbol, type, current_price, open_24h_price, high_24h_price, low_24h_price, history, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const a of defaults) {
    ins.run(a.asset_id, a.name, a.symbol, a.type, a.price, a.price, a.price, a.price, JSON.stringify([a.price]), now);
  }
}

function migrateCleanupBadQuotes(database: Db): void {
  try {
    database.prepare("DELETE FROM quotes WHERE text LIKE '%Entre maullidos y marat%'").run();
  } catch {
    /* ignore */
  }
}

function migratePassiveEconomy(database: Db): void {
  database.exec(`
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
  `);
}

function migrateRpg(database: Db): void {
  const cols = new Set(
    (database.prepare("PRAGMA table_info(rpg_players)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has("last_battle_at")) {
    database.exec("ALTER TABLE rpg_players ADD COLUMN last_battle_at INTEGER NOT NULL DEFAULT 0");
  }
  if (!cols.has("last_dungeon_at")) {
    database.exec("ALTER TABLE rpg_players ADD COLUMN last_dungeon_at INTEGER NOT NULL DEFAULT 0");
  }
}

function migrateBump(database: Db): void {
  database.exec(`
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
  `);
}

function migrateGiveawaysAndInvites(database: Db): void {
  const cols = new Set(
    (database.prepare("PRAGMA table_info(giveaway_entries)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has("entries")) {
    database.exec("ALTER TABLE giveaway_entries ADD COLUMN entries INTEGER NOT NULL DEFAULT 1");
  }
  if (!cols.has("boost_count")) {
    database.exec("ALTER TABLE giveaway_entries ADD COLUMN boost_count INTEGER NOT NULL DEFAULT 0");
  }
  if (!cols.has("invite_count")) {
    database.exec("ALTER TABLE giveaway_entries ADD COLUMN invite_count INTEGER NOT NULL DEFAULT 0");
  }
  if (!cols.has("joined_at")) {
    database.exec("ALTER TABLE giveaway_entries ADD COLUMN joined_at INTEGER NOT NULL DEFAULT 0");
  }

  database.exec(`
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
  `);
}

function migrateBoostTracking(database: Db): void {
  const cols = new Set(
    (database.prepare("PRAGMA table_info(boost_events)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has("source")) {
    database.exec("ALTER TABLE boost_events ADD COLUMN source TEXT NOT NULL DEFAULT 'unknown'");
  }

  // Los registros antiguos con un total del servidor proceden de avisos de bots.
  database.exec(`
    UPDATE boost_events
    SET source = 'announcement'
    WHERE source = 'unknown' AND server_boosts > 0
  `);

}

function migrateQuoteDaily(database: Db): void {
  const cols = new Set(
    (database.prepare("PRAGMA table_info(quote_daily)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has("quote_text")) {
    database.exec("ALTER TABLE quote_daily ADD COLUMN quote_text TEXT");
  }
}

function migrateBankHeists(database: Db): void {
  const cols = new Set(
    (database.prepare("PRAGMA table_info(bank_heists)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has("id")) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS bank_heists_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        leader_id TEXT NOT NULL,
        participants TEXT NOT NULL,
        loot_amount INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'planning',
        ends_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      INSERT INTO bank_heists_new (guild_id, leader_id, participants, loot_amount, status, ends_at, created_at)
        SELECT guild_id, leader_id, participants, loot_amount, status, ends_at, created_at FROM bank_heists;
      DROP TABLE bank_heists;
      ALTER TABLE bank_heists_new RENAME TO bank_heists;
      CREATE INDEX IF NOT EXISTS idx_bank_heists_guild ON bank_heists (guild_id, created_at DESC);
    `);
  }

  if (!cols.has("target_id")) {
    try {
      database.exec("ALTER TABLE bank_heists ADD COLUMN target_id TEXT NOT NULL DEFAULT 'banco'");
    } catch {
      /* ignore */
    }
  }

  try {
    database.exec(`
      INSERT OR IGNORE INTO heist_target_security (guild_id, target_id, security_level, consecutive_wins, last_heist_at, updated_at)
      SELECT guild_id, 'banco', security_level, consecutive_wins, last_heist_at, updated_at FROM bank_security;
    `);
  } catch {
    /* ignore */
  }
}

function migrateHeistLevel10Milestones(database: Db): void {
  const cols = new Set(
    (database.prepare("PRAGMA table_info(heist_target_security)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has("max_level_reached")) {
    try {
      database.exec("ALTER TABLE heist_target_security ADD COLUMN max_level_reached INTEGER NOT NULL DEFAULT 1");
    } catch {
      /* ignore */
    }
  }
  if (!cols.has("level_10_reached")) {
    try {
      database.exec("ALTER TABLE heist_target_security ADD COLUMN level_10_reached INTEGER NOT NULL DEFAULT 0");
    } catch {
      /* ignore */
    }
  }
  try {
    database.exec("UPDATE heist_target_security SET level_10_reached = 1, max_level_reached = 10 WHERE security_level >= 10");
  } catch {
    /* ignore */
  }
}

function migrateGangInvestments(database: Db): void {
  try {
    database.exec(`
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
    `);
  } catch {
    /* ignore */
  }
}

function migrateReputationAndFeedback(database: Db): void {
  try {
    database.exec(`
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
    `);
  } catch {
    /* ignore */
  }
}

function migrateTicketMessages(database: Db): void {
  try {
    const cols = new Set(
      (database.prepare("PRAGMA table_info(ticket_messages)").all() as { name: string }[]).map((c) => c.name),
    );
    if (!cols.has("message_id")) {
      database.exec("ALTER TABLE ticket_messages ADD COLUMN message_id TEXT;");
    }
    if (!cols.has("original_content")) {
      database.exec("ALTER TABLE ticket_messages ADD COLUMN original_content TEXT;");
    }
    if (!cols.has("edited_at")) {
      database.exec("ALTER TABLE ticket_messages ADD COLUMN edited_at INTEGER;");
    }
    if (!cols.has("deleted_at")) {
      database.exec("ALTER TABLE ticket_messages ADD COLUMN deleted_at INTEGER;");
    }
    database.exec("CREATE INDEX IF NOT EXISTS idx_ticket_msg_id ON ticket_messages (message_id);");
  } catch {
    /* ignore */
  }
}

function migrateUserPets(database: Db): void {
  const cols = new Set(
    (database.prepare("PRAGMA table_info(user_pets)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has("is_active")) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS user_pets_new (
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
        is_active INTEGER NOT NULL DEFAULT 1
      );
      INSERT INTO user_pets_new (id, guild_id, user_id, pet_type, name, level, exp, happiness, last_feed, last_pet, on_expedition_until, expedition_hours, expedition_reward, created_at, is_active)
        SELECT id, guild_id, user_id, pet_type, name, level, exp, happiness, last_feed, last_pet, on_expedition_until, expedition_hours, expedition_reward, created_at, 1 FROM user_pets;
      DROP TABLE user_pets;
      ALTER TABLE user_pets_new RENAME TO user_pets;
      CREATE INDEX IF NOT EXISTS idx_user_pets_user ON user_pets (guild_id, user_id);
    `);
  }

  // Migración automática de mascotas clásicas a especies Pokémon oficiales
  database.exec(`
    UPDATE user_pets SET pet_type = 'charizard' WHERE pet_type = 'dragon';
    UPDATE user_pets SET pet_type = 'noctowl' WHERE pet_type = 'buho';
    UPDATE user_pets SET pet_type = 'vulpix' WHERE pet_type = 'zorro';
    UPDATE user_pets SET pet_type = 'growlithe' WHERE pet_type = 'shiba' OR pet_type = 'perro';
    UPDATE user_pets SET pet_type = 'meowth' WHERE pet_type = 'gato';
  `);
}

function migrateUserPokedex(database: Db): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_pokedex (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      species_id TEXT NOT NULL,
      caught_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id, species_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_pokedex_user ON user_pokedex (guild_id, user_id);
    UPDATE user_pokedex SET species_id = 'charizard' WHERE species_id = 'dragon';
    UPDATE user_pokedex SET species_id = 'noctowl' WHERE species_id = 'buho';
    UPDATE user_pokedex SET species_id = 'vulpix' WHERE species_id = 'zorro';
    UPDATE user_pokedex SET species_id = 'growlithe' WHERE species_id = 'shiba' OR species_id = 'perro';
    UPDATE user_pokedex SET species_id = 'meowth' WHERE species_id = 'gato';
    INSERT OR IGNORE INTO user_pokedex (guild_id, user_id, species_id, caught_at)
      SELECT guild_id, user_id, pet_type, created_at FROM user_pets;
  `);
}

function migrateUserGymBadges(database: Db): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_gym_badges (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      beaten_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id, badge_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_gym_badges ON user_gym_badges (guild_id, user_id);
  `);
}

function migratePokemonSystems(database: Db): void {
  database.exec(`
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
  `);
}

function migrateSecurityItemLimits(database: Db): void {
  database.exec(`
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
  `);

  const CANDADO_PRICE = 680;
  const VPN_PRICE = 1020;
  const EXEMPT_USER_ID = "600041740124160011";

  const rows = database.prepare("SELECT guild_id, user_id, wallet, bank, inventory FROM economy").all() as {
    guild_id: string;
    user_id: string;
    wallet: number;
    bank: number;
    inventory: string;
  }[];

  const updateStmt = database.prepare("UPDATE economy SET bank = bank + ?, inventory = ? WHERE guild_id = ? AND user_id = ?");

  for (const row of rows) {
    if (row.user_id === EXEMPT_USER_ID) continue;
    let inv: Record<string, number>;
    try {
      inv = JSON.parse(row.inventory || "{}");
    } catch {
      continue;
    }

    let refund = 0;
    let modified = false;

    if (inv["candado"] && inv["candado"] > 50) {
      const excess = inv["candado"] - 50;
      refund += excess * CANDADO_PRICE;
      inv["candado"] = 50;
      modified = true;
    }

    if (inv["vpn"] && inv["vpn"] > 50) {
      const excess = inv["vpn"] - 50;
      refund += excess * VPN_PRICE;
      inv["vpn"] = 50;
      modified = true;
    }

    if (modified) {
      updateStmt.run(refund, JSON.stringify(inv), row.guild_id, row.user_id);
      try {
        database.prepare(`
          INSERT INTO economy_transactions (guild_id, user_id, delta_wallet, delta_bank, net_delta, new_wallet, new_bank, source, created_at)
          VALUES (?, ?, 0, ?, ?, ?, ?, 'Devolución por ajuste de límite de candados/VPNs', ?)
        `).run(row.guild_id, row.user_id, refund, refund, row.wallet, row.bank + refund, Date.now());
      } catch {
        /* ignore */
      }
    }
  }
}

function migrateHeistExpansion(database: Db): void {
  database.exec(`
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
  `);

  const gangCols = new Set(
    (database.prepare("PRAGMA table_info(gangs)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!gangCols.has("last_tribute_at")) {
    database.exec("ALTER TABLE gangs ADD COLUMN last_tribute_at INTEGER NOT NULL DEFAULT 0;");
  }
  if (!gangCols.has("role_id")) {
    database.exec("ALTER TABLE gangs ADD COLUMN role_id TEXT NOT NULL DEFAULT '';");
  }
}

function deepMerge<T extends Record<string, unknown>>(base: T, extra: Partial<T> | undefined): T {
  if (!extra) return structuredClone(base);
  const out: Record<string, unknown> = structuredClone(base);
  for (const [k, v] of Object.entries(extra)) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object" && out[k] && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export function getGuildConfig(guildId: string): GuildConfig {
  const row = getDb()
    .prepare("SELECT config FROM guild_config WHERE guild_id = ?")
    .get(guildId) as { config: string } | undefined;
  if (!row) return structuredClone(DEFAULT_GUILD_CONFIG);
  try {
    return deepMerge(DEFAULT_GUILD_CONFIG as unknown as Record<string, unknown>, JSON.parse(row.config)) as unknown as GuildConfig;
  } catch {
    return structuredClone(DEFAULT_GUILD_CONFIG);
  }
}

export function setGuildConfig(guildId: string, patch: Partial<GuildConfig>): GuildConfig {
  const current = getGuildConfig(guildId);
  const next = deepMerge(current as unknown as Record<string, unknown>, patch as Record<string, unknown>) as unknown as GuildConfig;
  getDb()
    .prepare(
      `INSERT INTO guild_config (guild_id, config, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at`,
    )
    .run(guildId, JSON.stringify(next), Date.now());
  return next;
}

export function nextCaseId(guildId: string): number {
  const row = getDb()
    .prepare("SELECT MAX(case_id) AS m FROM cases WHERE guild_id = ?")
    .get(guildId) as { m: number | null };
  return (row.m ?? 0) + 1;
}

export interface CaseRow {
  id: number;
  guild_id: string;
  case_id: number;
  type: string;
  user_id: string;
  moderator_id: string;
  reason: string | null;
  duration_ms: number | null;
  expires_at: number | null;
  active: number;
  extra: string | null;
  created_at: number;
}

export function insertCase(data: {
  guildId: string;
  type: string;
  userId: string;
  moderatorId: string;
  reason?: string | null;
  durationMs?: number | null;
  expiresAt?: number | null;
  extra?: unknown;
}): CaseRow {
  const createdAt = Date.now();
  const insert = getDb().transaction(() => {
    const caseId = nextCaseId(data.guildId);
    const info = getDb()
      .prepare(
        `INSERT INTO cases (guild_id, case_id, type, user_id, moderator_id, reason, duration_ms, expires_at, active, extra, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .run(
        data.guildId, caseId, data.type, data.userId, data.moderatorId, data.reason ?? null,
        data.durationMs ?? null, data.expiresAt ?? null, data.extra ? JSON.stringify(data.extra) : null, createdAt,
      );
    return { caseId, info };
  });
  const { caseId, info } = insert();
  return {
    id: Number(info.lastInsertRowid),
    guild_id: data.guildId,
    case_id: caseId,
    type: data.type,
    user_id: data.userId,
    moderator_id: data.moderatorId,
    reason: data.reason ?? null,
    duration_ms: data.durationMs ?? null,
    expires_at: data.expiresAt ?? null,
    active: 1,
    extra: data.extra ? JSON.stringify(data.extra) : null,
    created_at: createdAt,
  };
}

export function getCasesForUser(guildId: string, userId: string, activeOnly = false): CaseRow[] {
  const sql = activeOnly
    ? "SELECT * FROM cases WHERE guild_id = ? AND user_id = ? AND active = 1 ORDER BY case_id DESC"
    : "SELECT * FROM cases WHERE guild_id = ? AND user_id = ? ORDER BY case_id DESC";
  return getDb().prepare(sql).all(guildId, userId) as CaseRow[];
}

export function getCase(guildId: string, caseId: number): CaseRow | undefined {
  return getDb()
    .prepare("SELECT * FROM cases WHERE guild_id = ? AND case_id = ?")
    .get(guildId, caseId) as CaseRow | undefined;
}

export function deactivateCase(guildId: string, caseId: number): void {
  getDb().prepare("UPDATE cases SET active = 0 WHERE guild_id = ? AND case_id = ?").run(guildId, caseId);
}

export function updateCaseReason(guildId: string, caseId: number, newReason: string): CaseRow | undefined {
  getDb()
    .prepare("UPDATE cases SET reason = ? WHERE guild_id = ? AND case_id = ?")
    .run(newReason, guildId, caseId);
  return getCase(guildId, caseId);
}

export function deleteCase(guildId: string, caseId: number): boolean {
  const res = getDb().prepare("DELETE FROM cases WHERE guild_id = ? AND case_id = ?").run(guildId, caseId);
  return res.changes > 0;
}

export function countActiveWarns(guildId: string, userId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM cases WHERE guild_id = ? AND user_id = ? AND type = 'warn' AND active = 1")
    .get(guildId, userId) as { c: number };
  return row.c;
}

export function upsertMember(data: {
  guildId: string;
  userId: string;
  username?: string | null;
  displayName?: string | null;
  avatar?: string | null;
  bot?: boolean;
  joinedAt?: number | null;
  leftAt?: number | null;
  roles?: string[];
}): void {
  getDb()
    .prepare(
      `INSERT INTO members (guild_id, user_id, username, display_name, avatar, bot, joined_at, left_at, roles)
       VALUES (@guildId, @userId, @username, @displayName, @avatar, @bot, @joinedAt, @leftAt, @roles)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET
         username = COALESCE(excluded.username, members.username),
         display_name = COALESCE(excluded.display_name, members.display_name),
         avatar = COALESCE(excluded.avatar, members.avatar),
         bot = excluded.bot,
         joined_at = COALESCE(excluded.joined_at, members.joined_at),
         left_at = excluded.left_at,
         roles = COALESCE(excluded.roles, members.roles)`,
    )
    .run({
      guildId: data.guildId,
      userId: data.userId,
      username: data.username ?? null,
      displayName: data.displayName ?? null,
      avatar: data.avatar ?? null,
      bot: data.bot ? 1 : 0,
      joinedAt: data.joinedAt ?? null,
      leftAt: data.leftAt ?? null,
      roles: data.roles ? JSON.stringify(data.roles) : null,
    });
}

export function upsertMembers(rows: Parameters<typeof upsertMember>[0][]): void {
  const tx = getDb().transaction(() => {
    for (const row of rows) upsertMember(row);
  });
  tx();
}

export interface LevelRow {
  guild_id: string;
  user_id: string;
  xp: number;
  level: number;
  messages: number;
  voice_seconds: number;
  last_xp_at: number;
  level_ping: number;
}

export function getLevel(guildId: string, userId: string): LevelRow {
  const row = getDb()
    .prepare("SELECT * FROM levels WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as LevelRow | undefined;
  if (row) return { ...row, level_ping: row.level_ping ?? 1 };
  getDb()
    .prepare("INSERT INTO levels (guild_id, user_id) VALUES (?, ?)")
    .run(guildId, userId);
  return {
    guild_id: guildId,
    user_id: userId,
    xp: 0,
    level: 0,
    messages: 0,
    voice_seconds: 0,
    last_xp_at: 0,
    level_ping: 1,
  };
}

export function setLevelPing(guildId: string, userId: string, enabled: boolean): boolean {
  getLevel(guildId, userId);
  getDb()
    .prepare("UPDATE levels SET level_ping = ? WHERE guild_id = ? AND user_id = ?")
    .run(enabled ? 1 : 0, guildId, userId);
  return enabled;
}

export function saveLevel(row: LevelRow): void {
  getDb()
    .prepare(
      `INSERT INTO levels (guild_id, user_id, xp, level, messages, voice_seconds, last_xp_at)
       VALUES (@guild_id, @user_id, @xp, @level, @messages, @voice_seconds, @last_xp_at)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET
         xp = excluded.xp, level = excluded.level, messages = excluded.messages,
         voice_seconds = excluded.voice_seconds, last_xp_at = excluded.last_xp_at`,
    )
    .run(row);
}

export function topLevels(guildId: string, limit = 10): LevelRow[] {
  return getDb()
    .prepare("SELECT * FROM levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ?")
    .all(guildId, limit) as LevelRow[];
}

export function getRank(guildId: string, userId: string): number {
  const row = getDb()
    .prepare(
      `SELECT 1 + (SELECT COUNT(*) FROM levels l2 WHERE l2.guild_id = l.guild_id AND l2.xp > l.xp) AS rank
       FROM levels l WHERE l.guild_id = ? AND l.user_id = ?`,
    )
    .get(guildId, userId) as { rank: number } | undefined;
  return row?.rank ?? 0;
}

export function archiveMessage(data: {
  messageId: string;
  guildId: string;
  channelId: string;
  authorId: string;
  authorTag?: string | null;
  content?: string | null;
  attachments?: unknown;
  createdAt: number;
}): void {
  getDb()
    .prepare(
      `INSERT INTO message_archive (message_id, guild_id, channel_id, author_id, author_tag, content, attachments, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(message_id) DO UPDATE SET content = excluded.content, attachments = excluded.attachments, edited = 1`,
    )
    .run(
      data.messageId,
      data.guildId,
      data.channelId,
      data.authorId,
      data.authorTag ?? null,
      data.content ?? null,
      data.attachments ? JSON.stringify(data.attachments) : null,
      data.createdAt,
    );
}

export function markDeleted(messageId: string): void {
  getDb().prepare("UPDATE message_archive SET deleted = 1 WHERE message_id = ?").run(messageId);
}

export function getArchivedMessage(messageId: string) {
  return getDb().prepare("SELECT * FROM message_archive WHERE message_id = ?").get(messageId) as
    | {
        message_id: string;
        guild_id: string;
        channel_id: string;
        author_id: string;
        author_tag: string | null;
        content: string | null;
        attachments: string | null;
        created_at: number;
        deleted: number;
        edited: number;
      }
    | undefined;
}

export function pruneArchive(channelId: string, keep = 1500): void {
  getDb()
    .prepare(
      `DELETE FROM message_archive WHERE channel_id = ? AND message_id NOT IN (
         SELECT message_id FROM message_archive WHERE channel_id = ? ORDER BY created_at DESC LIMIT ?
       )`,
    )
    .run(channelId, channelId, keep);
}

export function pruneAllArchives(keep = 1500): void {
  const channels = getDb().prepare("SELECT DISTINCT channel_id FROM message_archive").all() as { channel_id: string }[];
  for (const row of channels) pruneArchive(row.channel_id, keep);
}

// ── Colecciones Rewards ──
export function hasClaimedCollection(guildId: string, userId: string, collectionId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM collection_claims WHERE guild_id = ? AND user_id = ? AND collection_id = ?")
    .get(guildId, userId, collectionId);
  return Boolean(row);
}

export function claimCollectionReward(guildId: string, userId: string, collectionId: string, amount = 10000): void {
  getDb()
    .prepare(
      "INSERT INTO collection_claims (guild_id, user_id, collection_id, reward_amount, claimed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(guild_id, user_id, collection_id) DO NOTHING",
    )
    .run(guildId, userId, collectionId, amount, Date.now());
}

// ── P2P Offers ──
export interface P2POfferRow {
  id: string;
  guild_id: string;
  sender_id: string;
  target_id: string;
  type: "sell" | "buy";
  item_id: string;
  quantity: number;
  price: number;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired";
  message_id: string | null;
  channel_id: string | null;
  expires_at: number;
  created_at: number;
}

export function insertP2POffer(offer: {
  id: string;
  guildId: string;
  senderId: string;
  targetId: string;
  type: "sell" | "buy";
  itemId: string;
  quantity: number;
  price: number;
  channelId?: string;
  messageId?: string;
  expiresAt: number;
}): void {
  getDb()
    .prepare(
      `INSERT INTO p2p_offers (id, guild_id, sender_id, target_id, type, item_id, quantity, price, status, channel_id, message_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    )
    .run(
      offer.id,
      offer.guildId,
      offer.senderId,
      offer.targetId,
      offer.type,
      offer.itemId,
      offer.quantity,
      offer.price,
      offer.channelId ?? null,
      offer.messageId ?? null,
      offer.expiresAt,
      Date.now(),
    );
}

export function getP2POffer(id: string): P2POfferRow | undefined {
  return getDb().prepare("SELECT * FROM p2p_offers WHERE id = ?").get(id) as P2POfferRow | undefined;
}

export function updateP2POfferStatus(id: string, status: "accepted" | "rejected" | "cancelled" | "expired"): boolean {
  const result = getDb()
    .prepare("UPDATE p2p_offers SET status = ? WHERE id = ? AND status = 'pending'")
    .run(status, id);
  return result.changes > 0;
}

// ── RPG System ──
export interface RpgPlayerRow {
  guild_id: string;
  user_id: string;
  class: string;
  level: number;
  xp: number;
  hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  speed: number;
  potions: number;
  wins: number;
  losses: number;
  dungeon_floor: number;
  clan_id: number | null;
  last_battle_at: number;
  last_dungeon_at: number;
  created_at: number;
  updated_at: number;
}

export interface RpgClanRow {
  id: number;
  guild_id: string;
  name: string;
  tag: string;
  description: string | null;
  leader_id: string;
  level: number;
  xp: number;
  score: number;
  created_at: number;
}

export type RpgClanMemberRole = "leader" | "officer" | "member";

export interface RpgClanApplicationRow {
  guild_id: string;
  clan_id: number;
  user_id: string;
  requested_at: number;
}

export function getRpgPlayer(guildId: string, userId: string): RpgPlayerRow | undefined {
  const row = getDb().prepare("SELECT * FROM rpg_players WHERE guild_id = ? AND user_id = ?").get(guildId, userId) as
    | RpgPlayerRow
    | undefined;
  if (row) {
    row.last_battle_at = row.last_battle_at ?? 0;
    row.last_dungeon_at = row.last_dungeon_at ?? 0;
  }
  return row;
}

export function createRpgPlayer(
  guildId: string,
  userId: string,
  className: string,
  stats: { hp: number; attack: number; defense: number; speed: number },
): RpgPlayerRow {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO rpg_players (guild_id, user_id, class, level, xp, hp, max_hp, attack, defense, speed, potions, wins, losses, dungeon_floor, clan_id, last_battle_at, last_dungeon_at, created_at, updated_at)
       VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?, 3, 0, 0, 1, NULL, 0, 0, ?, ?)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET class = excluded.class, hp = excluded.hp, max_hp = excluded.max_hp, attack = excluded.attack, defense = excluded.defense, speed = excluded.speed, updated_at = excluded.updated_at`,
    )
    .run(guildId, userId, className, stats.hp, stats.hp, stats.attack, stats.defense, stats.speed, now, now);
  return getRpgPlayer(guildId, userId)!;
}

export function saveRpgPlayer(player: RpgPlayerRow): void {
  player.updated_at = Date.now();
  player.last_battle_at = player.last_battle_at ?? 0;
  player.last_dungeon_at = player.last_dungeon_at ?? 0;
  getDb()
    .prepare(
      `UPDATE rpg_players SET
        class = @class, level = @level, xp = @xp, hp = @hp, max_hp = @max_hp,
        attack = @attack, defense = @defense, speed = @speed, potions = @potions,
        wins = @wins, losses = @losses, dungeon_floor = @dungeon_floor,
        clan_id = @clan_id, last_battle_at = @last_battle_at, last_dungeon_at = @last_dungeon_at,
        updated_at = @updated_at
       WHERE guild_id = @guild_id AND user_id = @user_id`,
    )
    .run(player);
}

export function getRpgTopPlayers(guildId: string, limit = 10): RpgPlayerRow[] {
  return getDb()
    .prepare("SELECT * FROM rpg_players WHERE guild_id = ? ORDER BY level DESC, xp DESC, wins DESC LIMIT ?")
    .all(guildId, limit) as RpgPlayerRow[];
}

export function createRpgClan(
  guildId: string,
  name: string,
  tag: string,
  description: string,
  leaderId: string,
): RpgClanRow {
  const now = Date.now();
  const info = getDb()
    .prepare(
      `INSERT INTO rpg_clans (guild_id, name, tag, description, leader_id, level, xp, score, created_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?)`,
    )
    .run(guildId, name, tag, description, leaderId, now);
  const clanId = Number(info.lastInsertRowid);
  addRpgClanMember(guildId, clanId, leaderId, "leader");
  getDb().prepare("UPDATE rpg_players SET clan_id = ? WHERE guild_id = ? AND user_id = ?").run(clanId, guildId, leaderId);
  return getRpgClan(guildId, clanId)!;
}

export function getRpgClan(guildId: string, clanId: number): RpgClanRow | undefined {
  return getDb().prepare("SELECT * FROM rpg_clans WHERE guild_id = ? AND id = ?").get(guildId, clanId) as
    | RpgClanRow
    | undefined;
}

export function getRpgClanByName(guildId: string, name: string): RpgClanRow | undefined {
  return getDb()
    .prepare("SELECT * FROM rpg_clans WHERE guild_id = ? AND (LOWER(name) = LOWER(?) OR LOWER(tag) = LOWER(?))")
    .get(guildId, name, name) as RpgClanRow | undefined;
}

export function getUserRpgClan(
  guildId: string,
  userId: string,
): { clan: RpgClanRow; memberRole: string } | undefined {
  const member = getDb()
    .prepare("SELECT clan_id, role FROM rpg_clan_members WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as { clan_id: number; role: string } | undefined;
  if (!member) return undefined;
  const clan = getRpgClan(guildId, member.clan_id);
  if (!clan) return undefined;
  return { clan, memberRole: member.role };
}

export function addRpgClanMember(
  guildId: string,
  clanId: number,
  userId: string,
  role: RpgClanMemberRole = "member",
): void {
  getDb()
    .prepare(
      `INSERT INTO rpg_clan_members (guild_id, clan_id, user_id, role, joined_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET clan_id = excluded.clan_id, role = excluded.role`,
    )
    .run(guildId, clanId, userId, role, Date.now());
  getDb().prepare("UPDATE rpg_players SET clan_id = ? WHERE guild_id = ? AND user_id = ?").run(clanId, guildId, userId);
}

export function getRpgClanApplication(
  guildId: string,
  clanId: number,
  userId: string,
): RpgClanApplicationRow | undefined {
  return getDb()
    .prepare("SELECT * FROM rpg_clan_applications WHERE guild_id = ? AND clan_id = ? AND user_id = ?")
    .get(guildId, clanId, userId) as RpgClanApplicationRow | undefined;
}

export function getRpgClanApplicationForUser(
  guildId: string,
  userId: string,
): (RpgClanApplicationRow & { clan_name: string; clan_tag: string }) | undefined {
  return getDb()
    .prepare(
      `SELECT a.*, c.name AS clan_name, c.tag AS clan_tag
       FROM rpg_clan_applications a
       JOIN rpg_clans c ON c.guild_id = a.guild_id AND c.id = a.clan_id
       WHERE a.guild_id = ? AND a.user_id = ?
       ORDER BY a.requested_at DESC
       LIMIT 1`,
    )
    .get(guildId, userId) as (RpgClanApplicationRow & { clan_name: string; clan_tag: string }) | undefined;
}

export function getRpgClanApplications(guildId: string, clanId: number): RpgClanApplicationRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM rpg_clan_applications WHERE guild_id = ? AND clan_id = ? ORDER BY requested_at ASC",
    )
    .all(guildId, clanId) as RpgClanApplicationRow[];
}

export function createRpgClanApplication(guildId: string, clanId: number, userId: string): boolean {
  const result = getDb()
    .prepare(
      `INSERT OR IGNORE INTO rpg_clan_applications (guild_id, clan_id, user_id, requested_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(guildId, clanId, userId, Date.now());
  return result.changes > 0;
}

export function approveRpgClanApplication(
  guildId: string,
  clanId: number,
  userId: string,
  leaderId: string,
): "approved" | "not_leader" | "missing" | "already_member" {
  const db = getDb();
  return db.transaction(() => {
    const clan = getRpgClan(guildId, clanId);
    if (!clan || clan.leader_id !== leaderId) return "not_leader";
    if (!getRpgClanApplication(guildId, clanId, userId)) return "missing";
    if (getUserRpgClan(guildId, userId)) {
      db.prepare("DELETE FROM rpg_clan_applications WHERE guild_id = ? AND clan_id = ? AND user_id = ?")
        .run(guildId, clanId, userId);
      return "already_member";
    }
    addRpgClanMember(guildId, clanId, userId, "member");
    db.prepare("DELETE FROM rpg_clan_applications WHERE guild_id = ? AND clan_id = ? AND user_id = ?")
      .run(guildId, clanId, userId);
    return "approved";
  })();
}

export function rejectRpgClanApplication(
  guildId: string,
  clanId: number,
  userId: string,
  leaderId: string,
): "rejected" | "not_leader" | "missing" {
  const db = getDb();
  return db.transaction(() => {
    const clan = getRpgClan(guildId, clanId);
    if (!clan || clan.leader_id !== leaderId) return "not_leader";
    const result = db
      .prepare("DELETE FROM rpg_clan_applications WHERE guild_id = ? AND clan_id = ? AND user_id = ?")
      .run(guildId, clanId, userId);
    return result.changes > 0 ? "rejected" : "missing";
  })();
}

export function setRpgClanMemberRole(
  guildId: string,
  clanId: number,
  userId: string,
  role: "officer" | "member",
): boolean {
  const result = getDb()
    .prepare(
      "UPDATE rpg_clan_members SET role = ? WHERE guild_id = ? AND clan_id = ? AND user_id = ? AND role != 'leader'",
    )
    .run(role, guildId, clanId, userId);
  return result.changes > 0;
}

export function removeRpgClanMember(guildId: string, userId: string): void {
  getDb().prepare("DELETE FROM rpg_clan_members WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
  getDb().prepare("UPDATE rpg_players SET clan_id = NULL WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
}

export function getRpgClanMembers(guildId: string, clanId: number): { user_id: string; role: string; joined_at: number }[] {
  return getDb()
    .prepare("SELECT user_id, role, joined_at FROM rpg_clan_members WHERE guild_id = ? AND clan_id = ? ORDER BY joined_at ASC")
    .all(guildId, clanId) as { user_id: string; role: string; joined_at: number }[];
}

export function getRpgTopClans(guildId: string, limit = 10): (RpgClanRow & { member_count: number })[] {
  return getDb()
    .prepare(
      `SELECT c.*, COUNT(m.user_id) as member_count
       FROM rpg_clans c
       LEFT JOIN rpg_clan_members m ON c.guild_id = m.guild_id AND c.id = m.clan_id
       WHERE c.guild_id = ?
       GROUP BY c.id
       ORDER BY c.score DESC, c.level DESC, c.xp DESC
       LIMIT ?`,
    )
    .all(guildId, limit) as (RpgClanRow & { member_count: number })[];
}

export function updateRpgClan(clan: RpgClanRow): void {
  getDb()
    .prepare(
      `UPDATE rpg_clans SET
        name = @name, tag = @tag, description = @description, leader_id = @leader_id,
        level = @level, xp = @xp, score = @score
       WHERE guild_id = @guild_id AND id = @id`,
    )
    .run(clan);
}

export function deleteRpgClan(guildId: string, clanId: number): boolean {
  getDb().prepare("DELETE FROM rpg_clan_applications WHERE guild_id = ? AND clan_id = ?").run(guildId, clanId);
  getDb().prepare("DELETE FROM rpg_clan_members WHERE guild_id = ? AND clan_id = ?").run(guildId, clanId);
  getDb().prepare("UPDATE rpg_players SET clan_id = NULL WHERE guild_id = ? AND clan_id = ?").run(guildId, clanId);
  const res = getDb().prepare("DELETE FROM rpg_clans WHERE guild_id = ? AND id = ?").run(guildId, clanId);
  return res.changes > 0;
}

export function transferRpgClanLeadership(guildId: string, clanId: number, oldLeaderId: string, newLeaderId: string): boolean {
  const db = getDb();
  return db.transaction(() => {
    const clan = getRpgClan(guildId, clanId);
    if (!clan || clan.leader_id !== oldLeaderId) return false;
    const target = db
      .prepare("SELECT role FROM rpg_clan_members WHERE guild_id = ? AND clan_id = ? AND user_id = ?")
      .get(guildId, clanId, newLeaderId) as { role: string } | undefined;
    if (!target) return false;
    db.prepare("UPDATE rpg_clans SET leader_id = ? WHERE guild_id = ? AND id = ?")
      .run(newLeaderId, guildId, clanId);
    db.prepare("UPDATE rpg_clan_members SET role = 'leader' WHERE guild_id = ? AND clan_id = ? AND user_id = ?")
      .run(guildId, clanId, newLeaderId);
    db.prepare("UPDATE rpg_clan_members SET role = 'officer' WHERE guild_id = ? AND clan_id = ? AND user_id = ?")
      .run(guildId, clanId, oldLeaderId);
    return true;
  })();
}

// ── Crypto Miners ──
export interface CryptoMinerRow {
  guild_id: string;
  user_id: string;
  rig_tier: number;
  target_asset: string;
  last_claim: number;
  overclock_until: number;
  total_mined: number;
  created_at: number;
}

export function getCryptoMiner(guildId: string, userId: string): CryptoMinerRow | undefined {
  return getDb()
    .prepare("SELECT * FROM crypto_miners WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as CryptoMinerRow | undefined;
}

export function saveCryptoMiner(miner: CryptoMinerRow): void {
  getDb()
    .prepare(
      `INSERT INTO crypto_miners (guild_id, user_id, rig_tier, target_asset, last_claim, overclock_until, total_mined, created_at)
       VALUES (@guild_id, @user_id, @rig_tier, @target_asset, @last_claim, @overclock_until, @total_mined, @created_at)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET
         rig_tier = excluded.rig_tier,
         target_asset = excluded.target_asset,
         last_claim = excluded.last_claim,
         overclock_until = excluded.overclock_until,
         total_mined = excluded.total_mined`,
    )
    .run(miner);
}

// ── Bank Fixed Deposits (Plazo Fijo) ──
export interface FixedDepositRow {
  id: number;
  guild_id: string;
  user_id: string;
  amount: number;
  plan_days: number;
  interest_rate: number;
  reward_amount: number;
  ends_at: number;
  claimed: number;
  created_at: number;
}

export function createFixedDeposit(data: {
  guildId: string;
  userId: string;
  amount: number;
  planDays: number;
  interestRate: number;
  rewardAmount: number;
  endsAt: number;
}): number {
  const info = getDb()
    .prepare(
      `INSERT INTO bank_fixed_deposits (guild_id, user_id, amount, plan_days, interest_rate, reward_amount, ends_at, claimed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    )
    .run(
      data.guildId,
      data.userId,
      data.amount,
      data.planDays,
      data.interestRate,
      data.rewardAmount,
      data.endsAt,
      Date.now(),
    );
  return Number(info.lastInsertRowid);
}

export function getUserFixedDeposits(guildId: string, userId: string, activeOnly = false): FixedDepositRow[] {
  const sql = activeOnly
    ? "SELECT * FROM bank_fixed_deposits WHERE guild_id = ? AND user_id = ? AND claimed = 0 ORDER BY ends_at ASC"
    : "SELECT * FROM bank_fixed_deposits WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT 20";
  return getDb().prepare(sql).all(guildId, userId) as FixedDepositRow[];
}

export function claimFixedDeposit(id: number): boolean {
  const res = getDb().prepare("UPDATE bank_fixed_deposits SET claimed = 1 WHERE id = ? AND claimed = 0").run(id);
  return res.changes > 0;
}

// ── Daily Dividends Log ──
export interface DailyDividendsLogRow {
  date_key: string;
  guild_id: string;
  total_distributed: number;
  recipients_count: number;
  paid_at: number;
}

export function hasDividendsDistributedToday(dateKey: string, guildId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 FROM daily_dividends_log WHERE date_key = ? AND guild_id = ?")
    .get(dateKey, guildId);
  return Boolean(row);
}

export function recordDividendsLog(dateKey: string, guildId: string, totalDistributed: number, recipientsCount: number): void {
  getDb()
    .prepare(
      `INSERT INTO daily_dividends_log (date_key, guild_id, total_distributed, recipients_count, paid_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date_key, guild_id) DO UPDATE SET
         total_distributed = excluded.total_distributed,
         recipients_count = excluded.recipients_count,
         paid_at = excluded.paid_at`,
    )
    .run(dateKey, guildId, totalDistributed, recipientsCount, Date.now());
}
