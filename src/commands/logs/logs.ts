import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { LOG_TYPES, type LogType } from "../../constants.js";
import { getGuildConfig, setGuildConfig } from "../../database/index.js";
import { requireAdmin } from "../../utils/permissions.js";
import { infoEmbed, successEmbed } from "../../utils/embeds.js";
import { sendLog, logEmbed } from "../../modules/logs/dispatch.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Canales de registro")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName("set")
        .setDescription("Asignar un canal a un tipo de log")
        .addStringOption((o) =>
          o
            .setName("tipo")
            .setDescription("Tipo")
            .setRequired(true)
            .addChoices(...LOG_TYPES.map((t) => ({ name: t, value: t }))),
        )
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal").addChannelTypes(ChannelType.GuildText).setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("todo")
        .setDescription("Mandar TODOS los logs a un mismo canal")
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal").addChannelTypes(ChannelType.GuildText).setRequired(true),
        ),
    )
    .addSubcommand((s) => s.setName("ver").setDescription("Ver canales de logs"))
    .addSubcommand((s) => s.setName("test").setDescription("Enviar un log de prueba")),
  async execute(interaction: ChatInputCommandInteraction) {
    const admin = await requireAdmin(interaction);
    if (!admin) return;
    const guild = interaction.guild!;
    const cfg = getGuildConfig(guild.id);
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const tipo = interaction.options.getString("tipo", true) as LogType;
      const canal = interaction.options.getChannel("canal", true);
      setGuildConfig(guild.id, { logs: { ...cfg.logs, [tipo]: canal.id } });
      await interaction.reply({ embeds: [successEmbed("Log asignado", `**${tipo}** → ${canal}`)] });
      return;
    }
    if (sub === "todo") {
      const canal = interaction.options.getChannel("canal", true);
      const logs: Record<string, string> = {};
      for (const t of LOG_TYPES) logs[t] = canal.id;
      setGuildConfig(guild.id, { logs });
      await interaction.reply({ embeds: [successEmbed("Todos los logs", `Van a ${canal}`)] });
      return;
    }
    if (sub === "ver") {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          infoEmbed(
            "Logs",
            LOG_TYPES.map((t) => `**${t}**: ${cfg.logs[t] ? `<#${cfg.logs[t]}>` : "—"}`).join("\n"),
          ),
        ],
      });
      return;
    }
    if (sub === "test") {
      await sendLog(guild, "server", logEmbed("Prueba de logs").setDescription(`Enviado por ${interaction.user}`));
      await interaction.reply({ content: "Enviado (si el canal de `server` está configurado).", ephemeral: true });
    }
  },
};

export default command;
