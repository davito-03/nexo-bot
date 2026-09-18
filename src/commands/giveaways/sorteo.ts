import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction, type TextChannel } from "discord.js";
import { getDb } from "../../database/index.js";
import { createGiveaway, editGiveaway, endGiveaway, setMemberBoostCount, type GiveawayRow, type GiveawayEntryRow } from "../../modules/giveaways/manager.js";
import { parseDuration, parseMadridDateTime, timestamp } from "../../utils/time.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed, infoEmbed, successEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("sorteo")
    .setDescription("Giveaways")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName("start")
        .setDescription("Iniciar un sorteo")
        .addStringOption((o) => o.setName("premio").setDescription("Premio").setRequired(true))
        .addStringOption((o) => o.setName("duracion").setDescription("Duración relativa, ej: 1h, 1d, 3d"))
        .addStringOption((o) => o.setName("fecha").setDescription("Fecha exacta Madrid: YYYY-MM-DD HH:MM"))
        .addIntegerOption((o) => o.setName("ganadores").setDescription("Nº de ganadores").setMinValue(1).setMaxValue(20))
        .addChannelOption((o) => o.setName("canal").setDescription("Canal").addChannelTypes(ChannelType.GuildText))
        .addRoleOption((o) => o.setName("rol").setDescription("Rol requerido"))
        .addIntegerOption((o) => o.setName("nivel").setDescription("Nivel mínimo"))
        .addBooleanOption((o) => o.setName("boosters").setDescription("Solo boosters")),
    )
    .addSubcommand((s) =>
      s
        .setName("editar")
        .setDescription("Editar premio, ganadores o fecha de un sorteo activo")
        .addIntegerOption((o) => o.setName("id").setDescription("ID del sorteo").setRequired(true))
        .addStringOption((o) => o.setName("premio").setDescription("Nuevo título o premio del sorteo"))
        .addIntegerOption((o) => o.setName("ganadores").setDescription("Nueva cantidad de ganadores").setMinValue(1).setMaxValue(20))
        .addStringOption((o) => o.setName("fecha").setDescription("Fecha exacta Madrid: YYYY-MM-DD HH:MM")),
    )
    .addSubcommand((s) =>
      s
        .setName("end")
        .setDescription("Terminar un sorteo")
        .addIntegerOption((o) => o.setName("id").setDescription("ID del sorteo").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("reroll")
        .setDescription("Volver a elegir ganadores")
        .addIntegerOption((o) => o.setName("id").setDescription("ID").setRequired(true)),
    )
    .addSubcommand((s) => s.setName("list").setDescription("Sorteos activos"))
    .addSubcommand((s) =>
      s
        .setName("participantes")
        .setDescription("Ver participantes y sus participaciones (boosts e invitaciones)")
        .addIntegerOption((o) => o.setName("id").setDescription("ID del sorteo").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("set-boosts")
        .setDescription("Ajustar manualmente la cantidad de boosts de un usuario para sorteos")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("cantidad").setDescription("Cantidad de boosts (ej: 1, 2, 3)").setMinValue(0).setMaxValue(50).setRequired(true),
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const staff = await requireStaff(interaction);
    if (!staff) return;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    if (sub === "start") {
      const durationInput = interaction.options.getString("duracion");
      const dateInput = interaction.options.getString("fecha");
      if ((durationInput ? 1 : 0) + (dateInput ? 1 : 0) !== 1) {
        await interaction.reply({ embeds: [errorEmbed("Fecha de finalización requerida", "Indica exactamente una opción: `duracion` o `fecha` (YYYY-MM-DD HH:MM, hora de Madrid).")], ephemeral: true });
        return;
      }
      const dur = durationInput ? parseDuration(durationInput) : null;
      const absoluteDate = dateInput ? parseMadridDateTime(dateInput) : null;
      const endsAt = absoluteDate ?? (dur ? Date.now() + dur : null);
      if (!endsAt || endsAt <= Date.now()) {
        await interaction.reply({ embeds: [errorEmbed("Fecha o duración inválida", "La fecha debe tener formato `YYYY-MM-DD HH:MM` y estar en el futuro. Hora de Madrid.")], ephemeral: true });
        return;
      }
      const channel = (interaction.options.getChannel("canal") ?? interaction.channel) as TextChannel | null;
      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        await interaction.reply({ embeds: [errorEmbed("Canal inválido")], ephemeral: true });
        return;
      }
      const g = await createGiveaway({
        guild,
        channel,
        host: staff,
        prize: interaction.options.getString("premio", true),
        winners: interaction.options.getInteger("ganadores") ?? 1,
        endsAt,
        requiredRole: interaction.options.getRole("rol")?.id,
        minLevel: interaction.options.getInteger("nivel"),
        boosterOnly: interaction.options.getBoolean("boosters") ?? false,
      });
      await interaction.reply({ embeds: [successEmbed("Sorteo creado", `ID **${g.id}** en ${channel}\nFinaliza: ${timestamp(g.ends_at, "F")} (${timestamp(g.ends_at)})`)] });
      return;
    }

    if (sub === "editar") {
      const id = interaction.options.getInteger("id", true);
      const prize = interaction.options.getString("premio");
      const winners = interaction.options.getInteger("ganadores");
      const rawDate = interaction.options.getString("fecha");
      if (!prize && winners === null && !rawDate) {
        await interaction.reply({ embeds: [errorEmbed("Nada que editar", "Indica al menos uno: `premio`, `ganadores` o `fecha`.")], ephemeral: true });
        return;
      }
      let endsAt: number | undefined;
      if (rawDate) {
        const parsedDate = parseMadridDateTime(rawDate);
        if (!parsedDate) {
          await interaction.reply({ embeds: [errorEmbed("Fecha inválida", "Usa el formato `YYYY-MM-DD HH:MM` en hora de Madrid. Ejemplo: `2026-09-10 22:30`.")], ephemeral: true });
          return;
        }
        endsAt = parsedDate;
      }
      const result = await editGiveaway(guild, id, { prize: prize ?? undefined, winners: winners ?? undefined, endsAt });
      if (!result.ok || !result.giveaway) {
        await interaction.reply({ embeds: [errorEmbed("No se pudo editar", result.error ?? "Sorteo no encontrado.")], ephemeral: true });
        return;
      }
      const changes: string[] = [];
      if (prize) changes.push(`Premio: **${result.giveaway.prize}**`);
      if (winners !== null) changes.push(`Ganadores: **${result.giveaway.winners}**`);
      if (rawDate) changes.push(`Finaliza: ${timestamp(result.giveaway.ends_at, "F")} (${timestamp(result.giveaway.ends_at)})`);
      await interaction.reply({ embeds: [successEmbed("Sorteo actualizado", `El sorteo **#${id}** se ha actualizado correctamente.\n${changes.join("\n")}`)] });
      return;
    }

    if (sub === "end" || sub === "reroll") {
      const id = interaction.options.getInteger("id", true);
      const winners = await endGiveaway(guild, id, sub === "reroll");
      await interaction.reply({
        embeds: [successEmbed(sub === "reroll" ? "Reroll" : "Sorteo cerrado", winners.map((w) => `<@${w}>`).join(", ") || "Sin participantes")],
      });
      return;
    }

    if (sub === "list") {
      const rows = getDb()
        .prepare("SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0 ORDER BY ends_at")
        .all(guild.id) as GiveawayRow[];
      await interaction.reply({
        embeds: [
          infoEmbed(
            "Sorteos activos",
            rows.map((g) => `**#${g.id}** ${g.prize} · termina ${timestamp(g.ends_at)}`).join("\n") || "Ninguno.",
          ),
        ],
      });
      return;
    }

    if (sub === "participantes") {
      const id = interaction.options.getInteger("id", true);
      const db = getDb();
      const giveaway = db.prepare("SELECT * FROM giveaways WHERE id = ? AND guild_id = ?").get(id, guild.id) as GiveawayRow | undefined;
      if (!giveaway) {
        await interaction.reply({ embeds: [errorEmbed("Sorteo no encontrado.")], ephemeral: true });
        return;
      }
      const entries = db.prepare("SELECT * FROM giveaway_entries WHERE giveaway_id = ? ORDER BY entries DESC").all(id) as GiveawayEntryRow[];
      if (!entries.length) {
        await interaction.reply({ embeds: [infoEmbed(`Participantes · Sorteo #${id}`, "Aún no hay participantes en este sorteo.")], ephemeral: true });
        return;
      }
      const totalTickets = entries.reduce((acc, cur) => acc + (cur.entries || 1), 0);
      const lines = entries.slice(0, 25).map((e, idx) => {
        const boostTxt = e.boost_count > 0 ? `${e.boost_count * 5} (${e.boost_count} boosts)` : "1";
        return `**${idx + 1}.** <@${e.user_id}>: **${e.entries}** tickets *(Base/Boost: ${boostTxt} | Invitados: +${e.invite_count})*`;
      });
      if (entries.length > 25) {
        lines.push(`*... y ${entries.length - 25} participantes más.*`);
      }
      await interaction.reply({
        embeds: [
          infoEmbed(
            `Participantes · Sorteo #${id}: ${giveaway.prize}`,
            `👥 **Total de participantes:** ${entries.length}\n` +
            `🎟️ **Total de participaciones / tickets:** ${totalTickets}\n\n` +
            lines.join("\n"),
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === "set-boosts") {
      const targetUser = interaction.options.getUser("usuario", true);
      const count = interaction.options.getInteger("cantidad", true);
      setMemberBoostCount(guild.id, targetUser.id, count);
      const baseTickets = count > 0 ? count * 5 : 1;
      await interaction.reply({
        embeds: [
          successEmbed(
            "Boosts actualizados para sorteos",
            `Se han configurado **${count}** boosts para <@${targetUser.id}>.\n` +
            `🔹 **Participaciones base por boost:** **${baseTickets}** tickets (5x por boost).\n` +
            `➕ Además sumará **+1 ticket** por cada usuario que invite al servidor.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }
  },
};

export default command;
