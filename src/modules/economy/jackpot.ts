import { getDb } from "../../database/index.js";

const DEFAULT_BASE_JACKPOT = 50_000;

export interface JackpotInfo {
  guildId: string;
  amount: number;
  lastWinnerId: string | null;
  lastWinnerTag: string | null;
  lastWonAmount: number;
  lastWonAt: number;
}

export function getJackpot(guildId: string): JackpotInfo {
  const db = getDb();
  let row = db
    .prepare("SELECT * FROM casino_jackpot WHERE guild_id = ?")
    .get(guildId) as any;

  if (!row) {
    db.prepare(
      "INSERT INTO casino_jackpot (guild_id, amount, last_winner_id, last_winner_tag, last_won_amount, last_won_at, updated_at) VALUES (?, ?, NULL, NULL, 0, 0, ?)",
    ).run(guildId, DEFAULT_BASE_JACKPOT, Date.now());
    return {
      guildId,
      amount: DEFAULT_BASE_JACKPOT,
      lastWinnerId: null,
      lastWinnerTag: null,
      lastWonAmount: 0,
      lastWonAt: 0,
    };
  }

  return {
    guildId: row.guild_id,
    amount: row.amount,
    lastWinnerId: row.last_winner_id,
    lastWinnerTag: row.last_winner_tag,
    lastWonAmount: row.last_won_amount ?? 0,
    lastWonAt: row.last_won_at ?? 0,
  };
}

export function feedJackpot(guildId: string, betAmount: number, percentage = 0.01): number {
  if (betAmount <= 0) return 0;
  const contribution = Math.max(1, Math.floor(betAmount * percentage));
  const db = getDb();

  getJackpot(guildId); // Ensure exists

  db.prepare("UPDATE casino_jackpot SET amount = amount + ?, updated_at = ? WHERE guild_id = ?").run(
    contribution,
    Date.now(),
    guildId,
  );

  return contribution;
}

export function winJackpot(guildId: string, userId: string, userTag: string): number {
  const db = getDb();
  const current = getJackpot(guildId);
  const prize = Math.max(current.amount, DEFAULT_BASE_JACKPOT);
  const now = Date.now();

  db.prepare(
    "UPDATE casino_jackpot SET amount = ?, last_winner_id = ?, last_winner_tag = ?, last_won_amount = ?, last_won_at = ?, updated_at = ? WHERE guild_id = ?",
  ).run(DEFAULT_BASE_JACKPOT, userId, userTag, prize, now, now, guildId);

  return prize;
}
