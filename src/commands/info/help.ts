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

export const HELP_CATEGORIES = [
  { id: "overview", label: "Visión General", emoji: "🏠", desc: "Resumen y guía rápida de Nexo Bot" },
  { id: "economia", label: "Economía & Finanzas", emoji: "🪙", desc: "Banca privada, asaltos, logros, títulos, préstamos y transferencias" },
  { id: "trading", label: "Trading, Criptos & Minería", emoji: "📈", desc: "Bolsa de valores, criptos, dividendos 12:00 y minería nivel 30" },
  { id: "pesca", label: "Pesca Deportiva & Marina", emoji: "🎣", desc: "Expediciones fluviales, cañas, cebos, capturas y venta en lote" },
  { id: "caza", label: "Caza & Expediciones", emoji: "🏹", desc: "Caza en el bosque, rifles, trampas reforzadas y trofeos" },
  { id: "casino", label: "Casino & Apuestas", emoji: "🎰", desc: "Jackpot Progresivo, tragaperras, ruleta, blackjack y duelos" },
  { id: "rpg", label: "RPG, Mazmorras & Clanes", emoji: "⚔️", desc: "Clases, combates tácticos, mazmorras y hermandades" },
  { id: "moderacion", label: "Moderación & Sanciones", emoji: "🛡️", desc: "Warns, bans, timeouts, moderación masiva y apelaciones" },
  { id: "tickets", label: "Tickets & Asistente IA", emoji: "🎫", desc: "Paneles de atención, IA Neko y transcripciones HTML" },
  { id: "comunidad", label: "Comunidad & Niveles", emoji: "🎉", desc: "Minijuegos exprés de chat, niveles, misiones y sorteos" },
  { id: "diversion", label: "Diversión, Mascotas & Voz", emoji: "🎭", desc: "Mascotas virtuales, imágenes IA (FLUX), confesiones y voz" },
  { id: "admin", label: "Administración & Logs", emoji: "⚙️", desc: "Configuración global, registros de auditoría y copias de seguridad" },
];

const CATEGORY_COLORS: Record<string, number> = {
  overview: 0x5865f2,
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
          `Explora todos los módulos especializados utilizando el selector ubicado al pie de este mensaje.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "🪙  Economía, Logros & Asaltos",
          value: "Banca privada (fondos de cartera/banco), depósitos a plazo fijo, asaltos cooperativos al banco, vitrina de logros, títulos cosméticos y mercado.",
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
          value: "Minijuegos exprés de chat (matemáticas, anagramas, trivia), misiones automáticas, sorteos ponderados y eventos.",
          inline: false,
        },
        {
          name: "🎭  Diversión, Mascotas & Voz",
          value: "Adopción y expediciones de mascotas virtuales, cofres de voz aéreos, recompensas por racha diaria en VC, imágenes IA (FLUX) y confesiones.",
          inline: false,
        },
        {
          name: "⚙️  Administración & Auditoría",
          value: "Configuración general, canales de registro en tiempo real (mensajes, comandos...) y copias de seguridad.",
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
            `▸ \`/eco bal [usuario]\` · Consulta efectivo en mano, saldo bancario protegido y patrimonio neto.\n` +
            `▸ \`/eco depositar <cantidad|all>\` · Guarda tu dinero en la bóveda bancaria blindada contra robos.\n` +
            `▸ \`/eco retirar <cantidad|all>\` · Retira efectivo de tu cuenta para compras o apuestas.\n` +
            `▸ \`/eco pagar <usuario> <cantidad>\` · Transfiere dinero (usa saldo de cartera y banco automáticamente) de forma inmediata a otro usuario.\n` +
            `▸ \`/eco prestamo [cantidad]\` · Solicita un préstamo bancario adaptado a tu solvencia patrimonial.\n` +
            `▸ \`/eco deuda [cantidad]\` · Consulta tu saldo pendiente con la entidad y amortiza pagos.\n` +
            `▸ \`/eco plazo-fijo <ver|abrir|reclamar>\` · Depósitos bancarios bloqueados (3 a 30 días, +6% a +80% de interés libre de asaltos).\n` +
            `▸ \`/eco perfil [usuario]\` · Ficha financiera detallada: título cosmético, patrimonio, racha daily, minería e ingresos.\n` +
            `▸ \`/eco top [tipo]\` · Tabla clasificatoria con los usuarios más adinerados del servidor.`,
          inline: false,
        },
        {
          name: "🏆  Logros & Títulos Cosméticos (/logros y /titulos)",
          value:
            `▸ \`/logros [usuario]\` · Vitrina interactiva con tus logros conseguidos, progreso y premios en NexoCoins.\n` +
            `▸ \`/titulos ver [usuario]\` · Consulta todos tus títulos honoríficos desbloqueados.\n` +
            `▸ \`/titulos equipar <titulo>\` · Equipa un título para lucirlo en tu tarjeta de \`/eco perfil\` (con autocompletado en vivo).\n` +
            `▸ \`/titulos desequipar\` · Retira tu título cosmético actual.`,
          inline: false,
        },
        {
          name: "🔫  Golpes, Delitos & Asaltos Cooperativos",
          value:
            `▸ \`/eco asalto\` · Organiza o únete a un asalto cooperativo al Banco Central de Nexo (2 a 8 criminales, lobby interactivo de 60s, botín de 35.000 a 65.000 🪙 por miembro o 10 min de calabozo si falláis).\n` +
            `▸ \`/crimen hacer\` · Comete delitos individuales rápidos para ganar dinero sucio arriesgándote a multas y cárcel.`,
          inline: false,
        },
        {
          name: "💼  Trabajos, Salarios & Actividades Legales",
          value:
            `▸ \`/eco work\` · Jornada laboral remunerada según tu profesión activa (~30 min cooldown).\n` +
            `▸ \`/eco extra\` · Horas extras de trabajo rápido para ganar dinero al instante (~10 min cooldown).\n` +
            `▸ \`/eco daily\` · Recompensa diaria obligatoria con racha acumulable y bonos por fidelidad.\n` +
            `▸ \`/eco weekly\` · Paga semanal garantizada para miembros activos del servidor.\n` +
            `▸ \`/eco mendigar\` · Solicita caridad al servidor con una pequeña probabilidad de suerte.`,
          inline: false,
        },
        {
          name: "🏪  Catálogo Oficial, Tiendas & Mercado P2P",
          value:
            `▸ \`/tienda ver\` · Catálogo oficial por categorías interactivas (herramientas, consumibles y roles VIP).\n` +
            `▸ \`/tienda comprar <item> [cant]\` · Adquiere suministros esenciales (admite fondos de cartera y banco).\n` +
            `▸ \`/tienda vender <item> [cant]\` · Vende tus objetos al bot por monedas (soporta venta individual o masiva).\n` +
            `▸ \`/oferta vender <usuario> <item> <precio>\` · Propón vender un objeto directamente a otro jugador por contrato privado.\n` +
            `▸ \`/oferta comprar <usuario> <item> <precio>\` · Envía una oferta formal de compra a un usuario por un objeto de su inventario.\n` +
            `▸ \`/subasta\` · Crea subastas públicas comunitarias con pujas en tiempo real o puja en las activas.\n` +
            `▸ \`/mercado ver\` · Tablón de compraventa P2P entre usuarios del servidor.`,
          inline: false,
        },
        {
          name: "📦  Inventario, Usos & Colecciones",
          value:
            `▸ \`/eco inv [usuario]\` · Inspecciona tu mochila con todos tus ítems, herramientas y equipamiento.\n` +
            `▸ \`/eco usar <item>\` · Utiliza consumibles activos de tu inventario (pociones, potenciadores, etc.).\n` +
            `▸ \`/eco vender <item> [cant]\` · Vende cualquier ítem, captura o coleccionable al bot.\n` +
            `▸ \`/galeria [usuario]\` · Vitrina de 28 colecciones de coleccionables. *(¡Completa cada álbum para ganar 10.000 🪙 de premio!)*`,
          inline: false,
        },
        {
          name: "🏠  Propiedades & Bienes Inmuebles (/propiedad)",
          value:
            `▸ \`/propiedad catalogo\` · Consulta las 7 propiedades disponibles (desde cobertizos a rascacielos).\n` +
            `▸ \`/propiedad comprar <propiedad>\` · Adquiere un inmueble para generar ingresos pasivos cada 8 horas.\n` +
            `▸ \`/propiedad mejorar <propiedad>\` · Sube el nivel de tu propiedad (hasta nivel 5) multiplicando sus rentas.\n` +
            `▸ \`/propiedad cobrar\` · Recolecta todas las rentas acumuladas de tus propiedades.\n` +
            `▸ \`/propiedad ver [usuario]\` / \`/propiedad vender <propiedad>\` · Inspecciona o liquida tus activos por el 50% de lo invertido.`,
          inline: false,
        },
        {
          name: "💼  Profesiones & Trabajos Especializados (/trabajo)",
          value:
            `▸ \`/trabajo catalogo\` · Explora los 9 oficios disponibles (Granjero, Minero, Pescador, Cocinero, Programador, Banquero, Crupier, Arquitecto, Magnate).\n` +
            `▸ \`/trabajo elegir <profesion>\` · Selecciona tu carrera para desbloquear bonus pasivos temáticos.\n` +
            `▸ \`/trabajo turno\` · Realiza un turno laboral especial para acumular XP de profesión y recompensas.\n` +
            `▸ \`/trabajo perfil\` / \`/trabajo top\` · Revisa tu rango laboral, multiplicadores activos y clasificación de trabajadores.`,
          inline: false,
        },
        {
          name: "🃏  Colección de Cartas Gacha (/cartas)",
          value:
            `▸ \`/cartas abrir <sobre>\` · Abre sobres (Básico, Premium, Legendario, Mítico) con animaciones y garantías de rareza.\n` +
            `▸ \`/cartas album [usuario]\` · Consulta tu álbum interactivo con más de 80 cartas divididas en 8 temáticas.\n` +
            `▸ \`/cartas ver <carta>\` · Información detallada, rareza (de Común a Mítica) y arte de cualquier carta.\n` +
            `▸ \`/cartas duplicadas\` / \`/cartas reciclar <carta>\` · Convierte cartas repetidas en NexoCoins.\n` +
            `▸ \`/cartas intercambiar <usuario> <ofreces> <pides>\` · Sistema de trade P2P directo entre coleccionistas.`,
          inline: false,
        },
        {
          name: "🎟️  Lotería Semanal (/loteria)",
          value:
            `▸ \`/loteria comprar [cantidad]\` · Compra boletos (200 🪙 c/u, máx 10 por sorteo).\n` +
            `▸ \`/loteria ver\` · Consulta el bote acumulativo actual y tus boletos para el próximo domingo.\n` +
            `  └ **Sorteo automático:** Cada domingo a las 20:00 (hora peninsular española). ¡El 5% de las apuestas del casino alimenta el bote!`,
          inline: false,
        },
        {
          name: "💡  Consejo Financiero",
          value:
            `*Nunca dejes grandes sumas de dinero sueltas en tu cartera: los crímenes de otros jugadores pueden vaciarte el bolsillo. Utiliza depósitos bancarios a plazo fijo o invierte en la bolsa para proteger tu capital.*`,
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
            `  └ **¡Gana el Jackpot!** Obtén una línea de tres diamantes (**💎 💎 💎**) o tres sietes (**7️⃣ 7️⃣ 7️⃣**) en \`/casino slots\` para llevarte el bote completo acumulado.`,
          inline: false,
        },
        {
          name: "🃏  Juegos Individuales de Cartas & Suerte",
          value:
            `▸ \`/casino blackjack <apuesta>\` · 21 contra la casa. Si las dos cartas iniciales tienen el mismo valor, puedes hacer Split.\n` +
            `  └ **Split:** divide la mano en dos, paga una segunda apuesta igual y juega ambas manos por separado contra el dealer.\n` +
            `▸ \`/casino slots <apuesta>\` · Máquina tragaperras de 3 rodillos con multiplicadores y opción de activar el Jackpot Global.\n` +
            `▸ \`/casino rusa-casa <apuesta>\` · Ruleta rusa contra la casa: dispara para subir el multiplicador o cobra antes de encontrar la bala.\n` +
            `▸ \`/casino ruleta <apuesta> <color>\` · Ruleta de casino europea (rojo x2, negro x2, verde x14).\n` +
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
          name: "🏰  Hermandades & Sistema de Clanes",
          value:
            `▸ \`/rpg clan crear <nombre> <tag> [desc]\` · Funda tu propio clan oficial con escudo y descripción.\n` +
            `▸ \`/rpg clan info [nombre]\` · Consulta estadísticas, líder, nivel, victorias y lista de miembros.\n` +
            `▸ \`/rpg clan unirse <nombre>\` · Solicita entrar a una hermandad existente; el líder debe aprobar tu solicitud.\n` +
            `▸ \`/rpg clan solicitudes\` · El líder consulta las solicitudes pendientes de ingreso.\n` +
            `▸ \`/rpg clan aprobar <usuario>\` · El líder aprueba una solicitud y añade al usuario como miembro.\n` +
            `▸ \`/rpg clan rechazar <usuario>\` · El líder rechaza una solicitud pendiente.\n` +
            `▸ \`/rpg clan rango <usuario> <nivel>\` · El líder asigna Oficial o Miembro.\n` +
            `▸ \`/rpg clan expulsar <usuario>\` · El líder u oficial expulsa miembros; un oficial no puede expulsar a otro oficial.\n` +
            `▸ \`/rpg clan salir\` · Abandona tu clan actual de forma voluntaria.\n` +
            `▸ \`/rpg clan transferir <usuario>\` · Traspasa el rango de líder a otro compañero del clan.\n` +
            `▸ \`/rpg clan disolver <confirmar>\` · Disuelve permanentemente el clan (exclusivo para líderes).\n` +
            `▸ \`/rpg clan top\` · Clasificación de los clanes más poderosos y laureados.`,
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
          name: "🎁  Sorteos, Eventos & Cumpleaños",
          value:
            `▸ \`/sorteo start <premio> [duracion|fecha]\` · Staff: inicia un sorteo con duración relativa o fecha exacta \`YYYY-MM-DD HH:MM\` (hora de Madrid).\n` +
            `▸ \`/sorteo editar <id> [premio] [ganadores] [fecha]\` · Staff: cambia el premio, los ganadores y/o el día y hora de finalización de un sorteo activo.\n` +
            `▸ \`/sorteo end <id>\` · Staff: termina un sorteo y elige ganadores ponderando boosts e invitaciones.\n` +
            `▸ \`/sorteo reroll <id>\` · Staff: vuelve a sortear los ganadores.\n` +
            `▸ \`/sorteo list\` · Lista los sorteos activos.\n` +
            `▸ \`/sorteo participantes <id>\` · Staff: consulta participantes, tickets, boosts e invitaciones.\n` +
            `▸ \`/sorteo set-boosts <usuario> <cantidad>\` · Staff: ajusta manualmente la cantidad de boosts computables para sorteos.\n` +
            `▸ \`/boosts lista\` · Muestra boosters activos, boosts registrados y tickets.\n` +
            `▸ \`/boosts sync\` · Staff: sincroniza el estado activo de boosters con Discord.\n` +
            `▸ \`/boosts set <usuario> <cantidad>\` · Staff: ajusta la cantidad individual de boosts cuando Discord no la expone.\n` +
            `▸ \`/invitaciones ver [usuario]\` · Consulta invitaciones, boosts y participaciones en sorteos.\n` +
            `▸ \`/invitaciones top\` · Ranking de invitadores.\n` +
            `▸ \`/invitaciones bonus <usuario> <cantidad>\` · Staff: añade invitaciones bonus.\n` +
            `▸ \`/evento crear <titulo> <cuando> [detalle] [cupo]\` · Staff: publica un evento con confirmación de asistencia (RSVP).\n` +
            `▸ \`/evento lista\` · Consulta los próximos eventos.\n` +
            `▸ \`/cumple poner <fecha>\` · Registra tu fecha de cumpleaños para recibir felicitaciones especiales.\n` +
            `▸ \`/frase proponer <texto>\` · Propone una frase para futuras publicaciones.\n` +
            `▸ \`/frase forzar\` · Staff: publica inmediatamente la frase del día.\n` +
            `▸ \`/serverinfo\` · Estadísticas, métricas y detalles técnicos del servidor.\n` +
            `▸ \`/miembros\` · Recuento demográfico de usuarios, bots y estados del servidor.`,
          inline: false,
        },
        {
          name: "📊  Encuestas Interactivas",
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
      );
  } else if (selectedCat === "diversion") {
    embed
      .setTitle(`🎭 Diversión, Mascotas, Inteligencia Artificial & Voz`)
      .setDescription(
        `Mascotas virtuales con expediciones pasivas, generación artística con IA, confesiones, roleplay y voicechat dinámico.\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
      .addFields(
        {
          name: "🐾  Mascotas Virtuales & Expediciones (/mascota)",
          value:
            `▸ \`/mascota tienda\` · Catálogo de especies (Gato 🐱, Shiba 🐶, Zorro 🦊, Búho 🦉 y Dragón 🐉) con bonificaciones pasivas.\n` +
            `▸ \`/mascota adoptar <especie> <nombre>\` · Adopta y ponle nombre propio a tu mascota.\n` +
            `▸ \`/mascota perfil [usuario]\` · Consulta nivel, EXP, barra de felicidad (❤️❤️❤️❤️🤍) y estado.\n` +
            `▸ \`/mascota alimentar\` · Dale comida premium para subir su felicidad y ganar EXP (200 🪙).\n` +
            `▸ \`/mascota acariciar\` · Mímala y juega con ella gratis para aumentar su afecto y EXP.\n` +
            `▸ \`/mascota expedicion <duracion>\` · Envíala a explorar (1h, 4h, 8h o 24h) para recolectar NexoCoins e ítems valiosos.\n` +
            `▸ \`/mascota reclamar\` · Cobra el botín acumulado y la experiencia al terminar la expedición.\n` +
            `▸ \`/mascota renombrar <nombre>\` · Cambia el nombre de tu mascota en cualquier momento.`,
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
          name: "🎲  Minijuegos Clásicos & Sociales",
          value:
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
