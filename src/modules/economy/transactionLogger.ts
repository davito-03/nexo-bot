import { EmbedBuilder, type TextBasedChannel } from "discord.js";
import { getDb } from "../../database/index.js";
import { COLORS, TRANSACTION_LOG_CHANNEL_ID } from "../../constants.js";
import { logger } from "../../logger.js";
import type { NexoClient } from "../../client.js";

export interface TransactionEntry {
  guildId: string;
  userId: string;
  deltaWallet: number;
  deltaBank: number;
  newWallet: number;
  newBank: number;
  source: string;
  timestamp: number;
}

let txClient: NexoClient | null = null;
const txQueue: TransactionEntry[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

export function setTransactionClient(client: NexoClient): void {
  txClient = client;
}

export function inferSourceFromStack(): string {
  const stack = new Error().stack || "";
  const lines = stack.split("\n");
  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.includes("engine.ts") || l.includes("transactionlogger.ts") || l.includes("saveeco")) continue;
    if (l.includes("heist") || l.includes("asalto")) return "🏦 Asalto al Banco Central";
    if (l.includes("work") || l.includes("trabajo")) return "💼 Empleo / Profesión";
    if (l.includes("casino")) return "🎰 Casino / Apuestas";
    if (l.includes("crime") || l.includes("crimen")) return "🦹 Delincuencia / Crimen";
    if (l.includes("pesca") || l.includes("fish")) return "🎣 Pesca Deportiva";
    if (l.includes("caza") || l.includes("hunt")) return "🏹 Caza Silvestre";
    if (l.includes("mineria") || l.includes("passive")) return "⛏️ Minería Cripto";
    if (l.includes("trading") || l.includes("dividend")) return "📈 Bolsa / Trading / Dividendos";
    if (l.includes("shop") || l.includes("tienda")) return "🏪 Tienda Oficial";
    if (l.includes("mercadonegro")) return "🕵️ Mercado Negro";
    if (l.includes("mercado")) return "🤝 Mercado P2P";
    if (l.includes("loteria")) return "🎟️ Lotería Semanal";
    if (l.includes("propiedad")) return "🏠 Rentas Inmobiliarias";
    if (l.includes("loan") || l.includes("prestamo") || l.includes("deuda")) return "💳 Préstamos / Deuda Bancaria";
    if (l.includes("tax")) return "🏛️ Impuestos Municipales";
    if (l.includes("counting") || l.includes("contador")) return "🔢 Juego del Contador";
    if (l.includes("bump")) return "🚀 Recompensa DISBOARD Bump";
    if (l.includes("voz") || l.includes("voice")) return "🔊 Recompensa de Voz / Cofre";
    if (l.includes("mascota")) return "🐾 Expedición de Mascotas";
    if (l.includes("conecta4")) return "🎲 Minijuego Conecta 4";
    if (l.includes("ahorcado")) return "🔤 Minijuego Ahorcado";
    if (l.includes("chatgames") || l.includes("minijuegos")) return "⚡ Minijuego de Chat Exprés";
    if (l.includes("mision")) return "📜 Recompensa de Misiones";
    if (l.includes("daily")) return "📅 Recompensa Diaria (Daily)";
    if (l.includes("weekly")) return "📅 Paga Semanal (Weekly)";
    if (l.includes("mendigar")) return "🤲 Limosna / Caridad";
    if (l.includes("subasta")) return "🔨 Subasta Pública";
    if (l.includes("cartas")) return "🃏 Colección de Cartas Gacha";
    if (l.includes("admin") || l.includes("staff") || l.includes("dar") || l.includes("quitar")) return "🛡️ Gestión de Staff";
  }
  return "🪙 Movimiento de Economía";
}

/**
 * Registra y programa el envío de una transacción financiera.
 */
export function logTransaction(entry: TransactionEntry): void {
  const netDelta = entry.deltaWallet + entry.deltaBank;

  // Persistir en SQLite de inmediato
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO economy_transactions (guild_id, user_id, delta_wallet, delta_bank, net_delta, new_wallet, new_bank, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      entry.guildId,
      entry.userId,
      entry.deltaWallet,
      entry.deltaBank,
      netDelta,
      entry.newWallet,
      entry.newBank,
      entry.source,
      entry.timestamp,
    );
  } catch (err) {
    logger.error("Error al persistir economy_transaction en SQLite:", err);
  }

  txQueue.push(entry);

  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushTimeout = null;
      void flushTransactionQueue();
    }, 1500);
  }
}

async function flushTransactionQueue(): Promise<void> {
  if (txQueue.length === 0) return;
  const items = txQueue.splice(0, txQueue.length);

  if (!txClient) {
    logger.warn("TransactionLogger: no hay cliente Discord configurado para enviar logs.");
    return;
  }

  let channel: TextBasedChannel | null = null;
  try {
    const ch =
      txClient.channels.cache.get(TRANSACTION_LOG_CHANNEL_ID) ??
      (await txClient.channels.fetch(TRANSACTION_LOG_CHANNEL_ID).catch(() => null));
    if (ch && ch.isTextBased() && "send" in ch) {
      channel = ch as TextBasedChannel;
    }
  } catch (err) {
    logger.error("TransactionLogger: error al obtener el canal de transacciones:", err);
    return;
  }

  if (!channel) {
    logger.warn(`TransactionLogger: canal ${TRANSACTION_LOG_CHANNEL_ID} no encontrado o inaccesible.`);
    return;
  }

  // Si hay 1 o 2 transacciones individuales, enviar embeds detallados
  if (items.length <= 3) {
    for (const tx of items) {
      const netDelta = tx.deltaWallet + tx.deltaBank;
      const newTotal = tx.newWallet + tx.newBank;

      let color: number = COLORS.primary;
      let title = "🪙 Registro de Transacción";
      let deltaText = "";

      if (netDelta > 0) {
        color = 0x2ecc71; // Verde
        title = "💰 Transacción: Ganancia";
        deltaText = `🟢 **+${netDelta.toLocaleString("es-ES")} 🪙**`;
      } else if (netDelta < 0) {
        color = 0xed4245; // Rojo
        title = "💸 Transacción: Pérdida / Gasto";
        deltaText = `🔴 **-${Math.abs(netDelta).toLocaleString("es-ES")} 🪙**`;
      } else {
        color = 0x3498db; // Azul
        title = "🔄 Transacción: Movimiento Interno";
        deltaText =
          tx.deltaWallet > 0
            ? `📥 **${tx.deltaWallet.toLocaleString("es-ES")} 🪙** (Banco → Cartera)`
            : `📤 **${Math.abs(tx.deltaWallet).toLocaleString("es-ES")} 🪙** (Cartera → Banco)`;
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(
          `**Usuario:** <@${tx.userId}> (\`${tx.userId}\`)\n` +
            `**Operación:** ${deltaText}\n` +
            `**Origen / Motivo:** \`${tx.source}\`\n\n` +
            `**Desglose de Fondos:**\n` +
            `▸ Cartera: **${tx.newWallet.toLocaleString("es-ES")} 🪙** ${tx.deltaWallet !== 0 ? `*(${tx.deltaWallet > 0 ? "+" : ""}${tx.deltaWallet.toLocaleString("es-ES")})*` : ""}\n` +
            `▸ Banco: **${tx.newBank.toLocaleString("es-ES")} 🪙** ${tx.deltaBank !== 0 ? `*(${tx.deltaBank > 0 ? "+" : ""}${tx.deltaBank.toLocaleString("es-ES")})*` : ""}\n` +
            `▸ Patrimonio Neto: **${newTotal.toLocaleString("es-ES")} 🪙**`,
        )
        .setTimestamp(tx.timestamp);

      await (channel as any).send({ embeds: [embed] }).catch((e: any) => {
        logger.error("TransactionLogger: error al enviar mensaje individual:", e);
      });
    }
  } else {
    // Si hay una ráfaga masiva (ej: reparto de dividendos o impuestos diarios), agrupar para no saturar Discord
    const chunkSize = 10;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const lines = chunk.map((tx) => {
        const net = tx.deltaWallet + tx.deltaBank;
        const sign = net > 0 ? "🟢 +" : net < 0 ? "🔴 -" : "🔄 ";
        const amt = net === 0 ? `${Math.abs(tx.deltaWallet).toLocaleString("es-ES")} (traspaso)` : `${Math.abs(net).toLocaleString("es-ES")} 🪙`;
        return `${sign}**${amt}** | <@${tx.userId}> · \`${tx.source}\` (Nuevo total: **${(tx.newWallet + tx.newBank).toLocaleString("es-ES")} 🪙**)`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📊 Lote de Transacciones Recientes (${chunk.length} operaciones)`)
        .setDescription(lines.join("\n\n"))
        .setTimestamp();

      await (channel as any).send({ embeds: [embed] }).catch((e: any) => {
        logger.error("TransactionLogger: error al enviar lote agrupado:", e);
      });
    }
  }
}
