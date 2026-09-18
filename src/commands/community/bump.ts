import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { COLORS, BUMP_CHANNEL_ID } from "../../constants.js";
import { getGuildBumpStreak, getBumpLeaderboard } from "../../modules/bump/engine.js";
import { n } from "../../modules/economy/engine.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("bump-racha")
    .setDescription("Consulta la racha actual de bumps en DISBOARD, el temporizador y el ranking de usuarios."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Este comando solo se puede usar dentro del servidor.", ephemeral: true });
      return;
    }

    const gid = interaction.guild.id;
    const streakData = getGuildBumpStreak(gid);
    const top = getBumpLeaderboard(gid, 5);

    const now = Date.now();
    const lastBump = streakData?.last_bump_at || 0;
    const cooldownMs = 2 * 60 * 60 * 1000;
    const nextBumpAt = lastBump + cooldownMs;
    const isReady = lastBump === 0 || now >= nextBumpAt;

    const embed = new EmbedBuilder()
      .setColor(0x24b7f7)
      .setTitle("🚀 Estado de Bumps · DISBOARD")
      .setDescription(
        `Apoya a **${interaction.guild.name}** ejecutando \`/bump\` en <#${BUMP_CHANNEL_ID}> para posicionar la comunidad y ganar NexoCoins.\n\n` +
        `**Recompensas:**\n` +
        `🪙 **2.000 NexoCoins** por bump realizado.\n` +
        `🔥 **+2.000 NexoCoins a mayores** por cada bump adicional si encadenas racha.\n` +
        `⚡ Si otro miembro hace el siguiente bump, interrumpe tu racha y comienza la suya.\n\n` +
        `**Estado actual de la racha:**\n` +
        (streakData && streakData.last_user_id && streakData.streak > 0
          ? `👑 **Líder de racha:** <@${streakData.last_user_id}>\n` +
            `🔥 **Racha:** **${streakData.streak}** ${streakData.streak === 1 ? "bump consecutivo" : "bumps consecutivos"}\n` +
            `🕒 **Último bump:** <t:${Math.floor(lastBump / 1000)}:R>\n` +
            `📊 **Total de bumps en el server:** **${streakData.total_bumps}**\n`
          : "💤 *Aún no hay ninguna racha activa.*\n") +
        `\n**Disponibilidad del próximo bump:**\n` +
        (isReady
          ? `✅ **¡Ya disponible!** Corre a <#${BUMP_CHANNEL_ID}> y usa \`/bump\` para reclamar tus monedas.`
          : `⏳ Disponible <t:${Math.floor(nextBumpAt / 1000)}:R> (<t:${Math.floor(nextBumpAt / 1000)}:t>).`),
      );

    if (top.length > 0) {
      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
      const lines = top.map((u, i) => {
        const medal = medals[i] || "🔹";
        return `${medal} <@${u.user_id}> · **${u.total_bumps}** bumps · Racha máx: **${u.highest_streak}** · Ganado: ${n(u.total_earned)}`;
      });
      embed.addFields({ name: "🏆 Top Bumpers del Servidor", value: lines.join("\n") });
    }

    embed.setFooter({ text: "Nexo · Sistema de Recompensas DISBOARD" });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
