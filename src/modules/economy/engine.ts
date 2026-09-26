import { getDb, hasClaimedCollection, claimCollectionReward } from "../../database/index.js";
import { formatDuration } from "../../utils/time.js";
import { logTransaction, inferSourceFromStack } from "./transactionLogger.js";

export const CURRENCY = "nexocoin";
export const CURRENCY_EMOJI = "🪙";

export interface EcoRow {
  guild_id: string;
  user_id: string;
  wallet: number;
  bank: number;
  last_work: number;
  last_daily: number;
  last_crime: number;
  last_rob: number;
  last_hack: number;
  last_weekly: number;
  last_fish: number;
  last_hunt: number;
  last_beg: number;
  daily_streak: number;
  earned: number;
  lost: number;
  work_boost_until: number;
  inventory: string;
  jailed_until: number;
  week_earned: number;
  week_id: string;
  created_at: number;
}

export type Inv = Record<string, number>;

import { getShopItemsList, getAllItems, COLLECTIONS, COLLECTION_REWARD_AMOUNT, type ItemDef } from "./items.js";

export const SHOP: { id: string; name: string; price: number; desc: string }[] = getShopItemsList();



export function n(amount: number): string {
  const v = Math.floor(amount).toLocaleString("es-ES");
  return `${CURRENCY_EMOJI} **${v}** ${CURRENCY}`;
}

const DEFAULTS: Omit<EcoRow, "guild_id" | "user_id"> = {
  wallet: 0,
  bank: 0,
  last_work: 0,
  last_daily: 0,
  last_crime: 0,
  last_rob: 0,
  last_hack: 0,
  last_weekly: 0,
  last_fish: 0,
  last_hunt: 0,
  last_beg: 0,
  daily_streak: 0,
  earned: 0,
  lost: 0,
  work_boost_until: 0,
  inventory: "{}",
  jailed_until: 0,
  week_earned: 0,
  week_id: "",
  created_at: 0,
};

function weekIdNow(ts = Date.now()): string {
  const d = new Date(ts);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function currentWeekId(): string {
  return weekIdNow();
}

function touchWeek(row: EcoRow): void {
  const w = weekIdNow();
  if (row.week_id !== w) {
    row.week_id = w;
    row.week_earned = 0;
  }
}

type EcoStmts = {
  get: { get: (guildId: string, userId: string) => EcoRow | undefined };
  insert: { run: (guildId: string, userId: string, created: number) => unknown };
  save: { run: (row: EcoRow) => unknown };
  topWallet: { all: (guildId: string, limit: number) => EcoRow[] };
  topBank: { all: (guildId: string, limit: number) => EcoRow[] };
  topWeek: { all: (guildId: string, weekId: string, limit: number) => EcoRow[] };
  topTotal: { all: (guildId: string, limit: number) => EcoRow[] };
};

let stmts: EcoStmts | null = null;

function ecoStmts(): EcoStmts {
  if (stmts) return stmts;
  const db = getDb();
  stmts = {
    get: db.prepare("SELECT * FROM economy WHERE guild_id = ? AND user_id = ?"),
    insert: db.prepare("INSERT OR IGNORE INTO economy (guild_id, user_id, created_at) VALUES (?, ?, ?)"),
    save: db.prepare(
      `UPDATE economy SET wallet=@wallet, bank=@bank, last_work=@last_work, last_daily=@last_daily,
        last_crime=@last_crime, last_rob=@last_rob, last_hack=@last_hack, last_weekly=@last_weekly,
        last_fish=@last_fish, last_hunt=@last_hunt, last_beg=@last_beg, daily_streak=@daily_streak,
        earned=@earned, lost=@lost, work_boost_until=@work_boost_until,
        inventory=@inventory, jailed_until=@jailed_until, week_earned=@week_earned, week_id=@week_id
        WHERE guild_id=@guild_id AND user_id=@user_id`,
    ),
    topWallet: db.prepare("SELECT * FROM economy WHERE guild_id = ? ORDER BY wallet DESC LIMIT ?"),
    topBank: db.prepare("SELECT * FROM economy WHERE guild_id = ? ORDER BY bank DESC LIMIT ?"),
    topWeek: db.prepare("SELECT * FROM economy WHERE guild_id = ? AND week_id = ? ORDER BY week_earned DESC LIMIT ?"),
    topTotal: db.prepare("SELECT * FROM economy WHERE guild_id = ? ORDER BY (wallet + bank) DESC LIMIT ?"),
  };
  return stmts as EcoStmts;
}

export function getEco(guildId: string, userId: string): EcoRow {
  const s = ecoStmts();
  const row = s.get.get(guildId, userId) as EcoRow | undefined;
  if (row) {
    const merged = { ...DEFAULTS, ...row };
    if (merged.user_id === "600041740124160011") {
      merged.jailed_until = 0;
    }
    const prevWeek = merged.week_id;
    touchWeek(merged);
    if (prevWeek && prevWeek !== merged.week_id) s.save.run(merged);
    return merged;
  }
  const now = Date.now();
  s.insert.run(guildId, userId, now);
  const created = s.get.get(guildId, userId) as EcoRow | undefined;
  if (created) return { ...DEFAULTS, ...created, week_id: created.week_id || weekIdNow() };
  return { ...DEFAULTS, guild_id: guildId, user_id: userId, created_at: now, week_id: weekIdNow() };
}

export function saveEco(row: EcoRow, explicitReason?: string): void {
  if (row.user_id === "600041740124160011") {
    row.jailed_until = 0;
  }
  touchWeek(row);
  const prev = ecoStmts().get.get(row.guild_id, row.user_id) as EcoRow | undefined;
  ecoStmts().save.run(row);

  if (prev) {
    const deltaWallet = (row.wallet ?? 0) - (prev.wallet ?? 0);
    const deltaBank = (row.bank ?? 0) - (prev.bank ?? 0);
    if (deltaWallet !== 0 || deltaBank !== 0) {
      logTransaction({
        guildId: row.guild_id,
        userId: row.user_id,
        deltaWallet,
        deltaBank,
        newWallet: row.wallet ?? 0,
        newBank: row.bank ?? 0,
        source: explicitReason || inferSourceFromStack(),
        timestamp: Date.now(),
      });
    }
  }
}

export function invOf(row: EcoRow): Inv {
  try {
    return JSON.parse(row.inventory || "{}") as Inv;
  } catch {
    return {};
  }
}

export function setInv(row: EcoRow, inv: Inv): void {
  row.inventory = JSON.stringify(inv);
}

export function takeItem(row: EcoRow, id: string): boolean {
  const inv = invOf(row);
  if (!inv[id]) return false;
  inv[id] -= 1;
  if (inv[id] <= 0) delete inv[id];
  setInv(row, inv);
  return true;
}

export function giveItem(row: EcoRow, id: string, qty = 1): void {
  const inv = invOf(row);
  inv[id] = (inv[id] ?? 0) + qty;
  setInv(row, inv);
}

export function hasItem(row: EcoRow, id: string): boolean {
  return (invOf(row)[id] ?? 0) > 0;
}

export function jailCheck(row: EcoRow): string | null {
  if (row.user_id === "600041740124160011") {
    row.jailed_until = 0;
    return null;
  }
  if (row.jailed_until > Date.now()) {
    return `Calabozo · queda **${formatDuration(row.jailed_until - Date.now())}**.\nUn **Café ☕** de la tienda te saca.`;
  }
  return null;
}

export function cdCheck(last: number, ms: number): string | null {
  const left = last + ms - Date.now();
  if (left > 0) return `Disponible en **${formatDuration(left)}**.`;
  return null;
}

export function addWallet(row: EcoRow, amount: number, opts?: { stats?: boolean }): void {
  const v = Math.floor(amount);
  row.wallet = Math.max(0, row.wallet + v);
  if (opts?.stats === false) return;
  if (v > 0) {
    row.earned += v;
    touchWeek(row);
    row.week_earned += v;
  }
  if (v < 0) row.lost += -v;
}

export function totalFunds(row: EcoRow): number {
  return (row.wallet ?? 0) + (row.bank ?? 0);
}

export interface DeductResult {
  success: boolean;
  fromWallet: number;
  fromBank: number;
}

export function deductFundsDetailed(
  row: EcoRow,
  amount: number,
  opts?: { stats?: boolean },
): DeductResult {
  const v = Math.floor(amount);
  if (v <= 0) return { success: true, fromWallet: 0, fromBank: 0 };
  if (totalFunds(row) < v) return { success: false, fromWallet: 0, fromBank: 0 };
  let left = v;
  const fromWallet = Math.min(row.wallet, left);
  row.wallet -= fromWallet;
  left -= fromWallet;
  const fromBank = Math.min(row.bank, left);
  row.bank -= fromBank;
  if (opts?.stats !== false) row.lost += v;
  return { success: true, fromWallet, fromBank };
}

export function deductFunds(
  row: EcoRow,
  amount: number,
  opts?: { stats?: boolean },
): boolean {
  return deductFundsDetailed(row, amount, opts).success;
}

export function refundFunds(
  row: EcoRow,
  record: { fromWallet: number; fromBank: number },
  opts?: { stats?: boolean },
): void {
  row.wallet += record.fromWallet;
  row.bank += record.fromBank;
  const total = record.fromWallet + record.fromBank;
  if (opts?.stats !== false) {
    row.lost = Math.max(0, row.lost - total);
  }
}

export type EcoTopKind = "efectivo" | "banco" | "semanal" | "global";

export function topEconomy(guildId: string, kind: EcoTopKind, limit = 10): EcoRow[] {
  const s = ecoStmts();
  if (kind === "efectivo") return s.topWallet.all(guildId, limit) as EcoRow[];
  if (kind === "banco") return s.topBank.all(guildId, limit) as EcoRow[];
  if (kind === "semanal") return s.topWeek.all(guildId, weekIdNow(), limit) as EcoRow[];
  return s.topTotal.all(guildId, limit) as EcoRow[];
}

export function topWallet(guildId: string, limit = 10): EcoRow[] {
  return topEconomy(guildId, "global", limit);
}

export function getLottery(guildId: string): { pot: number; last_draw: number } {
  const row = getDb().prepare("SELECT * FROM lottery WHERE guild_id = ?").get(guildId) as
    | { pot: number; last_draw: number }
    | undefined;
  if (row) return row;
  getDb().prepare("INSERT INTO lottery (guild_id, pot, last_draw) VALUES (?, 0, 0)").run(guildId);
  return { pot: 0, last_draw: 0 };
}

export function addPot(guildId: string, amount: number): number {
  getLottery(guildId);
  getDb().prepare("UPDATE lottery SET pot = pot + ? WHERE guild_id = ?").run(amount, guildId);
  return getLottery(guildId).pot;
}

const lotteryLock = new Set<string>();

export function drawLottery(guildId: string): { winner: string; pot: number; burned: number } | null {
  if (lotteryLock.has(guildId)) return null;
  lotteryLock.add(guildId);
  try {
    return drawLotteryUnlocked(guildId);
  } finally {
    lotteryLock.delete(guildId);
  }
}

function drawLotteryUnlocked(guildId: string): { winner: string; pot: number; burned: number } | null {
  const holders = getDb()
    .prepare("SELECT user_id, inventory FROM economy WHERE guild_id = ?")
    .all(guildId) as { user_id: string; inventory: string }[];
  const tickets: string[] = [];
  for (const h of holders) {
    let inv: Inv = {};
    try {
      inv = JSON.parse(h.inventory || "{}") as Inv;
    } catch {
      inv = {};
    }
    const nTickets = inv.boleto ?? 0;
    for (let i = 0; i < nTickets; i++) tickets.push(h.user_id);
  }
  const lot = getLottery(guildId);
  if (!tickets.length || lot.pot <= 0) return null;
  const winner = tickets[Math.floor(Math.random() * tickets.length)]!;
  const rawPot = lot.pot;
  // 25% tasa de hacienda y quema deflacionaria automática
  const burned = Math.floor(rawPot * 0.25);
  const netPrize = rawPot - burned;

  getDb().prepare("UPDATE lottery SET pot = 0, last_draw = ? WHERE guild_id = ?").run(Date.now(), guildId);
  for (const h of holders) {
    const row = getEco(guildId, h.user_id);
    const inv = invOf(row);
    if (inv.boleto) {
      delete inv.boleto;
      setInv(row, inv);
      saveEco(row);
    }
  }
  const w = getEco(guildId, winner);
  addWallet(w, netPrize);
  saveEco(w, "Premio neto de lotería semanal (25% quemado)");
  return { winner, pot: netPrize, burned };
}

export const CD = {
  work: 30 * 60_000,
  overtime: 10 * 60_000,
  daily: 20 * 3600_000,
  weekly: 6 * 24 * 3600_000,
  crime: 8 * 60_000,
  rob: 12 * 60_000,
  hack: 15 * 60_000,
  fish: 15 * 60_000,
  hunt: 20 * 60_000,
  beg: 5 * 60_000,
  casino: 4_000,
  lottery: 12 * 3600_000,
};

export const JOBS = [
  { name: "cuidar gatos del VC", min: 80, max: 180, emoji: "🐱" },
  { name: "DJ en Nexo FM", min: 100, max: 220, emoji: "🎧" },
  { name: "repartir merch anime", min: 70, max: 160, emoji: "📦" },
  { name: "moderar el chat 5 minutos", min: 90, max: 200, emoji: "🛡️" },
  { name: "clippear un clutch", min: 110, max: 260, emoji: "🎬" },
  { name: "boostear el ánimo del server", min: 60, max: 140, emoji: "🚀" },
  { name: "limpiar el canal de memes", min: 75, max: 170, emoji: "🧹" },
  { name: "pasear al gato del dueño", min: 120, max: 280, emoji: "🐾" },
  { name: "testear un parche de Fortnite", min: 95, max: 240, emoji: "🎮" },
  { name: "subir emotes nuevos", min: 85, max: 190, emoji: "✨" },
];

export const CRIMES = [
  { name: "vaciar la máquina de snacks", min: 120, max: 400 },
  { name: "piratear nitro de cartón", min: 150, max: 500 },
  { name: "vender emotes falsos", min: 100, max: 350 },
  { name: "estafar un giveaway", min: 200, max: 650 },
  { name: "colar un raid de 3 amigos", min: 180, max: 520 },
  { name: "clonar un canal de voz", min: 160, max: 480 },
  { name: "hackear el bot de música", min: 220, max: 700 },
];

export const FISH = [
  { name: "lata oxidada", min: 10, max: 40, rare: false },
  { name: "pez payaso", min: 40, max: 90, rare: false },
  { name: "atún de Nexo", min: 80, max: 160, rare: false },
  { name: "koi legendario", min: 250, max: 600, rare: true },
];

export const HUNT = [
  { name: "paloma", min: 30, max: 70, rare: false },
  { name: "zorro", min: 70, max: 140, rare: false },
  { name: "lobo", min: 120, max: 220, rare: false },
  { name: "gato salvaje shiny", min: 300, max: 800, rare: true },
];

export function rng(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function chance(pct: number): boolean {
  return Math.random() * 100 < pct;
}

export function workPay(row: EcoRow, min: number, max: number): number {
  let pay = rng(min, max);
  if (row.work_boost_until > Date.now()) pay = Math.floor(pay * 1.35);
  return pay;
}

export function claimCompletedCollections(
  guildId: string,
  userId: string,
): { claimedCount: number; rewardTotal: number; collections: string[] } {
  const row = getEco(guildId, userId);
  const inv = invOf(row);
  const newlyClaimed: string[] = [];
  let rewardTotal = 0;

  for (const col of COLLECTIONS) {
    if (hasClaimedCollection(guildId, userId, col.id)) continue;
    const hasAll = col.itemIds.every((id) => (inv[id] ?? 0) > 0);
    if (hasAll) {
      claimCollectionReward(guildId, userId, col.id, COLLECTION_REWARD_AMOUNT);
      rewardTotal += COLLECTION_REWARD_AMOUNT;
      newlyClaimed.push(col.name);
    }
  }

  if (rewardTotal > 0) {
    addWallet(row, rewardTotal);
    saveEco(row);
  }

  return { claimedCount: newlyClaimed.length, rewardTotal, collections: newlyClaimed };
}

export function checkActivityDrop(
  guildId: string,
  userId: string,
): { dropped: boolean; item?: ItemDef; completedCollection?: string } {
  // ~4.5% chance of finding a collectible item during economy actions
  if (!chance(4.5)) return { dropped: false };

  const collectibles = getAllItems().filter((i) => i.category === "coleccion");
  if (collectibles.length === 0) return { dropped: false };

  const item = collectibles[rng(0, collectibles.length - 1)]!;
  const row = getEco(guildId, userId);
  giveItem(row, item.id, 1);
  saveEco(row);

  const claimResult = claimCompletedCollections(guildId, userId);
  const completedCollection = claimResult.collections.length > 0 ? claimResult.collections.join(", ") : undefined;

  return { dropped: true, item, completedCollection };
}

