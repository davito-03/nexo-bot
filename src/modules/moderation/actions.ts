import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  GuildMember,
  User,
  type ChatInputCommandInteraction,
  type Client,
  type TextBasedChannel,
} from "discord.js";
import { COLORS, DYNO_BAN_APPEAL_URL, SANCTION_STYLE, SERVER_NAME } from "../../constants.js";
import {
  countActiveWarns,
  deactivateCase,
  deleteCase,
  getCase,
  getGuildConfig,
  insertCase,
  updateCaseReason,
  type CaseRow,
} from "../../database/index.js";
import { errorEmbed, sanctionColor, successEmbed } from "../../utils/embeds.js";
import { canModerate } from "../../utils/permissions.js";
import { formatDuration, timestamp } from "../../utils/time.js";
import { caseEmbed, caseEmoji, caseLabel } from "./cases.js";
import { logEmbed, sendLog } from "../logs/dispatch.js";

async function dmUser(
  user: User,
  embed: EmbedBuilder,
  components?: ActionRowBuilder<ButtonBuilder>[],
): Promise<void> {
  try {
    await user.send({ embeds: [embed], components: components ?? [] });
  } catch {
    /* DMs cerrados */
  }
}


function dmSanction(guild: Guild, type: string, reason: string, extra?: string): EmbedBuilder {
  const s = SANCTION_STYLE[type] ?? { color: 0xff6b81, emoji: "🛡️", label: type };
  const e = new EmbedBuilder()
    .setColor(s.color)
    .setTitle(`${s.emoji}  ${s.label} en ${guild.name}`)
    .setDescription(extra || `Has recibido una sanción en **${guild.name}**.`)
    .addFields({ name: "Razón", value: reason || "Sin razón" })
    .setFooter({ text: `${SERVER_NAME} · si crees que es un error, abre un ticket de apelación` })
    .setTimestamp();
  if (guild.iconURL()) e.setThumbnail(guild.iconURL({ size: 128 })!);
  return e;
}

async function announce(guild: Guild, row: CaseRow, target: User, extra?: string): Promise<void> {
  const cfg = getGuildConfig(guild.id);
  const embed = caseEmbed(guild, row, target);
  if (extra) embed.addFields({ name: "Notas", value: extra });
  await sendLog(guild, "sanctions", embed);
  await sendLog(guild, "moderation", embed);
  if (cfg.moderation.logPublic && cfg.moderation.publicLogChannelId) {
    const ch = guild.channels.cache.get(cfg.moderation.publicLogChannelId);
    if (ch?.isTextBased() && "send" in ch) {
      await (ch as TextBasedChannel & { send: Function }).send({ embeds: [embed] }).catch(() => null);
    }
  }
}

export async function warnMember(
  guild: Guild,
  moderator: GuildMember,
  target: GuildMember,
  reason: string,
  client: Client,
): Promise<{ ok: boolean; message: string; row?: CaseRow }> {
  const blocked = canModerate(moderator, target);
  if (blocked) return { ok: false, message: blocked };
  const cfg = getGuildConfig(guild.id);
  const row = insertCase({
    guildId: guild.id,
    type: "warn",
    userId: target.id,
    moderatorId: moderator.id,
    reason,
  });
  if (cfg.moderation.dmOnSanction) {
    const appealRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`appeal:start:${guild.id}:${row.case_id}`)
        .setLabel("📩 Apelar advertencia")
        .setStyle(ButtonStyle.Primary),
    );
    await dmUser(
      target.user,
      dmSanction(
        guild,
        "warn",
        reason,
        `Caso **#${row.case_id}**. Las advertencias se acumulan.\n\nSi consideras que la advertencia fue injusta o un error, puedes apelar pulsando el botón a continuación.`,
      ),
      [appealRow],
    );
  }
  await announce(guild, row, target.user);
  const warns = countActiveWarns(guild.id, target.id);
  let extra = `Advertencias activas: **${warns}**.`;
  const esc = cfg.moderation.escalate;
  if (esc.warnsToBan && warns >= esc.warnsToBan) {
    const r = await banMember(guild, moderator, target.user, `Escalado automático (${warns} warns)`, null, client);
    extra += r.ok ? "\nEscalado a **ban**." : `\nNo se pudo escalar a ban: ${r.message}`;
  } else if (esc.warnsToKick && warns >= esc.warnsToKick) {
    const r = await kickMember(guild, moderator, target, `Escalado automático (${warns} warns)`);
    extra += r.ok ? "\nEscalado a **kick**." : `\nNo se pudo escalar a kick: ${r.message}`;
  } else if (esc.warnsToTimeout && warns >= esc.warnsToTimeout) {
    const r = await timeoutMember(
      guild,
      moderator,
      target,
      esc.timeoutDurationMs,
      `Escalado automático (${warns} warns)`,
    );
    extra += r.ok ? "\nEscalado a **timeout**." : `\nNo se pudo escalar a timeout: ${r.message}`;
  }
  return { ok: true, message: `Advertencia #${row.case_id} aplicada a ${target}. ${extra}`, row };
}

export async function kickMember(
  guild: Guild,
  moderator: GuildMember,
  target: GuildMember,
  reason: string,
): Promise<{ ok: boolean; message: string; row?: CaseRow }> {
  const blocked = canModerate(moderator, target);
  if (blocked) return { ok: false, message: blocked };
  if (!target.kickable) return { ok: false, message: "No puedo expulsar a este miembro." };
  const cfg = getGuildConfig(guild.id);
  if (cfg.moderation.dmOnSanction) {
    await dmUser(target.user, dmSanction(guild, "kick", reason, "Has sido expulsado. Puedes volver a entrar con una invitación."));
  }
  await target.kick(reason).catch((e: Error) => {
    throw e;
  });
  const row = insertCase({
    guildId: guild.id,
    type: "kick",
    userId: target.id,
    moderatorId: moderator.id,
    reason,
  });
  await announce(guild, row, target.user);
  return { ok: true, message: `${target.user.tag} ha sido expulsado. Caso #${row.case_id}.`, row };
}

export async function banMember(
  guild: Guild,
  moderator: GuildMember,
  target: User,
  reason: string,
  durationMs: number | null,
  _client: Client,
  deleteDays = 1,
): Promise<{ ok: boolean; message: string; row?: CaseRow }> {
  const member = await guild.members.fetch(target.id).catch(() => null);
  if (member) {
    const blocked = canModerate(moderator, member);
    if (blocked) return { ok: false, message: blocked };
    if (!member.bannable) return { ok: false, message: "No puedo banear a este miembro." };
  }
  const type = durationMs ? "tempban" : "ban";
  const row = insertCase({
    guildId: guild.id,
    type,
    userId: target.id,
    moderatorId: moderator.id,
    reason,
    durationMs,
    expiresAt: durationMs ? Date.now() + durationMs : null,
  });

  const cfg = getGuildConfig(guild.id);

  // Pre-crear el canal DM antes del ban mientras aún sea miembro
  await target.createDM().catch(() => null);

  if (cfg.moderation.dmOnSanction) {
    const dur = durationMs ? ` Duración: **${formatDuration(durationMs)}**.` : " Es permanente hasta que un staff lo retire.";
    const appealRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Apelar baneo en Dyno")
        .setStyle(ButtonStyle.Link)
        .setURL(DYNO_BAN_APPEAL_URL)
        .setEmoji("📝"),
    );

    await dmUser(
      target,
      dmSanction(
        guild,
        type,
        reason,
        `Has sido baneado de **${guild.name}**.${dur}\n\n` +
        `🆔 **ID de sanción:** \`#${row.case_id}\` *(indícalo en el formulario de apelación)*\n\n` +
        `Las apelaciones de baneo se gestionan a través del bot **Dyno**.\n` +
        `🔗 **Formulario de apelación:** ${DYNO_BAN_APPEAL_URL}`,
      ),
      [appealRow],
    );
  }

  await guild.members.ban(target.id, {
    reason,
    deleteMessageSeconds: Math.min(7, Math.max(0, deleteDays)) * 86400,
  });

  await announce(guild, row, target);
  const extra = durationMs ? ` Expira ${timestamp(Date.now() + durationMs)}.` : "";
  return { ok: true, message: `${target.tag} ha sido baneado. Caso #${row.case_id}.${extra}`, row };

}

export async function unbanMember(
  guild: Guild,
  moderator: GuildMember,
  userId: string,
  reason: string,
): Promise<{ ok: boolean; message: string; row?: CaseRow }> {
  await guild.bans.remove(userId, reason);
  const row = insertCase({
    guildId: guild.id,
    type: "unban",
    userId,
    moderatorId: moderator.id,
    reason,
  });
  const user = await guild.client.users.fetch(userId).catch(() => null);
  if (user) await announce(guild, row, user);
  return { ok: true, message: `Usuario \`${userId}\` desbaneado. Caso #${row.case_id}.`, row };
}

export async function timeoutMember(
  guild: Guild,
  moderator: GuildMember,
  target: GuildMember,
  durationMs: number,
  reason: string,
): Promise<{ ok: boolean; message: string; row?: CaseRow }> {
  const blocked = canModerate(moderator, target);
  if (blocked) return { ok: false, message: blocked };
  if (!target.moderatable) return { ok: false, message: "No puedo aplicar timeout a este miembro." };
  const max = 28 * 24 * 60 * 60 * 1000;
  const ms = Math.min(durationMs, max);
  const cfg = getGuildConfig(guild.id);
  const row = insertCase({
    guildId: guild.id,
    type: "timeout",
    userId: target.id,
    moderatorId: moderator.id,
    reason,
    durationMs: ms,
    expiresAt: Date.now() + ms,
  });

  if (cfg.moderation.dmOnSanction) {
    const appealRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`appeal:start:${guild.id}:${row.case_id}`)
        .setLabel("📩 Apelar aislamiento")
        .setStyle(ButtonStyle.Primary),
    );
    await dmUser(
      target.user,
      dmSanction(
        guild,
        "timeout",
        reason,
        `No podrás hablar ni conectar a VC durante **${formatDuration(ms)}**.\nCaso **#${row.case_id}**.\n\nSi consideras que la sanción fue injusta o un error, puedes apelar pulsando el botón a continuación.`,
      ),
      [appealRow],
    );
  }
  await target.timeout(ms, reason);
  await announce(guild, row, target.user);
  return {
    ok: true,
    message: `${target} en timeout ${formatDuration(ms)}. Caso #${row.case_id}.`,
    row,
  };
}

export async function removeTimeout(
  guild: Guild,
  moderator: GuildMember,
  target: GuildMember,
  reason: string,
): Promise<{ ok: boolean; message: string; row?: CaseRow }> {
  const blocked = canModerate(moderator, target);
  if (blocked) return { ok: false, message: blocked };
  await target.timeout(null, reason);
  const row = insertCase({
    guildId: guild.id,
    type: "untimeout",
    userId: target.id,
    moderatorId: moderator.id,
    reason,
  });
  await announce(guild, row, target.user);
  return { ok: true, message: `Timeout retirado a ${target}. Caso #${row.case_id}.`, row };
}

export async function softbanMember(
  guild: Guild,
  moderator: GuildMember,
  target: GuildMember,
  reason: string,
): Promise<{ ok: boolean; message: string; row?: CaseRow }> {
  const blocked = canModerate(moderator, target);
  if (blocked) return { ok: false, message: blocked };
  if (!target.bannable) return { ok: false, message: "No puedo hacer softban a este miembro." };
  const cfg = getGuildConfig(guild.id);
  if (cfg.moderation.dmOnSanction) {
    await dmUser(
      target.user,
      dmSanction(guild, "softban", reason, "Kick + borrado de mensajes recientes. Puedes volver a entrar."),
    );
  }
  const id = target.id;
  const user = target.user;
  await target.ban({ reason: `Softban: ${reason}`, deleteMessageSeconds: 86400 * 7 });
  await guild.members.unban(id, "Fin de softban");
  const row = insertCase({
    guildId: guild.id,
    type: "softban",
    userId: id,
    moderatorId: moderator.id,
    reason,
  });
  await announce(guild, row, user);
  return { ok: true, message: `Softban aplicado. Caso #${row.case_id}.`, row };
}

export async function unwarn(guild: Guild, moderator: GuildMember, caseId: number, reason: string) {
  const { getCase } = await import("../../database/index.js");
  const row = getCase(guild.id, caseId);
  if (!row || row.type !== "warn") return { ok: false, message: "No existe ese warn." };
  if (!row.active) return { ok: false, message: "Ese warn ya está retirado." };
  deactivateCase(guild.id, caseId);
  const rec = insertCase({
    guildId: guild.id,
    type: "unwarn",
    userId: row.user_id,
    moderatorId: moderator.id,
    reason: reason || `Retirado caso #${caseId}`,
    extra: { targetCase: caseId },
  });
  return { ok: true, message: `Warn #${caseId} retirado. Caso #${rec.case_id}.`, row: rec };
}

export async function replyAction(
  interaction: ChatInputCommandInteraction,
  result: { ok: boolean; message: string; row?: CaseRow },
): Promise<void> {
  const type = result.row?.type ?? "warn";
  const embed = result.ok
    ? successEmbed(`${caseEmoji(type)}  ${caseLabel(type)}`, result.message).setColor(sanctionColor(type))
    : errorEmbed("No se pudo completar", result.message);
  if (result.row) embed.setFooter({ text: `Caso #${result.row.case_id} · Nexo` });
  if (interaction.deferred || interaction.replied) await interaction.editReply({ embeds: [embed] });
  else await interaction.reply({ embeds: [embed] });
}

export async function editCase(
  guild: Guild,
  moderator: GuildMember,
  caseId: number,
  newReason: string,
): Promise<{ ok: boolean; message: string; row?: CaseRow }> {
  const row = getCase(guild.id, caseId);
  if (!row) return { ok: false, message: `No se encontró la sanción #${caseId}.` };

  const oldReason = row.reason || "Sin razón";
  const updated = updateCaseReason(guild.id, caseId, newReason);
  if (!updated) return { ok: false, message: `No se pudo actualizar la sanción #${caseId}.` };

  await sendLog(
    guild,
    "moderation",
    logEmbed("Sanción editada", COLORS.warn)
      .setDescription(
        `La sanción **#${caseId}** (${caseLabel(row.type)}) ha sido editada por ${moderator} (\`${moderator.id}\`).`,
      )
      .addFields(
        { name: "Usuario", value: `<@${row.user_id}> (\`${row.user_id}\`)`, inline: true },
        { name: "Staff original", value: `<@${row.moderator_id}> (\`${row.moderator_id}\`)`, inline: true },
        { name: "Razón previa", value: oldReason, inline: false },
        { name: "Nueva razón", value: newReason, inline: false },
      ),
  );

  return { ok: true, message: `Sanción #${caseId} editada correctamente.`, row: updated };
}

export async function deleteCaseAction(
  guild: Guild,
  moderator: GuildMember,
  caseId: number,
  revertEffect = true,
  client?: Client,
): Promise<{ ok: boolean; message: string; row?: CaseRow }> {
  const row = getCase(guild.id, caseId);
  if (!row) return { ok: false, message: `No se encontró la sanción #${caseId}.` };

  let revertMsg = "";
  if (revertEffect && row.active) {
    if (row.type === "ban" || row.type === "tempban") {
      try {
        await guild.bans.remove(row.user_id, `Sanción #${caseId} eliminada por ${moderator.user.tag}`);
        revertMsg = " Además, se retiró el baneo en Discord.";
      } catch {
        /* User might not be banned or missing permissions */
      }
    } else if (row.type === "timeout") {
      try {
        const member = await guild.members.fetch(row.user_id).catch(() => null);
        if (member && member.isCommunicationDisabled()) {
          await member.timeout(null, `Sanción #${caseId} eliminada por ${moderator.user.tag}`);
          revertMsg = " Además, se retiró el timeout.";
        }
      } catch {
        /* ignore */
      }
    }
  }

  const deleted = deleteCase(guild.id, caseId);
  if (!deleted) return { ok: false, message: `Error al eliminar la sanción #${caseId}.` };

  await sendLog(
    guild,
    "moderation",
    logEmbed("Sanción eliminada", COLORS.danger)
      .setDescription(
        `La sanción **#${caseId}** (${caseLabel(row.type)}) ha sido eliminada por ${moderator} (\`${moderator.id}\`).${revertMsg}`,
      )
      .addFields(
        { name: "Usuario", value: `<@${row.user_id}> (\`${row.user_id}\`)`, inline: true },
        { name: "Staff que la aplicó", value: `<@${row.moderator_id}> (\`${row.moderator_id}\`)`, inline: true },
        { name: "Razón que tenía", value: row.reason || "Sin razón", inline: false },
      ),
  );

  return { ok: true, message: `Sanción #${caseId} (${caseLabel(row.type)}) eliminada correctamente.${revertMsg}`, row };
}
