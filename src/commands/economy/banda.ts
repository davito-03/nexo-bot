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
  GANG_CREATION_COST,
  GANG_UPGRADES,
  GANG_ROLES_INFO,
  METROPOLITAN_DISTRICTS,
  getUserGang,
  getGangById,
  getGangByNameOrTag,
  getGangMembers,
  getGangUpgrades,
  getGangControlledDistricts,
  getDistrictStates,
  disputeTerritoryWithFunds,
  claimDailyGangTribute,
  getGangContracts,
  claimGangContractReward,
  promoteGangMember,
  demoteGangMember,
  setGangMotto,
  createGang,
  depositToGang,
  joinGang,
  leaveGang,
  kickFromGang,
  upgradeGangLair,
  getTopGangs,
  investInGang,
  getUserGangInvestments,
  getGangInvestments,
  claimGangDividends,
  divestFromGang,
} from "../../modules/economy/gangs.js";
import { isUserPolice, desertPoliceForce } from "../../modules/economy/police.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("banda")
    .setDescription("Sistema de bandas criminales, sindicatos del crimen, guaridas y caja fuerte")
    .addSubcommand((s) =>
      s
        .setName("crear")
        .setDescription(`Funda una banda criminal permanente (Coste: ${n(GANG_CREATION_COST)} nexocoins)`)
        .addStringOption((o) =>
          o.setName("nombre").setDescription("Nombre de la banda criminal (3 a 30 caracteres)").setRequired(true),
        )
        .addStringOption((o) =>
          o.setName("tag").setDescription("Sigla o tag identificativo (2 a 5 letras/números)").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("info")
        .setDescription("Consulta la ficha, guarida, fondos y estadísticas de tu banda o de otra banda")
        .addStringOption((o) =>
          o.setName("banda").setDescription("Nombre o tag de la banda a inspeccionar (opcional)").setRequired(false),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("unirse")
        .setDescription("Únete a una banda criminal existente")
        .addStringOption((o) =>
          o.setName("banda").setDescription("Nombre o tag de la banda").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s.setName("salir").setDescription("Abandona tu banda criminal actual"),
    )
    .addSubcommand((s) =>
      s
        .setName("depositar")
        .setDescription("Deposita nexocoins en la caja fuerte de tu banda para costear mejoras")
        .addIntegerOption((o) =>
          o.setName("cantidad").setDescription("Cantidad de nexocoins a transferir").setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("expulsar")
        .setDescription("Expulsa a un miembro de tu banda (Solo Líder o Colíder)")
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Miembro a expulsar de la banda").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s.setName("mejoras").setDescription("Inspecciona o sube de nivel las instalaciones de la guarida criminal"),
    )
    .addSubcommand((s) =>
      s.setName("top").setDescription("Ranking de los sindicatos y bandas criminales más poderosos de Nexo"),
    )
    .addSubcommand((s) =>
      s
        .setName("territorios")
        .setDescription("Mapa de distritos metropolitanos, bandas controladoras y bonificaciones territoriales"),
    )
    .addSubcommand((s) =>
      s
        .setName("disputar")
        .setDescription("Invierte fondos de la caja fuerte para desplegar influencia y disputar un distrito")
        .addStringOption((o) =>
          o
            .setName("distrito")
            .setDescription("Distrito metropolitano a disputar")
            .setRequired(true)
            .addChoices(
              { name: "🏦 Distrito Financiero Central (+6% Banco, Joyería, Casino)", value: "financiero" },
              { name: "💎 Barrio de Lujo & Alta Sociedad (+6% Mansión, Museo)", value: "lujo" },
              { name: "🏭 Complejo Industrial & Logístico (+6% Empresa, Tren)", value: "industrial" },
              { name: "🚢 Dársenas Portuarias & Base Orbital (+6% Estación Espacial)", value: "puerto" },
            ),
        )
        .addIntegerOption((o) =>
          o
            .setName("inversion")
            .setDescription("Fondos a invertir de la caja fuerte (mínimo 25.000 monedas = 25 PI)")
            .setRequired(true)
            .setMinValue(25_000),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("tributo")
        .setDescription("Recauda el tributo diario de los distritos controlados y el garito de apuestas"),
    )
    .addSubcommand((s) =>
      s
        .setName("contratos")
        .setDescription("Inspecciona o cobra recompensas de los contratos semanales del sindicato criminal")
        .addStringOption((o) =>
          o
            .setName("reclamar")
            .setDescription("ID del contrato a reclamar (opcional)")
            .setRequired(false)
            .addChoices(
              { name: "⚡ Operación Relámpago (Asaltos)", value: "heist_runs" },
              { name: "💰 Saqueo Masivo (Botín)", value: "loot_haul" },
              { name: "🎯 Reflejos de Acero (QTE)", value: "qte_reflex" },
              { name: "🧼 Lavado de Activos (Depósitos)", value: "vault_deposits" },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("ascender")
        .setDescription("Asciende a un integrante de tu banda (Recluta -> Soldado -> Sicario -> Lugarteniente)")
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Miembro de la banda a ascender").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("degradar")
        .setDescription("Degrada de rango a un integrante de tu banda")
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Miembro de la banda a degradar").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("lema")
        .setDescription("Establece o edita el lema público o filosofía de tu sindicato criminal")
        .addStringOption((o) =>
          o.setName("texto").setDescription("Nuevo lema de la banda (3 a 120 caracteres)").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("invertir")
        .setDescription("Invierte fondos en una banda criminal a cambio de dividendos pasivos de sus golpes")
        .addStringOption((o) => o.setName("banda").setDescription("Nombre o tag de la banda").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("cantidad").setDescription("Cantidad a invertir (mínimo 5.000 🪙)").setRequired(true).setMinValue(5000),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("dividendos")
        .setDescription("Consulta y reclama tus dividendos acumulados de inversiones en bandas"),
    )
    .addSubcommand((s) =>
      s
        .setName("desinvertir")
        .setDescription("Retira tu inversión de una banda (aplica 10% de tasa que se quema de la economía)")
        .addStringOption((o) => o.setName("banda").setDescription("Nombre o tag de la banda").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("inversores")
        .setDescription("Consulta los inversores y bonos emitidos de una banda criminal")
        .addStringOption((o) => o.setName("banda").setDescription("Nombre o tag de la banda (opcional)").setRequired(false)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId!;
    const uid = interaction.user.id;

    // ── SUBCOMANDO: CREAR ──
    if (sub === "crear") {
      // Comprobar si es oficial de policía
      if (isUserPolice(gid, uid)) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("gang_police_desert")
            .setLabel("🚨 Desertar de la Policía y Fundar Banda")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("gang_police_cancel")
            .setLabel("❌ Cancelar y Seguir en la Policía")
            .setStyle(ButtonStyle.Secondary),
        );

        const reply = await interaction.reply({
          embeds: [
            errorEmbed(
              "⚠️ Incompatibilidad: Oficial del Cuerpo de Policía",
              "Eres un oficial en activo del Cuerpo de Policía de Nexo.\n\n" +
                "Tienes terminantemente prohibido participar en el crimen organizado o fundar bandas criminales.\n" +
                "Si decides desertar para fundar este sindicato, **perderás tu placa policial y se te aplicará un COOLDOWN DE 3 DÍAS** antes de poder volver a alistarte en la policía.",
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

          if (btn.customId === "gang_police_cancel") {
            await btn.update({
              embeds: [infoEmbed("Operación Cancelada", "Has decidido mantener tu juramento y permanecer en el Cuerpo de Policía.")],
              components: [],
            });
            return;
          }

          // Desertar
          desertPoliceForce(gid, uid);
          await btn.update({
            embeds: [
              infoEmbed(
                "🚨 Has Desertado de la Policía",
                "Has renunciado a tu placa. Tu nombre figura ahora en el registro de desertores con un **cooldown de 3 días**.\nProcesando la fundación de tu banda...",
              ),
            ],
            components: [],
          });
        } catch {
          await interaction.editReply({ components: [] });
          return;
        }
      }

      const name = interaction.options.getString("nombre", true);
      const tag = interaction.options.getString("tag", true);

      const res = await createGang(gid, uid, name, tag, interaction.guild ?? undefined);
      if (!res.success || !res.gang) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed("Error al fundar la banda", res.error!)], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [errorEmbed("Error al fundar la banda", res.error!)], ephemeral: true });
        }
        return;
      }

      const roleMention = res.gang.roleId ? `<@&${res.gang.roleId}>` : `\`[${res.gang.tag}] ${res.gang.name}\``;

      const embed = successEmbed(
        `🏴‍☠️ ¡Banda Criminal Fundada con Éxito!`,
        `Has registrado oficialmente a **[${res.gang.tag}] ${res.gang.name}** en el inframundo de Nexo.\n\n` +
          `▸ **Líder Supremo:** <@${uid}>\n` +
          `▸ **Sigla / Tag:** \`[${res.gang.tag}]\`\n` +
          `▸ **Rol Oficial:** ${roleMention}\n` +
          `▸ **Caja Fuerte:** \`0 nexocoins\`\n` +
          `▸ **Coste Abonado:** \`${n(GANG_CREATION_COST)} 🪙\`\n\n` +
          `💡 *Menciona el rol de tu banda para avisar a tus compañeros, deposita fondos con \`/banda depositar\` y desbloquea mejoras con \`/banda mejoras\`.*`,
      );

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
      return;
    }

    // ── SUBCOMANDO: INFO ──
    if (sub === "info") {
      const query = interaction.options.getString("banda");
      let gangInfo = query ? getGangByNameOrTag(gid, query) : null;
      let memberInfo = null;

      if (!query) {
        const userG = getUserGang(gid, uid);
        if (!userG) {
          await interaction.reply({
            embeds: [
              errorEmbed(
                "Sin Banda Asignada",
                "No perteneces a ninguna banda criminal. Puedes crear una con `/banda crear` o consultar otra banda especificando su nombre con `/banda info <nombre>`.",
              ),
            ],
            ephemeral: true,
          });
          return;
        }
        gangInfo = userG.gang;
        memberInfo = userG.member;
      }

      if (!gangInfo) {
        await interaction.reply({
          embeds: [errorEmbed("Banda No Encontrada", `No se encontró ninguna banda con el nombre o tag especificado.`)],
          ephemeral: true,
        });
        return;
      }

      const members = getGangMembers(gid, gangInfo.id);
      const upgrades = getGangUpgrades(gid, gangInfo.id);
      const controlled = getGangControlledDistricts(gid, gangInfo.id);
      const controlledStr =
        controlled.length > 0
          ? controlled.map((d) => `${d.emoji} **${d.name}**`).join(", ")
          : "Ninguno *(Disputa distritos con `/banda disputar`)*";

      const mottoStr = gangInfo.description ? `*«${gangInfo.description}»*\n\n` : "";
      const roleStr = gangInfo.roleId ? `<@&${gangInfo.roleId}>` : "*(Sin rol)*";

      const embed = baseEmbed(COLORS.gold)
        .setTitle(`🏴‍☠️ [${gangInfo.tag}] ${gangInfo.name}`)
        .setDescription(
          `${mottoStr}` +
            `Sindicato del crimen registrado el <t:${Math.floor(gangInfo.createdAt / 1000)}:D>.\n` +
            `👑 **Capo / Padrino:** <@${gangInfo.leaderId}>\n` +
            `🏷️ **Rol de Banda:** ${roleStr}\n\n` +
            `💰 **Caja Fuerte:** \`${n(gangInfo.balance)} nexocoins\`\n` +
            `🏆 **Botín Total Saqueado:** \`${n(gangInfo.totalLootEarned)} nexocoins\`\n` +
            `👥 **Integrantes:** \`${members.length} / 20 miembros\`\n` +
            `🏴‍☠️ **Territorios Dominados:** ${controlledStr}`,
        )
        .addFields(
          {
            name: "🛠️ Instalaciones de la Guarida",
            value:
              `▸ 🚗 **Taller:** Nv. ${upgrades.taller}/5 (${upgrades.taller > 0 ? GANG_UPGRADES.taller.bonuses[upgrades.taller - 1] : "Sin mejoras"})\n` +
              `▸ 🏥 **Clínica:** Nv. ${upgrades.clinica}/5 (${upgrades.clinica > 0 ? GANG_UPGRADES.clinica.bonuses[upgrades.clinica - 1] : "Sin mejoras"})\n` +
              `▸ 📡 **Antena:** Nv. ${upgrades.antena}/5 (${upgrades.antena > 0 ? GANG_UPGRADES.antena.bonuses[upgrades.antena - 1] : "Sin mejoras"})\n` +
              `▸ 💼 **Abogados:** Nv. ${upgrades.abogados}/5 (${upgrades.abogados > 0 ? GANG_UPGRADES.abogados.bonuses[upgrades.abogados - 1] : "Sin mejoras"})\n` +
              `▸ 💣 **Polvorín:** Nv. ${upgrades.polvorin}/5 (${upgrades.polvorin > 0 ? GANG_UPGRADES.polvorin.bonuses[upgrades.polvorin - 1] : "Sin mejoras"})\n` +
              `▸ 🎲 **Garito:** Nv. ${upgrades.garito}/5 (${upgrades.garito > 0 ? GANG_UPGRADES.garito.bonuses[upgrades.garito - 1] : "Sin mejoras"})\n` +
              `▸ 🧼 **Blanqueo:** Nv. ${upgrades.blanqueo}/5 (${upgrades.blanqueo > 0 ? GANG_UPGRADES.blanqueo.bonuses[upgrades.blanqueo - 1] : "Sin mejoras"})`,
          },
          {
            name: "📋 Miembros del Sindicato",
            value:
              members
                .slice(0, 10)
                .map((m) => {
                  const roleDef = GANG_ROLES_INFO[m.role] || GANG_ROLES_INFO.recluta;
                  return `▸ <@${m.userId}> — ${roleDef.badge} **${roleDef.name}** (Aporte: \`${n(m.contribution)} 🪙\`)`;
                })
                .join("\n") || "Sin miembros registrados.",
          },
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: UNIRSE ──
    if (sub === "unirse") {
      if (isUserPolice(gid, uid)) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              "⚠️ Oficial de Policía en Activo",
              "Los oficiales del Cuerpo de Policía no pueden unirse a bandas criminales.\nDebes renunciar a tu placa con `/policia desertar` para poder integrarte en el hampa.",
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      const targetGang = interaction.options.getString("banda", true);
      const res = await joinGang(gid, uid, targetGang, interaction.guild ?? undefined);
      if (!res.success || !res.gang) {
        await interaction.reply({ embeds: [errorEmbed("No pudiste unirte a la banda", res.error!)], ephemeral: true });
        return;
      }

      const roleNotice = res.gang.roleId ? `\n🏷️ Se te ha concedido el rol oficial <@&${res.gang.roleId}>.` : "";
      await interaction.reply({
        embeds: [
          successEmbed(
            "🏴‍☠️ ¡Bienvenido a la Banda!",
            `Te has incorporado con éxito a las filas de **[${res.gang.tag}] ${res.gang.name}**.${roleNotice}\n¡Coordina tus asaltos y haz prosperar a tu sindicato!`,
          ),
        ],
      });
      return;
    }

    // ── SUBCOMANDO: SALIR ──
    if (sub === "salir") {
      const res = await leaveGang(gid, uid, interaction.guild ?? undefined);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed("Error al salir", res.error!)], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [successEmbed("Banda Abandonada", res.message!)] });
      return;
    }

    // ── SUBCOMANDO: DEPOSITAR ──
    if (sub === "depositar") {
      const amount = interaction.options.getInteger("cantidad", true);
      const res = depositToGang(gid, uid, amount);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed("Fallo en el depósito", res.error!)], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(
            "💰 Depósito Confirmado en la Caja Fuerte",
            `Has ingresado **${n(amount)} nexocoins** en la caja fuerte de tu banda.\nSaldo actual disponible en la caja fuerte: **${n(res.newBalance!)} nexocoins**.`,
          ),
        ],
      });
      return;
    }

    // ── SUBCOMANDO: EXPULSAR ──
    if (sub === "expulsar") {
      const targetUser = interaction.options.getUser("usuario", true);
      const res = await kickFromGang(gid, uid, targetUser.id, interaction.guild ?? undefined);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed("Error de expulsión", res.error!)], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(
            "Expulsión Ejecutada",
            `El usuario <@${targetUser.id}> ha sido expulsado disciplinariamente de la banda criminal.`,
          ),
        ],
      });
      return;
    }

    // ── SUBCOMANDO: MEJORAS ──
    if (sub === "mejoras") {
      const userG = getUserGang(gid, uid);
      if (!userG) {
        await interaction.reply({
          embeds: [errorEmbed("Sin Banda", "Debes pertenecer a una banda para gestionar o ver las mejoras de la guarida.")],
          ephemeral: true,
        });
        return;
      }

      const gang = userG.gang;
      const upgrades = getGangUpgrades(gid, gang.id);

      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      const isOfficer = userG.member.role === "leader" || userG.member.role === "co_leader";

      const upgradeEntries = Object.values(GANG_UPGRADES);
      const descLines: string[] = [];

      upgradeEntries.forEach((u) => {
        const curLvl = upgrades[u.id] || 0;
        const isMax = curLvl >= u.maxLevel;
        const nextCost = !isMax ? u.costs[curLvl] : 0;
        const curBonus = curLvl > 0 ? u.bonuses[curLvl - 1] : "Sin mejoras";
        const nextBonus = !isMax ? u.bonuses[curLvl] : "Máximo alcanzado";

        descLines.push(
          `${u.emoji} **${u.name} (Nv. ${curLvl}/${u.maxLevel})**\n` +
            `▸ Efecto actual: *${curBonus}*\n` +
            `▸ Siguiente nivel: *${nextBonus}* ${!isMax ? `(Coste: \`${n(nextCost)} 🪙\`)` : "✅ (MÁXIMO)"}\n`,
        );
      });

      const buttonsRow1 = new ActionRowBuilder<ButtonBuilder>();
      upgradeEntries.slice(0, 3).forEach((u) => {
        const curLvl = upgrades[u.id] || 0;
        const isMax = curLvl >= u.maxLevel;
        buttonsRow1.addComponents(
          new ButtonBuilder()
            .setCustomId(`gang_up_${u.id}`)
            .setLabel(`${u.name.slice(0, 14)} (${curLvl}/${u.maxLevel})`)
            .setEmoji(u.emoji)
            .setStyle(isMax ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(!isOfficer || isMax),
        );
      });

      const buttonsRow2 = new ActionRowBuilder<ButtonBuilder>();
      upgradeEntries.slice(3).forEach((u) => {
        const curLvl = upgrades[u.id] || 0;
        const isMax = curLvl >= u.maxLevel;
        buttonsRow2.addComponents(
          new ButtonBuilder()
            .setCustomId(`gang_up_${u.id}`)
            .setLabel(`${u.name.slice(0, 14)} (${curLvl}/${u.maxLevel})`)
            .setEmoji(u.emoji)
            .setStyle(isMax ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(!isOfficer || isMax),
        );
      });

      rows.push(buttonsRow1, buttonsRow2);

      const embed = baseEmbed(COLORS.gold)
        .setTitle(`🛠️ Guarida Clandestina: [${gang.tag}] ${gang.name}`)
        .setDescription(
          `💰 **Fondos en la Caja Fuerte:** \`${n(gang.balance)} nexocoins\`\n` +
            `*${isOfficer ? "Pulsa un botón para subir de nivel la instalación con los fondos de la banda." : "Solo el líder o los colíderes pueden adquirir reformas."}*\n\n` +
            descLines.join("\n"),
        );

      const msg = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

      if (!isOfficer) return;

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 90_000,
        filter: (i) => i.user.id === uid,
      });

      collector.on("collect", async (btn) => {
        const upId = btn.customId.replace("gang_up_", "");
        const upRes = upgradeGangLair(gid, uid, upId);
        if (!upRes.success) {
          await btn.reply({ embeds: [errorEmbed("Mejora Denegada", upRes.error!)], ephemeral: true });
          return;
        }

        const refreshedGang = getGangById(gid, gang.id)!;
        const refreshedUpgrades = getGangUpgrades(gid, gang.id);

        const newDesc: string[] = [];
        upgradeEntries.forEach((u) => {
          const curLvl = refreshedUpgrades[u.id] || 0;
          const isMax = curLvl >= u.maxLevel;
          const nextCost = !isMax ? u.costs[curLvl] : 0;
          const curBonus = curLvl > 0 ? u.bonuses[curLvl - 1] : "Sin mejoras";
          const nextBonus = !isMax ? u.bonuses[curLvl] : "Máximo alcanzado";

          newDesc.push(
            `${u.emoji} **${u.name} (Nv. ${curLvl}/${u.maxLevel})**\n` +
              `▸ Efecto actual: *${curBonus}*\n` +
              `▸ Siguiente nivel: *${nextBonus}* ${!isMax ? `(Coste: \`${n(nextCost)} 🪙\`)` : "✅ (MÁXIMO)"}\n`,
          );
        });

        // Actualizar estados de botones
        const newRow1 = new ActionRowBuilder<ButtonBuilder>();
        upgradeEntries.slice(0, 3).forEach((u) => {
          const curLvl = refreshedUpgrades[u.id] || 0;
          const isMax = curLvl >= u.maxLevel;
          newRow1.addComponents(
            new ButtonBuilder()
              .setCustomId(`gang_up_${u.id}`)
              .setLabel(`${u.name.slice(0, 14)} (${curLvl}/${u.maxLevel})`)
              .setEmoji(u.emoji)
              .setStyle(isMax ? ButtonStyle.Secondary : ButtonStyle.Primary)
              .setDisabled(isMax),
          );
        });

        const newRow2 = new ActionRowBuilder<ButtonBuilder>();
        upgradeEntries.slice(3).forEach((u) => {
          const curLvl = refreshedUpgrades[u.id] || 0;
          const isMax = curLvl >= u.maxLevel;
          newRow2.addComponents(
            new ButtonBuilder()
              .setCustomId(`gang_up_${u.id}`)
              .setLabel(`${u.name.slice(0, 14)} (${curLvl}/${u.maxLevel})`)
              .setEmoji(u.emoji)
              .setStyle(isMax ? ButtonStyle.Secondary : ButtonStyle.Primary)
              .setDisabled(isMax),
          );
        });

        const updatedEmbed = baseEmbed(COLORS.gold)
          .setTitle(`🛠️ Guarida Clandestina: [${refreshedGang.tag}] ${refreshedGang.name}`)
          .setDescription(
            `💰 **Fondos en la Caja Fuerte:** \`${n(refreshedGang.balance)} nexocoins\`\n` +
              `✅ *¡Mejora completada con éxito!*\n\n` +
              newDesc.join("\n"),
          );

        await btn.update({ embeds: [updatedEmbed], components: [newRow1, newRow2] });
      });

      return;
    }

    // ── SUBCOMANDO: TOP ──
    if (sub === "top") {
      const top = getTopGangs(gid, 10);
      if (top.length === 0) {
        await interaction.reply({
          embeds: [infoEmbed("Sin Bandas", "Aún no se han fundado sindicatos criminales en este servidor. ¡Crea el primero con `/banda crear`!")],
        });
        return;
      }

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const lines = top.map((g, idx) => {
        const medal = medals[idx] || "▪️";
        return `${medal} **[${g.tag}] ${g.name}**\n` +
          `   └ 🏆 Botín: \`${n(g.totalLootEarned)} 🪙\` · 💰 Bóveda: \`${n(g.balance)} 🪙\` · Líder: <@${g.leaderId}>`;
      });

      const embed = baseEmbed(COLORS.gold)
        .setTitle("🏆 Top Bandas Criminales & Sindicatos del Crimen")
        .setDescription(lines.join("\n\n"));

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: TERRITORIOS ──
    if (sub === "territorios") {
      const districts = getDistrictStates(gid);

      const fields = districts.map((ds) => {
        const d = ds.district;
        const controllerStr = ds.controllingGang
          ? `👑 Banda Dominante: **[${ds.controllingGang.tag}] ${ds.controllingGang.name}** (\`${ds.influencePoints} PI\`)\n`
          : "🏳️ Territorio neutral sin control absoluto (mín. 50 PI)\n";

        const contendersStr =
          ds.topContenders.length > 0
            ? "Pujas de influencia:\n" +
              ds.topContenders
                .map((c, i) => `  ${i + 1}. **[${c.gang.tag}] ${c.gang.name}**: \`${c.points} PI\``)
                .join("\n")
            : "  *Sin presencia criminal activa.*";

        return {
          name: `${d.emoji} ${d.name}`,
          value:
            `*${d.description}*\n` +
            `▸ **Efecto de Dominio:** ${d.buffDescription}\n` +
            `▸ **Tributo Diario:** \`${n(d.dailyTributeCoins)} nexocoins/día\`\n` +
            `${controllerStr}` +
            `${contendersStr}`,
        };
      });

      const embed = baseEmbed(COLORS.gold)
        .setTitle("🗺️ Mapa de Dominio Territorial Metropolitano")
        .setDescription(
          "El control de los distritos metropolitanos otorga **+6% de botín adicional** en los asaltos asociados e ingresos de tributo diario a la caja fuerte con `/banda tributo`.\n\n" +
            "⚡ **Cómo disputar territorios:**\n" +
            "▸ Gana asaltos vinculados al distrito con miembros de tu banda (+15 PI por miembro).\n" +
            "▸ Invierte fondos comunales de la caja fuerte con `/banda disputar <distrito> <inversión>`.",
        )
        .addFields(fields);

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: DISPUTAR ──
    if (sub === "disputar") {
      const districtId = interaction.options.getString("distrito", true);
      const amount = interaction.options.getInteger("inversion", true);

      const res = disputeTerritoryWithFunds(gid, uid, districtId, amount);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed("Operación Territorial Denegada", res.error!)], ephemeral: true });
        return;
      }

      const district = METROPOLITAN_DISTRICTS[districtId];
      if (res.tookControl) {
        await interaction.reply({
          embeds: [
            successEmbed(
              `🏴‍☠️ ¡Toma de Control Territorial: ${district.name}!`,
              `Tu sindicato ha desplegado fondos, sicarios y sobornos masivos por **${n(amount)} nexocoins** (+${res.pointsAdded} PI).\n\n` +
                `👑 ¡Habéis alcanzado la cúspide de la influencia y **ahora domináis este distrito**!\n` +
                `▸ Bono activo: *${district.buffDescription}*\n` +
                `▸ Tributo diario disponible: \`${n(district.dailyTributeCoins)} nexocoins\` con \`/banda tributo\`.`,
            ),
          ],
        });
      } else {
        await interaction.reply({
          embeds: [
            successEmbed(
              `🗡️ Influencia Desplegada en ${district.name}`,
              `Se han invertido **${n(amount)} nexocoins** de la caja fuerte de la banda.\n` +
                `▸ Puntos de influencia sumados: **+${res.pointsAdded} PI**\n` +
                `▸ Influencia total acumulada en este distrito: **${res.newTotalPoints} PI**.\n\n` +
                `*Continúa realizando asaltos en este distrito o invierte más fondos para reclamar el control hegemónico (mín. 50 PI).*`,
            ),
          ],
        });
      }
      return;
    }

    // ── SUBCOMANDO: TRIBUTO ──
    if (sub === "tributo") {
      const res = claimDailyGangTribute(gid, uid);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed("Tributo No Disponible", res.error!)], ephemeral: true });
        return;
      }

      const descLines: string[] = [
        `Los recaudadores del sindicato han recorrido los callejones y negocios clandestinos, asegurando los pagos de extorsión y dividendos:\n`,
      ];

      if (res.districtIncome && res.districtIncome > 0) {
        descLines.push(`▸ 🏴‍☠️ **Distritos Dominados:** \`+${n(res.districtIncome)} nexocoins\` (${res.controlledDistricts?.join(", ")})`);
      }
      if (res.garitoIncome && res.garitoIncome > 0) {
        descLines.push(`▸ 🎲 **Garito Clandestino de Apuestas:** \`+${n(res.garitoIncome)} nexocoins\``);
      }
      descLines.push(`\n💰 **Total Ingresado a la Caja Fuerte:** \`+${n(res.totalCollected!)} nexocoins\``);

      await interaction.reply({
        embeds: [successEmbed("💰 Tributo Diario Recaudado con Éxito", descLines.join("\n"))],
      });
      return;
    }

    // ── SUBCOMANDO: CONTRATOS ──
    if (sub === "contratos") {
      const userG = getUserGang(gid, uid);
      if (!userG) {
        await interaction.reply({
          embeds: [errorEmbed("Sin Banda", "Debes pertenecer a un sindicato criminal para ver o cobrar contratos.")],
          ephemeral: true,
        });
        return;
      }

      const claimId = interaction.options.getString("reclamar");
      if (claimId) {
        const claimRes = claimGangContractReward(gid, uid, claimId);
        if (!claimRes.success) {
          await interaction.reply({ embeds: [errorEmbed("Fallo al Cobrar Contrato", claimRes.error!)], ephemeral: true });
          return;
        }

        await interaction.reply({
          embeds: [
            successEmbed(
              "💵 Contrato Cobrado",
              `¡Has cobrado con éxito la recompensa del sindicato!\nSe han transferido **${n(claimRes.rewardCoins!)} nexocoins** a la caja fuerte de tu banda.`,
            ),
          ],
        });
        return;
      }

      const contracts = getGangContracts(gid, userG.gang.id);
      const lines = contracts.map((c) => {
        const pct = Math.min(100, Math.floor((c.progress / c.targetValue) * 100));
        const barFilled = Math.min(10, Math.floor(pct / 10));
        const bar = "█".repeat(barFilled) + "░".repeat(10 - barFilled);

        let statusText = `\`[${bar}]\` **${n(c.progress)} / ${n(c.targetValue)}** (${pct}%)`;
        if (c.completed === 2) {
          statusText += " — ✅ *(Ya cobrado esta semana)*";
        } else if (c.completed === 1) {
          statusText += ` — 🎁 **¡COMPLETADO!** Reclámalo con \`/banda contratos reclamar:${c.contractId}\``;
        } else {
          statusText += " — ⏳ *En curso*";
        }

        return (
          `${c.def.emoji} **${c.def.title}** (Recompensa: \`${n(c.rewardCoins)} 🪙\` a la caja)\n` +
          `*${c.def.description}*\n` +
          `${statusText}\n`
        );
      });

      const embed = baseEmbed(COLORS.gold)
        .setTitle(`📜 Contratos Semanales del Sindicato: [${userG.gang.tag}] ${userG.gang.name}`)
        .setDescription(
          "El mercado negro encomienda misiones criminales semanales a los sindicatos de la ciudad.\n" +
            "Todos los miembros contribuyen conjuntamente al realizar asaltos, superar QTEs o depositar fondos.\n\n" +
            lines.join("\n"),
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: ASCENDER ──
    if (sub === "ascender") {
      const targetUser = interaction.options.getUser("usuario", true);
      const res = promoteGangMember(gid, uid, targetUser.id);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed("Ascenso Denegado", res.error!)], ephemeral: true });
        return;
      }

      const roleInfo = GANG_ROLES_INFO[res.newRole!];
      await interaction.reply({
        embeds: [
          successEmbed(
            "🎖️ Ascenso Jerárquico Otorgado",
            `El miembro <@${targetUser.id}> ha ascendido de rango en el sindicato a ${roleInfo.badge} **${roleInfo.name}**.\n¡Que su lealtad continúe enriqueciendo a la familia!`,
          ),
        ],
      });
      return;
    }

    // ── SUBCOMANDO: DEGRADAR ──
    if (sub === "degradar") {
      const targetUser = interaction.options.getUser("usuario", true);
      const res = demoteGangMember(gid, uid, targetUser.id);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed("Degradación Denegada", res.error!)], ephemeral: true });
        return;
      }

      const roleInfo = GANG_ROLES_INFO[res.newRole!];
      await interaction.reply({
        embeds: [
          successEmbed(
            "🔻 Rango Degradado",
            `El miembro <@${targetUser.id}> ha sido degradado disciplinariamente a ${roleInfo.badge} **${roleInfo.name}**.`,
          ),
        ],
      });
      return;
    }

    // ── SUBCOMANDO: LEMA ──
    if (sub === "lema") {
      const text = interaction.options.getString("texto", true);
      const res = setGangMotto(gid, uid, text);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed("Fallo al Fijar Lema", res.error!)], ephemeral: true });
        return;
      }

      await interaction.reply({
        embeds: [
          successEmbed(
            "📜 Lema de la Banda Actualizado",
            `El nuevo lema oficial de tu sindicato criminal es:\n\n*«${res.motto}»*`,
          ),
        ],
      });
      return;
    }

    // ── SUBCOMANDO: INVERTIR ──
    if (sub === "invertir") {
      const gangQuery = interaction.options.getString("banda", true);
      const amount = interaction.options.getInteger("cantidad", true);

      const gang = getGangByNameOrTag(gid, gangQuery);
      if (!gang) {
        await interaction.reply({
          embeds: [errorEmbed("Banda No Encontrada", `No se ha encontrado ninguna banda criminal con el nombre o tag \`${gangQuery}\`.`)],
          ephemeral: true,
        });
        return;
      }

      const res = investInGang(gid, gang.id, uid, amount);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed("Inversión Fallida", res.error!)], ephemeral: true });
        return;
      }

      const embed = successEmbed(
        "📈 ¡Inversión en Sindicato Criminal Registrada!",
        `Has invertido **${n(amount)}** en bonos de la banda **${gang.name} [${gang.tag}]**.\n\n` +
          `▸ **Fondos al Tesoro:** El capital ha sido transferido a la caja fuerte de la banda para costear mejoras y asaltos.\n` +
          `▸ **Dividendos Automáticos:** Recibirás un porcentaje proporcional del **10% de todos los botines y tributos** obtenidos por la banda.\n` +
          `▸ **Cobro:** Usa \`/banda dividendos\` en cualquier momento para ingresar tus ganancias acumuladas.`,
      );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: DIVIDENDOS ──
    if (sub === "dividendos") {
      const userInvs = getUserGangInvestments(gid, uid);
      if (userInvs.length === 0) {
        await interaction.reply({
          embeds: [
            infoEmbed(
              "Sin Inversiones Activas",
              `No posees bonos ni participaciones en ninguna banda criminal.\nPuedes invertir fondos en cualquier sindicato con \`/banda invertir <banda> <monto>\` para ganar dividendos pasivos de sus golpes.`,
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      const totalPending = userInvs.reduce((sum, i) => sum + i.accumulatedDividends, 0);

      if (totalPending > 0) {
        const claimRes = claimGangDividends(gid, uid);
        const lines = userInvs.map(
          (i) => `• **${i.gangName} [${i.gangTag}]**: Invertido **${n(i.amountInvested)}**`,
        );

        const embed = successEmbed(
          "💰 ¡Dividendos de Banda Cobrados!",
          `Has retirado **+${n(claimRes.totalClaimed)}** en dividendos directos a tu cartera.\n\n` +
            `**Tus Inversiones:**\n${lines.join("\n")}`,
        );

        await interaction.reply({ embeds: [embed] });
      } else {
        const lines = userInvs.map(
          (i) => `• **${i.gangName} [${i.gangTag}]**: Invertido **${n(i.amountInvested)}** · *Pendiente: 0 🪙*`,
        );

        const embed = infoEmbed(
          "📊 Cartera de Inversiones en Bandas",
          `Actualmente no hay nuevos dividendos pendientes por reclamar.\n\n**Participaciones Activas:**\n${lines.join("\n")}\n\n*Los dividendos se generan automáticamente cada vez que tus bandas superan asaltos o cobran tributos.*`,
        );

        await interaction.reply({ embeds: [embed] });
      }
      return;
    }

    // ── SUBCOMANDO: DESINVERTIR ──
    if (sub === "desinvertir") {
      const gangQuery = interaction.options.getString("banda", true);
      const gang = getGangByNameOrTag(gid, gangQuery);
      if (!gang) {
        await interaction.reply({
          embeds: [errorEmbed("Banda No Encontrada", `No se ha encontrado la banda \`${gangQuery}\`.`)],
          ephemeral: true,
        });
        return;
      }

      const res = divestFromGang(gid, gang.id, uid);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed("Liquidación Denegada", res.error!)], ephemeral: true });
        return;
      }

      const embed = successEmbed(
        "📉 Inversión Liquidada",
        `Has retirado tu inversión en la banda **${gang.name} [${gang.tag}]**.\n\n` +
          `▸ **Importe Reembolsado:** **+${n(res.returnedAmount!)}** netos recibidos en tu cartera.\n` +
          `▸ 🔥 **Tasa de Rescisión (10%):** **-${n(res.burnedFee!)}** destruidas de la economía como penalización de salida.`,
      );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: INVERSORES ──
    if (sub === "inversores") {
      const gangQuery = interaction.options.getString("banda");
      let gang = null;
      if (gangQuery) {
        gang = getGangByNameOrTag(gid, gangQuery);
      } else {
        const userGang = getUserGang(gid, uid);
        if (userGang) gang = userGang.gang;
      }

      if (!gang) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              "Banda no especificada",
              "Debes indicar el nombre o tag de una banda criminal (`/banda inversores banda:<nombre>`), o pertenecer a una.",
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      const investors = getGangInvestments(gid, gang.id);
      if (investors.length === 0) {
        await interaction.reply({
          embeds: [
            infoEmbed(
              `🏛️ Inversores de ${gang.name} [${gang.tag}]`,
              `Esta banda criminal aún no tiene accionistas externos.\nCualquier usuario puede respaldar su tesoro con \`/banda invertir banda:${gang.tag} cantidad:<monto>\`.`,
            ),
          ],
        });
        return;
      }

      const totalCap = investors.reduce((sum, i) => sum + i.amountInvested, 0);
      const lines = investors.map((inv, idx) => {
        const pct = ((inv.amountInvested / totalCap) * 100).toFixed(1);
        return `**${idx + 1}.** <@${inv.investorId}> — **${n(inv.amountInvested)}** (${pct}%) · *Div. acum: ${n(inv.accumulatedDividends)}*`;
      });

      const embed = baseEmbed(COLORS.gold)
        .setTitle(`📈 Cuadro de Inversores: ${gang.name} [${gang.tag}]`)
        .setDescription(
          `**Capital Total Invertido:** **${n(totalCap)}**\n` +
            `**Accionistas:** \`${investors.length}\` inversores activos\n\n` +
            `${lines.slice(0, 15).join("\n")}`,
        )
        .setFooter({ text: "Los inversores reciben el 10% de todo el botín y tributos recaudados por la banda" });

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};

export default command;
