import { MessageType, type Guild, type GuildMember, type Message } from "discord.js";
import { getDb } from "../../database/index.js";
import { logger } from "../../logger.js";
import { BOOST_CHANNEL_ID } from "../../constants.js";
import { refreshMemberGiveawayEntries } from "../giveaways/manager.js";

export interface BoosterInfo {
  member: GuildMember;
  boostCount: number;
  premiumSince: Date | null;
  giveawayEntries: number;
}

type BoostEventSource = "system" | "announcement" | "unknown";

/**
 * Registra un evento de boost detectado (desde mensaje o canal de boosts).
 */
export function recordBoostEvent(
  guildId: string,
  userId: string,
  messageId: string | null,
  serverBoosts = 0,
  createdAt = Date.now(),
  source: BoostEventSource = "unknown",
): boolean {
  const db = getDb();
  if (messageId) {
    // El mensaje nativo de Discord y el anuncio de Sapphire/otro bot pueden
    // representar el mismo boost. No los contamos dos veces.
    if (source !== "unknown") {
      const opposite = source === "system" ? "announcement" : "system";
      const duplicate = db
        .prepare(`
          SELECT id
          FROM boost_events
          WHERE guild_id = ? AND user_id = ? AND source = ?
            AND ABS(created_at - ?) <= 5000
          LIMIT 1
        `)
        .get(guildId, userId, opposite, createdAt) as { id: number } | undefined;
      if (duplicate) return false;
    }

    db.prepare(`
      INSERT OR IGNORE INTO boost_events (guild_id, user_id, message_id, server_boosts, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(guildId, userId, messageId, serverBoosts, source, createdAt);
  }

  // Obtener boost_count actual si fue configurado manualmente por Staff
  const current = db
    .prepare("SELECT boost_count FROM member_boosts WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as { boost_count: number } | undefined;

  // Discord no expone el número de boosts asignados individualmente a un
  // miembro. Por eso un evento confirma que es booster (1), pero no inventa
  // que tenga 2+ por acumular mensajes históricos.
  const newCount = Math.max(1, current?.boost_count ?? 1);

  db.prepare(`
    INSERT INTO member_boosts (guild_id, user_id, boost_count, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      boost_count = excluded.boost_count,
      updated_at = excluded.updated_at
  `).run(guildId, userId, newCount, Date.now());
  return true;
}

/**
 * Procesa un mensaje publicado en el canal de boosts para registrar automáticamente el boost.
 */
export async function handleBoostChannelMessage(msg: Message): Promise<boolean> {
  if (!msg.inGuild()) return false;
  if (msg.channelId !== BOOST_CHANNEL_ID && msg.channelId !== msg.guild.systemChannelId) {
    return false;
  }

  let userId: string | null = null;
  let totalBoosts = 0;
  let source: BoostEventSource = "announcement";

  // 1. Mensaje de sistema nativo de Discord para Server Boosts
  if (
    msg.system &&
    (msg.type === MessageType.GuildBoost ||
      msg.type === MessageType.GuildBoostTier1 ||
      msg.type === MessageType.GuildBoostTier2 ||
      msg.type === MessageType.GuildBoostTier3)
  ) {
    userId = msg.author.id;
    source = "system";
  } else {
    // 2. Mensajes de Sapphire u otros bots de anuncios:
    // Ejemplo: "**¡<@893129394418229339> ha boosteado nexo!**"
    const contentMatch =
      msg.mentions.users.first()?.id ??
      msg.content.match(/<@!?(\d+)>\s+ha boosteado/i)?.[1] ??
      msg.content.match(/<@!?(\d+)>/)?.[1];
    if (contentMatch) {
      userId = typeof contentMatch === "string" ? contentMatch : contentMatch[1];
    } else if (msg.embeds.length > 0) {
      for (const embed of msg.embeds) {
        const text = `${embed.title ?? ""} ${embed.description ?? ""} ${embed.fields
          .map((f) => `${f.name} ${f.value}`)
          .join(" ")}`;
        const embedMatch = text.match(/<@!?(\d+)>/);
        if (embedMatch) {
          userId = embedMatch[1];
          break;
        }
      }
    }

    // Extraer cantidad total de boosts si viene en el texto/embed
    const textAll = `${msg.content} ${msg.embeds
      .map((e) => `${e.title ?? ""} ${e.description ?? ""} ${e.fields.map((f) => `${f.name} ${f.value}`).join(" ")}`)
      .join(" ")}`;
    const boostsMatch = textAll.match(/(\d+)\s+boosts/i);
    if (boostsMatch) {
      totalBoosts = parseInt(boostsMatch[1], 10) || 0;
    }
  }

  if (!userId) return false;

  const recorded = recordBoostEvent(msg.guild.id, userId, msg.id, totalBoosts, msg.createdTimestamp, source);
  if (!recorded) return false;
  const member = msg.guild.members.cache.get(userId) ?? (await msg.guild.members.fetch(userId).catch(() => null));
  if (member) await refreshMemberGiveawayEntries(member);
  logger.info(`[Boosts] Boost registrado para el usuario ${userId} en el servidor ${msg.guild.name} (Msg ID: ${msg.id})`);
  return true;
}

/**
 * Escanea el historial del canal de boosts para registrar boosts pasados.
 */
export async function syncBoostsFromChannel(guild: Guild): Promise<number> {
  const channel = guild.channels.cache.get(BOOST_CHANNEL_ID) ?? (await guild.channels.fetch(BOOST_CHANNEL_ID).catch(() => null));
  if (!channel || !channel.isTextBased() || !("messages" in channel)) return 0;

  try {
    let processed = 0;
    let lastId: string | undefined;
    while (true) {
      const options: { limit: number; before?: string } = { limit: 100 };
      if (lastId) options.before = lastId;
      const msgs = await channel.messages.fetch(options);
      if (!msgs.size) break;

      for (const m of msgs.values()) {
        const ok = await handleBoostChannelMessage(m);
        if (ok) processed++;
      }

      lastId = msgs.last()?.id;
      if (msgs.size < 100) break;
    }
    return processed;
  } catch (err) {
    logger.warn(`Error al sincronizar historial de canal de boosts ${BOOST_CHANNEL_ID}:`, err);
    return 0;
  }
}

/**
 * Sincroniza la lista completa de boosters del servidor con Discord y la base de datos.
 */
export async function syncGuildBoosters(guild: Guild): Promise<{
  totalBoosts: number;
  totalBoosters: number;
  synced: number;
}> {
  const db = getDb();

  // 1. Escanear mensajes del canal de boosts
  await syncBoostsFromChannel(guild);

  // 2. Obtener miembros del servidor
  const members = await guild.members.fetch().catch(() => guild.members.cache);
  const activeBoosters = members.filter((m) => m.premiumSince !== null);

  let synced = 0;
  for (const m of activeBoosters.values()) {
    const existing = db
      .prepare("SELECT boost_count FROM member_boosts WHERE guild_id = ? AND user_id = ?")
      .get(guild.id, m.id) as { boost_count: number } | undefined;

    // La API de Discord confirma el estado activo, pero no el número
    // individual de boosts. Conservamos cualquier ajuste previo y asignamos
    // 1 al booster que aún no tenga un valor guardado.
    const finalCount = Math.max(1, existing?.boost_count ?? 1);

    db.prepare(`
      INSERT INTO member_boosts (guild_id, user_id, boost_count, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        boost_count = excluded.boost_count,
        updated_at = excluded.updated_at
    `).run(guild.id, m.id, finalCount, Date.now());
    synced++;
  }

  // 3. Eliminar usuarios que ya no boostean
  const allSaved = db
    .prepare("SELECT user_id FROM member_boosts WHERE guild_id = ?")
    .all(guild.id) as { user_id: string }[];

  for (const row of allSaved) {
    const mem = activeBoosters.get(row.user_id);
    if (!mem) {
      db.prepare("DELETE FROM member_boosts WHERE guild_id = ? AND user_id = ?").run(guild.id, row.user_id);
    }
  }

  return {
    totalBoosts: guild.premiumSubscriptionCount ?? 0,
    totalBoosters: activeBoosters.size,
    synced,
  };
}

/**
 * Obtiene la lista ordenada de miembros boosters y sus datos.
 */
export async function getGuildBoosterList(guild: Guild): Promise<{
  totalBoosts: number;
  tier: number;
  boosters: BoosterInfo[];
}> {
  const db = getDb();
  const members = await guild.members.fetch().catch(() => guild.members.cache);
  const activeBoosters = members.filter((m) => m.premiumSince !== null);

  const boostRows = db
    .prepare("SELECT user_id, boost_count FROM member_boosts WHERE guild_id = ?")
    .all(guild.id) as { user_id: string; boost_count: number }[];
  const map = new Map<string, number>(boostRows.map((r) => [r.user_id, r.boost_count]));

  const boosters: BoosterInfo[] = [];

  for (const m of activeBoosters.values()) {
    const count = Math.max(1, map.get(m.id) ?? 1);
    boosters.push({
      member: m,
      boostCount: count,
      premiumSince: m.premiumSince,
      giveawayEntries: count * 5,
    });
  }

  // Ordenar por cantidad de boosts (mayor a menor) y luego por antigüedad de boost
  boosters.sort((a, b) => {
    if (b.boostCount !== a.boostCount) return b.boostCount - a.boostCount;
    const timeA = a.premiumSince?.getTime() ?? 0;
    const timeB = b.premiumSince?.getTime() ?? 0;
    return timeA - timeB;
  });

  return {
    totalBoosts: guild.premiumSubscriptionCount ?? 0,
    tier: guild.premiumTier,
    boosters,
  };
}
