import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed, successEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Bloquear o desbloquear un canal")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((o) =>
      o
        .setName("accion")
        .setDescription("bloquear o abrir")
        .setRequired(true)
        .addChoices({ name: "bloquear", value: "lock" }, { name: "abrir", value: "unlock" }),
    )
    .addStringOption((o) => o.setName("razon").setDescription("Razón")),
  async execute(interaction: ChatInputCommandInteraction) {
    const staff = await requireStaff(interaction);
    if (!staff) return;
    const ch = interaction.channel;
    if (!ch || !ch.isTextBased() || !("permissionOverwrites" in ch)) {
      await interaction.reply({ embeds: [errorEmbed("Canal no válido")], ephemeral: true });
      return;
    }
    const lock = interaction.options.getString("accion", true) === "lock";
    const reason = interaction.options.getString("razon") ?? (lock ? "Canal bloqueado" : "Canal abierto");
    await ch.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: lock ? false : null }, { reason });
    await interaction.reply({
      embeds: [successEmbed(lock ? "Canal bloqueado" : "Canal abierto", reason)],
    });
  },
};

export default command;
