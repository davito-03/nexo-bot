import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { NexoClient } from "../../client.js";
import { banMember, replyAction } from "../../modules/moderation/actions.js";
import { requireStaff } from "../../utils/permissions.js";
import { parseDuration } from "../../utils/time.js";
import { errorEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banear (usa duración para tempban)")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName("usuario").setDescription("Objetivo").setRequired(true))
    .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true))
    .addStringOption((o) => o.setName("duracion").setDescription("Opcional, ej: 7d"))
    .addIntegerOption((o) => o.setName("borrar_dias").setDescription("0-7").setMinValue(0).setMaxValue(7)),
  async execute(interaction: ChatInputCommandInteraction, client: NexoClient) {
    const staff = await requireStaff(interaction);
    if (!staff) return;
    const user = interaction.options.getUser("usuario", true);
    const durRaw = interaction.options.getString("duracion");
    const dur = durRaw ? parseDuration(durRaw) : null;
    if (durRaw && !dur) {
      await interaction.reply({ embeds: [errorEmbed("Duración inválida")], ephemeral: true });
      return;
    }
    await replyAction(
      interaction,
      await banMember(
        interaction.guild!,
        staff,
        user,
        interaction.options.getString("razon", true),
        dur,
        client,
        interaction.options.getInteger("borrar_dias") ?? 1,
      ),
    );
  },
};

export default command;
