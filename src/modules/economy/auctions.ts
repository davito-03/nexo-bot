import { getDb } from "../../database/index.js";
import { getItemDef } from "./items.js";
import { isUnsellableItem } from "./shop.js";
import { addWallet, deductFunds, getEco, giveItem, n, saveEco, takeItem, totalFunds } from "./engine.js";
import { formatDuration, timestamp } from "../../utils/time.js";
import { logger } from "../../logger.js";
import type { NexoClient } from "../../client.js";

export interface AuctionRow {
  id: number;
  guild_id: string;
  seller_id: string;
  seller_tag: string;
  item_id: string;
  item_name: string;
  quantity: number;
  starting_bid: number;
  current_bid: number;
  highest_bidder_id: string | null;
  highest_bidder_tag: string | null;
  channel_id: string | null;
  message_id: string | null;
  ends_at: number;
  closed: number;
  created_at: number;
}

export function getAuction(id: number): AuctionRow | undefined {
  return getDb().prepare("SELECT * FROM auctions WHERE id = ?").get(id) as AuctionRow | undefined;
}

export function listActiveAuctions(guildId: string): AuctionRow[] {
  return getDb()
    .prepare("SELECT * FROM auctions WHERE guild_id = ? AND closed = 0 AND ends_at > ? ORDER BY ends_at ASC")
    .all(guildId, Date.now()) as AuctionRow[];
}

export function createAuction(opts: {
  guildId: string;
  sellerId: string;
  sellerTag: string;
  itemId: string;
  quantity?: number;
  startingBid: number;
  durationHours: number;
  channelId?: string;
}): { ok: boolean; error?: string; auction?: AuctionRow } {
  if (isUnsellableItem(opts.guildId, opts.itemId)) {
    return { ok: false, error: "Los roles exclusivos (como Millonario y Multimillonario) no se pueden subastar ni transferir." };
  }

  const qty = Math.max(1, opts.quantity ?? 1);
  // Verificar que el usuario tiene el objeto
  const itemDef = getItemDef(opts.itemId);
  const itemName = itemDef ? `${itemDef.emoji} ${itemDef.name}` : opts.itemId;

  const startBid = Math.max(10, Math.floor(opts.startingBid));
  const hours = Math.min(72, Math.max(1, opts.durationHours));
  const endsAt = Date.now() + hours * 3600_000;
  const now = Date.now();

  const tx = getDb().transaction(() => {
    if (opts.sellerId !== "SYSTEM") {
      const eco = getEco(opts.guildId, opts.sellerId);
      for (let i = 0; i < qty; i++) {
        if (!takeItem(eco, opts.itemId)) return { error: `No tienes suficientes unidades de **${itemName}** en tu inventario.` } as const;
      }
      saveEco(eco);
    }
    const info = getDb().prepare(`INSERT INTO auctions (guild_id, seller_id, seller_tag, item_id, item_name, quantity, starting_bid, current_bid, channel_id, ends_at, closed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`).run(opts.guildId, opts.sellerId, opts.sellerTag, opts.itemId, itemName, qty, startBid, startBid, opts.channelId ?? null, endsAt, now);
    return { auction: getAuction(Number(info.lastInsertRowid)) } as const;
  });
  const result = tx();
  if ("error" in result) return { ok: false, error: result.error };

  return { ok: true, auction: result.auction };
}

export function placeBid(opts: {
  guildId: string;
  auctionId: number;
  bidderId: string;
  bidderTag: string;
  amount: number;
}): { ok: boolean; error?: string; auction?: AuctionRow } {
  const tx = getDb().transaction(() => placeBidUnlocked(opts));
  return tx();
}

function placeBidUnlocked(opts: {
  guildId: string; auctionId: number; bidderId: string; bidderTag: string; amount: number;
}): { ok: boolean; error?: string; auction?: AuctionRow } {
  const auction = getAuction(opts.auctionId);
  if (!auction || auction.guild_id !== opts.guildId) {
    return { ok: false, error: "La subasta especificada no existe." };
  }
  if (auction.closed || auction.ends_at <= Date.now()) {
    return { ok: false, error: "Esta subasta ya ha finalizado o ha sido cerrada." };
  }
  if (auction.seller_id === opts.bidderId) {
    return { ok: false, error: "No puedes pujar en tu propia subasta." };
  }
  if (auction.highest_bidder_id === opts.bidderId) {
    return { ok: false, error: "Ya eres el mayor postor actual de esta subasta." };
  }

  const bidAmount = Math.floor(opts.amount);
  const minRequired = auction.highest_bidder_id
    ? Math.max(auction.current_bid + 20, Math.ceil(auction.current_bid * 1.05))
    : auction.starting_bid;

  if (bidAmount < minRequired) {
    return { ok: false, error: `La puja mínima actual para esta subasta es de ${n(minRequired)}.` };
  }

  const bidderEco = getEco(opts.guildId, opts.bidderId);
  if (totalFunds(bidderEco) < bidAmount) {
    return { ok: false, error: `No tienes suficientes nexocoins. Necesitas ${n(bidAmount)} pero tienes ${n(totalFunds(bidderEco))} (Cartera: ${n(bidderEco.wallet)} | Banco: ${n(bidderEco.bank)}).` };
  }

  // Devolver el dinero al postor anterior si lo había
  if (auction.highest_bidder_id) {
    const prevBidderEco = getEco(opts.guildId, auction.highest_bidder_id);
    addWallet(prevBidderEco, auction.current_bid);
    saveEco(prevBidderEco);
  }

  // Cobrar al nuevo postor
  deductFunds(bidderEco, bidAmount);
  saveEco(bidderEco);

  // Si queda menos de 2 minutos para que acabe, extender 2 minutos para evitar sniper bots
  let newEndsAt = auction.ends_at;
  if (auction.ends_at - Date.now() < 120_000) {
    newEndsAt = Date.now() + 120_000;
  }

  getDb()
    .prepare(
      `UPDATE auctions SET current_bid = ?, highest_bidder_id = ?, highest_bidder_tag = ?, ends_at = ?
       WHERE id = ?`,
    )
    .run(bidAmount, opts.bidderId, opts.bidderTag, newEndsAt, auction.id);

  const updated = getAuction(auction.id);
  return { ok: true, auction: updated };
}

export function cancelAuction(opts: {
  guildId: string;
  auctionId: number;
  userId: string;
  isStaff?: boolean;
}): { ok: boolean; error?: string } {
  return getDb().transaction(() => cancelAuctionUnlocked(opts))();
}

function cancelAuctionUnlocked(opts: {
  guildId: string; auctionId: number; userId: string; isStaff?: boolean;
}): { ok: boolean; error?: string } {
  const auction = getAuction(opts.auctionId);
  if (!auction || auction.guild_id !== opts.guildId) {
    return { ok: false, error: "Subasta no encontrada." };
  }
  if (auction.closed) {
    return { ok: false, error: "La subasta ya está cerrada." };
  }
  if (!opts.isStaff && auction.seller_id !== opts.userId) {
    return { ok: false, error: "Solo el creador de la subasta o el Staff pueden cancelarla." };
  }
  if (auction.highest_bidder_id && !opts.isStaff) {
    return { ok: false, error: "No puedes cancelar una subasta que ya tiene pujas activas de otros usuarios." };
  }

  // Devolver dinero al postor si lo había (cancelado por staff)
  if (auction.highest_bidder_id) {
    const bidderEco = getEco(opts.guildId, auction.highest_bidder_id);
    addWallet(bidderEco, auction.current_bid);
    saveEco(bidderEco);
  }

  // Devolver el objeto al vendedor
  const sellerEco = getEco(opts.guildId, auction.seller_id);
  giveItem(sellerEco, auction.item_id, auction.quantity);
  saveEco(sellerEco);

  getDb().prepare("UPDATE auctions SET closed = 1 WHERE id = ?").run(auction.id);
  return { ok: true };
}

export async function tickAuctions(client: NexoClient): Promise<void> {
  const expired = getDb()
    .prepare("SELECT * FROM auctions WHERE closed = 0 AND ends_at <= ?")
    .all(Date.now()) as AuctionRow[];

  for (const auc of expired) {
    try {
      const settled = getDb().transaction(() => {
        const current = getAuction(auc.id);
        if (!current || current.closed) return null;
        getDb().prepare("UPDATE auctions SET closed = 1 WHERE id = ? AND closed = 0").run(auc.id);
        if (current.highest_bidder_id) {
          const winnerEco = getEco(current.guild_id, current.highest_bidder_id);
          giveItem(winnerEco, current.item_id, current.quantity);
          saveEco(winnerEco);
          if (current.seller_id === "SYSTEM") {
            // FONDOS QUEMADOS DE LA ECONOMÍA (Money Sink Estatal)
            logger.info(`[Subasta Estatal #${current.id}] ${current.current_bid} nexocoins quemadas definitivamente de la economía.`);
          } else {
            const fee = Math.floor(current.current_bid * 0.02);
            const sellerEco = getEco(current.guild_id, current.seller_id);
            addWallet(sellerEco, current.current_bid - fee);
            saveEco(sellerEco);
          }
        } else if (current.seller_id !== "SYSTEM") {
          const sellerEco = getEco(current.guild_id, current.seller_id);
          giveItem(sellerEco, current.item_id, current.quantity);
          saveEco(sellerEco);
        }
        return current;
      })();
      if (!settled) continue;
      logger.info(`Subasta #${settled.id} finalizada`);
      if (settled.channel_id) {
        const guild = client.guilds.cache.get(settled.guild_id);
        const channel = guild?.channels.cache.get(settled.channel_id);
        if (channel && channel.isTextBased() && "send" in channel) {
          const message = settled.highest_bidder_id
            ? `🔨 **¡Subasta finalizada!**\nEl lote **${settled.quantity}× ${settled.item_name}** ha sido ganado por <@${settled.highest_bidder_id}> por **${settled.current_bid.toLocaleString("es-ES")} nexocoins**.`
            : `🔨 **Subasta #${settled.id} cerrada:** No hubo pujas y el objeto ha sido devuelto a <@${settled.seller_id}>.`;
          await channel.send({ content: message }).catch(() => null);
        }
      }
    } catch (err) {
      logger.error("Error al procesar tick de subasta", auc.id, err);
    }
  }
}
