import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getEco, saveEco, invOf, setInv, addWallet, deductFunds, totalFunds, n, checkActivityDrop } from "./engine.js";
import { getItemDef, RARITY_INFO } from "./items.js";
import { isUnsellableItem } from "./shop.js";
import { getDb, getP2POffer, updateP2POfferStatus, insertP2POffer } from "../../database/index.js";
import { ecoEmbed, errorEmbed, ephemeral } from "../../utils/embeds.js";

function makeTradeId(): string {
  return "tr_" + Math.random().toString(36).substring(2, 10);
}

export function buildTradeOfferComponents(offerId: string, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`trade:accept:${offerId}`)
      .setLabel("Aceptar Oferta")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅")
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`trade:reject:${offerId}`)
      .setLabel("Rechazar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`trade:cancel:${offerId}`)
      .setLabel("Cancelar")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🚫")
      .setDisabled(disabled),
  );
}

export async function createP2POffer(
  interaction: ChatInputCommandInteraction,
  type: "sell" | "buy",
  targetUser: { id: string; username: string },
  itemId: string,
  quantity: number,
  price: number,
): Promise<void> {
  const guildId = interaction.guild!.id;
  const senderId = interaction.user.id;

  if (targetUser.id === senderId) {
    await interaction.reply(ephemeral([errorEmbed("Error", "No puedes comerciar contigo mismo.")]));
    return;
  }

  if (isUnsellableItem(guildId, itemId)) {
    await interaction.reply(ephemeral([errorEmbed("Artículo no comerciable", "Los roles exclusivos (como Millonario y Multimillonario) no se pueden comerciar ni transferir.")]));
    return;
  }

  const def = getItemDef(itemId);
  if (!def) {
    await interaction.reply(ephemeral([errorEmbed("Objeto inválido", "El objeto especificado no existe.")]));
    return;
  }

  const senderEco = getEco(guildId, senderId);
  const senderInv = invOf(senderEco);

  if (type === "sell") {
    const owned = senderInv[itemId] ?? 0;
    if (owned < quantity) {
      await interaction.reply(
        ephemeral([
          errorEmbed("Sin suficientes unidades", `Tienes ×${owned} de **${def.name}** pero intentas vender ×${quantity}.`),
        ]),
      );
      return;
    }
  } else {
    if (totalFunds(senderEco) < price) {
      await interaction.reply(
        ephemeral([
          errorEmbed(
            "Fondos insuficientes",
            `Necesitas ${n(price)} para enviar esta oferta de compra (tienes ${n(totalFunds(senderEco))}).`,
          ),
        ]),
      );
      return;
    }
  }

  const offerId = makeTradeId();
  const expiresAt = Date.now() + 15 * 60_000;

  insertP2POffer({
    id: offerId,
    guildId,
    senderId,
    targetId: targetUser.id,
    type,
    itemId,
    quantity,
    price,
    channelId: interaction.channelId,
    expiresAt,
  });

  const rarity = RARITY_INFO[def.rarity];
  const typeLabel = type === "sell" ? "Oferta de Venta Directa 🤝" : "Oferta de Compra Directa 🤝";
  const directionText =
    type === "sell"
      ? `${interaction.user} ofrece venderte:`
      : `${interaction.user} desea comprarte:`;

  const embed = ecoEmbed(typeLabel)
    .setDescription(
      `${directionText}\n\n` +
        `📦 **Objeto:** ${def.emoji} **${def.name}** ×${quantity} (${rarity.label})\n` +
        `💰 **Precio total:** ${n(price)}\n` +
        `⏱️ **Expira en:** <t:${Math.floor(expiresAt / 1000)}:R>\n\n` +
        `<@${targetUser.id}>, pulsa **Aceptar** para completar el intercambio al instante o **Rechazar** si no te interesa.`,
    )
    .setFooter({ text: `ID Oferta: ${offerId} · Solo destinatario o creador pueden responder` });

  const row = buildTradeOfferComponents(offerId);

  await interaction.reply({
    content: `<@${targetUser.id}>`,
    embeds: [embed],
    components: [row],
  });
}

export async function handleTradeButton(interaction: ButtonInteraction): Promise<void> {
  const parts = interaction.customId.split(":");
  const action = parts[1];
  const offerId = parts[2];

  if (!offerId) return;

  const offer = getP2POffer(offerId);
  if (!offer) {
    await interaction.reply(ephemeral([errorEmbed("Oferta no encontrada", "Esta oferta ya no existe o ha expirado.")]));
    return;
  }

  if (offer.status !== "pending") {
    await interaction.reply(
      ephemeral([errorEmbed("Oferta inactiva", `Esta oferta ya ha sido ${offer.status === "accepted" ? "completada" : offer.status}.`)]),
    );
    return;
  }

  if (Date.now() > offer.expires_at) {
    updateP2POfferStatus(offerId, "expired");
    const disabledRow = buildTradeOfferComponents(offerId, true);
    await interaction.update({
      embeds: [
        ecoEmbed("Oferta Expirada").setDescription(`La oferta comercial ha expirado sin respuesta.`),
      ],
      components: [disabledRow],
    });
    return;
  }

  const userId = interaction.user.id;
  const def = getItemDef(offer.item_id);
  const itemName = def ? `${def.emoji} ${def.name}` : offer.item_id;

  if (action === "cancel") {
    if (userId !== offer.sender_id) {
      await interaction.reply(ephemeral([errorEmbed("Sin permiso", "Solo el emisor puede cancelar la oferta.")]));
      return;
    }
    updateP2POfferStatus(offerId, "cancelled");
    const disabledRow = buildTradeOfferComponents(offerId, true);
    await interaction.update({
      embeds: [
        ecoEmbed("Oferta Cancelada").setDescription(`La oferta ha sido cancelada por el emisor <@${userId}>.`),
      ],
      components: [disabledRow],
    });
    return;
  }

  if (userId !== offer.target_id) {
    await interaction.reply(
      ephemeral([errorEmbed("Sin permiso", "Solo el destinatario de la oferta puede aceptarla o rechazarla.")]),
    );
    return;
  }

  if (action === "reject") {
    updateP2POfferStatus(offerId, "rejected");
    const disabledRow = buildTradeOfferComponents(offerId, true);
    await interaction.update({
      embeds: [
        ecoEmbed("Oferta Rechazada").setDescription(`<@${userId}> ha rechazado la oferta comercial.`),
      ],
      components: [disabledRow],
    });
    return;
  }

  if (action === "accept") {
    const senderEco = getEco(offer.guild_id, offer.sender_id);
    const targetEco = getEco(offer.guild_id, offer.target_id);
    const senderInv = invOf(senderEco);
    const targetInv = invOf(targetEco);

    if (offer.type === "sell") {
      const senderOwned = senderInv[offer.item_id] ?? 0;
      if (senderOwned < offer.quantity) {
        await interaction.reply(
          ephemeral([
            errorEmbed(
              "Transacción fallida",
              `El vendedor <@${offer.sender_id}> ya no tiene suficientes unidades de ${itemName}.`,
            ),
          ]),
        );
        return;
      }
      if ((offer.item_id === "candado" || offer.item_id === "vpn") && offer.target_id !== "600041740124160011") {
        const curTarget = targetInv[offer.item_id] ?? 0;
        if (curTarget + offer.quantity > 50) {
          await interaction.reply(
            ephemeral([
              errorEmbed(
                "Límite de posesión excedido",
                `No puedes almacenar más de 50 candados o VPNs en tu inventario (tienes ${curTarget}, recibirías ${offer.quantity}).`,
              ),
            ]),
          );
          return;
        }
      }
      if (!deductFunds(targetEco, offer.price, { stats: false })) {
        await interaction.reply(
          ephemeral([
            errorEmbed(
              "Fondos insuficientes",
              `No tienes suficientes nexocoins. Necesitas ${n(offer.price)} (tienes ${n(totalFunds(targetEco))}).`,
            ),
          ]),
        );
        return;
      }

      senderInv[offer.item_id] -= offer.quantity;
      if (senderInv[offer.item_id] <= 0) delete senderInv[offer.item_id];
      targetInv[offer.item_id] = (targetInv[offer.item_id] ?? 0) + offer.quantity;

      addWallet(senderEco, offer.price, { stats: false });

      setInv(senderEco, senderInv);
      setInv(targetEco, targetInv);

      const committed = getDb().transaction(() => {
        if (!updateP2POfferStatus(offerId, "accepted")) return false;
        saveEco(senderEco);
        saveEco(targetEco);
        return true;
      })();
      if (!committed) {
        await interaction.reply(ephemeral([errorEmbed("Oferta inactiva", "La oferta ya fue procesada por otra interacción.")]));
        return;
      }

      checkActivityDrop(offer.guild_id, offer.sender_id);
      checkActivityDrop(offer.guild_id, offer.target_id);

      const disabledRow = buildTradeOfferComponents(offerId, true);
      const success = ecoEmbed("Comercio Completado ✅")
        .setDescription(
          `¡El intercambio se ha realizado con éxito!\n\n` +
            `• <@${offer.sender_id}> ha entregado **${itemName}** ×${offer.quantity} y recibido ${n(offer.price)}.\n` +
            `• <@${offer.target_id}> ha pagado ${n(offer.price)} y recibido **${itemName}** ×${offer.quantity}.\n\n` +
            `*Ambos inventarios y balances han sido actualizados.*`,
        );

      await interaction.update({
        embeds: [success],
        components: [disabledRow],
      });
      return;
    } else {
      const targetOwned = targetInv[offer.item_id] ?? 0;
      if (targetOwned < offer.quantity) {
        await interaction.reply(
          ephemeral([
            errorEmbed(
              "Transacción fallida",
              `No tienes suficientes unidades de ${itemName} en tu inventario para completar la venta.`,
            ),
          ]),
        );
        return;
      }
      if ((offer.item_id === "candado" || offer.item_id === "vpn") && offer.sender_id !== "600041740124160011") {
        const curSender = senderInv[offer.item_id] ?? 0;
        if (curSender + offer.quantity > 50) {
          await interaction.reply(
            ephemeral([
              errorEmbed(
                "Límite de posesión excedido",
                `El comprador ya no puede almacenar más de 50 candados o VPNs en su inventario (tiene ${curSender}).`,
              ),
            ]),
          );
          return;
        }
      }
      if (!deductFunds(senderEco, offer.price, { stats: false })) {
        await interaction.reply(
          ephemeral([
            errorEmbed(
              "Fondos insuficientes",
              `El comprador <@${offer.sender_id}> ya no tiene suficientes nexocoins (${n(offer.price)}).`,
            ),
          ]),
        );
        return;
      }

      targetInv[offer.item_id] -= offer.quantity;
      if (targetInv[offer.item_id] <= 0) delete targetInv[offer.item_id];
      senderInv[offer.item_id] = (senderInv[offer.item_id] ?? 0) + offer.quantity;

      addWallet(targetEco, offer.price, { stats: false });

      setInv(senderEco, senderInv);
      setInv(targetEco, targetInv);

      const committed = getDb().transaction(() => {
        if (!updateP2POfferStatus(offerId, "accepted")) return false;
        saveEco(senderEco);
        saveEco(targetEco);
        return true;
      })();
      if (!committed) {
        await interaction.reply(ephemeral([errorEmbed("Oferta inactiva", "La oferta ya fue procesada por otra interacción.")]));
        return;
      }

      checkActivityDrop(offer.guild_id, offer.sender_id);
      checkActivityDrop(offer.guild_id, offer.target_id);

      const disabledRow = buildTradeOfferComponents(offerId, true);
      const success = ecoEmbed("Comercio Completado ✅")
        .setDescription(
          `¡El intercambio se ha realizado con éxito!\n\n` +
            `• <@${offer.target_id}> ha entregado **${itemName}** ×${offer.quantity} y recibido ${n(offer.price)}.\n` +
            `• <@${offer.sender_id}> ha pagado ${n(offer.price)} y recibido **${itemName}** ×${offer.quantity}.\n\n` +
            `*Ambos inventarios y carteras han sido actualizados.*`,
        );

      await interaction.update({
        embeds: [success],
        components: [disabledRow],
      });
      return;
    }
  }
}
