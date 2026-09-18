import { ChannelType, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { baseEmbed } from "../../utils/embeds.js";
import { COLORS, SERVER_TAGLINE } from "../../constants.js";
import { timestamp } from "../../utils/time.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("serverinfo").setDescription("Información del servidor"),
  async execute(interaction: ChatInputCommandInteraction) {
    const g = interaction.guild;
    if (!g) {
      await interaction.reply({ content: "Solo en servidor.", ephemeral: true });
      return;
    }
    const embed = baseEmbed(COLORS.primary)
      .setTitle(g.name)
      .setDescription(g.description || SERVER_TAGLINE)
      .setThumbnail(g.iconURL({ size: 256 }))
      .addFields(
        { name: "Dueño", value: `<@${g.ownerId}>`, inline: true },
        { name: "Creado", value: timestamp(g.createdTimestamp, "D"), inline: true },
        { name: "Miembros", value: String(g.memberCount), inline: true },
        { name: "Boosts", value: `${g.premiumSubscriptionCount ?? 0} (nivel ${g.premiumTier})`, inline: true },
        { name: "Canales", value: String(g.channels.cache.size), inline: true },
        { name: "Roles", value: String(g.roles.cache.size), inline: true },
        { name: "Emojis", value: String(g.emojis.cache.size), inline: true },
        {
          name: "Voz",
          value: String(g.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size),
          inline: true,
        },
        { name: "ID", value: g.id, inline: true },
      );
    if (g.banner) embed.setImage(g.bannerURL({ size: 1024 })!);
    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
