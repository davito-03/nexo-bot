import { getDb } from "../../database/index.js";
import { getEco, saveEco, deductFunds, addWallet, invOf, hasItem, takeItem, giveItem, n } from "./engine.js";

// ── Roles de Asalto ──
export interface HeistRoleDef {
  id: "hacker" | "demoliciones" | "conductor" | "tirador" | "infiltrador" | "medico" | "negociador";
  name: string;
  emoji: string;
  badge: string;
  description: string;
  passive: string;
  bonusSummary: string;
}

export const HEIST_ROLES: Record<string, HeistRoleDef> = {
  hacker: {
    id: "hacker",
    name: "Hacker Cibernético",
    emoji: "🧠",
    badge: "💻",
    description: "Especialista en vulnerar cortafuegos, deshabilitar cámaras y anular el software del banco.",
    passive: "Desactiva cámaras y sistemas de alarma. Otorga +5% éxito base +1.5% por cada nivel de rol.",
    bonusSummary: "+5% éxito base (+1.5%/lvl) y anula defensas electrónicas.",
  },
  demoliciones: {
    id: "demoliciones",
    name: "Experto en Demoliciones",
    emoji: "💣",
    badge: "🧨",
    description: "Maestro en brechas y explosivos. Destruye compuertas blindadas y abre cajas fuertes de gran calibre.",
    passive: "Multiplica el botín saqueado en un +15% base +3% por cada nivel de rol.",
    bonusSummary: "+15% de botín saqueado (+3%/lvl).",
  },
  conductor: {
    id: "conductor",
    name: "Piloto de Fuga",
    emoji: "🚗",
    badge: "🏎️",
    description: "Conductor intrépido al volante del furgón de escape. Conoce cada callejón y atajo de la ciudad.",
    passive: "Si el golpe fracasa, otorga un 35% de probabilidad (+4%/lvl) de huir del SWAT y evitar el calabozo y multas a la banda.",
    bonusSummary: "35% (+4%/lvl) de rescate de calabozo y multas ante fallos.",
  },
  tirador: {
    id: "tirador",
    name: "Tirador / Enforcer",
    emoji: "🔫",
    badge: "🛡️",
    description: "Fuerza táctica de choque. Domina a los guardias, contiene a los rehenes y frena la llegada del SWAT.",
    passive: "Neutraliza la respuesta de los guardias blindados. Otorga +6% éxito base +1.5% por cada nivel de rol.",
    bonusSummary: "+6% éxito base (+1.5%/lvl) y contención de guardias.",
  },
  infiltrador: {
    id: "infiltrador",
    name: "Infiltrador Silencioso",
    emoji: "🕵️",
    badge: "🗝️",
    description: "Especialista en sigilo y conductos de ventilación. Desconecta trampas láser y sensores térmicos.",
    passive: "Anula la penalización de trampas y añade +5% éxito (+1.5%/lvl) + botín secreto por cajas desarmadas.",
    bonusSummary: "+5% éxito (+1.5%/lvl), anula trampas y aporta botín sigiloso.",
  },
  medico: {
    id: "medico",
    name: "Médico de Combate",
    emoji: "🩺",
    badge: "💉",
    description: "Especialista en medicina táctica y soporte vital bajo fuego. Trata heridos y reduce el impacto de las capturas.",
    passive: "Aumenta el éxito de la banda (+4% base +1%/lvl), reduce las penas de calabozo un 40% y mitiga fallos en incidentes.",
    bonusSummary: "+4% éxito (+1%/lvl), -40% tiempo en calabozo y soporte vital táctico.",
  },
  negociador: {
    id: "negociador",
    name: "Negociador / Mente Maestra",
    emoji: "🎙️",
    badge: "💼",
    description: "Experto en manipulación psicológica, interceptación de frecuencias de radio y pactos con las autoridades.",
    passive: "Otorga +4% éxito base (+1%/lvl) y reduce las multas judiciales de toda la banda en un 30% (+3%/lvl) si son capturados.",
    bonusSummary: "+4% éxito (+1%/lvl) y -30% (+3%/lvl) en multas judiciales de la banda.",
  },
};

export const ROLE_TITLES: { minLvl: number; title: string }[] = [
  { minLvl: 1, title: "Novato del Golpe" },
  { minLvl: 2, title: "Aprendiz Criminal" },
  { minLvl: 3, title: "Operativo Callejero" },
  { minLvl: 4, title: "Especialista Táctico" },
  { minLvl: 5, title: "Profesional del Crimen" },
  { minLvl: 6, title: "Veterano de Bóvedas" },
  { minLvl: 7, title: "Maestro del Asalto" },
  { minLvl: 8, title: "Élite del Sindicato" },
  { minLvl: 9, title: "Leyenda del Inframundo" },
  { minLvl: 10, title: "Mente Maestra Absoluta" },
];

export function getRoleTitle(level: number): string {
  let title = "Novato del Golpe";
  for (const t of ROLE_TITLES) {
    if (level >= t.minLvl) title = t.title;
  }
  return title;
}

export function xpForNextRoleLevel(level: number): number {
  return level * 150;
}

/**
 * Retorna la probabilidad máxima de éxito permitida para un nivel de seguridad dado de forma independiente.
 * - En ningún nivel puede tener el 100% de éxito (Tope de Nivel 1: 82%).
 * - En el Nivel 10 el máximo porcentaje de éxito es 55% (rebalanceado para mayor accesibilidad de las bandas).
 * - Progresión lineal natural de 3% por nivel de seguridad: 82 - (nivel - 1) * 3.
 */
export function getMaxWinRateForSecurity(securityLevel: number): number {
  const level = Math.max(1, Math.min(10, Math.round(securityLevel)));
  return 82 - (level - 1) * 3;
}

// ── Objetivos de Asalto & Niveles de Seguridad ──
export const DAVITO_ROLE_ID = "1551207417973440542";
export const DAVITO_REWARD_COINS = 100_000_000;

export interface BankSecurityTier {
  level: number;
  name: string;
  emoji: string;
  difficultyMod: number; // Modificador negativo de éxito
  lootMultiplier: number; // Multiplicador de botín
  description: string;
}

export interface HeistTargetDef {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  description: string;
  baseLootMin: number;
  baseLootMax: number;
  isSecret?: boolean;
  tiers: Record<number, BankSecurityTier>;
}

export const BANK_SECURITY_TIERS: Record<number, BankSecurityTier> = {
  1: { level: 1, name: "Seguridad Estándar", emoji: "🟢", difficultyMod: 0, lootMultiplier: 1.0, description: "Guardias privados y cámaras básicas. Bóveda sin refuerzos especiales." },
  2: { level: 2, name: "Refuerzo de Blindaje", emoji: "🟡", difficultyMod: -2, lootMultiplier: 1.25, description: "Puerta de aleación reforzada y sensores de movimiento perimetrales." },
  3: { level: 3, name: "Láseres & Cortafuegos", emoji: "🟠", difficultyMod: -4, lootMultiplier: 1.5, description: "Sensores térmicos, cortafuegos digitales y alarmas silenciosas directas." },
  4: { level: 4, name: "Vigilancia Paramilitar", emoji: "🔴", difficultyMod: -7, lootMultiplier: 1.85, description: "Guardias fuertemente armados, cristales balísticos y circuito cerrado con IA." },
  5: { level: 5, name: "Fortaleza Acorazada", emoji: "🟣", difficultyMod: -10, lootMultiplier: 2.3, description: "Cámara acorazada de titanio reforzado y escáneres biométricos de acceso." },
  6: { level: 6, name: "Protocolo Anti-Intrusión", emoji: "🛡️", difficultyMod: -13, lootMultiplier: 2.8, description: "Cierres herméticos automáticos, gas somnífero y respuesta de élite." },
  7: { level: 7, name: "Bóveda Subterránea Blindada", emoji: "⚡", difficultyMod: -16, lootMultiplier: 3.4, description: "Cámara subterránea protegida con aleación de tungsteno y furgones tácticos." },
  8: { level: 8, name: "Defensa Biocibernética", emoji: "🔥", difficultyMod: -19, lootMultiplier: 4.1, description: "Inteligencia artificial de defensa militar, torretas de defensa y bloqueos cuánticos." },
  9: { level: 9, name: "Cámara Acorazada Génesis", emoji: "💎", difficultyMod: -22, lootMultiplier: 4.8, description: "La bóveda más protegida del país: reservas de lingotes de oro y criptomonedas puras." },
  10: { level: 10, name: "Bóveda Federal Absoluta", emoji: "👑", difficultyMod: -25, lootMultiplier: 5.5, description: "Máxima seguridad nacional. Botín colosal para aquellos que desafíen lo imposible." },
};

export const CASINO_SECURITY_TIERS: Record<number, BankSecurityTier> = {
  1: { level: 1, name: "Vigilancia de Casino Estándar", emoji: "🟢", difficultyMod: -2, lootMultiplier: 1.0, description: "Crupieres atentos, guardias de entrada y cámaras analógicas." },
  2: { level: 2, name: "Bóveda de Fichas VIP", emoji: "🟡", difficultyMod: -4, lootMultiplier: 1.25, description: "Caja fuerte blindada para fichas de alto valor y caja de efectivo." },
  3: { level: 3, name: "Cámaras Térmicas & Escáneres", emoji: "🟠", difficultyMod: -6, lootMultiplier: 1.5, description: "Reconocimiento biométrico facial y guardias de seguridad armados en salas privadas." },
  4: { level: 4, name: "Seguridad de la Mafia", emoji: "🔴", difficultyMod: -9, lootMultiplier: 1.85, description: "Escoltas privadas con subfusiles custodiando la sala de conteo de billetes." },
  5: { level: 5, name: "Cámara de Fichas Doradas", emoji: "🟣", difficultyMod: -12, lootMultiplier: 2.3, description: "Bóveda con aleación de acero y control de doble llave maestra." },
  6: { level: 6, name: "Sistema Criogénico de Bloqueo", emoji: "🛡️", difficultyMod: -15, lootMultiplier: 2.8, description: "Bloqueo por congelación instantánea y gas aturdidor en túneles de acceso." },
  7: { level: 7, name: "Bóveda Subterránea Platino", emoji: "⚡", difficultyMod: -18, lootMultiplier: 3.4, description: "Cámara secreta bajo las mesas de ruleta con sensores sísmicos de perforación." },
  8: { level: 8, name: "Comando Paramilitar del Sindicato", emoji: "🔥", difficultyMod: -21, lootMultiplier: 4.1, description: "Guardia pretoriana de veteranos con chalecos pesados y rifles tácticos." },
  9: { level: 9, name: "Cámara Diamante Real", emoji: "💎", difficultyMod: -25, lootMultiplier: 4.8, description: "La recaudación anual acumulada de los mayores apostadores del mundo." },
  10: { level: 10, name: "Bóveda Diamante Royal Absoluta", emoji: "👑", difficultyMod: -29, lootMultiplier: 5.5, description: "Fortaleza inexpugnable del Casino: lingotes, diamantes y fichas cuánticas." },
};

export const MANSION_SECURITY_TIERS: Record<number, BankSecurityTier> = {
  1: { level: 1, name: "Jardines y Valla Perimetral", emoji: "🟢", difficultyMod: -3, lootMultiplier: 1.0, description: "Verjas de hierro forjado, focos halógenos y cámaras perimetrales." },
  2: { level: 2, name: "Dóbermans Guardianes", emoji: "🟡", difficultyMod: -5, lootMultiplier: 1.25, description: "Perros adiestrados de patrulla y sensores de presión en el césped." },
  3: { level: 3, name: "Barreras Infrarrojas", emoji: "🟠", difficultyMod: -8, lootMultiplier: 1.5, description: "Sensores láser en ventanas, vitrinas de arte protegidas y escolta armada." },
  4: { level: 4, name: "Habitación del Pánico Blindada", emoji: "🔴", difficultyMod: -11, lootMultiplier: 1.85, description: "Bunker interno acorazado con comunicación satelital directa a la policía." },
  5: { level: 5, name: "Cerco Electrificado de Alta Tensión", emoji: "🟣", difficultyMod: -14, lootMultiplier: 2.3, description: "Red eléctrica perimetral letal y circuito de cámaras nocturnas con IA." },
  6: { level: 6, name: "Escolta Privada Ex-Militar", emoji: "🛡️", difficultyMod: -18, lootMultiplier: 2.8, description: "Contratistas privados armados con visión nocturna y sensores acústicos." },
  7: { level: 7, name: "Cámara Secreta en Catacumbas", emoji: "⚡", difficultyMod: -22, lootMultiplier: 3.4, description: "Cámara acorazada oculta tras la bodega de vinos con compuertas hidráulicas." },
  8: { level: 8, name: "Defensas Automatizadas de Mansión", emoji: "🔥", difficultyMod: -26, lootMultiplier: 4.1, description: "Torretas de fogueo ocultas en el jardín y cierre automático de compuertas." },
  9: { level: 9, name: "Tesoro de la Dinastía del Magnate", emoji: "💎", difficultyMod: -30, lootMultiplier: 4.8, description: "Obras maestras de arte milenario, joyas de la corona y lingotes privados." },
  10: { level: 10, name: "Fortaleza Residencial Inexpugnable", emoji: "👑", difficultyMod: -34, lootMultiplier: 5.5, description: "El búnker personal de la cumbre del poder: riqueza colosal y blindaje total." },
};

export const EMPRESA_SECURITY_TIERS: Record<number, BankSecurityTier> = {
  1: { level: 1, name: "Acceso con Tarjeta y Recepción", emoji: "🟢", difficultyMod: -5, lootMultiplier: 1.0, description: "Tornos de entrada, recepcionistas y vigilantes con porra." },
  2: { level: 2, name: "Sensores y Ciberdefensa Básica", emoji: "🟡", difficultyMod: -7, lootMultiplier: 1.25, description: "Cámaras con IA de reconocimiento y alarmas silenciosas a comisaría." },
  3: { level: 3, name: "Drones Autónomos de Patrulla", emoji: "🟠", difficultyMod: -10, lootMultiplier: 1.5, description: "Drones aéreos vigilando plantas corporativas y pasillos técnicos." },
  4: { level: 4, name: "Servidores Fríos Cifrados", emoji: "🔴", difficultyMod: -13, lootMultiplier: 1.85, description: "Salas de servidores con cerraduras biométricas y claves criptográficas cuánticas." },
  5: { level: 5, name: "Cierres Herméticos y Gas Paralizante", emoji: "🟣", difficultyMod: -17, lootMultiplier: 2.3, description: "Protocolo de aislamiento instantáneo de plantas ante cualquier brecha física." },
  6: { level: 6, name: "Cortafuegos de Inteligencia Militar", emoji: "🛡️", difficultyMod: -21, lootMultiplier: 2.8, description: "IA militar corporativa capaz de detectar intrusos y hackear sus dispositivos." },
  7: { level: 7, name: "Bóveda de I+D y Patentes Cuánticas", emoji: "⚡", difficultyMod: -25, lootMultiplier: 3.4, description: "Caja acorazada subterránea con secretos industriales valorados en millones." },
  8: { level: 8, name: "Guardia Cibernética Reforzada", emoji: "🔥", difficultyMod: -29, lootMultiplier: 4.1, description: "Soldados cibernéticos armados con exoesqueletos y blindaje anti-balas." },
  9: { level: 9, name: "Núcleo Financiero Nexo Corp", emoji: "💎", difficultyMod: -34, lootMultiplier: 4.8, description: "El cofre digital y físico que guarda las reservas de capital de la multinacional." },
  10: { level: 10, name: "Bóveda Neural Absoluta de Nexo Corp", emoji: "👑", difficultyMod: -39, lootMultiplier: 5.5, description: "El corazón inquebrantable de la corporación: máxima tecnología y botín masivo." },
};

export const TREN_SECURITY_TIERS: Record<number, BankSecurityTier> = {
  1: { level: 1, name: "Vagones de Carga Blindados", emoji: "🟢", difficultyMod: -4, lootMultiplier: 1.0, description: "Cerraduras mecánicas pesadas y guardias ferroviarios armados." },
  2: { level: 2, name: "Escolta Armada sobre Raíles", emoji: "🟡", difficultyMod: -6, lootMultiplier: 1.25, description: "Guardias patrullando pasillos y plataformas exteriores en marcha." },
  3: { level: 3, name: "Compuertas Inter-Vagón de Acero", emoji: "🟠", difficultyMod: -9, lootMultiplier: 1.5, description: "Compuertas automáticas resistentes a explosivos ligeros entre vagones." },
  4: { level: 4, name: "Torretas Automáticas de Techo", emoji: "🔴", difficultyMod: -12, lootMultiplier: 1.85, description: "Ametralladoras robotizadas en el techo del tren para repeler asaltos aéreos." },
  5: { level: 5, name: "Blindaje de Tungsteno Ferroviario", emoji: "🟣", difficultyMod: -15, lootMultiplier: 2.3, description: "Planchas antibalas de calibre militar recubriendo la locomotora y la cámara." },
  6: { level: 6, name: "Sistema de Desconexión de Emergencia", emoji: "🛡️", difficultyMod: -19, lootMultiplier: 2.8, description: "Mecanismo capaz de desacoplar vagones o activar frenos magnéticos pesados." },
  7: { level: 7, name: "Escuadrón Táctico de Intervención", emoji: "⚡", difficultyMod: -23, lootMultiplier: 3.4, description: "Soldados de élite apostados en el vagón comedor listos para responder al fuego." },
  8: { level: 8, name: "Vagón Acorazado Central", emoji: "🔥", difficultyMod: -27, lootMultiplier: 4.1, description: "Bóveda sobre ruedas con doble pared sellada con aleación de titanio." },
  9: { level: 9, name: "Convoy Blindado Presidencial", emoji: "💎", difficultyMod: -32, lootMultiplier: 4.8, description: "Transporte federal de reservas de oro y divisas internacionales." },
  10: { level: 10, name: "El Coloso de Acero Inquebrantable", emoji: "👑", difficultyMod: -37, lootMultiplier: 5.5, description: "Monstruo de acero sobre raíles a 200 km/h: fortaleza móvil de botín épico." },
};

export const ESTACION_SECURITY_TIERS: Record<number, BankSecurityTier> = {
  1: { level: 1, name: "Esclusas de Acoplamiento y Sensores", emoji: "🟢", difficultyMod: -6, lootMultiplier: 1.0, description: "Sellos presurizados estándar y cámaras en módulos de gravedad." },
  2: { level: 2, name: "Módulos Despresurizados de Seguridad", emoji: "🟡", difficultyMod: -9, lootMultiplier: 1.25, description: "Trampas de vacío y compuertas electromagnéticas de desacople rápido." },
  3: { level: 3, name: "Centinelas Robóticos de Gravedad Cero", emoji: "🟠", difficultyMod: -12, lootMultiplier: 1.5, description: "Drones bípedos armados con lásers flotando por los pasillos orbitales." },
  4: { level: 4, name: "Escáneres de Radiación & Láseres", emoji: "🔴", difficultyMod: -16, lootMultiplier: 1.85, description: "Rejillas de láser defensivo y sensores térmicos espaciales." },
  5: { level: 5, name: "Compuertas Herméticas de Antimateria", emoji: "🟣", difficultyMod: -20, lootMultiplier: 2.3, description: "Cámaras selladas al vacío para proteger generadores y bóvedas espaciales." },
  6: { level: 6, name: "IA Defensiva Orbital Quantum", emoji: "🛡️", difficultyMod: -25, lootMultiplier: 2.8, description: "Supercomputadora espacial que anula trajes EVA y cierra accesos." },
  7: { level: 7, name: "Núcleo de Fusión Blindado", emoji: "⚡", difficultyMod: -30, lootMultiplier: 3.4, description: "Cámara subterránea-orbital protegida por campos magnéticos de alta potencia." },
  8: { level: 8, name: "Cápsulas de Élite Espacial", emoji: "🔥", difficultyMod: -35, lootMultiplier: 4.1, description: "Marines espaciales con propulsores y fusiles de plasma de alta energía." },
  9: { level: 9, name: "Bóveda Espacial de Antimateria Pura", emoji: "💎", difficultyMod: -40, lootMultiplier: 4.8, description: "Reserva de tecnología cuántica y cristales energéticos del espacio profundo." },
  10: { level: 10, name: "Fortaleza Orbital Celestial Absoluta", emoji: "👑", difficultyMod: -46, lootMultiplier: 5.5, description: "La cúspide en órbita: botín astronómico y sistemas de seguridad de nivel orbital." },
};

export const SUBMARINO_SECURITY_TIERS: Record<number, BankSecurityTier> = {
  1: { level: 1, name: "Sonar Pasivo y Escotillas de Presión", emoji: "🟢", difficultyMod: -4, lootMultiplier: 1.0, description: "Mamparos estancos estándar y patrullas rutinarias de marinería armada." },
  2: { level: 2, name: "Patrulla de Buzos Tácticos", emoji: "🟡", difficultyMod: -6, lootMultiplier: 1.25, description: "Buzos de combate con arpones neumáticos vigilando la quilla y esclusas." },
  3: { level: 3, name: "Mamparos Estancos Reforzados", emoji: "🟠", difficultyMod: -9, lootMultiplier: 1.5, description: "Compuertas de alta presión herméticas con cerrojos hidráulicos marinos." },
  4: { level: 4, name: "Redes Anti-Torpedo & Carga de Profundidad", emoji: "🔴", difficultyMod: -13, lootMultiplier: 1.85, description: "Sistemas perimetrales de defensa activa submarina y sensores acústicos de casco." },
  5: { level: 5, name: "Cámaras Criogénicas de Presurización", emoji: "🟣", difficultyMod: -17, lootMultiplier: 2.3, description: "Esclusas selladas al vacío abisal que inundan compartimentos ante intrusos." },
  6: { level: 6, name: "IA Táctica Naval de Inmersión", emoji: "🛡️", difficultyMod: -21, lootMultiplier: 2.8, description: "Supercomputadora naval que controla compuertas y anula equipos electrónicos." },
  7: { level: 7, name: "Silo de Torpedos Cuánticos Blindado", emoji: "⚡", difficultyMod: -26, lootMultiplier: 3.4, description: "Cámara acorazada contigua al reactor nuclear con acceso biométrico dual." },
  8: { level: 8, name: "Guardia Pretoriana de Asalto Submarino", emoji: "🔥", difficultyMod: -31, lootMultiplier: 4.1, description: "Fuerzas especiales navales de élite con trajes presurizados y subfusiles anfibios." },
  9: { level: 9, name: "Bóveda de Códigos de Lanzamiento Nuclear", emoji: "💎", difficultyMod: -36, lootMultiplier: 4.8, description: "Caja acorazada sumergida con tecnología de fusión y reservas de plutonio militar." },
  10: { level: 10, name: "Coloso Abisal Nuclear Leviathan Absoluto", emoji: "👑", difficultyMod: -42, lootMultiplier: 5.5, description: "Monstruo de acero a 3.000 metros bajo el mar: inexpugnable, blindaje abisal y botín titánico." },
};

export const MUSEO_SECURITY_TIERS: Record<number, BankSecurityTier> = {
  1: { level: 1, name: "Vitrinas de Cristal Templado y Cuerdas", emoji: "🟢", difficultyMod: -2, lootMultiplier: 1.0, description: "Cámaras convencionales de museo, custodios con porra y vitrinas reforzadas." },
  2: { level: 2, name: "Sensores de Presión en Galería Imperial", emoji: "🟡", difficultyMod: -4, lootMultiplier: 1.25, description: "Baldosas sensibles al peso en las salas de exhibición de coronas y oro." },
  3: { level: 3, name: "Celosías Láser Infrarrojas Multicapa", emoji: "🟠", difficultyMod: -7, lootMultiplier: 1.5, description: "Mallas invisibles de detección térmica y alarmas ultrasónicas silenciosas." },
  4: { level: 4, name: "Custodios Privados de Reliquias", emoji: "🔴", difficultyMod: -10, lootMultiplier: 1.85, description: "Guardias armados tácticos custodiando sarcófagos y joyas de dinastías arcanas." },
  5: { level: 5, name: "Bóveda Subterránea de Artefactos Prohibidos", emoji: "🟣", difficultyMod: -13, lootMultiplier: 2.3, description: "Cámara acorazada bajo el ala este con compuertas de aleación milenaria." },
  6: { level: 6, name: "Gas Paralizante Antihurto y Compuertas de Mármol", emoji: "🛡️", difficultyMod: -17, lootMultiplier: 2.8, description: "Mecanismo instantáneo de sellado de mármol y liberación de neurotoxinas no letales." },
  7: { level: 7, name: "Escáneres Biométricos Espectrales", emoji: "⚡", difficultyMod: -21, lootMultiplier: 3.4, description: "Sensores ópticos espectrales que detectan cualquier alteración en vitrinas." },
  8: { level: 8, name: "Batallón de Choque Patrimonial Militarizado", emoji: "🔥", difficultyMod: -26, lootMultiplier: 4.1, description: "Comando militar especializado en protección de patrimonio histórico de alta seguridad." },
  9: { level: 9, name: "Cámara de la Corona Imperial y Joyas Primigenias", emoji: "💎", difficultyMod: -31, lootMultiplier: 4.8, description: "El mayor tesoro histórico de la humanidad: gemas mitológicas y reliquias incalculables." },
  10: { level: 10, name: "Santuario Arcano Imperial Inexpugnable", emoji: "👑", difficultyMod: -36, lootMultiplier: 5.5, description: "Fortaleza milenaria acorazada: seguridad absoluta, reliquias místicas y riqueza colosal." },
};

export const DAVITO_SECURITY_TIERS: Record<number, BankSecurityTier> = {
  10: {
    level: 10,
    name: "Fortaleza Inexpugnable de Davito",
    emoji: "👑",
    difficultyMod: -99, // Se calcula matemáticamente para ser < 1%
    lootMultiplier: 1000.0,
    description: "El bastión definitivo y prohibido de Davito. Trampas dimensionales, guardianes cósmicos y dificultad casi imposible (<1% de éxito).",
  },
};

export const HEIST_TARGETS: Record<string, HeistTargetDef> = {
  banco: {
    id: "banco",
    name: "Banco Central de Nexo",
    shortName: "Banco Central",
    emoji: "🏛️",
    description: "Bóveda acorazada subterránea del tesoro estatal.",
    baseLootMin: 35_000,
    baseLootMax: 65_000,
    tiers: BANK_SECURITY_TIERS,
  },
  casino: {
    id: "casino",
    name: "Gran Casino Royal Nexo",
    shortName: "Gran Casino",
    emoji: "🎰",
    description: "Cámara de conteo y recaudación de las salas VIP y ruletas de diamantes.",
    baseLootMin: 50_000,
    baseLootMax: 90_000,
    tiers: CASINO_SECURITY_TIERS,
  },
  mansion: {
    id: "mansion",
    name: "Mansión del Magnate de la Colina",
    shortName: "Mansión del Magnate",
    emoji: "🏰",
    description: "Residencia fortificada con joyas, obras de arte y cámaras antipánico.",
    baseLootMin: 70_000,
    baseLootMax: 125_000,
    tiers: MANSION_SECURITY_TIERS,
  },
  museo: {
    id: "museo",
    name: "Museo Imperial de Antigüedades Arcanas",
    shortName: "Museo Imperial",
    emoji: "🏛️",
    description: "Galería imperial fortificada con joyas dinásticas, coronas de oro y reliquias arcanas.",
    baseLootMin: 60_000,
    baseLootMax: 110_000,
    tiers: MUSEO_SECURITY_TIERS,
  },
  tren_blindado: {
    id: "tren_blindado",
    name: "Tren Blindado Transcontinental",
    shortName: "Tren Blindado",
    emoji: "🚂",
    description: "Convoy ferroviario armado en marcha con lingotes de oro y platino.",
    baseLootMin: 85_000,
    baseLootMax: 150_000,
    tiers: TREN_SECURITY_TIERS,
  },
  empresa: {
    id: "empresa",
    name: "Sede Cuántica de Nexo Corp",
    shortName: "Nexo Corp",
    emoji: "🏢",
    description: "Complejo corporativo con servidores fríos de criptos y patentes de alta tecnología.",
    baseLootMin: 100_000,
    baseLootMax: 180_000,
    tiers: EMPRESA_SECURITY_TIERS,
  },
  submarino: {
    id: "submarino",
    name: "Submarino Nuclear 'Leviathan'",
    shortName: "Submarino Nuclear",
    emoji: "⚓",
    description: "Coloso nuclear sumergido en aguas abisales con reactores de fusión y secretos militares.",
    baseLootMin: 130_000,
    baseLootMax: 220_000,
    tiers: SUBMARINO_SECURITY_TIERS,
  },
  estacion_espacial: {
    id: "estacion_espacial",
    name: "Estación Orbital Quantum Nexo",
    shortName: "Estación Espacial",
    emoji: "🛰️",
    description: "Estación en órbita terrestre con depósitos de antimateria y tecnología cuántica.",
    baseLootMin: 180_000,
    baseLootMax: 320_000,
    tiers: ESTACION_SECURITY_TIERS,
  },
  davito: {
    id: "davito",
    name: "Fortaleza Inexpugnable de Davito",
    shortName: "Fortaleza de Davito",
    emoji: "👑",
    description: "El asalto prohibido definitivo. Dificultad casi imposible (<1% de éxito). Botín legendario.",
    baseLootMin: DAVITO_REWARD_COINS,
    baseLootMax: DAVITO_REWARD_COINS,
    isSecret: true,
    tiers: DAVITO_SECURITY_TIERS,
  },
};

export const STANDARD_TARGET_IDS = [
  "banco",
  "casino",
  "mansion",
  "museo",
  "tren_blindado",
  "empresa",
  "submarino",
  "estacion_espacial",
] as const;

export interface BankSecurityInfo {
  guildId: string;
  targetId: string;
  targetName: string;
  targetEmoji: string;
  securityLevel: number;
  maxLevelReached: number;
  level10Reached: boolean;
  consecutiveWins: number;
  lastHeistAt: number;
  tier: BankSecurityTier;
}

/**
 * Comprueba si la Fortaleza de Davito ha sido desbloqueada.
 * Se desbloquea cuando todos los 8 objetivos estándar han alcanzado el Nivel 10 al menos una vez (hitos registrados).
 */
export function isDavitoUnlocked(guildId: string): boolean {
  for (const tid of STANDARD_TARGET_IDS) {
    const sec = getTargetSecurity(guildId, tid);
    if (!sec.level10Reached && sec.securityLevel < 10) return false;
  }
  return true;
}

/**
 * Devuelve el progreso hacia el desbloqueo secreto de Davito (sin spoilers),
 * basado en los hitos permanentes de Nivel 10 registrados para cada asalto.
 */
export function getDavitoUnlockProgress(guildId: string): {
  maxedCount: number;
  totalStandard: number;
  isUnlocked: boolean;
} {
  let maxedCount = 0;
  for (const tid of STANDARD_TARGET_IDS) {
    const sec = getTargetSecurity(guildId, tid);
    if (sec.level10Reached || sec.securityLevel >= 10) maxedCount += 1;
  }
  return {
    maxedCount,
    totalStandard: STANDARD_TARGET_IDS.length,
    isUnlocked: maxedCount >= STANDARD_TARGET_IDS.length,
  };
}

/**
 * Obtiene la lista de objetivos visibles para un servidor (Davito solo aparece si está desbloqueado).
 */
export function getAvailableTargetsForGuild(guildId: string): HeistTargetDef[] {
  const list = STANDARD_TARGET_IDS.map((id) => HEIST_TARGETS[id]!);
  if (isDavitoUnlocked(guildId)) {
    list.push(HEIST_TARGETS.davito!);
  }
  return list;
}

export function getTargetSecurity(guildId: string, targetId = "banco"): BankSecurityInfo {
  const db = getDb();
  const targetDef = HEIST_TARGETS[targetId] || HEIST_TARGETS.banco;
  const now = Date.now();

  let row = db
    .prepare("SELECT * FROM heist_target_security WHERE guild_id = ? AND target_id = ?")
    .get(guildId, targetDef.id) as any;

  if (!row) {
    let initLevel = 1;
    let initWins = 0;
    let initLast = 0;

    if (targetDef.id === "banco") {
      try {
        const bRow = db.prepare("SELECT * FROM bank_security WHERE guild_id = ?").get(guildId) as any;
        if (bRow) {
          initLevel = bRow.security_level || 1;
          initWins = bRow.consecutive_wins || 0;
          initLast = bRow.last_heist_at || 0;
        }
      } catch {
        /* ignore */
      }
    } else if (targetDef.isSecret) {
      initLevel = 10;
    }

    const initMaxLevel = initLevel >= 10 ? 10 : initLevel;
    const initLevel10 = initLevel >= 10 ? 1 : 0;

    db.prepare(
      "INSERT INTO heist_target_security (guild_id, target_id, security_level, consecutive_wins, last_heist_at, max_level_reached, level_10_reached, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(guildId, targetDef.id, initLevel, initWins, initLast, initMaxLevel, initLevel10, now);

    row = {
      guild_id: guildId,
      target_id: targetDef.id,
      security_level: initLevel,
      consecutive_wins: initWins,
      last_heist_at: initLast,
      max_level_reached: initMaxLevel,
      level_10_reached: initLevel10,
    };
  }

  const level = Math.max(1, Math.min(10, row.security_level || 1));
  const maxLevel = Math.max(level, row.max_level_reached ?? level);
  const level10 = Boolean(row.level_10_reached || maxLevel >= 10 || level >= 10);
  const tier = targetDef.tiers[level] || targetDef.tiers[10] || targetDef.tiers[1] || BANK_SECURITY_TIERS[1];

  return {
    guildId,
    targetId: targetDef.id,
    targetName: targetDef.name,
    targetEmoji: targetDef.emoji,
    securityLevel: level,
    maxLevelReached: maxLevel,
    level10Reached: level10,
    consecutiveWins: row.consecutive_wins || 0,
    lastHeistAt: row.last_heist_at || 0,
    tier,
  };
}

export function recordTargetHeistResult(
  guildId: string,
  targetId: string,
  success: boolean,
  totalLoot: number,
): { security: BankSecurityInfo; justUnlockedDavito: boolean; justReachedLevel10: boolean } {
  const db = getDb();
  const current = getTargetSecurity(guildId, targetId);
  const now = Date.now();
  const targetDef = HEIST_TARGETS[targetId] || HEIST_TARGETS.banco;

  const wasUnlocked = isDavitoUnlocked(guildId);
  const hadLevel10 = current.level10Reached;

  let newLevel = current.securityLevel;
  let newConsecutive = current.consecutiveWins;

  if (!targetDef.isSecret) {
    if (success) {
      newConsecutive += 1;
      if (newLevel < 10) newLevel += 1;
    } else {
      newConsecutive = 0;
      if (newLevel > 1) newLevel -= 1;
    }
  } else {
    if (success) newConsecutive += 1;
  }

  const reached10Now = hadLevel10 || newLevel >= 10;
  const newMaxLevel = Math.max(current.maxLevelReached, newLevel);
  const justReachedLevel10 = !hadLevel10 && reached10Now;

  db.prepare(
    "UPDATE heist_target_security SET security_level = ?, consecutive_wins = ?, last_heist_at = ?, max_level_reached = ?, level_10_reached = ?, updated_at = ? WHERE guild_id = ? AND target_id = ?",
  ).run(newLevel, newConsecutive, now, newMaxLevel, reached10Now ? 1 : 0, now, guildId, targetDef.id);

  if (targetDef.id === "banco") {
    try {
      db.prepare(
        "UPDATE bank_security SET security_level = ?, consecutive_wins = ?, last_heist_at = ?, updated_at = ? WHERE guild_id = ?",
      ).run(newLevel, newConsecutive, now, now, guildId);
    } catch {
      /* ignore */
    }
  }

  const isUnlockedNow = isDavitoUnlocked(guildId);
  const justUnlockedDavito = !wasUnlocked && isUnlockedNow;

  return {
    security: getTargetSecurity(guildId, targetDef.id),
    justUnlockedDavito,
    justReachedLevel10,
  };
}

// Compatibilidad hacia atrás con banco
export function getBankSecurity(guildId: string): BankSecurityInfo {
  return getTargetSecurity(guildId, "banco");
}

export function recordBankHeistResult(guildId: string, success: boolean, totalLoot: number): BankSecurityInfo {
  return recordTargetHeistResult(guildId, "banco", success, totalLoot).security;
}

/**
 * Permite al Staff fijar manualmente el nivel de seguridad de un objetivo (1 a 10).
 */
export function setTargetSecurityLevel(
  guildId: string,
  targetId: string,
  level: number,
): { security: BankSecurityInfo; justUnlockedDavito: boolean; justReachedLevel10: boolean } {
  const db = getDb();
  const targetDef = HEIST_TARGETS[targetId] || HEIST_TARGETS.banco;
  const clampedLevel = Math.max(1, Math.min(10, Math.floor(level)));
  const now = Date.now();
  const wasUnlocked = isDavitoUnlocked(guildId);
  const current = getTargetSecurity(guildId, targetDef.id);
  const hadLevel10 = current.level10Reached;

  const reached10Now = hadLevel10 || clampedLevel >= 10;
  const newMaxLevel = Math.max(current.maxLevelReached, clampedLevel);
  const justReachedLevel10 = !hadLevel10 && reached10Now;

  db.prepare(
    "UPDATE heist_target_security SET security_level = ?, max_level_reached = ?, level_10_reached = ?, updated_at = ? WHERE guild_id = ? AND target_id = ?",
  ).run(clampedLevel, newMaxLevel, reached10Now ? 1 : 0, now, guildId, targetDef.id);

  if (targetDef.id === "banco") {
    try {
      db.prepare(
        "UPDATE bank_security SET security_level = ?, updated_at = ? WHERE guild_id = ?",
      ).run(clampedLevel, now, guildId);
    } catch {
      /* ignore */
    }
  }

  const isUnlockedNow = isDavitoUnlocked(guildId);
  const justUnlockedDavito = !wasUnlocked && isUnlockedNow;

  return {
    security: getTargetSecurity(guildId, targetDef.id),
    justUnlockedDavito,
    justReachedLevel10,
  };
}

/**
 * Permite al Staff reiniciar el cooldown de los asaltos para un objetivo específico o todos los objetivos.
 */
export function resetTargetCooldown(guildId: string, targetId?: string): { targetNames: string[] } {
  const db = getDb();
  const now = Date.now();

  if (!targetId || targetId === "todos") {
    db.prepare("UPDATE heist_target_security SET last_heist_at = 0, updated_at = ? WHERE guild_id = ?").run(now, guildId);
    try {
      db.prepare("UPDATE bank_security SET last_heist_at = 0, updated_at = ? WHERE guild_id = ?").run(now, guildId);
    } catch {
      /* ignore */
    }
    return { targetNames: ["Todos los objetivos de asalto del servidor"] };
  }

  const targetDef = HEIST_TARGETS[targetId] || HEIST_TARGETS.banco;
  getTargetSecurity(guildId, targetDef.id); // Asegurar existencia
  db.prepare(
    "UPDATE heist_target_security SET last_heist_at = 0, updated_at = ? WHERE guild_id = ? AND target_id = ?",
  ).run(now, guildId, targetDef.id);

  if (targetDef.id === "banco") {
    try {
      db.prepare("UPDATE bank_security SET last_heist_at = 0, updated_at = ? WHERE guild_id = ?").run(now, guildId);
    } catch {
      /* ignore */
    }
  }

  return { targetNames: [targetDef.name] };
}

// ── Perfiles Criminales y Roles de Usuario ──
export interface UserHeistProfile {
  guildId: string;
  userId: string;
  totalHeists: number;
  heistsWon: number;
  totalLoot: number;
  reputation: number;
  activeRole: string;
  rankTitle: string;
}

export function getReputationTitle(reputation: number): string {
  if (reputation >= 5000) return "👑 Mente Maestra del Sindicato";
  if (reputation >= 2500) return "🎩 Jefe de Banda Criminal";
  if (reputation >= 1000) return "💼 Mercenario Profesional";
  if (reputation >= 400) return "🔫 Asaltante Callejero";
  return "🧢 Ladronzuelo de Callejón";
}

export function getUserHeistProfile(guildId: string, userId: string): UserHeistProfile {
  const db = getDb();
  let row = db
    .prepare("SELECT * FROM user_heist_profiles WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) as any;

  if (!row) {
    db.prepare(
      "INSERT INTO user_heist_profiles (guild_id, user_id, total_heists, heists_won, total_loot, reputation, active_role) VALUES (?, ?, 0, 0, 0, 0, 'tirador')",
    ).run(guildId, userId);
    row = {
      guild_id: guildId,
      user_id: userId,
      total_heists: 0,
      heists_won: 0,
      total_loot: 0,
      reputation: 0,
      active_role: "tirador",
    };
  }

  return {
    guildId,
    userId,
    totalHeists: row.total_heists,
    heistsWon: row.heists_won,
    totalLoot: row.total_loot,
    reputation: row.reputation,
    activeRole: row.active_role || "tirador",
    rankTitle: getReputationTitle(row.reputation),
  };
}

export interface UserHeistRoleState {
  roleId: string;
  level: number;
  xp: number;
  xpNeeded: number;
  title: string;
  def: HeistRoleDef;
}

export function getUserRoleState(guildId: string, userId: string, roleId: string): UserHeistRoleState {
  const db = getDb();
  let row = db
    .prepare("SELECT * FROM user_heist_roles WHERE guild_id = ? AND user_id = ? AND role_id = ?")
    .get(guildId, userId, roleId) as any;

  if (!row) {
    db.prepare("INSERT INTO user_heist_roles (guild_id, user_id, role_id, level, xp) VALUES (?, ?, ?, 1, 0)").run(
      guildId,
      userId,
      roleId,
    );
    row = { role_id: roleId, level: 1, xp: 0 };
  }

  const level = row.level || 1;
  const def = HEIST_ROLES[roleId] || HEIST_ROLES.tirador;
  return {
    roleId,
    level,
    xp: row.xp || 0,
    xpNeeded: xpForNextRoleLevel(level),
    title: getRoleTitle(level),
    def,
  };
}

export function getAllUserRoleStates(guildId: string, userId: string): UserHeistRoleState[] {
  return Object.keys(HEIST_ROLES).map((rId) => getUserRoleState(guildId, userId, rId));
}

export function setUserActiveRole(guildId: string, userId: string, roleId: string): boolean {
  if (!HEIST_ROLES[roleId]) return false;
  const db = getDb();
  getUserHeistProfile(guildId, userId); // Ensure profile exists
  db.prepare("UPDATE user_heist_profiles SET active_role = ? WHERE guild_id = ? AND user_id = ?").run(
    roleId,
    guildId,
    userId,
  );
  return true;
}

export function awardHeistXp(
  guildId: string,
  userId: string,
  roleId: string,
  success: boolean,
  lootGained: number,
): { leveledUp: boolean; oldLevel: number; newLevel: number; newTitle?: string; roleName: string } {
  const db = getDb();
  const currentRole = getUserRoleState(guildId, userId, roleId);
  const profile = getUserHeistProfile(guildId, userId);

  const roleXpGained = success ? 110 : 45;
  const repGained = success ? 150 : 30;

  // Actualizar perfil global
  db.prepare(
    "UPDATE user_heist_profiles SET total_heists = total_heists + 1, heists_won = heists_won + ?, total_loot = total_loot + ?, reputation = reputation + ? WHERE guild_id = ? AND user_id = ?",
  ).run(success ? 1 : 0, lootGained, repGained, guildId, userId);

  // Actualizar rol
  let level = currentRole.level;
  let xp = currentRole.xp + roleXpGained;
  let leveledUp = false;
  const oldLevel = level;

  while (level < 10 && xp >= xpForNextRoleLevel(level)) {
    xp -= xpForNextRoleLevel(level);
    level += 1;
    leveledUp = true;
  }

  db.prepare(
    "UPDATE user_heist_roles SET level = ?, xp = ? WHERE guild_id = ? AND user_id = ? AND role_id = ?",
  ).run(level, xp, guildId, userId, roleId);

  return {
    leveledUp,
    oldLevel,
    newLevel: level,
    newTitle: leveledUp ? getRoleTitle(level) : undefined,
    roleName: currentRole.def.name,
  };
}

export function getTopHeistCriminals(
  guildId: string,
  limit = 10,
): { userId: string; reputation: number; heistsWon: number; totalLoot: number; activeRole: string; rankTitle: string }[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM user_heist_profiles WHERE guild_id = ? ORDER BY reputation DESC, total_loot DESC LIMIT ?")
    .all(guildId, limit) as any[];

  return rows.map((r) => ({
    userId: r.user_id,
    reputation: r.reputation,
    heistsWon: r.heists_won,
    totalLoot: r.total_loot,
    activeRole: r.active_role,
    rankTitle: getReputationTitle(r.reputation),
  }));
}

// ── Mercado Negro ──
export interface BlackMarketItem {
  id: string;
  name: string;
  price: number;
  emoji: string;
  rarity: string;
  description: string;
  effect: string;
}

export const BLACK_MARKET_ITEMS: BlackMarketItem[] = [
  {
    id: "c4",
    name: "Carga C4 de Demolición",
    price: 4500,
    emoji: "💣",
    rarity: "Raro",
    description: "Explosivo plástico de grado militar para la cámara acorazada.",
    effect: "+25% de botín saqueado en el asalto.",
  },
  {
    id: "inhibidor_emp",
    name: "Inhibidor de Frecuencia EMP",
    price: 5000,
    emoji: "📟",
    rarity: "Raro",
    description: "Inutiliza cámaras de seguridad y cortafuegos durante el golpe.",
    effect: "+8% de probabilidad de éxito en el asalto.",
  },
  {
    id: "taladro_termico",
    name: "Taladro Térmico de Titanio",
    price: 6500,
    emoji: "🔥",
    rarity: "Épico",
    description: "Perfora en silencio las cajas de seguridad secretas del banco.",
    effect: "+35% de botín adicional en asaltos exitosos.",
  },
  {
    id: "furgon_blindado",
    name: "Furgón Blindado Modificado",
    price: 7500,
    emoji: "🚗",
    rarity: "Épico",
    description: "Vehículo de huida reforzado con planchas de acero balístico.",
    effect: "60% de probabilidad de rescatar a la banda si el golpe falla (evita calabozo y multas).",
  },
  {
    id: "mascara_balistica",
    name: "Máscara Balística Táctica",
    price: 3500,
    emoji: "🎭",
    rarity: "Poco común",
    description: "Oculta tu identidad y mitiga condenas judiciales.",
    effect: "Reduce tu tiempo de calabozo a solo 3 minutos si eres arrestado.",
  },
  {
    id: "adrenalina",
    name: "Inyección de Adrenalina",
    price: 4000,
    emoji: "💉",
    rarity: "Raro",
    description: "Estupefaciente militar que agudiza los reflejos bajo fuego enemigo.",
    effect: "Si la tirada del asalto falla por poco, concede una segunda oportunidad (+20%).",
  },
];

export function buyBlackMarketItem(
  guildId: string,
  userId: string,
  itemId: string,
  qty = 1,
): { ok: boolean; message: string; cost?: number } {
  const item = BLACK_MARKET_ITEMS.find((it) => it.id === itemId);
  if (!item) return { ok: false, message: "El artículo seleccionado no existe en el mercado negro." };

  const totalCost = item.price * qty;
  const eco = getEco(guildId, userId);

  if (!deductFunds(eco, totalCost)) {
    return {
      ok: false,
      message: `Fondos insuficientes. Necesitas **${n(totalCost)}** y solo tienes **${n(eco.wallet + eco.bank)}**.`,
    };
  }

  giveItem(eco, itemId, qty);
  saveEco(eco);

  return {
    ok: true,
    message: `Has adquirido **${qty}x ${item.emoji} ${item.name}** en el mercado negro por **${n(totalCost)}**.`,
    cost: totalCost,
  };
}
