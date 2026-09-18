import fs from "node:fs";
import Database from "better-sqlite3";
import { registerFonts, createCanvas, loadLocalImage } from "../src/utils/canvas.ts";
import { parseDuration, formatDuration } from "../src/utils/time.ts";
import { SCHEMA_SQL } from "../src/database/schema.ts";

function xpForLevel(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

async function main() {
  registerFonts();
  const db = new Database(":memory:");
  db.exec(SCHEMA_SQL);
  db.prepare(
    "INSERT INTO cases (guild_id, case_id, type, user_id, moderator_id, reason, created_at) VALUES (?,?,?,?,?,?,?)",
  ).run("g", 1, "warn", "u", "m", "test", Date.now());
  const n = db.prepare("SELECT COUNT(*) AS c FROM cases").get() as { c: number };
  if (n.c !== 1) throw new Error("sqlite fail");

  if (parseDuration("1h 30m") !== 5_400_000) throw new Error("duration fail");
  if (xpForLevel(0) + xpForLevel(1) !== 255) throw new Error("xp fail");

  const img = await loadLocalImage("./assets/images/welcome.png");
  const canvas = createCanvas(1100, 500);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, 1100, 500);
  ctx.fillStyle = "#fff";
  ctx.font = 'bold 32px "Inter Bold", "Inter", sans-serif';
  ctx.fillText("Nexo", 780, 250);
  fs.mkdirSync("./data", { recursive: true });
  fs.writeFileSync("./data/smoke-welcome.png", canvas.toBuffer("image/png"));
  console.log("SMOKE_OK", formatDuration(5_400_000), fs.statSync("./data/smoke-welcome.png").size);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
