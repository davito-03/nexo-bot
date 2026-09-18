import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type Guild,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { COLORS } from "../../constants.js";
import { getDb, getLevel } from "../../database/index.js";
import { timestamp } from "../../utils/time.js";
import { ephemeral, errorEmbed, successEmbed } from "../../utils/embeds.js";
import { getUserInviteCount } from "../invites/tracker.js";

export interface GiveawayRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  host_id: string;
  prize: string;
  winners: number;
  ends_at: number;
  ended: number;
  required_role: string | null;
  min_level: number | null;
  booster_only: number;
  paused: number;
  created_at: number;
}

export interface GiveawayEntryRow {
  giveaway_id: number;
  user_id: string;
  entries: number;
  boost_count: number;
  invite_count: number;
  joined_at: number;
}

/**
 * Obtiene el número de boosts que tiene un miembro en el servidor.
 * Si es booster activo (premiumSince), devuelve al menos 1 (o más si tiene registrados múltiples boosts).
 */
export function getMemberBoostCount(member: GuildMember): number {
  if (!member.premiumSince) return 0;
  const db = getDb();
  const row = db
    .prepare("SELECT boost_count FROM member_boosts WHERE guild_id = ? AND user_id = ?")
    .get(member.guild.id, member.id) as { boost_count: number } | undefined;
  return Math.max(1, row?.boost_count ?? 1);
}

/**
 * Registra o modifica manualmente la cantidad de boosts de un usuario (para administradores).
 */
export function setMemberBoostCount(guildId: string, userId: string, count: number): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO member_boosts (guild_id, user_id, boost_count, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      boost_count = excluded.boost_count,
      updated_at = excluded.updated_at
  `).run(guildId, userId, count, Date.now());
}

/**
 * Recalcula la participación de un usuario en sorteos activos cuando cambia
 * su estado de booster. El cierre del sorteo también vuelve a calcularlo, pero
 * esto mantiene actualizada la vista de participantes durante el sorteo.
 */
export async function refreshMemberGiveawayEntries(member: GuildMember): Promise<void> {
  const rows = getDb()
    .prepare(`
      SELECT ge.giveaway_id
      FROM giveaway_entries ge
      JOIN giveaways g ON g.id = ge.giveaway_id
      WHERE g.guild_id = ? AND g.ended = 0 AND ge.user_id = ?
    `)
    .all(member.guild.id, member.id) as { giveaway_id: number }[];
  if (!rows.length) return;

  const { entries, boostCount, inviteCount } = await calculateGiveawayEntries(member);
  const update = getDb().prepare(`
    UPDATE giveaway_entries
    SET entries = ?, boost_count = ?, invite_count = ?
    WHERE giveaway_id = ? AND user_id = ?
  `);
  const transaction = getDb().transaction(() => {
    for (const row of rows) update.run(entries, boostCount, inviteCount, row.giveaway_id, member.id);
  });
  transaction();
}

/**
 * Calcula las participaciones ponderadas de un usuario en los sorteos:
 * - Si es booster: 5 participaciones por cada boost que tenga (ej: 1 boost -> 5, 2 boosts -> 10).
 * - Si no es booster: 1 participación base.
 * - Por cada persona que haya invitado al servidor: +1 participación extra.
 */
export async function calculateGiveawayEntries(member: GuildMember): Promise<{
  entries: number;
  boostCount: number;
  inviteCount: number;
}> {
  const boostCount = getMemberBoostCount(member);
  const inviteCount = await getUserInviteCount(member.guild, member.id);

  const baseEntries = boostCount > 0 ? boostCount * 5 : 1;
  const totalEntries = baseEntries + inviteCount;

  return {
    entries: Math.max(1, totalEntries),
    boostCount,
    inviteCount,
  };
}

export function giveawayEmbed(g: GiveawayRow, entries: number, totalTickets?: number): EmbedBuilder {
  const ticketsText = totalTickets && totalTickets > entries ? ` (${totalTickets} participaciones)` : "";
  return new EmbedBuilder()
    .setColor(g.ended ? COLORS.mute : COLORS.primary)
    .setTitle(`🎉 Sorteo: ${g.prize}`)
    .setDescription(
      [
        `Organiza: <@${g.host_id}>`,
        `Ganadores: **${g.winners}**`,
        `Termina: ${timestamp(g.ends_at)} (${timestamp(g.ends_at, "F")})`,
        `Participantes: **${entries}**${ticketsText}`,
        g.required_role ? `Rol requerido: <@&${g.required_role}>` : null,
        g.min_level ? `Nivel mínimo: **${g.min_level}**` : null,
        g.booster_only ? "Solo boosters" : null,
        "",
        "💡 **Ventajas de participaciones:**",
        "🚀 **Boosters:** 5 participaciones por cada boost realizado.",
        "👥 **Invitaciones:** +1 participación extra por cada persona invitada.",
        "",
        g.ended ? "**Sorteo finalizado.**" : "Pulsa **Participar** para entrar.",
      ]
        .filter((line) => line !== null)
        .join("\n"),
    )
    .setFooter({ text: `ID ${g.id}` });
}

export function giveawayButton(id: number, ended = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw:join:${id}`)
      .setLabel("Participar")
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Success)
      .setDisabled(ended),
  );
}

export async function createGiveaway(opts: {
  guild: Guild;
  channel: TextChannel;
  host: GuildMember;
  prize: string;
  winners: number;
  endsAt: number;
  requiredRole?: string | null;
  minLevel?: number | null;
  boosterOnly?: boolean;
}): Promise<GiveawayRow> {
  const info = getDb()
    .prepare(
      `INSERT INTO giveaways (guild_id, channel_id, host_id, prize, winners, ends_at, required_role, min_level, booster_only, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opts.guild.id,
      opts.channel.id,
      opts.host.id,
      opts.prize,
      opts.winners,
      opts.endsAt,
      opts.requiredRole ?? null,
      opts.minLevel ?? null,
      opts.boosterOnly ? 1 : 0,
      Date.now(),
    );
  const id = Number(info.lastInsertRowid);
  const g = getDb().prepare("SELECT * FROM giveaways WHERE id = ?").get(id) as GiveawayRow;
  const msg = await opts.channel.send({ embeds: [giveawayEmbed(g, 0)], components: [giveawayButton(id)] });
  getDb().prepare("UPDATE giveaways SET message_id = ? WHERE id = ?").run(msg.id, id);
  g.message_id = msg.id;
  return g;
}

async function refreshGiveawayMessage(guild: Guild, g: GiveawayRow): Promise<void> {
  if (!g.message_id) return;
  const channel = guild.channels.cache.get(g.channel_id);
  if (!channel?.isTextBased() || !("messages" in channel)) return;
  const msg = await channel.messages.fetch(g.message_id).catch(() => null);
  if (!msg) return;
  const stats = getDb()
    .prepare("SELECT COUNT(*) AS c, COALESCE(SUM(entries), 0) AS s FROM giveaway_entries WHERE giveaway_id = ?")
    .get(g.id) as { c: number; s: number };
  await msg
    .edit({
      embeds: [giveawayEmbed(g, stats.c, stats.s)],
      components: [giveawayButton(g.id, g.ended !== 0)],
    })
    .catch(() => null);
}

export async function editGiveaway(
  guild: Guild,
  id: number,
  changes: { endsAt?: number; prize?: string; winners?: number },
): Promise<{ ok: boolean; error?: string; giveaway?: GiveawayRow }> {
  if (changes.endsAt !== undefined && (!Number.isFinite(changes.endsAt) || changes.endsAt <= Date.now())) {
    return { ok: false, error: "La fecha de finalización debe estar en el futuro." };
  }
  if (changes.prize !== undefined && !changes.prize.trim()) {
    return { ok: false, error: "El título o premio no puede estar vacío." };
  }
  if (changes.winners !== undefined && (!Number.isInteger(changes.winners) || changes.winners < 1 || changes.winners > 20)) {
    return { ok: false, error: "La cantidad de ganadores debe estar entre 1 y 20." };
  }
  if (changes.endsAt === undefined && changes.prize === undefined && changes.winners === undefined) {
    return { ok: false, error: "Indica al menos una modificación: fecha, premio o ganadores." };
  }
  const giveaway = getDb().prepare("SELECT * FROM giveaways WHERE id = ? AND guild_id = ?").get(id, guild.id) as GiveawayRow | undefined;
  if (!giveaway) return { ok: false, error: "Sorteo no encontrado en este servidor." };
  if (giveaway.ended) return { ok: false, error: "Ese sorteo ya ha finalizado y no se puede editar." };

  const sets: string[] = [];
  const values: (string | number)[] = [];
  if (changes.endsAt !== undefined) {
    sets.push("ends_at = ?");
    values.push(changes.endsAt);
  }
  if (changes.prize !== undefined) {
    sets.push("prize = ?");
    values.push(changes.prize.trim());
  }
  if (changes.winners !== undefined) {
    sets.push("winners = ?");
    values.push(changes.winners);
  }
  values.push(id, guild.id);
  getDb().prepare(`UPDATE giveaways SET ${sets.join(", ")} WHERE id = ? AND guild_id = ? AND ended = 0`).run(...values);
  const updated = getDb().prepare("SELECT * FROM giveaways WHERE id = ?").get(id) as GiveawayRow;
  await refreshGiveawayMessage(guild, updated);
  return { ok: true, giveaway: updated };
}

export async function syncActiveGiveawayMessages(guild: Guild): Promise<void> {
  const rows = getDb()
    .prepare("SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0 ORDER BY ends_at")
    .all(guild.id) as GiveawayRow[];
  for (const giveaway of rows) await refreshGiveawayMessage(guild, giveaway);
}

export async function handleJoin(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const id = Number(interaction.customId.split(":")[2]);
  const g = getDb().prepare("SELECT * FROM giveaways WHERE id = ?").get(id) as GiveawayRow | undefined;
  if (!g || g.ended) {
    await interaction.reply(ephemeral([errorEmbed("Sorteo cerrado", "Este sorteo ya no está activo.")]));
    return;
  }
  const member = interaction.member;
  if (g.required_role && !member.roles.cache.has(g.required_role)) {
    await interaction.reply(ephemeral([errorEmbed("Rol requerido", "No tienes el rol que pide este sorteo.")]));
    return;
  }
  if (g.booster_only && !member.premiumSince) {
    await interaction.reply(ephemeral([errorEmbed("Solo boosters", "Este sorteo es exclusivo para quien impulsa el servidor.")]));
    return;
  }
  if (g.min_level) {
    const lv = getLevel(g.guild_id, member.id);
    if (lv.level < g.min_level) {
      await interaction.reply(ephemeral([errorEmbed("Nivel", `Necesitas nivel **${g.min_level}**. Tienes **${lv.level}**.`)]));
      return;
    }
  }

  const exists = getDb()
    .prepare("SELECT 1 FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?")
    .get(id, member.id);

  if (exists) {
    getDb().prepare("DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?").run(id, member.id);
    await interaction.reply(ephemeral([successEmbed("Sorteo", "Has salido del sorteo. Puedes volver a entrar cuando quieras.")]));
  } else {
    const { entries, boostCount, inviteCount } = await calculateGiveawayEntries(member);
    getDb()
      .prepare(
        `INSERT INTO giveaway_entries (giveaway_id, user_id, entries, boost_count, invite_count, joined_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(giveaway_id, user_id) DO UPDATE SET
           entries = excluded.entries,
           boost_count = excluded.boost_count,
           invite_count = excluded.invite_count,
           joined_at = excluded.joined_at`,
      )
      .run(id, member.id, entries, boostCount, inviteCount, Date.now());

    const lines: string[] = [];
    if (boostCount > 0) {
      lines.push(`🚀 **${boostCount * 5}** por Server Booster (${boostCount} ${boostCount === 1 ? "boost" : "boosts"} × 5)`);
    } else {
      lines.push(`🎫 **1** participación base`);
    }
    if (inviteCount > 0) {
      lines.push(`👥 **+${inviteCount}** por personas invitadas al servidor`);
    }

    await interaction.reply(
      ephemeral([
        successEmbed(
          "¡Estás dentro del sorteo! 🎉",
          `Cuentas con **${entries} ${entries === 1 ? "participación" : "participaciones"}** registradas:\n\n` +
            lines.join("\n") +
            `\n\n*Nota: Si invitas más amigos o impulsas el servidor antes del sorteo, tus participaciones se actualizarán automáticamente.*`,
        ),
      ]),
    );
  }

  const stats = getDb()
    .prepare("SELECT COUNT(*) AS c, SUM(entries) AS s FROM giveaway_entries WHERE giveaway_id = ?")
    .get(id) as { c: number; s: number | null };
  const count = stats.c;
  const totalTickets = stats.s ?? count;

  if (g.message_id && interaction.message) {
    await interaction.message.edit({ embeds: [giveawayEmbed(g, count, totalTickets)] }).catch(() => null);
  }
}

/**
 * Selecciona ganadores de forma ponderada garantizando que ningún usuario se repita.
 */
function pickWinners(pool: string[], n: number): string[] {
  let available = [...pool];
  const out: string[] = [];
  while (out.length < n && available.length) {
    const i = Math.floor(Math.random() * available.length);
    const winner = available[i];
    out.push(winner);
    // Eliminar todas las entradas del ganador seleccionado para no repetir
    available = available.filter((id) => id !== winner);
  }
  return out;
}

export async function endGiveaway(guild: Guild, id: number, reroll = false): Promise<string[]> {
  const g = getDb().prepare("SELECT * FROM giveaways WHERE id = ?").get(id) as GiveawayRow | undefined;
  if (!g) return [];

  const participants = getDb()
    .prepare("SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?")
    .all(id) as { user_id: string }[];

  const weightedPool: string[] = [];
  let totalTickets = 0;

  for (const p of participants) {
    const member = guild.members.cache.get(p.user_id) ?? (await guild.members.fetch(p.user_id).catch(() => null));
    if (!member) continue; // Ya no está en el servidor

    const { entries, boostCount, inviteCount } = await calculateGiveawayEntries(member);
    getDb()
      .prepare("UPDATE giveaway_entries SET entries = ?, boost_count = ?, invite_count = ? WHERE giveaway_id = ? AND user_id = ?")
      .run(entries, boostCount, inviteCount, id, p.user_id);

    totalTickets += entries;
    for (let i = 0; i < entries; i++) {
      weightedPool.push(p.user_id);
    }
  }

  const winners = pickWinners(weightedPool, g.winners);
  getDb().prepare("UPDATE giveaways SET ended = 1 WHERE id = ?").run(id);

  const channel = guild.channels.cache.get(g.channel_id);
  if (channel?.isTextBased() && "send" in channel) {
    const mention = winners.length
      ? winners
          .map((w) => {
            const entry = getDb()
              .prepare("SELECT entries, boost_count, invite_count FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?")
              .get(id, w) as { entries: number; boost_count: number; invite_count: number } | undefined;
            const extra = entry ? ` (${entry.entries} ${entry.entries === 1 ? "participación" : "participaciones"})` : "";
            return `<@${w}>${extra}`;
          })
          .join(", ")
      : "Nadie participó.";

    await channel.send({
      content: reroll
        ? `🎲 Nuevos ganadores de **${g.prize}**: ${mention}`
        : `🎉 Sorteo de **${g.prize}** finalizado. Ganador(es): ${mention}`,
    });

    if (g.message_id && "messages" in channel) {
      const msg = await channel.messages.fetch(g.message_id).catch(() => null);
      if (msg) {
        await msg
          .edit({
            embeds: [giveawayEmbed({ ...g, ended: 1 }, participants.length, totalTickets)],
            components: [giveawayButton(id, true)],
          })
          .catch(() => null);
      }
    }
  }
  return winners;
}

export async function tickGiveaways(client: { guilds: { cache: Map<string, Guild> } }): Promise<void> {
  const due = getDb()
    .prepare("SELECT * FROM giveaways WHERE ended = 0 AND paused = 0 AND ends_at <= ?")
    .all(Date.now()) as GiveawayRow[];
  for (const g of due) {
    const guild = client.guilds.cache.get(g.guild_id);
    if (guild) await endGiveaway(guild, g.id);
    else getDb().prepare("UPDATE giveaways SET ended = 1 WHERE id = ?").run(g.id);
  }
}
