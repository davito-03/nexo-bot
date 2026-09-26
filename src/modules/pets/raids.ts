// Sistema de Incursiones / Raids Cooperativas Globales (World Bosses)
// Los entrenadores unen fuerzas con sus Pokémon para derrotar a Legendarios colosales.

import { getDb } from "../../database/index.js";
import { addWallet, getEco, giveItem, n, saveEco } from "../economy/engine.js";
import { getPokemonById, type PetSpeciesDef } from "./catalog.js";
import { adoptPet, getActivePet, getUserPet, getUserPets, type UserPet } from "./engine.js";

export interface PokemonRaid {
  guild_id: string;
  raid_id: string;
  boss_species_id: string;
  boss_name: string;
  max_hp: number;
  current_hp: number;
  level: number;
  reward_coins: number;
  status: "active" | "defeated" | "expired";
  started_at: number;
  expires_at: number;
}

export interface RaidContributor {
  user_id: string;
  damage: number;
  total_attacks: number;
  last_attack_at: number;
}

const RAID_BOSS_POOL = [
  { id: "mewtwo", name: "Mewtwo", hp: 120_000, reward: 800_000 },
  { id: "lugia", name: "Lugia", hp: 130_000, reward: 850_000 },
  { id: "ho_oh", name: "Ho-Oh", hp: 130_000, reward: 850_000 },
  { id: "rayquaza", name: "Rayquaza", hp: 150_000, reward: 1_000_000 },
  { id: "groudon", name: "Groudon", hp: 140_000, reward: 900_000 },
  { id: "kyogre", name: "Kyogre", hp: 140_000, reward: 900_000 },
  { id: "dialga", name: "Dialga", hp: 160_000, reward: 1_100_000 },
  { id: "palkia", name: "Palkia", hp: 160_000, reward: 1_100_000 },
  { id: "giratina", name: "Giratina", hp: 175_000, reward: 1_200_000 },
  { id: "arceus", name: "Arceus", hp: 200_000, reward: 1_500_000 },
  { id: "reshiram", name: "Reshiram", hp: 165_000, reward: 1_150_000 },
  { id: "zekrom", name: "Zekrom", hp: 165_000, reward: 1_150_000 },
  { id: "kyurem", name: "Kyurem", hp: 170_000, reward: 1_200_000 },
];

export function initRaidTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS pokemon_raids (
      guild_id TEXT NOT NULL,
      raid_id TEXT NOT NULL,
      boss_species_id TEXT NOT NULL,
      boss_name TEXT NOT NULL,
      max_hp INTEGER NOT NULL,
      current_hp INTEGER NOT NULL,
      level INTEGER NOT NULL DEFAULT 50,
      reward_coins INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, raid_id)
    );

    CREATE TABLE IF NOT EXISTS pokemon_raid_attacks (
      guild_id TEXT NOT NULL,
      raid_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      pet_id INTEGER NOT NULL,
      damage INTEGER NOT NULL,
      last_attack_at INTEGER NOT NULL,
      total_attacks INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (guild_id, raid_id, user_id)
    );
  `);
}

export function getCurrentRaid(guildId: string): PokemonRaid {
  initRaidTables();
  const db = getDb();
  const now = Date.now();

  const current = db.prepare(
    "SELECT * FROM pokemon_raids WHERE guild_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1"
  ).get(guildId) as PokemonRaid | undefined;

  if (current) {
    if (now > current.expires_at) {
      db.prepare("UPDATE pokemon_raids SET status = 'expired' WHERE guild_id = ? AND raid_id = ?").run(guildId, current.raid_id);
    } else {
      return current;
    }
  }

  // Spawn new raid
  const choice = RAID_BOSS_POOL[Math.floor(Math.random() * RAID_BOSS_POOL.length)];
  const raidId = `raid_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const DURATION = 24 * 3_600_000; // 24 hours per raid

  db.prepare(`
    INSERT INTO pokemon_raids (guild_id, raid_id, boss_species_id, boss_name, max_hp, current_hp, level, reward_coins, status, started_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 70, ?, 'active', ?, ?)
  `).run(guildId, raidId, choice.id, choice.name, choice.hp, choice.hp, choice.reward, now, now + DURATION);

  return {
    guild_id: guildId,
    raid_id: raidId,
    boss_species_id: choice.id,
    boss_name: choice.name,
    max_hp: choice.hp,
    current_hp: choice.hp,
    level: 70,
    reward_coins: choice.reward,
    status: "active",
    started_at: now,
    expires_at: now + DURATION,
  };
}

export function getRaidContributors(guildId: string, raidId: string): RaidContributor[] {
  initRaidTables();
  const db = getDb();
  return db.prepare(
    "SELECT * FROM pokemon_raid_attacks WHERE guild_id = ? AND raid_id = ? ORDER BY damage DESC LIMIT 10"
  ).all(guildId, raidId) as RaidContributor[];
}

export const RAID_ATTACK_COOLDOWN = 10 * 60_000; // 10 minutes

export function attackRaid(
  guildId: string,
  userId: string,
  petIdentifier?: string | number,
): {
  ok: boolean;
  message: string;
  damage?: number;
  critical?: boolean;
  bossHpRemaining?: number;
  bossDefeated?: boolean;
  pet?: UserPet;
  species?: PetSpeciesDef;
  raid?: PokemonRaid;
  rewardsSummary?: string;
} {
  const raid = getCurrentRaid(guildId);
  if (raid.status !== "active" || raid.current_hp <= 0) {
    return { ok: false, message: "No hay ninguna Incursión activa en este momento." };
  }

  const pet = getUserPet(guildId, userId, petIdentifier) || getActivePet(guildId, userId);
  if (!pet) {
    return { ok: false, message: "Necesitas tener al menos un Pokémon activo para atacar en la Incursión." };
  }

  const species = getPokemonById(pet.pet_type);
  if (!species) {
    return { ok: false, message: "Especie de Pokémon no válida." };
  }

  const db = getDb();
  const now = Date.now();

  const prevAttack = db.prepare(
    "SELECT * FROM pokemon_raid_attacks WHERE guild_id = ? AND raid_id = ? AND user_id = ?"
  ).get(guildId, raid.raid_id, userId) as RaidContributor | undefined;

  if (prevAttack && now - prevAttack.last_attack_at < RAID_ATTACK_COOLDOWN) {
    const remMins = Math.ceil((RAID_ATTACK_COOLDOWN - (now - prevAttack.last_attack_at)) / 60_000);
    return {
      ok: false,
      message: `Tu Pokémon está exhausto tras su último asalto. Podrá atacar de nuevo en **${remMins} minuto(s)**.`,
    };
  }

  // Damage calculation: (baseAtk * 3 + level * 25) * random(0.85, 1.15)
  const isCritical = Math.random() < 0.15;
  const critMult = isCritical ? 1.75 : 1.0;
  const baseDmg = (species.baseAtk * 4 + pet.level * 35) * (0.85 + Math.random() * 0.3);
  const damage = Math.round(baseDmg * critMult);

  const newHp = Math.max(0, raid.current_hp - damage);
  const defeated = newHp <= 0;

  // Update raid table
  db.prepare(
    "UPDATE pokemon_raids SET current_hp = ?, status = ? WHERE guild_id = ? AND raid_id = ?"
  ).run(newHp, defeated ? "defeated" : "active", guildId, raid.raid_id);

  // Update or insert contributor
  if (prevAttack) {
    db.prepare(`
      UPDATE pokemon_raid_attacks
      SET damage = damage + ?, total_attacks = total_attacks + 1, last_attack_at = ?, pet_id = ?
      WHERE guild_id = ? AND raid_id = ? AND user_id = ?
    `).run(damage, now, pet.id, guildId, raid.raid_id, userId);
  } else {
    db.prepare(`
      INSERT INTO pokemon_raid_attacks (guild_id, raid_id, user_id, pet_id, damage, last_attack_at, total_attacks)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(guildId, raid.raid_id, userId, pet.id, damage, now);
  }

  // Add EXP to the attacking pet
  pet.exp += Math.round(damage / 10);
  db.prepare("UPDATE user_pets SET exp = ? WHERE id = ?").run(pet.exp, pet.id);

  let rewardsSummary = "";
  if (defeated) {
    // Distribute rewards to all contributors
    const contributors = db.prepare(
      "SELECT * FROM pokemon_raid_attacks WHERE guild_id = ? AND raid_id = ? ORDER BY damage DESC"
    ).all(guildId, raid.raid_id) as RaidContributor[];

    const totalDmg = contributors.reduce((acc, c) => acc + c.damage, 0);

    for (let i = 0; i < contributors.length; i++) {
      const c = contributors[i];
      const share = totalDmg > 0 ? c.damage / totalDmg : 1 / contributors.length;
      const coinReward = Math.max(10_000, Math.round(raid.reward_coins * share));

      const userEco = getEco(guildId, c.user_id);
      addWallet(userEco, coinReward);

      // Top damager gets Master Ball, top 2-5 get Ultra Balls
      if (i === 0) {
        giveItem(userEco, "masterball", 1);
        giveItem(userEco, "caramelo_raro", 3);
        // Also grant the raid boss pokemon to the MVP!
        adoptPet(guildId, c.user_id, raid.boss_species_id, raid.boss_name);
      } else if (i < 5) {
        giveItem(userEco, "ultraball", 3);
        giveItem(userEco, "caramelo_raro", 1);
      } else {
        giveItem(userEco, "superball", 2);
      }
      saveEco(userEco, `Recompensa de Incursión: ${raid.boss_name}`);
    }

    rewardsSummary = `🏆 **¡${raid.boss_name} HA SIDO DERROTADO!**\n` +
      `Se han repartido **${n(raid.reward_coins)}** entre los ${contributors.length} combatientes.\n` +
      `👑 **MVP:** <@${contributors[0]?.user_id}> se lleva a **${raid.boss_name}**, 1 Master Ball 🟣 y 3 Caramelos Raros 🍬!`;
  }

  return {
    ok: true,
    message: `¡**${pet.name}** atacó con **${species.skillName}** causando **${damage.toLocaleString()} de daño**${isCritical ? " *(¡GOLPE CRÍTICO!)*" : ""}!`,
    damage,
    critical: isCritical,
    bossHpRemaining: newHp,
    bossDefeated: defeated,
    pet,
    species,
    raid: { ...raid, current_hp: newHp, status: defeated ? "defeated" : "active" },
    rewardsSummary,
  };
}
