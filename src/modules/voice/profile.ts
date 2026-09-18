import { GuildMember, type VoiceBasedChannel } from "discord.js";
import { getDb } from "../../database/index.js";
import { currentWeekId } from "../economy/engine.js";
import { bumpMission } from "../missions/engine.js";
import { formatDuration, madridDay } from "../../utils/time.js";

export interface VoiceStats {
  guild_id: string;
  user_id: string;
  week_id: string;
  week_seconds: number;
  total_seconds: number;
  streak: number;
  last_voice_day: string;
}

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function getVoiceStats(guildId: string, userId: string): VoiceStats {
  const week = currentWeekId();
  const row = getDb()
    .prepare("SELECT * FROM voice_stats WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as VoiceStats | undefined;
  if (!row) {
    const blank: VoiceStats = {
      guild_id: guildId,
      user_id: userId,
      week_id: week,
      week_seconds: 0,
      total_seconds: 0,
      streak: 0,
      last_voice_day: "",
    };
    getDb()
      .prepare(
        `INSERT INTO voice_stats (guild_id, user_id, week_id, week_seconds, total_seconds, streak, last_voice_day)
         VALUES (@guild_id, @user_id, @week_id, 0, 0, 0, '')`,
      )
      .run(blank);
    return blank;
  }
  if (row.week_id !== week) {
    row.week_id = week;
    row.week_seconds = 0;
    getDb()
      .prepare("UPDATE voice_stats SET week_id = ?, week_seconds = 0 WHERE guild_id = ? AND user_id = ?")
      .run(week, guildId, userId);
  }
  return row;
}

function addSeconds(guildId: string, userId: string, seconds: number): void {
  const week = currentWeekId();
  const day = madridDay();
  const row = getVoiceStats(guildId, userId);
  let streak = row.streak;
  if (row.last_voice_day !== day) {
    const yest = madridDay(Date.now() - 36 * 3600_000);
    streak = row.last_voice_day === yest ? row.streak + 1 : 1;
  }
  getDb()
    .prepare(
      `UPDATE voice_stats SET week_seconds = week_seconds + ?, total_seconds = total_seconds + ?,
        streak = ?, last_voice_day = ? WHERE guild_id = ? AND user_id = ?`,
    )
    .run(seconds, seconds, streak, day, guildId, userId);
}

function addPair(guildId: string, a: string, b: string, seconds: number): void {
  if (a === b) return;
  const [x, y] = pairKey(a, b);
  const week = currentWeekId();
  getDb()
    .prepare(
      `INSERT INTO voice_pairs (guild_id, user_a, user_b, week_id, seconds) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, user_a, user_b, week_id) DO UPDATE SET seconds = seconds + excluded.seconds`,
    )
    .run(guildId, x, y, week, seconds);
}

export function topCompanions(guildId: string, userId: string, limit = 5): { other: string; seconds: number }[] {
  const week = currentWeekId();
  const rows = getDb()
    .prepare(
      `SELECT user_a, user_b, seconds FROM voice_pairs
       WHERE guild_id = ? AND week_id = ? AND (user_a = ? OR user_b = ?)
       ORDER BY seconds DESC LIMIT ?`,
    )
    .all(guildId, week, userId, userId, limit) as { user_a: string; user_b: string; seconds: number }[];
  return rows.map((r) => ({ other: r.user_a === userId ? r.user_b : r.user_a, seconds: r.seconds }));
}

export function formatVoiceTime(seconds: number): string {
  return formatDuration(seconds * 1000);
}

const lastProfileTick = new Map<string, number>();

export function syncVoiceSessions(client: { guilds: { cache: Map<string, any> } }): void {
  getDb().prepare("DELETE FROM voice_sessions").run();
  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (!channel.isVoiceBased()) continue;
      for (const member of channel.members.values()) {
        if (member.user.bot) continue;
        getDb()
          .prepare(
            `INSERT INTO voice_sessions (guild_id, user_id, channel_id, started_at, last_tick_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(guild_id, user_id) DO UPDATE SET channel_id = excluded.channel_id`,
          )
          .run(guild.id, member.id, channel.id, Date.now(), Date.now());
      }
    }
  }
}

export function tickVoiceProfiles(client: { guilds: { cache: Map<string, any> } }): void {
  const now = Date.now();
  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (!channel.isVoiceBased()) continue;
      if (guild.afkChannelId === channel.id) continue;
      const voiceMembers = [...channel.members.values()].filter(
        (m: GuildMember) => !m.user.bot && !m.voice.selfDeaf && !m.voice.serverDeaf,
      );
      if (!voiceMembers.length) continue;
      for (const member of voiceMembers) {
        const key = `${guild.id}:${member.id}`;
        if (now - (lastProfileTick.get(key) ?? 0) < 50_000) continue;
        lastProfileTick.set(key, now);
        addSeconds(guild.id, member.id, 60);
        bumpMission(guild.id, member.id, "vc_120");
        bumpMission(guild.id, member.id, "vc_60");
        const others = voiceMembers.filter((m: GuildMember) => m.id !== member.id);
        for (const o of others) {
          addPair(guild.id, member.id, o.id, 60);
          bumpMission(guild.id, member.id, "mates_3", o.id);
          bumpMission(guild.id, member.id, "mates_5", o.id);
        }
      }
    }
  }
}
