import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { EVENTS_CHANNEL_ID } from "../../constants.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { parseMadridDateTime, timestamp } from "../../utils/time.js";
import {
  createEvent,
  eventButtons,
  eventEmbed,
} from "../../modules/events/rsvp.js";
import { getDb } from "../../database/index.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("evento")
    .setDescription("Check-in de eventos")
    .addSubcommand((s) =>
      s
        .setName("crear")
        .setDescription("Staff: publicar un evento con lista de Voy")
        .addStringOption((o) => o.setName("titulo").setDescription("Nombre").setRequired(true).setMaxLength(100))
        .addStringOption((o) =>
          o.setName("cuando").setDescription("Madrid: 2026-09-06 22:00").setRequired(true),
        )
        .addStringOption((o) => o.setName("detalle").setDescription("Qué se hace"))
        .addIntegerOption((o) => o.setName("cupo").setDescription("Máximo de apuntados").setMinValue(1).setMaxValue(200)),
    )
    .addSubcommand((s) => s.setName("lista").setDescription("Próximos eventos")),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }
    const sub = interaction.options.getSubcommand();
    if (sub === "lista") {
      const rows = getDb()
        .prepare("SELECT id, title, starts_at FROM server_events WHERE guild_id = ? AND starts_at > ? ORDER BY starts_at LIMIT 8")
        .all(interaction.guild.id, Date.now()) as { id: number; title: string; starts_at: number }[];
      const text = rows.map((r) => `**#${r.id}** ${r.title} · ${timestamp(r.starts_at, "f")}`).join("\n") || "No hay eventos próximos.";
      await interaction.reply({ embeds: [successEmbed("Próximos eventos", text)] });
      return;
    }
    const staff = await requireStaff(interaction);
    if (!staff) return;
    const cuando = interaction.options.getString("cuando", true);
    const startsAt = parseMadridDateTime(cuando);
    if (!startsAt || startsAt < Date.now() - 60_000) {
      await interaction.reply({
        embeds: [errorEmbed("Fecha", "Usa `YYYY-MM-DD HH:MM` en hora de Madrid, y que sea futura.")],
        ephemeral: true,
      });
      return;
    }
    const ch = interaction.guild.channels.cache.get(EVENTS_CHANNEL_ID) ?? interaction.channel;
    if (!ch || !("send" in ch) || !ch.isTextBased()) {
      await interaction.reply({ embeds: [errorEmbed("Canal de eventos no accesible")], ephemeral: true });
      return;
    }
    const ev = createEvent({
      guildId: interaction.guild.id,
      channelId: ch.id,
      hostId: interaction.user.id,
      title: interaction.options.getString("titulo", true),
      details: interaction.options.getString("detalle") ?? "",
      startsAt,
      capacity: interaction.options.getInteger("cupo"),
    });
    const msg = await ch.send({
      embeds: [eventEmbed(ev, [])],
      components: [eventButtons(ev.id)],
    });
    getDb().prepare("UPDATE server_events SET message_id = ? WHERE id = ?").run(msg.id, ev.id);
    await interaction.reply({
      embeds: [successEmbed("Evento publicado", `${ch} · ${timestamp(startsAt, "F")}`)],
      ephemeral: true,
    });
  },
};

export default command;
