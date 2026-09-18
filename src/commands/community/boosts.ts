import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { COLORS, BOOST_CHANNEL_ID } from "../../constants.js";
import { getGuildBoosterList, syncGuildBoosters } from "../../modules/boosts/tracker.js";
import { setMemberBoostCount } from "../../modules/giveaways/manager.js";
import { requireStaff } from "../../utils/permissions.js";
import { successEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("boosts")
    .setDescription("Consulta las mejoras (Server Boosts) del servidor, boosters activos y sus ventajas")
    .addSubcommand((s) =>
      s
        .setName("lista")
        .setDescription("Ver la lista de boosters del servidor y cuántos boosts tiene cada uno"),
    )
    .addSubcommand((s) =>
      s
        .setName("sync")
        .setDescription("Sincronizar el estado activo de boosters desde Discord (Staff)"),
    )
    .addSubcommand((s) =>
      s
        .setName("set")
        .setDescription("Configurar la cantidad de boosts de un usuario (Staff)")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("cantidad").setDescription("Cantidad de boosts (ej: 1, 2, 3)").setMinValue(0).setMaxValue(50).setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Este comando solo se puede usar dentro del servidor.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === "lista") {
      const data = await getGuildBoosterList(guild);

      const embed = new EmbedBuilder()
        .setColor(0xf47fff) // Color característico de Discord Nitro / Boost
        .setTitle(`💜 Server Boosts · ${guild.name}`)
        .setDescription(
          `¡Gracias a los miembros que apoyan el servidor con sus mejoras!\n` +
          `Cada boost otorga **5 participaciones en todos los sorteos** (\`/sorteo\`) y multiplica la experiencia ganada.\n\n` +
          `📊 **Estadísticas de Mejoras:**\n` +
          `• Nivel del servidor: **Nivel ${data.tier}**\n` +
          `• Total de mejoras activas: **${data.totalBoosts} boosts**\n` +
          `• Miembros boosters únicos: **${data.boosters.length} miembros**\n` +
          `• Canal de avisos: <#${BOOST_CHANNEL_ID}>\n\n` +
          `👥 **Lista de Boosters:**\n` +
          (data.boosters.length > 0
            ? data.boosters
                .map((b, idx) => {
                  const since = b.premiumSince ? `<t:${Math.floor(b.premiumSince.getTime() / 1000)}:R>` : "Desconocido";
                  const boostLabel = b.boostCount === 1 ? "1 boost" : `**${b.boostCount}** boosts`;
                  return `**${idx + 1}.** ${b.member} · ${boostLabel} · ${since} · 🎟️ **${b.giveawayEntries}** tickets`;
                })
                .join("\n")
            : "*No hay miembros con boost activo actualmente.*"),
        )
        .setFooter({ text: "Nexo · Sistema de Boosts e Invitaciones" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "sync") {
      const staff = await requireStaff(interaction);
      if (!staff) return;

      await interaction.deferReply({ ephemeral: true });
      const res = await syncGuildBoosters(guild);

      await interaction.editReply({
        embeds: [
          successEmbed(
            "Sincronización de Boosts completada",
            `Se han sincronizado **${res.synced}** miembros boosters.\n` +
            `• **Total en servidor:** ${res.totalBoosts} boosts.\n` +
            `• **Boosters activos:** ${res.totalBoosters} usuarios.\n` +
            `Se ha comprobado el canal de avisos <#${BOOST_CHANNEL_ID}> y el estado activo de Discord.\n` +
            `Discord no expone el número individual de boosts de cada miembro; los valores 2+ siguen requiriendo ajuste manual si no los proporciona un aviso explícito.`,
          ),
        ],
      });
      return;
    }

    if (sub === "set") {
      const staff = await requireStaff(interaction);
      if (!staff) return;

      const targetUser = interaction.options.getUser("usuario", true);
      const count = interaction.options.getInteger("cantidad", true);

      setMemberBoostCount(guild.id, targetUser.id, count);
      const baseTickets = count > 0 ? count * 5 : 1;

      await interaction.reply({
        embeds: [
          successEmbed(
            "Boosts actualizados",
            `Se han establecido **${count}** boosts para <@${targetUser.id}>.\n` +
            `En sorteos tendrá **${baseTickets}** tickets base (más sus personas invitadas).`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }
  },
};

export default command;
