import {
  getRpgPlayer,
  createRpgPlayer,
  saveRpgPlayer,
  getRpgTopPlayers,
  createRpgClan,
  getRpgClan,
  getRpgClanByName,
  getUserRpgClan,
  addRpgClanMember,
  getRpgClanApplication,
  getRpgClanApplicationForUser,
  getRpgClanApplications,
  createRpgClanApplication,
  approveRpgClanApplication,
  rejectRpgClanApplication,
  setRpgClanMemberRole,
  removeRpgClanMember,
  getRpgClanMembers,
  getRpgTopClans,
  updateRpgClan,
  deleteRpgClan,
  transferRpgClanLeadership,
  type RpgPlayerRow,
  type RpgClanRow,
  type RpgClanMemberRole,
  type RpgClanApplicationRow,
} from "../../database/index.js";
import { RPG_CLASSES, type RpgClassDef } from "../../constants.js";
import { addWallet, getEco, saveEco, checkActivityDrop } from "../economy/engine.js";

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.32, level - 1));
}

export function getOrCreatePlayer(guildId: string, userId: string): RpgPlayerRow {
  let player = getRpgPlayer(guildId, userId);
  if (!player) {
    const defaultClass = RPG_CLASSES["guerrero"]!;
    player = createRpgPlayer(guildId, userId, "guerrero", {
      hp: defaultClass.baseHp,
      attack: defaultClass.baseAttack,
      defense: defaultClass.baseDefense,
      speed: defaultClass.baseSpeed,
    });
  }
  return player;
}

export function switchClass(player: RpgPlayerRow, newClassId: string): boolean {
  const classDef = RPG_CLASSES[newClassId];
  if (!classDef) return false;
  player.class = newClassId;
  const lvlBonus = player.level - 1;
  player.max_hp = classDef.baseHp + lvlBonus * 16;
  player.hp = Math.min(player.hp, player.max_hp);
  player.attack = classDef.baseAttack + lvlBonus * 4;
  player.defense = classDef.baseDefense + lvlBonus * 3;
  player.speed = classDef.baseSpeed + lvlBonus * 2;
  saveRpgPlayer(player);
  return true;
}

export function addPlayerXp(player: RpgPlayerRow, amount: number): { leveledUp: boolean; oldLevel: number; newLevel: number } {
  player.xp += amount;
  const oldLevel = player.level;
  let leveledUp = false;

  while (player.xp >= xpForLevel(player.level)) {
    player.xp -= xpForLevel(player.level);
    player.level += 1;
    leveledUp = true;
    player.max_hp += 16;
    player.hp = player.max_hp;
    player.attack += 4;
    player.defense += 3;
    player.speed += 2;
    player.potions += 1;
  }

  saveRpgPlayer(player);
  return { leveledUp, oldLevel, newLevel: player.level };
}

export interface Monster {
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xpReward: number;
  coinReward: [number, number];
}

export const RPG_COOLDOWNS = {
  battle: 10_000,  // 10 segundos entre batallas de monstruos
  dungeon: 30_000, // 30 segundos entre desafíos a jefes de mazmorra
};

export function getRandomMonster(playerLevel: number): { monster: Monster; zone: string } {
  if (playerLevel <= 3) {
    const pool = [
      { name: "Slime Ácido", emoji: "🧪", hp: 60, attack: 11, defense: 5, xp: 45, coins: [15, 35] as [number, number] },
      { name: "Duende Ratero", emoji: "👺", hp: 75, attack: 14, defense: 6, xp: 60, coins: [20, 45] as [number, number] },
      { name: "Lobo de las Sombras", emoji: "🐺", hp: 85, attack: 16, defense: 7, xp: 75, coins: [25, 60] as [number, number] },
    ];
    const m = pool[Math.floor(Math.random() * pool.length)]!;
    return {
      monster: { name: m.name, emoji: m.emoji, hp: m.hp, maxHp: m.hp, attack: m.attack, defense: m.defense, xpReward: m.xp, coinReward: m.coins },
      zone: "Bosque de Sombras 🌲",
    };
  }
  if (playerLevel <= 7) {
    const pool = [
      { name: "Esqueleto Guerrero", emoji: "💀", hp: 120, attack: 22, defense: 12, xp: 110, coins: [45, 90] as [number, number] },
      { name: "Nigromante Menor", emoji: "🧙‍♂️", hp: 105, attack: 28, defense: 10, xp: 130, coins: [55, 110] as [number, number] },
      { name: "Gárgola Pétrea", emoji: "🗿", hp: 140, attack: 20, defense: 18, xp: 150, coins: [65, 130] as [number, number] },
    ];
    const m = pool[Math.floor(Math.random() * pool.length)]!;
    return {
      monster: { name: m.name, emoji: m.emoji, hp: m.hp, maxHp: m.hp, attack: m.attack, defense: m.defense, xpReward: m.xp, coinReward: m.coins },
      zone: "Cripta Olvidada 🕯️",
    };
  }
  if (playerLevel <= 12) {
    const pool = [
      { name: "Golem de Magma", emoji: "🌋", hp: 200, attack: 34, defense: 22, xp: 220, coins: [90, 180] as [number, number] },
      { name: "Dragón Joven", emoji: "🐉", hp: 180, attack: 40, defense: 18, xp: 260, coins: [110, 220] as [number, number] },
      { name: "Elemental de Fuego", emoji: "🔥", hp: 160, attack: 44, defense: 15, xp: 280, coins: [120, 240] as [number, number] },
    ];
    const m = pool[Math.floor(Math.random() * pool.length)]!;
    return {
      monster: { name: m.name, emoji: m.emoji, hp: m.hp, maxHp: m.hp, attack: m.attack, defense: m.defense, xpReward: m.xp, coinReward: m.coins },
      zone: "Ruinas Volcánicas 🌋",
    };
  }

  const pool = [
    { name: "Caballero del Vacío", emoji: "⚔️", hp: 280, attack: 52, defense: 30, xp: 400, coins: [160, 320] as [number, number] },
    { name: "Quimera Ancestral", emoji: "🦁", hp: 320, attack: 56, defense: 28, xp: 480, coins: [190, 380] as [number, number] },
    { name: "Titán del Ocaso", emoji: "⚡", hp: 380, attack: 62, defense: 35, xp: 600, coins: [230, 450] as [number, number] },
  ];
  const m = pool[Math.floor(Math.random() * pool.length)]!;
  return {
    monster: { name: m.name, emoji: m.emoji, hp: m.hp, maxHp: m.hp, attack: m.attack, defense: m.defense, xpReward: m.xp, coinReward: m.coins },
    zone: "Abismo Celestial 🌌",
  };
}

export function getDungeonBoss(floor: number): Monster {
  const bosses = [
    { name: "Rey Trasgo", emoji: "👑", hp: 120, attack: 20, defense: 10, xp: 150, coins: [75, 150] as [number, number] },
    { name: "Nigromante Supremo", emoji: "🧙", hp: 180, attack: 28, defense: 14, xp: 250, coins: [120, 240] as [number, number] },
    { name: "Minotauro Sangriento", emoji: "🐂", hp: 260, attack: 38, defense: 20, xp: 400, coins: [180, 360] as [number, number] },
    { name: "Hidra Abisal", emoji: "🐍", hp: 350, attack: 48, defense: 25, xp: 600, coins: [260, 500] as [number, number] },
    { name: "Archimago Oscuro", emoji: "🔮", hp: 440, attack: 58, defense: 28, xp: 850, coins: [380, 700] as [number, number] },
    { name: "Dragón de Obsidiana", emoji: "🐉", hp: 550, attack: 68, defense: 35, xp: 1200, coins: [500, 950] as [number, number] },
    { name: "Señor de las Sombras", emoji: "🌑", hp: 700, attack: 80, defense: 42, xp: 1800, coins: [700, 1300] as [number, number] },
    { name: "Guardián del Destino", emoji: "⭐", hp: 900, attack: 95, defense: 50, xp: 2600, coins: [1000, 1900] as [number, number] },
  ];

  const idx = Math.min(floor - 1, bosses.length - 1);
  const b = bosses[idx]!;
  const mult = floor > bosses.length ? 1 + (floor - bosses.length) * 0.12 : 1;
  return {
    name: `${b.name} (Piso ${floor})`,
    emoji: b.emoji,
    hp: Math.floor(b.hp * mult),
    maxHp: Math.floor(b.hp * mult),
    attack: Math.floor(b.attack * mult),
    defense: Math.floor(b.defense * mult),
    xpReward: Math.floor(b.xp * mult),
    coinReward: [Math.floor(b.coins[0] * mult), Math.floor(b.coins[1] * mult)],
  };
}

export interface BattleResult {
  won: boolean;
  rounds: string[];
  playerHpLeft: number;
  monsterHpLeft: number;
  xpGained: number;
  coinsGained: number;
  leveledUp: boolean;
  newLevel?: number;
  clanScoreGained: number;
  potionUsed: boolean;
}

export function executeRpgBattle(
  player: RpgPlayerRow,
  monster: Monster,
  isDungeon = false,
): BattleResult {
  if (isDungeon) {
    player.last_dungeon_at = Date.now();
  } else {
    player.last_battle_at = Date.now();
  }
  const rounds: string[] = [];
  let playerHp = player.hp;
  let monsterHp = monster.hp;
  let potionUsed = false;

  for (let round = 1; round <= 10; round++) {
    if (player.class === "paladin" && playerHp > 0) {
      const heal = Math.max(4, Math.floor(player.max_hp * 0.08));
      playerHp = Math.min(player.max_hp, playerHp + heal);
      rounds.push(`🛡️ **Bendición Sagrada**: Te regeneras +${heal} HP (${playerHp}/${player.max_hp} HP).`);
    }

    if (playerHp < player.max_hp * 0.25 && player.potions > 0 && !potionUsed) {
      const healAmount = Math.floor(player.max_hp * 0.5);
      playerHp = Math.min(player.max_hp, playerHp + healAmount);
      player.potions -= 1;
      potionUsed = true;
      rounds.push(`🧪 ¡Poción de emergencia! Recuperas +${healAmount} HP (${playerHp}/${player.max_hp} HP).`);
    }

    let baseAtk = player.attack;
    if (player.class === "mago") {
      baseAtk = Math.floor(baseAtk * 1.3);
    }
    let isCrit = false;
    if (player.class === "picaro" && Math.random() < 0.28) {
      baseAtk *= 2;
      isCrit = true;
    } else if (Math.random() < 0.1) {
      baseAtk = Math.floor(baseAtk * 1.5);
      isCrit = true;
    }

    let enemyDef = monster.defense;
    if (player.class === "cazador") {
      enemyDef = Math.floor(enemyDef * 0.7);
    }

    const variance = 0.85 + Math.random() * 0.3;
    const playerDmg = Math.max(6, Math.floor((baseAtk - enemyDef * 0.5) * variance));
    monsterHp = Math.max(0, monsterHp - playerDmg);

    const critText = isCrit ? " 💥 **¡GOLPE CRÍTICO!**" : "";
    rounds.push(`⚔️ Turno ${round}: Atacas a **${monster.name}** causando **${playerDmg}** de daño.${critText} (${monsterHp}/${monster.maxHp} HP)`);

    if (monsterHp <= 0) break;

    let playerDef = player.defense;
    if (player.class === "guerrero") {
      playerDef = Math.floor(playerDef * 1.2);
    }
    const monsterVariance = 0.85 + Math.random() * 0.3;
    const monsterDmg = Math.max(4, Math.floor((monster.attack - playerDef * 0.5) * monsterVariance));
    playerHp = Math.max(0, playerHp - monsterDmg);

    rounds.push(`👹 ${monster.emoji} **${monster.name}** contraataca causando **${monsterDmg}** de daño. (${playerHp}/${player.max_hp} HP)`);

    if (playerHp <= 0) break;
  }

  const won = monsterHp <= 0 && playerHp > 0;
  player.hp = Math.max(1, playerHp);

  let xpGained = 0;
  let coinsGained = 0;
  let clanScoreGained = 0;
  let leveledUp = false;
  let newLevel: number | undefined;

  if (won) {
    player.wins += 1;
    xpGained = monster.xpReward;
    const [cMin, cMax] = monster.coinReward;
    coinsGained = cMin + Math.floor(Math.random() * (cMax - cMin + 1));
    clanScoreGained = isDungeon ? 45 : 15;

    const xpRes = addPlayerXp(player, xpGained);
    leveledUp = xpRes.leveledUp;
    if (leveledUp) newLevel = xpRes.newLevel;

    if (isDungeon) {
      player.dungeon_floor += 1;
      clanScoreGained += player.dungeon_floor * 10;
    }

    const eco = getEco(player.guild_id, player.user_id);
    addWallet(eco, coinsGained);
    saveEco(eco);

    if (player.clan_id) {
      const clan = getRpgClan(player.guild_id, player.clan_id);
      if (clan) {
        clan.score += clanScoreGained;
        clan.xp += xpGained;
        if (clan.xp >= clan.level * 500) {
          clan.level += 1;
          clan.xp = 0;
        }
        updateRpgClan(clan);
      }
    }
  } else {
    player.losses += 1;
  }

  saveRpgPlayer(player);

  return {
    won,
    rounds,
    playerHpLeft: player.hp,
    monsterHpLeft: monsterHp,
    xpGained,
    coinsGained,
    leveledUp,
    newLevel,
    clanScoreGained,
    potionUsed,
  };
}

export {
  getRpgPlayer,
  createRpgPlayer,
  saveRpgPlayer,
  getRpgTopPlayers,
  createRpgClan,
  getRpgClan,
  getRpgClanByName,
  getUserRpgClan,
  addRpgClanMember,
  getRpgClanApplication,
  getRpgClanApplicationForUser,
  getRpgClanApplications,
  createRpgClanApplication,
  approveRpgClanApplication,
  rejectRpgClanApplication,
  setRpgClanMemberRole,
  removeRpgClanMember,
  getRpgClanMembers,
  getRpgTopClans,
  updateRpgClan,
  deleteRpgClan,
  transferRpgClanLeadership,
  type RpgPlayerRow,
  type RpgClanRow,
  type RpgClanMemberRole,
  type RpgClanApplicationRow,
};
