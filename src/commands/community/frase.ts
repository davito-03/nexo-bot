import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { addQuote, postDailyQuote } from "../../modules/community/quotes.js";
import { getDb } from "../../database/index.js";
import { madridDay } from "../../utils/time.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("frase")
    .setDescription("Frase del día")
    .addSubcommand((s) =>
      s
        .setName("proponer")
        .setDescription("Sugerir una frase (se publica como Nexo Staff)")
        .addStringOption((o) => o.setName("texto").setDescription("La frase").setRequired(true).setMaxLength(280)),
    )
    .addSubcommand((s) => s.setName("forzar").setDescription("Staff: publicar ya la de hoy")),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }
    const sub = interaction.options.getSubcommand();
    if (sub === "proponer") {
      addQuote(interaction.guild.id, interaction.options.getString("texto", true), interaction.user.id);
      await interaction.reply({
        embeds: [
          successEmbed(
            "Frase guardada",
            "Si sale sorteada, se publicará **sin tu nombre**, firmada por Nexo Staff.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }
    const staff = await requireStaff(interaction);
    if (!staff) return;
    getDb().prepare("DELETE FROM quote_daily WHERE guild_id = ? AND day = ?").run(interaction.guild.id, madridDay());
    const ok = await postDailyQuote(interaction.guild);
    await interaction.reply({
      embeds: [ok ? successEmbed("Publicada") : errorEmbed("No se pudo", "Revisa el canal o si ya salió hoy.")],
      ephemeral: true,
    });
  },
};

export default command;
