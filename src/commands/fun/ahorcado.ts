import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../../types/index.js";
import type { NexoClient } from "../../client.js";
import { infoEmbed, successEmbed, errorEmbed, baseEmbed } from "../../utils/embeds.js";
import { getEco, saveEco, addWallet, n } from "../../modules/economy/engine.js";
import { COLORS } from "../../constants.js";

const WORDS = [
  { w: "perro", c: "Animales" }, { w: "gato", c: "Animales" }, { w: "elefante", c: "Animales" }, { w: "tigre", c: "Animales" }, { w: "leon", c: "Animales" },
  { w: "manzana", c: "Comida" }, { w: "platano", c: "Comida" }, { w: "pizza", c: "Comida" }, { w: "hamburguesa", c: "Comida" }, { w: "sushi", c: "Comida" },
  { w: "espana", c: "Países" }, { w: "mexico", c: "Países" }, { w: "argentina", c: "Países" }, { w: "colombia", c: "Países" }, { w: "japon", c: "Países" },
  { w: "ordenador", c: "Objetos" }, { w: "telefono", c: "Objetos" }, { w: "teclado", c: "Objetos" }, { w: "raton", c: "Objetos" }, { w: "monitor", c: "Objetos" },
  { w: "rapido", c: "Adjetivos" }, { w: "lento", c: "Adjetivos" }, { w: "fuerte", c: "Adjetivos" }, { w: "debil", c: "Adjetivos" }, { w: "inteligente", c: "Adjetivos" },
  { w: "jirafa", c: "Animales" }, { w: "rinoceronte", c: "Animales" }, { w: "cocodrilo", c: "Animales" }, { w: "hipopotamo", c: "Animales" }, { w: "pinguino", c: "Animales" },
  { w: "chocolate", c: "Comida" }, { w: "helado", c: "Comida" }, { w: "galleta", c: "Comida" }, { w: "ensalada", c: "Comida" }, { w: "espaguetis", c: "Comida" },
  { w: "francia", c: "Países" }, { w: "italia", c: "Países" }, { w: "alemania", c: "Países" }, { w: "brasil", c: "Países" }, { w: "chile", c: "Países" },
  { w: "silla", c: "Objetos" }, { w: "mesa", c: "Objetos" }, { w: "ventana", c: "Objetos" }, { w: "puerta", c: "Objetos" }, { w: "cuadro", c: "Objetos" },
  { w: "hermoso", c: "Adjetivos" }, { w: "feo", c: "Adjetivos" }, { w: "grande", c: "Adjetivos" }, { w: "pequeno", c: "Adjetivos" }, { w: "brillante", c: "Adjetivos" },
];

const HANGMAN_PICS = [
  "```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========\n```",
  "```\n  +---+\n  |   |\n  😵  |\n      |\n      |\n      |\n=========\n```",
  "```\n  +---+\n  |   |\n  😵  |\n  |   |\n      |\n      |\n=========\n```",
  "```\n  +---+\n  |   |\n  😵  |\n /|   |\n      |\n      |\n=========\n```",
  "```\n  +---+\n  |   |\n  😵  |\n /|\\  |\n      |\n      |\n=========\n```",
  "```\n  +---+\n  |   |\n  😵  |\n /|\\  |\n /    |\n      |\n=========\n```",
  "```\n  +---+\n  |   |\n  😵  |\n /|\\  |\n / \\  |\n      |\n=========\n```",
];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ahorcado")
    .setDescription("Inicia una partida de ahorcado en el canal"),
  async execute(interaction: ChatInputCommandInteraction, client: NexoClient) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Este comando solo funciona en un servidor.", ephemeral: true });
      return;
    }

    const wordObj = WORDS[Math.floor(Math.random() * WORDS.length)];
    const word = wordObj.w;
    const category = wordObj.c;
    
    let lives = 7;
    const guessedLetters = new Set<string>();
    
    const getMaskedWord = () => {
      return word.split("").map(l => guessedLetters.has(l) ? l.toUpperCase() : "⬜").join(" ");
    };
    
    const buildEmbed = () => {
      const stageIndex = 7 - lives;
      const pic = HANGMAN_PICS[stageIndex] || HANGMAN_PICS[6];
      
      const embed = baseEmbed()
        .setTitle("🔤 Juego del Ahorcado")
        .setDescription(`**Categoría:** ${category}\n\n${pic}\n\n**Palabra:**\n\n${getMaskedWord()}\n\n**Vidas:** ${lives} ❤️\n**Letras usadas:** ${Array.from(guessedLetters).join(", ") || "Ninguna"}`)
        .setColor(COLORS.info)
        .setFooter({ text: "Escribe una letra o la palabra completa en el chat." });
      return embed;
    };

    await interaction.reply({ embeds: [buildEmbed()] });
    const msg = await interaction.fetchReply();

    const filter = (m: any) => !m.author.bot;
    const collector = interaction.channel!.createMessageCollector({ filter, time: 60000, idle: 60000 });

    collector.on("collect", async (m) => {
      const guess = m.content.toLowerCase().trim();
      
      if (guess.length === word.length && guess === word) {
        // Instant win by guessing full word
        word.split("").forEach(l => guessedLetters.add(l));
        collector.stop("win");
        return;
      }
      
      if (guess.length === 1 && guess.match(/[a-z]/)) {
        if (guessedLetters.has(guess)) {
          // Already guessed, ignore to avoid spam
          return;
        }
        
        guessedLetters.add(guess);
        
        if (!word.includes(guess)) {
          lives--;
        }
        
        const hasWon = word.split("").every(l => guessedLetters.has(l));
        
        if (hasWon) {
          collector.stop("win");
        } else if (lives <= 0) {
          collector.stop("lose");
        } else {
          // Reset idle timer
          collector.resetTimer({ idle: 60000 });
          await msg.edit({ embeds: [buildEmbed()] }).catch(() => {});
        }
        
        // Try to delete user's message to keep channel clean
        if (m.deletable) m.delete().catch(() => {});
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "win") {
        const winner = collected.last()?.author;
        if (!winner) return; // Should not happen
        
        const reward = 500 + (lives * 100) + Math.floor(Math.random() * 500); // 500-1500 approx depending on lives
        
        const guildId = interaction.guildId!;
        const eco = getEco(guildId, winner.id);
        addWallet(eco, reward);
        saveEco(eco);
        
        const stageIndex = 7 - lives;
        const pic = HANGMAN_PICS[stageIndex] || HANGMAN_PICS[6];
        
        const embed = successEmbed(`¡<@${winner.id}> ha adivinado la palabra!\n\n**La palabra era:** ${word.toUpperCase()}\n\n💰 Premio: **${n(reward)}** nexocoins`)
          .setTitle("🏆 ¡Fin del Juego! - ¡Victoria!")
          .setDescription(`**Categoría:** ${category}\n\n${pic}\n\n**Palabra:**\n\n${word.split("").map(l=>l.toUpperCase()).join(" ")}`);
          
        await msg.edit({ embeds: [embed] }).catch(() => {});
      } else if (reason === "lose") {
        const embed = errorEmbed(`¡Os habéis quedado sin vidas!\n\n**La palabra era:** ${word.toUpperCase()}`)
          .setTitle("💀 ¡Fin del Juego! - ¡Derrota!")
          .setDescription(`**Categoría:** ${category}\n\n${HANGMAN_PICS[6]}`);
          
        await msg.edit({ embeds: [embed] }).catch(() => {});
      } else {
        const embed = errorEmbed(`Se acabó el tiempo.\n\n**La palabra era:** ${word.toUpperCase()}`)
          .setTitle("⏱️ ¡Fin del Juego! - ¡Tiempo Agotado!");
        await msg.edit({ embeds: [embed] }).catch(() => {});
      }
    });
  }
};
export default command;
