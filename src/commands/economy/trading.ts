import { SlashCommandBuilder, type AutocompleteInteraction, type ChatInputCommandInteraction } from "discord.js";
import { baseEmbed, ecoEmbed, errorEmbed, infoEmbed, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import {
  buyAsset,
  getAllAssets,
  getAsset,
  getCurrentMarketEvent,
  getUserPortfolio,
  renderSparkline,
  sellAsset,
  topTradingPortfolios,
} from "../../modules/economy/trading.js";
import { getEco, n } from "../../modules/economy/engine.js";
import { COMPANY_DIVIDEND_RATES, getEstimatedUserDailyDividends } from "../../modules/economy/passive.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("trading")
    .setDescription("Simulador de trading de criptomonedas, metales y acciones")
    .addSubcommand((s) => s.setName("mercado").setDescription("Ver cotizaciones actuales del mercado"))
    .addSubcommand((s) =>
      s
        .setName("comprar")
        .setDescription("Comprar un activo con nexocoins")
        .addStringOption((o) => o.setName("activo").setDescription("Activo a comprar").setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName("monedas").setDescription("Cantidad de nexocoins a invertir"))
        .addNumberOption((o) => o.setName("unidades").setDescription("O número exacto de unidades del activo")),
    )
    .addSubcommand((s) =>
      s
        .setName("vender")
        .setDescription("Vender un activo a precio de mercado")
        .addStringOption((o) => o.setName("activo").setDescription("Activo a vender").setRequired(true).setAutocomplete(true))
        .addNumberOption((o) => o.setName("unidades").setDescription("Unidades a vender (−1 = vender todas)").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("cartera")
        .setDescription("Ver tu cartera de inversiones o la de otro usuario")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario")),
    )
    .addSubcommand((s) => s.setName("dividendos").setDescription("Información y cobro de dividendos diarios (12:00)"))
    .addSubcommand((s) => s.setName("top").setDescription("Ranking de los mayores inversores del servidor")),
  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.respond([]);
      return;
    }
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "activo") {
      await interaction.respond([]);
      return;
    }
    const q = focused.value.toLowerCase();
    const assets = getAllAssets();
    const options = assets
      .filter((a) => !q || a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q) || a.asset_id.includes(q))
      .slice(0, 25)
      .map((a) => ({
        name: `${a.symbol} · ${a.name} — ${a.current_price.toLocaleString("es-ES")} nexocoins`,
        value: a.asset_id,
      }));
    await interaction.respond(options);
  },
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === "mercado") {
      const assets = getAllAssets();
      const embed = baseEmbed(COLORS.primary)
        .setTitle("📈 Nexo Exchange · Mercado Financiero")
        .setDescription("Cotizaciones en vivo simuladas. Los precios fluctúan periódicamente.")
        .setFooter({ text: "Compra con /trading comprar · Vende con /trading vender" });

      const marketEvent = getCurrentMarketEvent();
      if (marketEvent) {
        const icon = marketEvent.sentiment === "positive" ? "📈" : "📉";
        const sign = marketEvent.impactPct >= 0 ? "+" : "";
        embed.addFields({
          name: `${icon} Evento activo: ${marketEvent.title}`,
          value: `${marketEvent.description}\nImpacto: **${sign}${(marketEvent.impactPct * 100).toFixed(0)}%** en ${marketEvent.targetLabel}. Expira <t:${Math.floor(marketEvent.expiresAt / 1000)}:R>.`,
          inline: false,
        });
      }

      const groups: Record<string, typeof assets> = {
        "🪙 Criptomonedas": assets.filter((a) => a.type === "cripto"),
        "🥇 Materias Primas": assets.filter((a) => a.type === "metal"),
        "🏢 Acciones de Empresas": assets.filter((a) => a.type === "empresa"),
      };

      for (const [title, list] of Object.entries(groups)) {
        if (!list.length) continue;
        const lines = list.map((a) => {
          let hist: number[] = [];
          try {
            hist = JSON.parse(a.history || "[]");
          } catch {
            hist = [];
          }
          const spark = renderSparkline(hist);
          const diff = a.open_24h_price > 0 ? ((a.current_price - a.open_24h_price) / a.open_24h_price) * 100 : 0;
          const sign = diff >= 0 ? "+" : "";
          const colorEmoji = diff >= 0 ? "🟢" : "🔴";
          return `**${a.symbol}** (\`${a.name}\`): **${a.current_price.toLocaleString("es-ES")}** 🪙 ${colorEmoji} \`${sign}${diff.toFixed(2)}%\`\n\`[${spark}]\``;
        });
        embed.addFields({ name: title, value: lines.join("\n\n") });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "comprar") {
      const assetId = interaction.options.getString("activo", true);
      const spend = interaction.options.getInteger("monedas");
      const units = interaction.options.getNumber("unidades");

      if (!spend && !units) {
        await interaction.reply({
          embeds: [errorEmbed("Datos incompletos", "Debes indicar cuántas `monedas` quieres invertir o el número de `unidades` a comprar.")],
          ephemeral: true,
        });
        return;
      }

      const res = buyAsset(gid, interaction.user.id, assetId, {
        spend: spend ?? undefined,
        qty: units ?? undefined,
      });

      if (!res.ok || !res.asset) {
        await interaction.reply({ embeds: [errorEmbed("Operación rechazada", res.error ?? "No se pudo completar la compra.")], ephemeral: true });
        return;
      }

      const embed = successEmbed("Orden de compra ejecutada", `Has comprado **${res.boughtQty?.toFixed(4)} ${res.asset.symbol}** (${res.asset.name}).`)
        .addFields(
          { name: "Inversión total", value: n(res.cost ?? 0), inline: true },
          { name: "Precio de ejecución", value: `${res.asset.current_price.toLocaleString("es-ES")} nexocoins / ${res.asset.symbol}`, inline: true },
        )
        .setFooter({ text: "Consulta tu cartera con /trading cartera" });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "vender") {
      const assetId = interaction.options.getString("activo", true);
      const units = interaction.options.getNumber("unidades", true);

      const res = sellAsset(gid, interaction.user.id, assetId, units);
      if (!res.ok || !res.asset) {
        await interaction.reply({ embeds: [errorEmbed("Operación rechazada", res.error ?? "No se pudo completar la venta.")], ephemeral: true });
        return;
      }

      const pnl = res.pnl ?? 0;
      const pnlStr = pnl >= 0 ? `+${n(pnl)} 🟢 (Ganancia)` : `${n(pnl)} 🔴 (Pérdida)`;

      const embed = ecoEmbed("Orden de venta ejecutada")
        .setDescription(`Has vendido **${res.soldQty?.toFixed(4)} ${res.asset.symbol}** (${res.asset.name}).`)
        .addFields(
          { name: "Ingreso obtenido", value: n(res.revenue ?? 0), inline: true },
          { name: "Rendimiento (P&L)", value: pnlStr, inline: true },
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "cartera") {
      const user = interaction.options.getUser("usuario") ?? interaction.user;
      const port = getUserPortfolio(gid, user.id);

      if (!port.holdings.length) {
        await interaction.reply({
          embeds: [infoEmbed(`Cartera de ${user.username}`, "No tiene activos en cartera actualmente.\nExplora el mercado con `/trading mercado` y adquiere activos con `/trading comprar`.")],
          ephemeral: true,
        });
        return;
      }

      const sign = port.totalPnl >= 0 ? "+" : "";
      const pnlColor = port.totalPnl >= 0 ? "🟢" : "🔴";

      const embed = baseEmbed(COLORS.primary)
        .setTitle(`💼 Cartera de Inversión · ${user.username}`)
        .setDescription(
          `**Valor total:** ${n(port.totalValue)}\n**Invertido:** ${n(port.totalInvested)}\n**P&L Total:** ${pnlColor} **${sign}${port.totalPnl.toFixed(0)} nexocoins (${sign}${port.totalPnlPct.toFixed(2)}%)**`,
        )
        .setThumbnail(user.displayAvatarURL({ size: 128 }));

      for (const h of port.holdings) {
        const itemSign = h.pnl >= 0 ? "+" : "";
        const itemColor = h.pnl >= 0 ? "🟢" : "🔴";
        embed.addFields({
          name: `${h.asset.symbol} · ${h.asset.name}`,
          value: `Posición: **${h.amount.toFixed(4)} ${h.asset.symbol}**\nValor actual: **${Math.floor(h.currentValue).toLocaleString("es-ES")}** 🪙 (Invertido: ${Math.floor(h.invested).toLocaleString("es-ES")})\nRendimiento: ${itemColor} \`${itemSign}${h.pnlPct.toFixed(2)}%\``,
          inline: false,
        });
      }

      const divs = getEstimatedUserDailyDividends(gid, user.id);
      if (divs.totalEstimated > 0) {
        embed.addFields({
          name: "🏛️ Dividendos Diarios (12:00)",
          value: `💸 Recibirás aprox. **+${n(divs.totalEstimated)}** a las 12:00 directo en tu banco por tus acciones de empresas.`,
          inline: false,
        });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "dividendos") {
      const divs = getEstimatedUserDailyDividends(gid, interaction.user.id);
      const embed = baseEmbed(COLORS.eco)
        .setTitle("🏛️ Dividendos de Empresas · Nexo Exchange")
        .setDescription(
          "Las empresas cotizadas en el mercado reparten **dividendos diarios a las 12:00 (mediodía)** a todos los poseedores de sus acciones.\nEl pago se realiza de manera automática directamente a tu **cuenta bancaria**.",
        )
        .addFields(
          {
            name: "📊 Rendimientos Diarios por Acción",
            value: [
              "👑 **Nexo Corp (NEXO)**: `3.0%` diario *(Empresa insignia de Nexo)*",
              "⚡ **Tesla Inc. (TSLA)**: `2.5%` diario del valor de mercado",
              "🟢 **NVIDIA Corp. (NVDA)**: `2.2%` diario del valor de mercado",
              "🌐 **Meta Platforms (META)**: `2.0%` diario del valor de mercado",
              "🪟 **Microsoft Corp. (MSFT)**: `1.9%` diario del valor de mercado",
              "🍏 **Apple Inc. (AAPL)**: `1.8%` diario del valor de mercado",
              "📦 **Amazon.com Inc. (AMZN)**: `1.7%` diario del valor de mercado",
              "🔍 **Alphabet / Google (GOOGL)**: `1.6%` diario del valor de mercado",
              "🏰 **The Walt Disney Co. (DIS)**: `1.5%` diario del valor de mercado",
              "🔧 **AMD Inc. (AMD)**: `2.0%` diario del valor de mercado",
              "🎬 **Netflix Inc. (NFLX)**: `1.6%` diario del valor de mercado",
              "🗄️ **Oracle Corp. (ORCL)**: `1.8%` diario del valor de mercado",
              "🍔 **McDonald's Corp. (MCD)**: `1.4%` diario del valor de mercado",
            ].join("\n"),
          },
          {
            name: "💸 Tu Estimación para Hoy a las 12:00",
            value:
              divs.totalEstimated > 0
                ? `**+${n(divs.totalEstimated)}** diarios garantizados.\n` +
                  divs.breakdown
                    .map((b) => `• **${b.symbol}**: ${b.amount.toFixed(2)} acc. → **+${n(b.dividend)}**`)
                    .join("\n")
                : "Actualmente no tienes acciones de empresas.\nUsa `/trading comprar` para adquirir acciones de **Nexo Corp**, Apple, NVIDIA, Tesla u otras y empezar a cobrar dividendos diarios.",
          },
        )
        .setFooter({ text: "Los dividendos se pagan cada día exactamente a las 12:00 h." });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "top") {
      const top = topTradingPortfolios(gid, 10);
      if (!top.length) {
        await interaction.reply({ embeds: [infoEmbed("Top Inversores", "Aún no hay inversores registrados en este servidor.")], ephemeral: true });
        return;
      }

      const lines = await Promise.all(
        top.map(async (t, i) => {
          const u = await interaction.client.users.fetch(t.userId).catch(() => null);
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**#${i + 1}**`;
          return `${medal} ${u ? u.username : t.userId} — ${n(t.totalValue)}`;
        }),
      );

      const embed = baseEmbed(COLORS.primary)
        .setTitle("🏆 Top Inversores de Nexo")
        .setDescription(lines.join("\n"));

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};

export default command;
