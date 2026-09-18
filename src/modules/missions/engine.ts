import { EmbedBuilder, type GuildTextBasedChannel } from "discord.js";
import { getDb } from "../../database/index.js";
import { COLORS, MISSIONS_CHANNEL_ID } from "../../constants.js";
import { addWallet, currentWeekId, getEco, n, saveEco } from "../economy/engine.js";
import { logger } from "../../logger.js";

export interface Mission {
  id: number;
  guild_id: string;
  code: string;
  title: string;
  description: string;
  reward: number;
  goal: number;
  week_id: string | null;
  kind: string;
  active: number;
  event_id: number | null;
  channel_id: string | null;
  message_id: string | null;
  created_by: string | null;
  created_at: number;
}

interface Progress {
  mission_id: number;
  user_id: string;
  progress: number;
  claimed: number;
  extra: string;
}

/** Pool amplio; cada semana se eligen varias al azar. */
const AUTO_POOL: { code: string; title: string; description: string; goal: number; reward: number }[] = [
  { code: "chat_5", title: "Hilo suelto", description: "Escribe en el chat 5 días distintos esta semana.", goal: 5, reward: 400 },
  { code: "chat_3", title: "Pasar por el chat", description: "Escribe en 3 días distintos esta semana.", goal: 3, reward: 220 },
  { code: "vc_120", title: "Orejas en VC", description: "Pasa 2 horas en un canal de voz esta semana.", goal: 120, reward: 600 },
  { code: "vc_60", title: "Calentar silla", description: "Pasa 1 hora en VC esta semana.", goal: 60, reward: 320 },
  { code: "work_3", title: "Currante", description: "Haz `/eco work` 3 veces.", goal: 3, reward: 350 },
  { code: "work_5", title: "Jornada completa", description: "Haz `/eco work` 5 veces.", goal: 5, reward: 550 },
  { code: "extra_2", title: "Horas extra", description: "Haz `/eco extra` 2 veces.", goal: 2, reward: 280 },
  { code: "fish_1", title: "Caña relajada", description: "Pesca algo con `/eco pescar`.", goal: 1, reward: 200 },
  { code: "hunt_1", title: "Salida al bosque", description: "Caza algo con `/eco cazar`.", goal: 1, reward: 220 },
  { code: "daily_3", title: "Rutina gatuna", description: "Cobra el daily 3 veces esta semana.", goal: 3, reward: 300 },
  { code: "daily_5", title: "Madrugador", description: "Cobra el daily 5 veces esta semana.", goal: 5, reward: 480 },
  { code: "weekly_1", title: "Paga semanal", description: "Cobra `/eco weekly` esta semana.", goal: 1, reward: 250 },
  { code: "mates_3", title: "Social VC", description: "Comparte sala con 3 personas distintas.", goal: 3, reward: 450 },
  { code: "mates_5", title: "La peña del VC", description: "Comparte sala con 5 personas distintas.", goal: 5, reward: 650 },
  { code: "beg_2", title: "Con el sombrero", description: "Usa `/eco mendigar` 2 veces.", goal: 2, reward: 180 },
  { code: "crime_1", title: "Travesura", description: "Haz un `/crimen hacer` (y que la poli no te pille… o sí).", goal: 1, reward: 260 },
  { code: "deposit_1", title: "Ahorrador", description: "Deposita nexocoin en el banco una vez.", goal: 1, reward: 200 },
  { code: "transfer_1", title: "Generoso", description: "Envía nexocoin a alguien con `/eco pagar`.", goal: 1, reward: 240 },
  { code: "bump_1", title: "Impulso DISBOARD", description: "Haz un /bump con DISBOARD para apoyar el servidor.", goal: 1, reward: 300 },
];

const WEEKLY_PICK = 7;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function ensureWeeklyMissions(guildId: string): Mission[] {
  const week = currentWeekId();
  const existing = getDb()
    .prepare("SELECT * FROM missions WHERE guild_id = ? AND kind = 'auto' AND week_id = ?")
    .all(guildId, week) as Mission[];
  if (existing.length) return existing;
  const now = Date.now();
  const pick = shuffle(AUTO_POOL).slice(0, WEEKLY_PICK);
  const ins = getDb().prepare(
    `INSERT INTO missions (guild_id, code, title, description, reward, goal, week_id, kind, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'auto', 1, ?)`,
  );
  for (const m of pick) ins.run(guildId, m.code, m.title, m.description, m.reward, m.goal, week, now);
  return getDb()
    .prepare("SELECT * FROM missions WHERE guild_id = ? AND kind = 'auto' AND week_id = ?")
    .all(guildId, week) as Mission[];
}

export function listActiveMissions(guildId: string): Mission[] {
  const week = currentWeekId();
  ensureWeeklyMissions(guildId);
  return getDb()
    .prepare(
      `SELECT * FROM missions WHERE guild_id = ? AND active = 1 AND (week_id = ? OR week_id IS NULL OR kind = 'custom')
       ORDER BY kind, id`,
    )
    .all(guildId, week) as Mission[];
}

function progressOf(missionId: number, userId: string): Progress {
  const row = getDb()
    .prepare("SELECT * FROM mission_progress WHERE mission_id = ? AND user_id = ?")
    .get(missionId, userId) as Progress | undefined;
  if (row) return row;
  getDb()
    .prepare("INSERT INTO mission_progress (mission_id, user_id, progress, claimed, extra) VALUES (?, ?, 0, 0, '{}')")
    .run(missionId, userId);
  return { mission_id: missionId, user_id: userId, progress: 0, claimed: 0, extra: "{}" };
}

export function getProgress(missionId: number, userId: string): Progress {
  return progressOf(missionId, userId);
}

let discordClient: any = null;

export function setMissionsClient(client: any): void {
  discordClient = client;
}

export async function notifyMissionClaimed(userId: string, mission: Mission, guildId: string): Promise<void> {
  if (!discordClient) return;
  try {
    const user = await discordClient.users.fetch(userId).catch(() => null);
    if (!user) return;
    const guild = discordClient.guilds.cache.get(guildId);
    const guildName = guild?.name ?? "Nexo";
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setAuthor({
        name: "¡Misión Semanal Completada y Cobrada! 🎯",
        iconURL: discordClient.user?.displayAvatarURL() ?? undefined,
      })
      .setTitle(`🏆 ${mission.title}`)
      .setDescription(
        `¡Enhorabuena, **${user.username}**!\n` +
          `Has completado con éxito la siguiente misión en **${guildName}**:\n\n` +
          `📜 **Objetivo:** *${mission.description}*\n\n` +
          `🪙 **Recompensa automática:** \`+${mission.reward.toLocaleString("es-ES")} nexocoins\` han sido ingresados directamente en tu cartera.`,
      )
      .setFooter({ text: "Nexo · Las recompensas de misiones se cobran de forma 100% automática" })
      .setTimestamp();
    await user.send({ embeds: [embed] }).catch(() => null);
  } catch {
    /* Ignorar si el usuario tiene MD cerrados */
  }
}

export async function autoClaimUnclaimedMissions(): Promise<number> {
  const week = currentWeekId();
  const rows = getDb()
    .prepare(
      `SELECT p.mission_id, p.user_id, p.progress, m.guild_id, m.title, m.description, m.reward, m.goal
       FROM mission_progress p
       JOIN missions m ON p.mission_id = m.id
       WHERE p.claimed = 0 AND p.progress >= m.goal AND m.active = 1 AND (m.week_id = ? OR m.kind = 'custom')`,
    )
    .all(week) as {
      mission_id: number;
      user_id: string;
      progress: number;
      guild_id: string;
      title: string;
      description: string;
      reward: number;
      goal: number;
    }[];

  let count = 0;
  for (const r of rows) {
    getDb()
      .prepare("UPDATE mission_progress SET claimed = 1 WHERE mission_id = ? AND user_id = ?")
      .run(r.mission_id, r.user_id);
    if (r.reward > 0) {
      const eco = getEco(r.guild_id, r.user_id);
      addWallet(eco, r.reward);
      saveEco(eco);
    }
    count++;
    const missionObj: Mission = {
      id: r.mission_id,
      guild_id: r.guild_id,
      code: "",
      title: r.title,
      description: r.description,
      reward: r.reward,
      goal: r.goal,
      week_id: week,
      kind: "",
      active: 1,
      event_id: null,
      channel_id: null,
      message_id: null,
      created_by: null,
      created_at: 0,
    };
    notifyMissionClaimed(r.user_id, missionObj, r.guild_id).catch(() => null);
  }
  return count;
}

export function bumpMission(guildId: string, userId: string, code: string, uniqueKey?: string): void {
  ensureWeeklyMissions(guildId);
  const week = currentWeekId();
  const missions = getDb()
    .prepare("SELECT * FROM missions WHERE guild_id = ? AND active = 1 AND code = ? AND (week_id = ? OR kind = 'custom')")
    .all(guildId, code, week) as Mission[];
  for (const m of missions) {
    const p = progressOf(m.id, userId);
    if (p.claimed) continue;
    let extra: { set?: string[] } = {};
    try {
      extra = JSON.parse(p.extra || "{}") as { set?: string[] };
    } catch {
      extra = {};
    }
    if (uniqueKey) {
      const arr = extra.set ?? [];
      if (arr.includes(uniqueKey)) continue;
      arr.push(uniqueKey);
      extra.set = arr;
      p.progress = arr.length;
      p.extra = JSON.stringify(extra);
    } else {
      p.progress += 1;
    }
    if (p.progress > m.goal) p.progress = m.goal;

    if (p.progress >= m.goal) {
      p.claimed = 1;
      getDb()
        .prepare("UPDATE mission_progress SET progress = ?, claimed = 1, extra = ? WHERE mission_id = ? AND user_id = ?")
        .run(p.progress, p.extra, m.id, userId);
      if (m.reward > 0) {
        const eco = getEco(guildId, userId);
        addWallet(eco, m.reward);
        saveEco(eco);
      }
      notifyMissionClaimed(userId, m, guildId).catch(() => null);
    } else {
      getDb()
        .prepare("UPDATE mission_progress SET progress = ?, extra = ? WHERE mission_id = ? AND user_id = ?")
        .run(p.progress, p.extra, m.id, userId);
    }
  }
}

export function claimMission(guildId: string, userId: string, missionId: number): string {
  const m = getDb().prepare("SELECT * FROM missions WHERE id = ? AND guild_id = ?").get(missionId, guildId) as
    | Mission
    | undefined;
  if (!m || !m.active) return "Esa misión no existe o ya cerró.";
  const p = progressOf(m.id, userId);
  if (p.claimed) {
    return `Esta misión (**${m.title}**) ya fue cobrada automáticamente al completarse. ¡Tus ${n(m.reward)} ya están en tu cartera!`;
  }
  if (p.progress < m.goal) return `Aún no: progreso actual **${p.progress}/${m.goal}**.`;
  p.claimed = 1;
  getDb().prepare("UPDATE mission_progress SET claimed = 1 WHERE mission_id = ? AND user_id = ?").run(m.id, userId);
  if (m.reward > 0) {
    const eco = getEco(guildId, userId);
    addWallet(eco, m.reward);
    saveEco(eco);
  }
  notifyMissionClaimed(userId, m, guildId).catch(() => null);
  return m.reward ? `¡Misión **${m.title}** cobrada con éxito! +${n(m.reward)} añadidos a tu cartera.` : `Misión **${m.title}** completada.`;
}

export function createCustomMission(opts: {
  guildId: string;
  title: string;
  description: string;
  reward: number;
  goal?: number;
  eventId?: number | null;
  createdBy: string;
}): Mission {
  const info = getDb()
    .prepare(
      `INSERT INTO missions (guild_id, code, title, description, reward, goal, week_id, kind, active, event_id, created_by, created_at)
       VALUES (?, 'custom', ?, ?, ?, ?, NULL, 'custom', 1, ?, ?, ?)`,
    )
    .run(
      opts.guildId,
      opts.title.slice(0, 80),
      opts.description.slice(0, 300),
      Math.max(0, Math.floor(opts.reward)),
      Math.max(1, opts.goal ?? 1),
      opts.eventId ?? null,
      opts.createdBy,
      Date.now(),
    );
  return getDb().prepare("SELECT * FROM missions WHERE id = ?").get(Number(info.lastInsertRowid)) as Mission;
}

export function setMissionMessage(id: number, channelId: string, messageId: string): void {
  getDb().prepare("UPDATE missions SET channel_id = ?, message_id = ? WHERE id = ?").run(channelId, messageId, id);
}

export function completeForUser(guildId: string, missionId: number, userId: string): string {
  const m = getDb().prepare("SELECT * FROM missions WHERE id = ? AND guild_id = ?").get(missionId, guildId) as
    | Mission
    | undefined;
  if (!m) return "Misión no encontrada.";
  progressOf(m.id, userId);
  getDb()
    .prepare("UPDATE mission_progress SET progress = ? WHERE mission_id = ? AND user_id = ?")
    .run(m.goal, m.id, userId);
  return claimMission(guildId, userId, missionId);
}

export function bumpEventMission(guildId: string, userId: string, eventId: number): void {
  const missions = getDb()
    .prepare("SELECT * FROM missions WHERE guild_id = ? AND active = 1 AND event_id = ?")
    .all(guildId, eventId) as Mission[];
  for (const m of missions) {
    progressOf(m.id, userId);
    getDb()
      .prepare("UPDATE mission_progress SET progress = ? WHERE mission_id = ? AND user_id = ?")
      .run(m.goal, m.id, userId);
  }
}

export function boardEmbed(missions: Mission[], week: string) {
  const lines = missions.map(
    (m, i) => `**${i + 1}. ${m.title}** · ${n(m.reward)}\n${m.description} · \`/mision reclamar id:${m.id}\``,
  );
  return new EmbedBuilder()
    .setColor(COLORS.level)
    .setTitle("🎯 Misiones de la semana")
    .setDescription(lines.join("\n\n") || "Sin misiones.")
    .setFooter({ text: `Semana ${week} · /mision ver` });
}

export async function publishWeeklyBoard(guild: {
  id: string;
  channels: { cache: Map<string, any> };
}): Promise<boolean> {
  const week = currentWeekId();
  const posted = getDb()
    .prepare("SELECT message_id, channel_id FROM mission_board WHERE guild_id = ? AND week_id = ?")
    .get(guild.id, week) as { message_id: string; channel_id: string } | undefined;
  if (posted) return false;

  // Si aún no hay tablón, regenera el set de la semana (más variedad)
  getDb().prepare("DELETE FROM missions WHERE guild_id = ? AND kind = 'auto' AND week_id = ?").run(guild.id, week);
  const missions = ensureWeeklyMissions(guild.id);
  const ch = guild.channels.cache.get(MISSIONS_CHANNEL_ID) as GuildTextBasedChannel | undefined;
  if (!ch || !("send" in ch)) {
    return false;
  }

  const msg = await ch.send({ embeds: [boardEmbed(missions, week)] });
  await msg.pin().catch(() => null);
  getDb()
    .prepare("INSERT INTO mission_board (guild_id, week_id, channel_id, message_id) VALUES (?, ?, ?, ?)")
    .run(guild.id, week, ch.id, msg.id);
  logger.info("Tablón de misiones", guild.id, week);
  return true;
}

export async function tickMissionBoard(client: { guilds: { cache: Map<string, any> } }): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    await publishWeeklyBoard(guild).catch((err) => logger.error("mission board", guild.id, err));
  }
}
