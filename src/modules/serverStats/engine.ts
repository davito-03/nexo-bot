import {
  ChannelType,
  PermissionFlagsBits,
  Routes,
  type Guild,
  type VoiceChannel,
  type CategoryChannel,
} from "discord.js";
import type { NexoClient } from "../../client.js";
import { getDb } from "../../database/index.js";
import { logger } from "../../logger.js";
import { OFFICIAL_GUILD_ID } from "../../constants.js";

/**
 * Convierte texto y números a formato Mathematical Bold Serif para mantener
 * la misma tipografía que el resto de canales del servidor Nexo (ej. 💜⎢𝐛𝐨𝐨𝐬𝐭𝐬, 🤖⎢𝐜𝐨𝐦𝐚𝐧𝐝𝐨𝐬).
 */
export function toSerifBold(str: string): string {
  const mapAccents: Record<string, string> = {
    "á": "\u{1D41A}\u0301",
    "é": "\u{1D41E}\u0301",
    "í": "\u{1D422}\u0301",
    "ó": "\u{1D428}\u0301",
    "ú": "\u{1D42E}\u0301",
    "ñ": "\u{1D427}\u0303",
    "Á": "\u{1D400}\u0301",
    "É": "\u{1D404}\u0301",
    "Í": "\u{1D408}\u0301",
    "Ó": "\u{1D40E}\u0301",
    "Ú": "\u{1D414}\u0301",
    "Ñ": "\u{1D40D}\u0303",
  };
  return str.split("").map((c) => {
    if (mapAccents[c]) return mapAccents[c];
    const code = c.charCodeAt(0);
    // a-z
    if (code >= 97 && code <= 122) {
      return String.fromCodePoint(0x1d41a + code - 97);
    }
    // A-Z
    if (code >= 65 && code <= 90) {
      return String.fromCodePoint(0x1d400 + code - 65);
    }
    // 0-9
    if (code >= 48 && code <= 57) {
      return String.fromCodePoint(0x1d7ce + code - 48);
    }
    return c;
  }).join("");
}

function initDb(): void {
  const db = getDb();
  db.prepare(`
    CREATE TABLE IF NOT EXISTS server_stats_channels (
      guild_id TEXT PRIMARY KEY,
      category_id TEXT,
      clock_channel_id TEXT,
      members_channel_id TEXT,
      online_channel_id TEXT,
      boost_channel_id TEXT,
      last_updated INTEGER NOT NULL DEFAULT 0
    )
  `).run();

  const cols = new Set(
    (db.prepare("PRAGMA table_info(server_stats_channels)").all() as { name: string }[]).map((c) => c.name),
  );
  if (!cols.has("members_channel_id")) {
    db.prepare("ALTER TABLE server_stats_channels ADD COLUMN members_channel_id TEXT").run();
    db.prepare(
      "UPDATE server_stats_channels SET members_channel_id = online_channel_id, online_channel_id = NULL WHERE members_channel_id IS NULL",
    ).run();
  }
}

interface StatsRecord {
  guild_id: string;
  category_id: string | null;
  clock_channel_id: string | null;
  members_channel_id: string | null;
  online_channel_id: string | null;
  boost_channel_id: string | null;
  last_updated: number;
}

function getStatsRecord(guildId: string): StatsRecord | null {
  initDb();
  return (getDb().prepare("SELECT * FROM server_stats_channels WHERE guild_id = ?").get(guildId) as StatsRecord) ?? null;
}

function saveStatsRecord(rec: StatsRecord): void {
  initDb();
  getDb().prepare(`
    INSERT INTO server_stats_channels (guild_id, category_id, clock_channel_id, members_channel_id, online_channel_id, boost_channel_id, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      category_id = excluded.category_id,
      clock_channel_id = excluded.clock_channel_id,
      members_channel_id = excluded.members_channel_id,
      online_channel_id = excluded.online_channel_id,
      boost_channel_id = excluded.boost_channel_id,
      last_updated = excluded.last_updated
  `).run(
    rec.guild_id,
    rec.category_id,
    rec.clock_channel_id,
    rec.members_channel_id,
    rec.online_channel_id,
    rec.boost_channel_id,
    rec.last_updated,
  );
}

export async function updateServerStats(guild: Guild): Promise<void> {
  try {
    initDb();
    const rec = getStatsRecord(guild.id);

    // Hora España
    const madridTime = new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    const clockName = `🕒⎢${toSerifBold("españa")}: ${toSerifBold(madridTime)}`;

    // Obtener miembros totales y miembros online reales mediante Discord REST API
    let memberTotal = guild.memberCount;
    let onlineTotal = 0;
    try {
      const restData = (await guild.client.rest.get(Routes.guild(guild.id), {
        query: new URLSearchParams({ with_counts: "true" }),
      })) as { approximate_presence_count?: number; approximate_member_count?: number };

      if (typeof restData.approximate_member_count === "number") {
        memberTotal = restData.approximate_member_count;
      }
      if (typeof restData.approximate_presence_count === "number") {
        onlineTotal = restData.approximate_presence_count;
      }
    } catch (e) {
      logger.warn("No se pudo obtener with_counts de la guild", e);
    }

    if (onlineTotal === 0) {
      const onlineCached = guild.members.cache.filter(
        (m) => !m.user.bot && m.presence && m.presence.status !== "offline",
      ).size;
      onlineTotal = onlineCached > 0 ? onlineCached : Math.max(1, Math.round(memberTotal * 0.2));
    }

    const formatNum = (num: number) => String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const membersFormatted = formatNum(memberTotal);
    const membersName = `👥⎢${toSerifBold("miembros")}: ${toSerifBold(membersFormatted)}`;

    const onlineFormatted = formatNum(onlineTotal);
    const onlineName = `🟢⎢${toSerifBold("online")}: ${toSerifBold(onlineFormatted)}`;

    const boostCount = guild.premiumSubscriptionCount ?? 0;
    const boostName = `💜⎢${toSerifBold("boosts")}: ${toSerifBold(String(boostCount))}`;

    // Permisos: canal bloqueado para @everyone (no pueden entrar)
    const voiceOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.Connect],
        allow: [PermissionFlagsBits.ViewChannel],
      },
    ];

    // Verificar o crear Categoría
    let category: CategoryChannel | null = null;
    if (rec?.category_id) {
      category = (guild.channels.cache.get(rec.category_id) as CategoryChannel) ?? null;
    }
    if (!category) {
      category = (guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes("estadísticas"),
      ) as CategoryChannel) ?? null;

      if (!category) {
        category = await guild.channels.create({
          name: "📊 ESTADÍSTICAS EN VIVO",
          type: ChannelType.GuildCategory,
          position: 0,
          permissionOverwrites: voiceOverwrites,
        });
      }
    }

    const usedChannelIds = new Set<string>();

    // Helper para verificar o crear canal de voz
    const ensureVoiceChannel = async (
      channelId: string | null | undefined,
      defaultName: string,
      pos: number,
      keyword: string,
    ): Promise<VoiceChannel> => {
      let ch: VoiceChannel | null = null;
      if (channelId && !usedChannelIds.has(channelId)) {
        ch = (guild.channels.cache.get(channelId) as VoiceChannel) ?? null;
      }
      if (!ch) {
        ch = (guild.channels.cache.find(
          (c) =>
            c.type === ChannelType.GuildVoice &&
            c.parentId === category?.id &&
            !usedChannelIds.has(c.id) &&
            (c.name.toLowerCase().includes(keyword) || c.name.includes(toSerifBold(keyword))),
        ) as VoiceChannel) ?? null;
      }
      if (!ch) {
        ch = await guild.channels.create({
          name: defaultName,
          type: ChannelType.GuildVoice,
          parent: category?.id,
          position: pos,
          permissionOverwrites: voiceOverwrites,
        });
      }
      usedChannelIds.add(ch.id);
      return ch;
    };

    let membersId = rec?.members_channel_id;
    let onlineId = rec?.online_channel_id;
    if (membersId && onlineId && membersId === onlineId) {
      membersId = null;
    }

    const clockCh = await ensureVoiceChannel(rec?.clock_channel_id, clockName, 0, "espa");
    const membersCh = await ensureVoiceChannel(membersId, membersName, 1, "miembros");
    const onlineCh = await ensureVoiceChannel(onlineId, onlineName, 2, "online");
    const boostCh = await ensureVoiceChannel(rec?.boost_channel_id, boostName, 3, "boost");

    // Actualizar nombres SOLO si han cambiado para respetar rate limits de Discord (2 renombres por 10 min por canal)
    if (clockCh.name !== clockName) {
      await clockCh.setName(clockName).catch(() => null);
    }
    if (membersCh.name !== membersName) {
      await membersCh.setName(membersName).catch(() => null);
    }
    if (onlineCh.name !== onlineName) {
      await onlineCh.setName(onlineName).catch(() => null);
    }
    if (boostCh.name !== boostName) {
      await boostCh.setName(boostName).catch(() => null);
    }

    await guild.channels
      .setPositions([
        { channel: clockCh.id, position: 0 },
        { channel: membersCh.id, position: 1 },
        { channel: onlineCh.id, position: 2 },
        { channel: boostCh.id, position: 3 },
      ])
      .catch(() => null);

    // Guardar IDs en BD
    saveStatsRecord({
      guild_id: guild.id,
      category_id: category.id,
      clock_channel_id: clockCh.id,
      members_channel_id: membersCh.id,
      online_channel_id: onlineCh.id,
      boost_channel_id: boostCh.id,
      last_updated: Date.now(),
    });
  } catch (err) {
    logger.error("Error al actualizar canales de estadísticas del servidor", err);
  }
}

export async function tickServerStats(client: NexoClient): Promise<void> {
  const guild = client.guilds.cache.get(OFFICIAL_GUILD_ID);
  if (guild) {
    await updateServerStats(guild);
  }
}
