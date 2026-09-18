import { ChannelType, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed, successEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Staff: el bot dice algo en el canal (sin firmar quién lo usó)")
    .addStringOption((o) =>
      o.setName("mensaje").setDescription("Texto").setRequired(true).setMaxLength(2000),
    )
    .addChannelOption((o) =>
      o.setName("canal").setDescription("Canal (por defecto este)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const staff = await requireStaff(interaction);
    if (!staff) return;
    const text = interaction.options.getString("mensaje", true);
    const ch = interaction.options.getChannel("canal") ?? interaction.channel;
    if (!ch || !("send" in ch) || !ch.isTextBased()) {
      await interaction.reply({ embeds: [errorEmbed("Canal inválido")], ephemeral: true });
      return;
    }
    await ch.send({ content: text, allowedMentions: { parse: ["users"] } });
    await interaction.reply({ embeds: [successEmbed("Enviado")], ephemeral: true });
  },
};

export default command;
