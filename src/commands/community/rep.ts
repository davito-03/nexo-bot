import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { baseEmbed, errorEmbed, successEmbed, infoEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import {
  giveReputation,
  getUserReputation,
  getTopReputation,
} from "../../modules/community/reputation.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("rep")
    .setDescription("Sistema de reputación, karma social y agradecimientos entre miembros")
    .addSubcommand((s) =>
      s
        .setName("dar")
        .setDescription("Otorga tu punto diario de reputación positiva a otro miembro")
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Miembro al que otorgar reputación").setRequired(true),
        )
        .addStringOption((o) =>
          o.setName("motivo").setDescription("Razón o agradecimiento (opcional)").setRequired(false),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("ver")
        .setDescription("Consulta la reputación, puesto y elogios recibidos de un usuario")
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Miembro a consultar (opcional)").setRequired(false),
        ),
    )
    .addSubcommand((s) =>
      s.setName("top").setDescription("Cuadro de honor de los miembros más queridos y respetados del servidor"),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Este comando solo funciona dentro del servidor.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId!;
    const uid = interaction.user.id;

    // ── SUBCOMANDO: DAR REPUTACIÓN ──
    if (sub === "dar") {
      const targetUser = interaction.options.getUser("usuario", true);
      const reason = interaction.options.getString("motivo") || undefined;

      if (targetUser.bot) {
        await interaction.reply({
          embeds: [errorEmbed("Acción Denegada", "Los bots no pueden recibir puntos de reputación social.")],
          ephemeral: true,
        });
        return;
      }

      const res = giveReputation(gid, uid, targetUser.id, reason);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed("Reputación no concedida", res.error!)], ephemeral: true });
        return;
      }

      const reasonText = reason ? `\n💬 *«${reason}»*` : "";
      const embed = successEmbed(
        "✨ ¡Punto de Reputación Otorgado!",
        `Has agradecido y otorgado +1 punto de reputación a ${targetUser}.${reasonText}\n\n` +
          `▸ **Nuevo Karma de ${targetUser.username}:** \`${res.targetPoints}\` puntos ⭐\n` +
          `▸ 🎁 **Premios de Cortesía:** ${targetUser} recibe **+300 🪙** y tú recibes **+150 🪙**.`,
      );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: VER REPUTACIÓN ──
    if (sub === "ver") {
      const targetUser = interaction.options.getUser("usuario") || interaction.user;
      const rep = getUserReputation(gid, targetUser.id);

      const logLines =
        rep.recentLogs.length > 0
          ? rep.recentLogs
              .map(
                (l) =>
                  `• <@${l.fromUserId}>: ${l.reason ? `*«${l.reason}»*` : "*(Sin motivo específico)*"} <t:${Math.floor(
                    l.createdAt / 1000,
                  )}:R>`,
              )
              .join("\n")
          : "*Aún no ha recibido elogios de otros miembros.*";

      const embed = baseEmbed(COLORS.gold)
        .setTitle(`⭐ Expediente de Reputación: ${targetUser.username}`)
        .setDescription(
          `**Puntos de Reputación:** \`${rep.points}\` ⭐\n` +
            `**Posición en el Cuadro de Honor:** \`#${rep.rank}\`\n\n` +
            `**Últimos Agradecimientos Recibidos:**\n${logLines}`,
        )
        .setFooter({ text: "Otorga reputación diaria con /rep dar @usuario" });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: TOP REPUTACIÓN ──
    if (sub === "top") {
      const top = getTopReputation(gid, 10);
      if (top.length === 0) {
        await interaction.reply({
          embeds: [infoEmbed("Cuadro de Honor Vacío", "Aún ningún usuario ha recibido puntos de reputación en el servidor.")],
        });
        return;
      }

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const lines = top.map((t, idx) => `${medals[idx] || "⭐"} <@${t.userId}> — **${t.points}** puntos ⭐`);

      const embed = baseEmbed(COLORS.gold)
        .setTitle("🏆 Cuadro de Honor: Miembros Más Reputados de Nexo")
        .setDescription(
          `Clasificación de los usuarios que más han aportado y ayudado a la comunidad:\n\n${lines.join("\n")}`,
        )
        .setFooter({ text: "Agradece a tus compañeros con /rep dar <usuario>" });

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};

export default command;
