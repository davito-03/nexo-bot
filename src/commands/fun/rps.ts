import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { baseEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import type { Command } from "../../types/index.js";

const CHOICES = ["piedra", "papel", "tijera"] as const;
const EMOJI = { piedra: "🪨", papel: "📄", tijera: "✂️" };

export async function handleRpsButton(interaction: ButtonInteraction): Promise<void> {
  const pick = interaction.customId.split(":")[1] as (typeof CHOICES)[number];
  const bot = CHOICES[Math.floor(Math.random() * 3)]!;
  const res =
    pick === bot ? "Empate" : (pick === "piedra" && bot === "tijera") || (pick === "papel" && bot === "piedra") || (pick === "tijera" && bot === "papel")
      ? "¡Ganas!"
      : "Pierdes…";
  await interaction.update({
    embeds: [
      baseEmbed(COLORS.primary)
        .setTitle("Piedra, papel o tijera")
        .setDescription(`${interaction.user}: ${EMOJI[pick]} vs Neko: ${EMOJI[bot]}\n\n**${res}**`),
    ],
    components: [],
  });
}

const command: Command = {
  data: new SlashCommandBuilder().setName("rps").setDescription("Piedra, papel o tijera contra Neko"),
  async execute(interaction: ChatInputCommandInteraction) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      CHOICES.map((c) => new ButtonBuilder().setCustomId(`rps:${c}`).setLabel(c).setEmoji(EMOJI[c]).setStyle(ButtonStyle.Secondary)),
    );
    await interaction.reply({
      embeds: [baseEmbed(COLORS.primary).setTitle("¿Piedra, papel o tijera?").setDescription("Elige abajo.")],
      components: [row],
    });
  },
};

export default command;
