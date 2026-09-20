import type { Image, SKRSContext2D } from "@napi-rs/canvas";
import { createCanvas, loadImage, registerFonts, roundRect, hexRgba, drawCircleImage, fitText } from "../../utils/canvas.js";
import type { HeistTargetDef, BankSecurityTier } from "./heistEngine.js";

registerFonts();

export interface CanvasCrewMember {
  userId: string;
  username: string;
  roleId: string;
  roleLevel: number;
  roleTitle: string;
  avatarUrl?: string;
}

export type HeistPhaseType = "phase1" | "qte" | "qte_result" | "phase3" | "victory" | "failure" | "escape";

export interface HeistCanvasOptions {
  targetDef: HeistTargetDef;
  securityLevel: number;
  tier: BankSecurityTier;
  phase: HeistPhaseType;
  crew: CanvasCrewMember[];
  progressPct: number; // 25, 55, 65, 85, 100
  phaseTitle: string;
  statusMessage?: string;
  qteOutcomeSuccess?: boolean;
  lootAmount?: number;
  gearDetected?: string[];
}

const ROLE_COLORS: Record<string, string> = {
  hacker: "#00f0ff",
  infiltrador: "#c084fc",
  tirador: "#f87171",
  demoliciones: "#fb923c",
  conductor: "#facc15",
  medico: "#10b981",
  negociador: "#6366f1",
};

const ROLE_ICONS: Record<string, string> = {
  hacker: "💻",
  infiltrador: "🥷",
  tirador: "🎯",
  demoliciones: "💣",
  conductor: "🚗",
  medico: "🩺",
  negociador: "💼",
};

// Cache de avatares en memoria por unos minutos para no re-descargar en cada fase
const avatarCache = new Map<string, { img: Image; cachedAt: number }>();

async function getMemberAvatar(url?: string): Promise<Image | null> {
  if (!url) return null;
  const now = Date.now();
  const cached = avatarCache.get(url);
  if (cached && now - cached.cachedAt < 120_000) {
    return cached.img;
  }
  try {
    const img = await loadImage(url);
    avatarCache.set(url, { img, cachedAt: now });
    return img;
  } catch {
    return null;
  }
}

export async function renderHeistHud(opts: HeistCanvasOptions): Promise<Buffer> {
  const width = 900;
  const height = 420;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d") as SKRSContext2D;

  // Determinar color de acento y de alerta
  let accentColor = "#00f0ff";
  let alertBadgeText = "🟢 ALERTA: BAJA";
  let alertBadgeColor = "#10b981";

  if (opts.phase === "phase1") {
    accentColor = "#38bdf8";
    alertBadgeText = "🟢 ALERTA: BAJA (INFILTRACIÓN)";
    alertBadgeColor = "#10b981";
  } else if (opts.phase === "qte") {
    accentColor = "#f59e0b";
    alertBadgeText = "⚠️ INCIDENTE TÁCTICO EN CURSO";
    alertBadgeColor = "#f59e0b";
  } else if (opts.phase === "qte_result") {
    if (opts.qteOutcomeSuccess) {
      accentColor = "#10b981";
      alertBadgeText = "✅ INCIDENTE NEUTRALIZADO CON ÉXITO";
      alertBadgeColor = "#10b981";
    } else {
      accentColor = "#ef4444";
      alertBadgeText = "⚠️ FALLO TÁCTICO · ALERTA ELEVADA";
      alertBadgeColor = "#ef4444";
    }
  } else if (opts.phase === "phase3") {
    accentColor = "#ef4444";
    alertBadgeText = "🚨 ALERTA ROJA · EXTRACCIÓN Y HUIDA";
    alertBadgeColor = "#ef4444";
  } else if (opts.phase === "victory") {
    accentColor = "#22c55e";
    alertBadgeText = "🏆 ASALTO COMPLETADO";
    alertBadgeColor = "#22c55e";
  } else if (opts.phase === "escape") {
    accentColor = "#f59e0b";
    alertBadgeText = "🚗 FUGA EXITOSA";
    alertBadgeColor = "#f59e0b";
  } else if (opts.phase === "failure") {
    accentColor = "#b91c1c";
    alertBadgeText = "🚨 ASALTO INTERCEPTADO";
    alertBadgeColor = "#b91c1c";
  }

  if (opts.targetDef.id === "davito") {
    accentColor = "#a855f7";
  } else if (opts.targetDef.id === "submarino" && (opts.phase === "phase1" || opts.phase === "qte")) {
    accentColor = "#06b6d4";
  } else if (opts.targetDef.id === "museo" && (opts.phase === "phase1" || opts.phase === "qte")) {
    accentColor = "#e11d48";
  }

  // 1. Fondo táctico oscuro con gradiente
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#080d1a");
  bgGrad.addColorStop(0.5, "#0b1224");
  bgGrad.addColorStop(1, "#050811");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Cuadrícula cibernética / HUD scanlines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
  ctx.lineWidth = 1;
  for (let x = 30; x < width; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 30; y < height; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. Brackets de esquina tácticos
  ctx.strokeStyle = hexRgba(accentColor, 0.75);
  ctx.lineWidth = 3;
  const bSize = 22;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(18, 18 + bSize);
  ctx.lineTo(18, 18);
  ctx.lineTo(18 + bSize, 18);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(width - 18 - bSize, 18);
  ctx.lineTo(width - 18, 18);
  ctx.lineTo(width - 18, 18 + bSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(18, height - 18 - bSize);
  ctx.lineTo(18, height - 18);
  ctx.lineTo(18 + bSize, height - 18);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - 18 - bSize, height - 18);
  ctx.lineTo(width - 18, height - 18);
  ctx.lineTo(width - 18, height - 18 - bSize);
  ctx.stroke();

  // Borde sutil del marco
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  roundRect(ctx, 18, 18, width - 36, height - 36, 12);
  ctx.stroke();

  // 4. Header Superior
  // Punto rojo de grabación CCTV
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(42, 42, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f87171";
  ctx.font = 'bold 12px "Inter Bold", sans-serif';
  ctx.fillText("REC · CCTV", 56, 46);

  // Nombre del Objetivo y Nivel
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 20px "Inter Bold", sans-serif';
  const targetLabel = `${opts.targetDef.name.toUpperCase()} · NIVEL ${opts.securityLevel} (${opts.tier.name.toUpperCase()})`;
  ctx.fillText(targetLabel, 150, 47);

  // Reloj táctico a la derecha
  ctx.fillStyle = "#94a3b8";
  ctx.font = 'bold 13px "Inter", sans-serif';
  const clockText = `T+00:${Math.round(opts.progressPct * 0.4).toString().padStart(2, "0")} · SEC-NET CIFRADA`;
  ctx.textAlign = "right";
  ctx.fillText(clockText, width - 42, 46);
  ctx.textAlign = "left";

  // 5. Barra de Alerta y Progreso
  // Badge de estado de alerta
  const badgeW = 260;
  const badgeH = 26;
  ctx.fillStyle = hexRgba(alertBadgeColor, 0.18);
  roundRect(ctx, 42, 70, badgeW, badgeH, 6);
  ctx.fill();
  ctx.strokeStyle = alertBadgeColor;
  ctx.lineWidth = 1.5;
  roundRect(ctx, 42, 70, badgeW, badgeH, 6);
  ctx.stroke();

  ctx.fillStyle = alertBadgeColor;
  ctx.font = 'bold 12px "Inter Bold", sans-serif';
  ctx.fillText(alertBadgeText, 52, 87);

  // Título de la Fase
  ctx.fillStyle = "#e2e8f0";
  ctx.font = 'bold 15px "Inter Bold", sans-serif';
  ctx.fillText(opts.phaseTitle, 320, 87);

  // Porcentaje a la derecha
  ctx.textAlign = "right";
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 16px "Inter Bold", sans-serif';
  ctx.fillText(`${opts.progressPct}%`, width - 42, 87);
  ctx.textAlign = "left";

  // Barra de progreso gráfica
  const barX = 42;
  const barY = 104;
  const barW = width - 84;
  const barH = 10;
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  roundRect(ctx, barX, barY, barW, barH, 5);
  ctx.fill();

  const fillW = Math.max(12, Math.round((barW * Math.min(100, opts.progressPct)) / 100));
  const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
  fillGrad.addColorStop(0, "#38bdf8");
  fillGrad.addColorStop(0.7, accentColor);
  fillGrad.addColorStop(1, alertBadgeColor);
  ctx.fillStyle = fillGrad;
  roundRect(ctx, barX, barY, fillW, barH, 5);
  ctx.fill();

  // 6. Panel Central del Equipo (Avatares y Roles)
  const panelX = 42;
  const panelY = 126;
  const panelW = width - 84;
  const panelH = 195;

  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  roundRect(ctx, panelX, panelY, panelW, panelH, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  roundRect(ctx, panelX, panelY, panelW, panelH, 10);
  ctx.stroke();

  // Encabezado del panel
  ctx.fillStyle = "#64748b";
  ctx.font = 'bold 11px "Inter Bold", sans-serif';
  ctx.fillText(`▸ EQUIPO OPERATIVO EN TERRENO (${opts.crew.length} MIEMBROS) · TRANSMISIÓN TELEMÉTRICA`, panelX + 16, panelY + 22);

  // Pre-cargar avatares de todos los miembros en paralelo
  await Promise.all(opts.crew.map((m) => getMemberAvatar(m.avatarUrl)));

  // Función auxiliar para renderizar la tarjeta de un miembro
  const drawMemberCard = async (
    m: CanvasCrewMember,
    cx: number,
    cardW: number,
    avY: number,
    avSize: number,
    nameY: number,
    roleY: number,
    statusY: number,
    fontSizeName: number,
    fontSizeRole: number,
    fontSizeStatus: number,
  ) => {
    const rColor = ROLE_COLORS[m.roleId] ?? "#38bdf8";
    const rIcon = ROLE_ICONS[m.roleId] ?? "🔫";

    // Obtener avatar (ya en caché)
    const avImg = await getMemberAvatar(m.avatarUrl);

    // Resplandor del avatar
    ctx.save();
    const glow = ctx.createRadialGradient(cx, avY + avSize / 2, 6, cx, avY + avSize / 2, avSize / 2 + 10);
    glow.addColorStop(0, hexRgba(rColor, 0.4));
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, avY + avSize / 2, avSize / 2 + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Imagen del avatar o placeholder
    if (avImg) {
      drawCircleImage(ctx, avImg, cx - avSize / 2, avY, avSize);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(cx, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(avSize * 0.45)}px "Inter Bold", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(m.username.charAt(0).toUpperCase(), cx, avY + avSize / 2 + Math.round(avSize * 0.16));
      ctx.textAlign = "left";
    }

    // Borde circular de rol
    ctx.strokeStyle = rColor;
    ctx.lineWidth = avSize > 40 ? 2.5 : 1.8;
    ctx.beginPath();
    ctx.arc(cx, avY + avSize / 2, avSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();

    // Nombre de usuario
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    const nameText = fitText(ctx, m.username, cardW - 8, fontSizeName, Math.max(8, fontSizeName - 3));
    ctx.fillText(nameText, cx, nameY);

    // Rol y Nivel
    ctx.fillStyle = rColor;
    ctx.font = `bold ${fontSizeRole}px "Inter Bold", sans-serif`;
    const roleText = `${rIcon} ${m.roleTitle} Nv.${m.roleLevel}`;
    const roleFit = fitText(ctx, roleText, cardW - 6, fontSizeRole, Math.max(7, fontSizeRole - 2));
    ctx.fillText(roleFit, cx, roleY);

    // Estado táctico individual según fase
    let statusText = "[INFILTRANDO]";
    let statusColor = "#38bdf8";

    if (opts.phase === "phase1") {
      statusText = m.roleId === "hacker" ? "[BUCLE CCTV]" : m.roleId === "infiltrador" ? "[AVANZANDO]" : "[VIGILANDO]";
      statusColor = "#38bdf8";
    } else if (opts.phase === "qte") {
      statusText = "[⚡ EN ACCIÓN]";
      statusColor = "#f59e0b";
    } else if (opts.phase === "qte_result") {
      statusText = opts.qteOutcomeSuccess ? "[MANIOBRA OK]" : "[EN RIESGO]";
      statusColor = opts.qteOutcomeSuccess ? "#10b981" : "#ef4444";
    } else if (opts.phase === "phase3") {
      statusText = m.roleId === "conductor" ? "[MOTOR A FONDO]" : "[FUEGO COBERTURA]";
      statusColor = "#f87171";
    } else if (opts.phase === "victory") {
      statusText = "[★ A SALVO]";
      statusColor = "#22c55e";
    } else if (opts.phase === "escape") {
      statusText = "[🚗 ESCAPADOS]";
      statusColor = "#f59e0b";
    } else if (opts.phase === "failure") {
      statusText = "[ARRESTADO]";
      statusColor = "#ef4444";
    }

    ctx.fillStyle = statusColor;
    ctx.font = `bold ${fontSizeStatus}px "Inter Bold", sans-serif`;
    ctx.fillText(statusText, cx, statusY);

    ctx.textAlign = "left";
  };

  // Renderizado según cantidad de cómplices (1 fila si <=8, 2 filas si 9-16)
  if (opts.crew.length <= 8) {
    const crewCount = Math.max(1, opts.crew.length);
    const cardW = Math.floor((panelW - 20) / crewCount);
    const isLarge = crewCount <= 6;
    const avSize = isLarge ? 52 : 42;
    const avY = panelY + (isLarge ? 38 : 34);
    const nameY = panelY + (isLarge ? 115 : 104);
    const roleY = panelY + (isLarge ? 133 : 120);
    const statusY = panelY + (isLarge ? 152 : 138);
    const fName = isLarge ? 13 : 11;
    const fRole = isLarge ? 11 : 10;
    const fStatus = isLarge ? 10 : 9;

    for (let i = 0; i < opts.crew.length; i++) {
      const m = opts.crew[i]!;
      const cardX = panelX + 10 + i * cardW;
      const cx = cardX + cardW / 2;
      await drawMemberCard(m, cx, cardW, avY, avSize, nameY, roleY, statusY, fName, fRole, fStatus);
    }
  } else {
    // Modo 2 filas (hasta 16 miembros)
    const total = Math.min(16, opts.crew.length);
    const half = Math.ceil(total / 2);
    const row1 = opts.crew.slice(0, half);
    const row2 = opts.crew.slice(half, total);

    // Fila 1
    const cardW1 = Math.floor((panelW - 20) / Math.max(1, row1.length));
    for (let i = 0; i < row1.length; i++) {
      const m = row1[i]!;
      const cardX = panelX + 10 + i * cardW1;
      const cx = cardX + cardW1 / 2;
      await drawMemberCard(m, cx, cardW1, panelY + 25, 32, panelY + 68, panelY + 80, panelY + 91, 10, 9, 8);
    }

    // Fila 2
    const cardW2 = Math.floor((panelW - 20) / Math.max(1, row2.length));
    for (let i = 0; i < row2.length; i++) {
      const m = row2[i]!;
      const cardX = panelX + 10 + i * cardW2;
      const cx = cardX + cardW2 / 2;
      await drawMemberCard(m, cx, cardW2, panelY + 102, 32, panelY + 145, panelY + 157, panelY + 168, 10, 9, 8);
    }
  }

  // 7. Banner Inferior / Ticker Táctico
  const tickerY = 336;
  const tickerH = 50;

  if (opts.phase === "qte") {
    // Franja de advertencia parpadeante en ámbar/amarillo
    ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
    roundRect(ctx, panelX, tickerY, panelW, tickerH, 8);
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.8;
    roundRect(ctx, panelX, tickerY, panelW, tickerH, 8);
    ctx.stroke();

    ctx.fillStyle = "#f59e0b";
    ctx.font = 'bold 13px "Inter Bold", sans-serif';
    ctx.fillText("⚠️ INCIDENTE TÁCTICO EN CURSO · LA BANDA DEBE TOMAR UNA DECISIÓN EN CHAT (12s)", panelX + 16, tickerY + 30);
  } else if (opts.phase === "victory") {
    ctx.fillStyle = "rgba(34, 197, 94, 0.16)";
    roundRect(ctx, panelX, tickerY, panelW, tickerH, 8);
    ctx.fill();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    roundRect(ctx, panelX, tickerY, panelW, tickerH, 8);
    ctx.stroke();

    ctx.fillStyle = "#22c55e";
    ctx.font = 'bold 15px "Inter Bold", sans-serif';
    const lootText = opts.lootAmount ? ` · BOTÍN OBTENIDO: +${opts.lootAmount.toLocaleString("es-ES")} NEXOCOINS` : "";
    ctx.fillText(`★ ¡MISIÓN CUMPLIDA! ASALTO COMPLETADO CON ÉXITO${lootText} ★`, panelX + 16, tickerY + 31);
  } else if (opts.phase === "failure") {
    ctx.fillStyle = "rgba(239, 68, 68, 0.16)";
    roundRect(ctx, panelX, tickerY, panelW, tickerH, 8);
    ctx.fill();
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    roundRect(ctx, panelX, tickerY, panelW, tickerH, 8);
    ctx.stroke();

    ctx.fillStyle = "#ef4444";
    ctx.font = 'bold 14px "Inter Bold", sans-serif';
    ctx.fillText("🚨 FUERZAS DE SEGURIDAD INTERCEPTARON AL EQUIPO · DETENCIÓN INMEDIATA", panelX + 16, tickerY + 31);
  } else {
    // Ticker normal con equipamiento detectado o mensaje de estado
    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    roundRect(ctx, panelX, tickerY, panelW, tickerH, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    roundRect(ctx, panelX, tickerY, panelW, tickerH, 8);
    ctx.stroke();

    const gearText =
      opts.gearDetected && opts.gearDetected.length > 0
        ? `EQUIPAMIENTO ACTIVO: ${opts.gearDetected.slice(0, 3).join(" · ")}`
        : opts.statusMessage ?? "TELEMETRÍA ESTABLE · CANALES DE RADIO CIFRADOS";

    ctx.fillStyle = "#94a3b8";
    ctx.font = '12px "Inter", sans-serif';
    ctx.fillText(`📡 ${fitText(ctx, gearText, panelW - 40, 12, 10)}`, panelX + 16, tickerY + 30);
  }

  return canvas.toBuffer("image/png");
}
