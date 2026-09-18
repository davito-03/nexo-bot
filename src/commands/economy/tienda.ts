import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { ecoEmbed, errorEmbed, ephemeral, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { requireAdmin, requireStaff } from "../../utils/permissions.js";
import { getEco, invOf, n } from "../../modules/economy/engine.js";
import { collectLoan } from "../../modules/economy/loans.js";
import {
  autocompleteShop,
  buyCatalogItem,
  catalog,
  createCustomItem,
  hideOrDeleteItem,
  renderShopView,
  restoreBaseItem,
  setItemPrice,
  executeSell,
  getSellAutocomplete,
} from "../../modules/economy/shop.js";
import type { Command } from "../../types/index.js";
import type { NexoClient } from "../../client.js";
import { paginate } from "../../utils/pagination.js";
import { chunk } from "../../utils/format.js";


function tiendaCommand(
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
  const focused = interaction.options.getFocused(true);
  if (focused.name !== "item") {
    await interaction.respond([]);
    return;
  }
  const sub = interaction.options.getSubcommand(false) ?? interaction.commandName.replace(/^tienda-/, "");
  if (sub === "vender") {
    const inv = invOf(getEco(interaction.guild.id, interaction.user.id));
    await interaction.respond(getSellAutocomplete(interaction.guild.id, inv, focused.value));
    return;
  }
  const mode = sub === "restaurar" ? "hidden" : "all";
  await interaction.respond(autocompleteShop(interaction.guild.id, focused.value, mode));
}

async function execute(interaction: ChatInputCommandInteraction, _client: NexoClient) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }
    const sub = interaction.options.getSubcommand(false) ?? interaction.commandName.replace(/^tienda-/, "");
    const gid = interaction.guild.id;
    if (sub === "comprar") collectLoan(getEco(gid, interaction.user.id));

    if (sub === "ver") {
      const view = renderShopView(gid, "todas");
      await interaction.reply({ embeds: [view.embed], components: [view.row] });
      return;
    }


    if (sub === "comprar") {
      const id = interaction.options.getString("item", true);
      const qty = interaction.options.getInteger("cantidad") ?? 1;
      const res = await buyCatalogItem(interaction.member, id, qty);
      const embed = res.ok ? successEmbed(res.title, res.detail) : errorEmbed(res.title, res.detail);
      await interaction.reply({ embeds: [embed], ephemeral: !res.ok });
      return;
    }

    if (sub === "vender") {
      const id = interaction.options.getString("item", true);
      const qtyOption = interaction.options.getInteger("cantidad") ?? 1;
      const me = getEco(gid, interaction.user.id);
      const res = executeSell(me, gid, id, qtyOption);
      if (!res.ok) {
        await interaction.reply(ephemeral([errorEmbed(res.title, res.detail)]));
        return;
      }
      await interaction.reply({
        embeds: [
          ecoEmbed(res.title)
            .setDescription(res.detail)
            .addFields({ name: "Cartera", value: n(res.wallet) }),
        ],
      });
      return;
    }

    if (sub === "crear") {
      const admin = await requireAdmin(interaction);
      if (!admin) return;
      const nombre = interaction.options.getString("nombre", true);
      const precio = interaction.options.getInteger("precio", true);
      const desc = interaction.options.getString("descripcion") ?? "Artículo de la tienda de Nexo.";
      const rol = interaction.options.getRole("rol");
      const unico = interaction.options.getBoolean("unico") ?? undefined;
      if (rol && rol.managed) {
        await interaction.reply(ephemeral([errorEmbed("Rol inválido", "No se puede vender un rol de integración (bot/nitro).")]));
        return;
      }
      const item = createCustomItem({
        guildId: gid,
        name: nombre,
        price: precio,
        desc,
        roleId: rol?.id ?? null,
        unique: unico,
        createdBy: interaction.user.id,
      });
      await interaction.reply({
        embeds: [
          ecoEmbed("Artículo creado")
            .setDescription(`**${item.name}** ya está en \`/tienda ver\`.`)
            .addFields(
              { name: "ID", value: `\`${item.id}\``, inline: true },
              { name: "Precio", value: n(item.price), inline: true },
              { name: "Tipo", value: item.type === "role" ? `Rol ${rol}` : "Ítem", inline: true },
            )
            .setFooter({
              text: item.type === "role" ? "Pon el rol del bot POR ENCIMA del rol que vendes." : "Los miembros lo compran con /tienda-comprar",
            }),
        ],
      });
      return;
    }

    if (sub === "precio") {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      const id = interaction.options.getString("item", true);
      const precio = interaction.options.getInteger("precio", true);
      const item = setItemPrice(gid, id, precio);
      if (!item) {
        await interaction.reply(ephemeral([errorEmbed("No existe", "Ese artículo no está en la tienda.")]));
        return;
      }
      await interaction.reply({
        embeds: [successEmbed("Precio actualizado", `**${item.name}** ahora cuesta ${n(item.price)}.`)],
      });
      return;
    }

    if (sub === "quitar") {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      const id = interaction.options.getString("item", true);
      const res = hideOrDeleteItem(gid, id);
      if (!res) {
        await interaction.reply(ephemeral([errorEmbed("No existe", "Ese artículo no está en la tienda.")]));
        return;
      }
      const extra =
        res.kind === "base" ? " Artículo base oculto. Puedes devolverlo con `/tienda-restaurar`." : "";
      await interaction.reply({ embeds: [successEmbed("Quitado", `**${res.name}** ya no está en la tienda.${extra}`)] });
      return;
    }

    if (sub === "restaurar") {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      const id = interaction.options.getString("item", true);
      const item = restoreBaseItem(gid, id);
      if (!item) {
        await interaction.reply(ephemeral([errorEmbed("Nada que restaurar", "Ese artículo base no está oculto o no existe.")]));
        return;
      }
      await interaction.reply({
        embeds: [successEmbed("Restaurado", `**${item.name}** vuelve a la tienda a ${n(item.price)}.`)],
      });
    }
}

void PermissionFlagsBits;

const data = new SlashCommandBuilder()
  .setName("tienda")
  .setDescription("Tienda oficial de Nexo Bot: roles, herramientas y artículos")
  .addSubcommand((s) => s.setName("ver").setDescription("Ver catálogo oficial por categorías"))
  .addSubcommand((s) =>
    s
      .setName("comprar")
      .setDescription("Comprar un artículo del catálogo")
      .addStringOption((o) => o.setName("item").setDescription("Artículo").setRequired(true).setAutocomplete(true))
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Unidades (1-25)").setMinValue(1).setMaxValue(25)),
  )
  .addSubcommand((s) =>
    s
      .setName("vender")
      .setDescription("Vender cualquier objeto, captura de pesca, presa de caza o coleccionable al bot")
      .addStringOption((o) => o.setName("item").setDescription("Objeto a vender").setRequired(true).setAutocomplete(true))
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Unidades a vender (−1 = todo)").setMinValue(-1)),
  )
  .addSubcommand((s) =>
    s
      .setName("crear")
      .setDescription("Admin: añadir un nuevo artículo a la tienda")
      .addStringOption((o) => o.setName("nombre").setDescription("Nombre del artículo").setRequired(true))
      .addIntegerOption((o) =>
        o.setName("precio").setDescription("Precio en nexocoin").setRequired(true).setMinValue(1).setMaxValue(1_000_000_000),
      )
      .addStringOption((o) => o.setName("descripcion").setDescription("Descripción del artículo"))
      .addRoleOption((o) => o.setName("rol").setDescription("Rol a otorgar si es una compra de rol"))
      .addBooleanOption((o) => o.setName("unico").setDescription("Solo se puede comprar una vez")),
  )
  .addSubcommand((s) =>
    s
      .setName("precio")
      .setDescription("Staff: cambiar el precio de un artículo")
      .addStringOption((o) => o.setName("item").setDescription("Artículo").setRequired(true).setAutocomplete(true))
      .addIntegerOption((o) =>
        o.setName("precio").setDescription("Nuevo precio").setRequired(true).setMinValue(1).setMaxValue(1_000_000_000),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("quitar")
      .setDescription("Staff: retirar un artículo de la tienda")
      .addStringOption((o) => o.setName("item").setDescription("Artículo").setRequired(true).setAutocomplete(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("restaurar")
      .setDescription("Staff: devolver un artículo base retirado")
      .addStringOption((o) => o.setName("item").setDescription("Artículo base oculto").setRequired(true).setAutocomplete(true)),
  );

const command: Command = {
  data,
  execute,
  autocomplete,
};

export default command;
