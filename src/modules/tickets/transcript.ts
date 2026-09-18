import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR, SERVER_NAME } from "../../constants.js";

export interface TranscriptMessage {
  author_tag: string | null;
  author_id: string;
  content: string | null;
  attachments: string | null;
  created_at: number;
  is_bot: number;
}

export function renderTranscriptHtml(
  guildName: string,
  ticketId: number,
  opener: string,
  category: string,
  messages: TranscriptMessage[],
): string {
  const rows = messages
    .map((m) => {
      const when = new Date(m.created_at).toISOString().replace("T", " ").slice(0, 19);
      const files = m.attachments ? JSON.parse(m.attachments) as string[] : [];
      const fileHtml = files.map((u) => `<div class="att"><a href="${u}">${u}</a></div>`).join("");
      const cls = m.is_bot ? "bot" : "user";
      return `<div class="msg ${cls}"><div class="meta"><strong>${escapeHtml(m.author_tag || m.author_id)}</strong> <span>${when}</span></div><div class="body">${escapeHtml(m.content || "")}${fileHtml}</div></div>`;
    })
    .join("\n");
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Ticket #${ticketId} · ${escapeHtml(guildName)}</title>
<style>
body{font-family:Inter,system-ui,sans-serif;background:#1a1423;color:#f7eef4;margin:0;padding:24px}
h1{color:#ff8fab} .msg{background:#2b1b33;border-radius:12px;padding:12px 16px;margin:8px 0}
.meta{font-size:12px;color:#c9b6c4;margin-bottom:6px} .bot{border-left:3px solid #ff8fab}
.att a{color:#ffc8dd;font-size:12px}
</style></head>
<body>
<h1>🐱 Ticket #${ticketId} — ${escapeHtml(SERVER_NAME)}</h1>
<p>Servidor: ${escapeHtml(guildName)} · Categoría: ${escapeHtml(category)} · Abierto por: ${escapeHtml(opener)}</p>
${rows || "<p>Sin mensajes.</p>"}
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function saveTranscript(guildId: string, ticketId: number, html: string): string {
  const dir = path.join(ROOT_DIR, "data", "transcripts", guildId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `ticket-${ticketId}.html`);
  fs.writeFileSync(file, html, "utf8");
  return file;
}
