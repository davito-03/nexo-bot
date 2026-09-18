import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { timeoutMember, replyAction } from "../../modules/moderation/actions.js";
import { requireStaff } from "../../utils/permissions.js";
import { parseDuration } from "../../utils/time.js";
import { errorEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a un miembro")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("usuario").setDescription("Objetivo").setRequired(true))
    .addStringOption((o) => o.setName("duracion").setDescription("Ej: 10m, 1h, 1d").setRequired(true))
    .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const staff = await requireStaff(interaction);
    if (!staff) return;
    const user = interaction.options.getUser("usuario", true);
    const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed("No está en el servidor")], ephemeral: true });
      return;
    }
    const dur = parseDuration(interaction.options.getString("duracion", true));
    if (!dur) {
      await interaction.reply({ embeds: [errorEmbed("Duración inválida")], ephemeral: true });
      return;
    }
    await replyAction(interaction, await timeoutMember(interaction.guild!, staff, member, dur, interaction.options.getString("razon", true)));
  },
};

export default command;
