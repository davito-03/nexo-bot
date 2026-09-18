import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { baseEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { fetchJson } from "../../utils/http.js";
import type { Command } from "../../types/index.js";

const BOLA = [
  "Sí, clarísimo.",
  "Ni de locos.",
  "Pregúntale a un mod.",
  "Las estrellas (y los gatos) dicen que sí.",
  "Mmm… más tarde.",
  "Cuenta con ello.",
  "No apuestes tu nitro a eso.",
  "Miauuu sí.",
  "El universo gatuno duda.",
  "100% real no fake.",
];

const CHISTES = [
  "¿Qué le dice un gato a otro gato? ¡Somos in-gato-bles!",
  "¿Por qué el gato no usa el PC? Porque ya tiene un mouse.",
  "En Nexo no hay drama, solo miau-los entendimientos.",
  "¿Cómo se despide un gato? ¡Hasta miauego!",
];

const WYR = [
  ["Pasar un día siendo gato en Nexo", "Tener nitro gratis un mes"],
  ["VC 12 horas seguidas", "Chat 12 horas sin emojis"],
  ["Solo anime slice of life", "Solo shonen a gritos"],
  ["Ser el DJ del VC", "Ser el meme del día"],
];

const TRIVIA = [
  { q: "¿De qué país es el origen del anime como industria moderna?", a: ["Japón", "Corea", "China", "EEUU"], c: 0 },
  { q: "¿Cuántas vidas se dice que tiene un gato?", a: ["7", "9", "3", "1"], c: 1 },
  { q: "¿Qué juego popularizó el battle royale moderno?", a: ["Fortnite", "PUBG", "Apex", "Warzone"], c: 1 },
  { q: "¿Cómo se llama el gato de Chihiro?", a: ["Totoro", "Jiji", "No hay gato", "Gato-bus"], c: 2 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const ANIMALS: Record<string, { title: string; fail: string; image: () => Promise<string | undefined> }> = {
  gato: {
    title: "🐱 Gato",
    fail: "Los gatos están ocupados durmiendo. Prueba luego.",
    image: async () => {
      const data = await fetchJson<{ url: string }[]>("https://api.thecatapi.com/v1/images/search");
      return data[0]?.url;
    },
  },
  perro: {
    title: "🐶 Perro",
    fail: "Los perros se han ido a correr. Prueba luego.",
    image: async () => {
      const data = await fetchJson<{ message: string }>("https://dog.ceo/api/breeds/image/random");
      return data.message;
    },
  },
  zorro: {
    title: "🦊 Zorro",
    fail: "El zorro se escondió. Prueba luego.",
    image: async () => {
      const data = await fetchJson<{ image: string }>("https://randomfox.ca/floof/");
      return data.image;
    },
  },
  pato: {
    title: "🦆 Pato",
    fail: "Los patos están en el estanque. Prueba luego.",
    image: async () => {
      const data = await fetchJson<{ url: string }>("https://random-d.uk/api/random");
      return data.url;
    },
  },
  panda: {
    title: "🐼 Panda",
    fail: "El panda sigue comiendo bambú. Prueba luego.",
    image: async () => {
      const data = await fetchJson<{ image: string }>("https://some-random-api.com/animal/panda");
      return data.image;
    },
  },
  mapache: {
    title: "🦝 Mapache",
    fail: "El mapache se llevó la foto. Prueba luego.",
    image: async () => {
      const data = await fetchJson<{ image: string }>("https://some-random-api.com/animal/raccoon");
      return data.image;
    },
  },
  pajaro: {
    title: "🐦 Pájaro",
    fail: "Se han volado. Prueba luego.",
    image: async () => {
      const data = await fetchJson<{ image: string }>("https://some-random-api.com/animal/bird");
      return data.image;
    },
  },
  capibara: {
    title: "🐹 Capibara",
    fail: "El capibara está en el agua. Prueba luego.",
    image: async () => {
      const data = await fetchJson<{ data?: { url?: string }; url?: string }>(
        "https://api.capy.lol/v1/capybara?json=true",
      );
      return data.data?.url ?? data.url;
    },
  },
};

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("fun")
    .setDescription("Entretenimiento de Nexo")
    .addSubcommand((s) =>
      s
        .setName("8ball")
        .setDescription("Pregunta a la bola mágica")
        .addStringOption((o) => o.setName("pregunta").setDescription("Tu pregunta").setRequired(true)),
    )
    .addSubcommand((s) => s.setName("moneda").setDescription("Cara o cruz"))
    .addSubcommand((s) =>
      s
        .setName("dado")
        .setDescription("Tira un dado")
        .addIntegerOption((o) => o.setName("caras").setDescription("Caras").setMinValue(2).setMaxValue(1000)),
    )
    .addSubcommand((s) =>
      s
        .setName("ship")
        .setDescription("Compatibilidad")
        .addUserOption((o) => o.setName("uno").setDescription("Persona 1").setRequired(true))
        .addUserOption((o) => o.setName("dos").setDescription("Persona 2")),
    )
    .addSubcommand((s) => s.setName("gato").setDescription("Foto de gato"))
    .addSubcommand((s) => s.setName("perro").setDescription("Foto de perro"))
    .addSubcommand((s) => s.setName("zorro").setDescription("Foto de zorro"))
    .addSubcommand((s) => s.setName("pato").setDescription("Foto de pato"))
    .addSubcommand((s) => s.setName("panda").setDescription("Foto de panda"))
    .addSubcommand((s) => s.setName("mapache").setDescription("Foto de mapache"))
    .addSubcommand((s) => s.setName("pajaro").setDescription("Foto de pájaro"))
    .addSubcommand((s) => s.setName("capibara").setDescription("Foto de capibara"))
    .addSubcommand((s) => s.setName("chiste").setDescription("Chiste malo a propósito"))
    .addSubcommand((s) => s.setName("wyr").setDescription("Would you rather"))
    .addSubcommand((s) => s.setName("trivia").setDescription("Pregunta rápida"))
    .addSubcommand((s) =>
      s
        .setName("elegir")
        .setDescription("Elige entre opciones separadas por |")
        .addStringOption((o) => o.setName("opciones").setDescription("a | b | c").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("rate")
        .setDescription("Puntúa algo del 0 al 100")
        .addStringOption((o) => o.setName("cosa").setDescription("Qué puntuar").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("amor")
        .setDescription("Medidor de amor")
        .addUserOption((o) => o.setName("usuario").setDescription("Crush")),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const embed = baseEmbed(COLORS.primary);

    if (sub === "8ball") {
      embed.setTitle("🎱 8ball").setDescription(`**${interaction.options.getString("pregunta", true)}**\n\n${pick(BOLA)}`);
    } else if (sub === "moneda") {
      embed.setTitle("🪙 Moneda").setDescription(Math.random() < 0.5 ? "**Cara**" : "**Cruz**");
    } else if (sub === "dado") {
      const n = interaction.options.getInteger("caras") ?? 6;
      embed.setTitle("🎲 Dado").setDescription(`d${n} → **${1 + Math.floor(Math.random() * n)}**`);
    } else if (sub === "ship") {
      const a = interaction.options.getUser("uno", true);
      const b = interaction.options.getUser("dos") ?? interaction.user;
      const pct = Math.abs(hash(`${a.id}:${b.id}`)) % 101;
      const bar = "💖".repeat(Math.round(pct / 10)) + "🖤".repeat(10 - Math.round(pct / 10));
      embed.setTitle("💘 Ship").setDescription(`${a} + ${b}\n${bar} **${pct}%**`);
    } else if (sub in ANIMALS) {
      const animal = ANIMALS[sub]!;
      await interaction.deferReply();
      try {
        const url = await animal.image();
        embed.setTitle(animal.title).setImage(url ?? null);
        await interaction.editReply({ embeds: [embed] });
      } catch {
        await interaction.editReply({ content: animal.fail });
      }
      return;
    } else if (sub === "chiste") {
      embed.setTitle("😹").setDescription(pick(CHISTES));
    } else if (sub === "wyr") {
      const [x, y] = pick(WYR);
      embed.setTitle("🤔 ¿Qué prefieres?").setDescription(`**A)** ${x}\n**B)** ${y}`);
    } else if (sub === "trivia") {
      const t = pick(TRIVIA);
      embed
        .setTitle("📚 Trivia")
        .setDescription(`${t.q}\n\n${t.a.map((x, i) => `${["🇦", "🇧", "🇨", "🇩"][i]} ${x}`).join("\n")}`)
        .setFooter({ text: `Respuesta: ${t.a[t.c]} (spoiler, míralo después)` });
    } else if (sub === "elegir") {
      const opts = interaction.options.getString("opciones", true).split("|").map((s) => s.trim()).filter(Boolean);
      embed.setTitle("🎯 Eligo").setDescription(opts.length ? pick(opts) : "No hay opciones.");
    } else if (sub === "rate") {
      const cosa = interaction.options.getString("cosa", true);
      embed.setTitle("⭐ Rate").setDescription(`**${cosa}** vale **${Math.abs(hash(cosa)) % 101}/100** según Neko.`);
    } else if (sub === "amor") {
      const u = interaction.options.getUser("usuario") ?? interaction.user;
      const pct = Math.abs(hash(`${interaction.user.id}-love-${u.id}`)) % 101;
      embed.setTitle("💗 Amor").setDescription(`${interaction.user} → ${u}: **${pct}%**`);
    }

    await interaction.reply({ embeds: [embed] });
  },
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

export default command;
