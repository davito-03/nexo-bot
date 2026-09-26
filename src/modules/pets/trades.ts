// Sistema de Intercambio Pokémon entre Entrenadores
// Soporta intercambio seguro y evoluciones por intercambio (trade evolutions).

import { getDb } from "../../database/index.js";
import { getPokemonById, type PetSpeciesDef } from "./catalog.js";
import { getUserPet, registerPokedex, type UserPet } from "./engine.js";
import { checkTradeEvolution } from "./evolutions.js";

export interface TradeResult {
  ok: boolean;
  message: string;
  pet1Name: string;
  pet2Name: string;
  pet1Evolved?: { from: PetSpeciesDef; to: PetSpeciesDef };
  pet2Evolved?: { from: PetSpeciesDef; to: PetSpeciesDef };
  pet1Species?: PetSpeciesDef;
  pet2Species?: PetSpeciesDef;
}

export function executeTrade(
  guildId: string,
  user1Id: string,
  pet1Id: number,
  user2Id: string,
  pet2Id: number,
): TradeResult {
  const db = getDb();

  const pet1 = getUserPet(guildId, user1Id, pet1Id);
  const pet2 = getUserPet(guildId, user2Id, pet2Id);

  if (!pet1) {
    return { ok: false, message: "El Pokémon del primer entrenador ya no está disponible.", pet1Name: "", pet2Name: "" };
  }
  if (!pet2) {
    return { ok: false, message: "El Pokémon del segundo entrenador ya no está disponible.", pet1Name: "", pet2Name: "" };
  }

  const sp1 = getPokemonById(pet1.pet_type);
  const sp2 = getPokemonById(pet2.pet_type);

  if (!sp1 || !sp2) {
    return { ok: false, message: "Error al identificar las especies de Pokémon involucradas.", pet1Name: pet1.name, pet2Name: pet2.name };
  }

  // Swap owners in database
  db.prepare("UPDATE user_pets SET user_id = ?, is_active = 0 WHERE id = ? AND guild_id = ?").run(user2Id, pet1.id, guildId);
  db.prepare("UPDATE user_pets SET user_id = ?, is_active = 0 WHERE id = ? AND guild_id = ?").run(user1Id, pet2.id, guildId);

  // Register in pokedex
  registerPokedex(guildId, user2Id, sp1.id);
  registerPokedex(guildId, user1Id, sp2.id);

  let pet1Evolved: { from: PetSpeciesDef; to: PetSpeciesDef } | undefined;
  let pet2Evolved: { from: PetSpeciesDef; to: PetSpeciesDef } | undefined;

  // Check trade evolution for pet1 (now owned by user2)
  const tradeOpt1 = checkTradeEvolution(sp1.id);
  if (tradeOpt1) {
    const evolvedSpecies = getPokemonById(tradeOpt1.target);
    if (evolvedSpecies) {
      const newName = (pet1.name.toLowerCase() === sp1.name.toLowerCase() || pet1.name.toLowerCase() === sp1.pokemonName.toLowerCase())
        ? evolvedSpecies.name
        : pet1.name;
      db.prepare("UPDATE user_pets SET pet_type = ?, name = ? WHERE id = ?").run(evolvedSpecies.id, newName, pet1.id);
      registerPokedex(guildId, user2Id, evolvedSpecies.id);
      pet1Evolved = { from: sp1, to: evolvedSpecies };
    }
  }

  // Check trade evolution for pet2 (now owned by user1)
  const tradeOpt2 = checkTradeEvolution(sp2.id);
  if (tradeOpt2) {
    const evolvedSpecies = getPokemonById(tradeOpt2.target);
    if (evolvedSpecies) {
      const newName = (pet2.name.toLowerCase() === sp2.name.toLowerCase() || pet2.name.toLowerCase() === sp2.pokemonName.toLowerCase())
        ? evolvedSpecies.name
        : pet2.name;
      db.prepare("UPDATE user_pets SET pet_type = ?, name = ? WHERE id = ?").run(evolvedSpecies.id, newName, pet2.id);
      registerPokedex(guildId, user1Id, evolvedSpecies.id);
      pet2Evolved = { from: sp2, to: evolvedSpecies };
    }
  }

  return {
    ok: true,
    message: "¡Intercambio completado con éxito!",
    pet1Name: pet1.name,
    pet2Name: pet2.name,
    pet1Species: sp1,
    pet2Species: sp2,
    pet1Evolved,
    pet2Evolved,
  };
}
