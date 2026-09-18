import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Guild,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type User,
} from "discord.js";
import { getCase, getDb, getGuildConfig } from "../../database/index.js";
import { COLORS, OFFICIAL_GUILD_ID, SERVER_NAME, APPEALS_CHANNEL_ID, DYNO_BAN_APPEAL_URL } from "../../constants.js";
import { baseEmbed, errorEmbed, successEmbed } from "../../utils/embeds.js";
import { logger } from "../../logger.js";
import { sendLog } from "../logs/dispatch.js";
import type { NexoClient } from "../../client.js";

export interface AppealRow {
  id: number;
  guild_id: string;
  user_id: string;
  user_tag: string;
  case_id: number | null;
  type: string;
  reason: string;
  evidence: string | null;
  status: "pending" | "approved" | "rejected";
  channel_id: string | null;
  message_id: string | null;
  reviewed_by: string | null;
  reviewed_at: number | null;
  review_notes: string | null;
  created_at: number;
}

export function getAppeal(id: number): AppealRow | undefined {
  return getDb().prepare("SELECT * FROM appeals WHERE id = ?").get(id) as AppealRow | undefined;
}

export function getPendingAppealForUser(guildId: string, userId: string): AppealRow | undefined {
  return getDb()
    .prepare("SELECT * FROM appeals WHERE guild_id = ? AND user_id = ? AND status = 'pending'")
    .get(guildId, userId) as AppealRow | undefined;
}

export function createAppeal(opts: {
  guildId: string;
  userId: string;
  userTag: string;
  caseId?: number | null;
  type: string;
  reason: string;
  evidence?: string | null;
  channelId?: string;
  messageId?: string;
}): AppealRow {
  const info = getDb()
    .prepare(
      `INSERT INTO appeals (guild_id, user_id, user_tag, case_id, type, reason, evidence, status, channel_id, message_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    )
    .run(
      opts.guildId,
      opts.userId,
      opts.userTag,
      opts.caseId ?? null,
      opts.type,
      opts.reason,
      opts.evidence ?? null,
      opts.channelId ?? null,
      opts.messageId ?? null,
      Date.now(),
    );

  return getAppeal(Number(info.lastInsertRowid))!;
}

export function appealButtons(appealId: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`appeal:accept:${appealId}`)
      .setLabel("Aceptar y Retirar Sanción")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`appeal:reject:${appealId}`)
      .setLabel("Rechazar")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌"),
    new ButtonBuilder()
      .setCustomId(`appeal:reply:${appealId}`)
      .setLabel("Responder por DM")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("💬"),
  );
}

export async function sendAppealToStaff(guild: Guild, appeal: AppealRow): Promise<void> {
  const cfg = getGuildConfig(guild.id);

  const embed = new EmbedBuilder()
    .setColor(COLORS.ticket)
    .setTitle(`📜 Solicitud de Apelación de Sanción · #${appeal.id}`)
    .setDescription(`El usuario <@${appeal.user_id}> ha enviado una solicitud de apelación para revisión del Staff.`)
    .addFields(
      { name: "Usuario", value: `<@${appeal.user_id}> (\`${appeal.user_id}\` · \`${appeal.user_tag}\`)`, inline: true },
      { name: "Tipo de sanción", value: `\`${appeal.type.toUpperCase()}\`${appeal.case_id ? ` (Caso #${appeal.case_id})` : ""}`, inline: true },
      { name: "Estado", value: "⏳ **Pendiente de revisión**", inline: true },
      { name: "Alegaciones del usuario", value: appeal.reason.slice(0, 1024), inline: false },
      { name: "Pruebas o contexto", value: appeal.evidence ? appeal.evidence.slice(0, 1024) : "*No aportadas*", inline: false },
    )
    .setTimestamp(appeal.created_at)
    .setFooter({ text: `${SERVER_NAME} · apelaciones` });

  // Prioridad: canal fijo de apelaciones → canal configurado en guild_config → log de sanciones
  const candidateIds = [
    APPEALS_CHANNEL_ID,
    cfg.logs.sanctions,
    cfg.logs.moderation,
    cfg.tickets.logChannelId,
    cfg.tickets.categoryId,
  ].filter(Boolean) as string[];

  let sent = false;
  for (const channelId of candidateIds) {
    const channel = guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId).catch(() => null));
    if (channel && channel.isTextBased() && "send" in channel) {
      const msg = await channel.send({ embeds: [embed], components: [appealButtons(appeal.id)] }).catch(() => null);
      if (msg) {
        getDb().prepare("UPDATE appeals SET channel_id = ?, message_id = ? WHERE id = ?").run(channel.id, msg.id, appeal.id);
        sent = true;
        break;
      }
    }
  }

  if (!sent) {
    await sendLog(guild, "sanctions", embed);
  }
}

export async function handleAppealButton(interaction: ButtonInteraction): Promise<void> {
  const parts = interaction.customId.split(":");
  const action = parts[1];
  const appealId = Number(parts[2]);

  if (action === "start") {
    // Abrir modal de apelación para el usuario
    const guildId = parts[2] || OFFICIAL_GUILD_ID;
    const caseId = parts[3] ? Number(parts[3]) : null;

    const modal = new ModalBuilder()
      .setCustomId(`appeal:submit:${guildId}:${caseId ?? 0}`)
      .setTitle("Formulario de Apelación · Nexo");

    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("¿Por qué debería retirarse la sanción?")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Explica tu versión con sinceridad y respeto...")
      .setRequired(true)
      .setMinLength(20)
      .setMaxLength(1000);

    const evidenceInput = new TextInputBuilder()
      .setCustomId("evidence")
      .setLabel("Pruebas o contexto adicional (opcional)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Enlaces a capturas, contexto o información que ayude a tu caso...")
      .setRequired(false)
      .setMaxLength(1000);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(evidenceInput),
    );

    await interaction.showModal(modal);
    return;
  }

  // Las acciones de moderador requieren estar en un guild o ser staff
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "Acción solo disponible para el Staff en el servidor.", ephemeral: true });
    return;
  }

  const appeal = getAppeal(appealId);
  if (!appeal) {
    await interaction.reply({ content: "Apelación no encontrada.", ephemeral: true });
    return;
  }

  if (appeal.status !== "pending") {
    await interaction.reply({ content: `Esta apelación ya fue ${appeal.status === "approved" ? "aceptada" : "rechazada"} por <@${appeal.reviewed_by}>.`, ephemeral: true });
    return;
  }

  if (action === "accept") {
    await interaction.deferUpdate();
    const guild = interaction.guild;
    const client = interaction.client as NexoClient;

    // Retirar sanción en Discord según el tipo
    if (appeal.type === "ban" || appeal.type === "tempban") {
      await guild.bans.remove(appeal.user_id, `Apelación #${appeal.id} aceptada por ${interaction.user.tag}`).catch((err) => {
        logger.warn("No se pudo desbanear al aceptar apelación", err);
      });
      getDb()
        .prepare("UPDATE cases SET active = 0 WHERE guild_id = ? AND user_id = ? AND type IN ('ban','tempban')")
        .run(guild.id, appeal.user_id);
    } else if (appeal.type === "warn" && appeal.case_id) {
      getDb().prepare("UPDATE cases SET active = 0 WHERE guild_id = ? AND case_id = ?").run(guild.id, appeal.case_id);
    } else if (appeal.type === "timeout") {
      if (appeal.case_id) {
        getDb().prepare("UPDATE cases SET active = 0 WHERE guild_id = ? AND case_id = ?").run(guild.id, appeal.case_id);
      }
      const member = await guild.members.fetch(appeal.user_id).catch(() => null);
      if (member && member.isCommunicationDisabled()) {
        await member.timeout(null, `Apelación #${appeal.id} aceptada por ${interaction.user.tag}`).catch((err) => {
          logger.warn("No se pudo retirar el timeout al aceptar apelación", err);
        });
      }
    }

    getDb()
      .prepare("UPDATE appeals SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ?")
      .run(interaction.user.id, Date.now(), appeal.id);

    // Intentar crear invitación para el usuario si era ban
    let inviteUrl = "";
    if (appeal.type === "ban" || appeal.type === "tempban") {
      try {
        const defaultChannel = guild.rulesChannel || guild.systemChannel || guild.channels.cache.find((c) => c.isTextBased());
        if (defaultChannel && "createInvite" in defaultChannel) {
          const inv = await defaultChannel.createInvite({ maxAge: 86400 * 2, maxUses: 1, reason: `Apelación #${appeal.id} aprobada` });
          inviteUrl = inv.url;
        }
      } catch {
        /* ignore */
      }
    }

    // Notificar al usuario por DM
    const targetUser = await client.users.fetch(appeal.user_id).catch(() => null);
    if (targetUser) {
      let desc = `Tu solicitud de apelación para la sanción de **${appeal.type.toUpperCase()}** ha sido revisada y **aceptada** por el Staff.`;
      if (appeal.type === "ban" || appeal.type === "tempban") {
        desc += `\n\n${inviteUrl ? `Puedes volver a unirte al servidor con esta invitación única:\n🔗 ${inviteUrl}` : "Ya puedes volver a entrar al servidor con normalidad."}`;
      } else if (appeal.type === "timeout") {
        desc += "\n\nSe ha retirado tu aislamiento (timeout) y ya puedes volver a participar en los canales.";
      } else if (appeal.type === "warn") {
        desc += "\n\nLa advertencia ha sido retirada de tu historial de sanciones.";
      }

      const dm = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle(`✅ Apelación Aprobada en ${guild.name}`)
        .setDescription(desc)
        .setFooter({ text: `${SERVER_NAME} · respeta las normas de convivencia` })
        .setTimestamp();

      await targetUser.send({ embeds: [dm] }).catch(() => null);
    }

    // Actualizar embed original
    const oldEmbed = EmbedBuilder.from(interaction.message.embeds[0]!);
    oldEmbed.setColor(COLORS.success);
    oldEmbed.spliceFields(2, 1, {
      name: "Estado",
      value: `✅ **Aprobada** por ${interaction.user} (\`${interaction.user.tag}\`)`,
      inline: true,
    });

    await interaction.editReply({
      embeds: [oldEmbed],
      components: [],
    });
    return;
  }

  if (action === "reject") {
    // Abrir modal para que el staff indique el motivo
    const modal = new ModalBuilder()
      .setCustomId(`appeal:reject_submit:${appeal.id}`)
      .setTitle(`Rechazar Apelación #${appeal.id}`);

    const notesInput = new TextInputBuilder()
      .setCustomId("notes")
      .setLabel("Motivo del rechazo (se enviará al usuario)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Indica por qué se mantiene la sanción...")
      .setRequired(true)
      .setMaxLength(800);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput));
    await interaction.showModal(modal);
    return;
  }

  if (action === "reply") {
    const modal = new ModalBuilder()
      .setCustomId(`appeal:reply_submit:${appeal.id}`)
      .setTitle(`Responder a ${appeal.user_tag}`);

    const msgInput = new TextInputBuilder()
      .setCustomId("message")
      .setLabel("Mensaje a enviar por DM")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Escribe tu consulta o mensaje para el usuario...")
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(msgInput));
    await interaction.showModal(modal);
    return;
  }
}

export async function handleAppealModal(interaction: ModalSubmitInteraction): Promise<void> {
  const parts = interaction.customId.split(":");
  const action = parts[1];

  if (action === "submit") {
    const guildId = parts[2] || OFFICIAL_GUILD_ID;
    const caseId = Number(parts[3]) || null;
    const reason = interaction.fields.getTextInputValue("reason");
    const evidence = interaction.fields.getTextInputValue("evidence");

    // Verificar si ya tiene una apelación pendiente
    const existing = getPendingAppealForUser(guildId, interaction.user.id);
    if (existing) {
      await interaction.reply({
        content: `Ya tienes una solicitud de apelación pendiente (Ticket #${existing.id}). Por favor, espera a que el Staff la revise.`,
        ephemeral: true,
      });
      return;
    }

    let sanctionType = "sancion";
    if (caseId) {
      const c = getCase(guildId, caseId);
      if (c) sanctionType = c.type;
    }

    // Las apelaciones de baneo se hacen a través de Dyno
    if (sanctionType === "ban" || sanctionType === "tempban") {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Apelaciones de baneo en Dyno",
            `Las apelaciones de baneo se gestionan a través de **Dyno**.\n\n` +
            `🆔 **ID de tu sanción:** \`#${caseId}\`\n\n` +
            `🔗 **Formulario de apelación:** ${DYNO_BAN_APPEAL_URL}`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const appeal = createAppeal({
      guildId,
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      caseId: caseId && caseId > 0 ? caseId : null,
      type: sanctionType,
      reason,
      evidence,
    });

    const client = interaction.client as NexoClient;
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      await sendAppealToStaff(guild, appeal).catch((err) => logger.error("sendAppealToStaff", err));
    }

    await interaction.reply({
      embeds: [
        successEmbed(
          "Apelación enviada correctamente",
          `Tu solicitud de apelación **#${appeal.id}** ha sido enviada al equipo de moderación de **${guild?.name ?? SERVER_NAME}**.\n\nRecibirás una notificación por mensaje directo en cuanto un moderador revise tu caso.`,
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  if (action === "reject_submit") {
    const appealId = Number(parts[2]);
    const notes = interaction.fields.getTextInputValue("notes");
    const appeal = getAppeal(appealId);

    if (!appeal || appeal.status !== "pending") {
      await interaction.reply({ content: "La apelación ya fue resuelta o no existe.", ephemeral: true });
      return;
    }

    getDb()
      .prepare("UPDATE appeals SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, review_notes = ? WHERE id = ?")
      .run(interaction.user.id, Date.now(), notes, appeal.id);

    const client = interaction.client as NexoClient;
    const targetUser = await client.users.fetch(appeal.user_id).catch(() => null);
    if (targetUser) {
      const dm = new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle(`❌ Apelación Denegada en ${SERVER_NAME}`)
        .setDescription(
          `Tu solicitud de apelación ha sido revisada por el Staff y ha sido **denegada**.\n\n**Motivo:**\n${notes}\n\nLa sanción aplicada continuará vigente.`,
        )
        .setFooter({ text: `${SERVER_NAME} · decisiones del staff` })
        .setTimestamp();

      await targetUser.send({ embeds: [dm] }).catch(() => null);
    }

    if (interaction.message) {
      const oldEmbed = EmbedBuilder.from(interaction.message.embeds[0]!);
      oldEmbed.setColor(COLORS.danger);
      oldEmbed.spliceFields(2, 1, {
        name: "Estado",
        value: `❌ **Rechazada** por ${interaction.user} (\`${interaction.user.tag}\`)\n*Motivo:* ${notes}`,
        inline: false,
      });

      await interaction.message.edit({ embeds: [oldEmbed], components: [] }).catch(() => null);
    }

    await interaction.reply({ content: `Apelación #${appealId} rechazada correctamente.`, ephemeral: true });
    return;
  }

  if (action === "reply_submit") {
    const appealId = Number(parts[2]);
    const message = interaction.fields.getTextInputValue("message");
    const appeal = getAppeal(appealId);

    if (!appeal) {
      await interaction.reply({ content: "Apelación no encontrada.", ephemeral: true });
      return;
    }

    const client = interaction.client as NexoClient;
    const targetUser = await client.users.fetch(appeal.user_id).catch(() => null);
    if (!targetUser) {
      await interaction.reply({ content: "No se pudo contactar con el usuario (cuenta cerrada o inaccesible).", ephemeral: true });
      return;
    }

    const dm = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`💬 Mensaje del Staff de ${SERVER_NAME} (Apelación #${appeal.id})`)
      .setDescription(message)
      .setFooter({ text: "Si necesitas responder, puedes escribir en este chat privado" })
      .setTimestamp();

    await targetUser.send({ embeds: [dm] }).catch(() => null);
    await interaction.reply({ content: `Mensaje enviado por DM a <@${appeal.user_id}>.`, ephemeral: true });
    return;
  }
}
