import { EmbedBuilder, Guild, User } from "discord.js";
import { SANCTION_STYLE, SERVER_NAME } from "../../constants.js";
import { type CaseRow, countActiveWarns, getCase, getCasesForUser } from "../../database/index.js";
import { formatDuration, timestamp } from "../../utils/time.js";
import { baseEmbed } from "../../utils/embeds.js";

export function caseLabel(type: string): string {
  return SANCTION_STYLE[type]?.label ?? type;
}

export function caseEmoji(type: string): string {
  return SANCTION_STYLE[type]?.emoji ?? "🛡️";
}

export function caseEmbed(guild: Guild, row: CaseRow, user?: User | null, moderator?: User | null): EmbedBuilder {
  const style = SANCTION_STYLE[row.type] ?? { color: 0xff6b81, emoji: "🛡️", label: row.type };
  const e = baseEmbed(style.color)
    .setTitle(`${style.emoji}  ${style.label} · Caso #${row.case_id}`)
    .addFields(
      { name: "Usuario", value: user ? `${user}\n\`${user.id}\`` : `<@${row.user_id}>\n\`${row.user_id}\``, inline: true },
      { name: "Staff", value: moderator ? `${moderator}\n\`${moderator.id}\`` : `<@${row.moderator_id}>\n\`${row.moderator_id}\``, inline: true },
      { name: "Estado", value: row.active ? "● Activa" : "○ Cerrada", inline: true },
      { name: "Razón", value: row.reason || "Sin razón", inline: false },
      { name: "Fecha", value: timestamp(row.created_at, "F"), inline: true },
    )
    .setTimestamp(row.created_at)
    .setFooter({ text: `${SERVER_NAME} · sanciones` });

  if (user) e.setThumbnail(user.displayAvatarURL({ size: 256 }));
  if (row.duration_ms) e.addFields({ name: "Duración", value: formatDuration(row.duration_ms), inline: true });
  if (row.expires_at) e.addFields({ name: "Expira", value: timestamp(row.expires_at), inline: true });
  return e;
}

export function historyText(rows: CaseRow[]): string {
  if (!rows.length) return "Este usuario no tiene sanciones registradas.";
  return rows
    .slice(0, 15)
    .map((c) => {
      const flag = c.active ? "● Activa" : "○ Cerrada";
      const dur = c.duration_ms ? ` (${formatDuration(c.duration_ms)})` : "";
      return `**#${c.case_id}** ${caseEmoji(c.type)} **${caseLabel(c.type)}**${dur} [${flag}]\n├ **Staff:** <@${c.moderator_id}> (\`${c.moderator_id}\`)\n└ **Razón:** ${c.reason || "Sin razón"} · ${timestamp(c.created_at, "R")}`;
    })
    .join("\n\n");
}

export { getCase, getCasesForUser, countActiveWarns };
