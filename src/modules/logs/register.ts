import {
  AuditLogEvent,
  ChannelType,
  EmbedBuilder,
  Events,
  type GuildAuditLogsEntry,
  type GuildBasedChannel,
  type GuildMember,
  type Message,
  type PartialMessage,
  type Role,
  type VoiceState,
} from "discord.js";
import { COLORS } from "../../constants.js";
import { archiveMessage, getArchivedMessage, getDb, markDeleted } from "../../database/index.js";
import { truncate } from "../../utils/format.js";
import type { NexoClient } from "../../client.js";
import { logEmbed, sendLog } from "./dispatch.js";
import { getTicketByChannel, recordTicketMessageDelete, recordTicketMessageEdit } from "../tickets/manager.js";


function channelName(ch: GuildBasedChannel | null | undefined): string {
  if (!ch) return "desconocido";
  return `${ch} (\`${ch.id}\`)`;
}

export function registerLogEvents(client: NexoClient): void {
  client.on(Events.MessageDelete, async (message: Message | PartialMessage) => {
    try {
      if (!message.guild) return;
      const cached = getArchivedMessage(message.id);
      const content = message.content || cached?.content || "*sin contenido*";
      const author = message.author ?? (cached ? { id: cached.author_id, tag: cached.author_tag ?? cached.author_id } : null);
      markDeleted(message.id);
      if (author && "bot" in (message.author ?? {}) && message.author?.bot) return;
      getDb()
        .prepare(
          `INSERT INTO snipes (channel_id, guild_id, author_id, author_tag, content, attachments, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(channel_id) DO UPDATE SET author_id=excluded.author_id, author_tag=excluded.author_tag,
             content=excluded.content, attachments=excluded.attachments, deleted_at=excluded.deleted_at`,
        )
        .run(
          message.channelId,
          message.guild.id,
          author && "id" in author ? author.id : null,
          author && "tag" in author ? author.tag : null,
          truncate(content, 1800),
          JSON.stringify(message.attachments?.map((a) => a.url) ?? []),
          Date.now(),
        );
      const authorId = author && "id" in author ? author.id : null;
      const embed = logEmbed("Mensaje eliminado", COLORS.danger)
        .addFields(
          { name: "Autor", value: authorId ? `<@${authorId}> (\`${authorId}\`)` : "desconocido", inline: true },
          { name: "Canal", value: `<#${message.channelId}> (\`${message.channelId}\`)`, inline: true },
          { name: "Contenido", value: truncate(content || "*vacío*", 1024) },
        )
        .setFooter({ text: `Mensaje ID: ${message.id} | Canal ID: ${message.channelId}` });
      await sendLog(message.guild, "messages", embed);

      const ticket = getTicketByChannel(message.channelId);
      if (ticket) {
        recordTicketMessageDelete(message.id);
        const ticketEmbed = logEmbed("🗑️ Mensaje eliminado en Ticket #" + ticket.id, COLORS.danger)
          .addFields(
            { name: "Ticket", value: `#${ticket.id} (${ticket.category})`, inline: true },
            { name: "Canal", value: `<#${message.channelId}>`, inline: true },
            { name: "Autor", value: authorId ? `<@${authorId}> (\`${authorId}\`)` : "desconocido", inline: true },
            { name: "Contenido", value: truncate(content || "*vacío*", 1024) },
          )
          .setFooter({ text: `Ticket ID: ${ticket.id} | Mensaje ID: ${message.id}` });
        await sendLog(message.guild, "tickets", ticketEmbed);
      }
    } catch {
      /* ignore */
    }
  });

  client.on(Events.MessageUpdate, async (oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage) => {
    try {
      if (!newMsg.guild || newMsg.author?.bot) return;
      const before = oldMsg.content || getArchivedMessage(newMsg.id)?.content || "";
      const after = newMsg.content || "";
      if (before === after) return;
      archiveMessage({
        messageId: newMsg.id,
        guildId: newMsg.guild.id,
        channelId: newMsg.channelId,
        authorId: newMsg.author?.id ?? "0",
        authorTag: newMsg.author?.tag,
        content: after,
        attachments: newMsg.attachments?.map((a) => a.url),
        createdAt: newMsg.createdTimestamp,
      });
      const authorStr = newMsg.author ? `${newMsg.author} (\`${newMsg.author.id}\`)` : "desconocido";
      const embed = logEmbed("Mensaje editado", COLORS.warn)
        .addFields(
          { name: "Autor", value: authorStr, inline: true },
          { name: "Canal", value: `<#${newMsg.channelId}> (\`${newMsg.channelId}\`)`, inline: true },
          { name: "Antes", value: truncate(before || "*vacío*", 1024) },
          { name: "Después", value: truncate(after || "*vacío*", 1024) },
        )
        .setFooter({ text: `Mensaje ID: ${newMsg.id} | Canal ID: ${newMsg.channelId}` })
        .setURL(newMsg.url);
      await sendLog(newMsg.guild, "messages", embed);

      const ticket = getTicketByChannel(newMsg.channelId);
      if (ticket) {
        recordTicketMessageEdit(newMsg.id, after);
        const ticketEmbed = logEmbed("✏️ Mensaje editado en Ticket #" + ticket.id, COLORS.warn)
          .addFields(
            { name: "Ticket", value: `#${ticket.id} (${ticket.category})`, inline: true },
            { name: "Canal", value: `<#${newMsg.channelId}>`, inline: true },
            { name: "Autor", value: authorStr, inline: true },
            { name: "Antes", value: truncate(before || "*vacío*", 1024) },
            { name: "Después", value: truncate(after || "*vacío*", 1024) },
          )
          .setFooter({ text: `Ticket ID: ${ticket.id} | Mensaje ID: ${newMsg.id}` })
          .setURL(newMsg.url);
        await sendLog(newMsg.guild, "tickets", ticketEmbed);
      }
    } catch {
      /* ignore */
    }
  });


  client.on(Events.MessageBulkDelete, async (messages, channel) => {
    if (!("guild" in channel) || !channel.guild) return;
    const embed = logEmbed("Borrado masivo", COLORS.danger)
      .setDescription(`Se eliminaron **${messages.size}** mensajes en <#${channel.id}> (\`${channel.id}\`).`)
      .addFields({
        name: "Autores",
        value: truncate(
          [...new Set(messages.map((m) => (m.author ? `${m.author.tag} (\`${m.author.id}\`)` : "?")))]
            .slice(0, 20)
            .join(", ") || "—",
          1024,
        ),
      });
    await sendLog(channel.guild, "messages", embed);
  });

  client.on(Events.ChannelCreate, async (channel) => {
    if (!channel.guild) return;
    const cat = "parentId" in channel && channel.parentId ? ` · Categoría: <#${channel.parentId}> (\`${channel.parentId}\`)` : "";
    await sendLog(
      channel.guild,
      "server",
      logEmbed("Canal creado", COLORS.success).setDescription(`${channel} (\`${channel.id}\`) · tipo ${ChannelType[channel.type]}${cat}`),
    );
  });

  client.on(Events.ChannelDelete, async (channel) => {
    if (channel.isDMBased()) return;
    await sendLog(
      channel.guild,
      "server",
      logEmbed("Canal eliminado", COLORS.danger).setDescription(`#${channel.name} (\`${channel.id}\`) · tipo ${ChannelType[channel.type]}`),
    );
  });

  client.on(Events.ChannelUpdate, async (oldCh, newCh) => {
    if (newCh.isDMBased()) return;
    const changes: string[] = [];
    if ("name" in oldCh && "name" in newCh && oldCh.name !== newCh.name) changes.push(`Nombre: \`${oldCh.name}\` → \`${newCh.name}\``);
    if ("topic" in oldCh && "topic" in newCh && oldCh.topic !== newCh.topic) changes.push("Tema actualizado");
    if ("nsfw" in oldCh && "nsfw" in newCh && oldCh.nsfw !== newCh.nsfw) changes.push(`NSFW: ${newCh.nsfw}`);
    if ("rateLimitPerUser" in oldCh && "rateLimitPerUser" in newCh && oldCh.rateLimitPerUser !== newCh.rateLimitPerUser) {
      changes.push(`Slowmode: ${oldCh.rateLimitPerUser}s → ${newCh.rateLimitPerUser}s`);
    }
    if (!changes.length) return;
    await sendLog(
      newCh.guild,
      "server",
      logEmbed("Canal actualizado", COLORS.info).setDescription(`${newCh} (\`${newCh.id}\`)\n${changes.join("\n")}`),
    );
  });

  client.on(Events.GuildRoleCreate, async (role: Role) => {
    await sendLog(role.guild, "server", logEmbed("Rol creado", COLORS.success).setDescription(`${role} (\`${role.id}\`)`));
  });
  client.on(Events.GuildRoleDelete, async (role: Role) => {
    await sendLog(role.guild, "server", logEmbed("Rol eliminado", COLORS.danger).setDescription(`@${role.name} (\`${role.id}\`)`));
  });
  client.on(Events.GuildRoleUpdate, async (oldRole: Role, newRole: Role) => {
    const changes: string[] = [];
    if (oldRole.name !== newRole.name) changes.push(`Nombre: \`${oldRole.name}\` → \`${newRole.name}\``);
    if (oldRole.color !== newRole.color) changes.push(`Color: ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (oldRole.hoist !== newRole.hoist) changes.push(`Separado: ${newRole.hoist}`);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`Mencionable: ${newRole.mentionable}`);
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push("Permisos modificados");
    if (!changes.length) return;
    await sendLog(newRole.guild, "server", logEmbed("Rol actualizado", COLORS.info).setDescription(`${newRole} (\`${newRole.id}\`)\n${changes.join("\n")}`));
  });

  client.on(Events.GuildBanAdd, async (ban) => {
    await sendLog(
      ban.guild,
      "moderation",
      logEmbed("Usuario baneado", COLORS.danger).setDescription(`<@${ban.user.id}> · ${ban.user.tag} (\`${ban.user.id}\`)\n**Razón:** ${ban.reason ?? "Sin razón"}`),
    );
  });
  client.on(Events.GuildBanRemove, async (ban) => {
    await sendLog(
      ban.guild,
      "moderation",
      logEmbed("Usuario desbaneado", COLORS.success).setDescription(`<@${ban.user.id}> · ${ban.user.tag} (\`${ban.user.id}\`)`),
    );
  });

  client.on(Events.VoiceStateUpdate, async (oldS: VoiceState, newS: VoiceState) => {
    const guild = newS.guild;
    const member = newS.member ?? oldS.member;
    if (!member || member.user.bot) return;
    if (!oldS.channelId && newS.channelId) {
      await sendLog(guild, "voice", logEmbed("Entra a voz", COLORS.voice).setDescription(`${member} (\`${member.id}\`) → <#${newS.channelId}> (\`${newS.channelId}\`)`));
    } else if (oldS.channelId && !newS.channelId) {
      await sendLog(guild, "voice", logEmbed("Sale de voz", COLORS.mute).setDescription(`${member} (\`${member.id}\`) ← <#${oldS.channelId}> (\`${oldS.channelId}\`)`));
    } else if (oldS.channelId && newS.channelId && oldS.channelId !== newS.channelId) {
      await sendLog(
        guild,
        "voice",
        logEmbed("Se mueve de voz", COLORS.info).setDescription(
          `${member} (\`${member.id}\`)\n<#${oldS.channelId}> (\`${oldS.channelId}\`) → <#${newS.channelId}> (\`${newS.channelId}\`)`,
        ),
      );
    }
  });

  client.on(Events.GuildUpdate, async (oldG, newG) => {
    const changes: string[] = [];
    if (oldG.name !== newG.name) changes.push(`Nombre: \`${oldG.name}\` → \`${newG.name}\``);
    if (oldG.icon !== newG.icon) changes.push("Icono cambiado");
    if (oldG.premiumSubscriptionCount !== newG.premiumSubscriptionCount) {
      changes.push(`Boosts: ${oldG.premiumSubscriptionCount ?? 0} → ${newG.premiumSubscriptionCount ?? 0}`);
    }
    if (oldG.vanityURLCode !== newG.vanityURLCode) changes.push(`Vanity: ${newG.vanityURLCode ?? "—"}`);
    if (!changes.length) return;
    await sendLog(newG, "server", logEmbed("Servidor actualizado", COLORS.info).setDescription(changes.join("\n")));
  });

  client.on(Events.GuildAuditLogEntryCreate, async (entry: GuildAuditLogsEntry, guild) => {
    try {
      const embed = new EmbedBuilder()
        .setColor(COLORS.log)
        .setTitle(`Registro de auditoría · ${AuditLogEvent[entry.action] ?? entry.action}`)
        .addFields(
          { name: "Ejecutor", value: entry.executor ? `${entry.executor.tag} (\`${entry.executor.id}\`)` : "desconocido", inline: true },
          { name: "Objetivo", value: entry.targetId ? `\`${entry.targetId}\`` : "—", inline: true },
          { name: "Razón", value: entry.reason || "—", inline: false },
        )
        .setTimestamp(entry.createdTimestamp);
      const changes = entry.changes
        ?.slice(0, 8)
        .map((c) => `\`${c.key}\`: ${truncate(String(c.old ?? "∅"), 40)} → ${truncate(String(c.new ?? "∅"), 40)}`)
        .join("\n");
      if (changes) embed.addFields({ name: "Cambios", value: truncate(changes, 1024) });
      await sendLog(guild, "audit", embed);
    } catch {
      /* missing permission */
    }
  });

  client.on(Events.GuildEmojiCreate, async (emoji) => {
    if (!emoji.guild) return;
    await sendLog(emoji.guild, "server", logEmbed("Emoji creado", COLORS.success).setDescription(`${emoji} \`:${emoji.name}:\` (\`${emoji.id}\`)`).setThumbnail(emoji.imageURL()));
  });
  client.on(Events.GuildEmojiDelete, async (emoji) => {
    if (!emoji.guild) return;
    await sendLog(emoji.guild, "server", logEmbed("Emoji eliminado", COLORS.danger).setDescription(`:${emoji.name}: (\`${emoji.id}\`)`));
  });

  client.on(Events.InviteCreate, async (invite) => {
    if (!invite.guild || !("id" in invite.guild)) return;
    const guild = client.guilds.cache.get(invite.guild.id);
    if (!guild) return;
    await sendLog(
      guild,
      "joins",
      logEmbed("Invitación creada", COLORS.info).setDescription(
        `Código \`${invite.code}\` por ${invite.inviter ? `<@${invite.inviter.id}> (\`${invite.inviter.id}\`)` : "?"} · max ${invite.maxUses || "∞"} · canal ${invite.channel ? `<#${invite.channel.id}> (\`${invite.channel.id}\`)` : "desconocido"}`,
      ),
    );
  });
}

export function describeMemberUpdate(oldM: GuildMember, newM: GuildMember): string[] {
  const changes: string[] = [];
  if (oldM.nickname !== newM.nickname) changes.push(`Apodo: \`${oldM.nickname ?? oldM.user.username}\` → \`${newM.nickname ?? newM.user.username}\``);
  const added = newM.roles.cache.filter((r) => !oldM.roles.cache.has(r.id) && r.id !== newM.guild.id);
  const removed = oldM.roles.cache.filter((r) => !newM.roles.cache.has(r.id) && r.id !== newM.guild.id);
  if (added.size) changes.push(`Roles añadidos: ${added.map((r) => `${r} (\`${r.id}\`)`).join(", ")}`);
  if (removed.size) changes.push(`Roles quitados: ${removed.map((r) => `${r} (\`${r.id}\`)`).join(", ")}`);
  if (oldM.communicationDisabledUntilTimestamp !== newM.communicationDisabledUntilTimestamp) {
    changes.push(
      newM.communicationDisabledUntilTimestamp
        ? `Timeout hasta <t:${Math.floor(newM.communicationDisabledUntilTimestamp / 1000)}:F>`
        : "Timeout retirado",
    );
  }
  return changes;
}

export { channelName };
