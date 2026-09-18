import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getGuildConfig, setGuildConfig } from "../../database/index.js";
import { requireStaff } from "../../utils/permissions.js";
import { baseEmbed, errorEmbed, successEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { logEmbed, sendLog } from "../../modules/logs/dispatch.js";
import type { Command } from "../../types/index.js";


const command: Command = {
  data: new SlashCommandBuilder()
    .setName("confesar")
    .setDescription("Envía una confesión (pública o anónima)")
    .addSubcommand((s) =>
      s
        .setName("enviar")
        .setDescription("Mandar una confesión al canal configurado")
        .addStringOption((o) => o.setName("mensaje").setDescription("Tu confesión").setRequired(true).setMaxLength(1800))
        .addBooleanOption((o) => o.setName("anonima").setDescription("true = nadie ve quién eres (por defecto true)")),
    )
    .addSubcommand((s) =>
      s
        .setName("canal")
        .setDescription("Staff: canal donde se publican las confesiones")
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal").addChannelTypes(ChannelType.GuildText).setRequired(true),
        )
        .addBooleanOption((o) => o.setName("activar").setDescription("Activar o pausar")),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Solo en servidor.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const cfg = getGuildConfig(interaction.guild.id);

    if (sub === "canal") {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      const canal = interaction.options.getChannel("canal", true);
      const activa = interaction.options.getBoolean("activar") ?? true;
      setGuildConfig(interaction.guild.id, {
        confessions: { channelId: canal.id, enabled: activa },
      });
      await interaction.reply({
        embeds: [successEmbed("Confesiones", `${activa ? "Activas" : "Pausadas"} en ${canal}.`)],
        ephemeral: true,
      });
      return;
    }

    if (!cfg.confessions.enabled || !cfg.confessions.channelId) {
      await interaction.reply({
        embeds: [errorEmbed("Sin canal", "El staff aún no ha puesto un canal con `/confesar canal`.")],
        ephemeral: true,
      });
      return;
    }
    const dest = interaction.guild.channels.cache.get(cfg.confessions.channelId);
    if (!dest?.isTextBased() || !("send" in dest)) {
      await interaction.reply({
        embeds: [errorEmbed("Canal caído", "El canal de confesiones ya no existe. Avisa al staff.")],
        ephemeral: true,
      });
      return;
    }
    const text = interaction.options.getString("mensaje", true).trim();
    if (!text) {
      await interaction.reply({ embeds: [errorEmbed("Vacía")], ephemeral: true });
      return;
    }
    const anon = interaction.options.getBoolean("anonima") ?? true;
    const embed = baseEmbed(COLORS.embed).setDescription(text).setTimestamp();
    if (anon) {
      embed.setTitle("Confesión anónima").setFooter({ text: "Nexo · buzón de confesiones" });
    } else {
      embed
        .setTitle("Confesión")
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ size: 64 }) })
        .setFooter({ text: "Nexo · confesión pública" });
    }
    await dest.send({ embeds: [embed], allowedMentions: { parse: [] } });

    const logEmb = logEmbed("🤫 Nueva Confesión", COLORS.info)
      .addFields(
        { name: "Autor real", value: `${interaction.user} (\`${interaction.user.id}\` · \`${interaction.user.tag}\`)`, inline: true },
        { name: "Tipo", value: anon ? "🕵️ Anónima" : "📢 Pública", inline: true },
        { name: "Canal", value: `<#${dest.id}>`, inline: true },
        { name: "Contenido", value: text.slice(0, 1024) },
      );
    await sendLog(interaction.guild, cfg.logs.commands ? "commands" : "moderation", logEmb).catch(() => null);

    await interaction.reply({
      content: anon ? "Confesión anónima enviada. Nadie verá que fuiste tú en el canal público." : "Confesión publicada.",
      ephemeral: true,
    });
  },
};


export default command;
void PermissionFlagsBits;
