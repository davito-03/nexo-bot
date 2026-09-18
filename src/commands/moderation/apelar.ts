import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { errorEmbed, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { createAppeal, getPendingAppealForUser, sendAppealToStaff } from "../../modules/moderation/appeals.js";
import { getCasesForUser } from "../../database/index.js";
import { DYNO_BAN_APPEAL_URL, SERVER_NAME } from "../../constants.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("apelar")
    .setDescription("Enviar una solicitud de apelación formal de una sanción al equipo de moderación")
    .addStringOption((o) =>
      o
        .setName("motivo")
        .setDescription("Explica por qué crees que tu sanción debería retirarse o reducirse")
        .setRequired(true)
        .setMinLength(15)
        .setMaxLength(1000),
    )
    .addIntegerOption((o) =>
      o.setName("caso").setDescription("Número del caso a apelar (ver con /sanciones)").setMinValue(1),
    )
    .addStringOption((o) =>
      o.setName("pruebas").setDescription("Enlaces, contexto o pruebas adicionales para tu caso").setMaxLength(1000),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const gid = interaction.guild.id;
    const uid = interaction.user.id;

    const pending = getPendingAppealForUser(gid, uid);
    if (pending) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Apelación ya en curso",
            `Ya tienes la apelación **#${pending.id}** pendiente de revisión por el Staff.\nPor favor, espera a que los moderadores tomen una decisión.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const motivo = interaction.options.getString("motivo", true);
    const pruebas = interaction.options.getString("pruebas");
    const caseId = interaction.options.getInteger("caso");

    const userCases = getCasesForUser(gid, uid, true);
    let sanctionType = "sancion";
    if (caseId) {
      const match = userCases.find((c) => c.case_id === caseId);
      if (match) sanctionType = match.type;
    } else if (userCases.length) {
      sanctionType = userCases[0]?.type ?? "sancion";
    }

    if (sanctionType === "ban" || sanctionType === "tempban") {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Apelaciones de baneo en Dyno",
            `Las apelaciones de baneo se realizan exclusivamente a través de **Dyno**.\n\n` +
            `🆔 **ID de tu sanción:** \`#${caseId ?? userCases[0]?.case_id}\`\n\n` +
            `🔗 **Formulario de apelación:** ${DYNO_BAN_APPEAL_URL}`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const appeal = createAppeal({
      guildId: gid,
      userId: uid,
      userTag: interaction.user.tag,
      caseId: caseId ?? (userCases[0]?.case_id ?? null),
      type: sanctionType,
      reason: motivo,
      evidence: pruebas,
    });

    await sendAppealToStaff(interaction.guild, appeal);

    await interaction.reply({
      embeds: [
        successEmbed(
          "Solicitud de apelación enviada",
          `Tu apelación **#${appeal.id}** ha sido registrada y enviada al equipo de moderación de **${SERVER_NAME}**.\n\nEl Staff revisará tu caso y recibirás una notificación con la resolución.`,
        ),
      ],
      ephemeral: true,
    });
  },
};

export default command;
