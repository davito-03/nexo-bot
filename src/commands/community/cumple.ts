import { ChannelType, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getGuildConfig, setGuildConfig } from "../../database/index.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { clearBirthday, getBirthday, setBirthday } from "../../modules/community/birthdays.js";
import type { Command } from "../../types/index.js";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("cumple")
    .setDescription("Cumpleaños (solo día y mes, sin año)")
    .addSubcommand((s) =>
      s
        .setName("set")
        .setDescription("Guardar tu cumpleaños")
        .addIntegerOption((o) => o.setName("dia").setDescription("Día").setRequired(true).setMinValue(1).setMaxValue(31))
        .addIntegerOption((o) => o.setName("mes").setDescription("Mes (1-12)").setRequired(true).setMinValue(1).setMaxValue(12)),
    )
    .addSubcommand((s) => s.setName("quitar").setDescription("Borrar tu cumpleaños"))
    .addSubcommand((s) => s.setName("ver").setDescription("Ver el tuyo"))
    .addSubcommand((s) =>
      s
        .setName("canal")
        .setDescription("Staff: canal de felicitaciones")
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal").addChannelTypes(ChannelType.GuildText).setRequired(true),
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;
    if (sub === "canal") {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      const canal = interaction.options.getChannel("canal", true);
      setGuildConfig(gid, { birthdays: { channelId: canal.id } });
      await interaction.reply({ embeds: [successEmbed("Cumpleaños", `Se felicitará en ${canal}.`)], ephemeral: true });
      return;
    }
    if (sub === "quitar") {
      clearBirthday(gid, interaction.user.id);
      await interaction.reply({ embeds: [successEmbed("Listo", "Ya no tenemos tu día.")], ephemeral: true });
      return;
    }
    if (sub === "ver") {
      const b = getBirthday(gid, interaction.user.id);
      await interaction.reply({
        ephemeral: true,
        embeds: [
          b
            ? successEmbed("Tu cumpleaños", `**${b.day} ${MESES[b.month - 1]}** (sin año).`)
            : errorEmbed("Sin fecha", "Ponla con `/cumple set`."),
        ],
      });
      return;
    }
    const dia = interaction.options.getInteger("dia", true);
    const mes = interaction.options.getInteger("mes", true);
    const err = setBirthday(gid, interaction.user.id, mes, dia);
    if (err) {
      await interaction.reply({ embeds: [errorEmbed("Fecha", err)], ephemeral: true });
      return;
    }
    await interaction.reply({
      embeds: [successEmbed("Guardado", `El **${dia} ${MESES[mes - 1]}** (no guardamos el año).`)],
      ephemeral: true,
    });
  },
};

export default command;
