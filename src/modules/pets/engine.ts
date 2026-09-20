import { getDb } from "../../database/index.js";
import { getEco, saveEco, addWallet, deductFunds, totalFunds, giveItem, n, rng } from "../economy/engine.js";
import { checkUserAchievements } from "../economy/achievements.js";

export const MAX_PETS_PER_USER = 10;

export interface PetSpecies {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description: string;
  bonus: string;
}

export const PET_SPECIES: Record<string, PetSpecies> = {
  gato: {
    id: "gato",
    name: "Gato Callejero",
    emoji: "🐱",
    price: 10_000,
    description: "Curioso y sigiloso. Se escabulle por los rincones y recolecta monedas abandonadas.",
    bonus: "+10% de probabilidad de traer botines extra de comida y baratijas",
  },
  shiba: {
    id: "shiba",
    name: "Shiba Inu",
    emoji: "🐶",
    price: 25_000,
    description: "Extremadamente leal y alegre. Mantiene su felicidad alta por más tiempo y siempre vuelve con tesoros.",
    bonus: "Mayor resistencia al hambre y +15% de velocidad en ganar experiencia",
  },
  zorro: {
    id: "zorro",
    name: "Zorro Astuto",
    emoji: "🦊",
    price: 50_000,
    description: "Rápido y cazador. Explora zonas boscosas y desentierra cebos de pesca y objetos valiosos.",
    bonus: "Alta probabilidad de encontrar cebos de pesca y amuletos de la suerte",
  },
  buho: {
    id: "buho",
    name: "Búho Místico",
    emoji: "🦉",
    price: 100_000,
    description: "Sabio vigía de la noche. Sobrevuela grandes distancias guiando a su dueño hacia riquezas ocultas.",
    bonus: "+25% de recompensas en expediciones nocturnas y largas de 8h y 24h",
  },
  dragon: {
    id: "dragon",
    name: "Dragón Bebé",
    emoji: "🐉",
    price: 500_000,
    description: "Criatura elemental legendaria. Su aliento ilumina cavernas subterráneas llenas de oro y gemas.",
    bonus: "+50% de botín en todas las expediciones y probabilidad de hallar diamantes puros",
  },
};

export interface UserPet {
  id: number;
  guild_id: string;
  user_id: string;
  pet_type: string;
  name: string;
  level: number;
  exp: number;
  happiness: number;
  last_feed: number;
  last_pet: number;
  on_expedition_until: number;
  expedition_hours: number;
  expedition_reward: string | null;
  created_at: number;
  is_active: number;
}

export function expToNextLevel(level: number): number {
  return level * 50;
}

function updatePetHappiness(pet: UserPet, db = getDb()): void {
  const now = Date.now();
  const lastInteraction = Math.max(pet.last_feed, pet.last_pet, pet.created_at);
  const hoursPassed = (now - lastInteraction) / 3600_000;

  if (hoursPassed >= 4 && pet.happiness > 10) {
    const loss = Math.floor(hoursPassed / 4) * 5;
    const newHappiness = Math.max(10, pet.happiness - loss);
    if (newHappiness !== pet.happiness) {
      db.prepare("UPDATE user_pets SET happiness = ? WHERE id = ?").run(newHappiness, pet.id);
      pet.happiness = newHappiness;
    }
  }
}

/** Devuelve todas las mascotas de un usuario en un servidor */
export function getUserPets(guildId: string, userId: string): UserPet[] {
  const db = getDb();
  const pets = db
    .prepare("SELECT * FROM user_pets WHERE guild_id = ? AND user_id = ? ORDER BY is_active DESC, level DESC, id ASC")
    .all(guildId, userId) as UserPet[];

  for (const pet of pets) {
    updatePetHappiness(pet, db);
  }

  // Asegurar que si tiene mascotas pero ninguna marcada como activa, la primera sea la activa
  if (pets.length > 0 && !pets.some((p) => p.is_active === 1)) {
    pets[0].is_active = 1;
    db.prepare("UPDATE user_pets SET is_active = 1 WHERE id = ?").run(pets[0].id);
  }

  return pets;
}

/** Busca una mascota específica (por ID numérico o nombre/especie) o la mascota activa por defecto */
export function getUserPet(guildId: string, userId: string, petIdentifier?: string | number): UserPet | null {
  const allPets = getUserPets(guildId, userId);
  if (!allPets.length) return null;

  if (petIdentifier !== undefined && petIdentifier !== null && petIdentifier !== "") {
    const rawStr = String(petIdentifier).trim();
    const asNum = Number(rawStr);

    if (!Number.isNaN(asNum) && Number.isInteger(asNum)) {
      const match = allPets.find((p) => p.id === asNum);
      if (match) return match;
    }

    const lower = rawStr.toLowerCase();
    const byName = allPets.find((p) => p.name.toLowerCase() === lower);
    if (byName) return byName;

    const byType = allPets.find((p) => p.pet_type.toLowerCase() === lower);
    if (byType) return byType;

    const partial = allPets.find((p) => p.name.toLowerCase().includes(lower));
    if (partial) return partial;

    return null;
  }

  // Si no se especifica, devolver la mascota activa (o la primera)
  return allPets.find((p) => p.is_active === 1) ?? allPets[0] ?? null;
}

/** Establece una mascota como la compañera activa del usuario */
export function setActivePet(
  guildId: string,
  userId: string,
  petIdentifier: string | number,
): { ok: boolean; message: string; pet?: UserPet } {
  const targetPet = getUserPet(guildId, userId, petIdentifier);
  if (!targetPet) {
    return { ok: false, message: "No se ha encontrado la mascota indicada en tu colección." };
  }

  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE user_pets SET is_active = 0 WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
    db.prepare("UPDATE user_pets SET is_active = 1 WHERE id = ?").run(targetPet.id);
  })();

  targetPet.is_active = 1;
  const species = PET_SPECIES[targetPet.pet_type] ?? { emoji: "🐾" };
  return {
    ok: true,
    message: `Has seleccionado a **${targetPet.name}** ${species.emoji} (Nv. ${targetPet.level}) como tu compañera activa.`,
    pet: targetPet,
  };
}

/** Adopta una nueva mascota, permitiendo múltiples compañeros */
export function adoptPet(
  guildId: string,
  userId: string,
  petType: string,
  name: string,
): { ok: boolean; message: string; pet?: UserPet } {
  const species = PET_SPECIES[petType];
  if (!species) return { ok: false, message: "Especie de mascota no válida." };

  const currentPets = getUserPets(guildId, userId);
  if (currentPets.length >= MAX_PETS_PER_USER) {
    return {
      ok: false,
      message: `Has alcanzado el límite máximo de **${MAX_PETS_PER_USER} mascotas**. Si deseas adoptar una nueva, puedes liberar alguna con \`/mascota liberar\`.`,
    };
  }

  const cleanName = name.trim().slice(0, 30);
  if (!cleanName) return { ok: false, message: "Por favor indica un nombre para tu mascota." };

  const eco = getEco(guildId, userId);
  if (totalFunds(eco) < species.price) {
    return {
      ok: false,
      message: `No tienes suficientes fondos para adoptar a ${species.emoji} **${species.name}**. Cuesta **${n(species.price)}** y tienes **${n(totalFunds(eco))}**.`,
    };
  }

  const now = Date.now();
  const db = getDb();
  const isFirst = currentPets.length === 0 ? 1 : 0;

  let insertedId = 0;
  db.transaction(() => {
    deductFunds(eco, species.price);
    saveEco(eco);

    const info = db
      .prepare(
        `INSERT INTO user_pets (guild_id, user_id, pet_type, name, level, exp, happiness, last_feed, last_pet, on_expedition_until, expedition_hours, expedition_reward, created_at, is_active)
         VALUES (?, ?, ?, ?, 1, 0, 100, ?, ?, 0, 0, NULL, ?, ?)`,
      )
      .run(guildId, userId, petType, cleanName, now, now, now, isFirst);
    insertedId = Number(info.lastInsertRowid);
  })();

  const newPet = getUserPet(guildId, userId, insertedId)!;
  const totalCount = currentPets.length + 1;
  const activeNote = isFirst ? " Se ha establecido como tu mascota activa." : ` Tienes **${totalCount}/${MAX_PETS_PER_USER}** mascotas. Puedes seleccionarla como activa con \`/mascota seleccionar\`.`;

  return {
    ok: true,
    message: `¡Felicidades! Has adoptado a **${newPet.name}** el ${species.name} ${species.emoji}.${activeNote}`,
    pet: newPet,
  };
}

export function feedPet(
  guildId: string,
  userId: string,
  petIdentifier?: string | number,
): { ok: boolean; message: string; leveledUp?: boolean } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No tienes ninguna mascota para alimentar. ¡Adopta una con `/mascota adoptar`!" };

  const now = Date.now();
  const FEED_CD_MS = 2 * 3600_000;
  if (now - pet.last_feed < FEED_CD_MS) {
    const remSec = Math.ceil((FEED_CD_MS - (now - pet.last_feed)) / 1000);
    return {
      ok: false,
      message: `**${pet.name}** está saciada. Podrás alimentarla de nuevo en <t:${Math.floor((now + remSec * 1000) / 1000)}:R>.`,
    };
  }

  const eco = getEco(guildId, userId);
  const FOOD_COST = 200;
  if (totalFunds(eco) < FOOD_COST) {
    return { ok: false, message: `Comprar comida premium para mascotas cuesta **${n(FOOD_COST)}**.` };
  }

  let expGain = 15;
  if (pet.pet_type === "shiba") expGain = 20;

  let newExp = pet.exp + expGain;
  let newLevel = pet.level;
  let leveledUp = false;
  const needed = expToNextLevel(newLevel);

  if (newExp >= needed) {
    newExp -= needed;
    newLevel += 1;
    leveledUp = true;
  }

  const newHappiness = Math.min(100, pet.happiness + 25);

  getDb().transaction(() => {
    deductFunds(eco, FOOD_COST);
    saveEco(eco);

    getDb()
      .prepare("UPDATE user_pets SET happiness = ?, exp = ?, level = ?, last_feed = ? WHERE id = ?")
      .run(newHappiness, newExp, newLevel, now, pet.id);
  })();

  const species = PET_SPECIES[pet.pet_type] ?? { emoji: "🐾" };
  const lvlText = leveledUp ? `\n🎉 **¡${pet.name} ha subido al Nivel ${newLevel}!** Sus expediciones serán más fructíferas.` : "";

  return {
    ok: true,
    message: `${species.emoji} Has alimentado a **${pet.name}** con un plato delicioso (-${n(FOOD_COST)}).\n💖 Felicidad: **${newHappiness}%** (+25%) · ⭐ Exp: +${expGain} XP${lvlText}`,
    leveledUp,
  };
}

export function petPet(
  guildId: string,
  userId: string,
  petIdentifier?: string | number,
): { ok: boolean; message: string; leveledUp?: boolean } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No tienes ninguna mascota para acariciar. ¡Adopta una con `/mascota adoptar`!" };

  const now = Date.now();
  const PET_CD_MS = 60 * 60_000;
  if (now - pet.last_pet < PET_CD_MS) {
    return {
      ok: false,
      message: `Acabas de mimar a **${pet.name}**. Vuelve a acariciarle en <t:${Math.floor((pet.last_pet + PET_CD_MS) / 1000)}:R>.`,
    };
  }

  const expGain = 10;
  let newExp = pet.exp + expGain;
  let newLevel = pet.level;
  let leveledUp = false;
  const needed = expToNextLevel(newLevel);

  if (newExp >= needed) {
    newExp -= needed;
    newLevel += 1;
    leveledUp = true;
  }

  const newHappiness = Math.min(100, pet.happiness + 15);

  getDb()
    .prepare("UPDATE user_pets SET happiness = ?, exp = ?, level = ?, last_pet = ? WHERE id = ?")
    .run(newHappiness, newExp, newLevel, now, pet.id);

  const species = PET_SPECIES[pet.pet_type] ?? { emoji: "🐾" };
  const lvlText = leveledUp ? `\n🎉 **¡${pet.name} ha subido al Nivel ${newLevel}!**` : "";

  return {
    ok: true,
    message: `${species.emoji} Has acariciado y jugado con **${pet.name}**.\n💖 Felicidad: **${newHappiness}%** (+15%) · ⭐ Exp: +${expGain} XP${lvlText}`,
    leveledUp,
  };
}

export function renamePet(
  guildId: string,
  userId: string,
  newName: string,
  petIdentifier?: string | number,
): { ok: boolean; message: string } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No tienes ninguna mascota activa para renombrar." };

  const clean = newName.trim().slice(0, 30);
  if (!clean) return { ok: false, message: "El nombre no es válido." };

  getDb().prepare("UPDATE user_pets SET name = ? WHERE id = ?").run(clean, pet.id);
  return { ok: true, message: `Tu mascota ahora se llama **${clean}**.` };
}

export function releasePet(
  guildId: string,
  userId: string,
  petIdentifier: string | number,
): { ok: boolean; message: string } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No se encontró la mascota que deseas liberar." };

  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM user_pets WHERE id = ?").run(pet.id);
    // Si era la activa, activar la primera restante
    if (pet.is_active === 1) {
      const remaining = db
        .prepare("SELECT id FROM user_pets WHERE guild_id = ? AND user_id = ? ORDER BY level DESC, id ASC LIMIT 1")
        .get(guildId, userId) as { id: number } | undefined;
      if (remaining) {
        db.prepare("UPDATE user_pets SET is_active = 1 WHERE id = ?").run(remaining.id);
      }
    }
  })();

  const species = PET_SPECIES[pet.pet_type] ?? { emoji: "🐾" };
  return {
    ok: true,
    message: `Has liberado a **${pet.name}** ${species.emoji}. Ahora vive libre y feliz en la naturaleza de Nexo.`,
  };
}

export function startExpedition(
  guildId: string,
  userId: string,
  hours: number,
  petIdentifier?: string | number,
): { ok: boolean; message: string } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No tienes una mascota para enviar a expediciones." };

  const now = Date.now();
  if (pet.on_expedition_until > now) {
    return {
      ok: false,
      message: `**${pet.name}** ya está explorando y regresará <t:${Math.floor(pet.on_expedition_until / 1000)}:R>.`,
    };
  }

  // Horas permitidas: 1, 4, 8, 24
  const validHours = [1, 4, 8, 24];
  if (!validHours.includes(hours)) {
    return { ok: false, message: "La duración de la expedición debe ser de 1, 4, 8 o 24 horas." };
  }

  const durationMs = hours * 3600_000;
  const endsAt = now + durationMs;

  // Calcular recompensas
  const baseMin = 2000 * hours;
  const baseMax = 4500 * hours;

  // Multiplicador por nivel de la mascota (+5% por nivel)
  const levelMult = 1 + (pet.level - 1) * 0.05;
  // Multiplicador por felicidad (hasta +20%)
  const hapMult = 0.8 + (pet.happiness / 100) * 0.4;
  // Bonus por especie
  let speciesMult = 1;
  if (pet.pet_type === "dragon") speciesMult = 1.5;
  if (pet.pet_type === "buho" && hours >= 8) speciesMult = 1.35;

  const totalMult = levelMult * hapMult * speciesMult;
  const coinReward = Math.floor(rng(baseMin, baseMax) * totalMult);

  // Posibles objetos
  const itemsWon: { id: string; qty: number }[] = [];
  const roll = rng(1, 100);

  if (hours >= 1 && roll <= 40) itemsWon.push({ id: "cafe", qty: 1 });
  if (hours >= 4 && roll <= 50) itemsWon.push({ id: "cebo", qty: rng(1, 3) });
  if (hours >= 8 && roll <= 45) itemsWon.push({ id: "amuleto", qty: 1 });
  if (hours >= 24 && roll <= 35) itemsWon.push({ id: "pasta_termica", qty: 1 });
  if (pet.pet_type === "dragon" && roll <= 30) itemsWon.push({ id: "amuleto", qty: 1 });

  const rewardData = JSON.stringify({
    coins: coinReward,
    items: itemsWon,
  });

  getDb()
    .prepare("UPDATE user_pets SET on_expedition_until = ?, expedition_hours = ?, expedition_reward = ? WHERE id = ?")
    .run(endsAt, hours, rewardData, pet.id);

  const species = PET_SPECIES[pet.pet_type] ?? { emoji: "🐾" };
  return {
    ok: true,
    message: `🎒 **${pet.name}** ${species.emoji} se ha colocado su mochilita y ha partido hacia una expedición de **${hours} hora(s)**.\nRegresará con el botín <t:${Math.floor(endsAt / 1000)}:R>.`,
  };
}

export function claimExpedition(
  guildId: string,
  userId: string,
  petIdentifier?: string | number,
): {
  ok: boolean;
  message: string;
  coins?: number;
  items?: { id: string; qty: number }[];
  expGained?: number;
  leveledUp?: boolean;
} {
  const allPets = getUserPets(guildId, userId);
  if (!allPets.length) return { ok: false, message: "No tienes ninguna mascota." };

  const now = Date.now();

  // Si se pasa una mascota específica:
  if (petIdentifier !== undefined && petIdentifier !== null && petIdentifier !== "") {
    const pet = getUserPet(guildId, userId, petIdentifier);
    if (!pet) return { ok: false, message: "No se encontró la mascota especificada." };

    if (!pet.on_expedition_until || pet.expedition_hours <= 0) {
      return { ok: false, message: `**${pet.name}** no está en ninguna expedición actualmente. ¡Envíale a explorar con \`/mascota expedicion\`!` };
    }

    if (now < pet.on_expedition_until) {
      return {
        ok: false,
        message: `⏳ **${pet.name}** aún está explorando. Regresará <t:${Math.floor(pet.on_expedition_until / 1000)}:R>.`,
      };
    }

    return claimSinglePetExpedition(guildId, userId, pet);
  }

  // Si no se especifica mascota, buscar todas las que estén listas para reclamar
  const readyPets = allPets.filter((p) => p.on_expedition_until > 0 && p.on_expedition_until <= now);

  if (readyPets.length === 0) {
    const ongoing = allPets.filter((p) => p.on_expedition_until > now);
    if (ongoing.length > 0) {
      const ongoingLines = ongoing
        .map((p) => `▸ **${p.name}** regresa <t:${Math.floor(p.on_expedition_until / 1000)}:R>`)
        .join("\n");
      return {
        ok: false,
        message: `⏳ Ninguna expedición ha finalizado todavía:\n${ongoingLines}`,
      };
    }
    return {
      ok: false,
      message: "Ninguna de tus mascotas está en expedición actualmente. ¡Envíalas a explorar con `/mascota expedicion`!",
    };
  }

  // Reclamar todas las listas
  let totalCoins = 0;
  const allItems: { id: string; qty: number }[] = [];
  const claimSummaries: string[] = [];

  for (const pet of readyPets) {
    const res = claimSinglePetExpedition(guildId, userId, pet);
    if (res.ok) {
      totalCoins += res.coins ?? 0;
      if (res.items) allItems.push(...res.items);
      claimSummaries.push(res.message);
    }
  }

  return {
    ok: true,
    message: claimSummaries.join("\n\n"),
    coins: totalCoins,
    items: allItems,
  };
}

function claimSinglePetExpedition(
  guildId: string,
  userId: string,
  pet: UserPet,
): {
  ok: boolean;
  message: string;
  coins?: number;
  items?: { id: string; qty: number }[];
  expGained?: number;
  leveledUp?: boolean;
} {
  let rewardInfo = { coins: 3000, items: [] as { id: string; qty: number }[] };
  try {
    if (pet.expedition_reward) rewardInfo = JSON.parse(pet.expedition_reward);
  } catch {
    /* fallback */
  }

  const hours = pet.expedition_hours;
  const expGain = hours * 20;
  let newExp = pet.exp + expGain;
  let newLevel = pet.level;
  let leveledUp = false;
  const needed = expToNextLevel(newLevel);

  if (newExp >= needed) {
    newExp -= needed;
    newLevel += 1;
    leveledUp = true;
  }

  const eco = getEco(guildId, userId);
  addWallet(eco, rewardInfo.coins);
  for (const it of rewardInfo.items) {
    giveItem(eco, it.id, it.qty);
  }
  saveEco(eco);

  getDb()
    .prepare(
      "UPDATE user_pets SET on_expedition_until = 0, expedition_hours = 0, expedition_reward = NULL, exp = ?, level = ? WHERE id = ?",
    )
    .run(newExp, newLevel, pet.id);

  checkUserAchievements(guildId, userId);

  const species = PET_SPECIES[pet.pet_type] ?? { emoji: "🐾" };
  const itemsText = rewardInfo.items.length
    ? `\n🎁 **Objetos encontrados:** ${rewardInfo.items.map((i) => `\`${i.id}\` ×${i.qty}`).join(", ")}`
    : "";
  const lvlText = leveledUp ? `\n🎉 **¡${pet.name} ha alcanzado el Nivel ${newLevel}!**` : "";

  return {
    ok: true,
    message:
      `🏰 **${pet.name}** ${species.emoji} ha vuelto triunfalmente de su expedición de **${hours}h**.\n` +
      `💰 **Monedas:** **${n(rewardInfo.coins)}** (ingresadas en cartera)${itemsText}\n` +
      `⭐ **Experiencia:** +${expGain} XP${lvlText}`,
    coins: rewardInfo.coins,
    items: rewardInfo.items,
    expGained: expGain,
    leveledUp,
  };
}
