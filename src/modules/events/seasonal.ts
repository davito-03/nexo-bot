import { EmbedBuilder } from "discord.js";
import { COLORS, SERVER_NAME } from "../../constants.js";
import { logger } from "../../logger.js";

export interface SeasonalEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  color: number;
  bonuses: {
    workMultiplier?: number;
    fishMultiplier?: number;
    huntMultiplier?: number;
    casinoMultiplier?: number;
    dailyMultiplier?: number;
    xpMultiplier?: number;
    cardDropBonus?: number;
    propertyIncomeMultiplier?: number;
  };
  specialDrops?: string[];
  footerText: string;
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: "halloween",
    name: "🎃 Noche de Brujas",
    emoji: "🎃",
    description: "Los espíritus rondan Nexo... ¡Aprovecha los bonus tenebrosos!",
    startMonth: 10, startDay: 15,
    endMonth: 11, endDay: 5,
    color: 0xff6600,
    bonuses: {
      casinoMultiplier: 1.5,
      huntMultiplier: 1.3,
      cardDropBonus: 0.15,
    },
    specialDrops: ["carta_calabaza", "carta_fantasma"],
    footerText: "🎃 Evento de Halloween activo · Bonus especiales",
  },
  {
    id: "navidad",
    name: "🎄 Navidad en Nexo",
    emoji: "🎄",
    description: "¡Felices fiestas! El espíritu navideño trae regalos y bonus para todos.",
    startMonth: 12, startDay: 15,
    endMonth: 1, endDay: 5,
    color: 0xc0392b,
    bonuses: {
      dailyMultiplier: 2.0,
      workMultiplier: 1.25,
      xpMultiplier: 1.5,
      propertyIncomeMultiplier: 1.3,
    },
    footerText: "🎄 Evento de Navidad activo · ¡Felices fiestas!",
  },
  {
    id: "verano",
    name: "☀️ Verano Nexo",
    emoji: "☀️",
    description: "El sol brilla sobre Nexo. ¡Pesca con bonus doble y disfruta del buen tiempo!",
    startMonth: 6, startDay: 15,
    endMonth: 9, endDay: 1,
    color: 0xf39c12,
    bonuses: {
      fishMultiplier: 2.0,
      workMultiplier: 1.15,
      cardDropBonus: 0.10,
    },
    footerText: "☀️ Evento de Verano activo · Pesca x2",
  },
  {
    id: "san_valentin",
    name: "💕 San Valentín",
    emoji: "💕",
    description: "El amor está en el aire. ¡Bonus especiales para parejas casadas!",
    startMonth: 2, startDay: 10,
    endMonth: 2, endDay: 18,
    color: 0xff69b4,
    bonuses: {
      dailyMultiplier: 1.5,
      xpMultiplier: 1.25,
    },
    footerText: "💕 San Valentín activo · ¡El amor manda!",
  },
  {
    id: "aniversario",
    name: "🎂 Aniversario de Nexo",
    emoji: "🎂",
    description: "¡Celebramos otro año más de Nexo! Bonus global para toda la comunidad.",
    startMonth: 7, startDay: 10,
    endMonth: 7, endDay: 13,
    color: 0x9b59b6,
    bonuses: {
      workMultiplier: 2.0,
      dailyMultiplier: 2.0,
      fishMultiplier: 1.5,
      huntMultiplier: 1.5,
      casinoMultiplier: 1.25,
      xpMultiplier: 2.0,
      cardDropBonus: 0.20,
      propertyIncomeMultiplier: 1.5,
    },
    footerText: "🎂 ¡Aniversario de Nexo! · Bonus x2 en TODO",
  },
];

function isDateInRange(
  now: Date,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): boolean {
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // Handle ranges that cross year boundary (e.g., Dec 15 - Jan 5)
  if (endMonth < startMonth || (endMonth === startMonth && endDay < startDay)) {
    // Crosses year boundary
    return (
      (month > startMonth || (month === startMonth && day >= startDay)) ||
      (month < endMonth || (month === endMonth && day <= endDay))
    );
  }

  // Normal range within same year
  if (month < startMonth || month > endMonth) return false;
  if (month === startMonth && day < startDay) return false;
  if (month === endMonth && day > endDay) return false;
  return true;
}

/** Returns all currently active seasonal events. */
export function getActiveEvents(): SeasonalEvent[] {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  return SEASONAL_EVENTS.filter((ev) =>
    isDateInRange(now, ev.startMonth, ev.startDay, ev.endMonth, ev.endDay),
  );
}

/** Returns the combined multiplier for a specific bonus type from all active events. */
export function getSeasonalMultiplier(bonusKey: keyof SeasonalEvent["bonuses"]): number {
  const events = getActiveEvents();
  let multiplier = 1.0;
  for (const ev of events) {
    const val = ev.bonuses[bonusKey];
    if (val && val > 1) {
      // Stack multiplicatively for multiple events
      multiplier *= val;
    }
  }
  return multiplier;
}

/** Returns the additional card drop probability bonus from active events. */
export function getSeasonalCardDropBonus(): number {
  const events = getActiveEvents();
  let bonus = 0;
  for (const ev of events) {
    if (ev.bonuses.cardDropBonus) {
      bonus += ev.bonuses.cardDropBonus;
    }
  }
  return bonus;
}

/** Gets a seasonal footer text if any event is active, for use in embeds. */
export function getSeasonalFooter(): string | null {
  const events = getActiveEvents();
  if (events.length === 0) return null;
  return events.map((ev) => ev.footerText).join(" · ");
}

/** Gets a seasonal color override if any event is active. */
export function getSeasonalColor(): number | null {
  const events = getActiveEvents();
  if (events.length === 0) return null;
  return events[0].color;
}

/** Renders an embed showing all currently active seasonal events and their bonuses. */
export function renderActiveEventsEmbed(): EmbedBuilder | null {
  const events = getActiveEvents();
  if (events.length === 0) return null;

  const embed = new EmbedBuilder()
    .setColor(events[0].color)
    .setTitle(`🎪 Eventos Temporales Activos · ${SERVER_NAME}`)
    .setTimestamp()
    .setFooter({ text: `${SERVER_NAME} · Eventos de temporada` });

  let desc = "";
  for (const ev of events) {
    desc += `### ${ev.emoji} ${ev.name}\n`;
    desc += `*${ev.description}*\n\n`;
    desc += `**Bonus activos:**\n`;

    const bonusLabels: Record<string, string> = {
      workMultiplier: "💼 Trabajo",
      fishMultiplier: "🎣 Pesca",
      huntMultiplier: "🏹 Caza",
      casinoMultiplier: "🎰 Casino",
      dailyMultiplier: "📅 Daily",
      xpMultiplier: "⭐ XP",
      cardDropBonus: "🃏 Drop de cartas",
      propertyIncomeMultiplier: "🏠 Ingresos de propiedades",
    };

    for (const [key, label] of Object.entries(bonusLabels)) {
      const val = ev.bonuses[key as keyof typeof ev.bonuses];
      if (val) {
        if (key === "cardDropBonus") {
          desc += `▸ ${label}: **+${Math.round(val * 100)}%** probabilidad extra\n`;
        } else {
          desc += `▸ ${label}: **×${val}**\n`;
        }
      }
    }
    desc += "\n";
  }

  embed.setDescription(desc);
  return embed;
}

logger.info(`[Seasonal] ${getActiveEvents().length} evento(s) temporal(es) activo(s)`);
