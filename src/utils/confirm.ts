import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
  type EmbedBuilder,
} from "discord.js";

export async function confirmAction(
  interaction: ChatInputCommandInteraction,
  embed: EmbedBuilder,
  timeoutMs = 30_000,
): Promise<boolean> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("confirm:yes").setLabel("Confirmar").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("confirm:no").setLabel("Cancelar").setStyle(ButtonStyle.Secondary),
  );
  const msg = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });
  try {
    const btn = await msg.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: timeoutMs,
      filter: (i) => i.user.id === interaction.user.id,
    });
    const ok = btn.customId === "confirm:yes";
    await btn.update({
      content: ok ? "Confirmado." : "Cancelado.",
      embeds: [],
      components: [],
    });
    return ok;
  } catch {
    await interaction.editReply({ content: "Tiempo agotado.", embeds: [], components: [] }).catch(() => null);
    return false;
  }
}
