import { EmbedBuilder, Message, PermissionFlagsBits } from "discord.js";
import { COLORS } from "../../constants.js";
import { getDb, getGuildConfig } from "../../database/index.js";
import { sendLog } from "../logs/dispatch.js";

const buckets = new Map<string, number[]>();

function hit(guildId: string, userId: string, type: string, detail: string): void {
  getDb()
    .prepare("INSERT INTO automod_hits (guild_id, user_id, type, detail, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(guildId, userId, type, detail, Date.now());
}

export async function handleAutomod(message: Message): Promise<boolean> {
  if (!message.inGuild() || message.author.bot || !message.member) return false;
  const cfg = getGuildConfig(message.guild.id);
  if (!cfg.automod.enabled) return false;
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
  if (cfg.automod.ignoredChannels.includes(message.channelId)) return false;
  if (message.member.roles.cache.some((r) => cfg.automod.ignoredRoles.includes(r.id))) return false;

  const content = message.content ?? "";
  const reasons: string[] = [];

  if (cfg.automod.antiSpam) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const arr = (buckets.get(key) ?? []).filter((t) => now - t < cfg.automod.spamWindowMs);
    arr.push(now);
    buckets.set(key, arr);
    if (arr.length >= cfg.automod.spamThreshold) reasons.push("spam");
  }

  if (cfg.automod.antiInvites && /(discord\.gg|discord\.com\/invite)\/[a-z0-9-]+/i.test(content)) {
    reasons.push("invitación");
  }

  if (cfg.automod.antiLinks) {
    const urls = content.match(/https?:\/\/[^\s]+/gi) ?? [];
    const blocked = urls.filter((u) => {
      try {
        const host = new URL(u).hostname.replace(/^www\./, "");
        return !cfg.automod.whitelistDomains.some((d) => host === d || host.endsWith(`.${d}`));
      } catch {
        return true;
      }
    });
    if (blocked.length) reasons.push("enlace");
  }

  if (cfg.automod.antiMassMentions) {
    const mentions = (message.mentions.users.size + message.mentions.roles.size) + (message.mentions.everyone ? 3 : 0);
    if (mentions >= cfg.automod.massMentionLimit) reasons.push("menciones masivas");
  }

  if (cfg.automod.antiCaps && content.length >= 12) {
    const letters = content.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, "");
    if (letters.length >= 8) {
      const upper = letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length;
      if ((upper / letters.length) * 100 >= cfg.automod.capsPercent) reasons.push("mayúsculas");
    }
  }

  if (cfg.automod.badWords.length) {
    const lower = content.toLowerCase();
    if (cfg.automod.badWords.some((w) => w && lower.includes(w.toLowerCase()))) reasons.push("palabra prohibida");
  }

  if (!reasons.length) return false;

  await message.delete().catch(() => null);
  hit(message.guild.id, message.author.id, reasons.join(","), content.slice(0, 200));
  const warn = await message.channel.isTextBased() && "send" in message.channel
    ? await message.channel.send({ content: `${message.author}, tu mensaje se eliminó por: **${reasons.join(", ")}**.` }).catch(() => null)
    : null;
  if (warn) setTimeout(() => warn.delete().catch(() => null), 6000);

  await sendLog(
    message.guild,
    "moderation",
    new EmbedBuilder()
      .setColor(COLORS.warn)
      .setTitle("Automod")
      .setDescription(`${message.author} (\`${message.author.id}\`) en <#${message.channel.id}> (\`${message.channel.id}\`)\nRazones: ${reasons.join(", ")}\n\`\`\`\n${content.slice(0, 400) || "*vacío*"}\n\`\`\``),
  );
  return true;
}
