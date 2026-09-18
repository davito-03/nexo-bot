import { getDb } from "../../database/index.js";
import { getEco, deductFundsDetailed, addWallet, saveEco } from "./engine.js";
import type { ButtonInteraction } from "discord.js";
import { errorEmbed, successEmbed, infoEmbed, ecoEmbed } from "../../utils/embeds.js";

export interface CardDef {
  id: string;
  name: string;
  emoji: string;
  rarity: 'comun' | 'poco_comun' | 'raro' | 'epico' | 'legendario' | 'mitico';
  theme: string;
  description: string;
  value: number; // recycle value in coins
}

export const PACK_TYPES = [
  { id: 'basico', name: '📦 Sobre Básico', price: 1500, cards: 3, guarantees: { minRarity: 'poco_comun', count: 1 } },
  { id: 'premium', name: '🎁 Sobre Premium', price: 5000, cards: 5, guarantees: { minRarity: 'raro', count: 1 } },
  { id: 'legendario', name: '💎 Sobre Legendario', price: 15000, cards: 5, guarantees: { minRarity: 'epico', count: 1 } },
  { id: 'mitico', name: '👑 Sobre Mítico', price: 50000, cards: 7, guarantees: { minRarity: 'legendario', count: 1 } },
];

export const RARITY_INFO = {
  comun: { emoji: '⚪', value: 50, chance: 50, weight: 50 },
  poco_comun: { emoji: '🟢', value: 150, chance: 25, weight: 25 },
  raro: { emoji: '🔵', value: 400, chance: 14, weight: 14 },
  epico: { emoji: '🟣', value: 1000, chance: 7, weight: 7 },
  legendario: { emoji: '🟡', value: 3000, chance: 3, weight: 3 },
  mitico: { emoji: '🔴', value: 8000, chance: 1, weight: 1 }
};

const CARDS: CardDef[] = [
  // Nexo
  { id: 'nexo_1', name: 'Neko Novato', emoji: '🐱', rarity: 'comun', theme: 'nexo', description: 'Un gatito recién llegado a la comunidad.', value: 50 },
  { id: 'nexo_2', name: 'Gatito Curioso', emoji: '🐈', rarity: 'comun', theme: 'nexo', description: 'Siempre fisgando por los canales.', value: 50 },
  { id: 'nexo_3', name: 'Nexo Chat', emoji: '💬', rarity: 'poco_comun', theme: 'nexo', description: 'El alma de las conversaciones.', value: 150 },
  { id: 'nexo_4', name: 'Neko Jugador', emoji: '🎮', rarity: 'poco_comun', theme: 'nexo', description: 'Gatito adicto a los minijuegos.', value: 150 },
  { id: 'nexo_5', name: 'Nexo Helper', emoji: '🤝', rarity: 'raro', theme: 'nexo', description: 'Siempre dispuesto a ayudar.', value: 400 },
  { id: 'nexo_6', name: 'Gatito Cósmico', emoji: '🌌', rarity: 'raro', theme: 'nexo', description: 'Viene de las estrellas de Nexo.', value: 400 },
  { id: 'nexo_7', name: 'Nexo Creador', emoji: '🎨', rarity: 'epico', theme: 'nexo', description: 'Diseña y crea contenido increíble.', value: 1000 },
  { id: 'nexo_8', name: 'Neko Mágico', emoji: '✨', rarity: 'epico', theme: 'nexo', description: 'Otorga buena suerte en los pulls.', value: 1000 },
  { id: 'nexo_9', name: 'Nexo Admin', emoji: '🔨', rarity: 'legendario', theme: 'nexo', description: 'Controla el flujo de la comunidad.', value: 3000 },
  { id: 'nexo_10', name: 'El Gran Nexo', emoji: '👑', rarity: 'mitico', theme: 'nexo', description: 'La esencia pura del servidor.', value: 8000 },

  // Anime
  { id: 'ani_1', name: 'Espadachín Negro', emoji: '⚔️', rarity: 'comun', theme: 'anime', description: 'Un guerrero solitario.', value: 50 },
  { id: 'ani_2', name: 'Ninja de la Hoja', emoji: '🥷', rarity: 'comun', theme: 'anime', description: 'Sueña con ser el líder de su aldea.', value: 50 },
  { id: 'ani_3', name: 'Pirata de Goma', emoji: '☠️', rarity: 'poco_comun', theme: 'anime', description: 'Busca el tesoro más grande.', value: 150 },
  { id: 'ani_4', name: 'Cazador de Demonios', emoji: '👹', rarity: 'poco_comun', theme: 'anime', description: 'Usa técnicas de respiración.', value: 150 },
  { id: 'ani_5', name: 'Alquimista de Acero', emoji: '⚕️', rarity: 'raro', theme: 'anime', description: 'Perdió un brazo buscando la verdad.', value: 400 },
  { id: 'ani_6', name: 'Saiyan Legendario', emoji: '💥', rarity: 'raro', theme: 'anime', description: 'Su poder de pelea es inmenso.', value: 400 },
  { id: 'ani_7', name: 'Titán Colosal', emoji: '🥩', rarity: 'epico', theme: 'anime', description: 'Destruye murallas de una patada.', value: 1000 },
  { id: 'ani_8', name: 'Stand del Tiempo', emoji: '⏳', rarity: 'epico', theme: 'anime', description: 'Puede detener el tiempo unos segundos.', value: 1000 },
  { id: 'ani_9', name: 'Chica Mágica', emoji: '🌟', rarity: 'legendario', theme: 'anime', description: 'Salva el mundo con esperanza.', value: 3000 },
  { id: 'ani_10', name: 'El Calvo con Capa', emoji: '👊', rarity: 'mitico', theme: 'anime', description: 'Derrota a todos de un golpe.', value: 8000 },

  // Mitologia
  { id: 'mit_1', name: 'Sátiro', emoji: '🐐', rarity: 'comun', theme: 'mitologia', description: 'Toca la flauta en los bosques.', value: 50 },
  { id: 'mit_2', name: 'Centauro', emoji: '🏹', rarity: 'comun', theme: 'mitologia', description: 'Arquero veloz de las llanuras.', value: 50 },
  { id: 'mit_3', name: 'Minotauro', emoji: '🐂', rarity: 'poco_comun', theme: 'mitologia', description: 'Guardián del laberinto.', value: 150 },
  { id: 'mit_4', name: 'Medusa', emoji: '🐍', rarity: 'poco_comun', theme: 'mitologia', description: 'Petrifica con su mirada.', value: 150 },
  { id: 'mit_5', name: 'Valquiria', emoji: '🕊️', rarity: 'raro', theme: 'mitologia', description: 'Lleva a los caídos al Valhalla.', value: 400 },
  { id: 'mit_6', name: 'Anubis', emoji: '⚖️', rarity: 'raro', theme: 'mitologia', description: 'Dios de los muertos en Egipto.', value: 400 },
  { id: 'mit_7', name: 'Thor', emoji: '🔨', rarity: 'epico', theme: 'mitologia', description: 'Dios del trueno y el relámpago.', value: 1000 },
  { id: 'mit_8', name: 'Atenea', emoji: '🦉', rarity: 'epico', theme: 'mitologia', description: 'Diosa de la sabiduría y la guerra justa.', value: 1000 },
  { id: 'mit_9', name: 'Odín', emoji: '👁️', rarity: 'legendario', theme: 'mitologia', description: 'El padre de todos.', value: 3000 },
  { id: 'mit_10', name: 'Zeus', emoji: '⚡', rarity: 'mitico', theme: 'mitologia', description: 'Rey de los dioses del Olimpo.', value: 8000 },

  // Gaming
  { id: 'gam_1', name: 'Goomba', emoji: '🍄', rarity: 'comun', theme: 'gaming', description: 'El primer enemigo de todos.', value: 50 },
  { id: 'gam_2', name: 'Creeper', emoji: '🟩', rarity: 'comun', theme: 'gaming', description: 'Explota si te acercas.', value: 50 },
  { id: 'gam_3', name: 'Plomero Saltarín', emoji: '🛠️', rarity: 'poco_comun', theme: 'gaming', description: 'Rescata princesas constantemente.', value: 150 },
  { id: 'gam_4', name: 'Erizo Veloz', emoji: '🦔', rarity: 'poco_comun', theme: 'gaming', description: 'Colecciona anillos de oro.', value: 150 },
  { id: 'gam_5', name: 'Cazatesoros', emoji: '🧭', rarity: 'raro', theme: 'gaming', description: 'Explora tumbas antiguas.', value: 400 },
  { id: 'gam_6', name: 'Cazador de Monstruos', emoji: '🗡️', rarity: 'raro', theme: 'gaming', description: 'Forja armaduras con escamas gigantes.', value: 400 },
  { id: 'gam_7', name: 'Héroe del Tiempo', emoji: '🛡️', rarity: 'epico', theme: 'gaming', description: 'Porta la espada maestra.', value: 1000 },
  { id: 'gam_8', name: 'Jefe Maestro', emoji: '🦾', rarity: 'epico', theme: 'gaming', description: 'Super soldado de élite.', value: 1000 },
  { id: 'gam_9', name: 'Dios de la Guerra', emoji: '🪓', rarity: 'legendario', theme: 'gaming', description: 'Exiliado, vengativo y letal.', value: 3000 },
  { id: 'gam_10', name: 'La Entidad', emoji: '🕸️', rarity: 'mitico', theme: 'gaming', description: 'Controla el universo del juego.', value: 8000 },

  // Cosmos
  { id: 'cos_1', name: 'Meteorito', emoji: '☄️', rarity: 'comun', theme: 'cosmos', description: 'Roca volando por el espacio.', value: 50 },
  { id: 'cos_2', name: 'Satélite', emoji: '🛰️', rarity: 'comun', theme: 'cosmos', description: 'Orbita la tierra silenciosamente.', value: 50 },
  { id: 'cos_3', name: 'Luna', emoji: '🌕', rarity: 'poco_comun', theme: 'cosmos', description: 'Nuestro satélite natural.', value: 150 },
  { id: 'cos_4', name: 'Planeta Rojo', emoji: '🔴', rarity: 'poco_comun', theme: 'cosmos', description: 'Próximo destino de la humanidad.', value: 150 },
  { id: 'cos_5', name: 'Estrella Fugaz', emoji: '🌠', rarity: 'raro', theme: 'cosmos', description: 'Pide un deseo rápido.', value: 400 },
  { id: 'cos_6', name: 'Gigante Gaseoso', emoji: '🪐', rarity: 'raro', theme: 'cosmos', description: 'Tiene anillos impresionantes.', value: 400 },
  { id: 'cos_7', name: 'Supernova', emoji: '💥', rarity: 'epico', theme: 'cosmos', description: 'La explosión más brillante.', value: 1000 },
  { id: 'cos_8', name: 'Pulsar', emoji: '📡', rarity: 'epico', theme: 'cosmos', description: 'Estrella de neutrones rotando.', value: 1000 },
  { id: 'cos_9', name: 'Agujero Negro', emoji: '🕳️', rarity: 'legendario', theme: 'cosmos', description: 'Nada escapa a su gravedad.', value: 3000 },
  { id: 'cos_10', name: 'El Multiverso', emoji: '🌌', rarity: 'mitico', theme: 'cosmos', description: 'Todas las realidades posibles.', value: 8000 },

  // Dragones
  { id: 'dra_1', name: 'Cría de Dragón', emoji: '🦎', rarity: 'comun', theme: 'dragones', description: 'Aún no sabe escupir fuego.', value: 50 },
  { id: 'dra_2', name: 'Dragón de Tierra', emoji: '🪨', rarity: 'comun', theme: 'dragones', description: 'Fuerte pero no puede volar.', value: 50 },
  { id: 'dra_3', name: 'Dragón de Agua', emoji: '💧', rarity: 'poco_comun', theme: 'dragones', description: 'Nada en las profundidades del océano.', value: 150 },
  { id: 'dra_4', name: 'Dragón de Viento', emoji: '🌪️', rarity: 'poco_comun', theme: 'dragones', description: 'Vuela más rápido que un huracán.', value: 150 },
  { id: 'dra_5', name: 'Dragón de Fuego', emoji: '🔥', rarity: 'raro', theme: 'dragones', description: 'Clásico dragón escupefuego.', value: 400 },
  { id: 'dra_6', name: 'Dragón de Hielo', emoji: '❄️', rarity: 'raro', theme: 'dragones', description: 'Congela a sus enemigos al instante.', value: 400 },
  { id: 'dra_7', name: 'Dragón de Tormenta', emoji: '🌩️', rarity: 'epico', theme: 'dragones', description: 'Atrae los rayos con sus alas.', value: 1000 },
  { id: 'dra_8', name: 'Dragón de Sombras', emoji: '🌑', rarity: 'epico', theme: 'dragones', description: 'Se oculta en la oscuridad pura.', value: 1000 },
  { id: 'dra_9', name: 'Dragón Celestial', emoji: '🌟', rarity: 'legendario', theme: 'dragones', description: 'Brilla como una constelación.', value: 3000 },
  { id: 'dra_10', name: 'Dragón Primordial', emoji: '🐉', rarity: 'mitico', theme: 'dragones', description: 'El primero de su especie.', value: 8000 },

  // Criaturas
  { id: 'cri_1', name: 'Slime', emoji: '💧', rarity: 'comun', theme: 'criaturas', description: 'Gelatina viviente inofensiva.', value: 50 },
  { id: 'cri_2', name: 'Duende', emoji: '🧝‍♂️', rarity: 'comun', theme: 'criaturas', description: 'Travieso y roba objetos brillantes.', value: 50 },
  { id: 'cri_3', name: 'Trol de Cueva', emoji: '🧌', rarity: 'poco_comun', theme: 'criaturas', description: 'Grande, lento y muy fuerte.', value: 150 },
  { id: 'cri_4', name: 'Hada del Bosque', emoji: '🧚', rarity: 'poco_comun', theme: 'criaturas', description: 'Otorga pequeñas bendiciones mágicas.', value: 150 },
  { id: 'cri_5', name: 'Unicornio', emoji: '🦄', rarity: 'raro', theme: 'criaturas', description: 'Caballo puro y mágico.', value: 400 },
  { id: 'cri_6', name: 'Gárgola', emoji: '🦇', rarity: 'raro', theme: 'criaturas', description: 'Piedra de día, monstruo de noche.', value: 400 },
  { id: 'cri_7', name: 'Fénix', emoji: '🦅', rarity: 'epico', theme: 'criaturas', description: 'Renace de sus propias cenizas.', value: 1000 },
  { id: 'cri_8', name: 'Quimera', emoji: '🦁', rarity: 'epico', theme: 'criaturas', description: 'Mezcla aterradora de bestias.', value: 1000 },
  { id: 'cri_9', name: 'Kraken', emoji: '🦑', rarity: 'legendario', theme: 'criaturas', description: 'Hunde navíos enteros.', value: 3000 },
  { id: 'cri_10', name: 'Leviatán', emoji: '🐋', rarity: 'mitico', theme: 'criaturas', description: 'La bestia más grande del abismo.', value: 8000 },

  // Leyendas
  { id: 'ley_1', name: 'Escudero', emoji: '🛡️', rarity: 'comun', theme: 'leyendas', description: 'Aprendiz con grandes sueños.', value: 50 },
  { id: 'ley_2', name: 'Bardo', emoji: '🪕', rarity: 'comun', theme: 'leyendas', description: 'Canta historias de batallas pasadas.', value: 50 },
  { id: 'ley_3', name: 'Caballero Errante', emoji: '🏇', rarity: 'poco_comun', theme: 'leyendas', description: 'Busca un propósito noble.', value: 150 },
  { id: 'ley_4', name: 'Arquero Silvano', emoji: '🏹', rarity: 'poco_comun', theme: 'leyendas', description: 'Nunca falla un tiro.', value: 150 },
  { id: 'ley_5', name: 'Mago Ermitaño', emoji: '🧙‍♂️', rarity: 'raro', theme: 'leyendas', description: 'Conoce secretos antiguos.', value: 400 },
  { id: 'ley_6', name: 'Paladín', emoji: '⚔️', rarity: 'raro', theme: 'leyendas', description: 'Defensor de la luz y la justicia.', value: 400 },
  { id: 'ley_7', name: 'Señor Oscuro', emoji: '🧛‍♂️', rarity: 'epico', theme: 'leyendas', description: 'Controla hordas de no-muertos.', value: 1000 },
  { id: 'ley_8', name: 'Rey Olvidado', emoji: '👑', rarity: 'epico', theme: 'leyendas', description: 'Gobernó en la primera era.', value: 1000 },
  { id: 'ley_9', name: 'Héroe Legendario', emoji: '🌟', rarity: 'legendario', theme: 'leyendas', description: 'Su nombre inspira valor a todos.', value: 3000 },
  { id: 'ley_10', name: 'El Elegido', emoji: '✨', rarity: 'mitico', theme: 'leyendas', description: 'Aquel destinado a traer equilibrio.', value: 8000 }
];

export function getAllCards(): CardDef[] {
  return CARDS;
}

export function getCardDef(id: string): CardDef | undefined {
  return CARDS.find(c => c.id === id);
}

export function getCardsByTheme(theme: string): CardDef[] {
  return CARDS.filter(c => c.theme === theme);
}

export function getCardsByRarity(rarity: string): CardDef[] {
  return CARDS.filter(c => c.rarity === rarity);
}

export function getUserCards(guildId: string, userId: string): { card: CardDef; quantity: number }[] {
  const db = getDb();
  const rows = db.prepare(`SELECT card_id, quantity FROM user_cards WHERE guild_id = ? AND user_id = ?`).all(guildId, userId) as {card_id: string, quantity: number}[];
  
  return rows.map(r => ({
    card: getCardDef(r.card_id)!,
    quantity: r.quantity
  })).filter(c => c.card !== undefined);
}

export function getUserCardCount(guildId: string, userId: string): { unique: number; total: number; maxUnique: number } {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(card_id) as unique_c, SUM(quantity) as total_c FROM user_cards WHERE guild_id = ? AND user_id = ?`).get(guildId, userId) as {unique_c: number, total_c: number};
  return {
    unique: row.unique_c || 0,
    total: row.total_c || 0,
    maxUnique: CARDS.length
  };
}

function getRandomRarity(minRarity?: string): string {
  const rarities = ['comun', 'poco_comun', 'raro', 'epico', 'legendario', 'mitico'];
  
  // Weights array based on minimum rarity
  let validRarities = rarities;
  if (minRarity) {
    const minIndex = rarities.indexOf(minRarity);
    if (minIndex !== -1) {
      validRarities = rarities.slice(minIndex);
    }
  }

  let totalWeight = 0;
  const weights = validRarities.map(r => {
    const w = RARITY_INFO[r as keyof typeof RARITY_INFO].weight;
    totalWeight += w;
    return { r, w };
  });

  let roll = Math.random() * totalWeight;
  for (const { r, w } of weights) {
    roll -= w;
    if (roll <= 0) return r;
  }
  return validRarities[validRarities.length - 1];
}

export function openPack(guildId: string, userId: string, packId: string): { ok: boolean; error?: string; cards?: CardDef[]; newCards?: string[]; cost?: number } {
  const pack = PACK_TYPES.find(p => p.id === packId);
  if (!pack) return { ok: false, error: "Sobre no válido." };

  const eco = getEco(guildId, userId);
  const cost = pack.price;

  const res = deductFundsDetailed(eco, cost);
  if (!res.success) {
    return { ok: false, error: "No tienes suficientes fondos para comprar este sobre." };
  }
  saveEco(eco);

  // Generate cards
  const pulledCards: CardDef[] = [];
  const minRarity = pack.guarantees?.minRarity;
  const guaranteeCount = pack.guarantees?.count || 0;

  for (let i = 0; i < pack.cards; i++) {
    const isGuaranteed = i < guaranteeCount;
    const rarity = getRandomRarity(isGuaranteed ? minRarity : undefined);
    const possibleCards = getCardsByRarity(rarity);
    const chosen = possibleCards[Math.floor(Math.random() * possibleCards.length)];
    pulledCards.push(chosen);
  }

  const db = getDb();
  const currentCards = getUserCards(guildId, userId);
  const currentCardIds = new Set(currentCards.map(c => c.card.id));
  const newCards: string[] = [];

  for (const c of pulledCards) {
    if (!currentCardIds.has(c.id)) {
      newCards.push(c.id);
      currentCardIds.add(c.id);
    }
    const has = db.prepare(`SELECT quantity FROM user_cards WHERE guild_id = ? AND user_id = ? AND card_id = ?`).get(guildId, userId, c.id) as {quantity: number}|undefined;
    if (has) {
      db.prepare(`UPDATE user_cards SET quantity = quantity + 1 WHERE guild_id = ? AND user_id = ? AND card_id = ?`).run(guildId, userId, c.id);
    } else {
      db.prepare(`INSERT INTO user_cards (guild_id, user_id, card_id, quantity, obtained_at) VALUES (?, ?, ?, 1, ?)`).run(guildId, userId, c.id, Date.now());
    }
  }

  return { ok: true, cards: pulledCards, newCards, cost };
}

export function recycleCards(guildId: string, userId: string, cardId: string, quantity: number): { ok: boolean; coinsGained?: number; error?: string } {
  if (quantity < 1) return { ok: false, error: "Cantidad no válida." };
  const card = getCardDef(cardId);
  if (!card) return { ok: false, error: "Carta no encontrada." };

  const db = getDb();
  const row = db.prepare(`SELECT quantity FROM user_cards WHERE guild_id = ? AND user_id = ? AND card_id = ?`).get(guildId, userId, cardId) as {quantity: number}|undefined;
  
  if (!row || row.quantity < quantity) {
    return { ok: false, error: "No tienes suficientes copias de esta carta para reciclar." };
  }

  if (row.quantity === quantity) {
    db.prepare(`DELETE FROM user_cards WHERE guild_id = ? AND user_id = ? AND card_id = ?`).run(guildId, userId, cardId);
  } else {
    db.prepare(`UPDATE user_cards SET quantity = quantity - ? WHERE guild_id = ? AND user_id = ? AND card_id = ?`).run(quantity, guildId, userId, cardId);
  }

  const coinsGained = card.value * quantity;
  const eco = getEco(guildId, userId);
  addWallet(eco, coinsGained, { stats: false });
  saveEco(eco);

  return { ok: true, coinsGained };
}

export function getDuplicates(guildId: string, userId: string): { card: CardDef; quantity: number }[] {
  const db = getDb();
  const rows = db.prepare(`SELECT card_id, quantity FROM user_cards WHERE guild_id = ? AND user_id = ? AND quantity > 1`).all(guildId, userId) as {card_id: string, quantity: number}[];
  
  return rows.map(r => ({
    card: getCardDef(r.card_id)!,
    quantity: r.quantity
  })).filter(c => c.card !== undefined);
}

export function getCollectionProgress(guildId: string, userId: string): { theme: string; owned: number; total: number; percentage: number }[] {
  const userCards = getUserCards(guildId, userId);
  const themes = [...new Set(CARDS.map(c => c.theme))];
  
  return themes.map(theme => {
    const themeCards = CARDS.filter(c => c.theme === theme);
    const ownedInTheme = userCards.filter(uc => uc.card.theme === theme);
    return {
      theme,
      owned: ownedInTheme.length,
      total: themeCards.length,
      percentage: Math.round((ownedInTheme.length / themeCards.length) * 100)
    };
  });
}

export async function handleCardTradeButton(interaction: ButtonInteraction): Promise<void> {
  const [_, action, tradeIdStr] = interaction.customId.split(":");
  const tradeId = parseInt(tradeIdStr);
  const db = getDb();

  const trade = db.prepare(`SELECT * FROM card_trades WHERE id = ?`).get(tradeId) as any;
  if (!trade) {
    await interaction.reply({ content: "Este intercambio ya no existe o fue completado.", ephemeral: true });
    return;
  }

  if (trade.status !== 'pending') {
    await interaction.reply({ content: `Este intercambio ya está ${trade.status}.`, ephemeral: true });
    return;
  }

  if (Date.now() > trade.expires_at) {
    db.prepare(`UPDATE card_trades SET status = 'expired' WHERE id = ?`).run(tradeId);
    await interaction.update({ embeds: [errorEmbed("Intercambio Expirado", "El tiempo para aceptar este intercambio ha terminado.")], components: [] });
    return;
  }

  if (interaction.user.id !== trade.receiver_id && interaction.user.id !== trade.sender_id) {
    await interaction.reply({ content: "No eres parte de este intercambio.", ephemeral: true });
    return;
  }

  if (action === 'accept') {
    if (interaction.user.id !== trade.receiver_id) {
      await interaction.reply({ content: "Solo el receptor puede aceptar el intercambio.", ephemeral: true });
      return;
    }

    const offeredObj = JSON.parse(trade.offered_cards);
    const requestedObj = JSON.parse(trade.requested_cards);

    // Verify both have the cards
    let ok = true;
    for (const [cardId, qty] of Object.entries(offeredObj)) {
       const row = db.prepare(`SELECT quantity FROM user_cards WHERE guild_id = ? AND user_id = ? AND card_id = ?`).get(trade.guild_id, trade.sender_id, cardId) as any;
       if (!row || row.quantity < (qty as number)) {
         ok = false;
         break;
       }
    }
    if (ok) {
      for (const [cardId, qty] of Object.entries(requestedObj)) {
         const row = db.prepare(`SELECT quantity FROM user_cards WHERE guild_id = ? AND user_id = ? AND card_id = ?`).get(trade.guild_id, trade.receiver_id, cardId) as any;
         if (!row || row.quantity < (qty as number)) {
           ok = false;
           break;
         }
      }
    }

    if (!ok) {
      db.prepare(`UPDATE card_trades SET status = 'failed' WHERE id = ?`).run(tradeId);
      await interaction.update({ embeds: [errorEmbed("Intercambio Fallido", "Una de las partes ya no tiene las cartas requeridas para el intercambio.")], components: [] });
      return;
    }

    // Process trade
    const tx = db.transaction(() => {
      // Remove from sender, give to receiver
      for (const [cardId, qty] of Object.entries(offeredObj)) {
         db.prepare(`UPDATE user_cards SET quantity = quantity - ? WHERE guild_id = ? AND user_id = ? AND card_id = ?`).run(qty, trade.guild_id, trade.sender_id, cardId);
         const has = db.prepare(`SELECT quantity FROM user_cards WHERE guild_id = ? AND user_id = ? AND card_id = ?`).get(trade.guild_id, trade.receiver_id, cardId);
         if (has) {
           db.prepare(`UPDATE user_cards SET quantity = quantity + ? WHERE guild_id = ? AND user_id = ? AND card_id = ?`).run(qty, trade.guild_id, trade.receiver_id, cardId);
         } else {
           db.prepare(`INSERT INTO user_cards (guild_id, user_id, card_id, quantity, obtained_at) VALUES (?, ?, ?, ?, ?)`).run(trade.guild_id, trade.receiver_id, cardId, qty, Date.now());
         }
      }
      // Remove from receiver, give to sender
      for (const [cardId, qty] of Object.entries(requestedObj)) {
         db.prepare(`UPDATE user_cards SET quantity = quantity - ? WHERE guild_id = ? AND user_id = ? AND card_id = ?`).run(qty, trade.guild_id, trade.receiver_id, cardId);
         const has = db.prepare(`SELECT quantity FROM user_cards WHERE guild_id = ? AND user_id = ? AND card_id = ?`).get(trade.guild_id, trade.sender_id, cardId);
         if (has) {
           db.prepare(`UPDATE user_cards SET quantity = quantity + ? WHERE guild_id = ? AND user_id = ? AND card_id = ?`).run(qty, trade.guild_id, trade.sender_id, cardId);
         } else {
           db.prepare(`INSERT INTO user_cards (guild_id, user_id, card_id, quantity, obtained_at) VALUES (?, ?, ?, ?, ?)`).run(trade.guild_id, trade.sender_id, cardId, qty, Date.now());
         }
      }
      
      db.prepare(`UPDATE card_trades SET status = 'accepted' WHERE id = ?`).run(tradeId);
      
      // cleanup zero quantities
      db.prepare(`DELETE FROM user_cards WHERE quantity <= 0`).run();
    });

    tx();
    await interaction.update({ embeds: [successEmbed("Intercambio Completado", "El intercambio de cartas se ha realizado con éxito.")], components: [] });
  } else if (action === 'reject') {
    db.prepare(`UPDATE card_trades SET status = 'rejected' WHERE id = ?`).run(tradeId);
    await interaction.update({ embeds: [infoEmbed("Intercambio Rechazado", "El intercambio fue rechazado o cancelado.")], components: [] });
  }
}
