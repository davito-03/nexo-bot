import fs from "node:fs";
import path from "node:path";
import type { Guild } from "discord.js";
import { ROOT_DIR, SERVER_NAME } from "../../constants.js";

export interface TranscriptMessage {
  id?: number;
  ticket_id?: number;
  message_id?: string | null;
  author_tag: string | null;
  author_id: string;
  content: string | null;
  original_content?: string | null;
  attachments: string | null;
  created_at: number;
  edited_at?: number | null;
  deleted_at?: number | null;
  is_bot: number;
}

interface AttachmentItem {
  url: string;
  name?: string;
  contentType?: string | null;
  size?: number;
}

function parseAttachments(raw: string | null): AttachmentItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      if (typeof item === "string") {
        const cleanName = item.split("/").pop()?.split("?")[0] || "archivo_adjunto";
        return { url: item, name: cleanName };
      }
      return item as AttachmentItem;
    });
  } catch {
    return [];
  }
}

function getMediaType(item: AttachmentItem): "image" | "video" | "audio" | "file" {
  const urlLower = (item.url || "").toLowerCase();
  const nameLower = (item.name || "").toLowerCase();
  const ct = (item.contentType || "").toLowerCase();

  if (
    ct.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(urlLower) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(nameLower)
  ) {
    return "image";
  }

  if (
    ct.startsWith("video/") ||
    /\.(mp4|webm|mov|mkv|avi)($|\?)/i.test(urlLower) ||
    /\.(mp4|webm|mov|mkv|avi)$/i.test(nameLower)
  ) {
    return "video";
  }

  if (
    ct.startsWith("audio/") ||
    /\.(mp3|ogg|wav|m4a|aac|flac)($|\?)/i.test(urlLower) ||
    /\.(mp3|ogg|wav|m4a|aac|flac)$/i.test(nameLower)
  ) {
    return "audio";
  }

  return "file";
}

/**
 * Descarga y convierte cualquier archivo multimedia (foto, vídeo, audio o documento)
 * a una Data URI en Base64 para que el archivo HTML sea 100% autónomo y funcione offline.
 */
async function resolveMediaSrc(url: string, mime: string, maxBytes = 22 * 1024 * 1024): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength <= maxBytes) {
        const b64 = Buffer.from(buffer).toString("base64");
        const detectedMime = res.headers.get("content-type") || mime || "application/octet-stream";
        return `data:${detectedMime};base64,${b64}`;
      }
    }
  } catch {
    /* fallback to original url if fetch times out */
  }
  return url;
}

const emojiBase64Cache = new Map<string, string>();

async function resolveEmojiSrc(id: string, isAnimated: boolean): Promise<string> {
  const key = `${id}_${isAnimated}`;
  if (emojiBase64Cache.has(key)) return emojiBase64Cache.get(key)!;

  const ext = isAnimated ? "gif" : "webp";
  const url = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=48&quality=lossless`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      if (buf.byteLength <= 512 * 1024) {
        const b64 = Buffer.from(buf).toString("base64");
        const mime = isAnimated ? "image/gif" : "image/webp";
        const dataUri = `data:${mime};base64,${b64}`;
        emojiBase64Cache.set(key, dataUri);
        return dataUri;
      }
    }
  } catch {
    /* fallback to cdn */
  }
  emojiBase64Cache.set(key, url);
  return url;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return ` (${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]})`;
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString("es-ES", {
      timeZone: "Europe/Madrid",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return new Date(ts).toISOString().replace("T", " ").slice(0, 19);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

interface FormatContext {
  users?: Map<string, string>;
  roles?: Map<string, string>;
  channels?: Map<string, string>;
  emojiMap?: Map<string, string>;
}

function renderDiscordMarkdown(text: string, ctx?: FormatContext): string {
  if (!text) return "";

  // 1. Escapar HTML base para seguridad total contra inyecciones XSS
  let out = escapeHtml(text);

  // 2. Bloques de código con triple backtick
  out = out.replace(/```(?:([a-zA-Z0-9_-]+)\n)?([\s\S]*?)```/g, (_m, lang, code) => {
    const langAttr = lang ? ` class="language-${lang}"` : "";
    return `<pre><code${langAttr}>${code}</code></pre>`;
  });

  // 3. Código en línea
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 4. Spoilers de Discord ||spoiler|| (interactivos: clic para desvelar)
  out = out.replace(
    /\|\|(.*?)\|\|/g,
    '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')" title="Clic para desvelar spoiler">$1</span>',
  );

  // 5. Citas de bloque (> texto)
  out = out.replace(/^(&gt; .+)$/gm, (m) => {
    return `<blockquote>${m.slice(5)}</blockquote>`;
  });

  // 6. Emojis personalizados de Discord: &lt;:name:id&gt; y &lt;a:name:id&gt;
  out = out.replace(/&lt;(a)?:([a-zA-Z0-9_~]+):([0-9]+)&gt;/g, (_m, anim, name, id) => {
    const key = `${id}_${Boolean(anim)}`;
    const src =
      ctx?.emojiMap?.get(key) ||
      `https://cdn.discordapp.com/emojis/${id}.${anim ? "gif" : "webp"}?size=48&quality=lossless`;
    return `<img class="discord-emoji" src="${src}" alt=":${name}:" title=":${name}:" loading="lazy" />`;
  });

  // 7. Menciones de usuario: &lt;@!?id&gt;
  out = out.replace(/&lt;@!?([0-9]+)&gt;/g, (_m, id) => {
    const userName = ctx?.users?.get(id) || `Usuario (${id})`;
    return `<span class="mention mention-user">@${escapeHtml(userName)}</span>`;
  });

  // 8. Menciones de rol: &lt;@&amp;id&gt;
  out = out.replace(/&lt;@&amp;([0-9]+)&gt;/g, (_m, id) => {
    const roleName = ctx?.roles?.get(id) || `Rol (${id})`;
    return `<span class="mention mention-role">@${escapeHtml(roleName)}</span>`;
  });

  // 9. Menciones de canal: &lt;#id&gt;
  out = out.replace(/&lt;#([0-9]+)&gt;/g, (_m, id) => {
    const chName = ctx?.channels?.get(id) || `canal`;
    return `<span class="mention mention-channel">#${escapeHtml(chName)}</span>`;
  });

  // 10. Timestamps de Discord: &lt;t:1234567890(:format)?&gt;
  out = out.replace(/&lt;t:([0-9]+)(?::([tTdDfFR]))?&gt;/g, (_m, secStr) => {
    const sec = Number.parseInt(secStr, 10);
    const dateStr = formatDate(sec * 1000);
    return `<span class="discord-timestamp" title="Unix: ${sec}">📅 ${dateStr}</span>`;
  });

  // 11. Estilos tipográficos (negrita, cursiva, subrayado, tachado)
  out = out.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__(.*?)__/g, "<u>$1</u>");
  out = out.replace(/\*(.*?)\*/g, "<em>$1</em>");
  out = out.replace(/(?<!\w)_(.*?)_(?!\w)/g, "<em>$1</em>");
  out = out.replace(/~~(.*?)~~/g, "<s>$1</s>");

  // 12. Enlaces URL directos (que no estén dentro de una etiqueta ya procesada)
  out = out.replace(/(?<!href=")(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  return out;
}

export async function renderTranscriptHtml(
  guildOrName: Guild | string,
  ticketId: number,
  openerId: string,
  category: string,
  messages: TranscriptMessage[],
): Promise<string> {
  const isGuildObj = typeof guildOrName !== "string";
  const guild = isGuildObj ? (guildOrName as Guild) : null;
  const guildName = guild ? guild.name : String(guildOrName);

  // Mapear nombres de roles, canales y usuarios para formatear menciones correctamente
  const rolesMap = new Map<string, string>();
  const channelsMap = new Map<string, string>();
  const usersMap = new Map<string, string>();

  if (guild) {
    for (const [id, r] of guild.roles.cache) rolesMap.set(id, r.name);
    for (const [id, c] of guild.channels.cache) channelsMap.set(id, c.name);
    for (const [id, m] of guild.members.cache) usersMap.set(id, m.displayName || m.user.username);
  }

  // Recopilar autores de los mensajes para resolver menciones
  for (const m of messages) {
    if (m.author_id && m.author_tag) {
      if (!usersMap.has(m.author_id)) {
        usersMap.set(m.author_id, m.author_tag.replace(/#0$/, ""));
      }
    }
  }

  // Pre-escanear y descargar emojis personalizados de Discord para que funcionen 100% offline
  const emojiMap = new Map<string, string>();
  const emojiRegex = /<(a)?:([a-zA-Z0-9_~]+):([0-9]+)>/g;
  for (const m of messages) {
    const raw = (m.content || "") + " " + (m.original_content || "");
    let match: RegExpExecArray | null;
    while ((match = emojiRegex.exec(raw)) !== null) {
      const isAnim = Boolean(match[1]);
      const id = match[3]!;
      const key = `${id}_${isAnim}`;
      if (!emojiMap.has(key)) {
        const base64Src = await resolveEmojiSrc(id, isAnim);
        emojiMap.set(key, base64Src);
      }
    }
  }

  const formatCtx: FormatContext = {
    users: usersMap,
    roles: rolesMap,
    channels: channelsMap,
    emojiMap,
  };

  let editsCount = 0;
  let deletesCount = 0;
  let mediaCount = 0;

  const rows = await Promise.all(
    messages.map(async (m) => {
      const when = formatDate(m.created_at);
      const isEdited = Boolean(m.edited_at);
      const isDeleted = Boolean(m.deleted_at);

      if (isEdited) editsCount++;
      if (isDeleted) deletesCount++;

      const files = parseAttachments(m.attachments);
      if (files.length > 0) mediaCount += files.length;

      // Renderizar y auto-incrustar archivos en Base64
      const renderedAttachments = await Promise.all(
        files.map(async (item) => {
          const type = getMediaType(item);
          const name = escapeHtml(item.name || "archivo_adjunto");
          const sizeStr = formatBytes(item.size);

          if (type === "image") {
            const src = await resolveMediaSrc(item.url, item.contentType || "image/png");
            return `
            <div class="media-card media-image">
              <a href="${src}" target="_blank" rel="noopener noreferrer" title="Clic para ver en tamaño completo">
                <img src="${src}" alt="${name}" loading="lazy" />
              </a>
              <div class="media-footer">
                <span class="media-icon">🖼️</span>
                <span class="media-title">${name}${sizeStr}</span>
                <a href="${src}" target="_blank" rel="noopener noreferrer" class="media-direct-link" download="${name}">Guardar</a>
              </div>
            </div>`;
          }

          if (type === "video") {
            const src = await resolveMediaSrc(item.url, item.contentType || "video/mp4");
            return `
            <div class="media-card media-video">
              <video controls preload="metadata">
                <source src="${src}" type="${item.contentType || 'video/mp4'}">
                Tu navegador no soporta reproductor de vídeo directo.
              </video>
              <div class="media-footer">
                <span class="media-icon">🎥</span>
                <span class="media-title">${name}${sizeStr}</span>
                <a href="${src}" target="_blank" rel="noopener noreferrer" class="media-direct-link" download="${name}">Descargar vídeo</a>
              </div>
            </div>`;
          }

          if (type === "audio") {
            const src = await resolveMediaSrc(item.url, item.contentType || "audio/mpeg");
            return `
            <div class="media-card media-audio">
              <audio controls preload="metadata">
                <source src="${src}" type="${item.contentType || 'audio/mpeg'}">
              </audio>
              <div class="media-footer">
                <span class="media-icon">🎵</span>
                <span class="media-title">${name}${sizeStr}</span>
                <a href="${src}" target="_blank" rel="noopener noreferrer" class="media-direct-link" download="${name}">Descargar audio</a>
              </div>
            </div>`;
          }

          // Documentos y otros archivos (PDF, ZIP, TXT, etc.): embebidos también en Base64
          const src = await resolveMediaSrc(item.url, item.contentType || "application/octet-stream");
          return `
          <div class="media-card media-file">
            <div class="file-icon">📄</div>
            <div class="file-meta">
              <span class="file-title">${name}${sizeStr}</span>
              <a href="${src}" target="_blank" rel="noopener noreferrer" class="media-direct-link" download="${name}">Descargar archivo offline</a>
            </div>
          </div>`;
        }),
      );

      const fileHtml =
        renderedAttachments.length > 0 ? `<div class="attachments-grid">${renderedAttachments.join("")}</div>` : "";

      const author = escapeHtml(m.author_tag || usersMap.get(m.author_id) || m.author_id);
      const isBot = Boolean(m.is_bot);

      const cls = [
        "msg",
        isBot ? "bot" : "user",
        isDeleted ? "msg-deleted" : "",
        isEdited ? "msg-edited" : "",
      ]
        .filter(Boolean)
        .join(" ");

      let badgesHtml = "";
      if (isBot) {
        badgesHtml += `<span class="badge badge-bot">BOT</span>`;
      }
      if (isEdited) {
        const editDate = m.edited_at ? formatDate(m.edited_at) : "";
        badgesHtml += `<span class="badge badge-edited" title="Editado el ${editDate}">✏️ Editado</span>`;
      }
      if (isDeleted) {
        const delDate = m.deleted_at ? formatDate(m.deleted_at) : "";
        badgesHtml += `<span class="badge badge-deleted" title="Eliminado el ${delDate}">🗑️ Mensaje Eliminado</span>`;
      }

      // Historial de edición original anterior
      let editHistoryHtml = "";
      if (isEdited && m.original_content) {
        const parsedOriginal = renderDiscordMarkdown(m.original_content, formatCtx);
        editHistoryHtml = `
        <details class="history-accordion">
          <summary>Ver versión original anterior a la edición</summary>
          <div class="original-diff">
            <span class="diff-tag">Original:</span>
            <div class="diff-body">${parsedOriginal}</div>
          </div>
        </details>`;
      }

      // Contenido del mensaje con soporte de Markdown, menciones y emojis
      let contentHtml = "";
      if (isDeleted) {
        const deletedContent = renderDiscordMarkdown(m.content || m.original_content || "(sin texto)", formatCtx);
        contentHtml = `
        <div class="deleted-banner">
          <span class="deleted-icon">⚠️</span>
          <span>Este mensaje fue eliminado en el canal de soporte. Su contenido original ha sido resguardado:</span>
        </div>
        <div class="body deleted-text">${deletedContent}</div>`;
      } else {
        const parsedContent = renderDiscordMarkdown(m.content || "", formatCtx);
        contentHtml = `<div class="body">${parsedContent}</div>`;
      }

      return `
      <div class="${cls}" id="msg-${m.id || m.created_at}">
        <div class="meta">
          <span class="author-pill">${author}</span>
          <span class="author-id">ID: ${m.author_id}</span>
          <span class="timestamp">${when}</span>
          ${badgesHtml}
        </div>
        ${editHistoryHtml}
        ${contentHtml}
        ${fileHtml}
      </div>`;
    }),
  );

  const openerName = usersMap.get(openerId) || openerId;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcripción Ticket #${ticketId} · ${escapeHtml(guildName)}</title>
  <style>
    :root {
      --bg: #0f0d17;
      --card-bg: #1c182b;
      --card-bot: #231d38;
      --border: #322b4a;
      --accent: #ff8fab;
      --accent-rgb: 255, 143, 171;
      --text: #f5edf3;
      --text-muted: #a69bb0;
      --bot-border: #5865f2;
      --edited-badge: #f59e0b;
      --deleted-badge: #ef4444;
      --deleted-bg: rgba(239, 68, 68, 0.12);
      --deleted-border: #dc2626;
      --code-bg: #11101d;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 32px 20px;
      line-height: 1.55;
    }
    .container {
      max-width: 980px;
      margin: 0 auto;
    }
    .header-card {
      background: linear-gradient(135deg, #241738 0%, #151126 100%);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px 28px;
      margin-bottom: 28px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    }
    .header-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0;
      font-size: 26px;
      color: var(--accent);
      font-weight: 700;
    }
    .stats-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .pill {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .pill strong { color: var(--text); }
    .header-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      font-size: 14px;
      color: var(--text-muted);
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 16px;
    }
    .header-details strong { color: #fff; }

    /* Mensajes */
    .msg {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 18px;
      margin: 12px 0;
      transition: border-color 0.2s;
    }
    .msg:hover { border-color: rgba(var(--accent-rgb), 0.5); }
    .msg.bot {
      background: var(--card-bot);
      border-left: 4px solid var(--bot-border);
    }
    .msg.msg-deleted {
      background: var(--deleted-bg);
      border-color: var(--deleted-border);
    }
    .msg.msg-edited {
      border-left: 4px solid var(--edited-badge);
    }

    .meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .author-pill {
      color: #fff;
      font-weight: 600;
      font-size: 14px;
    }
    .author-id {
      font-size: 11px;
      background: var(--code-bg);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .timestamp { font-size: 12px; margin-left: auto; }

    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .badge-bot { background: #5865f2; color: #fff; }
    .badge-edited { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge-deleted { background: rgba(239, 68, 68, 0.25); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.5); }

    .body {
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 15px;
      color: #f3e9f0;
    }
    .body:empty { display: none; }

    /* Emojis de Discord y formato */
    .discord-emoji {
      width: 22px;
      height: 22px;
      vertical-align: -4px;
      object-fit: contain;
      display: inline-block;
    }
    .mention {
      border-radius: 4px;
      padding: 0 5px;
      font-weight: 500;
      font-size: 14px;
      display: inline-block;
    }
    .mention-user {
      background: rgba(88, 101, 242, 0.25);
      color: #c9cdfb;
    }
    .mention-role {
      background: rgba(245, 158, 11, 0.2);
      color: #fde68a;
    }
    .mention-channel {
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
    }
    .discord-timestamp {
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      padding: 1px 6px;
      font-size: 13px;
      color: #cbd5e1;
    }
    .spoiler {
      background: #2b2d31;
      color: transparent;
      border-radius: 4px;
      padding: 0 6px;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s, color 0.2s;
    }
    .spoiler:hover, .spoiler.revealed {
      background: rgba(255, 255, 255, 0.12);
      color: inherit;
      user-select: text;
    }
    blockquote {
      border-left: 4px solid #4e5058;
      margin: 4px 0;
      padding-left: 12px;
      color: #b5bac1;
    }
    pre {
      background: #111214;
      border: 1px solid #232428;
      border-radius: 8px;
      padding: 12px 16px;
      overflow-x: auto;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      margin: 8px 0;
    }
    code {
      background: #111214;
      border-radius: 4px;
      padding: 2px 5px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      color: #e3e5e8;
    }
    pre code { background: none; padding: 0; }

    /* Mensajes eliminados y editados */
    .deleted-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #f87171;
      font-weight: 600;
      margin-bottom: 6px;
      padding: 6px 10px;
      background: rgba(239, 68, 68, 0.15);
      border-radius: 6px;
    }
    .deleted-text {
      color: #fca5a5;
      font-style: italic;
    }
    .history-accordion {
      margin-bottom: 8px;
      font-size: 13px;
    }
    .history-accordion summary {
      cursor: pointer;
      color: #fbbf24;
      font-size: 12px;
      user-select: none;
    }
    .original-diff {
      background: rgba(245, 158, 11, 0.08);
      border: 1px dashed rgba(245, 158, 11, 0.3);
      padding: 8px 12px;
      border-radius: 6px;
      margin-top: 6px;
      color: #fde68a;
    }
    .diff-tag { font-weight: bold; color: #f59e0b; margin-bottom: 4px; display: block; }
    .diff-body { white-space: pre-wrap; font-size: 14px; }

    /* Multimedia y adjuntos */
    .attachments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
      margin-top: 12px;
    }
    .media-card {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .media-card img {
      max-width: 100%;
      max-height: 420px;
      object-fit: contain;
      display: block;
      background: #090710;
      transition: transform 0.2s;
    }
    .media-card img:hover { transform: scale(1.01); }
    .media-card video {
      width: 100%;
      max-height: 400px;
      background: #000;
      border-radius: 8px 8px 0 0;
    }
    .media-card audio {
      width: 100%;
      padding: 10px;
    }
    .media-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      font-size: 12px;
      background: rgba(255, 255, 255, 0.03);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .media-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text-muted);
    }
    .media-direct-link {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
    }
    .media-direct-link:hover { text-decoration: underline; }

    .media-file {
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 12px 14px;
      gap: 12px;
    }
    .file-icon { font-size: 28px; }
    .file-meta { display: flex; flex-direction: column; flex: 1; }
    .file-title { font-size: 14px; font-weight: 600; color: #fff; word-break: break-all; }

    footer {
      text-align: center;
      margin-top: 40px;
      font-size: 13px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
<div class="container">
  <div class="header-card">
    <div class="header-title">
      <h1>🎫 Ticket #${ticketId} · ${escapeHtml(category)}</h1>
      <div class="stats-pills">
        <span class="pill">Mensajes: <strong>${messages.length}</strong></span>
        <span class="pill">Archivos: <strong>${mediaCount}</strong></span>
        ${editsCount > 0 ? `<span class="pill">✏️ Editados: <strong>${editsCount}</strong></span>` : ""}
        ${deletesCount > 0 ? `<span class="pill">🗑️ Eliminados: <strong>${deletesCount}</strong></span>` : ""}
      </div>
    </div>
    <div class="header-details">
      <div>Servidor: <strong>${escapeHtml(guildName)}</strong></div>
      <div>Comunidad: <strong>${escapeHtml(SERVER_NAME)}</strong></div>
      <div>Abierto por: <strong>${escapeHtml(openerName)}</strong></div>
      <div>Fecha de Archivo: <strong>${formatDate(Date.now())}</strong></div>
    </div>
  </div>

  <div class="chat-transcript">
    ${rows.length > 0 ? rows.join("\n") : "<p style='color: var(--text-muted); text-align: center;'>No se registraron mensajes en este ticket.</p>"}
  </div>

  <footer>
    Transcripción oficial generada y resguardada por el sistema de soporte de ${escapeHtml(SERVER_NAME)}. 100% Autónoma y Portable.
  </footer>
</div>
</body>
</html>`;
}

export function saveTranscript(guildId: string, ticketId: number, html: string): string {
  const dir = path.join(ROOT_DIR, "data", "transcripts", guildId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `ticket-${ticketId}.html`);
  fs.writeFileSync(file, html, "utf8");
  return file;
}
