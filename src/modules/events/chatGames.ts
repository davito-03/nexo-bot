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
import { COLORS } from "../../constants.js";
import { getEco, saveEco, addWallet, n, rng } from "../economy/engine.js";
import { checkUserAchievements } from "../economy/achievements.js";
import { logger } from "../../logger.js";

interface ChatGameQuestion {
  type: "math" | "anagram" | "trivia" | "speed";
  title: string;
  prompt: string;
  answers: string[];
  reward: number;
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
];

function generateQuestion(): ChatGameQuestion {
  const typeRoll = rng(1, 3);

  if (typeRoll === 1) {
    // Math
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
    const reward = rng(800, 1600);
    return {
      type: "math",
      title: "🔢 Reto Matemático Exprés",
      prompt: `¿Cuánto es **${questionStr}**?`,
      answers: [String(ans)],
      reward,
    };
  }

  if (typeRoll === 2) {
    // Anagram
    const item = ANAGRAM_POOL[rng(0, ANAGRAM_POOL.length - 1)]!;
    const reward = rng(900, 1800);
    return {
      type: "anagram",
      title: "🔠 Palabra Desordenada",
      prompt: `Ordena las letras para formar la palabra correcta:\n## \`${item.scrambled}\`\n💡 Pista: *${item.hint}*`,
      answers: [item.word.toLowerCase()],
      reward,
    };
  }

  // Trivia
  const item = TRIVIA_POOL[rng(0, TRIVIA_POOL.length - 1)]!;
  const reward = rng(1000, 2000);
  return {
    type: "trivia",
    title: "🧠 Trivia Relámpago",
    prompt: item.question,
    answers: item.answers,
    reward,
  };
}

let lastChatEventAt = Date.now() - 30 * 60_000;
let lastVoiceDropAt = Date.now() - 25 * 60_000;

export async function tickChatGames(client: NexoClient): Promise<void> {
  const now = Date.now();
  // Disparar cada 45 minutos aproximadamente
  if (now - lastChatEventAt < 45 * 60_000) return;

  for (const guild of client.guilds.cache.values()) {
    // Buscar un canal de chat activo o general
    const channel = guild.channels.cache.find(
      (c) =>
        c.isTextBased() &&
        "send" in c &&
        !c.isThread() &&
        (c.name.includes("chat") ||
          c.name.includes("general") ||
          c.name.includes("comunidad") ||
          c.name.includes("principal")),
    ) as TextChannel | undefined;

    if (!channel) continue;

    lastChatEventAt = now;
    const q = generateQuestion();

    const embed = baseEmbed(COLORS.primary)
      .setTitle(`⚡ ${q.title}`)
      .setDescription(
        `${q.prompt}\n\n` +
          `🎁 **Premio:** **${n(q.reward)}**\n` +
          `⏱️ ¡El primer usuario en escribir la respuesta correcta en este chat gana! (Tienes 60 segundos)`,
      )
      .setFooter({ text: "Minijuego dinámico de Nexo" });

    try {
      const msg = await channel.send({ embeds: [embed] });

      const collector = channel.createMessageCollector({
        filter: (m) => !m.author.bot,
        time: 60_000,
      });

      let winnerFound = false;

      collector.on("collect", async (m) => {
        if (winnerFound) return;
        const normalized = m.content.trim().toLowerCase();
        if (q.answers.some((ans) => normalized === ans || normalized.includes(ans))) {
          winnerFound = true;
          collector.stop("won");

          const eco = getEco(guild.id, m.author.id);
          addWallet(eco, q.reward);
          saveEco(eco);
          checkUserAchievements(guild.id, m.author.id);

          const winEmbed = baseEmbed(COLORS.success)
            .setTitle("🎉 ¡Tenemos Ganador!")
            .setDescription(
              `¡Felicidades ${m.author}! Has sido el más rápido en acertar (**${m.content}**).\n` +
                `Te has llevado **${n(q.reward)}** directamente a tu cartera.`,
            );
          await m.reply({ embeds: [winEmbed] }).catch(() => null);
        }
      });

      collector.on("end", async (_collected, reason) => {
        if (reason !== "won" && !winnerFound) {
          await channel.send({
            embeds: [
              baseEmbed(COLORS.danger).setDescription(
                `⏱️ **Tiempo agotado.** Nadie acertó a tiempo. La respuesta correcta era: **${q.answers[0]}**.`,
              ),
            ],
          }).catch(() => null);
        }
      });
    } catch (e) {
      logger.error("Error en minijuego de chat", e);
    }
  }
}

export async function tickVoiceDrops(client: NexoClient): Promise<void> {
  const now = Date.now();
  // Disparar cada 35 minutos
  if (now - lastVoiceDropAt < 35 * 60_000) return;

  for (const guild of client.guilds.cache.values()) {
    // Buscar canales de voz activos con al menos 2 personas no bot
    const activeVoice = guild.channels.cache.filter((c) => {
      if (!c.isVoiceBased()) return false;
      const humans = c.members.filter((m) => !m.user.bot);
      return humans.size >= 2;
    }) as Map<string, VoiceBasedChannel>;

    if (activeVoice.size === 0) continue;

    // Escoger uno de los canales de voz activos
    const voiceChannels = Array.from(activeVoice.values());
    const targetChannel = voiceChannels[rng(0, voiceChannels.length - 1)]!;

    // Si el canal de voz permite enviar mensajes de texto directamente
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

        // Comprobar si el usuario está actualmente en este canal de voz
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
