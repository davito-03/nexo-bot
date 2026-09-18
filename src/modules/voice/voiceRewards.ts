import { getDb } from "../../database/index.js";
import { madridDay } from "../../utils/time.js";
import { getVoiceStats } from "./profile.js";
import { getEco, saveEco, addWallet } from "../economy/engine.js";
import { checkUserAchievements } from "../economy/achievements.js";

export interface ClaimResult {
  success: boolean;
  message: string;
  reward?: number;
  streak?: number;
}

export function claimVoiceStreakReward(guildId: string, userId: string): ClaimResult {
  const day = madridDay();
  const db = getDb();

  // Comprobar si ya reclamó hoy
  const already = db
    .prepare("SELECT 1 FROM voice_rewards_claimed WHERE guild_id = ? AND user_id = ? AND day = ?")
    .get(guildId, userId, day);

  if (already) {
    return {
      success: false,
      message: "Ya has reclamado tu recompensa de racha de voz el día de hoy. ¡Vuelve mañana!",
    };
  }

  const stats = getVoiceStats(guildId, userId);

  // Debe haber participado en llamada hoy (mínimo registrar día de voz)
  if (stats.last_voice_day !== day || stats.week_seconds < 300) {
    return {
      success: false,
      message:
        "Necesitas haber estado al menos **5 minutos** en un canal de voz hoy para reclamar tu racha diaria.",
    };
  }

  const streak = Math.max(1, stats.streak);
  // Recompensa progresiva: 500 base + 150 por cada día de racha (tope 2500)
  const streakBonus = Math.min(2000, (streak - 1) * 150);
  const reward = 500 + streakBonus;

  db.transaction(() => {
    db.prepare(
      "INSERT INTO voice_rewards_claimed (guild_id, user_id, day, streak, reward_coins, claimed_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(guildId, userId, day, streak, reward, Date.now());

    const eco = getEco(guildId, userId);
    addWallet(eco, reward);
    saveEco(eco);
  })();

  // Comprobar logros de voz
  checkUserAchievements(guildId, userId);

  return {
    success: true,
    message: `¡Has reclamado tu recompensa de voz diaria con éxito!`,
    reward,
    streak,
  };
}
