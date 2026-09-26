import { ChannelType, SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { getGuildConfig, setGuildConfig } from "../../database/index.js";
import { requireStaff } from "../../utils/permissions.js";
import { ecoEmbed, errorEmbed, ephemeral, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { getEco, invOf, n } from "../../modules/economy/engine.js";
import { autocompleteShop, findItem, isUnsellableItem } from "../../modules/economy/shop.js";
import { buyListing, cancelListing, createListing, listMarket, logMarket } from "../../modules/economy/market.js";
import type { Command } from "../../types/index.js";


function mercadoCommand(
  name: string,
  description: string,
  configure?: (b: SlashCommandBuilder) => any,
  withAutocomplete = false,
): Command {
  let b = new SlashCommandBuilder().setName(name).setDescription(description);
  if (configure) b = configure(b) as SlashCommandBuilder;
  return {
    data: b,
    execute,
    autocomplete: withAutocomplete ? autocomplete : undefined,
  };
}

async function autocomplete(interaction: AutocompleteInteraction) {
  if (!interaction.inCachedGuild()) {
    await interaction.respond([]);
    return;
  }
  const sub = interaction.options.getSubcommand(false);
  if (sub === "vender") {
    const eco = getEco(interaction.guild.id, interaction.user.id);
    const inv = invOf(eco);
    const q = interaction.options.getFocused().toLowerCase();
    const options = Object.entries(inv)
      .filter(([id, count]) => count > 0 && !isUnsellableItem(interaction.guild.id, id))
      .map(([id, count]) => {
        const item = findItem(interaction.guild.id, id);
        const name = item ? item.name : id;
        return {
          name: `${name} (tienes ×${count})`.slice(0, 100),
          value: id,
        };
      })
      .filter((opt) => !q || opt.name.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q))
      .slice(0, 25);
    await interaction.respond(options);
    return;
  }
  await interaction.respond(autocompleteShop(interaction.guild.id, interaction.options.getFocused()));
}

async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }
    const gid = interaction.guild.id;
    const sub = interaction.options.getSubcommand(false) ?? interaction.commandName.replace(/^mercado-/, "");

    if (sub === "logs") {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      const canal = interaction.options.getChannel("canal", true);
      setGuildConfig(gid, { market: { ...getGuildConfig(gid).market, logChannelId: canal.id } });
      await interaction.reply({ embeds: [successEmbed("Logs de mercado", `${canal}`)], ephemeral: true });
      return;
    }

    if (sub === "ver") {
      const rows = listMarket(gid);
      const lines = rows.map((r) => {
        const item = findItem(gid, r.item_id);
        return `**#${r.id}** ${r.qty}× ${item?.name ?? r.item_id} — ${n(r.price)} · <@${r.seller_id}>`;
      });
      await interaction.reply({
        embeds: [ecoEmbed("Mercado Nexo").setDescription(lines.join("\n") || "Vacío. Vende con `/mercado-vender`.")],
      });
      return;
    }

    if (sub === "vender") {
      const res = createListing(
        gid,
        interaction.user.id,
        interaction.options.getString("item", true),
        interaction.options.getInteger("cantidad") ?? 1,
        interaction.options.getInteger("precio", true),
      );
      if (typeof res === "string") {
        await interaction.reply(ephemeral([errorEmbed("No se pudo", res)]));
        return;
      }
      const item = findItem(gid, res.item_id);
      await interaction.reply({
        embeds: [successEmbed("En venta", `**#${res.id}** ${res.qty}× ${item?.name} por ${n(res.price)}. Comisión 5% al vender.`)],
      });
      await logMarket(interaction.guild, `📤 <@${interaction.user.id}> pone **#${res.id}** ${res.qty}× ${item?.name} a ${n(res.price)}.`);
      return;
    }

    if (sub === "comprar") {
      const id = interaction.options.getInteger("id", true);
      const msg = buyListing(gid, id, interaction.user.id);
      const ok = msg.startsWith("Has comprado");
      await interaction.reply({ embeds: [ok ? successEmbed("Compra", msg) : errorEmbed("Mercado", msg)], ephemeral: !ok });
      if (ok) await logMarket(interaction.guild, `📥 <@${interaction.user.id}> ${msg}`);
      return;
    }

    if (sub === "cancelar") {
      const id = interaction.options.getInteger("id", true);
      const msg = cancelListing(gid, id, interaction.user.id);
      await interaction.reply({ embeds: [successEmbed("Mercado", msg)], ephemeral: true });
    }
  }

const data = new SlashCommandBuilder()
  .setName("mercado")
  .setDescription("Mercado de compra y venta de objetos entre usuarios")
  .addSubcommand((s) => s.setName("ver").setDescription("Ver anuncios y listados activos en el mercado"))
  .addSubcommand((s) =>
    s
      .setName("vender")
      .setDescription("Poner un ítem de tu inventario a la venta")
      .addStringOption((o) => o.setName("item").setDescription("Objeto a vender").setRequired(true).setAutocomplete(true))
      .addIntegerOption((o) => o.setName("precio").setDescription("Precio total en nexocoins").setRequired(true).setMinValue(10))
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Unidades").setMinValue(1).setMaxValue(20)),
  )
  .addSubcommand((s) =>
    s
      .setName("comprar")
      .setDescription("Comprar un anuncio del mercado por su ID")
      .addIntegerOption((o) => o.setName("id").setDescription("ID del anuncio").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("cancelar")
      .setDescription("Retirar un anuncio que hayas publicado")
      .addIntegerOption((o) => o.setName("id").setDescription("ID del anuncio").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("logs")
      .setDescription("Staff: canal de registro de transacciones del mercado")
      .addChannelOption((o) =>
        o.setName("canal").setDescription("Canal de texto").addChannelTypes(ChannelType.GuildText).setRequired(true),
      ),
  );

const command: Command = {
  data,
  execute,
  autocomplete,
};

export default command;
