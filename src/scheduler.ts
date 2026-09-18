import { Guild } from "discord.js";
import type { NexoClient } from "./client.js";
import { getDb, getGuildConfig, pruneAllArchives } from "./database/index.js";
import { logger } from "./logger.js";
import { tickVoiceXp } from "./modules/levels/engine.js";
import { tickGiveaways } from "./modules/giveaways/manager.js";
import { createBackup, pruneBackups } from "./modules/backup/create.js";
import { tickVoiceProfiles } from "./modules/voice/profile.js";
import { tickEventReminders } from "./modules/events/rsvp.js";
import { tickBirthdays } from "./modules/community/birthdays.js";
import { tickQuotes } from "./modules/community/quotes.js";
import { tickTaxes } from "./modules/economy/tax.js";
import { tickMissionBoard } from "./modules/missions/engine.js";
import { tickAuctions } from "./modules/economy/auctions.js";
import { tickTradingPrices } from "./modules/economy/trading.js";
import { checkAndDistributeDailyDividends } from "./modules/economy/passive.js";
import { tickBumpReminder } from "./modules/bump/engine.js";
import { tickChatGames, tickVoiceDrops } from "./modules/events/chatGames.js";
import { tickPolls } from "./modules/community/polls.js";
import { tickWeeklyLottery } from "./commands/economy/loteria.js";

const lastBackup = new Map<string, number>();
const running = new Set<string>();

async function guarded(key: string, task: () => Promise<void>): Promise<void> {
  if (running.has(key)) return;
  running.add(key);
  try { await task(); } finally { running.delete(key); }
}

export function startScheduler(client: NexoClient): void {
  setInterval(() => {
    void guarded("giveaways", () => tickGiveaways(client)).catch((e) => logger.error("giveaways tick", e));
    void guarded("tempbans", () => expireTempbans(client)).catch((e) => logger.error("tempban tick", e));
    void guarded("polls", () => tickPolls(client)).catch((e) => logger.error("polls tick", e));
  }, 15_000);

  setInterval(() => {
    void guarded("voice-xp", () => tickVoiceXp(client)).catch((e) => logger.error("voice xp", e));
    try {
      tickVoiceProfiles(client);
    } catch (e) {
      logger.error("voice profile", e);
    }
    void guarded("reminders", () => tickEventReminders(client)).catch((e) => logger.error("eventos", e));
    void guarded("birthdays", () => tickBirthdays(client)).catch((e) => logger.error("cumples", e));
    void guarded("quotes", () => tickQuotes(client)).catch((e) => logger.error("frase", e));
    void guarded("taxes", () => tickTaxes(client)).catch((e) => logger.error("impuestos", e));
    void guarded("missions", () => tickMissionBoard(client)).catch((e) => logger.error("misiones tick", e));
    void guarded("auctions", () => tickAuctions(client)).catch((e) => logger.error("subastas tick", e));
    try {
      tickTradingPrices();
    } catch (e) {
      logger.error("trading tick", e);
    }
    void guarded("dividends", () => checkAndDistributeDailyDividends(client)).catch((e) => logger.error("dividendos 12:00 tick", e));
    void guarded("bump", () => tickBumpReminder(client)).catch((e) => logger.error("bump reminder tick", e));
    void guarded("chat-games", () => tickChatGames(client)).catch((e) => logger.error("chat games tick", e));
    void guarded("voice-drops", () => tickVoiceDrops(client)).catch((e) => logger.error("voice drops tick", e));
    void guarded("unpins", () => checkScheduledUnpins(client)).catch((e) => logger.error("unpin tick", e));
    void guarded("lottery", () => tickWeeklyLottery(client)).catch((e) => logger.error("lottery tick", e));
  }, 60_000);

  setInterval(() => {
    void guarded("backups", () => scheduledBackups(client)).catch((e) => logger.error("backup tick", e));
  }, 10 * 60_000);

  setInterval(() => {
    try { pruneAllArchives(); } catch (e) { logger.error("archive cleanup", e); }
  }, 60 * 60_000);
}

async function expireTempbans(client: NexoClient): Promise<void> {
  const due = getDb()
    .prepare("SELECT * FROM cases WHERE type = 'tempban' AND active = 1 AND expires_at IS NOT NULL AND expires_at <= ?")
    .all(Date.now()) as { id: number; guild_id: string; user_id: string; case_id: number }[];
  for (const row of due) {
    const guild = client.guilds.cache.get(row.guild_id);
    if (guild) {
      await guild.bans.remove(row.user_id, `Tempban #${row.case_id} expirado`).catch(() => null);
    }
    getDb().prepare("UPDATE cases SET active = 0 WHERE id = ?").run(row.id);
  }
}

async function scheduledBackups(client: NexoClient): Promise<void> {
  for (const guild of client.guilds.cache.values() as Iterable<Guild>) {
    const cfg = getGuildConfig(guild.id);
    const hours = cfg.backups.intervalHours;
    if (!hours || hours <= 0) continue;
    const last = lastBackup.get(guild.id) ?? 0;
    if (Date.now() - last < hours * 3600_000) continue;
    try {
      await createBackup(guild, client.user?.id ?? "scheduler");
      lastBackup.set(guild.id, Date.now());
      pruneBackups(guild.id, 10);
      logger.info("Backup automático", guild.id);
    } catch (err) {
      logger.error("Backup automático falló", guild.id, err);
    }
  }
}

async function checkScheduledUnpins(client: NexoClient): Promise<void> {
  try {
    const due = getDb()
      .prepare("SELECT * FROM scheduled_unpins WHERE processed = 0 AND unpin_at <= ?")
      .all(Date.now()) as { id: number; channel_id: string; message_id: string }[];
    for (const row of due) {
      try {
        const channel = await client.channels.fetch(row.channel_id);
        if (channel && channel.isTextBased() && "messages" in channel) {
          const msg = await (channel as any).messages.fetch(row.message_id).catch(() => null);
          if (msg && msg.pinned) {
            await msg.unpin("Periodo de fijado de 3 días completado");
          }
        }
      } catch {
        /* ignore */
      }
      getDb().prepare("UPDATE scheduled_unpins SET processed = 1 WHERE id = ?").run(row.id);
    }
  } catch {
    /* ignore if table does not exist yet */
  }
}

