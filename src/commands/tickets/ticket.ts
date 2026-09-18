import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getDb, getGuildConfig, setGuildConfig } from "../../database/index.js";
import { closeTicket, getTicketByChannel, panelEmbed, panelSelect } from "../../modules/tickets/manager.js";
import { DEFAULT_AI_PROMPT } from "../../constants.js";
import { requireAdmin, requireStaff } from "../../utils/permissions.js";
import { errorEmbed, infoEmbed, successEmbed } from "../../utils/embeds.js";
import { aiAvailable, configuredProviders } from "../../modules/ai/client.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Sistema de tickets + IA de soporte")
    .addSubcommand((s) =>
      s
        .setName("setup")
        .setDescription("Configurar tickets")
        .addChannelOption((o) =>
          o.setName("categoria").setDescription("Categoría de los tickets").addChannelTypes(ChannelType.GuildCategory).setRequired(true),
        )
        .addRoleOption((o) => o.setName("staff").setDescription("Rol del staff").setRequired(true))
        .addChannelOption((o) =>
          o.setName("logs").setDescription("Canal de logs/transcripciones").addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((s) => s.setName("panel").setDescription("Publicar el panel de tickets"))
    .addSubcommand((s) =>
      s
        .setName("cerrar")
        .setDescription("Cerrar el ticket actual (staff o quien lo abrió)")
        .addStringOption((o) => o.setName("razon").setDescription("Razón")),
    )
    .addSubcommand((s) =>
      s
        .setName("añadir")
        .setDescription("Añadir a alguien al ticket")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("quitar")
        .setDescription("Quitar a alguien del ticket")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("ia")
        .setDescription("Configurar la IA de tickets")
        .addBooleanOption((o) => o.setName("activa").setDescription("Activar respuestas automáticas"))
        .addStringOption((o) => o.setName("prompt").setDescription("Prompt de normas y funciones (puedes pegarlo entero)")),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Solo en servidor.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const cfg = getGuildConfig(interaction.guild.id);

    if (sub === "setup") {
      const admin = await requireAdmin(interaction);
      if (!admin) return;
      const category = interaction.options.getChannel("categoria", true);
      const staff = interaction.options.getRole("staff", true);
      const logs = interaction.options.getChannel("logs");
      setGuildConfig(interaction.guild.id, {
        tickets: {
          ...cfg.tickets,
          categoryId: category.id,
          staffRoleId: staff.id,
          logChannelId: logs?.id ?? cfg.tickets.logChannelId,
          transcriptChannelId: logs?.id ?? cfg.tickets.transcriptChannelId,
        },
      });
      await interaction.reply({
        embeds: [successEmbed("Tickets listos", `Categoría ${category} · Staff ${staff}${logs ? ` · Logs ${logs}` : ""}`)],
      });
      return;
    }

    if (sub === "panel") {
      const admin = await requireAdmin(interaction);
      if (!admin) return;
      if (!interaction.channel?.isTextBased() || !("send" in interaction.channel)) {
        await interaction.reply({ embeds: [errorEmbed("Usa un canal de texto")], ephemeral: true });
        return;
      }
      await interaction.channel.send({
        embeds: [panelEmbed()],
        components: [panelSelect(cfg.tickets.categories)],
      });
      await interaction.reply({ content: "Panel publicado.", ephemeral: true });
      return;
    }

    if (sub === "cerrar") {
      const ticket = getTicketByChannel(interaction.channelId);
      if (!ticket) {
        await interaction.reply({ embeds: [errorEmbed("Este canal no es un ticket")], ephemeral: true });
        return;
      }
      const member = interaction.member;
      const opener = member.id === ticket.opener_id;
      const staff = opener ? member : await requireStaff(interaction);
      if (!staff) return;
      await interaction.reply({ content: "Cerrando…" });
      await closeTicket(
        ticket,
        staff,
        interaction.options.getString("razon") ?? (opener ? "Cerrado por quien abrió el ticket" : "Cerrado por comando"),
      );
      return;
    }

    if (sub === "añadir" || sub === "quitar") {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      const ticket = getTicketByChannel(interaction.channelId);
      if (!ticket) {
        await interaction.reply({ embeds: [errorEmbed("Este canal no es un ticket")], ephemeral: true });
        return;
      }
      const user = interaction.options.getUser("usuario", true);
      const ch = interaction.channel;
      if (!ch || !("permissionOverwrites" in ch)) return;
      if (sub === "añadir") {
        await ch.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true });
        await interaction.reply({ content: `${user} añadido al ticket.` });
      } else {
        await ch.permissionOverwrites.delete(user.id);
        await interaction.reply({ content: `${user} quitado del ticket.` });
      }
      return;
    }

    if (sub === "ia") {
      const admin = await requireAdmin(interaction);
      if (!admin) return;
      const activa = interaction.options.getBoolean("activa");
      const prompt = interaction.options.getString("prompt");
      const next = {
        ...cfg,
        ai: {
          ...cfg.ai,
          enabled: activa ?? cfg.ai.enabled,
          systemPrompt: prompt ?? cfg.ai.systemPrompt,
        },
        tickets: { ...cfg.tickets, aiEnabled: activa ?? cfg.tickets.aiEnabled },
      };
      setGuildConfig(interaction.guild.id, next);
      await interaction.reply({
        embeds: [
          infoEmbed(
            "IA de tickets",
            [
              `Estado: **${next.ai.enabled ? "activa" : "apagada"}**`,
              `Pool: **${aiAvailable() ? configuredProviders().join(" → ") : "ningún proveedor"}**`,
              `Enrutado: Groq → Gemini → OpenRouter → Cohere → Cloudflare → OpenAI mini`,
              `Memoria: cada ticket guarda resumen + hechos, así que el contexto no se pierde al cambiar de proveedor.`,
              prompt
                ? "Prompt actualizado. Neko usará el texto que has pegado."
                : `Prompt actual: ${next.ai.systemPrompt === DEFAULT_AI_PROMPT ? "el predeterminado (normas + verificación + economía + eventos)" : "personalizado"}.`,
            ].join("\n"),
          ),
        ],
        ephemeral: true,
      });
    }
  },
};

export default command;
void getDb;
void PermissionFlagsBits;
