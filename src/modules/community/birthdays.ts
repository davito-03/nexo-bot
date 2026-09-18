import { EmbedBuilder, type GuildTextBasedChannel } from "discord.js";
import { getDb, getGuildConfig } from "../../database/index.js";
import { COLORS } from "../../constants.js";
import { madridDay, madridYear } from "../../utils/time.js";

export function setBirthday(guildId: string, userId: string, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return "Fecha inválida.";
  getDb()
    .prepare(
      `INSERT INTO birthdays (guild_id, user_id, month, day) VALUES (?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET month = excluded.month, day = excluded.day`,
    )
    .run(guildId, userId, month, day);
  return null;
}

export function clearBirthday(guildId: string, userId: string): void {
  getDb().prepare("DELETE FROM birthdays WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
}

export function getBirthday(guildId: string, userId: string): { month: number; day: number } | undefined {
  return getDb()
    .prepare("SELECT month, day FROM birthdays WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as { month: number; day: number } | undefined;
}

export async function tickBirthdays(client: { guilds: { cache: Map<string, any> } }): Promise<void> {
  const dayStr = madridDay();
  const [, mm, dd] = dayStr.split("-").map(Number);
  const year = madridYear();
  const rows = getDb()
    .prepare("SELECT guild_id, user_id, month, day FROM birthdays WHERE month = ? AND day = ?")
    .all(mm, dd) as { guild_id: string; user_id: string; month: number; day: number }[];
  for (const r of rows) {
    const already = getDb()
      .prepare("SELECT 1 FROM birthday_sent WHERE guild_id = ? AND user_id = ? AND year = ?")
      .get(r.guild_id, r.user_id, year);
    if (already) continue;
    const guild = client.guilds.cache.get(r.guild_id);
    if (!guild) continue;
    const cfg = getGuildConfig(r.guild_id);
    const chId = cfg.birthdays.channelId;
    if (!chId) continue;
    const ch = guild.channels.cache.get(chId) as GuildTextBasedChannel | undefined;
    if (!ch || !("send" in ch)) continue;
    getDb()
      .prepare("INSERT INTO birthday_sent (guild_id, user_id, year) VALUES (?, ?, ?)")
      .run(r.guild_id, r.user_id, year);
    await ch
      .send({
        content: `<@${r.user_id}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.primary)
            .setTitle("🎂 Cumpleaños")
            .setDescription(`Hoy cumple **<@${r.user_id}>**. Felicidades de parte de Nexo 🐱`),
        ],
        allowedMentions: { users: [r.user_id] },
      })
      .catch(() => null);
  }
}
