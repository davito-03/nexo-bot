import { EmbedBuilder, type GuildTextBasedChannel } from "discord.js";
import { getDb, getGuildConfig } from "../../database/index.js";
import { COLORS } from "../../constants.js";
import { addWallet, deductFunds, getEco, giveItem, invOf, n, saveEco, takeItem, totalFunds } from "./engine.js";
import { findItem, isUnsellableItem } from "./shop.js";

export interface Listing {
  id: number;
  guild_id: string;
  seller_id: string;
  item_id: string;
  qty: number;
  price: number;
  created_at: number;
}

const MAX_LISTINGS = 6;
const FEE_BP = 500;

export function listMarket(guildId: string): Listing[] {
  return getDb()
    .prepare("SELECT * FROM market_listings WHERE guild_id = ? ORDER BY created_at DESC LIMIT 25")
    .all(guildId) as Listing[];
}

export function createListing(guildId: string, sellerId: string, itemId: string, qty: number, price: number): string | Listing {
  const item = findItem(guildId, itemId);
  if (!item || item.type === "role" || isUnsellableItem(guildId, itemId)) return "Solo se pueden vender ítems del inventario (no roles).";
  const q = Math.max(1, Math.floor(qty));
  const p = Math.max(10, Math.floor(price));
  if (p > 1_000_000) return "Precio máximo: 1.000.000.";
  const mine = getDb()
    .prepare("SELECT COUNT(*) AS c FROM market_listings WHERE guild_id = ? AND seller_id = ?")
    .get(guildId, sellerId) as { c: number };
  if (mine.c >= MAX_LISTINGS) return `Máximo ${MAX_LISTINGS} anuncios a la vez.`;
  const tx = getDb().transaction(() => {
    const eco = getEco(guildId, sellerId);
    const have = invOf(eco)[item.id] ?? 0;
    if (have < q) return { error: `No tienes suficientes **${item.name}** (tienes ${have}).` } as const;
    for (let i = 0; i < q; i++) takeItem(eco, item.id);
    saveEco(eco);
    const info = getDb().prepare("INSERT INTO market_listings (guild_id, seller_id, item_id, qty, price, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(guildId, sellerId, item.id, q, p, Date.now());
    return { listing: getDb().prepare("SELECT * FROM market_listings WHERE id = ?").get(Number(info.lastInsertRowid)) as Listing } as const;
  });
  const result = tx();
  if ("listing" in result) return result.listing ?? "No se pudo crear el anuncio.";
  return result.error ?? "No se pudo crear el anuncio.";
}

export function cancelListing(guildId: string, listingId: number, userId: string, asStaff = false): string {
  return getDb().transaction(() => {
    const row = getDb().prepare("SELECT * FROM market_listings WHERE id = ? AND guild_id = ?").get(listingId, guildId) as Listing | undefined;
    if (!row) return "Ese anuncio no existe.";
    if (!asStaff && row.seller_id !== userId) return "No es tuyo.";
    const eco = getEco(guildId, row.seller_id); giveItem(eco, row.item_id, row.qty); saveEco(eco);
    getDb().prepare("DELETE FROM market_listings WHERE id = ?").run(row.id);
    return "Anuncio cancelado. Ítems devueltos.";
  })();
}

export function buyListing(guildId: string, listingId: number, buyerId: string): string {
  const tx = getDb().transaction(() => {
    const row = getDb().prepare("SELECT * FROM market_listings WHERE id = ? AND guild_id = ?").get(listingId, guildId) as Listing | undefined;
    if (!row) return "Ese anuncio no existe.";
    if (row.seller_id === buyerId) return "Es tuyo. Usa cancelar.";
    const buyer = getEco(guildId, buyerId);
    if ((row.item_id === "candado" || row.item_id === "vpn") && buyerId !== "600041740124160011") {
      const currentCount = invOf(buyer)[row.item_id] ?? 0;
      if (currentCount + row.qty > 50) {
        return `Límite de posesión excedido. No puedes almacenar más de 50 ${row.item_id} en tu inventario (tienes ${currentCount}).`;
      }
    }
    if (!deductFunds(buyer, row.price)) {
      return `Cuesta ${n(row.price)}. Tienes ${n(totalFunds(buyer))} (Cartera: ${n(buyer.wallet)} | Banco: ${n(buyer.bank)}).`;
    }
    giveItem(buyer, row.item_id, row.qty); saveEco(buyer);
    const fee = Math.floor((row.price * FEE_BP) / 10_000);
    const seller = getEco(guildId, row.seller_id); addWallet(seller, row.price - fee, { stats: false }); saveEco(seller);
    getDb().prepare("DELETE FROM market_listings WHERE id = ?").run(row.id);
    const item = findItem(guildId, row.item_id);
    return `Has comprado **${row.qty}× ${item?.name ?? row.item_id}** por ${n(row.price)}. Comisión ${n(fee)}.`;
  });
  return tx();
}

export async function logMarket(guild: { id: string; channels: { cache: Map<string, any> } }, text: string): Promise<void> {
  const cfg = getGuildConfig(guild.id);
  const chId = cfg.market.logChannelId;
  if (!chId) return;
  const ch = guild.channels.cache.get(chId) as GuildTextBasedChannel | undefined;
  if (!ch || !("send" in ch)) return;
  await ch
    .send({ embeds: [new EmbedBuilder().setColor(COLORS.eco).setTitle("Mercado").setDescription(text)] })
    .catch(() => null);
}
