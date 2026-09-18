import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type Message,
  type User,
} from "discord.js";
import { getDb, getGuildConfig } from "../../database/index.js";
import {
  BUMP_CHANNEL_ID,
  BUMP_COOLDOWN_MS,
  BUMP_PING_ROLE_ID,
  COLORS,
  DISBOARD_BOT_ID,
  OFFICIAL_GUILD_ID,
} from "../../constants.js";
import { addWallet, getEco, n, saveEco } from "../economy/engine.js";
import { bumpMission } from "../missions/engine.js";
import { madridDay } from "../../utils/time.js";
import { logger } from "../../logger.js";
import type { NexoClient } from "../../client.js";

export interface BumpStreakRow {
  guild_id: string;
  last_user_id: string | null;
  streak: number;
  last_bump_at: number;
  total_bumps: number;
  reminder_sent: number;
}

export interface BumpUserStatsRow {
  guild_id: string;
  user_id: string;
  total_bumps: number;
  highest_streak: number;
  total_earned: number;
  last_bump_at: number;
}

export interface ProcessBumpResult {
  userId: string;
  userTag: string;
  guildId: string;
  streak: number;
  reward: number;
  bonus: number;
  interrupted: boolean;
  prevUserId: string | null;
  prevStreak: number;
  totalGuildBumps: number;
  nextBumpAt: number;
  walletBalance: number;
}

const reminderTimers = new Map<string, ReturnType<typeof setTimeout>>();
const sendingReminders = new Set<string>();

function clearBumpReminderTimer(guildId: string): void {
  const timer = reminderTimers.get(guildId);
  if (timer) clearTimeout(timer);
  reminderTimers.delete(guildId);
}

/** Programa el aviso exactamente al terminar el cooldown del último bump. */
export function scheduleBumpReminder(client: NexoClient, guildId: string, lastBumpAt: number): void {
  clearBumpReminderTimer(guildId);

  const delay = Math.max(0, lastBumpAt + BUMP_COOLDOWN_MS - Date.now());
  const timer = setTimeout(() => {
    reminderTimers.delete(guildId);
    void sendBumpReminder(client, guildId, lastBumpAt);
  }, delay);

  reminderTimers.set(guildId, timer);
}

/** Restaura al arrancar los recordatorios pendientes que estaban guardados en SQLite. */
export function restoreBumpReminderTimers(client: NexoClient): void {
  const rows = getDb()
    .prepare("SELECT guild_id, last_bump_at FROM bump_streaks WHERE last_bump_at > 0 AND reminder_sent = 0")
    .all() as { guild_id: string; last_bump_at: number }[];

  for (const row of rows) scheduleBumpReminder(client, row.guild_id, row.last_bump_at);
}

/**
 * Detecta si el mensaje enviado por DISBOARD corresponde a un bump exitoso.
 * Descarta mensajes de error, de espera/cooldown o mensajes sin embeds.
 */
export function isDisboardBumpSuccess(message: Message): boolean {
  if (message.author.id !== DISBOARD_BOT_ID) return false;
  if (!message.embeds || message.embeds.length === 0) return false;

  return message.embeds.some((embed) => {
    const desc = embed.description ?? "";
    const imgUrl = embed.image?.url ?? "";

    // Si contiene texto de espera o cooldown, no es un bump válido
    if (
      /wait\s+another/i.test(desc) ||
      /espera/i.test(desc) ||
      /cooldown/i.test(desc) ||
      /por\s+favor\s+espera/i.test(desc)
    ) {
      return false;
    }

    // Indicadores inequívocos de bump completado en DISBOARD
    const hasBumpDone = /bump\s+done/i.test(desc);
    const hasBumpImage = imgUrl.includes("bot-command-image-bump");
    const hasThumbsUp = desc.includes(":thumbsup:") || desc.includes("👍");

    return hasBumpDone || hasBumpImage || hasThumbsUp;
  });
}

/**
 * Obtiene el usuario que ejecutó el comando de bump.
 * Prioriza la interacción de slash command, luego menciones y mensajes recientes.
 */
export async function extractBumpUser(message: Message): Promise<{ id: string; tag: string } | null> {
  // 1. Interacción de comando de barra (/bump)
  if (message.interaction?.user) {
    return {
      id: message.interaction.user.id,
      tag: message.interaction.user.tag || message.interaction.user.username,
    };
  }

  // 2. Mención en el contenido o descripción del embed (<@ID>)
  const fullText = `${message.content} ${message.embeds.map((e) => `${e.title ?? ""} ${e.description ?? ""}`).join(" ")}`;
  const mentionMatch = fullText.match(/<@!?(\d{17,20})>/);
  if (mentionMatch && mentionMatch[1]) {
    const user = await message.client.users.fetch(mentionMatch[1]).catch(() => null);
    if (user) {
      return { id: user.id, tag: user.tag || user.username };
    }
  }

  // 3. Revisar los mensajes previos en el canal justo antes del bump
  if (message.channel.isTextBased()) {
    try {
      const recent = await message.channel.messages.fetch({ limit: 8, before: message.id });
      const candidates = recent.filter(
        (m) => !m.author.bot && Math.abs(message.createdTimestamp - m.createdTimestamp) < 45_000,
      );

      const typedBump = candidates.find(
        (m) => m.content.toLowerCase().includes("bump") || m.interaction,
      );
      if (typedBump) {
        return {
          id: typedBump.author.id,
          tag: typedBump.author.tag || typedBump.author.username,
        };
      }

      const firstHuman = candidates.first();
      if (firstHuman) {
        return {
          id: firstHuman.author.id,
          tag: firstHuman.author.tag || firstHuman.author.username,
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Procesa un bump exitoso de forma atómica:
 * - Calcula la racha y bonificación (2000 base + 2000 por cada bump encadenado)
 * - Resetea la racha si otro usuario interrumpe
 * - Ingresa las NexoCoins en la cartera del usuario
 * - Registra la operación para idempotencia absoluta
 */
export function processBump(
  guildId: string,
  userId: string,
  userTag: string,
  messageId: string,
  bumpTimestamp = Date.now(),
): ProcessBumpResult | null {
  const db = getDb();

  // Idempotencia: evitar procesar dos veces el mismo mensaje
  const existing = db.prepare("SELECT message_id FROM bump_logs WHERE message_id = ?").get(messageId);
  if (existing) return null;

  const current = db.prepare("SELECT * FROM bump_streaks WHERE guild_id = ?").get(guildId) as
    | BumpStreakRow
    | undefined;

  let streak = 1;
  let interrupted = false;
  const prevUserId = current?.last_user_id ?? null;
  const prevStreak = current?.streak ?? 0;

  if (current && current.last_user_id === userId) {
    // El mismo usuario encadena otro bump consecutivo
    streak = current.streak + 1;
  } else if (current && current.last_user_id && current.last_user_id !== userId && current.streak > 0) {
    // Alguien diferente interrumpe la racha previa
    interrupted = true;
    streak = 1;
  } else {
    // Primer bump registrado
    streak = 1;
  }

  const BASE_REWARD = 2000;
  const STREAK_BONUS_PER_LEVEL = 2000;
  const reward = BASE_REWARD + (streak - 1) * STREAK_BONUS_PER_LEVEL;
  const bonus = (streak - 1) * STREAK_BONUS_PER_LEVEL;
  const now = bumpTimestamp;
  const totalGuildBumps = (current?.total_bumps ?? 0) + 1;
  const nextBumpAt = now + BUMP_COOLDOWN_MS;

  let walletBalance = 0;

  db.transaction(() => {
    // Registrar log
    db.prepare(
      `INSERT INTO bump_logs (message_id, guild_id, user_id, streak, reward, bonus, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(messageId, guildId, userId, streak, reward, bonus, now);

    // Actualizar racha del servidor
    db.prepare(`
      INSERT INTO bump_streaks (guild_id, last_user_id, streak, last_bump_at, total_bumps, reminder_sent)
      VALUES (?, ?, ?, ?, 1, 0)
      ON CONFLICT(guild_id) DO UPDATE SET
        last_user_id = excluded.last_user_id,
        streak = excluded.streak,
        last_bump_at = excluded.last_bump_at,
        total_bumps = bump_streaks.total_bumps + 1,
        reminder_sent = 0
    `).run(guildId, userId, streak, now);

    // Actualizar estadísticas individuales del usuario
    db.prepare(`
      INSERT INTO bump_user_stats (guild_id, user_id, total_bumps, highest_streak, total_earned, last_bump_at)
      VALUES (?, ?, 1, ?, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        total_bumps = bump_user_stats.total_bumps + 1,
        highest_streak = MAX(bump_user_stats.highest_streak, excluded.highest_streak),
        total_earned = bump_user_stats.total_earned + excluded.total_earned,
        last_bump_at = excluded.last_bump_at
    `).run(guildId, userId, streak, reward, now);

    // Entregar NexoCoins en la cartera
    const eco = getEco(guildId, userId);
    addWallet(eco, reward);
    saveEco(eco);
    walletBalance = eco.wallet;
  })();

  // Si existe misión de bump, avanzarla
  try {
    bumpMission(guildId, userId, "bump_1", madridDay());
  } catch {
    // ignore
  }

  logger.info(
    `[BUMP] Usuario ${userTag} (${userId}) bumpeó en ${guildId}. Racha: ${streak}, Recompensa: ${reward} NexoCoins (Bono: ${bonus}).`,
  );

  return {
    userId,
    userTag,
    guildId,
    streak,
    reward,
    bonus,
    interrupted,
    prevUserId,
    prevStreak,
    totalGuildBumps,
    nextBumpAt,
    walletBalance,
  };
}

/**
 * Genera el Embed visual de recompensa por bump.
 */
export function buildBumpRewardEmbed(params: {
  guildName: string;
  guildIconUrl?: string | null;
  userId: string;
  streak: number;
  reward: number;
  bonus: number;
  interrupted: boolean;
  prevUserId: string | null;
  prevStreak: number;
  totalGuildBumps: number;
  nextBumpAt: number;
  walletBalance: number;
}): EmbedBuilder {
  const nextTimestamp = Math.floor(params.nextBumpAt / 1000);

  const embed = new EmbedBuilder()
    .setColor(0x24b7f7) // Color azul/celeste de DISBOARD
    .setTitle("🚀 ¡Servidor Bumperado en DISBOARD!")
    .setDescription(
      `¡Muchísimas gracias <@${params.userId}> por promocionar **${params.guildName}** en DISBOARD!\n\n` +
      `💰 **Recompensa recibida:** ${n(params.reward)}\n` +
      (params.bonus > 0
        ? `🔥 **¡Bono de racha (+${n(params.bonus)} a mayores)!**\n` +
          `Has encadenado **${params.streak}** bumps consecutivos.\n\n`
        : "") +
      (params.interrupted && params.prevUserId
        ? `⚡ ¡Has interrumpido la racha de <@${params.prevUserId}> (**${params.prevStreak}** ${params.prevStreak === 1 ? "bump" : "bumps"}) y comienzas la tuya propia!\n\n`
        : "") +
      `📊 **Racha actual:** **${params.streak}** ${params.streak === 1 ? "bump consecutivo" : "bumps consecutivos"}\n` +
      `💳 **Tu saldo en cartera:** ${n(params.walletBalance)}\n\n` +
      `⏰ **Próximo bump disponible:** <t:${nextTimestamp}:R> (<t:${nextTimestamp}:t>)`,
    );

  if (params.guildIconUrl) {
    embed.setThumbnail(params.guildIconUrl);
  }
  embed.setFooter({
    text: `Nexo · Recompensas DISBOARD · Bumps totales: ${params.totalGuildBumps}`,
  });
  embed.setTimestamp();

  return embed;
}

/**
 * Controlador principal invocado cuando DISBOARD publica un mensaje en el servidor.
 */
export async function handleDisboardMessage(message: Message): Promise<boolean> {
  if (!message.inGuild()) return false;

  const cfg = getGuildConfig(message.guild.id);
  const bumpChannelId = cfg.bump?.channelId || (message.guild.id === OFFICIAL_GUILD_ID ? BUMP_CHANNEL_ID : null);

  // Si está configurado un canal específico de bump, solo actuar en ese canal
  if (bumpChannelId && message.channelId !== bumpChannelId) {
    return false;
  }

  // Verificar si es un bump exitoso de DISBOARD
  if (!isDisboardBumpSuccess(message)) {
    return false;
  }

  // Comprobar idempotencia antes de hacer operaciones pesadas
  const db = getDb();
  const alreadyDone = db.prepare("SELECT message_id FROM bump_logs WHERE message_id = ?").get(message.id);
  if (alreadyDone) return false;

  // Extraer el usuario que ejecutó el comando
  const user = await extractBumpUser(message);
  if (!user) {
    logger.warn(`No se pudo identificar al usuario que ejecutó el bump en mensaje ${message.id}`);
    return false;
  }

  const result = processBump(message.guild.id, user.id, user.tag, message.id, message.createdTimestamp);
  if (!result) return false;

  scheduleBumpReminder(message.client as NexoClient, message.guild.id, result.nextBumpAt - BUMP_COOLDOWN_MS);

  // Notificar la recompensa en ese mismo canal
  try {
    const embed = buildBumpRewardEmbed({
      guildName: message.guild.name,
      guildIconUrl: message.guild.iconURL(),
      userId: result.userId,
      streak: result.streak,
      reward: result.reward,
      bonus: result.bonus,
      interrupted: result.interrupted,
      prevUserId: result.prevUserId,
      prevStreak: result.prevStreak,
      totalGuildBumps: result.totalGuildBumps,
      nextBumpAt: result.nextBumpAt,
      walletBalance: result.walletBalance,
    });

    await message.channel.send({ embeds: [embed] });
    return true;
  } catch (err) {
    logger.error("Error al enviar notificación de recompensa de bump", err);
    return false;
  }
}

async function sendBumpReminder(client: NexoClient, guildId: string, expectedLastBumpAt: number): Promise<void> {
  if (sendingReminders.has(guildId)) return;
  sendingReminders.add(guildId);

  const db = getDb();
  try {
    const row = db.prepare("SELECT * FROM bump_streaks WHERE guild_id = ?").get(guildId) as BumpStreakRow | undefined;
    if (!row || row.reminder_sent || row.last_bump_at !== expectedLastBumpAt) return;

    if (Date.now() - row.last_bump_at < BUMP_COOLDOWN_MS) {
      scheduleBumpReminder(client, guildId, row.last_bump_at);
      return;
    }

    const cfg = getGuildConfig(guildId);
    const channelId = cfg.bump?.channelId || (guildId === OFFICIAL_GUILD_ID ? BUMP_CHANNEL_ID : null);
    if (!channelId) return;

    const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId).catch(() => null));
    if (!guild) return;

    const channel = guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId).catch(() => null));
    if (!channel || !channel.isTextBased() || !("send" in channel)) return;

    const pingRoleId = cfg.bump?.pingRoleId || (guildId === OFFICIAL_GUILD_ID ? BUMP_PING_ROLE_ID : null);
    const pingText = pingRoleId ? `<@&${pingRoleId}>` : "";
    const streakText =
      row.last_user_id && row.streak > 0
        ? `\n👑 Racha a mantener o arrebatar: <@${row.last_user_id}> con **${row.streak}** ${row.streak === 1 ? "bump" : "bumps"}.`
        : "";

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("⏰ ¡El servidor ya se puede volver a bumpear!")
      .setDescription(
        `¡Han pasado las **2 horas** de espera!\n\n` +
        `Usa el comando de DISBOARD \`/bump\` aquí para posicionar al servidor arriba en la lista y ganar tus **2.000 NexoCoins** (¡o más si encadenas racha!).${streakText}`,
      )
      .setFooter({ text: "Nexo · Notificación automática de DISBOARD" })
      .setTimestamp();

    await channel.send({
      content: pingText || undefined,
      embeds: [embed],
      allowedMentions: pingRoleId ? { roles: [pingRoleId] } : undefined,
    });

    db.prepare("UPDATE bump_streaks SET reminder_sent = 1 WHERE guild_id = ? AND last_bump_at = ?")
      .run(guildId, expectedLastBumpAt);
  } catch (e) {
    logger.error("Error al enviar recordatorio automático de bump", e);
    scheduleBumpReminder(client, guildId, expectedLastBumpAt);
  } finally {
    sendingReminders.delete(guildId);
  }
}

/**
 * Notificador en segundo plano cuando transcurren 2 horas y el servidor vuelve a estar disponible para /bump.
 */
export async function tickBumpReminder(client: NexoClient): Promise<void> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM bump_streaks WHERE last_bump_at > 0 AND reminder_sent = 0").all() as
    | BumpStreakRow[];

  const now = Date.now();
  for (const row of rows) {
    if (now - row.last_bump_at >= BUMP_COOLDOWN_MS) {
      await sendBumpReminder(client, row.guild_id, row.last_bump_at);
    } else {
      scheduleBumpReminder(client, row.guild_id, row.last_bump_at);
    }
  }
}

/**
 * Embed explicativo para obtener el rol de notificaciones de bump.
 */
export function bumpRoleEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x24b7f7)
    .setTitle("🔔 Notificaciones de Bump · DISBOARD")
    .setDescription(
      "¿Quieres enterarte al segundo cada vez que el servidor vuelva a estar disponible para hacer `/bump`?\n\n" +
      `Pulsa el botón de abajo para obtener el rol <@&${BUMP_PING_ROLE_ID}>.\n\n` +
      "**¿Por qué tener este rol?**\n" +
      "⚡ Recibirás una mención en este canal cada vez que terminen las 2 horas de cooldown.\n" +
      "🪙 Sé el primero en usar `/bump` para ganar tus **2.000 NexoCoins**.\n" +
      "🔥 ¡Encadena bumps seguidos para conseguir **+2.000 NexoCoins extra** por cada nivel de racha!\n\n" +
      "*Si vuelves a pulsar el botón en cualquier momento, te quitarás el rol.*",
    )
    .setFooter({ text: "Nexo · Sistema de Recompensas DISBOARD" });
}

/**
 * Componentes interactivos (botón) para obtener/quitarse el rol de bump.
 */
export function bumpRoleComponents(): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("bump:role:toggle")
        .setLabel("Notificarme Bumps")
        .setEmoji("🔔")
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

/**
 * Manejador del botón interactivo para alternar el rol de notificaciones de bump.
 */
export async function handleBumpButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "Solo se puede usar dentro del servidor.", ephemeral: true });
    return;
  }

  if (interaction.customId === "bump:role:toggle") {
    const cfg = getGuildConfig(interaction.guild.id);
    const roleId = cfg.bump?.pingRoleId || (interaction.guild.id === OFFICIAL_GUILD_ID ? BUMP_PING_ROLE_ID : null);

    if (!roleId) {
      await interaction.reply({
        content: "El rol de notificaciones no está configurado en este servidor.",
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member;
    const hasRole = member.roles.cache.has(roleId);

    try {
      if (hasRole) {
        await member.roles.remove(roleId);
        await interaction.reply({
          content: `🔕 Te has quitado el rol <@&${roleId}>. Ya no recibirás menciones cuando se pueda hacer bump.`,
          ephemeral: true,
        });
      } else {
        await member.roles.add(roleId);
        await interaction.reply({
          content: `🔔 ¡Se te ha asignado el rol <@&${roleId}>! Te avisaremos con una mención aquí cada vez que el comando \`/bump\` vuelva a estar listo.`,
          ephemeral: true,
        });
      }
    } catch (err) {
      logger.error("Error al alternar rol de bump:", err);
      await interaction.reply({
        content: "Hubo un error al actualizar tu rol. Verifica que el bot tenga permisos suficientes.",
        ephemeral: true,
      });
    }
  }
}

/**
 * Obtiene la racha actual de un servidor.
 */
export function getGuildBumpStreak(guildId: string): BumpStreakRow | null {
  const row = getDb().prepare("SELECT * FROM bump_streaks WHERE guild_id = ?").get(guildId) as
    | BumpStreakRow
    | undefined;
  return row ?? null;
}

/**
 * Obtiene las estadísticas de bump de un usuario en un servidor.
 */
export function getUserBumpStats(guildId: string, userId: string): BumpUserStatsRow | null {
  const row = getDb()
    .prepare("SELECT * FROM bump_user_stats WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as BumpUserStatsRow | undefined;
  return row ?? null;
}

/**
 * Obtiene el ranking de usuarios con más bumps en el servidor.
 */
export function getBumpLeaderboard(guildId: string, limit = 10): BumpUserStatsRow[] {
  return getDb()
    .prepare("SELECT * FROM bump_user_stats WHERE guild_id = ? ORDER BY total_bumps DESC LIMIT ?")
    .all(guildId, limit) as BumpUserStatsRow[];
}
