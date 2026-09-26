import crypto from "node:crypto";
import { getDb } from "../../database/index.js";
import { getEco, saveEco, addWallet, n } from "./engine.js";

export type RelicRarity = "Rara" | "Épica" | "Mítica" | "Legendaria" | "Trascendente";

export interface HeistRelicDef {
  id: string;
  targetId: string;
  name: string;
  emoji: string;
  rarity: RelicRarity;
  pawnValue: number;
  description: string;
}

export const HEIST_RELICS: Record<string, HeistRelicDef> = {
  // Banco Central (banco)
  banco_bono_1929: {
    id: "banco_bono_1929",
    targetId: "banco",
    name: "Bono al Portador de 1929",
    emoji: "📜",
    rarity: "Rara",
    pawnValue: 120_000,
    description: "Certificado de deuda histórica sellado con tinta de oro por la tesorería estatal de entreguerras.",
  },
  banco_placa_oro: {
    id: "banco_placa_oro",
    targetId: "banco",
    name: "Placa de Oro de la Reserva Federal",
    emoji: "🏛️",
    rarity: "Épica",
    pawnValue: 200_000,
    description: "Lingote laminado con el escudo del banco central que autentifica las reservas federales.",
  },
  banco_llave_titanio: {
    id: "banco_llave_titanio",
    targetId: "banco",
    name: "Llave Maestra de Titanio de la Bóveda",
    emoji: "🗝️",
    rarity: "Mítica",
    pawnValue: 450_000,
    description: "Copia única forjada en titanio militar que abre los cerrojos de las tres esclusas principales.",
  },

  // Gran Casino (casino)
  casino_mazo_dorado: {
    id: "casino_mazo_dorado",
    targetId: "casino",
    name: "Mazo Dorado del Tahúr Legendario",
    emoji: "🃏",
    rarity: "Rara",
    pawnValue: 150_000,
    description: "Baraja con bordes bañados en pan de oro utilizada en la partida clandestina de 1982.",
  },
  casino_ficha_platino: {
    id: "casino_ficha_platino",
    targetId: "casino",
    name: "Ficha de Platino de 1.000.000 de Créditos",
    emoji: "🪙",
    rarity: "Épica",
    pawnValue: 350_000,
    description: "Ficha pesada de platino con holograma cuántico intransferible de la sala VIP Diamante.",
  },
  casino_diamante_azul: {
    id: "casino_diamante_azul",
    targetId: "casino",
    name: "El Diamante Azul de la Ruleta Real",
    emoji: "💎",
    rarity: "Mítica",
    pawnValue: 600_000,
    description: "Gema incrustada originariamente en el rotor de la ruleta presidencial del casino.",
  },

  // Mansión del Magnate (mansion)
  mansion_reloj_patek: {
    id: "mansion_reloj_patek",
    targetId: "mansion",
    name: "Reloj de Bolsillo Patek de Oro Puro",
    emoji: "⌚",
    rarity: "Rara",
    pawnValue: 180_000,
    description: "Pieza de orfebrería suiza de cuerda manual con sonería de minutos grabada a mano.",
  },
  mansion_oleo_siglo_xvii: {
    id: "mansion_oleo_siglo_xvii",
    targetId: "mansion",
    name: "Óleo sobre Lienzo del Siglo XVII",
    emoji: "🖼️",
    rarity: "Épica",
    pawnValue: 400_000,
    description: "Obra maestra barroca sustraída discretamente del salón de baile privado del magnate.",
  },
  mansion_anillo_rubi: {
    id: "mansion_anillo_rubi",
    targetId: "mansion",
    name: "Anillo de Rubí de la Dinastía Petrolera",
    emoji: "💍",
    rarity: "Mítica",
    pawnValue: 750_000,
    description: "Sortija familiar de rubí sangre de paloma heredada durante cinco generaciones de petroleros.",
  },

  // Museo Imperial (museo)
  museo_daga_obsidiana: {
    id: "museo_daga_obsidiana",
    targetId: "museo",
    name: "Daga Ceremonial de Obsidiana Imperial",
    emoji: "🗡️",
    rarity: "Épica",
    pawnValue: 500_000,
    description: "Arma ritual de filo volcánico utilizada por la guardia pretoriana de dinastías antiguas.",
  },
  museo_codice_alejandria: {
    id: "museo_codice_alejandria",
    targetId: "museo",
    name: "Códice Oculto de Alejandría",
    emoji: "📜",
    rarity: "Mítica",
    pawnValue: 850_000,
    description: "Manuscrito en papiro con fórmulas secretas de metalurgia que sobrevivieron al gran incendio.",
  },
  museo_sarcofago_dorado: {
    id: "museo_sarcofago_dorado",
    targetId: "museo",
    name: "Sarcófago Dorado del Faraón Negro",
    emoji: "👑",
    rarity: "Legendaria",
    pawnValue: 1_200_000,
    description: "Máscara funeraria maciza de oro e incrustaciones de lapislázuli valorada en una fortuna incalculable.",
  },

  // Tren Blindado (tren_blindado)
  tren_brujula_titanio: {
    id: "tren_brujula_titanio",
    targetId: "tren_blindado",
    name: "Brújula Náutica de Titanio Acorazado",
    emoji: "🧭",
    rarity: "Rara",
    pawnValue: 160_000,
    description: "Instrumento de navegación giroscópica de alta resistencia de la locomotora principal.",
  },
  tren_lingote_zar: {
    id: "tren_lingote_zar",
    targetId: "tren_blindado",
    name: "Lingote de Oro del Zar Ferroviario",
    emoji: "🚂",
    rarity: "Épica",
    pawnValue: 450_000,
    description: "Lingote macizo de 12 kilogramos con el cuño imperial del ferrocarril transcontinental.",
  },
  tren_maletin_deuda: {
    id: "tren_maletin_deuda",
    targetId: "tren_blindado",
    name: "Maletín con Títulos de Deuda Transcontinental",
    emoji: "💼",
    rarity: "Mítica",
    pawnValue: 900_000,
    description: "Maletín ignífugo con pagarés y certificados de infraestructura internacional sin registrar.",
  },

  // Sede Nexo Corp (empresa)
  empresa_patente_secreta: {
    id: "empresa_patente_secreta",
    targetId: "empresa",
    name: "Patente Secreta de Cero Emisiones",
    emoji: "📄",
    rarity: "Épica",
    pawnValue: 550_000,
    description: "Documentos de diseño industrial de reactores de plasma frío robados del departamento de I+D.",
  },
  empresa_chip_cuantico: {
    id: "empresa_chip_cuantico",
    targetId: "empresa",
    name: "Microchip Cuántico Experimental de Fusión",
    emoji: "🔬",
    rarity: "Mítica",
    pawnValue: 950_000,
    description: "Procesador superconductor a temperatura ambiente capaz de desencriptar cualquier algoritmo.",
  },
  empresa_disco_ia: {
    id: "empresa_disco_ia",
    targetId: "empresa",
    name: "Disco Duro Cifrado con la IA Primigenia",
    emoji: "💾",
    rarity: "Legendaria",
    pawnValue: 1_500_000,
    description: "Unidad sellada al vacío que alberga el código fuente original del núcleo inteligente de Nexo Corp.",
  },

  // Submarino Nuclear Leviathan (submarino)
  submarino_casco_titanio: {
    id: "submarino_casco_titanio",
    targetId: "submarino",
    name: "Fragmento de Casco de Titanio Abisal",
    emoji: "⚓",
    rarity: "Rara",
    pawnValue: 250_000,
    description: "Sección de blindaje aleado capaz de resistir la presión destructiva de fosas oceánicas.",
  },
  submarino_codigos_alfa: {
    id: "submarino_codigos_alfa",
    targetId: "submarino",
    name: "Manual de Códigos Nucleares Alfa",
    emoji: "📖",
    rarity: "Mítica",
    pawnValue: 1_100_000,
    description: "Libro de claves operativas sellado con cera militar para la autorización de misiles balísticos.",
  },
  submarino_giroscopio_nuclear: {
    id: "submarino_giroscopio_nuclear",
    targetId: "submarino",
    name: "Giroscopio Naval de Fusión Atómica",
    emoji: "☢️",
    rarity: "Legendaria",
    pawnValue: 1_800_000,
    description: "Pieza central del reactor silencioso del Leviathan que permite maniobras invisibles en el fondo marino.",
  },

  // Estación Orbital Quantum (estacion_espacial)
  estacion_nucleo_fotonico: {
    id: "estacion_nucleo_fotonico",
    targetId: "estacion_espacial",
    name: "Núcleo Fotónico de Gravedad Cero",
    emoji: "🛰️",
    rarity: "Épica",
    pawnValue: 700_000,
    description: "Emisor de láser pulsado sincronizado con satélites geoestacionarios para transmisiones instantáneas.",
  },
  estacion_materia_oscura: {
    id: "estacion_materia_oscura",
    targetId: "estacion_espacial",
    name: "Cristal de Materia Oscura Interestelar",
    emoji: "🔮",
    rarity: "Mítica",
    pawnValue: 1_400_000,
    description: "Mineral exótico recolectado en los confines del sistema solar que desafía las leyes de la física.",
  },
  estacion_frasco_antimateria: {
    id: "estacion_frasco_antimateria",
    targetId: "estacion_espacial",
    name: "Frasco de Antimateria Estabilizada",
    emoji: "🌌",
    rarity: "Legendaria",
    pawnValue: 2_500_000,
    description: "Cápsula de confinamiento magnético con microgramos de positrones puros de valor colosal.",
  },

  // Fortaleza Inexpugnable de Davito (davito)
  davito_sello_absoluto: {
    id: "davito_sello_absoluto",
    targetId: "davito",
    name: "El Sello Absoluto del Conquistador del Inframundo",
    emoji: "⚜️",
    rarity: "Trascendente",
    pawnValue: 15_000_000,
    description: "Insignia milenaria que representa el dominio y respeto indiscutible sobre todas las bandas del servidor.",
  },
  davito_monolito_sagrado: {
    id: "davito_monolito_sagrado",
    targetId: "davito",
    name: "El Monolito Sagrado de 100M de Nexocoins",
    emoji: "🗿",
    rarity: "Trascendente",
    pawnValue: 20_000_000,
    description: "Efigie tallada en obsidiana cósmica que emana la energía de cien millones de monedas acuñadas.",
  },
  davito_corona_cosmica: {
    id: "davito_corona_cosmica",
    targetId: "davito",
    name: "La Corona Cósmica de la Mente Maestra Davito",
    emoji: "👑",
    rarity: "Trascendente",
    pawnValue: 25_000_000,
    description: "La reliquia suprema del universo Nexo. Solo los elegidos que conquistaron lo imposible pueden portarla.",
  },
};

export interface UserRelicRecord {
  id: string;
  guildId: string;
  userId: string;
  relicId: string;
  targetId: string;
  obtainedAt: number;
  isDisplayed: number;
  def?: HeistRelicDef;
}

/**
 * Tira probabilidad de obtener una reliquia tras una victoria en un asalto.
 * Base: 18% para asaltos estándar, 100% garantizado si logran conquistar la Fortaleza de Davito.
 */
export function rollRelicDrop(targetId: string): HeistRelicDef | null {
  const targetRelics = Object.values(HEIST_RELICS).filter((r) => r.targetId === targetId);
  if (targetRelics.length === 0) return null;

  if (targetId === "davito") {
    // Victoria ante Davito siempre otorga una de sus reliquias trascendentes
    const idx = Math.floor(Math.random() * targetRelics.length);
    return targetRelics[idx];
  }

  // Probabilidad base de reliquia: 18%
  const roll = Math.random() * 100;
  if (roll > 18) return null;

  // Si toca, seleccionar con pesos según rareza
  // Rara (55%), Épica (30%), Mítica (12%), Legendaria (3%)
  const r = Math.random() * 100;
  let targetRarity: RelicRarity = "Rara";
  if (r < 3) targetRarity = "Legendaria";
  else if (r < 15) targetRarity = "Mítica";
  else if (r < 45) targetRarity = "Épica";
  else targetRarity = "Rara";

  const matching = targetRelics.filter((re) => re.rarity === targetRarity);
  if (matching.length > 0) {
    return matching[Math.floor(Math.random() * matching.length)];
  }

  return targetRelics[Math.floor(Math.random() * targetRelics.length)];
}

/**
 * Guarda una reliquia en la colección del usuario.
 */
export function awardRelicToUser(guildId: string, userId: string, relic: HeistRelicDef): string {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare(`
    INSERT INTO user_heist_relics (id, guild_id, user_id, relic_id, target_id, obtained_at, is_displayed)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(id, guildId, userId, relic.id, relic.targetId, now);
  return id;
}

/**
 * Obtiene todas las reliquias en propiedad de un usuario.
 */
export function getUserRelics(guildId: string, userId: string): UserRelicRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, guild_id AS guildId, user_id AS userId, relic_id AS relicId, target_id AS targetId, obtained_at AS obtainedAt, is_displayed AS isDisplayed
    FROM user_heist_relics
    WHERE guild_id = ? AND user_id = ?
    ORDER BY obtained_at DESC
  `).all(guildId, userId) as UserRelicRecord[];

  return rows.map((r) => ({
    ...r,
    def: HEIST_RELICS[r.relicId],
  }));
}

/**
 * Empeña / vende una reliquia de la vitrina para recibir nexocoins en la billetera.
 */
export function pawnRelic(
  guildId: string,
  userId: string,
  relicRecordIdOrRelicId: string,
): { success: boolean; relic?: HeistRelicDef; payout?: number; error?: string } {
  const db = getDb();
  const query = relicRecordIdOrRelicId.trim();

  // Buscar por ID de registro o por relic_id
  let row = db.prepare(`
    SELECT id, relic_id AS relicId
    FROM user_heist_relics
    WHERE guild_id = ? AND user_id = ? AND id = ?
  `).get(guildId, userId, query) as { id: string; relicId: string } | undefined;

  if (!row) {
    row = db.prepare(`
      SELECT id, relic_id AS relicId
      FROM user_heist_relics
      WHERE guild_id = ? AND user_id = ? AND relic_id = ?
      LIMIT 1
    `).get(guildId, userId, query) as { id: string; relicId: string } | undefined;
  }

  if (!row) {
    return { success: false, error: "No posees esa reliquia en tu vitrina criminal." };
  }

  const relicDef = HEIST_RELICS[row.relicId];
  if (!relicDef) {
    return { success: false, error: "La reliquia especificada no está catalogada." };
  }

  // Eliminar el registro y abonar fondos a la cartera del usuario
  db.prepare("DELETE FROM user_heist_relics WHERE id = ?").run(row.id);
  const eco = getEco(guildId, userId);
  addWallet(eco, relicDef.pawnValue);
  saveEco(eco, `Empeño de reliquia: ${relicDef.name}`);

  return {
    success: true,
    relic: relicDef,
    payout: relicDef.pawnValue,
  };
}
