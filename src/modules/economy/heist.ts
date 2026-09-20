import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ChatInputCommandInteraction,
  type User,
} from "discord.js";
import { getDb } from "../../database/index.js";
import { baseEmbed, errorEmbed, successEmbed, infoEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { getEco, saveEco, addWallet, deductFunds, jailCheck, n, rng, invOf, takeItem } from "./engine.js";
import { checkUserAchievements } from "./achievements.js";
import { logger } from "../../logger.js";
import { renderHeistHud, type CanvasCrewMember } from "./heistCanvas.js";
import { getHeistQteForTarget, DAVITO_QTE_GAUNTLET, type HeistQteOption } from "./heistQTE.js";
import {
  HEIST_ROLES,
  HEIST_TARGETS,
  STANDARD_TARGET_IDS,
  getTargetSecurity,
  recordTargetHeistResult,
  isDavitoUnlocked,
  getDavitoUnlockProgress,
  DAVITO_ROLE_ID,
  DAVITO_REWARD_COINS,
  getUserHeistProfile,
  getUserRoleState,
  setUserActiveRole,
  awardHeistXp,
  getRoleTitle,
  type HeistRoleDef,
  type HeistTargetDef,
  type BankSecurityInfo,
} from "./heistEngine.js";

export const HEIST_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos entre golpes al mismo objetivo
const lastHeistMap = new Map<string, number>();

interface ActiveLobby {
  startedAt: number;
  leaderId: string;
  targetId: string;
}

const activeHeistLobbies = new Map<string, ActiveLobby>();

export const HEIST_MEDIA: Record<string, string> = {
  banco: "https://media.giphy.com/media/l0HlOBZREZVEIfKVO/giphy.gif",
  casino: "https://media.giphy.com/media/26uf2JHNV0Tq3ugkE/giphy.gif",
  mansion: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif",
  empresa: "https://media.giphy.com/media/26n6WywJyh39n1pBu/giphy.gif",
  tren_blindado: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif",
  estacion_espacial: "https://media.giphy.com/media/l41JGlWa1xYFU55mg/giphy.gif",
  submarino: "https://media.giphy.com/media/3o7TKtnuHOHHUjR38Y/giphy.gif",
  museo: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif",
  davito: "https://media.giphy.com/media/l41JGlWa1xYFU55mg/giphy.gif",
  qte: "https://media.giphy.com/media/13d2jHlSlxklVe/giphy.gif",
  phase3: "https://media.giphy.com/media/RYKFEEjtYpxL2/giphy.gif",
  victory: "https://media.giphy.com/media/3o6gDWzmAzrpi5DQU8/giphy.gif",
  escape: "https://media.giphy.com/media/xT5LMGfQrJPpHXdsEQ/giphy.gif",
  failure: "https://media.giphy.com/media/3o7TKwmnDgQb5jemjK/giphy.gif",
};

/**
 * Permite desatascar o reiniciar un lobby huérfano de asalto.
 */
export function resetGuildHeistLobby(guildId: string): boolean {
  return activeHeistLobbies.delete(guildId);
}

export function isGuildHeistLobbyActive(guildId: string): boolean {
  const lobby = activeHeistLobbies.get(guildId);
  if (!lobby) return false;
  if (Date.now() - lobby.startedAt > 85_000) {
    activeHeistLobbies.delete(guildId);
    return false;
  }
  return true;
}

export function clearHeistMemoryCooldown(guildId: string): void {
  lastHeistMap.delete(guildId);
}

interface CrewMemberData {
  userId: string;
  username: string;
  roleId: string;
  roleLevel: number;
  roleTitle: string;
  avatarUrl?: string;
}

export async function startBankHeist(
  interaction: ChatInputCommandInteraction,
  targetId = "banco",
): Promise<void> {
  const gid = interaction.guildId!;
  const leader = interaction.user;

  // Resolver objetivo seleccionado
  const rawTarget = (interaction.options?.getString("objetivo") || targetId || "banco").toLowerCase().trim();
  const targetDef: HeistTargetDef = HEIST_TARGETS[rawTarget] || HEIST_TARGETS.banco;

  // Si intenta asaltar a Davito antes de desbloquearlo, denegar acceso secreto
  if (targetDef.isSecret && !isDavitoUnlocked(gid)) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          "Objetivo Desconocido",
          "El objetivo especificado no existe o no ha sido descubierto aún en el inframundo de Nexo.",
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  // Comprobar si ya hay un lobby activo en este servidor con expiración automática (85s)
  const existingLobby = activeHeistLobbies.get(gid);
  if (existingLobby) {
    if (Date.now() - existingLobby.startedAt > 85_000) {
      logger.warn(`Lobby de asalto huérfano expirado en guild ${gid}. Limpiando automáticamente...`);
      activeHeistLobbies.delete(gid);
    } else {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Asalto en planificación",
            "Ya hay una banda organizando un asalto en este servidor. ¡Únete a ella o espera a que concluya!",
          ),
        ],
        ephemeral: true,
      });
      return;
    }
  }

  // Comprobar cooldown específico de este objetivo
  const targetSec = getTargetSecurity(gid, targetDef.id);
  const now = Date.now();
  if (targetSec.lastHeistAt > 0 && now - targetSec.lastHeistAt < HEIST_COOLDOWN_MS) {
    const readyAt = Math.floor((targetSec.lastHeistAt + HEIST_COOLDOWN_MS) / 1000);
    await interaction.reply({
      embeds: [
        errorEmbed(
          `🚨 Alerta de Seguridad: ${targetDef.name}`,
          `Las defensas de **${targetDef.name}** están en alerta roja por un golpe reciente.\nLos guardias y escáneres no bajarán la guardia hasta <t:${readyAt}:R> (<t:${readyAt}:T>).\n\n💡 *Puedes consultar los temporizadores de todos los asaltos con \`/asalto info\`.*`,
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const leaderEco = getEco(gid, leader.id);
  const jailed = jailCheck(leaderEco);
  if (jailed) {
    await interaction.reply({
      embeds: [errorEmbed("Estás en el calabozo", jailed)],
      ephemeral: true,
    });
    return;
  }

  activeHeistLobbies.set(gid, { startedAt: Date.now(), leaderId: leader.id, targetId: targetDef.id });

  // Obtener rol del líder
  const leaderProfile = getUserHeistProfile(gid, leader.id);
  const leaderRoleState = getUserRoleState(gid, leader.id, leaderProfile.activeRole);

  const crew = new Map<string, CrewMemberData>();
  crew.set(leader.id, {
    userId: leader.id,
    username: leader.username,
    roleId: leaderRoleState.roleId,
    roleLevel: leaderRoleState.level,
    roleTitle: leaderRoleState.title,
    avatarUrl: leader.displayAvatarURL({ extension: "png", size: 128 }),
  });

  const heistId = `heist_${Date.now()}`;
  const endsAt = Math.floor((Date.now() + 65_000) / 1000);

  // Analizar la banda, sinergias y equipamiento según el objetivo
  const calculateHeistStats = (targetSecInfo: BankSecurityInfo) => {
    const members = Array.from(crew.values());
    const crewSize = members.length;
    const isDavito = targetDef.id === "davito";

    // Base por tamaño de banda: 22% + 4% por cada cómplice adicional
    let baseWinRate = 22 + (crewSize - 1) * 4;

    // Modificador de seguridad del objetivo
    const securityMod = targetSecInfo.tier.difficultyMod;
    baseWinRate += securityMod;

    // Roles presentes: agrupamos por nivel más alto para evitar desbalance por duplicados
    const roleMap = new Map<string, number>();
    for (const m of members) {
      const cur = roleMap.get(m.roleId) ?? 0;
      if (m.roleLevel > cur) roleMap.set(m.roleId, m.roleLevel);
    }

    let roleProbBonus = 0;
    let lootBonusPct = 0;

    const hackerLvl = roleMap.get("hacker");
    if (hackerLvl !== undefined) {
      roleProbBonus += 3 + hackerLvl * 1.0;
    }
    const shooterLvl = roleMap.get("tirador");
    if (shooterLvl !== undefined) {
      roleProbBonus += 4 + shooterLvl * 1.0;
    }
    const infiltratorLvl = roleMap.get("infiltrador");
    if (infiltratorLvl !== undefined) {
      roleProbBonus += 3 + infiltratorLvl * 1.0;
    }
    const demolitionsLvl = roleMap.get("demoliciones");
    if (demolitionsLvl !== undefined) {
      lootBonusPct += 15 + demolitionsLvl * 2.5;
    }
    const medicoLvl = roleMap.get("medico");
    if (medicoLvl !== undefined) {
      roleProbBonus += 4 + medicoLvl * 1.0;
    }
    const negociadorLvl = roleMap.get("negociador");
    if (negociadorLvl !== undefined) {
      roleProbBonus += 4 + negociadorLvl * 1.0;
    }

    // Pequeño bono táctico de apoyo por miembros adicionales del mismo rol (+1% por extra, máx +3%)
    const extraMembers = members.length - roleMap.size;
    if (extraMembers > 0) {
      roleProbBonus += Math.min(3, extraMembers * 1);
    }

    // Sinergia de roles
    const distinctRoles = new Set(members.map((m) => m.roleId));
    let synergyName = "Sin sinergia especial";
    if (distinctRoles.size >= 7) {
      synergyName = "👑 Sindicato Total (+14% éxito, +30% botín)";
      roleProbBonus += 14;
      lootBonusPct += 30;
    } else if (distinctRoles.size >= 5) {
      synergyName = "🌟 Sinergia Perfecta (+10% éxito, +20% botín)";
      roleProbBonus += 10;
      lootBonusPct += 20;
    } else if (distinctRoles.size >= 3) {
      synergyName = "✨ Sinergia Táctica (+5% éxito, +10% botín)";
      roleProbBonus += 5;
      lootBonusPct += 10;
    }

    // Equipamiento táctico colectivo detectado en inventarios
    const gearDetected: string[] = [];
    let hasEmp = false;
    let hasC4 = false;
    let hasDrill = false;
    let hasVan = false;
    let hasAdrenaline = false;

    for (const m of members) {
      const eco = getEco(gid, m.userId);
      const inv = invOf(eco);
      if (inv.inhibidor_emp && !hasEmp) {
        hasEmp = true;
        gearDetected.push("📟 Inhibidor EMP (+6% éxito)");
        roleProbBonus += 6;
      }
      if (inv.c4 && !hasC4) {
        hasC4 = true;
        gearDetected.push("💣 C4 (+20% botín)");
        lootBonusPct += 20;
      }
      if (inv.taladro_termico && !hasDrill) {
        hasDrill = true;
        gearDetected.push("🔥 Taladro Térmico (+30% botín)");
        lootBonusPct += 30;
      }
      if (inv.furgon_blindado && !hasVan) {
        hasVan = true;
        gearDetected.push("🚗 Furgón Blindado (60% huida ante fallo)");
      }
      if (inv.adrenalina && !hasAdrenaline) {
        hasAdrenaline = true;
        gearDetected.push("💉 Adrenalina (Segunda oportunidad)");
      }
      if (inv.mascara_balistica && !gearDetected.includes("🎭 Máscara Balística (Calabozo reducido)")) {
        gearDetected.push("🎭 Máscara Balística (Calabozo reducido)");
      }
    }

    let finalWinRate: number;
    let lootMin: number;
    let lootMax: number;

    if (isDavito) {
      // Dificultad casi imposible: estrictamente MENOR al 0.77% incluso con el mejor equipamiento
      const crewBonus = Math.min(0.20, (crewSize - 1) * 0.015);
      const synBonus = distinctRoles.size >= 7 ? 0.12 : distinctRoles.size >= 5 ? 0.10 : distinctRoles.size >= 3 ? 0.05 : 0;
      const gearBonus = (hasEmp ? 0.04 : 0) + (hasC4 ? 0.04 : 0) + (hasDrill ? 0.04 : 0);
      finalWinRate = Math.min(0.77, Math.max(0.01, Number((0.15 + crewBonus + synBonus + gearBonus).toFixed(3))));
      lootMin = DAVITO_REWARD_COINS;
      lootMax = DAVITO_REWARD_COINS;
    } else {
      // Garantizar que siempre exista al menos 24-29% de fallo real en objetivos normales
      const maxWinRate = Math.min(76, 80 - Math.floor(targetSecInfo.securityLevel / 2));
      finalWinRate = Math.max(15, Math.min(maxWinRate, Math.round(baseWinRate + roleProbBonus)));
      const totalMultiplier = targetSecInfo.tier.lootMultiplier * (1 + lootBonusPct / 100);
      lootMin = Math.round(targetDef.baseLootMin * totalMultiplier);
      lootMax = Math.round(targetDef.baseLootMax * totalMultiplier);
    }

    return {
      crewSize,
      finalWinRate,
      lootMin,
      lootMax,
      lootBonusPct,
      distinctRolesCount: distinctRoles.size,
      synergyName,
      gearDetected,
      hasEmp,
      hasC4,
      hasDrill,
      hasVan,
      hasAdrenaline,
      isDavito,
    };
  };

  const getEmbed = (status = "Reclutando banda") => {
    const sec = getTargetSecurity(gid, targetDef.id);
    const stats = calculateHeistStats(sec);

    const memberLines = Array.from(crew.values()).map((m, i) => {
      const roleDef = HEIST_ROLES[m.roleId] || HEIST_ROLES.tirador;
      const isLeader = m.userId === leader.id ? "👑 *(Líder)*" : "";
      return `**${i + 1}.** <@${m.userId}> ${isLeader} — ${roleDef.emoji} **${roleDef.name}** *(Nv. ${m.roleLevel} · ${m.roleTitle})*`;
    });

    const gearText =
      stats.gearDetected.length > 0 ? stats.gearDetected.map((g) => `▸ ${g}`).join("\n") : "*Ninguno aportado aún.*";

    const embedColor = stats.isDavito ? 0x990000 : COLORS.crime;

    const davitoWarning = stats.isDavito
      ? `\n\n⚠️ **ADVERTENCIA DE MÁXIMO PELIGRO:**\n` +
        `Estás desafiando la **Fortaleza Inexpugnable de Davito**. La probabilidad de éxito es **inferior al 0.77%**.\n` +
        `🏆 **Recompensa Legendaria:** Rol <@&${DAVITO_ROLE_ID}> y **🪙 100.000.000 nexocoins** para cada cómplice superviviente.`
      : "";

    const fineNotice = stats.isDavito
      ? "⚠️ *Si el asalto a Davito fracasa y la banda es interceptada, ¡los miembros sufrirán la pérdida catastrófica del 25% de TODO su patrimonio acumulado (cartera + banco sin límite) y penas extremas de calabozo!*"
      : "⚠️ *Si el golpe fracasa y la banda es capturada, los miembros serán encarcelados y recibirán multas judiciales de hasta 500.000 🪙 según su patrimonio (10%).*";

    return baseEmbed(embedColor)
      .setThumbnail(HEIST_MEDIA[targetDef.id] ?? HEIST_MEDIA.banco)
      .setTitle(`${targetDef.emoji} ¡Planificación de Asalto: ${targetDef.name}!`)
      .setDescription(
        `**${leader.username}** está organizando un golpe táctico contra **${targetDef.name}**.\n\n` +
          `🏛️ **Seguridad del Objetivo:** ${sec.tier.emoji} **Nivel ${sec.securityLevel}: ${sec.tier.name}**\n` +
          `*${sec.tier.description}*\n` +
          (!stats.isDavito
            ? `• **Modificador de dificultad:** \`${sec.tier.difficultyMod}%\` | **Multiplicador de botín:** \`×${sec.tier.lootMultiplier}\`\n\n`
            : "\n") +
          `👥 **Banda:** ${stats.crewSize} / ${stats.isDavito ? 16 : 8} miembros\n` +
          `🎭 **Sinergia:** ${stats.synergyName}\n` +
          `🎯 **Probabilidad de éxito estimada:** **~${stats.finalWinRate}%**\n` +
          `💰 **Botín por cómplice:** **${n(stats.lootMin)} ${stats.lootMin !== stats.lootMax ? `- ${n(stats.lootMax)}` : ""}**\n` +
          `⏳ **Tiempo para unirse o iniciar:** <t:${endsAt}:R>\n\n` +
          `**Integrantes & Roles:**\n${memberLines.join("\n")}\n\n` +
          `**Equipamiento táctico de la banda:**\n${gearText}${davitoWarning}\n\n` +
          `${fineNotice}`,
      )
      .setFooter({ text: `Objetivo: ${targetDef.shortName} · Estado: ${status}` });
  };

  const getRoleSelectMenu = () => {
    const options = Object.values(HEIST_ROLES).map((r) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(r.name)
        .setValue(r.id)
        .setEmoji(r.emoji)
        .setDescription(r.bonusSummary.slice(0, 100)),
    );

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`${heistId}:select_role`)
        .setPlaceholder("🎭 Selecciona o cambia tu rol en el asalto...")
        .addOptions(options),
    );
  };

  const getButtonsRow = () => {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${heistId}:join`)
        .setLabel("🔫 Unirse / Salir")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`${heistId}:start`)
        .setLabel("🚀 Ejecutar asalto ahora")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${heistId}:cancel`)
        .setLabel("❌ Cancelar golpe")
        .setStyle(ButtonStyle.Secondary),
    );
  };

  let response;
  try {
    response = await interaction.reply({
      embeds: [getEmbed()],
      components: [getRoleSelectMenu(), getButtonsRow()],
      fetchReply: true,
    });
  } catch (err) {
    activeHeistLobbies.delete(gid);
    logger.error("Error al desplegar mensaje inicial de asalto:", err);
    throw err;
  }

  const collector = response.createMessageComponentCollector({
    time: 65_000,
  });

  let resolved = false;

  async function resolveHeist() {
    if (resolved) return;
    resolved = true;
    collector.stop("executed");

    const targetSec = getTargetSecurity(gid, targetDef.id);
    const stats = calculateHeistStats(targetSec);
    const members = Array.from(crew.values());

    try {
      if (members.length < 2) {
        await interaction.editReply({
          embeds: [
            errorEmbed(
              "Asalto cancelado",
              `No se unieron suficientes cómplices a la banda. Se necesitan al menos **2 asaltantes** para penetrar las defensas de **${targetDef.name}**. No se activaron alarmas.`,
            ),
          ],
          components: [],
        });
        return;
      }

      // ── ANIMACIÓN TÁCTICA MULTI-FASE PERSONALIZADA POR OBJETIVO ──
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      interface HeistPhaseInfo {
        title: string;
        progress: string;
        description: string;
        color: number;
      }

      interface CustomHeistAnimation {
        phase1: HeistPhaseInfo;
        phase2: HeistPhaseInfo;
        phase3: HeistPhaseInfo;
      }

      function buildCustomHeistAnimations(): CustomHeistAnimation {
        const hasHacker = members.some((m) => m.roleId === "hacker");
        const hasInfiltrator = members.some((m) => m.roleId === "infiltrador");
        const hasShooter = members.some((m) => m.roleId === "tirador");
        const hasDemolitions = members.some((m) => m.roleId === "demoliciones");
        const hasConductor = members.some((m) => m.roleId === "conductor");
        const hasMedico = members.some((m) => m.roleId === "medico");
        const hasNegociador = members.some((m) => m.roleId === "negociador");
        const crewCount = members.length;
        const tid = targetDef.id;

        if (tid === "casino") {
          return {
            phase1: {
              title: "🎰 [FASE 1/3: GRAN CASINO] Infiltración en el Bulevar de Neón",
              progress: "`[▓▓▓░░░░░░░░░] 25% · ACCESO A LAS SALAS PRIVADAS VIP`",
              color: 0x9b59b6,
              description:
                `▸ Los **${crewCount} asaltantes** se camuflan entre los apostadores de esmoquin y el bullicio de las salas VIP.\n` +
                (hasHacker
                  ? `▸ 🧠 **Hacker:** Hackea el software de reconocimiento facial de los crupieres y emite pases de sala falsificados.\n`
                  : `▸ ⚠️ **Sin Hacker:** La banda debe esquivar los ojos de águila de los jefes de sala y cámaras motorizadas.\n`) +
                (hasInfiltrator
                  ? `▸ 🕵️ **Infiltrador:** Se cuela por el falso techo sobre las mesas de ruleta y desciende en el corredor de conteo.\n`
                  : `▸ ⚠️ **Sin Infiltrador:** Forzar la cerradura de la trastienda genera un zumbido en la centralita de seguridad.\n`) +
                `\n⏳ *Cruzando la trastienda bajo el tintineo de fichas y tragaperras hacia la cámara acorazada...*`,
            },
            phase2: {
              title: "🔥 [FASE 2/3: GRAN CASINO] Asedio a la Bóveda de Fichas & Efectivo",
              progress: "`[▓▓▓▓▓▓▓░░░░░] 60% · BRECHA EN EL SISTEMA DE SEGURIDAD MAFIOSO`",
              color: 0xe67e22,
              description:
                `▸ Defensas de **Nivel ${targetSec.securityLevel} (${targetSec.tier.name})**: compuertas dobles y sistemas criogénicos.\n` +
                (stats.hasDrill
                  ? `▸ 🔥 **Taladro Térmico:** Funde la combinación criogénica de la cámara acorazada a 3.200°C.\n`
                  : stats.hasC4
                    ? `▸ 💣 **C4 Militar:** ¡Detonación plástica que vuela la pesada puerta de aleación del tesoro de la mafia!\n`
                    : hasDemolitions
                      ? `▸ 🧨 **Demoliciones:** Corta las válvulas de gas criogénico y desarticula los goznes maestros.\n`
                      : `▸ ⚙️ **Fuerza Bruta:** Reventando los cerrojos de las cajas de recaudación con radiales y palancas.\n`) +
                (hasShooter
                  ? `▸ 🔫 **Tirador:** Contiene a balazos a los matones armados de la mafia del casino con fuego de cobertura.\n`
                  : `▸ ⚠️ **Respuesta Armada:** Los guardaespaldas del sindicato abren fuego cruzado en los pasillos de conteo.\n`) +
                `\n⏳ *¡Cámara forzada! Arramblando con fichas doradas, diamantes tallados y millones en efectivo...*`,
            },
            phase3: {
              title: "🚨 [FASE 3/3: GRAN CASINO] Persecución a Fondo por el Strip",
              progress: "`[▓▓▓▓▓▓▓▓▓▓░░] 85% · HUIDA BAJO LUCES DE NEÓN`",
              color: 0xe74c3c,
              description:
                `▸ ¡¡ALERTA ROJA EN EL RESORT!! Todoterrenos blindados de la mafia y patrullas policiales cercan las avenidas.\n` +
                (stats.hasVan
                  ? `▸ 🚗 **Furgón Blindado:** Revienta la barrera del parking subterráneo y sale rugiendo al bulevar.\n`
                  : hasConductor
                    ? `▸ 🏎️ **Piloto de Fuga:** Quema rueda en un giro de 180° entre fuentes luminosas esquivando el fuego enemigo.\n`
                    : `▸ ⚠️ **Fuga Desesperada:** La banda escapa corriendo a la carrera esquivando reflectores entre turistas.\n`) +
                (stats.hasEmp
                  ? `▸ 📟 **Inhibidor EMP:** Pulso que apaga los paneles gigantes de neón del Strip y ciega los radares de persecución.\n`
                  : "") +
                `\n⏳ *Acelerando a fondo hacia la autopista del desierto... ¿Lograrán escapar con la recaudación?*`,
            },
          };
        }

        if (tid === "mansion") {
          return {
            phase1: {
              title: "🏰 [FASE 1/3: MANSIÓN] Asalto al Perímetro de la Colina",
              progress: "`[▓▓▓░░░░░░░░░] 25% · ESCALADA DE MUROS Y BURLA DE GUARDIANES`",
              color: 0x27ae60,
              description:
                `▸ Los **${crewCount} asaltantes** escalan los muros de piedra de la colina privada bajo una densa niebla nocturna.\n` +
                (hasHacker
                  ? `▸ 🧠 **Hacker:** Desconecta los reflectores halógenos y ciega las cámaras térmicas perimetrales del jardín.\n`
                  : `▸ ⚠️ **Sin Hacker:** El equipo debe cruzar arrastrándose para esquivar los conos de luz de los focos.\n`) +
                (hasInfiltrator
                  ? `▸ 🕵️ **Infiltrador:** Neutraliza a los dóbermans guardianes con dardos somníferos y anula la valla electrificada.\n`
                  : `▸ ⚠️ **Sin Infiltrador:** Los ladridos de los perros guardianes resuenan en la noche alertando a la escolta.\n`) +
                `\n⏳ *Cruzando el laberinto de setos y estatuas de mármol hacia la entrada oculta de servicio...*`,
            },
            phase2: {
              title: "🔥 [FASE 2/3: MANSIÓN] Brecha en la Bóveda de las Catacumbas",
              progress: "`[▓▓▓▓▓▓▓░░░░░] 60% · ASALTO A LA HABITACIÓN DEL PÁNICO`",
              color: 0xd35400,
              description:
                `▸ Defensas de **Nivel ${targetSec.securityLevel} (${targetSec.tier.name})**: compuertas hidráulicas y cristales balísticos.\n` +
                (stats.hasDrill
                  ? `▸ 🔥 **Taladro Térmico:** Perfora la puerta acorazada oculta tras la vinoteca en un torrente de chispas.\n`
                  : stats.hasC4
                    ? `▸ 💣 **C4 Militar:** ¡Explosión controlada en los anclajes de piedra que expone la cámara secreta!\n`
                    : hasDemolitions
                      ? `▸ 🧨 **Demoliciones:** Desarma el mecanismo de trampa de la estancia y fuerza la puerta antipánico.\n`
                      : `▸ ⚙️ **Fuerza Bruta:** Intentando forzar la puerta blindada con cizallas hidráulicas a contra reloj.\n`) +
                (hasShooter
                  ? `▸ 🔫 **Tirador:** Neutraliza a tiros a los contratistas ex-militares de la escolta privada del magnate.\n`
                  : `▸ ⚠️ **Respuesta Armada:** Los contratistas privados toman posiciones en las escalinatas de mármol.\n`) +
                `\n⏳ *¡Habitación del pánico forzada! Saqueando cuadros renacentistas, joyas imperiales y lingotes...*`,
            },
            phase3: {
              title: "🚨 [FASE 3/3: MANSIÓN] Descenso Frenético por el Acantilado",
              progress: "`[▓▓▓▓▓▓▓▓▓▓░░] 85% · HUIDA NOCTURNA POR LAS CURVAS`",
              color: 0xc0392b,
              description:
                `▸ ¡¡ALARMA PERIMETRAL EN LA COLINA!! Helicópteros policiales y patrullas de élite suben por la carretera.\n` +
                (stats.hasVan
                  ? `▸ 🚗 **Furgón Blindado:** Desciende derribando las verjas de forja dorada y resiste disparos en el blindaje.\n`
                  : hasConductor
                    ? `▸ 🏎️ **Piloto de Fuga:** Derrapa al borde del precipicio en cada curva cerrada a 140 km/h en plena noche.\n`
                    : `▸ ⚠️ **Fuga Desesperada:** La banda debe huir a pie por un sendero pedregoso esquivando los focos aéreos.\n`) +
                (stats.hasEmp
                  ? `▸ 📟 **Inhibidor EMP:** Inutiliza el foco y la cámara infrarroja del helicóptero de persecución.\n`
                  : "") +
                `\n⏳ *Descendiendo a la carretera nacional... ¿Logrará la banda perderse en la oscuridad?*`,
            },
          };
        }

        if (tid === "empresa") {
          return {
            phase1: {
              title: "🏢 [FASE 1/3: NEXO CORP] Infiltración en la Torre Cuántica",
              progress: "`[▓▓▓░░░░░░░░░] 25% · HACKEO DE TORNOS Y ASCENSORES`",
              color: 0x2980b9,
              description:
                `▸ Los **${crewCount} asaltantes** penetran en el imponente atrio de cristal y acero de la multinacional Nexo Corp.\n` +
                (hasHacker
                  ? `▸ 🧠 **Hacker:** Burlar el cortafuegos de la IA militar corporativa y congela los drones patrulla en sus bases.\n`
                  : `▸ ⚠️ **Sin Hacker:** El equipo debe ocultarse del barrido térmico constante de los drones aéreos.\n`) +
                (hasInfiltrator
                  ? `▸ 🕵️ **Infiltrador:** Escala por el hueco del ascensor panorámico y abre el acceso al piso de I+D.\n`
                  : `▸ ⚠️ **Sin Infiltrador:** Forzar la esclusa del ascensor dispara una alarma silenciosa a la central corporativa.\n`) +
                `\n⏳ *Avanzando entre racks de servidores refrigerados por nitrógeno hacia la Bóveda Neural...*`,
            },
            phase2: {
              title: "🔥 [FASE 2/3: NEXO CORP] Asalto a la Bóveda de Servidores Fríos",
              progress: "`[▓▓▓▓▓▓▓░░░░░] 60% · BRECHA EN EL NÚCLEO FINANCIERO CUÁNTICO`",
              color: 0x8e44ad,
              description:
                `▸ Defensas de **Nivel ${targetSec.securityLevel} (${targetSec.tier.name})**: gas paralizante y cifrado cuántico militar.\n` +
                (stats.hasDrill
                  ? `▸ 🔥 **Taladro Térmico:** Funde la compuerta hermética de refrigeración criogénica del mainframe.\n`
                  : stats.hasC4
                    ? `▸ 💣 **C4 Militar:** Revienta el soporte de aleación que ancla la bóveda de datos y patentes cuánticas.\n`
                    : hasDemolitions
                      ? `▸ 🧨 **Demoliciones:** Anula las compuertas de aislamiento hermético y fuerza la caja fuerte física.\n`
                      : `▸ ⚙️ **Fuerza Bruta:** Forzando los armarios de servidores refrigerados con palancas de acero.\n`) +
                (hasShooter
                  ? `▸ 🔫 **Tirador:** Frena en seco el avance de los soldados cibernéticos con exoesqueletos de Nexo Corp.\n`
                  : `▸ ⚠️ **Respuesta Armada:** Los soldados cibernéticos avanzan con escudos balísticos y rifles de plasma.\n`) +
                `\n⏳ *¡Bóveda extraída! Descargando claves de carteras frías, secretos industriales y bonos corporativos...*`,
            },
            phase3: {
              title: "🚨 [FASE 3/3: NEXO CORP] Extracción por el Muelle & Ciberpersecución",
              progress: "`[▓▓▓▓▓▓▓▓▓▓░░] 85% · HUIDA A LA AUTOPISTA ELEVADA`",
              color: 0xc0392b,
              description:
                `▸ ¡¡PROTOCOLO OMEGA DE BLOQUEO CORPORATIVO!! Las compuertas blindadas del rascacielos caen a plomo.\n` +
                (stats.hasVan
                  ? `▸ 🚗 **Furgón Blindado:** Revienta las persianas metálicas del muelle de carga y salta a la autopista elevada.\n`
                  : hasConductor
                    ? `▸ 🏎️ **Piloto de Fuga:** Quema neumáticos esquivando los disparos de drones de intercepción autónomos.\n`
                    : `▸ ⚠️ **Fuga Desesperada:** La banda intenta escapar por las escaleras de emergencia bajo fuego cruzado.\n`) +
                (stats.hasEmp
                  ? `▸ 📟 **Inhibidor EMP:** Lanza un pulso que fríe los circuitos de los drones y bloquea las cámaras de tráfico.\n`
                  : "") +
                `\n⏳ *Acelerando a través de los túneles subterráneos... ¿Lograrán desconectarse de la red corporativa?*`,
            },
          };
        }

        if (tid === "tren_blindado") {
          return {
            phase1: {
              title: "🚂 [FASE 1/3: TREN BLINDADO] Abordaje Ferroviario en Marcha",
              progress: "`[▓▓▓░░░░░░░░░] 25% · SALTO AL CONVOY A 180 KM/H`",
              color: 0xd35400,
              description:
                `▸ Los **${crewCount} asaltantes** persiguen el convoy de acero y saltan al último vagón en plena marcha.\n` +
                (hasHacker
                  ? `▸ 🧠 **Hacker:** Inhabilita las torretas robotizadas del techo del tren y anula los sensores de freno.\n`
                  : `▸ ⚠️ **Sin Hacker:** Las torretas automáticas abren fuego de ráfagas en el techo azotado por el viento.\n`) +
                (hasInfiltrator
                  ? `▸ 🕵️ **Infiltrador:** Se desliza entre las compuertas de enganche de vagones y abre el acceso al convoy.\n`
                  : `▸ ⚠️ **Sin Infiltrador:** Forzar la escotilla exterior genera un chasquido que alerta a la escolta sobre raíles.\n`) +
                `\n⏳ *Avanzando entre chispas de acero y viento helado hacia el vagón acorazado central...*`,
            },
            phase2: {
              title: "🔥 [FASE 2/3: TREN BLINDADO] Asedio al Vagón Acorazado Central",
              progress: "`[▓▓▓▓▓▓▓░░░░░] 60% · PERFORACIÓN DEL COLOSO DE ACERO`",
              color: 0xc0392b,
              description:
                `▸ Defensas de **Nivel ${targetSec.securityLevel} (${targetSec.tier.name})**: doble pared de tungsteno y escuadrón de élite.\n` +
                (stats.hasDrill
                  ? `▸ 🔥 **Taladro Térmico:** Funde las compuertas blindadas del vagón central mientras las vías retumban.\n`
                  : stats.hasC4
                    ? `▸ 💣 **C4 Militar:** Detona cargas en las bisagras del vagón tesoro desencajando la puerta circular.\n`
                    : hasDemolitions
                      ? `▸ 🧨 **Demoliciones:** Anula el sistema de desacople de emergencia y revienta la cerradura maestra.\n`
                      : `▸ ⚙️ **Fuerza Bruta:** Cortando cerrojos ferroviarios con radiales bajo un traqueteo ensordecedor.\n`) +
                (hasShooter
                  ? `▸ 🔫 **Tirador:** Intercambia disparos en el pasillo estrecho del vagón contra la escolta armada.\n`
                  : `▸ ⚠️ **Respuesta Armada:** Los soldados del tren devuelven fuego pesado barriendo el vagón comedor.\n`) +
                `\n⏳ *¡Vagón acorazado penetrado! Asegurando lingotes de oro federales y sacos de platino con arneses...*`,
            },
            phase3: {
              title: "🚨 [FASE 3/3: TREN BLINDADO] Desacople de Vagones y Salto en Curva",
              progress: "`[▓▓▓▓▓▓▓▓▓▓░░] 85% · MANIOBRA DE DESACOPLE EN MARCHA`",
              color: 0x7f8c8d,
              description:
                `▸ ¡¡EMERGENCIA FERROVIARIA!! Patrullas policiales convergen en el paso a nivel y helicópteros iluminan el tren.\n` +
                (stats.hasVan
                  ? `▸ 🚗 **Furgón Blindado:** Rueda en paralelo al terraplén de las vías esperando la recepción de la carga.\n`
                  : hasConductor
                    ? `▸ 🏎️ **Piloto de Fuga:** Desacopla los vagones de persecución en una curva cerrada haciendo descarrilar la escolta.\n`
                    : `▸ ⚠️ **Fuga Desesperada:** La banda debe saltar al terraplén en marcha arriesgando el pellejo.\n`) +
                (stats.hasEmp
                  ? `▸ 📟 **Inhibidor EMP:** Corta los semáforos ferroviarios y fríe los sistemas de radio del convoy.\n`
                  : "") +
                `\n⏳ *¡Saltando del convoy a máxima velocidad! ¿Logrará el equipo escapar con el oro?*`,
            },
          };
        }

        if (tid === "estacion_espacial") {
          return {
            phase1: {
              title: "🛰️ [FASE 1/3: ESTACIÓN ORBITAL] Acoplamiento en Gravedad Cero",
              progress: "`[▓▓▓░░░░░░░░░] 25% · ENTRADA A LA ESCLUSA ESPACIAL`",
              color: 0x1abc9c,
              description:
                `▸ Los **${crewCount} asaltantes** acoplan su lanzadera a la esclusa exterior con la Tierra azul de fondo.\n` +
                (hasHacker
                  ? `▸ 🧠 **Hacker:** Burlar la IA Defensiva Orbital Quantum y neutraliza los protocolos de despresurización.\n`
                  : `▸ ⚠️ **Sin Hacker:** El equipo debe avanzar con trajes EVA evitando las trampas de vacío espacial.\n`) +
                (hasInfiltrator
                  ? `▸ 🕵️ **Infiltrador:** Flota en gravedad cero por los conductos de refrigeración esquivando lásers centinela.\n`
                  : `▸ ⚠️ **Sin Infiltrador:** La esclusa despresuriza con fuerza y activa un aviso en el puente de mando.\n`) +
                `\n⏳ *Flotando silenciosamente por los pasillos presurizados hacia el Núcleo de Fusión...*`,
            },
            phase2: {
              title: "🔥 [FASE 2/3: ESTACIÓN ORBITAL] Brecha en la Bóveda de Antimateria",
              progress: "`[▓▓▓▓▓▓▓░░░░░] 60% · DESACTIVACIÓN DE CAMPOS MAGNÉTICOS`",
              color: 0x16a085,
              description:
                `▸ Defensas de **Nivel ${targetSec.securityLevel} (${targetSec.tier.name})**: campos magnéticos letales y esclusas de vacío.\n` +
                (stats.hasDrill
                  ? `▸ 🔥 **Taladro Térmico:** Desarma las abrazaderas superconductoras de los contenedores de antimateria.\n`
                  : stats.hasC4
                    ? `▸ 💣 **C4 Militar:** Revienta el mamparo blindado que sella la cámara de tecnología cuántica.\n`
                    : hasDemolitions
                      ? `▸ 🧨 **Demoliciones:** Anula las compuertas de radiación y estabiliza los núcleos energéticos.\n`
                      : `▸ ⚙️ **Fuerza Bruta:** Forzando anclajes magnéticos manualmente con palancas de polímero.\n`) +
                (hasShooter
                  ? `▸ 🔫 **Tirador:** Repele a los marines espaciales en gravedad cero con disparos de precisión flotantes.\n`
                  : `▸ ⚠️ **Respuesta Armada:** Los marines espaciales avanzan con fusiles de plasma y propulsores EVA.\n`) +
                `\n⏳ *¡Bóveda cósmica abierta! Asegurando cristales de antimateria y planos de tecnología orbital...*`,
            },
            phase3: {
              title: "🚨 [FASE 3/3: ESTACIÓN ORBITAL] Autodestrucción y Reentrada Atmosférica",
              progress: "`[▓▓▓▓▓▓▓▓▓▓░░] 85% · VUELO DE REENTRADA A MACH 7`",
              color: 0xe74c3c,
              description:
                `▸ ¡¡ALARMA DE DESCOMPRESIÓN GENERAL!! La estación orbital activa el protocolo de eyección de emergencia.\n` +
                (stats.hasVan
                  ? `▸ 🚗 **Furgón Blindado (Cápsula de Descenso):** La cápsula reforzada resiste el fuego de cazas orbitales.\n`
                  : hasConductor
                    ? `▸ 🏎️ **Piloto de Fuga:** Enciende los retropropulsores de plasma y clava el ángulo de reentrada a Mach 7.\n`
                    : `▸ ⚠️ **Fuga Desesperada:** La nave de escape sufre turbulencias extremas en el borde de la atmósfera.\n`) +
                (stats.hasEmp
                  ? `▸ 📟 **Inhibidor EMP:** Sobrecarga las baterías de los satélites de seguimiento cegando los radares.\n`
                  : "") +
                `\n⏳ *Cruzando la ionosfera entre llamas de fricción... ¿Logrará el módulo amerizar a salvo?*`,
            },
          };
        }

        if (tid === "submarino") {
          return {
            phase1: {
              title: "⚓ [FASE 1/3: SUBMARINO NUCLEAR] Inmersión Abisal & Abordaje Silencioso",
              progress: "`[▓▓▓░░░░░░░░░] 25% · ACOPLE SUBMARINO A 2.500M DE PROFUNDIDAD`",
              color: 0x06b6d4,
              description:
                `▸ Los **${crewCount} buzos de asalto** se acoplan con un minisubmarino sigiloso a la escotilla de descompresión del Leviathan.\n` +
                (hasInfiltrator
                  ? `▸ 🥷 **Infiltrador:** Hackea el sensor de presión exterior y neutraliza la esclusa sin activar la válvula de inundación.\n`
                  : `▸ ⚠️ **Sin Infiltrador:** Forzar la esclusa exterior genera burbujas y alerta a la guardia naval.\n`) +
                (hasHacker
                  ? `▸ 💻 **Hacker:** Ciega las pantallas del sonar pasivo del puente inyectando ruido blanco de ballenas.\n`
                  : `▸ ⚠️ **Sin Hacker:** El operador acústico del Leviathan detecta ecos metálicos en la quilla.\n`) +
                (hasMedico
                  ? `▸ 🩺 **Médico de Combate:** Administra cóctel hiperbárico a la banda para anular la narcosis de nitrógeno.\n`
                  : "") +
                `\n⏳ *Cruzando la esclusa hacia los pasillos estancos del submarino...*`,
            },
            phase2: {
              title: "🔥 [FASE 2/3: SUBMARINO NUCLEAR] Asedio a la Bóveda del Reactor & Códigos",
              progress: "`[▓▓▓▓▓▓▓░░░░░] 60% · BRECHA EN EL COMPARTIMENTO BLINDADO DE FUSIÓN`",
              color: 0x0891b2,
              description:
                `▸ Defensas de **Nivel ${targetSec.securityLevel} (${targetSec.tier.name})**: mamparos estancos y buzos de combate.\n` +
                (stats.hasDrill
                  ? `▸ 🔥 **Taladro Térmico:** Funde los pernos de titanio del contenedor blindado de plutonio.\n`
                  : stats.hasC4
                    ? `▸ 💣 **C4 Militar:** ¡Detonación submarina dirigida que vuela la compuerta de torpedos!\n`
                    : hasDemolitions
                      ? `▸ 🧨 **Demoliciones:** Corta las líneas neumáticas y revienta la cerradura de la caja fuerte naval.\n`
                      : `▸ ⚙️ **Fuerza Bruta:** Forzando los cerrojos de las taquillas acorazadas navales con barras y gatos.\n`) +
                (hasShooter
                  ? `▸ 🎯 **Tirador:** Contiene a los marines navales de la dotación con disparos de precisión en el pasillo.\n`
                  : `▸ ⚠️ **Respuesta Naval:** La guardia pretoriana con fusiles anfibios cerca el compartimento.\n`) +
                (hasNegociador
                  ? `▸ 🎙️ **Negociador:** Hackea el interfono naval con órdenes falsas de despresurización distrayendo a los oficiales.\n`
                  : "") +
                `\n⏳ *¡Caja de códigos nucleares y lingotes abierta! Cargando mochilas de botín abisal...*`,
            },
            phase3: {
              title: "🚨 [FASE 3/3: SUBMARINO NUCLEAR] Evacuación en Cápsula de Escape",
              progress: "`[▓▓▓▓▓▓▓▓▓▓░░] 85% · LANZAMIENTO HACIA LA SUPERFICIE DEL OCÉANO`",
              color: 0x0e7490,
              description:
                `▸ ¡¡ALARMA GENERAL EN EL LEVIATHAN!! Sirenas rojas y cierre automático de mamparos.\n` +
                (stats.hasVan
                  ? `▸ 🚗 **Soporte Furgón / Lancha:** Una lancha rápida fuertemente armada espera en superficie para recoger al equipo.\n`
                  : hasConductor
                    ? `▸ 🏎️ **Piloto de Fuga:** Pilota la cápsula de escape sorteando las redes de torpedos a toda propulsión.\n`
                    : `▸ ⚠️ **Escape Caótico:** La banda asciende a contrarreloj nadando hacia la superficie.\n`) +
                (stats.hasEmp
                  ? `▸ 📟 **Inhibidor EMP:** Pulso magnético que apaga los radares y torpedos teledirigidos de la flota.\n`
                  : "") +
                `\n⏳ *Ascendiendo desde el abismo hacia las aguas internacionales... ¿Lograrán huir con el botín?*`,
            },
          };
        }

        if (tid === "museo") {
          return {
            phase1: {
              title: "🏛️ [FASE 1/3: MUSEO IMPERIAL] Descenso Silencioso por la Cúpula de Cristal",
              progress: "`[▓▓▓░░░░░░░░░] 25% · ANULACIÓN DE ALARMAS DE LA GRAN ROTONDA`",
              color: 0xe11d48,
              description:
                `▸ Los **${crewCount} asaltantes** descienden con cuerdas de rápel desde la claraboya victoriana del museo sobre la sala de exposiciones.\n` +
                (hasHacker
                  ? `▸ 💻 **Hacker:** Suplanta el feed de las cámaras de seguridad con bucles de las salas vacías.\n`
                  : `▸ ⚠️ **Sin Hacker:** El operador del circuito cerrado nota sombras cruzando las vitrinas.\n`) +
                (hasInfiltrator
                  ? `▸ 🥷 **Infiltrador:** Pasa entre las vigas sin rozar una sola celosía láser infrarroja y desconecta el escáner central.\n`
                  : `▸ ⚠️ **Sin Infiltrador:** La vibración de los pasos en las molduras activa el sensor piezoeléctrico de sala.\n`) +
                (hasMedico
                  ? `▸ 🩺 **Médico de Combate:** Aplica gel silenciador en las suelas del equipo y mantiene alerta los sentidos de la banda.\n`
                  : "") +
                `\n⏳ *Descendiendo al suelo de mármol hacia la Cripta de Antigüedades Arcanas...*`,
            },
            phase2: {
              title: "🔥 [FASE 2/3: MUSEO IMPERIAL] Apertura de la Cámara Imperial de Reliquias",
              progress: "`[▓▓▓▓▓▓▓░░░░░] 60% · EXTRACCIÓN DE JOYAS DINÁSTICAS & ORO ARCANO`",
              color: 0xbe123c,
              description:
                `▸ Defensas de **Nivel ${targetSec.securityLevel} (${targetSec.tier.name})**: cristal templado, cerrojos de bronce y custodios armados.\n` +
                (stats.hasDrill
                  ? `▸ 🔥 **Taladro Térmico:** Perfora en silencio el cristal blindado del sarcófago del emperador.\n`
                  : stats.hasC4
                    ? `▸ 💣 **C4 Militar:** ¡Carga plástica que desmorona el muro secreto de la cámara del tesoro!\n`
                    : hasDemolitions
                      ? `▸ 🧨 **Demoliciones:** Quema los pernos milenarios con polvo sónico y separa la compuerta.\n`
                      : `▸ ⚙️ **Fuerza Bruta:** Reventando los vitrales con mazas de goma y cortavidrios manuales.\n`) +
                (hasShooter
                  ? `▸ 🎯 **Tirador:** Inmoviliza a la patrulla de custodios patrimoniales con disparos certeros al equipo antidisturbios.\n`
                  : `▸ ⚠️ **Patrulla de Custodios:** Los vigilantes armados del museo acuden con escudos balísticos.\n`) +
                (hasNegociador
                  ? `▸ 🎙️ **Negociador:** Utiliza el interfono de sala con la voz del conservador ordenando mantener el perímetro despejado.\n`
                  : "") +
                `\n⏳ *¡Sarcófago abierto! Embolsando coronas de diamantes, cálices dorados y artefactos milenarios...*`,
            },
            phase3: {
              title: "🚨 [FASE 3/3: MUSEO IMPERIAL] Fuga por los Jardines del Palacio",
              progress: "`[▓▓▓▓▓▓▓▓▓▓░░] 85% · EVACUACIÓN Y CRUCE DE LA ESCALINATA IMPERIAL`",
              color: 0x9f1239,
              description:
                `▸ ¡¡ALERTA ROJA PATRIMONIAL!! Sirenas de la policía nacional cercan el parque del museo.\n` +
                (stats.hasVan
                  ? `▸ 🚗 **Furgón Blindado:** Rompe la verja dorada de carruajes y carga a la banda a toda marcha.\n`
                  : hasConductor
                    ? `▸ 🏎️ **Piloto de Fuga:** Derrapa por las avenidas monumentales esquivando los convoyes policiales.\n`
                    : `▸ ⚠️ **Fuga Desesperada:** La banda emprende una caótica carrera a pie por el bosque del parque.\n`) +
                (stats.hasEmp
                  ? `▸ 📟 **Inhibidor EMP:** Apaga los semáforos y los lectores de matrículas de la policía metropolitana.\n`
                  : "") +
                `\n⏳ *Acelerando a fondo hacia la guarida secreta... ¿Lograrán escapar con las reliquias imperiales?*`,
            },
          };
        }

        if (tid === "davito") {
          return {
            phase1: {
              title: "👑 [FASE 1/3: FORTALEZA DE DAVITO] Transgresión del Umbral Prohibido",
              progress: "`[▓▓▓░░░░░░░░░] 25% · PENETRACIÓN EN EL PLANO DIMENSIONAL`",
              color: 0x7f1d1d,
              description:
                `▸ Los **${crewCount} elegidos** desafían la cordura y cruzan las fallas dimensionales hacia el bastión de Davito.\n` +
                (hasHacker
                  ? `▸ 🧠 **Hacker:** Lucha contra un algoritmo de cifrado omnisciente que reescribe el código del universo.\n`
                  : `▸ ⚠️ **Sin Hacker:** La realidad se pliega sobre sí misma amenazando con desintegrar a la banda.\n`) +
                (hasInfiltrator
                  ? `▸ 🕵️ **Infiltrador:** Cruza pasillos de sombras eternas esquivando ojos cósmicos y trampas de gravedad nula.\n`
                  : `▸ ⚠️ **Sin Infiltrador:** La presencia del equipo resuena en el abismo despertando a los Centinelas.\n`) +
                `\n⏳ *Avanzando entre susurros primordiales hacia la cámara del trono acorazado de Davito...*`,
            },
            phase2: {
              title: "🔥 [FASE 2/3: FORTALEZA DE DAVITO] Asedio al Sanctasanctórum",
              progress: "`[▓▓▓▓▓▓▓░░░░░] 60% · QUIEBRA DE LOS SELLOS CÓSMICOS`",
              color: 0xb91c1c,
              description:
                `▸ Defensas de **Fortaleza Inexpugnable de Davito**: barreras dimensionales y guardianes celestiales.\n` +
                (stats.hasDrill
                  ? `▸ 🔥 **Taladro Térmico:** Ruge alimentado con energía de plasma intentando perforar la aleación estelar.\n`
                  : stats.hasC4
                    ? `▸ 💣 **C4 Militar:** Estalla en una onda expansiva de fuego que agrieta los sellos arcanos de la cámara.\n`
                    : hasDemolitions
                      ? `▸ 🧨 **Demoliciones:** Desarma los detonadores de antimateria que pretendían pulverizar el búnker.\n`
                      : `▸ ⚙️ **Fuerza Bruta:** Golpeando los cerrojos estelares con martillos de tungsteno contra toda lógica.\n`) +
                (hasShooter
                  ? `▸ 🔫 **Tirador:** Mantiene una batalla épica contra los espectros armados de la guardia de Davito.\n`
                  : `▸ ⚠️ **Respuesta Armada:** Los guardianes supremos descargan tormentas de proyectiles fulminantes.\n`) +
                `\n⏳ *¡Sellos resquebrajados! El botín legendario de 100.000.000 de monedas y el Rol honorífico brillan ante vosotros...*`,
            },
            phase3: {
              title: "🚨 [FASE 3/3: FORTALEZA DE DAVITO] Colapso del Bastión y Huida Imposible",
              progress: "`[▓▓▓▓▓▓▓▓▓▓░░] 85% · DESAFIANDO EL MENOR AL 1% DE ÉXITO`",
              color: 0x450a0a,
              description:
                `▸ ¡¡COLAPSO TOTAL DEL PLANO DIMENSIONAL!! El bastión supremo de Davito se autodestruye en un vórtice infinito.\n` +
                (stats.hasVan
                  ? `▸ 🚗 **Furgón Blindado:** Recubierto de runas balísticas, cruza la brecha antes de que el vórtice se cierre.\n`
                  : hasConductor
                    ? `▸ 🏎️ **Piloto de Fuga:** Maniobra entre fragmentos de realidad colapsando a la velocidad del pensamiento.\n`
                    : `▸ ⚠️ **Fuga Desesperada:** La banda salta al vacío dimensional esperando que la física no los desintegre.\n`) +
                (stats.hasEmp
                  ? `▸ 📟 **Inhibidor EMP:** Genera una burbuja electromagnética que estabiliza el portal de retorno.\n`
                  : "") +
                `\n⏳ *Calculando la probabilidad microscópica de supervivencia... ¿Habrá conseguido la banda lo imposible?*`,
            },
          };
        }

        // Banco Central (default)
        return {
          phase1: {
            title: "🏛️ [FASE 1/3: BANCO CENTRAL] Infiltración en el Búnker Subterráneo",
            progress: "`[▓▓▓░░░░░░░░░] 25% · ACCESO A LOS SÓTANOS BLINDADOS`",
            color: 0x2ecc71,
            description:
              `▸ Los **${crewCount} asaltantes** se deslizan por la red de alcantarillado bajo la Plaza Mayor hasta los cimientos del Banco.\n` +
              (hasHacker
                ? `▸ 🧠 **Hacker:** Inyecta un bucle en el circuito cerrado de cámaras y neutraliza los sensores sísmicos de suelo.\n`
                : `▸ ⚠️ **Sin Hacker:** El equipo debe sortear manualmente los arcos detectores y sensores infrarrojos.\n`) +
              (hasInfiltrator
                ? `▸ 🕵️ **Infiltrador:** Abre con ganzúa magnética la reja de servicio y desactiva las cerraduras biométricas.\n`
                : `▸ ⚠️ **Sin Infiltrador:** Forzar la cerradura exterior genera chispas y alerta al personal de guardia.\n`) +
              `\n⏳ *Descendiendo al nivel -3 en silencio hacia la antesala de la cámara federal...*`,
          },
          phase2: {
            title: "🔥 [FASE 2/3: BANCO CENTRAL] Asedio a la Cámara Acorazada",
            progress: "`[▓▓▓▓▓▓▓░░░░░] 60% · BRECHA EN COMPUERTA DE TUNGSTENO`",
            color: 0xf39c12,
            description:
              `▸ Las defensas de **Nivel ${targetSec.securityLevel} (${targetSec.tier.name})** protegen la bóveda de 15 toneladas.\n` +
              (stats.hasDrill
                ? `▸ 🔥 **Taladro Térmico:** Funde los pernos de aleación de tungsteno a 3.200°C en un destello incandescente.\n`
                : stats.hasC4
                  ? `▸ 💣 **C4 Militar:** ¡Detonación plástica controlada que desencaja los goznes maestros de la compuerta!\n`
                  : hasDemolitions
                    ? `▸ 🧨 **Demoliciones:** Coloca micro-cargas direccionales en los puntos de fatiga del titanio.\n`
                    : `▸ ⚙️ **Fuerza Bruta:** Cortando cerrojos acorazados con radiales de diamante y palancas pesadas.\n`) +
              (hasShooter
                ? `▸ 🔫 **Tirador:** Contiene a la guardia de seguridad con fuego de supresión y asegura la bóveda.\n`
                : `▸ ⚠️ **Respuesta Armada:** Los guardias armados del banco abren fuego cerrado contra la banda.\n`) +
              `\n⏳ *¡Compuerta abierta! Vaciando las cajas de lingotes de oro y llenando petates de efectivo...*`,
          },
          phase3: {
            title: "🚨 [FASE 3/3: BANCO CENTRAL] Alarma Federal y Persecución Callejera",
            progress: "`[▓▓▓▓▓▓▓▓▓▓░░] 85% · EXTRACCIÓN BAJO FUEGO CRUZADO`",
            color: 0xe74c3c,
            description:
              `▸ ¡¡ALARMA GENERAL EN EL DISTRITO FINANCIERO!! Sirenas del SWAT acordonan la gran avenida.\n` +
              (stats.hasVan
                ? `▸ 🚗 **Furgón Blindado:** El transporte blindado embiste una barricada de furgones policiales sin frenar.\n`
                : hasConductor
                  ? `▸ 🏎️ **Piloto de Fuga:** El Conductor clava el freno de mano y derrapa por un callejón estrecho a 120 km/h.\n`
                  : `▸ ⚠️ **Fuga Desesperada:** La banda emprende una caótica carrera a pie esquivando patrullas.\n`) +
              (stats.hasEmp
                ? `▸ 📟 **Inhibidor EMP:** Pulso de alta potencia que apaga los semáforos y bloquea las radios del SWAT.\n`
                : "") +
              `\n⏳ *Acelerando a fondo hacia el piso franco... ¿Logrará la banda burlar el cerco?*`,
          },
        };
      }

      const anims = buildCustomHeistAnimations();
      const canvasCrew: CanvasCrewMember[] = members;

      // FASE 1: Infiltración y Reconocimiento
      let hud1Attachment: AttachmentBuilder | null = null;
      try {
        const hudBuffer1 = await renderHeistHud({
          targetDef,
          securityLevel: targetSec.securityLevel,
          tier: targetSec.tier,
          phase: "phase1",
          crew: canvasCrew,
          progressPct: 25,
          phaseTitle: anims.phase1.title,
          gearDetected: stats.gearDetected,
        });
        hud1Attachment = new AttachmentBuilder(hudBuffer1, { name: "heist_hud_p1.png" });
      } catch (err) {
        logger.error("Error generando HUD canvas fase 1:", err);
      }

      const phase1Embed = baseEmbed(anims.phase1.color)
        .setThumbnail(HEIST_MEDIA[targetDef.id] ?? HEIST_MEDIA.banco)
        .setTitle(anims.phase1.title)
        .setDescription(
          `${anims.phase1.progress}\n\n${anims.phase1.description}\n\n⏳ *Infiltrando el perímetro... Siguiente fase en 6 segundos.*`,
        );
      if (hud1Attachment) {
        phase1Embed.setImage("attachment://heist_hud_p1.png");
      }

      await interaction
        .editReply({
          embeds: [phase1Embed],
          files: hud1Attachment ? [hud1Attachment] : [],
          components: [],
        })
        .catch(() => {});
      await sleep(6000);

      // FASE 2: Incidente Táctico Imprevisto (QTE con toma de decisiones)
      if (stats.isDavito) {
        // ── GAUNTLET DE 7 INCIDENTES TÁCTICOS CONSECUTIVOS DE DAVITO ──
        for (let qIdx = 0; qIdx < DAVITO_QTE_GAUNTLET.length; qIdx++) {
          const qte = DAVITO_QTE_GAUNTLET[qIdx]!;
          const qNum = qIdx + 1;
          const progressPct = 30 + Math.round((qIdx + 1) * 7);

          let hudQteAttachment: AttachmentBuilder | null = null;
          try {
            const hudBufferQte = await renderHeistHud({
              targetDef,
              securityLevel: targetSec.securityLevel,
              tier: targetSec.tier,
              phase: "qte",
              crew: canvasCrew,
              progressPct,
              phaseTitle: `⚡ [INCIDENTE CÓSMICO ${qNum}/7] ${qte.title.toUpperCase()}`,
              gearDetected: stats.gearDetected,
            });
            hudQteAttachment = new AttachmentBuilder(hudBufferQte, { name: `heist_hud_dav_qte_${qNum}.png` });
          } catch (err) {
            logger.error(`Error generando HUD canvas Davito QTE ${qNum}:`, err);
          }

          const qteEmbed = baseEmbed(0x9b59b6)
            .setThumbnail(HEIST_MEDIA.qte)
            .setTitle(`⚡ [DECISIÓN TÁCTICA ${qNum}/7] ${qte.title} ⏱️ 9s`)
            .setDescription(
              `🌌 **${qte.description}**\n\n` +
                `**¿Qué debe hacer la banda?** Pulsa una opción en los botones de abajo.\n` +
                `💡 *Si quien pulsa tiene el rol recomendado, la maniobra tiene efectividad asegurada; otro miembro asume riesgo de pifia.*\n` +
                `⏰ *Tenéis 9 segundos para consensuar la acción antes de que colapse la fase.*`,
            );
          if (hudQteAttachment) {
            qteEmbed.setImage(`attachment://heist_hud_dav_qte_${qNum}.png`);
          }

          const qteRow = new ActionRowBuilder<ButtonBuilder>();
          for (const opt of qte.options) {
            qteRow.addComponents(
              new ButtonBuilder()
                .setCustomId(`qte_${opt.id}`)
                .setLabel(opt.label)
                .setEmoji(opt.emoji)
                .setStyle(opt.style),
            );
          }

          await interaction
            .editReply({
              embeds: [qteEmbed],
              files: hudQteAttachment ? [hudQteAttachment] : [],
              components: [qteRow],
            })
            .catch(() => {});

          const qteMsg = await interaction.fetchReply().catch(() => null);
          let chosenOption: HeistQteOption | null = null;
          let decidingUser: User | null = null;
          let qteSuccess = false;
          let qteResultNarrative = "";

          if (qteMsg) {
            try {
              const btnInteraction = await qteMsg.awaitMessageComponent({
                filter: (bi) => {
                  if (!crew.has(bi.user.id)) {
                    bi.reply({ content: "❌ No formas parte de esta banda de asalto.", ephemeral: true }).catch(() => {});
                    return false;
                  }
                  return true;
                },
                time: 9_000,
                componentType: ComponentType.Button,
              });

              await btnInteraction.deferUpdate().catch(() => {});
              decidingUser = btnInteraction.user;
              const optId = btnInteraction.customId.replace(/^qte_/, "");
              chosenOption = qte.options.find((o) => o.id === optId || `qte_${o.id}` === btnInteraction.customId) || qte.options[0]!;

              const userMemberData = crew.get(decidingUser.id);
              const isSpecialist =
                Boolean(chosenOption.recommendedRole) &&
                userMemberData?.roleId === chosenOption.recommendedRole;

              if (isSpecialist) {
                qteSuccess = true;
                qteResultNarrative = `🌟 **¡Éxito Magistral de Especialista!** <@${decidingUser.id}> (${chosenOption.roleNameLabel}):\n${chosenOption.successText}`;
                stats.finalWinRate = Math.min(0.77, Number((stats.finalWinRate + chosenOption.winRateBonus).toFixed(3)));
              } else {
                const roll = rng(1, 100);
                if (roll <= chosenOption.successChanceNonRole) {
                  qteSuccess = true;
                  qteResultNarrative = `✅ **¡Maniobra Arriesgada Exitosa!** <@${decidingUser.id}> (${userMemberData?.roleTitle ?? "Miembro"}):\n${chosenOption.successText}`;
                  stats.finalWinRate = Math.min(0.77, Number((stats.finalWinRate + chosenOption.winRateBonus * 0.75).toFixed(3)));
                } else {
                  qteSuccess = false;
                  qteResultNarrative = `⚠️ **¡Pifia Táctica!** <@${decidingUser.id}> falló la maniobra:\n${chosenOption.failText}`;
                  stats.finalWinRate = Math.max(0.01, Number((stats.finalWinRate - chosenOption.winRatePenalty).toFixed(3)));
                }
              }
            } catch {
              qteSuccess = false;
              qteResultNarrative = qte.timeoutText;
              stats.finalWinRate = Math.max(0.01, Number((stats.finalWinRate - qte.timeoutPenalty).toFixed(3)));
            }
          }

          let hudQteResAttachment: AttachmentBuilder | null = null;
          try {
            const hudBufferQteRes = await renderHeistHud({
              targetDef,
              securityLevel: targetSec.securityLevel,
              tier: targetSec.tier,
              phase: "qte_result",
              crew: canvasCrew,
              progressPct: progressPct + 3,
              phaseTitle: qteSuccess ? `INCIDENTE ${qNum}/7: NEUTRALIZADO` : `INCIDENTE ${qNum}/7: COMPLICADO`,
              qteOutcomeSuccess: qteSuccess,
              gearDetected: stats.gearDetected,
            });
            hudQteResAttachment = new AttachmentBuilder(hudBufferQteRes, { name: `heist_hud_dav_res_${qNum}.png` });
          } catch (err) {
            logger.error("Error generando HUD canvas Davito QTE result:", err);
          }

          const qteResultEmbed = baseEmbed(qteSuccess ? 0x2ecc71 : 0xe74c3c)
            .setThumbnail(qteSuccess ? HEIST_MEDIA.victory : HEIST_MEDIA.failure)
            .setTitle(qteSuccess ? `✅ [INCIDENTE ${qNum}/7 RESUELTO] ${qte.title}` : `⚠️ [COMPLICACIÓN ${qNum}/7] ${qte.title}`)
            .setDescription(
              `${qteResultNarrative}\n\n` +
                `📊 **Probabilidad actual de éxito:** ~${stats.finalWinRate}%\n\n` +
                `⏳ *${qNum < 7 ? `Siguiente incidente táctico (${qNum + 1}/7) en 2.5 segundos...` : "¡Avanzando a la extracción final!"}*`,
            );
          if (hudQteResAttachment) {
            qteResultEmbed.setImage(`attachment://heist_hud_dav_res_${qNum}.png`);
          }

          await interaction
            .editReply({
              embeds: [qteResultEmbed],
              files: hudQteResAttachment ? [hudQteResAttachment] : [],
              components: [],
            })
            .catch(() => {});
          await sleep(2500);
        }
      } else {
        // ── INCIDENTE TÁCTICO PARA ASALTOS REGULARES (1 QTE) ──
        const qte = getHeistQteForTarget(targetDef.id);

        let hudQteAttachment: AttachmentBuilder | null = null;
        try {
          const hudBufferQte = await renderHeistHud({
            targetDef,
            securityLevel: targetSec.securityLevel,
            tier: targetSec.tier,
            phase: "qte",
            crew: canvasCrew,
            progressPct: 55,
            phaseTitle: "⚡ INCIDENTE TÁCTICO IMPREVISTO",
            gearDetected: stats.gearDetected,
          });
          hudQteAttachment = new AttachmentBuilder(hudBufferQte, { name: "heist_hud_qte.png" });
        } catch (err) {
          logger.error("Error generando HUD canvas QTE:", err);
        }

        const qteEmbed = baseEmbed(0xf59e0b)
          .setThumbnail(HEIST_MEDIA.qte)
          .setTitle(`⚡ [DECISIÓN TÁCTICA] ${qte.title} ⏱️ 12s`)
          .setDescription(
            `🚨 **${qte.description}**\n\n` +
              `**¿Qué debe hacer la banda?** Pulsa una opción en los botones de abajo.\n` +
              `💡 *Si quien pulsa tiene el rol recomendado, la maniobra tiene 100% de efectividad; si pulsa otro miembro, hay riesgo de pifia.*\n` +
              `⏰ *Tenéis 12 segundos para coordinar la acción antes de que la seguridad reaccione.*`,
          );
        if (hudQteAttachment) {
          qteEmbed.setImage("attachment://heist_hud_qte.png");
        }

        const qteRow = new ActionRowBuilder<ButtonBuilder>();
        for (const opt of qte.options) {
          qteRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`qte_${opt.id}`)
              .setLabel(opt.label)
              .setEmoji(opt.emoji)
              .setStyle(opt.style),
          );
        }

        await interaction
          .editReply({
            embeds: [qteEmbed],
            files: hudQteAttachment ? [hudQteAttachment] : [],
            components: [qteRow],
          })
          .catch(() => {});

        const qteMsg = await interaction.fetchReply().catch(() => null);
        let chosenOption: HeistQteOption | null = null;
        let decidingUser: User | null = null;
        let qteSuccess = false;
        let qteResultNarrative = "";

        if (qteMsg) {
          try {
            const btnInteraction = await qteMsg.awaitMessageComponent({
              filter: (bi) => {
                if (!crew.has(bi.user.id)) {
                  bi.reply({ content: "❌ No formas parte de esta banda de asalto.", ephemeral: true }).catch(() => {});
                  return false;
                }
                return true;
              },
              time: 12_000,
              componentType: ComponentType.Button,
            });

            await btnInteraction.deferUpdate().catch(() => {});
            decidingUser = btnInteraction.user;
            const optId = btnInteraction.customId.replace(/^qte_/, "");
            chosenOption = qte.options.find((o) => o.id === optId || `qte_${o.id}` === btnInteraction.customId) || qte.options[0]!;

            const userMemberData = crew.get(decidingUser.id);
            const isSpecialist =
              Boolean(chosenOption.recommendedRole) &&
              userMemberData?.roleId === chosenOption.recommendedRole;

            const maxTargetWinRate = Math.min(76, 80 - Math.floor(targetSec.securityLevel / 2));

            if (isSpecialist) {
              qteSuccess = true;
              qteResultNarrative = `🌟 **¡Éxito Magistral de Especialista!** <@${decidingUser.id}> utilizó su maestría como **${chosenOption.roleNameLabel}**:\n${chosenOption.successText}`;
              stats.finalWinRate = Math.min(maxTargetWinRate, stats.finalWinRate + Math.round(chosenOption.winRateBonus * 0.5));
              if (chosenOption.lootBonusPct) {
                stats.lootBonusPct += chosenOption.lootBonusPct;
                stats.lootMin = Math.round(stats.lootMin * (1 + chosenOption.lootBonusPct / 100));
                stats.lootMax = Math.round(stats.lootMax * (1 + chosenOption.lootBonusPct / 100));
              }
            } else {
              const roll = rng(1, 100);
              if (roll <= chosenOption.successChanceNonRole) {
                qteSuccess = true;
                qteResultNarrative = `✅ **¡Maniobra Arriesgada Exitosa!** <@${decidingUser.id}> (${userMemberData?.roleTitle ?? "Miembro"}) tomó el riesgo y salió bien:\n${chosenOption.successText}`;
                stats.finalWinRate = Math.min(maxTargetWinRate, stats.finalWinRate + Math.round(chosenOption.winRateBonus * 0.4));
                if (chosenOption.lootBonusPct) {
                  const bonusPct = Math.round(chosenOption.lootBonusPct * 0.7);
                  stats.lootBonusPct += bonusPct;
                  stats.lootMin = Math.round(stats.lootMin * (1 + bonusPct / 100));
                  stats.lootMax = Math.round(stats.lootMax * (1 + bonusPct / 100));
                }
              } else {
                qteSuccess = false;
                qteResultNarrative = `⚠️ **¡Pifia Táctica!** <@${decidingUser.id}> intentó la maniobra pero la seguridad respondió rápido:\n${chosenOption.failText}`;
                stats.finalWinRate = Math.max(12, stats.finalWinRate - chosenOption.winRatePenalty);
              }
            }
          } catch {
            qteSuccess = false;
            qteResultNarrative = qte.timeoutText;
            stats.finalWinRate = Math.max(12, stats.finalWinRate - qte.timeoutPenalty);
          }
        }

        // Mostrar resolución del QTE con Canvas actualizado
        let hudQteResAttachment: AttachmentBuilder | null = null;
        try {
          const hudBufferQteRes = await renderHeistHud({
            targetDef,
            securityLevel: targetSec.securityLevel,
            tier: targetSec.tier,
            phase: "qte_result",
            crew: canvasCrew,
            progressPct: 65,
            phaseTitle: qteSuccess ? "RESULTADO: ÉXITO TÁCTICO" : "RESULTADO: INCIDENTE AGRAVADO",
            qteOutcomeSuccess: qteSuccess,
            gearDetected: stats.gearDetected,
          });
          hudQteResAttachment = new AttachmentBuilder(hudBufferQteRes, { name: "heist_hud_qte_res.png" });
        } catch (err) {
          logger.error("Error generando HUD canvas QTE result:", err);
        }

        const qteResultEmbed = baseEmbed(qteSuccess ? 0x2ecc71 : 0xe74c3c)
          .setThumbnail(qteSuccess ? HEIST_MEDIA.victory : HEIST_MEDIA.failure)
          .setTitle(qteSuccess ? `✅ [INCIDENTE RESUELTO] ${qte.title}` : `⚠️ [COMPLICACIÓN TÁCTICA] ${qte.title}`)
          .setDescription(
            `${qteResultNarrative}\n\n` +
              `📊 **Probabilidad actual de éxito:** ~${stats.finalWinRate}%\n\n` +
              `⏳ *Avanzando a la extracción... Leyendo situación en 5.5 segundos.*`,
          );
        if (hudQteResAttachment) {
          qteResultEmbed.setImage("attachment://heist_hud_qte_res.png");
        }

        await interaction
          .editReply({
            embeds: [qteResultEmbed],
            files: hudQteResAttachment ? [hudQteResAttachment] : [],
            components: [],
          })
          .catch(() => {});
        await sleep(5500);
      }

      // FASE 3: Alarma & Extracción
      let hud3Attachment: AttachmentBuilder | null = null;
      try {
        const hudBuffer3 = await renderHeistHud({
          targetDef,
          securityLevel: targetSec.securityLevel,
          tier: targetSec.tier,
          phase: "phase3",
          crew: canvasCrew,
          progressPct: 85,
          phaseTitle: anims.phase3.title,
          gearDetected: stats.gearDetected,
        });
        hud3Attachment = new AttachmentBuilder(hudBuffer3, { name: "heist_hud_p3.png" });
      } catch (err) {
        logger.error("Error generando HUD canvas fase 3:", err);
      }

      const phase3Embed = baseEmbed(anims.phase3.color)
        .setThumbnail(HEIST_MEDIA.phase3)
        .setTitle(anims.phase3.title)
        .setDescription(
          `${anims.phase3.progress}\n\n${anims.phase3.description}\n\n⏳ *Extracción a toda velocidad... Resolución final en 6 segundos.*`,
        );
      if (hud3Attachment) {
        phase3Embed.setImage("attachment://heist_hud_p3.png");
      }

      await interaction
        .editReply({
          embeds: [phase3Embed],
          files: hud3Attachment ? [hud3Attachment] : [],
          components: [],
        })
        .catch(() => {});
      await sleep(6000);

      // Golpe ejecutado: aplicar cooldown a este objetivo y al servidor
      lastHeistMap.set(gid, Date.now());

      let success = false;
      let usedAdrenaline = false;

      if (stats.isDavito) {
        // Tirada especial de alta precisión sobre 10.000 garantizando que NUNCA supere 0.77% (incluso con adrenalina)
        const threshold = Math.min(77, Math.round(stats.finalWinRate * 100)); // máx 77 / 10000 = 0.77%
        const baseThreshold = stats.hasAdrenaline ? Math.floor(threshold * 0.70) : threshold;
        const roll = rng(1, 10000);
        success = roll <= baseThreshold;

        if (!success && stats.hasAdrenaline && roll <= baseThreshold + 20) {
          usedAdrenaline = true;
          const secondRoll = rng(1, 10000);
          const secondThreshold = Math.floor(threshold * 0.30);
          success = secondRoll <= secondThreshold;
        }
      } else {
        const roll = rng(1, 100);
        success = roll <= stats.finalWinRate;

        // Segunda oportunidad si tiene adrenalina (solo si estuvo muy cerca de triunfar)
        if (!success && stats.hasAdrenaline && roll <= stats.finalWinRate + 6) {
          usedAdrenaline = true;
          const secondRoll = rng(1, 100);
          if (secondRoll <= Math.min(45, Math.round(stats.finalWinRate * 0.5))) {
            success = true;
          }
        }
      }

      if (success) {
        // Consumir equipamiento táctico utilizado
        for (const m of members) {
          const eco = getEco(gid, m.userId);
          if (stats.hasEmp) takeItem(eco, "inhibidor_emp");
          if (stats.hasC4) takeItem(eco, "c4");
          if (stats.hasDrill) takeItem(eco, "taladro_termico");
          saveEco(eco, `Equipamiento táctico consumido en asalto a ${targetDef.shortName}`);
        }

        const lootPerPerson = stats.isDavito ? DAVITO_REWARD_COINS : rng(stats.lootMin, stats.lootMax);
        const totalLoot = lootPerPerson * members.length;

        // Entregar botín económico
        getDb().transaction(() => {
          for (const m of members) {
            const eco = getEco(gid, m.userId);
            addWallet(eco, lootPerPerson);
            saveEco(eco, `Botín de asalto a ${targetDef.name}`);
          }

          getDb()
            .prepare(
              "INSERT INTO bank_heists (guild_id, leader_id, participants, loot_amount, status, ends_at, created_at, target_id) VALUES (?, ?, ?, ?, 'success', ?, ?, ?)",
            )
            .run(
              gid,
              leader.id,
              JSON.stringify(members.map((m) => m.userId)),
              totalLoot,
              Date.now(),
              Date.now(),
              targetDef.id,
            );
        })();

        // Actualizar estadísticas de seguridad del objetivo
        const { security: updatedSec, justUnlockedDavito } = recordTargetHeistResult(
          gid,
          targetDef.id,
          true,
          totalLoot,
        );

        // Reparto de XP de rol y reputación criminal
        const xpNotices: string[] = [];
        for (const m of members) {
          const res = awardHeistXp(gid, m.userId, m.roleId, true, lootPerPerson);
          if (res.leveledUp) {
            xpNotices.push(`🎉 <@${m.userId}> ha ascendido a **Nv. ${res.newLevel}** en **${res.roleName}** (*${res.newTitle}*)!`);
          }
        }

        // Si es Davito, otorgar el rol exclusivo a todos
        if (stats.isDavito && interaction.guild) {
          for (const m of members) {
            try {
              const guildMember = await interaction.guild.members.fetch(m.userId).catch(() => null);
              if (guildMember && !guildMember.roles.cache.has(DAVITO_ROLE_ID)) {
                await guildMember.roles.add(DAVITO_ROLE_ID, "Vencedor supremo del Asalto a Davito").catch(() => {});
              }
            } catch {
              /* ignore */
            }
          }
        }

        // Comprobar logros
        for (const m of members) {
          await checkUserAchievements(gid, m.userId);
        }

        const memberLines = members
          .map((m) => {
            const roleDef = HEIST_ROLES[m.roleId] || HEIST_ROLES.tirador;
            return `▸ <@${m.userId}> (${roleDef.emoji} **${roleDef.name}** Nv. ${m.roleLevel}): +**${n(lootPerPerson)}**`;
          })
          .join("\n");

        const adrenalineNote = usedAdrenaline
          ? `\n💉 *¡La inyección de adrenalina de la banda obró el milagro concediendo una segunda oportunidad providencial!*\n`
          : "";

        let unlockAnnouncement = "";
        if (justUnlockedDavito) {
          unlockAnnouncement =
            `\n\n🚨 **¡¡¡ALERTA MÁXIMA DEL INFRAMUNDO: CÓDIGO OMEGA ACTIVADO!!!** 🚨\n` +
            `¡Todos los objetivos de asalto del servidor han alcanzado el **Nivel Máximo (Nivel 10)**!\n` +
            `Se ha desclasificado la ubicación de la **Fortaleza Inexpugnable de Davito**.\n` +
            `El asalto secreto ya está disponible para planificar usando \`/asalto iniciar objetivo:davito\`.`;
        }

        if (stats.isDavito) {
          let hudWinAttach: AttachmentBuilder | null = null;
          try {
            const hudWinBuf = await renderHeistHud({
              targetDef,
              securityLevel: updatedSec.securityLevel,
              tier: updatedSec.tier,
              phase: "victory",
              crew: canvasCrew,
              progressPct: 100,
              phaseTitle: "MISIÓN CUMPLIDA · FORTALEZA CONQUISTADA",
              lootAmount: totalLoot,
              gearDetected: stats.gearDetected,
            });
            hudWinAttach = new AttachmentBuilder(hudWinBuf, { name: "heist_hud_win.png" });
          } catch (err) {
            logger.error("Error generando HUD victoria Davito:", err);
          }

          const winEmbed = baseEmbed(0xf1c40f)
            .setThumbnail(HEIST_MEDIA.victory)
            .setTitle("👑 ¡¡¡HISTÓRICO: LA FORTALEZA DE DAVITO HA SIDO CONQUISTADA!!! 👑")
            .setDescription(
              `¡¡CONTRA TODO PRONÓSTICO CÓSMICO (probabilidad menor al 1%), la banda ha doblegado las defensas absolutas de Davito y ha reclamado el tesoro supremo!!\n\n` +
                `🏆 **Recompensas Exclusivas:**\n` +
                `▸ **Rol Honorífico:** <@&${DAVITO_ROLE_ID}> asignado a todos los asaltantes.\n` +
                `▸ **Botín Mítico:** **🪙 100.000.000 nexocoins** otorgados a cada miembro.\n` +
                `▸ **Botín Total Saqueado:** **${n(totalLoot)}**\n` +
                `⭐ **Experiencia ganada:** +550 XP de Rol | +1.000 Reputación Criminal\n${adrenalineNote}\n\n` +
                `**Supervivientes Legendarios:**\n${memberLines}` +
                (xpNotices.length > 0 ? `\n\n**Subidas de Rango:**\n${xpNotices.join("\n")}` : ""),
            );
          if (hudWinAttach) {
            winEmbed.setImage("attachment://heist_hud_win.png");
          }

          await interaction.editReply({
            embeds: [winEmbed],
            files: hudWinAttach ? [hudWinAttach] : [],
            components: [],
          });
        } else {
          let hudWinAttach: AttachmentBuilder | null = null;
          try {
            const hudWinBuf = await renderHeistHud({
              targetDef,
              securityLevel: updatedSec.securityLevel,
              tier: updatedSec.tier,
              phase: "victory",
              crew: canvasCrew,
              progressPct: 100,
              phaseTitle: "MISIÓN CUMPLIDA · BOTÍN EXTRAÍDO",
              lootAmount: totalLoot,
              gearDetected: stats.gearDetected,
            });
            hudWinAttach = new AttachmentBuilder(hudWinBuf, { name: "heist_hud_win.png" });
          } catch (err) {
            logger.error("Error generando HUD victoria:", err);
          }

          const winEmbed = baseEmbed(COLORS.success)
            .setThumbnail(HEIST_MEDIA.victory)
            .setTitle(`💰 ¡¡¡ASALTO EXITOSO: ${targetDef.name}!!! 💰`)
            .setDescription(
              `¡La banda burló las defensas de **${targetDef.name}**, reventó los blindajes y escapó con el botín!\n\n` +
                `🏛️ **Seguridad del Objetivo:** Nivel sube a **Nivel ${updatedSec.securityLevel} (${updatedSec.tier.name})** para el próximo golpe.\n` +
                `💵 **Botín Total Saqueado:** **${n(totalLoot)}**\n` +
                `🎁 **Parte de cada cómplice:** **${n(lootPerPerson)}**\n` +
                `⭐ **Experiencia ganada:** +110 XP de Rol | +150 Reputación Criminal\n${adrenalineNote}\n\n` +
                `**Reparto del Botín:**\n${memberLines}` +
                (xpNotices.length > 0 ? `\n\n**Subidas de Rango:**\n${xpNotices.join("\n")}` : "") +
                unlockAnnouncement,
            );
          if (hudWinAttach) {
            winEmbed.setImage("attachment://heist_hud_win.png");
          }

          await interaction.editReply({
            embeds: [winEmbed],
            files: hudWinAttach ? [hudWinAttach] : [],
            components: [],
          });
        }
      } else {
        // Fracaso: Comprobar rescate del Conductor o Furgón Blindado
        let conductorLevel = 1;
        let hasConductor = false;
        for (const m of members) {
          if (m.roleId === "conductor") {
            hasConductor = true;
            if (m.roleLevel > conductorLevel) conductorLevel = m.roleLevel;
          }
        }

        let rescueChance = hasConductor ? 35 + conductorLevel * 4 : 0;
        if (stats.hasVan) {
          rescueChance = Math.max(rescueChance, 60);
          for (const m of members) {
            const eco = getEco(gid, m.userId);
            if (takeItem(eco, "furgon_blindado")) {
              saveEco(eco, "Furgón blindado destruido durante la huida del asalto");
              break;
            }
          }
        }

        // Si es Davito, las defensas planetarias reducen drásticamente la tasa de huida (máximo 15%)
        if (stats.isDavito) {
          rescueChance = Math.min(15, Math.round(rescueChance * 0.25));
        }

        const rescued = rescueChance > 0 && rng(1, 100) <= rescueChance;

        // Actualizar seguridad del objetivo (-1 nivel si no es secreto)
        const { security: updatedSec } = recordTargetHeistResult(gid, targetDef.id, false, 0);

        // Asignar XP de consolación
        for (const m of members) {
          awardHeistXp(gid, m.userId, m.roleId, false, 0);
        }

        getDb()
          .prepare(
            "INSERT INTO bank_heists (guild_id, leader_id, participants, loot_amount, status, ends_at, created_at, target_id) VALUES (?, ?, ?, 0, 'failed', ?, ?, ?)",
          )
          .run(
            gid,
            leader.id,
            JSON.stringify(members.map((m) => m.userId)),
            Date.now(),
            Date.now(),
            targetDef.id,
          );

        if (rescued) {
          // Rescate exitoso: ¡No van a la cárcel ni pagan multas!
          let hudEscapeAttach: AttachmentBuilder | null = null;
          try {
            const hudEscapeBuf = await renderHeistHud({
              targetDef,
              securityLevel: updatedSec.securityLevel,
              tier: updatedSec.tier,
              phase: "escape",
              crew: canvasCrew,
              progressPct: 90,
              phaseTitle: "FUGA EXITOSA · BANDA A SALVO",
              gearDetected: stats.gearDetected,
            });
            hudEscapeAttach = new AttachmentBuilder(hudEscapeBuf, { name: "heist_hud_escape.png" });
          } catch (err) {
            logger.error("Error generando HUD escape:", err);
          }

          const escapeEmbed = baseEmbed(COLORS.warn)
            .setThumbnail(HEIST_MEDIA.escape)
            .setTitle(`🚨 ¡EL GOLPE A ${targetDef.shortName.toUpperCase()} FALLÓ, PERO HUBO ESCAPE! 🚗💨`)
            .setDescription(
              `Sonaron las alarmas y las fuerzas de seguridad bloquearon el perímetro, pero el **Conductor de Fuga** embistió los controles y rescató a la banda.\n\n` +
                `🏛️ **${targetDef.name}:** Seguridad se sitúa en **Nivel ${updatedSec.securityLevel} (${updatedSec.tier.name})**.\n` +
                `🛡️ **Estado:** **¡Todos habéis escapado sanos y salvos!** Ningún miembro va a la cárcel ni paga multas.\n` +
                `⭐ **Experiencia adquirida:** +45 XP de Rol por aprender de los errores.`,
            );
          if (hudEscapeAttach) {
            escapeEmbed.setImage("attachment://heist_hud_escape.png");
          }

          await interaction.editReply({
            embeds: [escapeEmbed],
            files: hudEscapeAttach ? [hudEscapeAttach] : [],
            components: [],
          });
        } else {
          // Arrestados
          let jailMinutes = stats.isDavito ? 25 : 10;
          let reducedMinutes = stats.isDavito ? 8 : 3;

          // Si hay un médico en la banda, reduce las penas de calabozo un 40%
          const medicoMember = members.find((m) => m.roleId === "medico");
          if (medicoMember) {
            jailMinutes = Math.max(2, Math.round(jailMinutes * 0.60));
            reducedMinutes = Math.max(1, Math.round(reducedMinutes * 0.60));
          }

          const standardJail = Date.now() + jailMinutes * 60_000;
          const reducedJail = Date.now() + reducedMinutes * 60_000;

          interface MemberPenalty {
            userId: string;
            jailTimeText: string;
            fineAmount: number;
          }

          const penalties: MemberPenalty[] = [];

          // Negociador para descuento de multas
          const negociadorMember = members.find((m) => m.roleId === "negociador");

          getDb().transaction(() => {
            for (const m of members) {
              const eco = getEco(gid, m.userId);
              const inv = invOf(eco);
              const isImmune = m.userId === "600041740124160011";

              if (!isImmune) {
                eco.jailed_until = inv.mascara_balistica ? reducedJail : standardJail;
              } else {
                eco.jailed_until = 0;
              }

              const timeText = isImmune
                ? `0 min *(Inmune)*`
                : inv.mascara_balistica
                  ? `${reducedMinutes} min *(Máscara)*`
                  : `${jailMinutes} min`;

              const totalFundsUser = Math.max(0, (eco.wallet ?? 0) + (eco.bank ?? 0));
              let fineAmount = 0;

              if (stats.isDavito) {
                // En el asalto a Davito: SE PIERDE EL 25% DEL PATRIMONIO AL COMPLETO (cartera + banco) SIN LÍMITE MÁXIMO
                fineAmount = Math.round(totalFundsUser * 0.25);
              } else {
                // En asaltos estándar: 10% de su patrimonio con tope de hasta 500.000 🪙 (ampliado desde 50.000)
                const calculatedFine = Math.round(totalFundsUser * 0.10);
                const rawFine = totalFundsUser > 0 ? Math.max(500, calculatedFine) : 0;
                fineAmount = Math.min(500_000, Math.min(totalFundsUser, rawFine));

                if (negociadorMember && fineAmount > 0) {
                  const discountPct = Math.min(0.60, 0.30 + negociadorMember.roleLevel * 0.03);
                  fineAmount = Math.round(fineAmount * (1 - discountPct));
                }
              }

              if (isImmune) {
                fineAmount = 0;
              }

              if (!isImmune && fineAmount > 0) {
                deductFunds(eco, fineAmount);
                saveEco(eco, `Multa judicial por asalto fallido a ${targetDef.shortName}`);
              } else {
                saveEco(eco);
              }

              penalties.push({
                userId: m.userId,
                jailTimeText: timeText,
                fineAmount,
              });
            }
          })();

          const jailLines = penalties
            .map((p) => {
              const fineText =
                p.fineAmount > 0
                  ? ` | 💸 Multa judicial: **-${n(p.fineAmount)}**`
                  : " | 💸 *Sin fondos para multa*";
              return `▸ <@${p.userId}>: Calabozo **${p.jailTimeText}**${fineText}`;
            })
            .join("\n");

          let hudFailAttach: AttachmentBuilder | null = null;
          try {
            const hudFailBuf = await renderHeistHud({
              targetDef,
              securityLevel: updatedSec.securityLevel,
              tier: updatedSec.tier,
              phase: "failure",
              crew: canvasCrew,
              progressPct: 85,
              phaseTitle: "ASALTO INTERCEPTADO · BANDA ARRESTADA",
              gearDetected: stats.gearDetected,
            });
            hudFailAttach = new AttachmentBuilder(hudFailBuf, { name: "heist_hud_fail.png" });
          } catch (err) {
            logger.error("Error generando HUD arresto:", err);
          }

          const penaltyNotice = stats.isDavito
            ? `⚖️ *Al tratarse de la Fortaleza de Davito, cada asaltante ha perdido el 25% de todo su patrimonio acumulado (cartera + banco sin límite).*`
            : `⚖️ *Las multas judiciales proporcionales (hasta un máximo de 500.000 🪙) han sido descontadas de los fondos de cada implicado.*`;

          const failEmbed = baseEmbed(COLORS.danger)
            .setThumbnail(HEIST_MEDIA.failure)
            .setTitle(`🚨 ¡¡¡EL ASALTO A ${targetDef.shortName.toUpperCase()} HA SIDO UN FRACASO TOTAL!!! 🚨`)
            .setDescription(
              `Los refuerzos tácticos rodearon y neutralizaron a la banda en plena huida.\n\n` +
                `🏛️ **${targetDef.name}:** El blindaje retrocede a **Nivel ${updatedSec.securityLevel} (${updatedSec.tier.name})**.\n` +
                `🚔 **Toda la banda ha sido detenida y trasladada al calabozo policial.**\n\n` +
                `**Sanciones y Condenas:**\n${jailLines}\n\n` +
                `${penaltyNotice}\n` +
                `⭐ **Experiencia adquirida:** +45 XP de Rol | +30 Reputación Criminal`,
            );
          if (hudFailAttach) {
            failEmbed.setImage("attachment://heist_hud_fail.png");
          }

          await interaction.editReply({
            embeds: [failEmbed],
            files: hudFailAttach ? [hudFailAttach] : [],
            components: [],
          });
        }
      }
    } catch (err) {
      logger.error("Error al resolver asalto al banco:", err);
      try {
        await interaction.editReply({
          embeds: [
            errorEmbed(
              "Error en el asalto",
              "Ocurrió un error inesperado durante el asalto al banco. Los saldos no sufrieron alteraciones.",
            ),
          ],
          components: [],
        });
      } catch {
        /* ignore */
      }
    } finally {
      activeHeistLobbies.delete(gid);
    }
  }

  collector.on("collect", async (i) => {
    if (resolved) {
      await i.reply({ content: "El asalto ya se está ejecutando o ha concluido.", ephemeral: true });
      return;
    }

    // Selección de rol
    if (i.isStringSelectMenu() && i.customId === `${heistId}:select_role`) {
      const selectedRoleId = i.values[0];
      const memberData = crew.get(i.user.id);
      if (!memberData) {
        await i.reply({
          content: "Debes unirte primero a la banda antes de seleccionar tu rol en el asalto.",
          ephemeral: true,
        });
        return;
      }

      setUserActiveRole(gid, i.user.id, selectedRoleId);
      const roleState = getUserRoleState(gid, i.user.id, selectedRoleId);

      memberData.roleId = selectedRoleId;
      memberData.roleLevel = roleState.level;
      memberData.roleTitle = roleState.title;

      await i.update({ embeds: [getEmbed()] });
      return;
    }

    if (!i.isButton()) return;

    if (i.customId === `${heistId}:join`) {
      if (crew.has(i.user.id)) {
        if (i.user.id === leader.id) {
          await i.reply({
            content: "Eres el líder de la banda. Para anular el golpe, pulsa el botón **❌ Cancelar golpe**.",
            ephemeral: true,
          });
          return;
        }
        crew.delete(i.user.id);
        await i.update({ embeds: [getEmbed()] });
        return;
      }

      const maxCrew = targetDef.id === "davito" ? 16 : 8;
      if (crew.size >= maxCrew) {
        await i.reply({ content: `La banda ya está al máximo de capacidad (${maxCrew} criminales).`, ephemeral: true });
        return;
      }

      const userEco = getEco(gid, i.user.id);
      const isJailed = jailCheck(userEco);
      if (isJailed) {
        await i.reply({ content: `No puedes unirte al asalto: ${isJailed}`, ephemeral: true });
        return;
      }

      const userProfile = getUserHeistProfile(gid, i.user.id);
      const roleState = getUserRoleState(gid, i.user.id, userProfile.activeRole);

      crew.set(i.user.id, {
        userId: i.user.id,
        username: i.user.username,
        roleId: roleState.roleId,
        roleLevel: roleState.level,
        roleTitle: roleState.title,
        avatarUrl: i.user.displayAvatarURL({ extension: "png", size: 128 }),
      });

      await i.update({ embeds: [getEmbed()] });
      return;
    }

    if (i.customId === `${heistId}:start`) {
      if (i.user.id !== leader.id) {
        await i.reply({
          content: "Solo el líder de la banda que convocó el golpe puede ordenar la ejecución.",
          ephemeral: true,
        });
        return;
      }
      if (crew.size < 2) {
        await i.reply({
          content: "Se requiere al menos a **1 cómplice más** en la banda antes de ejecutar el asalto.",
          ephemeral: true,
        });
        return;
      }

      await i.deferUpdate();
      await resolveHeist();
      return;
    }

    if (i.customId === `${heistId}:cancel`) {
      if (i.user.id !== leader.id) {
        await i.reply({
          content: "Solo el líder de la banda puede cancelar los preparativos del golpe.",
          ephemeral: true,
        });
        return;
      }

      resolved = true;
      collector.stop("cancelled");
      activeHeistLobbies.delete(gid);

      await i.update({
        embeds: [
          successEmbed(
            "Asalto cancelado",
            `El líder <@${leader.id}> ha cancelado los preparativos. No sonaron alarmas ni se aplicaron penalizaciones.`,
          ),
        ],
        components: [],
      });
      return;
    }
  });

  collector.on("end", async (_collected, reason) => {
    if (reason !== "executed" && reason !== "cancelled" && !resolved) {
      await resolveHeist();
    }
  });
}
