import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { errorEmbed, infoEmbed, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { isStaff } from "../../utils/permissions.js";
import {
  calculatePollResults,
  closePoll,
  createPollRecord,
  getPoll,
  renderPollComponents,
  renderPollEmbed,
  updatePollMessageId,
} from "../../modules/community/polls.js";
import type { Command } from "../../types/index.js";
import type { NexoClient } from "../../client.js";

function parseDurationMs(durationStr: string | null): number | null {
  if (!durationStr || durationStr === "none") return null;
  const now = Date.now();
  switch (durationStr) {
    case "15m":
      return now + 15 * 60 * 1000;
    case "30m":
      return now + 30 * 60 * 1000;
    case "1h":
      return now + 60 * 60 * 1000;
    case "2h":
      return now + 2 * 60 * 60 * 1000;
    case "6h":
      return now + 6 * 60 * 60 * 1000;
    case "12h":
      return now + 12 * 60 * 60 * 1000;
    case "24h":
      return now + 24 * 60 * 60 * 1000;
    case "3d":
      return now + 3 * 24 * 60 * 60 * 1000;
    case "7d":
      return now + 7 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("encuesta")
    .setDescription("Crea y gestiona encuestas interactivas de opción única o múltiple")
    .addSubcommand((sub) => {
      sub
        .setName("crear")
        .setDescription("Crea una nueva encuesta con hasta 15 opciones")
        .addStringOption((o) =>
          o
            .setName("pregunta")
            .setDescription("La pregunta o tema principal de la encuesta")
            .setRequired(true)
            .setMaxLength(256),
        )
        .addStringOption((o) =>
          o
            .setName("tipo")
            .setDescription("Tipo de votación: opción única o múltiple")
            .setRequired(true)
            .addChoices(
              { name: "🔘 Opción única (1 voto por persona)", value: "single" },
              { name: "☑️ Opción múltiple (se pueden elegir varias)", value: "multiple" },
            ),
        )
        .addStringOption((o) => o.setName("opcion1").setDescription("Opción 1").setRequired(true).setMaxLength(100))
        .addStringOption((o) => o.setName("opcion2").setDescription("Opción 2").setRequired(true).setMaxLength(100))
        .addStringOption((o) =>
          o
            .setName("duracion")
            .setDescription("Tiempo que permanecerá abierta la encuesta")
            .setRequired(false)
            .addChoices(
              { name: "15 minutos", value: "15m" },
              { name: "30 minutos", value: "30m" },
              { name: "1 hora", value: "1h" },
              { name: "2 horas", value: "2h" },
              { name: "6 horas", value: "6h" },
              { name: "12 horas", value: "12h" },
              { name: "24 horas (1 día)", value: "24h" },
              { name: "3 días", value: "3d" },
              { name: "7 días (1 semana)", value: "7d" },
              { name: "♾️ Sin límite de tiempo (hasta cierre manual)", value: "none" },
            ),
        );

      for (let i = 3; i <= 15; i++) {
        sub.addStringOption((o) =>
          o
            .setName(`opcion${i}`)
            .setDescription(`Opción ${i} (opcional)`)
            .setRequired(false)
            .setMaxLength(100),
        );
      }
      return sub;
    })
    .addSubcommand((sub) =>
      sub
        .setName("cerrar")
        .setDescription("Cierra una encuesta activa y muestra los resultados definitivos")
        .addIntegerOption((o) =>
          o.setName("id").setDescription("ID de la encuesta a cerrar").setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("ver")
        .setDescription("Consulta los detalles y resultados de una encuesta")
        .addIntegerOption((o) =>
          o.setName("id").setDescription("ID de la encuesta a consultar").setRequired(true).setMinValue(1),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: NexoClient) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "crear") {
      const question = interaction.options.getString("pregunta", true).trim();
      const mode = interaction.options.getString("tipo", true) as "single" | "multiple";
      const durationStr = interaction.options.getString("duracion");
      const endsAt = parseDurationMs(durationStr);

      const options: string[] = [];
      for (let i = 1; i <= 15; i++) {
        const val = interaction.options.getString(`opcion${i}`);
        if (val && val.trim().length > 0) {
          options.push(val.trim());
        }
      }

      if (options.length < 2) {
        await interaction.reply({
          embeds: [errorEmbed("Opciones insuficientes", "Debes especificar al menos 2 opciones para crear la encuesta.")],
          ephemeral: true,
        });
        return;
      }

      const pollId = createPollRecord({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        authorId: interaction.user.id,
        question,
        options,
        mode,
        endsAt,
      });

      const poll = getPoll(pollId);
      if (!poll) {
        await interaction.reply({
          embeds: [errorEmbed("Error", "No se pudo registrar la encuesta en la base de datos.")],
          ephemeral: true,
        });
        return;
      }

      const results = calculatePollResults(poll);
      const embed = renderPollEmbed(poll, results);
      const components = renderPollComponents(poll);

      const msg = await interaction.reply({
        embeds: [embed],
        components,
        fetchReply: true,
      });

      updatePollMessageId(pollId, msg.id);
      return;
    }

    if (sub === "cerrar") {
      const pollId = interaction.options.getInteger("id", true);
      const poll = getPoll(pollId);

      if (!poll) {
        await interaction.reply({
          embeds: [errorEmbed("Encuesta no encontrada", `No existe ninguna encuesta con el ID **#${pollId}**.`)],
          ephemeral: true,
        });
        return;
      }

      const isAuthor = interaction.user.id === poll.author_id;
      let allowed = isAuthor;
      if (!allowed) {
        if (interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) || isStaff(interaction.member)) {
          allowed = true;
        }
      }

      if (!allowed) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              "Permiso denegado",
              `Solo el autor de la encuesta (<@${poll.author_id}>) o un miembro del Staff pueden cerrarla.`,
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      if (poll.closed) {
        await interaction.reply({
          embeds: [infoEmbed("Ya cerrada", `La encuesta **#${pollId}** ya está cerrada.`)],
          ephemeral: true,
        });
        return;
      }

      await closePoll(poll.id, interaction.user.id, client);
      await interaction.reply({
        embeds: [successEmbed("Encuesta cerrada", `La encuesta **#${pollId}** ha sido cerrada exitosamente.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === "ver") {
      const pollId = interaction.options.getInteger("id", true);
      const poll = getPoll(pollId);

      if (!poll) {
        await interaction.reply({
          embeds: [errorEmbed("Encuesta no encontrada", `No existe ninguna encuesta con el ID **#${pollId}**.`)],
          ephemeral: true,
        });
        return;
      }

      const results = calculatePollResults(poll);
      const embed = renderPollEmbed(poll, results);
      const link = `https://discord.com/channels/${poll.guild_id}/${poll.channel_id}/${poll.message_id}`;

      embed.addFields({
        name: "🔗 Enlace al mensaje",
        value: `[Ir a la encuesta](${link})`,
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
  },
};

export default command;
