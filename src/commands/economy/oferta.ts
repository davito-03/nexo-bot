import {
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { onlyGuild, errorEmbed, ephemeral } from "../../utils/embeds.js";
import { getEco, invOf } from "../../modules/economy/engine.js";
import { getItemDef, getAllItems } from "../../modules/economy/items.js";
import { createP2POffer } from "../../modules/economy/trade.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("oferta")
    .setDescription("Sistema de comercio directo y ofertas P2P entre usuarios")
    .addSubcommand((s) =>
      s
        .setName("vender")
        .setDescription("Proponer una oferta de venta directa a otro usuario")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario al que ofreces vender").setRequired(true))
        .addStringOption((o) =>
          o.setName("item").setDescription("Objeto de tu inventario a vender").setRequired(true).setAutocomplete(true),
        )
        .addIntegerOption((o) => o.setName("precio").setDescription("Precio total en nexocoins").setRequired(true).setMinValue(1))
        .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad a vender (por defecto 1)").setMinValue(1)),
    )
    .addSubcommand((s) =>
      s
        .setName("comprar")
        .setDescription("Proponer una oferta de compra directa a otro usuario")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario al que deseas comprar").setRequired(true))
        .addStringOption((o) =>
          o.setName("item").setDescription("Objeto que deseas comprar").setRequired(true).setAutocomplete(true),
        )
        .addIntegerOption((o) => o.setName("precio").setDescription("Precio total en nexocoins a pagar").setRequired(true).setMinValue(1))
        .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad a comprar (por defecto 1)").setMinValue(1)),
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.respond([]);
      return;
    }
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "item") {
      await interaction.respond([]);
      return;
    }

    const sub = interaction.options.getSubcommand();
    const q = focused.value.toLowerCase();

    if (sub === "vender") {
      const eco = getEco(interaction.guild.id, interaction.user.id);
      const inv = invOf(eco);
      const options = Object.entries(inv)
        .filter(([, count]) => count > 0)
        .map(([id, count]) => {
          const def = getItemDef(id);
          const name = def ? `${def.emoji} ${def.name}` : id;
          return {
            name: `${name} (tienes ×${count})`.slice(0, 100),
            value: id,
          };
        })
        .filter((opt) => !q || opt.name.toLowerCase().includes(q))
        .slice(0, 25);
      await interaction.respond(options);
      return;
    }

    // Comprar: search in all registry items
    const all = getAllItems();
    const options = all
      .map((item) => ({
        name: `${item.emoji} ${item.name} (${item.category})`.slice(0, 100),
        value: item.id,
      }))
      .filter((opt) => !q || opt.name.toLowerCase().includes(q))
      .slice(0, 25);
    await interaction.respond(options);
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const sub = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser("usuario", true);
    const itemId = interaction.options.getString("item", true).trim().toLowerCase();
    const price = interaction.options.getInteger("precio", true);
    const quantity = interaction.options.getInteger("cantidad") ?? 1;

    if (targetUser.bot) {
      await interaction.reply(ephemeral([errorEmbed("Error", "No puedes comerciar con bots.")]));
      return;
    }

    await createP2POffer(
      interaction,
      sub === "vender" ? "sell" : "buy",
      targetUser,
      itemId,
      quantity,
      price,
    );
  },
};

export default command;
