/**
 * Sistema de 40 Eventos & Mutadores Diarios de Asaltos
 * 15 eventos globales y 25 eventos específicos de objetivo que rotan cada día.
 */

export interface HeistDailyEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  targetId: "global" | string;
  winRateMod: number; // Modificador directo al % de éxito (p.ej. +5, -5)
  lootMod: number; // Modificador multiplicador de botín (p.ej. 0.25 = +25%)
  roleBonusRole?: "hacker" | "demoliciones" | "conductor" | "tirador" | "infiltrador" | "medico" | "negociador";
  roleBonusMod?: number; // Modificador adicional para ese rol específico
  qteTimeMod?: number; // Reducción o aumento de tiempo en segundos para QTEs
}

export const HEIST_DAILY_EVENTS: HeistDailyEvent[] = [
  // ── 15 EVENTOS GLOBALES ──
  {
    id: "alerta_roja_nacional",
    name: "Alerta Roja Nacional",
    emoji: "🚨",
    description: "Cuerpos de policía y agencias federales en máxima alerta. Mayor dificultad general, pero botines de emergencia estatales aumentados.",
    targetId: "global",
    winRateMod: -6,
    lootMod: 0.25,
  },
  {
    id: "huelga_policial",
    name: "Huelga del Cuerpo de Policía",
    emoji: "🪧",
    description: "Patrullas mínimas en las calles de la metrópoli. Los pilotos de fuga encuentran carreteras casi vacías.",
    targetId: "global",
    winRateMod: 6,
    lootMod: 0.05,
    roleBonusRole: "conductor",
    roleBonusMod: 12,
  },
  {
    id: "tormenta_solar_geomagnetica",
    name: "Tormenta Solar Geomagnética",
    emoji: "☀️",
    description: "Perturbaciones en la ionosfera descalibran cámaras y sensores térmicos en toda la ciudad. Éxito base aumentado.",
    targetId: "global",
    winRateMod: 8,
    lootMod: 0.0,
    roleBonusRole: "hacker",
    roleBonusMod: 8,
  },
  {
    id: "niebla_densa_metropoli",
    name: "Niebla Densa en la Metrópoli",
    emoji: "🌫️",
    description: "Visibilidad nula en distritos financieros y portuarios. Ideal para infiltraciones sigilosas y maniobras de escape.",
    targetId: "global",
    winRateMod: 5,
    lootMod: 0.05,
    roleBonusRole: "infiltrador",
    roleBonusMod: 10,
  },
  {
    id: "inflacion_mercado_negro",
    name: "Fiebre del Mercado Negro",
    emoji: "📈",
    description: "Los compradores del inframundo pagan sobreprecios históricos por lingotes, joyas y tecnología saqueada.",
    targetId: "global",
    winRateMod: 0,
    lootMod: 0.35,
  },
  {
    id: "estado_excepcion_tactico",
    name: "Estado de Excepción Táctico",
    emoji: "🛑",
    description: "Controles de seguridad intensivos y patrullas con blindados. El margen de error es mínimo.",
    targetId: "global",
    winRateMod: -7,
    lootMod: 0.20,
    roleBonusRole: "tirador",
    roleBonusMod: 10,
  },
  {
    id: "operacion_interpol",
    name: "Operación Limpieza de Interpol",
    emoji: "🌐",
    description: "Comandos internacionales rastreando movimientos ilícitos. Los negociadores deben hilar muy fino.",
    targetId: "global",
    winRateMod: -4,
    lootMod: 0.15,
    roleBonusRole: "negociador",
    roleBonusMod: 10,
  },
  {
    id: "lluvia_torrencial_asfalto",
    name: "Lluvia Torrencial y Asfalto Mojado",
    emoji: "🌧️",
    description: "Guardias guarecidos en garitas (-4% alerta), pero conducción complicada en curvas cerradas.",
    targetId: "global",
    winRateMod: 4,
    lootMod: 0.0,
    roleBonusRole: "infiltrador",
    roleBonusMod: 7,
  },
  {
    id: "festival_callejero",
    name: "Festival Callejero de Nexo",
    emoji: "🎉",
    description: "Avenidas atestadas de civiles celebrando. Camuflaje perfecto para despistar furgones policiales.",
    targetId: "global",
    winRateMod: 6,
    lootMod: 0.10,
    roleBonusRole: "conductor",
    roleBonusMod: 10,
  },
  {
    id: "crisis_cibernetica_central",
    name: "Crisis Cibernética Central",
    emoji: "💻",
    description: "Un fallo masivo en los servidores de la ciudad deja vulnerables los sistemas de alarma y esclusas.",
    targetId: "global",
    winRateMod: 7,
    lootMod: 0.10,
    roleBonusRole: "hacker",
    roleBonusMod: 14,
  },
  {
    id: "dia_cobro_salarial",
    name: "Día de Cobro Salarial",
    emoji: "💰",
    description: "Las cajas fuertes de bancos, casinos y corporaciones están rebosantes de remesas listas para distribuir.",
    targetId: "global",
    winRateMod: -2,
    lootMod: 0.30,
  },
  {
    id: "auditoria_federal_sorpresa",
    name: "Auditoría Federal por Sorpresa",
    emoji: "📋",
    description: "Inspectores federales interrogando a directores de seguridad. Nerviosismo y descoordinación en el personal.",
    targetId: "global",
    winRateMod: 6,
    lootMod: 0.08,
    roleBonusRole: "negociador",
    roleBonusMod: 12,
  },
  {
    id: "apagon_distrital",
    name: "Apagón Parcial del Distrito",
    emoji: "💡",
    description: "Caída de la red eléctrica general. Generadores secundarios activos pero sistemas de vigilancia lentos.",
    targetId: "global",
    winRateMod: 7,
    lootMod: 0.05,
    roleBonusRole: "infiltrador",
    roleBonusMod: 12,
  },
  {
    id: "cumbre_seguridad_internacional",
    name: "Cumbre de Seguridad Internacional",
    emoji: "🎖️",
    description: "Dignatarios y fuerzas de élite concentrados en la ciudad. Defensas de alto rango pero reservas de botín sin precedentes.",
    targetId: "global",
    winRateMod: -8,
    lootMod: 0.40,
    roleBonusRole: "demoliciones",
    roleBonusMod: 12,
  },
  {
    id: "noche_clara_luna_llena",
    name: "Noche Clara de Luna Llena",
    emoji: "🌕",
    description: "Cielo despejado con iluminación natural perfecta sobre azoteas y pasarelas. Los francotiradores tienen ventaja absoluta.",
    targetId: "global",
    winRateMod: 3,
    lootMod: 0.05,
    roleBonusRole: "tirador",
    roleBonusMod: 14,
  },

  // ── 25 EVENTOS ESPECÍFICOS POR OBJETIVO ──

  // Banco Central (banco)
  {
    id: "banco_lingotes_reserva",
    name: "Llegada de Lingotes Federales",
    emoji: "🥇",
    description: "Un furgón de la Casa de la Moneda acaba de descargar lingotes de oro puro en el Banco Central.",
    targetId: "banco",
    winRateMod: -4,
    lootMod: 0.45,
    roleBonusRole: "demoliciones",
    roleBonusMod: 10,
  },
  {
    id: "banco_huelga_vigilantes",
    name: "Huelga de Vigilantes del Banco",
    emoji: "🪪",
    description: "Solo guardias de reemplazo inexpertos custodian el vestíbulo y las cámaras de seguridad del Banco Central.",
    targetId: "banco",
    winRateMod: 12,
    lootMod: 0.05,
    roleBonusRole: "tirador",
    roleBonusMod: 10,
  },
  {
    id: "banco_fallo_esclusa",
    name: "Fallo en el Software de la Bóveda",
    emoji: "🔓",
    description: "Una actualización defectuosa de firmware dejó un backdoor en el mecanismo de cierre del Banco Central.",
    targetId: "banco",
    winRateMod: 10,
    lootMod: 0.10,
    roleBonusRole: "hacker",
    roleBonusMod: 15,
  },

  // Gran Casino (casino)
  {
    id: "casino_high_rollers",
    name: "Noche de Grandes Apostadores",
    emoji: "🎰",
    description: "Millonarios internacionales jugando en las salas privadas del Gran Casino. El botín de fichas es inmenso.",
    targetId: "casino",
    winRateMod: -3,
    lootMod: 0.50,
    roleBonusRole: "negociador",
    roleBonusMod: 10,
  },
  {
    id: "casino_inspeccion_juego",
    name: "Inspección de la Comisión de Juego",
    emoji: "🎲",
    description: "Los jefes de sala del Casino están concentrados en las mesas de ruleta, descuidando la cámara acorazada.",
    targetId: "casino",
    winRateMod: 10,
    lootMod: 0.15,
    roleBonusRole: "infiltrador",
    roleBonusMod: 12,
  },
  {
    id: "casino_torneo_poker",
    name: "Torneo Internacional de Póker",
    emoji: "🃏",
    description: "El Gran Casino custodia el maletín con el premio mayor de 10 millones en fichas de platino.",
    targetId: "casino",
    winRateMod: 2,
    lootMod: 0.40,
    roleBonusRole: "conductor",
    roleBonusMod: 10,
  },

  // Mansión del Magnate (mansion)
  {
    id: "mansion_gala_alta_sociedad",
    name: "Fiesta de Gala en la Mansión",
    emoji: "🥂",
    description: "Música en directo y cientos de invitados en los salones del Magnate. La confusión facilita la infiltración.",
    targetId: "mansion",
    winRateMod: 10,
    lootMod: 0.20,
    roleBonusRole: "negociador",
    roleBonusMod: 14,
  },
  {
    id: "mansion_dobermans_sueltos",
    name: "Perros Guardianes Sueltos",
    emoji: "🐕",
    description: "Dóbermans adiestrados patrullando los jardines de la Mansión. Solo el sigilo extremo evitará los ladridos.",
    targetId: "mansion",
    winRateMod: -8,
    lootMod: 0.15,
    roleBonusRole: "infiltrador",
    roleBonusMod: 16,
  },
  {
    id: "mansion_subasta_arte",
    name: "Traslado Privado de Joyas y Lienzos",
    emoji: "🖼️",
    description: "Cuadros del siglo XVII y collares de diamantes embalados en cajas listas para la subasta en la Mansión.",
    targetId: "mansion",
    winRateMod: 3,
    lootMod: 0.45,
    roleBonusRole: "demoliciones",
    roleBonusMod: 10,
  },

  // Museo Imperial (museo)
  {
    id: "museo_exposicion_dinastica",
    name: "Exposición Temporal de Joyas Imperiales",
    emoji: "👑",
    description: "El Museo Imperial expone coronas de oro y gemas milenarias bajo vitrinas de alta tecnología.",
    targetId: "museo",
    winRateMod: -4,
    lootMod: 0.50,
  },
  {
    id: "museo_andamios_fachada",
    name: "Obras de Restauración y Andamios",
    emoji: "🏗️",
    description: "Andamios exteriores colocados junto a las cúpulas del Museo Imperial. Acceso cenital directo para los sigilosos.",
    targetId: "museo",
    winRateMod: 11,
    lootMod: 0.05,
    roleBonusRole: "infiltrador",
    roleBonusMod: 15,
  },
  {
    id: "museo_alarmas_sismicas",
    name: "Vitrinas con Alarma Sísmica",
    emoji: "⚠️",
    description: "Cualquier detonación ruidosa en el Museo activará el cierre instantáneo. Se requiere precisión quirúrgica.",
    targetId: "museo",
    winRateMod: -6,
    lootMod: 0.20,
    roleBonusRole: "hacker",
    roleBonusMod: 12,
  },

  // Tren Blindado (tren_blindado)
  {
    id: "tren_ventisca_cordillera",
    name: "Ventisca en el Paso de Montaña",
    emoji: "❄️",
    description: "El convoy ferroviario reduce su velocidad a 60 km/h debido a la nieve. Abordaje exterior facilitado.",
    targetId: "tren_blindado",
    winRateMod: 9,
    lootMod: 0.10,
    roleBonusRole: "conductor",
    roleBonusMod: 14,
  },
  {
    id: "tren_oro_presidencial",
    name: "Transporte de Oro Presidencial",
    emoji: "🚂",
    description: "El vagón blindado central transporta reservas auríferas de emergencia del gobierno.",
    targetId: "tren_blindado",
    winRateMod: -6,
    lootMod: 0.55,
    roleBonusRole: "demoliciones",
    roleBonusMod: 15,
  },
  {
    id: "tren_obras_vias",
    name: "Desvío por Vía Secundaria",
    emoji: "🛤️",
    description: "El Tren Blindado se desvía por un tramo abandonado sin cobertura policial en 30 kilómetros.",
    targetId: "tren_blindado",
    winRateMod: 8,
    lootMod: 0.15,
    roleBonusRole: "tirador",
    roleBonusMod: 10,
  },

  // Sede Nexo Corp (empresa)
  {
    id: "empresa_servidores_cuanticos",
    name: "Sobrecarga de Servidores Cuánticos",
    emoji: "⚡",
    description: "Un pico térmico en el centro de datos de Nexo Corp anula temporalmente los cortafuegos principales.",
    targetId: "empresa",
    winRateMod: 11,
    lootMod: 0.10,
    roleBonusRole: "hacker",
    roleBonusMod: 16,
  },
  {
    id: "empresa_claves_filtradas",
    name: "Filtración de Códigos Corporativos",
    emoji: "🔏",
    description: "Un empleado descontento vendió los tokens de acceso del ascensor blindado de Nexo Corp.",
    targetId: "empresa",
    winRateMod: 8,
    lootMod: 0.15,
    roleBonusRole: "negociador",
    roleBonusMod: 12,
  },
  {
    id: "empresa_protocolo_confinamiento",
    name: "Simulacro de Confinamiento Militar",
    emoji: "☣️",
    description: "Sistemas de gas no letal y torretas láser activadas en los laboratorios secretos de Nexo Corp.",
    targetId: "empresa",
    winRateMod: -9,
    lootMod: 0.35,
    roleBonusRole: "medico",
    roleBonusMod: 15,
  },

  // Submarino Nuclear Leviathan (submarino)
  {
    id: "submarino_fosa_abisal",
    name: "Inmersión en Fosa Abisal",
    emoji: "🌊",
    description: "El submarino Leviathan navega a 2.500 metros. La presión en mamparos exige reflejos veloces.",
    targetId: "submarino",
    winRateMod: -8,
    lootMod: 0.30,
    qteTimeMod: -2,
  },
  {
    id: "submarino_fuga_radiacion",
    name: "Fuga Menor en Reactor Nuclear",
    emoji: "☢️",
    description: "Contención radioactiva en la popa del Leviathan. El médico de combate es vital para el equipo.",
    targetId: "submarino",
    winRateMod: -3,
    lootMod: 0.25,
    roleBonusRole: "medico",
    roleBonusMod: 18,
  },
  {
    id: "submarino_torpedos_secretos",
    name: "Carga de Prototipos de Fusión Naval",
    emoji: "⚓",
    description: "El silo de armamento custodia códigos y tecnología nuclear valorada en sumas astronómicas.",
    targetId: "submarino",
    winRateMod: 0,
    lootMod: 0.60,
    roleBonusRole: "demoliciones",
    roleBonusMod: 12,
  },

  // Estación Orbital Quantum (estacion_espacial)
  {
    id: "estacion_micrometeoritos",
    name: "Lluvia de Micrometeoritos",
    emoji: "☄️",
    description: "Escudos deflectores sobrecargados en la Estación Orbital. Varias esclusas secundarias permanecen abiertas.",
    targetId: "estacion_espacial",
    winRateMod: 10,
    lootMod: 0.15,
    roleBonusRole: "tirador",
    roleBonusMod: 12,
  },
  {
    id: "estacion_despresurizacion",
    name: "Despresurización en Módulo de Control",
    emoji: "🌌",
    description: "Gravedad cero y atmósfera enrarecida en los pasillos de atraque espacial. Tiempo de reacción límite.",
    targetId: "estacion_espacial",
    winRateMod: -8,
    lootMod: 0.25,
    roleBonusRole: "medico",
    roleBonusMod: 14,
  },
  {
    id: "estacion_baterias_antimateria",
    name: "Recarga de Núcleos de Antimateria",
    emoji: "🔮",
    description: "Cilindros de plasma y antimateria estabilizada cargados en las cámaras criogénicas de la estación.",
    targetId: "estacion_espacial",
    winRateMod: -3,
    lootMod: 0.70,
    roleBonusRole: "hacker",
    roleBonusMod: 14,
  },

  // Fortaleza de Davito (davito)
  {
    id: "davito_paranoia_absoluta",
    name: "Paranoia Máxima de la Mente Maestra Davito",
    emoji: "👁️",
    description: "Davito ha activado sus protocolos de cifrado cósmico y defensas impenetrables. La victoria exige un milagro absoluto.",
    targetId: "davito",
    winRateMod: -15, // Asegura que nunca supere 0.77%
    lootMod: 0.50,
  },
];

/**
 * Función determinista de hash LCG para obtener una secuencia pseudo-aleatoria estable durante el día.
 */
function getDailySeed(dateStr: string, salt: string): number {
  let hash = 0;
  const combined = `${dateStr}:${salt}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Obtiene los eventos activos hoy para el servidor.
 * Retorna exactamente 1 evento global y 2 eventos de objetivo específico.
 */
export function getDailyHeistEvents(guildId = "default"): {
  dateKey: string;
  globalEvent: HeistDailyEvent;
  targetEvents: HeistDailyEvent[];
  allActive: HeistDailyEvent[];
} {
  const now = new Date();
  const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate(),
  ).padStart(2, "0")}`;

  const globalPool = HEIST_DAILY_EVENTS.filter((e) => e.targetId === "global");
  const targetPool = HEIST_DAILY_EVENTS.filter((e) => e.targetId !== "global");

  const globalIndex = getDailySeed(dateKey, `global:${guildId}`) % globalPool.length;
  const globalEvent = globalPool[globalIndex];

  // Seleccionar 2 eventos de objetivo distintos
  const targetSeed1 = getDailySeed(dateKey, `target1:${guildId}`) % targetPool.length;
  const targetEvent1 = targetPool[targetSeed1];

  let targetSeed2 = getDailySeed(dateKey, `target2:${guildId}`) % targetPool.length;
  if (targetPool[targetSeed2].targetId === targetEvent1.targetId && targetPool.length > 1) {
    targetSeed2 = (targetSeed2 + 1) % targetPool.length;
  }
  const targetEvent2 = targetPool[targetSeed2];

  const targetEvents = [targetEvent1, targetEvent2];
  const allActive = [globalEvent, targetEvent1, targetEvent2];

  return {
    dateKey,
    globalEvent,
    targetEvents,
    allActive,
  };
}

/**
 * Retorna los modificadores acumulados de eventos para un objetivo concreto hoy.
 */
export function getActiveEventsForTarget(targetId: string, guildId = "default"): {
  globalEvent: HeistDailyEvent;
  targetEvent?: HeistDailyEvent;
  winRateMod: number;
  lootMod: number;
  roleBonuses: Record<string, number>;
  qteTimeMod: number;
} {
  const { globalEvent, targetEvents } = getDailyHeistEvents(guildId);
  const targetEvent = targetEvents.find((e) => e.targetId === targetId);

  let winRateMod = globalEvent.winRateMod;
  let lootMod = globalEvent.lootMod;
  let qteTimeMod = globalEvent.qteTimeMod || 0;
  const roleBonuses: Record<string, number> = {};

  if (globalEvent.roleBonusRole && globalEvent.roleBonusMod) {
    roleBonuses[globalEvent.roleBonusRole] = (roleBonuses[globalEvent.roleBonusRole] || 0) + globalEvent.roleBonusMod;
  }

  if (targetEvent) {
    winRateMod += targetEvent.winRateMod;
    lootMod += targetEvent.lootMod;
    if (targetEvent.qteTimeMod) qteTimeMod += targetEvent.qteTimeMod;
    if (targetEvent.roleBonusRole && targetEvent.roleBonusMod) {
      roleBonuses[targetEvent.roleBonusRole] =
        (roleBonuses[targetEvent.roleBonusRole] || 0) + targetEvent.roleBonusMod;
    }
  }

  return {
    globalEvent,
    targetEvent,
    winRateMod,
    lootMod,
    roleBonuses,
    qteTimeMod,
  };
}
