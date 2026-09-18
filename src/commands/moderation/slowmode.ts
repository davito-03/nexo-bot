import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed, successEmbed } from "../../utils/embeds.js";
import { parseDuration, formatDuration } from "../../utils/time.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Activar modo lento")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((o) => o.setName("tiempo").setDescription("0s para quitar, o 5s / 10s / 1m…").setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const staff = await requireStaff(interaction);
    if (!staff) return;
    const ch = interaction.channel;
    if (!ch || !("setRateLimitPerUser" in ch)) {
      await interaction.reply({ embeds: [errorEmbed("No disponible en este canal")], ephemeral: true });
      return;
    }
    const raw = interaction.options.getString("tiempo", true);
    const ms = raw === "0" || raw === "0s" ? 0 : parseDuration(raw);
    if (ms === null) {
      await interaction.reply({ embeds: [errorEmbed("Tiempo inválido")], ephemeral: true });
      return;
    }
    const seconds = Math.min(21600, Math.floor(ms / 1000));
    await ch.setRateLimitPerUser(seconds, `Slowmode por ${staff.user.tag}`);
    await interaction.reply({
      embeds: [successEmbed("Slowmode", seconds ? `Intervalo: ${formatDuration(seconds * 1000)}` : "Desactivado.")],
    });
  },
};

export default command;
