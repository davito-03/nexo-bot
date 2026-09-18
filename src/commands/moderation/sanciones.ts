import {
  GuildMember,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { NexoClient } from "../../client.js";
import { getCase, getCasesForUser } from "../../database/index.js";
import { caseEmbed, historyText } from "../../modules/moderation/cases.js";
import { deleteCaseAction, editCase, replyAction } from "../../modules/moderation/actions.js";
import { isStaff, requireStaff } from "../../utils/permissions.js";
import { errorEmbed, infoEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("sanciones")
    .setDescription("Gestión y consulta de sanciones del servidor")
    .addSubcommand((s) =>
      s
        .setName("ver")
        .setDescription("Ver sanciones de un usuario o tu propio historial")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario a consultar (por defecto tú)")),
    )
    .addSubcommand((s) =>
      s
        .setName("buscar")
        .setDescription("Buscar una sanción específica por su número / ID")
        .addIntegerOption((o) => o.setName("id").setDescription("ID del caso de sanción").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("editar")
        .setDescription("Editar la razón de una sanción existente (Staff)")
        .addIntegerOption((o) => o.setName("id").setDescription("ID del caso de sanción").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Nueva razón para la sanción").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("eliminar")
        .setDescription("Eliminar permanentemente una sanción del registro (Staff)")
        .addIntegerOption((o) => o.setName("id").setDescription("ID del caso a eliminar").setRequired(true))
        .addBooleanOption((o) =>
          o.setName("revertir").setDescription("Si está activa, levantar ban/timeout en Discord (por defecto true)"),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: NexoClient) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Solo en servidor.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === "ver") {
      const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
      const rows = getCasesForUser(guild.id, targetUser.id);
      const embed = infoEmbed(`Sanciones · ${targetUser.tag}`, historyText(rows)).setThumbnail(
        targetUser.displayAvatarURL(),
      );
      await interaction.reply({
        embeds: [embed],
        ephemeral: targetUser.id === interaction.user.id,
      });
      return;
    }

    if (sub === "buscar") {
      const caseId = interaction.options.getInteger("id", true);
      const row = getCase(guild.id, caseId);
      if (!row) {
        await interaction.reply({
          embeds: [errorEmbed("No encontrada", `No existe ninguna sanción con el ID #${caseId}.`)],
          ephemeral: true,
        });
        return;
      }

      const member = interaction.member as GuildMember | null;
      const staffUser = member ? isStaff(member) : false;
      if (!staffUser && row.user_id !== interaction.user.id) {
        await interaction.reply({
          embeds: [errorEmbed("Acceso denegado", "Solo el staff puede consultar sanciones de otros usuarios.")],
          ephemeral: true,
        });
        return;
      }

      const user = await client.users.fetch(row.user_id).catch(() => null);
      const mod = await client.users.fetch(row.moderator_id).catch(() => null);
      await interaction.reply({
        embeds: [caseEmbed(guild, row, user, mod)],
        ephemeral: !staffUser,
      });
      return;
    }

    if (sub === "editar") {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      const caseId = interaction.options.getInteger("id", true);
      const newReason = interaction.options.getString("razon", true);
      const res = await editCase(guild, staff, caseId, newReason);
      await replyAction(interaction, res);
      return;
    }

    if (sub === "eliminar") {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      const caseId = interaction.options.getInteger("id", true);
      const revert = interaction.options.getBoolean("revertir") ?? true;
      const res = await deleteCaseAction(guild, staff, caseId, revert, client);
      await replyAction(interaction, res);
      return;
    }
  },
};

export default command;
