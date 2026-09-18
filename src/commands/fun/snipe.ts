import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getDb } from "../../database/index.js";
import { infoEmbed, errorEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder().setName("snipe").setDescription("Último mensaje borrado en este canal"),
  async execute(interaction: ChatInputCommandInteraction) {
    const row = getDb().prepare("SELECT * FROM snipes WHERE channel_id = ?").get(interaction.channelId) as
      | { author_tag: string; content: string; deleted_at: number; author_id: string; attachments: string | null }
      | undefined;
    if (!row) {
      await interaction.reply({ embeds: [errorEmbed("Nada que snipear")], ephemeral: true });
      return;
    }
    let files: string[] = [];
    try {
      files = row.attachments ? (JSON.parse(row.attachments) as string[]) : [];
    } catch {
      files = [];
    }
    const embed = infoEmbed("Snipe", row.content || "*vacío*")
      .addFields({ name: "Autor", value: `<@${row.author_id}> (${row.author_tag})` })
      .setFooter({ text: "Mensaje borrado" })
      .setTimestamp(row.deleted_at);
    if (files[0] && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(files[0])) embed.setImage(files[0]);
    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
