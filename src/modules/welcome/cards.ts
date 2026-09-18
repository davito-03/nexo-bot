import path from "node:path";
import { GuildMember } from "discord.js";
import type { Image, SKRSContext2D } from "@napi-rs/canvas";
import { IMAGES_DIR } from "../../constants.js";
import {
  createCanvas,
  drawGlowAvatar,
  fitText,
  hexRgba,
  loadImage,
  loadLocalImage,
  registerFonts,
  roundRect,
} from "../../utils/canvas.js";

registerFonts();

const BANNER_W = 1100;
const BANNER_H = 620;

function coverImage(ctx: SKRSContext2D, img: Image, w: number, h: number, focusY = 0.5): void {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2 - (focusY - 0.5) * dh * 0.35;
  ctx.drawImage(img, dx, dy, dw, dh);
}

async function memberAvatar(member: GuildMember): Promise<Image> {
  try {
    return await loadImage(member.user.displayAvatarURL({ extension: "png", size: 256 }));
  } catch {
    return loadImage("https://cdn.discordapp.com/embed/avatars/0.png");
  }
}

function glassPanel(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: string,
  radius = 28,
): void {
  ctx.fillStyle = "rgba(22, 10, 38, 0.72)";
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 245, 250, 0.06)";
  roundRect(ctx, x + 2, y + 2, w - 4, h * 0.42, radius - 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.4;
  roundRect(ctx, x, y, w, h, radius);
  ctx.stroke();
}

function drawCenteredNameplate(
  ctx: SKRSContext2D,
  cx: number,
  y: number,
  title: string,
  subtitle: string,
  handle: string,
  accent: string,
): void {
  ctx.textAlign = "center";
  const probe = fitText(ctx, title, 560, 36, 18);
  const titleW = ctx.measureText(probe).width;
  ctx.font = '20px "Inter", sans-serif';
  const subW = ctx.measureText(subtitle).width;
  const w = Math.min(620, Math.max(340, Math.max(titleW, subW) + 72));
  const h = 114;
  const x = cx - w / 2;
  glassPanel(ctx, x, y, w, h, accent, 26);

  const titleFitted = fitText(ctx, title, w - 48, 36, 18);
  ctx.fillStyle = "#fff6fa";
  ctx.fillText(titleFitted, cx, y + 44);

  ctx.font = '20px "Inter", sans-serif';
  ctx.fillStyle = hexRgba(accent, 1);
  ctx.fillText(subtitle, cx, y + 74);

  ctx.fillStyle = "rgba(232, 213, 227, 0.9)";
  ctx.font = '16px "Inter", sans-serif';
  ctx.fillText(handle, cx, y + 98);
}

function drawTopIdentity(
  ctx: SKRSContext2D,
  avatar: Image,
  title: string,
  subtitle: string,
  handle: string,
  accent: string,
): void {
  const plateW = 640;
  const plateH = 118;
  const plateX = (BANNER_W - plateW) / 2;
  const plateY = 22;
  const size = 90;
  glassPanel(ctx, plateX, plateY, plateW, plateH, accent, 30);
  const ax = plateX + 14;
  const ay = plateY + (plateH - size) / 2;
  drawGlowAvatar(ctx, avatar, ax, ay, size, accent);

  const textX = ax + size + 22;
  ctx.textAlign = "left";
  const titleFitted = fitText(ctx, title, plateW - size - 60, 32, 16);
  ctx.fillStyle = "#fff6fa";
  ctx.fillText(titleFitted, textX, plateY + 44);

  ctx.font = '20px "Inter", sans-serif';
  ctx.fillStyle = hexRgba(accent, 1);
  ctx.fillText(subtitle, textX, plateY + 74);

  ctx.fillStyle = "rgba(232, 213, 227, 0.9)";
  ctx.font = '16px "Inter", sans-serif';
  ctx.fillText(handle, textX, plateY + 98);
}

export async function welcomeCard(member: GuildMember, memberCount: number): Promise<Buffer> {
  const canvas = createCanvas(BANNER_W, BANNER_H);
  const ctx = canvas.getContext("2d");
  coverImage(ctx, await loadLocalImage(path.join(IMAGES_DIR, "welcome.png")), BANNER_W, BANNER_H, 0.46);

  const avatar = await memberAvatar(member);
  const size = 168;
  const ax = (BANNER_W - size) / 2;
  const ay = 36;
  drawGlowAvatar(ctx, avatar, ax, ay, size, "#ff8fab");
  drawCenteredNameplate(
    ctx,
    BANNER_W / 2,
    228,
    member.displayName,
    `miembro nº ${memberCount}`,
    `@${member.user.username}`,
    "#ff8fab",
  );
  return canvas.toBuffer("image/png");
}

export async function levelUpCard(member: GuildMember, level: number): Promise<Buffer> {
  const canvas = createCanvas(BANNER_W, BANNER_H);
  const ctx = canvas.getContext("2d");
  coverImage(ctx, await loadLocalImage(path.join(IMAGES_DIR, "levelup.png")), BANNER_W, BANNER_H, 0.5);
  drawTopIdentity(
    ctx,
    await memberAvatar(member),
    member.displayName,
    `ahora eres nivel ${level}`,
    `@${member.user.username}`,
    "#ffd93d",
  );
  return canvas.toBuffer("image/png");
}

export async function boostCard(member: GuildMember, boosts: number): Promise<Buffer> {
  const canvas = createCanvas(BANNER_W, BANNER_H);
  const ctx = canvas.getContext("2d");
  coverImage(ctx, await loadLocalImage(path.join(IMAGES_DIR, "boosts.png")), BANNER_W, BANNER_H, 0.5);
  drawTopIdentity(
    ctx,
    await memberAvatar(member),
    member.displayName,
    `${boosts} boost${boosts === 1 ? "" : "s"} en el server`,
    `@${member.user.username}`,
    "#f47fff",
  );
  return canvas.toBuffer("image/png");
}

export async function rankCard(
  member: GuildMember,
  data: { xp: number; level: number; rank: number; needed: number; current: number },
): Promise<Buffer> {
  const W = 934;
  const H = 282;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  coverImage(ctx, await loadLocalImage(path.join(IMAGES_DIR, "levelup.png")), W, H, 0.22);
  ctx.fillStyle = "rgba(16, 8, 28, 0.78)";
  ctx.fillRect(0, 0, W, H);

  const avatar = await memberAvatar(member);
  drawGlowAvatar(ctx, avatar, 28, 52, 178, "#ff8fab");

  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = 'bold 36px "Inter Bold", "Inter", sans-serif';
  ctx.fillText(fitText(ctx, member.displayName, 500, 36, 20), 236, 88);

  ctx.fillStyle = "#ffc8dd";
  ctx.font = '22px "Inter", sans-serif';
  const boosterTag = member.premiumSince ? "   ·   Booster XP ×1.5" : "";
  ctx.fillText(`Nivel ${data.level}   ·   Rank #${data.rank}${boosterTag}`, 236, 128);

  const barX = 236;
  const barY = 164;
  const barW = 640;
  const barH = 34;
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  roundRect(ctx, barX, barY, barW, barH, 16);
  ctx.fill();
  const pct = Math.max(0, Math.min(1, data.needed === 0 ? 1 : data.current / data.needed));
  ctx.fillStyle = "#ff8fab";
  roundRect(ctx, barX, barY, Math.max(22, barW * pct), barH, 16);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = '16px "Inter", sans-serif';
  ctx.fillText(
    `${data.current} / ${data.needed} XP   ·   Total ${data.xp.toLocaleString("es-ES")} XP`,
    240,
    236,
  );

  return canvas.toBuffer("image/png");
}
