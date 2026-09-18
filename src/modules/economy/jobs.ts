import { getDb } from "../../database/index.js";
import { addWallet, getEco, saveEco } from "./engine.js";

export const JOB_CATALOG = [
  { id: 'granjero', name: '🌾 Granjero', desc: '+15% sueldo de trabajo, +20% caza', minLevel: 0, workBonus: 0.15, extras: { huntBonus: 0.20 } },
  { id: 'minero', name: '⛏️ Minero', desc: '+20% minería, -10% coste mejora rig', minLevel: 0, workBonus: 0, extras: { miningBonus: 0.20, rigDiscount: 0.10 } },
  { id: 'pescador', name: '🎣 Pescador', desc: '+25% pesca, red gratis cada 5 turnos', minLevel: 0, workBonus: 0, extras: { fishBonus: 0.25 } },
  { id: 'cocinero', name: '🍳 Cocinero', desc: '+15% trabajo, capturas valen x1.5', minLevel: 2, workBonus: 0.15, extras: { captureBonus: 0.50 } },
  { id: 'programador', name: '💻 Programador', desc: '+20% trabajo, +10% hackeo', minLevel: 3, workBonus: 0.20, extras: { hackBonus: 0.10 } },
  { id: 'banquero', name: '🏦 Banquero', desc: '+0.5% interés extra, -5% comisión mercado', minLevel: 4, workBonus: 0, extras: { interestBonus: 0.005, marketFeeDiscount: 0.05 } },
  { id: 'crupier', name: '🎰 Crupier', desc: '+5% casino, -20% cooldown casino', minLevel: 5, workBonus: 0, extras: { casinoBonus: 0.05, casinoCdReduction: 0.20 } },
  { id: 'arquitecto', name: '🏗️ Arquitecto', desc: '-15% coste propiedades, +25% ingresos', minLevel: 6, workBonus: 0, extras: { propertyDiscount: 0.15, propertyIncomeBonus: 0.25 } },
  { id: 'magnate', name: '👑 Magnate', desc: '+10% a todo', minLevel: 8, workBonus: 0.10, extras: { globalBonus: 0.10 } },
];

export function getUserJob(guildId: string, userId: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM user_jobs WHERE guild_id = ? AND user_id = ?").get(guildId, userId) as any;
}

export function assignJob(guildId: string, userId: string, jobId: string): { success: boolean; msg?: string } {
  const job = JOB_CATALOG.find(j => j.id === jobId);
  if (!job) return { success: false, msg: "Trabajo no encontrado." };

  const current = getUserJob(guildId, userId);
  if (current && current.level < job.minLevel) {
    return { success: false, msg: `Necesitas ser nivel **${job.minLevel}** en tu trabajo actual para este trabajo.` };
  } else if (!current && job.minLevel > 0) {
    return { success: false, msg: `Necesitas nivel **${job.minLevel}** en un trabajo para elegir este.` };
  }

  const db = getDb();
  const now = Date.now();

  if (current) {
    if (current.job_id === jobId) return { success: false, msg: "Ya tienes este trabajo." };
    
    // 24h cooldown
    const elapsed = now - current.assigned_at;
    if (elapsed < 86_400_000) {
      const hours = Math.ceil((86_400_000 - elapsed) / 3_600_000);
      return { success: false, msg: `Debes esperar **${hours}h** antes de volver a cambiar de trabajo.` };
    }
  }

  db.prepare(`
    INSERT INTO user_jobs (guild_id, user_id, job_id, level, xp, shifts_worked, assigned_at) 
    VALUES (?, ?, ?, 1, 0, 0, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET 
      job_id = excluded.job_id,
      level = 1,
      xp = 0,
      assigned_at = excluded.assigned_at
  `).run(guildId, userId, jobId, now);

  return { success: true };
}

export function addJobXp(guildId: string, userId: string, amount: number): { leveledUp: boolean; newLevel: number } {
  const current = getUserJob(guildId, userId);
  if (!current) return { leveledUp: false, newLevel: 0 };

  const db = getDb();
  let xp = current.xp + amount;
  let level = current.level;
  let leveledUp = false;

  while (level < 10) {
    const need = level * 200;
    if (xp >= need) {
      xp -= need;
      level++;
      leveledUp = true;
    } else {
      break;
    }
  }

  db.prepare("UPDATE user_jobs SET xp = ?, level = ? WHERE guild_id = ? AND user_id = ?").run(xp, level, guildId, userId);

  return { leveledUp, newLevel: level };
}

export function getJobBonus(guildId: string, userId: string, bonusType: string): number {
  const current = getUserJob(guildId, userId);
  if (!current) return 0;
  const job = JOB_CATALOG.find(j => j.id === current.job_id);
  if (!job || !job.extras) return 0;

  let val = (job.extras as any)[bonusType] || 0;
  
  if (bonusType !== 'globalBonus' && current.job_id === 'magnate') {
    // If it's magnate, it has globalBonus, which other modules might check explicitly.
    // We do not override specific bonuses, they just get the base 0 here for specific ones not in magnate's extras.
  }

  return val;
}

export function getJobWorkBonus(guildId: string, userId: string): number {
  const current = getUserJob(guildId, userId);
  if (!current) return 0;
  const job = JOB_CATALOG.find(j => j.id === current.job_id);
  if (!job) return 0;
  
  const global = getJobBonus(guildId, userId, 'globalBonus');
  return job.workBonus + global;
}

export function doJobShift(guildId: string, userId: string): { success: boolean; earnedCoins: number; xpGained: number; msg?: string } {
  const current = getUserJob(guildId, userId);
  if (!current) return { success: false, earnedCoins: 0, xpGained: 0, msg: "No tienes un trabajo. Usa `/trabajo elegir`." };

  const db = getDb();
  db.prepare("CREATE TABLE IF NOT EXISTS user_job_cooldowns (guild_id TEXT, user_id TEXT, last_shift INT, PRIMARY KEY(guild_id, user_id))").run();
  
  const cdInfo = db.prepare("SELECT last_shift FROM user_job_cooldowns WHERE guild_id = ? AND user_id = ?").get(guildId, userId) as any;
  const now = Date.now();
  if (cdInfo && cdInfo.last_shift) {
    const elapsed = now - cdInfo.last_shift;
    if (elapsed < 45 * 60 * 1000) {
      const mins = Math.ceil((45 * 60 * 1000 - elapsed) / 60000);
      return { success: false, earnedCoins: 0, xpGained: 0, msg: `Debes esperar **${mins}m** para tu próximo turno.` };
    }
  }

  const base = 100;
  const levelMult = 1 + (current.level * 0.1);
  const earned = Math.floor(base * levelMult);
  const xp = 30;

  db.prepare("INSERT INTO user_job_cooldowns (guild_id, user_id, last_shift) VALUES (?, ?, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET last_shift = excluded.last_shift").run(guildId, userId, now);
  db.prepare("UPDATE user_jobs SET shifts_worked = shifts_worked + 1 WHERE guild_id = ? AND user_id = ?").run(guildId, userId);

  const eco = getEco(guildId, userId);
  addWallet(eco, earned);
  saveEco(eco);
  const { leveledUp, newLevel } = addJobXp(guildId, userId, xp);

  let msg = `¡Has completado tu turno! Ganaste **${earned}** monedas y **${xp} XP**.`;
  if (leveledUp) {
    msg += `\n🎉 ¡Subiste al nivel **${newLevel}** en tu trabajo!`;
  }

  return { success: true, earnedCoins: earned, xpGained: xp, msg };
}

export function getTopJobs(guildId: string) {
  const db = getDb();
  return db.prepare("SELECT user_id, job_id, level, xp FROM user_jobs WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT 10").all(guildId) as any[];
}
