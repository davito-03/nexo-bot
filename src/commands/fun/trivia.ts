import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { baseEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { getEco, saveEco, addWallet, n } from "../../modules/economy/engine.js";
import { addXp } from "../../modules/levels/engine.js";
import type { Command } from "../../types/index.js";

interface TriviaQuestion {
  category: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation?: string;
}

const QUESTIONS: TriviaQuestion[] = [
  // Gaming
  {
    category: "🎮 Videojuegos",
    question: "¿En qué año se lanzó el legendario 'Minecraft' por primera vez (versión alpha)?",
    options: ["2007", "2009", "2011", "2013"],
    correctIndex: 1,
    explanation: "Minecraft fue creado por Markus Persson (Notch) y lanzado en fase alfa en mayo de 2009.",
  },
  {
    category: "🎮 Videojuegos",
    question: "¿Cuál es el nombre de la ciudad sumergida en la que transcurre 'BioShock'?",
    options: ["Columbia", "Rapture", "Dunwall", "Black Mesa"],
    correctIndex: 1,
    explanation: "Rapture es la metrópolis submarina creada por Andrew Ryan en BioShock.",
  },
  {
    category: "🎮 Videojuegos",
    question: "¿Cómo se llama el reino principal gobernado por la Princesa Zelda?",
    options: ["Termina", "Lorule", "Hyrule", "Hytopia"],
    correctIndex: 2,
    explanation: "Hyrule es el reino donde se ambienta la mayoría de los juegos de The Legend of Zelda.",
  },
  {
    category: "🎮 Videojuegos",
    question: "¿Cuál de estos personajes NO es un Pokémon inicial de la región de Kanto?",
    options: ["Bulbasaur", "Charmander", "Totodile", "Squirtle"],
    correctIndex: 2,
    explanation: "Totodile es el inicial de agua de la región de Johto (2ª Generación).",
  },
  {
    category: "🎮 Videojuegos",
    question: "¿Qué estudio desarrolló 'The Witcher 3: Wild Hunt' y 'Cyberpunk 2077'?",
    options: ["Bethesda", "CD Projekt RED", "BioWare", "FromSoftware"],
    correctIndex: 1,
    explanation: "El estudio polaco CD Projekt RED es el creador de ambas franquicias.",
  },
  {
    category: "🎮 Videojuegos",
    question: "¿Cuál es el arma cuerpo a cuerpo insignia de Gordon Freeman en Half-Life?",
    options: ["Una palanca", "Un bate con clavos", "Una llave inglesa", "Un machete"],
    correctIndex: 0,
    explanation: "La emblemática palanca roja de hierro es el símbolo icónico de Gordon Freeman.",
  },

  // Anime y Manga
  {
    category: "⛩️ Anime & Manga",
    question: "¿Cómo se llama el zorro de nueve colas sellado dentro de Naruto Uzumaki?",
    options: ["Shukaku", "Gyuki", "Kurama", "Matatabi"],
    correctIndex: 2,
    explanation: "Kurama es el Kyubi (nueve colas) que acompaña a Naruto.",
  },
  {
    category: "⛩️ Anime & Manga",
    question: "¿Cuál es la fruta del diablo consumida por Monkey D. Luffy en One Piece?",
    options: ["Gomu Gomu no Mi", "Mera Mera no Mi", "Ope Ope no Mi", "Hito Hito no Mi"],
    correctIndex: 0,
    explanation: "Originalmente conocida por todos como la Gomu Gomu no Mi (tipo Paramecia/Zoan mítica).",
  },
  {
    category: "⛩️ Anime & Manga",
    question: "¿Quién es el autor original del manga 'Death Note'?",
    options: ["Tsugumi Ohba", "Eiichiro Oda", "Masashi Kishimoto", "Akira Toriyama"],
    correctIndex: 0,
    explanation: "Death Note fue escrito por Tsugumi Ohba e ilustrado por Takeshi Obata.",
  },
  {
    category: "⛩️ Anime & Manga",
    question: "¿Cómo se llama el protagonista del anime 'Attack on Titan' (Shingeki no Kyojin)?",
    options: ["Levi Ackerman", "Armin Arlert", "Eren Jaeger", "Erwin Smith"],
    correctIndex: 2,
    explanation: "Eren Jaeger es el protagonista de la historia de los titanes.",
  },
  {
    category: "⛩️ Anime & Manga",
    question: "¿En 'Dragon Ball Z', cuál es la primera transformación en Super Saiyan de Goku?",
    options: ["Contra Vegeta", "Contra Freezer", "Contra Célula", "Contra Majin Buu"],
    correctIndex: 1,
    explanation: "Goku despertó el Super Saiyan en el planeta Namek tras la muerte de Krilin a manos de Freezer.",
  },

  // Ciencia y Tecnología
  {
    category: "🔬 Ciencia & Tecnología",
    question: "¿Cuál es el elemento químico más abundante en el Universo observable?",
    options: ["Oxígeno", "Helio", "Hidrógeno", "Carbono"],
    correctIndex: 2,
    explanation: "El hidrógeno constituye aproximadamente el 75% de la masa bariónica del universo.",
  },
  {
    category: "🔬 Ciencia & Tecnología",
    question: "¿Qué significan las siglas 'GPU' en computación?",
    options: [
      "General Processing Unit",
      "Graphics Processing Unit",
      "Global Processor Utility",
      "Graphic Power Unleashed",
    ],
    correctIndex: 1,
    explanation: "GPU significa Graphics Processing Unit (Unidad de Procesamiento Gráfico).",
  },
  {
    category: "🔬 Ciencia & Tecnología",
    question: "¿A qué velocidad aproximada viaja la luz en el vacío?",
    options: ["150.000 km/s", "300.000 km/s", "500.000 km/s", "1.000.000 km/s"],
    correctIndex: 1,
    explanation: "La velocidad de la luz en el vacío es de aproximadamente 299.792 km por segundo.",
  },
  {
    category: "🔬 Ciencia & Tecnología",
    question: "¿Cuál es el planeta con mayor número de lunas confirmadas en nuestro sistema solar?",
    options: ["Júpiter", "Saturno", "Urano", "Neptuno"],
    correctIndex: 1,
    explanation: "Saturno cuenta con más de 140 lunas confirmadas oficialmente.",
  },

  // Cine y Series
  {
    category: "🎬 Cine & Series",
    question: "¿Quién dirigió la galardonada trilogía cinematográfica de 'El Señor de los Anillos'?",
    options: ["Steven Spielberg", "Christopher Nolan", "Peter Jackson", "James Cameron"],
    correctIndex: 2,
    explanation: "El director neozelandés Peter Jackson dirigió la obra maestra de Tolkien.",
  },
  {
    category: "🎬 Cine & Series",
    question: "¿Cómo se llama el mineral ficticio codiciado en el planeta Pandora en 'Avatar'?",
    options: ["Vibranium", "Unobtainium", "Beskar", "Adamantium"],
    correctIndex: 1,
    explanation: "El codiciado mineral superconductor a temperatura ambiente es el Unobtainium.",
  },
  {
    category: "🎬 Cine & Series",
    question: "¿Qué actor interpreta al legendario mafioso Michael Corleone en 'El Padrino'?",
    options: ["Robert De Niro", "Al Pacino", "Marlon Brando", "Joe Pesci"],
    correctIndex: 1,
    explanation: "Al Pacino inmortalizó a Michael Corleone a lo largo de la trilogía.",
  },

  // Cultura General y Geografía
  {
    category: "🌍 Cultura General",
    question: "¿Cuál es la capital oficial de Australia?",
    options: ["Sídney", "Melbourne", "Canberra", "Brisbane"],
    correctIndex: 2,
    explanation: "Aunque Sídney y Melbourne son más pobladas, la capital federal es Canberra.",
  },
  {
    category: "🌍 Cultura General",
    question: "¿Cuál es el río más largo y caudaloso del planeta Tierra?",
    options: ["Nilo", "Amazonas", "Misisipi", "Yangtsé"],
    correctIndex: 1,
    explanation: "El río Amazonas en América del Sur es el más largo y caudaloso del mundo.",
  },
  {
    category: "🌍 Cultura General",
    question: "¿En qué año cayó el Muro de Berlín?",
    options: ["1987", "1989", "1991", "1993"],
    correctIndex: 1,
    explanation: "El histórico Muro de Berlín cayó la noche del 9 de noviembre de 1989.",
  },
];

const userCooldowns = new Map<string, number>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Pon a prueba tus conocimientos en un concurso interactivo y gana NexoCoins")
    .addStringOption((o) =>
      o
        .setName("categoria")
        .setDescription("Filtra las preguntas por temática")
        .setRequired(false)
        .addChoices(
          { name: "🎮 Videojuegos", value: "videojuegos" },
          { name: "⛩️ Anime & Manga", value: "anime" },
          { name: "🔬 Ciencia & Tecnología", value: "ciencia" },
          { name: "🎬 Cine & Series", value: "cine" },
          { name: "🌍 Cultura General", value: "cultura" },
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Este comando solo está disponible en el servidor.", ephemeral: true });
      return;
    }

    const userId = interaction.user.id;
    const now = Date.now();
    const lastPlayed = userCooldowns.get(userId) ?? 0;
    const COOLDOWN_SEC = 25;

    if (now - lastPlayed < COOLDOWN_SEC * 1000) {
      const waitLeft = Math.ceil((COOLDOWN_SEC * 1000 - (now - lastPlayed)) / 1000);
      await interaction.reply({
        content: `⏳ Debes esperar **${waitLeft} segundos** antes de jugar otra ronda de trivia.`,
        ephemeral: true,
      });
      return;
    }

    const catFilter = interaction.options.getString("categoria");
    let pool = QUESTIONS;
    if (catFilter === "videojuegos") pool = QUESTIONS.filter((q) => q.category.includes("Videojuegos"));
    else if (catFilter === "anime") pool = QUESTIONS.filter((q) => q.category.includes("Anime"));
    else if (catFilter === "ciencia") pool = QUESTIONS.filter((q) => q.category.includes("Ciencia"));
    else if (catFilter === "cine") pool = QUESTIONS.filter((q) => q.category.includes("Cine"));
    else if (catFilter === "cultura") pool = QUESTIONS.filter((q) => q.category.includes("Cultura"));

    const q = pool[Math.floor(Math.random() * pool.length)]!;
    userCooldowns.set(userId, now);

    const letters = ["A", "B", "C", "D"];
    const rewardCoins = 250;
    const rewardXp = 40;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      q.options.map((opt, idx) =>
        new ButtonBuilder()
          .setCustomId(`trivia_${idx}`)
          .setLabel(`${letters[idx]}. ${opt.slice(0, 75)}`)
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    const embed = baseEmbed(COLORS.primary)
      .setTitle(`🧠 Trivia Nexo · ${q.category}`)
      .setDescription(
        `### ${q.question}\n\n` +
          `Pulsa el botón con la opción que creas correcta en los próximos **20 segundos**.\n` +
          `💰 **Premio:** **${n(rewardCoins)}** + **${rewardXp} XP**`,
      )
      .setFooter({ text: `Ronda de ${interaction.user.username} · Tienes 20s para responder` });

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 20_000,
      filter: (btn: ButtonInteraction) => {
        if (btn.user.id !== userId) {
          btn.reply({ content: "❌ Esta ronda de trivia pertenece a otro usuario.", ephemeral: true }).catch(() => {});
          return false;
        }
        return true;
      },
    });

    collector.on("collect", async (btn: ButtonInteraction) => {
      collector.stop("answered");
      const selectedIdx = Number.parseInt(btn.customId.replace("trivia_", ""), 10);
      const isCorrect = selectedIdx === q.correctIndex;

      // Actualizar botones mostrando verde en la correcta y rojo si falló
      const updatedButtons = q.options.map((opt, idx) => {
        const b = new ButtonBuilder()
          .setCustomId(`trivia_done_${idx}`)
          .setLabel(`${letters[idx]}. ${opt.slice(0, 75)}`)
          .setDisabled(true);

        if (idx === q.correctIndex) {
          b.setStyle(ButtonStyle.Success);
        } else if (idx === selectedIdx && !isCorrect) {
          b.setStyle(ButtonStyle.Danger);
        } else {
          b.setStyle(ButtonStyle.Secondary);
        }
        return b;
      });

      const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(updatedButtons);

      if (isCorrect) {
        const eco = getEco(interaction.guildId!, userId);
        addWallet(eco, rewardCoins);
        saveEco(eco);
        await addXp(interaction.member, rewardXp, "message").catch(() => {});

        const winEmbed = baseEmbed(COLORS.success)
          .setTitle("🎉 ¡Respuesta Correcta!")
          .setDescription(
            `### ${q.question}\n\n` +
              `✅ **¡Acertaste!** La respuesta correcta era **${letters[q.correctIndex]}. ${q.options[q.correctIndex]}**.\n\n` +
              (q.explanation ? `💡 *${q.explanation}*\n\n` : "") +
              `🎁 **Recompensas obtenidas:**\n` +
              `▸ +**${n(rewardCoins)}** añadidos a tu cartera.\n` +
              `▸ +**${rewardXp} XP** para tu nivel de servidor.`,
          );

        await btn.update({ embeds: [winEmbed], components: [updatedRow] }).catch(() => {});
      } else {
        const loseEmbed = baseEmbed(COLORS.danger)
          .setTitle("❌ Respuesta Incorrecta")
          .setDescription(
            `### ${q.question}\n\n` +
              `Has elegido **${letters[selectedIdx]}. ${q.options[selectedIdx]}**.\n` +
              `La respuesta correcta era: **${letters[q.correctIndex]}. ${q.options[q.correctIndex]}**.\n\n` +
              (q.explanation ? `💡 *${q.explanation}*\n\n` : "") +
              `¡Más suerte en la próxima ronda!`,
          );

        await btn.update({ embeds: [loseEmbed], components: [updatedRow] }).catch(() => {});
      }
    });

    collector.on("end", async (_collected, reason) => {
      if (reason !== "answered") {
        const disabledButtons = q.options.map((opt, idx) =>
          new ButtonBuilder()
            .setCustomId(`trivia_timeout_${idx}`)
            .setLabel(`${letters[idx]}. ${opt.slice(0, 75)}`)
            .setStyle(idx === q.correctIndex ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(true),
        );
        const timeoutRow = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledButtons);

        const timeoutEmbed = baseEmbed(COLORS.danger)
          .setTitle("⏱️ Tiempo Agotado")
          .setDescription(
            `### ${q.question}\n\n` +
              `No respondiste a tiempo. La respuesta correcta era: **${letters[q.correctIndex]}. ${q.options[q.correctIndex]}**.\n` +
              (q.explanation ? `💡 *${q.explanation}*` : ""),
          );

        await response.edit({ embeds: [timeoutEmbed], components: [timeoutRow] }).catch(() => {});
      }
    });
  },
};

export default command;
