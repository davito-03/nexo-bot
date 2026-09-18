import { getDb } from "../../database/index.js";
import { logger } from "../../logger.js";
import { completeChat } from "./client.js";

export interface TicketMemory {
  ticket_id: number;
  summary: string | null;
  facts: string | null;
  last_provider: string | null;
  last_model: string | null;
  turn_count: number;
  updated_at: number;
}

export function getMemory(ticketId: number): TicketMemory {
  const row = getDb().prepare("SELECT * FROM ticket_ai_memory WHERE ticket_id = ?").get(ticketId) as TicketMemory | undefined;
  if (row) return row;
  const now = Date.now();
  getDb()
    .prepare(
      "INSERT INTO ticket_ai_memory (ticket_id, summary, facts, last_provider, last_model, turn_count, updated_at) VALUES (?, NULL, NULL, NULL, NULL, 0, ?)",
    )
    .run(ticketId, now);
  return {
    ticket_id: ticketId,
    summary: null,
    facts: null,
    last_provider: null,
    last_model: null,
    turn_count: 0,
    updated_at: now,
  };
}

export function bumpMemory(ticketId: number, provider: string, model: string): TicketMemory {
  const mem = getMemory(ticketId);
  getDb()
    .prepare(
      "UPDATE ticket_ai_memory SET last_provider = ?, last_model = ?, turn_count = turn_count + 1, updated_at = ? WHERE ticket_id = ?",
    )
    .run(provider, model, Date.now(), ticketId);
  return { ...mem, last_provider: provider, last_model: model, turn_count: mem.turn_count + 1 };
}

export function buildSystemWithMemory(basePrompt: string, mem: TicketMemory): string {
  const parts = [
    basePrompt,
    "",
    "CONTEXTO INTERNO (no lo menciones al usuario, no digas qué modelo o proveedor eres):",
    "Eres Neko. Varios motores pueden generar tu respuesta; la memoria de ESTE ticket es la fuente de verdad.",
    "Si el usuario se contradice con hechos anteriores, pregunta; no inventes.",
  ];
  if (mem.summary) {
    parts.push("", "RESUMEN DEL TICKET HASTA AHORA:", mem.summary);
  }
  if (mem.facts) {
    parts.push("", "HECHOS FIJOS:", mem.facts);
  }
  if (mem.last_provider) {
    parts.push("", `(último motor usado internamente: ${mem.last_provider}/${mem.last_model ?? "?"} · turno ${mem.turn_count})`);
  }
  return parts.join("\n");
}

export async function refreshSummary(
  ticketId: number,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<void> {
  const mem = getMemory(ticketId);
  if (mem.turn_count < 3 || mem.turn_count % 4 !== 0) return;
  const transcript = history
    .slice(-24)
    .map((m) => `${m.role === "assistant" ? "Neko" : "Usuario"}: ${m.content}`)
    .join("\n");
  try {
    const res = await completeChat({
      system:
        "Resume este ticket de soporte de Discord en español. Máximo 180 palabras. Incluye: motivo, datos que dio el usuario, lo ya resuelto, pendientes. Formato:\nRESUMEN: ...\nHECHOS:\n- ...",
      messages: [
        {
          role: "user",
          content: `Resumen anterior:\n${mem.summary ?? "(ninguno)"}\n\nConversación:\n${transcript}`,
        },
      ],
    });
    if (!res) return;
    const factsMatch = res.text.split(/HECHOS:\s*/i);
    const summary = (factsMatch[0] ?? res.text).replace(/^RESUMEN:\s*/i, "").trim();
    const facts = factsMatch[1]?.trim() ?? mem.facts;
    getDb()
      .prepare("UPDATE ticket_ai_memory SET summary = ?, facts = ?, updated_at = ? WHERE ticket_id = ?")
      .run(summary.slice(0, 2500), facts ? facts.slice(0, 1500) : null, Date.now(), ticketId);
  } catch (err) {
    logger.warn("No se pudo refrescar la memoria del ticket", ticketId, err);
  }
}

export function rememberChannelMessage(channelId: string, role: "user" | "assistant", content: string): void {
  getDb().prepare("INSERT INTO ai_chat_messages (channel_id, role, content, created_at) VALUES (?, ?, ?, ?)")
    .run(channelId, role, content.slice(0, 4000), Date.now());
  getDb().prepare(`DELETE FROM ai_chat_messages WHERE channel_id = ? AND rowid NOT IN (
    SELECT rowid FROM ai_chat_messages WHERE channel_id = ? ORDER BY created_at DESC LIMIT 24
  )`).run(channelId, channelId);
}

export function getChannelHistory(channelId: string): { role: "user" | "assistant"; content: string }[] {
  return getDb().prepare("SELECT role, content FROM ai_chat_messages WHERE channel_id = ? ORDER BY created_at ASC")
    .all(channelId) as { role: "user" | "assistant"; content: string }[];
}
