import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { baseEmbed, onlyGuild } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { ACHIEVEMENTS, checkUserAchievements, getUserAchievements, getEquippedTitle } from "../../modules/economy/achievements.js";
import { n } from "../../modules/economy/engine.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("logros")
    .setDescription("Consulta tus logros conseguidos y títulos cosméticos desbloqueados")
    .addUserOption((o) => o.setName("usuario").setDescription("Ver logros de otro miembro")),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
    const gid = interaction.guild.id;

    // Verificar si cumple algún logro pendiente al consultar
    checkUserAchievements(gid, targetUser.id);

    const userUnlocked = getUserAchievements(gid, targetUser.id);
    const unlockedMap = new Map(userUnlocked.map((u) => [u.achievement.id, u.unlockedAt]));
    const totalCount = ACHIEVEMENTS.length;
    const unlockedCount = userUnlocked.length;
    const pct = Math.round((unlockedCount / totalCount) * 100);

    const equipped = getEquippedTitle(gid, targetUser.id);

    const embed = baseEmbed(COLORS.primary)
      .setTitle(`🏆 Vitrina de Logros · ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
      .setDescription(
        `Progreso: **${unlockedCount}/${totalCount}** (${pct}%)\n` +
          `Título activo: **${equipped ?? "*(Ninguno equipado - usa /titulos)*"}**\n\n` +
          `Completa hazañas de economía, minería, casino y comunidad para ganar títulos y recompensas.`,
      );

    for (const ach of ACHIEVEMENTS) {
      const unlockedAt = unlockedMap.get(ach.id);
      const isDone = Boolean(unlockedAt);
      const statusEmoji = isDone ? "✅" : "🔒";
      const dateStr = unlockedAt ? ` · Desbloqueado <t:${Math.floor(unlockedAt / 1000)}:R>` : "";

      embed.addFields({
        name: `${statusEmoji} ${ach.emoji} ${ach.name}${dateStr}`,
        value: `> *${ach.description}*\n> Título: \`${ach.titleReward}\` · Premio: ${n(ach.coinReward)}`,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
