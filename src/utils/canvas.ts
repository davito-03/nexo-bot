import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D, type Image } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import { FONTS_DIR } from "../constants.js";

let fontsReady = false;

export function registerFonts(): void {
  if (fontsReady) return;
  const regular = path.join(FONTS_DIR, "Inter-Regular.ttf");
  const bold = path.join(FONTS_DIR, "Inter-Bold.ttf");
  if (fs.existsSync(regular)) GlobalFonts.registerFromPath(regular, "Inter");
  if (fs.existsSync(bold)) GlobalFonts.registerFromPath(bold, "Inter Bold");
  fontsReady = true;
}

export async function loadLocalImage(file: string): Promise<Image> {
  return loadImage(file);
}

export function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function hexRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function drawCircleImage(ctx: SKRSContext2D, img: Image, x: number, y: number, size: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

export function drawGlowAvatar(
  ctx: SKRSContext2D,
  img: Image,
  x: number,
  y: number,
  size: number,
  accent: string,
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  ctx.save();
  const glowR = r + 32;
  const g = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, glowR);
  g.addColorStop(0, hexRgba(accent, 0.5));
  g.addColorStop(0.62, hexRgba(accent, 0.16));
  g.addColorStop(1, hexRgba(accent, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#fff8fb";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawCircleImage(ctx, img, x, y, size);
}

export function fitText(ctx: SKRSContext2D, text: string, maxWidth: number, base = 42, min = 18): string {
  ctx.font = `bold ${base}px "Inter Bold", "Inter", sans-serif`;
  if (ctx.measureText(text).width <= maxWidth) return text;
  let size = base;
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `bold ${size}px "Inter Bold", "Inter", sans-serif`;
  }
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 3 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

export { createCanvas, loadImage };
