import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getGuildConfig, setGuildConfig } from "../../database/index.js";
import { LOG_TYPES } from "../../constants.js";
import { requireAdmin } from "../../utils/permissions.js";
import { infoEmbed, successEmbed } from "../../utils/embeds.js";
import { truncate } from "../../utils/format.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configuración del servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName("ver").setDescription("Ver configuración actual"))
    .addSubcommand((s) =>
      s
        .setName("staff")
        .setDescription("Añadir o quitar un rol de staff")
        .addRoleOption((o) => o.setName("rol").setDescription("Rol").setRequired(true))
        .addBooleanOption((o) => o.setName("quitar").setDescription("Quitar en vez de añadir")),
    )
    .addSubcommand((s) =>
      s
        .setName("bienvenida")
        .setDescription("Canal y mensaje de bienvenida")
        .addChannelOption((o) => o.setName("canal").setDescription("Canal").addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName("mensaje").setDescription("Usa {user} {count} {guild} {name}"))
        .addBooleanOption((o) => o.setName("activa").setDescription("Activar"))
        .addBooleanOption((o) => o.setName("imagen").setDescription("Tarjeta con imagen")),
    )
    .addSubcommand((s) =>
      s
        .setName("boost")
        .setDescription("Canal de boosts")
        .addChannelOption((o) => o.setName("canal").setDescription("Canal").addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName("mensaje").setDescription("Usa {user} {boosts} {guild} {name}"))
        .addBooleanOption((o) => o.setName("activa").setDescription("Activar")),
    )
    .addSubcommand((s) =>
      s
        .setName("niveles")
        .setDescription("Canal y mensaje de level-up")
        .addChannelOption((o) => o.setName("canal").setDescription("Canal de anuncios").addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName("mensaje").setDescription("Usa {user} {name} {level} {old} {guild}"))
        .addBooleanOption((o) => o.setName("activos").setDescription("Activar XP")))
    .addSubcommand((s) => s
      .setName("chatbot")
      .setDescription("Configurar un canal de personaje IA")
      .addChannelOption((o) => o.setName("canal").setDescription("Canal de chatbot").addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption((o) => o.setName("personaje").setDescription("Nombre del personaje").setRequired(true))
      .addStringOption((o) => o.setName("prompt").setDescription("Personalidad e instrucciones del personaje").setRequired(true))
      .addBooleanOption((o) => o.setName("quitar").setDescription("Desactivar este canal"))),
  async execute(interaction: ChatInputCommandInteraction) {
    const admin = await requireAdmin(interaction);
    if (!admin) return;
    const guild = interaction.guild!;
    const cfg = getGuildConfig(guild.id);
    const sub = interaction.options.getSubcommand();

    if (sub === "ver") {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          infoEmbed(
            "Configuración Nexo",
            [
              `Staff: ${cfg.staffRoles.map((r) => `<@&${r}>`).join(" ") || "—"}`,
              `Bienvenida: ${cfg.welcome.enabled ? `<#${cfg.welcome.channelId}>` : "off"}`,
              `Boosts: ${cfg.boost.enabled ? `<#${cfg.boost.channelId}>` : "off"}`,
              `Niveles: ${cfg.levels.enabled ? "on" : "off"} · anuncio ${cfg.levels.announceChannelId ? `<#${cfg.levels.announceChannelId}>` : "—"}`,
              `VoiceMaster hub: ${cfg.voicemaster.hubId ? `<#${cfg.voicemaster.hubId}>` : "—"}`,
              `Tickets: ${cfg.tickets.categoryId ? `<#${cfg.tickets.categoryId}>` : "—"} · IA ${cfg.ai.enabled ? "on" : "off"}`,
              `Automod: ${cfg.automod.enabled ? "on" : "off"}`,
              `Logs: ${LOG_TYPES.filter((t) => cfg.logs[t]).map((t) => `${t}:<#${cfg.logs[t]}>`).join(" · ") || "sin configurar"}`,
              `Mensaje bienvenida: ${truncate(cfg.welcome.message, 180)}`,
              `Mensaje boost: ${truncate(cfg.boost.message, 180)}`,
              `Mensaje nivel: ${truncate(cfg.levels.message, 180)}`,
              `Chatbots: ${cfg.ai.chatbotChannels.length || "ninguno"}`,
            ].join("\n"),
          ),
        ],
      });
      return;
    }

    if (sub === "staff") {
      const role = interaction.options.getRole("rol", true);
      const quitar = interaction.options.getBoolean("quitar") ?? false;
      const set = new Set(cfg.staffRoles);
      if (quitar) set.delete(role.id);
      else set.add(role.id);
      setGuildConfig(guild.id, { staffRoles: [...set] });
      await interaction.reply({ embeds: [successEmbed("Staff", quitar ? `${role} quitado.` : `${role} añadido.`)] });
      return;
    }

    if (sub === "bienvenida") {
      const canal = interaction.options.getChannel("canal");
      const mensaje = interaction.options.getString("mensaje");
      const activa = interaction.options.getBoolean("activa");
      const imagen = interaction.options.getBoolean("imagen");
      setGuildConfig(guild.id, {
        welcome: {
          ...cfg.welcome,
          channelId: canal?.id ?? cfg.welcome.channelId,
          message: mensaje ?? cfg.welcome.message,
          enabled: activa ?? cfg.welcome.enabled,
          withImage: imagen ?? cfg.welcome.withImage,
        },
      });
      await interaction.reply({ embeds: [successEmbed("Bienvenida actualizada")] });
      return;
    }

    if (sub === "boost") {
      const canal = interaction.options.getChannel("canal");
      const mensaje = interaction.options.getString("mensaje");
      const activa = interaction.options.getBoolean("activa");
      setGuildConfig(guild.id, {
        boost: {
          ...cfg.boost,
          channelId: canal?.id ?? cfg.boost.channelId,
          message: mensaje ?? cfg.boost.message,
          enabled: activa ?? cfg.boost.enabled,
        },
      });
      await interaction.reply({ embeds: [successEmbed("Boosts actualizados")] });
      return;
    }

    if (sub === "niveles") {
      const canal = interaction.options.getChannel("canal");
      const activos = interaction.options.getBoolean("activos");
      const mensaje = interaction.options.getString("mensaje");
      setGuildConfig(guild.id, {
        levels: {
          ...cfg.levels,
          announceChannelId: canal?.id ?? cfg.levels.announceChannelId,
          enabled: activos ?? cfg.levels.enabled,
          message: mensaje ?? cfg.levels.message,
        },
      });
      await interaction.reply({ embeds: [successEmbed("Niveles actualizados")] });
      return;
    }

    if (sub === "chatbot") {
      const channel = interaction.options.getChannel("canal", true);
      const character = interaction.options.getString("personaje", true).trim();
      const prompt = interaction.options.getString("prompt", true).trim();
      const remove = interaction.options.getBoolean("quitar") ?? false;
      const current = cfg.ai.chatbotChannels.filter((c) => c.channelId !== channel.id);
      if (!remove) current.push({ channelId: channel.id, character: character.slice(0, 80), systemPrompt: prompt.slice(0, 6000) });
      setGuildConfig(guild.id, { ai: { ...cfg.ai, chatbotChannels: current } });
      await interaction.reply({ embeds: [successEmbed("Chatbot actualizado", remove ? `Canal ${channel} desactivado.` : `El personaje **${character}** responderá en ${channel}.`)] });
    }
  },
};

export default command;
