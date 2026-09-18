import { EmbedBuilder, Guild, type ColorResolvable, type GuildTextBasedChannel } from "discord.js";
import { getDb, getGuildConfig } from "../../database/index.js";
import { sendLog } from "../logs/dispatch.js";
import { createCanvas, drawCircleImage, loadImage, registerFonts } from "../../utils/canvas.js";
import { timestamp } from "../../utils/time.js";

export interface TicketLogTarget {
  id: number;
  opener_id: string;
  claimed_by: string | null;
  category: string;
  status: string;
  channel_id: string | null;
  created_at: number;
}

registerFonts();

export interface TicketPerson {
  id: string;
  tag: string;
  avatar: string;
  role: string;
}

async function fetchPerson(guild: Guild, id: string, role: string): Promise<TicketPerson | null> {
  const user = await guild.client.users.fetch(id).catch(() => null);
  if (!user) return { id, tag: id, avatar: "", role };
  return {
    id: user.id,
    tag: user.tag,
    avatar: user.displayAvatarURL({ extension: "png", size: 128 }),
    role,
  };
}

export async function collectTicketPeople(
  guild: Guild,
  ticket: TicketLogTarget,
  extra?: { closerId?: string },
): Promise<TicketPerson[]> {
  const byId = new Map<string, TicketPerson>();
  const add = async (id: string | null | undefined, role: string) => {
    if (!id || byId.has(id)) {
      if (id && byId.has(id) && role) {
        const prev = byId.get(id)!;
        if (!prev.role.includes(role)) prev.role = `${prev.role}, ${role}`;
      }
      return;
    }
    const p = await fetchPerson(guild, id, role);
    if (p) byId.set(id, p);
  };

  await add(ticket.opener_id, "Abre");
  await add(ticket.claimed_by, "Reclama");
  await add(extra?.closerId, "Cierra");

  const authors = getDb()
    .prepare("SELECT DISTINCT author_id, is_bot FROM ticket_messages WHERE ticket_id = ?")
    .all(ticket.id) as { author_id: string; is_bot: number }[];
  for (const a of authors) {
    if (a.is_bot) continue;
    await add(a.author_id, "Participa");
  }

  const ch = ticket.channel_id ? guild.channels.cache.get(ticket.channel_id) : null;
  if (ch && "permissionOverwrites" in ch) {
    const meId = guild.members.me?.id;
    for (const ow of ch.permissionOverwrites.cache.values()) {
      if (ow.type !== 1) continue;
      if (ow.id === meId || ow.id === guild.id) continue;
      await add(ow.id, "Añadido");
    }
  }

  return [...byId.values()];
}

export async function peopleStrip(people: TicketPerson[]): Promise<Buffer | null> {
  const list = people.filter((p) => p.avatar).slice(0, 8);
  if (!list.length) return null;
  const size = 96;
  const gap = 16;
  const labelH = 36;
  const pad = 20;
  const W = pad * 2 + list.length * size + (list.length - 1) * gap;
  const H = pad * 2 + size + labelH;
  const canvas = createCanvas(Math.max(W, 320), H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1a1423";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.font = '12px "Inter", sans-serif';
  for (let i = 0; i < list.length; i++) {
    const p = list[i]!;
    const x = pad + i * (size + gap);
    const y = pad;
    try {
      const img = await loadImage(p.avatar);
      ctx.strokeStyle = "#ff8fab";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();
      drawCircleImage(ctx, img, x, y, size);
    } catch {
      ctx.fillStyle = "#2b1b33";
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffc8dd";
    const label = p.role.split(",")[0] ?? "";
    ctx.fillText(label.slice(0, 12), x + size / 2, y + size + 16);
  }
  return canvas.toBuffer("image/png");
}

function personLine(p: TicketPerson): string {
  return `**${p.role}** · <@${p.id}>\n\`${p.tag}\` · ID \`${p.id}\``;
}

export function ticketLogEmbed(opts: {
  title: string;
  color: ColorResolvable;
  ticket: TicketLogTarget;
  people: TicketPerson[];
  extra?: Record<string, string>;
  hasStrip?: boolean;
}): EmbedBuilder {
  const t = opts.ticket;
  const opener = opts.people.find((p) => p.id === t.opener_id);
  const e = new EmbedBuilder()
    .setColor(opts.color)
    .setTitle(opts.title)
    .setTimestamp()
    .addFields(
      { name: "Ticket", value: `#${t.id}`, inline: true },
      { name: "Categoría", value: t.category, inline: true },
      { name: "Estado", value: t.status, inline: true },
      { name: "Canal", value: t.channel_id ? `<#${t.channel_id}>\nID \`${t.channel_id}\`` : "—", inline: true },
      { name: "Abierto", value: timestamp(t.created_at, "F"), inline: true },
    );
  if (opener?.avatar) e.setThumbnail(opener.avatar);
  if (opts.hasStrip) e.setImage("attachment://implicados.png");
  const chunks: string[] = [];
  let buf = "";
  for (const p of opts.people) {
    const line = personLine(p);
    if ((buf + "\n\n" + line).length > 1000) {
      chunks.push(buf);
      buf = line;
    } else buf = buf ? `${buf}\n\n${line}` : line;
  }
  if (buf) chunks.push(buf);
  chunks.slice(0, 4).forEach((c, i) => e.addFields({ name: i === 0 ? "Implicados" : "Implicados (cont.)", value: c }));
  if (opts.extra) {
    for (const [k, v] of Object.entries(opts.extra)) e.addFields({ name: k, value: v.slice(0, 1024) });
  }
  return e;
}

export async function sendTicketLog(
  guild: Guild,
  ticket: TicketLogTarget,
  title: string,
  color: ColorResolvable,
  extra?: Record<string, string>,
  closerId?: string,
): Promise<void> {
  const people = await collectTicketPeople(guild, ticket, { closerId });
  const strip = await peopleStrip(people).catch(() => null);
  const files = strip ? [{ attachment: strip, name: "implicados.png" }] : undefined;
  const embed = ticketLogEmbed({ title, color, ticket, people, extra, hasStrip: Boolean(strip) });
  await sendLog(guild, "tickets", embed, files);

  const cfg = getGuildConfig(guild.id);
  const chId = cfg.tickets.logChannelId;
  if (chId && chId !== cfg.logs.tickets) {
    const ch = guild.channels.cache.get(chId);
    if (ch?.isTextBased() && "send" in ch) {
      await (ch as GuildTextBasedChannel)
        .send({ embeds: [embed], files })
        .catch(() => null);
    }
  }
}


