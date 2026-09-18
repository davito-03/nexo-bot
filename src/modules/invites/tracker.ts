import type { Guild } from "discord.js";
import { getDb } from "../../database/index.js";
import { logger } from "../../logger.js";

export interface InviteDetails {
  userId: string;
  activeMembers: number;
  totalUses: number;
  bonusInvites: number;
  finalCount: number;
}

/**
 * Obtiene el número total de personas invitadas válidas para un usuario en el servidor.
 * Se calcula combinando los miembros activos actuales en `join_invites`, los usos de sus códigos de invitación y las invitaciones en vivo.
 */
export async function getUserInviteCount(guild: Guild, userId: string): Promise<number> {
  const details = await getUserInviteDetails(guild, userId);
  return details.finalCount;
}

/**
 * Obtiene el desglose detallado de invitaciones de un usuario en un servidor.
 */
export async function getUserInviteDetails(guild: Guild, userId: string): Promise<InviteDetails> {
  const db = getDb();

  // 1. Miembros registrados en join_invites que aún siguen en el servidor
  const trackedRow = db
    .prepare(
      `SELECT COUNT(DISTINCT j.user_id) as c
       FROM join_invites j
       LEFT JOIN members m ON j.guild_id = m.guild_id AND j.user_id = m.user_id
       WHERE j.guild_id = ? AND j.inviter_id = ? AND (m.left_at IS NULL OR m.left_at = 0)`,
    )
    .get(guild.id, userId) as { c: number } | undefined;
  const activeMembers = trackedRow?.c ?? 0;

  // 2. Suma de usos registrados de sus códigos de invitación
  const codeRow = db
    .prepare(
      `SELECT SUM(uses) as total_uses
       FROM invites
       WHERE guild_id = ? AND inviter_id = ?`,
    )
    .get(guild.id, userId) as { total_uses: number | null } | undefined;
  const dbCodeUses = codeRow?.total_uses ?? 0;

  // 3. Invitaciones vivas en la caché o API de Discord
  let liveUses = 0;
  try {
    const invites = guild.invites.cache;
    for (const inv of invites.values()) {
      if (inv.inviter?.id === userId) {
        liveUses += inv.uses ?? 0;
      }
    }
  } catch {
    // ignore
  }

  // 4. Invitaciones bonus asignadas manualmente
  const bonusRow = db
    .prepare("SELECT bonus_invites FROM invite_stats WHERE guild_id = ? AND user_id = ?")
    .get(guild.id, userId) as { bonus_invites: number } | undefined;
  const bonusInvites = bonusRow?.bonus_invites ?? 0;

  const totalUses = Math.max(activeMembers, dbCodeUses, liveUses);
  const finalCount = totalUses + bonusInvites;

  return {
    userId,
    activeMembers,
    totalUses,
    bonusInvites,
    finalCount: Math.max(0, finalCount),
  };
}

/**
 * Asigna o ajusta invitaciones bonus para un miembro (solo administradores).
 */
export function setBonusInvites(guildId: string, userId: string, bonus: number): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO invite_stats (guild_id, user_id, bonus_invites, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      bonus_invites = excluded.bonus_invites,
      updated_at = excluded.updated_at
  `).run(guildId, userId, bonus, Date.now());
}

/**
 * Obtiene el ranking de mejores invitadores de un servidor.
 */
export async function getInviteLeaderboard(guild: Guild, limit = 10): Promise<{ userId: string; count: number }[]> {
  const db = getDb();

  // Obtener invitadores desde join_invites
  const fromJoin = db
    .prepare(
      `SELECT j.inviter_id as user_id, COUNT(DISTINCT j.user_id) as count
       FROM join_invites j
       LEFT JOIN members m ON j.guild_id = m.guild_id AND j.user_id = m.user_id
       WHERE j.guild_id = ? AND j.inviter_id IS NOT NULL AND (m.left_at IS NULL OR m.left_at = 0)
       GROUP BY j.inviter_id`,
    )
    .all(guild.id) as { user_id: string; count: number }[];

  // Obtener invitadores desde invites table
  const fromCodes = db
    .prepare(
      `SELECT inviter_id as user_id, SUM(uses) as count
       FROM invites
       WHERE guild_id = ? AND inviter_id IS NOT NULL
       GROUP BY inviter_id`,
    )
    .all(guild.id) as { user_id: string; count: number }[];

  const map = new Map<string, number>();

  for (const r of fromJoin) {
    map.set(r.user_id, Math.max(map.get(r.user_id) ?? 0, r.count));
  }
  for (const r of fromCodes) {
    map.set(r.user_id, Math.max(map.get(r.user_id) ?? 0, r.count));
  }

  // Comprobar invitaciones vivas
  try {
    for (const inv of guild.invites.cache.values()) {
      if (inv.inviter?.id) {
        const id = inv.inviter.id;
        map.set(id, Math.max(map.get(id) ?? 0, inv.uses ?? 0));
      }
    }
  } catch {
    // ignore
  }

  // Sumar bonus
  const bonuses = db
    .prepare("SELECT user_id, bonus_invites FROM invite_stats WHERE guild_id = ? AND bonus_invites != 0")
    .all(guild.id) as { user_id: string; bonus_invites: number }[];
  for (const b of bonuses) {
    map.set(b.user_id, (map.get(b.user_id) ?? 0) + b.bonus_invites);
  }

  return [...map.entries()]
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([userId, count]) => ({ userId, count }));
}
