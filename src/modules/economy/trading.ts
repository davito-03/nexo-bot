import { getDb } from "../../database/index.js";
import { addWallet, deductFunds, getEco, n, saveEco, totalFunds } from "./engine.js";

export interface AssetPriceRow {
  asset_id: string;
  name: string;
  symbol: string;
  type: "cripto" | "metal" | "empresa";
  current_price: number;
  open_24h_price: number;
  high_24h_price: number;
  low_24h_price: number;
  history: string; // JSON array of numbers
  updated_at: number;
}

export interface PortfolioHolding {
  asset: AssetPriceRow;
  amount: number;
  currentValue: number;
  invested: number;
  pnl: number;
  pnlPct: number;
}

export interface MarketEvent {
  title: string;
  description: string;
  sentiment: "positive" | "negative";
  impactPct: number;
  targetLabel: string;
  expiresAt: number;
}

type MarketEventDefinition = Omit<MarketEvent, "expiresAt"> & {
  target: AssetPriceRow["type"] | "all";
};

const MARKET_EVENT_DEFINITIONS: MarketEventDefinition[] = [
  { title: "Adopción institucional cripto", description: "Grandes fondos anuncian nuevas compras de activos digitales.", sentiment: "positive", impactPct: 0.1, target: "cripto", targetLabel: "criptomonedas" },
  { title: "Regulación favorable", description: "Varios países preparan un marco claro para operar con criptomonedas.", sentiment: "positive", impactPct: 0.08, target: "cripto", targetLabel: "criptomonedas" },
  { title: "Fiebre de las memecoins", description: "La comunidad se lanza a comprar activos especulativos y contagia al mercado cripto.", sentiment: "positive", impactPct: 0.07, target: "cripto", targetLabel: "criptomonedas" },
  { title: "Demanda industrial de metales", description: "La fabricación mundial aumenta sus pedidos de materias primas.", sentiment: "positive", impactPct: 0.06, target: "metal", targetLabel: "metales" },
  { title: "Boom tecnológico", description: "Nuevos avances en IA disparan las expectativas del sector tecnológico.", sentiment: "positive", impactPct: 0.07, target: "empresa", targetLabel: "acciones" },
  { title: "Rally de Nexo Corp", description: "La comunidad anuncia una expansión y los inversores se vuelcan con NEXO.", sentiment: "positive", impactPct: 0.14, target: "all", targetLabel: "mercado completo" },
  { title: "Fallo en un gran exchange", description: "Un incidente de seguridad provoca ventas rápidas en los activos digitales.", sentiment: "negative", impactPct: -0.11, target: "cripto", targetLabel: "criptomonedas" },
  { title: "Restricción minera global", description: "Suben los costes energéticos y los mineros liquidan parte de sus reservas.", sentiment: "negative", impactPct: -0.09, target: "cripto", targetLabel: "criptomonedas" },
  { title: "Recesión corporativa", description: "Los analistas rebajan sus previsiones y las empresas sufren una ola de ventas.", sentiment: "negative", impactPct: -0.07, target: "empresa", targetLabel: "acciones" },
  { title: "Crisis de materias primas", description: "La demanda industrial cae y los metales pierden atractivo temporalmente.", sentiment: "negative", impactPct: -0.06, target: "metal", targetLabel: "metales" },
  { title: "Pánico de mercado", description: "Una cadena de rumores hace que los inversores reduzcan posiciones en todos los sectores.", sentiment: "negative", impactPct: -0.08, target: "all", targetLabel: "mercado completo" },
];

let activeMarketEvent: MarketEvent | null = null;
let activeMarketEventTarget: MarketEventDefinition["target"] | null = null;
let activeMarketEventApplied = false;

export function getCurrentMarketEvent(): MarketEvent | null {
  if (!activeMarketEvent || activeMarketEvent.expiresAt <= Date.now()) {
    activeMarketEvent = null;
    activeMarketEventTarget = null;
    activeMarketEventApplied = false;
    return null;
  }
  return activeMarketEvent;
}

function eventAffectsAsset(asset: AssetPriceRow): boolean {
  return activeMarketEventTarget === "all" || activeMarketEventTarget === asset.type;
}

const SPARK_CHARS = [" ", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

export function renderSparkline(history: number[]): string {
  if (!history || history.length < 2) return "——";
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  return history
    .map((val) => {
      const idx = Math.min(SPARK_CHARS.length - 1, Math.max(0, Math.floor(((val - min) / range) * (SPARK_CHARS.length - 1))));
      return SPARK_CHARS[idx];
    })
    .join("");
}

export function getAllAssets(): AssetPriceRow[] {
  return getDb().prepare("SELECT * FROM asset_prices ORDER BY type, asset_id").all() as AssetPriceRow[];
}

export function getAsset(id: string): AssetPriceRow | undefined {
  const clean = id.toLowerCase().trim();
  return getDb()
    .prepare("SELECT * FROM asset_prices WHERE asset_id = ? OR LOWER(symbol) = ?")
    .get(clean, clean) as AssetPriceRow | undefined;
}

/** Simulación estocástica de precios en cada tick del planificador */
export function tickTradingPrices(): void {
  const assets = getAllAssets();
  const now = Date.now();

  let event = getCurrentMarketEvent();
  if (!event && Math.random() < 0.1) {
    const definition = MARKET_EVENT_DEFINITIONS[Math.floor(Math.random() * MARKET_EVENT_DEFINITIONS.length)]!;
    event = { ...definition, expiresAt: now + 10 * 60_000 };
    activeMarketEvent = event;
    activeMarketEventTarget = definition.target;
    activeMarketEventApplied = false;
  }

  for (const a of assets) {
    let vol = 0.015; // default 1.5%
    if (a.type === "cripto") vol = 0.035; // cripto más volátil 3.5%
    if (a.type === "metal") vol = 0.008;  // metales estables 0.8%
    if (a.type === "empresa") vol = 0.02; // acciones 2%

    // Shock de mercado aleatorio con pequeña deriva
    const eventShock = event && !activeMarketEventApplied && eventAffectsAsset(a) ? event.impactPct : 0;
    const changePct = (Math.random() - 0.49) * vol + eventShock;
    let newPrice = Math.max(1, Math.round((a.current_price * (1 + changePct)) * 100) / 100);

    let hist: number[] = [];
    try {
      hist = JSON.parse(a.history || "[]");
    } catch {
      hist = [];
    }
    hist.push(newPrice);
    if (hist.length > 20) hist.shift();

    const high = Math.max(a.high_24h_price, newPrice);
    const low = Math.min(a.low_24h_price, newPrice);

    // Resetear open_24h si pasaron 24h
    let open = a.open_24h_price;
    if (now - a.updated_at > 24 * 3600_000) {
      open = newPrice;
    }

    getDb()
      .prepare(
        `UPDATE asset_prices SET current_price = ?, open_24h_price = ?, high_24h_price = ?, low_24h_price = ?, history = ?, updated_at = ?
         WHERE asset_id = ?`,
      )
      .run(newPrice, open, high, low, JSON.stringify(hist), now, a.asset_id);
  }

  if (event && !activeMarketEventApplied) activeMarketEventApplied = true;
}

export function buyAsset(
  guildId: string,
  userId: string,
  assetId: string,
  opts: { spend?: number; qty?: number },
): { ok: boolean; error?: string; boughtQty?: number; cost?: number; asset?: AssetPriceRow } {
  const asset = getAsset(assetId);
  if (!asset) return { ok: false, error: "Activo no encontrado." };

  const eco = getEco(guildId, userId);
  let qty = 0;
  let cost = 0;

  const available = totalFunds(eco);
  if (opts.spend !== undefined && opts.spend > 0) {
    cost = Math.min(available, Math.floor(opts.spend));
    if (cost < 1) return { ok: false, error: "Cantidad a invertir inválida." };
    qty = cost / asset.current_price;
  } else if (opts.qty !== undefined && opts.qty > 0) {
    qty = opts.qty;
    cost = Math.ceil(qty * asset.current_price);
  } else {
    return { ok: false, error: "Especifica una cantidad válida de activo o nexocoins a invertir." };
  }

  if (!deductFunds(eco, cost)) {
    return { ok: false, error: `Fondos insuficientes. Necesitas ${n(cost)} pero dispones de ${n(available)} (Cartera: ${n(eco.wallet)} | Banco: ${n(eco.bank)}).` };
  }

  saveEco(eco);

  getDb()
    .prepare(
      `INSERT INTO user_portfolio (guild_id, user_id, asset_id, amount, invested)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, user_id, asset_id) DO UPDATE SET
         amount = amount + excluded.amount,
         invested = invested + excluded.invested`,
    )
    .run(guildId, userId, asset.asset_id, qty, cost);

  return { ok: true, boughtQty: qty, cost, asset };
}

export function sellAsset(
  guildId: string,
  userId: string,
  assetId: string,
  qtyToSell: number,
): { ok: boolean; error?: string; soldQty?: number; revenue?: number; pnl?: number; asset?: AssetPriceRow } {
  const asset = getAsset(assetId);
  if (!asset) return { ok: false, error: "Activo no encontrado." };

  const holding = getDb()
    .prepare("SELECT * FROM user_portfolio WHERE guild_id = ? AND user_id = ? AND asset_id = ?")
    .get(guildId, userId, asset.asset_id) as { amount: number; invested: number } | undefined;

  if (!holding || holding.amount <= 0) {
    return { ok: false, error: `No posees acciones o unidades de **${asset.name}**.` };
  }

  const cleanQty = qtyToSell === -1 ? holding.amount : Math.min(holding.amount, qtyToSell);
  if (cleanQty <= 0) return { ok: false, error: "Cantidad a vender inválida." };

  const revenue = Math.floor(cleanQty * asset.current_price);
  const costPortion = holding.invested * (cleanQty / holding.amount);
  const pnl = revenue - costPortion;

  const remaining = holding.amount - cleanQty;
  const remainingInvested = Math.max(0, holding.invested - costPortion);

  if (remaining <= 0.000001) {
    getDb()
      .prepare("DELETE FROM user_portfolio WHERE guild_id = ? AND user_id = ? AND asset_id = ?")
      .run(guildId, userId, asset.asset_id);
  } else {
    getDb()
      .prepare("UPDATE user_portfolio SET amount = ?, invested = ? WHERE guild_id = ? AND user_id = ? AND asset_id = ?")
      .run(remaining, remainingInvested, guildId, userId, asset.asset_id);
  }

  const eco = getEco(guildId, userId);
  addWallet(eco, revenue);
  saveEco(eco);

  return { ok: true, soldQty: cleanQty, revenue, pnl, asset };
}

export function getUserPortfolio(guildId: string, userId: string): {
  holdings: PortfolioHolding[];
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlPct: number;
} {
  const rows = getDb()
    .prepare("SELECT * FROM user_portfolio WHERE guild_id = ? AND user_id = ? AND amount > 0.000001")
    .all(guildId, userId) as { asset_id: string; amount: number; invested: number }[];

  let totalValue = 0;
  let totalInvested = 0;
  const holdings: PortfolioHolding[] = [];

  for (const r of rows) {
    const asset = getAsset(r.asset_id);
    if (!asset) continue;
    const val = r.amount * asset.current_price;
    const pnl = val - r.invested;
    const pnlPct = r.invested > 0 ? (pnl / r.invested) * 100 : 0;
    totalValue += val;
    totalInvested += r.invested;
    holdings.push({
      asset,
      amount: r.amount,
      currentValue: val,
      invested: r.invested,
      pnl,
      pnlPct,
    });
  }

  const totalPnl = totalValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return { holdings, totalValue, totalInvested, totalPnl, totalPnlPct };
}

export function topTradingPortfolios(guildId: string, limit = 10): { userId: string; totalValue: number }[] {
  const users = getDb()
    .prepare("SELECT DISTINCT user_id FROM user_portfolio WHERE guild_id = ?")
    .all(guildId) as { user_id: string }[];

  const list = users.map((u) => {
    const p = getUserPortfolio(guildId, u.user_id);
    return { userId: u.user_id, totalValue: p.totalValue };
  });

  return list.sort((a, b) => b.totalValue - a.totalValue).slice(0, limit);
}
