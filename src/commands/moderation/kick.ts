import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { kickMember, replyAction } from "../../modules/moderation/actions.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsar a un miembro")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName("usuario").setDescription("Objetivo").setRequired(true))
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
    await replyAction(interaction, await kickMember(interaction.guild!, staff, member, interaction.options.getString("razon", true)));
  },
};

export default command;
