import { EmbedBuilder, type Client, type TextBasedChannel } from "discord.js";
import { n } from "./engine.js";
import {
  HEIST_TARGETS,
  STANDARD_TARGET_IDS,
  getTargetSecurity,
  getDavitoUnlockProgress,
  getMaxWinRateForSecurity,
  type BankSecurityInfo,
} from "./heistEngine.js";
import { logger } from "../../logger.js";

export const HEIST_CHANNEL_ID = "1551314945403256842";

/**
 * Especialistas tácticos recomendados por cada objetivo estándar.
 */
const TARGET_RECOMMENDED_ROLES: Record<string, string> = {
  banco: "Hacker / Demoliciones",
  casino: "Infiltrador / Negociador",
  mansion: "Infiltrador / Conductor",
  museo: "Infiltrador / Médico",
  tren_blindado: "Tirador / Demoliciones",
  empresa: "Hacker / Negociador",
  submarino: "Tirador / Demoliciones",
  estacion_espacial: "Hacker / Infiltrador",
};

/**
 * Genera el paquete de 4 embeds dinámicos para el mensaje fijado en #asaltos.
 */
export function buildHeistGuideEmbeds(guildId: string): EmbedBuilder[] {
  // ── 1. EMBED CABECERA & COMANDOS ──
  const embed1 = new EmbedBuilder()
    .setColor(0x8b1e3f)
    .setTitle("🏦 SISTEMA DE ASALTOS & INFRAMUNDO · NEXO 2.0")
    .setDescription(
      `Bienvenido a la red de asaltos y crimen organizado de **Nexo**. Reúne a tu banda, vulnera las medidas de seguridad de las cámaras acorazadas, funda tu propio clan criminal o patrulla como policía en tiempo real.\n\n` +
      `• 👥 **Banda:** 1 a 12 miembros | ⏱️ **Cooldown:** 30 min | ⚖️ **Multas:** Hasta 500.000 🪙 ante arresto.`
    )
    .addFields(
      {
        name: "🎯 Comandos Principales de Asalto",
        value:
          `▸ \`/asalto iniciar <objetivo>\` — Inicia un lobby interactivo de asalto.\n` +
          `▸ \`/asalto rol [rol]\` — Elige tu especialidad criminal activa.\n` +
          `▸ \`/asalto perfil [usuario]\` — Consulta nivel de rol, reputación y botín.\n` +
          `▸ \`/asalto ranking\` — Clasificación de los mayores atracadores.\n` +
          `▸ \`/asalto info [objetivo]\` — Estado de blindaje y mutadores del día.\n` +
          `▸ \`/asalto vitrina [usuario]\` — Exhibe tu colección de reliquias.\n` +
          `▸ \`/asalto empeñar <reliquia>\` — Vende reliquias por nexocoins en la casa de empeños.`,
      },
      {
        name: "🎒 Equipamiento Táctico del Mercado Negro",
        value:
          `• **Inhibidor EMP:** +5% éxito | • **C4:** +15% botín | • **Taladro:** +25% botín\n` +
          `• **Furgón Blindado:** 45% huida | • **Adrenalina:** 2ª oportunidad | • **Máscara:** -calabozo`,
      }
    );

  // ── 2. EMBED DIRECTORIO DE ASALTOS DISPONIBLES (8 Objetivos Estándar) ──
  const targetLines: string[] = [];

  for (const tid of STANDARD_TARGET_IDS) {
    const def = HEIST_TARGETS[tid]!;
    const sec: BankSecurityInfo = getTargetSecurity(guildId, tid);
    const minLoot = Math.round(def.baseLootMin * sec.tier.lootMultiplier);
    const maxLoot = Math.round(def.baseLootMax * sec.tier.lootMultiplier);
    const maxWinRate = getMaxWinRateForSecurity(sec.securityLevel);
    const roles = TARGET_RECOMMENDED_ROLES[tid] ?? "Cualquiera";

    const hasMaxed = sec.level10Reached || sec.securityLevel >= 10;
    const maxedBadge = hasMaxed ? " ⭐ *(Hito Nv. 10 Registrado)*" : "";
    targetLines.push(
      `${def.emoji} **${def.shortName}** · Nv. ${sec.securityLevel}/10 ${sec.tier.emoji} *(${sec.tier.name})*${maxedBadge}\n` +
      `▸ Botín: **${Math.floor(minLoot).toLocaleString("es-ES")} — ${Math.floor(maxLoot).toLocaleString("es-ES")} 🪙** | Éxito: **≤${maxWinRate}%** | Clave: \`${roles}\``
    );
  }

  const embed2 = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("🏛️ DIRECTORIO DE ASALTOS DISPONIBLES (8 OBJETIVOS)")
    .setDescription(targetLines.join("\n\n"))
    .setFooter({ text: "Superar asaltos sube el nivel de blindaje y botín; los hitos de Nv. 10 quedan registrados permanentemente." });

  // ── 3. EMBED ASALTO FINAL SECRETO (Desencriptación Progresiva) ──
  const progress = getDavitoUnlockProgress(guildId);
  const filled = "█".repeat(progress.maxedCount);
  const empty = "░".repeat(progress.totalStandard - progress.maxedCount);
  const pct = Math.round((progress.maxedCount / progress.totalStandard) * 100);
  const progressBar = `\`[${filled}${empty}] ${progress.maxedCount} / ${progress.totalStandard} Hitos Nivel 10 Registrados (${pct}%)\``;

  let secretTitle: string;
  let secretColor: number;
  let secretBody: string;

  if (progress.isUnlocked) {
    secretTitle = "👑 ¡OBJETIVO DESBLOQUEADO: LA FORTALEZA DE DAVITO!";
    secretColor = 0xf1c40f;
    secretBody =
      `⚡ **¡LAS COORDENADAS CUÁNTICAS HAN SIDO TOTALMENTE DESCIFRADAS!**\n\n` +
      `La comunidad ha alcanzado el Nivel 10 en todos los objetivos. El bastión supremo ha quedado al descubierto:\n\n` +
      `• **Objetivo:** Fortaleza Inexpugnable de Davito\n` +
      `• **Blindaje:** Nivel 10 👑 *(Defensa Planetaria Absoluta)*\n` +
      `• **Botín Legendario:** **50.000.000 🪙**\n` +
      `• **Banda Requerida:** Hasta **24 atracadores simultáneos**\n` +
      `• **Probabilidad de Éxito:** Estrictamente **≤ 0.77%** *(Gauntlet de 7 fases tácticas)*\n` +
      `• ⚠️ **Riesgo Máximo:** En caso de fracaso, **se pierde el 25% del patrimonio acumulado (cartera + banco sin límite)**.\n\n` +
      `Comando: \`/asalto iniciar davito\``;
  } else {
    // Censura progresiva según maxedCount
    secretColor = progress.maxedCount >= 4 ? 0x9b59b6 : 0x2b1b33;

    let codename = "`██████████████████`";
    let lootText = "`██████████ 🪙`";
    let crewText = "`██ especialistas coordinados`";
    let penaltyText = "`██% de ████████████`";
    let winRateText = "`≤ 0.██%`";
    const intelLines: string[] = [];

    if (progress.maxedCount >= 1) {
      codename = "`Expediente ██████: ████████ D██████`";
      intelLines.push(`📡 **Señal 1/8:** *Se detectan perturbaciones electromagnéticas y coordenadas en el espacio aéreo federal...*`);
    }
    if (progress.maxedCount >= 2) {
      intelLines.push(`📡 **Señal 2/8:** *Sensores sísmicos confirman una mega-estructura subterránea con blindaje cuántico...*`);
    }
    if (progress.maxedCount >= 3) {
      lootText = "`Estimación: > 50.000.000 🪙 (██████████)`";
      intelLines.push(`📡 **Señal 3/8:** *Cámaras de compensación sugieren reservas de capital que desafían toda la economía...*`);
    }
    if (progress.maxedCount >= 4) {
      crewText = "`Banda masiva: Hasta 24 operadores sincronizados`";
      intelLines.push(`📡 **Señal 4/8:** *Las esclusas dimensionales exigirán el doble de miembros que un asalto normal...*`);
    }
    if (progress.maxedCount >= 5) {
      penaltyText = "`Pérdida del 25% de todo tu patrimonio neto acumulado`";
      intelLines.push(`📡 **Señal 5/8:** *Contramedidas draconianas: fracasar supondrá la ruina financiera inmediata...*`);
    }
    if (progress.maxedCount >= 6) {
      winRateText = "`Estrictamente ≤ 0.77% (Gauntlet de 7 incidentes)`";
      intelLines.push(`📡 **Señal 6/8:** *Dificultad casi imposible. 7 anillos concéntricos de trampas de máxima seguridad...*`);
    }
    if (progress.maxedCount >= 7) {
      codename = "`👑 Fortaleza de D-A-V-I-T-██`";
      intelLines.push(`📡 **Señal 7/8:** *¡Frecuencia casi descifrada! Solo falta 1 objetivo en Nivel 10 para romper el sello final...*`);
    }

    if (intelLines.length === 0) {
      intelLines.push(`📡 *Frecuencia en silencio absoluto. Ningún objetivo ha alcanzado el Nivel 10 aún.*`);
    }

    secretTitle = `🔒 [EXPEDIENTE ULTRA-CLASIFICADO: ${progress.maxedCount > 0 ? `${pct}% DESCIFRADO` : "CÓDIGO OMEGA"}]`;
    secretBody =
      `⚠️ **ACCESO RESTRINGIDO POR INTELIGENCIA FEDERAL**\n\n` +
      `Existe un 9º objetivo sellado bajo encriptación militar cuántica. Para descifrarlo, la comunidad debe llevar los 8 asaltos estándar a Nivel 10. **Cada Nivel 10 alcanzado queda registrado de forma permanente** (no se pierde si el nivel baja por asaltos fallidos posteriores).\n\n` +
      `📊 **Progreso de Desencriptación:**\n${progressBar}\n\n` +
      `• **Identificador:** ${codename}\n` +
      `• **Blindaje:** \`Nivel ?? / 10 [ACCESO DENEGADO]\`\n` +
      `• **Botín:** ${lootText}\n` +
      `• **Banda Requerida:** ${crewText}\n` +
      `• **Penalización por Fracaso:** ${penaltyText}\n` +
      `• **Probabilidad de Éxito:** ${winRateText}\n\n` +
      `**Inteligencia Interceptada:**\n${intelLines.join("\n")}`;
  }

  const embed3 = new EmbedBuilder()
    .setColor(secretColor)
    .setTitle(secretTitle)
    .setDescription(secretBody);

  // ── 4. EMBED ROLES, BANDAS Y POLICÍA ──
  const embed4 = new EmbedBuilder()
    .setColor(0x1f3c88)
    .setTitle("🎭 ROLES, SINDICATOS CRIMINALES & POLICÍA")
    .addFields(
      {
        name: "🎭 Los 7 Roles Criminales & Sinergias",
        value:
          `• 🧠 **Hacker**, 🔫 **Tirador**, 🕵️ **Infiltrador** *(+éxito)*\n` +
          `• 🧨 **Demoliciones** *(+botín)* · 🏎️ **Conductor** *(rescate sin cárcel)*\n` +
          `• 🏥 **Médico** *(-cárcel)* · ⚖️ **Negociador** *(-multas)*\n` +
          `✨ **Sinergias:** Dúos, tríos y Sindicato (+6% éxito, +20% botín).`,
      },
      {
        name: "🕹️ Minijuegos Canvas, QTEs & Reliquias",
        value:
          `• **Incidentes:** Desafíos interactivos en Canvas Cyberpunk con exclusividad de operador.\n` +
          `• **40 Mutadores Diarios:** Condiciones climáticas y de seguridad rotativas (\`/asalto info\`).\n` +
          `• **24 Reliquias:** Expónlas (\`/asalto vitrina\`) o empéñalas (\`/asalto empeñar\`).`,
      },
      {
        name: "🏴‍☠️ Bandas & Territorios (/banda)",
        value:
          `• **Jerarquía:** 👑 Capo, 🎖️ Lugarteniente, 💀 Sicario, 🔫 Soldado, 🔰 Recluta.\n` +
          `• **Guarida:** 7 Mejoras (Taller, Clínica, Garito, Blanqueo, etc.).\n` +
          `• **4 Distritos:** Conquista Financiero, Lujo, Industrial y Puerto (+botín y tributos).\n` +
          `• **Hermandad:** Bonos de éxito y botín si asaltan 2+ miembros de la banda.`,
      },
      {
        name: "👮‍♂️ Policía & SWAT (/policia)",
        value:
          `• Alístate para patrullar. Incompatible con bandas criminales (3 días de sanción por deserción).\n` +
          `• **SWAT (Nv. 6+):** Reduce huida criminal (-6%/patrulla) y cobra el 50% de las multas judiciales.`,
      }
    )
    .setFooter({ text: "Nexo Inframundo 2.0 · Domina distritos y asalta la metrópolis" });

  return [embed1, embed2, embed3, embed4];
}

/**
 * Sincroniza o actualiza el mensaje fijado en el canal #asaltos.
 */
export async function syncHeistPinnedGuide(client: Client, guildId: string): Promise<void> {
  try {
    const channel = await client.channels.fetch(HEIST_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased() || !("messages" in channel)) return;

    const embeds = buildHeistGuideEmbeds(guildId);
    const pins = await (channel as any).messages.fetchPins().catch(() => null);
    let pinsList: any[] = [];
    if (pins?.items && Array.isArray(pins.items)) {
      pinsList = pins.items.map((i: any) => i.message);
    } else if (pins && typeof (pins as any).values === "function") {
      pinsList = Array.from((pins as any).values());
    } else if (Array.isArray(pins)) {
      pinsList = pins;
    }

    // Buscar si ya existe un mensaje fijado por el bot
    const botPin = pinsList.find((m: any) => m.author?.id === client.user?.id);

    if (botPin) {
      await botPin.edit({ embeds }).catch((err: unknown) => {
        logger.error("Error editando mensaje fijado de asaltos:", err);
      });
      logger.info(`[Heists] Guía fijada actualizada en #${(channel as any).name ?? HEIST_CHANNEL_ID}`);
    } else {
      // Si no existe, enviarlo y fijarlo
      const sent = await (channel as any).send({ embeds });
      await sent.pin().catch(() => {});
      logger.info(`[Heists] Nueva guía fijada publicada en #${(channel as any).name ?? HEIST_CHANNEL_ID}`);

      // Borrar la notificación automática de fijado de Discord
      setTimeout(async () => {
        try {
          const recent = await channel.messages.fetch({ limit: 5 });
          const sysMsg = recent.find((m) => m.type === 6);
          if (sysMsg) await sysMsg.delete().catch(() => {});
        } catch {
          /* ignore */
        }
      }, 1000);
    }
  } catch (err) {
    logger.error("Error en syncHeistPinnedGuide:", err);
  }
}
