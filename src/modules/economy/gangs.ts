import crypto from "node:crypto";
import type { Client, Guild, Role } from "discord.js";
import { getDb } from "../../database/index.js";
import { getEco, saveEco, deductFunds, addWallet, n } from "./engine.js";
import { isUserPolice } from "./police.js";
import { logger } from "../../logger.js";

export const GANG_CREATION_COST = 50_000;

export interface GangRecord {
  id: string;
  guildId: string;
  name: string;
  tag: string;
  leaderId: string;
  description: string;
  balance: number;
  totalLootEarned: number;
  level: number;
  lastTributeAt?: number;
  roleId?: string;
  createdAt: number;
}

export type GangRole = "leader" | "co_leader" | "sicario" | "member" | "recluta";

export interface GangMemberRecord {
  guildId: string;
  gangId: string;
  userId: string;
  role: GangRole;
  joinedAt: number;
  contribution: number;
}

export const GANG_ROLES_INFO: Record<GangRole, { name: string; badge: string; rankLevel: number }> = {
  leader: { name: "Capo / Padrino", badge: "👑", rankLevel: 5 },
  co_leader: { name: "Lugarteniente", badge: "🎖️", rankLevel: 4 },
  sicario: { name: "Sicario", badge: "💀", rankLevel: 3 },
  member: { name: "Soldado", badge: "🔫", rankLevel: 2 },
  recluta: { name: "Recluta", badge: "🔰", rankLevel: 1 },
};

export interface GangUpgradeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  maxLevel: number;
  costs: number[]; // Costo por nivel [nv1, nv2, nv3, nv4, nv5]
  bonuses: string[]; // Descripción del bono por nivel
}

export const GANG_UPGRADES: Record<string, GangUpgradeDef> = {
  taller: {
    id: "taller",
    name: "Taller Mecánico Clandestino",
    emoji: "🚗",
    description: "Modifica furgones con nitro y blindaje para facilitar la huida ante fallos.",
    maxLevel: 5,
    costs: [150_000, 350_000, 750_000, 1_500_000, 3_000_000],
    bonuses: [
      "+2.5% de probabilidad de huida en furgón de escape",
      "+5.0% de probabilidad de huida en furgón de escape",
      "+7.5% de probabilidad de huida en furgón de escape",
      "+10.0% de probabilidad de huida en furgón de escape",
      "+12.0% de probabilidad de huida en furgón de escape",
    ],
  },
  clinica: {
    id: "clinica",
    name: "Clínica Clandestina de Campaña",
    emoji: "🏥",
    description: "Atención médica subterránea que agiliza la recuperación de los miembros detenidos.",
    maxLevel: 5,
    costs: [120_000, 300_000, 650_000, 1_300_000, 2_600_000],
    bonuses: [
      "-10% de tiempo en el calabozo tras una captura policial",
      "-20% de tiempo en el calabozo tras una captura policial",
      "-30% de tiempo en el calabozo tras una captura policial",
      "-40% de tiempo en el calabozo tras una captura policial",
      "-50% de tiempo en el calabozo tras una captura policial",
    ],
  },
  antena: {
    id: "antena",
    name: "Antena de Escucha Policial",
    emoji: "📡",
    description: "Interpreta las transmisiones de la policía para anticipar reaperturas de objetivos.",
    maxLevel: 5,
    costs: [180_000, 420_000, 900_000, 1_800_000, 3_500_000],
    bonuses: [
      "Reduce 3 minutos el enfriamiento de objetivos asaltados",
      "Reduce 6 minutos el enfriamiento de objetivos asaltados",
      "Reduce 9 minutos el enfriamiento de objetivos asaltados",
      "Reduce 12 minutos el enfriamiento de objetivos asaltados",
      "Reduce 15 minutos el enfriamiento de objetivos asaltados",
    ],
  },
  abogados: {
    id: "abogados",
    name: "Bufete de Abogados Corruptos",
    emoji: "💼",
    description: "Tramitación de recursos y sobornos legales para rebajar multas judiciales.",
    maxLevel: 5,
    costs: [200_000, 480_000, 1_000_000, 2_200_000, 4_500_000],
    bonuses: [
      "-7% en las multas judiciales de los miembros capturados",
      "-14% en las multas judiciales de los miembros capturados",
      "-21% en las multas judiciales de los miembros capturados",
      "-28% en las multas judiciales de los miembros capturados",
      "-35% en las multas judiciales de los miembros capturados",
    ],
  },
  polvorin: {
    id: "polvorin",
    name: "Polvorín del Inframundo",
    emoji: "💣",
    description: "Almacén subterráneo con cargas térmicas y dinamita militar para abrir más cajas fuertes.",
    maxLevel: 5,
    costs: [250_000, 600_000, 1_300_000, 2_600_000, 5_200_000],
    bonuses: [
      "+3% de botín adicional en asaltos exitosos",
      "+6% de botín adicional en asaltos exitosos",
      "+9% de botín adicional en asaltos exitosos",
      "+12% de botín adicional en asaltos exitosos",
      "+15% de botín adicional en asaltos exitosos",
    ],
  },
  garito: {
    id: "garito",
    name: "Garito Clandestino de Apuestas",
    emoji: "🎲",
    description: "Genera dividendos ilegales diarios automáticos para la caja fuerte de la banda.",
    maxLevel: 5,
    costs: [180_000, 420_000, 950_000, 1_900_000, 3_800_000],
    bonuses: [
      "+15.000 🪙 de ingresos pasivos diarios a la caja de la banda",
      "+30.000 🪙 de ingresos pasivos diarios a la caja de la banda",
      "+45.000 🪙 de ingresos pasivos diarios a la caja de la banda",
      "+60.000 🪙 de ingresos pasivos diarios a la caja de la banda",
      "+80.000 🪙 de ingresos pasivos diarios a la caja de la banda",
    ],
  },
  blanqueo: {
    id: "blanqueo",
    name: "Red de Empresas Fantasma",
    emoji: "🧼",
    description: "Blanquea capitales ilícitos otorgando un bono porcentual extra sobre los depósitos a la caja.",
    maxLevel: 5,
    costs: [150_000, 380_000, 850_000, 1_700_000, 3_400_000],
    bonuses: [
      "+4% de saldo extra sobre cada depósito en la caja",
      "+8% de saldo extra sobre cada depósito en la caja",
      "+12% de saldo extra sobre cada depósito en la caja",
      "+16% de saldo extra sobre cada depósito en la caja",
      "+20% de saldo extra sobre cada depósito en la caja",
    ],
  },
};

/**
 * Obtiene la banda a la que pertenece un usuario (si pertenece a alguna).
 */
export function getUserGang(
  guildId: string,
  userId: string,
): { gang: GangRecord; member: GangMemberRecord } | null {
  const db = getDb();
  const member = db.prepare(`
    SELECT guild_id AS guildId, gang_id AS gangId, user_id AS userId, role, joined_at AS joinedAt, contribution
    FROM gang_members
    WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId) as GangMemberRecord | undefined;

  if (!member) return null;

  const gang = db.prepare(`
    SELECT id, guild_id AS guildId, name, tag, leader_id AS leaderId, description, balance,
           total_loot_earned AS totalLootEarned, level, COALESCE(last_tribute_at, 0) AS lastTributeAt,
           COALESCE(role_id, '') AS roleId, created_at AS createdAt
    FROM gangs
    WHERE guild_id = ? AND id = ?
  `).get(guildId, member.gangId) as GangRecord | undefined;

  if (!gang) return null;

  return { gang, member };
}

/**
 * Obtiene una banda por su ID.
 */
export function getGangById(guildId: string, gangId: string): GangRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, guild_id AS guildId, name, tag, leader_id AS leaderId, description, balance,
           total_loot_earned AS totalLootEarned, level, COALESCE(last_tribute_at, 0) AS lastTributeAt,
           COALESCE(role_id, '') AS roleId, created_at AS createdAt
    FROM gangs
    WHERE guild_id = ? AND id = ?
  `).get(guildId, gangId) as GangRecord | undefined;

  return row || null;
}

/**
 * Busca una banda por nombre o tag.
 */
export function getGangByNameOrTag(guildId: string, query: string): GangRecord | null {
  const db = getDb();
  const clean = query.trim();
  const cleanTag = clean.toUpperCase().replace(/^\[|\]$/g, "");

  const row = db.prepare(`
    SELECT id, guild_id AS guildId, name, tag, leader_id AS leaderId, description, balance,
           total_loot_earned AS totalLootEarned, level, COALESCE(last_tribute_at, 0) AS lastTributeAt,
           COALESCE(role_id, '') AS roleId, created_at AS createdAt
    FROM gangs
    WHERE guild_id = ? AND (LOWER(name) = LOWER(?) OR UPPER(tag) = ?)
  `).get(guildId, clean, cleanTag) as GangRecord | undefined;

  return row || null;
}

/**
 * Obtiene todos los miembros de una banda ordenados por rango y aportación.
 */
export function getGangMembers(guildId: string, gangId: string): GangMemberRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT guild_id AS guildId, gang_id AS gangId, user_id AS userId, role, joined_at AS joinedAt, contribution
    FROM gang_members
    WHERE guild_id = ? AND gang_id = ?
    ORDER BY CASE role
      WHEN 'leader' THEN 1
      WHEN 'co_leader' THEN 2
      WHEN 'sicario' THEN 3
      WHEN 'member' THEN 4
      ELSE 5
    END, contribution DESC
  `).all(guildId, gangId) as GangMemberRecord[];
}

/**
 * Obtiene los niveles de mejoras de una banda.
 */
export function getGangUpgrades(guildId: string, gangId: string): Record<string, number> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT upgrade_id, level
    FROM gang_upgrades
    WHERE guild_id = ? AND gang_id = ?
  `).all(guildId, gangId) as { upgrade_id: string; level: number }[];

  const upgrades: Record<string, number> = {
    taller: 0,
    clinica: 0,
    antena: 0,
    abogados: 0,
    polvorin: 0,
    garito: 0,
    blanqueo: 0,
  };
  for (const r of rows) {
    upgrades[r.upgrade_id] = r.level;
  }
  return upgrades;
}

/**
 * Crea una nueva banda criminal permanente.
 */
export async function createGang(
  guildId: string,
  userId: string,
  name: string,
  tag: string,
  guild?: Guild,
): Promise<{ success: boolean; gang?: GangRecord; error?: string }> {
  const db = getDb();

  // Comprobar si es oficial de policía
  if (isUserPolice(guildId, userId)) {
    return {
      success: false,
      error: "Los oficiales del Cuerpo de Policía no pueden fundar sindicatos delictivos. Debes desertar del cuerpo primero con `/policia desertar`.",
    };
  }

  // Comprobar si ya está en una banda
  const existing = getUserGang(guildId, userId);
  if (existing) {
    return {
      success: false,
      error: `Ya eres miembro de la banda **[${existing.gang.tag}] ${existing.gang.name}**. Debes abandonarla con \`/banda salir\` antes de crear una nueva.`,
    };
  }

  const cleanName = name.trim();
  const cleanTag = tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (cleanName.length < 3 || cleanName.length > 30) {
    return { success: false, error: "El nombre de la banda debe tener entre 3 y 30 caracteres." };
  }
  if (cleanTag.length < 2 || cleanTag.length > 5) {
    return { success: false, error: "El tag o sigla de la banda debe tener entre 2 y 5 caracteres alfanuméricos." };
  }

  // Comprobar duplicados
  const duplicate = getGangByNameOrTag(guildId, cleanName) || getGangByNameOrTag(guildId, cleanTag);
  if (duplicate) {
    return { success: false, error: "Ya existe una banda criminal registrada con ese mismo nombre o tag." };
  }

  // Deducir coste de creación
  const eco = getEco(guildId, userId);
  const paid = deductFunds(eco, GANG_CREATION_COST);
  if (!paid) {
    return {
      success: false,
      error: `Se requieren **${n(GANG_CREATION_COST)} nexocoins** en efectivo para sobornar a los intermediarios y registrar la banda criminal.`,
    };
  }
  saveEco(eco, "Creación de banda criminal");

  const gangId = crypto.randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO gangs (id, guild_id, name, tag, leader_id, description, balance, total_loot_earned, level, role_id, created_at)
    VALUES (?, ?, ?, ?, ?, '', 0, 0, 1, '', ?)
  `).run(gangId, guildId, cleanName, cleanTag, userId, now);

  db.prepare(`
    INSERT INTO gang_members (guild_id, gang_id, user_id, role, joined_at, contribution)
    VALUES (?, ?, ?, 'leader', ?, ?)
  `).run(guildId, gangId, userId, now, GANG_CREATION_COST);

  let created = getGangById(guildId, gangId)!;

  if (guild) {
    const role = await ensureGangDiscordRole(guild, created);
    if (role) {
      created = { ...created, roleId: role.id };
    }
    await assignGangRoleToUser(guild, userId, created);
  }

  return {
    success: true,
    gang: created,
  };
}

/**
 * Deposita nexocoins en la caja fuerte de la banda.
 */
export function depositToGang(
  guildId: string,
  userId: string,
  amount: number,
): { success: boolean; newBalance?: number; error?: string } {
  if (amount <= 0) return { success: false, error: "La cantidad a depositar debe ser mayor que 0." };

  const info = getUserGang(guildId, userId);
  if (!info) {
    return { success: false, error: "No perteneces a ninguna banda criminal actualmente." };
  }

  const eco = getEco(guildId, userId);
  const paid = deductFunds(eco, amount);
  if (!paid) {
    return { success: false, error: `No dispones de suficientes fondos para depositar **${n(amount)} nexocoins**.` };
  }
  saveEco(eco, `Depósito en la caja de la banda [${info.gang.tag}]`);

  const upgrades = getGangUpgrades(guildId, info.gang.id);
  let bonusCoins = 0;
  if (upgrades.blanqueo === 1) bonusCoins = Math.round(amount * 0.04);
  else if (upgrades.blanqueo === 2) bonusCoins = Math.round(amount * 0.08);
  else if (upgrades.blanqueo === 3) bonusCoins = Math.round(amount * 0.12);
  else if (upgrades.blanqueo === 4) bonusCoins = Math.round(amount * 0.16);
  else if (upgrades.blanqueo === 5) bonusCoins = Math.round(amount * 0.20);

  const totalVaultAddition = amount + bonusCoins;

  const db = getDb();
  db.prepare("UPDATE gangs SET balance = balance + ? WHERE guild_id = ? AND id = ?").run(
    totalVaultAddition,
    guildId,
    info.gang.id,
  );
  db.prepare(
    "UPDATE gang_members SET contribution = contribution + ? WHERE guild_id = ? AND gang_id = ? AND user_id = ?",
  ).run(amount, guildId, info.gang.id, userId);

  // Incrementar progreso del contrato semanal de lavado de activos
  incrementGangContractProgress(guildId, info.gang.id, "vault_deposits", amount);

  const updatedGang = getGangById(guildId, info.gang.id);
  return {
    success: true,
    newBalance: updatedGang?.balance || 0,
  };
}

/**
 * Une a un usuario a una banda.
 */
export async function joinGang(
  guildId: string,
  userId: string,
  gangQuery: string,
  guild?: Guild,
): Promise<{ success: boolean; gang?: GangRecord; error?: string }> {
  const db = getDb();

  if (isUserPolice(guildId, userId)) {
    return {
      success: false,
      error: "Los oficiales de policía no pueden ingresar en bandas criminales. Debes desertar primero con `/policia desertar`.",
    };
  }

  const existing = getUserGang(guildId, userId);
  if (existing) {
    return {
      success: false,
      error: `Ya perteneces a la banda **[${existing.gang.tag}] ${existing.gang.name}**. Abandónala con \`/banda salir\` primero.`,
    };
  }

  const gang = getGangByNameOrTag(guildId, gangQuery);
  if (!gang) {
    return { success: false, error: "No se encontró ninguna banda con ese nombre o tag." };
  }

  // Comprobar límite de miembros (máx 20)
  const members = getGangMembers(guildId, gang.id);
  if (members.length >= 20) {
    return { success: false, error: "Esta banda ha alcanzado el límite máximo de 20 miembros." };
  }

  const now = Date.now();
  db.prepare(`
    INSERT INTO gang_members (guild_id, gang_id, user_id, role, joined_at, contribution)
    VALUES (?, ?, ?, 'recluta', ?, 0)
  `).run(guildId, gang.id, userId, now);

  if (guild) {
    await assignGangRoleToUser(guild, userId, gang);
  }

  return {
    success: true,
    gang,
  };
}

/**
 * Abandona la banda criminal.
 */
export async function leaveGang(
  guildId: string,
  userId: string,
  guild?: Guild,
): Promise<{ success: boolean; dissolved?: boolean; gang?: GangRecord; message?: string; error?: string }> {
  const info = getUserGang(guildId, userId);
  if (!info) {
    return { success: false, error: "No perteneces a ninguna banda criminal." };
  }

  const db = getDb();
  if (info.member.role === "leader") {
    const members = getGangMembers(guildId, info.gang.id).filter((m) => m.userId !== userId);
    if (members.length === 0) {
      // Disolver banda
      db.prepare("DELETE FROM gang_contracts WHERE guild_id = ? AND gang_id = ?").run(guildId, info.gang.id);
      db.prepare("DELETE FROM gang_territory_influence WHERE guild_id = ? AND gang_id = ?").run(guildId, info.gang.id);
      db.prepare("UPDATE gang_territories SET controlling_gang_id = NULL WHERE guild_id = ? AND controlling_gang_id = ?").run(guildId, info.gang.id);
      db.prepare("DELETE FROM gang_upgrades WHERE guild_id = ? AND gang_id = ?").run(guildId, info.gang.id);
      db.prepare("DELETE FROM gang_members WHERE guild_id = ? AND gang_id = ?").run(guildId, info.gang.id);
      db.prepare("DELETE FROM gangs WHERE guild_id = ? AND id = ?").run(guildId, info.gang.id);

      if (guild) {
        await deleteGangRole(guild, info.gang);
      }

      return {
        success: true,
        dissolved: true,
        gang: info.gang,
        message: `Has abandonado la banda y, al no quedar más miembros, la banda **[${info.gang.tag}] ${info.gang.name}** ha sido disuelta.`,
      };
    }
    // Traspasar liderazgo al miembro con más contribución
    const nextLeader = members[0];
    db.prepare("UPDATE gang_members SET role = 'leader' WHERE guild_id = ? AND gang_id = ? AND user_id = ?").run(
      guildId,
      info.gang.id,
      nextLeader.userId,
    );
    db.prepare("UPDATE gangs SET leader_id = ? WHERE guild_id = ? AND id = ?").run(
      nextLeader.userId,
      guildId,
      info.gang.id,
    );
    db.prepare("DELETE FROM gang_members WHERE guild_id = ? AND user_id = ?").run(guildId, userId);

    if (guild) {
      await removeGangRoleFromUser(guild, userId, info.gang);
    }

    return {
      success: true,
      dissolved: false,
      gang: info.gang,
      message: `Has abandonado la banda. El liderazgo ha sido transferido a <@${nextLeader.userId}>.`,
    };
  }

  db.prepare("DELETE FROM gang_members WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
  if (guild) {
    await removeGangRoleFromUser(guild, userId, info.gang);
  }
  return {
    success: true,
    dissolved: false,
    gang: info.gang,
    message: `Has abandonado la banda **[${info.gang.tag}] ${info.gang.name}**.`,
  };
}

/**
 * Expulsa a un miembro de la banda.
 */
export async function kickFromGang(
  guildId: string,
  officerUserId: string,
  targetUserId: string,
  guild?: Guild,
): Promise<{ success: boolean; gang?: GangRecord; error?: string }> {
  const officerInfo = getUserGang(guildId, officerUserId);
  if (!officerInfo || (officerInfo.member.role !== "leader" && officerInfo.member.role !== "co_leader")) {
    return { success: false, error: "Solo el líder o los colíderes pueden expulsar a miembros de la banda." };
  }

  const targetInfo = getUserGang(guildId, targetUserId);
  if (!targetInfo || targetInfo.gang.id !== officerInfo.gang.id) {
    return { success: false, error: "El usuario no pertenece a tu banda criminal." };
  }

  if (targetInfo.member.role === "leader") {
    return { success: false, error: "No puedes expulsar al líder supremo de la banda." };
  }

  const db = getDb();
  db.prepare("DELETE FROM gang_members WHERE guild_id = ? AND user_id = ?").run(guildId, targetUserId);

  if (guild) {
    await removeGangRoleFromUser(guild, targetUserId, officerInfo.gang);
  }

  return { success: true, gang: officerInfo.gang };
}

/**
 * Mejora un módulo de la guarida criminal utilizando los fondos comunitarios de la banda.
 */
export function upgradeGangLair(
  guildId: string,
  userId: string,
  upgradeId: string,
): { success: boolean; newLevel?: number; error?: string } {
  const info = getUserGang(guildId, userId);
  if (!info) {
    return { success: false, error: "No perteneces a ninguna banda criminal." };
  }
  if (info.member.role !== "leader" && info.member.role !== "co_leader") {
    return { success: false, error: "Solo el líder o los colíderes pueden autorizar reformas en la guarida criminal." };
  }

  const upgradeDef = GANG_UPGRADES[upgradeId];
  if (!upgradeDef) {
    return { success: false, error: "Esa mejora de guarida no existe." };
  }

  const currentUpgrades = getGangUpgrades(guildId, info.gang.id);
  const currentLvl = currentUpgrades[upgradeId] || 0;

  if (currentLvl >= upgradeDef.maxLevel) {
    return { success: false, error: `La mejora **${upgradeDef.name}** ya está al nivel máximo (${upgradeDef.maxLevel}).` };
  }

  const nextLvl = currentLvl + 1;
  const cost = upgradeDef.costs[nextLvl - 1];

  if (info.gang.balance < cost) {
    return {
      success: false,
      error: `La caja fuerte de la banda necesita **${n(cost)} nexocoins** para esta mejora. Actualmente hay **${n(info.gang.balance)} nexocoins**. ¡Los miembros deben depositar más fondos con \`/banda depositar\`!`,
    };
  }

  const db = getDb();
  // Deducir fondos de la caja de la banda
  db.prepare("UPDATE gangs SET balance = balance - ? WHERE guild_id = ? AND id = ?").run(cost, guildId, info.gang.id);

  // Guardar o actualizar mejora
  db.prepare(`
    INSERT INTO gang_upgrades (guild_id, gang_id, upgrade_id, level)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (guild_id, gang_id, upgrade_id) DO UPDATE SET level = excluded.level
  `).run(guildId, info.gang.id, upgradeId, nextLvl);

  return {
    success: true,
    newLevel: nextLvl,
  };
}

/**
 * Registra botín ganado en un asalto para la banda y eleva su total acumulado.
 */
export function recordGangHeistLoot(guildId: string, gangId: string, loot: number): void {
  if (loot <= 0) return;
  const db = getDb();
  db.prepare(`
    UPDATE gangs
    SET total_loot_earned = total_loot_earned + ?
    WHERE guild_id = ? AND id = ?
  `).run(loot, guildId, gangId);

  // Repartir dividendos automáticos a los inversores de la banda
  distributeGangDividends(guildId, gangId, loot);
}

/**
 * Retorna las bandas más poderosas y ricas del servidor.
 */
export function getTopGangs(guildId: string, limit = 10): GangRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, guild_id AS guildId, name, tag, leader_id AS leaderId, description, balance,
           total_loot_earned AS totalLootEarned, level, COALESCE(last_tribute_at, 0) AS lastTributeAt,
           COALESCE(role_id, '') AS roleId, created_at AS createdAt
    FROM gangs
    WHERE guild_id = ?
    ORDER BY total_loot_earned DESC, balance DESC
    LIMIT ?
  `).all(guildId, limit) as GangRecord[];
}

/**
 * Asciende de rango a un miembro de la banda.
 * Solo puede ser ejecutado por Líder o Colíder.
 */
export function promoteGangMember(
  guildId: string,
  officerUserId: string,
  targetUserId: string,
): { success: boolean; newRole?: GangRole; error?: string } {
  if (officerUserId === targetUserId) {
    return { success: false, error: "No puedes ascenderte a ti mismo." };
  }

  const officerInfo = getUserGang(guildId, officerUserId);
  if (!officerInfo || (officerInfo.member.role !== "leader" && officerInfo.member.role !== "co_leader")) {
    return { success: false, error: "Solo el Capo o los Lugartenientes pueden otorgar ascensos." };
  }

  const targetInfo = getUserGang(guildId, targetUserId);
  if (!targetInfo || targetInfo.gang.id !== officerInfo.gang.id) {
    return { success: false, error: "El usuario especificado no pertenece a tu banda criminal." };
  }

  const officerRank = GANG_ROLES_INFO[officerInfo.member.role].rankLevel;
  const targetRank = GANG_ROLES_INFO[targetInfo.member.role].rankLevel;

  if (targetRank >= officerRank) {
    return { success: false, error: "No tienes autoridad jerárquica para ascender a este miembro." };
  }

  let nextRole: GangRole;
  if (targetInfo.member.role === "recluta") {
    nextRole = "member";
  } else if (targetInfo.member.role === "member") {
    nextRole = "sicario";
  } else if (targetInfo.member.role === "sicario") {
    if (officerInfo.member.role !== "leader") {
      return { success: false, error: "Solo el Capo supremo puede nombrar a un nuevo Lugarteniente (Colíder)." };
    }
    nextRole = "co_leader";
  } else {
    return { success: false, error: "Este miembro ya ostenta el rango máximo ascendible." };
  }

  const db = getDb();
  db.prepare("UPDATE gang_members SET role = ? WHERE guild_id = ? AND gang_id = ? AND user_id = ?").run(
    nextRole,
    guildId,
    officerInfo.gang.id,
    targetUserId,
  );

  return { success: true, newRole: nextRole };
}

/**
 * Degrada de rango a un miembro de la banda.
 * Solo puede ser ejecutado por Líder o Colíder.
 */
export function demoteGangMember(
  guildId: string,
  officerUserId: string,
  targetUserId: string,
): { success: boolean; newRole?: GangRole; error?: string } {
  if (officerUserId === targetUserId) {
    return { success: false, error: "No puedes degradarte a ti mismo." };
  }

  const officerInfo = getUserGang(guildId, officerUserId);
  if (!officerInfo || (officerInfo.member.role !== "leader" && officerInfo.member.role !== "co_leader")) {
    return { success: false, error: "Solo el Capo o los Lugartenientes pueden degradar miembros." };
  }

  const targetInfo = getUserGang(guildId, targetUserId);
  if (!targetInfo || targetInfo.gang.id !== officerInfo.gang.id) {
    return { success: false, error: "El usuario especificado no pertenece a tu banda criminal." };
  }

  const officerRank = GANG_ROLES_INFO[officerInfo.member.role].rankLevel;
  const targetRank = GANG_ROLES_INFO[targetInfo.member.role].rankLevel;

  if (targetRank >= officerRank) {
    return { success: false, error: "No tienes autoridad jerárquica sobre este miembro." };
  }

  if (targetInfo.member.role === "recluta") {
    return { success: false, error: "El miembro ya tiene el rango más bajo de la organización (Recluta)." };
  }

  let lowerRole: GangRole;
  if (targetInfo.member.role === "co_leader") {
    if (officerInfo.member.role !== "leader") {
      return { success: false, error: "Solo el Capo supremo puede degradar a un Lugarteniente." };
    }
    lowerRole = "sicario";
  } else if (targetInfo.member.role === "sicario") {
    lowerRole = "member";
  } else {
    lowerRole = "recluta";
  }

  const db = getDb();
  db.prepare("UPDATE gang_members SET role = ? WHERE guild_id = ? AND gang_id = ? AND user_id = ?").run(
    lowerRole,
    guildId,
    officerInfo.gang.id,
    targetUserId,
  );

  return { success: true, newRole: lowerRole };
}

/**
 * Actualiza el lema o descripción pública de la banda.
 */
export function setGangMotto(
  guildId: string,
  officerUserId: string,
  motto: string,
): { success: boolean; motto?: string; error?: string } {
  const officerInfo = getUserGang(guildId, officerUserId);
  if (!officerInfo || (officerInfo.member.role !== "leader" && officerInfo.member.role !== "co_leader")) {
    return { success: false, error: "Solo el Capo o los Lugartenientes pueden cambiar el lema de la banda." };
  }

  const clean = motto.trim();
  if (clean.length < 3 || clean.length > 120) {
    return { success: false, error: "El lema de la banda debe contener entre 3 y 120 caracteres." };
  }

  const db = getDb();
  db.prepare("UPDATE gangs SET description = ? WHERE guild_id = ? AND id = ?").run(clean, guildId, officerInfo.gang.id);

  return { success: true, motto: clean };
}

export interface MetropolitanDistrict {
  id: string;
  name: string;
  emoji: string;
  description: string;
  associatedTargets: string[];
  buffDescription: string;
  dailyTributeCoins: number;
}

export const METROPOLITAN_DISTRICTS: Record<string, MetropolitanDistrict> = {
  financiero: {
    id: "financiero",
    name: "Distrito Financiero Central",
    emoji: "🏦",
    description: "Rascacielos bancarios, casas de bolsa y casinos de alta alcurnia.",
    associatedTargets: ["banco", "joyeria", "casino"],
    buffDescription: "+6% botín en golpes al Banco Central, Joyería y Casino",
    dailyTributeCoins: 30_000,
  },
  lujo: {
    id: "lujo",
    name: "Barrio de Lujo & Alta Sociedad",
    emoji: "💎",
    description: "Mansiones de multimillonarios, galerías exclusivas y el Museo Nacional.",
    associatedTargets: ["mansion", "museo"],
    buffDescription: "+6% botín en golpes a la Mansión y Museo",
    dailyTributeCoins: 25_000,
  },
  industrial: {
    id: "industrial",
    name: "Complejo Industrial & Logístico",
    emoji: "🏭",
    description: "Parques tecnológicos de alta seguridad, hangares y vías del convoy blindado.",
    associatedTargets: ["empresa", "tren_blindado"],
    buffDescription: "+6% botín en golpes a la Empresa y Tren Blindado",
    dailyTributeCoins: 25_000,
  },
  puerto: {
    id: "puerto",
    name: "Dársenas Portuarias & Base Orbital",
    emoji: "🚢",
    description: "Muelles clandestinos y lanzaderas orbitales de contrabando.",
    associatedTargets: ["estacion_espacial"],
    buffDescription: "+6% botín en golpes a la Estación Espacial",
    dailyTributeCoins: 35_000,
  },
};

export interface DistrictStatus {
  district: MetropolitanDistrict;
  controllingGang: GangRecord | null;
  influencePoints: number;
  topContenders: { gang: GangRecord; points: number }[];
}

/**
 * Obtiene el estado y dominio territorial de todos los distritos de la ciudad.
 */
export function getDistrictStates(guildId: string): DistrictStatus[] {
  const db = getDb();
  const statuses: DistrictStatus[] = [];

  for (const district of Object.values(METROPOLITAN_DISTRICTS)) {
    const terrRow = db.prepare(`
      SELECT controlling_gang_id, influence_points
      FROM gang_territories
      WHERE guild_id = ? AND district_id = ?
    `).get(guildId, district.id) as { controlling_gang_id: string | null; influence_points: number } | undefined;

    let controllingGang: GangRecord | null = null;
    if (terrRow?.controlling_gang_id) {
      controllingGang = getGangById(guildId, terrRow.controlling_gang_id);
    }

    const influenceRows = db.prepare(`
      SELECT gang_id, points
      FROM gang_territory_influence
      WHERE guild_id = ? AND district_id = ?
      ORDER BY points DESC
      LIMIT 3
    `).all(guildId, district.id) as { gang_id: string; points: number }[];

    const topContenders: { gang: GangRecord; points: number }[] = [];
    for (const row of influenceRows) {
      const g = getGangById(guildId, row.gang_id);
      if (g) topContenders.push({ gang: g, points: row.points });
    }

    statuses.push({
      district,
      controllingGang,
      influencePoints: terrRow?.influence_points || 0,
      topContenders,
    });
  }

  return statuses;
}

/**
 * Retorna los distritos metropolitanos bajo control de una banda.
 */
export function getGangControlledDistricts(guildId: string, gangId: string): MetropolitanDistrict[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT district_id
    FROM gang_territories
    WHERE guild_id = ? AND controlling_gang_id = ?
  `).all(guildId, gangId) as { district_id: string }[];

  return rows
    .map((r) => METROPOLITAN_DISTRICTS[r.district_id])
    .filter((d): d is MetropolitanDistrict => Boolean(d));
}

/**
 * Registra influencia territorial tras un asalto victorioso.
 * Si una banda supera a la controladora actual con al menos 50 PI, asume el control del distrito.
 */
export function recordHeistTerritoryInfluence(
  guildId: string,
  targetId: string,
  gangId: string,
  participantCount = 1,
): { changedOwner: boolean; newController?: GangRecord; districtName?: string } | null {
  const district = Object.values(METROPOLITAN_DISTRICTS).find((d) => d.associatedTargets.includes(targetId));
  if (!district) return null;

  const pointsEarned = 15 * Math.max(1, participantCount);
  const now = Date.now();
  const db = getDb();

  db.prepare(`
    INSERT INTO gang_territory_influence (guild_id, district_id, gang_id, points, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (guild_id, district_id, gang_id) DO UPDATE SET
      points = points + excluded.points,
      updated_at = excluded.updated_at
  `).run(guildId, district.id, gangId, pointsEarned, now);

  const top = db.prepare(`
    SELECT gang_id, points
    FROM gang_territory_influence
    WHERE guild_id = ? AND district_id = ?
    ORDER BY points DESC
    LIMIT 1
  `).get(guildId, district.id) as { gang_id: string; points: number } | undefined;

  if (!top) return null;

  const currentTerr = db.prepare(`
    SELECT controlling_gang_id, influence_points
    FROM gang_territories
    WHERE guild_id = ? AND district_id = ?
  `).get(guildId, district.id) as { controlling_gang_id: string | null; influence_points: number } | undefined;

  if (top.points >= 50 && currentTerr?.controlling_gang_id !== top.gang_id) {
    db.prepare(`
      INSERT INTO gang_territories (guild_id, district_id, controlling_gang_id, influence_points, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (guild_id, district_id) DO UPDATE SET
        controlling_gang_id = excluded.controlling_gang_id,
        influence_points = excluded.influence_points,
        updated_at = excluded.updated_at
    `).run(guildId, district.id, top.gang_id, top.points, now);

    const newGang = getGangById(guildId, top.gang_id);
    return {
      changedOwner: true,
      newController: newGang || undefined,
      districtName: district.name,
    };
  }

  if (currentTerr && currentTerr.controlling_gang_id === top.gang_id) {
    db.prepare(`
      UPDATE gang_territories
      SET influence_points = ?, updated_at = ?
      WHERE guild_id = ? AND district_id = ?
    `).run(top.points, now, guildId, district.id);
  }

  return { changedOwner: false };
}

/**
 * Invierte fondos de la caja de la banda para disputar la influencia territorial de un distrito.
 * Cada 1.000 nexocoins equivalen a 1 Punto de Influencia (mínimo 25.000 monedas = 25 PI).
 */
export function disputeTerritoryWithFunds(
  guildId: string,
  userId: string,
  districtId: string,
  amount: number,
): { success: boolean; pointsAdded?: number; newTotalPoints?: number; tookControl?: boolean; error?: string } {
  const district = METROPOLITAN_DISTRICTS[districtId];
  if (!district) {
    return { success: false, error: "Distrito metropolitano inválido." };
  }

  const info = getUserGang(guildId, userId);
  if (!info) {
    return { success: false, error: "Debes pertenecer a una banda criminal para disputar territorios." };
  }

  if (info.member.role !== "leader" && info.member.role !== "co_leader") {
    return { success: false, error: "Solo el Capo o los Lugartenientes pueden autorizar operaciones de despliegue territorial con fondos de la banda." };
  }

  if (amount < 25_000) {
    return { success: false, error: "La inversión mínima en operaciones territoriales es de **25.000 nexocoins** (25 Puntos de Influencia)." };
  }

  if (info.gang.balance < amount) {
    return {
      success: false,
      error: `La caja fuerte de la banda solo dispone de **${n(info.gang.balance)} nexocoins**. ¡Deposita más fondos con \`/banda depositar\`!`,
    };
  }

  const pointsToAdd = Math.floor(amount / 1_000);
  const db = getDb();
  const now = Date.now();

  // Deducir de la caja de la banda
  db.prepare("UPDATE gangs SET balance = balance - ? WHERE guild_id = ? AND id = ?").run(amount, guildId, info.gang.id);

  // Añadir puntos de influencia
  db.prepare(`
    INSERT INTO gang_territory_influence (guild_id, district_id, gang_id, points, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (guild_id, district_id, gang_id) DO UPDATE SET
      points = points + excluded.points,
      updated_at = excluded.updated_at
  `).run(guildId, district.id, info.gang.id, pointsToAdd, now);

  const myRow = db.prepare(`
    SELECT points FROM gang_territory_influence WHERE guild_id = ? AND district_id = ? AND gang_id = ?
  `).get(guildId, district.id, info.gang.id) as { points: number };

  const top = db.prepare(`
    SELECT gang_id, points FROM gang_territory_influence WHERE guild_id = ? AND district_id = ? ORDER BY points DESC LIMIT 1
  `).get(guildId, district.id) as { gang_id: string; points: number };

  const currentTerr = db.prepare(`
    SELECT controlling_gang_id FROM gang_territories WHERE guild_id = ? AND district_id = ?
  `).get(guildId, district.id) as { controlling_gang_id: string | null } | undefined;

  let tookControl = false;
  if (top && top.gang_id === info.gang.id && top.points >= 50) {
    if (currentTerr?.controlling_gang_id !== info.gang.id) {
      tookControl = true;
      db.prepare(`
        INSERT INTO gang_territories (guild_id, district_id, controlling_gang_id, influence_points, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (guild_id, district_id) DO UPDATE SET
          controlling_gang_id = excluded.controlling_gang_id,
          influence_points = excluded.influence_points,
          updated_at = excluded.updated_at
      `).run(guildId, district.id, info.gang.id, top.points, now);
    } else {
      db.prepare(`
        UPDATE gang_territories SET influence_points = ?, updated_at = ? WHERE guild_id = ? AND district_id = ?
      `).run(top.points, now, guildId, district.id);
    }
  }

  return {
    success: true,
    pointsAdded: pointsToAdd,
    newTotalPoints: myRow.points,
    tookControl,
  };
}

/**
 * Reclama el tributo diario de los distritos controlados y los dividendos del Garito de Apuestas.
 * Puede ser ejecutado una vez cada 24 horas por Líder o Colíder.
 */
export function claimDailyGangTribute(
  guildId: string,
  userId: string,
): {
  success: boolean;
  totalCollected?: number;
  districtIncome?: number;
  garitoIncome?: number;
  controlledDistricts?: string[];
  error?: string;
} {
  const info = getUserGang(guildId, userId);
  if (!info) {
    return { success: false, error: "No perteneces a ninguna banda criminal." };
  }

  if (info.member.role !== "leader" && info.member.role !== "co_leader") {
    return { success: false, error: "Solo el Capo o los Lugartenientes tienen la autoridad para recaudar el tributo del hampa." };
  }

  const now = Date.now();
  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const lastTribute = info.gang.lastTributeAt || 0;
  const elapsed = now - lastTribute;

  if (elapsed < COOLDOWN_MS) {
    const remainingMs = COOLDOWN_MS - elapsed;
    const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
    return {
      success: false,
      error: `El tributo criminal ya fue recaudado hoy. Los recaudadores volverán en aproximadamente **${remainingHours} horas**.`,
    };
  }

  const controlled = getGangControlledDistricts(guildId, info.gang.id);
  const districtIncome = controlled.reduce((acc, d) => acc + d.dailyTributeCoins, 0);

  const upgrades = getGangUpgrades(guildId, info.gang.id);
  let garitoIncome = 0;
  if (upgrades.garito === 1) garitoIncome = 15_000;
  else if (upgrades.garito === 2) garitoIncome = 30_000;
  else if (upgrades.garito === 3) garitoIncome = 45_000;
  else if (upgrades.garito === 4) garitoIncome = 60_000;
  else if (upgrades.garito >= 5) garitoIncome = 80_000;

  const totalCollected = districtIncome + garitoIncome;

  if (totalCollected <= 0) {
    return {
      success: false,
      error: "Tu banda no controla ningún distrito metropolitano ni dispone de un Garito Clandestino de Apuestas para recaudar ingresos pasivos. ¡Conquista distritos en los asaltos o adquiere la mejora en `/banda mejoras`!",
    };
  }

  const db = getDb();
  db.prepare("UPDATE gangs SET balance = balance + ?, last_tribute_at = ? WHERE guild_id = ? AND id = ?").run(
    totalCollected,
    now,
    guildId,
    info.gang.id,
  );

  distributeGangDividends(guildId, info.gang.id, totalCollected);

  return {
    success: true,
    totalCollected,
    districtIncome,
    garitoIncome,
    controlledDistricts: controlled.map((d) => d.name),
  };
}

export interface SyndicateContractDef {
  id: string;
  title: string;
  emoji: string;
  description: string;
  targetValue: number;
  rewardCoins: number;
}

export const SYNDICATE_CONTRACTS: SyndicateContractDef[] = [
  {
    id: "heist_runs",
    title: "Operación Relámpago",
    emoji: "⚡",
    description: "Completar 5 asaltos colectivos exitosos con miembros de la banda",
    targetValue: 5,
    rewardCoins: 45_000,
  },
  {
    id: "loot_haul",
    title: "Saqueo Masivo",
    emoji: "💰",
    description: "Acumular 250.000 nexocoins en botines de asalto exitosos",
    targetValue: 250_000,
    rewardCoins: 60_000,
  },
  {
    id: "qte_reflex",
    title: "Reflejos de Acero",
    emoji: "🎯",
    description: "Superar 5 eventos de QTE con éxito durante los asaltos",
    targetValue: 5,
    rewardCoins: 35_000,
  },
  {
    id: "vault_deposits",
    title: "Lavado de Activos",
    emoji: "🧼",
    description: "Depositar un acumulado de 100.000 nexocoins en la caja fuerte",
    targetValue: 100_000,
    rewardCoins: 40_000,
  },
];

export interface GangContractRecord {
  guildId: string;
  gangId: string;
  contractId: string;
  progress: number;
  targetValue: number;
  completed: number; // 0 = en curso, 1 = listo para reclamar, 2 = reclamado
  rewardCoins: number;
  expiresAt: number;
}

/**
 * Obtiene los contratos semanales activos de una banda criminal, inicializándolos o renovándolos si expiraron.
 */
export function getGangContracts(
  guildId: string,
  gangId: string,
): (GangContractRecord & { def: SyndicateContractDef })[] {
  const db = getDb();
  const now = Date.now();

  const rows = db.prepare(`
    SELECT guild_id AS guildId, gang_id AS gangId, contract_id AS contractId,
           progress, target_value AS targetValue, completed, reward_coins AS rewardCoins, expires_at AS expiresAt
    FROM gang_contracts
    WHERE guild_id = ? AND gang_id = ?
  `).all(guildId, gangId) as GangContractRecord[];

  const existingMap = new Map<string, GangContractRecord>();
  for (const r of rows) {
    existingMap.set(r.contractId, r);
  }

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const results: (GangContractRecord & { def: SyndicateContractDef })[] = [];

  for (const def of SYNDICATE_CONTRACTS) {
    const existing = existingMap.get(def.id);
    if (!existing || existing.expiresAt < now) {
      const expiresAt = now + weekMs;
      db.prepare(`
        INSERT INTO gang_contracts (guild_id, gang_id, contract_id, progress, target_value, completed, reward_coins, expires_at)
        VALUES (?, ?, ?, 0, ?, 0, ?, ?)
        ON CONFLICT (guild_id, gang_id, contract_id) DO UPDATE SET
          progress = 0,
          target_value = excluded.target_value,
          completed = 0,
          reward_coins = excluded.reward_coins,
          expires_at = excluded.expires_at
      `).run(guildId, gangId, def.id, def.targetValue, def.rewardCoins, expiresAt);

      results.push({
        guildId,
        gangId,
        contractId: def.id,
        progress: 0,
        targetValue: def.targetValue,
        completed: 0,
        rewardCoins: def.rewardCoins,
        expiresAt,
        def,
      });
    } else {
      results.push({
        ...existing,
        def,
      });
    }
  }

  return results;
}

/**
 * Incrementa el progreso de un contrato semanal para una banda criminal.
 */
export function incrementGangContractProgress(
  guildId: string,
  gangId: string,
  contractId: string,
  amount: number,
): void {
  if (amount <= 0) return;
  getGangContracts(guildId, gangId);

  const db = getDb();
  db.prepare(`
    UPDATE gang_contracts
    SET progress = MIN(target_value, progress + ?),
        completed = CASE WHEN progress + ? >= target_value AND completed = 0 THEN 1 ELSE completed END
    WHERE guild_id = ? AND gang_id = ? AND contract_id = ? AND completed = 0
  `).run(amount, amount, guildId, gangId, contractId);
}

/**
 * Reclama la recompensa de un contrato del sindicato completado e ingresa los fondos a la caja de la banda.
 */
export function claimGangContractReward(
  guildId: string,
  userId: string,
  contractId: string,
): { success: boolean; rewardCoins?: number; error?: string } {
  const info = getUserGang(guildId, userId);
  if (!info) {
    return { success: false, error: "No perteneces a ninguna banda criminal." };
  }

  if (info.member.role !== "leader" && info.member.role !== "co_leader") {
    return { success: false, error: "Solo el Capo o los Lugartenientes pueden cobrar recompensas de contratos del sindicato." };
  }

  const contracts = getGangContracts(guildId, info.gang.id);
  const contract = contracts.find((c) => c.contractId === contractId);

  if (!contract) {
    return { success: false, error: "No se encontró el contrato especificado." };
  }

  if (contract.completed === 2) {
    return { success: false, error: "La recompensa de este contrato ya fue cobrada para este ciclo semanal." };
  }

  if (contract.completed === 0) {
    return {
      success: false,
      error: `Este contrato aún no ha sido completado (Progreso: **${n(contract.progress)} / ${n(contract.targetValue)}**).`,
    };
  }

  const db = getDb();
  db.prepare("UPDATE gangs SET balance = balance + ? WHERE guild_id = ? AND id = ?").run(
    contract.rewardCoins,
    guildId,
    info.gang.id,
  );
  db.prepare("UPDATE gang_contracts SET completed = 2 WHERE guild_id = ? AND gang_id = ? AND contract_id = ?").run(
    guildId,
    info.gang.id,
    contractId,
  );

  return {
    success: true,
    rewardCoins: contract.rewardCoins,
  };
}

/**
 * Asegura que una banda criminal disponga de su rol exclusivo en el servidor de Discord.
 * Si no existe, lo crea y guarda el role_id en la base de datos.
 */
export async function ensureGangDiscordRole(guild: Guild, gang: GangRecord): Promise<Role | null> {
  try {
    if (gang.roleId) {
      const existing = guild.roles.cache.get(gang.roleId) ?? (await guild.roles.fetch(gang.roleId).catch(() => null));
      if (existing) {
        const expectedName = `[${gang.tag}] ${gang.name}`;
        if (!existing.mentionable || existing.name !== expectedName) {
          await existing
            .edit({
              name: expectedName,
              mentionable: true,
              reason: "Actualización de rol de banda criminal",
            })
            .catch(() => {});
        }
        return existing;
      }
    }

    const expectedName = `[${gang.tag}] ${gang.name}`;
    const byName = guild.roles.cache.find((r) => r.name.toLowerCase() === expectedName.toLowerCase());
    if (byName) {
      if (!byName.mentionable) {
        await byName.setMentionable(true, "Rol de banda debe ser mencionable").catch(() => {});
      }
      const db = getDb();
      db.prepare("UPDATE gangs SET role_id = ? WHERE guild_id = ? AND id = ?").run(byName.id, guild.id, gang.id);
      gang.roleId = byName.id;
      return byName;
    }

    const createdRole = await guild.roles.create({
      name: expectedName,
      mentionable: true,
      reason: `Rol oficial de la banda criminal [${gang.tag}] ${gang.name}`,
    });

    const db = getDb();
    db.prepare("UPDATE gangs SET role_id = ? WHERE guild_id = ? AND id = ?").run(createdRole.id, guild.id, gang.id);
    gang.roleId = createdRole.id;
    logger.info(`[Gangs] Creado rol para banda [${gang.tag}] ${gang.name} (ID: ${createdRole.id})`);
    return createdRole;
  } catch (err) {
    logger.error(`[Gangs] Error asegurando rol para banda [${gang.tag}] ${gang.name}:`, err);
    return null;
  }
}

/**
 * Asigna el rol de banda a un usuario en el servidor.
 */
export async function assignGangRoleToUser(guild: Guild, userId: string, gang: GangRecord): Promise<void> {
  try {
    const role = await ensureGangDiscordRole(guild, gang);
    if (!role) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role.id, `Miembro de la banda [${gang.tag}] ${gang.name}`);
      logger.info(`[Gangs] Rol ${role.name} asignado a ${member.user.tag}`);
    }
  } catch (err) {
    logger.warn(`[Gangs] No se pudo asignar rol de banda a usuario ${userId}:`, err);
  }
}

/**
 * Remueve el rol de banda a un usuario en el servidor.
 */
export async function removeGangRoleFromUser(guild: Guild, userId: string, gang: GangRecord): Promise<void> {
  try {
    if (!gang.roleId) return;
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    if (member.roles.cache.has(gang.roleId)) {
      await member.roles.remove(gang.roleId, `Abandonó o fue expulsado de la banda [${gang.tag}] ${gang.name}`);
      logger.info(`[Gangs] Rol de banda removido de ${member.user.tag}`);
    }
  } catch (err) {
    logger.warn(`[Gangs] No se pudo remover rol de banda a usuario ${userId}:`, err);
  }
}

/**
 * Elimina el rol de Discord asociado a una banda disuelta.
 */
export async function deleteGangRole(guild: Guild, gang: GangRecord): Promise<void> {
  try {
    if (!gang.roleId) return;
    const role = guild.roles.cache.get(gang.roleId) ?? (await guild.roles.fetch(gang.roleId).catch(() => null));
    if (role) {
      await role.delete(`Banda criminal [${gang.tag}] disuelta`);
      logger.info(`[Gangs] Rol de banda eliminado: ${role.name}`);
    }
  } catch (err) {
    logger.warn(`[Gangs] No se pudo eliminar rol de banda disuelta ${gang.id}:`, err);
  }
}

/**
 * Sincroniza todos los roles de todas las bandas existentes de forma retroactiva.
 * Crea los roles faltantes y los asigna a todos los miembros de cada banda.
 */
export async function syncAllGangRoles(client: Client): Promise<void> {
  try {
    const db = getDb();
    const gangs = db.prepare(`
      SELECT id, guild_id AS guildId, name, tag, leader_id AS leaderId, description, balance,
             total_loot_earned AS totalLootEarned, level, COALESCE(last_tribute_at, 0) AS lastTributeAt,
             COALESCE(role_id, '') AS roleId, created_at AS createdAt
      FROM gangs
    `).all() as GangRecord[];

    if (gangs.length === 0) return;

    logger.info(`[Gangs] Sincronizando roles para ${gangs.length} bandas registradas...`);

    for (const gang of gangs) {
      const guild = client.guilds.cache.get(gang.guildId) ?? (await client.guilds.fetch(gang.guildId).catch(() => null));
      if (!guild) continue;

      const role = await ensureGangDiscordRole(guild, gang);
      if (!role) continue;

      const members = getGangMembers(gang.guildId, gang.id);
      for (const m of members) {
        try {
          const discordMember = await guild.members.fetch(m.userId).catch(() => null);
          if (discordMember && !discordMember.roles.cache.has(role.id)) {
            await discordMember.roles.add(role.id, `Sincronización retroactiva de banda [${gang.tag}]`);
            logger.info(`[Gangs] Rol ${role.name} asignado retroactivamente a ${discordMember.user.tag}`);
          }
        } catch (err) {
          logger.warn(`[Gangs] Error asignando rol a miembro ${m.userId}:`, err);
        }
      }
    }
    logger.info("[Gangs] Sincronización de roles de bandas completada con éxito.");
  } catch (err) {
    logger.error("[Gangs] Error en syncAllGangRoles:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. WALL STREET CRIMINAL (INVERSIONES Y BONOS DE BANDA)
// ═══════════════════════════════════════════════════════════════════════════

export interface GangInvestmentRecord {
  id: number;
  guildId: string;
  gangId: string;
  investorId: string;
  amountInvested: number;
  accumulatedDividends: number;
  createdAt: number;
  lastCollectedAt: number;
}

export function getGangInvestments(guildId: string, gangId: string): GangInvestmentRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, guild_id AS guildId, gang_id AS gangId, investor_id AS investorId,
           amount_invested AS amountInvested, accumulated_dividends AS accumulatedDividends,
           created_at AS createdAt, last_collected_at AS lastCollectedAt
    FROM gang_investments
    WHERE guild_id = ? AND gang_id = ?
    ORDER BY amount_invested DESC
  `).all(guildId, gangId) as GangInvestmentRecord[];
}

export function getUserGangInvestments(
  guildId: string,
  userId: string,
): (GangInvestmentRecord & { gangName: string; gangTag: string })[] {
  const db = getDb();
  return db.prepare(`
    SELECT i.id, i.guild_id AS guildId, i.gang_id AS gangId, i.investor_id AS investorId,
           i.amount_invested AS amountInvested, i.accumulated_dividends AS accumulatedDividends,
           i.created_at AS createdAt, i.last_collected_at AS lastCollectedAt,
           g.name AS gangName, g.tag AS gangTag
    FROM gang_investments i
    JOIN gangs g ON g.id = i.gang_id
    WHERE i.guild_id = ? AND i.investor_id = ?
    ORDER BY i.amount_invested DESC
  `).all(guildId, userId) as (GangInvestmentRecord & { gangName: string; gangTag: string })[];
}

export function investInGang(
  guildId: string,
  gangId: string,
  userId: string,
  amount: number,
): { success: boolean; error?: string; investment?: GangInvestmentRecord; gang?: GangRecord } {
  const minInvestment = 5_000;
  if (amount < minInvestment) {
    return { success: false, error: `La inversión mínima en bonos de banda es de **${n(minInvestment)}**.` };
  }

  const gang = getGangById(guildId, gangId);
  if (!gang) {
    return { success: false, error: "Banda criminal no encontrada." };
  }

  const eco = getEco(guildId, userId);
  if (eco.wallet < amount) {
    return { success: false, error: `No tienes suficientes fondos en cartera. Necesitas **${n(amount)}**.` };
  }

  const db = getDb();
  const tx = db.transaction(() => {
    deductFunds(eco, amount);
    saveEco(eco, `Inversión en bonos de sindicato criminal [${gang.tag}]`);

    db.prepare("UPDATE gangs SET balance = balance + ? WHERE guild_id = ? AND id = ?").run(amount, guildId, gangId);

    const existing = db
      .prepare("SELECT * FROM gang_investments WHERE guild_id = ? AND gang_id = ? AND investor_id = ?")
      .get(guildId, gangId, userId) as any;

    if (existing) {
      db.prepare(`
        UPDATE gang_investments
        SET amount_invested = amount_invested + ?
        WHERE id = ?
      `).run(amount, existing.id);
    } else {
      db.prepare(`
        INSERT INTO gang_investments (guild_id, gang_id, investor_id, amount_invested, accumulated_dividends, created_at, last_collected_at)
        VALUES (?, ?, ?, ?, 0, ?, 0)
      `).run(guildId, gangId, userId, amount, Date.now());
    }

    const row = db
      .prepare(
        "SELECT id, guild_id AS guildId, gang_id AS gangId, investor_id AS investorId, amount_invested AS amountInvested, accumulated_dividends AS accumulatedDividends, created_at AS createdAt, last_collected_at AS lastCollectedAt FROM gang_investments WHERE guild_id = ? AND gang_id = ? AND investor_id = ?",
      )
      .get(guildId, gangId, userId) as GangInvestmentRecord;
    return row;
  });

  const investment = tx();
  return { success: true, investment, gang };
}

export function distributeGangDividends(guildId: string, gangId: string, profitEarned: number): number {
  if (profitEarned <= 0) return 0;
  const db = getDb();
  const investments = getGangInvestments(guildId, gangId);
  if (investments.length === 0) return 0;

  // 10% del botín o tributo se reparte a los inversores proporcionalmente a su capital
  const totalDividendPool = Math.floor(profitEarned * 0.10);
  if (totalDividendPool <= 0) return 0;

  const totalCapital = investments.reduce((sum, inv) => sum + inv.amountInvested, 0);
  if (totalCapital <= 0) return 0;

  for (const inv of investments) {
    const share = Math.floor((inv.amountInvested / totalCapital) * totalDividendPool);
    if (share > 0) {
      db.prepare(`
        UPDATE gang_investments
        SET accumulated_dividends = accumulated_dividends + ?
        WHERE id = ?
      `).run(share, inv.id);
    }
  }

  return totalDividendPool;
}

export function claimGangDividends(
  guildId: string,
  userId: string,
): { success: boolean; totalClaimed: number; count: number } {
  const db = getDb();
  const userInvs = getUserGangInvestments(guildId, userId);
  const claimable = userInvs.filter((i) => i.accumulatedDividends > 0);

  if (claimable.length === 0) {
    return { success: false, totalClaimed: 0, count: 0 };
  }

  let totalClaimed = 0;
  const tx = db.transaction(() => {
    for (const inv of claimable) {
      totalClaimed += inv.accumulatedDividends;
      db.prepare(`
        UPDATE gang_investments
        SET accumulated_dividends = 0, last_collected_at = ?
        WHERE id = ?
      `).run(Date.now(), inv.id);
    }
    const eco = getEco(guildId, userId);
    addWallet(eco, totalClaimed);
    saveEco(eco, "Cobro de dividendos por bonos de inversión en bandas");
  });

  tx();
  return { success: true, totalClaimed, count: claimable.length };
}

export function divestFromGang(
  guildId: string,
  gangId: string,
  userId: string,
): { success: boolean; error?: string; returnedAmount?: number; burnedFee?: number; gang?: GangRecord } {
  const db = getDb();
  const gang = getGangById(guildId, gangId);
  if (!gang) return { success: false, error: "Banda criminal no encontrada." };

  const inv = db
    .prepare("SELECT * FROM gang_investments WHERE guild_id = ? AND gang_id = ? AND investor_id = ?")
    .get(guildId, gangId, userId) as any;

  if (!inv || inv.amount_invested <= 0) {
    return { success: false, error: "No tienes ninguna inversión activa en esta banda." };
  }

  const invested = inv.amount_invested;
  if (gang.balance < invested) {
    return {
      success: false,
      error: `La banda no dispone de liquidez suficiente en su tesorería para reembolsar tu inversión (${n(invested)} necesarios, ${n(gang.balance)} disponibles en la caja fuerte).`,
    };
  }

  // Tasa de liquidación anticipada del 10% (se quema de la economía)
  const burnedFee = Math.floor(invested * 0.10);
  const returnedAmount = invested - burnedFee + (inv.accumulated_dividends || 0);

  const tx = db.transaction(() => {
    db.prepare("UPDATE gangs SET balance = balance - ? WHERE guild_id = ? AND id = ?").run(invested, guildId, gangId);
    db.prepare("DELETE FROM gang_investments WHERE id = ?").run(inv.id);
    const eco = getEco(guildId, userId);
    addWallet(eco, returnedAmount);
    saveEco(eco, `Liquidación de bonos de banda [${gang.tag}] (10% tasa quemada)`);
  });

  tx();
  return { success: true, returnedAmount, burnedFee, gang };
}

