import { GuildMember, Message, type VoiceState } from "discord.js";
import { getDb, getGuildConfig, getLevel, saveLevel, type LevelRow } from "../../database/index.js";
import { levelUpCard } from "../welcome/cards.js";
import { cardAnnouncement } from "../welcome/send.js";
import { replacePlaceholders } from "../../utils/format.js";
import { BOOSTER_XP_MULTIPLIER, COLORS } from "../../constants.js";
import { bumpMission } from "../missions/engine.js";
import { madridDay } from "../../utils/time.js";

/** XP necesario para pasar del nivel n al n+1 */
export function xpForLevel(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

export function totalXpForLevel(level: number): number {
  let t = 0;
  for (let i = 0; i < level; i++) t += xpForLevel(i);
  return t;
}

export function progressInLevel(row: LevelRow): { current: number; needed: number } {
  const prev = totalXpForLevel(row.level);
  return { current: row.xp - prev, needed: xpForLevel(row.level) };
}

function grantedXp(member: GuildMember, amount: number, source: "message" | "voice" | "admin"): number {
  if (source === "admin" || !member.premiumSince) return amount;
  return Math.round(amount * BOOSTER_XP_MULTIPLIER);
}

export async function addXp(
  member: GuildMember,
  amount: number,
  source: "message" | "voice" | "admin",
): Promise<{ row: LevelRow; leveled: boolean; oldLevel: number }> {
  const row = getLevel(member.guild.id, member.id);
  const oldLevel = row.level;
  row.xp += grantedXp(member, amount, source);
  if (source === "message") row.messages += 1;
  if (source === "voice") row.voice_seconds += 60;
  while (row.xp >= totalXpForLevel(row.level + 1)) row.level += 1;
  saveLevel(row);
  const leveled = row.level > oldLevel;
  if (leveled) await onLevelUp(member, row, oldLevel);
  return { row, leveled, oldLevel };
}

async function onLevelUp(member: GuildMember, row: LevelRow, oldLevel: number): Promise<void> {
  const cfg = getGuildConfig(member.guild.id);
  const rewards = getDb()
    .prepare("SELECT role_id, level FROM role_rewards WHERE guild_id = ? AND level <= ? ORDER BY level")
    .all(member.guild.id, row.level) as { role_id: string; level: number }[];

  if (rewards.length) {
    if (cfg.levels.stackRoles) {
      for (const r of rewards) {
        if (!member.roles.cache.has(r.role_id)) await member.roles.add(r.role_id).catch(() => null);
      }
    } else {
      const highest = rewards[rewards.length - 1];
      for (const r of rewards) {
        if (r.role_id !== highest.role_id && member.roles.cache.has(r.role_id)) {
          await member.roles.remove(r.role_id).catch(() => null);
        }
      }
      if (!member.roles.cache.has(highest.role_id)) await member.roles.add(highest.role_id).catch(() => null);
    }
  }

  const channelId = cfg.levels.announceChannelId;
  const channel = channelId
    ? member.guild.channels.cache.get(channelId)
    : null;
  const dest = channel && channel.isTextBased() && "send" in channel ? channel : null;
  if (!dest) return;
  const ping = row.level_ping !== 0;
  const text = replacePlaceholders(cfg.levels.message, {
    user: `${member}`,
    name: member.displayName,
    level: row.level,
    old: oldLevel,
    guild: member.guild.name,
  });
  let image: Buffer | null = null;
  try {
    image = await levelUpCard(member, row.level);
  } catch {
    image = null;
  }
  await dest
    .send(
      cardAnnouncement({
        text,
        image,
        filename: "levelup.png",
        color: COLORS.level,
        pingUserId: ping ? member.id : null,
      }),
    )
    .catch(() => null);
}

function rollXp(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export async function handleMessageXp(message: Message): Promise<void> {
  if (!message.inGuild() || message.author.bot) return;
  const member = message.member;
  if (!member) return;
  const cfg = getGuildConfig(message.guild.id);
  if (!cfg.levels.enabled) return;
  if (cfg.levels.ignoredChannels.includes(message.channelId)) return;
  if (member.roles.cache.some((r) => cfg.levels.ignoredRoles.includes(r.id))) return;
  const row = getLevel(message.guild.id, member.id);
  if (Date.now() - row.last_xp_at < cfg.levels.cooldownMs) return;
  const amount = rollXp(cfg.levels.xpMin, cfg.levels.xpMax);
  row.last_xp_at = Date.now();
  saveLevel(row);
  await addXp(member, amount, "message");
}

export function startVoiceSession(state: VoiceState): void {
  if (!state.member || state.member.user.bot || !state.channelId) return;
  getDb()
    .prepare(
      `INSERT INTO voice_sessions (guild_id, user_id, channel_id, started_at, last_tick_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET channel_id = excluded.channel_id`,
    )
    .run(state.guild.id, state.member.id, state.channelId, Date.now(), Date.now());
}

export function endVoiceSession(guildId: string, userId: string): void {
  getDb().prepare("DELETE FROM voice_sessions WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
}

export async function tickVoiceXp(client: { guilds: { cache: Map<string, any> } }): Promise<void> {
  const sessions = getDb().prepare("SELECT * FROM voice_sessions").all() as {
    guild_id: string;
    user_id: string;
    channel_id: string;
    started_at: number;
    last_tick_at: number;
  }[];
  const now = Date.now();
  for (const s of sessions) {
    const guild = client.guilds.cache.get(s.guild_id);
    if (!guild) continue;
    const cfg = getGuildConfig(s.guild_id);
    if (!cfg.levels.enabled) continue;
    const member = await guild.members.fetch(s.user_id).catch(() => null);
    const channel = guild.channels.cache.get(s.channel_id);
    if (!member || !channel || !channel.isVoiceBased()) {
      endVoiceSession(s.guild_id, s.user_id);
      continue;
    }
    if (cfg.levels.ignoreAfk && guild.afkChannelId === s.channel_id) continue;
    if (member.voice.selfDeaf || member.voice.serverDeaf) continue;
    const others = channel.members.filter((m: GuildMember) => !m.user.bot && m.id !== member.id);
    if (cfg.levels.voiceRequireOthers && others.size === 0) continue;
    if (now - s.last_tick_at < 55_000) continue;
    getDb()
      .prepare("UPDATE voice_sessions SET last_tick_at = ? WHERE guild_id = ? AND user_id = ?")
      .run(now, s.guild_id, s.user_id);
    await addXp(member, rollXp(cfg.levels.voiceXpMin, cfg.levels.voiceXpMax), "voice");
  }
}
