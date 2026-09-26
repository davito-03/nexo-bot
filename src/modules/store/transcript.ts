import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR, SERVER_NAME } from "../../constants.js";
import type { StoreOrderMessageRow, StoreOrderRow } from "./types.js";

export function renderOrderTranscriptHtml(
  guildName: string,
  order: StoreOrderRow,
  messages: StoreOrderMessageRow[],
): string {
  const rows = messages
    .map((m) => {
      const when = new Date(m.created_at).toISOString().replace("T", " ").slice(0, 19);
      const files = m.attachments ? (JSON.parse(m.attachments) as (string | { url: string; name?: string })[]) : [];
      const fileHtml = files
        .map((item) => {
          const u = typeof item === "string" ? item : item.url;
          const uLower = u.toLowerCase();
          if (/\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(uLower)) {
            return `<div class="att"><a href="${u}" target="_blank" rel="noopener"><img src="${u}" style="max-width:400px;max-height:280px;border-radius:8px;display:block;margin:6px 0;" loading="lazy" /></a></div>`;
          }
          if (/\.(mp4|webm|mov)($|\?)/i.test(uLower)) {
            return `<div class="att"><video controls style="max-width:420px;border-radius:8px;display:block;margin:6px 0;"><source src="${u}"></video></div>`;
          }
          return `<div class="att"><a href="${u}" target="_blank" rel="noopener">📄 ${u.split("/").pop()?.split("?")[0] || u}</a></div>`;
        })
        .join("");
      const cls = m.is_bot ? "bot" : "user";
      return `<div class="msg ${cls}"><div class="meta"><strong>${escapeHtml(m.author_tag || m.author_id)}</strong> <span>${when}</span></div><div class="body">${escapeHtml(m.content || "")}${fileHtml}</div></div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Pedido #${order.id} · ${escapeHtml(guildName)}</title>
  <style>
    body { font-family: Inter, system-ui, -apple-system, sans-serif; background: #13101c; color: #f7eef4; margin: 0; padding: 28px; }
    h1 { color: #ff8fab; margin-bottom: 6px; }
    .header-box { background: #20172e; border: 1px solid #37284f; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
    .header-box p { margin: 6px 0; font-size: 14px; color: #d8c9dc; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; background: #ff8fab; color: #1a1423; }
    .msg { background: #1c1527; border: 1px solid #2e2040; border-radius: 10px; padding: 12px 16px; margin: 10px 0; }
    .meta { font-size: 12px; color: #a492ad; margin-bottom: 6px; display: flex; justify-content: space-between; }
    .bot { border-left: 4px solid #ff8fab; }
    .body { font-size: 14px; line-height: 1.5; word-break: break-word; }
    .att a { color: #80c4ff; font-size: 12px; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header-box">
    <h1>📦 Pedido #${order.id} — ${escapeHtml(SERVER_NAME)}</h1>
    <p><strong>Servidor:</strong> ${escapeHtml(guildName)}</p>
    <p><strong>Cliente:</strong> ${escapeHtml(order.user_id)}</p>
    <p><strong>Producto:</strong> ${escapeHtml(order.product_name)} ${order.plan_name ? `· Plan: ${escapeHtml(order.plan_name)} (${escapeHtml(order.price || "")})` : ""}</p>
    <p><strong>Estado:</strong> <span class="badge">${order.status.toUpperCase()}</span> ${order.claimed_by ? `· Atendido por: ${escapeHtml(order.claimed_by)}` : ""}</p>
  </div>
  ${rows || "<p>Sin mensajes en el pedido.</p>"}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function saveOrderTranscript(guildId: string, orderId: number, html: string): string {
  const dir = path.join(ROOT_DIR, "data", "transcripts", "orders", guildId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `pedido-${orderId}.html`);
  fs.writeFileSync(file, html, "utf8");
  return file;
}
