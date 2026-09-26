import { EmbedBuilder, type Client } from "discord.js";
import { logger } from "../../logger.js";

export const POKEMON_CHANNEL_ID = "1551290428752535702";

/**
 * Genera el paquete de 4 embeds explicativos y formateados para el mensaje fijado en #🔴⎢𝐩𝐨𝐤𝐞́𝐦𝐨𝐧.
 */
export function buildPokemonGuideEmbeds(): EmbedBuilder[] {
  // ── 1. EMBED CABECERA & GESTIÓN DEL EQUIPO ──
  const embed1 = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("🔴 GUÍA OFICIAL DEL ENTRENADOR POKÉMON · NEXO")
    .setDescription(
      "¡Bienvenido al sistema Pokémon de **Nexo**! Explora las 5 regiones oficiales (**Kanto, Johto, Hoenn, Sinnoh y Teselia**), completa tu Pokédex con las **649 criaturas oficiales**, entrena a tus compañeros, libra batallas interactivas por turnos, evoluciona a tus Pokémon y enfrenta Incursiones Globales.\n\n" +
      "🎒 **Equipo:** Hasta 50 criaturas | 📖 **Pokédex:** 649 especies oficiales | 🏟️ **Ligas:** 24 Líderes de Gimnasio",
    )
    .addFields(
      {
        name: "🧭 Gestión del Equipo",
        value:
          "`/pokemon perfil [usuario] [pokemon]` — Ficha con sprite animado, tipos, PS y stats.\n" +
          "`/pokemon equipo [usuario]` — Visualiza todas las criaturas que posees en tu rancho.\n" +
          "`/pokemon seleccionar <pokemon>` — Establece a tu compañero principal para combate.\n" +
          "`/pokemon pokedex [region] [pagina]` — Revisa la Pokédex Nacional (649 especies).\n" +
          "`/pokemon renombrar <nombre> [pokemon]` — Cambia el mote de tu criatura.\n" +
          "`/pokemon liberar <pokemon>` — Devuelve un Pokémon a la naturaleza.",
      },
      {
        name: "💖 Cuidados & Expediciones",
        value:
          "`/pokemon alimentar [pokemon]` — Da bayas para subir felicidad y otorgarle +30 EXP (80 🪙).\n" +
          "`/pokemon acariciar [pokemon]` — Afecto y mimos (+20 EXP, gratis cada 60 min).\n" +
          "`/pokemon expedicion <duracion> [pokemon]` — Envía a explorar (1h, 4h, 8h o 24h) por botín.\n" +
          "`/pokemon reclamar [pokemon]` — Reclama las NexoCoins, bayas y EXP recolectadas.",
      },
    );

  // ── 2. EMBED ZONA SAFARI & BATALLAS EN RUTAS ──
  const embed2 = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🌿 CAPTURAS: ZONA SAFARI & RUTAS (/pokemon)")
    .setDescription(
      "Elige cómo encontrar y atrapar criaturas en las 5 regiones oficiales:",
    )
    .addFields(
      {
        name: "🎯 Zona Safari (`/pokemon capturar [region] [ball] [baya]`)",
        value:
          "Explora la hierba alta de Kanto, Johto, Hoenn, Sinnoh o Teselia con animación de **3 balanceos de Poké Ball**.\n" +
          "• **Poké Ball (50 🪙):** Ratio x1.0 | **Super Ball (150 🪙):** Ratio x1.5\n" +
          "• **Ultra Ball (400 🪙):** Ratio x2.0 | **Master Ball (5.000 🪙):** 100% de éxito garantizado.\n" +
          "• **Bayas:** **Frambu** (+25% ratio) | **Latano** (impide huida) | **Pinia** (doble monedas/EXP).",
      },
      {
        name: "⚔️ Exploración & Batallas Silvestres (`/pokemon explorar [zona]`)",
        value:
          "Adéntrate en entornos temáticos: **Ruta Silvestre** 🌿, **Cueva Profunda** 🪨, **Bosque Virgen** 🌲, **Costa/Mar** 🌊 o **Pico Montañoso** 🌋.\n" +
          "• **Combates por turnos con botones:** Ataca con tu compañero para debilitar la barra de salud del salvaje.\n" +
          "• **Captura en combate:** Cuanto menor sea la vida del salvaje, ¡mayor será tu probabilidad de atraparlo con la Poké Ball!",
      },
    );

  // ── 3. EMBED EVOLUCIONES, INTERCAMBIOS & INCURSIONES ──
  const embed3 = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("✨ EVOLUCIONES, INTERCAMBIOS & INCURSIONES")
    .setDescription(
      "Nuevos sistemas estratégicos para vivir la experiencia Pokémon auténtica:",
    )
    .addFields(
      {
        name: "🧬 Evolución por Nivel y Piedras (`/pokemon evolucionar`)",
        value:
          "• Sube de nivel a tus criaturas para que alcancen su siguiente fase evolutiva.\n" +
          "• Aplica **Piedras Evolutivas** (**Fuego, Agua, Trueno, Hoja, Lunar, Solar**) desde tu mochila para inducir evoluciones elementales.",
      },
      {
        name: "🔄 Intercambios entre Entrenadores (`/pokemon intercambio`)",
        value:
          "`/pokemon intercambio <oponente> <tu_pokemon> <su_pokemon>` — Intercambio seguro con confirmación mutua.\n" +
          "• ¡Desbloquea **evoluciones por trade** como Haunter → Gengar, Machoke → Machamp, Boldore → Gigalith y más!",
      },
      {
        name: "👑 Incursiones Cooperativas Globales (`/pokemon raid`)",
        value:
          "`/pokemon raid accion:estado` · Consulta la barra de salud del Jefe Legendario mundial.\n" +
          "`/pokemon raid accion:atacar` · Asesta golpes con tu Pokémon activo cada 10 min.\n" +
          "• ¡Al vencer al Jefe, todos reciben parte del gran bote de NexoCoins y el MVP captura al Legendario!",
      },
    );

  // ── 4. EMBED GIMNASIOS, DUELOS & ECONOMÍA ──
  const embed4 = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("🏟️ GIMNASIOS, DUELOS PVP & ECONOMÍA")
    .setDescription(
      "Compite y haz crecer tu patrimonio de NexoCoins en el servidor:",
    )
    .addFields(
      {
        name: "🏅 Liga de 24 Gimnasios (`/pokemon gimnasio accion:<lista|retar>`)",
        value:
          "Supera a los 8 líderes oficiales de Kanto, 8 de Johto y 8 de Hoenn en combates tácticos por medallas oficiales y grandes bolsas de monedas.",
      },
      {
        name: "⚔️ Duelos PvP con Apuestas (`/pokemon duelo`)",
        value:
          "`/pokemon duelo <oponente> [apuesta] [pokemon]` — Desafía a otro entrenador en combates por turnos. ¡El ganador se lleva el **100% del bote**!",
      },
      {
        name: "🪙 Tienda, Mochila & Servicios",
        value:
          "• `/pokemon tienda` — Poké Mart para comprar esferas, bayas, pociones y piedras.\n" +
          "• `/pokemon mochila` — Revisa tus objetos consumibles e instrumentos.\n" +
          "• `/pokemon guarderia` — Deja Pokémon entrenando pasivamente por 100 🪙/h (+75 EXP/h).\n" +
          "• `/pokemon salario` — Cobra tu asignación diaria según medallas y Pokédex.\n" +
          "• `/pokemon transferir` — Envía Pokémon al laboratorio del Profesor a cambio de NexoCoins.",
      },
    )
    .setFooter({ text: "Nexo Pokémon 3.0 · ¡649 especies, 5 regiones y batallas legendarias!" });

  return [embed1, embed2, embed3, embed4];
}

/**
 * Sincroniza o actualiza el mensaje fijado en el canal #🔴⎢𝐩𝐨𝐤𝐞́𝐦𝐨𝐧.
 */
export async function syncPokemonPinnedGuide(client: Client): Promise<void> {
  try {
    const channel = await client.channels.fetch(POKEMON_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased() || !("send" in channel) || !("messages" in channel)) return;

    const embeds = buildPokemonGuideEmbeds();
    const pinnedMessages = await channel.messages.fetchPinned().catch(() => null);
    const existing = pinnedMessages?.find((m) => m.author.id === client.user?.id);

    if (existing) {
      await existing.edit({ embeds });
      logger.info("[Pokemon] Guía fijada actualizada en #🔴⎢𝐩𝐨𝐤𝐞́𝐦𝐨𝐧");
    } else {
      const sent = await channel.send({ embeds });
      await sent.pin().catch(() => null);
      logger.info("[Pokemon] Guía fijada creada y anclada en #🔴⎢𝐩𝐨𝐤𝐞́𝐦𝐨𝐧");
    }
  } catch (err) {
    logger.error("Error editando mensaje fijado de pokemon:", err);
  }
}
