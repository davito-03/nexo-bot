import { ChannelType, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getGuildConfig, setGuildConfig } from "../../database/index.js";
import { panelComponents, panelEmbed } from "../../modules/voicemaster/manager.js";
import { requireAdmin } from "../../utils/permissions.js";
import { baseEmbed, errorEmbed, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { formatVoiceTime, getVoiceStats, topCompanions } from "../../modules/voice/profile.js";
import { claimVoiceStreakReward } from "../../modules/voice/voiceRewards.js";
import { n } from "../../modules/economy/engine.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("voz")
    .setDescription("Canales de voz temporales y estadísticas de voicechat")
    .addSubcommand((s) =>
      s
        .setName("perfil")
        .setDescription("Tiempo en VC, racha y compañeros de sala")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario")),
    )
    .addSubcommand((s) =>
      s.setName("reclamar").setDescription("Reclama tu recompensa diaria en NexoCoins por tu racha en llamadas de voz"),
    )
    .addSubcommand((s) =>
      s
        .setName("setup")
        .setDescription("Admin: Crear el canal ➕ Crear sala y el panel")
        .addChannelOption((o) =>
          o.setName("categoria").setDescription("Categoría donde nacerán las salas").addChannelTypes(ChannelType.GuildCategory),
        ),
    )
    .addSubcommand((s) => s.setName("panel").setDescription("Admin: Reenviar el panel de control"))
    .addSubcommand((s) =>
      s
        .setName("plantilla")
        .setDescription("Admin: Nombre de las salas ({user} = nick)")
        .addStringOption((o) => o.setName("texto").setDescription("Ej: 🔊 {user}").setRequired(true)),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }
    const guild = interaction.guild!;
    const sub = interaction.options.getSubcommand();
    const cfg = getGuildConfig(guild.id);

    if (sub === "perfil") {
      const user = interaction.options.getUser("usuario") ?? interaction.user;
      const st = getVoiceStats(guild.id, user.id);
      const mates = topCompanions(guild.id, user.id, 5);
      const lines = await Promise.all(
        mates.map(async (m, i) => {
          const u = await interaction.client.users.fetch(m.other).catch(() => null);
          return `${i + 1}. ${u ? u.username : m.other} · ${formatVoiceTime(m.seconds)}`;
        }),
      );
      await interaction.reply({
        embeds: [
          baseEmbed(COLORS.voice)
            .setTitle(`🔊 VC de ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ size: 128 }))
            .addFields(
              { name: "Esta semana", value: formatVoiceTime(st.week_seconds), inline: true },
              { name: "Total", value: formatVoiceTime(st.total_seconds), inline: true },
              { name: "Racha", value: st.streak ? `🔥 **${st.streak}** día(s)` : "—", inline: true },
              { name: "Compañeros de sala (semana)", value: lines.join("\n") || "Aún no comparte sala con nadie." },
            ),
        ],
      });
      return;
    }

    if (sub === "reclamar") {
      const res = claimVoiceStreakReward(guild.id, interaction.user.id);
      if (!res.success) {
        await interaction.reply({
          embeds: [errorEmbed("Racha de voz", res.message)],
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        embeds: [
          baseEmbed(COLORS.success)
            .setTitle("🎙️ ¡Recompensa de Voz Reclamada!")
            .setDescription(
              `¡Has reclamado **${n(res.reward!)}** por tu actividad en llamadas!\n\n` +
                `🔥 **Racha actual:** ${res.streak} día(s) consecutivos\n` +
                `💡 Sigue conectándote a llamadas cada día para aumentar el multiplicador de tu recompensa diaria.`,
            ),
        ],
      });
      return;
    }

    const admin = await requireAdmin(interaction);
    if (!admin) return;

    if (sub === "setup") {
      const parent = interaction.options.getChannel("categoria");
      const hub = await guild.channels.create({
        name: "➕ Crear sala",
        type: ChannelType.GuildVoice,
        parent: parent?.id ?? undefined,
        reason: "Hub VoiceMaster Nexo",
      });
      setGuildConfig(guild.id, {
        voicemaster: {
          ...cfg.voicemaster,
          hubId: hub.id,
          categoryId: parent?.id ?? hub.parentId,
        },
      });
      await interaction.reply({
        embeds: [successEmbed("VoiceMaster listo", `Entra a ${hub} para crear tu sala.`)],
        components: [],
      });
      if (interaction.channel && interaction.channel.isTextBased() && "send" in interaction.channel) {
        await interaction.channel.send({ embeds: [panelEmbed()], components: panelComponents() });
      }
      return;
    }

    if (sub === "panel") {
      if (!interaction.channel?.isTextBased() || !("send" in interaction.channel)) {
        await interaction.reply({ embeds: [errorEmbed("Usa esto en un canal de texto")], ephemeral: true });
        return;
      }
      await interaction.channel.send({ embeds: [panelEmbed()], components: panelComponents() });
      await interaction.reply({ content: "Panel enviado.", ephemeral: true });
      return;
    }

    if (sub === "plantilla") {
      const texto = interaction.options.getString("texto", true);
      setGuildConfig(guild.id, { voicemaster: { ...cfg.voicemaster, nameTemplate: texto } });
      await interaction.reply({ embeds: [successEmbed("Plantilla", texto)] });
    }
  },
};

export default command;
