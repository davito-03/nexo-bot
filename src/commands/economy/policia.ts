import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../types/index.js";
import { baseEmbed, errorEmbed, successEmbed, infoEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { n } from "../../modules/economy/engine.js";
import {
  isUserPolice,
  getPoliceOfficer,
  enlistInPolice,
  desertPoliceForce,
  getTopPoliceOfficers,
  POLICE_RANKS,
} from "../../modules/economy/police.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("policia")
    .setDescription("Sistema del Cuerpo de Policía de Nexo, intercepciones y defensa contra el crimen")
    .addSubcommand((s) =>
      s.setName("alistarse").setDescription("Solicita tu ingreso en el Cuerpo de Policía como cadete"),
    )
    .addSubcommand((s) =>
      s.setName("estado").setDescription("Consulta tu placa policial, rango, arrestos y recompensas"),
    )
    .addSubcommand((s) =>
      s
        .setName("desertar")
        .setDescription("Abandona el cuerpo policial para pasarte al bando criminal (Aplica 3 días de cooldown)"),
    )
    .addSubcommand((s) =>
      s.setName("ranking").setDescription("Consulta el cuadro de honor y los oficiales más condecorados"),
    )
    .addSubcommand((s) =>
      s.setName("info").setDescription("Información, reglamento y despacho de intercepciones de la policía"),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId!;
    const uid = interaction.user.id;

    // ── SUBCOMANDO: ALISTARSE ──
    if (sub === "alistarse") {
      const res = enlistInPolice(gid, uid);
      if (!res.success) {
        await interaction.reply({
          embeds: [errorEmbed("Solicitud de Ingreso Denegada", res.error!)],
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        embeds: [
          successEmbed(
            "👮‍♂️ ¡Bienvenido al Cuerpo de Policía de Nexo!",
            `Has jurado servir y proteger el orden en el servidor.\n\n` +
              `▸ **Rango Asignado:** \`${res.officer!.rank}\`\n` +
              `▸ **Placa:** Activa\n\n` +
              `⚠️ **REGLAMENTO DISCIPLINARIO ESTRICTO:**\n` +
              `• Tienes prohibido participar en asaltos o afiliarte a bandas criminales.\n` +
              `• Podrás responder a despachos de código rojo en asaltos de Nivel 6+ para interceptar bandas y cobrar el 50% de las multas.\n` +
              `• Si decides desertar para volver al crimen, se te impondrá un **COOLDOWN DE 3 DÍAS** antes de poder volver a ingresar.`,
          ),
        ],
      });
      return;
    }

    // ── SUBCOMANDO: ESTADO ──
    if (sub === "estado") {
      const officer = getPoliceOfficer(gid, uid);
      if (!officer || officer.cooldownUntil > Date.now()) {
        const cdMsg =
          officer && officer.cooldownUntil > Date.now()
            ? `\n\n⏳ Tienes un veto disciplinario por deserción activa hasta <t:${Math.floor(
                officer.cooldownUntil / 1000,
              )}:R>.`
            : "";
        await interaction.reply({
          embeds: [
            errorEmbed(
              "Sin Placa Policial",
              `No formas parte del Cuerpo de Policía de Nexo actualmente.${cdMsg}\nPuedes solicitar ingreso con \`/policia alistarse\`.`,
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      const embed = baseEmbed(COLORS.navy)
        .setTitle(`👮‍♂️ Expediente Policial: ${interaction.user.username}`)
        .setDescription(
          `▸ **Rango Actual:** \`${officer.rank}\`\n` +
            `▸ **Fecha de Ingreso:** <t:${Math.floor(officer.joinedAt / 1000)}:D>\n` +
            `▸ **Intercepciones Exitosas:** \`${officer.interceptsWon} golpes frustrados\`\n` +
            `▸ **Multas Judiciales Recaudadas:** \`${n(officer.totalFinesCollected)} nexocoins\`\n\n` +
            `🛡️ *Tu unidad será convocada automáticamente en el canal cuando una banda criminal inicie un golpe de Nivel 6 o superior.*`,
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: DESERTAR ──
    if (sub === "desertar") {
      if (!isUserPolice(gid, uid)) {
        await interaction.reply({
          embeds: [errorEmbed("No eres Policía", "No eres un oficial de policía en activo.")],
          ephemeral: true,
        });
        return;
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("police_confirm_desert")
          .setLabel("🚨 Renunciar a la Placa y Desertar")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("police_cancel_desert")
          .setLabel("❌ Cancelar y Seguir en el Cuerpo")
          .setStyle(ButtonStyle.Secondary),
      );

      const reply = await interaction.reply({
        embeds: [
          errorEmbed(
            "⚠️ AVISO DEL ALTO MANDO POLICIAL",
            "¿Estás seguro de que deseas abandonar el Cuerpo de Policía de Nexo?\n\n" +
              "Si renuncias a tu placa:\n" +
              "• Podrás volver a participar en asaltos y bandas criminales.\n" +
              "• **Se te aplicará un COOLDOWN DE 3 DÍAS** en el que no podrás volver a solicitar ingreso en la policía.",
          ),
        ],
        components: [row],
        ephemeral: true,
      });

      try {
        const btn = await reply.awaitMessageComponent({
          componentType: ComponentType.Button,
          time: 30_000,
          filter: (i) => i.user.id === uid,
        });

        if (btn.customId === "police_cancel_desert") {
          await btn.update({
            embeds: [infoEmbed("Operación Cancelada", "Continúas en activo como oficial de policía.")],
            components: [],
          });
          return;
        }

        const res = desertPoliceForce(gid, uid);
        await btn.update({
          embeds: [
            successEmbed(
              "🚨 Deserción Confirmada",
              `Has entregado tu placa y tu arma reglamentaria.\n` +
                `Ahora eres un civil libre para unirte a bandas y asaltos.\n\n` +
                `⏳ No podrás volver a solicitar alistamiento en el Cuerpo de Policía hasta <t:${Math.floor(
                  res.cooldownUntil / 1000,
                )}:R> (<t:${Math.floor(res.cooldownUntil / 1000)}:T>).`,
            ),
          ],
          components: [],
        });
      } catch {
        await interaction.editReply({ components: [] });
      }
      return;
    }

    // ── SUBCOMANDO: RANKING ──
    if (sub === "ranking") {
      const top = getTopPoliceOfficers(gid, 10);
      if (top.length === 0) {
        await interaction.reply({
          embeds: [infoEmbed("Sin Oficiales", "Aún no hay oficiales de policía registrados en la comisaría. ¡Aliste con `/policia alistarse`!")],
        });
        return;
      }

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const lines = top.map((o, idx) => {
        const medal = medals[idx] || "▪️";
        return `${medal} <@${o.userId}> — **${o.rank}**\n` +
          `   └ 🛡️ ${o.interceptsWon} golpes frustrados · 💰 Multas: \`${n(o.totalFinesCollected)} 🪙\``;
      });

      const embed = baseEmbed(COLORS.navy)
        .setTitle("🚔 Cuadro de Honor del Cuerpo de Policía")
        .setDescription(lines.join("\n\n"));

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: INFO ──
    if (sub === "info") {
      const rankList = POLICE_RANKS.map(
        (r) => `▸ ${r.badge} **${r.rank}** (A partir de ${r.minIntercepts} intercepciones) — +${Math.round(r.bonusPay * 100)}% de paga`,
      ).join("\n");

      const embed = baseEmbed(COLORS.navy)
        .setTitle("🚓 Guía del Cuerpo de Policía de Nexo")
        .setDescription(
          "El Cuerpo de Policía defiende las reservas estatales, las bóvedas bancarias y el orden público frente a las bandas criminales.\n\n" +
            "**🛡️ Deberes y Restricciones:**\n" +
            "• Los policías **no pueden unirse a bandas ni planificar asaltos**.\n" +
            "• Si intentas unirte a un asalto o banda, recibirás una advertencia para desertar.\n" +
            "• Al desertar, se aplica un **cooldown obligatorio de 3 días** antes de poder volver a ingresar.\n\n" +
            "**🚨 Intervención en Golpes de Alto Nivel:**\n" +
            "• En asaltos de **Nivel 6 a 10**, durante la alarma sonará un despacho de radio policial en el chat.\n" +
            "• Los oficiales pueden desplegarse para reducir las probabilidades de huida de la banda criminal.\n" +
            "• Si la banda cae detenida, los policías se reparten el **50% de las multas recaudadas** como bonificación estatal.\n\n" +
            "**🎖️ Escala de Rangos:**\n" +
            rankList,
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};

export default command;
