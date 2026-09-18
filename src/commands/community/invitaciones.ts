import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { COLORS } from "../../constants.js";
import { getUserInviteDetails, getInviteLeaderboard, setBonusInvites } from "../../modules/invites/tracker.js";
import { getMemberBoostCount } from "../../modules/giveaways/manager.js";
import { requireStaff } from "../../utils/permissions.js";
import { successEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("invitaciones")
    .setDescription("Consulta tus estadísticas de invitaciones, boosts y participaciones en sorteos")
    .addSubcommand((s) =>
      s
        .setName("ver")
        .setDescription("Ver tus invitaciones y participaciones para sorteos")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario a consultar")),
    )
    .addSubcommand((s) => s.setName("top").setDescription("Ver el ranking de usuarios con más invitaciones"))
    .addSubcommand((s) =>
      s
        .setName("bonus")
        .setDescription("Añadir o ajustar invitaciones bonus a un usuario (Staff)")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("cantidad").setDescription("Cantidad de invitaciones bonus").setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Este comando solo se puede usar dentro del servidor.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === "ver") {
      const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
      const member = (guild.members.cache.get(targetUser.id) ?? (await guild.members.fetch(targetUser.id).catch(() => null))) as GuildMember | null;

      const details = await getUserInviteDetails(guild, targetUser.id);
      const boostCount = member ? getMemberBoostCount(member) : 0;
      const baseTickets = boostCount > 0 ? boostCount * 5 : 1;
      const totalTickets = baseTickets + details.finalCount;

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(`📨 Estadísticas de Invitaciones · ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setDescription(
          `Consulta el impacto de tus invitaciones y boosts en el servidor y tus ventajas en los sorteos.\n\n` +
          `👥 **Invitaciones registradas:**\n` +
          `• Miembros activos actualmente: **${details.activeMembers}**\n` +
          `• Usos totales de tus códigos: **${details.totalUses}**\n` +
          (details.bonusInvites !== 0 ? `• Invitaciones bonus (Staff): **${details.bonusInvites > 0 ? `+${details.bonusInvites}` : details.bonusInvites}**\n` : "") +
          `• **Invitados computables:** **${details.finalCount}** ${details.finalCount === 1 ? "persona" : "personas"}\n\n` +
          `🚀 **Estado de Booster:**\n` +
          `• **${boostCount > 0 ? `Booster activo (${boostCount} ${boostCount === 1 ? "boost" : "boosts"})` : "Sin boost activo"}**\n` +
          `• Participaciones base en sorteos: **${baseTickets}** ${baseTickets === 1 ? "ticket" : "tickets"} *(5 por cada boost o 1 normal)*\n\n` +
          `🎉 **Participaciones en Sorteos (\`/sorteo\`):**\n` +
          `• Base / Boost: **${baseTickets}** tickets\n` +
          `• Extra por personas invitadas: **+${details.finalCount}** tickets *(+1 por invitado)*\n` +
          `• **TOTAL EN EL BOMBO:** **${totalTickets}** ${totalTickets === 1 ? "ticket" : "tickets"}` +
          (totalTickets > 1 ? ` *(¡Tienes **${totalTickets}x** más opciones de ganar!)*` : ""),
        )
        .setFooter({ text: "Nexo · Sistema de Sorteos Ponderados & Invitaciones" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "top") {
      const top = await getInviteLeaderboard(guild, 10);
      if (!top.length) {
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle("🏆 Top Invitadores").setDescription("Aún no hay invitaciones registradas en el servidor.")],
        });
        return;
      }

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const lines = top.map((entry, idx) => {
        const medal = medals[idx] ?? `**#${idx + 1}**`;
        return `${medal} <@${entry.userId}> · **${entry.count}** ${entry.count === 1 ? "invitado" : "invitados"} *(+${entry.count} tickets en sorteos)*`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("🏆 Top Invitadores del Servidor")
        .setDescription(
          `Los usuarios que más miembros traen a la comunidad reciben **+1 participación extra en todos los sorteos** por cada persona invitada.\n\n` +
          lines.join("\n"),
        )
        .setFooter({ text: "Nexo · Usa /invitaciones ver para consultar tus datos" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "bonus") {
      const staff = await requireStaff(interaction);
      if (!staff) return;

      const targetUser = interaction.options.getUser("usuario", true);
      const amount = interaction.options.getInteger("cantidad", true);

      setBonusInvites(guild.id, targetUser.id, amount);
      const updatedDetails = await getUserInviteDetails(guild, targetUser.id);

      await interaction.reply({
        embeds: [
          successEmbed(
            "Invitaciones bonus actualizadas",
            `Se han asignado **${amount}** invitaciones bonus a <@${targetUser.id}>.\n` +
            `Ahora cuenta con **${updatedDetails.finalCount}** invitaciones computables en total.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }
  },
};

export default command;
