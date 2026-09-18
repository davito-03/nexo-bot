import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type GuildTextBasedChannel,
} from "discord.js";
import { getDb } from "../../database/index.js";
import { COLORS } from "../../constants.js";
import { bumpEventMission } from "../missions/engine.js";
import { timestamp } from "../../utils/time.js";

export interface ServerEvent {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  host_id: string;
  title: string;
  details: string;
  starts_at: number;
  capacity: number | null;
  reminded: number;
  created_at: number;
}

export function createEvent(opts: {
  guildId: string;
  channelId: string;
  hostId: string;
  title: string;
  details: string;
  startsAt: number;
  capacity: number | null;
}): ServerEvent {
  const info = getDb()
    .prepare(
      `INSERT INTO server_events (guild_id, channel_id, host_id, title, details, starts_at, capacity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(opts.guildId, opts.channelId, opts.hostId, opts.title.slice(0, 100), opts.details.slice(0, 400), opts.startsAt, opts.capacity, Date.now());
  return getDb().prepare("SELECT * FROM server_events WHERE id = ?").get(Number(info.lastInsertRowid)) as ServerEvent;
}

export function getEvent(id: number): ServerEvent | undefined {
  return getDb().prepare("SELECT * FROM server_events WHERE id = ?").get(id) as ServerEvent | undefined;
}

export function rsvpList(eventId: number): string[] {
  return (
    getDb().prepare("SELECT user_id FROM event_rsvp WHERE event_id = ? ORDER BY created_at").all(eventId) as {
      user_id: string;
    }[]
  ).map((r) => r.user_id);
}

export function eventEmbed(ev: ServerEvent, going: string[]) {
  const cap = ev.capacity ? `${going.length}/${ev.capacity}` : `${going.length}`;
  const names = going.slice(0, 20).map((id) => `<@${id}>`).join(" ") || "*Nadie aún.*";
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`📅 ${ev.title}`)
    .setDescription(
      [
        ev.details || "Evento de Nexo",
        "",
        `Empieza ${timestamp(ev.starts_at, "F")} (${timestamp(ev.starts_at, "R")})`,
        `Apuntados **${cap}**`,
        names,
      ].join("\n"),
    )
    .setFooter({ text: `Evento #${ev.id} · pulsa Voy` });
}

export function eventButtons(id: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ev:yes:${id}`).setLabel("Voy").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ev:no:${id}`).setLabel("Me bajo").setStyle(ButtonStyle.Secondary),
  );
}

export function toggleRsvp(ev: ServerEvent, userId: string, join: boolean): string {
  const going = rsvpList(ev.id);
  if (join) {
    if (going.includes(userId)) return "Ya estabas apuntado.";
    if (ev.capacity && going.length >= ev.capacity) return "Está lleno.";
    getDb().prepare("INSERT INTO event_rsvp (event_id, user_id, created_at) VALUES (?, ?, ?)").run(ev.id, userId, Date.now());
    bumpEventMission(ev.guild_id, userId, ev.id);
    return "Apuntado. Te avisamos ~30 min antes.";
  }
  getDb().prepare("DELETE FROM event_rsvp WHERE event_id = ? AND user_id = ?").run(ev.id, userId);
  return "Te has bajado de la lista.";
}

export async function handleEventButton(interaction: ButtonInteraction): Promise<void> {
  const [, act, idRaw] = interaction.customId.split(":");
  const ev = getEvent(Number(idRaw));
  if (!ev) {
    await interaction.reply({ content: "Ese evento ya no existe.", ephemeral: true });
    return;
  }
  const msg = toggleRsvp(ev, interaction.user.id, act === "yes");
  const going = rsvpList(ev.id);
  await interaction.deferUpdate();
  await interaction.message.edit({ embeds: [eventEmbed(ev, going)], components: [eventButtons(ev.id)] }).catch(() => null);
  await interaction.followUp({ content: msg, ephemeral: true }).catch(() => null);
}

export async function tickEventReminders(client: { guilds: { cache: Map<string, any> } }): Promise<void> {
  const now = Date.now();
  const due = getDb()
    .prepare(
      "SELECT * FROM server_events WHERE reminded = 0 AND starts_at > ? AND starts_at <= ?",
    )
    .all(now, now + 30 * 60_000) as ServerEvent[];
  for (const ev of due) {
    getDb().prepare("UPDATE server_events SET reminded = 1 WHERE id = ?").run(ev.id);
    const guild = client.guilds.cache.get(ev.guild_id);
    if (!guild) continue;
    const ch = guild.channels.cache.get(ev.channel_id) as GuildTextBasedChannel | undefined;
    if (!ch || !("send" in ch)) continue;
    const going = rsvpList(ev.id);
    const mentions = going.map((id) => `<@${id}>`).join(" ");
    await ch
      .send({
        content: mentions || undefined,
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warn)
            .setTitle("⏰ En ~30 min")
            .setDescription(`**${ev.title}** empieza ${timestamp(ev.starts_at, "R")}.\n${going.length} apuntado(s).`),
        ],
        allowedMentions: { users: going },
      })
      .catch(() => null);
  }
}
