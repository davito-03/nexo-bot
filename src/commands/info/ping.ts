import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { infoEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Latencia del bot"),
  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({ embeds: [infoEmbed("Ping", "Midiendo…")], fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({
      content: null,
      embeds: [infoEmbed("Pong 🐱", `API: **${roundtrip}ms**\nGateway: **${interaction.client.ws.ping}ms**`)],
    });
  },
};

export default command;
