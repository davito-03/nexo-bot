import {
  ActionRowBuilder,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { COLORS, SERVER_NAME, SERVER_TAGLINE } from "../../constants.js";
import type { Command } from "../../types/index.js";
import type { NexoClient } from "../../client.js";
import { DAVITO_ROLE_ID } from "../../modules/economy/heistEngine.js";

export const HELP_CATEGORIES = [
  { id: "overview", label: "Visión General", emoji: "🏠", desc: "Resumen y novedades de todos los sistemas de Nexo" },
  { id: "asaltos", label: "Asaltos & Inframundo", emoji: "🚨", desc: "Golpes tácticos cooperativos, 9 objetivos, roles, mercado negro y policía" },
  { id: "economia", label: "Economía & Finanzas", emoji: "🪙", desc: "Banca privada, propiedades, oficios, cartas gacha y comercio" },
  { id: "trading", label: "Trading, Criptos & Minería", emoji: "📈", desc: "Bolsa de valores, criptos, dividendos 12:00 y minería nivel 30" },
  { id: "pesca", label: "Pesca Deportiva & Marina", emoji: "🎣", desc: "Expediciones fluviales, cañas, cebos, capturas y venta en lote" },
  { id: "caza", label: "Caza & Expediciones", emoji: "🏹", desc: "Caza en el bosque, rifles, trampas reforzadas y trofeos" },
  { id: "casino", label: "Casino & Apuestas", emoji: "🎰", desc: "Jackpot Global automático, animaciones de slots, blackjack y salas" },
  { id: "rpg", label: "RPG, Mazmorras & Clanes", emoji: "⚔️", desc: "Clases, combates tácticos, mazmorras y hermandades" },
  { id: "moderacion", label: "Moderación & Sanciones", emoji: "🛡️", desc: "Warns, bans, timeouts, moderación masiva y apelaciones" },
  { id: "tickets", label: "Tickets & Asistente IA", emoji: "🎫", desc: "Paneles de atención, IA Neko y transcripciones HTML" },
  { id: "comunidad", label: "Comunidad & Minijuegos", emoji: "🎉", desc: "Minijuegos flash con premios, contador, DISBOARD y misiones" },
  { id: "diversion", label: "Diversión, Pokémon & Voz", emoji: "🔴", desc: "Pokémon (Gen 1-3, 386 criaturas), 24 Gimnasios, Duelos, IA FLUX y voz" },
  { id: "admin", label: "Administración & Logs", emoji: "⚙️", desc: "Configuración global, registros de auditoría y copias de seguridad" },
];

const CATEGORY_COLORS: Record<string, number> = {
  overview: 0x5865f2,
  asaltos: 0xe74c3c,
  economia: 0x00d166,
  trading: 0x2ecc71,
  pesca: 0x0984e3,
  caza: 0xe67e22,
  casino: 0xf1c40f,
  rpg: 0x9b59b6,
  moderacion: 0xed4245,
  tickets: 0x00cec9,
  comunidad: 0xfd79a8,
  diversion: 0x6c5ce7,
  admin: 0x34495e,
};

export function renderHelpView(
  client: NexoClient,
  selectedCat = "overview",
  guildIcon: string | null = null,
): { embed: EmbedBuilder; row: ActionRowBuilder<StringSelectMenuBuilder> } {
  const catDef = HELP_CATEGORIES.find((c) => c.id === selectedCat) ?? HELP_CATEGORIES[0]!;
  const color = CATEGORY_COLORS[selectedCat] ?? COLORS.primary;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: `${SERVER_NAME} · Centro de Ayuda`,
      iconURL: guildIcon ?? client.user?.displayAvatarURL() ?? undefined,
    })
    .setFooter({
      text: `Sección: ${catDef.label} · Usa el menú para explorar otras categorías`,
      iconURL: client.user?.displayAvatarURL() ?? undefined,
    })
    .setTimestamp();

  if (selectedCat === "overview") {
    embed
      .setTitle(`📚 Guía y Centro de Mandos · ${SERVER_NAME}`)
      .setDescription(
        `*${SERVER_TAGLINE}*\n\n` +
          `¡Bienvenido a la central interactiva de mandos de **${SERVER_NAME}**!\n` +
          `Usa \`/help [seccion]\` o navega por los módulos especializados utilizando el selector al pie de este mensaje.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "🚨  Asaltos & Operaciones Tácticas (/asalto)",
          value: "Golpes cooperativos con lobby de hasta 16 criminales, 5 roles con progresión (Nv. 1-10), mercado negro de armamento, eventos QTE en tiempo real, 6 objetivos progresivos y el secreto definitivo: la Fortaleza de Davito.",
          inline: false,
        },
        {
          name: "🪙  Economía, Logros & Finanzas",
          value: "Banca privada, depósitos a plazo fijo, propiedades con rentas pasivas, profesiones laborales, cartas coleccionables gacha, vitrina de logros, títulos y lotería.",
          inline: false,
        },
        {
          name: "📈  Trading, Criptomonedas & Minería Pasiva",
          value: "Bolsa corporativa, dividendos automáticos a las 12:00, criptos y rigs de minería cuánticos hasta Nivel 30 con overclock.",
          inline: false,
        },
        {
          name: "🎣  Pesca Deportiva & Marina",
          value: "Expediciones en ríos y océano, cañas de profundidad, cebos dorados, redes de arrastre y venta en lote.",
          inline: false,
        },
        {
          name: "🏹  Caza & Expediciones Terrestres",
          value: "Cacería en el bosque salvaje, rifles de precisión, trajes de camuflaje, trampas de acero y trofeos míticos.",
          inline: false,
        },
        {
          name: "🎰  Casino & Apuestas",
          value: "Jackpot Global Progresivo, tragaperras gatunas, blackjack 21 con split, ruleta, ruleta rusa y salas multijugador.",
          inline: false,
        },
        {
          name: "⚔️  RPG: Mazmorras & Clanes",
          value: "5 clases de héroe con pasivas, combates por turnos (~30s), mazmorras subterráneas y hermandades.",
          inline: false,
        },
        {
          name: "🛡️  Moderación, Sanciones & Apelaciones",
          value: "Sanciones directas y masivas por ID, edición/borrado de antecedentes, apelaciones privadas y automod.",
          inline: false,
        },
        {
          name: "🎫  Tickets & Asistente IA Neko",
          value: "Atención al usuario por paneles, IA de soporte automático, logs de edición/borrado y transcripts HTML.",
          inline: false,
        },
        {
          name: "🎉  Comunidad, Minijuegos & Eventos",
          value: "Juego del contador con salvavidas comunitarios, racha DISBOARD, minijuegos de chat, encuestas hasta 15 opciones, matrimonios, misiones y sorteos.",
          inline: false,
        },
        {
          name: "🎭  Diversión, Pokémon & Voz",
          value: "Sistema Pokémon (Gen 1-3, 386 criaturas), 24 Gimnasios oficiales, Duelos PvP con apuestas en NexoCoins, Zona Safari, Pokédex, Guardería, recompensas de voz, imágenes IA (FLUX) y confesiones.",
          inline: false,
        },
        {
          name: "⚙️  Administración & Auditoría",
          value: "Configuración general, paneles de auto-roles interactivos para el staff, canales de auditoría en tiempo real y copias de seguridad.",
          inline: false,
        },
      );
  } else if (selectedCat === "asaltos") {
    embed
      .setTitle(`🚨 Asaltos Tácticos, Roles Criminales & Fortaleza de Davito`)
      .setDescription(
        `Coordina golpes a gran escala contra objetivos de alta seguridad, especialízate en roles con progresión, equípate en el mercado negro y desactiva alarmas en tiempo real con decisiones QTE.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "🎮  Comandos Principales (/asalto y /crimen)",
          value:
            `▸ \`/asalto iniciar [objetivo]\` · Inicia un lobby táctico (hasta 12 asaltantes, o 24 en Davito) con 65s para reclutar cómplices y elegir roles.\n` +
            `▸ \`/asalto info [objetivo]\` · Consulta el nivel de seguridad (1 a 10), modificadores, botín estimado y el temporizador de cooldown en tiempo real.\n` +
            `▸ \`/asalto rol elegir|ver|lista\` · Especialízate en las 7 ramas del crimen organizado (Nv. 1 a 10 con títulos honoríficos).\n` +
            `▸ \`/asalto mercadonegro ver|comprar\` · Armamento y equipamiento colectivo para toda la banda.\n` +
            `▸ \`/asalto perfil [usuario]\` · Carnet criminal, historial de golpes, rol activo, rango y vitrina.\n` +
            `▸ \`/asalto top [categoria]\` · Ranking de las mentes maestras más buscadas y ricas del servidor.\n` +
            `▸ \`/asalto reiniciar\` / \`/asalto admin-nivel\` · Comandos de administración para resetear enfriamientos y ajustar seguridad.\n` +
            `▸ \`/crimen hacer\` · Delitos callejeros menores en solitario con riesgo de cárcel y multas.`,
          inline: false,
        },
        {
          name: "🎭  Especialidades & Roles de Asalto (Nv. 1 a 10)",
          value:
            `▸ 🧠 **Hacker Cibernético:** Anula cortafuegos, satura cámaras CCTV e inyecta bucles (+3% éxito base +1%/lvl). Indispensable en hackeos.\n` +
            `▸ 🔫 **Tirador / Enforcer:** Mantiene a raya a la guardia y ofrece fuego de cobertura táctica (+4% éxito base +1%/lvl).\n` +
            `▸ 🕵️ **Infiltrador Silencioso:** Sigilo por conductos, ganzúas magnéticas y neutralización de sensores (+3% éxito base +1%/lvl + botín).\n` +
            `▸ 💣 **Experto en Demoliciones:** Maestro en explosivos para reventar compuertas acorazadas (+15% botín base +2.5%/lvl).\n` +
            `▸ 🚗 **Piloto de Fuga:** Si el golpe fracasa, aporta un 35% base (+4%/lvl) de huida para salvar a la banda del calabozo y multas.\n` +
            `▸ 🩺 **Médico de Combate:** Soporte vital táctico y calmantes bajo fuego (+4% éxito base +1%/lvl). Reduce un 40% el calabozo de la banda.\n` +
            `▸ 🎙️ **Negociador / Mente Maestra:** Guerra psicológica y engaño por radio (+4% éxito base +1%/lvl). Reduce un 30% (+3%/lvl) las multas de la banda.`,
          inline: false,
        },
        {
          name: "🌟  Sinergias Temáticas & Mercado Negro",
          value:
            `▸ **Sinergias Temáticas de Roles:** Combinaciones activas automáticas:\n` +
            `  • *Dúos Tácticos:* Infiltración Cibernética (+2.5% éxito, +8% botín), Fuerza de Choque (+2.5% éxito, +10% botín), Evacuación & Soporte (+2% éxito, -25% calabozo), Guerra Psicológica (+2.5% éxito, -15% multas), Extracción Fantasma (+2% éxito, +5% huida), Intimidación Táctica (+2.5% éxito), Golpe y Fuga (+1.5% éxito, +12% botín).\n` +
            `  • *Tríos & Sindicatos:* Tríada de Bóveda (+3.5% éxito, +15% botín), Escuadrón Operativo (+3.5% éxito, -20% calabozo), Mente Maestra & Sombras (+3.5% éxito, -20% multas), Sindicato Mayor (+3.5% éxito, +12% botín) y Sindicato Absoluto (+6% éxito, +20% botín). Máximo acumulable: **+9% de éxito** y **+35% de botín**.\n` +
            `▸ 📟 **Inhibidor EMP:** Pulso electromagnético que apaga sistemas electrónicos (+4% éxito colectivo).\n` +
            `▸ 💣 **C4 Militar:** Carga plástica que revienta cajas de seguridad (+15% botín total).\n` +
            `▸ 🔥 **Taladro Térmico:** Funde pernos acorazados de tungsteno y titanio (+25% botín total).\n` +
            `▸ 🚗 **Furgón Blindado:** Garantiza un 45% de huida ante fallo policial (hasta 40% adicional con Piloto).\n` +
            `▸ 💉 **Adrenalina:** Segunda oportunidad inmediata si el golpe falla por un margen estrecho (≤4%).\n` +
            `▸ 🎭 **Máscara Balística:** Oculta identidades y reduce drásticamente el tiempo de calabozo.`,
          inline: false,
        },
        {
          name: "🏛️  Objetivos, Blindajes & Alerta Roja (Cooldowns)",
          value:
            `▸ 🏛️ **Banco Central:** Bóveda subterránea del tesoro estatal (Botín base: 35k - 65k).\n` +
            `▸ 🎰 **Gran Casino Royal:** Salas VIP y cámaras acorazadas de fichas de platino (Botín base: 50k - 90k).\n` +
            `▸ 🏰 **Mansión del Magnate:** Complejo residencial fortificado y arte milenario (Botín base: 70k - 125k).\n` +
            `▸ 🏛️ **Museo Imperial:** Reliquias milenarias, sarcófagos arcanos y joyas dinásticas (Botín base: 60k - 110k).\n` +
            `▸ 🚂 **Tren Blindado:** Convoy transcontinental armado a 200 km/h (Botín base: 85k - 150k).\n` +
            `▸ 🏢 **Sede Nexo Corp:** Servidores cuánticos corporativos y patentes exclusivas (Botín base: 100k - 180k).\n` +
            `▸ ⚓ **Submarino Nuclear "Leviathan":** Coloso sumergido a 3.000m con secretos atómicos (Botín base: 130k - 220k).\n` +
            `▸ 🛰️ **Estación Orbital Quantum:** Instalación espacial con tecnología de antimateria (Botín base: 180k - 320k).\n` +
            `▸ **Escala de Seguridad (1-10):** Cada victoria sube +1 nivel de blindaje (dificultad rebalanceada con tope de éxito independiente por nivel: máx 82% en Nv. 1 hasta 55% máx en Nv. 10; ningún nivel alcanza el 100%) y botín hasta ×5.5; derrotas bajan -1 nivel.\n` +
            `▸ **Cooldown de Alerta Roja:** Cada golpe activa un enfriamiento táctico para ese objetivo (visible en \`/asalto info\`).`,
          inline: false,
        },
        {
          name: "⚡  Mecánicas en Vivo: Canvas, QTEs & Consecuencias",
          value:
            `▸ **HUD Telemétrico en Tiempo Real:** Gráfico Canvas dinámico generado en directo con avatares reales, roles y telemetría de hasta 24 asaltantes.\n` +
            `▸ **Incidentes Tácticos Variables (1 a 3 QTEs):** Cada asalto estándar genera entre 1 y 3 incidentes interactivos con decisiones por botones (80% 1 QTE, 15% 2 QTEs, 5% 3 QTEs). Todos los incidentes disponen de opciones especializadas para cada uno de los 7 roles.\n` +
            `▸ **Multas Judiciales:** En caso de captura en golpes estándar, multas proporcionales de hasta 500.000 🪙 (el Negociador reduce hasta un 60%).\n` +
            `▸ **Régimen Davito:** En la Fortaleza de Davito, el fracaso supone la **pérdida íntegra del 25% de todo el patrimonio** acumulado (cartera + banco sin límite).`,
          inline: false,
        },
        {
          name: "👑  El Golpe Secreto Definitivo: Fortaleza de Davito",
          value:
            `▸ **Condición de Desbloqueo:** Permanece totalmente oculto hasta que **los 8 objetivos estándar alcanzan el Nivel 10 simultáneamente**.\n` +
            `▸ **Reglas Extremas:** Permite bandas colosales de **hasta 24 asaltantes**, enfrenta un **gauntlet implacable de 7 Quick Time Events consecutivos**, y posee una dificultad matemáticamente calibrada para ser casi imposible (**estrictamente menor al 0.77% de éxito** incluso con el mejor equipo y roles al máximo).\n` +
            `▸ **Recompensa Legendaria:** Si la banda logra la hazaña, cada superviviente recibe **🪙 100.000.000 de Nexocoins** y el exclusivo rol honorífico <@&${DAVITO_ROLE_ID}>.`,
          inline: false,
        },
      );
  } else if (selectedCat === "economia") {
    embed
      .setTitle(`🪙 Sistema de Economía, Banca & Comercio`)
      .setDescription(
        `Gestiona tu patrimonio en Nexocoins (🪙), administra tus cuentas bancarias, adquiere suministros en el catálogo oficial y comercia libremente.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "💳  Gestión de Fondos & Banca Privada",
          value:
            `▸ \`/eco bal [usuario]\` · Consulta efectivo, banco y patrimonio neto.\n` +
            `▸ \`/eco depositar <cantidad|all>\` / \`/eco retirar <cantidad|all>\` · Guarda o retira fondos de la bóveda bancaria.\n` +
            `▸ \`/eco pagar <usuario> <cantidad>\` · Transfiere dinero a otro usuario (cartera + banco).\n` +
            `▸ \`/eco prestamo [cantidad]\` / \`/eco deuda [cantidad]\` · Préstamos y amortización de deuda.\n` +
            `▸ \`/eco plazo-fijo <ver|abrir|reclamar>\` · Depósitos bloqueados (3-30 días, +6% a +80% de interés).\n` +
            `▸ \`/eco perfil [usuario]\` · Ficha financiera completa. | \`/eco top [tipo]\` · Ranking de riqueza.`,
          inline: false,
        },
        {
          name: "🏆  Logros & Títulos (/logros y /titulos)",
          value:
            `▸ \`/logros [usuario]\` · Vitrina de logros, progreso y premios.\n` +
            `▸ \`/titulos ver|equipar|desequipar\` · Gestión de títulos cosméticos honoríficos.`,
          inline: false,
        },
        {
          name: "🏦  Asaltos & Crimen (/asalto y /crimen)",
          value:
            `▸ \`/asalto iniciar [objetivo]\` · Asaltos tácticos (Banco, Casino, Mansión, Nexo Corp, Tren blindado, Estación espacial...). Lobby de 65s.\n` +
            `▸ \`/asalto info [objetivo]\` · Panel de objetivos, niveles de blindaje, multiplicadores y temporizadores de alerta roja.\n` +
            `▸ \`/asalto perfil|roles|mercadonegro|top|reiniciar\` · Carnet criminal, roles tácticos, mercado negro, ranking y rescate de lobby.\n` +
            `▸ \`/crimen hacer\` · Delitos individuales rápidos con riesgo de multas y cárcel.\n` +
            `▸ 💡 *Consulta la sección dedicada \`🚨 Asaltos & Operaciones\` en el menú para ver la guía completa, roles, QTEs y el asalto secreto.*`,
          inline: false,
        },
        {
          name: "💼  Trabajos & Actividades Legales",
          value:
            `▸ \`/eco work\` · Jornada laboral (~30 min cd). | \`/eco extra\` · Horas extras (~10 min cd).\n` +
            `▸ \`/eco daily\` · Recompensa diaria con racha. | \`/eco weekly\` · Paga semanal.\n` +
            `▸ \`/eco mendigar\` · Solicita caridad con probabilidad de suerte.`,
          inline: false,
        },
        {
          name: "🏪  Tiendas & Mercado P2P",
          value:
            `▸ \`/tienda ver|comprar|vender\` · Catálogo oficial por categorías interactivas.\n` +
            `▸ \`/oferta vender|comprar <usuario> <item> <precio>\` · Contratos P2P directos.\n` +
            `▸ \`/subasta\` · Subastas públicas con pujas en tiempo real.\n` +
            `▸ \`/mercado ver\` · Tablón de compraventa entre usuarios.`,
          inline: false,
        },
        {
          name: "📦  Inventario & Colecciones",
          value:
            `▸ \`/eco inv [usuario]\` · Inspecciona tu mochila. | \`/eco usar <item>\` · Usa consumibles.\n` +
            `▸ \`/eco vender <item> [cant]\` · Vende ítems y capturas. | \`/galeria [usuario]\` · Vitrina de colecciones.`,
          inline: false,
        },
        {
          name: "🏠  Propiedades (/propiedad)",
          value:
            `▸ \`/propiedad catalogo|comprar|mejorar|cobrar|ver|vender\` · 7 inmuebles con rentas pasivas cada 8h, mejoras (nv. 5) y venta.`,
          inline: false,
        },
        {
          name: "💼  Profesiones (/trabajo)",
          value:
            `▸ \`/trabajo catalogo|elegir|turno|perfil|top\` · 9 oficios con bonus pasivos, turnos laborales y XP de profesión.`,
          inline: false,
        },
        {
          name: "🃏  Cartas Gacha (/cartas)",
          value:
            `▸ \`/cartas abrir|album|ver|duplicadas|reciclar|intercambiar\` · Sobres con garantías, +80 cartas en 8 temáticas, reciclaje y trade P2P.`,
          inline: false,
        },
        {
          name: "🎟️  Lotería Semanal (/loteria)",
          value:
            `▸ \`/loteria comprar [cant]\` · Boletos (200 🪙 c/u, máx 10). | \`/loteria ver\` · Bote y boletos.\n` +
            `  └ **Sorteo automático:** Cada domingo a las 20:00. ¡El 5% de las apuestas del casino alimenta el bote!`,
          inline: false,
        },
      );
  } else if (selectedCat === "trading") {
    embed
      .setTitle(`📈 Mercado de Trading, Criptomonedas & Minería Pasiva`)
      .setDescription(
        `Opera con activos financieros en tiempo real, invierte en la bolsa corporativa para cobrar dividendos diarios y construye granjas de minería de criptoactivos.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "💹  Bolsa de Valores & Criptoactivos (/trading)",
          value:
            `▸ \`/trading mercado\` · Cotización en vivo con gráficas, variaciones 24h y precios de mercado.\n` +
            `▸ \`/trading comprar <activo> <cantidad>\` · Invierte tus Nexocoins en acciones de empresas o criptomonedas.\n` +
            `▸ \`/trading vender <activo> <cantidad>\` · Liquida tus posiciones con beneficios directos a tu cartera.\n` +
            `▸ \`/trading cartera [usuario]\` · Consulta tu portfolio de inversión, valor patrimonial y PnL.\n` +
            `▸ **Eventos de mercado:** Noticias positivas o negativas pueden afectar temporalmente a criptos, metales, acciones o a todo el mercado; se muestran en \`/trading mercado\`.\n` +
            `• **Criptomonedas:** \`BTC\`, \`ETH\`, \`SOL\`, \`XRP\`, \`ADA\`, \`DOGE\`, \`DOT\` y \`LINK\`.\n` +
            `• **Metales:** Oro (\`ORO\`), Plata (\`PLATA\`), Platino (\`PLATINO\`) y Paladio (\`PALADIO\`).\n` +
            `• **Acciones:** \`AAPL\`, \`NVDA\`, \`TSLA\`, \`MSFT\`, \`AMZN\`, \`GOOGL\`, \`META\`, \`DIS\`, \`AMD\`, \`NFLX\`, \`ORCL\`, \`MCD\` y \`NEXO\`.`,
          inline: false,
        },
        {
          name: "💵  Dividendos Empresariales Diarios (12:00)",
          value:
            `▸ \`/trading dividendos\` · Consulta tus ingresos pasivos generados por poseer acciones en cartera.\n` +
            `  └ **Pago automático:** Cada día a las **12:00 del mediodía** se abonan dividendos directamente a la cartera de todos los accionistas.\n` +
            `  └ Las empresas pagan una rentabilidad directa proporcional a la cantidad de acciones que poseas en tu cartera.`,
          inline: false,
        },
        {
          name: "⚡  Estación de Minería Cripto (Ingresos Pasivos)",
          value:
            `▸ \`/mineria panel\` · Panel de control de tu rig: hashrate acumulado, buffer 24h y estado de overclock.\n` +
            `▸ \`/mineria reclamar\` · Recoge todas las criptomonedas o NexoCoins acumuladas de forma pasiva.\n` +
            `▸ \`/mineria mejorar\` · Sube tu rig progresivamente desde el nivel 0 hasta el nivel 30 (Génesis Absoluto), desbloqueando potencia masiva en cada mejora.\n` +
            `▸ \`/mineria moneda <activo>\` · Selecciona qué divisa deseas minar: \`nexocoins\`, \`BTC\`, \`ETH\`, \`SOL\` o \`XRP\`.\n` +
            `▸ \`/mineria overclock\` · Fuerza tus máquinas para ganar un **+25% de hashrate** durante 6 horas.`,
          inline: false,
        },
        {
          name: "💡  Estrategia de Inversión",
          value:
            `*Diversifica tu cartera adquiriendo acciones de empresas sólidas (como NEXO, AAPL o NVDA) para asegurar un flujo constante de dividendos cada mediodía a las 12:00 mientras tu clúster de minería produce criptos sin descanso.*`,
          inline: false,
        },
      );
  } else if (selectedCat === "pesca") {
    embed
      .setTitle(`🎣 Sistema de Pesca Deportiva & Océano`)
      .setDescription(
        `Lanza tu caña a las aguas de Nexo, aprovecha las corrientes marinas, equipa cebos especiales y consigue capturas legendarias y tesoros sumergidos.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "🌊  Expediciones de Pesca (/eco pescar)",
          value:
            `▸ \`/eco pescar [caña] [cebo]\` · Realiza una jornada de pesca en ríos o mar abierto (~5 min cooldown).\n` +
            `  └ **Detección inteligente:** Si no especificas equipamiento, el bot auto-equipa tu mejor caña y cebo disponibles en tu mochila.\n` +
            `  └ Otorga recompensas en monedas fijas más las capturas obtenidas directamente a tu inventario.`,
          inline: false,
        },
        {
          name: "🎣  Cañas de Pescar & Bonificaciones",
          value:
            `• **Caña Básica de Bambú:** Equipo inicial de pesca sin bonificador de suerte.\n` +
            `• **Caña de Carbono 🎣:** Añade **+16 de suerte marina**, aumentando la probabilidad de peces exóticos.\n` +
            `• **Caña de Profundidades 🎣:** Diseñada para abismos oceánicos. Añade **+32 de suerte marina**.`,
          inline: false,
        },
        {
          name: "🪱  Cebos & Redes Marinas",
          value:
            `• **Cebo Estándar 🪱:** Aumenta en **+18** la probabilidad de capturar especímenes raros.\n` +
            `• **Cebo Dorado ✨:** Máxima atracción marina. Otorga un impresionante **+40 de suerte**.\n` +
            `• **Red Marina 🕸️:** Pesca de arrastre que captura entre **2 y 4 piezas** en una sola tirada.`,
          inline: false,
        },
        {
          name: "🐟  Especies, Tesoros & Venta en Lote",
          value:
            `• **Capturas Comunes/Medias:** Trucha, Salmón, Pez Globo y Botas viejas.\n` +
            `• **Capturas Raras & Épicas:** Pulpo Gigante, Tiburón Martillo y Perlas Preciosas 🦪.\n` +
            `• **Legendarias:** Calamar Colosal de las profundidades y Cofres del Tesoro Hundidos 🪙.\n` +
            `▸ \`/eco vender item:todo_pesca\` · Vende todo tu pescado acumulado de un solo golpe con recibo desglosado.\n` +
            `▸ \`/tienda comprar\` · Repón cebos, redes y cañas en la sección de herramientas de la tienda.`,
          inline: false,
        },
        {
          name: "💡  Secreto del Pescador",
          value:
            `*Combinar una Caña de Profundidades con un Cebo Dorado garantiza casi con seguridad la aparición de tesoros sumergidos, perlas y especímenes de alto valor en el mercado.*`,
          inline: false,
        },
      );
  } else if (selectedCat === "caza") {
    embed
      .setTitle(`🏹 Sistema de Caza Deportiva & Expediciones`)
      .setDescription(
        `Adéntrate en los frondosos bosques de Nexo con tu rifle o despliega trampas en la espesura para capturar presas salvajes y criaturas míticas.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "🌲  Expediciones de Caza (/eco cazar)",
          value:
            `▸ \`/eco cazar [arma] [trampa]\` · Parte de cacería por los territorios salvajes (~5 min cooldown).\n` +
            `  └ **Detección inteligente:** Auto-equipa tu arma más potente, camuflaje y mejor trampa automáticamente.\n` +
            `  └ Otorga monedas de expedición más los animales o trofeos cobrados en tu mochila.`,
          inline: false,
        },
        {
          name: "🎯  Armamento & Equipamiento",
          value:
            `• **Escopeta / Caza Básica:** Arma de tiro corto inicial sin bonificador especial.\n` +
            `• **Rifle de Caza 🎯:** Diseñado para animales medianos y grandes. Añade **+16 de puntería**.\n` +
            `• **Rifle AWP de Precisión 🎯:** Tecnología de largo alcance con mira telescópica (**+32 de puntería**).\n` +
            `• **Traje de Camuflaje 🌿:** Se activa pasivamente desde tu inventario otorgando **+14 de sigilo** extra.`,
          inline: false,
        },
        {
          name: "🪤  Trampas & Señuelos Acústicos",
          value:
            `• **Señuelo Acústico 🪈:** Imita cantos y reclamos de la naturaleza sumando **+25 de atracción**.\n` +
            `• **Trampa para Osos Reforzada 🪤:** Trampa de acero templado con resortes dobles (**+45 de eficacia**).`,
          inline: false,
        },
        {
          name: "🦌  Fauna del Bosque & Venta en Lote",
          value:
            `• **Presas Comunes/Medias:** Conejo silvestre, Pato salvaje, Zorro rojo y Ciervo noble.\n` +
            `• **Grandes Depredadores:** Jabalí colosal, Oso pardo feroz y Lobo alfa del bosque.\n` +
            `• **Criatura Mítica:** El legendario Fénix Dorado de fuego 🔥.\n` +
            `▸ \`/eco vender item:todo_caza\` · Vende todas tus presas cazadas de golpe con valoración instantánea.\n` +
            `▸ \`/eco vender item:todo_capturas\` · Vende todas tus capturas (pesca y caza juntas) en una sola transacción.`,
          inline: false,
        },
        {
          name: "💡  Consejo del Cazador",
          value:
            `*Tener el Traje de Camuflaje en tu inventario suma bonificadores de forma pasiva junto a tu rifle y trampas, elevando drásticamente tus opciones de toparte con las presas más valiosas.*`,
          inline: false,
        },
      );
  } else if (selectedCat === "casino") {
    embed
      .setTitle(`🎰 Casino, Apuestas & Juegos de Azar`)
      .setDescription(
        `Disfruta de más de 10 juegos de azar interactivos, mesas públicas multijugador y botes acumulados con botones dinámicos.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "🎰  Jackpot Global Progresivo & Bote Mayor",
          value:
            `▸ \`/casino jackpot-global\` · Consulta el pozo del Jackpot Global acumulado y su último ganador.\n` +
            `  └ **1% acumulativo:** Cada apuesta jugada en cualquier modalidad del casino aporta un 1% al gran pozo.\n` +
            `  └ **¡Gana el Jackpot!** Obtén una línea de tres diamantes (**💎 💎 💎**) o tres sietes (**7️⃣ 7️⃣ 7️⃣**) en \`/casino slots\` para llevarte el bote acumulado (**¡ahora se entrega de forma 100% automática a tu monedero!**).`,
          inline: false,
        },
        {
          name: "🃏  Juegos Individuales de Cartas & Suerte",
          value:
            `▸ \`/casino blackjack <apuesta>\` · 21 contra la casa con split si las dos cartas iniciales coinciden.\n` +
            `▸ \`/casino slots <apuesta>\` · Máquina tragaperras animada con rodillos giratorios en tiempo real y opción de Jackpot Global.\n` +
            `▸ \`/casino rusa-casa <apuesta>\` · Ruleta rusa contra la casa: dispara para subir el multiplicador o cobra antes del tiro fatal.\n` +
            `▸ \`/casino ruleta <apuesta> <color>\` · Ruleta de casino europea animada (rojo x2, negro x2, verde x14).\n` +
            `▸ \`/casino mayor <apuesta>\` · Apuesta si la siguiente carta de la baraja será superior o inferior.\n` +
            `▸ \`/casino coinflip <apuesta> <lado>\` · Cara o cruz con lanzamiento de moneda en alta tensión.\n` +
            `▸ \`/casino dados <apuesta>\` · Tira los dados y gana si sale una puntuación alta (4, 5 o 6).\n` +
            `▸ \`/casino rps <apuesta> <jugada>\` · Piedra, papel o tijera apostando dinero real con el bot.`,
          inline: false,
        },
        {
          name: "👥  Salas Multijugador, Mesas & Botes",
          value:
            `▸ \`/casino globo [segundos]\` · Infla el globo en vivo aumentando el multiplicador. ¡Retira tus ganancias antes de que estalle!\n` +
            `▸ \`/casino mesa [segundos]\` · Abre una mesa de apuestas comunitaria en el canal para jugar con amigos.\n` +
            `▸ \`/casino duelo <rival> <apuesta>\` · Desafía a otro miembro del servidor a un cara o cruz 1v1 a todo o nada.\n` +
            `▸ \`/casino rusa-duelo <rival> <apuesta>\` · Reta a otro jugador: ambos ponen la misma cantidad y se alternan hasta que alguien encuentra la bala.\n` +
            `▸ \`/casino carrera [segundos]\` · Carrera de caballos en tiempo real con posiciones en vivo y apuestas.\n` +
            `▸ \`/casino bote [segundos]\` · Compra participaciones para el bote comunitario acumulado del servidor.`,
          inline: false,
        },
        {
          name: "💡  Regla de Oro del Apostador",
          value:
            `*En el juego del globo y en las mesas comunitarias, la avaricia es el mayor peligro: retira tus ganancias cuando el multiplicador sea favorable antes del 'boom'.*`,
          inline: false,
        },
      );
  } else if (selectedCat === "rpg") {
    embed
      .setTitle(`⚔️ RPG: Aventura, Mazmorras & Clanes`)
      .setDescription(
        `Embárcate en un universo de rol por turnos, perfecciona tus atributos de héroe, desciende a oscuras mazmorras y lidera tu hermandad.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "🛡️  Héroe, Vocaciones & Atributos",
          value:
            `▸ \`/rpg perfil [usuario]\` · Hoja de aventurero: clase, nivel, XP, vida (HP), ataque, defensa y victorias.\n` +
            `▸ \`/rpg clase <tipo>\` · Elige tu vocación entre **Guerrero**, **Mago**, **Pícaro**, **Paladín** o **Cazador**.\n` +
            `▸ \`/rpg curar\` · Restaura tus puntos de salud al 100% utilizando pociones o la enfermería del gremio.\n` +
            `▸ \`/rpg top\` · Salón de la fama con los héroes de mayor nivel y poder del reino.`,
          inline: false,
        },
        {
          name: "🐉  Combates Tácticos & Mazmorras",
          value:
            `▸ \`/rpg batalla\` · Combate por turnos contra criaturas salvajes (~30s cooldown). Consigue XP y monedas.\n` +
            `▸ \`/rpg dungeon\` · Desciende a las mazmorras subterráneas (~3 min cooldown) para derrotar jefes y dar gloria al clan.`,
          inline: false,
        },
        {
          name: "🏰  Hermandades & Clanes (/rpg clan)",
          value:
            `▸ \`/rpg clan crear <nombre> <tag> [desc]\` · Funda tu propio clan oficial con escudo y descripción.\n` +
            `▸ \`/rpg clan info [nombre]\` · Consulta estadísticas, líder, nivel, victorias y lista de miembros.\n` +
            `▸ \`/rpg clan unirse <nombre>\` · Solicita entrar a una hermandad existente; el líder debe aprobar tu solicitud.\n` +
            `▸ \`/rpg clan salir\` · Abandona tu clan actual de forma voluntaria.\n` +
            `▸ \`/rpg clan top\` · Clasificación de los clanes más poderosos y laureados.`,
          inline: false,
        },
        {
          name: "👑  Gestión del Clan (Líderes & Oficiales)",
          value:
            `▸ \`/rpg clan solicitudes\` · El líder consulta las solicitudes pendientes de ingreso.\n` +
            `▸ \`/rpg clan aprobar <usuario>\` · El líder aprueba una solicitud y añade al usuario como miembro.\n` +
            `▸ \`/rpg clan rechazar <usuario>\` · El líder rechaza una solicitud pendiente.\n` +
            `▸ \`/rpg clan rango <usuario> <nivel>\` · El líder asigna Oficial o Miembro.\n` +
            `▸ \`/rpg clan expulsar <usuario>\` · El líder u oficial expulsa miembros (un oficial no puede expulsar a otro oficial).\n` +
            `▸ \`/rpg clan transferir <usuario>\` · Traspasa el rango de líder a otro compañero del clan.\n` +
            `▸ \`/rpg clan disolver <confirmar>\` · Disuelve permanentemente el clan (exclusivo para el líder).`,
          inline: false,
        },
        {
          name: "💡  Táctica de Combate",
          value:
            `*Cada clase cuenta con mecánicas únicas: el Pícaro destaca por críticos letales, el Paladín por su robusta defensa y el Mago por su poder destructor.*`,
          inline: false,
        },
      );
  } else if (selectedCat === "moderacion") {
    embed
      .setTitle(`🛡️ Moderación, Sanciones & Apelaciones`)
      .setDescription(
        `Herramientas avanzadas de gestión disciplinaria, historial auditable con ID de caso y moderador, edición y apelaciones.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "🔨  Acciones Disciplinarias Directas",
          value:
            `▸ \`/warn <usuario> [motivo]\` · Emite una advertencia formal con registro permanente.\n` +
            `▸ \`/timeout <usuario> <duración> [motivo]\` · Aísla al usuario temporalmente *(ej: 10m, 1h, 1d)*.\n` +
            `▸ \`/kick <usuario> [motivo]\` · Expulsa al miembro infractor del servidor.\n` +
            `▸ \`/ban <usuario> [días] [motivo]\` · Banea permanentemente al infractor.\n` +
            `▸ \`/mod <acción> <usuario> [motivo]\` · Panel interactivo unificado para moderar en segundos.`,
          inline: false,
        },
        {
          name: "⚡  Moderación Masiva (/masivo)",
          value:
            `▸ \`/masivo warn <usuarios> <razón>\` · Advierte a múltiples miembros a la vez.\n` +
            `▸ \`/masivo kick <usuarios> <razón>\` · Expulsa a un grupo de infractores simultáneamente.\n` +
            `▸ \`/masivo timeout <usuarios> <duración> <razón>\` · Mutea en masa por tiempo definido.\n` +
            `▸ \`/masivo ban <usuarios> <razón> [días]\` · Baneo masivo procesando menciones o IDs.\n` +
            `▸ \`/masivo tempban <usuarios> <duración> <razón>\` · Baneo temporal masivo.`,
          inline: false,
        },
        {
          name: "📜  Historial, Edición de Casos & Apelaciones",
          value:
            `▸ \`/sanciones ver <usuario>\` · Historial disciplinario completo con ID de caso, tipo, fecha y staff autor.\n` +
            `▸ \`/sanciones editar <id> <nuevo_motivo>\` · Modifica o rectifica el motivo de una sanción existente.\n` +
            `▸ \`/sanciones borrar <id>\` · Elimina definitivamente un expediente del registro.\n` +
            `▸ \`/apelar\` · Formulario privado de apelación de sanciones para usuarios que deseen solicitar revisión.`,
          inline: false,
        },
        {
          name: "🧹  Canales, Purgas & Automod",
          value:
            `▸ \`/clear <cantidad> [usuario]\` · Purga masiva de mensajes con filtros avanzados.\n` +
            `▸ \`/lock\` · Bloquea el canal para impedir que los usuarios escriban.\n` +
            `▸ \`/slowmode <segundos>\` · Establece el modo lento en el canal actual.\n` +
            `▸ \`/automod\` · Escudo contra enlaces sospechosos, flood masivo y lenguaje prohibido.`,
          inline: false,
        },
      );
  } else if (selectedCat === "tickets") {
    embed
      .setTitle(`🎫 Sistema de Soporte & Asistente Neko IA`)
      .setDescription(
        `Canales privados de atención al usuario, asignación exclusiva para el staff, transcripción en HTML y asistencia automática por IA.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "📩  Gestión del Canal de Atención",
          value:
            `▸ \`/ticket panel\` · Despliega el panel oficial de tickets con botones interactivos por categorías.\n` +
            `▸ \`/ticket cerrar [motivo]\` · Finaliza la consulta, genera transcript y archiva el ticket.\n` +
            `▸ \`/ticket reclamar\` · Asigna el ticket al moderador que lo atenderá en exclusiva.\n` +
            `▸ \`/ticket añadir <usuario>\` · Otorga acceso a un miembro adicional al canal del ticket.\n` +
            `▸ \`/ticket quitar <usuario>\` · Retira los permisos de un participante del canal.\n` +
            `▸ \`/ticket transcript\` · Descarga una copia HTML de toda la conversación para archivo.`,
          inline: false,
        },
        {
          name: "🤖  Inteligencia Neko IA & Auditoría",
          value:
            `• **Asistencia inicial:** Analiza la solicitud del usuario al abrir el ticket y ofrece pautas de ayuda inmediata.\n` +
            `• **Registro de seguridad:** Cualquier edición o eliminación de mensajes dentro del ticket queda registrada en el canal de logs.`,
          inline: false,
        },
      );
  } else if (selectedCat === "comunidad") {
    embed
      .setTitle(`🎉 Comunidad, Niveles, Misiones & Eventos`)
      .setDescription(
        `Potencia la interacción comunitaria con experiencia en chat/voz, retos periódicos, sorteos automáticos y fechas especiales.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "📈  Niveles & Progresión Comunitaria",
          value:
            `▸ \`/nivel [usuario]\` · Tarjeta con tu rango, experiencia en texto, nivel de voz y barra de progreso.\n` +
            `▸ \`/mision ver\` · Misiones semanales (se cobran automáticamente al cumplirse y te avisa por MD).`,
          inline: false,
        },
        {
          name: "⚡  Minijuegos Exprés de Chat (Recompensas en NexoCoins)",
          value:
            `• El bot lanza periódicamente en los canales activos de chat desafíos relámpago con premios de **800 a 2.000 🪙** para el primer miembro que responda en 60s:\n` +
            `  └ **Cálculo Exprés 🔢:** Operaciones matemáticas rápidas para poner a prueba tu agilidad.\n` +
            `  └ **Palabras Desordenadas 🔠:** Anagramas de palabras clave con pistas descriptivas.\n` +
            `  └ **Trivia Relámpago 🧠:** Preguntas aleatorias de conocimiento y cultura general.`,
          inline: false,
        },
        {
          name: "🔢  Juego del Contador Comunitario (/contador)",
          value:
            `▸ \`/contador estado\` · Consulta el número actual, el récord histórico del servidor y los salvavidas disponibles.\n` +
            `▸ \`/contador top\` · Clasificación de los miembros con mayor cantidad de números acertados.\n` +
            `▸ \`/contador salvavidas\` · Adquiere 1 Salvavidas 🛟 para el servidor (5.000 🪙) que rescata el conteo si alguien falla.\n` +
            `▸ \`/contador set-canal <canal>\` · Staff: establece el canal oficial exclusivo para el juego de contar.\n` +
            `▸ \`/contador fijar-panel\` · Staff: publica y fija la guía con reglas y récord en el canal del contador.`,
          inline: false,
        },
        {
          name: "🚀  Bumps & Racha DISBOARD (/bump-racha)",
          value:
            `▸ \`/bump-racha\` · Consulta la racha actual de bumps en DISBOARD, temporizador de espera y top bump leaders.\n` +
            `  └ **Recompensas en NexoCoins:** Gana **2.000 🪙** por bump en el canal de bumps, más **+2.000 🪙 acumulativos** por cada bump si encadenas racha.`,
          inline: false,
        },
        {
          name: "🎁  Sorteos Comunitarios (/sorteo)",
          value:
            `▸ \`/sorteo list\` · Lista de todos los sorteos activos en el servidor.\n` +
            `▸ \`/sorteo start <premio> [duracion|fecha]\` · Staff: inicia un sorteo con duración relativa o fecha exacta \`YYYY-MM-DD HH:MM\` (Madrid).\n` +
            `▸ \`/sorteo editar <id> [premio] [ganadores] [fecha]\` · Staff: edita premio, ganadores o fecha de un sorteo activo.\n` +
            `▸ \`/sorteo end <id>\` · Staff: finaliza un sorteo y selecciona ganadores ponderando boosts e invitaciones.\n` +
            `▸ \`/sorteo reroll <id>\` · Staff: vuelve a sortear los ganadores de un sorteo.\n` +
            `▸ \`/sorteo participantes <id>\` · Staff: consulta participantes, tickets, boosts e invitaciones.\n` +
            `▸ \`/sorteo set-boosts <usuario> <cantidad>\` · Staff: ajusta manualmente los boosts computables para sorteos.`,
          inline: false,
        },
        {
          name: "🚀  Boosts & Invitaciones (/boosts e /invitaciones)",
          value:
            `▸ \`/boosts lista\` · Muestra boosters activos, boosts registrados y tickets para sorteos.\n` +
            `▸ \`/boosts sync\` · Staff: sincroniza el estado activo de boosters con Discord.\n` +
            `▸ \`/boosts set <usuario> <cantidad>\` · Staff: ajusta la cantidad individual de boosts.\n` +
            `▸ \`/invitaciones ver [usuario]\` · Consulta invitaciones reales, boosts y participaciones.\n` +
            `▸ \`/invitaciones top\` · Ranking de los mayores invitadores del servidor.\n` +
            `▸ \`/invitaciones bonus <usuario> <cantidad>\` · Staff: añade invitaciones bonus a un miembro.`,
          inline: false,
        },
        {
          name: "📅  Eventos, Cumpleaños & Dinámicas",
          value:
            `▸ \`/evento lista\` · Consulta los próximos eventos de la comunidad.\n` +
            `▸ \`/evento crear <titulo> <cuando> [detalle] [cupo]\` · Staff: publica un evento con confirmación de asistencia (RSVP).\n` +
            `▸ \`/cumple poner <fecha>\` · Registra tu cumpleaños para recibir felicitaciones especiales.\n` +
            `▸ \`/frase proponer <texto>\` · Propone una frase o cita inspiradora para futuras publicaciones.\n` +
            `▸ \`/frase forzar\` · Staff: publica inmediatamente la frase del día en el canal oficial.`,
          inline: false,
        },
        {
          name: "📊  Encuestas Interactivas (/encuesta)",
          value:
            `▸ \`/encuesta crear <pregunta> <tipo> <opcion1> <opcion2> [opcion3..15] [duracion]\` · Crea encuestas interactivas con hasta 15 opciones, votación única o múltiple y cierre automático programable.\n` +
            `▸ \`/encuesta cerrar <id>\` · Cierra una encuesta activa y proclama las opciones ganadoras (autor o Staff).\n` +
            `▸ \`/encuesta ver <id>\` · Consulta los resultados y porcentajes en tiempo real de cualquier encuesta.`,
          inline: false,
        },
        {
          name: "💍  Matrimonios & Parejas (/matrimonio)",
          value:
            `▸ \`/matrimonio proponer <usuario>\` · Envía una propuesta formal de matrimonio con botones interactivos.\n` +
            `▸ \`/matrimonio perfil [usuario]\` · Consulta el perfil de pareja, tiempo de unión y estado del bonus.\n` +
            `▸ \`/matrimonio divorcio\` · Rompe el matrimonio actual tras confirmación.\n` +
            `▸ \`/matrimonio top\` · Tabla de clasificación de las parejas más longevas del servidor.\n` +
            `  └ **Ventaja:** +10% de bonus en \`/eco work\` si tu pareja está activa en la economía.`,
          inline: false,
        },
        {
          name: "⭐  Reputación & Tarjetas de Perfil (/perfil y /rep)",
          value:
            `▸ \`/perfil ver [usuario] [tema]\` · Tarjeta visual HD en Canvas con avatar luminoso, nivel, progreso, economía, karma y voz.\n` +
            `▸ \`/perfil tema <estilo>\` · Elige tu estética favorita: Cyberpunk, Neón Sakura, Oro Imperial, Esmeralda o Cósmico.\n` +
            `▸ \`/rep dar <usuario> [motivo]\` · Entrega tu punto diario de reputación/karma a otro miembro con recompensa en NexoCoins.\n` +
            `▸ \`/rep ver [usuario]\` · Consulta el historial de agradecimientos y expediente de karma de un miembro.\n` +
            `▸ \`/rep top\` · Cuadro de honor de los miembros más apreciados de la comunidad.`,
          inline: false,
        },
        {
          name: "🌐  Métricas & Estadísticas del Servidor",
          value:
            `▸ \`/serverinfo\` · Estadísticas completas, métricas, canales y detalles técnicos del servidor.\n` +
            `▸ \`/miembros\` · Recuento demográfico de usuarios, bots y estados del servidor en vivo.`,
          inline: false,
        },
      );
  } else if (selectedCat === "diversion") {
    embed
      .setTitle(`🎭 Diversión, Mascotas, Inteligencia Artificial & Voz`)
      .setDescription(
        `Universo Pokémon (386 criaturas de Gen 1-3), Gimnasios de Kanto/Johto/Hoenn, Duelos PvP con apuestas en NexoCoins, Zona Safari, generación artística con IA, confesiones y voicechat.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "🔴  Universo Pokémon (/pokemon)",
          value:
            `▸ \`/pokemon perfil [usuario] [pokemon]\` · Consulta nivel, EXP, PS, estadísticas (ATK/DEF/VEL), sprite animado y medallero.\n` +
            `▸ \`/pokemon equipo [usuario]\` · Consulta la lista completa de todos tus Pokémon en tu equipo (hasta 50 criaturas).\n` +
            `▸ \`/pokemon seleccionar <pokemon>\` · Establece cuál de tus Pokémon es tu combatiente activo.\n` +
            `▸ \`/pokemon pokedex [region] [pagina]\` · Pokédex Nacional interactiva con 649 criaturas (Kanto, Johto, Hoenn, Sinnoh y Teselia).\n` +
            `▸ \`/pokemon capturar [region] [ball] [baya]\` · Explora la Zona Safari para atrapar Pokémon con animación de 3 balanceos.\n` +
            `▸ \`/pokemon explorar [zona]\` · Explora Rutas, Cuevas, Bosques, Mar y Montañas en batallas clásicas por turnos para debilitar y capturar salvajes.\n` +
            `▸ \`/pokemon evolucionar [pokemon] [piedra]\` · Evoluciona a tus criaturas por nivel o aplicando piedras evolutivas.\n` +
            `▸ \`/pokemon intercambio <oponente> <tu_pokemon> <su_pokemon>\` · Intercambio seguro entre entrenadores con evoluciones por trade.\n` +
            `▸ \`/pokemon raid accion:<estado|atacar>\` · Incursiones Cooperativas Globales contra Jefes Legendarios del servidor.\n` +
            `▸ \`/pokemon alimentar [pokemon]\` · Dale bayas para aumentar su felicidad y ganar EXP (80 🪙).\n` +
            `▸ \`/pokemon acariciar [pokemon]\` · Mima a tu compañero para subir afecto y EXP gratis cada hora.\n` +
            `▸ \`/pokemon renombrar <nombre> [pokemon]\` · Ponle un mote único a tu compañero.\n` +
            `▸ \`/pokemon liberar <pokemon>\` · Libera a un Pokémon de nuevo a la naturaleza.`,
          inline: false,
        },
        {
          name: "🏟️  Gimnasios, Economía & Duelos (/pokemon)",
          value:
            `▸ \`/pokemon gimnasio accion:lista [region]\` · Consulta los 24 Líderes de Gimnasio oficiales de Kanto, Johto y Hoenn.\n` +
            `▸ \`/pokemon gimnasio accion:retar <lider>\` · Disputa un combate de gimnasio por la medalla oficial, gran suma de NexoCoins y EXP.\n` +
            `▸ \`/pokemon duelo <oponente> [apuesta] [pokemon]\` · Duelo PvP por turnos con apuestas opcionales en NexoCoins (¡el ganador se lleva el bote!).\n` +
            `▸ \`/pokemon tienda [accion] [item] [cantidad]\` · Poké Mart: compra Poké Balls, Super/Ultra/Master Balls, bayas, pociones y piedras.\n` +
            `▸ \`/pokemon mochila\` · Mochila de Entrenador: consulta tus esferas, pociones, caramelos raros y piedras evolutivas.\n` +
            `▸ \`/pokemon usar <item> [pokemon]\` · Usa Poción Máxima, Caramelo Raro (+1 nivel) o Piedras Evolutivas (Fuego, Agua, Trueno, etc.).\n` +
            `▸ \`/pokemon transferir <pokemon>\` · Envía un Pokémon al laboratorio del Profesor por una recompensa en NexoCoins.\n` +
            `▸ \`/pokemon guarderia <accion> [pokemon]\` · Deja Pokémon al cuidado de la Guardería por 100 🪙/h para ganar EXP continua.\n` +
            `▸ \`/pokemon salario\` · Reclama tu sueldo diario de entrenador según tus medallas y porcentaje de Pokédex.\n` +
            `▸ \`/pokemon huevo <tipo>\` · Incuba y eclosiona huevos comunes, místicos o legendarios.\n` +
            `▸ \`/pokemon expedicion <duracion> [pokemon]\` · Envíalos a explorar rutas para recolectar NexoCoins, bayas y EXP.\n` +
            `▸ \`/pokemon reclamar [pokemon]\` · Cobra el botín y la experiencia de las expediciones concluidas.`,
          inline: false,
        },
        {
          name: "🎨  Generación de Imágenes IA (100% Gratuito)",
          value:
            `▸ \`/imagen <prompt> [estilo] [formato] [modelo]\`\n` +
            `  └ Genera imágenes artísticas en alta resolución mediante los motores **FLUX.1 Schnell** y **Turbo**.\n` +
            `  └ **Estilos disponibles:** General, Anime / Manga, Fotorrealista 8K, Fantasía Épica, Cyberpunk, Render 3D Pixar, Pixel Art.\n` +
            `  └ **Formatos disponibles:** Cuadrado (1:1), Horizontal (16:9), Vertical (9:16).`,
          inline: false,
        },
        {
          name: "💌  Confesiones, Roleplay & Utilidades",
          value:
            `▸ \`/confesar enviar <mensaje> [anónima]\` · Publica confesiones sinceras en el canal oficial.\n` +
            `▸ \`/fun <acción> <usuario>\` · Acciones sociales de roleplay *(abrazar, besar, golpear, palmear...)*.\n` +
            `▸ \`/rps <elección>\` · Partida rápida de piedra, papel o tijera contra el bot.\n` +
            `▸ \`/snipe\` · Revela el último mensaje eliminado recientemente en el canal actual.`,
          inline: false,
        },
        {
          name: "🎲  Minijuegos Clásicos & Trivia Interactiva",
          value:
            `▸ \`/trivia [categoria]\` · Concurso de preguntas y respuestas con 4 botones interactivos, temporizador y premios en NexoCoins y XP.\n` +
            `▸ \`/conecta4 <oponente> [apuesta]\` · Desafía a otro miembro a una partida interactiva de Conecta 4 (7x6) con apuestas opcionales.\n` +
            `▸ \`/ahorcado\` · Juego del ahorcado colaborativo en el chat con palabras en español, 7 vidas y premios en NexoCoins.`,
          inline: false,
        },
        {
          name: "🔊  Estadísticas, Racha y Recompensas de Voz (/voz)",
          value:
            `▸ \`/voz perfil [usuario]\` · Ficha de tiempo en voicechat, racha diaria y compañeros habituales.\n` +
            `▸ \`/voz reclamar\` · Reclama tu recompensa diaria en NexoCoins según tu racha activa de días en llamadas.\n` +
            `▸ **🎁 Cofres Aéreos de Voz:** En llamadas con 2+ usuarios activos caerán cofres sorpresa con botones para abrir.\n` +
            `▸ \`/voz setup\` / \`/voz panel\` · Configuración y panel de control de salas temporales VoiceMaster.\n` +
            `▸ \`/ping\` · Comprueba la latencia del bot y la velocidad de respuesta de la API de Discord.`,
          inline: false,
        },
      );
  } else if (selectedCat === "admin") {
    embed
      .setTitle(`⚙️ Administración, Configuración & Auditoría`)
      .setDescription(
        `Control central del bot, canales de registro en tiempo real y salvaguarda de la estructura del servidor.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "🔧  Configuración General del Servidor",
          value:
            `▸ \`/config\` · Panel maestro: bienvenidas, despedidas, autoroles y canales principales.\n` +
            `▸ \`/say <mensaje> [canal]\` · Envía comunicados o anuncios en nombre de Nexo Bot.`,
          inline: false,
        },
        {
          name: "📜  Canales de Auditoría (Audit Logs)",
          value:
            `▸ \`/logs\` · Configura canales dedicados para logs de mensajes, comandos, sanciones, voz y tickets.`,
          inline: false,
        },
        {
          name: "🎭  Paneles de Auto-Roles (/autoroles)",
          value:
            `▸ \`/autoroles crear <titulo> [descripcion] [modo]\` · Crea paneles interactivos con menús desplegables (modos: toggle, unico, multiple).\n` +
            `▸ \`/autoroles añadir <panel_id> <rol> [emoji] [etiqueta] [descripcion]\` · Añade roles configurables a cualquier panel.\n` +
            `▸ \`/autoroles publicar <panel_id>\` · Despliega o actualiza el mensaje del panel en el canal deseado.\n` +
            `▸ \`/autoroles lista\` / \`/autoroles quitar\` / \`/autoroles eliminar\` · Gestión administrativa completa de paneles.`,
          inline: false,
        },
        {
          name: "💾  Copias de Seguridad (Backups)",
          value:
            `▸ \`/backup crear\` · Genera un volcado completo de canales, categorías, roles y permisos.\n` +
            `▸ \`/backup restaurar\` · Aplica una copia de seguridad guardada para restaurar el servidor.`,
          inline: false,
        },
      );
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("help:category")
    .setPlaceholder("Selecciona una sección...")
    .addOptions(
      HELP_CATEGORIES.map((cat) => ({
        label: cat.label,
        value: cat.id,
        emoji: cat.emoji,
        description: cat.desc,
        default: cat.id === selectedCat,
      })),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  return { embed, row };
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Panel interactivo de ayuda y comandos de Nexo")
    .addStringOption((o) =>
      o
        .setName("seccion")
        .setDescription("Sección que deseas consultar directamente")
        .addChoices(
          HELP_CATEGORIES.map((c) => ({ name: `${c.emoji} ${c.label}`, value: c.id })),
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction, client: NexoClient) {
    const choice = interaction.options.getString("seccion") ?? "overview";
    const view = renderHelpView(client, choice, interaction.guild?.iconURL() ?? null);
    await interaction.reply({ embeds: [view.embed], components: [view.row], ephemeral: true });
  },
};

export async function handleHelpSelect(interaction: StringSelectMenuInteraction, client: NexoClient): Promise<void> {
  const selected = interaction.values[0] || "overview";
  const view = renderHelpView(client, selected, interaction.guild?.iconURL() ?? null);
  await interaction.update({ embeds: [view.embed], components: [view.row] });
}

export default command;
