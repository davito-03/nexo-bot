import { getDb } from "../../database/index.js";
import { getEco, saveEco, addWallet, n } from "../economy/engine.js";

export const REP_COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20 horas

export interface ReputationInfo {
  guildId: string;
  userId: string;
  points: number;
  lastGivenAt: number;
  rank: number;
  recentLogs: { fromUserId: string; reason: string | null; createdAt: number }[];
}

export function getUserReputation(guildId: string, userId: string): ReputationInfo {
  const db = getDb();

  const row = db
    .prepare("SELECT points, last_given_at FROM user_reputation WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as { points: number; last_given_at: number } | undefined;

  const points = row ? row.points : 0;
  const lastGivenAt = row ? row.last_given_at : 0;

  // Calcular ranking en el servidor
  const rankRow = db
    .prepare(
      "SELECT COUNT(*) + 1 AS rank FROM user_reputation WHERE guild_id = ? AND points > ?",
    )
    .get(guildId, points) as { rank: number };

  const recentLogs = db
    .prepare(
      "SELECT from_user_id AS fromUserId, reason, created_at AS createdAt FROM reputation_logs WHERE guild_id = ? AND to_user_id = ? ORDER BY created_at DESC LIMIT 5",
    )
    .all(guildId, userId) as { fromUserId: string; reason: string | null; createdAt: number }[];

  return {
    guildId,
    userId,
    points,
    lastGivenAt,
    rank: rankRow ? rankRow.rank : 1,
    recentLogs,
  };
}

export function giveReputation(
  guildId: string,
  fromUserId: string,
  toUserId: string,
  reason?: string,
): { success: boolean; error?: string; targetPoints?: number; rewardGiven?: number; cooldownUntil?: number } {
  if (fromUserId === toUserId) {
    return { success: false, error: "No puedes darte puntos de reputación a ti mismo." };
  }

  const db = getDb();
  const now = Date.now();

  const senderRow = db
    .prepare("SELECT last_given_at FROM user_reputation WHERE guild_id = ? AND user_id = ?")
    .get(guildId, fromUserId) as { last_given_at: number } | undefined;

  const lastGiven = senderRow ? senderRow.last_given_at : 0;
  if (now - lastGiven < REP_COOLDOWN_MS) {
    const cdUntil = lastGiven + REP_COOLDOWN_MS;
    return {
      success: false,
      error: `Ya has otorgado tu punto de reputación diario. Podrás volver a dar reputación <t:${Math.floor(cdUntil / 1000)}:R>.`,
      cooldownUntil: cdUntil,
    };
  }

  const tx = db.transaction(() => {
    // 1. Actualizar cooldown del emisor
    db.prepare(`
      INSERT INTO user_reputation (guild_id, user_id, points, last_given_at)
      VALUES (?, ?, 0, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        last_given_at = excluded.last_given_at
    `).run(guildId, fromUserId, now);

    // 2. Incrementar puntos del receptor
    db.prepare(`
      INSERT INTO user_reputation (guild_id, user_id, points, last_given_at)
      VALUES (?, ?, 1, 0)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        points = points + 1
    `).run(guildId, toUserId);

    // 3. Registrar log de reputación
    db.prepare(`
      INSERT INTO reputation_logs (guild_id, from_user_id, to_user_id, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(guildId, fromUserId, toUserId, reason?.trim().slice(0, 150) || null, now);

    // 4. Bonificación económica por cordialidad comunitaria
    // Receptor: +300 nexocoins | Emisor: +150 nexocoins
    const targetEco = getEco(guildId, toUserId);
    addWallet(targetEco, 300);
    saveEco(targetEco, "Recompensa por recibir reputación comunitaria");

    const senderEco = getEco(guildId, fromUserId);
    addWallet(senderEco, 150);
    saveEco(senderEco, "Recompensa por otorgar reputación comunitaria");

    const targetRow = db
      .prepare("SELECT points FROM user_reputation WHERE guild_id = ? AND user_id = ?")
      .get(guildId, toUserId) as { points: number };

    return targetRow.points;
  });

  const newPoints = tx();

  return {
    success: true,
    targetPoints: newPoints,
    rewardGiven: 300,
  };
}

export function getTopReputation(
  guildId: string,
  limit = 10,
): { userId: string; points: number }[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT user_id AS userId, points FROM user_reputation WHERE guild_id = ? AND points > 0 ORDER BY points DESC LIMIT ?",
    )
    .all(guildId, limit) as { userId: string; points: number }[];
}
