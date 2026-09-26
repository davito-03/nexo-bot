import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type TextChannel,
  type VoiceBasedChannel,
} from "discord.js";
import type { NexoClient } from "../../client.js";
import { baseEmbed } from "../../utils/embeds.js";
import { COLORS, CHAT_GAMES_CHANNEL_ID } from "../../constants.js";
import { getEco, saveEco, addWallet, n, rng } from "../economy/engine.js";
import { checkUserAchievements } from "../economy/achievements.js";
import { getDb } from "../../database/index.js";
import { logger } from "../../logger.js";

interface ChatGameQuestion {
  type: "math" | "anagram" | "trivia" | "speed" | "drop";
  title: string;
  prompt: string;
  answers: string[];
  reward: number;
  btnLabel?: string;
  btnEmoji?: string;
}

const TRIVIA_POOL: { question: string; answers: string[] }[] = [
  { question: "¿Cuál es el planeta más grande del Sistema Solar?", answers: ["jupiter", "júpiter"] },
  { question: "¿Cuál es el país más grande del mundo en superficie?", answers: ["rusia"] },
  { question: "¿En qué año se fundó YouTube?", answers: ["2005"] },
  { question: "¿Cuál es el elemento químico con símbolo 'Au'?", answers: ["oro"] },
  { question: "¿Cuál es el océano más grande de la Tierra?", answers: ["pacifico", "pacífico", "el pacifico", "el pacífico"] },
  { question: "¿Cuántos lados tiene un heptágono?", answers: ["7", "siete"] },
  { question: "¿Quién pintó la Mona Lisa?", answers: ["leonardo da vinci", "da vinci", "leonardo"] },
  { question: "¿Cuál es el hueso más largo del cuerpo humano?", answers: ["femur", "fémur"] },
  { question: "¿En qué continente se encuentra Egipto?", answers: ["africa", "áfrica"] },
  { question: "¿Cuál es la capital de Japón?", answers: ["tokio", "tokyo"] },
  { question: "¿Cuál es el metal más abundante en la corteza terrestre?", answers: ["aluminio"] },
  { question: "¿Cuántos corazones tiene un pulpo?", answers: ["3", "tres"] },
  { question: "¿Qué instrumento musical tiene 88 teclas estándar?", answers: ["piano", "el piano"] },
  { question: "¿Cuál es el río más largo del mundo?", answers: ["amazonas", "el amazonas"] },
  { question: "¿Cuál es la moneda oficial del Reino Unido?", answers: ["libra", "libra esterlina"] },
  { question: "¿Cómo se llama el protagonista del anime 'Dragon Ball'?", answers: ["goku", "son goku"] },
  { question: "¿En qué videojuego aparece la ciudad sumergida de 'Rapture'?", answers: ["bioshock"] },
  { question: "¿Cuál es el Pokémon número 001 de la Pokédex Nacional?", answers: ["bulbasaur"] },
  { question: "¿Qué empresa desarrolló la saga de videojuegos 'The Witcher'?", answers: ["cd projekt", "cd projekt red"] },
  { question: "¿Cuál es el nombre del protagonista de 'Attack on Titan'?", answers: ["eren", "eren jaeger", "eren yeager"] },
  { question: "¿Qué significa la sigla 'CPU' en informática?", answers: ["unidad central de procesamiento", "central processing unit"] },
  { question: "¿En qué año se lanzó el primer iPhone?", answers: ["2007"] },
  { question: "¿Cuál es el nombre de la espada legendaria del Rey Arturo?", answers: ["excalibur"] },
  { question: "¿Cómo se llama el zorro de nueve colas sellado dentro de Naruto?", answers: ["kurama", "kyubi"] },
  { question: "¿Cuál es el gas más abundante en la atmósfera terrestre?", answers: ["nitrogeno", "nitrógeno"] },
  { question: "¿Quién es el hermano gemelo de Mario en Nintendo?", answers: ["luigi"] },
  { question: "¿Cuál es la velocidad de la luz en el vacío aproximada en km/s?", answers: ["300000", "300.000", "300 000"] },
  { question: "¿Qué estudio de animación creó la película 'El viaje de Chihiro'?", answers: ["ghibli", "estudio ghibli", "studio ghibli"] },
  { question: "¿Cómo se llama el androide protagonista de NieR:Automata?", answers: ["2b"] },
  { question: "¿Cuál es el mineral más duro de la escala de Mohs?", answers: ["diamante", "el diamante"] },
];

const ANAGRAM_POOL: { word: string; scrambled: string; hint: string }[] = [
  { word: "NEXOCOIN", scrambled: "N I O X E C O N", hint: "Moneda reina de este servidor" },
  { word: "DIAMANTE", scrambled: "E T N A M A I D", hint: "Mineral precioso muy brillante" },
  { word: "CRIPTO", scrambled: "P O R T I C", hint: "Tecnología de la minería de Nexo" },
  { word: "RULETA", scrambled: "A E L U T R", hint: "Juego clásico del casino" },
  { word: "FORTUNA", scrambled: "T A R U N O F", hint: "Riqueza o suerte favorable" },
  { word: "TESORO", scrambled: "O S R O T E", hint: "Botín enterrado o valioso" },
  { word: "LEVIATAN", scrambled: "T A V I A N E L", hint: "Criatura marina legendaria" },
  { word: "GALAXIA", scrambled: "A L A G I X A", hint: "Cúmulo inmenso de estrellas" },
  { word: "CYBERPUNK", scrambled: "P U N K Y B E R C", hint: "Género distópico futurista de alta tecnología" },
  { word: "MINERIA", scrambled: "A I R E N I M", hint: "Generación pasiva de criptomonedas" },
  { word: "POLICIA", scrambled: "I A C I L O P", hint: "Fuerzas del orden y patrullas de Nexo" },
  { word: "SHINOBI", scrambled: "B I N O H S I", hint: "Guerrero ninja sigiloso" },
];

const SPEED_PHRASES = [
  "gatitos y caos en el servidor de nexo",
  "la suerte favorece a los valientes en el casino",
  "el que no arriesga no gana nexocoins",
  "un shiba inu durmiendo bajo la luna llena",
  "el tesoro mas valioso es la comunidad de nexo",
  "la comunidad de nexo nunca duerme",
  "un cafe caliente para programar toda la noche",
  "el misterio de las profundidades marinas",
  "el dragon protege el tesoro del servidor",
  "un gato negro saltando por los tejados de noche",
];

const DROP_CONFIGS = [
  {
    title: "🐾 ¡Ha aparecido un Gatito Salvaje!",
    prompt: "¡Un travieso gatito ha saltado al canal cargado con una bolsa de NexoCoins!\n¡Pulsa el botón de abajo antes que nadie para adoptarlo y quedarte las monedas!",
    btnLabel: "¡Atrapar y adoptar gatito!",
    btnEmoji: "🐱",
  },
  {
    title: "💎 ¡Cofre del Tesoro Relámpago!",
    prompt: "¡Se ha caído un cofre brillante de suministros en el canal!\n¡El primer usuario en abrir el cofre se lleva el botín íntegro!",
    btnLabel: "¡Abrir cofre del tesoro!",
    btnEmoji: "📦",
  },
  {
    title: "⚡ ¡Drop de Fortuna de Neko!",
    prompt: "¡Neko ha lanzado una lluvia de fichas doradas al canal para premiar la actividad!\n¡Reclama tu premio antes de que desaparezca!",
    btnLabel: "¡Reclamar fichas de oro!",
    btnEmoji: "💰",
  },
];

function generateQuestion(): ChatGameQuestion {
  const typeRoll = rng(1, 5);

  if (typeRoll === 1) {
    const drop = DROP_CONFIGS[rng(0, DROP_CONFIGS.length - 1)]!;
    const reward = rng(1000, 2500);
    return {
      type: "drop",
      title: drop.title,
      prompt: drop.prompt,
      answers: [],
      reward,
      btnLabel: drop.btnLabel,
      btnEmoji: drop.btnEmoji,
    };
  }

  if (typeRoll === 2) {
    const phrase = SPEED_PHRASES[rng(0, SPEED_PHRASES.length - 1)]!;
    const reward = rng(1200, 2400);
    return {
      type: "speed",
      title: "⌨️ Tipeo Veloz",
      prompt: `¡Sé el primero en escribir la siguiente frase exacta en el chat!\n\n> **${phrase}**`,
      answers: [phrase.toLowerCase()],
      reward,
    };
  }

  if (typeRoll === 3) {
    const a = rng(12, 85);
    const b = rng(6, 25);
    const op = rng(1, 3);
    let questionStr = "";
    let ans = 0;
    if (op === 1) {
      questionStr = `${a} + ${b}`;
      ans = a + b;
    } else if (op === 2) {
      questionStr = `${a} - ${b}`;
      ans = a - b;
    } else {
      const smallA = rng(7, 19);
      const smallB = rng(6, 14);
      questionStr = `${smallA} × ${smallB}`;
      ans = smallA * smallB;
    }
    const reward = rng(900, 2000);
    return {
      type: "math",
      title: "🔢 Reto Matemático Exprés",
      prompt: `¿Cuánto es **${questionStr}**?`,
      answers: [String(ans)],
      reward,
    };
  }

  if (typeRoll === 4) {
    const item = ANAGRAM_POOL[rng(0, ANAGRAM_POOL.length - 1)]!;
    const reward = rng(1000, 2200);
    return {
      type: "anagram",
      title: "🔠 Palabra Desordenada",
      prompt: `Ordena las letras para formar la palabra correcta:\n## \`${item.scrambled}\`\n💡 Pista: *${item.hint}*`,
      answers: [item.word.toLowerCase()],
      reward,
    };
  }

  const item = TRIVIA_POOL[rng(0, TRIVIA_POOL.length - 1)]!;
  const reward = rng(1100, 2300);
  return {
    type: "trivia",
    title: "🧠 Trivia Relámpago",
    prompt: item.question,
    answers: item.answers,
    reward,
  };
}

let lastVoiceDropAt = Date.now() - 25 * 60_000;

function getNextChatGameScheduledTime(now = Date.now()): number {
  try {
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_games_state (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      );
    `);

    const row = db
      .prepare("SELECT value FROM chat_games_state WHERE key = 'next_event_at'")
      .get() as { value: number } | undefined;

    if (!row || !row.value || row.value <= 0) {
      // Programar aleatorio entre 1 y 12 horas
      const delayMs = rng(1 * 3600_000, 12 * 3600_000);
      const nextAt = now + delayMs;
      db.prepare("INSERT OR REPLACE INTO chat_games_state (key, value) VALUES ('next_event_at', ?)").run(nextAt);
      logger.info(`[ChatGames] Programado primer minijuego flash en ${(delayMs / 3600_000).toFixed(2)}h.`);
      return nextAt;
    }

    return row.value;
  } catch (e) {
    logger.error("Error al obtener próximo evento de chat_games", e);
    return now + 3600_000;
  }
}

function setNextChatGameScheduledTime(nextAt: number): void {
  try {
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_games_state (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      );
    `);
    db.prepare("INSERT OR REPLACE INTO chat_games_state (key, value) VALUES ('next_event_at', ?)").run(nextAt);
  } catch (e) {
    logger.error("Error al guardar próximo evento de chat_games", e);
  }
}

export async function runChatGame(channel: TextChannel, guildId: string): Promise<void> {
  const q = generateQuestion();

  if (q.type === "drop") {
    const btnId = `cg:drop:${Date.now()}`;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(btnId)
        .setLabel(q.btnLabel ?? "¡Reclamar premio!")
        .setEmoji(q.btnEmoji ?? "⚡")
        .setStyle(ButtonStyle.Success),
    );

    const embed = baseEmbed(COLORS.gold)
      .setTitle(`⚡ ${q.title}`)
      .setDescription(
        `${q.prompt}\n\n` +
          `🎁 **Recompensa:** **+${n(q.reward)}**\n` +
          `⏱️ ¡El primero que presione el botón gana! (Expira en 60 segundos)`,
      )
      .setFooter({ text: "Minijuego Flash · Nexo" });

    const msg = await channel.send({ embeds: [embed], components: [row] });

    try {
      const interaction = await msg.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 60_000,
        filter: (i) => i.customId === btnId && !i.user.bot,
      });

      const eco = getEco(guildId, interaction.user.id);
      addWallet(eco, q.reward);
      saveEco(eco);
      checkUserAchievements(guildId, interaction.user.id);

      const winEmbed = baseEmbed(COLORS.success)
        .setTitle("🎉 ¡Reclamado a la velocidad de la luz!")
        .setDescription(
          `¡Felicidades ${interaction.user}! Has sido el más rápido en reclamar el drop.\n` +
            `💰 **+${n(q.reward)}** añadidos a tu cartera.`,
        );

      await interaction.update({ embeds: [winEmbed], components: [] });
    } catch {
      await msg
        .edit({
          embeds: [baseEmbed(COLORS.danger).setDescription("⏱️ **Tiempo agotado.** El drop ha desaparecido sin que nadie lo reclamara.")],
          components: [],
        })
        .catch(() => null);
    }
    return;
  }

  // Text-based games
  const embed = baseEmbed(COLORS.primary)
    .setTitle(`⚡ ${q.title}`)
    .setDescription(
      `${q.prompt}\n\n` +
        `🎁 **Recompensa:** **+${n(q.reward)}**\n` +
        `⏱️ ¡El primer usuario en escribir la respuesta correcta en este chat gana! (Tienes 60 segundos)`,
    )
    .setFooter({ text: "Minijuego Flash · Nexo" });

  try {
    await channel.send({ embeds: [embed] });

    const collector = channel.createMessageCollector({
      filter: (m) => !m.author.bot,
      time: 60_000,
    });

    let winnerFound = false;

    collector.on("collect", async (m) => {
      if (winnerFound) return;
      const normalized = m.content.trim().toLowerCase();
      if (q.answers.some((ans) => normalized === ans || (q.type !== "math" && normalized.includes(ans)))) {
        winnerFound = true;
        collector.stop("won");

        const eco = getEco(guildId, m.author.id);
        addWallet(eco, q.reward);
        saveEco(eco);
        checkUserAchievements(guildId, m.author.id);

        const winEmbed = baseEmbed(COLORS.success)
          .setTitle("🎉 ¡Tenemos Ganador!")
          .setDescription(
            `¡Felicidades ${m.author}! Has sido el más rápido en acertar (**${m.content}**).\n` +
              `💰 Te has llevado **+${n(q.reward)}** directamente a tu cartera.`,
          );
        await m.reply({ embeds: [winEmbed] }).catch(() => null);
      }
    });

    collector.on("end", async (_collected, reason) => {
      if (reason !== "won" && !winnerFound) {
        await channel
          .send({
            embeds: [
              baseEmbed(COLORS.danger).setDescription(
                `⏱️ **Tiempo agotado.** Nadie acertó a tiempo. La respuesta correcta era: **${q.answers[0]}**.`,
              ),
            ],
          })
          .catch(() => null);
      }
    });
  } catch (e) {
    logger.error("Error en minijuego de chat", e);
  }
}

export async function tickChatGames(client: NexoClient): Promise<void> {
  const now = Date.now();
  const nextAt = getNextChatGameScheduledTime(now);

  if (now < nextAt) return;

  for (const guild of client.guilds.cache.values()) {
    // Buscar canal específico configurado (CHAT_GAMES_CHANNEL_ID: 1545577521540501534) o fallback
    let channel = guild.channels.cache.get(CHAT_GAMES_CHANNEL_ID) as TextChannel | undefined;
    if (!channel) {
      channel = guild.channels.cache.find(
        (c) =>
          c.isTextBased() &&
          "send" in c &&
          !c.isThread() &&
          (c.name.includes("economia") ||
            c.name.includes("general") ||
            c.name.includes("comunidad") ||
            c.name.includes("principal")),
      ) as TextChannel | undefined;
    }

    if (!channel) continue;

    // Programar el siguiente evento aleatorio entre 1 y 12 horas
    const nextInterval = rng(1 * 3600_000, 12 * 3600_000);
    const newNextAt = now + nextInterval;
    setNextChatGameScheduledTime(newNextAt);

    logger.info(
      `[ChatGames] Minijuego flash enviado a #${channel.name}. Próximo minijuego programado en ${(nextInterval / 3600_000).toFixed(2)}h (${new Date(newNextAt).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid" })} España).`,
    );

    await runChatGame(channel, guild.id);
  }
}

export async function tickVoiceDrops(client: NexoClient): Promise<void> {
  const now = Date.now();
  if (now - lastVoiceDropAt < 35 * 60_000) return;

  for (const guild of client.guilds.cache.values()) {
    const activeVoice = guild.channels.cache.filter((c) => {
      if (!c.isVoiceBased()) return false;
      const humans = c.members.filter((m) => !m.user.bot);
      return humans.size >= 2;
    }) as Map<string, VoiceBasedChannel>;

    if (activeVoice.size === 0) continue;

    const voiceChannels = Array.from(activeVoice.values());
    const targetChannel = voiceChannels[rng(0, voiceChannels.length - 1)]!;

    if (!("send" in targetChannel)) continue;

    lastVoiceDropAt = now;
    const dropAmount = rng(600, 1500);
    const dropId = `vdrop_${Date.now()}`;

    const embed = baseEmbed(COLORS.voice)
      .setTitle("🎁 ¡Cofre Aéreo de Voz!")
      .setDescription(
        `¡Un cofre con suministros ha caído en este canal de voz!\n\n` +
          `💰 **Contenido:** **${n(dropAmount)}**\n` +
          `⚡ **Requisito:** Estar conectado en esta llamada. ¡El primero en pulsar el botón lo abre!`,
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(dropId)
        .setLabel("🎁 Abrir Cofre")
        .setStyle(ButtonStyle.Success),
    );

    try {
      const msg = await (targetChannel as any).send({
        embeds: [embed],
        components: [row],
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 90_000,
      });

      collector.on("collect", async (i: any) => {
        if (i.customId !== dropId) return;

        const member = targetChannel.members.get(i.user.id);
        if (!member) {
          await i.reply({
            content: "❌ Debes estar conectado en esta llamada para poder reclamar el cofre.",
            ephemeral: true,
          });
          return;
        }

        collector.stop("claimed");

        const eco = getEco(guild.id, i.user.id);
        addWallet(eco, dropAmount);
        saveEco(eco);
        checkUserAchievements(guild.id, i.user.id);

        const claimedEmbed = baseEmbed(COLORS.success)
          .setTitle("🎉 ¡Cofre de Voz Reclamado!")
          .setDescription(
            `¡${i.user} ha sido el más rápido en abrir el cofre y se lleva **${n(dropAmount)}**!\n` +
              `Las monedas ya están en su cartera.`,
          );

        await i.update({
          embeds: [claimedEmbed],
          components: [],
        });
      });

      collector.on("end", async (_collected: any, reason: string) => {
        if (reason !== "claimed") {
          await msg.edit({
            embeds: [
              baseEmbed(COLORS.danger).setDescription(
                "💨 El cofre de voz se desvaneció sin que nadie lo abriera a tiempo.",
              ),
            ],
            components: [],
          }).catch(() => null);
        }
      });
    } catch (e) {
      logger.error("Error al enviar cofre de voz", e);
    }
  }
}
