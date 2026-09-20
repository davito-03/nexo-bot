import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import type { Command } from "../../types/index.js";
import { baseEmbed, errorEmbed, successEmbed, infoEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { n, invOf, getEco } from "../../modules/economy/engine.js";
import { startBankHeist, resetGuildHeistLobby, clearHeistMemoryCooldown, HEIST_COOLDOWN_MS } from "../../modules/economy/heist.js";
import {
  HEIST_ROLES,
  HEIST_TARGETS,
  STANDARD_TARGET_IDS,
  getTargetSecurity,
  getAvailableTargetsForGuild,
  isDavitoUnlocked,
  getDavitoUnlockProgress,
  getUserHeistProfile,
  getAllUserRoleStates,
  getTopHeistCriminals,
  BLACK_MARKET_ITEMS,
  buyBlackMarketItem,
  setTargetSecurityLevel,
  resetTargetCooldown,
} from "../../modules/economy/heistEngine.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("asalto")
    .setDescription("Sistema avanzado de asaltos cooperativos y crimen organizado en Nexo")
    .addSubcommand((s) =>
      s
        .setName("iniciar")
        .setDescription("Convoca u organiza un asalto táctico cooperativo (Banco, Casino, Mansión, etc.)")
        .addStringOption((o) =>
          o
            .setName("objetivo")
            .setDescription("Objetivo a asaltar (Banco Central, Casino, Mansión, Nexo Corp, etc.)")
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("info")
        .setDescription("Consulta la información de todos los asaltos, niveles de blindaje y temporizadores")
        .addStringOption((o) =>
          o
            .setName("objetivo")
            .setDescription("Objetivo específico a inspeccionar en detalle (opcional)")
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("objetivos")
        .setDescription("Consulta los niveles de seguridad, multiplicadores y estado de los objetivos de asalto")
        .addStringOption((o) =>
          o
            .setName("objetivo")
            .setDescription("Objetivo específico a inspeccionar en detalle")
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("perfil")
        .setDescription("Consulta tu historial criminal, reputación y nivel en cada rol táctico")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario a consultar (por defecto tú)")),
    )
    .addSubcommand((s) =>
      s.setName("roles").setDescription("Consulta la guía y habilidades de los 7 roles tácticos de asalto"),
    )
    .addSubcommand((s) =>
      s
        .setName("mercadonegro")
        .setDescription("Adquiere equipamiento táctico de contrabando para los asaltos")
        .addStringOption((o) =>
          o
            .setName("articulo")
            .setDescription("Artículo del mercado negro que deseas comprar")
            .addChoices(BLACK_MARKET_ITEMS.map((it) => ({ name: `${it.emoji} ${it.name} (${n(it.price)})`, value: it.id }))),
        )
        .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad a comprar (por defecto 1)").setMinValue(1).setMaxValue(10)),
    )
    .addSubcommand((s) =>
      s.setName("top").setDescription("Clasificación de las mayores mentes criminales del servidor"),
    )
    .addSubcommand((s) =>
      s.setName("reiniciar").setDescription("Desatasca o cancela forzosamente un lobby de asalto activo (Staff o Líder)"),
    )
    .addSubcommand((s) =>
      s
        .setName("admin-cooldown")
        .setDescription("Reinicia el cooldown de los asaltos (Roles Staff/Owner autorizados)")
        .addStringOption((o) =>
          o
            .setName("objetivo")
            .setDescription("Objetivo específico a resetear (o 'todos' por defecto)")
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("admin-nivel")
        .setDescription("Fija el nivel de seguridad de un objetivo de asalto (Roles Staff/Owner autorizados)")
        .addStringOption((o) =>
          o
            .setName("objetivo")
            .setDescription("Objetivo a modificar")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addIntegerOption((o) =>
          o
            .setName("nivel")
            .setDescription("Nivel de seguridad a fijar (1 a 10)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: "Este comando solo se puede utilizar dentro del servidor.",
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand(false) ?? "iniciar";
    const gid = interaction.guildId;

    if (sub === "iniciar") {
      const targetArg = interaction.options.getString("objetivo") || "banco";
      return startBankHeist(interaction, targetArg);
    }

    if (sub === "info" || sub === "banco" || sub === "objetivos") {
      const targetOpt = interaction.options.getString("objetivo");
      const davitoUnlocked = isDavitoUnlocked(gid);

      // Si especificó un objetivo concreto, mostrar ficha detallada
      if (targetOpt) {
        const targetKey = targetOpt.toLowerCase().trim();
        const targetDef = HEIST_TARGETS[targetKey];

        if (!targetDef || (targetDef.isSecret && !davitoUnlocked)) {
          await interaction.reply({
            embeds: [errorEmbed("Objetivo no encontrado", "El objetivo especificado no existe o aún no ha sido descubierto.")],
            ephemeral: true,
          });
          return;
        }

        const sec = getTargetSecurity(gid, targetDef.id);
        const isOnCooldown = sec.lastHeistAt > 0 && Date.now() - sec.lastHeistAt < HEIST_COOLDOWN_MS;
        const readyTimestamp = Math.floor((sec.lastHeistAt + HEIST_COOLDOWN_MS) / 1000);
        const alertStatus = isOnCooldown
          ? `🚨 **En alerta roja** · Disponible <t:${readyTimestamp}:R> (<t:${readyTimestamp}:T>)`
          : `🟢 **Vigilancia rutinaria** · ¡Disponible para asaltar ahora!`;

        const isDavito = targetDef.id === "davito";
        const embedColor = isDavito ? 0x990000 : COLORS.warn;

        const embed = baseEmbed(embedColor)
          .setTitle(`${targetDef.emoji} Estado Táctico: ${targetDef.name}`)
          .setDescription(
            `*${targetDef.description}*\n\n` +
              `🔒 **Nivel de Blindaje Actual:** ${sec.tier.emoji} **Nivel ${sec.securityLevel}: ${sec.tier.name}**\n` +
              `📜 **Defensas:** *${sec.tier.description}*\n\n` +
              (!isDavito
                ? `▸ **Dificultad de infiltración:** \`${sec.tier.difficultyMod}%\` de penalización\n` +
                  `▸ **Multiplicador de botín:** **×${sec.tier.lootMultiplier}** sobre botín base (${n(targetDef.baseLootMin)} - ${n(targetDef.baseLootMax)})\n` +
                  `▸ **Racha de asaltos exitosos:** **${sec.consecutiveWins}** victorias consecutivas\n`
                : `▸ **Dificultad de infiltración:** ☠️ **Casi imposible (Éxito estrictamente < 1%)**\n` +
                  `▸ **Recompensa Legendaria:** **🪙 100.000.000 nexocoins** para cada miembro + Rol <@&1551207417973440542>\n`) +
              `▸ **Estado de alerta:** ${alertStatus}\n\n` +
              (!isDavito
                ? `💡 *Nota: Cada asalto exitoso sube +1 nivel de seguridad (hasta Nv. 10). Si fracasa, baja -1 nivel y se aplican multas de hasta 50.000 🪙.*`
                : `👑 *¡Has alcanzado el mayor desafío del servidor! Planifica tu golpe con \`/asalto iniciar objetivo:davito\`.*`),
          );

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // Vista general del directorio de objetivos y progreso hacia Davito
      const unlockProg = getDavitoUnlockProgress(gid);
      const percent = Math.round((unlockProg.maxedCount / unlockProg.totalStandard) * 100);
      const filled = Math.round((unlockProg.maxedCount / unlockProg.totalStandard) * 10);
      const bar = "█".repeat(filled) + "░".repeat(10 - filled);

      const targetLines = STANDARD_TARGET_IDS.map((tid) => {
        const tDef = HEIST_TARGETS[tid]!;
        const sec = getTargetSecurity(gid, tid);
        const maxBadge = sec.securityLevel >= 10 ? "⭐ **[NIVEL MÁXIMO]**" : `(Nv. ${sec.securityLevel}/10)`;
        const isOnCooldown = sec.lastHeistAt > 0 && Date.now() - sec.lastHeistAt < HEIST_COOLDOWN_MS;
        const readyTimestamp = Math.floor((sec.lastHeistAt + HEIST_COOLDOWN_MS) / 1000);
        const timerText = isOnCooldown
          ? `🚨 **En alerta roja** · Disponible <t:${readyTimestamp}:R>`
          : `🟢 **Disponible ahora**`;
        return `${tDef.emoji} **${tDef.name}**\n▸ Blindaje: ${sec.tier.emoji} **Nivel ${sec.securityLevel}: ${sec.tier.name}** ${maxBadge}\n▸ Botín base: **${n(tDef.baseLootMin)} - ${n(tDef.baseLootMax)}** (Multiplicador: ×${sec.tier.lootMultiplier})\n▸ Temporizador: ${timerText}`;
      });

      let classifiedSection = "";
      if (unlockProg.isUnlocked) {
        const secDavito = getTargetSecurity(gid, "davito");
        const isDavitoCooldown = secDavito.lastHeistAt > 0 && Date.now() - secDavito.lastHeistAt < HEIST_COOLDOWN_MS;
        const readyDavitoTs = Math.floor((secDavito.lastHeistAt + HEIST_COOLDOWN_MS) / 1000);
        const davitoTimer = isDavitoCooldown
          ? `🚨 **En alerta roja** · Disponible <t:${readyDavitoTs}:R>`
          : `🟢 **Disponible ahora**`;

        classifiedSection =
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👑 **¡¡¡CÓDIGO OMEGA: FORTALEZA DE DAVITO DESBLOQUEADA!!!** 👑\n` +
          `¡Todos los objetivos de asalto del servidor han alcanzado el Nivel Máximo 10!\n` +
          `▸ **Dificultad:** ☠️ Casi imposible (**menor al 1% de éxito** incluso con el mejor equipamiento).\n` +
          `▸ **Recompensa:** Rol honorífico <@&1551207417973440542> y **🪙 100.000.000 nexocoins** por asaltante.\n` +
          `▸ **Temporizador:** ${davitoTimer}\n` +
          `▸ Inicia este golpe legendario con: \`/asalto iniciar objetivo:davito\``;
      } else {
        classifiedSection =
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🔒 **Proyecto de Asalto Clasificado:** \`[${bar}]\` **${unlockProg.maxedCount}/${unlockProg.totalStandard} Máximos (${percent}%)**\n` +
          `*Alcanza el Nivel 10 de seguridad en todos los objetivos para desclasificar el asalto legendario definitivo.*`;
      }

      const embed = baseEmbed(COLORS.crime)
        .setTitle("🗺️ Panel de Operaciones & Asaltos de Nexo")
        .setDescription(
          `Información táctica de todos los objetivos, niveles de blindaje y temporizadores en tiempo real.\n` +
            `Para organizar un golpe usa \`/asalto iniciar [objetivo]\` o inspecciona uno con \`/asalto info objetivo:<nombre>\`.\n\n` +
            targetLines.join("\n\n") +
            "\n\n" +
            classifiedSection,
        )
        .setFooter({ text: "Usa /asalto info objetivo:<nombre> para ver la ficha técnica detallada de un objetivo" });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "roles") {
      const embed = baseEmbed(COLORS.crime)
        .setTitle("🎭 Roles Tácticos de Asalto & Especializaciones")
        .setDescription(
          `Cada miembro de la banda aporta habilidades únicas al golpe. Una banda diversa desbloquea potentes sinergias:\n\n` +
            `• **Sinergia Táctica (3+ roles distintos):** +5% de probabilidad de éxito y +10% de botín.\n` +
            `• **Sinergia Perfecta (5+ roles distintos):** +10% de probabilidad de éxito y +20% de botín.\n` +
            `• **Sindicato Total (los 7 roles presentes):** +14% de éxito supremo y +30% de botín colosal.\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        );

      for (const r of Object.values(HEIST_ROLES)) {
        embed.addFields({
          name: `${r.emoji}  ${r.name}`,
          value: `*${r.description}*\n▸ **Habilidad pasiva:** ${r.passive}`,
          inline: false,
        });
      }

      embed.setFooter({ text: "Gana XP en cada rol participando en asaltos para subir de nivel y potenciar tus bonus." });
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "perfil") {
      const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
      const profile = getUserHeistProfile(gid, targetUser.id);
      const roleStates = getAllUserRoleStates(gid, targetUser.id);
      const eco = getEco(gid, targetUser.id);
      const inv = invOf(eco);

      const activeRoleDef = HEIST_ROLES[profile.activeRole] || HEIST_ROLES.tirador;
      const winRate = profile.totalHeists > 0 ? Math.round((profile.heistsWon / profile.totalHeists) * 100) : 0;

      const roleFields = roleStates.map((rs) => {
        const percent = Math.min(100, Math.round((rs.xp / rs.xpNeeded) * 100));
        return `${rs.def.emoji} **${rs.def.name}**: Nv. **${rs.level}** (*${rs.title}*) — \`${rs.xp}/${rs.xpNeeded} XP\` (${percent}%)`;
      });

      // Equipamiento táctico en posesión
      const tacticalItems = [
        inv.c4 ? `💣 C4: **${inv.c4}**` : null,
        inv.inhibidor_emp ? `📟 Inhibidor EMP: **${inv.inhibidor_emp}**` : null,
        inv.taladro_termico ? `🔥 Taladro Térmico: **${inv.taladro_termico}**` : null,
        inv.furgon_blindado ? `🚗 Furgón Blindado: **${inv.furgon_blindado}**` : null,
        inv.mascara_balistica ? `🎭 Máscara Balística: **${inv.mascara_balistica}**` : null,
        inv.adrenalina ? `💉 Adrenalina: **${inv.adrenalina}**` : null,
      ].filter(Boolean);

      const gearText = tacticalItems.length > 0 ? tacticalItems.join(" · ") : "*Sin equipamiento táctico.*";

      const embed = baseEmbed(COLORS.crime)
        .setTitle(`🗃️ Carnet Criminal de ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setDescription(
          `Rango del Inframundo: **${profile.rankTitle}**\n` +
            `Rol predilecto: ${activeRoleDef.emoji} **${activeRoleDef.name}**\n\n` +
            `📊 **Historial de Operaciones:**\n` +
            `▸ **Asaltos participados:** \`${profile.totalHeists}\`\n` +
            `▸ **Golpes exitosos:** \`${profile.heistsWon}\` (*${winRate}% éxito*)\n` +
            `▸ **Botín histórico acumulado:** **${n(profile.totalLoot)}**\n` +
            `▸ **Puntos de Reputación Criminal:** **⭐ ${profile.reputation}**\n\n` +
            `🎖️ **Especializaciones de Rol:**\n${roleFields.join("\n")}\n\n` +
            `🎒 **Equipamiento del Mercado Negro en posesión:**\n${gearText}`,
        )
        .setFooter({ text: "Sube de nivel tus roles participando en asaltos para aumentar la tasa de éxito de tu banda." });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "mercadonegro") {
      const itemId = interaction.options.getString("articulo");
      const qty = interaction.options.getInteger("cantidad") ?? 1;

      // Si especificó artículo -> comprar
      if (itemId) {
        const res = buyBlackMarketItem(gid, interaction.user.id, itemId, qty);
        if (!res.ok) {
          await interaction.reply({ embeds: [errorEmbed("Compra rechazada", res.message)], ephemeral: true });
          return;
        }

        await interaction.reply({
          embeds: [
            successEmbed("Adquisición en el Mercado Negro", res.message + "\n\n*El equipamiento se utilizará automáticamente en tu próximo asalto.*"),
          ],
        });
        return;
      }

      // Catálogo interactivo
      const embed = baseEmbed(COLORS.crime)
        .setTitle("🕵️ Mercado Negro de Nexo · Contrabando de Asalto")
        .setDescription(
          `Suministros militares y herramientas de brecha de contrabando. Adquiere ventajas estratégicas para asaltar la cámara acorazada del Banco Central.\n\n` +
            `*Para comprar utiliza \`/asalto mercadonegro articulo:<nombre> [cantidad:<n>]\`.*\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        );

      for (const it of BLACK_MARKET_ITEMS) {
        embed.addFields({
          name: `${it.emoji}  ${it.name} — ${n(it.price)}`,
          value: `*${it.description}*\n▸ **Efecto táctico:** \`${it.effect}\``,
          inline: false,
        });
      }

      embed.setFooter({ text: "Los consumibles tácticos se activan y consumen automáticamente al iniciar el asalto." });
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "top") {
      const top = getTopHeistCriminals(gid, 10);
      if (top.length === 0) {
        await interaction.reply({
          embeds: [infoEmbed("Top Criminal", "Aún no se han registrado asaltantes en el historial del servidor.")],
        });
        return;
      }

      const lines = top.map((t, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**#${i + 1}**`;
        const rDef = HEIST_ROLES[t.activeRole] || HEIST_ROLES.tirador;
        return `${medal} <@${t.userId}> — ⭐ **${t.reputation}** Rep. | ${rDef.emoji} ${t.heistsWon} victorias | 💰 **${n(t.totalLoot)}**\n└ *${t.rankTitle}*`;
      });

      const embed = baseEmbed(COLORS.crime)
        .setTitle("👑 Clasificación de Mentes Maestras Criminales")
        .setDescription(
          `Los asaltantes más temidos y respetados del Banco Central de Nexo:\n\n${lines.join("\n\n")}`,
        )
        .setFooter({ text: "Gana asaltos al banco para escalar puestos en la jerarquía criminal." });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "reiniciar") {
      const deleted = resetGuildHeistLobby(gid);
      if (deleted) {
        await interaction.reply({
          embeds: [
            successEmbed(
              "Lobby de asalto reseteado",
              "El lobby de asalto que estaba activo o atascado en este servidor ha sido reiniciado con éxito. Ya se puede iniciar un nuevo golpe.",
            ),
          ],
        });
      } else {
        await interaction.reply({
          embeds: [
            infoEmbed(
              "Sin asaltos activos",
              "No hay ningún lobby de asalto activo o bloqueado en este momento en el servidor.",
            ),
          ],
          ephemeral: true,
        });
      }
      return;
    }

    if (sub === "admin-cooldown" || sub === "admin-nivel") {
      const AUTHORIZED_ROLES = ["1394312887677227120", "1394313808960557128"];
      const hasPerm = interaction.member.roles.cache.some((r) => AUTHORIZED_ROLES.includes(r.id));
      if (!hasPerm) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              "Acceso Denegado",
              "Este comando está reservado exclusivamente para los roles de Staff (<@&1394313808960557128>) y Owner (<@&1394312887677227120>).",
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      if (sub === "admin-cooldown") {
        const rawTarget = interaction.options.getString("objetivo") || "todos";
        const targetId = rawTarget.toLowerCase().trim();

        resetTargetCooldown(gid, targetId);
        clearHeistMemoryCooldown(gid);
        resetGuildHeistLobby(gid);

        const targetDesc =
          targetId === "todos"
            ? "de **todos los objetivos de asalto del servidor**"
            : `del objetivo **${HEIST_TARGETS[targetId]?.name || targetId}**`;

        await interaction.reply({
          embeds: [
            successEmbed(
              "Cooldown de Asalto Reiniciado",
              `Se ha reiniciado el temporizador de alerta roja ${targetDesc}.\nLos miembros pueden iniciar nuevos asaltos inmediatamente.`,
            ),
          ],
        });
        return;
      }

      if (sub === "admin-nivel") {
        const rawTarget = interaction.options.getString("objetivo", true).toLowerCase().trim();
        const levelArg = interaction.options.getInteger("nivel", true);

        const targetDef = HEIST_TARGETS[rawTarget];
        if (!targetDef) {
          await interaction.reply({
            embeds: [errorEmbed("Objetivo inválido", `El objetivo \`${rawTarget}\` no existe.`)],
            ephemeral: true,
          });
          return;
        }

        const { security: updatedSec, justUnlockedDavito } = setTargetSecurityLevel(gid, targetDef.id, levelArg);

        let unlockNotice = "";
        if (justUnlockedDavito) {
          unlockNotice =
            `\n\n🚨 **¡¡¡ALERTA OMEGA: LA FORTALEZA DE DAVITO HA SIDO DESBLOQUEADA!!!** 🚨\n` +
            `¡Todos los objetivos estándar han alcanzado el Nivel 10! El asalto secreto ya está disponible en \`/asalto iniciar objetivo:davito\`.`;
        }

        await interaction.reply({
          embeds: [
            successEmbed(
              "Nivel de Seguridad Actualizado",
              `Se ha fijado el nivel de seguridad de **${targetDef.name}** a **Nivel ${updatedSec.securityLevel}**.\n\n` +
                `🛡️ **Tier Activo:** ${updatedSec.tier.emoji} **${updatedSec.tier.name}**\n` +
                `📜 **Descripción:** *${updatedSec.tier.description}*\n` +
                `▸ **Dificultad base:** \`${updatedSec.tier.difficultyMod}%\`\n` +
                `▸ **Multiplicador de botín:** \`×${updatedSec.tier.lootMultiplier}\`` +
                unlockNotice,
            ),
          ],
        });
        return;
      }
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.respond([]);
      return;
    }

    const focused = interaction.options.getFocused(true);
    if (focused.name === "objetivo") {
      const gid = interaction.guildId;
      const sub = interaction.options.getSubcommand(false);
      const isStaffUser = interaction.member.roles.cache.some((r) =>
        ["1394312887677227120", "1394313808960557128"].includes(r.id),
      );

      const q = focused.value.toLowerCase().trim();
      let list: { id: string; name: string; emoji: string; isSecret?: boolean }[] = [];

      if (sub === "admin-cooldown" && isStaffUser) {
        list.push({ id: "todos", name: "Todos los objetivos (Reinicio global)", emoji: "🔄" });
      }

      if (isStaffUser && (sub === "admin-cooldown" || sub === "admin-nivel")) {
        list = list.concat(Object.values(HEIST_TARGETS));
      } else {
        list = list.concat(getAvailableTargetsForGuild(gid));
      }

      const filtered = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q),
      );

      await interaction.respond(
        filtered.slice(0, 25).map((t) => ({
          name: `${t.emoji} ${t.name}${t.isSecret ? " 👑 [CLASIFICADO / LEGENDARIO]" : ""}`,
          value: t.id,
        })),
      );
    }
  },
};

export default command;
