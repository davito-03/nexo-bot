// Sistema de Batallas Silvestres en Rutas y Cuevas
// Permite explorar zonas (Ruta, Cueva, Bosque, Mar, Montaña), debilitar Pokémon y capturarlos como en los juegos tradicionales.

import { ALL_POKEMON_LIST, getPokemonById, type PetSpeciesDef } from "./catalog.js";
import { type UserPet } from "./engine.js";

export type ExplorationZone = "ruta" | "cueva" | "bosque" | "mar" | "montana";

export interface WildPokemonState {
  species: PetSpeciesDef;
  level: number;
  maxHp: number;
  currentHp: number;
  atk: number;
  def: number;
  spd: number;
  status?: "normal" | "paralizado" | "dormido";
  berryBuff?: boolean;
}

export interface PlayerPokemonState {
  pet: UserPet;
  species: PetSpeciesDef;
  maxHp: number;
  currentHp: number;
  atk: number;
  def: number;
  spd: number;
}

const ZONE_TYPES: Record<ExplorationZone, string[]> = {
  ruta: ["normal", "volador", "electrico", "planta"],
  cueva: ["roca", "tierra", "fantasma", "siniestro", "acero", "veneno"],
  bosque: ["bicho", "planta", "veneno", "hada"],
  mar: ["agua", "hielo"],
  montana: ["fuego", "dragon", "lucha", "roca", "tierra"],
};

export const ZONE_NAMES: Record<ExplorationZone, { name: string; emoji: string; desc: string }> = {
  ruta: { name: "Ruta Silvestre", emoji: "🌿", desc: "Praderas y hierba alta transitada por criaturas ágiles" },
  cueva: { name: "Cueva Profunda", emoji: "🪨", desc: "Cavernas oscuras con Pokémon de roca, tierra y sombras" },
  bosque: { name: "Bosque Virgen", emoji: "🌲", desc: "Espesura repleta de Pokémon de tipo bicho, veneno y planta" },
  mar: { name: "Costa y Océano", emoji: "🌊", desc: "Aguas profundas con majestuosas especies marinas" },
  montana: { name: "Pico Montañoso", emoji: "🌋", desc: "Tierras altas escarpadas con Pokémon ardientes, dragones y luchadores" },
};

export function getRandomPokemonForZone(zone: ExplorationZone): PetSpeciesDef {
  const allowedTypes = ZONE_TYPES[zone] || ZONE_TYPES.ruta;
  const pool = ALL_POKEMON_LIST.filter(
    (p) => p.rarity !== "mitico" && p.types.some((t) => allowedTypes.includes(t)),
  );
  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return ALL_POKEMON_LIST[Math.floor(Math.random() * ALL_POKEMON_LIST.length)];
}

export function createWildBattle(
  zone: ExplorationZone,
  activePet: UserPet,
): { wild: WildPokemonState; player: PlayerPokemonState } {
  const petSpecies = getPokemonById(activePet.pet_type) || ALL_POKEMON_LIST[0];
  const wildSpecies = getRandomPokemonForZone(zone);

  // Scaled level based on player pet's level
  const levelVariation = Math.floor(Math.random() * 5) - 2; // -2 to +2
  const wildLevel = Math.max(3, Math.min(100, activePet.level + levelVariation));

  const wildHp = Math.round(wildSpecies.baseHp * 0.8 + wildLevel * 8);
  const wildAtk = Math.round(wildSpecies.baseAtk * 0.7 + wildLevel * 2);
  const wildDef = Math.round(wildSpecies.baseDef * 0.7 + wildLevel * 2);
  const wildSpd = Math.round(wildSpecies.baseSpd * 0.7 + wildLevel * 2);

  const playerHp = Math.round(petSpecies.baseHp + activePet.level * 10);
  const playerAtk = Math.round(petSpecies.baseAtk + activePet.level * 3);
  const playerDef = Math.round(petSpecies.baseDef + activePet.level * 2.5);
  const playerSpd = Math.round(petSpecies.baseSpd + activePet.level * 2.5);

  return {
    wild: {
      species: wildSpecies,
      level: wildLevel,
      maxHp: wildHp,
      currentHp: wildHp,
      atk: wildAtk,
      def: wildDef,
      spd: wildSpd,
    },
    player: {
      pet: activePet,
      species: petSpecies,
      maxHp: playerHp,
      currentHp: playerHp,
      atk: playerAtk,
      def: playerDef,
      spd: playerSpd,
    },
  };
}

export function renderHpBar(current: number, max: number, size = 10): string {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * size);
  const empty = size - filled;

  let block = "🟩";
  if (ratio <= 0.25) block = "🟥";
  else if (ratio <= 0.5) block = "🟨";

  const bar = block.repeat(filled) + "⬛".repeat(empty);
  return `${bar} ${Math.max(0, current)}/${max} HP (${Math.round(ratio * 100)}%)`;
}

export function executePlayerAttack(
  player: PlayerPokemonState,
  wild: WildPokemonState,
): { damage: number; critical: boolean; text: string } {
  const isCrit = Math.random() < 0.15;
  const critMult = isCrit ? 1.6 : 1.0;
  const rawDmg = Math.max(12, ((player.atk * 1.5) - (wild.def * 0.6)) * (0.85 + Math.random() * 0.3));
  const damage = Math.round(rawDmg * critMult);

  wild.currentHp = Math.max(0, wild.currentHp - damage);

  const text = `⚔️ ¡**${player.pet.name}** usó **${player.species.skillName}** causando **${damage} de daño**${isCrit ? " *(¡GOLPE CRÍTICO!)*" : ""}!`;
  return { damage, critical: isCrit, text };
}

export function executeWildAttack(
  wild: WildPokemonState,
  player: PlayerPokemonState,
): { damage: number; critical: boolean; text: string } {
  const isCrit = Math.random() < 0.1;
  const critMult = isCrit ? 1.5 : 1.0;
  const rawDmg = Math.max(8, ((wild.atk * 1.3) - (player.def * 0.6)) * (0.85 + Math.random() * 0.3));
  const damage = Math.round(rawDmg * critMult);

  player.currentHp = Math.max(0, player.currentHp - damage);

  const text = `💥 ¡**${wild.species.name}** salvaje contraatacó con **${wild.species.skillName}** causando **${damage} de daño**!`;
  return { damage, critical: isCrit, text };
}

export function attemptCatch(
  wild: WildPokemonState,
  ballId: string,
): { success: boolean; shakes: number; ratePercent: number; log: string } {
  if (ballId === "masterball") {
    return {
      success: true,
      shakes: 3,
      ratePercent: 100,
      log: "🟣 ¡La Master Ball capturó al Pokémon instantáneamente sin fallar!",
    };
  }

  // Base catch rate by rarity
  let baseRate = 0.35;
  if (wild.species.rarity === "comun") baseRate = 0.55;
  else if (wild.species.rarity === "poco_comun") baseRate = 0.45;
  else if (wild.species.rarity === "raro") baseRate = 0.30;
  else if (wild.species.rarity === "epico") baseRate = 0.18;
  else if (wild.species.rarity === "legendario") baseRate = 0.08;

  // Ball multiplier
  let ballMult = 1.0;
  if (ballId === "superball") ballMult = 1.5;
  else if (ballId === "ultraball") ballMult = 2.2;

  // HP factor: lower HP means up to 2.5x higher catch rate
  const hpMissingRatio = 1 - (wild.currentHp / wild.maxHp);
  const hpMultiplier = 1 + (hpMissingRatio * 1.5); // from 1.0 at 100% HP up to 2.5 at 0% HP

  // Berry factor
  const berryMult = wild.berryBuff ? 1.35 : 1.0;

  const totalChance = Math.min(0.98, Math.max(0.05, baseRate * ballMult * hpMultiplier * berryMult));
  const roll = Math.random();

  const success = roll <= totalChance;
  const ratePercent = Math.round(totalChance * 100);

  let shakes = 3;
  if (!success) {
    if (roll > totalChance + 0.4) shakes = 0;
    else if (roll > totalChance + 0.2) shakes = 1;
    else shakes = 2;
  }

  return {
    success,
    shakes,
    ratePercent,
    log: success
      ? `✨ ¡Atrapado con éxito tras 3 balanceos! (Probabilidad calculada: ${ratePercent}%)`
      : `💨 ¡El Pokémon se liberó tras ${shakes} balanceo(s)! (Probabilidad: ${ratePercent}%)`,
  };
}
