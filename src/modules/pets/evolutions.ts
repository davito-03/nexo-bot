// Sistema Oficial de Evoluciones Pokémon (Generaciones 1 a 5)
// Soporta evoluciones por nivel, piedras evolutivas y evolución por intercambio.

import { getDb } from "../../database/index.js";
import { getEco, saveEco, hasItem, takeItem, invOf } from "../economy/engine.js";
import { getPokemonById, type PetSpeciesDef } from "./catalog.js";
import { getUserPet, getUserPets, registerPokedex, type UserPet } from "./engine.js";

export interface EvolutionOption {
  target: string;
  trigger: "level" | "stone" | "trade";
  minLevel: number;
  item: string | null;
}

export const EVOLUTION_MAP: Record<string, EvolutionOption[]> = {
  "snubbull": [
    {
      "target": "granbull",
      "trigger": "level",
      "minLevel": 23,
      "item": null
    }
  ],
  "misdreavus": [
    {
      "target": "mismagius",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_lunar"
    }
  ],
  "skorupi": [
    {
      "target": "drapion",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "wurmple": [
    {
      "target": "silcoon",
      "trigger": "level",
      "minLevel": 7,
      "item": null
    },
    {
      "target": "cascoon",
      "trigger": "level",
      "minLevel": 7,
      "item": null
    }
  ],
  "silcoon": [
    {
      "target": "beautifly",
      "trigger": "level",
      "minLevel": 10,
      "item": null
    }
  ],
  "cascoon": [
    {
      "target": "dustox",
      "trigger": "level",
      "minLevel": 10,
      "item": null
    }
  ],
  "basculin": [
    {
      "target": "basculegion",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "aipom": [
    {
      "target": "ambipom",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "koffing": [
    {
      "target": "weezing",
      "trigger": "level",
      "minLevel": 35,
      "item": null
    }
  ],
  "magnemite": [
    {
      "target": "magneton",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "magneton": [
    {
      "target": "magnezone",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "patrat": [
    {
      "target": "watchog",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "budew": [
    {
      "target": "roselia",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "roselia": [
    {
      "target": "roserade",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_solar"
    }
  ],
  "psyduck": [
    {
      "target": "golduck",
      "trigger": "level",
      "minLevel": 33,
      "item": null
    }
  ],
  "shellos": [
    {
      "target": "gastrodon",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "paras": [
    {
      "target": "parasect",
      "trigger": "level",
      "minLevel": 24,
      "item": null
    }
  ],
  "houndour": [
    {
      "target": "houndoom",
      "trigger": "level",
      "minLevel": 24,
      "item": null
    }
  ],
  "machop": [
    {
      "target": "machoke",
      "trigger": "level",
      "minLevel": 28,
      "item": null
    }
  ],
  "machoke": [
    {
      "target": "machamp",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "seedot": [
    {
      "target": "nuzleaf",
      "trigger": "level",
      "minLevel": 14,
      "item": null
    }
  ],
  "nuzleaf": [
    {
      "target": "shiftry",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_hoja"
    }
  ],
  "whismur": [
    {
      "target": "loudred",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "loudred": [
    {
      "target": "exploud",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "trubbish": [
    {
      "target": "garbodor",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "magby": [
    {
      "target": "magmar",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "magmar": [
    {
      "target": "magmortar",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "drowzee": [
    {
      "target": "hypno",
      "trigger": "level",
      "minLevel": 26,
      "item": null
    }
  ],
  "rattata": [
    {
      "target": "raticate",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "qwilfish": [
    {
      "target": "overqwil",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "litwick": [
    {
      "target": "lampent",
      "trigger": "level",
      "minLevel": 41,
      "item": null
    }
  ],
  "lampent": [
    {
      "target": "chandelure",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_lunar"
    }
  ],
  "hoppip": [
    {
      "target": "skiploom",
      "trigger": "level",
      "minLevel": 18,
      "item": null
    }
  ],
  "skiploom": [
    {
      "target": "jumpluff",
      "trigger": "level",
      "minLevel": 27,
      "item": null
    }
  ],
  "purrloin": [
    {
      "target": "liepard",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "tepig": [
    {
      "target": "pignite",
      "trigger": "level",
      "minLevel": 17,
      "item": null
    }
  ],
  "pignite": [
    {
      "target": "emboar",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "oshawott": [
    {
      "target": "dewott",
      "trigger": "level",
      "minLevel": 17,
      "item": null
    }
  ],
  "dewott": [
    {
      "target": "samurott",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "onix": [
    {
      "target": "steelix",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "porygon": [
    {
      "target": "porygon2",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "porygon2": [
    {
      "target": "porygon_z",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "venipede": [
    {
      "target": "whirlipede",
      "trigger": "level",
      "minLevel": 22,
      "item": null
    }
  ],
  "whirlipede": [
    {
      "target": "scolipede",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "shroomish": [
    {
      "target": "breloom",
      "trigger": "level",
      "minLevel": 23,
      "item": null
    }
  ],
  "diglett": [
    {
      "target": "dugtrio",
      "trigger": "level",
      "minLevel": 26,
      "item": null
    }
  ],
  "vanillite": [
    {
      "target": "vanillish",
      "trigger": "level",
      "minLevel": 35,
      "item": null
    }
  ],
  "vanillish": [
    {
      "target": "vanilluxe",
      "trigger": "level",
      "minLevel": 47,
      "item": null
    }
  ],
  "beldum": [
    {
      "target": "metang",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "metang": [
    {
      "target": "metagross",
      "trigger": "level",
      "minLevel": 45,
      "item": null
    }
  ],
  "poliwag": [
    {
      "target": "poliwhirl",
      "trigger": "level",
      "minLevel": 25,
      "item": null
    }
  ],
  "poliwhirl": [
    {
      "target": "poliwrath",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_agua"
    },
    {
      "target": "politoed",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "lileep": [
    {
      "target": "cradily",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "gastly": [
    {
      "target": "haunter",
      "trigger": "level",
      "minLevel": 25,
      "item": null
    }
  ],
  "haunter": [
    {
      "target": "gengar",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "elgyem": [
    {
      "target": "beheeyem",
      "trigger": "level",
      "minLevel": 42,
      "item": null
    }
  ],
  "turtwig": [
    {
      "target": "grotle",
      "trigger": "level",
      "minLevel": 18,
      "item": null
    }
  ],
  "grotle": [
    {
      "target": "torterra",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "meditite": [
    {
      "target": "medicham",
      "trigger": "level",
      "minLevel": 37,
      "item": null
    }
  ],
  "bonsly": [
    {
      "target": "sudowoodo",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "stantler": [
    {
      "target": "wyrdeer",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "nidoran_f": [
    {
      "target": "nidorina",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "nidorina": [
    {
      "target": "nidoqueen",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_lunar"
    }
  ],
  "doduo": [
    {
      "target": "dodrio",
      "trigger": "level",
      "minLevel": 31,
      "item": null
    }
  ],
  "numel": [
    {
      "target": "camerupt",
      "trigger": "level",
      "minLevel": 33,
      "item": null
    }
  ],
  "gible": [
    {
      "target": "gabite",
      "trigger": "level",
      "minLevel": 24,
      "item": null
    }
  ],
  "gabite": [
    {
      "target": "garchomp",
      "trigger": "level",
      "minLevel": 48,
      "item": null
    }
  ],
  "glameow": [
    {
      "target": "purugly",
      "trigger": "level",
      "minLevel": 38,
      "item": null
    }
  ],
  "chimchar": [
    {
      "target": "monferno",
      "trigger": "level",
      "minLevel": 14,
      "item": null
    }
  ],
  "monferno": [
    {
      "target": "infernape",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "omanyte": [
    {
      "target": "omastar",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "ferroseed": [
    {
      "target": "ferrothorn",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "solosis": [
    {
      "target": "duosion",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "duosion": [
    {
      "target": "reuniclus",
      "trigger": "level",
      "minLevel": 41,
      "item": null
    }
  ],
  "cubchoo": [
    {
      "target": "beartic",
      "trigger": "level",
      "minLevel": 37,
      "item": null
    }
  ],
  "vullaby": [
    {
      "target": "mandibuzz",
      "trigger": "level",
      "minLevel": 54,
      "item": null
    }
  ],
  "zorua": [
    {
      "target": "zoroark",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "bronzor": [
    {
      "target": "bronzong",
      "trigger": "level",
      "minLevel": 33,
      "item": null
    }
  ],
  "golett": [
    {
      "target": "golurk",
      "trigger": "level",
      "minLevel": 43,
      "item": null
    }
  ],
  "wailmer": [
    {
      "target": "wailord",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "shinx": [
    {
      "target": "luxio",
      "trigger": "level",
      "minLevel": 15,
      "item": null
    }
  ],
  "luxio": [
    {
      "target": "luxray",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "yanma": [
    {
      "target": "yanmega",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "igglybuff": [
    {
      "target": "jigglypuff",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "jigglypuff": [
    {
      "target": "wigglytuff",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_lunar"
    }
  ],
  "wingull": [
    {
      "target": "pelipper",
      "trigger": "level",
      "minLevel": 25,
      "item": null
    }
  ],
  "poochyena": [
    {
      "target": "mightyena",
      "trigger": "level",
      "minLevel": 18,
      "item": null
    }
  ],
  "spinarak": [
    {
      "target": "ariados",
      "trigger": "level",
      "minLevel": 22,
      "item": null
    }
  ],
  "burmy": [
    {
      "target": "wormadam",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    },
    {
      "target": "mothim",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "larvesta": [
    {
      "target": "volcarona",
      "trigger": "level",
      "minLevel": 59,
      "item": null
    }
  ],
  "growlithe": [
    {
      "target": "arcanine",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_fuego"
    }
  ],
  "swablu": [
    {
      "target": "altaria",
      "trigger": "level",
      "minLevel": 35,
      "item": null
    }
  ],
  "zigzagoon": [
    {
      "target": "linoone",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "linoone": [
    {
      "target": "obstagoon",
      "trigger": "level",
      "minLevel": 35,
      "item": null
    }
  ],
  "slugma": [
    {
      "target": "magcargo",
      "trigger": "level",
      "minLevel": 38,
      "item": null
    }
  ],
  "munchlax": [
    {
      "target": "snorlax",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "finneon": [
    {
      "target": "lumineon",
      "trigger": "level",
      "minLevel": 31,
      "item": null
    }
  ],
  "dunsparce": [
    {
      "target": "dudunsparce",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "natu": [
    {
      "target": "xatu",
      "trigger": "level",
      "minLevel": 25,
      "item": null
    }
  ],
  "nosepass": [
    {
      "target": "probopass",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "panpour": [
    {
      "target": "simipour",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_agua"
    }
  ],
  "hoothoot": [
    {
      "target": "noctowl",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "joltik": [
    {
      "target": "galvantula",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "duskull": [
    {
      "target": "dusclops",
      "trigger": "level",
      "minLevel": 37,
      "item": null
    }
  ],
  "dusclops": [
    {
      "target": "dusknoir",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "togepi": [
    {
      "target": "togetic",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "togetic": [
    {
      "target": "togekiss",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_solar"
    }
  ],
  "gothita": [
    {
      "target": "gothorita",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "gothorita": [
    {
      "target": "gothitelle",
      "trigger": "level",
      "minLevel": 41,
      "item": null
    }
  ],
  "tympole": [
    {
      "target": "palpitoad",
      "trigger": "level",
      "minLevel": 25,
      "item": null
    }
  ],
  "palpitoad": [
    {
      "target": "seismitoad",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "combee": [
    {
      "target": "vespiquen",
      "trigger": "level",
      "minLevel": 21,
      "item": null
    }
  ],
  "eevee": [
    {
      "target": "vaporeon",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_agua"
    },
    {
      "target": "jolteon",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_trueno"
    },
    {
      "target": "flareon",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_fuego"
    },
    {
      "target": "espeon",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    },
    {
      "target": "umbreon",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    },
    {
      "target": "leafeon",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    },
    {
      "target": "glaceon",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    },
    {
      "target": "sylveon",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "cherubi": [
    {
      "target": "cherrim",
      "trigger": "level",
      "minLevel": 25,
      "item": null
    }
  ],
  "pidgey": [
    {
      "target": "pidgeotto",
      "trigger": "level",
      "minLevel": 18,
      "item": null
    }
  ],
  "pidgeotto": [
    {
      "target": "pidgeot",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "sandshrew": [
    {
      "target": "sandslash",
      "trigger": "level",
      "minLevel": 22,
      "item": null
    }
  ],
  "chikorita": [
    {
      "target": "bayleef",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "bayleef": [
    {
      "target": "meganium",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "nidoran_m": [
    {
      "target": "nidorino",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "nidorino": [
    {
      "target": "nidoking",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_lunar"
    }
  ],
  "klink": [
    {
      "target": "klang",
      "trigger": "level",
      "minLevel": 38,
      "item": null
    }
  ],
  "klang": [
    {
      "target": "klinklang",
      "trigger": "level",
      "minLevel": 49,
      "item": null
    }
  ],
  "cubone": [
    {
      "target": "marowak",
      "trigger": "level",
      "minLevel": 28,
      "item": null
    }
  ],
  "petilil": [
    {
      "target": "lilligant",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_solar"
    }
  ],
  "ekans": [
    {
      "target": "arbok",
      "trigger": "level",
      "minLevel": 22,
      "item": null
    }
  ],
  "bellsprout": [
    {
      "target": "weepinbell",
      "trigger": "level",
      "minLevel": 21,
      "item": null
    }
  ],
  "weepinbell": [
    {
      "target": "victreebel",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_hoja"
    }
  ],
  "scyther": [
    {
      "target": "scizor",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    },
    {
      "target": "kleavor",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_lunar"
    }
  ],
  "slakoth": [
    {
      "target": "vigoroth",
      "trigger": "level",
      "minLevel": 18,
      "item": null
    }
  ],
  "vigoroth": [
    {
      "target": "slaking",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "taillow": [
    {
      "target": "swellow",
      "trigger": "level",
      "minLevel": 22,
      "item": null
    }
  ],
  "spoink": [
    {
      "target": "grumpig",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "squirtle": [
    {
      "target": "wartortle",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "wartortle": [
    {
      "target": "blastoise",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "darumaka": [
    {
      "target": "darmanitan",
      "trigger": "level",
      "minLevel": 35,
      "item": null
    }
  ],
  "aron": [
    {
      "target": "lairon",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "lairon": [
    {
      "target": "aggron",
      "trigger": "level",
      "minLevel": 42,
      "item": null
    }
  ],
  "tynamo": [
    {
      "target": "eelektrik",
      "trigger": "level",
      "minLevel": 39,
      "item": null
    }
  ],
  "eelektrik": [
    {
      "target": "eelektross",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_trueno"
    }
  ],
  "chingling": [
    {
      "target": "chimecho",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "mime_jr": [
    {
      "target": "mr_mime",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "mr_mime": [
    {
      "target": "mr_rime",
      "trigger": "level",
      "minLevel": 42,
      "item": null
    }
  ],
  "charmander": [
    {
      "target": "charmeleon",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "charmeleon": [
    {
      "target": "charizard",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "wynaut": [
    {
      "target": "wobbuffet",
      "trigger": "level",
      "minLevel": 15,
      "item": null
    }
  ],
  "deerling": [
    {
      "target": "sawsbuck",
      "trigger": "level",
      "minLevel": 34,
      "item": null
    }
  ],
  "roggenrola": [
    {
      "target": "boldore",
      "trigger": "level",
      "minLevel": 25,
      "item": null
    }
  ],
  "boldore": [
    {
      "target": "gigalith",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "carvanha": [
    {
      "target": "sharpedo",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "chinchou": [
    {
      "target": "lanturn",
      "trigger": "level",
      "minLevel": 27,
      "item": null
    }
  ],
  "meowth": [
    {
      "target": "persian",
      "trigger": "level",
      "minLevel": 28,
      "item": null
    },
    {
      "target": "perrserker",
      "trigger": "level",
      "minLevel": 28,
      "item": null
    }
  ],
  "shelmet": [
    {
      "target": "accelgor",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "anorith": [
    {
      "target": "armaldo",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "clamperl": [
    {
      "target": "huntail",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    },
    {
      "target": "gorebyss",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "goldeen": [
    {
      "target": "seaking",
      "trigger": "level",
      "minLevel": 33,
      "item": null
    }
  ],
  "electrike": [
    {
      "target": "manectric",
      "trigger": "level",
      "minLevel": 26,
      "item": null
    }
  ],
  "farfetchd": [
    {
      "target": "sirfetchd",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "drifloon": [
    {
      "target": "drifblim",
      "trigger": "level",
      "minLevel": 28,
      "item": null
    }
  ],
  "voltorb": [
    {
      "target": "electrode",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "bulbasaur": [
    {
      "target": "ivysaur",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "ivysaur": [
    {
      "target": "venusaur",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "lotad": [
    {
      "target": "lombre",
      "trigger": "level",
      "minLevel": 14,
      "item": null
    }
  ],
  "lombre": [
    {
      "target": "ludicolo",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_agua"
    }
  ],
  "kricketot": [
    {
      "target": "kricketune",
      "trigger": "level",
      "minLevel": 10,
      "item": null
    }
  ],
  "elekid": [
    {
      "target": "electabuzz",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "electabuzz": [
    {
      "target": "electivire",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "pansear": [
    {
      "target": "simisear",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_fuego"
    }
  ],
  "snover": [
    {
      "target": "abomasnow",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "phanpy": [
    {
      "target": "donphan",
      "trigger": "level",
      "minLevel": 25,
      "item": null
    }
  ],
  "timburr": [
    {
      "target": "gurdurr",
      "trigger": "level",
      "minLevel": 25,
      "item": null
    }
  ],
  "gurdurr": [
    {
      "target": "conkeldurr",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "deino": [
    {
      "target": "zweilous",
      "trigger": "level",
      "minLevel": 50,
      "item": null
    }
  ],
  "zweilous": [
    {
      "target": "hydreigon",
      "trigger": "level",
      "minLevel": 64,
      "item": null
    }
  ],
  "ponyta": [
    {
      "target": "rapidash",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "vulpix": [
    {
      "target": "ninetales",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_fuego"
    }
  ],
  "krabby": [
    {
      "target": "kingler",
      "trigger": "level",
      "minLevel": 28,
      "item": null
    }
  ],
  "buneary": [
    {
      "target": "lopunny",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "drilbur": [
    {
      "target": "excadrill",
      "trigger": "level",
      "minLevel": 31,
      "item": null
    }
  ],
  "makuhita": [
    {
      "target": "hariyama",
      "trigger": "level",
      "minLevel": 24,
      "item": null
    }
  ],
  "sunkern": [
    {
      "target": "sunflora",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_solar"
    }
  ],
  "snorunt": [
    {
      "target": "glalie",
      "trigger": "level",
      "minLevel": 42,
      "item": null
    },
    {
      "target": "froslass",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_solar"
    }
  ],
  "oddish": [
    {
      "target": "gloom",
      "trigger": "level",
      "minLevel": 21,
      "item": null
    }
  ],
  "gloom": [
    {
      "target": "vileplume",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_hoja"
    },
    {
      "target": "bellossom",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_solar"
    }
  ],
  "rhyhorn": [
    {
      "target": "rhydon",
      "trigger": "level",
      "minLevel": 42,
      "item": null
    }
  ],
  "rhydon": [
    {
      "target": "rhyperior",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "bagon": [
    {
      "target": "shelgon",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "shelgon": [
    {
      "target": "salamence",
      "trigger": "level",
      "minLevel": 50,
      "item": null
    }
  ],
  "foongus": [
    {
      "target": "amoonguss",
      "trigger": "level",
      "minLevel": 39,
      "item": null
    }
  ],
  "cottonee": [
    {
      "target": "whimsicott",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_solar"
    }
  ],
  "starly": [
    {
      "target": "staravia",
      "trigger": "level",
      "minLevel": 14,
      "item": null
    }
  ],
  "staravia": [
    {
      "target": "staraptor",
      "trigger": "level",
      "minLevel": 34,
      "item": null
    }
  ],
  "wooper": [
    {
      "target": "quagsire",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    },
    {
      "target": "clodsire",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "spheal": [
    {
      "target": "sealeo",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "sealeo": [
    {
      "target": "walrein",
      "trigger": "level",
      "minLevel": 44,
      "item": null
    }
  ],
  "snivy": [
    {
      "target": "servine",
      "trigger": "level",
      "minLevel": 17,
      "item": null
    }
  ],
  "servine": [
    {
      "target": "serperior",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "pineco": [
    {
      "target": "forretress",
      "trigger": "level",
      "minLevel": 31,
      "item": null
    }
  ],
  "teddiursa": [
    {
      "target": "ursaring",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "ursaring": [
    {
      "target": "ursaluna",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_lunar"
    }
  ],
  "swinub": [
    {
      "target": "piloswine",
      "trigger": "level",
      "minLevel": 33,
      "item": null
    }
  ],
  "piloswine": [
    {
      "target": "mamoswine",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "croagunk": [
    {
      "target": "toxicroak",
      "trigger": "level",
      "minLevel": 37,
      "item": null
    }
  ],
  "pichu": [
    {
      "target": "pikachu",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "pikachu": [
    {
      "target": "raichu",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_trueno"
    }
  ],
  "azurill": [
    {
      "target": "marill",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "marill": [
    {
      "target": "azumarill",
      "trigger": "level",
      "minLevel": 18,
      "item": null
    }
  ],
  "mantyke": [
    {
      "target": "mantine",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "slowpoke": [
    {
      "target": "slowbro",
      "trigger": "level",
      "minLevel": 37,
      "item": null
    },
    {
      "target": "slowking",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "weedle": [
    {
      "target": "kakuna",
      "trigger": "level",
      "minLevel": 7,
      "item": null
    }
  ],
  "kakuna": [
    {
      "target": "beedrill",
      "trigger": "level",
      "minLevel": 10,
      "item": null
    }
  ],
  "archen": [
    {
      "target": "archeops",
      "trigger": "level",
      "minLevel": 37,
      "item": null
    }
  ],
  "cranidos": [
    {
      "target": "rampardos",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "gulpin": [
    {
      "target": "swalot",
      "trigger": "level",
      "minLevel": 26,
      "item": null
    }
  ],
  "caterpie": [
    {
      "target": "metapod",
      "trigger": "level",
      "minLevel": 7,
      "item": null
    }
  ],
  "metapod": [
    {
      "target": "butterfree",
      "trigger": "level",
      "minLevel": 10,
      "item": null
    }
  ],
  "totodile": [
    {
      "target": "croconaw",
      "trigger": "level",
      "minLevel": 18,
      "item": null
    }
  ],
  "croconaw": [
    {
      "target": "feraligatr",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "feebas": [
    {
      "target": "milotic",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "munna": [
    {
      "target": "musharna",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_lunar"
    }
  ],
  "happiny": [
    {
      "target": "chansey",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "chansey": [
    {
      "target": "blissey",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "remoraid": [
    {
      "target": "octillery",
      "trigger": "level",
      "minLevel": 25,
      "item": null
    }
  ],
  "pansage": [
    {
      "target": "simisage",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_hoja"
    }
  ],
  "barboach": [
    {
      "target": "whiscash",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "hippopotas": [
    {
      "target": "hippowdon",
      "trigger": "level",
      "minLevel": 34,
      "item": null
    }
  ],
  "lillipup": [
    {
      "target": "herdier",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "herdier": [
    {
      "target": "stoutland",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "cyndaquil": [
    {
      "target": "quilava",
      "trigger": "level",
      "minLevel": 14,
      "item": null
    }
  ],
  "quilava": [
    {
      "target": "typhlosion",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "scraggy": [
    {
      "target": "scrafty",
      "trigger": "level",
      "minLevel": 39,
      "item": null
    }
  ],
  "ducklett": [
    {
      "target": "swanna",
      "trigger": "level",
      "minLevel": 35,
      "item": null
    }
  ],
  "tangela": [
    {
      "target": "tangrowth",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "horsea": [
    {
      "target": "seadra",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "seadra": [
    {
      "target": "kingdra",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "spearow": [
    {
      "target": "fearow",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "mudkip": [
    {
      "target": "marshtomp",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "marshtomp": [
    {
      "target": "swampert",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "corsola": [
    {
      "target": "cursola",
      "trigger": "level",
      "minLevel": 38,
      "item": null
    }
  ],
  "rufflet": [
    {
      "target": "braviary",
      "trigger": "level",
      "minLevel": 54,
      "item": null
    }
  ],
  "torchic": [
    {
      "target": "combusken",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "combusken": [
    {
      "target": "blaziken",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "buizel": [
    {
      "target": "floatzel",
      "trigger": "level",
      "minLevel": 26,
      "item": null
    }
  ],
  "trapinch": [
    {
      "target": "vibrava",
      "trigger": "level",
      "minLevel": 35,
      "item": null
    }
  ],
  "vibrava": [
    {
      "target": "flygon",
      "trigger": "level",
      "minLevel": 45,
      "item": null
    }
  ],
  "gligar": [
    {
      "target": "gliscor",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "ralts": [
    {
      "target": "kirlia",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "kirlia": [
    {
      "target": "gardevoir",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    },
    {
      "target": "gallade",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_solar"
    }
  ],
  "tyrogue": [
    {
      "target": "hitmonlee",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    },
    {
      "target": "hitmonchan",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    },
    {
      "target": "hitmontop",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "magikarp": [
    {
      "target": "gyarados",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "tentacool": [
    {
      "target": "tentacruel",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "zubat": [
    {
      "target": "golbat",
      "trigger": "level",
      "minLevel": 22,
      "item": null
    }
  ],
  "golbat": [
    {
      "target": "crobat",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "shuppet": [
    {
      "target": "banette",
      "trigger": "level",
      "minLevel": 37,
      "item": null
    }
  ],
  "nincada": [
    {
      "target": "ninjask",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    },
    {
      "target": "shedinja",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "kabuto": [
    {
      "target": "kabutops",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "geodude": [
    {
      "target": "graveler",
      "trigger": "level",
      "minLevel": 25,
      "item": null
    }
  ],
  "graveler": [
    {
      "target": "golem",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "blitzle": [
    {
      "target": "zebstrika",
      "trigger": "level",
      "minLevel": 27,
      "item": null
    }
  ],
  "woobat": [
    {
      "target": "swoobat",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "riolu": [
    {
      "target": "lucario",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "lickitung": [
    {
      "target": "lickilicky",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "shellder": [
    {
      "target": "cloyster",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_agua"
    }
  ],
  "skitty": [
    {
      "target": "delcatty",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_lunar"
    }
  ],
  "sneasel": [
    {
      "target": "weavile",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    },
    {
      "target": "sneasler",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "treecko": [
    {
      "target": "grovyle",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "grovyle": [
    {
      "target": "sceptile",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "axew": [
    {
      "target": "fraxure",
      "trigger": "level",
      "minLevel": 38,
      "item": null
    }
  ],
  "fraxure": [
    {
      "target": "haxorus",
      "trigger": "level",
      "minLevel": 48,
      "item": null
    }
  ],
  "dwebble": [
    {
      "target": "crustle",
      "trigger": "level",
      "minLevel": 34,
      "item": null
    }
  ],
  "phione": [
    {
      "target": "manaphy",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "abra": [
    {
      "target": "kadabra",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "kadabra": [
    {
      "target": "alakazam",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "baltoy": [
    {
      "target": "claydol",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "yamask": [
    {
      "target": "cofagrigus",
      "trigger": "level",
      "minLevel": 34,
      "item": null
    },
    {
      "target": "runerigus",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "pawniard": [
    {
      "target": "bisharp",
      "trigger": "level",
      "minLevel": 52,
      "item": null
    }
  ],
  "bisharp": [
    {
      "target": "kingambit",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "surskit": [
    {
      "target": "masquerain",
      "trigger": "level",
      "minLevel": 22,
      "item": null
    }
  ],
  "bidoof": [
    {
      "target": "bibarel",
      "trigger": "level",
      "minLevel": 15,
      "item": null
    }
  ],
  "mareep": [
    {
      "target": "flaaffy",
      "trigger": "level",
      "minLevel": 15,
      "item": null
    }
  ],
  "flaaffy": [
    {
      "target": "ampharos",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "staryu": [
    {
      "target": "starmie",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_agua"
    }
  ],
  "piplup": [
    {
      "target": "prinplup",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "prinplup": [
    {
      "target": "empoleon",
      "trigger": "level",
      "minLevel": 36,
      "item": null
    }
  ],
  "minccino": [
    {
      "target": "cinccino",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_solar"
    }
  ],
  "sewaddle": [
    {
      "target": "swadloon",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "swadloon": [
    {
      "target": "leavanny",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "cleffa": [
    {
      "target": "clefairy",
      "trigger": "level",
      "minLevel": 20,
      "item": null
    }
  ],
  "clefairy": [
    {
      "target": "clefable",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_lunar"
    }
  ],
  "venonat": [
    {
      "target": "venomoth",
      "trigger": "level",
      "minLevel": 31,
      "item": null
    }
  ],
  "stunky": [
    {
      "target": "skuntank",
      "trigger": "level",
      "minLevel": 34,
      "item": null
    }
  ],
  "murkrow": [
    {
      "target": "honchkrow",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_lunar"
    }
  ],
  "tirtouga": [
    {
      "target": "carracosta",
      "trigger": "level",
      "minLevel": 37,
      "item": null
    }
  ],
  "grimer": [
    {
      "target": "muk",
      "trigger": "level",
      "minLevel": 38,
      "item": null
    }
  ],
  "mienfoo": [
    {
      "target": "mienshao",
      "trigger": "level",
      "minLevel": 50,
      "item": null
    }
  ],
  "frillish": [
    {
      "target": "jellicent",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "corphish": [
    {
      "target": "crawdaunt",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "shieldon": [
    {
      "target": "bastiodon",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "sandile": [
    {
      "target": "krokorok",
      "trigger": "level",
      "minLevel": 29,
      "item": null
    }
  ],
  "krokorok": [
    {
      "target": "krookodile",
      "trigger": "level",
      "minLevel": 40,
      "item": null
    }
  ],
  "larvitar": [
    {
      "target": "pupitar",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "pupitar": [
    {
      "target": "tyranitar",
      "trigger": "level",
      "minLevel": 55,
      "item": null
    }
  ],
  "karrablast": [
    {
      "target": "escavalier",
      "trigger": "trade",
      "minLevel": 1,
      "item": null
    }
  ],
  "dratini": [
    {
      "target": "dragonair",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "dragonair": [
    {
      "target": "dragonite",
      "trigger": "level",
      "minLevel": 55,
      "item": null
    }
  ],
  "girafarig": [
    {
      "target": "farigiraf",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "seel": [
    {
      "target": "dewgong",
      "trigger": "level",
      "minLevel": 34,
      "item": null
    }
  ],
  "sentret": [
    {
      "target": "furret",
      "trigger": "level",
      "minLevel": 15,
      "item": null
    }
  ],
  "cacnea": [
    {
      "target": "cacturne",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "smoochum": [
    {
      "target": "jynx",
      "trigger": "level",
      "minLevel": 30,
      "item": null
    }
  ],
  "pidove": [
    {
      "target": "tranquill",
      "trigger": "level",
      "minLevel": 21,
      "item": null
    }
  ],
  "tranquill": [
    {
      "target": "unfezant",
      "trigger": "level",
      "minLevel": 32,
      "item": null
    }
  ],
  "mankey": [
    {
      "target": "primeape",
      "trigger": "level",
      "minLevel": 28,
      "item": null
    }
  ],
  "primeape": [
    {
      "target": "annihilape",
      "trigger": "level",
      "minLevel": 16,
      "item": null
    }
  ],
  "exeggcute": [
    {
      "target": "exeggutor",
      "trigger": "stone",
      "minLevel": 1,
      "item": "piedra_hoja"
    }
  ],
  "ledyba": [
    {
      "target": "ledian",
      "trigger": "level",
      "minLevel": 18,
      "item": null
    }
  ]
};

export function getEvolutionOptions(speciesId: string): EvolutionOption[] {
  const clean = speciesId.toLowerCase().trim().replace(/[-\s]/g, "_");
  return EVOLUTION_MAP[clean] || [];
}

export function checkTradeEvolution(speciesId: string): EvolutionOption | undefined {
  const options = getEvolutionOptions(speciesId);
  return options.find((opt) => opt.trigger === "trade");
}

export function canEvolve(
  pet: UserPet,
  inventory: Record<string, number>,
  stoneId?: string,
): { canEvolve: boolean; option?: EvolutionOption; reason?: string } {
  const options = getEvolutionOptions(pet.pet_type);
  if (!options || options.length === 0) {
    return { canEvolve: false, reason: `**${pet.name}** no tiene evoluciones conocidas en este momento.` };
  }

  // If a specific stone was specified
  if (stoneId) {
    const stoneClean = stoneId.toLowerCase().trim();
    const opt = options.find((o) => o.trigger === "stone" && o.item === stoneClean);
    if (!opt) {
      return { canEvolve: false, reason: `Esa piedra evolutiva no tiene efecto en **${pet.name}**.` };
    }
    const userQty = inventory[stoneClean] || 0;
    if (userQty < 1) {
      return { canEvolve: false, reason: `No tienes suficientes piedras (**${stoneClean.replace(/_/g, " ")}**) en tu mochila.` };
    }
    return { canEvolve: true, option: opt };
  }

  // Check level-up evolutions first
  const levelOpt = options.find((o) => o.trigger === "level");
  if (levelOpt) {
    if (pet.level >= levelOpt.minLevel) {
      return { canEvolve: true, option: levelOpt };
    } else {
      return {
        canEvolve: false,
        reason: `**${pet.name}** necesita alcanzar el **Nivel ${levelOpt.minLevel}** para evolucionar (Nivel actual: ${pet.level}).`,
      };
    }
  }

  // Check stone evolutions if user owns one of the required stones
  const stoneOpts = options.filter((o) => o.trigger === "stone");
  for (const sOpt of stoneOpts) {
    if (sOpt.item && (inventory[sOpt.item] || 0) >= 1) {
      return { canEvolve: true, option: sOpt };
    }
  }

  // If it only evolves by stone and user has none
  if (stoneOpts.length > 0) {
    const requiredNames = stoneOpts.map((o) => o.item?.replace(/_/g, " ")).filter(Boolean).join(" o ");
    return {
      canEvolve: false,
      reason: `**${pet.name}** necesita una **${requiredNames}** de tu mochila para evolucionar. Consíguela en \`/pokemon tienda\`.`,
    };
  }

  // If it evolves by trade
  const tradeOpt = options.find((o) => o.trigger === "trade");
  if (tradeOpt) {
    return {
      canEvolve: false,
      reason: `**${pet.name}** es una especie especial que evoluciona mediante **intercambio**. ¡Usa \`/pokemon intercambio\` con otro entrenador!`,
    };
  }

  return { canEvolve: false, reason: "No se cumplen las condiciones para evolucionar." };
}

export function evolvePokemon(
  guildId: string,
  userId: string,
  petIdentifier?: string | number,
  stoneId?: string,
): {
  ok: boolean;
  message: string;
  oldSpecies?: PetSpeciesDef;
  newSpecies?: PetSpeciesDef;
  pet?: UserPet;
} {
  const pet = getUserPet(guildId, userId, petIdentifier);
  if (!pet) {
    return { ok: false, message: "No se encontró el Pokémon especificado en tu equipo." };
  }

  const oldSpecies = getPokemonById(pet.pet_type);
  if (!oldSpecies) {
    return { ok: false, message: "Especie base de Pokémon no encontrada en la base de datos." };
  }

  const eco = getEco(guildId, userId);
  const inv = invOf(eco);
  const evalResult = canEvolve(pet, inv, stoneId);
  if (!evalResult.canEvolve || !evalResult.option) {
    return { ok: false, message: evalResult.reason || "Tu Pokémon no puede evolucionar en este momento." };
  }

  const newSpecies = getPokemonById(evalResult.option.target);
  if (!newSpecies) {
    return { ok: false, message: "No se encontró información sobre la especie evolucionada." };
  }

  // Deduct stone if consumed
  if (evalResult.option.trigger === "stone" && evalResult.option.item) {
    takeItem(eco, evalResult.option.item);
    saveEco(eco, `Consumo de ${evalResult.option.item} para evolución Pokémon`);
  }

  // Check if name was default species name or custom nickname
  const newName = (pet.name.toLowerCase() === oldSpecies.name.toLowerCase() || pet.name.toLowerCase() === oldSpecies.pokemonName.toLowerCase())
    ? newSpecies.name
    : pet.name;

  const db = getDb();
  db.prepare(
    "UPDATE user_pets SET pet_type = ?, name = ? WHERE id = ? AND guild_id = ? AND user_id = ?"
  ).run(newSpecies.id, newName, pet.id, guildId, userId);

  // Register new species in Pokedex
  registerPokedex(guildId, userId, newSpecies.id);

  pet.pet_type = newSpecies.id;
  pet.name = newName;

  return {
    ok: true,
    message: `✨ ¡Increíble! ¡**${oldSpecies.name}** ha evolucionado a **${newSpecies.name}**!`,
    oldSpecies,
    newSpecies,
    pet,
  };
}
