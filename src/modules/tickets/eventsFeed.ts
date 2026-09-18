import type { Guild, Message } from "discord.js";
import { EVENTS_CHANNEL_ID } from "../../constants.js";

let cache: { at: number; text: string } | null = null;
const TTL_MS = 120_000;

function formatEventMessage(m: Message): string {
  const when = new Date(m.createdTimestamp).toISOString().slice(0, 16).replace("T", " ");
  const bits: string[] = [];
  if (m.content?.trim()) bits.push(m.content.trim().slice(0, 500));
  for (const e of m.embeds.slice(0, 2)) {
    const parts = [e.title, e.description, ...e.fields.slice(0, 6).map((f) => `${f.name}: ${f.value}`)].filter(Boolean);
    if (parts.length) bits.push(parts.join(" · ").slice(0, 700));
  }
  if (!bits.length) return "";
  return `• ${when} UTC · ${m.author.username}: ${bits.join("\n  ")}`;
}

export async function getEventsBrief(guild: Guild): Promise<string> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.text;
  const header = [
    `EVENTOS EN CURSO (últimos mensajes reales de <#${EVENTS_CHANNEL_ID}>.`,
    "Úsalos para responder sobre eventos. No inventes fechas, horas ni premios que no estén aquí.",
    "Si está vacío o no se pudo leer, di que se anuncian en ese canal.)",
  ].join(" ");
  try {
    const ch =
      guild.channels.cache.get(EVENTS_CHANNEL_ID) ?? (await guild.channels.fetch(EVENTS_CHANNEL_ID).catch(() => null));
    if (!ch || !ch.isTextBased() || !("messages" in ch)) {
      const text = `${header}\n(canal no accesible ahora)`;
      cache = { at: Date.now(), text };
      return text;
    }
    const fetched = await ch.messages.fetch({ limit: 8 });
    const lines = [...fetched.values()]
      .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
      .map(formatEventMessage)
      .filter(Boolean)
      .slice(0, 6);
    const text = `${header}\n${lines.join("\n") || "(sin mensajes recientes)"}`;
    cache = { at: Date.now(), text };
    return text;
  } catch {
    const text = `${header}\n(no se pudo leer el canal ahora)`;
    cache = { at: Date.now(), text };
    return text;
  }
}
