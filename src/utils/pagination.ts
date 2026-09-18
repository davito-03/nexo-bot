import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
  type InteractionReplyOptions,
} from "discord.js";

export async function paginate(
  interaction: ChatInputCommandInteraction,
  pages: EmbedBuilder[],
  ephemeral = false,
): Promise<void> {
  if (pages.length === 0) {
    await interaction.reply({ content: "No hay nada que mostrar.", ephemeral: true });
    return;
  }
  if (pages.length === 1) {
    await interaction.reply({ embeds: [pages[0]], ephemeral });
    return;
  }

  let index = 0;
  const row = (i: number) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("pg:prev").setEmoji("◀️").setStyle(ButtonStyle.Secondary).setDisabled(i === 0),
      new ButtonBuilder()
        .setCustomId("pg:next")
        .setEmoji("▶️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(i === pages.length - 1),
    );

  const payload: InteractionReplyOptions = {
    embeds: [pages[0].setFooter({ text: `Página 1/${pages.length}` })],
    components: [row(0)],
    ephemeral,
  };
  const msg = await interaction.reply({ ...payload, fetchReply: true });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120_000,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (i) => {
    index = i.customId === "pg:next" ? Math.min(pages.length - 1, index + 1) : Math.max(0, index - 1);
    await i.update({
      embeds: [pages[index].setFooter({ text: `Página ${index + 1}/${pages.length}` })],
      components: [row(index)],
    });
  });

  collector.on("end", async () => {
    try {
      await msg.edit({ components: [] });
    } catch {
      /* ignore */
    }
  });
}
