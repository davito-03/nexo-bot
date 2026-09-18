import { getDb } from "../../database/index.js";
import { addWallet, n, saveEco, type EcoRow } from "./engine.js";

export interface LoanRow {
  guild_id: string;
  user_id: string;
  principal: number;
  owed: number;
  rate: number;
  taken_at: number;
  due_at: number;
  last_penalty_at: number;
}

const PERIOD = 12 * 3600_000;
const TERM = 48 * 3600_000;

let stmts: {
  get: { get: (guildId: string, userId: string) => LoanRow | undefined };
  upsert: { run: (row: LoanRow) => unknown };
  del: { run: (guildId: string, userId: string) => unknown };
} | null = null;

function S() {
  if (stmts) return stmts;
  const db = getDb();
  stmts = {
    get: db.prepare("SELECT * FROM loans WHERE guild_id = ? AND user_id = ?"),
    upsert: db.prepare(
      `INSERT INTO loans (guild_id, user_id, principal, owed, rate, taken_at, due_at, last_penalty_at)
       VALUES (@guild_id, @user_id, @principal, @owed, @rate, @taken_at, @due_at, @last_penalty_at)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET
         principal=excluded.principal, owed=excluded.owed, rate=excluded.rate,
         taken_at=excluded.taken_at, due_at=excluded.due_at, last_penalty_at=excluded.last_penalty_at`,
    ),
    del: db.prepare("DELETE FROM loans WHERE guild_id = ? AND user_id = ?"),
  };
  return stmts as NonNullable<typeof stmts>;
}

export function getLoan(guildId: string, userId: string): LoanRow | undefined {
  return S().get.get(guildId, userId) as LoanRow | undefined;
}

export function loanOffer(row: EcoRow): { max: number; rate: number; dueMs: number } {
  const net = Math.max(0, row.wallet + row.bank);
  const max = net < 200 ? 500 : Math.min(40_000, Math.max(400, Math.floor(net * 0.65)));
  const rate = net >= 8_000 ? 0.15 : 0.2;
  return { max, rate, dueMs: TERM };
}

function applyPenalty(loan: LoanRow, now = Date.now()): boolean {
  if (now <= loan.due_at) return false;
  const from = Math.max(loan.last_penalty_at, loan.due_at);
  const periods = Math.floor((now - from) / PERIOD);
  if (periods <= 0) return false;
  const cap = loan.principal * 3;
  for (let i = 0; i < periods && loan.owed < cap; i++) {
    loan.owed = Math.min(cap, Math.ceil(loan.owed * 1.08));
  }
  loan.last_penalty_at = from + periods * PERIOD;
  return true;
}

export function collectLoan(row: EcoRow): { paid: number; owed: number; overdue: boolean } {
  const loan = getLoan(row.guild_id, row.user_id);
  if (!loan) return { paid: 0, owed: 0, overdue: false };
  const overdue = Date.now() > loan.due_at;
  const changed = applyPenalty(loan);
  if (!overdue) {
    if (changed) S().upsert.run(loan);
    return { paid: 0, owed: loan.owed, overdue: false };
  }
  let need = loan.owed;
  const fromWallet = Math.min(row.wallet, need);
  row.wallet -= fromWallet;
  need -= fromWallet;
  const fromBank = Math.min(row.bank, need);
  row.bank -= fromBank;
  need -= fromBank;
  const paid = loan.owed - need;
  loan.owed = need;
  if (paid > 0) saveEco(row);
  if (loan.owed <= 0) S().del.run(row.guild_id, row.user_id);
  else S().upsert.run(loan);
  return { paid, owed: Math.max(0, loan.owed), overdue: true };
}

export function takeLoan(row: EcoRow, amount: number): string | LoanRow {
  if (getLoan(row.guild_id, row.user_id)) return "Ya tienes un préstamo abierto. Págalo con `/eco-deuda`.";
  const offer = loanOffer(row);
  const qty = Math.floor(amount);
  if (qty < 50) return "El mínimo es 50 nexocoin.";
  if (qty > offer.max) return `Tu máximo ahora es ${n(offer.max)} (según tu saldo).`;
  const owed = Math.ceil(qty * (1 + offer.rate));
  const now = Date.now();
  const loan: LoanRow = {
    guild_id: row.guild_id,
    user_id: row.user_id,
    principal: qty,
    owed,
    rate: offer.rate,
    taken_at: now,
    due_at: now + offer.dueMs,
    last_penalty_at: 0,
  };
  addWallet(row, qty, { stats: false });
  saveEco(row);
  S().upsert.run(loan);
  return loan;
}

export function payLoan(row: EcoRow, amount: number): string | { paid: number; left: number } {
  const loan = getLoan(row.guild_id, row.user_id);
  if (!loan) return "No tienes deuda.";
  applyPenalty(loan);
  const want = Math.min(Math.floor(amount), loan.owed);
  if (want <= 0) return "Cantidad inválida.";
  const available = row.wallet + row.bank;
  if (available < want) return `Te faltan fondos. Tienes ${n(available)} entre cartera y banco.`;
  let left = want;
  const w = Math.min(row.wallet, left);
  row.wallet -= w;
  left -= w;
  row.bank -= left;
  loan.owed -= want;
  saveEco(row);
  if (loan.owed <= 0) S().del.run(row.guild_id, row.user_id);
  else S().upsert.run(loan);
  return { paid: want, left: Math.max(0, loan.owed) };
}

export function loanSummary(loan: LoanRow): string {
  applyPenalty(loan);
  const overdue = Date.now() > loan.due_at;
  const pct = Math.round(loan.rate * 100);
  return [
    `Principal: ${n(loan.principal)} · interés **${pct}%**`,
    `A devolver: **${n(loan.owed)}**`,
    overdue
      ? `⚠️ Impago. Venció <t:${Math.floor(loan.due_at / 1000)}:R>. La deuda sube **+8% cada 12h** (tope x3). El banco se cobra solo de tu cartera y depósito.`
      : `Vence <t:${Math.floor(loan.due_at / 1000)}:R>.`,
  ].join("\n");
}
