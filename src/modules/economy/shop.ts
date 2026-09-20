import { ActionRowBuilder, EmbedBuilder, GuildMember, PermissionFlagsBits, StringSelectMenuBuilder } from "discord.js";
import { getDb } from "../../database/index.js";
import {
  SHOP,
  addWallet,
  getEco,
  giveItem,
  hasItem,
  saveEco,
  invOf,
  takeItem,
  totalFunds,
  deductFundsDetailed,
  refundFunds,
  type EcoRow,
  type Inv,
} from "./engine.js";
import { n } from "./engine.js";
import { getItemDef } from "./items.js";


export interface CatalogItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  type: "item" | "role" | "cosmetic";
  roleId: string | null;
  unique: boolean;
  custom: boolean;
}

interface OverrideRow {
  item_id: string;
  price: number | null;
  hidden: number;
}

function overridesOf(guildId: string): Map<string, OverrideRow> {
  const rows = getDb()
    .prepare("SELECT item_id, price, hidden FROM shop_overrides WHERE guild_id = ?")
    .all(guildId) as OverrideRow[];
  return new Map(rows.map((r) => [r.item_id, r]));
}

export function catalog(guildId: string, opts?: { includeHidden?: boolean }): CatalogItem[] {
  const ov = overridesOf(guildId);
  const base: CatalogItem[] = [];
  for (const i of SHOP) {
    const o = ov.get(i.id);
    if (o?.hidden && !opts?.includeHidden) continue;
    base.push({
      id: i.id,
      name: i.name,
      price: o?.price ?? i.price,
      desc: i.desc,
      type: i.id === "corona" ? "cosmetic" : "item",
      roleId: null,
      unique: i.id === "corona",
      custom: false,
    });
  }
  const custom = getDb()
    .prepare("SELECT * FROM shop_items WHERE guild_id = ? ORDER BY price")
    .all(guildId) as {
    item_id: string;
    name: string;
    price: number;
    description: string;
    type: string;
    role_id: string | null;
    unique_own: number;
  }[];
  for (const c of custom) {
    base.push({
      id: c.item_id,
      name: c.name,
      price: c.price,
      desc: c.description,
      type: c.type === "role" ? "role" : "item",
      roleId: c.role_id,
      unique: Boolean(c.unique_own) || c.type === "role",
      custom: true,
    });
  }
  return base;
}

export function hiddenBaseItems(guildId: string): CatalogItem[] {
  const ov = overridesOf(guildId);
  return SHOP.filter((i) => ov.get(i.id)?.hidden).map((i) => {
    const o = ov.get(i.id);
    return {
      id: i.id,
      name: i.name,
      price: o?.price ?? i.price,
      desc: i.desc,
      type: i.id === "corona" ? "cosmetic" : "item",
      roleId: null,
      unique: i.id === "corona",
      custom: false,
    };
  });
}

export function setItemPrice(guildId: string, itemId: string, price: number): CatalogItem | null {
  const item = findItem(guildId, itemId) ?? catalog(guildId, { includeHidden: true }).find((i) => i.id === itemId);
  if (!item) return null;
  const p = Math.max(1, Math.floor(price));
  if (item.custom) {
    getDb().prepare("UPDATE shop_items SET price = ? WHERE guild_id = ? AND item_id = ?").run(p, guildId, item.id);
  } else {
    getDb()
      .prepare(
        `INSERT INTO shop_overrides (guild_id, item_id, price, hidden) VALUES (?, ?, ?, 0)
         ON CONFLICT(guild_id, item_id) DO UPDATE SET price = excluded.price`,
      )
      .run(guildId, item.id, p);
  }
  return { ...item, price: p };
}

export function hideOrDeleteItem(guildId: string, itemId: string): { ok: boolean; name: string; kind: "base" | "custom" } | null {
  const item = findItem(guildId, itemId) ?? catalog(guildId, { includeHidden: true }).find((i) => i.id === itemId);
  if (!item) return null;
  if (item.custom) {
    deleteCustomItem(guildId, item.id);
    return { ok: true, name: item.name, kind: "custom" };
  }
  getDb()
    .prepare(
      `INSERT INTO shop_overrides (guild_id, item_id, price, hidden) VALUES (?, ?, NULL, 1)
       ON CONFLICT(guild_id, item_id) DO UPDATE SET hidden = 1`,
    )
    .run(guildId, item.id);
  return { ok: true, name: item.name, kind: "base" };
}

export function restoreBaseItem(guildId: string, itemId: string): CatalogItem | null {
  const base = SHOP.find((s) => s.id === itemId || s.name.toLowerCase() === itemId.toLowerCase());
  if (!base) return null;
  const ov = overridesOf(guildId).get(base.id);
  if (!ov?.hidden) return null;
  getDb().prepare("UPDATE shop_overrides SET hidden = 0 WHERE guild_id = ? AND item_id = ?").run(guildId, base.id);
  return findItem(guildId, base.id) ?? null;
}

export function findItem(guildId: string, id: string): CatalogItem | undefined {
  return catalog(guildId).find((i) => i.id === id || i.name.toLowerCase() === id.toLowerCase());
}

export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return s || `item-${Date.now().toString(36)}`;
}

export function createCustomItem(opts: {
  guildId: string;
  name: string;
  price: number;
  desc: string;
  roleId?: string | null;
  unique?: boolean;
  createdBy: string;
}): CatalogItem {
  let id = slugify(opts.name);
  const exists = getDb()
    .prepare("SELECT 1 FROM shop_items WHERE guild_id = ? AND item_id = ?")
    .get(opts.guildId, id);
  if (exists || SHOP.some((s) => s.id === id)) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
  const type = opts.roleId ? "role" : "item";
  const unique = opts.unique ?? Boolean(opts.roleId);
  getDb()
    .prepare(
      `INSERT INTO shop_items (guild_id, item_id, name, price, description, type, role_id, unique_own, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opts.guildId,
      id,
      opts.name.slice(0, 80),
      Math.max(1, Math.floor(opts.price)),
      opts.desc.slice(0, 200),
      type,
      opts.roleId ?? null,
      unique ? 1 : 0,
      opts.createdBy,
      Date.now(),
    );
  return findItem(opts.guildId, id)!;
}

export function deleteCustomItem(guildId: string, itemId: string): boolean {
  const info = getDb().prepare("DELETE FROM shop_items WHERE guild_id = ? AND item_id = ?").run(guildId, itemId);
  return info.changes > 0;
}

export function todayDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

export async function buyCatalogItem(
  member: GuildMember,
  itemId: string,
  qty: number,
): Promise<{ ok: boolean; title: string; detail: string }> {
  const item = findItem(member.guild.id, itemId);
  if (!item) return { ok: false, title: "No existe", detail: "Ese artículo no está en la tienda." };
  const amount = item.type === "role" || item.unique ? 1 : Math.max(1, qty);
  const eco = getEco(member.guild.id, member.id);
  const cost = item.price * amount;
  const total = totalFunds(eco);
  if (total < cost) {
    return {
      ok: false,
      title: "Sin fondos",
      detail: `Cuesta ${n(cost)}. Tienes ${n(total)} (Cartera: ${n(eco.wallet)} | Banco: ${n(eco.bank)}).`,
    };
  }
  if (item.unique && hasItem(eco, item.id)) {
    return { ok: false, title: "Ya lo tienes", detail: `**${item.name}** es de un solo uso / único.` };
  }
  if (item.type === "role" && item.roleId && member.roles.cache.has(item.roleId)) {
    return { ok: false, title: "Ya tienes el rol", detail: `Ya llevas <@&${item.roleId}>.` };
  }

  // Comprobar límites de candados y VPNs (máx 10 al día, máx 50 en inventario), excepto usuario inmune
  const isSecurityItem = item.id === "candado" || item.id === "vpn";
  const isExempt = member.id === "600041740124160011";

  if (isSecurityItem && !isExempt) {
    const inv = invOf(eco);
    const currentHolding = inv[item.id] ?? 0;
    if (currentHolding >= 50) {
      return {
        ok: false,
        title: "Límite de posesión alcanzado",
        detail: `Ya tienes **${currentHolding} ${item.name}** en tu inventario. El límite máximo de posesión es de **50 unidades**.`,
      };
    }
    if (currentHolding + amount > 50) {
      const maxCanHold = 50 - currentHolding;
      return {
        ok: false,
        title: "Límite de posesión excedido",
        detail: `No puedes tener más de **50 ${item.name}**. Tienes **${currentHolding}**, por lo que solo puedes adquirir hasta **${maxCanHold}** unidades más.`,
      };
    }

    const dateKey = todayDateKey();
    const purchasedRow = getDb()
      .prepare(
        "SELECT amount FROM item_daily_purchases WHERE guild_id = ? AND user_id = ? AND item_id = ? AND date_key = ?",
      )
      .get(member.guild.id, member.id, item.id, dateKey) as { amount: number } | undefined;
    const purchasedToday = purchasedRow?.amount ?? 0;

    if (purchasedToday >= 10) {
      return {
        ok: false,
        title: "Límite diario alcanzado",
        detail: `Has alcanzado el límite de compra de **10 ${item.name} al día**. Vuelve mañana para adquirir más.`,
      };
    }
    if (purchasedToday + amount > 10) {
      const maxCanBuyToday = 10 - purchasedToday;
      return {
        ok: false,
        title: "Límite diario excedido",
        detail: `Solo puedes comprar hasta **${maxCanBuyToday} ${item.name}** más hoy (límite: 10 al día, ya has comprado ${purchasedToday}).`,
      };
    }
  }

  if (item.type === "role" && item.roleId) {
    const role = member.guild.roles.cache.get(item.roleId);
    if (!role) return { ok: false, title: "Rol desaparecido", detail: "Un admin debe volver a vincular el rol." };
    const me = member.guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles) || role.position >= me.roles.highest.position) {
      return {
        ok: false,
        title: "No puedo dar el rol",
        detail: "El rol del bot tiene que estar **por encima** del rol de la tienda.",
      };
    }
    const deductRes = deductFundsDetailed(eco, cost);
    giveItem(eco, item.id, 1);
    saveEco(eco);
    try {
      await member.roles.add(role, `Tienda Nexo · ${item.name}`);
    } catch (err) {
      refundFunds(eco, deductRes);
      const inv = JSON.parse(eco.inventory || "{}") as Inv;
      delete inv[item.id];
      eco.inventory = JSON.stringify(inv);
      saveEco(eco);
      return { ok: false, title: "Error al dar el rol", detail: (err as Error).message };
    }
    return {
      ok: true,
      title: "Compra",
      detail: `Has desbloqueado **${item.name}** y el rol ${role}.\n${n(cost)} · Saldo restante: Cartera ${n(eco.wallet)} | Banco ${n(eco.bank)}`,
    };
  }

  deductFundsDetailed(eco, cost);
  if (item.id === "cafe") {
    eco.jailed_until = 0;
    saveEco(eco);
    return {
      ok: true,
      title: "Café",
      detail: `El guardia te ha dejado salir. ${n(cost)} · Saldo restante: Cartera ${n(eco.wallet)} | Banco ${n(eco.bank)}`,
    };
  }
  giveItem(eco, item.id, amount);
  saveEco(eco);

  if (isSecurityItem && !isExempt) {
    const dateKey = todayDateKey();
    getDb()
      .prepare(
        `INSERT INTO item_daily_purchases (guild_id, user_id, item_id, date_key, amount, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(guild_id, user_id, item_id, date_key) DO UPDATE SET
           amount = amount + excluded.amount,
           updated_at = excluded.updated_at`,
      )
      .run(member.guild.id, member.id, item.id, dateKey, amount, Date.now());
  }

  return {
    ok: true,
    title: "Compra",
    detail: `**${amount}× ${item.name}**\n${n(cost)} · Saldo restante: Cartera ${n(eco.wallet)} | Banco ${n(eco.bank)}`,
  };
}

export function autocompleteShop(guildId: string, query: string, mode: "all" | "custom" | "hidden" = "all") {
  const q = query.toLowerCase();
  const list = mode === "hidden" ? hiddenBaseItems(guildId) : catalog(guildId);
  return list
    .filter((i) => (mode === "custom" ? i.custom : true))
    .filter((i) => !q || i.name.toLowerCase().includes(q) || i.id.includes(q))
    .slice(0, 25)
    .map((i) => ({
      name: `${i.name} — ${i.price.toLocaleString("es-ES")} nexocoin`.slice(0, 100),
      value: i.id,
    }));
}

export const SHOP_CATEGORIES = [
  { id: "todas", label: "Catálogo Completo", emoji: "🛒", desc: "Todos los artículos disponibles en Nexo" },
  { id: "herramienta", label: "Herramientas & Seguridad", emoji: "🔧", desc: "Candados, VPNs y utilidades de protección" },
  { id: "consumible", label: "Consumibles & Pociones", emoji: "🧪", desc: "Amuletos, ganzúas, cafés y potenciadores" },
  { id: "pesca", label: "Equipo de Pesca", emoji: "🎣", desc: "Cañas, cebos dorados y redes marinas" },
  { id: "caza", label: "Equipo de Caza", emoji: "🏹", desc: "Rifles, miras, camuflajes y trampas" },
  { id: "coleccion", label: "Joyería & Coleccionables", emoji: "💎", desc: "Gemas preciosas, reliquias arcanas y mitología" },
  { id: "cosmetico", label: "Cosméticos & Roles", emoji: "👑", desc: "Coronas y roles exclusivos de servidor" },
];

export function renderShopView(
  guildId: string,
  selectedCat = "todas",
): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<StringSelectMenuBuilder>;
} {
  const items = catalog(guildId);
  const catDef = SHOP_CATEGORIES.find((c) => c.id === selectedCat) ?? SHOP_CATEGORIES[0]!;

  let filtered = items;
  if (selectedCat !== "todas") {
    filtered = items.filter((item) => {
      const def = getItemDef(item.id);
      if (selectedCat === "cosmetico") {
        return item.type === "role" || item.type === "cosmetic" || def?.category === "cosmetico";
      }
      return def?.category === selectedCat;
    });
  }

  const lines = filtered.map((it) => {
    const tag = it.type === "role" && it.roleId ? ` · rol <@&${it.roleId}>` : it.custom ? " · *custom*" : "";
    return `• **${it.name}** — ${n(it.price)}${tag}\n> *${it.desc}*`;
  });

  const desc =
    lines.length > 0
      ? lines.join("\n\n").slice(0, 4000)
      : "No hay artículos disponibles en esta categoría actualmente.";

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`${catDef.emoji} Tienda Oficial Nexo — ${catDef.label}`)
    .setDescription(desc)
    .setFooter({
      text: "Selecciona una categoría en el menú · Compra con /tienda-comprar <item> o /eco-comprar",
    });

  const select = new StringSelectMenuBuilder()
    .setCustomId("shop:category")
    .setPlaceholder("Filtrar por sección...")
    .addOptions(
      SHOP_CATEGORIES.map((cat) => ({
        label: cat.label,
        value: cat.id,
        emoji: cat.emoji,
        description: cat.desc,
        default: cat.id === selectedCat,
      })),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  return { embed, row };
}

export interface ItemSellInfo {
  id: string;
  name: string;
  emoji: string;
  sellPrice: number;
  category: string;
}

export function getItemSellInfo(guildId: string, itemId: string): ItemSellInfo {
  const def = getItemDef(itemId);
  if (def) {
    let cat = def.category;
    if (
      def.collectionId === "col_pesca" ||
      itemId.startsWith("pez_") ||
      itemId === "objeto_bota" ||
      itemId === "objeto_perla" ||
      itemId === "objeto_cofre_mar"
    ) {
      cat = "pesca";
    } else if (def.collectionId === "col_caza" || itemId.startsWith("presa_")) {
      cat = "caza";
    }
    return {
      id: def.id,
      name: def.name,
      emoji: def.emoji,
      sellPrice: def.sellPrice,
      category: cat,
    };
  }
  const custom = getDb()
    .prepare("SELECT name, price FROM shop_items WHERE guild_id = ? AND item_id = ?")
    .get(guildId, itemId) as { name: string; price: number } | undefined;
  if (custom) {
    return {
      id: itemId,
      name: custom.name,
      emoji: "🏷️",
      sellPrice: Math.max(50, Math.floor(custom.price * 0.5)),
      category: "custom",
    };
  }
  return {
    id: itemId,
    name: itemId,
    emoji: "📦",
    sellPrice: 50,
    category: "general",
  };
}

export function getSellAutocomplete(
  guildId: string,
  inv: Record<string, number>,
  query: string,
): { name: string; value: string }[] {
  const q = query.trim().toLowerCase();
  const entries = Object.entries(inv).filter(([, count]) => count > 0);
  if (!entries.length) return [];

  let fishCount = 0;
  let fishCoins = 0;
  let huntCount = 0;
  let huntCoins = 0;

  const itemOptions: { name: string; value: string }[] = [];

  for (const [id, count] of entries) {
    const info = getItemSellInfo(guildId, id);
    const gain = info.sellPrice * count;

    if (info.category === "pesca") {
      fishCount += count;
      fishCoins += gain;
    } else if (info.category === "caza") {
      huntCount += count;
      huntCoins += gain;
    }

    const catTag =
      info.category === "pesca"
        ? "[Pesca]"
        : info.category === "caza"
          ? "[Caza]"
          : info.category === "coleccion"
            ? "[Colección]"
            : info.category === "herramienta"
              ? "[Herramienta]"
              : info.category === "consumible"
                ? "[Consumible]"
                : "[Objeto]";

    itemOptions.push({
      name: `${catTag} ${info.emoji} ${info.name} (tienes ×${count}) — vende a ${info.sellPrice.toLocaleString("es-ES")} 🪙 c/u`.slice(0, 100),
      value: id,
    });
  }

  const bulkOptions: { name: string; value: string }[] = [];

  if (fishCount > 0) {
    bulkOptions.push({
      name: `🐟 Vender TODAS las capturas de pesca (${fishCount} piezas · +${fishCoins.toLocaleString("es-ES")} 🪙)`.slice(0, 100),
      value: "todo_pesca",
    });
  }

  if (huntCount > 0) {
    bulkOptions.push({
      name: `🏹 Vender TODAS las presas de caza (${huntCount} piezas · +${huntCoins.toLocaleString("es-ES")} 🪙)`.slice(0, 100),
      value: "todo_caza",
    });
  }

  if (fishCount > 0 && huntCount > 0) {
    bulkOptions.push({
      name: `🎣 Vender TODO (Pesca + Caza) (${fishCount + huntCount} piezas · +${(fishCoins + huntCoins).toLocaleString("es-ES")} 🪙)`.slice(0, 100),
      value: "todo_capturas",
    });
  }

  const all = [...bulkOptions, ...itemOptions];
  if (!q) return all.slice(0, 25);
  return all.filter((o) => o.name.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)).slice(0, 25);
}

export interface SellResult {
  ok: boolean;
  title: string;
  detail: string;
  totalGain: number;
  wallet: number;
}

export function executeSell(eco: EcoRow, guildId: string, itemId: string, qtyOption: number): SellResult {
  const inv = invOf(eco);

  if (itemId === "todo_pesca" || itemId === "todo_caza" || itemId === "todo_capturas") {
    const isPesca = itemId === "todo_pesca" || itemId === "todo_capturas";
    const isCaza = itemId === "todo_caza" || itemId === "todo_capturas";

    let totalSold = 0;
    let totalCoins = 0;
    const soldBreakdown: string[] = [];

    for (const [id, count] of Object.entries(inv)) {
      if (count <= 0) continue;
      const info = getItemSellInfo(guildId, id);
      const matchPesca = isPesca && info.category === "pesca";
      const matchCaza = isCaza && info.category === "caza";

      if (matchPesca || matchCaza) {
        for (let i = 0; i < count; i++) {
          takeItem(eco, id);
        }
        const gain = info.sellPrice * count;
        totalCoins += gain;
        totalSold += count;
        soldBreakdown.push(`• ${info.emoji} **${info.name}** ×${count} → +${gain.toLocaleString("es-ES")} 🪙`);
      }
    }

    if (totalSold === 0) {
      const typeLabel = itemId === "todo_pesca" ? "de pesca" : itemId === "todo_caza" ? "de caza" : "de pesca ni de caza";
      return {
        ok: false,
        title: "Sin capturas que vender",
        detail: `No tienes capturas ${typeLabel} en tu inventario.`,
        totalGain: 0,
        wallet: eco.wallet,
      };
    }

    addWallet(eco, totalCoins);
    saveEco(eco);

    const title =
      itemId === "todo_pesca"
        ? "🐟 Venta de Capturas de Pesca"
        : itemId === "todo_caza"
          ? "🏹 Venta de Presas de Caza"
          : "📦 Venta de Capturas y Presas";
    const detail =
      `Has vendido un total de **${totalSold}** piezas por **${totalCoins.toLocaleString("es-ES")} 🪙**.\n\n` +
      soldBreakdown.slice(0, 10).join("\n") +
      (soldBreakdown.length > 10 ? `\n*...y ${soldBreakdown.length - 10} artículos más.*` : "");

    return {
      ok: true,
      title,
      detail,
      totalGain: totalCoins,
      wallet: eco.wallet,
    };
  }

  // Objeto específico
  const owned = inv[itemId] ?? 0;
  if (owned <= 0) {
    return {
      ok: false,
      title: "No lo tienes",
      detail: "No posees este artículo en tu inventario.",
      totalGain: 0,
      wallet: eco.wallet,
    };
  }

  const qty = qtyOption === -1 ? owned : Math.min(owned, Math.max(1, qtyOption));
  const info = getItemSellInfo(guildId, itemId);
  const totalGain = info.sellPrice * qty;

  for (let i = 0; i < qty; i++) {
    takeItem(eco, itemId);
  }
  addWallet(eco, totalGain);
  saveEco(eco);

  return {
    ok: true,
    title: "Venta realizada",
    detail: `Has vendido **${qty}× ${info.emoji} ${info.name}** por **${totalGain.toLocaleString("es-ES")} 🪙**.`,
    totalGain,
    wallet: eco.wallet,
  };
}

