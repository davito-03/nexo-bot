import {
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { errorEmbed, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { getEco } from "../../modules/economy/engine.js";
import { collectLoan } from "../../modules/economy/loans.js";
import { autocompleteShop, buyCatalogItem } from "../../modules/economy/shop.js";
import type { Command } from "../../types/index.js";

async function autocomplete(interaction: AutocompleteInteraction) {
  if (!interaction.inCachedGuild()) {
    await interaction.respond([]).catch(() => {});
    return;
  }
  const focused = interaction.options.getFocused(true);
  if (focused.name !== "item") {
    await interaction.respond([]).catch(() => {});
    return;
  }
  await interaction.respond(autocompleteShop(interaction.guild.id, focused.value)).catch(() => {});
}

async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    await interaction.reply(onlyGuild());
    return;
  }
  const gid = interaction.guild.id;
  collectLoan(getEco(gid, interaction.user.id));

  const id = interaction.options.getString("item", true);
  const qty = interaction.options.getInteger("cantidad") ?? 1;
  const res = await buyCatalogItem(interaction.member, id, qty);
  const embed = res.ok ? successEmbed(res.title, res.detail) : errorEmbed(res.title, res.detail);
  await interaction.reply({ embeds: [embed], ephemeral: !res.ok });
}

const data = new SlashCommandBuilder()
  .setName("comprar")
  .setDescription("Comprar artículos del catálogo oficial (herramientas, Poké Balls, consumibles, roles)")
  .addStringOption((o) =>
    o.setName("item").setDescription("Artículo que deseas comprar").setRequired(true).setAutocomplete(true),
  )
  .addIntegerOption((o) =>
    o.setName("cantidad").setDescription("Unidades a comprar (1-50)").setMinValue(1).setMaxValue(50),
  );

const command: Command = {
  data,
  execute,
  autocomplete,
};

export default command;
