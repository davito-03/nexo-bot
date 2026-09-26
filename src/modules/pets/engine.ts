import { getDb } from "../../database/index.js";
import { getEco, saveEco, invOf, setInv, giveItem, takeItem, hasItem, n, totalFunds, deductFundsDetailed, refundFunds } from "../economy/engine.js";
import {
  POKEMON_CATALOG,
  ALL_POKEMON_LIST,
  getPokemonById,
  getPokemonByRegion,
  type PetSpeciesDef,
  type PokemonRarity,
  type PokemonRegion,
} from "./catalog.js";

export {
  POKEMON_CATALOG,
  ALL_POKEMON_LIST,
  getPokemonById,
  getPokemonByRegion,
  type PetSpeciesDef,
  type PokemonRarity,
  type PokemonRegion,
};

export const PET_SPECIES = POKEMON_CATALOG;
export type PetSpecies = keyof typeof POKEMON_CATALOG;

export const MAX_PETS_PER_USER = 50;
export const MAX_DAYCARE_PER_USER = 2;

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

export interface DaycareEntry {
  guild_id: string;
  user_id: string;
  pet_id: number;
  deposited_at: number;
  cost_per_hour: number;
}

export interface GymLeaderDef {
  id: string;
  name: string;
  city: string;
  region: PokemonRegion;
  order: number;
  badgeId: string;
  badgeName: string;
  badgeEmoji: string;
  reqBadge?: string;
  leaderTitle: string;
  quote: string;
  avatarUrl: string;
  pokemon: {
    name: string;
    speciesId: string;
    level: number;
    types: string[];
    hp: number;
    atk: number;
    def: number;
    spd: number;
    moveName: string;
    moveDesc: string;
    spriteUrl: string;
  };
  rewardCoins: number;
  rewardExp: number;
}

export const ALL_GYM_LEADERS: GymLeaderDef[] = [
  // ── KANTO ──
  {
    id: "brock",
    name: "Brock",
    city: "Ciudad Plateada",
    region: "kanto",
    order: 1,
    badgeId: "kanto_roca",
    badgeName: "Medalla Roca",
    badgeEmoji: "🪨",
    leaderTitle: "El líder de roca impenetrable",
    quote: "¡Mi determinación es tan sólida como una roca!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/1.png",
    pokemon: {
      name: "Onix",
      speciesId: "onix",
      level: 14,
      types: ["roca", "tierra"],
      hp: 175,
      atk: 65,
      def: 130,
      spd: 55,
      moveName: "Tumba Rocas",
      moveDesc: "Lanza peñascos masivos que sepultan al oponente.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/onix.gif",
    },
    rewardCoins: 15_000,
    rewardExp: 150,
  },
  {
    id: "misty",
    name: "Misty",
    city: "Ciudad Celeste",
    region: "kanto",
    order: 2,
    badgeId: "kanto_cascada",
    badgeName: "Medalla Cascada",
    badgeEmoji: "💧",
    reqBadge: "kanto_roca",
    leaderTitle: "La sirena temperamental",
    quote: "¡Mi estrategia con los Pokémon acuáticos es impenetrable!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/2.png",
    pokemon: {
      name: "Starmie",
      speciesId: "starmie",
      level: 21,
      types: ["agua", "psiquico"],
      hp: 210,
      atk: 95,
      def: 90,
      spd: 120,
      moveName: "Hidropulso",
      moveDesc: "Genera una onda marina envolvente con daño veloz.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/starmie.gif",
    },
    rewardCoins: 25_000,
    rewardExp: 250,
  },
  {
    id: "lt_surge",
    name: "Lt. Surge",
    city: "Ciudad Carmín",
    region: "kanto",
    order: 3,
    badgeId: "kanto_trueno",
    badgeName: "Medalla Trueno",
    badgeEmoji: "⚡",
    reqBadge: "kanto_cascada",
    leaderTitle: "El rayo americano",
    quote: "¡En combate, la potencia y la electricidad deciden la victoria!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/3.png",
    pokemon: {
      name: "Raichu",
      speciesId: "raichu",
      level: 28,
      types: ["electrico"],
      hp: 250,
      atk: 125,
      def: 85,
      spd: 135,
      moveName: "Rayo",
      moveDesc: "Descarga de diez mil voltios directa y contundente.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/raichu.gif",
    },
    rewardCoins: 35_000,
    rewardExp: 350,
  },
  {
    id: "erika",
    name: "Erika",
    city: "Ciudad Azulona",
    region: "kanto",
    order: 4,
    badgeId: "kanto_arcoiris",
    badgeName: "Medalla Arcoíris",
    badgeEmoji: "🌈",
    reqBadge: "kanto_trueno",
    leaderTitle: "La princesa de la naturaleza",
    quote: "Mis Pokémon florecen con dulzura, pero ocultan fuertes espinas.",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/4.png",
    pokemon: {
      name: "Vileplume",
      speciesId: "vileplume",
      level: 35,
      types: ["planta", "veneno"],
      hp: 310,
      atk: 140,
      def: 115,
      spd: 80,
      moveName: "Danza Pétalo",
      moveDesc: "Desata un huracán de pétalos aromáticos y tóxicos.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/vileplume.gif",
    },
    rewardCoins: 45_000,
    rewardExp: 450,
  },
  {
    id: "koga",
    name: "Koga",
    city: "Ciudad Fucsia",
    region: "kanto",
    order: 5,
    badgeId: "kanto_alma",
    badgeName: "Medalla Alma",
    badgeEmoji: "🟣",
    reqBadge: "kanto_arcoiris",
    leaderTitle: "El maestro ninja venenoso",
    quote: "¡El arte ninja consiste en someter al enemigo con sigilo y veneno!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/5.png",
    pokemon: {
      name: "Weezing",
      speciesId: "weezing",
      level: 43,
      types: ["veneno"],
      hp: 360,
      atk: 155,
      def: 160,
      spd: 90,
      moveName: "Bomba Lodo",
      moveDesc: "Lanza gases cáusticos y esferas de ponzoña espesa.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/weezing.gif",
    },
    rewardCoins: 60_000,
    rewardExp: 600,
  },
  {
    id: "sabrina",
    name: "Sabrina",
    city: "Ciudad Azafrán",
    region: "kanto",
    order: 6,
    badgeId: "kanto_pantano",
    badgeName: "Medalla Pantano",
    badgeEmoji: "🔮",
    reqBadge: "kanto_alma",
    leaderTitle: "La maestra de la telequinesis",
    quote: "Ya pude ver el desenlace de esta batalla antes de que entraras...",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/6.png",
    pokemon: {
      name: "Alakazam",
      speciesId: "alakazam",
      level: 48,
      types: ["psiquico"],
      hp: 390,
      atk: 195,
      def: 95,
      spd: 175,
      moveName: "Psíquico",
      moveDesc: "Aplastante torrente mental que curva la realidad.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/alakazam.gif",
    },
    rewardCoins: 75_000,
    rewardExp: 750,
  },
  {
    id: "blaine",
    name: "Blaine",
    city: "Isla Canela",
    region: "kanto",
    order: 7,
    badgeId: "kanto_volcan",
    badgeName: "Medalla Volcán",
    badgeEmoji: "🔥",
    reqBadge: "kanto_pantano",
    leaderTitle: "El entusiasta del fuego",
    quote: "¡Mejor que tengas pomada para quemaduras! ¡Mis llamas rugen!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/7.png",
    pokemon: {
      name: "Magmar",
      speciesId: "magmar",
      level: 54,
      types: ["fuego"],
      hp: 440,
      atk: 185,
      def: 110,
      spd: 140,
      moveName: "Llamarada",
      moveDesc: "Estallido en forma de kanji ardiente a más de 2000 grados.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/magmar.gif",
    },
    rewardCoins: 90_000,
    rewardExp: 900,
  },
  {
    id: "giovanni",
    name: "Giovanni",
    city: "Ciudad Verde",
    region: "kanto",
    order: 8,
    badgeId: "kanto_tierra",
    badgeName: "Medalla Tierra",
    badgeEmoji: "🌍",
    reqBadge: "kanto_volcan",
    leaderTitle: "Líder de Gimnasio y Jefe del Team Rocket",
    quote: "La fuerza absoluta aplasta cualquier ideal infantil. ¡Contempla el poder de la tierra!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/8.png",
    pokemon: {
      name: "Rhydon",
      speciesId: "rhydon",
      level: 60,
      types: ["tierra", "roca"],
      hp: 530,
      atk: 220,
      def: 180,
      spd: 85,
      moveName: "Terremoto",
      moveDesc: "Fractura tectónica colosal que devasta el terreno.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/rhydon.gif",
    },
    rewardCoins: 120_000,
    rewardExp: 1_200,
  },

  // ── JOHTO ──
  {
    id: "falkner",
    name: "Pegaso",
    city: "Ciudad Malva",
    region: "johto",
    order: 1,
    badgeId: "johto_cefiro",
    badgeName: "Medalla Céfiro",
    badgeEmoji: "🪶",
    leaderTitle: "El elegante dominador de los cielos",
    quote: "¡Los Pokémon pájaro vuelan con majestuosidad y atacan con precisión!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/17.png",
    pokemon: {
      name: "Pidgeotto",
      speciesId: "pidgeotto",
      level: 15,
      types: ["normal", "volador"],
      hp: 190,
      atk: 75,
      def: 65,
      spd: 90,
      moveName: "Tornado",
      moveDesc: "Genera una corriente de viento que azota con furia.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/pidgeotto.gif",
    },
    rewardCoins: 20_000,
    rewardExp: 200,
  },
  {
    id: "bugsy",
    name: "Antón",
    city: "Pueblo Azalea",
    region: "johto",
    order: 2,
    badgeId: "johto_colmena",
    badgeName: "Medalla Colmena",
    badgeEmoji: "🐝",
    reqBadge: "johto_cefiro",
    leaderTitle: "La enciclopedia andante de los bichos",
    quote: "¡Nunca subestimes a los Pokémon bicho, pueden partir rocas en dos!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/18.png",
    pokemon: {
      name: "Scyther",
      speciesId: "scyther",
      level: 22,
      types: ["bicho", "volador"],
      hp: 230,
      atk: 120,
      def: 85,
      spd: 130,
      moveName: "Corte Furia",
      moveDesc: "Asesta tajos dobles que multiplican su ferocidad.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/scyther.gif",
    },
    rewardCoins: 30_000,
    rewardExp: 300,
  },
  {
    id: "whitney",
    name: "Blanca",
    city: "Ciudad Trigal",
    region: "johto",
    order: 3,
    badgeId: "johto_planicie",
    badgeName: "Medalla Planicie",
    badgeEmoji: "🥛",
    reqBadge: "johto_colmena",
    leaderTitle: "La chica más tierna de Johto",
    quote: "¡Mis Pokémon son supermonos! Pero cuando se enfadan... ¡prepárate!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/19.png",
    pokemon: {
      name: "Miltank",
      speciesId: "miltank",
      level: 29,
      types: ["normal"],
      hp: 310,
      atk: 110,
      def: 135,
      spd: 120,
      moveName: "Desenrollar",
      moveDesc: "Rueda a toda velocidad aplastando todo a su paso.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/miltank.gif",
    },
    rewardCoins: 45_000,
    rewardExp: 450,
  },
  {
    id: "morty",
    name: "Morti",
    city: "Ciudad Iris",
    region: "johto",
    order: 4,
    badgeId: "johto_niebla",
    badgeName: "Medalla Niebla",
    badgeEmoji: "👻",
    reqBadge: "johto_planicie",
    leaderTitle: "El místico vidente del más allá",
    quote: "He dedicado mi vida al entrenamiento silencioso junto a los espectros.",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/20.png",
    pokemon: {
      name: "Gengar",
      speciesId: "gengar",
      level: 36,
      types: ["fantasma", "veneno"],
      hp: 320,
      atk: 160,
      def: 90,
      spd: 155,
      moveName: "Bola Sombra",
      moveDesc: "Dispara una densa esfera de energía espectral pura.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/gengar.gif",
    },
    rewardCoins: 60_000,
    rewardExp: 600,
  },
  {
    id: "chuck",
    name: "Aníbal",
    city: "Ciudad Orquídea",
    region: "johto",
    order: 5,
    badgeId: "johto_tormenta",
    badgeName: "Medalla Tormenta",
    badgeEmoji: "🥊",
    reqBadge: "johto_niebla",
    leaderTitle: "El musculoso de los puños de acero",
    quote: "¡Entrenar bajo las cascadas templa el cuerpo y el espíritu marcial!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/21.png",
    pokemon: {
      name: "Poliwrath",
      speciesId: "poliwrath",
      level: 42,
      types: ["agua", "lucha"],
      hp: 390,
      atk: 150,
      def: 130,
      spd: 100,
      moveName: "Puñodinamita",
      moveDesc: "Puñetazo explosivo que desestabiliza las defensas.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/poliwrath.gif",
    },
    rewardCoins: 75_000,
    rewardExp: 750,
  },
  {
    id: "jasmine",
    name: "Yasmina",
    city: "Ciudad Olivo",
    region: "johto",
    order: 6,
    badgeId: "johto_mineral",
    badgeName: "Medalla Mineral",
    badgeEmoji: "🛡️",
    reqBadge: "johto_tormenta",
    leaderTitle: "La chica de la coraza de acero",
    quote: "Aunque parezca tímida... el acero de mis compañeros jamás cede.",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/22.png",
    pokemon: {
      name: "Steelix",
      speciesId: "steelix",
      level: 48,
      types: ["acero", "tierra"],
      hp: 440,
      atk: 165,
      def: 240,
      spd: 60,
      moveName: "Cola Férrea",
      moveDesc: "Golpe colosal de cola de acero templado diamantino.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/steelix.gif",
    },
    rewardCoins: 90_000,
    rewardExp: 900,
  },
  {
    id: "pryce",
    name: "Fredo",
    city: "Pueblo Caoba",
    region: "johto",
    order: 7,
    badgeId: "johto_glaciar",
    badgeName: "Medalla Glaciar",
    badgeEmoji: "❄️",
    reqBadge: "johto_mineral",
    leaderTitle: "El maestro del invierno perpetuo",
    quote: "El frío enseña paciencia y severidad. ¡Siente la escarcha eterna!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/23.png",
    pokemon: {
      name: "Piloswine",
      speciesId: "piloswine",
      level: 53,
      types: ["hielo", "tierra"],
      hp: 490,
      atk: 175,
      def: 120,
      spd: 85,
      moveName: "Ventisca",
      moveDesc: "Ráfaga bajo cero que congela el campo de batalla.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/piloswine.gif",
    },
    rewardCoins: 105_000,
    rewardExp: 1_050,
  },
  {
    id: "clair",
    name: "Débora",
    city: "Ciudad Endrino",
    region: "johto",
    order: 8,
    badgeId: "johto_dragon",
    badgeName: "Medalla Dragón",
    badgeEmoji: "🐉",
    reqBadge: "johto_glaciar",
    leaderTitle: "La bendecida por el clan de dragones",
    quote: "¡Desciendo del linaje dragón más puro! ¡No aceptarás una derrota fácil!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/24.png",
    pokemon: {
      name: "Kingdra",
      speciesId: "kingdra",
      level: 62,
      types: ["agua", "dragon"],
      hp: 520,
      atk: 195,
      def: 170,
      spd: 140,
      moveName: "Hidropulso Dracónico",
      moveDesc: "Tormenta de remolinos marinos y aliento de dragón místico.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/kingdra.gif",
    },
    rewardCoins: 150_000,
    rewardExp: 1_500,
  },

  // ── HOENN ──
  {
    id: "roxanne",
    name: "Petra",
    city: "Ciudad Férrica",
    region: "hoenn",
    order: 1,
    badgeId: "hoenn_piedra",
    badgeName: "Medalla Piedra",
    badgeEmoji: "🪨",
    leaderTitle: "La alumna predilecta de la academia",
    quote: "He estudiado a fondo la geología Pokémon. ¡Demuestra tus conocimientos!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/33.png",
    pokemon: {
      name: "Nosepass",
      speciesId: "nosepass",
      level: 16,
      types: ["roca"],
      hp: 180,
      atk: 65,
      def: 165,
      spd: 50,
      moveName: "Tumba Rocas",
      moveDesc: "Aprisiona al contrincante bajo bloques de piedra magnética.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/nosepass.gif",
    },
    rewardCoins: 25_000,
    rewardExp: 250,
  },
  {
    id: "brawly",
    name: "Marcial",
    city: "Pueblo Azuliza",
    region: "hoenn",
    order: 2,
    badgeId: "hoenn_puno",
    badgeName: "Medalla Puño",
    badgeEmoji: "🥊",
    reqBadge: "hoenn_piedra",
    leaderTitle: "El surfista de las olas gigantes",
    quote: "¡El combate y el surf son iguales: equilibrio, agilidad y fuerza!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/34.png",
    pokemon: {
      name: "Makuhita",
      speciesId: "makuhita",
      level: 24,
      types: ["lucha"],
      hp: 270,
      atk: 115,
      def: 75,
      spd: 60,
      moveName: "Empujón",
      moveDesc: "Serie rítmica de golpes con la palma de la mano.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/makuhita.gif",
    },
    rewardCoins: 35_000,
    rewardExp: 350,
  },
  {
    id: "wattson",
    name: "Erico",
    city: "Ciudad Malvalona",
    region: "hoenn",
    order: 3,
    badgeId: "hoenn_dinamo",
    badgeName: "Medalla Dinamo",
    badgeEmoji: "⚡",
    reqBadge: "hoenn_puno",
    leaderTitle: "El alegre maestro de los voltios",
    quote: "¡Jajaja! ¡Una descarga de buen humor y alto voltaje anima a cualquiera!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/35.png",
    pokemon: {
      name: "Manectric",
      speciesId: "manectric",
      level: 31,
      types: ["electrico"],
      hp: 290,
      atk: 145,
      def: 85,
      spd: 160,
      moveName: "Onda Voltio",
      moveDesc: "Chispa de alta frecuencia que nunca pierde su blanco.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/manectric.gif",
    },
    rewardCoins: 50_000,
    rewardExp: 500,
  },
  {
    id: "flannery",
    name: "Candela",
    city: "Pueblo Lavacalda",
    region: "hoenn",
    order: 4,
    badgeId: "hoenn_calor",
    badgeName: "Medalla Calor",
    badgeEmoji: "🔥",
    reqBadge: "hoenn_dinamo",
    leaderTitle: "La pasión ardiente del volcán",
    quote: "¡No intentes apagar mi fuego! ¡Voy a darlo absolutamente todo!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/36.png",
    pokemon: {
      name: "Torkoal",
      speciesId: "torkoal",
      level: 38,
      types: ["fuego"],
      hp: 360,
      atk: 135,
      def: 180,
      spd: 45,
      moveName: "Sofoco",
      moveDesc: "Erupción de calor abrasador desde su caparazón carbonero.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/torkoal.gif",
    },
    rewardCoins: 70_000,
    rewardExp: 700,
  },
  {
    id: "norman",
    name: "Norman",
    city: "Ciudad Petalia",
    region: "hoenn",
    order: 5,
    badgeId: "hoenn_equilibrio",
    badgeName: "Medalla Equilibrio",
    badgeEmoji: "⚖️",
    reqBadge: "hoenn_calor",
    leaderTitle: "El padre implacable y equilibrado",
    quote: "He esperado este combate con ansias. No me contendré lo más mínimo.",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/37.png",
    pokemon: {
      name: "Slaking",
      speciesId: "slaking",
      level: 45,
      types: ["normal"],
      hp: 520,
      atk: 220,
      def: 140,
      spd: 130,
      moveName: "Golpe Cuerpo Titánico",
      moveDesc: "Descarga todo su colosal peso corporal en una embestida brutal.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/slaking.gif",
    },
    rewardCoins: 90_000,
    rewardExp: 900,
  },
  {
    id: "winona",
    name: "Alana",
    city: "Ciudad Arborada",
    region: "hoenn",
    order: 6,
    badgeId: "hoenn_pluma",
    badgeName: "Medalla Pluma",
    badgeEmoji: "🪽",
    reqBadge: "hoenn_equilibrio",
    leaderTitle: "La danzarina de las corrientes de aire",
    quote: "Me he fundido con el viento. ¡Asciende hasta las nubes conmigo!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/38.png",
    pokemon: {
      name: "Altaria",
      speciesId: "altaria",
      level: 51,
      types: ["dragon", "volador"],
      hp: 430,
      atk: 155,
      def: 150,
      spd: 130,
      moveName: "Danza Dragón & Pulso",
      moveDesc: "Movimiento grácil que invoca ráfagas de energía celestial.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/altaria.gif",
    },
    rewardCoins: 110_000,
    rewardExp: 1_100,
  },
  {
    id: "tate_liza",
    name: "Vito y Leti",
    city: "Ciudad Algaria",
    region: "hoenn",
    order: 7,
    badgeId: "hoenn_mente",
    badgeName: "Medalla Mente",
    badgeEmoji: "🔮",
    reqBadge: "hoenn_pluma",
    leaderTitle: "Los gemelos telepáticos del sol y la luna",
    quote: "Nuestras mentes son una sola. ¡Sentirás el poder de la gravedad astral!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/39.png",
    pokemon: {
      name: "Solrock",
      speciesId: "solrock",
      level: 57,
      types: ["roca", "psiquico"],
      hp: 470,
      atk: 175,
      def: 145,
      spd: 120,
      moveName: "Rayo Solar Cósmico",
      moveDesc: "Descarga de energía estelar concentrada con precisión psíquica.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/solrock.gif",
    },
    rewardCoins: 130_000,
    rewardExp: 1_300,
  },
  {
    id: "wallace",
    name: "Plubio",
    city: "Ciudad Arrecípolis",
    region: "hoenn",
    order: 8,
    badgeId: "hoenn_lluvia",
    badgeName: "Medalla Lluvia",
    badgeEmoji: "💧",
    reqBadge: "hoenn_mente",
    leaderTitle: "El artista de las aguas cristalinas",
    quote: "¡El agua es gracia, belleza e inmenso poder! ¡Baila bajo mi lluvia!",
    avatarUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/40.png",
    pokemon: {
      name: "Milotic",
      speciesId: "milotic",
      level: 65,
      types: ["agua"],
      hp: 550,
      atk: 180,
      def: 165,
      spd: 135,
      moveName: "Hidrobomba Majestuosa",
      moveDesc: "Tsunami imponente que envuelve el campo en gracia acuática.",
      spriteUrl: "https://play.pokemonshowdown.com/sprites/ani/milotic.gif",
    },
    rewardCoins: 180_000,
    rewardExp: 1_800,
  },
];

export function getGymLeaders(region?: PokemonRegion): GymLeaderDef[] {
  if (!region) return ALL_GYM_LEADERS;
  return ALL_GYM_LEADERS.filter((l) => l.region === region);
}

export function getGymLeader(id: string): GymLeaderDef | undefined {
  const clean = id.toLowerCase().trim();
  return ALL_GYM_LEADERS.find((l) => l.id === clean || l.badgeId === clean || l.name.toLowerCase() === clean);
}

export function getUserBadges(guildId: string, userId: string): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT badge_id FROM user_gym_badges WHERE guild_id = ? AND user_id = ?").all(guildId, userId) as {
    badge_id: string;
  }[];
  return rows.map((r) => r.badge_id);
}

export function awardBadge(guildId: string, userId: string, badgeId: string): void {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO user_gym_badges (guild_id, user_id, badge_id, beaten_at) VALUES (?, ?, ?, ?)",
  ).run(guildId, userId, badgeId, Date.now());
}

export function renderBadgeCase(badges: string[], region?: PokemonRegion): string {
  const leaders = getGymLeaders(region);
  const badgeSet = new Set(badges);
  const lines: string[] = [];

  for (const l of leaders) {
    const has = badgeSet.has(l.badgeId);
    const icon = has ? l.badgeEmoji : "⚪";
    const status = has ? `**${l.badgeName}** ✅` : `${l.badgeName} 🔒 (*Derrota a ${l.name} en ${l.city}*)`;
    lines.push(`${icon} ${status}`);
  }

  const obtainedCount = leaders.filter((l) => badgeSet.has(l.badgeId)).length;
  return `**Medallas Conseguidas:** ${obtainedCount}/${leaders.length}\n\n` + lines.join("\n");
}

export function getUserPokedex(guildId: string, userId: string): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT species_id FROM user_pokedex WHERE guild_id = ? AND user_id = ?").all(guildId, userId) as {
    species_id: string;
  }[];
  return rows.map((r) => r.species_id);
}

export function registerPokedex(guildId: string, userId: string, speciesId: string): boolean {
  const db = getDb();
  const clean = speciesId.toLowerCase().trim();
  const res = db
    .prepare("INSERT OR IGNORE INTO user_pokedex (guild_id, user_id, species_id, caught_at) VALUES (?, ?, ?, ?)")
    .run(guildId, userId, clean, Date.now());
  return res.changes > 0;
}

export function getPokedexStats(
  guildId: string,
  userId: string,
): { total: number; kanto: number; johto: number; hoenn: number; totalCount: number } {
  const userList = getUserPokedex(guildId, userId);
  const userSet = new Set(userList);

  let kanto = 0;
  let johto = 0;
  let hoenn = 0;

  for (const p of ALL_POKEMON_LIST) {
    if (userSet.has(p.id) || userSet.has(p.pokemonName.toLowerCase())) {
      if (p.region === "kanto") kanto++;
      else if (p.region === "johto") johto++;
      else if (p.region === "hoenn") hoenn++;
    }
  }

  return {
    total: userSet.size,
    kanto,
    johto,
    hoenn,
    totalCount: ALL_POKEMON_LIST.length,
  };
}

// ── SISTEMA DE GUARDERÍA POKÉMON (DAYCARE) ──
export function getDaycareEntries(guildId: string, userId: string): DaycareEntry[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM user_pokemon_daycare WHERE guild_id = ? AND user_id = ?")
    .all(guildId, userId) as DaycareEntry[];
}

export function depositDaycare(
  guildId: string,
  userId: string,
  petIdentifier: string | number,
): { ok: boolean; message: string; pet?: UserPet } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No se encontró el Pokémon indicado en tu equipo." };

  const current = getDaycareEntries(guildId, userId);
  if (current.length >= MAX_DAYCARE_PER_USER) {
    return {
      ok: false,
      message: `La guardería está llena. Solo puedes dejar un máximo de **${MAX_DAYCARE_PER_USER} Pokémon** al cuidado.`,
    };
  }

  if (current.some((d) => d.pet_id === pet.id)) {
    return { ok: false, message: `**${pet.name}** ya se encuentra en la guardería.` };
  }

  const db = getDb();
  db.prepare(
    "INSERT INTO user_pokemon_daycare (guild_id, user_id, pet_id, deposited_at, cost_per_hour) VALUES (?, ?, ?, ?, ?)",
  ).run(guildId, userId, pet.id, Date.now(), 100);

  return {
    ok: true,
    message: `¡Has dejado a **${pet.name}** al cuidado de la Guardería Pokémon! Ganará experiencia de forma continua a razón de 100 🪙 la hora.`,
    pet,
  };
}

export function withdrawDaycare(
  guildId: string,
  userId: string,
  petIdentifier: string | number,
): { ok: boolean; message: string; expGained?: number; cost?: number; newLevel?: number; pet?: UserPet } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No se encontró el Pokémon en tu equipo." };

  const db = getDb();
  const entry = db
    .prepare("SELECT * FROM user_pokemon_daycare WHERE guild_id = ? AND user_id = ? AND pet_id = ?")
    .get(guildId, userId, pet.id) as DaycareEntry | undefined;

  if (!entry) {
    return { ok: false, message: `**${pet.name}** no está en la guardería actualmente.` };
  }

  const now = Date.now();
  const hours = Math.max(1, Math.floor((now - entry.deposited_at) / 3_600_000));
  const cost = hours * entry.cost_per_hour;
  const expGained = hours * 75;

  const eco = getEco(guildId, userId);
  if (eco.wallet < cost) {
    return {
      ok: false,
      message: `No tienes suficientes fondos en tu monedero para retirar a **${pet.name}**. El coste del servicio por ${hours}h es de ${n(cost)} (tienes ${n(eco.wallet)}).`,
    };
  }

  eco.wallet -= cost;
  saveEco(eco, "Guardería Pokémon: Retirada de criatura");

  db.prepare("DELETE FROM user_pokemon_daycare WHERE guild_id = ? AND user_id = ? AND pet_id = ?").run(
    guildId,
    userId,
    pet.id,
  );

  const prevLevel = pet.level;
  pet.exp += expGained;
  let newLevel = pet.level;
  let expNeeded = newLevel * 100;
  while (pet.exp >= expNeeded && newLevel < 100) {
    pet.exp -= expNeeded;
    newLevel++;
    expNeeded = newLevel * 100;
  }
  pet.level = newLevel;
  pet.happiness = 100;

  db.prepare("UPDATE user_pets SET level = ?, exp = ?, happiness = 100 WHERE id = ?").run(pet.level, pet.exp, pet.id);

  const levelUpMsg = newLevel > prevLevel ? ` ¡Ha subido del nivel **${prevLevel}** al nivel **${newLevel}**!` : "";

  return {
    ok: true,
    message: `¡Has retirado a **${pet.name}** de la guardería tras **${hours}h**! Ha ganado **+${expGained} EXP**.${levelUpMsg} Has pagado **${n(cost)}**.`,
    expGained,
    cost,
    newLevel,
    pet,
  };
}

// ── SALARIO DIARIO DE ENTRENADOR ──
export function claimTrainerSalary(
  guildId: string,
  userId: string,
): { ok: boolean; message: string; coins?: number; nextClaimAt?: number; badgesCount?: number; pokedexCount?: number } {
  const db = getDb();
  const row = db
    .prepare("SELECT last_claimed_at FROM user_pokemon_salary WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as { last_claimed_at: number } | undefined;

  const now = Date.now();
  const COOLDOWN = 24 * 3_600_000;

  if (row && now - row.last_claimed_at < COOLDOWN) {
    const diff = COOLDOWN - (now - row.last_claimed_at);
    const hrs = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    return {
      ok: false,
      message: `Ya has reclamado tu asignación de entrenador hoy. Vuelve en **${hrs}h ${mins}m**.`,
      nextClaimAt: row.last_claimed_at + COOLDOWN,
    };
  }

  const badges = getUserBadges(guildId, userId);
  const pStats = getPokedexStats(guildId, userId);

  const baseCoins = 150;
  const badgeBonus = badges.length * 75;
  const pokedexBonus = pStats.total * 2;
  const totalCoins = baseCoins + badgeBonus + pokedexBonus;

  const eco = getEco(guildId, userId);
  eco.wallet += totalCoins;
  saveEco(eco, "Salario diario de Entrenador Pokémon");

  db.prepare(
    "INSERT OR REPLACE INTO user_pokemon_salary (guild_id, user_id, last_claimed_at) VALUES (?, ?, ?)",
  ).run(guildId, userId, now);

  return {
    ok: true,
    message: `💼 **¡Salario de Entrenador recibido!**\n\n` +
      `• **Subvención Base:** ${n(baseCoins)}\n` +
      `• **Bonus por Medallas (${badges.length}):** +${n(badgeBonus)}\n` +
      `• **Bonus por Pokédex (${pStats.total} Pokémon):** +${n(pokedexBonus)}\n\n` +
      `💰 **Total transferido a tu monedero:** ${n(totalCoins)}`,
    coins: totalCoins,
    badgesCount: badges.length,
    pokedexCount: pStats.total,
  };
}

// ── TRANSFERIR POKÉMON AL PROFESOR A CAMBIO DE MONEDAS ──
export function transferPokemonToProfessor(
  guildId: string,
  userId: string,
  petIdentifier: string | number,
): { ok: boolean; message: string; rewardCoins?: number; professorName?: string; speciesName?: string; pet?: UserPet } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No se encontró el Pokémon en tu equipo." };

  const species = PET_SPECIES[pet.pet_type] || getPokemonById(pet.pet_type);
  const region = species ? species.region : "kanto";
  const professor = region === "johto" ? "Profesor Elm" : (region === "hoenn" ? "Profesor Abedul" : "Profesor Oak");

  let baseVal = 100;
  let levelMult = 20;

  if (species) {
    if (species.rarity === "mitico") {
      baseVal = 50_000;
      levelMult = 1_000;
    } else if (species.rarity === "legendario") {
      baseVal = 15_000;
      levelMult = 400;
    } else if (species.rarity === "epico") {
      baseVal = 2_500;
      levelMult = 100;
    } else if (species.rarity === "raro") {
      baseVal = 500;
      levelMult = 50;
    } else if (species.rarity === "poco_comun") {
      baseVal = 250;
      levelMult = 30;
    }
  }

  const rewardCoins = baseVal + (pet.level * levelMult);

  const db = getDb();
  db.prepare("DELETE FROM user_pets WHERE id = ?").run(pet.id);
  db.prepare("DELETE FROM user_pokemon_daycare WHERE pet_id = ?").run(pet.id);

  const eco = getEco(guildId, userId);
  eco.wallet += rewardCoins;
  saveEco(eco, `Transferencia de ${pet.name} al ${professor}`);

  // Asegurar que quede uno activo si tenía otros
  const remaining = getUserPets(guildId, userId);
  if (remaining.length > 0 && !remaining.some((p) => p.is_active === 1)) {
    remaining[0].is_active = 1;
    db.prepare("UPDATE user_pets SET is_active = 1 WHERE id = ?").run(remaining[0].id);
  }

  return {
    ok: true,
    message: `🔬 Has enviado a **${pet.name}** (${species ? species.name : pet.pet_type}) al laboratorio del **${professor}** para fines de investigación.\n\n¡El Profesor te ha recompensado con **${n(rewardCoins)}** por tu colaboración!`,
    rewardCoins,
    professorName: professor,
    speciesName: species ? species.name : pet.pet_type,
    pet,
  };
}

// ── EVOLUCIÓN E ÍTEMS DE ENTRENADOR ──
export const EVOLUTION_STONE_TABLE: Record<string, Record<string, string>> = {
  piedra_fuego: {
    eevee: "flareon",
    vulpix: "ninetales",
    growlithe: "arcanine",
  },
  piedra_agua: {
    eevee: "vaporeon",
    poliwhirl: "poliwrath",
    shellder: "cloyster",
    staryu: "starmie",
    lombre: "ludicolo",
  },
  piedra_trueno: {
    eevee: "jolteon",
    pikachu: "raichu",
  },
  piedra_hoja: {
    gloom: "vileplume",
    weepinbell: "victreebel",
    exeggcute: "exeggutor",
    nuzleaf: "shiftry",
  },
  piedra_lunar: {
    clefairy: "clefable",
    jigglypuff: "wigglytuff",
    nidorina: "nidoqueen",
    nidorino: "nidoking",
    skitty: "delcatty",
  },
  piedra_solar: {
    gloom: "bellossom",
    sunkern: "sunflora",
  },
};

export function useItemOnPokemon(
  guildId: string,
  userId: string,
  petIdentifier: string | number,
  itemId: string,
): { ok: boolean; message: string; evolvedTo?: string; pet?: UserPet } {
  // Manejo especial de huevos (no requieren un Pokémon asignado)
  if (itemId === "huevo_comun" || itemId === "huevo_mistico" || itemId === "huevo_legendario") {
    const eggType = itemId === "huevo_legendario" ? "legendario" : itemId === "huevo_mistico" ? "mistico" : "comun";
    const eggRes = buyEgg(guildId, userId, eggType);
    return {
      ok: eggRes.ok,
      message: eggRes.message,
      pet: eggRes.pet,
    };
  }

  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No se encontró el Pokémon indicado." };

  const eco = getEco(guildId, userId);
  if (!hasItem(eco, itemId)) {
    return { ok: false, message: "No tienes este objeto en tu inventario. ¡Cómpralo en `/pokemon tienda`!" };
  }

  const db = getDb();

  // Poción máxima
  if (itemId === "pocion_maxima") {
    takeItem(eco, itemId);
    saveEco(eco, "Uso de Poción Máxima");
    pet.happiness = 100;
    db.prepare("UPDATE user_pets SET happiness = 100 WHERE id = ?").run(pet.id);
    return {
      ok: true,
      message: `🧪 ¡Has rociado la **Poción Máxima** sobre **${pet.name}**! Su energía y felicidad han vuelto al 100% ❤️❤️❤️❤️❤️.`,
      pet,
    };
  }

  // Caramelo Raro
  if (itemId === "caramelo_raro") {
    if (pet.level >= 100) {
      return { ok: false, message: `**${pet.name}** ya ha alcanzado el nivel máximo (100).` };
    }
    takeItem(eco, itemId);
    saveEco(eco, "Uso de Caramelo Raro");
    pet.level += 1;
    pet.exp = 0;
    db.prepare("UPDATE user_pets SET level = ?, exp = 0 WHERE id = ?").run(pet.level, pet.id);
    return {
      ok: true,
      message: `🍬 ¡**${pet.name}** se comió el **Caramelo Raro** y subió inmediatamente al **Nivel ${pet.level}**! 🎉`,
      pet,
    };
  }

  // Piedras evolutivas
  if (EVOLUTION_STONE_TABLE[itemId]) {
    const targetMap = EVOLUTION_STONE_TABLE[itemId];
    const newSpeciesId = targetMap[pet.pet_type.toLowerCase()];

    if (!newSpeciesId) {
      return {
        ok: false,
        message: `La piedra no parece surtir ningún efecto sobre **${pet.name}**. Consulta la compatibilidad de especies.`,
      };
    }

    const newSpeciesDef = PET_SPECIES[newSpeciesId] || getPokemonById(newSpeciesId);
    if (!newSpeciesDef) {
      return { ok: false, message: "Error al resolver la especie de evolución." };
    }

    takeItem(eco, itemId);
    saveEco(eco, `Evolución de ${pet.name} mediante ${itemId}`);

    const oldName = pet.name;
    const shouldRename = pet.name.toLowerCase() === pet.pet_type.toLowerCase();
    pet.pet_type = newSpeciesId;
    if (shouldRename) pet.name = newSpeciesDef.name;

    db.prepare("UPDATE user_pets SET pet_type = ?, name = ? WHERE id = ?").run(pet.pet_type, pet.name, pet.id);
    registerPokedex(guildId, userId, newSpeciesId);

    return {
      ok: true,
      message: `✨ ¡¿Qué?! ¡**${oldName}** está reaccionando a la piedra!\n\n🌟 ¡Felicidades! Tu Pokémon ha evolucionado en **${newSpeciesDef.name}** ${newSpeciesDef.emoji}! Ha sido registrado en tu Pokédex.`,
      evolvedTo: newSpeciesDef.name,
      pet,
    };
  }

  return { ok: false, message: "Este objeto no puede ser utilizado sobre un Pokémon." };
}

// ── ZONA SAFARI / ENCUENTROS SALVAJES ──
export function generateSafariEncounter(region?: PokemonRegion): PetSpeciesDef {
  const list = getPokemonByRegion(region || "kanto");
  const roll = Math.random() * 100;

  // Weights: Común 55%, Poco Común 30%, Raro 12%, Épico 3%
  let targetRarity: PokemonRarity = "comun";
  if (roll > 97) targetRarity = "epico";
  else if (roll > 85) targetRarity = "raro";
  else if (roll > 55) targetRarity = "poco_comun";

  const pool = list.filter((p) => p.rarity === targetRarity);
  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return list[Math.floor(Math.random() * list.length)];
}

export function simulateSafariCatch(
  species: PetSpeciesDef,
  ballId = "pokeball",
  berryId?: string,
): {
  success: boolean;
  shakes: number;
  fled: boolean;
  bonusExp: number;
  bonusCoins: number;
  log: string[];
} {
  let baseRate = 0.5;
  if (species.rarity === "mitico") baseRate = 0.05;
  else if (species.rarity === "legendario") baseRate = 0.12;
  else if (species.rarity === "epico") baseRate = 0.25;
  else if (species.rarity === "raro") baseRate = 0.40;
  else if (species.rarity === "poco_comun") baseRate = 0.60;
  else baseRate = 0.75;

  let ballMult = 1.0;
  if (ballId === "masterball") ballMult = 100.0;
  else if (ballId === "ultraball") ballMult = 2.0;
  else if (ballId === "superball") ballMult = 1.5;

  let berryBonus = 0;
  let cannotFlee = false;
  let doubleRewards = false;

  if (berryId === "baya_frambu") berryBonus = 0.25;
  if (berryId === "baya_latano") cannotFlee = true;
  if (berryId === "baya_pinia") doubleRewards = true;

  const totalChance = Math.min(0.99, (baseRate * ballMult) + berryBonus);
  const roll = Math.random();

  const log: string[] = [];
  const ballName = ballId === "masterball" ? "Master Ball 🟣" : (ballId === "ultraball" ? "Ultra Ball 🟡" : (ballId === "superball" ? "Super Ball 🔵" : "Poké Ball 🔴"));

  log.push(`🎯 ¡Lanzas con precisión tu **${ballName}** hacia **${species.name}**!`);

  let shakes = 0;
  if (ballId === "masterball" || roll <= totalChance) {
    shakes = 3;
    log.push("⚪ ¡La esfera se balancea una vez...!");
    log.push("🔴 ¡La esfera se balancea dos veces...!");
    log.push("⚪ ¡La esfera se balancea tres veces...!");
    log.push(`✨ **¡CLIC!** ¡Ya está! ¡**${species.name}** ha sido capturado!`);
    return {
      success: true,
      shakes: 3,
      fled: false,
      bonusExp: (doubleRewards ? 200 : 100),
      bonusCoins: (doubleRewards ? 300 : 150),
      log,
    };
  }

  // Fallo
  if (roll <= totalChance + 0.15) {
    shakes = 2;
    log.push("⚪ ¡La esfera se balancea una vez...!");
    log.push("🔴 ¡La esfera se balancea dos veces...!");
    log.push(`💥 ¡Oh no! ¡**${species.name}** se ha liberado en el último instante!`);
  } else {
    shakes = 1;
    log.push("⚪ ¡La esfera se balancea una vez...!");
    log.push(`💨 ¡Rayos! ¡**${species.name}** ha roto la cápsula casi de inmediato!`);
  }

  const fled = !cannotFlee && Math.random() < 0.35;
  if (fled) {
    log.push(`🏃‍♂️ ¡**${species.name}** asustado ha huido entre los arbustos!`);
  } else {
    log.push(`👀 **${species.name}** sigue observándote atentamente.`);
  }

  return {
    success: false,
    shakes,
    fled,
    bonusExp: 0,
    bonusCoins: 0,
    log,
  };
}

// ── COMBATE PVP Y GIMNASIO CON ELEMENTOS ──
const TYPE_CHART: Record<string, { strongAgainst: string[]; weakAgainst: string[] }> = {
  agua: { strongAgainst: ["fuego", "tierra", "roca"], weakAgainst: ["electrico", "planta"] },
  fuego: { strongAgainst: ["planta", "hielo", "bicho", "acero"], weakAgainst: ["agua", "tierra", "roca"] },
  planta: { strongAgainst: ["agua", "tierra", "roca"], weakAgainst: ["fuego", "hielo", "veneno", "volador", "bicho"] },
  electrico: { strongAgainst: ["agua", "volador"], weakAgainst: ["tierra"] },
  hielo: { strongAgainst: ["planta", "tierra", "volador", "dragon"], weakAgainst: ["fuego", "lucha", "roca", "acero"] },
  lucha: { strongAgainst: ["normal", "hielo", "roca", "siniestro", "acero"], weakAgainst: ["volador", "psiquico", "hada"] },
  veneno: { strongAgainst: ["planta", "hada"], weakAgainst: ["tierra", "psiquico"] },
  tierra: { strongAgainst: ["fuego", "electrico", "veneno", "roca", "acero"], weakAgainst: ["agua", "planta", "hielo"] },
  volador: { strongAgainst: ["planta", "lucha", "bicho"], weakAgainst: ["electrico", "hielo", "roca"] },
  psiquico: { strongAgainst: ["lucha", "veneno"], weakAgainst: ["bicho", "fantasma", "siniestro"] },
  bicho: { strongAgainst: ["planta", "psiquico", "siniestro"], weakAgainst: ["fuego", "volador", "roca"] },
  roca: { strongAgainst: ["fuego", "hielo", "volador", "bicho"], weakAgainst: ["agua", "planta", "lucha", "tierra", "acero"] },
  fantasma: { strongAgainst: ["psiquico", "fantasma"], weakAgainst: ["fantasma", "siniestro"] },
  dragon: { strongAgainst: ["dragon"], weakAgainst: ["hielo", "dragon", "hada"] },
  acero: { strongAgainst: ["hielo", "roca", "hada"], weakAgainst: ["fuego", "lucha", "tierra"] },
  siniestro: { strongAgainst: ["psiquico", "fantasma"], weakAgainst: ["lucha", "bicho", "hada"] },
  hada: { strongAgainst: ["lucha", "dragon", "siniestro"], weakAgainst: ["veneno", "acero"] },
  normal: { strongAgainst: [], weakAgainst: ["lucha"] },
};

function getEffectiveness(attackerTypes: string[], defenderTypes: string[]): { mult: number; note: string } {
  let mult = 1.0;
  for (const aType of attackerTypes) {
    const chart = TYPE_CHART[aType];
    if (!chart) continue;
    for (const dType of defenderTypes) {
      if (chart.strongAgainst.includes(dType)) mult *= 1.5;
      if (chart.weakAgainst.includes(dType)) mult *= 0.67;
    }
  }
  if (mult >= 1.4) return { mult: 1.5, note: " ¡Es súper eficaz! 💥" };
  if (mult <= 0.7) return { mult: 0.67, note: " No es muy eficaz... 🛡️" };
  return { mult: 1.0, note: "" };
}

export interface BattleResult {
  winner: 1 | 2;
  rounds: { turn: number; attacker: string; text: string; hp1: number; hp2: number }[];
  p1FinalHp: number;
  p2FinalHp: number;
  expAwarded: number;
  coinsAwarded: number;
}

export function simulatePetBattle(
  pet1: UserPet,
  pet2: UserPet,
  trainer1Name: string,
  trainer2Name: string,
): BattleResult {
  const sp1 = PET_SPECIES[pet1.pet_type] || getPokemonById(pet1.pet_type);
  const sp2 = PET_SPECIES[pet2.pet_type] || getPokemonById(pet2.pet_type);

  const t1 = sp1 ? sp1.types : ["normal"];
  const t2 = sp2 ? sp2.types : ["normal"];

  const maxHp1 = Math.round((sp1 ? sp1.baseHp : 100) + pet1.level * 8);
  const maxHp2 = Math.round((sp2 ? sp2.baseHp : 100) + pet2.level * 8);

  const atk1 = Math.round((sp1 ? sp1.baseAtk : 50) + pet1.level * 3);
  const atk2 = Math.round((sp2 ? sp2.baseAtk : 50) + pet2.level * 3);

  const def1 = Math.round((sp1 ? sp1.baseDef : 40) + pet1.level * 2);
  const def2 = Math.round((sp2 ? sp2.baseDef : 40) + pet2.level * 2);

  const spd1 = Math.round((sp1 ? sp1.baseSpd : 50) + pet1.level * 2.5);
  const spd2 = Math.round((sp2 ? sp2.baseSpd : 50) + pet2.level * 2.5);

  const move1 = sp1 ? sp1.skillName : "Placaje";
  const move2 = sp2 ? sp2.skillName : "Placaje";

  let hp1 = maxHp1;
  let hp2 = maxHp2;

  const rounds: { turn: number; attacker: string; text: string; hp1: number; hp2: number }[] = [];
  let turn = 1;

  while (hp1 > 0 && hp2 > 0 && turn <= 10) {
    const p1First = spd1 >= spd2 || Math.random() < 0.4;
    const [att, defPet, aName, dName, aMove, aTypes, dTypes, aAtk, dDef, isP1] = p1First
      ? [pet1, pet2, trainer1Name, trainer2Name, move1, t1, t2, atk1, def2, true]
      : [pet2, pet1, trainer2Name, trainer1Name, move2, t2, t1, atk2, def1, false];

    // Acción primer atacante
    const eff = getEffectiveness(aTypes, dTypes);
    const crit = Math.random() < 0.12 ? 1.5 : 1.0;
    const rawDamage = Math.max(12, Math.round(((aAtk * 1.2) - (dDef * 0.4)) * eff.mult * crit * (0.85 + Math.random() * 0.3)));
    
    if (isP1) hp2 = Math.max(0, hp2 - rawDamage);
    else hp1 = Math.max(0, hp1 - rawDamage);

    const critText = crit > 1.0 ? " ¡Golpe crítico! 🎯" : "";
    rounds.push({
      turn,
      attacker: att.name,
      text: `**${att.name}** usa **${aMove}** causando **${rawDamage} de daño** a **${defPet.name}**.${eff.note}${critText}`,
      hp1,
      hp2,
    });

    if (hp1 <= 0 || hp2 <= 0) break;

    // Acción segundo atacante
    const eff2 = getEffectiveness(dTypes, aTypes);
    const crit2 = Math.random() < 0.12 ? 1.5 : 1.0;
    const rawDamage2 = Math.max(12, Math.round((( (isP1 ? atk2 : atk1) * 1.2) - ((isP1 ? def1 : def2) * 0.4)) * eff2.mult * crit2 * (0.85 + Math.random() * 0.3)));

    if (isP1) hp1 = Math.max(0, hp1 - rawDamage2);
    else hp2 = Math.max(0, hp2 - rawDamage2);

    const critText2 = crit2 > 1.0 ? " ¡Golpe crítico! 🎯" : "";
    rounds.push({
      turn,
      attacker: defPet.name,
      text: `**${defPet.name}** responde con **${isP1 ? move2 : move1}** e inflige **${rawDamage2} de daño**.${eff2.note}${critText2}`,
      hp1,
      hp2,
    });

    turn++;
  }

  const winner = hp1 > hp2 ? 1 : 2;
  return {
    winner,
    rounds,
    p1FinalHp: hp1,
    p2FinalHp: hp2,
    expAwarded: winner === 1 ? 120 : 40,
    coinsAwarded: winner === 1 ? 250 : 50,
  };
}

export function simulateGymBattle(playerPet: UserPet, leader: GymLeaderDef): BattleResult {
  const dummyLeaderPet: UserPet = {
    id: 999999,
    guild_id: "gym",
    user_id: leader.id,
    pet_type: leader.pokemon.speciesId,
    name: leader.pokemon.name,
    level: leader.pokemon.level,
    exp: 0,
    happiness: 100,
    last_feed: 0,
    last_pet: 0,
    on_expedition_until: 0,
    expedition_hours: 0,
    expedition_reward: null,
    created_at: 0,
    is_active: 1,
  };

  return simulatePetBattle(playerPet, dummyLeaderPet, "Entrenador", leader.name);
}

// ── CRUD BASE DE MASCOTAS / POKÉMON ──
function updatePetHappiness(pet: UserPet, db = getDb()): void {
  const now = Date.now();
  const lastInteraction = Math.max(pet.last_feed, pet.last_pet, pet.created_at);
  const hoursSince = (now - lastInteraction) / 3_600_000;
  if (hoursSince > 12) {
    const loss = Math.min(60, Math.floor((hoursSince - 12) * 2));
    const newHappiness = Math.max(10, pet.happiness - loss);
    if (newHappiness !== pet.happiness) {
      db.prepare("UPDATE user_pets SET happiness = ? WHERE id = ?").run(newHappiness, pet.id);
      pet.happiness = newHappiness;
    }
  }
}

export function getUserPets(guildId: string, userId: string): UserPet[] {
  const db = getDb();
  const pets = db
    .prepare("SELECT * FROM user_pets WHERE guild_id = ? AND user_id = ? ORDER BY is_active DESC, level DESC, id ASC")
    .all(guildId, userId) as UserPet[];

  for (const pet of pets) {
    updatePetHappiness(pet, db);
  }

  if (pets.length > 0 && !pets.some((p) => p.is_active === 1)) {
    pets[0].is_active = 1;
    db.prepare("UPDATE user_pets SET is_active = 1 WHERE id = ?").run(pets[0].id);
  }

  return pets;
}

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

    const byPokemon = allPets.find((p) => {
      const sp = PET_SPECIES[p.pet_type];
      return sp && sp.pokemonName.toLowerCase() === lower;
    });
    if (byPokemon) return byPokemon;

    const partial = allPets.find((p) => p.name.toLowerCase().includes(lower));
    if (partial) return partial;

    return null;
  }

  return allPets.find((p) => p.is_active === 1) ?? allPets[0] ?? null;
}

export function getActivePet(guildId: string, userId: string): UserPet | null {
  return getUserPet(guildId, userId);
}

export function setActivePet(
  guildId: string,
  userId: string,
  petIdentifier: string | number,
): { ok: boolean; message: string; pet?: UserPet } {
  const targetPet = getUserPet(guildId, userId, petIdentifier);
  if (!targetPet) {
    return { ok: false, message: "No se ha encontrado el Pokémon indicado en tu equipo." };
  }

  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE user_pets SET is_active = 0 WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
    db.prepare("UPDATE user_pets SET is_active = 1 WHERE id = ?").run(targetPet.id);
  })();

  targetPet.is_active = 1;
  return {
    ok: true,
    message: `¡**${targetPet.name}** (${PET_SPECIES[targetPet.pet_type]?.name || targetPet.pet_type}) es ahora tu Pokémon activo de combate!`,
    pet: targetPet,
  };
}

export function adoptPet(
  guildId: string,
  userId: string,
  petType: string,
  customName?: string,
): { ok: boolean; message: string; pet?: UserPet } {
  const species = PET_SPECIES[petType.toLowerCase()] || getPokemonById(petType);
  if (!species) {
    return { ok: false, message: "Especie de Pokémon no válida." };
  }

  const userPets = getUserPets(guildId, userId);
  if (userPets.length >= MAX_PETS_PER_USER) {
    return {
      ok: false,
      message: `Has alcanzado el límite máximo de **${MAX_PETS_PER_USER} Pokémon** en tu equipo. Transfiere alguno con /pokemon transferir o libera alguno con /pokemon liberar.`,
    };
  }

  const name = customName?.trim() || species.name;
  const now = Date.now();
  const isFirstPet = userPets.length === 0 ? 1 : 0;

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO user_pets (guild_id, user_id, pet_type, name, level, exp, happiness, last_feed, last_pet, created_at, is_active)
       VALUES (?, ?, ?, ?, 1, 0, 100, ?, ?, ?, ?)`,
    )
    .run(guildId, userId, species.id, name, now, now, now, isFirstPet);

  registerPokedex(guildId, userId, species.id);

  const newPet: UserPet = {
    id: Number(result.lastInsertRowid),
    guild_id: guildId,
    user_id: userId,
    pet_type: species.id,
    name,
    level: 1,
    exp: 0,
    happiness: 100,
    last_feed: now,
    last_pet: now,
    on_expedition_until: 0,
    expedition_hours: 0,
    expedition_reward: null,
    created_at: now,
    is_active: isFirstPet,
  };

  return {
    ok: true,
    message: `¡Has sumado a **${name}** (${species.name} ${species.emoji}) a tu equipo! Registrado en tu Pokédex.`,
    pet: newPet,
  };
}

export function feedPet(
  guildId: string,
  userId: string,
  petIdentifier?: string | number,
): { ok: boolean; message: string; cost: number; pet?: UserPet; levelUp?: boolean } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No tienes ningún Pokémon activo en tu equipo.", cost: 0 };

  const FEED_COST = 80;
  const FEED_COOLDOWN = 2 * 3_600_000;
  const now = Date.now();

  if (now - pet.last_feed < FEED_COOLDOWN) {
    const remaining = Math.ceil((FEED_COOLDOWN - (now - pet.last_feed)) / 60_000);
    return { ok: false, message: `**${pet.name}** aún está saciado. Podrás darle otra baya en **${remaining} minutos**.`, cost: 0 };
  }

  const eco = getEco(guildId, userId);
  if (eco.wallet < FEED_COST) {
    return { ok: false, message: `No tienes suficientes monedas para comprar bayas (${n(FEED_COST)}).`, cost: 0 };
  }

  eco.wallet -= FEED_COST;
  saveEco(eco, `Alimentar a Pokémon: ${pet.name}`);

  const prevLevel = pet.level;
  pet.happiness = Math.min(100, pet.happiness + 20);
  pet.exp += 30;
  pet.last_feed = now;

  let expNeeded = pet.level * 100;
  let levelUp = false;
  while (pet.exp >= expNeeded && pet.level < 100) {
    pet.exp -= expNeeded;
    pet.level++;
    expNeeded = pet.level * 100;
    levelUp = true;
  }

  const db = getDb();
  db.prepare("UPDATE user_pets SET happiness = ?, exp = ?, level = ?, last_feed = ? WHERE id = ?").run(
    pet.happiness,
    pet.exp,
    pet.level,
    pet.last_feed,
    pet.id,
  );

  let msg = `¡Le has dado bayas nutritivas a **${pet.name}** por ${n(FEED_COST)}! (+20 Felicidad, +30 EXP).`;
  if (levelUp) {
    msg += `\n🎉 **¡${pet.name} ha subido al Nivel ${pet.level}!**`;
  }

  return { ok: true, message: msg, cost: FEED_COST, pet, levelUp };
}

export function petThePet(
  guildId: string,
  userId: string,
  petIdentifier?: string | number,
): { ok: boolean; message: string; pet?: UserPet; levelUp?: boolean } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No tienes ningún Pokémon activo en tu equipo." };

  const PET_COOLDOWN = 60 * 60_000;
  const now = Date.now();

  if (now - pet.last_pet < PET_COOLDOWN) {
    const remaining = Math.ceil((PET_COOLDOWN - (now - pet.last_pet)) / 60_000);
    return { ok: false, message: `**${pet.name}** está descansando. Podrás jugar de nuevo en **${remaining} minutos**.` };
  }

  pet.happiness = Math.min(100, pet.happiness + 15);
  pet.exp += 20;
  pet.last_pet = now;

  let expNeeded = pet.level * 100;
  let levelUp = false;
  while (pet.exp >= expNeeded && pet.level < 100) {
    pet.exp -= expNeeded;
    pet.level++;
    expNeeded = pet.level * 100;
    levelUp = true;
  }

  const db = getDb();
  db.prepare("UPDATE user_pets SET happiness = ?, exp = ?, level = ?, last_pet = ? WHERE id = ?").run(
    pet.happiness,
    pet.exp,
    pet.level,
    pet.last_pet,
    pet.id,
  );

  let msg = `¡Has jugado y mimado a **${pet.name}**! (+15 Felicidad, +20 EXP).`;
  if (levelUp) {
    msg += `\n🎉 **¡${pet.name} ha subido al Nivel ${pet.level}!**`;
  }

  return { ok: true, message: msg, pet, levelUp };
}

export function renamePet(
  guildId: string,
  userId: string,
  newName: string,
  petIdentifier?: string | number,
): { ok: boolean; message: string; pet?: UserPet } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No se ha encontrado el Pokémon a renombrar." };

  const clean = newName.trim();
  if (clean.length < 2 || clean.length > 25) {
    return { ok: false, message: "El mote debe tener entre 2 y 25 caracteres." };
  }

  const oldName = pet.name;
  pet.name = clean;

  const db = getDb();
  db.prepare("UPDATE user_pets SET name = ? WHERE id = ?").run(pet.name, pet.id);

  return { ok: true, message: `Has cambiado el mote de **${oldName}** a **${clean}**.`, pet };
}

export function releasePet(
  guildId: string,
  userId: string,
  petIdentifier: string | number,
): { ok: boolean; message: string } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No se ha encontrado el Pokémon a liberar." };

  const db = getDb();
  db.prepare("DELETE FROM user_pets WHERE id = ?").run(pet.id);
  db.prepare("DELETE FROM user_pokemon_daycare WHERE pet_id = ?").run(pet.id);

  const remaining = getUserPets(guildId, userId);
  if (remaining.length > 0 && !remaining.some((p) => p.is_active === 1)) {
    remaining[0].is_active = 1;
    db.prepare("UPDATE user_pets SET is_active = 1 WHERE id = ?").run(remaining[0].id);
  }

  return { ok: true, message: `Has liberado a **${pet.name}** a la naturaleza. ¡Que tenga una buena vida salvaje!` };
}

export function sendOnExpedition(
  guildId: string,
  userId: string,
  hours: number,
  petIdentifier?: string | number,
): { ok: boolean; message: string; pet?: UserPet } {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) return { ok: false, message: "No tienes ningún Pokémon para enviar a explorar rutas." };

  const now = Date.now();
  if (pet.on_expedition_until > now) {
    const remaining = Math.ceil((pet.on_expedition_until - now) / 60_000);
    return { ok: false, message: `**${pet.name}** ya está explorando una ruta. Regresará en **${remaining} minutos**.` };
  }

  const validHours = [1, 4, 8, 24];
  if (!validHours.includes(hours)) {
    return { ok: false, message: "La duración debe ser de 1, 4, 8 o 24 horas." };
  }

  pet.on_expedition_until = now + hours * 3_600_000;
  pet.expedition_hours = hours;
  pet.expedition_reward = null;

  const db = getDb();
  db.prepare(
    "UPDATE user_pets SET on_expedition_until = ?, expedition_hours = ?, expedition_reward = NULL WHERE id = ?",
  ).run(pet.on_expedition_until, hours, pet.id);

  return {
    ok: true,
    message: `¡**${pet.name}** ha partido a explorar rutas durante **${hours} hora(s)**! Regresará con experiencia, bayas y NexoCoins.`,
    pet,
  };
}

export function claimExpeditionReward(
  guildId: string,
  userId: string,
  petIdentifier?: string | number,
): {
  ok: boolean;
  message: string;
  coinsEarned: number;
  expEarned: number;
  claimedPets: { pet: UserPet; coins: number; exp: number }[];
} {
  const allPets = getUserPets(guildId, userId);
  if (!allPets.length) return { ok: false, message: "No tienes Pokémon.", coinsEarned: 0, expEarned: 0, claimedPets: [] };

  const now = Date.now();
  const db = getDb();

  let targetPets: UserPet[] = [];
  if (petIdentifier !== undefined && petIdentifier !== null && petIdentifier !== "") {
    const p = getUserPet(guildId, userId, petIdentifier);
    if (!p) return { ok: false, message: "Pokémon no encontrado.", coinsEarned: 0, expEarned: 0, claimedPets: [] };
    targetPets = [p];
  } else {
    targetPets = allPets.filter((p) => p.on_expedition_until > 0 && p.on_expedition_until <= now);
  }

  if (targetPets.length === 0) {
    return { ok: false, message: "Ninguno de tus Pokémon ha finalizado su expedición de ruta todavía.", coinsEarned: 0, expEarned: 0, claimedPets: [] };
  }

  let totalCoins = 0;
  let totalExp = 0;
  const claimedList: { pet: UserPet; coins: number; exp: number }[] = [];

  for (const pet of targetPets) {
    if (pet.on_expedition_until > now) continue;

    const h = pet.expedition_hours || 1;
    const baseCoins = h * 120 + Math.floor(Math.random() * (h * 40));
    const baseExp = h * 45;

    totalCoins += baseCoins;
    totalExp += baseExp;

    pet.on_expedition_until = 0;
    pet.expedition_hours = 0;
    pet.exp += baseExp;

    let expNeeded = pet.level * 100;
    while (pet.exp >= expNeeded && pet.level < 100) {
      pet.exp -= expNeeded;
      pet.level++;
      expNeeded = pet.level * 100;
    }

    db.prepare("UPDATE user_pets SET on_expedition_until = 0, expedition_hours = 0, exp = ?, level = ? WHERE id = ?").run(
      pet.exp,
      pet.level,
      pet.id,
    );

    claimedList.push({ pet, coins: baseCoins, exp: baseExp });
  }

  if (claimedList.length === 0) {
    return { ok: false, message: "La expedición de ruta de tu Pokémon aún no ha concluido.", coinsEarned: 0, expEarned: 0, claimedPets: [] };
  }

  const eco = getEco(guildId, userId);
  eco.wallet += totalCoins;
  saveEco(eco, "Recompensa de expedición Pokémon");

  const summary = claimedList.map((c) => `• **${c.pet.name}**: +${n(c.coins)}, +${c.exp} EXP (Nivel ${c.pet.level})`).join("\n");
  return {
    ok: true,
    message: `🎒 **¡Expediciones concluidas!**\n\n${summary}\n\n💰 Total recibido: ${n(totalCoins)}`,
    coinsEarned: totalCoins,
    expEarned: totalExp,
    claimedPets: claimedList,
  };
}

export function hatchEgg(
  guildId: string,
  userId: string,
  eggType = "comun",
): { ok: boolean; message: string; pet?: UserPet; species?: PetSpeciesDef } {
  const userPets = getUserPets(guildId, userId);
  if (userPets.length >= MAX_PETS_PER_USER) {
    return {
      ok: false,
      message: `Tienes el equipo lleno (**${MAX_PETS_PER_USER} Pokémon**). Transfiere o libera alguno antes de eclosionar un huevo.`,
    };
  }

  let rarity: PokemonRarity = "comun";
  if (eggType === "mistico" || eggType === "legendario") rarity = "legendario";
  else if (eggType === "epico" || eggType === "raro") rarity = "epico";
  else if (eggType === "poco_comun") rarity = "poco_comun";

  const pool = ALL_POKEMON_LIST.filter((p) => p.rarity === rarity);
  const selected = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : ALL_POKEMON_LIST[0];

  const now = Date.now();
  const isFirst = userPets.length === 0 ? 1 : 0;
  const db = getDb();
  const res = db
    .prepare(
      `INSERT INTO user_pets (guild_id, user_id, pet_type, name, level, exp, happiness, last_feed, last_pet, created_at, is_active)
       VALUES (?, ?, ?, ?, 1, 0, 100, ?, ?, ?, ?)`,
    )
    .run(guildId, userId, selected.id, selected.name, now, now, now, isFirst);

  registerPokedex(guildId, userId, selected.id);

  const newPet: UserPet = {
    id: Number(res.lastInsertRowid),
    guild_id: guildId,
    user_id: userId,
    pet_type: selected.id,
    name: selected.name,
    level: 1,
    exp: 0,
    happiness: 100,
    last_feed: now,
    last_pet: now,
    on_expedition_until: 0,
    expedition_hours: 0,
    expedition_reward: null,
    created_at: now,
    is_active: isFirst,
  };

  return {
    ok: true,
    message: `🐣 ¡El cascarón ha crujido y se ha roto!\n\n¡Ha nacido un flamante **${selected.name}** ${selected.emoji} (${selected.rarity.toUpperCase()})! Registrado en tu Pokédex.`,
    pet: newPet,
    species: selected,
  };
}

export function buyEgg(
  guildId: string,
  userId: string,
  eggType = "comun",
): { ok: boolean; message: string; pet?: UserPet; species?: PetSpeciesDef; cost: number } {
  let cost = 1_500;
  if (eggType === "mistico" || eggType === "legendario") cost = 12_000;
  else if (eggType === "epico") cost = 4_000;

  const eco = getEco(guildId, userId);
  const eggItemId =
    eggType === "legendario"
      ? "huevo_legendario"
      : eggType === "mistico" || eggType === "epico"
      ? "huevo_mistico"
      : "huevo_comun";

  // Si ya tiene el huevo en su mochila/inventario, ¡úsalo gratis sin volver a cobrar!
  if (hasItem(eco, eggItemId)) {
    takeItem(eco, eggItemId);
    saveEco(eco, `Incubación de ${eggItemId} desde mochila`);
    const res = hatchEgg(guildId, userId, eggType);
    if (!res.ok) {
      giveItem(eco, eggItemId, 1);
      saveEco(eco, `Devolución de ${eggItemId} tras error`);
      return { ok: false, message: res.message, cost: 0 };
    }
    return {
      ok: true,
      message: `🥚 ¡Has sacado tu **${eggItemId.replace(/_/g, " ").toUpperCase()}** de tu mochila y lo has colocado en la incubadora!\n\n${res.message}`,
      pet: res.pet,
      species: res.species,
      cost: 0,
    };
  }

  const funds = totalFunds(eco);
  if (funds < cost) {
    return {
      ok: false,
      message: `No tienes suficientes fondos para incubar este huevo (${n(cost)}). Tienes ${n(funds)} entre cartera y banco.`,
      cost,
    };
  }

  const deductRes = deductFundsDetailed(eco, cost);
  saveEco(eco, `Incubación de Huevo Pokémon ${eggType}`);

  const res = hatchEgg(guildId, userId, eggType);
  if (!res.ok) {
    refundFunds(eco, deductRes);
    saveEco(eco, "Reembolso de huevo Pokémon");
    return { ok: false, message: res.message, cost };
  }

  return { ok: true, message: res.message, pet: res.pet, species: res.species, cost };
}
