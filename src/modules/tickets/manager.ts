import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type GuildMember,
  type GuildTextBasedChannel,
  type Message,
  type StringSelectMenuInteraction,
} from "discord.js";
import { COLORS } from "../../constants.js";
import { getDb, getGuildConfig } from "../../database/index.js";
import { completeChat } from "../ai/client.js";
import { buildSystemWithMemory, bumpMemory, getMemory, refreshSummary } from "../ai/memory.js";
import { renderTranscriptHtml, saveTranscript, type TranscriptMessage } from "./transcript.js";
import { sendTicketLog } from "./log.js";
import { getEventsBrief } from "./eventsFeed.js";

export interface TicketRow {
  id: number;
  guild_id: string;
  channel_id: string | null;
  opener_id: string;
  claimed_by: string | null;
  category: string;
  status: string;
  ai_enabled: number;
  created_at: number;
  closed_at: number | null;
  close_reason: string | null;
}

export function getTicketByChannel(channelId: string): TicketRow | undefined {
  return getDb().prepare("SELECT * FROM tickets WHERE channel_id = ?").get(channelId) as TicketRow | undefined;
}

export function panelEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.ticket)
    .setTitle("🎫 Tickets · Nexo")
    .setDescription(
      [
        "¿Necesitas ayuda o quieres hacer una propuesta? Abre un ticket eligiendo una categoría.",
        "",
        "🐱 **Soporte** — Neko (IA) te responde al momento. Si te resolvió, puedes **Cerrar** el ticket. Si un staff reclama, la IA se apaga.",
        "💡 **Sugerencias** — Ideas y propuestas para mejorar Nexo · atendido solo por el Staff.",
        "🛡️ **Reportes, apelaciones y otros** — atendidos por el Staff.",
        "🤝 **Alianzas** — Temporalmente cerradas (Soon).",
        "",
        "No abras tickets para temas que van en chat general.",
      ].join("\n"),
    )

    .setFooter({ text: "Un ticket por persona · Sé claro y respetuoso" });
}

export function panelSelect(categories: { id: string; label: string; description: string; emoji: string }[]) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket:open")
      .setPlaceholder("Elige el tipo de ticket")
      .addOptions(
        categories.slice(0, 25).map((c) => ({
          label: c.label,
          value: c.id,
          description: c.description.slice(0, 100),
          emoji: c.emoji,
        })),
      ),
  );
}

export function ticketAllowsAi(category: string, cfgAiCategories?: string[]): boolean {
  const allowed = cfgAiCategories?.length ? cfgAiCategories : ["soporte"];
  return allowed.includes(category);
}

export function ticketButtons(claimed: boolean, withAi = false) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:claim")
      .setLabel(claimed ? "Reclamado" : "Reclamar")
      .setStyle(ButtonStyle.Success)
      .setDisabled(claimed),
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Cerrar").setStyle(ButtonStyle.Danger),
  );
  if (withAi) {
    row.addComponents(
      new ButtonBuilder().setCustomId("ticket:ai").setLabel("IA on/off").setStyle(ButtonStyle.Secondary),
    );
  }
  return row;
}

export async function openTicket(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const guild = interaction.guild;
  const cfg = getGuildConfig(guild.id);
  const categoryId = interaction.values[0];

  if (categoryId === "alianzas") {
    await interaction.reply({
      content: "🤝 **Alianzas & Partnerships (Próximamente / Soon)**\nEl sistema de alianzas se encuentra cerrado temporalmente. ¡Pronto volverá a estar disponible!",
      ephemeral: true,
    });
    return;
  }

  const cat = cfg.tickets.categories.find((c) => c.id === categoryId);
  if (!cat) {
    await interaction.reply({ content: "Categoría inválida.", ephemeral: true });
    return;
  }
  const existing = getDb()
    .prepare("SELECT * FROM tickets WHERE guild_id = ? AND opener_id = ? AND status IN ('open','claimed')")
    .get(guild.id, interaction.user.id) as TicketRow | undefined;
  if (existing?.channel_id) {
    await interaction.reply({ content: `Ya tienes un ticket abierto: <#${existing.channel_id}>`, ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const parent = cfg.tickets.categoryId ?? undefined;
  const staff = cfg.tickets.staffRoleId;
  const channel = await guild.channels.create({
    name: `ticket-${interaction.user.username}`.slice(0, 90).toLowerCase().replace(/[^a-z0-9-]/g, ""),
    type: ChannelType.GuildText,
    parent,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory],
      },
      ...(staff
        ? [
            {
              id: staff,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages,
              ],
            },
          ]
        : []),
      {
        id: guild.members.me!.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.AttachFiles],
      },
    ],
    reason: `Ticket ${cat.label} de ${interaction.user.tag}`,
  });

  const aiOn = Boolean(cfg.tickets.aiEnabled && cfg.ai.enabled && ticketAllowsAi(cat.id, cfg.tickets.aiCategories));
  const info = getDb()
    .prepare(
      `INSERT INTO tickets (guild_id, channel_id, opener_id, category, status, ai_enabled, created_at)
       VALUES (?, ?, ?, ?, 'open', ?, ?)`,
    )
    .run(guild.id, channel.id, interaction.user.id, cat.id, aiOn ? 1 : 0, Date.now());

  const waitText = aiOn
    ? "Neko (IA) te responderá en unos segundos. Cuando te haya resuelto, puedes pulsar **Cerrar**. Si un staff reclama el ticket, la IA se apaga y te atiende un humano."
    : "Este tipo de ticket lo atiende **solo el staff**. Describe el caso y espera a un humano.";
  const embed = new EmbedBuilder()
    .setColor(COLORS.ticket)
    .setTitle(`${cat.emoji} Ticket · ${cat.label}`)
    .setDescription(`Hola ${interaction.user}, describe tu caso con detalle.\n${waitText}`)
    .addFields(
      { name: "Categoría", value: cat.label, inline: true },
      { name: "ID", value: `#${info.lastInsertRowid}`, inline: true },
      { name: "Atención", value: aiOn ? "Neko + staff" : "Solo staff", inline: true },
    );

  await channel.send({
    content: `${interaction.user}${staff ? ` · <@&${staff}>` : ""}`,
    embeds: [embed],
    components: [ticketButtons(false, aiOn)],
  });
  await interaction.editReply({ content: `Ticket creado: ${channel}` });
  const opened = getTicketByChannel(channel.id);
  if (opened) {
    await sendTicketLog(guild, opened, `Ticket abierto · ${cat.label}`, COLORS.ticket, {
      "IA": aiOn ? "Neko activa (solo soporte)" : "Solo staff",
    });
  }
}

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const ticket = getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ content: "Este canal no es un ticket.", ephemeral: true });
    return;
  }
  const action = interaction.customId.split(":")[1];
  const cfg = getGuildConfig(interaction.guild.id);
  const member = interaction.member as GuildMember;
  const isStaff =
    member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    (cfg.tickets.staffRoleId && member.roles.cache.has(cfg.tickets.staffRoleId));

  if (action === "claim") {
    if (!isStaff) {
      await interaction.reply({ content: "Solo el staff puede reclamar tickets.", ephemeral: true });
      return;
    }
    getDb()
      .prepare("UPDATE tickets SET claimed_by = ?, status = 'claimed', ai_enabled = 0 WHERE id = ?")
      .run(member.id, ticket.id);
    const allowAi = ticketAllowsAi(ticket.category, cfg.tickets.aiCategories);
    await interaction.update({ components: [ticketButtons(true, allowAi)] });
    const claimCh = interaction.channel;
    if (claimCh?.isTextBased() && "send" in claimCh) {
      const extra = ticket.ai_enabled
        ? " Neko se retira: a partir de ahora te atiende un humano."
        : "";
      await claimCh.send({ content: `${member} ha reclamado el ticket.${extra}` });
    }
    const claimed = getTicketByChannel(interaction.channelId);
    if (claimed) {
      await sendTicketLog(interaction.guild, claimed, "Ticket reclamado", COLORS.success, {
        "Staff": `${member} (\`${member.id}\`)`,
        "IA": "Desactivada al reclamar",
      });
    }
    return;
  }

  if (action === "ai") {
    if (!isStaff) {
      await interaction.reply({ content: "Solo el staff puede cambiar la IA.", ephemeral: true });
      return;
    }
    if (!ticketAllowsAi(ticket.category, cfg.tickets.aiCategories)) {
      await interaction.reply({
        content: "Este tipo de ticket es solo humano. La IA no se puede activar aquí.",
        ephemeral: true,
      });
      return;
    }
    const next = ticket.ai_enabled ? 0 : 1;
    getDb().prepare("UPDATE tickets SET ai_enabled = ? WHERE id = ?").run(next, ticket.id);
    await interaction.reply({
      content: next ? "IA reactivada en este ticket." : "IA desactivada en este ticket.",
      ephemeral: true,
    });
    return;
  }

  if (action === "close") {
    if (!isStaff && member.id !== ticket.opener_id) {
      await interaction.reply({ content: "No puedes cerrar este ticket.", ephemeral: true });
      return;
    }
    await interaction.reply({ content: "Cerrando ticket y generando transcripción…" });
    await closeTicket(ticket, member, "Cerrado por botón");
  }
}

export async function closeTicket(ticket: TicketRow, closer: GuildMember, reason: string): Promise<void> {
  const guild = closer.guild;
  const channel = ticket.channel_id ? guild.channels.cache.get(ticket.channel_id) : null;
  const msgs = getDb()
    .prepare("SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at")
    .all(ticket.id) as TranscriptMessage[];
  const html = renderTranscriptHtml(guild.name, ticket.id, ticket.opener_id, ticket.category, msgs);
  const file = saveTranscript(guild.id, ticket.id, html);
  getDb()
    .prepare("UPDATE tickets SET status = 'closed', closed_at = ?, close_reason = ? WHERE id = ?")
    .run(Date.now(), reason, ticket.id);

  const cfg = getGuildConfig(guild.id);
  const logCh = cfg.tickets.transcriptChannelId || cfg.tickets.logChannelId;
  if (logCh) {
    const dest = guild.channels.cache.get(logCh);
    if (dest?.isTextBased() && "send" in dest) {
      await dest
        .send({
          content: [
            `Transcripción ticket **#${ticket.id}**`,
            `Abre: <@${ticket.opener_id}> (\`${ticket.opener_id}\`)`,
            ticket.claimed_by ? `Reclama: <@${ticket.claimed_by}> (\`${ticket.claimed_by}\`)` : null,
            `Cierra: ${closer} (\`${closer.id}\`)`,
            `Razón: ${reason}`,
          ]
            .filter(Boolean)
            .join("\n"),
          files: [{ attachment: file, name: `ticket-${ticket.id}.html` }],
        })
        .catch(() => null);
    }
  }
  await sendTicketLog(
    guild,
    { ...ticket, status: "closed" },
    "Ticket cerrado",
    COLORS.danger,
    {
      "Cerrado por": `${closer} (\`${closer.id}\`)`,
      "Razón": reason || "—",
      "Mensajes": String(msgs.length),
    },
    closer.id,
  );
  if (channel?.isTextBased() && "send" in channel) {
    await (channel as GuildTextBasedChannel).send("Ticket cerrado. El canal se elimina en 5s.").catch(() => null);
    setTimeout(() => {
      if ("delete" in channel) void channel.delete("Ticket cerrado").catch(() => null);
    }, 5000);
  }
}

const aiCooldown = new Map<number, number>();
const aiQueues = new Map<number, Promise<void>>();

export async function handleTicketMessage(message: Message): Promise<void> {
  if (!message.inGuild() || message.author.bot) return;
  const ticket = getTicketByChannel(message.channelId);
  if (!ticket || ticket.status === "closed") return;

  getDb()
    .prepare(
      `INSERT INTO ticket_messages (ticket_id, author_id, author_tag, content, attachments, created_at, is_bot)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
    )
    .run(
      ticket.id,
      message.author.id,
      message.author.tag,
      message.content,
      JSON.stringify([...message.attachments.values()].map((a) => a.url)),
      Date.now(),
    );

  if (!ticket.ai_enabled) return;
  if (message.author.id !== ticket.opener_id) return;
  const cfg = getGuildConfig(message.guild.id);
  if (!cfg.ai.enabled || !cfg.tickets.aiEnabled) return;
  if (!ticketAllowsAi(ticket.category, cfg.tickets.aiCategories)) return;
  const last = aiCooldown.get(ticket.id) ?? 0;
  if (Date.now() - last < 4000) return;
  aiCooldown.set(ticket.id, Date.now());

  const previous = aiQueues.get(ticket.id) ?? Promise.resolve();
  const current = previous.then(() => generateTicketReply(message, ticket, cfg));
  aiQueues.set(ticket.id, current.catch(() => undefined));
  await current;
}

async function generateTicketReply(
  message: Message,
  ticket: TicketRow,
  cfg: ReturnType<typeof getGuildConfig>,
): Promise<void> {
  const history = getDb()
    .prepare("SELECT author_id, content, is_bot FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 24")
    .all(ticket.id) as { author_id: string; content: string | null; is_bot: number }[];

  const messages = history
    .reverse()
    .filter((m) => m.content)
    .map((m) => {
      const content = m.content as string;
      if (m.is_bot) return { role: "assistant" as const, content };
      const prefix = m.author_id === ticket.opener_id ? "" : "[Staff] ";
      return { role: "user" as const, content: prefix + content };
    });

  if (!message.channel.isTextBased() || !("sendTyping" in message.channel)) return;
  if (!message.guild) return;
  await message.channel.sendTyping().catch(() => null);
  const mem = getMemory(ticket.id);
  const eventsBrief = await getEventsBrief(message.guild);
  const reply = await completeChat({
    system: `${buildSystemWithMemory(cfg.ai.systemPrompt, mem)}\n\n${eventsBrief}`,
    messages,
  });
  if (!reply) {
    await message.channel.send({
      content: "Neko no ha podido responder ahora (todos los proveedores están ocupados). Un humano del staff te atenderá.",
    }).catch(() => null);
    return;
  }
  bumpMemory(ticket.id, reply.provider, reply.model);
  const sent = await message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.ticket)
        .setAuthor({ name: "Neko · IA de soporte" })
        .setDescription(reply.text.slice(0, 4000))
        .setFooter({ text: "Respuesta automática · el staff puede corregirla" }),
    ],
  });
  getDb()
    .prepare(
      `INSERT INTO ticket_messages (ticket_id, author_id, author_tag, content, attachments, created_at, is_bot)
       VALUES (?, ?, ?, ?, '[]', ?, 1)`,
    )
    .run(ticket.id, sent.author.id, "Neko IA", reply.text, Date.now());
  void refreshSummary(ticket.id, [...messages, { role: "assistant", content: reply.text }]);
}
