import {
  ChannelType,
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type VoiceBasedChannel,
} from "discord.js";
import { getDb, getGuildConfig, setGuildConfig } from "../../database/index.js";
import {
  getTemp,
  hasVoiceStaffBypass,
  panelComponents,
  panelEmbed,
  setChannelAccess,
} from "../../modules/voicemaster/manager.js";
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
        .setName("moderar")
        .setDescription("Staff: Gestionar cualquier sala temporal activa")
        .addStringOption((o) =>
          o
            .setName("accion")
            .setDescription("Acción administrativa a ejecutar")
            .setRequired(true)
            .addChoices(
              { name: "ℹ️ Información de la sala", value: "info" },
              { name: "🔒 Bloquear sala", value: "lock" },
              { name: "🔓 Desbloquear sala", value: "unlock" },
              { name: "🙈 Ocultar sala", value: "hide" },
              { name: "👁️ Mostrar sala", value: "show" },
              { name: "👑 Reclamar dueño", value: "claim" },
              { name: "🗑️ Eliminar sala", value: "delete" },
            ),
        )
        .addChannelOption((o) =>
          o
            .setName("canal")
            .setDescription("Canal de voz temporal a gestionar (opcional si ya estás dentro)")
            .addChannelTypes(ChannelType.GuildVoice),
        ),
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

    if (sub === "moderar") {
      if (!hasVoiceStaffBypass(interaction.member)) {
        await interaction.reply({
          embeds: [errorEmbed("Acceso Denegado", "Solo los roles de Owner y Moderación pueden usar este comando.")],
          ephemeral: true,
        });
        return;
      }

      const channelOpt = interaction.options.getChannel("canal");
      const targetChannel = (channelOpt ?? interaction.member.voice.channel) as VoiceBasedChannel | null;

      if (!targetChannel || !("isVoiceBased" in targetChannel) || !targetChannel.isVoiceBased()) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              "Canal no especificado",
              "Debes indicar un canal de voz temporal en el parámetro `canal` o estar conectado a uno.",
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      const temp = getTemp(targetChannel.id);
      if (!temp) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              "No es una sala temporal",
              `El canal ${targetChannel} no es una sala temporal activa gestionada por VoiceMaster.`,
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      const accion = interaction.options.getString("accion", true);
      const ownerId = temp.owner_id || "Desconocido";

      switch (accion) {
        case "info": {
          const everyone = guild.roles.everyone.id;
          const isLocked = targetChannel.permissionOverwrites.cache.get(everyone)?.deny.has(PermissionFlagsBits.Connect) ?? false;
          const isHidden = targetChannel.permissionOverwrites.cache.get(everyone)?.deny.has(PermissionFlagsBits.ViewChannel) ?? false;
          const currentBitrate = Math.round(targetChannel.bitrate / 1000);
          const members = targetChannel.members.map((m) => `• <@${m.id}>${m.id === ownerId ? " 👑" : ""}`).join("\n");

          const embed = baseEmbed(COLORS.voice)
            .setTitle(`ℹ️ Moderación · ${targetChannel.name}`)
            .addFields(
              { name: "👑 Dueño", value: `<@${ownerId}>`, inline: true },
              {
                name: "👥 Límite",
                value: targetChannel.userLimit
                  ? `${targetChannel.members.size}/${targetChannel.userLimit}`
                  : `${targetChannel.members.size} (Ilimitado)`,
                inline: true,
              },
              { name: "📶 Calidad", value: `${currentBitrate} kbps`, inline: true },
              { name: "🔒 Acceso", value: isLocked ? "🔒 Bloqueada" : "🔓 Abierta", inline: true },
              { name: "👁️ Visibilidad", value: isHidden ? "🙈 Oculta" : "👁️ Visible", inline: true },
              { name: `🎙️ Conectados (${targetChannel.members.size})`, value: members || "*Nadie en la sala*", inline: false },
            );

          await interaction.reply({ embeds: [embed], ephemeral: true });
          break;
        }
        case "lock":
          await setChannelAccess(targetChannel, interaction.user.id, "lock");
          await interaction.reply({
            embeds: [successEmbed("Sala Bloqueada", `Se ha bloqueado el acceso a **${targetChannel.name}**.`)],
            ephemeral: true,
          });
          break;
        case "unlock":
          await setChannelAccess(targetChannel, interaction.user.id, "unlock");
          await interaction.reply({
            embeds: [successEmbed("Sala Desbloqueada", `Se ha abierto el acceso a **${targetChannel.name}**.`)],
            ephemeral: true,
          });
          break;
        case "hide":
          await setChannelAccess(targetChannel, interaction.user.id, "hide");
          await interaction.reply({
            embeds: [successEmbed("Sala Ocultada", `Se ha ocultado la sala **${targetChannel.name}**.`)],
            ephemeral: true,
          });
          break;
        case "show":
          await setChannelAccess(targetChannel, interaction.user.id, "show");
          await interaction.reply({
            embeds: [successEmbed("Sala Visible", `La sala **${targetChannel.name}** ahora es visible para todos.`)],
            ephemeral: true,
          });
          break;
        case "claim":
          getDb().prepare("UPDATE temp_voices SET owner_id = ? WHERE channel_id = ?").run(interaction.user.id, targetChannel.id);
          await targetChannel.permissionOverwrites.edit(interaction.user.id, {
            Connect: true,
            Speak: true,
            ViewChannel: true,
          });
          await interaction.reply({
            embeds: [
              successEmbed(
                "Propiedad Asignada",
                `Has tomado el control como dueño de la sala **${targetChannel.name}**.`,
              ),
            ],
            ephemeral: true,
          });
          break;
        case "delete":
          getDb().prepare("DELETE FROM temp_voices WHERE channel_id = ?").run(targetChannel.id);
          await interaction.reply({
            embeds: [successEmbed("Sala Eliminada", `Se ha eliminado la sala **${targetChannel.name}**.`)],
            ephemeral: true,
          });
          await targetChannel.delete("Moderación eliminó la sala").catch(() => null);
          break;
      }
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
