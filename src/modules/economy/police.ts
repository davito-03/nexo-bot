import { getDb } from "../../database/index.js";
import { getEco, saveEco, n } from "./engine.js";

export const POLICE_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 días de cooldown para volver a alistarse tras desertar

export interface PoliceOfficerRecord {
  guildId: string;
  userId: string;
  rank: string;
  joinedAt: number;
  interceptsWon: number;
  totalFinesCollected: number;
  cooldownUntil: number;
}

export const POLICE_RANKS: { minIntercepts: number; rank: string; badge: string; bonusPay: number }[] = [
  { minIntercepts: 0, rank: "Cadete de Policía", badge: "👮‍♂️", bonusPay: 0 },
  { minIntercepts: 3, rank: "Oficial de Patrulla", badge: "🚔", bonusPay: 0.05 },
  { minIntercepts: 8, rank: "Inspector de Homicidios", badge: "🕵️‍♂️", bonusPay: 0.10 },
  { minIntercepts: 15, rank: "Capitán del SWAT", badge: "🛡️", bonusPay: 0.15 },
  { minIntercepts: 25, rank: "Comisario General", badge: "⭐", bonusPay: 0.25 },
];

export function getRankForIntercepts(intercepts: number): { rank: string; badge: string; bonusPay: number } {
  let res = POLICE_RANKS[0];
  for (const r of POLICE_RANKS) {
    if (intercepts >= r.minIntercepts) res = r;
  }
  return res;
}

/**
 * Retorna el registro policial del usuario en el servidor, si existe.
 */
export function getPoliceOfficer(guildId: string, userId: string): PoliceOfficerRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT guild_id AS guildId, user_id AS userId, rank, joined_at AS joinedAt,
           intercepts_won AS interceptsWon, total_fines_collected AS totalFinesCollected,
           cooldown_until AS cooldownUntil
    FROM police_officers
    WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId) as PoliceOfficerRecord | undefined;

  return row || null;
}

/**
 * Comprueba si un usuario es actualmente un oficial en activo.
 * (Existe el registro, no está en cooldown de deserción)
 */
export function isUserPolice(guildId: string, userId: string): boolean {
  const officer = getPoliceOfficer(guildId, userId);
  if (!officer) return false;
  // Si tiene un cooldown activo de deserción, ya no es oficial
  if (officer.cooldownUntil > Date.now()) return false;
  return true;
}

/**
 * Alista a un usuario como oficial de policía.
 * Requiere no estar en una banda criminal y no tener un cooldown de deserción activo.
 */
export function enlistInPolice(
  guildId: string,
  userId: string,
): { success: boolean; officer?: PoliceOfficerRecord; error?: string; cooldownUntil?: number } {
  const db = getDb();

  // 1. Comprobar si el usuario pertenece a alguna banda criminal
  const gangMember = db.prepare("SELECT gang_id FROM gang_members WHERE guild_id = ? AND user_id = ?").get(
    guildId,
    userId,
  ) as { gang_id: string } | undefined;

  if (gangMember) {
    return {
      success: false,
      error: "No puedes ingresar al Cuerpo de Policía mientras pertenezcas a una banda criminal. Debes abandonar tu banda primero con `/banda salir`.",
    };
  }

  // 2. Comprobar cooldown de deserción
  const existing = getPoliceOfficer(guildId, userId);
  const now = Date.now();
  if (existing && existing.cooldownUntil > now) {
    return {
      success: false,
      error: `Tienes una sanción disciplinaria por deserción criminal. Podrás volver a solicitar ingreso en la policía <t:${Math.floor(
        existing.cooldownUntil / 1000,
      )}:R>.`,
      cooldownUntil: existing.cooldownUntil,
    };
  }

  if (existing && existing.cooldownUntil <= now && isUserPolice(guildId, userId)) {
    return {
      success: false,
      error: `Ya eres un oficial de policía en activo con el rango de **${existing.rank}**.`,
    };
  }

  // 3. Registrar o rehabilitar al oficial
  if (existing) {
    db.prepare(`
      UPDATE police_officers
      SET rank = 'Cadete de Policía', joined_at = ?, cooldown_until = 0
      WHERE guild_id = ? AND user_id = ?
    `).run(now, guildId, userId);
  } else {
    db.prepare(`
      INSERT INTO police_officers (guild_id, user_id, rank, joined_at, intercepts_won, total_fines_collected, cooldown_until)
      VALUES (?, ?, 'Cadete de Policía', ?, 0, 0, 0)
    `).run(guildId, userId, now);
  }

  const updated = getPoliceOfficer(guildId, userId)!;
  return {
    success: true,
    officer: updated,
  };
}

/**
 * Deserta del cuerpo policial para cometer delitos o unirse a una banda.
 * Aplica un cooldown estricto de 3 días antes de poder volver a ingresar.
 */
export function desertPoliceForce(
  guildId: string,
  userId: string,
): { success: boolean; cooldownUntil: number } {
  const db = getDb();
  const cooldownUntil = Date.now() + POLICE_COOLDOWN_MS;

  const existing = getPoliceOfficer(guildId, userId);
  if (existing) {
    db.prepare(`
      UPDATE police_officers
      SET cooldown_until = ?, rank = 'Desertor'
      WHERE guild_id = ? AND user_id = ?
    `).run(cooldownUntil, guildId, userId);
  } else {
    db.prepare(`
      INSERT INTO police_officers (guild_id, user_id, rank, joined_at, intercepts_won, total_fines_collected, cooldown_until)
      VALUES (?, ?, 'Desertor', ?, 0, 0, ?)
    `).run(guildId, userId, Date.now(), cooldownUntil);
  }

  return {
    success: true,
    cooldownUntil,
  };
}

/**
 * Recompensa a los oficiales de policía tras una intercepción exitosa de una banda criminal.
 */
export function recordPoliceIntercept(
  guildId: string,
  policeUserIds: string[],
  totalFinePool: number,
): void {
  const db = getDb();
  if (policeUserIds.length === 0 || totalFinePool <= 0) return;

  // Los policías se reparten hasta el 50% de las multas como recompensa estatal
  const rewardShare = Math.floor((totalFinePool * 0.5) / policeUserIds.length);

  for (const uid of policeUserIds) {
    const officer = getPoliceOfficer(guildId, uid);
    if (!officer) continue;

    const newIntercepts = officer.interceptsWon + 1;
    const rankInfo = getRankForIntercepts(newIntercepts);
    const finalReward = Math.round(rewardShare * (1 + rankInfo.bonusPay));

    const eco = getEco(guildId, uid);
    eco.bank += finalReward;
    saveEco(eco, "Recompensa policial por intercepción judicial");

    db.prepare(`
      UPDATE police_officers
      SET intercepts_won = ?, total_fines_collected = total_fines_collected + ?, rank = ?
      WHERE guild_id = ? AND user_id = ?
    `).run(newIntercepts, finalReward, rankInfo.rank, guildId, uid);
  }
}

/**
 * Retorna los mejores oficiales de policía del servidor.
 */
export function getTopPoliceOfficers(guildId: string, limit = 10): PoliceOfficerRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT guild_id AS guildId, user_id AS userId, rank, joined_at AS joinedAt,
           intercepts_won AS interceptsWon, total_fines_collected AS totalFinesCollected,
           cooldown_until AS cooldownUntil
    FROM police_officers
    WHERE guild_id = ? AND cooldown_until <= ?
    ORDER BY intercepts_won DESC, total_fines_collected DESC
    LIMIT ?
  `).all(guildId, Date.now(), limit) as PoliceOfficerRecord[];

  return rows;
}
