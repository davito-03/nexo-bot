import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed, successEmbed } from "../../utils/embeds.js";
import { sendLog } from "../../modules/logs/dispatch.js";
import { logEmbed } from "../../modules/logs/dispatch.js";
import { COLORS } from "../../constants.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Borrar mensajes de un canal")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) => o.setName("cantidad").setDescription("1-100").setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) => o.setName("usuario").setDescription("Solo de este usuario")),
  async execute(interaction: ChatInputCommandInteraction) {
    const staff = await requireStaff(interaction);
    if (!staff) return;
    if (!interaction.channel || !interaction.channel.isTextBased() || !("bulkDelete" in interaction.channel)) {
      await interaction.reply({ embeds: [errorEmbed("No puedo borrar aquí")], ephemeral: true });
      return;
    }
    const amount = interaction.options.getInteger("cantidad", true);
    const user = interaction.options.getUser("usuario");
    await interaction.deferReply({ ephemeral: true });
    const fetched = await interaction.channel.messages.fetch({ limit: 100 });
    const filtered = fetched.filter((m) => (!user || m.author.id === user.id) && Date.now() - m.createdTimestamp < 14 * 86400000);
    const toDelete = [...filtered.values()].slice(0, amount);
    const deleted = await interaction.channel.bulkDelete(toDelete, true);
    await interaction.editReply({ embeds: [successEmbed("Limpieza", `He borrado **${deleted.size}** mensajes.`)] });
    await sendLog(
      interaction.guild!,
      "moderation",
      logEmbed("Clear", COLORS.warn).setDescription(
        `${staff} (\`${staff.id}\`) borró ${deleted.size} mensajes en <#${interaction.channel.id}> (\`${interaction.channel.id}\`)${user ? ` de <@${user.id}> (\`${user.id}\`)` : ""}`,
      ),
    );
  },
};

export default command;
