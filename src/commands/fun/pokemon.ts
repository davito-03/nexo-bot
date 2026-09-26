import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} from "discord.js";
import { baseEmbed, onlyGuild } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import {
  POKEMON_CATALOG,
  ALL_POKEMON_LIST,
  PET_SPECIES,
  getPokemonById,
  getPokemonByRegion,
  ALL_GYM_LEADERS,
  getGymLeaders,
  getGymLeader,
  getUserBadges,
  awardBadge,
  renderBadgeCase,
  getUserPokedex,
  registerPokedex,
  getPokedexStats,
  getDaycareEntries,
  depositDaycare,
  withdrawDaycare,
  claimTrainerSalary,
  transferPokemonToProfessor,
  useItemOnPokemon,
  generateSafariEncounter,
  simulateSafariCatch,
  simulatePetBattle,
  simulateGymBattle,
  getUserPets,
  getUserPet,
  getActivePet,
  setActivePet,
  adoptPet,
  feedPet,
  petThePet,
  renamePet,
  releasePet,
  sendOnExpedition,
  claimExpeditionReward,
  buyEgg,
  MAX_PETS_PER_USER,
  type PokemonRegion,
} from "../../modules/pets/engine.js";
import { n, getEco, saveEco, invOf, hasItem, giveItem, takeItem, addWallet, totalFunds, deductFundsDetailed } from "../../modules/economy/engine.js";
import { evolvePokemon } from "../../modules/pets/evolutions.js";
import { getDb } from "../../database/index.js";
import { executeTrade } from "../../modules/pets/trades.js";
import { getCurrentRaid, getRaidContributors, attackRaid } from "../../modules/pets/raids.js";
import {
  createWildBattle,
  executePlayerAttack,
  executeWildAttack,
  attemptCatch,
  ZONE_NAMES,
  type ExplorationZone,
} from "../../modules/pets/wildBattles.js";
import { sleep } from "../../utils/time.js";
import type { Command } from "../../types/index.js";

const TYPE_INFO: Record<string, { name: string; emoji: string }> = {
  normal: { name: "Normal", emoji: "🔘" },
  fuego: { name: "Fuego", emoji: "🔥" },
  agua: { name: "Agua", emoji: "💧" },
  planta: { name: "Planta", emoji: "🌿" },
  electrico: { name: "Eléctrico", emoji: "⚡" },
  hielo: { name: "Hielo", emoji: "❄️" },
  lucha: { name: "Lucha", emoji: "🥊" },
  veneno: { name: "Veneno", emoji: "☠️" },
  tierra: { name: "Tierra", emoji: "🏜️" },
  volador: { name: "Volador", emoji: "🌪️" },
  psiquico: { name: "Psíquico", emoji: "🔮" },
  bicho: { name: "Bicho", emoji: "🐛" },
  roca: { name: "Roca", emoji: "🪨" },
  fantasma: { name: "Fantasma", emoji: "👻" },
  dragon: { name: "Dragón", emoji: "🐉" },
  acero: { name: "Acero", emoji: "⚙️" },
  hada: { name: "Hada", emoji: "✨" },
  siniestro: { name: "Siniestro", emoji: "🌑" },
};

const RARITY_INFO: Record<string, { label: string; emoji: string }> = {
  comun: { label: "Común", emoji: "⚪" },
  poco_comun: { label: "Poco común", emoji: "🟢" },
  raro: { label: "Raro", emoji: "🔵" },
  epico: { label: "Épico", emoji: "🟣" },
  legendario: { label: "Legendario", emoji: "🟡" },
  mitico: { label: "Mítico", emoji: "🔴" },
};

function ephem(text: string) {
  return { embeds: [baseEmbed(COLORS.danger).setDescription(text)], ephemeral: true };
}

function renderHpBar(current: number, max: number, size = 10): string {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * size);
  const empty = size - filled;
  const color = ratio > 0.5 ? "🟩" : ratio > 0.2 ? "🟨" : "🟥";
  return `${color.repeat(filled)}${"⬛".repeat(empty)} ${current}/${max} PS`;
}

function renderExpBar(exp: number, nextExp: number, size = 10): string {
  const ratio = Math.max(0, Math.min(1, exp / nextExp));
  const filled = Math.round(ratio * size);
  const empty = size - filled;
  return `${"🟦".repeat(filled)}${"⬛".repeat(empty)} ${exp}/${nextExp} EXP`;
}

const POKEMART_ITEMS: { id: string; name: string; price: number; emoji: string; desc: string; category: string }[] = [
  { id: "pokeball", name: "Poké Ball", price: 50, emoji: "🔴", desc: "Cápsula estándar de captura (Ratio x1.0)", category: "Bolas" },
  { id: "superball", name: "Super Ball", price: 150, emoji: "🔵", desc: "Mejor ratio de captura que una Poké Ball (Ratio x1.5)", category: "Bolas" },
  { id: "ultraball", name: "Ultra Ball", price: 400, emoji: "🟡", desc: "Alta probabilidad de captura (Ratio x2.0)", category: "Bolas" },
  { id: "masterball", name: "Master Ball", price: 5000, emoji: "🟣", desc: "Captura 100% infalible garantizada", category: "Bolas" },
  { id: "baya_frambu", name: "Baya Frambu", price: 80, emoji: "🍓", desc: "+25% probabilidad de atrapar en Safari", category: "Bayas" },
  { id: "baya_latano", name: "Baya Latano", price: 80, emoji: "🍌", desc: "Tranquiliza al Pokémon salvaje impidiendo que huya", category: "Bayas" },
  { id: "baya_pinia", name: "Baya Pinia", price: 120, emoji: "🍍", desc: "Duplica EXP y NexoCoins al capturar", category: "Bayas" },
  { id: "pocion_maxima", name: "Poción Máxima", price: 250, emoji: "🧪", desc: "Restaura la vitalidad y felicidad al 100%", category: "Pociones" },
  { id: "caramelo_raro", name: "Caramelo Raro", price: 750, emoji: "🍬", desc: "Sube automáticamente 1 nivel a tu Pokémon", category: "Especial" },
  { id: "piedra_fuego", name: "Piedra Fuego", price: 1000, emoji: "🔥", desc: "Induce la evolución de Eevee, Vulpix o Growlithe", category: "Piedras" },
  { id: "piedra_agua", name: "Piedra Agua", price: 1000, emoji: "💧", desc: "Induce la evolución de Eevee, Poliwhirl, Shellder o Staryu", category: "Piedras" },
  { id: "piedra_trueno", name: "Piedra Trueno", price: 1000, emoji: "⚡", desc: "Induce la evolución de Pikachu o Eevee", category: "Piedras" },
  { id: "piedra_hoja", name: "Piedra Hoja", price: 1000, emoji: "🍃", desc: "Induce la evolución de Gloom, Weepinbell o Nuzleaf", category: "Piedras" },
  { id: "piedra_lunar", name: "Piedra Lunar", price: 1200, emoji: "🌙", desc: "Induce la evolución de Clefairy, Jigglypuff, Nidorina o Nidorino", category: "Piedras" },
  { id: "piedra_solar", name: "Piedra Solar", price: 1200, emoji: "☀️", desc: "Induce la evolución de Gloom o Sunkern", category: "Piedras" },
  { id: "huevo_comun", name: "Huevo Común", price: 1500, emoji: "🥚", desc: "Incuba y eclosiona un Pokémon Común o Poco Común", category: "Huevos" },
  { id: "huevo_mistico", name: "Huevo Místico", price: 4000, emoji: "🔮", desc: "Gran probabilidad de Pokémon Épico o Raro", category: "Huevos" },
  { id: "huevo_legendario", name: "Huevo Legendario", price: 12000, emoji: "✨", desc: "¡Probabilidad de Pokémon Legendario!", category: "Huevos" },
];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("pokemon")
    .setDescription("Sistema Integral Pokémon: 386 Pokémon (Gen 1-3), Gimnasios, Safari, Duelos y Tienda")
    .addSubcommand((s) =>
      s
        .setName("perfil")
        .setDescription("Ver ficha de tu Pokémon activo: sprite animado, tipo, PS, estadísticas y medallero")
        .addUserOption((o) => o.setName("usuario").setDescription("Ver Pokémon de otro entrenador"))
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Pokémon específico de tu equipo a consultar").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("equipo")
        .setDescription("Ver la lista completa de Pokémon que tienes en tu equipo/rancho")
        .addUserOption((o) => o.setName("usuario").setDescription("Ver equipo de otro entrenador")),
    )
    .addSubcommand((s) =>
      s
        .setName("seleccionar")
        .setDescription("Establecer cuál de tus Pokémon es tu compañero activo de combate")
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Pokémon que deseas activar").setRequired(true).setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("pokedex")
        .setDescription("Consultar la Pokédex Nacional (Gens 1 a 5: 649 criaturas)")
        .addStringOption((o) =>
          o
            .setName("region")
            .setDescription("Filtrar por región")
            .addChoices(
              { name: "Todas (649 Pokémon)", value: "todas" },
              { name: "Kanto (Gen 1: #001-#151)", value: "kanto" },
              { name: "Johto (Gen 2: #152-#251)", value: "johto" },
              { name: "Hoenn (Gen 3: #252-#386)", value: "hoenn" },
              { name: "Sinnoh (Gen 4: #387-#493)", value: "sinnoh" },
              { name: "Teselia (Gen 5: #494-#649)", value: "teselia" },
            ),
        )
        .addIntegerOption((o) => o.setName("pagina").setDescription("Número de página a consultar").setMinValue(1))
        .addUserOption((o) => o.setName("usuario").setDescription("Ver Pokédex de otro entrenador")),
    )
    .addSubcommand((s) =>
      s
        .setName("capturar")
        .setDescription("Explorar la hierba alta / Zona Safari para capturar Pokémon salvajes con animación")
        .addStringOption((o) =>
          o
            .setName("region")
            .setDescription("Región donde buscar criaturas")
            .addChoices(
              { name: "Kanto (Rutas de Kanto)", value: "kanto" },
              { name: "Johto (Rutas de Johto)", value: "johto" },
              { name: "Hoenn (Rutas de Hoenn)", value: "hoenn" },
              { name: "Sinnoh (Rutas de Sinnoh)", value: "sinnoh" },
              { name: "Teselia (Rutas de Teselia)", value: "teselia" },
            ),
        )
        .addStringOption((o) =>
          o
            .setName("ball")
            .setDescription("Cápsula a emplear de tu inventario")
            .addChoices(
              { name: "Poké Ball (x1.0)", value: "pokeball" },
              { name: "Super Ball (x1.5)", value: "superball" },
              { name: "Ultra Ball (x2.0)", value: "ultraball" },
              { name: "Master Ball (100% éxito)", value: "masterball" },
            ),
        )
        .addStringOption((o) =>
          o
            .setName("baya")
            .setDescription("Baya a lanzar antes del tiro")
            .addChoices(
              { name: "Baya Frambu (+25% ratio)", value: "baya_frambu" },
              { name: "Baya Latano (impide que huya)", value: "baya_latano" },
              { name: "Baya Pinia (doble EXP y monedas)", value: "baya_pinia" },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("gimnasio")
        .setDescription("Desafiar a los 24 Líderes de Gimnasio oficiales de Kanto, Johto y Hoenn")
        .addStringOption((o) =>
          o
            .setName("accion")
            .setDescription("Acción en el gimnasio")
            .setRequired(true)
            .addChoices(
              { name: "Ver lista de líderes y medallas", value: "lista" },
              { name: "Retar a un líder de gimnasio", value: "retar" },
            ),
        )
        .addStringOption((o) =>
          o
            .setName("region")
            .setDescription("Región a consultar")
            .addChoices(
              { name: "Kanto (8 líderes)", value: "kanto" },
              { name: "Johto (8 líderes)", value: "johto" },
              { name: "Hoenn (8 líderes)", value: "hoenn" },
            ),
        )
        .addStringOption((o) =>
          o.setName("lider").setDescription("Líder al que deseas retar").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("duelo")
        .setDescription("Duelo Pokémon PvP por turnos con apuestas opcionales en NexoCoins")
        .addUserOption((o) => o.setName("oponente").setDescription("Entrenador al que deseas desafiar").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("apuesta").setDescription("Cantidad de NexoCoins a apostar (el ganador se lleva el bote)").setMinValue(0),
        )
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Tu Pokémon para el combate (por defecto el activo)").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("tienda")
        .setDescription("Poké Mart: Adquirir Poké Balls, bayas, pociones, piedras evolutivas o adoptar criaturas")
        .addStringOption((o) =>
          o
            .setName("accion")
            .setDescription("Acción en la tienda")
            .addChoices(
              { name: "Ver catálogo de artículos", value: "ver" },
              { name: "Comprar artículo", value: "comprar" },
            ),
        )
        .addStringOption((o) =>
          o.setName("item").setDescription("Artículo que deseas comprar").setAutocomplete(true),
        )
        .addIntegerOption((o) =>
          o.setName("cantidad").setDescription("Cantidad a comprar").setMinValue(1).setMaxValue(50),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("mochila")
        .setDescription("Consultar tu Mochila de Entrenador: Poké Balls, bayas, pociones, piedras y saldo")
        .addUserOption((o) => o.setName("usuario").setDescription("Ver mochila de otro entrenador")),
    )
    .addSubcommand((s) =>
      s
        .setName("intercambio")
        .setDescription("Intercambiar Pokémon de forma segura con otro entrenador (soporta evoluciones)")
        .addUserOption((o) => o.setName("oponente").setDescription("Entrenador con quien realizar el intercambio").setRequired(true))
        .addStringOption((o) => o.setName("tu_pokemon").setDescription("El Pokémon que ofreces").setRequired(true).setAutocomplete(true))
        .addStringOption((o) => o.setName("su_pokemon").setDescription("El Pokémon que solicitas a cambio").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("evolucionar")
        .setDescription("Evolucionar un Pokémon de tu equipo por nivel o mediante piedra evolutiva")
        .addStringOption((o) => o.setName("pokemon").setDescription("Pokémon que deseas evolucionar").setAutocomplete(true))
        .addStringOption((o) =>
          o
            .setName("piedra")
            .setDescription("Piedra evolutiva opcional de tu mochila")
            .addChoices(
              { name: "Piedra Fuego 🔥", value: "piedra_fuego" },
              { name: "Piedra Agua 💧", value: "piedra_agua" },
              { name: "Piedra Trueno ⚡", value: "piedra_trueno" },
              { name: "Piedra Hoja 🍃", value: "piedra_hoja" },
              { name: "Piedra Lunar 🌙", value: "piedra_lunar" },
              { name: "Piedra Solar ☀️", value: "piedra_solar" },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("explorar")
        .setDescription("Explorar Rutas y Cuevas para disputar batallas por turnos y capturar Pokémon salvajes")
        .addStringOption((o) =>
          o
            .setName("zona")
            .setDescription("Entorno o ruta a explorar")
            .addChoices(
              { name: "Ruta Silvestre 🌿 (Praderas y hierba alta)", value: "ruta" },
              { name: "Cueva Profunda 🪨 (Roca, tierra, fantasma)", value: "cueva" },
              { name: "Bosque Virgen 🌲 (Bicho, planta, veneno)", value: "bosque" },
              { name: "Costa y Océano 🌊 (Agua, hielo)", value: "mar" },
              { name: "Pico Montañoso 🌋 (Fuego, dragón, lucha)", value: "montana" },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("raid")
        .setDescription("Incursiones Cooperativas Globales contra Jefes Legendarios del servidor")
        .addStringOption((o) =>
          o
            .setName("accion")
            .setDescription("Acción en la Incursión")
            .setRequired(true)
            .addChoices(
              { name: "Consultar estado del Jefe Legendario", value: "estado" },
              { name: "Atacar al Jefe con tu Pokémon activo", value: "atacar" },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("usar")
        .setDescription("Usar un objeto de tu mochila (Poción, Caramelo Raro, Piedra Evolutiva o Huevo) en un Pokémon")
        .addStringOption((o) =>
          o
            .setName("item")
            .setDescription("Objeto a utilizar")
            .setRequired(true)
            .addChoices(
              { name: "Poción Máxima (Restaura felicidad al 100%)", value: "pocion_maxima" },
              { name: "Caramelo Raro (+1 Nivel inmediato)", value: "caramelo_raro" },
              { name: "Piedra Fuego (Evoluciona Eevee, Vulpix, Growlithe)", value: "piedra_fuego" },
              { name: "Piedra Agua (Evoluciona Eevee, Poliwhirl, Staryu)", value: "piedra_agua" },
              { name: "Piedra Trueno (Evoluciona Pikachu, Eevee)", value: "piedra_trueno" },
              { name: "Piedra Hoja (Evoluciona Gloom, Weepinbell, Nuzleaf)", value: "piedra_hoja" },
              { name: "Piedra Lunar (Evoluciona Clefairy, Jigglypuff, Nidorina/o)", value: "piedra_lunar" },
              { name: "Piedra Solar (Evoluciona Gloom, Sunkern)", value: "piedra_solar" },
              { name: "Huevo Común 🥚 (Incubar eclosión)", value: "huevo_comun" },
              { name: "Huevo Místico 🔮 (Incubar eclosión)", value: "huevo_mistico" },
              { name: "Huevo Legendario ✨ (Incubar eclosión)", value: "huevo_legendario" },
            ),
        )
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Pokémon receptor del objeto (por defecto el activo)").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("transferir")
        .setDescription("Enviar un Pokémon al Profesor (Oak/Elm/Abedul) a cambio de una recompensa en NexoCoins")
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Pokémon que deseas transferir").setRequired(true).setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("guarderia")
        .setDescription("Guardería Pokémon: deja a tus criaturas entrenando de forma pasiva por 100 🪙/h")
        .addStringOption((o) =>
          o
            .setName("accion")
            .setDescription("Acción en la guardería")
            .setRequired(true)
            .addChoices(
              { name: "Consultar estado de la guardería", value: "estado" },
              { name: "Depositar un Pokémon", value: "depositar" },
              { name: "Retirar un Pokémon", value: "retirar" },
            ),
        )
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Pokémon a depositar o retirar").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("salario")
        .setDescription("Cobrar tu asignación diaria de entrenador según tus medallas y Pokédex conseguida"),
    )
    .addSubcommand((s) =>
      s
        .setName("huevo")
        .setDescription("Incubar y eclosionar un huevo Pokémon misterioso")
        .addStringOption((o) =>
          o
            .setName("tipo")
            .setDescription("Tipo de huevo")
            .setRequired(true)
            .addChoices(
              { name: "Huevo Común (1.500 🪙)", value: "comun" },
              { name: "Huevo Místico (4.000 🪙)", value: "epico" },
              { name: "Huevo Legendario (12.000 🪙)", value: "legendario" },
            ),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("alimentar")
        .setDescription("Dar bayas a tu Pokémon para subir su felicidad y ganar EXP (80 🪙)")
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Pokémon a alimentar (por defecto el activo)").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("acariciar")
        .setDescription("Jugar y mimar a tu Pokémon para aumentar su afecto y EXP")
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Pokémon a mimar (por defecto el activo)").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("expedicion")
        .setDescription("Enviar a tu Pokémon a explorar rutas para conseguir NexoCoins, bayas y EXP")
        .addIntegerOption((o) =>
          o
            .setName("duracion")
            .setDescription("Horas de expedición")
            .setRequired(true)
            .addChoices(
              { name: "1 hora", value: 1 },
              { name: "4 horas", value: 4 },
              { name: "8 horas", value: 8 },
              { name: "24 horas", value: 24 },
            ),
        )
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Pokémon a enviar (por defecto el activo)").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("reclamar")
        .setDescription("Cobrar la recompensa de las expediciones de rutas que hayan concluido")
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Pokémon específico o vacío para todos").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("renombrar")
        .setDescription("Ponerle un mote personalizado a tu Pokémon")
        .addStringOption((o) => o.setName("nombre").setDescription("Nuevo mote").setRequired(true))
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Pokémon a renombrar (por defecto el activo)").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("liberar")
        .setDescription("Liberar a un Pokémon a la naturaleza")
        .addStringOption((o) =>
          o.setName("pokemon").setDescription("Pokémon que deseas liberar").setRequired(true).setAutocomplete(true),
        ),
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    const guildId = interaction.guildId!;
    const userId = interaction.user.id;

    if (focused.name === "pokemon" || focused.name === "tu_pokemon") {
      const userPets = getUserPets(guildId, userId);
      const query = focused.value.toLowerCase().trim();
      const filtered = userPets.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.pet_type.toLowerCase().includes(query) ||
          String(p.id).includes(query),
      );
      await interaction.respond(
        filtered.slice(0, 25).map((p) => {
          const sp = PET_SPECIES[p.pet_type] || getPokemonById(p.pet_type);
          const icon = sp ? sp.emoji : "🐾";
          const active = p.is_active === 1 ? "⭐ " : "";
          return {
            name: `${active}${icon} ${p.name} (Nv. ${p.level} · ${sp?.name || p.pet_type})`.slice(0, 100),
            value: String(p.id),
          };
        }),
      ).catch(() => {});
      return;
    }

    if (focused.name === "lider") {
      const regionOpt = interaction.options.getString("region") as PokemonRegion | null;
      const leaders = getGymLeaders(regionOpt || undefined);
      const query = focused.value.toLowerCase().trim();
      const filtered = leaders.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.city.toLowerCase().includes(query) ||
          l.badgeName.toLowerCase().includes(query) ||
          l.region.toLowerCase().includes(query),
      );
      await interaction.respond(
        filtered.slice(0, 25).map((l) => ({
          name: `${l.badgeEmoji} ${l.name} (${l.city} - ${l.region.toUpperCase()}) - ${l.badgeName}`.slice(0, 100),
          value: l.id,
        })),
      ).catch(() => {});
      return;
    }

    if (focused.name === "item") {
      const query = focused.value.toLowerCase().trim();
      const filtered = POKEMART_ITEMS.filter((i) => i.name.toLowerCase().includes(query) || i.id.includes(query));
      await interaction.respond(
        filtered.slice(0, 25).map((i) => ({
          name: `${i.emoji} ${i.name} · ${n(i.price)}`.slice(0, 100),
          value: i.id,
        })),
      ).catch(() => {});
      return;
    }
  },

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId!;
    const uid = interaction.user.id;

    // ── SUBCOMANDO: PERFIL ──
    if (sub === "perfil") {
      const targetUser = interaction.options.getUser("usuario") || interaction.user;
      const petParam = interaction.options.getString("pokemon");
      const pet = getUserPet(gid, targetUser.id, petParam ?? undefined);

      if (!pet) {
        await interaction.reply(
          ephem(
            targetUser.id === uid
              ? "Aún no tienes ningún Pokémon. ¡Explora la hierba alta con `/pokemon capturar`, compra uno en `/pokemon tienda` o incuba un `/pokemon huevo`!"
              : `<@${targetUser.id}> no tiene ningún Pokémon en su equipo.`,
          ),
        );
        return;
      }

      const sp = PET_SPECIES[pet.pet_type] || getPokemonById(pet.pet_type);
      const badges = getUserBadges(gid, targetUser.id);
      const pStats = getPokedexStats(gid, targetUser.id);

      const maxHp = Math.round((sp ? sp.baseHp : 100) + pet.level * 8);
      const atk = Math.round((sp ? sp.baseAtk : 50) + pet.level * 3);
      const def = Math.round((sp ? sp.baseDef : 40) + pet.level * 2);
      const spd = Math.round((sp ? sp.baseSpd : 50) + pet.level * 2.5);

      const typeBadges = (sp?.types || ["normal"]).map((t: string) => `${TYPE_INFO[t]?.emoji || "🔘"} ${TYPE_INFO[t]?.name || t}`).join(" / ");
      const rarityBadge = sp ? `${RARITY_INFO[sp.rarity]?.emoji || "⚪"} ${RARITY_INFO[sp.rarity]?.label || sp.rarity}` : "Común";

      const badgeIcons = badges.length > 0
        ? badges.map((b) => {
            const l = ALL_GYM_LEADERS.find((gl) => gl.badgeId === b);
            return l ? l.badgeEmoji : "🏅";
          }).join(" ")
        : "*Sin medallas aún*";

      const embed = baseEmbed(COLORS.gold)
        .setTitle(`${sp ? sp.pokedexNumber : "#???"} ${pet.name} (Nivel ${pet.level})`)
        .setDescription(
          `> *${sp?.description || "Un leal compañero Pokémon dispuesto a darlo todo en combate."}*\n\n` +
          `🏷️ **Especie:** ${sp?.pokemonName || pet.pet_type} · ${rarityBadge} (${sp ? sp.region.toUpperCase() : "KANTO"})\n` +
          `🧬 **Tipos:** ${typeBadges}\n` +
          `❤️ **Salud:** ${renderHpBar(maxHp, maxHp)}\n` +
          `⭐ **EXP:** ${renderExpBar(pet.exp, pet.level * 100)}\n` +
          `😊 **Felicidad:** ${"❤️".repeat(Math.round(pet.happiness / 20))}${"🤍".repeat(5 - Math.round(pet.happiness / 20))} (${pet.happiness}%)\n\n` +
          `📊 **Estadísticas de Combate:**\n` +
          `⚔️ Ataque: **${atk}** ⸱ 🛡️ Defensa: **${def}** ⸱ ⚡ Velocidad: **${spd}**\n\n` +
          `💥 **Ataque Insignia:** **${sp?.skillName || "Placaje"}**\n` +
          `> *${sp?.skillDesc || "Ataque físico de impacto directo."}*\n\n` +
          `🏅 **Medallero de Gimnasio (${badges.length}/24):**\n${badgeIcons}\n\n` +
          `📖 **Progreso Pokédex:** **${pStats.total}/386** (${Math.round((pStats.total / 386) * 100)}%)\n` +
          `• Kanto: ${pStats.kanto}/151 · Johto: ${pStats.johto}/100 · Hoenn: ${pStats.hoenn}/135`,
        )
        .setThumbnail(sp ? sp.imageUrl : null)
        .setImage(sp ? sp.spriteUrl : null)
        .setFooter({ text: `Entrenador: ${targetUser.username} · ID de Equipo: #${pet.id}` });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: EQUIPO ──
    if (sub === "equipo") {
      const targetUser = interaction.options.getUser("usuario") || interaction.user;
      const pets = getUserPets(gid, targetUser.id);

      if (!pets.length) {
        await interaction.reply(
          ephem(
            targetUser.id === uid
              ? "Aún no tienes ningún Pokémon. ¡Explora la hierba alta con `/pokemon capturar` o visita la `/pokemon tienda`!"
              : `<@${targetUser.id}> no tiene ningún Pokémon.`,
          ),
        );
        return;
      }

      const lines = pets.map((p) => {
        const sp = PET_SPECIES[p.pet_type] || getPokemonById(p.pet_type);
        const active = p.is_active === 1 ? "⭐ **ACTIVO:** " : "• ";
        const types = (sp?.types || ["normal"]).map((t: string) => TYPE_INFO[t]?.emoji || "").join("");
        return `${active}${sp?.emoji || "🐾"} **${p.name}** (${sp?.pokemonName || p.pet_type}) ${types} · Nv. ${p.level} (${p.exp}/${p.level * 100} EXP) · ❤️ ${p.happiness}%`;
      });

      const embed = baseEmbed(COLORS.primary)
        .setTitle(`🎒 Equipo Pokémon de ${targetUser.username} (${pets.length}/${MAX_PETS_PER_USER})`)
        .setDescription(lines.join("\n") + "\n\n*Usa `/pokemon seleccionar [pokemon]` para cambiar tu combatiente activo.*")
        .setFooter({ text: "Atrapa nuevos Pokémon en la hierba alta o eclosiona huevos" });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: SELECCIONAR ──
    if (sub === "seleccionar") {
      const petParam = interaction.options.getString("pokemon", true);
      const res = setActivePet(gid, uid, petParam);
      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }
      await interaction.reply({ embeds: [baseEmbed(COLORS.success).setDescription(res.message)] });
      return;
    }

    // ── SUBCOMANDO: POKEDEX ──
    if (sub === "pokedex") {
      const targetUser = interaction.options.getUser("usuario") || interaction.user;
      const regionOpt = interaction.options.getString("region") || "todas";
      const userPokedex = getUserPokedex(gid, targetUser.id);
      const userSet = new Set(userPokedex);

      let targetList = ALL_POKEMON_LIST;
      if (regionOpt === "kanto") targetList = getPokemonByRegion("kanto");
      else if (regionOpt === "johto") targetList = getPokemonByRegion("johto");
      else if (regionOpt === "hoenn") targetList = getPokemonByRegion("hoenn");
      else if (regionOpt === "sinnoh") targetList = getPokemonByRegion("sinnoh");
      else if (regionOpt === "teselia") targetList = getPokemonByRegion("teselia");

      const PAGE_SIZE = 10;
      const maxPages = Math.ceil(targetList.length / PAGE_SIZE) || 1;
      let currentPage = Math.max(1, Math.min(maxPages, interaction.options.getInteger("pagina") || 1));

      const generatePokedexEmbed = (page: number) => {
        const start = (page - 1) * PAGE_SIZE;
        const slice = targetList.slice(start, start + PAGE_SIZE);

        const lines = slice.map((sp) => {
          const registered = userSet.has(sp.id) || userSet.has(sp.pokemonName.toLowerCase());
          const typeBadges = sp.types.map((t) => TYPE_INFO[t]?.emoji || "").join("");
          if (registered) {
            return `\`${sp.pokedexNumber}\` ${sp.emoji} **${sp.name}** ${typeBadges} — ${RARITY_INFO[sp.rarity]?.label || sp.rarity} ✅`;
          }
          return `\`${sp.pokedexNumber}\` 🔒 **???** ${typeBadges} — *No registrado aún*`;
        });

        const registeredCount = targetList.filter((sp) => userSet.has(sp.id) || userSet.has(sp.pokemonName.toLowerCase())).length;
        const pct = Math.round((registeredCount / targetList.length) * 100);

        return baseEmbed(COLORS.primary)
          .setTitle(`📖 Pokédex de ${targetUser.username} (${regionOpt.toUpperCase()})`)
          .setDescription(
            `📊 **Progreso en esta sección:** **${registeredCount}/${targetList.length}** (${pct}%)\n\n` +
            lines.join("\n"),
          )
          .setFooter({ text: `Página ${page}/${maxPages} · Pokédex Nacional Oficial (649 criaturas)` });
      };

      const getButtons = (page: number) => {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("pokedex_prev").setLabel("◀ Anterior").setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
          new ButtonBuilder().setCustomId("pokedex_next").setLabel("Siguiente ▶").setStyle(ButtonStyle.Secondary).setDisabled(page >= maxPages),
        );
      };

      const msg = await interaction.reply({
        embeds: [generatePokedexEmbed(currentPage)],
        components: maxPages > 1 ? [getButtons(currentPage)] : [],
        fetchReply: true,
      });

      if (maxPages <= 1) return;

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000,
        filter: (i) => i.user.id === uid,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "pokedex_prev") currentPage = Math.max(1, currentPage - 1);
        if (i.customId === "pokedex_next") currentPage = Math.min(maxPages, currentPage + 1);
        await i.update({
          embeds: [generatePokedexEmbed(currentPage)],
          components: [getButtons(currentPage)],
        });
      });

      collector.on("end", async () => {
        await interaction.editReply({ components: [] }).catch(() => null);
      });
      return;
    }

    // ── SUBCOMANDO: CAPTURAR (ZONA SAFARI) ──
    if (sub === "capturar") {
      const regionParam = (interaction.options.getString("region") as PokemonRegion) || "kanto";
      let ballParam = interaction.options.getString("ball");
      const berryParam = interaction.options.getString("baya") || undefined;

      const eco = getEco(gid, uid);

      if (!ballParam) {
        if (hasItem(eco, "masterball")) ballParam = "masterball";
        else if (hasItem(eco, "ultraball")) ballParam = "ultraball";
        else if (hasItem(eco, "superball")) ballParam = "superball";
        else if (hasItem(eco, "pokeball")) ballParam = "pokeball";
        else {
          const funds = totalFunds(eco);
          if (funds < 50) {
            await interaction.reply(
              ephem("No tienes Poké Balls en tu mochila ni 50 🪙 para comprar una en la entrada. ¡Gana NexoCoins primero!"),
            );
            return;
          }
          deductFundsDetailed(eco, 50);
          giveItem(eco, "pokeball", 1);
          saveEco(eco, "Compra exprés de Poké Ball en Safari");
          ballParam = "pokeball";
        }
      }

      if (!hasItem(eco, ballParam)) {
        await interaction.reply(ephem(`No tienes esa esfera en tu mochila. ¡Adquiérela en \`/pokemon tienda\`!`));
        return;
      }

      if (berryParam && !hasItem(eco, berryParam)) {
        await interaction.reply(ephem(`No posees esa baya en tu inventario.`));
        return;
      }

      takeItem(eco, ballParam);
      if (berryParam) takeItem(eco, berryParam);
      saveEco(eco, `Uso de cápsula ${ballParam} en Safari`);

      const wildSpecies = generateSafariEncounter(regionParam);
      const catchResult = simulateSafariCatch(wildSpecies, ballParam, berryParam);

      const encounterEmbed = baseEmbed(COLORS.gold)
        .setTitle(`🌿 ¡Un ${wildSpecies.name} salvaje apareció en ${regionParam.toUpperCase()}!`)
        .setDescription(
          `> *${wildSpecies.description}*\n\n` +
          `🧬 **Tipos:** ${wildSpecies.types.map((t) => TYPE_INFO[t]?.emoji || "").join(" ")}\n` +
          `⭐ **Rareza:** ${RARITY_INFO[wildSpecies.rarity]?.label || wildSpecies.rarity}\n\n` +
          `🎯 Preparando lanzamiento con **${catchResult.log[0].replace("🎯 ", "")}**...`,
        )
        .setThumbnail(wildSpecies.imageUrl)
        .setImage(wildSpecies.spriteUrl);

      await interaction.reply({ embeds: [encounterEmbed] });
      await sleep(1500);

      for (let s = 1; s <= catchResult.shakes; s++) {
        const shakeText = catchResult.log.slice(0, s + 1).join("\n");
        const shakeEmbed = baseEmbed(COLORS.primary)
          .setTitle(`🔴 Capturando a ${wildSpecies.name}...`)
          .setDescription(shakeText)
          .setImage(wildSpecies.spriteUrl);
        await interaction.editReply({ embeds: [shakeEmbed] });
        await sleep(1200);
      }

      if (catchResult.success) {
        registerPokedex(gid, uid, wildSpecies.id);
        const userPets = getUserPets(gid, uid);

        let teamMsg = "";
        if (userPets.length < MAX_PETS_PER_USER) {
          const adoptRes = adoptPet(gid, uid, wildSpecies.id, wildSpecies.name);
          if (adoptRes.ok) {
            teamMsg = `\n🎒 **${wildSpecies.name}** se ha unido a tu equipo Pokémon.`;
          } else {
            teamMsg = `\n⚠️ ${adoptRes.message}`;
          }
        } else {
          teamMsg = `\n⚠️ Tu equipo está lleno (${MAX_PETS_PER_USER}/${MAX_PETS_PER_USER}). Se ha registrado en la Pokédex pero no cabe en tu rancho.`;
        }

        const ecoFinal = getEco(gid, uid);
        ecoFinal.wallet += catchResult.bonusCoins;
        saveEco(ecoFinal, "Recompensa de captura Pokémon");

        const winEmbed = baseEmbed(COLORS.success)
          .setTitle(`✨ ¡${wildSpecies.name} ATRAPADO CON ÉXITO!`)
          .setDescription(
            `🎉 **¡Felicidades, Entrenador!**\n\n` +
            catchResult.log.join("\n") +
            `\n\n💰 Recompensa: **+${n(catchResult.bonusCoins)}**\n` +
            `⭐ EXP de Entrenador: **+${catchResult.bonusExp} EXP**${teamMsg}`,
          )
          .setThumbnail(wildSpecies.imageUrl)
          .setImage(wildSpecies.spriteUrl);

        await interaction.editReply({ embeds: [winEmbed] });
        return;
      } else {
        const failEmbed = baseEmbed(COLORS.danger)
          .setTitle(`💨 ¡${wildSpecies.name} escapó!`)
          .setDescription(catchResult.log.join("\n") + "\n\n*¡No te rindas! Prueba con Super Balls, Ultra Balls o bayas en tu próximo intento.*")
          .setThumbnail(wildSpecies.imageUrl);
        await interaction.editReply({ embeds: [failEmbed] });
        return;
      }
    }

    // ── SUBCOMANDO: GIMNASIO ──
    if (sub === "gimnasio") {
      const action = interaction.options.getString("accion", true);
      const region = (interaction.options.getString("region") as PokemonRegion) || undefined;
      const userBadges = getUserBadges(gid, uid);

      if (action === "lista") {
        const badgeCaseText = renderBadgeCase(userBadges, region);
        const embed = baseEmbed(COLORS.primary)
          .setTitle(`🏟️ Gimnasios Pokémon (${region ? region.toUpperCase() : "KANTO, JOHTO & HOENN"})`)
          .setDescription(badgeCaseText + "\n\n*Usa `/pokemon gimnasio accion:retar lider:[nombre]` para disputar un combate de gimnasio.*");
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (action === "retar") {
        const leaderParam = interaction.options.getString("lider");
        if (!leaderParam) {
          await interaction.reply(ephem("Debes especificar qué líder de gimnasio deseas retar."));
          return;
        }

        const leader = getGymLeader(leaderParam);
        if (!leader) {
          await interaction.reply(ephem("Líder de gimnasio no encontrado. Usa el autocompletado para elegir uno válido."));
          return;
        }

        const activePet = getUserPet(gid, uid);
        if (!activePet) {
          await interaction.reply(ephem("Debes tener un Pokémon activo en tu equipo para desafiar gimnasios. ¡Consigue uno con `/pokemon capturar`!"));
          return;
        }

        if (leader.reqBadge && !userBadges.includes(leader.reqBadge)) {
          const reqLeader = ALL_GYM_LEADERS.find((l) => l.badgeId === leader.reqBadge);
          await interaction.reply(
            ephem(
              `🔒 Aún no puedes retar a **${leader.name}**. Primero debes derrotar a **${reqLeader?.name || "el líder anterior"}** y conseguir la **${leader.reqBadge}**.`,
            ),
          );
          return;
        }

        const battle = simulateGymBattle(activePet, leader);
        const logRounds = battle.rounds.map((r) => `**Turno ${r.turn}:** ${r.text}`).join("\n");

        if (battle.winner === 1) {
          awardBadge(gid, uid, leader.badgeId);
          const eco = getEco(gid, uid);
          eco.wallet += leader.rewardCoins;
          saveEco(eco, `Victoria de gimnasio contra ${leader.name}`);

          activePet.exp += leader.rewardExp;
          activePet.happiness = 100;
          let newLevel = activePet.level;
          let expNeeded = newLevel * 100;
          while (activePet.exp >= expNeeded && newLevel < 100) {
            activePet.exp -= expNeeded;
            newLevel++;
            expNeeded = newLevel * 100;
          }
          activePet.level = newLevel;

          const db = (await import("../../database/index.js")).getDb();
          db.prepare("UPDATE user_pets SET level = ?, exp = ?, happiness = 100 WHERE id = ?").run(
            activePet.level,
            activePet.exp,
            activePet.id,
          );

          const winEmbed = baseEmbed(COLORS.gold)
            .setTitle(`🏆 ¡VICTORIA TOTAL CONTRA ${leader.name.toUpperCase()}!`)
            .setDescription(
              `> *${leader.quote}*\n\n` +
              `🏅 ¡Has obtenido la prestigiosa **${leader.badgeName}** ${leader.badgeEmoji}!\n` +
              `💰 Recompensa oficial: **+${n(leader.rewardCoins)}**\n` +
              `⭐ EXP para ${activePet.name}: **+${leader.rewardExp} EXP** (Nivel ${activePet.level})\n\n` +
              `📜 **Resumen del Combate:**\n${logRounds}`,
            )
            .setThumbnail(leader.avatarUrl)
            .setImage(leader.pokemon.spriteUrl);

          await interaction.reply({ embeds: [winEmbed] });
          return;
        } else {
          const lossEmbed = baseEmbed(COLORS.danger)
            .setTitle(`💥 Derrota frente a ${leader.name} (${leader.city})`)
            .setDescription(
              `> *${leader.quote}*\n\n` +
              `**${activePet.name}** no pudo resistir el poder del **${leader.pokemon.name}** de ${leader.name}.\n\n` +
              `📜 **Registro de Batalla:**\n${logRounds}\n\n` +
              `💡 **Consejo:** Sube de nivel a tu Pokémon con caramelos, cuídalo con bayas o aprovecha las ventajas elementales de tipos.`,
            )
            .setThumbnail(leader.avatarUrl)
            .setImage(leader.pokemon.spriteUrl);

          await interaction.reply({ embeds: [lossEmbed] });
          return;
        }
      }
    }

    // ── SUBCOMANDO: DUELO PVP CON APUESTAS ──
    if (sub === "duelo") {
      const opponent = interaction.options.getUser("oponente", true);
      const bet = interaction.options.getInteger("apuesta") || 0;
      const petParam = interaction.options.getString("pokemon");

      if (opponent.id === uid) {
        await interaction.reply(ephem("No puedes retarte a un duelo a ti mismo."));
        return;
      }
      if (opponent.bot) {
        await interaction.reply(ephem("No puedes retar a un bot."));
        return;
      }

      const p1Pet = getUserPet(gid, uid, petParam ?? undefined);
      if (!p1Pet) {
        await interaction.reply(ephem("No tienes ningún Pokémon en tu equipo para batallar."));
        return;
      }

      const p2Pet = getUserPet(gid, opponent.id);
      if (!p2Pet) {
        await interaction.reply(ephem(`<@${opponent.id}> no tiene ningún Pokémon en su equipo.`));
        return;
      }

      const eco1 = getEco(gid, uid);
      if (bet > 0 && eco1.wallet < bet) {
        await interaction.reply(ephem(`No tienes suficientes NexoCoins para esta apuesta (${n(bet)}).`));
        return;
      }

      const eco2 = getEco(gid, opponent.id);
      if (bet > 0 && eco2.wallet < bet) {
        await interaction.reply(ephem(`<@${opponent.id}> no tiene suficientes fondos para aceptar una apuesta de ${n(bet)}.`));
        return;
      }

      const acceptId = `pvp_accept_${interaction.id}`;
      const declineId = `pvp_decline_${interaction.id}`;

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(acceptId).setLabel(`Aceptar Duelo ${bet > 0 ? `(${bet} 🪙)` : ""}`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(declineId).setLabel("Rechazar").setStyle(ButtonStyle.Danger),
      );

      const challengeEmbed = baseEmbed(COLORS.gold)
        .setTitle("⚔️ Desafío de Entrenadores Pokémon")
        .setDescription(
          `<@${opponent.id}>, has sido retado a un duelo Pokémon por <@${uid}>.\n\n` +
          `• **Combatiente de ${interaction.user.username}:** ${p1Pet.name} (Nv. ${p1Pet.level})\n` +
          `• **Combatiente de ${opponent.username}:** ${p2Pet.name} (Nv. ${p2Pet.level})\n` +
          (bet > 0 ? `\n💰 **Bolsa de Apuestas en Juego:** ${n(bet * 2)} (${n(bet)} por participante)\n` : "") +
          `\n¿Aceptas el combate?`,
        );

      const promptMsg = await interaction.reply({
        content: `<@${opponent.id}>`,
        embeds: [challengeEmbed],
        components: [row],
        fetchReply: true,
      });

      const collector = promptMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== opponent.id) {
          await i.reply({ content: "Solo el oponente retado puede pulsar estos botones.", flags: MessageFlags.Ephemeral });
          return;
        }

        if (i.customId === declineId) {
          await i.update({
            content: null,
            embeds: [baseEmbed(COLORS.warn).setDescription(`❌ <@${opponent.id}> ha rechazado el desafío Pokémon.`)],
            components: [],
          });
          collector.stop("declined");
          return;
        }

        if (i.customId === acceptId) {
          if (bet > 0) {
            const freshEco1 = getEco(gid, uid);
            const freshEco2 = getEco(gid, opponent.id);
            if (freshEco1.wallet < bet || freshEco2.wallet < bet) {
              await i.update({
                content: null,
                embeds: [baseEmbed(COLORS.danger).setDescription("Uno de los dos entrenadores ya no tiene fondos suficientes para la apuesta.")],
                components: [],
              });
              collector.stop("no_funds");
              return;
            }
            freshEco1.wallet -= bet;
            freshEco2.wallet -= bet;
            saveEco(freshEco1, "Apuesta Duelo Pokémon");
            saveEco(freshEco2, "Apuesta Duelo Pokémon");
          }

          const battle = simulatePetBattle(p1Pet, p2Pet, interaction.user.username, opponent.username);
          const winnerUser = battle.winner === 1 ? uid : opponent.id;
          const winnerPet = battle.winner === 1 ? p1Pet : p2Pet;

          if (bet > 0) {
            const pot = bet * 2;
            const winEco = getEco(gid, winnerUser);
            winEco.wallet += pot;
            saveEco(winEco, "Bote de victoria Duelo Pokémon");
          }

          const logLines = battle.rounds.map((r) => `**Turno ${r.turn}:** ${r.text}`).join("\n");
          const spWinner = PET_SPECIES[winnerPet.pet_type] || getPokemonById(winnerPet.pet_type);

          const resultEmbed = baseEmbed(COLORS.success)
            .setTitle(`🏆 ¡Victoria para <@${winnerUser}> y ${winnerPet.name}!`)
            .setDescription(
              (bet > 0 ? `💰 **¡Se lleva el gran bote de ${n(bet * 2)}!**\n\n` : "") +
              `📜 **Desarrollo del Combate:**\n${logLines}`,
            )
            .setThumbnail(spWinner ? spWinner.imageUrl : null)
            .setImage(spWinner ? spWinner.spriteUrl : null);

          await i.update({ content: null, embeds: [resultEmbed], components: [] });
          collector.stop("completed");
        }
      });

      collector.on("end", async (_collected, reason) => {
        if (reason === "time") {
          await interaction.editReply({
            content: null,
            embeds: [baseEmbed(COLORS.warn).setDescription("⏰ El desafío Pokémon ha expirado sin respuesta.")],
            components: [],
          }).catch(() => null);
        }
      });
      return;
    }

    // ── SUBCOMANDO: TIENDA (POKÉ MART) ──
    if (sub === "tienda") {
      const action = interaction.options.getString("accion") || "ver";
      const itemParam = interaction.options.getString("item");
      const qty = interaction.options.getInteger("cantidad") || 1;

      if (action === "comprar") {
        if (!itemParam) {
          await interaction.reply(ephem("Indica el artículo que deseas adquirir."));
          return;
        }
        const cleanParam = itemParam.trim().toLowerCase();
        const cleanNoSpaces = cleanParam.replace(/\s+/g, "_");
        const cleanAlpha = cleanParam.replace(/[^a-z0-9]/g, "");

        const itemDef = POKEMART_ITEMS.find(
          (i) =>
            i.id === cleanParam ||
            i.id === cleanNoSpaces ||
            i.name.toLowerCase() === cleanParam ||
            i.name.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanAlpha,
        );
        if (!itemDef) {
          await interaction.reply(ephem("Artículo no reconocido en el catálogo del Poké Mart."));
          return;
        }

        const totalCost = itemDef.price * qty;
        const eco = getEco(gid, uid);
        const funds = totalFunds(eco);
        if (funds < totalCost) {
          await interaction.reply(
            ephem(
              `No tienes suficientes fondos. **${qty}x ${itemDef.name}** cuesta ${n(totalCost)} (tienes ${n(funds)} entre cartera y banco).`,
            ),
          );
          return;
        }

        deductFundsDetailed(eco, totalCost);
        giveItem(eco, itemDef.id, qty);
        saveEco(eco, `Compra en Poké Mart: ${qty}x ${itemDef.name}`);

        await interaction.reply({
          embeds: [
            baseEmbed(COLORS.success).setDescription(
              `🛒 ¡Has adquirido **${qty}x ${itemDef.name}** ${itemDef.emoji} por **${n(totalCost)}**!\n` +
              `Se han guardado en tu mochila (\`/pokemon inventario\` o \`/mochila\`).\n` +
              `💰 *Fondos restantes: Cartera ${n(eco.wallet)} | Banco ${n(eco.bank)}*`,
            ),
          ],
        });
        return;
      }

      const categories = [...new Set(POKEMART_ITEMS.map((i) => i.category))];
      const sections = categories.map((cat) => {
        const items = POKEMART_ITEMS.filter((i) => i.category === cat);
        const lines = items.map((i) => `• **${i.name}** ${i.emoji} — ${n(i.price)}\n  > *${i.desc}*`);
        return `### 📦 ${cat}\n${lines.join("\n")}`;
      });

      const shopEmbed = baseEmbed(COLORS.primary)
        .setTitle("🏬 Poké Mart Central de Nexo")
        .setDescription(
          `Bienvenido a la tienda de suministros para entrenadores. Compra cualquier artículo con \`/pokemon tienda accion:comprar item:[nombre] cantidad:[n]\`.\n\n` +
          sections.join("\n\n"),
        )
        .setFooter({ text: "Todos los artículos se guardan en tu mochila (/pokemon inventario o /mochila)" });

      await interaction.reply({ embeds: [shopEmbed] });
      return;
    }

    // ── SUBCOMANDO: INVENTARIO / MOCHILA ──
    if (sub === "inventario" || sub === "mochila") {
      const targetUser = interaction.options.getUser("usuario") || interaction.user;
      const eco = getEco(gid, targetUser.id);
      const inv = invOf(eco);

      const trainerItemIds = POKEMART_ITEMS.map((i) => i.id);
      const ownedItems = trainerItemIds
        .filter((id) => (inv[id] ?? 0) > 0)
        .map((id) => {
          const def = POKEMART_ITEMS.find((i) => i.id === id)!;
          return `• ${def.emoji} **${def.name}** × **${inv[id]}**\n  > *${def.desc}*`;
        });

      const desc = ownedItems.length > 0
        ? ownedItems.join("\n\n")
        : "*La mochila está vacía. ¡Visita la tienda con `/pokemon tienda` para abastecerte!*";

      const bagEmbed = baseEmbed(COLORS.primary)
        .setTitle(`🎒 Mochila de Entrenador de ${targetUser.username}`)
        .setDescription(
          `💰 **Cartera:** ${n(eco.wallet)} | 🏦 **Banco:** ${n(eco.bank)}\n\n` +
          `### 📦 Objetos e Instrumentos Registrados:\n${desc}\n\n` +
          `💡 *Usa \`/pokemon usar item:[item]\` para aplicar pociones, caramelos, piedras evolutivas o incubar huevos.*`,
        )
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setFooter({ text: "Los artículos se pueden usar en combate, safari o crianza" });

      await interaction.reply({ embeds: [bagEmbed] });
      return;
    }

    // ── SUBCOMANDO: USAR ÍTEM ──
    if (sub === "usar") {
      const itemId = interaction.options.getString("item", true);
      const petParam = interaction.options.getString("pokemon") || "";
      const res = useItemOnPokemon(gid, uid, petParam, itemId);

      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }

      const embed = baseEmbed(COLORS.success).setDescription(res.message);
      if (res.pet) {
        const sp = PET_SPECIES[res.pet.pet_type] || getPokemonById(res.pet.pet_type);
        if (sp) {
          embed.setThumbnail(sp.imageUrl);
          embed.setImage(sp.spriteUrl);
        }
      }
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: TRANSFERIR AL PROFESOR ──
    if (sub === "transferir") {
      const petParam = interaction.options.getString("pokemon", true);
      const res = transferPokemonToProfessor(gid, uid, petParam);
      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }
      await interaction.reply({ embeds: [baseEmbed(COLORS.gold).setDescription(res.message)] });
      return;
    }

    // ── SUBCOMANDO: GUARDERÍA ──
    if (sub === "guarderia") {
      const action = interaction.options.getString("accion", true);
      const petParam = interaction.options.getString("pokemon");

      if (action === "estado") {
        const entries = getDaycareEntries(gid, uid);
        if (!entries.length) {
          await interaction.reply(
            ephem("No tienes ningún Pokémon en la guardería actualmente. Deposita uno con `/pokemon guarderia accion:depositar`."),
          );
          return;
        }

        const now = Date.now();
        const lines = entries.map((e) => {
          const p = getUserPet(gid, uid, e.pet_id);
          const hours = Math.max(1, Math.floor((now - e.deposited_at) / 3_600_000));
          const exp = hours * 75;
          const cost = hours * 100;
          return `• **${p?.name || `Pokémon #${e.pet_id}`}**: ${hours}h acumuladas · +${exp} EXP ganada · Coste actual: ${n(cost)}`;
        });

        const embed = baseEmbed(COLORS.primary)
          .setTitle("🏡 Guardería Pokémon de Nexo")
          .setDescription(lines.join("\n") + "\n\n*Usa `/pokemon guarderia accion:retirar pokemon:[nombre]` para recogerlo.*");
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (action === "depositar") {
        if (!petParam) {
          await interaction.reply(ephem("Indica el Pokémon que deseas depositar."));
          return;
        }
        const res = depositDaycare(gid, uid, petParam);
        if (!res.ok) {
          await interaction.reply(ephem(res.message));
          return;
        }
        await interaction.reply({ embeds: [baseEmbed(COLORS.success).setDescription(res.message)] });
        return;
      }

      if (action === "retirar") {
        if (!petParam) {
          await interaction.reply(ephem("Indica el Pokémon que deseas retirar."));
          return;
        }
        const res = withdrawDaycare(gid, uid, petParam);
        if (!res.ok) {
          await interaction.reply(ephem(res.message));
          return;
        }
        await interaction.reply({ embeds: [baseEmbed(COLORS.gold).setDescription(res.message)] });
        return;
      }
    }

    // ── SUBCOMANDO: SALARIO ──
    if (sub === "salario") {
      const res = claimTrainerSalary(gid, uid);
      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }
      await interaction.reply({ embeds: [baseEmbed(COLORS.gold).setDescription(res.message)] });
      return;
    }

    // ── SUBCOMANDO: HUEVO ──
    if (sub === "huevo") {
      const eggType = interaction.options.getString("tipo", true);
      const res = buyEgg(gid, uid, eggType);
      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }

      const embed = baseEmbed(COLORS.gold).setDescription(res.message);
      if (res.species) {
        embed.setThumbnail(res.species.imageUrl);
        embed.setImage(res.species.spriteUrl);
      }
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── SUBCOMANDO: ALIMENTAR ──
    if (sub === "alimentar") {
      const petParam = interaction.options.getString("pokemon");
      const res = feedPet(gid, uid, petParam ?? undefined);
      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }
      await interaction.reply({ embeds: [baseEmbed(COLORS.success).setDescription(res.message)] });
      return;
    }

    // ── SUBCOMANDO: ACARICIAR ──
    if (sub === "acariciar") {
      const petParam = interaction.options.getString("pokemon");
      const res = petThePet(gid, uid, petParam ?? undefined);
      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }
      await interaction.reply({ embeds: [baseEmbed(COLORS.success).setDescription(res.message)] });
      return;
    }

    // ── SUBCOMANDO: EXPEDICIÓN ──
    if (sub === "expedicion") {
      const hours = interaction.options.getInteger("duracion", true);
      const petParam = interaction.options.getString("pokemon");
      const res = sendOnExpedition(gid, uid, hours, petParam ?? undefined);
      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }
      await interaction.reply({ embeds: [baseEmbed(COLORS.primary).setDescription(res.message)] });
      return;
    }

    // ── SUBCOMANDO: RECLAMAR ──
    if (sub === "reclamar") {
      const petParam = interaction.options.getString("pokemon");
      const res = claimExpeditionReward(gid, uid, petParam ?? undefined);
      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }
      await interaction.reply({ embeds: [baseEmbed(COLORS.gold).setDescription(res.message)] });
      return;
    }

    // ── SUBCOMANDO: RENOMBRAR ──
    if (sub === "renombrar") {
      const newName = interaction.options.getString("nombre", true);
      const petParam = interaction.options.getString("pokemon");
      const res = renamePet(gid, uid, newName, petParam ?? undefined);
      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }
      await interaction.reply({ embeds: [baseEmbed(COLORS.success).setDescription(res.message)] });
      return;
    }

    // ── SUBCOMANDO: LIBERAR ──
    if (sub === "liberar") {
      const petParam = interaction.options.getString("pokemon", true);
      const res = releasePet(gid, uid, petParam);
      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }
      await interaction.reply({ embeds: [baseEmbed(COLORS.warn).setDescription(res.message)] });
      return;
    }

    // ── SUBCOMANDO: INTERCAMBIO ──
    if (sub === "intercambio") {
      const targetUser = interaction.options.getUser("oponente", true);
      if (targetUser.id === uid) {
        await interaction.reply(ephem("No puedes realizar un intercambio Pokémon contigo mismo."));
        return;
      }
      if (targetUser.bot) {
        await interaction.reply(ephem("Los bots no poseen Pokémon para intercambiar."));
        return;
      }

      const myPetParam = interaction.options.getString("tu_pokemon", true);
      const theirPetParam = interaction.options.getString("su_pokemon", true);

      const pet1 = getUserPet(gid, uid, myPetParam);
      if (!pet1) {
        await interaction.reply(ephem("No posees el Pokémon que has ofrecido para el intercambio."));
        return;
      }

      const pet2 = getUserPet(gid, targetUser.id, theirPetParam);
      if (!pet2) {
        await interaction.reply(ephem(`<@${targetUser.id}> no posee el Pokémon indicado para el intercambio.`));
        return;
      }

      const sp1 = PET_SPECIES[pet1.pet_type] || getPokemonById(pet1.pet_type);
      const sp2 = PET_SPECIES[pet2.pet_type] || getPokemonById(pet2.pet_type);

      const acceptId = `trade_accept_${interaction.id}`;
      const declineId = `trade_decline_${interaction.id}`;

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(acceptId).setLabel("Aceptar Intercambio").setStyle(ButtonStyle.Success).setEmoji("🔄"),
        new ButtonBuilder().setCustomId(declineId).setLabel("Rechazar").setStyle(ButtonStyle.Danger).setEmoji("✖️"),
      );

      const embed = baseEmbed(COLORS.primary)
        .setTitle("🔄 Propuesta de Intercambio Pokémon")
        .setDescription(
          `<@${targetUser.id}>, <@${uid}> te ha propuesto un intercambio Pokémon:\n\n` +
          `📤 **Ofrece:** ${pet1.name} (${sp1?.name || pet1.pet_type}) Nv. ${pet1.level}\n` +
          `📥 **Pide a cambio:** ${pet2.name} (${sp2?.name || pet2.pet_type}) Nv. ${pet2.level}\n\n` +
          `¿Deseas aceptar el intercambio? *(Expira en 60 segundos)*`,
        )
        .setThumbnail(sp1?.imageUrl || null)
        .setImage(sp2?.spriteUrl || null);

      const promptMsg = await interaction.reply({
        content: `<@${targetUser.id}>`,
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });

      const collector = promptMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== targetUser.id) {
          await i.reply({ content: "Solo el entrenador retado al intercambio puede responder.", flags: MessageFlags.Ephemeral });
          return;
        }

        if (i.customId === declineId) {
          await i.update({
            content: null,
            embeds: [baseEmbed(COLORS.warn).setDescription(`❌ <@${targetUser.id}> ha rechazado la propuesta de intercambio.`)],
            components: [],
          });
          collector.stop("declined");
          return;
        }

        if (i.customId === acceptId) {
          const res = executeTrade(gid, uid, pet1.id, targetUser.id, pet2.id);
          if (!res.ok) {
            await i.update({
              content: null,
              embeds: [baseEmbed(COLORS.danger).setDescription(`❌ ${res.message}`)],
              components: [],
            });
            collector.stop("error");
            return;
          }

          let extraEvo = "";
          if (res.pet1Evolved) {
            extraEvo += `\n✨ ¡Durante el intercambio, **${res.pet1Evolved.from.name}** ha evolucionado a **${res.pet1Evolved.to.name}**!`;
          }
          if (res.pet2Evolved) {
            extraEvo += `\n✨ ¡Durante el intercambio, **${res.pet2Evolved.from.name}** ha evolucionado a **${res.pet2Evolved.to.name}**!`;
          }

          const successEmbed = baseEmbed(COLORS.success)
            .setTitle("🎉 ¡Intercambio Pokémon Completado!")
            .setDescription(
              `¡El intercambio entre <@${uid}> y <@${targetUser.id}> se ha realizado con éxito!\n\n` +
              `• <@${targetUser.id}> ha recibido a **${res.pet1Name}** (${res.pet1Species?.name})\n` +
              `• <@${uid}> ha recibido a **${res.pet2Name}** (${res.pet2Species?.name})\n` +
              extraEvo,
            )
            .setImage(res.pet1Evolved?.to.spriteUrl || res.pet2Evolved?.to.spriteUrl || res.pet1Species?.spriteUrl || null);

          await i.update({ content: null, embeds: [successEmbed], components: [] });
          collector.stop("completed");
        }
      });

      collector.on("end", async (_c, reason) => {
        if (reason === "time") {
          await interaction.editReply({
            content: null,
            embeds: [baseEmbed(COLORS.warn).setDescription("⏰ La propuesta de intercambio ha expirado.")],
            components: [],
          }).catch(() => null);
        }
      });
      return;
    }

    // ── SUBCOMANDO: EVOLUCIONAR ──
    if (sub === "evolucionar") {
      const petParam = interaction.options.getString("pokemon") || undefined;
      const stoneParam = interaction.options.getString("piedra") || undefined;

      const res = evolvePokemon(gid, uid, petParam, stoneParam);
      if (!res.ok) {
        await interaction.reply(ephem(res.message));
        return;
      }

      const evoEmbed = baseEmbed(COLORS.success)
        .setTitle("✨ ¡EVOLUCIÓN POKÉMON CON ÉXITO!")
        .setDescription(
          `🎉 **¡Felicidades, Entrenador!**\n\n` +
          `¡Tu **${res.oldSpecies?.name}** ha evolucionado a **${res.newSpecies?.name}**!\n\n` +
          `• **Nueva Especie:** ${res.newSpecies?.name} (${res.newSpecies?.emoji} Tipo ${res.newSpecies?.types.join("/")})\n` +
          `• **Habilidad Desbloqueada:** *${res.newSpecies?.skillName}* — ${res.newSpecies?.skillDesc}\n` +
          `• **Estadísticas Base:** ❤️ ${res.newSpecies?.baseHp} HP | ⚔️ ${res.newSpecies?.baseAtk} ATK | 🛡️ ${res.newSpecies?.baseDef} DEF | ⚡ ${res.newSpecies?.baseSpd} VEL\n\n` +
          `*Registrado automáticamente en tu Pokédex Nacional.*`,
        )
        .setThumbnail(res.newSpecies?.imageUrl || null)
        .setImage(res.newSpecies?.spriteUrl || null);

      await interaction.reply({ embeds: [evoEmbed] });
      return;
    }

    // ── SUBCOMANDO: EXPLORAR (BATALLAS SILVESTRES) ──
    if (sub === "explorar") {
      const zone = (interaction.options.getString("zona") as ExplorationZone) || "ruta";
      const zoneInfo = ZONE_NAMES[zone] || ZONE_NAMES.ruta;

      const activePet = getActivePet(gid, uid);
      if (!activePet) {
        await interaction.reply(ephem("Necesitas tener un Pokémon activo en tu equipo para explorar. ¡Usa `/pokemon capturar` o `/pokemon seleccionar`!"));
        return;
      }

      const battleState = createWildBattle(zone, activePet);
      const { wild, player } = battleState;

      const getButtons = (disabled = false) => {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`wb_atk_${interaction.id}`).setLabel("Atacar").setStyle(ButtonStyle.Danger).setEmoji("⚔️").setDisabled(disabled),
          new ButtonBuilder().setCustomId(`wb_ball_${interaction.id}`).setLabel("Lanzar Ball").setStyle(ButtonStyle.Primary).setEmoji("🔴").setDisabled(disabled),
          new ButtonBuilder().setCustomId(`wb_berry_${interaction.id}`).setLabel("Dar Baya").setStyle(ButtonStyle.Secondary).setEmoji("🍓").setDisabled(disabled),
          new ButtonBuilder().setCustomId(`wb_flee_${interaction.id}`).setLabel("Huir").setStyle(ButtonStyle.Secondary).setEmoji("🏃").setDisabled(disabled),
        );
      };

      const renderBattleEmbed = (log = "") => {
        const wildHpBar = renderHpBar(wild.currentHp, wild.maxHp, 10);
        const playerHpBar = renderHpBar(player.currentHp, player.maxHp, 10);

        return baseEmbed(COLORS.primary)
          .setTitle(`${zoneInfo.emoji} ¡Encuentro Silvestre en ${zoneInfo.name}!`)
          .setDescription(
            `Has encontrado a un **${wild.species.name} salvaje** (Nv. ${wild.level})!\n\n` +
            `🔴 **${wild.species.name} Salvaje** (Nv. ${wild.level})\n` +
            `${wildHpBar}\n\n` +
            `🎒 **Tu ${player.pet.name}** (${player.species.name} Nv. ${player.pet.level})\n` +
            `${playerHpBar}\n\n` +
            (log ? `📜 **Acciones del Turno:**\n${log}\n\n` : "") +
            `*Elige tu acción: Atacar para debilitar su barra de salud y facilitar la captura, o lanzar una Poké Ball directamente.*`,
          )
          .setThumbnail(player.species.imageUrl)
          .setImage(wild.species.spriteUrl);
      };

      const battleMsg = await interaction.reply({
        embeds: [renderBattleEmbed()],
        components: [getButtons()],
        fetchReply: true,
      });

      const collector = battleMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== uid) {
          await i.reply({ content: "Solo el entrenador en combate puede tomar decisiones.", flags: MessageFlags.Ephemeral });
          return;
        }

        if (i.customId === `wb_flee_${interaction.id}`) {
          await i.update({
            embeds: [baseEmbed(COLORS.warn).setDescription(`🏃 ¡Has escapado con éxito del combate contra **${wild.species.name}**!`)],
            components: [],
          });
          collector.stop("fled");
          return;
        }

        if (i.customId === `wb_atk_${interaction.id}`) {
          const pAtk = executePlayerAttack(player, wild);
          const logs = [pAtk.text];

          if (wild.currentHp <= 0) {
            const expGain = Math.round(wild.level * 25 + wild.species.baseHp * 0.5);
            const coinGain = Math.round(wild.level * 60 + Math.random() * 500);

            player.pet.exp += expGain;
            const db = getDb();
            db.prepare("UPDATE user_pets SET exp = ? WHERE id = ?").run(player.pet.exp, player.pet.id);

            const eco = getEco(gid, uid);
            addWallet(eco, coinGain);
            saveEco(eco, "Victoria en combate silvestre");

            logs.push(`💫 ¡**${wild.species.name} salvaje** se ha debilitado!`);
            logs.push(`🎉 Recompensas: **+${expGain} EXP** para ${player.pet.name} | **+${n(coinGain)}**.`);

            const winEmbed = baseEmbed(COLORS.success)
              .setTitle("🏆 ¡Victoria en Combate Silvestre!")
              .setDescription(logs.join("\n\n"))
              .setImage(wild.species.imageUrl);

            await i.update({ embeds: [winEmbed], components: [] });
            collector.stop("defeated");
            return;
          }

          const wAtk = executeWildAttack(wild, player);
          logs.push(wAtk.text);

          if (player.currentHp <= 0) {
            logs.push(`💀 ¡**${player.pet.name}** se ha debilitado! Tuviste que escapar a toda prisa.`);
            const faintEmbed = baseEmbed(COLORS.danger)
              .setTitle("😵 ¡Tu Pokémon se ha debilitado!")
              .setDescription(logs.join("\n\n"))
              .setImage(player.species.imageUrl);

            await i.update({ embeds: [faintEmbed], components: [] });
            collector.stop("player_fainted");
            return;
          }

          await i.update({ embeds: [renderBattleEmbed(logs.join("\n"))], components: [getButtons()] });
          return;
        }

        if (i.customId === `wb_berry_${interaction.id}`) {
          const eco = getEco(gid, uid);
          if (hasItem(eco, "baya_frambu")) {
            takeItem(eco, "baya_frambu");
            saveEco(eco, "Uso de Baya Frambu en combate");
            wild.berryBuff = true;
            const berryLog = "🍓 ¡Le has lanzado una **Baya Frambu**! El Pokémon salvaje se ha vuelto más dócil y fácil de atrapar.";
            await i.update({ embeds: [renderBattleEmbed(berryLog)], components: [getButtons()] });
          } else {
            await i.reply({ content: "No tienes Bayas Frambu en tu mochila. Consíguelas en `/pokemon tienda`.", flags: MessageFlags.Ephemeral });
          }
          return;
        }

        if (i.customId === `wb_ball_${interaction.id}`) {
          const eco = getEco(gid, uid);
          let ballToUse = "pokeball";
          if (hasItem(eco, "masterball")) ballToUse = "masterball";
          else if (hasItem(eco, "ultraball")) ballToUse = "ultraball";
          else if (hasItem(eco, "superball")) ballToUse = "superball";
          else if (hasItem(eco, "pokeball")) ballToUse = "pokeball";
          else {
            giveItem(eco, "pokeball", 1);
            ballToUse = "pokeball";
          }

          takeItem(eco, ballToUse);
          saveEco(eco, `Lanzamiento de ${ballToUse} en combate`);

          const catchResult = attemptCatch(wild, ballToUse);
          if (catchResult.success) {
            adoptPet(gid, uid, wild.species.id, wild.species.name);
            registerPokedex(gid, uid, wild.species.id);

            const expGain = Math.round(wild.level * 40);
            const coinGain = Math.round(wild.level * 100);
            addWallet(eco, coinGain);
            saveEco(eco, "Captura en combate silvestre");

            const winEmbed = baseEmbed(COLORS.success)
              .setTitle(`✨ ¡${wild.species.name} ATRAPADO CON ÉXITO!`)
              .setDescription(
                `🎉 **¡Felicidades, Entrenador!**\n\n` +
                `${catchResult.log}\n\n` +
                `🎒 **${wild.species.name}** (Nv. ${wild.level}) se ha unido a tu equipo Pokémon.\n` +
                `⭐ EXP de Entrenador: **+${expGain} EXP**\n` +
                `💰 Recompensa: **+${n(coinGain)}**`,
              )
              .setThumbnail(wild.species.imageUrl)
              .setImage(wild.species.spriteUrl);

            await i.update({ embeds: [winEmbed], components: [] });
            collector.stop("caught");
            return;
          }

          const wAtk = executeWildAttack(wild, player);
          const logs = [catchResult.log, wAtk.text];

          if (player.currentHp <= 0) {
            logs.push(`💀 ¡**${player.pet.name}** se ha debilitado! Tuviste que escapar a toda prisa.`);
            const faintEmbed = baseEmbed(COLORS.danger)
              .setTitle("😵 ¡Tu Pokémon se ha debilitado!")
              .setDescription(logs.join("\n\n"))
              .setImage(player.species.imageUrl);

            await i.update({ embeds: [faintEmbed], components: [] });
            collector.stop("player_fainted");
            return;
          }

          await i.update({ embeds: [renderBattleEmbed(logs.join("\n"))], components: [getButtons()] });
        }
      });

      collector.on("end", async (_c, reason) => {
        if (reason === "time") {
          await interaction.editReply({
            embeds: [baseEmbed(COLORS.warn).setDescription("⏰ El combate silvestre ha finalizado por inactividad. El Pokémon salvaje huyó.")],
            components: [],
          }).catch(() => null);
        }
      });
      return;
    }

    // ── SUBCOMANDO: RAID (INCURSIÓN GLOBAL) ──
    if (sub === "raid") {
      const action = interaction.options.getString("accion", true);
      if (action === "estado") {
        const raid = getCurrentRaid(gid);
        const contributors = getRaidContributors(gid, raid.raid_id);
        const sp = getPokemonById(raid.boss_species_id);

        const hpBar = renderHpBar(raid.current_hp, raid.max_hp, 14);
        const remMs = Math.max(0, raid.expires_at - Date.now());
        const remHours = Math.floor(remMs / 3_600_000);
        const remMins = Math.floor((remMs % 3_600_000) / 60_000);

        const topLines = contributors.length > 0
          ? contributors.slice(0, 5).map((c, i) => `${["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i] || "▫️"} <@${c.user_id}>: **${c.damage.toLocaleString()} DMG** (${c.total_attacks} asaltos)`).join("\n")
          : "*Aún ningún entrenador ha asestado golpes en esta incursión.*";

        const raidEmbed = baseEmbed(COLORS.gold)
          .setTitle(`⚔️ INCURSIÓN GLOBAL: ${raid.boss_name} (Nv. ${raid.level})`)
          .setDescription(
            `> *Un imponente Pokémon Legendario ha emergido en el servidor. ¡Colabora con todos los entrenadores para debilitarlo y llevarte grandes tesoros!*\n\n` +
            `❤️ **Salud del Jefe:**\n${hpBar}\n\n` +
            `⏳ **Tiempo Restante:** ${remHours}h ${remMins}m\n` +
            `💰 **Bolsa de Recompensas Comunitaria:** ${n(raid.reward_coins)}\n\n` +
            `🏆 **Top Combatientes:**\n${topLines}\n\n` +
            `*Para unirte a la batalla, usa \`/pokemon raid accion:atacar\`.*`,
          )
          .setThumbnail(sp?.imageUrl || null)
          .setImage(sp?.spriteUrl || null);

        await interaction.reply({ embeds: [raidEmbed] });
        return;
      }

      if (action === "atacar") {
        const res = attackRaid(gid, uid);
        if (!res.ok) {
          await interaction.reply(ephem(res.message));
          return;
        }

        const spBoss = getPokemonById(res.raid?.boss_species_id || "");
        const hpBar = renderHpBar(res.bossHpRemaining || 0, res.raid?.max_hp || 100, 10);

        const attackEmbed = baseEmbed(res.bossDefeated ? COLORS.success : COLORS.primary)
          .setTitle(`⚔️ Asalto en Incursión: ${res.pet?.name} vs ${res.raid?.boss_name}`)
          .setDescription(
            `${res.message}\n\n` +
            `❤️ **Salud restante de ${res.raid?.boss_name}:**\n${hpBar}\n\n` +
            (res.bossDefeated ? `\n${res.rewardsSummary}` : `*Podrás volver a atacar en 10 minutos.*`),
          )
          .setThumbnail(res.species?.imageUrl || null)
          .setImage(spBoss?.spriteUrl || null);

        await interaction.reply({ embeds: [attackEmbed] });
        return;
      }
    }
  },
};

export default command;
