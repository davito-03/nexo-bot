import type { SKRSContext2D } from "@napi-rs/canvas";
import { createCanvas, registerFonts, roundRect, hexRgba } from "../../utils/canvas.js";

registerFonts();

export interface MinigameOption {
  id: string;
  label: string;
  emoji: string;
  isCorrect: boolean;
  explanation: string;
}

export interface HeistMinigameDef {
  id: string;
  roleId: "hacker" | "tirador" | "infiltrador" | "demoliciones" | "conductor" | "medico" | "negociador";
  roleName: string;
  roleEmoji: string;
  title: string;
  subtitle: string;
  prompt: string;
  visualType: "hex" | "cctv" | "binary" | "scope" | "drone" | "lockpick" | "lasers" | "wires" | "c4_point" | "traffic" | "drift" | "ekg" | "gas_mask" | "radio_freq" | "bribe";
  options: MinigameOption[];
  successNarrative: string;
  failNarrative: string;
  winRateBonus: number;
  lootBonusPct: number;
  winRatePenalty: number;
}

export const HEIST_MINIGAMES: HeistMinigameDef[] = [
  // ── HACKER (3 minijuegos) ──
  {
    id: "hacker_hex_decrypt",
    roleId: "hacker",
    roleName: "Hacker Cibernético",
    roleEmoji: "🧠",
    title: "Desencriptación de Nodos Cuánticos",
    subtitle: "Bypass de Cortafuegos en Tiempo Real",
    prompt: "El cortafuegos corporativo rota su clave cada 10 segundos. Identifica el hash hexadecimal coincidente con la memoria volátil:",
    visualType: "hex",
    options: [
      { id: "opt_a", label: "[0x7F:B4]", emoji: "💻", isCorrect: true, explanation: "Hash cuántico validado, cortafuegos neutralizado." },
      { id: "opt_b", label: "[0x2E:A1]", emoji: "💻", isCorrect: false, explanation: "Hash desfasado, saltó una alarma silenciosa." },
      { id: "opt_c", label: "[0x9C:F8]", emoji: "💻", isCorrect: false, explanation: "Hash corrupto, se activó el honeypot del sistema." },
    ],
    successNarrative: "¡Bypass cuántico completado! El cortafuegos se abrió sin dejar trazas de IP.",
    failNarrative: "Error de desencriptación. Los servidores de defensa cerraron las compuertas perimétricas.",
    winRateBonus: 7,
    lootBonusPct: 15,
    winRatePenalty: 6,
  },
  {
    id: "hacker_cctv_bypass",
    roleId: "hacker",
    roleName: "Hacker Cibernético",
    roleEmoji: "🧠",
    title: "Bypass de Puertos CCTV",
    subtitle: "Inyección de Bucle en Cámaras de Seguridad",
    prompt: "Las cámaras de circuito cerrado monitorean la esclusa. Encuentra el puerto TCP con la vulnerabilidad Zero-Day:",
    visualType: "cctv",
    options: [
      { id: "opt_p21", label: "Puerto 21 (FTP Inseguro)", emoji: "🔌", isCorrect: false, explanation: "Puerto señuelo monitorizado por el administrador." },
      { id: "opt_p8080", label: "Puerto 8080 (Proxy Desprotegido)", emoji: "🔌", isCorrect: true, explanation: "Brecha abierta: bucle de vídeo congelado inyectado." },
      { id: "opt_p443", label: "Puerto 443 (SSL Encriptado)", emoji: "🔌", isCorrect: false, explanation: "Conexión cifrada impenetrable, la señal fue rastreada." },
    ],
    successNarrative: "¡Cámaras congeladas con éxito! Los guardias ven una grabación estática vacía.",
    failNarrative: "El puerto señuelo disparó la alerta perimetral en la sala de monitores.",
    winRateBonus: 6,
    lootBonusPct: 10,
    winRatePenalty: 5,
  },
  {
    id: "hacker_binary_inversion",
    roleId: "hacker",
    roleName: "Hacker Cibernético",
    roleEmoji: "🧠",
    title: "Inversión de Polaridad de Alarma",
    subtitle: "Cancelación de Bucle Lógico",
    prompt: "El relé de la alarma requiere alternar el bit de control para evitar la señal al 911:",
    visualType: "binary",
    options: [
      { id: "bit_0", label: "Bit [0] Lógica Inversa", emoji: "⚡", isCorrect: true, explanation: "Polaridad invertida, circuito neutralizado en silencio." },
      { id: "bit_1", label: "Bit [1] Pulso Directo", emoji: "⚡", isCorrect: false, explanation: "Sobrecarga de circuito, la campana externa comenzó a sonar." },
    ],
    successNarrative: "¡Polaridad invertida! La central no recibió ningún reporte de alerta.",
    failNarrative: "El pulso directo provocó un cortocircuito audible en toda la manzana.",
    winRateBonus: 6,
    lootBonusPct: 10,
    winRatePenalty: 5,
  },

  // ── TIRADOR / ENFORCER (3 minijuegos) ──
  {
    id: "tirador_sniper_scope",
    roleId: "tirador",
    roleName: "Tirador / Enforcer",
    roleEmoji: "🔫",
    title: "Mira Telescópica de Francotirador",
    subtitle: "Abatimiento Silencioso del Vigía con Radio",
    prompt: "Tres centinelas vigilan la azotea. Solo uno tiene el comunicador táctico para llamar a los blindados. Localízalo:",
    visualType: "scope",
    options: [
      { id: "guard_torre", label: "Torre Norte (Vigía con Radio)", emoji: "🎯", isCorrect: true, explanation: "Tiro certero al vigía antes de que pudiera oprimir el botón de socorro." },
      { id: "guard_pasarela", label: "Pasarela Este (Custodio con Porra)", emoji: "🎯", isCorrect: false, explanation: "El disparo abatió al custodio equivocado y el de la torre dio la alarma." },
      { id: "guard_esclusa", label: "Esclusa Sur (Patrulla de Pasillo)", emoji: "🎯", isCorrect: false, explanation: "Guardia secundario; el radio-operador solicitó refuerzos." },
    ],
    successNarrative: "¡Disparo de precisión quirúrgico! El vigía cayó sin emitir sonido por el canal de radio.",
    failNarrative: "El vigía superviviente pulsó la alarma general antes de caer.",
    winRateBonus: 8,
    lootBonusPct: 10,
    winRatePenalty: 7,
  },
  {
    id: "tirador_suppression_fire",
    roleId: "tirador",
    roleName: "Tirador / Enforcer",
    roleEmoji: "🔫",
    title: "Fuego de Supresión Perimetral",
    subtitle: "Contención de Escuadra SWAT en el Vestíbulo",
    prompt: "La primera oleada policial avanza por las columnas del vestíbulo. Elige la zona de cobertura pesada:",
    visualType: "scope",
    options: [
      { id: "columna_central", label: "Ráfaga al Pasillo Central", emoji: "💥", isCorrect: true, explanation: "Fuego continuo que obliga al pelotón policial a retroceder y buscar refugio." },
      { id: "escalera_lateral", label: "Tiroteador en Escalera Lateral", emoji: "💥", isCorrect: false, explanation: "Ángulo ciego; los agentes flanquearon a la banda por la derecha." },
    ],
    successNarrative: "¡Pelotón enemigo contenido! La banda ganó valiosos minutos para saquear las cajas.",
    failNarrative: "El flanco quedó desprotegido y un escudo antidisturbios ganó terreno.",
    winRateBonus: 7,
    lootBonusPct: 12,
    winRatePenalty: 6,
  },
  {
    id: "tirador_drone_takedown",
    roleId: "tirador",
    roleName: "Tirador / Enforcer",
    roleEmoji: "🔫",
    title: "Derribo de Dron Centinela",
    subtitle: "Impacto en los Rotores del Dron Autónomo",
    prompt: "Un dron militar escanea las siluetas de la banda desde el aire. Apunta a la zona vulnerable:",
    visualType: "drone",
    options: [
      { id: "rotor_trasero", label: "Rotor Trasero de Estabilización", emoji: "🚁", isCorrect: true, explanation: "Impacto crítico: el dron entró en barrena y se estrelló fuera del perímetro." },
      { id: "blindaje_chasis", label: "Plancha Frontal de Titanio", emoji: "🚁", isCorrect: false, explanation: "El proyectil rebotó en el blindaje balístico sin dañar sus cámaras." },
    ],
    successNarrative: "¡Dron pulverizado! Ninguna imagen facial llegó a los servidores policiales.",
    failNarrative: "El dron transmitió las coordenadas GPS de la banda a la centralita.",
    winRateBonus: 6,
    lootBonusPct: 8,
    winRatePenalty: 5,
  },

  // ── INFILTRADOR SILENCIOSO (3 minijuegos) ──
  {
    id: "infiltrador_lockpick",
    roleId: "infiltrador",
    roleName: "Infiltrador Silencioso",
    roleEmoji: "🕵️",
    title: "Cilindro de Cerradura Acorazada",
    subtitle: "Ganzuado Térmico de Pernos",
    prompt: "La compuerta secundaria de la bóveda usa tres pernos de compresión. Alinea el perno que bloquea el cilindro:",
    visualType: "lockpick",
    options: [
      { id: "perno_1", label: "Perno 1 (Resorte Superior)", emoji: "🗝️", isCorrect: false, explanation: "La ganzúa resbaló sin fijar el muelle." },
      { id: "perno_2", label: "Perno 2 (Perno Central de Retención)", emoji: "🗝️", isCorrect: true, explanation: "¡Click! El perno encajó en la línea de cizallamiento y el cerrojo cedió." },
      { id: "perno_3", label: "Perno 3 (Pasador Inferior)", emoji: "🗝️", isCorrect: false, explanation: "Se ejerció demasiada presión y la ganzúa casi se parte." },
    ],
    successNarrative: "¡Cerradura forzada con precisión milimétrica! La compuerta se abrió en completo silencio.",
    failNarrative: "El cilindro se atascó, obligando a emplear palancas ruidosas.",
    winRateBonus: 7,
    lootBonusPct: 14,
    winRatePenalty: 5,
  },
  {
    id: "infiltrador_laser_grid",
    roleId: "infiltrador",
    roleName: "Infiltrador Silencioso",
    roleEmoji: "🕵️",
    title: "Rejilla de Láseres Infrarrojos",
    subtitle: "Cruce de Galería sin Interrupción Térmica",
    prompt: "Haces invisibles de luz infrarroja cruzan el pasillo de la cámara acorazada. Elige el conducto seguro:",
    visualType: "lasers",
    options: [
      { id: "conducto_a", label: "Conducto de Ventilación Superior", emoji: "🕳️", isCorrect: true, explanation: "El conducto no tiene sensores ópticos activos; paso limpio hacia la bóveda." },
      { id: "pasillo_suelo", label: "Reptar por el Suelo de Mármol", emoji: "🕳️", isCorrect: false, explanation: "Un haz rasante rozó la suela del calzado y activó el zumbador." },
    ],
    successNarrative: "¡Travesía perfecta! La banda sorteó la malla de detección sin un solo roce.",
    failNarrative: "El haz térmico detectó calor corporal y disparó el cierre de seguridad.",
    winRateBonus: 7,
    lootBonusPct: 12,
    winRatePenalty: 6,
  },
  {
    id: "infiltrador_acoustic_tiles",
    roleId: "infiltrador",
    roleName: "Infiltrador Silencioso",
    roleEmoji: "🕵️",
    title: "Bypass Acústico de Baldosas",
    subtitle: "Paso por Zona con Sensores de Presión",
    prompt: "El suelo de la sala de exposiciones tiene baldosas sensibles al peso. Selecciona la línea de pisadas seguras:",
    visualType: "lockpick",
    options: [
      { id: "borde_pared", label: "Juntas de Muro Reforzadas", emoji: "👣", isCorrect: true, explanation: "Pisadas ligeras sobre vigas maestras que no transmiten vibración." },
      { id: "centro_galeria", label: "Baldosas Centrales Pulidas", emoji: "👣", isCorrect: false, explanation: "La baldosa cedió 2 milímetros y emitió un pitido en la cabina de control." },
    ],
    successNarrative: "¡Paso fantasmal! Ni una sola baldosa registró oscilaciones.",
    failNarrative: "El sensor de vibración registró pisadas apresuradas.",
    winRateBonus: 6,
    lootBonusPct: 10,
    winRatePenalty: 5,
  },

  // ── EXPERTO EN DEMOLICIONES (3 minijuegos) ──
  {
    id: "demo_c4_wires",
    roleId: "demoliciones",
    roleName: "Experto en Demoliciones",
    roleEmoji: "💣",
    title: "Corte de Cables en Carga Militar",
    subtitle: "Desactivación del Mecanismo Anti-Manipulación",
    prompt: "Para detonar la cámara acorazada sin volar las cajas de botín, corta el cable neutro de derivación:",
    visualType: "wires",
    options: [
      { id: "cable_rojo", label: "Cable Rojo (Línea de Ignición Principal)", emoji: "🔴", isCorrect: false, explanation: "Cortar la línea principal causó una micro-detonación fuera de tiempo." },
      { id: "cable_azul", label: "Cable Azul (Neutro de Derivación)", emoji: "🔵", isCorrect: true, explanation: "¡Cable correcto! El temporizador de la mecha quedó perfectamente sincronizado." },
      { id: "cable_verde", label: "Cable Verde (Toma de Tierra Blindada)", emoji: "🟢", isCorrect: false, explanation: "Desactivó la mecha y hubo que rearmar la carga manualmente perdiendo tiempo." },
      { id: "cable_amarillo", label: "Cable Amarillo (Sensor de Voltaje)", emoji: "🟡", isCorrect: false, explanation: "Un chispazo alertó a los guardias de la planta superior." },
    ],
    successNarrative: "¡Corte limpio! La carga quedó calibrada para una implosión perfecta sin dañar el botín.",
    failNarrative: "Fallo en la sincronización. La detonación destruyó parte de las remesas y alertó a toda la zona.",
    winRateBonus: 8,
    lootBonusPct: 22,
    winRatePenalty: 7,
  },
  {
    id: "demo_hollow_charge",
    roleId: "demoliciones",
    roleName: "Experto en Demoliciones",
    roleEmoji: "💣",
    title: "Colocación de Carga Hueca",
    subtitle: "Punto de Tensión Estructural Óptimo",
    prompt: "La puerta acorazada de 20 toneladas tiene tres goznes de aleación. Elige el punto de fractura crítica:",
    visualType: "c4_point",
    options: [
      { id: "gozne_superior", label: "Gozne Superior de Titanio", emoji: "💥", isCorrect: true, explanation: "La presión venció el eje y la compuerta cayó hacia el frente como mantequilla." },
      { id: "centro_puerta", label: "Placa Central del Escudo", emoji: "💥", isCorrect: false, explanation: "El blindaje absorbió la explosión sin doblar los cerrojos laterales." },
    ],
    successNarrative: "¡Apertura perfecta! La compuerta colapsó limpiamente dando paso directo a las cajas.",
    failNarrative: "La puerta resistió la detonación y requirió corte térmico adicional.",
    winRateBonus: 7,
    lootBonusPct: 18,
    winRatePenalty: 6,
  },
  {
    id: "demo_timer_calibration",
    roleId: "demoliciones",
    roleName: "Experto en Demoliciones",
    roleEmoji: "💣",
    title: "Calibración del Retardo de Mecha",
    subtitle: "Sincronización Acústica con el Entorno",
    prompt: "Ajusta el retardo para hacer coincidir el trueno del explosivo con la sirena ambiental:",
    visualType: "c4_point",
    options: [
      { id: "retardo_3s", label: "Retardo de 3.2 Segundos", emoji: "⏱️", isCorrect: true, explanation: "Detonación camuflada perfectamente por el ruido de la maquinaria." },
      { id: "retardo_inmediato", label: "Detonación Instantánea", emoji: "⏱️", isCorrect: false, explanation: "El estruendo fue ensordecedor y alertó a todas las unidades circundantes." },
    ],
    successNarrative: "¡Ruido enmascarado! Nadie en el exterior sospechó de la detonación.",
    failNarrative: "La onda expansiva rompió cristales de la calle alertando a los vecinos.",
    winRateBonus: 6,
    lootBonusPct: 15,
    winRatePenalty: 5,
  },

  // ── PILOTO DE FUGA (3 minijuegos) ──
  {
    id: "conductor_traffic_evasion",
    roleId: "conductor",
    roleName: "Piloto de Fuga",
    roleEmoji: "🚗",
    title: "Evasión de Tráfico en Autopista",
    subtitle: "Ruta de Huida con Bloqueo de Patrullas",
    prompt: "Furgones policiales montaron una barricada bloqueando dos de los tres carriles. Elige el carril despejado:",
    visualType: "traffic",
    options: [
      { id: "carril_izq", label: "Carril Izquierdo (Furgón SWAT Cruzado)", emoji: "🚧", isCorrect: false, explanation: "Impacto frontal contra el morro del furgón blindado de la policía." },
      { id: "carril_centro", label: "Carril Central (Banda de Pinchos Extendida)", emoji: "🚧", isCorrect: false, explanation: "Las ruedas delanteras quedaron destrozadas por la cadena de clavos." },
      { id: "carril_der", label: "Arcén Derecho (Despejado por Obra)", emoji: "🏎️", isCorrect: true, explanation: "¡Maniobra magistral por el arcén a 160 km/h esquivando el retén por completo!" },
    ],
    successNarrative: "¡Huida espectacular! El furgón de escape dejó atrás las sirenas policiales.",
    failNarrative: "El vehículo chocó contra una barrera reduciendo la velocidad de escape.",
    winRateBonus: 8,
    lootBonusPct: 10,
    winRatePenalty: 8,
  },
  {
    id: "conductor_alley_drift",
    roleId: "conductor",
    roleName: "Piloto de Fuga",
    roleEmoji: "🚗",
    title: "Derrape en Callejón Estrecho",
    subtitle: "Giro de 90 Grados para Despistar al Helicóptero",
    prompt: "El foco del helicóptero policial ilumina el asfalto. Ejecuta el viraje hacia el paso subterráneo:",
    visualType: "drift",
    options: [
      { id: "freno_mano", label: "Freno de Mano y Golpe de Gas", emoji: "💨", isCorrect: true, explanation: "Derrape impecable entrando al túnel subterráneo perdiendo la señal del foco aéreo." },
      { id: "frenada_recta", label: "Frenar en Seco y Maniobrar", emoji: "🛑", isCorrect: false, explanation: "El coche perdió inercia y los patrullas bloquearon la salida trasera." },
    ],
    successNarrative: "¡Perdidos de vista en el túnel! El helicóptero sobrevoló la zona sin éxito.",
    failNarrative: "La maniobra fue lenta y los todoterrenos policiales cerraron el callejón.",
    winRateBonus: 7,
    lootBonusPct: 10,
    winRatePenalty: 7,
  },
  {
    id: "conductor_ramp_jump",
    roleId: "conductor",
    roleName: "Piloto de Fuga",
    roleEmoji: "🚗",
    title: "Salto de Rampa en Canal de Drenaje",
    subtitle: "Aceleración con Óxido Nitroso",
    prompt: "El puente está levantado. Una rampa de mantenimiento permite saltar al otro lado del canal:",
    visualType: "drift",
    options: [
      { id: "nitro_a_fondo", label: "Inyectar Nitro y Acelerador a Fondo", emoji: "🔥", isCorrect: true, explanation: "¡Vuelo rasante de 25 metros aterrizando con suavidad en el muelle opuesto!" },
      { id: "freno_precaucion", label: "Reducir Marcha por Seguridad", emoji: "⚠️", isCorrect: false, explanation: "El coche cayó al foso de agua y el equipo tuvo que salir a nado." },
    ],
    successNarrative: "¡Salto legendario! La policía frenó en seco al otro lado del canal.",
    failNarrative: "Falta de velocidad; el furgón rozó el borde del canal averiando la suspensión.",
    winRateBonus: 7,
    lootBonusPct: 12,
    winRatePenalty: 6,
  },

  // ── MÉDICO DE COMBATE (3 minijuegos) ──
  {
    id: "medico_cardiac_stabilization",
    roleId: "medico",
    roleName: "Médico de Combate",
    roleEmoji: "🩺",
    title: "Estabilización de Emergencia",
    subtitle: "Soporte Vital Bajo Fuego Cruzado",
    prompt: "Un asaltante fue alcanzado por metralla y su ritmo cardíaco cae a 45 lpm. Aplica el tratamiento inmediato:",
    visualType: "ekg",
    options: [
      { id: "torniquete", label: "Torniquete Rápido y Coagulante", emoji: "💉", isCorrect: true, explanation: "Hemorragia sellada al instante y pulso estabilizado en 80 lpm." },
      { id: "morfina_exceso", label: "Doble Dosis de Morfina", emoji: "💊", isCorrect: false, explanation: "Provocó depresión respiratoria agravando el estado del cómplice." },
    ],
    successNarrative: "¡Cómplice reanimado! El asaltante vuelve a empuñar su arma y continuar.",
    failNarrative: "El asaltante quedó incapacitado y la banda tuvo que cargar con él.",
    winRateBonus: 7,
    lootBonusPct: 8,
    winRatePenalty: 6,
  },
  {
    id: "medico_gas_filter",
    roleId: "medico",
    roleName: "Médico de Combate",
    roleEmoji: "🩺",
    title: "Filtro de Gas Neurotóxico",
    subtitle: "Ajuste de Válvulas en Máscaras Antigás",
    prompt: "Los rociadores liberaron gas lacrimógeno de uso militar. Calibra la válvula de carbón activo:",
    visualType: "gas_mask",
    options: [
      { id: "valvula_alta", label: "Válvula 3 (Flujo Forzado)", emoji: "🤿", isCorrect: true, explanation: "Presión positiva en máscaras; aire completamente puro para toda la banda." },
      { id: "valvula_baja", label: "Válvula 1 (Flujo Mínimo)", emoji: "🤿", isCorrect: false, explanation: "El filtro se saturó y los asaltantes comenzaron a toser perdiendo visibilidad." },
    ],
    successNarrative: "¡Respiración libre! La banda avanzó inmune a través de la densa nube de gas.",
    failNarrative: "El gas afectó la respiración de la banda ralentizando la extracción.",
    winRateBonus: 6,
    lootBonusPct: 8,
    winRatePenalty: 5,
  },
  {
    id: "medico_adrenaline_shot",
    roleId: "medico",
    roleName: "Médico de Combate",
    roleEmoji: "🩺",
    title: "Inyección de Adrenalina Táctica",
    subtitle: "Impulso Neuroestimulante para la Huida",
    prompt: "El cansancio hace mella mientras cargan los sacos de lingotes. Administra el estimulante:",
    visualType: "ekg",
    options: [
      { id: "adrenalina_muscular", label: "Inyección Intramuscular Directa", emoji: "⚡", isCorrect: true, explanation: "Reflejos al 200% y fuerza multiplicada para cargar todo el botín." },
      { id: "suero_lento", label: "Suero de Hidratación Lenta", emoji: "💧", isCorrect: false, explanation: "Efecto nulo en medio del tiroteo." },
    ],
    successNarrative: "¡Chute de adrenalina efectivo! La banda cargó todos los sacos en tiempo récord.",
    failNarrative: "La fatiga retrasó la carga de las bolsas de dinero.",
    winRateBonus: 6,
    lootBonusPct: 14,
    winRatePenalty: 5,
  },

  // ── NEGOCIADOR / MENTE MAESTRA (3 minijuegos) ──
  {
    id: "negociador_radio_frequency",
    roleId: "negociador",
    roleName: "Negociador / Mente Maestra",
    roleEmoji: "🎙️",
    title: "Sintonización de Frecuencia de la Policía",
    subtitle: "Desvío Falso de Despacho de Patrullas",
    prompt: "Sintoniza la frecuencia táctica del mando policial para emitir un aviso falso de tiroteo en el otro extremo:",
    visualType: "radio_freq",
    options: [
      { id: "freq_104", label: "Frecuencia 104.2 MHz (Canal Táctico SWAT)", emoji: "📻", isCorrect: true, explanation: "Voz sintetizada emitida: 6 patrullas se desviaron al barrio industrial." },
      { id: "freq_88", label: "Frecuencia 88.5 MHz (Canal de Tráfico Civil)", emoji: "📻", isCorrect: false, explanation: "La señal fue emitida en una emisora comercial sin engañar a la policía." },
      { id: "freq_115", label: "Frecuencia 115.0 MHz (Banda Aérea Militar)", emoji: "📻", isCorrect: false, explanation: "Alerta de interferencia emitida por los radares de la base." },
    ],
    successNarrative: "¡Despacho policial manipulado! La mitad de los furgones acudieron a una llamada fantasma.",
    failNarrative: "La central detectó la usurpación de frecuencia y confirmó el asalto.",
    winRateBonus: 8,
    lootBonusPct: 12,
    winRatePenalty: 6,
  },
  {
    id: "negociador_hostage_bluff",
    roleId: "negociador",
    roleName: "Negociador / Mente Maestra",
    roleEmoji: "🎙️",
    title: "Farol Psicológico con el Negociador SWAT",
    subtitle: "Negociación Telefónica de Alta Tensión",
    prompt: "El comandante del SWAT amenaza con entrar si no se rinden en 2 minutos. ¿Cómo respondes?",
    visualType: "bribe",
    options: [
      { id: "farol_rehenes", label: "Farol: 'Tenemos cables C4 conectados al conmutador central'", emoji: "📞", isCorrect: true, explanation: "El comandante ordenó detener el asalto para reevaluar riesgos." },
      { id: "insulto_directo", label: "Provocar e insultar al comandante", emoji: "📞", isCorrect: false, explanation: "Enfureció al mando policial, que ordenó asalto con gas inmediato." },
    ],
    successNarrative: "¡El farol funcionó! La policía congeló el asalto y la banda terminó de vaciar las cajas.",
    failNarrative: "La policía detectó la debilidad y adelantó la entrada de choque.",
    winRateBonus: 7,
    lootBonusPct: 14,
    winRatePenalty: 7,
  },
  {
    id: "negociador_guard_bribe",
    roleId: "negociador",
    roleName: "Negociador / Mente Maestra",
    roleEmoji: "🎙️",
    title: "Soborno Discreto de Guardias",
    subtitle: "Activación del Cómplice Infiltrado",
    prompt: "Transmite la clave pactada al guardia del ascensor de servicio para que desbloquee la bajada:",
    visualType: "bribe",
    options: [
      { id: "clave_pacto", label: "'El cisne negro bebe en el lago'", emoji: "💼", isCorrect: true, explanation: "El guardia abrió la compuerta trasera y desactivó los tornos mecánicos." },
      { id: "clave_erronea", label: "'El águila vuela alto'", emoji: "💼", isCorrect: false, explanation: "El guardia no reconoció el código y pulsó el botón antipánico." },
    ],
    successNarrative: "¡Guardia comprado! Ruta de escape despejada y acceso libre a las furgonetas.",
    failNarrative: "El contacto no respondió y la ruta trasera quedó bloqueada.",
    winRateBonus: 7,
    lootBonusPct: 10,
    winRatePenalty: 6,
  },
];

export interface MinigameCanvasState {
  operatorName?: string;
  isSpecialist?: boolean;
  roleTitle?: string;
  secondsLeft: number;
}

/**
 * Renderiza el terminal del minijuego táctico en Canvas.
 */
export async function renderMinigameCanvas(
  minigame: HeistMinigameDef,
  state: MinigameCanvasState,
): Promise<Buffer> {
  const width = 850;
  const height = 360;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d") as SKRSContext2D;

  // Fondo oscuro táctico con degradado
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#080c14");
  bgGrad.addColorStop(0.5, "#0d131f");
  bgGrad.addColorStop(1, "#05080e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Malla técnica de cuadrícula
  ctx.strokeStyle = "rgba(0, 240, 255, 0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Marco exterior neón
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 2;
  roundRect(ctx, 12, 12, width - 24, height - 24, 12);
  ctx.stroke();

  // Encabezado superior
  ctx.fillStyle = "rgba(0, 240, 255, 0.12)";
  roundRect(ctx, 16, 16, width - 32, 45, 8);
  ctx.fill();

  ctx.fillStyle = "#00f0ff";
  ctx.font = "bold 15px 'Noto Sans', sans-serif";
  ctx.fillText("⚡ TERMINAL DE INTERVENCIÓN TÁCTICA · OPERADOR EXCLUSIVO", 30, 44);

  // Temporizador en esquina superior derecha
  ctx.fillStyle = state.secondsLeft <= 5 ? "#ef4444" : "#f59e0b";
  ctx.font = "bold 16px 'Noto Sans', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`⏱️ TIEMPO: ${state.secondsLeft}s`, width - 35, 44);
  ctx.textAlign = "left";

  // Título y Subtítulo del Desafío
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px 'Noto Sans', sans-serif";
  ctx.fillText(`${minigame.roleEmoji} ${minigame.title}`, 30, 95);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px 'Noto Sans', sans-serif";
  ctx.fillText(`Especialidad requerida: ${minigame.roleName} · ${minigame.subtitle}`, 30, 118);

  // Caja de Operador Activo
  const opBoxY = 135;
  ctx.fillStyle = state.operatorName ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)";
  ctx.strokeStyle = state.operatorName ? "#10b981" : "#f59e0b";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 30, opBoxY, width - 60, 42, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = state.operatorName ? "#34d399" : "#fbbf24";
  ctx.font = "bold 14px 'Noto Sans', sans-serif";
  if (state.operatorName) {
    const specTag = state.isSpecialist ? " ⭐ (ESPECIALISTA DESIGNADO)" : " 👤 (CÓMPLICE VOLUNTARIO)";
    ctx.fillText(`🎮 OPERADOR ACTIVO EN LA CONSOLA: ${state.operatorName}${specTag}`, 45, opBoxY + 26);
  } else {
    ctx.fillText("🖐️ ESPERANDO OPERADOR: Pulsa [TOMAR EL CONTROL] para bloquear la consola en exclusiva", 45, opBoxY + 26);
  }

  // Panel central gráfico según visualType
  const panelY = 190;
  const panelH = 135;
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  roundRect(ctx, 30, panelY, width - 60, panelH, 8);
  ctx.fill();
  ctx.stroke();

  // Renderizar gráficos esquemáticos según el tipo de minijuego
  if (minigame.visualType === "hex") {
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 15px 'Noto Sans', sans-serif";
    ctx.fillText("BARRIDO DE CORTAFUEGOS CUÁNTICO:", 50, panelY + 30);

    const hashes = ["[0x7F:B4]", "[0x2E:A1]", "[0x9C:F8]"];
    hashes.forEach((h, idx) => {
      const bx = 50 + idx * 240;
      ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
      ctx.strokeStyle = "#38bdf8";
      roundRect(ctx, bx, panelY + 45, 210, 48, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px monospace";
      ctx.fillText(h, bx + 55, panelY + 76);
    });

    // Barra de escaneo
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(50, panelY + 105, 710, 8);
    ctx.fillStyle = "#00f0ff";
    ctx.fillRect(50, panelY + 105, 480, 8);
  } else if (minigame.visualType === "wires") {
    ctx.fillStyle = "#fb923c";
    ctx.font = "bold 15px 'Noto Sans', sans-serif";
    ctx.fillText("MÓDULO DE DETONACIÓN C4 · CABLES DE DERIVACIÓN:", 50, panelY + 30);

    const wireColors = [
      { name: "ROJO", color: "#ef4444" },
      { name: "AZUL", color: "#3b82f6" },
      { name: "VERDE", color: "#10b981" },
      { name: "AMARILLO", color: "#eab308" },
    ];

    wireColors.forEach((w, idx) => {
      const wx = 50 + idx * 180;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(wx + 20, panelY + 55);
      ctx.bezierCurveTo(wx + 40, panelY + 75, wx + 60, panelY + 50, wx + 120, panelY + 75);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px 'Noto Sans', sans-serif";
      ctx.fillText(w.name, wx + 45, panelY + 105);
    });
  } else if (minigame.visualType === "scope") {
    ctx.fillStyle = "#f87171";
    ctx.font = "bold 15px 'Noto Sans', sans-serif";
    ctx.fillText("MIRA TELESCÓPICA · SECTORES DE TIRO PERIMETRAL:", 50, panelY + 30);

    // Dibujar retícula de mira
    const cx = width / 2;
    const cy = panelY + 70;
    ctx.strokeStyle = "rgba(248, 113, 113, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 60, cy);
    ctx.lineTo(cx + 60, cy);
    ctx.moveTo(cx, cy - 50);
    ctx.lineTo(cx, cy + 50);
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px 'Noto Sans', sans-serif";
    ctx.fillText("▸ Sector Torre Norte: [Vigía con Transmisor Fijado]", 60, panelY + 75);
    ctx.fillText("▸ Pasarelas: Sin comunicación activa", 60, panelY + 105);
  } else if (minigame.visualType === "traffic") {
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 15px 'Noto Sans', sans-serif";
    ctx.fillText("AUTOPISTA DE ESCAPE · RADAR DE PATRULLAS:", 50, panelY + 30);

    const lanes = [
      { name: "CARRIL IZQ", status: "⛔ BLOQUEADO", color: "#ef4444" },
      { name: "CARRIL CENTRAL", status: "⚠️ PINCHOS", color: "#f59e0b" },
      { name: "ARCÉN DERECHO", status: "✅ DESPEJADO", color: "#10b981" },
    ];

    lanes.forEach((l, idx) => {
      const lx = 50 + idx * 240;
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.strokeStyle = l.color;
      roundRect(ctx, lx, panelY + 45, 220, 55, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px 'Noto Sans', sans-serif";
      ctx.fillText(l.name, lx + 20, panelY + 70);

      ctx.fillStyle = l.color;
      ctx.font = "bold 13px 'Noto Sans', sans-serif";
      ctx.fillText(l.status, lx + 20, panelY + 90);
    });
  } else if (minigame.visualType === "ekg") {
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 15px 'Noto Sans', sans-serif";
    ctx.fillText("MONITOR CARDÍACO DE CAMPAÑA · 45 BPM (BRADICARDIA SEVERA):", 50, panelY + 30);

    // Dibujar onda EKG
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(50, panelY + 75);
    ctx.lineTo(180, panelY + 75);
    ctx.lineTo(200, panelY + 50);
    ctx.lineTo(220, panelY + 105);
    ctx.lineTo(240, panelY + 40);
    ctx.lineTo(260, panelY + 75);
    ctx.lineTo(450, panelY + 75);
    ctx.lineTo(470, panelY + 50);
    ctx.lineTo(490, panelY + 105);
    ctx.lineTo(510, panelY + 40);
    ctx.lineTo(530, panelY + 75);
    ctx.lineTo(750, panelY + 75);
    ctx.stroke();

    ctx.fillStyle = "#f87171";
    ctx.font = "bold 14px 'Noto Sans', sans-serif";
    ctx.fillText("⚠️ HEMORRAGIA ACTIVA: Requiere coagulante y torniquete inmediato", 50, panelY + 115);
  } else if (minigame.visualType === "radio_freq") {
    ctx.fillStyle = "#818cf8";
    ctx.font = "bold 15px 'Noto Sans', sans-serif";
    ctx.fillText("ANALIZADOR DE ESPECTRO POLICIAL · MODULACIÓN VHF:", 50, panelY + 30);

    // Ondas de frecuencia
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < 650; x += 15) {
      const yOffset = Math.sin(x * 0.05) * 20;
      if (x === 0) ctx.moveTo(50 + x, panelY + 75 + yOffset);
      else ctx.lineTo(50 + x, panelY + 75 + yOffset);
    }
    ctx.stroke();

    ctx.fillStyle = "#c7d2fe";
    ctx.font = "14px 'Noto Sans', sans-serif";
    ctx.fillText("▸ Canal Central 911: 104.2 MHz [ENLACE TÁCTICO DIRECTO IDENTIFICADO]", 50, panelY + 115);
  } else {
    // Genérico / Cerraduras
    ctx.fillStyle = "#c084fc";
    ctx.font = "bold 15px 'Noto Sans', sans-serif";
    ctx.fillText("MECANISMO MECÁNICO DE PRECISIÓN · ALINEACIÓN DE PISTONES:", 50, panelY + 30);

    const tumblers = ["Perno 1 [Libre]", "Perno 2 [TRABADO]", "Perno 3 [Libre]"];
    tumblers.forEach((t, idx) => {
      const tx = 50 + idx * 240;
      ctx.fillStyle = "rgba(192, 132, 252, 0.12)";
      ctx.strokeStyle = idx === 1 ? "#ec4899" : "#c084fc";
      roundRect(ctx, tx, panelY + 45, 210, 55, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px 'Noto Sans', sans-serif";
      ctx.fillText(t, tx + 20, panelY + 78);
    });
  }

  return canvas.toBuffer("image/png");
}
