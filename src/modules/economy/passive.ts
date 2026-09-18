import type { Guild } from "discord.js";
import type { NexoClient } from "../../client.js";
import { COLORS } from "../../constants.js";
import {
  claimFixedDeposit,
  createFixedDeposit,
  getCryptoMiner,
  getDb,
  getUserFixedDeposits,
  hasDividendsDistributedToday,
  recordDividendsLog,
  saveCryptoMiner,
  type CryptoMinerRow,
  type FixedDepositRow,
} from "../../database/index.js";
import { logger } from "../../logger.js";
import { sendLog } from "../logs/dispatch.js";
import { baseEmbed } from "../../utils/embeds.js";
import { addWallet, deductFunds, getEco, n, saveEco, takeItem, totalFunds } from "./engine.js";
import { getAsset } from "./trading.js";
import { TAX_BENEFICIARY_ID, distributeTaxFunds } from "./tax.js";

// ═══════════════════════════════════════════════════════════════════════════
// 1. MINERÍA DE CRIPTOMONEDAS
// ═══════════════════════════════════════════════════════════════════════════

export interface RigTierInfo {
  tier: number;
  name: string;
  emoji: string;
  hashrateDesc: string;
  hourlyRate: number;      // NexoCoins base por hora
  costToUpgrade: number;   // Coste para alcanzar este tier
  description: string;
}

export const RIG_TIERS: Record<number, RigTierInfo> = {
  0: {
    tier: 0,
    name: "Minero CPU Doméstico (Intel Core i5)",
    emoji: "💻",
    hashrateDesc: "4 MH/s",
    hourlyRate: 3,         // ~72 🪙 / día (accesible para todos desde el inicio)
    costToUpgrade: 0,
    description: "Procesamiento básico en tu ordenador personal. Rendimiento modesto pero constante.",
  },
  1: {
    tier: 1,
    name: "Rig GPU Básico (GTX 1660 Super)",
    emoji: "📼",
    hashrateDesc: "30 MH/s",
    hourlyRate: 10,        // ~240 🪙 / día
    costToUpgrade: 1500,
    description: "Equipo dedicado con tarjeta gráfica de gama media. Ideal para adentrarse en la minería.",
  },
  2: {
    tier: 2,
    name: "Granja Dual RTX (RTX 4070 Dual)",
    emoji: "⚡",
    hashrateDesc: "95 MH/s",
    hourlyRate: 32,        // ~768 🪙 / día
    costToUpgrade: 5000,
    description: "Doble tarjeta de última generación optimizada para algoritmos criptográficos pesados.",
  },
  3: {
    tier: 3,
    name: "Minero ASIC NexoAnt (S19 Pro)",
    emoji: "🖥️",
    hashrateDesc: "280 MH/s",
    hourlyRate: 110,       // ~2.640 🪙 / día
    costToUpgrade: 18000,
    description: "Hardware industrial especializado exclusivamente en cálculo de hashes por segundo.",
  },
  4: {
    tier: 4,
    name: "Granja Industrial NexoHash",
    emoji: "🏭",
    hashrateDesc: "900 MH/s",
    hourlyRate: 340,       // ~8.160 🪙 / día
    costToUpgrade: 55000,
    description: "Rack completo en contenedor climatizado con alimentación trifásica ininterrumpida.",
  },
  5: {
    tier: 5,
    name: "Clúster Cuántico NexoCloud",
    emoji: "🔮",
    hashrateDesc: "3.2 GH/s",
    hourlyRate: 950,       // ~22.800 🪙 / día
    costToUpgrade: 160000,
    description: "Supercomputación cuántica experimental con superconductores criogénicos a 0 Kelvin.",
  },
  6: {
    tier: 6,
    name: "Centro de Datos NexoCore",
    emoji: "🧱",
    hashrateDesc: "9 GH/s",
    hourlyRate: 1400,
    costToUpgrade: 350000,
    description: "Primer centro de datos dedicado con refrigeración líquida y nodos redundantes.",
  },
  7: {
    tier: 7,
    name: "Granja GPU Nebula",
    emoji: "🌌",
    hashrateDesc: "25 GH/s",
    hourlyRate: 1900,
    costToUpgrade: 650000,
    description: "Una red de tarjetas gráficas de alto rendimiento coordinadas como una sola máquina.",
  },
  8: {
    tier: 8,
    name: "Matriz ASIC HyperHash",
    emoji: "⚙️",
    hashrateDesc: "70 GH/s",
    hourlyRate: 2500,
    costToUpgrade: 1100000,
    description: "Matriz de ASIC especializados que maximiza cada ciclo de cálculo criptográfico.",
  },
  9: {
    tier: 9,
    name: "Megagranja NexoForge",
    emoji: "🏗️",
    hashrateDesc: "190 GH/s",
    hourlyRate: 3200,
    costToUpgrade: 1800000,
    description: "Complejo industrial automatizado con miles de procesadores trabajando sin pausa.",
  },
  10: {
    tier: 10,
    name: "Supernodo Titan",
    emoji: "🛡️",
    hashrateDesc: "500 GH/s",
    hourlyRate: 4000,
    costToUpgrade: 2800000,
    description: "Supernodo de décima generación blindado contra picos de consumo y fallos de red.",
  },
  11: {
    tier: 11,
    name: "Clúster Aurora Boreal",
    emoji: "🌠",
    hashrateDesc: "1.2 TH/s",
    hourlyRate: 4900,
    costToUpgrade: 4200000,
    description: "Clúster distribuido con refrigeración criogénica y alimentación energética inteligente.",
  },
  12: {
    tier: 12,
    name: "Complejo Orbital Nexo",
    emoji: "🛰️",
    hashrateDesc: "2.8 TH/s",
    hourlyRate: 5900,
    costToUpgrade: 6000000,
    description: "Infraestructura orbital experimental que procesa bloques desde varios puntos del planeta.",
  },
  13: {
    tier: 13,
    name: "Red Cuántica Prisma",
    emoji: "💠",
    hashrateDesc: "6.5 TH/s",
    hourlyRate: 7000,
    costToUpgrade: 8200000,
    description: "Qubits especializados y nodos fotónicos aceleran las operaciones más complejas.",
  },
  14: {
    tier: 14,
    name: "Mina Dimensional Nexo",
    emoji: "🌀",
    hashrateDesc: "14 TH/s",
    hourlyRate: 8200,
    costToUpgrade: 11000000,
    description: "Una mina de datos de escala dimensional que opera en paralelo en múltiples realidades.",
  },
  15: {
    tier: 15,
    name: "Reactor de Hashing Omega",
    emoji: "☢️",
    hashrateDesc: "30 TH/s",
    hourlyRate: 9500,
    costToUpgrade: 14500000,
    description: "Reactor energético de precisión diseñado para mantener un hashrate estable a escala masiva.",
  },
  16: {
    tier: 16,
    name: "Constelación NexoLink",
    emoji: "✨",
    hashrateDesc: "65 TH/s",
    hourlyRate: 11000,
    costToUpgrade: 18500000,
    description: "Constelación de satélites y estaciones terrestres que comparte trabajo en tiempo real.",
  },
  17: {
    tier: 17,
    name: "Nexo Singularity",
    emoji: "🕳️",
    hashrateDesc: "140 TH/s",
    hourlyRate: 12600,
    costToUpgrade: 23500000,
    description: "Motor de cálculo singular capaz de reorganizar sus recursos según la dificultad de la red.",
  },
  18: {
    tier: 18,
    name: "Matriz Multiverso",
    emoji: "🔷",
    hashrateDesc: "300 TH/s",
    hourlyRate: 14400,
    costToUpgrade: 29500000,
    description: "Matriz de procesamiento paralelo que convierte cada nodo disponible en potencia de minado.",
  },
  19: {
    tier: 19,
    name: "Nexo Megamente",
    emoji: "🧠",
    hashrateDesc: "650 TH/s",
    hourlyRate: 16400,
    costToUpgrade: 36500000,
    description: "Inteligencia de coordinación autónoma que optimiza rutas, consumo y rendimiento continuamente.",
  },
  20: {
    tier: 20,
    name: "Omnigranja Nexo Eternity",
    emoji: "♾️",
    hashrateDesc: "1.4 PH/s",
    hourlyRate: 18600,
    costToUpgrade: 45000000,
    description: "Una red masiva de cálculo y energía que domina la potencia computacional a escala global.",
  },
  21: {
    tier: 21,
    name: "Hipercomputador Taquiónico",
    emoji: "⚡",
    hashrateDesc: "3.2 PH/s",
    hourlyRate: 21000,
    costToUpgrade: 55000000,
    description: "Procesa hashes antes de que los bloques sean emitidos utilizando fluctuaciones cuántico-taquiónicas.",
  },
  22: {
    tier: 22,
    name: "Malla Gravitacional NexoPulse",
    emoji: "🪐",
    hashrateDesc: "7.5 PH/s",
    hourlyRate: 23600,
    costToUpgrade: 67000000,
    description: "Canaliza pozos gravitatorios planetarios para alimentar billones de microprocesadores cuánticos.",
  },
  23: {
    tier: 23,
    name: "Enjambre de Dyson Primario",
    emoji: "☀️",
    hashrateDesc: "18 PH/s",
    hourlyRate: 26500,
    costToUpgrade: 81000000,
    description: "Megaestructura orbital que absorbe radiación solar directa para computación pura ininterrumpida.",
  },
  24: {
    tier: 24,
    name: "Esfera de Dyson Nexo Stellar",
    emoji: "🌟",
    hashrateDesc: "42 PH/s",
    hourlyRate: 29700,
    costToUpgrade: 98000000,
    description: "Envoltura estelar completa: la estrella entera es ahora un motor térmico de hashing continuo.",
  },
  25: {
    tier: 25,
    name: "Matriz de Cuásar Galáctico",
    emoji: "☄️",
    hashrateDesc: "100 PH/s",
    hourlyRate: 33200,
    costToUpgrade: 118000000,
    description: "Aprovecha la radiación ultraenergética del disco de acreción de un cuásar primordial.",
  },
  26: {
    tier: 26,
    name: "Horizonte de Sucesos Chronos",
    emoji: "⏳",
    hashrateDesc: "240 PH/s",
    hourlyRate: 37000,
    costToUpgrade: 142000000,
    description: "La dilatación temporal al borde de un agujero negro calcula millones de algoritmos en microsegundos.",
  },
  27: {
    tier: 27,
    name: "Supercúmulo Computacional Virgo",
    emoji: "🌌",
    hashrateDesc: "580 PH/s",
    hourlyRate: 41200,
    costToUpgrade: 170000000,
    description: "Enlaza galaxias enteras mediante filamentos de materia oscura para operar un supernodo cósmico.",
  },
  28: {
    tier: 28,
    name: "Motor de Entropía Negativa",
    emoji: "🌀",
    hashrateDesc: "1.4 EH/s",
    hourlyRate: 45800,
    costToUpgrade: 205000000,
    description: "Invierte localmente la termodinámica para extraer potencia de cálculo sin disipación térmica.",
  },
  29: {
    tier: 29,
    name: "Omnipresencia Multiversal Nexo",
    emoji: "👁️",
    hashrateDesc: "3.5 EH/s",
    hourlyRate: 51000,
    costToUpgrade: 248000000,
    description: "Existe y mina simultáneamente en todos los planos de la realidad y líneas temporales conocidas.",
  },
  30: {
    tier: 30,
    name: "El Núcleo Génesis Absoluto",
    emoji: "👑",
    hashrateDesc: "10 EH/s",
    hourlyRate: 58000,
    costToUpgrade: 300000000,
    description: "La cúspide suprema: la propia estructura del espacio-tiempo transmutada en generación de NexoCoins.",
  },
};

export const MAX_RIG_TIER = 30;
export const MAX_ACCUMULATION_MS = 24 * 3600_000; // 24 horas máximo de buffer sin reclamar
export const OVERCLOCK_COST = 180;                 // 180 🪙 o 1x pasta_termica por 24h
export const OVERCLOCK_DURATION_MS = 24 * 3600_000;

/** Tipo impositivo base de la red eléctrica/minería según el nivel del rig */
export function getBaseMiningTaxRate(tier: number): number {
  if (tier <= 2) return 0.05;  // 5% (Niveles 0, 1, 2)
  if (tier <= 6) return 0.08;  // 8% (Niveles 3 a 6)
  if (tier <= 12) return 0.12; // 12% (Niveles 7 a 12)
  if (tier <= 18) return 0.16; // 16% (Niveles 13 a 18)
  if (tier <= 24) return 0.20; // 20% (Niveles 19 a 24)
  return 0.25;                 // 25% (Niveles 25 a 30)
}

/** Tasa de impuesto de minería efectiva para un usuario */
export function getMiningTaxRate(guildId: string, userId: string, tier: number): number {
  if (userId === TAX_BENEFICIARY_ID) return 0; // Exento de impuestos
  let rate = getBaseMiningTaxRate(tier);

  // Recargo especial del 30% si está activo en la base de datos
  try {
    const surcharge = getDb()
      .prepare("SELECT days_charged, max_days, extra_rate FROM special_tax_surcharges WHERE guild_id = ? AND user_id = ?")
      .get(guildId, userId) as { days_charged: number; max_days: number; extra_rate: number } | undefined;
    if (surcharge && surcharge.days_charged < surcharge.max_days) {
      rate += surcharge.extra_rate;
    }
  } catch {
    /* ignorar si la tabla aún no está inicializada */
  }

  return rate;
}

export const SUPPORTED_MINING_ASSETS = [
  { id: "nexocoin", name: "NexoCoins", symbol: "🪙", description: "Moneda oficial del servidor (directo a cartera)" },
  { id: "btc", name: "Bitcoin", symbol: "BTC", description: "Fracciones depositadas en tu cartera de trading" },
  { id: "eth", name: "Ethereum", symbol: "ETH", description: "Fracciones depositadas en tu cartera de trading" },
  { id: "sol", name: "Solana", symbol: "SOL", description: "Fracciones depositadas en tu cartera de trading" },
  { id: "xrp", name: "XRP", symbol: "XRP", description: "Fracciones depositadas en tu cartera de trading" },
];

export function getOrCreateMiner(guildId: string, userId: string): CryptoMinerRow {
  let miner = getCryptoMiner(guildId, userId);
  if (!miner) {
    miner = {
      guild_id: guildId,
      user_id: userId,
      rig_tier: 0,
      target_asset: "nexocoin",
      last_claim: Date.now(),
      overclock_until: 0,
      total_mined: 0,
      created_at: Date.now(),
    };
    saveCryptoMiner(miner);
  }
  return miner;
}

export function calculatePendingMined(miner: CryptoMinerRow): {
  elapsedMs: number;
  cappedElapsedMs: number;
  hours: number;
  baseHourly: number;
  effectiveHourly: number;
  isOverclocked: boolean;
  overclockRemainingMs: number;
  pendingCoins: number;
  isCapped: boolean;
  progressPct: number;
  tierInfo: RigTierInfo;
  taxRate: number;
  estimatedTax: number;
  netPendingCoins: number;
} {
  const now = Date.now();
  const elapsedMs = Math.max(0, now - miner.last_claim);
  const cappedElapsedMs = Math.min(MAX_ACCUMULATION_MS, elapsedMs);
  const hours = cappedElapsedMs / 3600_000;

  const tierInfo = RIG_TIERS[miner.rig_tier] ?? RIG_TIERS[0]!;
  const isOverclocked = miner.overclock_until > now;
  const overclockRemainingMs = isOverclocked ? miner.overclock_until - now : 0;
  const effectiveHourly = isOverclocked ? Math.floor(tierInfo.hourlyRate * 1.25) : tierInfo.hourlyRate;

  const pendingCoins = Math.max(0, Math.floor(hours * effectiveHourly));
  const isCapped = elapsedMs >= MAX_ACCUMULATION_MS;
  const progressPct = Math.min(100, Math.floor((cappedElapsedMs / MAX_ACCUMULATION_MS) * 100));

  const taxRate = getMiningTaxRate(miner.guild_id, miner.user_id, miner.rig_tier);
  const estimatedTax = Math.floor(pendingCoins * taxRate);
  const netPendingCoins = Math.max(0, pendingCoins - estimatedTax);

  return {
    elapsedMs,
    cappedElapsedMs,
    hours,
    baseHourly: tierInfo.hourlyRate,
    effectiveHourly,
    isOverclocked,
    overclockRemainingMs,
    pendingCoins,
    isCapped,
    progressPct,
    tierInfo,
    taxRate,
    estimatedTax,
    netPendingCoins,
  };
}

export function claimMinerEarnings(
  guildId: string,
  userId: string,
): {
  ok: boolean;
  error?: string;
  coinsClaimed: number;
  grossCoins: number;
  taxPaid: number;
  taxRate: number;
  targetAsset: string;
  cryptoQty?: number;
  miner: CryptoMinerRow;
} {
  const miner = getOrCreateMiner(guildId, userId);
  const calc = calculatePendingMined(miner);

  if (calc.pendingCoins < 1) {
    return {
      ok: false,
      error: "Aún no has generado suficientes dividendos de minado. Espera unos minutos.",
      coinsClaimed: 0,
      grossCoins: 0,
      taxPaid: 0,
      taxRate: calc.taxRate,
      targetAsset: miner.target_asset,
      miner,
    };
  }

  const now = Date.now();
  const grossCoins = calc.pendingCoins;
  const taxRate = calc.taxRate;
  const taxPaid = calc.estimatedTax;
  const netCoins = calc.netPendingCoins;

  let cryptoQty: number | undefined;

  if (miner.target_asset === "nexocoin") {
    const eco = getEco(guildId, userId);
    addWallet(eco, netCoins);
    saveEco(eco);
  } else {
    const asset = getAsset(miner.target_asset);
    if (!asset || asset.current_price <= 0) {
      const eco = getEco(guildId, userId);
      addWallet(eco, netCoins);
      saveEco(eco);
      miner.target_asset = "nexocoin";
    } else {
      cryptoQty = netCoins / asset.current_price;
      getDb()
        .prepare(
          `INSERT INTO user_portfolio (guild_id, user_id, asset_id, amount, invested)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(guild_id, user_id, asset_id) DO UPDATE SET
             amount = amount + excluded.amount,
             invested = invested + excluded.invested`,
        )
        .run(guildId, userId, asset.asset_id, cryptoQty, netCoins);
    }
  }

  // Transferir impuestos recaudados con reparto oficial (30% beneficiario, 50% roles Staff/Owner, 20% más pobres)
  if (taxPaid > 0 && userId !== TAX_BENEFICIARY_ID) {
    distributeTaxFunds(guildId, taxPaid, `Minería (<@${userId}>)`);
  }

  miner.total_mined += netCoins;
  miner.last_claim = now;
  saveCryptoMiner(miner);

  return {
    ok: true,
    coinsClaimed: netCoins,
    grossCoins,
    taxPaid,
    taxRate,
    targetAsset: miner.target_asset,
    cryptoQty,
    miner,
  };
}

export function upgradeMinerRig(
  guildId: string,
  userId: string,
): {
  ok: boolean;
  error?: string;
  newTier?: RigTierInfo;
  cost?: number;
} {
  const miner = getOrCreateMiner(guildId, userId);
  if (miner.rig_tier >= MAX_RIG_TIER) {
    return { ok: false, error: `¡Tu Rig de minería ya está en el nivel máximo! (Nivel ${MAX_RIG_TIER} - ${RIG_TIERS[MAX_RIG_TIER]?.name}).` };
  }

  const nextTierIndex = miner.rig_tier + 1;
  const nextTier = RIG_TIERS[nextTierIndex];
  if (!nextTier) return { ok: false, error: "Nivel no válido." };

  const eco = getEco(guildId, userId);
  const cost = nextTier.costToUpgrade;
  if (!deductFunds(eco, cost)) {
    return {
      ok: false,
      error: `Fondos insuficientes. Mejorar a **${nextTier.name}** cuesta **${n(cost)}** (tienes ${n(totalFunds(eco))} en total).`,
    };
  }

  // Si tiene ganancias pendientes antes de mejorar, cobrarlas automáticamente
  claimMinerEarnings(guildId, userId);
  saveEco(eco);

  miner.rig_tier = nextTierIndex;
  miner.last_claim = Date.now();
  saveCryptoMiner(miner);

  return { ok: true, newTier: nextTier, cost };
}

export function activateOverclock(
  guildId: string,
  userId: string,
): {
  ok: boolean;
  error?: string;
  methodUsed?: "item" | "coins";
  overclockUntil?: number;
} {
  const miner = getOrCreateMiner(guildId, userId);
  const eco = getEco(guildId, userId);
  const now = Date.now();

  let methodUsed: "item" | "coins" = "coins";

  // Intentar usar pasta térmica si la tiene en inventario
  if (takeItem(eco, "pasta_termica")) {
    methodUsed = "item";
    saveEco(eco);
  } else {
    if (!deductFunds(eco, OVERCLOCK_COST)) {
      return {
        ok: false,
        error: `Necesitas **${n(OVERCLOCK_COST)}** (tienes ${n(totalFunds(eco))}) o 1x **Pasta Térmica** para refrigerar y activar el overclock por 24 horas.`,
      };
    }
    saveEco(eco);
  }

  const baseTime = miner.overclock_until > now ? miner.overclock_until : now;
  miner.overclock_until = baseTime + OVERCLOCK_DURATION_MS;
  saveCryptoMiner(miner);

  return { ok: true, methodUsed, overclockUntil: miner.overclock_until };
}

export function setMinerTargetAsset(
  guildId: string,
  userId: string,
  targetAsset: string,
): { ok: boolean; error?: string } {
  const miner = getOrCreateMiner(guildId, userId);
  const valid = SUPPORTED_MINING_ASSETS.find((a) => a.id === targetAsset);
  if (!valid) {
    return { ok: false, error: "Activo de minado no válido. Opciones: `nexocoin`, `btc`, `eth`, `sol`, `xrp`." };
  }

  if (miner.target_asset === targetAsset) {
    return { ok: false, error: `Tu equipo ya está configurado para minar **${valid.name}**.` };
  }

  // Reclamar lo pendiente antes de cambiar de divisa
  claimMinerEarnings(guildId, userId);

  miner.target_asset = targetAsset;
  miner.last_claim = Date.now();
  saveCryptoMiner(miner);

  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. DIVIDENDOS DE ACCIONES (PAGO DIARIO A LAS 12:00 MEDIODÍA)
// ═══════════════════════════════════════════════════════════════════════════

/** Tasas de dividendo diario garantizado por poseer acciones de empresas a las 12:00 */
export const COMPANY_DIVIDEND_RATES: Record<string, { rate: number; name: string; symbol: string }> = {
  nexo: { rate: 0.030, name: "Nexo Corp", symbol: "NEXO" },          // 3.0% diario (empresa insignia oficial del servidor)
  aapl: { rate: 0.018, name: "Apple Inc.", symbol: "AAPL" },          // 1.8% diario
  nvda: { rate: 0.022, name: "NVIDIA Corp.", symbol: "NVDA" },        // 2.2% diario
  tsla: { rate: 0.025, name: "Tesla Inc.", symbol: "TSLA" },          // 2.5% diario
  msft: { rate: 0.019, name: "Microsoft Corp.", symbol: "MSFT" },     // 1.9% diario
  amzn: { rate: 0.017, name: "Amazon.com Inc.", symbol: "AMZN" },     // 1.7% diario
  googl: { rate: 0.016, name: "Alphabet Inc.", symbol: "GOOGL" },     // 1.6% diario
  meta: { rate: 0.020, name: "Meta Platforms Inc.", symbol: "META" }, // 2.0% diario
  dis: { rate: 0.015, name: "The Walt Disney Co.", symbol: "DIS" },   // 1.5% diario
  amd: { rate: 0.020, name: "AMD Inc.", symbol: "AMD" },              // 2.0% diario
  nflx: { rate: 0.016, name: "Netflix Inc.", symbol: "NFLX" },        // 1.6% diario
  orcl: { rate: 0.018, name: "Oracle Corp.", symbol: "ORCL" },        // 1.8% diario
  mcd: { rate: 0.014, name: "McDonald's Corp.", symbol: "MCD" },       // 1.4% diario
};

export function getEstimatedUserDailyDividends(
  guildId: string,
  userId: string,
): {
  totalEstimated: number;
  breakdown: { symbol: string; name: string; amount: number; currentPrice: number; dividend: number; ratePct: number }[];
} {
  const breakdown: { symbol: string; name: string; amount: number; currentPrice: number; dividend: number; ratePct: number }[] = [];
  let totalEstimated = 0;

  const holdings = getDb()
    .prepare("SELECT asset_id, amount FROM user_portfolio WHERE guild_id = ? AND user_id = ? AND amount > 0.0001")
    .all(guildId, userId) as { asset_id: string; amount: number }[];

  for (const h of holdings) {
    const divInfo = COMPANY_DIVIDEND_RATES[h.asset_id];
    if (!divInfo) continue;
    const asset = getAsset(h.asset_id);
    if (!asset || asset.current_price <= 0) continue;

    const value = h.amount * asset.current_price;
    const dividend = Math.floor(value * divInfo.rate);
    totalEstimated += dividend;
    breakdown.push({
      symbol: divInfo.symbol,
      name: divInfo.name,
      amount: h.amount,
      currentPrice: asset.current_price,
      dividend,
      ratePct: divInfo.rate * 100,
    });
  }

  return { totalEstimated, breakdown };
}

/** Ticker ejecutado periódicamente (cada 60s) en el scheduler */
export async function checkAndDistributeDailyDividends(client: NexoClient): Promise<void> {
  const now = new Date();
  // Solo se ejecuta si estamos a las 12:00 (entre las 12:00 y las 12:59)
  if (now.getHours() !== 12) return;

  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  for (const guild of client.guilds.cache.values() as Iterable<Guild>) {
    if (hasDividendsDistributedToday(dateKey, guild.id)) continue;

    try {
      const distributed = distributeDividendsForGuild(guild.id);
      recordDividendsLog(dateKey, guild.id, distributed.totalAmount, distributed.recipientsCount);

      if (distributed.totalAmount > 0 && distributed.recipientsCount > 0) {
        logger.info(
          `Dividendos 12:00 entregados en ${guild.name} (${guild.id}): ${distributed.totalAmount} 🪙 entre ${distributed.recipientsCount} accionistas.`,
        );

        const embed = baseEmbed(COLORS.eco)
          .setTitle("🏛️ Pago Oficial de Dividendos · Nexo Exchange")
          .setDescription(
            `Hoy a las **12:00**, las empresas cotizadas (**Nexo Corp**, **Apple**, **NVIDIA**, **Tesla**, **Microsoft**, etc.) han repartido dividendos diarios a todos sus accionistas registrados.`,
          )
          .addFields(
            { name: "Total Repartido", value: n(distributed.totalAmount), inline: true },
            { name: "Accionistas Beneficiados", value: `👥 **${distributed.recipientsCount}** inversores`, inline: true },
            { name: "Destino", value: "🏦 Ingresado automáticamente en cuentas bancarias", inline: false },
          )
          .setFooter({ text: "Invierte en acciones con /trading comprar para recibir dividendos diarios a las 12:00" });

        await sendLog(guild, "server", embed);
      }
    } catch (err) {
      logger.error(`Error al repartir dividendos en guild ${guild.id}:`, err);
    }
  }
}

function distributeDividendsForGuild(guildId: string): { totalAmount: number; recipientsCount: number } {
  const companyKeys = Object.keys(COMPANY_DIVIDEND_RATES);
  const placeholders = companyKeys.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT user_id, asset_id, amount FROM user_portfolio
       WHERE guild_id = ? AND asset_id IN (${placeholders}) AND amount > 0.0001`,
    )
    .all(guildId, ...companyKeys) as { user_id: string; asset_id: string; amount: number }[];

  if (!rows.length) return { totalAmount: 0, recipientsCount: 0 };

  const userDividends = new Map<string, number>();

  for (const r of rows) {
    const divInfo = COMPANY_DIVIDEND_RATES[r.asset_id];
    if (!divInfo) continue;
    const asset = getAsset(r.asset_id);
    if (!asset || asset.current_price <= 0) continue;

    const payout = Math.floor(r.amount * asset.current_price * divInfo.rate);
    if (payout > 0) {
      userDividends.set(r.user_id, (userDividends.get(r.user_id) ?? 0) + payout);
    }
  }

  let totalAmount = 0;
  for (const [userId, amount] of userDividends) {
    if (amount <= 0) continue;
    const eco = getEco(guildId, userId);
    eco.bank += amount;
    saveEco(eco);
    totalAmount += amount;
  }

  return { totalAmount, recipientsCount: userDividends.size };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. DEPÓSITOS A PLAZO FIJO (STAKING BANCARIO)
// ═══════════════════════════════════════════════════════════════════════════

export interface FixedDepositPlan {
  days: number;
  name: string;
  emoji: string;
  interestRate: number; // Ej. 0.06 = +6%
  minAmount: number;
  description: string;
}

export const FIXED_DEPOSIT_PLANS: Record<number, FixedDepositPlan> = {
  3: {
    days: 3,
    name: "Depósito Bronce (3 Días)",
    emoji: "🥉",
    interestRate: 0.06,   // +6%
    minAmount: 100,
    description: "Rentabilidad rápida del +6% con capital bloqueado durante 72 horas.",
  },
  7: {
    days: 7,
    name: "Depósito Plata (7 Días)",
    emoji: "🥈",
    interestRate: 0.15,   // +15%
    minAmount: 500,
    description: "Excelente rendimiento del +15% tras una semana de maduración.",
  },
  14: {
    days: 14,
    name: "Depósito Oro (14 Días)",
    emoji: "🥇",
    interestRate: 0.35,   // +35%
    minAmount: 1500,
    description: "Alto retorno quincenal del +35% garantizado por el Banco Central de Nexo.",
  },
  30: {
    days: 30,
    name: "Depósito Platino (30 Días)",
    emoji: "💎",
    interestRate: 0.80,   // +80%
    minAmount: 5000,
    description: "Máxima rentabilidad mensual: multiplica tus ahorros con un +80% de beneficio.",
  },
};

export const MAX_ACTIVE_DEPOSITS_PER_USER = 3;
export const MAX_DEPOSIT_AMOUNT_GLOBAL = 10_000_000; // 10 millones límite general
export const NERFED_DEPOSIT_USERS = new Set([
  "1002206873635799050",
  "826814201309036575",
  "1221829496873816064",
]);

export function openFixedDeposit(
  guildId: string,
  userId: string,
  amount: number,
  planDays: number,
): {
  ok: boolean;
  error?: string;
  deposit?: FixedDepositRow;
} {
  const plan = FIXED_DEPOSIT_PLANS[planDays];
  if (!plan) return { ok: false, error: "Plazo no válido. Opciones disponibles: 3, 7, 14 o 30 días." };

  if (amount < plan.minAmount) {
    return { ok: false, error: `La inversión mínima para el **${plan.name}** es de **${n(plan.minAmount)}**.` };
  }

  const isNerfed = NERFED_DEPOSIT_USERS.has(userId);
  const maxAllowed = isNerfed ? 50_000 : MAX_DEPOSIT_AMOUNT_GLOBAL;
  if (amount > maxAllowed) {
    return {
      ok: false,
      error: isNerfed
        ? `Tu cuenta tiene una restricción financiera activa. El depósito máximo permitido es de **${n(maxAllowed)}**.`
        : `El importe máximo por depósito a plazo fijo es de **${n(maxAllowed)}**.`,
    };
  }

  const active = getUserFixedDeposits(guildId, userId, true);
  if (active.length >= MAX_ACTIVE_DEPOSITS_PER_USER) {
    return {
      ok: false,
      error: `Ya tienes el máximo de **${MAX_ACTIVE_DEPOSITS_PER_USER} depósitos a plazo fijo activos**. Espera a que venzan para abrir otro.`,
    };
  }

  const eco = getEco(guildId, userId);
  if (eco.bank < amount) {
    return {
      ok: false,
      error: `No tienes suficientes fondos en el **banco**. Dispones de ${n(eco.bank)}, pero necesitas ${n(amount)}. (Usa \`/eco depositar\` primero si tienes el dinero en cartera).`,
    };
  }

  eco.bank -= amount;
  saveEco(eco);

  // Rendimiento nerfeado al 0.01 (1%) para cuentas restringidas
  const effectiveRate = isNerfed ? 0.01 : plan.interestRate;
  const profit = Math.floor(amount * effectiveRate);
  const rewardAmount = amount + profit;
  const endsAt = Date.now() + plan.days * 24 * 3600_000;

  const id = createFixedDeposit({
    guildId,
    userId,
    amount,
    planDays: plan.days,
    interestRate: effectiveRate,
    rewardAmount,
    endsAt,
  });

  return {
    ok: true,
    deposit: {
      id,
      guild_id: guildId,
      user_id: userId,
      amount,
      plan_days: plan.days,
      interest_rate: plan.interestRate,
      reward_amount: rewardAmount,
      ends_at: endsAt,
      claimed: 0,
      created_at: Date.now(),
    },
  };
}

export function claimMaturedDeposits(
  guildId: string,
  userId: string,
): {
  ok: boolean;
  error?: string;
  totalReceived: number;
  totalProfit: number;
  count: number;
} {
  const active = getUserFixedDeposits(guildId, userId, true);
  const now = Date.now();
  const matured = active.filter((d) => d.ends_at <= now);

  if (!matured.length) {
    return {
      ok: false,
      error: "No tienes ningún depósito a plazo fijo que haya finalizado su periodo todavía.",
      totalReceived: 0,
      totalProfit: 0,
      count: 0,
    };
  }

  let totalReceived = 0;
  let totalInvested = 0;

  for (const dep of matured) {
    claimFixedDeposit(dep.id);
    totalReceived += dep.reward_amount;
    totalInvested += dep.amount;
  }

  const eco = getEco(guildId, userId);
  eco.bank += totalReceived;
  saveEco(eco);

  return {
    ok: true,
    totalReceived,
    totalProfit: totalReceived - totalInvested,
    count: matured.length,
  };
}
