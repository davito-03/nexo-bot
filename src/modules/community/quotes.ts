import { EmbedBuilder, type Guild, type GuildTextBasedChannel } from "discord.js";
import { getDb } from "../../database/index.js";
import { COLORS, QUOTE_CHANNEL_ID, SERVER_NAME } from "../../constants.js";
import { completeChat } from "../ai/client.js";
import { fetchJson } from "../../utils/http.js";
import { madridDay } from "../../utils/time.js";
import { logger } from "../../logger.js";

const FALLBACK_QUOTES: Array<{ text: string; by: string }> = [
  // Citas célebres de autores clásicos.
  { text: "Caminante, son tus huellas el camino, y nada más; caminante, no hay camino, se hace camino al andar.", by: "Antonio Machado" },
  { text: "¿Qué es la vida? Un frenesí; ¿qué es la vida? Una ilusión, una sombra, una ficción.", by: "Pedro Calderón de la Barca" },
  { text: "Nada te turbe, nada te espante; quien a Dios tiene nada le falta.", by: "Teresa de Jesús" },
  { text: "El corazón tiene razones que la razón ignora.", by: "Blaise Pascal" },
  { text: "No hay viento favorable para quien no sabe a qué puerto se dirige.", by: "Séneca" },
  { text: "Sabemos lo que somos, pero no sabemos lo que podemos ser.", by: "William Shakespeare" },
  { text: "El que lee mucho y anda mucho, ve mucho y sabe mucho.", by: "Miguel de Cervantes" },
  { text: "La imaginación es más importante que el conocimiento.", by: "Albert Einstein" },
  { text: "La suerte favorece a los audaces.", by: "Virgilio" },
  { text: "La vida debe ser comprendida hacia atrás, pero debe ser vivida hacia delante.", by: "Søren Kierkegaard" },
  { text: "La paciencia es amarga, pero su fruto es dulce.", by: "Aristóteles" },
  { text: "Incluso la noche más oscura terminará y saldrá el sol.", by: "Victor Hugo" },

  // Frases originales: reflexión, humor, creatividad, descanso y convivencia.
  { text: "No necesitas tener el mapa completo; a veces basta con dar el siguiente paso.", by: "Nexo Staff" },
  { text: "Cambiar de opinión no es perder una batalla: es demostrar que sigues aprendiendo.", by: "Nexo Staff" },
  { text: "La constancia suele avanzar en silencio mientras el talento espera su momento perfecto.", by: "Nexo Staff" },
  { text: "Una conversación inesperada puede ser el comienzo de una historia que aún no sabías que necesitabas.", by: "Nexo Staff" },
  { text: "Descansar también forma parte del progreso; nadie puede estar al cien por cien todos los días.", by: "Nexo Staff" },
  { text: "Tu ritmo no tiene que parecerse al de nadie para seguir siendo un ritmo válido.", by: "Nexo Staff" },
  { text: "La curiosidad abre puertas que la certeza ni siquiera había visto.", by: "Nexo Staff" },
  { text: "A veces la mejor jugada es cerrar el juego, respirar y volver con la mente despejada.", by: "Nexo Staff" },
  { text: "El humor no arregla todos los problemas, pero hace más llevadero enfrentarse a ellos.", by: "Nexo Staff" },
  { text: "Una buena idea puede aparecer en cualquier sitio: caminando, conversando o mirando la pantalla en blanco.", by: "Nexo Staff" },
  { text: "No confundas una pausa con una derrota: hasta las historias necesitan capítulos tranquilos.", by: "Nexo Staff" },
  { text: "Ser amable no cuesta experiencia y, sorprendentemente, mejora mucho la partida de todos.", by: "Nexo Staff" },
  { text: "Lo extraordinario no siempre hace ruido; a veces se parece a seguir intentándolo un día más.", by: "Nexo Staff" },
  { text: "La creatividad aparece cuando dejas espacio para probar algo que quizá no salga perfecto.", by: "Nexo Staff" },
  { text: "No todo tiene que convertirse en una competición; algunas cosas solo están para disfrutarlas.", by: "Nexo Staff" },
  { text: "Las mejores comunidades se construyen con pequeños gestos repetidos, no con grandes discursos.", by: "Nexo Staff" },
  { text: "Si hoy solo puedes avanzar un poco, que ese poco siga siendo tuyo.", by: "Nexo Staff" },
  { text: "Hay días para conquistar el mundo y días para conquistar la cama; ambos cuentan como estrategia.", by: "Nexo Staff" },
];

function isValidQuote(text: string): boolean {
  if (!text) return false;
  const clean = text.trim();
  if (clean.length < 30 || clean.length > 220) return false;
  // Debe terminar con puntuación de cierre válida
  if (!/[.!?…]$/.test(clean)) return false;
  return true;
}

function recentDailyQuotes(guildId: string): Set<string> {
  return new Set(
    (getDb()
      .prepare("SELECT quote_text FROM quote_daily WHERE guild_id = ? AND quote_text IS NOT NULL ORDER BY day DESC LIMIT 30")
      .all(guildId) as { quote_text: string }[])
      .map((row) => row.quote_text.trim().toLocaleLowerCase("es")),
  );
}

export function addQuote(guildId: string, text: string, authorId: string | null): void {
  getDb()
    .prepare("INSERT INTO quotes (guild_id, text, author_id, used, created_at) VALUES (?, ?, ?, 0, ?)")
    .run(guildId, text.slice(0, 280), authorId, Date.now());
}

async function pickQuote(guildId: string): Promise<{ text: string; by: string }> {
  const recent = recentDailyQuotes(guildId);

  // Comprobar si hay frases guardadas no usadas de usuarios
  const unused = getDb()
    .prepare("SELECT id, text FROM quotes WHERE guild_id = ? AND used = 0 ORDER BY RANDOM() LIMIT 1")
    .get(guildId) as { id: number; text: string } | undefined;

  if (unused && isValidQuote(unused.text) && Math.random() < 0.65) {
    getDb().prepare("UPDATE quotes SET used = 1 WHERE id = ?").run(unused.id);
    return { text: unused.text, by: "dicho en Nexo · publicado por Nexo Staff" };
  }

  // Generar frase con IA
  try {
    const ai = await completeChat({
      system:
        "Escribe UNA sola frase original en español, completa y natural (entre 50 y 150 caracteres). Alterna entre reflexión, humor, creatividad, descanso, amistad, curiosidades y motivación. No menciones Nexo, Discord, servidores, gatos ni videojuegos salvo que sea imprescindible; no uses hashtags ni comillas. Debe terminar con punto o signo de exclamación.",
      messages: [{ role: "user", content: "Frase del día variada." }],
    });

    const candidate = ai?.text?.replace(/^["«»]|["«»]$/g, "").trim();
    if (candidate && isValidQuote(candidate) && !recent.has(candidate.toLocaleLowerCase("es"))) {
      return { text: candidate, by: "Nexo Staff" };
    }
  } catch (err) {
    logger.warn("Error al generar frase con IA", err);
  }

  // Fallback curado de calidad garantizada
  const available = FALLBACK_QUOTES.filter((quote) => !recent.has(quote.text.toLocaleLowerCase("es")));
  return (available.length ? available : FALLBACK_QUOTES)[Math.floor(Math.random() * (available.length || FALLBACK_QUOTES.length))]!;
}

async function catMedia(): Promise<{ url: string; kind: "image" | "video" } | null> {
  try {
    const gif = await fetchJson<{ url: string; mime_type?: string }[]>(
      "https://api.thecatapi.com/v1/images/search?mime_types=gif,jpg,png",
    );
    const url = gif[0]?.url;
    if (!url) return null;
    const kind = url.endsWith(".mp4") || url.endsWith(".webm") ? "video" : "image";
    return { url, kind };
  } catch {
    return null;
  }
}

export async function postDailyQuote(
  guild: { id: string; channels: { cache: Map<string, any> } },
  force = false,
): Promise<boolean> {
  const day = madridDay();
  if (!force) {
    const done = getDb().prepare("SELECT 1 FROM quote_daily WHERE guild_id = ? AND day = ?").get(guild.id, day);
    if (done) return false;
  }

  const ch = guild.channels.cache.get(QUOTE_CHANNEL_ID) as GuildTextBasedChannel | undefined;
  if (!ch || !("send" in ch)) {
    return false;
  }

  const quote = await pickQuote(guild.id);
  const cat = await catMedia();

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("🌸 Frase del día")
    .setDescription(`*${quote.text}*`)
    .setFooter({ text: `${quote.by} · ${SERVER_NAME}` })
    .setTimestamp();

  if (cat?.kind === "image") embed.setImage(cat.url);

  getDb()
    .prepare("INSERT INTO quote_daily (guild_id, day, quote_text) VALUES (?, ?, ?) ON CONFLICT(guild_id, day) DO UPDATE SET quote_text = excluded.quote_text")
    .run(guild.id, day, quote.text);

  if (cat?.kind === "video") {
    await ch.send({ embeds: [embed], files: [{ attachment: cat.url, name: "gatito.mp4" }] }).catch(async () => {
      await ch.send({ embeds: [embed] });
    });
  } else {
    await ch.send({ embeds: [embed] });
  }
  return true;
}

export async function tickQuotes(client: { guilds: { cache: Map<string, any> } }): Promise<void> {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(new Date()),
  );
  if (hour < 10) return;
  for (const guild of client.guilds.cache.values()) {
    if (!guild.channels.cache.has(QUOTE_CHANNEL_ID)) continue;
    await postDailyQuote(guild).catch((err) => logger.error("frase del día", guild.id, err));
  }
}
