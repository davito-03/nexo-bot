import { GuildMember } from "discord.js";
import type { Image, SKRSContext2D } from "@napi-rs/canvas";
import {
  createCanvas,
  drawCircleImage,
  drawGlowAvatar,
  fitText,
  hexRgba,
  loadImage,
  registerFonts,
  roundRect,
} from "../../utils/canvas.js";
import { getDb, getLevel, getRank } from "../../database/index.js";
import { progressInLevel, totalXpForLevel, xpForLevel } from "../levels/engine.js";
import { getEco, n } from "../economy/engine.js";
import { getUserReputation } from "./reputation.js";
import { formatVoiceTime, getVoiceStats } from "../voice/profile.js";

registerFonts();

export type ProfileTheme = "cyberpunk" | "neon_pink" | "gold_luxury" | "emerald" | "cosmic";

interface ThemePalette {
  name: string;
  bgGradStart: string;
  bgGradEnd: string;
  accent: string;
  secondary: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
}

const THEMES: Record<ProfileTheme, ThemePalette> = {
  cyberpunk: {
    name: "Cyberpunk 2077",
    bgGradStart: "#0a0a16",
    bgGradEnd: "#151433",
    accent: "#00f0ff",
    secondary: "#ff007f",
    cardBg: "rgba(18, 18, 38, 0.75)",
    cardBorder: "rgba(0, 240, 255, 0.35)",
    textColor: "#e0f7fa",
  },
  neon_pink: {
    name: "Neón Sakura",
    bgGradStart: "#14031d",
    bgGradEnd: "#2b0a3d",
    accent: "#ff5996",
    secondary: "#70d6ff",
    cardBg: "rgba(35, 12, 48, 0.75)",
    cardBorder: "rgba(255, 89, 150, 0.4)",
    textColor: "#ffe5ec",
  },
  gold_luxury: {
    name: "Oro Imperial",
    bgGradStart: "#120f09",
    bgGradEnd: "#262013",
    accent: "#ffd700",
    secondary: "#f39c12",
    cardBg: "rgba(30, 25, 16, 0.75)",
    cardBorder: "rgba(255, 215, 0, 0.4)",
    textColor: "#fff8e7",
  },
  emerald: {
    name: "Esmeralda Mística",
    bgGradStart: "#051611",
    bgGradEnd: "#0d2b21",
    accent: "#00f5d4",
    secondary: "#52b788",
    cardBg: "rgba(10, 35, 28, 0.75)",
    cardBorder: "rgba(0, 245, 212, 0.4)",
    textColor: "#e8fbf8",
  },
  cosmic: {
    name: "Nebulosa Cósmica",
    bgGradStart: "#0b061d",
    bgGradEnd: "#1f0f3d",
    accent: "#b5179e",
    secondary: "#7209b7",
    cardBg: "rgba(25, 12, 45, 0.75)",
    cardBorder: "rgba(181, 23, 158, 0.4)",
    textColor: "#f3e8ff",
  },
};

export function getUserProfileTheme(guildId: string, userId: string): ProfileTheme {
  const row = getDb()
    .prepare("SELECT theme FROM user_profile_customization WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as { theme?: string } | undefined;
  if (row?.theme && row.theme in THEMES) {
    return row.theme as ProfileTheme;
  }
  return "cyberpunk";
}

export function setUserProfileTheme(guildId: string, userId: string, theme: ProfileTheme): void {
  getDb()
    .prepare(
      `INSERT INTO user_profile_customization (guild_id, user_id, theme)
       VALUES (?, ?, ?)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET theme = excluded.theme`,
    )
    .run(guildId, userId, theme);
}

function getEquippedTitle(guildId: string, userId: string): string | null {
  const row = getDb()
    .prepare("SELECT equipped_title FROM user_title_equipped WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as { equipped_title?: string } | undefined;
  return row?.equipped_title ?? null;
}

function drawStatCard(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  val1: string,
  val2: string,
  palette: ThemePalette,
): void {
  // Fondo de la tarjeta con efecto glassmorphism
  ctx.fillStyle = palette.cardBg;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();

  // Borde sutil
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 1.6;
  roundRect(ctx, x, y, w, h, 16);
  ctx.stroke();

  // Título
  ctx.textAlign = "left";
  ctx.fillStyle = palette.secondary;
  ctx.font = 'bold 15px "Inter Bold", "Inter", sans-serif';
  ctx.fillText(title, x + 18, y + 28);

  // Valor 1 (Grande)
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 22px "Inter Bold", "Inter", sans-serif';
  ctx.fillText(fitText(ctx, val1, w - 36, 22, 16), x + 18, y + 62);

  // Valor 2 (Subtítulo / Detalle)
  ctx.fillStyle = palette.textColor;
  ctx.font = '14px "Inter", sans-serif';
  ctx.fillText(fitText(ctx, val2, w - 36, 14, 11), x + 18, y + 88);
}

export async function renderProfileCard(member: GuildMember, requestedTheme?: ProfileTheme): Promise<Buffer> {
  const W = 960;
  const H = 540;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as SKRSContext2D;

  const gid = member.guild.id;
  const uid = member.id;
  const themeKey = requestedTheme ?? getUserProfileTheme(gid, uid);
  const palette = THEMES[themeKey] ?? THEMES.cyberpunk;

  // 1. Fondo con degradado suave
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, palette.bgGradStart);
  bgGrad.addColorStop(0.55, palette.bgGradEnd);
  bgGrad.addColorStop(1, palette.bgGradStart);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Círculos difuminados de ambiente (glow ambient)
  const ambientGlow = ctx.createRadialGradient(W * 0.85, 80, 20, W * 0.85, 80, 260);
  ambientGlow.addColorStop(0, hexRgba(palette.accent, 0.22));
  ambientGlow.addColorStop(1, hexRgba(palette.accent, 0));
  ctx.fillStyle = ambientGlow;
  ctx.beginPath();
  ctx.arc(W * 0.85, 80, 260, 0, Math.PI * 2);
  ctx.fill();

  const ambientGlow2 = ctx.createRadialGradient(80, H * 0.85, 20, 80, H * 0.85, 240);
  ambientGlow2.addColorStop(0, hexRgba(palette.secondary, 0.18));
  ambientGlow2.addColorStop(1, hexRgba(palette.secondary, 0));
  ctx.fillStyle = ambientGlow2;
  ctx.beginPath();
  ctx.arc(80, H * 0.85, 240, 0, Math.PI * 2);
  ctx.fill();

  // Borde externo de la tarjeta general
  ctx.strokeStyle = hexRgba(palette.accent, 0.45);
  ctx.lineWidth = 3;
  roundRect(ctx, 4, 4, W - 8, H - 8, 24);
  ctx.stroke();

  // 2. Cabecera / Panel de Usuario (Top Header)
  const headerX = 36;
  const headerY = 32;
  const headerW = W - 72;
  const headerH = 165;

  ctx.fillStyle = palette.cardBg;
  roundRect(ctx, headerX, headerY, headerW, headerH, 20);
  ctx.fill();
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 1.8;
  roundRect(ctx, headerX, headerY, headerW, headerH, 20);
  ctx.stroke();

  // Cargar Avatar
  let avatarImg: Image;
  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
    avatarImg = await loadImage(avatarUrl);
  } catch {
    const defUrl = member.user.defaultAvatarURL;
    avatarImg = await loadImage(defUrl);
  }

  // Dibujar Avatar con anillo luminoso
  const avatarSize = 114;
  const avatarX = headerX + 24;
  const avatarY = headerY + (headerH - avatarSize) / 2;
  drawGlowAvatar(ctx, avatarImg, avatarX, avatarY, avatarSize, palette.accent);

  // Textos de Identidad
  const textLeft = avatarX + avatarSize + 26;
  const maxTitleW = headerW - (avatarSize + 70);

  // Nombre Visible
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 32px "Inter Bold", "Inter", sans-serif';
  const nameStr = fitText(ctx, member.displayName, maxTitleW - 120, 32, 22);
  ctx.fillText(nameStr, textLeft, headerY + 50);

  // Badge o Título Equipado
  const equippedTitle = getEquippedTitle(gid, uid);
  const handleStr = `@${member.user.username}`;

  if (equippedTitle) {
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 16px "Inter Bold", "Inter", sans-serif';
    ctx.fillText(`👑 ${equippedTitle}`, textLeft, headerY + 84);

    ctx.fillStyle = hexRgba(palette.textColor, 0.85);
    ctx.font = '15px "Inter", sans-serif';
    ctx.fillText(handleStr, textLeft, headerY + 112);
  } else {
    ctx.fillStyle = hexRgba(palette.textColor, 0.85);
    ctx.font = '17px "Inter", sans-serif';
    ctx.fillText(handleStr, textLeft, headerY + 86);
  }

  // Fecha de Ingreso / Booster
  const joinDate = member.joinedAt
    ? member.joinedAt.toLocaleDateString("es-ES", { month: "short", year: "numeric" })
    : "Reciente";
  const boosterStr = member.premiumSince ? "  ·  🚀 Nitro Booster" : "";

  ctx.fillStyle = hexRgba(palette.textColor, 0.65);
  ctx.font = '13px "Inter", sans-serif';
  ctx.fillText(`📅 Miembro desde ${joinDate}${boosterStr}`, textLeft, headerY + (equippedTitle ? 138 : 122));

  // Badge de Tema en la esquina superior derecha del header
  ctx.textAlign = "right";
  ctx.fillStyle = hexRgba(palette.accent, 0.8);
  ctx.font = 'bold 13px "Inter Bold", "Inter", sans-serif';
  ctx.fillText(`🎨 ${palette.name.toUpperCase()}`, headerX + headerW - 20, headerY + 34);

  // 3. Grid de Estadísticas (4 Tarjetas Centrales)
  const gridY = 216;
  const gridCardW = 208;
  const gridCardH = 110;
  const gridGap = 18;

  // Datos
  const lvlRow = getLevel(gid, uid);
  const rank = getRank(gid, uid);
  const prog = progressInLevel(lvlRow);
  const eco = getEco(gid, uid);
  const totalBalance = eco.wallet + eco.bank;
  const rep = getUserReputation(gid, uid);
  const vStats = getVoiceStats(gid, uid);

  // Tarjeta 1: Nivel y Rango
  drawStatCard(
    ctx,
    headerX,
    gridY,
    gridCardW,
    gridCardH,
    "📊 NIVEL & RANGO",
    `Nivel ${lvlRow.level}`,
    `Rank #${rank} · ${lvlRow.xp.toLocaleString("es-ES")} XP`,
    palette,
  );

  // Tarjeta 2: Economía Nexo
  drawStatCard(
    ctx,
    headerX + (gridCardW + gridGap),
    gridY,
    gridCardW,
    gridCardH,
    "🪙 PATRIMONIO",
    `${totalBalance.toLocaleString("es-ES")} 🪙`,
    `Cartera: ${eco.wallet.toLocaleString("es-ES")} 🪙`,
    palette,
  );

  // Tarjeta 3: Reputación y Karma
  drawStatCard(
    ctx,
    headerX + (gridCardW + gridGap) * 2,
    gridY,
    gridCardW,
    gridCardH,
    "⭐ REPUTACIÓN",
    `${rep.points} Puntos`,
    `Puesto #${rep.rank} en Karma`,
    palette,
  );

  // Tarjeta 4: Actividad en Voz
  drawStatCard(
    ctx,
    headerX + (gridCardW + gridGap) * 3,
    gridY,
    gridCardW,
    gridCardH,
    "🎙️ SALAS DE VOZ",
    formatVoiceTime(vStats.total_seconds),
    `Racha: ${vStats.streak} días 🔥`,
    palette,
  );

  // 4. Barra de Progreso de Nivel (Bottom)
  const barBoxY = 346;
  const barBoxH = 148;

  ctx.fillStyle = palette.cardBg;
  roundRect(ctx, headerX, barBoxY, headerW, barBoxH, 20);
  ctx.fill();
  ctx.strokeStyle = palette.cardBorder;
  ctx.lineWidth = 1.8;
  roundRect(ctx, headerX, barBoxY, headerW, barBoxH, 20);
  ctx.stroke();

  // Título de la barra de nivel
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = 'bold 18px "Inter Bold", "Inter", sans-serif';
  ctx.fillText(`Progreso al Nivel ${lvlRow.level + 1}`, headerX + 24, barBoxY + 36);

  // Porcentaje y XP numérico
  const pct = Math.max(0, Math.min(1, prog.needed === 0 ? 1 : prog.current / prog.needed));
  const pctText = `${Math.floor(pct * 100)}%`;

  ctx.textAlign = "right";
  ctx.fillStyle = palette.accent;
  ctx.font = 'bold 18px "Inter Bold", "Inter", sans-serif';
  ctx.fillText(
    `${prog.current.toLocaleString("es-ES")} / ${prog.needed.toLocaleString("es-ES")} XP (${pctText})`,
    headerX + headerW - 24,
    barBoxY + 36,
  );

  // Track de la barra de progreso
  const progressTrackX = headerX + 24;
  const progressTrackY = barBoxY + 56;
  const progressTrackW = headerW - 48;
  const progressTrackH = 26;

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  roundRect(ctx, progressTrackX, progressTrackY, progressTrackW, progressTrackH, 13);
  ctx.fill();

  // Relleno de la barra con degradado neón
  const fillW = Math.max(26, progressTrackW * pct);
  const fillGrad = ctx.createLinearGradient(progressTrackX, 0, progressTrackX + fillW, 0);
  fillGrad.addColorStop(0, palette.secondary);
  fillGrad.addColorStop(1, palette.accent);

  ctx.fillStyle = fillGrad;
  roundRect(ctx, progressTrackX, progressTrackY, fillW, progressTrackH, 13);
  ctx.fill();

  // Detalle inferior: mensajes y tiempo de voz total
  ctx.textAlign = "left";
  ctx.fillStyle = hexRgba(palette.textColor, 0.8);
  ctx.font = '14px "Inter", sans-serif';
  ctx.fillText(
    `💬 Mensajes enviados: ${lvlRow.messages.toLocaleString("es-ES")}   ·   Faltan ${(prog.needed - prog.current).toLocaleString("es-ES")} XP para subir`,
    headerX + 24,
    barBoxY + 118,
  );

  // Watermark Nexo
  ctx.textAlign = "right";
  ctx.fillStyle = hexRgba(palette.textColor, 0.45);
  ctx.font = '12px "Inter", sans-serif';
  ctx.fillText("NEXO COMMUNITY · SISTEMA DE IDENTIDAD", headerX + headerW - 24, barBoxY + 118);

  return canvas.toBuffer("image/png");
}
