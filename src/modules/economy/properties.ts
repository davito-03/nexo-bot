import { getDb } from "../../database/index.js";
import { deductFunds, addWallet, getEco, saveEco } from "./engine.js";
import { getJobBonus } from "./jobs.js";

export const PROPERTY_CATALOG = [
  { id: 'cobertizo', name: '🏚️ Cobertizo', price: 5_000, income8h: 120, maxLevel: 5 },
  { id: 'casa', name: '🏠 Casa Modesta', price: 20_000, income8h: 400, maxLevel: 5 },
  { id: 'apartamento', name: '🏢 Apartamento', price: 50_000, income8h: 900, maxLevel: 5 },
  { id: 'tienda', name: '🏪 Tienda Local', price: 100_000, income8h: 1_800, maxLevel: 5 },
  { id: 'hotel', name: '🏨 Hotel', price: 250_000, income8h: 4_000, maxLevel: 5 },
  { id: 'mansion', name: '🏰 Mansión', price: 500_000, income8h: 7_500, maxLevel: 5 },
  { id: 'rascacielos', name: '🏙️ Rascacielos', price: 1_500_000, income8h: 18_000, maxLevel: 5 },
];

export function getPropertyDef(id: string) {
  return PROPERTY_CATALOG.find(p => p.id === id);
}

export function getUserProperties(guildId: string, userId: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM properties WHERE guild_id = ? AND user_id = ?").all(guildId, userId) as any[];
}

export function getPropertyJobBonus(guildId: string, userId: string): number {
  const bonus = getJobBonus(guildId, userId, "propertyIncomeBonus");
  const global = getJobBonus(guildId, userId, "globalBonus");
  return 1 + bonus + global;
}

export function getPropertyCostDiscount(guildId: string, userId: string): number {
  const discount = getJobBonus(guildId, userId, "propertyDiscount");
  return 1 - discount;
}

export function buyProperty(guildId: string, userId: string, propertyId: string): { success: boolean; msg?: string } {
  const prop = getPropertyDef(propertyId);
  if (!prop) return { success: false, msg: "Propiedad no encontrada." };
  
  const db = getDb();
  const existing = db.prepare("SELECT * FROM properties WHERE guild_id = ? AND user_id = ? AND property_id = ?").get(guildId, userId, propertyId);
  if (existing) return { success: false, msg: "Ya posees esta propiedad." };

  const discount = getPropertyCostDiscount(guildId, userId);
  const cost = Math.floor(prop.price * discount);

  const eco = getEco(guildId, userId);
  if (eco.wallet < cost) {
    return { success: false, msg: `No tienes fondos suficientes. Necesitas **${cost}** monedas.` };
  }
  deductFunds(eco, cost);
  saveEco(eco);

  db.prepare("INSERT INTO properties (guild_id, user_id, property_id, level, last_collect, purchased_at) VALUES (?, ?, ?, ?, ?, ?)").run(guildId, userId, propertyId, 1, Date.now(), Date.now());

  return { success: true };
}

export function upgradeProperty(guildId: string, userId: string, propertyId: string): { success: boolean; msg?: string } {
  const prop = getPropertyDef(propertyId);
  if (!prop) return { success: false, msg: "Propiedad no encontrada." };

  const db = getDb();
  const existing = db.prepare("SELECT * FROM properties WHERE guild_id = ? AND user_id = ? AND property_id = ?").get(guildId, userId, propertyId) as any;
  if (!existing) return { success: false, msg: "No posees esta propiedad." };

  if (existing.level >= prop.maxLevel) return { success: false, msg: "La propiedad ya está al nivel máximo." };

  const discount = getPropertyCostDiscount(guildId, userId);
  const cost = Math.floor(prop.price * existing.level * discount);

  const eco = getEco(guildId, userId);
  if (eco.wallet < cost) {
    return { success: false, msg: `No tienes fondos suficientes. Cuesta **${cost}** monedas mejorarla.` };
  }
  deductFunds(eco, cost);
  saveEco(eco);

  db.prepare("UPDATE properties SET level = level + 1 WHERE guild_id = ? AND user_id = ? AND property_id = ?").run(guildId, userId, propertyId);

  return { success: true };
}

export function calculatePendingIncome(guildId: string, userId: string): number {
  const props = getUserProperties(guildId, userId);
  if (!props.length) return 0;
  
  let total = 0;
  const now = Date.now();
  const bonus = getPropertyJobBonus(guildId, userId);

  for (const p of props) {
    const def = getPropertyDef(p.property_id);
    if (!def) continue;

    const elapsed = now - p.last_collect;
    const cycles = Math.floor(elapsed / 28_800_000); // 8 hours
    if (cycles > 0) {
      const incomePerCycle = def.income8h * (1 + 0.5 * (p.level - 1));
      total += cycles * incomePerCycle;
    }
  }

  return Math.floor(total * bonus);
}

export function collectIncome(guildId: string, userId: string): { total: number; msg?: string } {
  const props = getUserProperties(guildId, userId);
  if (!props.length) return { total: 0, msg: "No tienes propiedades." };

  let totalRaw = 0;
  const now = Date.now();
  const db = getDb();
  let updated = 0;

  for (const p of props) {
    const def = getPropertyDef(p.property_id);
    if (!def) continue;

    const elapsed = now - p.last_collect;
    const cycles = Math.floor(elapsed / 28_800_000); // 8 hours
    
    if (cycles > 0) {
      const incomePerCycle = def.income8h * (1 + 0.5 * (p.level - 1));
      totalRaw += cycles * incomePerCycle;
      const rem = elapsed % 28_800_000;
      const newCollect = now - rem;
      
      db.prepare("UPDATE properties SET last_collect = ? WHERE guild_id = ? AND user_id = ? AND property_id = ?").run(newCollect, guildId, userId, p.property_id);
      updated++;
    }
  }

  if (updated === 0) return { total: 0, msg: "No hay ingresos pendientes para cobrar todavía." };

  const bonus = getPropertyJobBonus(guildId, userId);
  const total = Math.floor(totalRaw * bonus);
  
  const eco = getEco(guildId, userId);
  addWallet(eco, total);
  saveEco(eco);

  return { total };
}

export function sellProperty(guildId: string, userId: string, propertyId: string): { success: boolean; amount?: number; msg?: string } {
  const prop = getPropertyDef(propertyId);
  if (!prop) return { success: false, msg: "Propiedad no encontrada." };

  const db = getDb();
  const existing = db.prepare("SELECT * FROM properties WHERE guild_id = ? AND user_id = ? AND property_id = ?").get(guildId, userId, propertyId) as any;
  if (!existing) return { success: false, msg: "No posees esta propiedad." };

  let invested = prop.price;
  for (let i = 1; i < existing.level; i++) {
    invested += prop.price * i;
  }
  
  const refund = Math.floor(invested * 0.5);

  db.prepare("DELETE FROM properties WHERE guild_id = ? AND user_id = ? AND property_id = ?").run(guildId, userId, propertyId);
  
  const eco = getEco(guildId, userId);
  addWallet(eco, refund);
  saveEco(eco);

  return { success: true, amount: refund };
}
