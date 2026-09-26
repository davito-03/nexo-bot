import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type Guild,
  type GuildMember,
  type Message,
  type StringSelectMenuInteraction,
} from "discord.js";
import {
  COLORS,
  NEXO_OWNER_ROLE_ID,
  NEXO_STAFF_ROLE_ID,
  STORE_ORDER_LOGS_CHANNEL_ID,
  STORE_ORDERS_CATEGORY_ID,
  STORE_PANEL_CHANNEL_ID,
  STORE_PAYMENTS_CHANNEL_ID,
} from "../../constants.js";
import { getDb } from "../../database/index.js";
import { logger } from "../../logger.js";
import { getProductById, STORE_PAYMENT_METHODS, STORE_PRODUCTS } from "./catalog.js";
import { renderOrderTranscriptHtml, saveOrderTranscript } from "./transcript.js";
import type { StoreOrderMessageRow, StoreOrderRow } from "./types.js";
import { isStaff } from "../../utils/permissions.js";

export function getOrderByChannel(channelId: string): StoreOrderRow | undefined {
  return getDb().prepare("SELECT * FROM store_orders WHERE channel_id = ?").get(channelId) as
    | StoreOrderRow
    | undefined;
}

export function getOrderById(orderId: number): StoreOrderRow | undefined {
  return getDb().prepare("SELECT * FROM store_orders WHERE id = ?").get(orderId) as StoreOrderRow | undefined;
}

export function getActiveOrderByUser(guildId: string, userId: string): StoreOrderRow | undefined {
  return getDb()
    .prepare("SELECT * FROM store_orders WHERE guild_id = ? AND user_id = ? AND status IN ('open', 'claimed')")
    .get(guildId, userId) as StoreOrderRow | undefined;
}

export function buildStorePanelEmbed(): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🛒 Nexo Store · Tu Tienda Digital de Confianza")
    .setDescription(
      [
        "¡Bienvenido/a a la tienda digital oficial de **Nexo**! Aquí puedes adquirir suscripciones, cuentas y servicios al mejor precio del mercado con total seguridad y rapidez.",
        "",
        "### 📦 Catálogo de Productos Disponibles",
        "",
        "• <a:pepe_nitro:1546336734311354368> **Discord Nitro**",
        "  └ 1 mes: **8€** · 1 año: **55€**",
        "",
        "• <a:spotify:1547019197882826862> **Spotify Premium**",
        "  ├ **Individual:** 1m (**7€**) · 3m (**15€**) · 6m (**24€**) · 12m (**40€**)",
        "  ├ **Duo:** 1m (**10€**) · 3m (**18€**) · 6m (**32€**) · 12m (**60€**)",
        "  └ **Familiar:** 1m (**13€**) · 3m (**30€**) · 6m (**55€**) · 12m (**80€**)",
        "",
        "• <a:Netflix:1547021588057301022> **Netflix**",
        "  └ 1 usuario: **4€/mes** · 1 cuenta completa (5 personas): **15€/mes**",
        "",
        "• <:Gemini:1547022741192835072> **Google Gemini Pro**",
        "  └ 6 meses: **10€** · 18 meses: **20€**",
        "",
        "• <:crunchyroll:1547033042894459041> **Crunchyroll MegaFan**",
        "  └ 1 mes: **6€** · 12 meses: **36€**",
        "",
        "• 🔐 **VPNs de Alta Seguridad**",
        "  ├ **Proton VPN:** Comp. 1m (**2.50€**) · Full 1m (**3€**) · Comp. 12m (**20€**) · Full 12m (**30€**)",
        "  └ **ExpressVPN:** Full 1m (**5€**) · Full 3m (**11€**) · Full 12m (**35€**)",
        "",
        "• <:bitwarden:1547050794082377839> **Bitwarden Premium**",
        "  └ Acceso permanente (Lifetime): **5€**",
        "",
        "─────────────",
        "💳 **Métodos de pago:** Criptos, Revolut, PayPal (F&F), Western Union.",
        "✨ **Garantía y Confianza:** Entrega rápida y soporte personalizado por el Staff.",
        "👇 **Para realizar tu compra, selecciona el producto en el menú inferior.**",
      ].join("\n"),
    )
    .setFooter({ text: "Nexo Store · Selecciona un producto para abrir tu pedido privado" })
    .setTimestamp();

  return embed;
}

export function buildStorePanelComponents(): ActionRowBuilder<StringSelectMenuBuilder>[] {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("store:order_product")
    .setPlaceholder("🛍️ Selecciona el producto que deseas pedir...")
    .addOptions(
      STORE_PRODUCTS.map((p) => {
        const option: any = {
          label: p.name,
          value: p.id,
          description: p.shortDesc.slice(0, 100),
        };
        // Discord supports custom emoji object or string emoji if valid
        const match = p.emoji.match(/<a?:(\w+):(\d+)>/);
        if (match) {
          option.emoji = { name: match[1], id: match[2] };
        } else {
          option.emoji = p.emoji;
        }
        return option;
      }),
    );

  return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)];
}

export function buildPaymentMethodsEmbed(): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("💳 Métodos de Pago Disponibles")
    .setDescription(
      [
        "En **Nexo Store** ponemos a tu disposición los siguientes métodos de pago seguros y directos:",
        "",
        "• <:crypto:1547047760484892773> **Criptomonedas**",
        "  └ Aceptamos USDT (TRC20 / BEP20 / Polygon), BTC, LTC, SOL y más. Solicita la dirección de wallet dentro de tu pedido.",
        "",
        "• <:revolut:1546336620645580801> **Revolut**",
        "  └ Transferencia instantánea por Revtag o enlace directo de pago sin comisiones.",
        "",
        "• <:paypal:1546336762459328562> **PayPal (Amigos y Familiares)**",
        "  └ El envío debe realizarse estrictamente en la modalidad **Amigos y Familiares** para evitar retenciones comerciales.",
        "",
        "• <:wu:1547381385218629703> **Western Union**",
        "  └ Transferencias directas internacionales o en efectivo.",
        "",
        "─────────────",
        "📌 **¿Cómo pagar?** Abre un pedido en <#1547010485407457414> con el producto que quieras y un miembro del Staff te facilitará los datos exactos del método que elijas.",
      ].join("\n"),
    )
    .setFooter({ text: "Nexo Store · Métodos de Pago Oficiales" })
    .setTimestamp();

  return embed;
}

export function buildOrderActionButtons(orderId: number, claimedBy: string | null) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`order:claim:${orderId}`)
      .setLabel(claimedBy ? "Reclamado" : "Reclamar Pedido")
      .setStyle(claimedBy ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(Boolean(claimedBy)),
    new ButtonBuilder()
      .setCustomId(`order:payinfo:${orderId}`)
      .setLabel("Métodos de Pago")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("💳"),
    new ButtonBuilder()
      .setCustomId(`order:complete:${orderId}`)
      .setLabel("Completar")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`order:close:${orderId}`)
      .setLabel("Cerrar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒"),
  );
  return row;
}

export function buildPlanSelectRow(orderId: number, product: ReturnType<typeof getProductById>) {
  if (!product || product.plans.length <= 1) return null;

  const select = new StringSelectMenuBuilder()
    .setCustomId(`order:plan:${orderId}`)
    .setPlaceholder("📌 Selecciona tu plan exacto aquí...")
    .addOptions(
      product.plans.slice(0, 25).map((pl) => ({
        label: pl.name,
        value: pl.id,
        description: `Precio: ${pl.price}`,
        emoji: "🏷️",
      })),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

export async function openOrderTicket(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const guild = interaction.guild;
  const productId = interaction.values[0];
  const product = getProductById(productId);

  if (!product) {
    await interaction.reply({ content: "Producto no válido.", ephemeral: true });
    return;
  }

  const existing = getActiveOrderByUser(guild.id, interaction.user.id);
  if (existing?.channel_id) {
    await interaction.reply({
      content: `Ya tienes un pedido activo abierto en <#${existing.channel_id}>. Por favor, completa o cierra ese pedido antes de abrir uno nuevo.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const sanitizedUser = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "");
  const channelName = `pedido-${product.id}-${sanitizedUser}`.slice(0, 80);

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: STORE_ORDERS_CATEGORY_ID,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: NEXO_STAFF_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: NEXO_OWNER_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: guild.members.me!.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
    ],
    reason: `Pedido de ${product.name} para ${interaction.user.tag}`,
  });

  const defaultPlan = product.plans[0];
  const info = getDb()
    .prepare(
      `INSERT INTO store_orders (guild_id, channel_id, user_id, product_id, product_name, plan_name, price, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    )
    .run(
      guild.id,
      channel.id,
      interaction.user.id,
      product.id,
      product.name,
      defaultPlan?.name || null,
      defaultPlan?.price || null,
      Date.now(),
    );

  const orderId = Number(info.lastInsertRowid);

  const plansText = product.plans.map((pl) => `• **${pl.name}**: \`${pl.price}\``).join("\n");
  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📦 Pedido #${orderId} · ${product.name}`)
    .setDescription(
      [
        `Hola ${interaction.user}, ¡gracias por tu pedido en **Nexo Store**!`,
        "",
        `Has seleccionado: **${product.name}**`,
        "",
        "### 📋 Planes y Tarifas Disponibles:",
        plansText,
        "",
        "### 💳 Métodos de Pago:",
        "<:crypto:1547047760484892773> Criptos · <:revolut:1546336620645580801> Revolut · <:paypal:1546336762459328562> PayPal (F&F) · <:wu:1547381385218629703> Western Union",
        "",
        "─────────────",
        "**Instrucciones:**",
        "1. Selecciona el **plan exacto** en el menú desplegable de abajo (si aplica).",
        "2. Escribe en este chat cuál de los **métodos de pago** prefieres utilizar.",
        "3. Un miembro del Staff reclamará el pedido para facilitarte las instrucciones y enviarte tu producto.",
      ].join("\n"),
    )
    .addFields(
      { name: "Cliente", value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
      { name: "Producto", value: product.name, inline: true },
      { name: "Estado", value: "🟡 Pendiente de atención", inline: true },
    )
    .setFooter({ text: "Nexo Store · Soporte y Entrega Rápida" })
    .setTimestamp();

  const components: any[] = [];
  const planRow = buildPlanSelectRow(orderId, product);
  if (planRow) components.push(planRow);
  components.push(buildOrderActionButtons(orderId, null));

  await channel.send({
    content: `${interaction.user} · <@&${NEXO_STAFF_ROLE_ID}>`,
    embeds: [welcomeEmbed],
    components,
  });

  await interaction.editReply({
    content: `✅ Se ha abierto tu pedido para **${product.name}**: <#${channel.id}>`,
  });

  // Log to STORE_ORDER_LOGS_CHANNEL_ID
  await logOrderEvent(guild, {
    title: `📦 Nuevo Pedido Abierto #${orderId}`,
    color: COLORS.info,
    fields: [
      { name: "Cliente", value: `${interaction.user} (\`${interaction.user.tag}\` · \`${interaction.user.id}\`)`, inline: true },
      { name: "Producto", value: `${product.name}`, inline: true },
      { name: "Canal", value: `<#${channel.id}>`, inline: true },
    ],
  });
}

export async function handleStoreButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const parts = interaction.customId.split(":");
  const action = parts[1];
  const orderId = Number(parts[2]);

  const order = orderId ? getOrderById(orderId) : getOrderByChannel(interaction.channelId);
  if (!order) {
    await interaction.reply({ content: "Este canal no corresponde a un pedido activo.", ephemeral: true });
    return;
  }

  const member = interaction.member as GuildMember;
  const isStaffMember =
    isStaff(member) ||
    member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    member.roles.cache.has(NEXO_STAFF_ROLE_ID) ||
    member.roles.cache.has(NEXO_OWNER_ROLE_ID);

  if (action === "payinfo") {
    await interaction.reply({
      embeds: [buildPaymentMethodsEmbed()],
      ephemeral: true,
    });
    return;
  }

  if (action === "claim") {
    if (!isStaffMember) {
      await interaction.reply({ content: "Solo el personal del Staff puede reclamar pedidos.", ephemeral: true });
      return;
    }
    if (order.claimed_by) {
      await interaction.reply({ content: `Este pedido ya fue reclamado por <@${order.claimed_by}>.`, ephemeral: true });
      return;
    }

    getDb()
      .prepare("UPDATE store_orders SET claimed_by = ?, status = 'claimed' WHERE id = ?")
      .run(member.id, order.id);

    const product = getProductById(order.product_id);
    const components: any[] = [];
    const planRow = buildPlanSelectRow(order.id, product);
    if (planRow) components.push(planRow);
    components.push(buildOrderActionButtons(order.id, member.id));

    // Update message components if possible
    await interaction.update({ components }).catch(() => null);

    if (interaction.channel?.isTextBased() && "send" in interaction.channel) {
      await interaction.channel.send({
        content: `🛡️ ${member} ha reclamado este pedido y te atenderá personalmente.`,
      });
    }

    await logOrderEvent(interaction.guild, {
      title: `🛎️ Pedido #${order.id} Reclamado`,
      color: COLORS.warn,
      fields: [
        { name: "Staff a cargo", value: `${member} (\`${member.user.tag}\`)`, inline: true },
        { name: "Cliente", value: `<@${order.user_id}>`, inline: true },
        { name: "Producto", value: order.product_name, inline: true },
      ],
    });
    return;
  }

  if (action === "complete") {
    if (!isStaffMember) {
      await interaction.reply({ content: "Solo el personal del Staff puede marcar un pedido como completado.", ephemeral: true });
      return;
    }

    getDb().prepare("UPDATE store_orders SET status = 'completed' WHERE id = ?").run(order.id);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle(`✅ Pedido #${order.id} Completado y Entregado`)
          .setDescription(
            `El pedido de **${order.product_name}** ha sido completado con éxito por ${member}.\n\n¡Gracias por confiar en **Nexo Store**! El Staff cerrará el pedido una vez finalizado el proceso.`,
          )
          .setTimestamp(),
      ],
    });

    await logOrderEvent(interaction.guild, {
      title: `✅ Pedido #${order.id} Completado con Éxito`,
      color: COLORS.success,
      fields: [
        { name: "Cliente", value: `<@${order.user_id}>`, inline: true },
        { name: "Producto", value: order.product_name, inline: true },
        { name: "Plan / Precio", value: `${order.plan_name || "—"} (${order.price || "—"})`, inline: true },
        { name: "Staff que entregó", value: `${member} (\`${member.user.tag}\`)`, inline: true },
      ],
    });
    return;
  }

  if (action === "close") {
    if (!isStaffMember) {
      await interaction.reply({ content: "Solo el personal del Staff puede cerrar este pedido.", ephemeral: true });
      return;
    }

    await interaction.reply({ content: "⏳ Generando transcripción y cerrando el pedido..." });
    await closeOrder(order, member, "Cerrado por el staff");
  }
}

export async function handleStoreSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  if (interaction.customId === "store:order_product") {
    await openOrderTicket(interaction);
    return;
  }

  if (interaction.customId.startsWith("order:plan:")) {
    const orderId = Number(interaction.customId.split(":")[2]);
    const order = getOrderById(orderId);
    if (!order) {
      await interaction.reply({ content: "Pedido no encontrado.", ephemeral: true });
      return;
    }

    const planId = interaction.values[0];
    const product = getProductById(order.product_id);
    const plan = product?.plans.find((p) => p.id === planId);

    if (!plan) {
      await interaction.reply({ content: "Plan inválido.", ephemeral: true });
      return;
    }

    getDb()
      .prepare("UPDATE store_orders SET plan_name = ?, price = ? WHERE id = ?")
      .run(plan.name, plan.price, order.id);

    await interaction.reply({
      content: `📌 Has seleccionado el plan: **${plan.name}** por un valor de **${plan.price}**. Un staff te indicará los pasos de pago.`,
    });
  }
}

export async function closeOrder(order: StoreOrderRow, closer: GuildMember, reason: string): Promise<void> {
  const guild = closer.guild;
  const channel = order.channel_id ? guild.channels.cache.get(order.channel_id) : null;

  const msgs = getDb()
    .prepare("SELECT * FROM store_order_messages WHERE order_id = ? ORDER BY created_at ASC")
    .all(order.id) as StoreOrderMessageRow[];

  const html = renderOrderTranscriptHtml(guild.name, order, msgs);
  const transcriptFile = saveOrderTranscript(guild.id, order.id, html);

  getDb()
    .prepare("UPDATE store_orders SET status = 'closed', closed_at = ?, close_reason = ? WHERE id = ?")
    .run(Date.now(), reason, order.id);

  const logCh = guild.channels.cache.get(STORE_ORDER_LOGS_CHANNEL_ID);
  if (logCh?.isTextBased() && "send" in logCh) {
    const staffUser = order.claimed_by ? await guild.client.users.fetch(order.claimed_by).catch(() => null) : null;
    const staffDisplay = staffUser ? `**${staffUser.tag}** (\`${order.claimed_by}\`)` : order.claimed_by ? `\`${order.claimed_by}\`` : "Nadie";
    const closeEmbed = new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle(`🔒 Registro de Pedido Cerrado #${order.id}`)
      .setDescription(`El pedido ha sido cerrado y archivado con transcripción.`)
      .addFields(
        { name: "Cliente", value: `<@${order.user_id}> (\`${order.user_id}\`)`, inline: true },
        { name: "Producto", value: order.product_name, inline: true },
        { name: "Plan / Precio", value: `${order.plan_name || "—"} (${order.price || "—"})`, inline: true },
        { name: "Atendido por", value: staffDisplay, inline: true },
        { name: "Cerrado por", value: `**${closer.user.tag}** (\`${closer.user.id}\`)`, inline: true },
        { name: "Mensajes totales", value: `${msgs.length}`, inline: true },
      )
      .setTimestamp();

    await logCh
      .send({
        embeds: [closeEmbed],
        files: [{ attachment: transcriptFile, name: `pedido-${order.id}.html` }],
        allowedMentions: { parse: [] },
      })
      .catch((err) => logger.error("No se pudo enviar log de pedido cerrado", err));
  }

  if (channel?.isTextBased() && "send" in channel) {
    await channel.send("🔒 Pedido cerrado con éxito. Este canal se autodestruirá en 5 segundos...").catch(() => null);
    setTimeout(() => {
      if ("delete" in channel) void channel.delete("Pedido cerrado").catch(() => null);
    }, 5000);
  }
}

export async function handleStoreOrderMessage(message: Message): Promise<void> {
  if (!message.inGuild()) return;
  const order = getOrderByChannel(message.channelId);
  if (!order || order.status === "closed") return;

  getDb()
    .prepare(
      `INSERT INTO store_order_messages (order_id, author_id, author_tag, content, attachments, created_at, is_bot)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      order.id,
      message.author.id,
      message.author.tag,
      message.content,
      JSON.stringify([...message.attachments.values()].map((a) => a.url)),
      Date.now(),
      message.author.bot ? 1 : 0,
    );
}

async function logOrderEvent(
  guild: Guild,
  data: { title: string; color: number; fields: { name: string; value: string; inline?: boolean }[] },
): Promise<void> {
  const logCh = guild.channels.cache.get(STORE_ORDER_LOGS_CHANNEL_ID);
  if (logCh?.isTextBased() && "send" in logCh) {
    const embed = new EmbedBuilder()
      .setColor(data.color)
      .setTitle(data.title)
      .addFields(data.fields)
      .setTimestamp();
    await logCh.send({ embeds: [embed] }).catch((err) => logger.error("logOrderEvent error", err));
  }
}
