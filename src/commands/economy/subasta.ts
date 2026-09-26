import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { baseEmbed, ecoEmbed, errorEmbed, infoEmbed, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { cancelAuction, createAuction, getAuction, listActiveAuctions, placeBid } from "../../modules/economy/auctions.js";
import { getEco, invOf, n } from "../../modules/economy/engine.js";
import { getItemDef } from "../../modules/economy/items.js";
import { isUnsellableItem } from "../../modules/economy/shop.js";
import { isStaff } from "../../utils/permissions.js";
import { formatDuration, timestamp } from "../../utils/time.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("subasta")
    .setDescription("Sistema de subastas comunitarias de objetos")
    .addSubcommand((s) =>
      s
        .setName("ver")
        .setDescription("Ver subastas activas o los detalles de una subasta")
        .addIntegerOption((o) => o.setName("id").setDescription("ID de la subasta a consultar")),
    )
    .addSubcommand((s) =>
      s
        .setName("crear")
        .setDescription("Poner un objeto de tu inventario en subasta pública")
        .addStringOption((o) => o.setName("item").setDescription("Objeto a subastar").setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName("precio_salida").setDescription("Puja inicial (mínimo 10)").setRequired(true).setMinValue(10))
        .addIntegerOption((o) => o.setName("horas").setDescription("Duración en horas (1 a 72)").setRequired(true).setMinValue(1).setMaxValue(72))
        .addIntegerOption((o) => o.setName("cantidad").setDescription("Unidades del objeto (por defecto 1)").setMinValue(1)),
    )
    .addSubcommand((s) =>
      s
        .setName("pujar")
        .setDescription("Pujar por un lote en subasta")
        .addIntegerOption((o) => o.setName("id").setDescription("ID de la subasta").setRequired(true))
        .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad a pujar en nexocoins").setRequired(true).setMinValue(10)),
    )
    .addSubcommand((s) =>
      s
        .setName("cancelar")
        .setDescription("Cancelar una subasta sin pujas (o moderación)")
        .addIntegerOption((o) => o.setName("id").setDescription("ID de la subasta a cancelar").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("estatal")
        .setDescription("🏛️ (Staff) Lanzar una subasta oficial del Estado con quema total de fondos")
        .addStringOption((o) => o.setName("item").setDescription("Objeto a subastar").setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName("precio_salida").setDescription("Puja inicial (mínimo 100)").setRequired(true).setMinValue(100))
        .addIntegerOption((o) => o.setName("horas").setDescription("Duración en horas (1 a 72)").setRequired(true).setMinValue(1).setMaxValue(72))
        .addIntegerOption((o) => o.setName("cantidad").setDescription("Unidades del objeto (por defecto 1)").setMinValue(1)),
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
    const sub = interaction.options.getSubcommand(false);
    const q = focused.value.toLowerCase();

    if (sub === "estatal") {
      const { ITEMS_REGISTRY } = await import("../../modules/economy/items.js");
      const options = Object.values(ITEMS_REGISTRY)
        .filter((item) => !isUnsellableItem(interaction.guild.id, item.id))
        .map((item) => ({
          name: `${item.emoji} ${item.name} (${item.id})`.slice(0, 100),
          value: item.id,
        }))
        .filter((opt) => !q || opt.name.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q))
        .slice(0, 25);
      await interaction.respond(options);
      return;
    }

    const eco = getEco(interaction.guild.id, interaction.user.id);
    const inv = invOf(eco);

    const options = Object.entries(inv)
      .filter(([id, count]) => count > 0 && !isUnsellableItem(interaction.guild.id, id))
      .map(([id, count]) => {
        const def = getItemDef(id);
        const name = def ? `${def.emoji} ${def.name}` : id;
        return {
          name: `${name} (x${count})`.slice(0, 100),
          value: id,
        };
      })
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
    const gid = interaction.guild.id;

    if (sub === "ver") {
      const auctionId = interaction.options.getInteger("id");
      if (auctionId) {
        const auc = getAuction(auctionId);
        if (!auc || auc.guild_id !== gid) {
          await interaction.reply({ embeds: [errorEmbed("No encontrada", "Esa subasta no existe.")], ephemeral: true });
          return;
        }
        const left = Math.max(0, auc.ends_at - Date.now());
        const embed = baseEmbed(auc.closed ? COLORS.dark : COLORS.primary)
          .setTitle(`🔨 Subasta #${auc.id} · ${auc.item_name}`)
          .setDescription(`Lote de **${auc.quantity}× ${auc.item_name}** subastado por <@${auc.seller_id}>.`)
          .addFields(
            { name: "Puja actual", value: n(auc.current_bid), inline: true },
            { name: "Salida", value: n(auc.starting_bid), inline: true },
            {
              name: "Mayor postor",
              value: auc.highest_bidder_id ? `<@${auc.highest_bidder_id}>` : "*Sin pujas aún*",
              inline: true,
            },
            {
              name: "Estado",
              value: auc.closed || left <= 0 ? "🔴 Cerrada" : `🟢 Activa (cierra en **${formatDuration(left)}**)`,
              inline: true,
            },
            { name: "Cierre", value: timestamp(auc.ends_at, "R"), inline: true },
          )
          .setFooter({ text: `Usa /subasta pujar id:${auc.id} para superar la puja` });

        await interaction.reply({ embeds: [embed] });
        return;
      }

      const active = listActiveAuctions(gid);
      if (!active.length) {
        await interaction.reply({
          embeds: [infoEmbed("Subastas de Nexo", "No hay subastas activas en este momento.\nCrea una con `/subasta crear`.")],
          ephemeral: true,
        });
        return;
      }

      const embed = ecoEmbed("🔨 Subastas activas")
        .setDescription("Lotes actualmente disponibles. Puedes pujar usando `/subasta pujar id:<número>`.");

      for (const a of active.slice(0, 10)) {
        const left = Math.max(0, a.ends_at - Date.now());
        const bidder = a.highest_bidder_id ? `<@${a.highest_bidder_id}>` : "Nadie";
        embed.addFields({
          name: `#${a.id} — ${a.quantity}× ${a.item_name}`,
          value: `Puja actual: ${n(a.current_bid)} (${bidder})\nCierra en: **${formatDuration(left)}** · Vende: <@${a.seller_id}>`,
          inline: false,
        });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "crear") {
      const itemId = interaction.options.getString("item", true);
      const startingBid = interaction.options.getInteger("precio_salida", true);
      const hours = interaction.options.getInteger("horas", true);
      const qty = interaction.options.getInteger("cantidad") ?? 1;

      const res = createAuction({
        guildId: gid,
        sellerId: interaction.user.id,
        sellerTag: interaction.user.tag,
        itemId,
        quantity: qty,
        startingBid,
        durationHours: hours,
        channelId: interaction.channelId,
      });

      if (!res.ok || !res.auction) {
        await interaction.reply({ embeds: [errorEmbed("Error", res.error ?? "No se pudo crear la subasta.")], ephemeral: true });
        return;
      }

      const auc = res.auction;
      const embed = successEmbed("¡Nueva subasta abierta!", `Se ha puesto a subasta **${auc.quantity}× ${auc.item_name}**.`)
        .addFields(
          { name: "ID de Subasta", value: `#${auc.id}`, inline: true },
          { name: "Puja inicial", value: n(auc.starting_bid), inline: true },
          { name: "Duración", value: `${hours}h (finaliza ${timestamp(auc.ends_at, "R")})`, inline: true },
        )
        .setFooter({ text: `Para pujar usa: /subasta pujar id:${auc.id} cantidad:<valor>` });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "pujar") {
      const auctionId = interaction.options.getInteger("id", true);
      const amount = interaction.options.getInteger("cantidad", true);

      const res = placeBid({
        guildId: gid,
        auctionId,
        bidderId: interaction.user.id,
        bidderTag: interaction.user.tag,
        amount,
      });

      if (!res.ok || !res.auction) {
        await interaction.reply({ embeds: [errorEmbed("Puja rechazada", res.error ?? "No se pudo registrar la puja.")], ephemeral: true });
        return;
      }

      const auc = res.auction;
      const embed = ecoEmbed("¡Puja aceptada!")
        .setDescription(`Has tomado la delantera en la subasta **#${auc.id}** (**${auc.item_name}**).`)
        .addFields(
          { name: "Tu puja", value: n(auc.current_bid), inline: true },
          { name: "Finaliza", value: timestamp(auc.ends_at, "R"), inline: true },
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "cancelar") {
      const auctionId = interaction.options.getInteger("id", true);
      const member = interaction.member && "roles" in interaction.member ? (interaction.member as GuildMember) : null;
      const userIsStaff = member ? isStaff(member) : false;

      const res = cancelAuction({
        guildId: gid,
        auctionId,
        userId: interaction.user.id,
        isStaff: userIsStaff,
      });

      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("No se puede cancelar", res.error ?? "No se pudo cancelar.")], ephemeral: true });
        return;
      }

      await interaction.reply({ embeds: [successEmbed("Subasta cancelada", `La subasta #${auctionId} ha sido cerrada y el lote devuelto a su dueño.`)] });
      return;
    }

    if (sub === "estatal") {
      const member = interaction.member && "roles" in interaction.member ? (interaction.member as GuildMember) : null;
      if (!member || !isStaff(member)) {
        await interaction.reply({ embeds: [errorEmbed("Acceso Denegado", "Solo el personal del Staff puede iniciar subastas estatales del gobierno.")], ephemeral: true });
        return;
      }

      const itemId = interaction.options.getString("item", true);
      const startingBid = interaction.options.getInteger("precio_salida", true);
      const hours = interaction.options.getInteger("horas", true);
      const qty = interaction.options.getInteger("cantidad") ?? 1;

      const res = createAuction({
        guildId: gid,
        sellerId: "SYSTEM",
        sellerTag: "🏛️ Hacienda & Bienes Incautados",
        itemId,
        quantity: qty,
        startingBid,
        durationHours: hours,
        channelId: interaction.channelId,
      });

      if (!res.ok || !res.auction) {
        await interaction.reply({ embeds: [errorEmbed("Error", res.error ?? "No se pudo iniciar la subasta estatal.")], ephemeral: true });
        return;
      }

      const auc = res.auction;
      const embed = baseEmbed(COLORS.gold)
        .setTitle("🏛️ ¡SUBASTA PÚBLICA ESTATAL DE BIENES INCAUTADOS!")
        .setDescription(
          `La Administración Federal de Nexo ha puesto a subasta **${auc.quantity}× ${auc.item_name}**.\n\n` +
            `🔥 **AVISO DE QUEMA MONETARIA:**\n` +
            `El 100% de los fondos de la puja ganadora **serán destruidos de la economía** para combatir la inflación.\n\n` +
            `• **ID de Subasta:** \`#${auc.id}\`\n` +
            `• **Puja Inicial:** **${n(auc.starting_bid)}**\n` +
            `• **Cierre:** ${timestamp(auc.ends_at, "R")}`,
        )
        .setFooter({ text: `Puja con: /subasta pujar id:${auc.id} cantidad:<valor>` });

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};

export default command;
