import { getDb } from "../../database/index.js";
import { getEco, saveEco, addWallet, totalFunds, n, type EcoRow } from "./engine.js";
import { getCryptoMiner } from "../../database/index.js";
import { getVoiceStats } from "../voice/profile.js";

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  titleReward: string;
  coinReward: number;
  category: "riqueza" | "casino" | "mineria" | "actividad" | "comunidad";
  check: (guildId: string, userId: string, eco: EcoRow, extra?: any) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "ahorrador_1",
    name: "Primer Millón",
    emoji: "🪙",
    description: "Alcanza un balance total de 1.000.000 NexoCoins (cartera + banco).",
    titleReward: "🪙 Millonario",
    coinReward: 5000,
    category: "riqueza",
    check: (_gid, _uid, eco) => totalFunds(eco) >= 1_000_000,
  },
  {
    id: "ahorrador_2",
    name: "Magnate Financiero",
    emoji: "💎",
    description: "Alcanza un balance total de 100.000.000 NexoCoins.",
    titleReward: "💎 Magnate",
    coinReward: 50000,
    category: "riqueza",
    check: (_gid, _uid, eco) => totalFunds(eco) >= 100_000_000,
  },
  {
    id: "ahorrador_3",
    name: "Rey Midas",
    emoji: "👑",
    description: "Alcanza un balance total de 1.000.000.000 NexoCoins.",
    titleReward: "👑 Billonario",
    coinReward: 250000,
    category: "riqueza",
    check: (_gid, _uid, eco) => totalFunds(eco) >= 1_000_000_000,
  },
  {
    id: "trabajador_incansable",
    name: "Obrero del Mes",
    emoji: "🔨",
    description: "Mantén una racha diaria de /eco daily de al menos 7 días.",
    titleReward: "🔨 Incansable",
    coinReward: 10000,
    category: "actividad",
    check: (_gid, _uid, eco) => eco.daily_streak >= 7,
  },
  {
    id: "minero_iniciado",
    name: "Fiebre Minera",
    emoji: "⛏️",
    description: "Mejora tu estación de criptominería hasta Nivel 5.",
    titleReward: "⛏️ Minero",
    coinReward: 5000,
    category: "mineria",
    check: (gid, uid) => {
      const m = getCryptoMiner(gid, uid);
      return Boolean(m && m.rig_tier >= 5);
    },
  },
  {
    id: "minero_maestro",
    name: "Poder Cuántico",
    emoji: "🔮",
    description: "Mejora tu estación de criptominería hasta Nivel 15.",
    titleReward: "🔮 Cuántico",
    coinReward: 25000,
    category: "mineria",
    check: (gid, uid) => {
      const m = getCryptoMiner(gid, uid);
      return Boolean(m && m.rig_tier >= 15);
    },
  },
  {
    id: "minero_dios",
    name: "Génesis Absoluto",
    emoji: "♾️",
    description: "Alcanza la cima absoluta: Nivel 30 de criptominería.",
    titleReward: "♾️ Génesis",
    coinReward: 100000,
    category: "mineria",
    check: (gid, uid) => {
      const m = getCryptoMiner(gid, uid);
      return Boolean(m && m.rig_tier >= 30);
    },
  },
  {
    id: "lobo_de_wallstreet",
    name: "Inversor Audaz",
    emoji: "📈",
    description: "Posee más de 50.000 NexoCoins invertidos en el mercado de trading.",
    titleReward: "📈 Trader Pro",
    coinReward: 15000,
    category: "riqueza",
    check: (gid, uid) => {
      const row = getDb()
        .prepare("SELECT SUM(invested) as s FROM user_portfolio WHERE guild_id = ? AND user_id = ?")
        .get(gid, uid) as { s: number | null } | undefined;
      return (row?.s ?? 0) >= 50000;
    },
  },
  {
    id: "temerario",
    name: "Superviviente del Gatillo",
    emoji: "🎯",
    description: "Sobrevive y cobra beneficios en la ruleta rusa contra la casa.",
    titleReward: "🎯 Temerario",
    coinReward: 15000,
    category: "casino",
    check: (_gid, _uid, _eco, extra) => extra?.action === "rusa_survived",
  },
  {
    id: "pescador_legendario",
    name: "Monstruo del Abismo",
    emoji: "🎣",
    description: "Captura un ejemplar legendario o mítico en pesca o caza.",
    titleReward: "🎣 Pescador Mítico",
    coinReward: 20000,
    category: "actividad",
    check: (_gid, _uid, _eco, extra) => extra?.rarity === "legendario" || extra?.rarity === "mitico",
  },
  {
    id: "guardian_contador",
    name: "Héroe del Servidor",
    emoji: "🛟",
    description: "Salva el conteo del servidor o compra un salvavidas.",
    titleReward: "🛟 Héroe de Nexo",
    coinReward: 25000,
    category: "comunidad",
    check: (_gid, _uid, _eco, extra) => extra?.action === "saved_count" || extra?.action === "bought_save",
  },
  {
    id: "noctambulo_voz",
    name: "Amo del Micrófono",
    emoji: "🎙️",
    description: "Consigue una racha de voz de al menos 3 días en llamadas de Nexo.",
    titleReward: "🎙️ Locutor",
    coinReward: 10000,
    category: "actividad",
    check: (gid, uid) => {
      const st = getVoiceStats(gid, uid);
      return st.streak >= 3;
    },
  },
];

export function getUserAchievements(guildId: string, userId: string): { achievement: AchievementDef; unlockedAt: number }[] {
  const rows = getDb()
    .prepare("SELECT achievement_id, unlocked_at FROM user_achievements WHERE guild_id = ? AND user_id = ?")
    .all(guildId, userId) as { achievement_id: string; unlocked_at: number }[];
  const map = new Map(rows.map((r) => [r.achievement_id, r.unlocked_at]));
  const list: { achievement: AchievementDef; unlockedAt: number }[] = [];
  for (const ach of ACHIEVEMENTS) {
    const unlockedAt = map.get(ach.id);
    if (unlockedAt) list.push({ achievement: ach, unlockedAt });
  }
  return list;
}

export function getUserTitles(guildId: string, userId: string): string[] {
  const rows = getDb()
    .prepare("SELECT title_id FROM user_titles WHERE guild_id = ? AND user_id = ?")
    .all(guildId, userId) as { title_id: string }[];
  return rows.map((r) => r.title_id);
}

export function getEquippedTitle(guildId: string, userId: string): string | null {
  const row = getDb()
    .prepare("SELECT equipped_title FROM user_title_equipped WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as { equipped_title: string } | undefined;
  return row?.equipped_title ?? null;
}

export function setEquippedTitle(guildId: string, userId: string, title: string | null): boolean {
  if (!title) {
    getDb().prepare("DELETE FROM user_title_equipped WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
    return true;
  }
  const unlocked = getUserTitles(guildId, userId);
  if (!unlocked.includes(title)) return false;
  getDb()
    .prepare("INSERT OR REPLACE INTO user_title_equipped (guild_id, user_id, equipped_title, updated_at) VALUES (?, ?, ?, ?)")
    .run(guildId, userId, title, Date.now());
  return true;
}

export function grantAchievement(guildId: string, userId: string, achievementId: string): boolean {
  const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!def) return false;

  const existing = getDb()
    .prepare("SELECT 1 FROM user_achievements WHERE guild_id = ? AND user_id = ? AND achievement_id = ?")
    .get(guildId, userId, achievementId);
  if (existing) return false;

  const now = Date.now();
  getDb().transaction(() => {
    getDb()
      .prepare("INSERT INTO user_achievements (guild_id, user_id, achievement_id, unlocked_at) VALUES (?, ?, ?, ?)")
      .run(guildId, userId, achievementId, now);
    getDb()
      .prepare("INSERT OR IGNORE INTO user_titles (guild_id, user_id, title_id, unlocked_at) VALUES (?, ?, ?, ?)")
      .run(guildId, userId, def.titleReward, now);

    // Otorgar recompensa de monedas
    if (def.coinReward > 0) {
      const eco = getEco(guildId, userId);
      addWallet(eco, def.coinReward);
      saveEco(eco);
    }
  })();

  return true;
}

export function checkUserAchievements(guildId: string, userId: string, extra?: any): AchievementDef[] {
  const eco = getEco(guildId, userId);
  const unlockedNow: AchievementDef[] = [];

  for (const ach of ACHIEVEMENTS) {
    try {
      if (ach.check(guildId, userId, eco, extra)) {
        if (grantAchievement(guildId, userId, ach.id)) {
          unlockedNow.push(ach);
        }
      }
    } catch {
      /* ignore */
    }
  }

  return unlockedNow;
}
