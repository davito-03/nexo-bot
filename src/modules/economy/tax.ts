import { getDb, getGuildConfig } from "../../database/index.js";
import { n, saveEco, getEco, type EcoRow } from "./engine.js";
import { madridDay } from "../../utils/time.js";
import { logger } from "../../logger.js";
import { NEXO_STAFF_ROLE_ID, NEXO_OWNER_ROLE_ID } from "../../constants.js";
import type { NexoClient } from "../../client.js";

let taxClient: NexoClient | null = null;
export function setTaxClient(c: NexoClient): void {
  taxClient = c;
}

/** Beneficiario donde entra el 30% de los impuestos recaudados */
export const TAX_BENEFICIARY_ID = "600041740124160011";

/** Roles Staff y Owner que reciben el 50% de los impuestos */
export const TAX_STAFF_ROLE_IDS = [NEXO_STAFF_ROLE_ID, NEXO_OWNER_ROLE_ID];

/** Tipo efectivo progresivo: 1% a 150k → 5% a 25M (lineal sobre el exceso). */
export function taxRateForNet(net: number, threshold: number, maxNet: number, minRate: number, maxRate: number): number {
  if (net <= threshold) return 0;
  const t = Math.min(1, (net - threshold) / Math.max(1, maxNet - threshold));
  return minRate + t * (maxRate - minRate);
}

export function taxBill(net: number, threshold: number, maxNet: number, minRate: number, maxRate: number): number {
  const rate = taxRateForNet(net, threshold, maxNet, minRate, maxRate);
  if (rate <= 0) return 0;
  return Math.floor((net - threshold) * rate);
}

export function applyDailyTax(guildId: string, force = false): { taxed: number; collected: number } {
  const day = madridDay();

  if (!force) {
    const done = getDb().prepare("SELECT 1 FROM tax_runs WHERE guild_id = ? AND week_id = ?").get(guildId, day);
    if (done) return { taxed: 0, collected: 0 };
  } else {
    getDb().prepare("DELETE FROM tax_runs WHERE guild_id = ? AND week_id = ?").run(guildId, day);
  }

  const cfg = getGuildConfig(guildId);
  const threshold = cfg.tax.threshold;
  const maxNet = cfg.tax.maxNet;
  const minRate = cfg.tax.minRateBp / 10_000;
  const maxRate = cfg.tax.maxRateBp / 10_000;

  const rich = getDb()
    .prepare("SELECT * FROM economy WHERE guild_id = ? AND (wallet + bank) > ?")
    .all(guildId, threshold) as EcoRow[];

  let collected = 0;
  let taxed = 0;

  for (const row of rich) {
    // El beneficiario que recauda los impuestos queda exento de tributar sobre los fondos del servidor
    if (row.user_id === TAX_BENEFICIARY_ID) continue;

    const depositsRow = getDb()
      .prepare("SELECT SUM(amount) as s FROM bank_fixed_deposits WHERE guild_id = ? AND user_id = ? AND claimed = 0")
      .get(guildId, row.user_id) as { s: number | null } | undefined;
    const lockedDeposits = depositsRow?.s ?? 0;

    const net = row.wallet + row.bank + lockedDeposits;
    const bill = taxBill(net, threshold, maxNet, minRate, maxRate);

    if (bill < 25) continue;

    let left = bill;
    const w = Math.min(row.wallet, left);
    row.wallet -= w;
    left -= w;
    const b = Math.min(row.bank, left);
    row.bank -= b;
    saveEco(row);

    // Si aún queda impuesto por pagar y tenía fondos bloqueados en depósitos, se cobra del depósito
    if (left > 0 && lockedDeposits > 0) {
      const activeDeps = getDb()
        .prepare("SELECT id, amount, reward_amount FROM bank_fixed_deposits WHERE guild_id = ? AND user_id = ? AND claimed = 0 ORDER BY amount DESC")
        .all(guildId, row.user_id) as { id: number; amount: number; reward_amount: number }[];
      for (const dep of activeDeps) {
        if (left <= 0) break;
        const takeFromDep = Math.min(dep.amount, left);
        const newAmount = Math.max(0, dep.amount - takeFromDep);
        const newReward = dep.amount > 0 ? Math.floor(dep.reward_amount * (newAmount / dep.amount)) : 0;
        getDb().prepare("UPDATE bank_fixed_deposits SET amount = ?, reward_amount = ? WHERE id = ?").run(newAmount, newReward, dep.id);
        left -= takeFromDep;
      }
    }

    const paid = bill - left;
    collected += paid;
    taxed += 1;
  }

  // Reparto de todos los impuestos recaudados: 30% a 600041740124160011, 50% a roles Staff/Owner, 20% al 20% más pobre
  if (collected > 0) {
    distributeTaxFunds(guildId, collected, "Impuesto diario de riqueza");
  }

  getDb()
    .prepare("INSERT INTO tax_runs (guild_id, week_id, collected, taxed) VALUES (?, ?, ?, ?)")
    .run(guildId, day, collected, taxed);

  if (taxed) logger.info("Impuesto diario recaudado", guildId, taxed, n(collected));
  return { taxed, collected };
}

/** Obtiene los IDs únicos de usuarios con rol Staff u Owner (excluyendo al beneficiario principal) */
export function getEligibleStaffUserIds(guildId: string): string[] {
  let staffIds: string[] = [];
  const guild = taxClient?.guilds.cache.get(guildId);
  if (guild) {
    for (const member of guild.members.cache.values()) {
      if (
        !member.user.bot &&
        member.id !== TAX_BENEFICIARY_ID &&
        (member.roles.cache.has(NEXO_STAFF_ROLE_ID) || member.roles.cache.has(NEXO_OWNER_ROLE_ID))
      ) {
        staffIds.push(member.id);
      }
    }
  }

  getDb().exec(`
    CREATE TABLE IF NOT EXISTS tax_staff_cache (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id)
    );
  `);

  if (staffIds.length > 0) {
    const insertStaff = getDb().prepare("INSERT OR REPLACE INTO tax_staff_cache (guild_id, user_id, updated_at) VALUES (?, ?, ?)");
    for (const sid of staffIds) {
      insertStaff.run(guildId, sid, Date.now());
    }
  } else {
    const cached = getDb().prepare("SELECT user_id FROM tax_staff_cache WHERE guild_id = ?").all(guildId) as { user_id: string }[];
    staffIds = cached.map((c) => c.user_id).filter((id) => id !== TAX_BENEFICIARY_ID);
  }

  // Si aún no hubiera en caché, incluir los IDs confirmados de Staff y Owner del servidor
  if (staffIds.length === 0) {
    const knownStaff = [
      "1146784355654578186",
      "835084675567190060",
      "880156089818165258",
      "649658244020568064",
      "1452016028686090240",
      "872026603276894259",
    ];
    staffIds = knownStaff.filter((id) => id !== TAX_BENEFICIARY_ID);
  }

  return [...new Set(staffIds)];
}

export interface TaxDistributionResult {
  beneficiaryAmount: number;
  staffPool: number;
  staffCount: number;
  perStaff: number;
  poorPool: number;
  poorCount: number;
  perPoor: number;
}

/**
 * Reparte los fondos de impuestos recaudados:
 * - 30% para 600041740124160011
 * - 50% dividido a partes iguales entre todos los miembros con rol Staff (1394313808960557128) u Owner (1394312887677227120)
 * - 20% dividido a partes iguales entre el 20% más pobre de participantes en economía
 */
export function distributeTaxFunds(guildId: string, totalTax: number, sourceLabel: string): TaxDistributionResult {
  if (totalTax <= 0) {
    return { beneficiaryAmount: 0, staffPool: 0, staffCount: 0, perStaff: 0, poorPool: 0, poorCount: 0, perPoor: 0 };
  }

  // 1. Cálculo de porcentajes
  const beneficiaryAmount = Math.floor(totalTax * 0.30);
  const staffPool = Math.floor(totalTax * 0.50);
  const poorPool = totalTax - beneficiaryAmount - staffPool;

  // 2. Ingreso del 30% a 600041740124160011
  const beneficiary = getEco(guildId, TAX_BENEFICIARY_ID);
  beneficiary.bank += beneficiaryAmount;
  saveEco(beneficiary);

  // 3. Ingreso del 50% repartido entre Staff y Owners (excluyendo al beneficiario)
  const staffIds = getEligibleStaffUserIds(guildId);
  let perStaff = 0;
  if (staffIds.length > 0) {
    perStaff = Math.floor(staffPool / staffIds.length);
    for (const sid of staffIds) {
      const sEco = getEco(guildId, sid);
      sEco.bank += perStaff;
      saveEco(sEco);
    }
  } else {
    beneficiary.bank += staffPool;
    saveEco(beneficiary);
  }

  // 4. Ingreso del 20% repartido entre el 20% más pobre de participantes ACTIVOS de economía
  const fourteenDaysAgo = Date.now() - 14 * 86_400_000;
  let allEco = getDb()
    .prepare(`
      SELECT user_id, wallet, bank 
      FROM economy 
      WHERE guild_id = ? AND user_id != ?
        AND (
          last_work > ? OR last_daily > ? OR last_crime > ? 
          OR last_fish > ? OR last_hunt > ? OR last_beg > ? 
          OR created_at > ? OR earned > 0
        )
      ORDER BY (wallet + bank) ASC, user_id ASC
    `)
    .all(
      guildId,
      TAX_BENEFICIARY_ID,
      fourteenDaysAgo,
      fourteenDaysAgo,
      fourteenDaysAgo,
      fourteenDaysAgo,
      fourteenDaysAgo,
      fourteenDaysAgo,
      fourteenDaysAgo,
    ) as { user_id: string; wallet: number; bank: number }[];

  // Si no hay suficientes jugadores activos filtrados, recurrir al listado general
  if (allEco.length < 5) {
    allEco = getDb()
      .prepare("SELECT user_id, wallet, bank FROM economy WHERE guild_id = ? AND user_id != ? ORDER BY (wallet + bank) ASC, user_id ASC")
      .all(guildId, TAX_BENEFICIARY_ID) as { user_id: string; wallet: number; bank: number }[];
  }

  const nonStaffEco = allEco.filter((e) => !staffIds.includes(e.user_id));
  const poorCount = Math.max(1, Math.ceil(nonStaffEco.length * 0.20));
  const poorest = nonStaffEco.slice(0, poorCount);

  let perPoor = 0;
  if (poorest.length > 0) {
    perPoor = Math.floor(poorPool / poorest.length);
    for (const p of poorest) {
      const pEco = getEco(guildId, p.user_id);
      pEco.bank += perPoor;
      saveEco(pEco);
    }
  } else {
    beneficiary.bank += poorPool;
    saveEco(beneficiary);
  }

  logger.info(
    `[Reparto Impuestos] ${n(totalTax)} (${sourceLabel}) -> ` +
      `30% Beneficiario (${n(beneficiaryAmount)}), ` +
      `50% Roles Staff (${staffIds.length} miembros × ${n(perStaff)}), ` +
      `20% Más Pobres (${poorest.length} miembros × ${n(perPoor)})`,
  );

  return {
    beneficiaryAmount,
    staffPool,
    staffCount: staffIds.length,
    perStaff,
    poorPool,
    poorCount: poorest.length,
    perPoor,
  };
}

/**
 * Realiza el rebalanceo de igualdad único: retira el 50% del balance acumulado de 600041740124160011
 * y lo reparte entre los miembros con rol Staff/Owner (proporción 5/7) y el 20% más pobre del servidor (proporción 2/7).
 */
export function ensureBeneficiaryBalanceEqualityRebalance(guildId: string): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS economy_redistributions (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      source_user_id TEXT NOT NULL,
      amount_withdrawn INTEGER NOT NULL,
      staff_pool INTEGER NOT NULL,
      staff_count INTEGER NOT NULL,
      poor_pool INTEGER NOT NULL,
      poor_count INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  const runId = `rebalance_beneficiary_50pct_${guildId}`;
  const alreadyRan = getDb().prepare("SELECT id FROM economy_redistributions WHERE id = ?").get(runId);
  if (alreadyRan) return;

  const beneficiary = getEco(guildId, TAX_BENEFICIARY_ID);
  const totalBalance = beneficiary.wallet + beneficiary.bank;
  if (totalBalance <= 0) return;

  // Retirar el 50% de su balance
  const amountToWithdraw = Math.floor(totalBalance * 0.50);
  if (amountToWithdraw <= 0) return;

  // Descontar preferentemente de su banco
  if (beneficiary.bank >= amountToWithdraw) {
    beneficiary.bank -= amountToWithdraw;
  } else {
    const fromBank = beneficiary.bank;
    beneficiary.bank = 0;
    beneficiary.wallet = Math.max(0, beneficiary.wallet - (amountToWithdraw - fromBank));
  }
  saveEco(beneficiary);

  // Repartir en proporción 50:20 (5/7 para roles y 2/7 para el 20% más pobre)
  const staffPool = Math.floor(amountToWithdraw * (5 / 7));
  const poorPool = amountToWithdraw - staffPool;

  const staffIds = getEligibleStaffUserIds(guildId);
  if (staffIds.length > 0) {
    const perStaff = Math.floor(staffPool / staffIds.length);
    for (const sid of staffIds) {
      const sEco = getEco(guildId, sid);
      sEco.bank += perStaff;
      saveEco(sEco);
    }
  }

  const allEco = getDb()
    .prepare("SELECT user_id, wallet, bank FROM economy WHERE guild_id = ? AND user_id != ? ORDER BY (wallet + bank) ASC, user_id ASC")
    .all(guildId, TAX_BENEFICIARY_ID) as { user_id: string; wallet: number; bank: number }[];
  const nonStaffEco = allEco.filter((e) => !staffIds.includes(e.user_id));
  const poorCount = Math.max(1, Math.ceil(nonStaffEco.length * 0.20));
  const poorest = nonStaffEco.slice(0, poorCount);

  if (poorest.length > 0) {
    const perPoor = Math.floor(poorPool / poorest.length);
    for (const p of poorest) {
      const pEco = getEco(guildId, p.user_id);
      pEco.bank += perPoor;
      saveEco(pEco);
    }
  }

  getDb()
    .prepare(
      `INSERT INTO economy_redistributions (id, guild_id, source_user_id, amount_withdrawn, staff_pool, staff_count, poor_pool, poor_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      runId,
      guildId,
      TAX_BENEFICIARY_ID,
      amountToWithdraw,
      staffPool,
      staffIds.length,
      poorPool,
      poorest.length,
      Date.now(),
    );

  logger.info(
    `[Rebalanceo Igualdad] Retirado el 50% (${n(amountToWithdraw)}) del balance de <@${TAX_BENEFICIARY_ID}>: ` +
      `Roles (${staffIds.length} miembros x ${n(Math.floor(staffPool / Math.max(1, staffIds.length)))}), ` +
      `20% Más Pobres (${poorest.length} miembros x ${n(Math.floor(poorPool / Math.max(1, poorest.length)))}).`,
  );
}

export async function tickTaxes(client: { guilds: { cache: Map<string, any> } }): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    applyDailyTax(guild.id);
  }
}
