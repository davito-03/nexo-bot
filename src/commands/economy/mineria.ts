import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { baseEmbed, ecoEmbed, errorEmbed, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import {
  activateOverclock,
  calculatePendingMined,
  claimMinerEarnings,
  getBaseMiningTaxRate,
  getOrCreateMiner,
  MAX_RIG_TIER,
  OVERCLOCK_COST,
  RIG_TIERS,
  setMinerTargetAsset,
  SUPPORTED_MINING_ASSETS,
  upgradeMinerRig,
} from "../../modules/economy/passive.js";
import { getEco, n } from "../../modules/economy/engine.js";
import type { Command } from "../../types/index.js";

function renderProgressBar(pct: number, length = 12): string {
  const filled = Math.min(length, Math.max(0, Math.round((pct / 100) * length)));
  const empty = length - filled;
  return `\`[${"█".repeat(filled)}${"░".repeat(empty)}]\` **${pct}%**`;
}

function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function buildMinerPanelEmbed(guildId: string, userId: string, username: string) {
  const miner = getOrCreateMiner(guildId, userId);
  const calc = calculatePendingMined(miner);
  const tier = calc.tierInfo;
  const asset = SUPPORTED_MINING_ASSETS.find((a) => a.id === miner.target_asset) ?? SUPPORTED_MINING_ASSETS[0]!;

  const embed = baseEmbed(COLORS.casino)
    .setTitle(`⛏️ Estación de Minería Cripto · ${username}`)
    .setDescription(
      `Hardware de cálculo criptográfico pasivo. Genera ingresos continuos en segundo plano.\n*Capacidad máxima del depósito: 24 horas.*`,
    )
    .addFields(
      {
        name: "🖥️ Hardware Instalado",
        value: `**${tier.emoji} ${tier.name}** (Nivel ${miner.rig_tier}/${MAX_RIG_TIER})\nPotencia: **${tier.hashrateDesc}**`,
        inline: true,
      },
      {
        name: "🎯 Moneda Minada",
        value: `**${asset.symbol} ${asset.name}**\n*${asset.description}*`,
        inline: true,
      },
      {
        name: "⚡ Rendimiento Bruto",
        value: `**${calc.effectiveHourly.toLocaleString("es-ES")}** 🪙/h\n(~**${(calc.effectiveHourly * 24).toLocaleString("es-ES")}** 🪙/día)\n🏛️ Impuesto: \`${(calc.taxRate * 100).toFixed(0)}%\``,
        inline: true,
      },
      {
        name: "❄️ Refrigeración / Overclock",
        value: calc.isOverclocked
          ? `🟢 **Activo (+25% de velocidad)**\nResta: \`${formatDuration(calc.overclockRemainingMs)}\``
          : `⚪ Inactivo (Actívalo por **${n(OVERCLOCK_COST)}** o pasta térmica)`,
        inline: true,
      },
      {
        name: "💰 Rendimientos Acumulados",
        value: `**+${n(calc.netPendingCoins)}** netos a cobrar\n*(Bruto: ${n(calc.pendingCoins)} | Impuesto: -${n(calc.estimatedTax)})*\n*Minado histórico:* \`${n(miner.total_mined)}\``,
        inline: true,
      },
      {
        name: "⏳ Depósito de Acumulación (Tope 24h)",
        value: `${renderProgressBar(calc.progressPct)} (${formatDuration(calc.cappedElapsedMs)} / 24h)${calc.isCapped ? "\n⚠️ **¡Depósito saturado!** Reclama para que el hardware siga minando." : ""}`,
        inline: false,
      },
    )
    .setFooter({ text: "Usa los botones inferiores o comandos de /mineria para operar tu estación." });

  return { embed, calc, miner };
}

function buildActionButtons(calc: ReturnType<typeof calculatePendingMined>, miner: ReturnType<typeof getOrCreateMiner>) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("mineria_claim")
      .setLabel(`Reclamar (+${calc.netPendingCoins.toLocaleString("es-ES")} 🪙)`)
      .setEmoji("⛏️")
      .setStyle(ButtonStyle.Success)
      .setDisabled(calc.netPendingCoins < 1),
    new ButtonBuilder()
      .setCustomId("mineria_upgrade")
      .setLabel(miner.rig_tier >= MAX_RIG_TIER ? "Rig al Máximo" : `Mejorar a Nvl ${miner.rig_tier + 1}`)
      .setEmoji("⚡")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(miner.rig_tier >= MAX_RIG_TIER),
    new ButtonBuilder()
      .setCustomId("mineria_overclock")
      .setLabel("Overclock 24h")
      .setEmoji("❄️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("mineria_asset")
      .setLabel("Cambiar Moneda")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
  );
  return row;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mineria")
    .setDescription("Sistema de minería cripto: rigs, hashrate, overclock e ingresos pasivos")
    .addSubcommand((s) => s.setName("panel").setDescription("Ver tu estación de minería y ganancias acumuladas"))
    .addSubcommand((s) => s.setName("reclamar").setDescription("Reclamar las ganancias acumuladas de minería"))
    .addSubcommand((s) => s.setName("mejorar").setDescription("Mejorar el hardware y hashrate de tu rig"))
    .addSubcommand((s) =>
      s
        .setName("moneda")
        .setDescription("Elegir qué criptomoneda minar con tu rig")
        .addStringOption((o) =>
          o
            .setName("activo")
            .setDescription("Moneda a minar")
            .setRequired(true)
            .addChoices(
              { name: "🪙 NexoCoins (Moneda base directa a cartera)", value: "nexocoin" },
              { name: "₿ Bitcoin (BTC - Cartera de trading)", value: "btc" },
              { name: "🔷 Ethereum (ETH - Cartera de trading)", value: "eth" },
              { name: "🟣 Solana (SOL - Cartera de trading)", value: "sol" },
              { name: "✖️ XRP (XRP - Cartera de trading)", value: "xrp" },
            ),
        ),
    )
    .addSubcommand((s) => s.setName("overclock").setDescription("Aplicar refrigeración líquida / overclock por 24h (+25% velocidad)"))
    .addSubcommand((s) =>
      s
        .setName("catalogo")
        .setDescription("Ver la lista de rigs de minería disponibles, producción e impuestos")
        .addIntegerOption((o) =>
          o
            .setName("pagina")
            .setDescription("Página del catálogo (1: Niveles 0-15 | 2: Niveles 16-30)")
            .setMinValue(1)
            .setMaxValue(2),
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    const uid = interaction.user.id;

    if (sub === "catalogo") {
      const page = interaction.options.getInteger("pagina") ?? 1;
      const startTier = page === 1 ? 0 : 16;
      const endTier = page === 1 ? 15 : MAX_RIG_TIER;

      const embed = baseEmbed(COLORS.casino)
        .setTitle(`🖥️ Catálogo de Rigs de Criptominería Nexo (Página ${page}/2)`)
        .setDescription(
          "El hardware de minería genera ingresos pasivos en segundo plano (máximo 24 horas por depósito).\n" +
            "Se aplica un **Impuesto / Tasa de Red Eléctrica** sobre las ganancias según el nivel del rig al cosechar.\n" +
            `*Mostrando niveles ${startTier} al ${endTier}.*`,
        );

      for (let i = startTier; i <= endTier; i++) {
        const tier = RIG_TIERS[i]!;
        const costStr = tier.costToUpgrade === 0 ? "Gratis (Hardware inicial)" : n(tier.costToUpgrade);
        const taxPct = (getBaseMiningTaxRate(tier.tier) * 100).toFixed(0);
        embed.addFields({
          name: `${tier.emoji} Nivel ${tier.tier}: ${tier.name}`,
          value:
            `• **Coste de mejora:** ${costStr}\n` +
            `• **Potencia:** ${tier.hashrateDesc}\n` +
            `• **Producción bruta:** \`${tier.hourlyRate.toLocaleString("es-ES")} 🪙/h\` (~**${(tier.hourlyRate * 24).toLocaleString("es-ES")} 🪙/día**)\n` +
            `• **Impuesto:** \`${taxPct}%\`\n` +
            `• *${tier.description}*`,
          inline: false,
        });
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("mineria_cat_p1")
          .setLabel("Página 1 (Nvl 0-15)")
          .setStyle(page === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId("mineria_cat_p2")
          .setLabel("Página 2 (Nvl 16-30)")
          .setStyle(page === 2 ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(page === 2),
      );

      const replyMsg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

      const collector = replyMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
      });

      collector.on("collect", async (btn) => {
        if (btn.user.id !== uid) {
          await btn.reply({ content: "Solo quien ejecutó el comando puede cambiar de página.", ephemeral: true });
          return;
        }
        const newPage = btn.customId === "mineria_cat_p1" ? 1 : 2;
        const newStart = newPage === 1 ? 0 : 16;
        const newEnd = newPage === 1 ? 15 : MAX_RIG_TIER;

        const newEmbed = baseEmbed(COLORS.casino)
          .setTitle(`🖥️ Catálogo de Rigs de Criptominería Nexo (Página ${newPage}/2)`)
          .setDescription(
            "El hardware de minería genera ingresos pasivos en segundo plano (máximo 24 horas por depósito).\n" +
              "Se aplica un **Impuesto / Tasa de Red Eléctrica** sobre las ganancias según el nivel del rig al cosechar.\n" +
              `*Mostrando niveles ${newStart} al ${newEnd}.*`,
          );

        for (let i = newStart; i <= newEnd; i++) {
          const tier = RIG_TIERS[i]!;
          const costStr = tier.costToUpgrade === 0 ? "Gratis (Hardware inicial)" : n(tier.costToUpgrade);
          const taxPct = (getBaseMiningTaxRate(tier.tier) * 100).toFixed(0);
          newEmbed.addFields({
            name: `${tier.emoji} Nivel ${tier.tier}: ${tier.name}`,
            value:
              `• **Coste de mejora:** ${costStr}\n` +
              `• **Potencia:** ${tier.hashrateDesc}\n` +
              `• **Producción bruta:** \`${tier.hourlyRate.toLocaleString("es-ES")} 🪙/h\` (~**${(tier.hourlyRate * 24).toLocaleString("es-ES")} 🪙/día**)\n` +
              `• **Impuesto:** \`${taxPct}%\`\n` +
              `• *${tier.description}*`,
            inline: false,
          });
        }

        const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("mineria_cat_p1")
            .setLabel("Página 1 (Nvl 0-15)")
            .setStyle(newPage === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(newPage === 1),
          new ButtonBuilder()
            .setCustomId("mineria_cat_p2")
            .setLabel("Página 2 (Nvl 16-30)")
            .setStyle(newPage === 2 ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(newPage === 2),
        );

        await btn.update({ embeds: [newEmbed], components: [newRow] });
      });

      collector.on("end", async () => {
        try {
          const disabledRow = ActionRowBuilder.from(row);
          disabledRow.components.forEach((c) => (c as ButtonBuilder).setDisabled(true));
          await replyMsg.edit({ components: [disabledRow as any] });
        } catch {
          /* ignore */
        }
      });
      return;
    }

    if (sub === "reclamar") {
      const res = claimMinerEarnings(gid, uid);
      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("Sin ganancias", res.error ?? "No hay dividendos disponibles.")], ephemeral: true });
        return;
      }

      const taxDetail = res.taxPaid > 0 ? `\n*(Bruto: ${n(res.grossCoins)} | Impuesto retenido ${(res.taxRate * 100).toFixed(0)}%: -${n(res.taxPaid)})*` : "";
      const desc =
        res.targetAsset === "nexocoin"
          ? `Has recibido **+${n(res.coinsClaimed)}** netos directamente a tu **cartera**.\n${taxDetail}`
          : `Has minado **+${res.cryptoQty?.toFixed(6)} ${res.targetAsset.toUpperCase()}** (equivalente a ${n(res.coinsClaimed)} netos), acreditados a tu **cartera de trading** (\`/trading cartera\`).\n${taxDetail}`;

      const embed = successEmbed("¡Cosecha de Minería Exitosa! ⛏️", desc).setFooter({
        text: "Tu rig sigue procesando bloques en segundo plano.",
      });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "mejorar") {
      const res = upgradeMinerRig(gid, uid);
      if (!res.ok || !res.newTier) {
        await interaction.reply({ embeds: [errorEmbed("No se pudo mejorar", res.error ?? "Error al mejorar el rig.")], ephemeral: true });
        return;
      }

      const tierTax = (getBaseMiningTaxRate(res.newTier.tier) * 100).toFixed(0);
      const embed = successEmbed(
        "¡Rig de Minería Mejorado! ⚡",
        `Has actualizado tu estación a **${res.newTier.emoji} ${res.newTier.name}** (Nivel ${res.newTier.tier}/${MAX_RIG_TIER}).\n\n` +
          `• **Nueva potencia:** ${res.newTier.hashrateDesc}\n` +
          `• **Nueva producción bruta:** \`${res.newTier.hourlyRate.toLocaleString("es-ES")} 🪙/h\` (~**${(res.newTier.hourlyRate * 24).toLocaleString("es-ES")} 🪙/día**)\n` +
          `• **Tasa de impuesto:** \`${tierTax}%\`\n` +
          `• **Coste abonado:** ${n(res.cost ?? 0)}`,
      );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "moneda") {
      const target = interaction.options.getString("activo", true);
      const res = setMinerTargetAsset(gid, uid, target);
      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("Error", res.error ?? "No se pudo cambiar la moneda.")], ephemeral: true });
        return;
      }

      const info = SUPPORTED_MINING_ASSETS.find((a) => a.id === target)!;
      await interaction.reply({
        embeds: [
          successEmbed(
            "Moneda de Minería Actualizada 🔄",
            `Tu equipo ahora está minando **${info.symbol} ${info.name}**.\n${info.description}.`,
          ),
        ],
      });
      return;
    }

    if (sub === "overclock") {
      const res = activateOverclock(gid, uid);
      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("No se pudo activar", res.error ?? "Error al aplicar overclock.")], ephemeral: true });
        return;
      }

      const methodStr =
        res.methodUsed === "item" ? "1x **Pasta Térmica Criogénica** de tu inventario" : `**${n(OVERCLOCK_COST)}** de tu cartera`;

      const embed = successEmbed(
        "¡Overclock Activado al 100%! ❄️",
        `Has aplicado refrigeración y optimizado las frecuencias de tu hardware usando ${methodStr}.\n\n` +
          `• **Bonificación:** \`+25%\` de velocidad de minado adicional.\n` +
          `• **Duración:** 24 horas continuas.`,
      );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Panel por defecto (/mineria panel)
    let currentPanel = buildMinerPanelEmbed(gid, uid, interaction.user.username);
    let currentRow = buildActionButtons(currentPanel.calc, currentPanel.miner);

    const msg = await interaction.reply({
      embeds: [currentPanel.embed],
      components: [currentRow],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90_000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== uid) {
        await i.reply({ content: "Solo el dueño de esta estación minera puede pulsar estos botones.", ephemeral: true });
        return;
      }

      if (i.customId === "mineria_claim") {
        const claimRes = claimMinerEarnings(gid, uid);
        if (!claimRes.ok) {
          await i.reply({ embeds: [errorEmbed("Aviso", claimRes.error ?? "No hay dividendos disponibles.")], ephemeral: true });
          return;
        }
        await i.deferUpdate();
        currentPanel = buildMinerPanelEmbed(gid, uid, interaction.user.username);
        currentRow = buildActionButtons(currentPanel.calc, currentPanel.miner);
        await i.editReply({ embeds: [currentPanel.embed], components: [currentRow] });
        return;
      }

      if (i.customId === "mineria_upgrade") {
        const upRes = upgradeMinerRig(gid, uid);
        if (!upRes.ok) {
          await i.reply({ embeds: [errorEmbed("No se pudo mejorar", upRes.error ?? "Fondos insuficientes.")], ephemeral: true });
          return;
        }
        await i.deferUpdate();
        currentPanel = buildMinerPanelEmbed(gid, uid, interaction.user.username);
        currentRow = buildActionButtons(currentPanel.calc, currentPanel.miner);
        await i.editReply({ embeds: [currentPanel.embed], components: [currentRow] });
        return;
      }

      if (i.customId === "mineria_overclock") {
        const ocRes = activateOverclock(gid, uid);
        if (!ocRes.ok) {
          await i.reply({ embeds: [errorEmbed("Overclock", ocRes.error ?? "Fondos insuficientes.")], ephemeral: true });
          return;
        }
        await i.deferUpdate();
        currentPanel = buildMinerPanelEmbed(gid, uid, interaction.user.username);
        currentRow = buildActionButtons(currentPanel.calc, currentPanel.miner);
        await i.editReply({ embeds: [currentPanel.embed], components: [currentRow] });
        return;
      }

      if (i.customId === "mineria_asset") {
        // Rotar cíclicamente al siguiente activo usando el estado más fresco de la base de datos
        const freshMiner = getOrCreateMiner(gid, uid);
        const currentIndex = SUPPORTED_MINING_ASSETS.findIndex((a) => a.id === freshMiner.target_asset);
        const nextAsset = SUPPORTED_MINING_ASSETS[(currentIndex + 1) % SUPPORTED_MINING_ASSETS.length]!;
        setMinerTargetAsset(gid, uid, nextAsset.id);

        await i.deferUpdate();
        currentPanel = buildMinerPanelEmbed(gid, uid, interaction.user.username);
        currentRow = buildActionButtons(currentPanel.calc, currentPanel.miner);
        await i.editReply({ embeds: [currentPanel.embed], components: [currentRow] });
        return;
      }
    });

    collector.on("end", async () => {
      try {
        const disabledRow = ActionRowBuilder.from(currentRow);
        disabledRow.components.forEach((c) => (c as ButtonBuilder).setDisabled(true));
        await msg.edit({ components: [disabledRow as any] });
      } catch {
        /* ignore */
      }
    });
  },
};

export default command;
