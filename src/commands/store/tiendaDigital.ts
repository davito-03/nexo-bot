import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import {
  STORE_ORDERS_CATEGORY_ID,
  STORE_PANEL_CHANNEL_ID,
  STORE_PAYMENTS_CHANNEL_ID,
} from "../../constants.js";
import {
  buildPaymentMethodsEmbed,
  buildStorePanelComponents,
  buildStorePanelEmbed,
} from "../../modules/store/manager.js";
import type { Command } from "../../types/index.js";
import { errorEmbed, successEmbed } from "../../utils/embeds.js";
import { requireStaff } from "../../utils/permissions.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("tienda-digital")
    .setDescription("Gestión y despliegue de la tienda digital de Nexo")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((s) =>
      s
        .setName("panel")
        .setDescription("Publica o refresca el panel interactivo de productos en el canal de la tienda"),
    )
    .addSubcommand((s) =>
      s
        .setName("pagos")
        .setDescription("Publica o actualiza el mensaje de métodos de pago oficiales"),
    )
    .addSubcommand((s) =>
      s
        .setName("setup")
        .setDescription("Publica el panel y actualiza los métodos de pago en sus canales oficiales"),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const staff = await requireStaff(interaction);
    if (!staff) return;

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    if (sub === "panel" || sub === "setup") {
      const panelChannel = guild.channels.cache.get(STORE_PANEL_CHANNEL_ID);
      if (!panelChannel || !panelChannel.isTextBased()) {
        await interaction.reply({
          embeds: [errorEmbed("Error", `No se encontró el canal de productos <#${STORE_PANEL_CHANNEL_ID}>.`)],
          ephemeral: true,
        });
        return;
      }

      await panelChannel.send({
        embeds: [buildStorePanelEmbed()],
        components: buildStorePanelComponents(),
      });
    }

    if (sub === "pagos" || sub === "setup") {
      const paymentsChannel = guild.channels.cache.get(STORE_PAYMENTS_CHANNEL_ID);
      if (!paymentsChannel || !paymentsChannel.isTextBased()) {
        await interaction.reply({
          embeds: [errorEmbed("Error", `No se encontró el canal de pagos <#${STORE_PAYMENTS_CHANNEL_ID}>.`)],
          ephemeral: true,
        });
        return;
      }

      // Fetch messages in payments channel to remove any prior messages from user or bot
      const oldMsgs = await paymentsChannel.messages.fetch({ limit: 15 }).catch(() => null);
      if (oldMsgs && oldMsgs.size > 0) {
        for (const [, msg] of oldMsgs) {
          await msg.delete().catch(() => null);
        }
      }

      await paymentsChannel.send({
        embeds: [buildPaymentMethodsEmbed()],
      });
    }

    const desc =
      sub === "panel"
        ? `Panel de la tienda publicado con éxito en <#${STORE_PANEL_CHANNEL_ID}>.`
        : sub === "pagos"
        ? `Métodos de pago actualizados con éxito en <#${STORE_PAYMENTS_CHANNEL_ID}>.`
        : `Panel publicado en <#${STORE_PANEL_CHANNEL_ID}> y métodos de pago actualizados en <#${STORE_PAYMENTS_CHANNEL_ID}>.`;

    await interaction.reply({
      embeds: [successEmbed("Tienda Digital", desc)],
      ephemeral: true,
    });
  },
};

export default command;
