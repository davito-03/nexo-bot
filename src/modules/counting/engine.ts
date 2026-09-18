import { EmbedBuilder, type Message, type TextChannel } from "discord.js";
import { getDb } from "../../database/index.js";
import { COUNTING_CHANNEL_ID, COLORS } from "../../constants.js";
import { getEco, saveEco, n, totalFunds, deductFunds } from "../economy/engine.js";
import { logger } from "../../logger.js";

export interface CountingState {
  guild_id: string;
  channel_id: string;
  current_number: number;
  last_user_id: string | null;
  highest_record: number;
  saves: number;
  max_saves: number;
  total_counts: number;
  last_count_at: number;
}

export interface CountingUserStat {
  guild_id: string;
  user_id: string;
  correct_counts: number;
  ruined_counts: number;
  last_count_at: number;
}

/**
 * Obtiene el estado actual del juego del contador en un servidor.
 */
export function getCountingState(guildId: string, channelId = COUNTING_CHANNEL_ID): CountingState {
  const db = getDb();
  let row = db
    .prepare("SELECT * FROM counting_game WHERE guild_id = ?")
    .get(guildId) as CountingState | undefined;

  if (!row) {
    db.prepare(`
      INSERT INTO counting_game (guild_id, channel_id, current_number, last_user_id, highest_record, saves, max_saves, total_counts, last_count_at)
      VALUES (?, ?, 0, NULL, 0, 2, 5, 0, ?)
    `).run(guildId, channelId, Date.now());

    row = db
      .prepare("SELECT * FROM counting_game WHERE guild_id = ?")
      .get(guildId) as CountingState;
  }

  return row;
}

/**
 * Guarda el estado actualizado del contador.
 */
export function saveCountingState(state: CountingState): void {
  const db = getDb();
  db.prepare(`
    UPDATE counting_game SET
      channel_id = @channel_id,
      current_number = @current_number,
      last_user_id = @last_user_id,
      highest_record = @highest_record,
      saves = @saves,
      max_saves = @max_saves,
      total_counts = @total_counts,
      last_count_at = @last_count_at
    WHERE guild_id = @guild_id
  `).run(state);
}

/**
 * Comprueba si un mensaje fue enviado en el canal de conteo.
 */
export function isCountingChannel(guildId: string, channelId: string): boolean {
  if (channelId === COUNTING_CHANNEL_ID) return true;
  const db = getDb();
  const row = db
    .prepare("SELECT channel_id FROM counting_game WHERE guild_id = ?")
    .get(guildId) as { channel_id: string } | undefined;
  return row?.channel_id === channelId;
}

/**
 * Registra una acción (conteo correcto o fallo) para las estadísticas de un usuario.
 */
export function recordUserCount(guildId: string, userId: string, success: boolean): void {
  const db = getDb();
  const now = Date.now();
  if (success) {
    db.prepare(`
      INSERT INTO counting_user_stats (guild_id, user_id, correct_counts, ruined_counts, last_count_at)
      VALUES (?, ?, 1, 0, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        correct_counts = correct_counts + 1,
        last_count_at = excluded.last_count_at
    `).run(guildId, userId, now);
  } else {
    db.prepare(`
      INSERT INTO counting_user_stats (guild_id, user_id, correct_counts, ruined_counts, last_count_at)
      VALUES (?, ?, 0, 1, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        ruined_counts = ruined_counts + 1,
        last_count_at = excluded.last_count_at
    `).run(guildId, userId, now);
  }
}

/**
 * Obtiene el ranking de mejores contadores del servidor.
 */
export function getCountingLeaderboard(guildId: string, limit = 10): CountingUserStat[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM counting_user_stats WHERE guild_id = ? ORDER BY correct_counts DESC LIMIT ?")
    .all(guildId, limit) as CountingUserStat[];
}

/**
 * Permite a un miembro comprar un salvavidas para el servidor usando sus NexoCoins.
 */
export function buyServerSave(guildId: string, userId: string, price = 5000): { success: boolean; message: string; saves?: number } {
  const state = getCountingState(guildId);
  if (state.saves >= state.max_saves) {
    return { success: false, message: `El servidor ya tiene el número máximo de salvavidas permitidos (**${state.max_saves}** 🛟).` };
  }

  const eco = getEco(guildId, userId);
  if (!deductFunds(eco, price)) {
    return {
      success: false,
      message: `No tienes suficientes NexoCoins. Necesitas ${n(price)} pero dispones de ${n(totalFunds(eco))} (Cartera: ${n(eco.wallet)} | Banco: ${n(eco.bank)}).`,
    };
  }
  saveEco(eco);

  state.saves += 1;
  saveCountingState(state);

  return {
    success: true,
    message: `¡Has comprado **1 Salvavidas 🛟** para el servidor por ${n(price)}! Ahora el servidor cuenta con **${state.saves}/${state.max_saves}** salvavidas.`,
    saves: state.saves,
  };
}

/**
 * Procesa un mensaje en el canal del contador.
 */
export async function handleCountingMessage(msg: Message): Promise<boolean> {
  if (!msg.inGuild() || msg.author.bot) return false;
  if (!isCountingChannel(msg.guild.id, msg.channelId)) return false;

  const content = msg.content.trim();
  const state = getCountingState(msg.guild.id, msg.channelId);

  // 1. Si no es un número puro:
  // Eliminamos el mensaje para que el canal permanezca ordenado y advertimos brevemente.
  const numMatch = content.match(/^(\d+)$/);
  if (!numMatch) {
    await msg.delete().catch(() => null);
    if (msg.channel.isTextBased() && "send" in msg.channel) {
      const nextNum = state.current_number + 1;
      const warn = await msg.channel.send({
        content: `⚠️ ${msg.author}, en este canal **solo se pueden enviar números**. El siguiente número es **${nextNum}**.\n*(Para charlar utiliza el chat general)*`,
      }).catch(() => null);
      if (warn) {
        setTimeout(() => warn.delete().catch(() => null), 5000);
      }
    }
    return true;
  }

  const num = parseInt(numMatch[1], 10);
  const expected = state.current_number + 1;

  // 2. Comprobar si el mismo usuario cuenta dos veces seguidas
  const isDoubleCount = state.last_user_id === msg.author.id && state.current_number > 0;
  // 3. Comprobar si el número es incorrecto
  const isWrongNumber = num !== expected;

  if (isDoubleCount || isWrongNumber) {
    const reason = isDoubleCount
      ? `intentó contar dos veces seguidas`
      : `puso el número **${num}**, pero tocaba el **${expected}**`;

    recordUserCount(msg.guild.id, msg.author.id, false);

    // ¿Hay salvavidas disponibles?
    if (state.saves > 0) {
      state.saves -= 1;
      saveCountingState(state);

      await msg.react("🛟").catch(() => null);

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("🛟 ¡Salvavidas Utilizado!")
        .setDescription(
          `¡Cuidado! ${msg.author} ${reason}.\n\n` +
          `Se ha consumido **1 Salvavidas** del servidor para evitar perder la racha.\n` +
          `🛟 Salvavidas restantes: **${state.saves}/${state.max_saves}**\n\n` +
          `➡️ **El siguiente número sigue siendo: ${expected}**`
        );

      await msg.reply({ embeds: [embed] }).catch(() => null);
      return true;
    }

    // Sin salvavidas: Racha arruinada y reinicio a 0
    await msg.react("💥").catch(() => null);

    const oldNumber = state.current_number;
    const isNewRecord = oldNumber > state.highest_record;
    if (isNewRecord) {
      state.highest_record = oldNumber;
    }

    state.current_number = 0;
    state.last_user_id = null;
    state.last_count_at = Date.now();
    saveCountingState(state);

    const embed = new EmbedBuilder()
      .setColor(COLORS.danger)
      .setTitle("💥 ¡Racha Arruinada!")
      .setDescription(
        `${msg.author} ${reason}.\n\n` +
        `📉 La racha se detuvo en **${oldNumber}**.\n` +
        (isNewRecord
          ? `🏆 **¡NUEVO RÉCORD DEL SERVIDOR:** **${oldNumber}**!\n`
          : `📊 Récord histórico del servidor: **${state.highest_record}**.\n`) +
        `\n🔄 **El contador se ha reiniciado.**\nEl siguiente número es **1**.`
      );

    await msg.channel.send({ embeds: [embed] }).catch(() => null);
    return true;
  }

  // 4. Conteo correcto:
  state.current_number = num;
  state.last_user_id = msg.author.id;
  state.total_counts += 1;
  state.last_count_at = Date.now();

  if (num > state.highest_record) {
    state.highest_record = num;
  }

  // Recompensas económicas
  let rewardCoins = 15; // 15 NexoCoins base por cada número correcto
  let bonusSave = false;

  if (num % 100 === 0) {
    rewardCoins += 1500; // Gran bonus cada 100
    if (state.saves < state.max_saves) {
      state.saves += 1;
      bonusSave = true;
    }
  } else if (num % 50 === 0) {
    rewardCoins += 500; // Bonus cada 50
  }

  // Guardar monedas
  const eco = getEco(msg.guild.id, msg.author.id);
  eco.wallet += rewardCoins;
  eco.earned += rewardCoins;
  saveEco(eco);

  recordUserCount(msg.guild.id, msg.author.id, true);
  saveCountingState(state);

  // Reacciones
  if (num % 100 === 0) {
    await msg.react("💯").catch(() => null);
    await msg.react("🎉").catch(() => null);
  } else if (num % 50 === 0) {
    await msg.react("⭐").catch(() => null);
  } else {
    await msg.react("✅").catch(() => null);
  }

  // Notificación de hito especial
  if (num % 100 === 0 || num % 50 === 0) {
    const milestoneEmbed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`🎉 ¡Hito Alcanzado: ${num}!`)
      .setDescription(
        `¡Increíble coordinación! Se ha alcanzado el número **${num}**.\n` +
        `💰 ${msg.author} ha ganado **+${rewardCoins} NexoCoins** por conseguir este hito.` +
        (bonusSave ? `\n🛟 **¡El servidor ha recibido +1 Salvavidas de bonificación!** (Total: **${state.saves}/${state.max_saves}**)` : "")
      );

    await msg.channel.send({ embeds: [milestoneEmbed] }).catch(() => null);
  }

  return true;
}

/**
 * Publica el mensaje guía fijado en el canal del contador si aún no existe.
 */
export async function setupCountingChannel(channel: TextChannel): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("🔢 El Contador · Nexo")
    .setDescription(
      `¡Bienvenidos al canal de conteo de la comunidad! El objetivo es trabajar en equipo para alcanzar el número más alto posible sin equivocarse.\n\n` +
      `📜 **Reglas del Juego:**\n` +
      `1️⃣ Se cuenta en orden de **1 en 1** (1, 2, 3, 4...).\n` +
      `2️⃣ **No puedes contar dos veces seguidas**: debe participar al menos otra persona antes de que vuelvas a escribir.\n` +
      `3️⃣ **Solo números**: este canal es estrictamente para números. Los mensajes de texto serán borrados automáticamente.\n` +
      `4️⃣ Si alguien se equivoca o cuenta dos veces seguidas, se gastará un **Salvavidas 🛟** si el servidor tiene disponible. Si no hay salvavidas... **¡el contador vuelve a 1!**\n\n` +
      `🎁 **Recompensas en NexoCoins:**\n` +
      `• **15 NexoCoins** por cada número correcto.\n` +
      `• **+500 NexoCoins** en múltiplos de 50.\n` +
      `• **+1.500 NexoCoins y +1 Salvavidas gratis** en múltiplos de 100.\n\n` +
      `💡 *Usa \`/contador estado\` para ver el récord o \`/contador salvavidas\` para apoyar al servidor con un salvavidas.*`
    )
    .setFooter({ text: "Nexo · ¡Empieza escribiendo el número 1!" });

  const pinMsg = await channel.send({ embeds: [embed] });
  await pinMsg.pin().catch(() => null);
}
