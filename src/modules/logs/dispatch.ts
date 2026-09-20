import { EmbedBuilder, Guild, type ColorResolvable } from "discord.js";
import { COLORS, type LogType } from "../../constants.js";
import { getGuildConfig } from "../../database/index.js";

export async function sendLog(
  guild: Guild,
  type: LogType,
  embed: EmbedBuilder,
  files?: { attachment: Buffer | string; name: string }[],
): Promise<void> {
  const cfg = getGuildConfig(guild.id);
  const channelId = cfg.logs[type];
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId).catch(() => null));
  if (!channel || !channel.isTextBased() || !("send" in channel)) return;
  await channel.send({ embeds: [embed], files }).catch(() => null);
}

export function logEmbed(title: string, color: ColorResolvable = COLORS.log): EmbedBuilder {
  return new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();
}
