import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getGuildConfig, setGuildConfig } from "../../database/index.js";
import { requireAdmin } from "../../utils/permissions.js";
import { infoEmbed, successEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Filtros automáticos")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName("ver").setDescription("Ver estado"))
    .addSubcommand((s) =>
      s
        .setName("toggle")
        .setDescription("Activar o desactivar un filtro")
        .addStringOption((o) =>
          o
            .setName("filtro")
            .setDescription("Filtro")
            .setRequired(true)
            .addChoices(
              { name: "sistema (interruptor general)", value: "enabled" },
              { name: "spam", value: "antiSpam" },
              { name: "invitaciones", value: "antiInvites" },
              { name: "enlaces", value: "antiLinks" },
              { name: "menciones", value: "antiMassMentions" },
              { name: "mayúsculas", value: "antiCaps" },
            ),
        )
        .addBooleanOption((o) => o.setName("valor").setDescription("on/off").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("palabras")
        .setDescription("Añadir palabras prohibidas (separadas por coma)")
        .addStringOption((o) => o.setName("lista").setDescription("palabra1, palabra2").setRequired(true)),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const admin = await requireAdmin(interaction);
    if (!admin) return;
    const cfg = getGuildConfig(interaction.guild!.id);
    const sub = interaction.options.getSubcommand();
    if (sub === "ver") {
      await interaction.reply({
        ephemeral: true,
        embeds: [
          infoEmbed(
            "Automod",
            [
              "**sistema** — interruptor general. Si está off, ningún filtro actúa.",
              `Estado: **${cfg.automod.enabled ? "ON" : "OFF"}**`,
              "",
              `**spam** (${cfg.automod.antiSpam ? "on" : "off"}) — borra si alguien manda muchos mensajes seguidos (${cfg.automod.spamThreshold} en ${cfg.automod.spamWindowMs / 1000}s).`,
              `**invitaciones** (${cfg.automod.antiInvites ? "on" : "off"}) — borra enlaces discord.gg / invitaciones a otros servers.`,
              `**enlaces** (${cfg.automod.antiLinks ? "on" : "off"}) — borra URLs que no estén en la lista blanca (YouTube, Spotify, Tenor…).`,
              `**menciones** (${cfg.automod.antiMassMentions ? "on" : "off"}) — borra si menciona a ${cfg.automod.massMentionLimit}+ personas/roles de golpe.`,
              `**mayúsculas** (${cfg.automod.antiCaps ? "on" : "off"}) — borra gritos (${cfg.automod.capsPercent}%+ del texto en mayúsculas).`,
              `**palabras** (${cfg.automod.badWords.length}) — lista negra con \`/automod palabras\`.`,
              "",
              "Staff con permiso de gestionar mensajes está exento. Por defecto el sistema está **apagado** hasta que lo actives.",
            ].join("\n"),
          ),
        ],
      });
      return;
    }
    if (sub === "toggle") {
      const filtro = interaction.options.getString("filtro", true);
      const valor = interaction.options.getBoolean("valor", true);
      setGuildConfig(interaction.guild!.id, { automod: { ...cfg.automod, [filtro]: valor } as typeof cfg.automod });
      await interaction.reply({ embeds: [successEmbed("Automod", `\`${filtro}\` = **${valor}**`)] });
      return;
    }
    if (sub === "palabras") {
      const lista = interaction.options.getString("lista", true)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      setGuildConfig(interaction.guild!.id, { automod: { ...cfg.automod, badWords: lista } });
      await interaction.reply({ embeds: [successEmbed("Lista actualizada", `${lista.length} palabras.`)] });
    }
  },
};

export default command;
