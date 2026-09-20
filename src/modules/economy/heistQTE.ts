import { ButtonStyle } from "discord.js";

export interface HeistQteOption {
  id: string;
  label: string;
  emoji: string;
  style: ButtonStyle;
  recommendedRole?: string; // "hacker" | "tirador" | "demoliciones" | "infiltrador" | "conductor" | "medico" | "negociador"
  roleNameLabel: string;
  successChanceNonRole: number; // 0 a 100
  winRateBonus: number; // Suma a winRate
  winRatePenalty: number; // Resta a winRate si falla
  lootBonusPct?: number; // Suma botín bonus
  successText: string;
  failText: string;
}

export interface HeistQteIncident {
  title: string;
  description: string;
  options: HeistQteOption[];
  timeoutText: string;
  timeoutPenalty: number;
}

const HEIST_QTE_INCIDENTS_BASE: Record<string, HeistQteIncident[]> = {
  banco: [
    {
      title: "Patrulla imprevista frente a la Bóveda Subterránea",
      description:
        "Una patrulla de tres guardias tácticos con linternas de alta intensidad desciende por la escalera de emergencia hacia la esclusa donde está la banda.",
      timeoutText:
        "⏰ **¡Indecisión fatal!** La banda dudó demasiado y los guardias encendieron sus linternas sobre el equipo. Se activó la alarma general antes de tiempo (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_banco_infil",
          label: "Dardos somníferos desde ductos",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 10,
          successText:
            "🎯 ¡Tiro perfecto! Los tres guardias cayeron al suelo en completo silencio antes de ver nada. El perímetro sigue totalmente limpio.",
          failText:
            "⚠️ El dardo rebotó en el chaleco de kevlar de un guardia. Dio la voz de alerta antes de ser reducido a golpes.",
        },
        {
          id: "qte_banco_hack",
          label: "Falsa alarma de incendio en P2",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 12,
          winRatePenalty: 9,
          successText:
            "💻 ¡Megafonía y aspersores de la planta 2 activados! La central desvía a los guardias escaleras arriba creyendo que hay fuego real.",
          failText:
            "⚠️ El cortafuegos del banco detectó la intrusión manual y selló las compuertas intermedias.",
        },
        {
          id: "qte_banco_demo",
          label: "Cegadora y asalto relámpago",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 60,
          winRateBonus: 9,
          winRatePenalty: 12,
          lootBonusPct: 15,
          successText:
            "💥 ¡FLASHBANG! Cegados y aturdidos al instante, la banda los inmoviliza y les arrebata las llaves maestras de las cajas de seguridad (+15% botín).",
          failText:
            "⚠️ El estallido resonó en los huecos de ventilación y los sensores acústicos alertaron a la central.",
        },
        {
          id: "qte_banco_general",
          label: "Ocultarse en los conductos",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera (Sigilo básico)",
          successChanceNonRole: 80,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "🤫 La banda contuvo la respiración en la oscuridad. Los guardias pasaron de largo sin sospechar nada.",
          failText:
            "⚠️ Una bota pisó una rejilla oxidada que crujió ruidosamente, llamando la atención de la patrulla.",
        },
      ],
    },
    {
      title: "Cierre neumático de la Puerta Acorazada Central",
      description:
        "Las alarmas de sismicidad detectaron vibraciones en la pared este y la compuerta acorazada de 20 toneladas de hormigón y acero desciende en cuenta regresiva.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La compuerta se selló herméticamente. La banda tuvo que cortar un desvío perdiendo tiempo crucial (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_banco2_hack",
          label: "Inyectar bucle al microcontrolador neumático",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 15,
          winRatePenalty: 10,
          successText:
            "💻 ¡Acceso forzado! El pistón hidráulico se detuvo a medio metro del suelo permitiendo el paso veloz del equipo.",
          failText:
            "⚠️ El cortafuegos industrial del banco bloqueó el puerto de inyección a tiempo.",
        },
        {
          id: "qte_banco2_demo",
          label: "Cuña de termita en el riel de deslizamiento",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 65,
          winRateBonus: 12,
          winRatePenalty: 11,
          lootBonusPct: 20,
          successText:
            "🔥 ¡La termita fundió el carril de titanio! La compuerta quedó trabada y reveló una caja de seguridad del suelo (+20% botín).",
          failText:
            "⚠️ La deflagración dobló la barra sin frenar el cierre de emergencia.",
        },
        {
          id: "qte_banco2_negoc",
          label: "Manipular por interfono a la central de control",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 9,
          successText:
            "🎙️ Fingiendo ser el jefe de seguridad de guardia, convenció a la central de que era una prueba rutinaria y reabrieron la esclusa.",
          failText:
            "⚠️ El operador detectó inconsistencias en el código de empleado y dio aviso.",
        },
        {
          id: "qte_banco2_gen",
          label: "Traba manual con gatos hidráulicos de rescate",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 78,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "⚙️ El equipo colocó dos gatos hidráulicos pesados que resistieron el peso de la compuerta el tiempo justo para cruzar.",
          failText:
            "⚠️ La presión aplastó el primer gato resbalando el metal contra el suelo.",
        },
      ],
    },
    {
      title: "Emboscada de escoltas acorazados con escudos balísticos",
      description:
        "Dos guardias veteranos con armadura pesada y escudos de aleación de titanio bloquean el corredor hacia las cajas privadas apuntando con escopetas.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los escoltas avanzaron en formación tortuga acorralando a la banda en el pasillo (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_banco3_tirador",
          label: "Disparo quirúrgico a la ranura de visión del escudo",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 65,
          winRateBonus: 15,
          winRatePenalty: 10,
          successText:
            "🎯 ¡Diana milimétrica! El proyectil desestabilizó el visor y ambos guardias retrocedieron desarmados.",
          failText:
            "⚠️ El proyectil rebotó en el bisel de acero alertando al segundo guardia.",
        },
        {
          id: "qte_banco3_medico",
          label: "Granada de gas neuro-paralizante y antídoto al equipo",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 68,
          winRateBonus: 14,
          winRatePenalty: 9,
          successText:
            "🩺 ¡Aerosol clínico aturdidor! Los guardias cayeron dormidos al instante mientras la banda avanzaba inmune con respiradores.",
          failText:
            "⚠️ La ventilación del pasillo dispersó el gas antes de surtir efecto completo.",
        },
        {
          id: "qte_banco3_infil",
          label: "Descolgarse por conducto trasero y desarme silencioso",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 13,
          winRatePenalty: 10,
          lootBonusPct: 15,
          successText:
            "🥷 ¡Ataque por la espalda en completo silencio! Inmovilizó a los guardias y les quitó las llaves maestras (+15% botín).",
          failText:
            "⚠️ Una hebilla metálica chocó con el conducto alertando a la escolta.",
        },
        {
          id: "qte_banco3_gen",
          label: "Fuego de supresión y cobertura tras pilares de mármol",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 78,
          winRateBonus: 7,
          winRatePenalty: 8,
          successText:
            "🛡️ La banda abrió fuego intimidatorio obligando a los guardias a retroceder tras la barricada.",
          failText:
            "⚠️ La lluvia de perdigones dañó parte del material táctico de la banda.",
        },
      ],
    },
  ],
  casino: [
    {
      title: "Escáner térmico en el pasillo VIP de la Bóveda",
      description:
        "La seguridad del casino ha cambiado el ciclo de las cámaras térmicas y un sensor infrarrojo barre el acceso a las cajas acorazadas de fichas y diamantes.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El escáner térmico detectó el calor corporal de la banda y activó el cierre hidráulico de emergencia (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_casino_hack",
          label: "Bucle de imagen térmica estática",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 15,
          winRatePenalty: 10,
          successText:
            "💻 ¡Inyección de bucle exitosa! La sala de monitores del casino ve una imagen congelada del pasillo vacío a 21°C constantes.",
          failText:
            "⚠️ El algoritmo anti-deepfake del casino detectó el fotograma congelado y lanzó un ping de alerta.",
        },
        {
          id: "qte_casino_tirador",
          label: "Tiro al nodo de fibra del sensor",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 11,
          successText:
            "🎯 ¡Impacto milimétrico! El sensor quedó desactivado fingiendo un fallo eléctrico del hotel sin disparar alarmas.",
          failText:
            "⚠️ El disparo rozó una tubería de agua y el chisporroteo eléctrico encendió la sirena de mantenimiento.",
        },
        {
          id: "qte_casino_infil",
          label: "Clonar tarjeta del jefe de sala",
          emoji: "🥷",
          style: ButtonStyle.Success,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 60,
          winRateBonus: 11,
          winRatePenalty: 12,
          lootBonusPct: 20,
          successText:
            "🎩 ¡Juego de manos magistral! El infiltrador clonó las credenciales de diamantes VIP de la gerencia (+20% botín extra en fichas de platino).",
          failText:
            "⚠️ El jefe de sala notó el roce y avisó de inmediato a los guardaespaldas de la entrada.",
        },
        {
          id: "qte_casino_general",
          label: "Manta térmica y avance milimétrico",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera (Básico)",
          successChanceNonRole: 75,
          winRateBonus: 7,
          winRatePenalty: 9,
          successText:
            "🧥 La banda cubrió su calor corporal con mantas isotérmicas y cruzó el pasillo a ras de suelo sin saltar el sensor.",
          failText:
            "⚠️ Una esquina de la manta resbaló revelando una firma de calor de 36°C que disparó la alarma.",
        },
      ],
    },
    {
      title: "Ronda imprevista del Director y la escolta de la Mafia",
      description:
        "El Director del Gran Casino y tres guardaespaldas armados de la mafia entran a la antecámara acorazada justo cuando la banda empaqueta fichas doradas.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El Director dio la voz de alarma a la seguridad del hotel (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_casino2_negoc",
          label: "Farol maestro fingiendo inspección federal de juego",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 65,
          winRateBonus: 16,
          winRatePenalty: 10,
          lootBonusPct: 20,
          successText:
            "🎙️ ¡Interpretación digna de película! El Director tragó el engaño, les entregó el libro de claves de diamantes y se retiró escoltado (+20% botín).",
          failText:
            "⚠️ Uno de los mafiosos sospechó de las credenciales falsas.",
        },
        {
          id: "qte_casino2_tirador",
          label: "Desarme relámpago con silenciador encañonando al Director",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 68,
          winRateBonus: 14,
          winRatePenalty: 10,
          successText:
            "🎯 ¡Movimiento fulgurante! Encañonó al Director al instante obligando a los matones a soltar las armas en silencio.",
          failText:
            "⚠️ Un guardaespaldas desenfundó a tiempo disparando un tiro al techo.",
        },
        {
          id: "qte_casino2_hack",
          label: "Apagón total en las mesas VIP y sobrecarga de tragaperras",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 14,
          winRatePenalty: 9,
          successText:
            "💻 ¡Caos masivo en el casino! Las luces se apagaron y las máquinas empezaron a expulsar monedas provocando una avalancha de gente.",
          failText:
            "⚠️ El sistema de alimentación ininterrumpida restableció la luz en 3 segundos.",
        },
        {
          id: "qte_casino2_gen",
          label: "Agazaparse tras las mesas de conteo y aguardar",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 75,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "👥 La banda contuvo la respiración detrás de los sacos de billetes y la comitiva pasó de largo.",
          failText:
            "⚠️ Una ficha de platino rodó por la alfombra rozando el zapato de un escolta.",
        },
      ],
    },
    {
      title: "Gas somnífero en el túnel de las cajas de seguridad",
      description:
        "Se ha activado el protocolo antihurto del casino y conductos ocultos comienzan a liberar gas adormecedor violeta en el túnel subterráneo.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El gas anestésico nubló la visión del equipo y ralentizó sus movimientos (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_casino3_medico",
          label: "Repartir respiradores químicos y estimulantes de combate",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 70,
          winRateBonus: 15,
          winRatePenalty: 9,
          successText:
            "🩺 ¡Reacción médica impecable! Administró ampollas de contraneurotoxina y respiradores, manteniendo al equipo lúcido y protegido.",
          failText:
            "⚠️ La dosis tardó en surtir efecto y dos miembros sufrieron mareos.",
        },
        {
          id: "qte_casino3_demo",
          label: "Volar el extractor de aire con una microcarga plástica",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 65,
          winRateBonus: 12,
          winRatePenalty: 11,
          lootBonusPct: 15,
          successText:
            "💣 ¡Estallido controlado! La succión inversa absorbió todo el gas hacia el exterior abriendo un pasaje a una caja fuerte secreta (+15% botín).",
          failText:
            "⚠️ La onda expansiva descalibró los sensores de apertura de las cajas.",
        },
        {
          id: "qte_casino3_infil",
          label: "Sellar las toberas del conducto con espuma de poliuretano",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 13,
          winRatePenalty: 10,
          successText:
            "🥷 ¡Sellado instantáneo! El infiltrador trepó a las rejillas y bloqueó el flujo de gas con rapidez felina.",
          failText:
            "⚠️ La presión rompió el sello de una de las toberas.",
        },
        {
          id: "qte_casino3_gen",
          label: "Cubrirse con chaquetas húmedas y correr hacia la esclusa",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 75,
          winRateBonus: 7,
          winRatePenalty: 8,
          successText:
            "🏃 El equipo cruzó a la carrera aguantando la respiración hasta la puerta estanca.",
          failText:
            "⚠️ El vapor irritó los ojos de los asaltantes reduciendo su coordinación.",
        },
      ],
    },
  ],
  mansion: [
    {
      title: "Perros de presa sueltos en el jardín zen",
      description:
        "Los dobermans guardianes del magnate han detectado movimiento y corren olfateando a toda velocidad hacia el pabellón de acceso.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los canes acorralaron al equipo ladrando furiosamente, alertando a los mercenarios de la mansión (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_mansion_infil",
          label: "Cebos con somnífero de carne Wagyu",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 15,
          winRatePenalty: 10,
          successText:
            "🥩 ¡Sedados al instante! Los perros devoraron los cebos y cayeron profundamente dormidos entre los setos.",
          failText:
            "⚠️ El perro alfa rechazó el cebo y continuó ladrando con insistencia hacia los árboles.",
        },
        {
          id: "qte_mansion_tirador",
          label: "Cerrar verja metálica a distancia",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 70,
          winRateBonus: 13,
          winRatePenalty: 9,
          successText:
            "🎯 ¡Tiro al cerrojo! La verja de hierro cayó de golpe dejando a los sabuesos atrapados en el patio exterior.",
          failText:
            "⚠️ El cerrojo se atascó a medio recorrido y los perros lograron colarse por debajo.",
        },
        {
          id: "qte_mansion_demo",
          label: "Bomba de humo picante CS",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 60,
          winRateBonus: 10,
          winRatePenalty: 11,
          lootBonusPct: 15,
          successText:
            "💨 Una cortina de gas neutralizó el olfato de los animales y ocultó la entrada a la galería de arte privada (+15% botín).",
          failText:
            "⚠️ El viento sopló en contra y el humo desorientó temporalmente a los propios miembros de la banda.",
        },
        {
          id: "qte_mansion_general",
          label: "Subir a los balcones del tejado",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 78,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "🧗 La banda trepó a las balaustradas del tejado con agilidad mientras la jauría pasaba por debajo sin mirar arriba.",
          failText:
            "⚠️ Una teja de terracota se desprendió cayendo al suelo con un estruendo que alertó a la seguridad.",
        },
      ],
    },
    {
      title: "Malla láser volumétrica y losas de presión en la pinacoteca",
      description:
        "La galería de cuadros y esculturas del magnate está blindada con láseres en movimiento oscilante y baldosas sensibles a más de 10 kg de peso.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Una baldosa de mármol detectó vibración y bajaron las persianas de acero del ala de arte (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_mansion2_infil",
          label: "Acrobacia por cornisas para desconectar el prisma óptico",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 16,
          winRatePenalty: 10,
          lootBonusPct: 20,
          successText:
            "🥷 ¡Movimiento milimétrico sin tocar el suelo! Desconectó el prisma central y descolgó un lienzo de 2 millones (+20% botín).",
          failText:
            "⚠️ Rozó un haz láser invisible de baja intensidad activando el chivato.",
        },
        {
          id: "qte_mansion2_hack",
          label: "Interceptar la domótica de arte de la mansión",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 15,
          winRatePenalty: 9,
          successText:
            "💻 ¡Sistema domótico anulado! Congeló las frecuencias lumínicas y desactivó las baldosas piezoeléctricas.",
          failText:
            "⚠️ La app del magnate alertó de un intento de emparejamiento no autorizado.",
        },
        {
          id: "qte_mansion2_medico",
          label: "Rociar aerosol médico refrigerante para revelar los haces",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 68,
          winRateBonus: 13,
          winRatePenalty: 9,
          successText:
            "🩺 ¡Visibilidad total! El aerosol reveló la trayectoria de cada haz permitiendo a toda la banda sortear la trampa.",
          failText:
            "⚠️ El aerosol disparó un sensor de partículas óptico.",
        },
        {
          id: "qte_mansion2_gen",
          label: "Caminar en fila pisando exactamente sobre las juntas de vigas",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 75,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "👣 Uno a uno, la banda cruzó equilibrándose por la estructura de carga sin tocar las baldosas.",
          failText:
            "⚠️ Un pie resbaló en la junta haciendo oscilar una escultura de bronce.",
        },
      ],
    },
    {
      title: "Emboscada de mercenarios en el garaje de superdeportivos",
      description:
        "Los contratistas militares privados del magnate han tomado posiciones tras los coches de lujo del garaje bloqueando la salida de escape.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los mercenarios cerraron el portón blindado del garaje atrapando a la banda (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_mansion3_cond",
          label: "Arrancar el bólido de carreras del magnate y embestir el portón",
          emoji: "🚗",
          style: ButtonStyle.Danger,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 65,
          winRateBonus: 16,
          winRatePenalty: 10,
          lootBonusPct: 15,
          successText:
            "🏎️ ¡MOTOR V12 RUGIENDO! El piloto reventó el portón y desbarató la línea de tiradores abriendo paso (+15% botín).",
          failText:
            "⚠️ El impacto dañó el radiador y el coche quedó echando humo.",
        },
        {
          id: "qte_mansion3_tirador",
          label: "Fuego de precisión a los extintores y focos del techo",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 68,
          winRateBonus: 14,
          winRatePenalty: 10,
          successText:
            "🎯 ¡Ceguera táctica! Nubes de polvo químico y cristales rotos sumieron a los mercenarios en el caos.",
          failText:
            "⚠️ El rebote alertó a un guardia en el piso superior.",
        },
        {
          id: "qte_mansion3_negoc",
          label: "Suplantar la frecuencia de radio táctica de la escolta",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 9,
          successText:
            "🎙️ Con tono militar impecable, dio orden de evacuar el garaje ante supuesta amenaza de bomba.",
          failText:
            "⚠️ El comandante de la escolta solicitó la contraseña del día.",
        },
        {
          id: "qte_mansion3_gen",
          label: "Lanzar bengalas y humo de distracción hacia los vehículos",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 76,
          winRateBonus: 7,
          winRatePenalty: 8,
          successText:
            "🔥 El humo cubrió el cruce hacia los todoterrenos de escape.",
          failText:
            "⚠️ El calor de las bengalas activó los rociadores del techo.",
        },
      ],
    },
  ],
  museo: [
    {
      title: "Campana de vacío blindada sobre el Sarcófago Imperial",
      description:
        "Al levantar la Joya de la Corona Imperial, un electroimán de techo suelta una campana de cristal blindado y compuertas de bronce hacia la vitrina.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La campana cayó atrapando la reliquia y sellando la vitrina bajo vacío hermético (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_museo_infil",
          label: "Sustitución milimétrica de contrapeso con arena calibrada",
          emoji: "🏺",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 16,
          winRatePenalty: 10,
          lootBonusPct: 25,
          successText:
            "🏺 ¡Estilo arqueológico de leyenda! Retiró la joya colocando el peso idéntico sin que el mecanismo detectara el cambio (+25% botín).",
          failText:
            "⚠️ La báscula varió 3 gramos y el sensor comenzó a pitar.",
        },
        {
          id: "qte_museo_demo",
          label: "Microdetonación sónica en los anclajes de bronce",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 65,
          winRateBonus: 13,
          winRatePenalty: 11,
          successText:
            "💣 ¡Quiebre perfecto! La onda expansiva fracturó los goznes de la campana antes de que tocara la base de la vitrina.",
          failText:
            "⚠️ El estruendo resonó por las cúpulas del museo disparando la alarma general.",
        },
        {
          id: "qte_museo_hack",
          label: "Inhabilitar electroimanes desde el terminal de curaduría",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 14,
          winRatePenalty: 9,
          successText:
            "💻 ¡Electroimán bloqueado en posición alta! La campana quedó suspendida en el techo.",
          failText:
            "⚠️ El terminal solicitó autenticación con tarjeta física.",
        },
        {
          id: "qte_museo_gen",
          label: "Trabar la caída con una barra de titanio",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 75,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "🛡️ La barra resistió el peso de la campana permitiendo extraer la corona con la mano.",
          failText:
            "⚠️ El cristal blindado astilló la barra rozando el guante de un miembro.",
        },
      ],
    },
    {
      title: "Cierre perimetral de compuertas de mármol en la Galería Egipcia",
      description:
        "Un custodio divisó reflejos entre los sarcófagos y activó el cierre perimetral de dos losas colosales de mármol que bloquean la salida.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Las losas tocaron el suelo sellando la galería imperial (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_museo2_negoc",
          label: "Megafonía fingiendo ser el Conservador General de Patrimonio",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 65,
          winRateBonus: 15,
          winRatePenalty: 9,
          lootBonusPct: 15,
          successText:
            "🎙️ Ordenó por la megafonía detener el protocolo por inspección ministerial y el guardia reabrió el paso (+15% botín).",
          failText:
            "⚠️ El vigilante sospechó del tono de urgencia y mantuvo el cierre.",
        },
        {
          id: "qte_museo2_tirador",
          label: "Disparo certero al cable de contrapeso de la compuerta",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 68,
          winRateBonus: 14,
          winRatePenalty: 10,
          successText:
            "🎯 ¡Cable cortado en pleno descenso! El sistema de seguridad antiavalancha bloqueó los frenos dejando la puerta levantada.",
          failText:
            "⚠️ El impacto melló la polea sin frenar el descenso.",
        },
        {
          id: "qte_museo2_medico",
          label: "Dardo tranquilizante clínico al custodio desde la penumbra",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 68,
          winRateBonus: 13,
          winRatePenalty: 9,
          successText:
            "🩺 ¡Dardo sedante instantáneo! El custodio cayó sobre la consola pulsando el botón de descarte de alarma.",
          failText:
            "⚠️ El guardia se tambaleó y activó la sirena antes de caer.",
        },
        {
          id: "qte_museo2_gen",
          label: "Deslizarse rodando bajo la losa a punto de cerrarse",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 76,
          winRateBonus: 7,
          winRatePenalty: 8,
          successText:
            "⚡ Toda la banda rodó bajo el mármol saliendo a la nave central un segundo antes del impacto en el suelo.",
          failText:
            "⚠️ La última mochila quedó atrapada obligando a tirar con fuerza.",
        },
      ],
    },
    {
      title: "Trampa de gas narcótico milenario en la Cripta Arcana",
      description:
        "El mecanismo milenario de la cripta subterránea se ha activado, liberando una nube de esporas narcóticas que nublan el juicio de los asaltantes.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Las esporas causaron desorientación y alucinaciones en el equipo (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_museo3_medico",
          label: "Filtros de carbón activado y ampollas de antídoto celular",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 70,
          winRateBonus: 16,
          winRatePenalty: 9,
          successText:
            "🩺 ¡Inmunidad total! Administró el antídoto neutralizando el efecto de las esporas en segundos.",
          failText:
            "⚠️ El reactivo tardó en estabilizar a dos miembros del equipo.",
        },
        {
          id: "qte_museo3_hack",
          label: "Revertir el flujo del sistema moderno de ventilación HVAC",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 14,
          winRatePenalty: 9,
          successText:
            "💻 ¡Extracción al máximo! Las turbinas del museo comenzaron a aspirar el gas expulsándolo al tejado.",
          failText:
            "⚠️ El ventilador principal saltó por sobrecarga eléctrica.",
        },
        {
          id: "qte_museo3_infil",
          label: "Localizar el mecanismo de contrapeso oculto en el bajorrelieve",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 13,
          winRatePenalty: 10,
          lootBonusPct: 20,
          successText:
            "🥷 ¡Ojo clínico para secretos antiguos! Giró la cabeza de la esfinge cortando el gas y abriendo un cofre oculto (+20% botín).",
          failText:
            "⚠️ La piedra estaba atascada por siglos de humedad.",
        },
        {
          id: "qte_museo3_gen",
          label: "Pañuelos con agua mineral y salida acelerada",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 75,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "🏃 Aguantando la respiración con pañuelos, el equipo cruzó el pasillo a oscuras.",
          failText:
            "⚠️ La tos y el picor redujeron el ritmo de la fuga.",
        },
      ],
    },
  ],
  tren_blindado: [
    {
      title: "Torretas automáticas de techo en túnel de montaña",
      description:
        "El convoy blindado se adentra a 180 km/h en un túnel en curva y dos torretas centinela con láseres infrarrojos emergen sobre el vagón del oro.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Las torretas centraron sus cañones sobre el techo y obligaron a la banda a retroceder bajo fuego nutrido (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_tren_tirador",
          label: "Destruir ópticas de puntería a 180 km/h",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 65,
          winRateBonus: 16,
          winRatePenalty: 11,
          successText:
            "🎯 ¡Dos disparos en ráfaga certera! Ambas lentes infrarrojas reventaron y las torretas quedaron apuntando a la nada.",
          failText:
            "⚠️ El viento de la marcha desvió el proyectil contra el blindaje exterior sin dañar el cañón.",
        },
        {
          id: "qte_tren_demo",
          label: "Pegar C4 magnético a los pivotes",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 12,
          lootBonusPct: 20,
          successText:
            "💥 ¡BOMBA! La base de las torretas saltó por los aires desprendiéndose contra la pared del túnel y abriendo una brecha al techo del vagón (+20% botín).",
          failText:
            "⚠️ El adhesivo magnético patinó por la lluvia de chispas y la carga explotó antes de quedar fijada.",
        },
        {
          id: "qte_tren_conductor",
          label: "Embestir cables desde furgón en marcha",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 10,
          successText:
            "🏎️ ¡Maniobra suicida en paralelo! El vehículo de apoyo lanzó un ancla de cable que arrancó los cables de alimentación de las armas.",
          failText:
            "⚠️ El vehículo rebotó contra el arcén perdiendo sustentación y obligando a soltar el cable.",
        },
        {
          id: "qte_tren_general",
          label: "Cuerpo a tierra entre las tolvas",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 78,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "🛡️ El equipo se agazapó bajo las vigas metálicas del convoy mientras las ráfagas pasaban rozando el aire.",
          failText:
            "⚠️ Las chispas de los impactos quemaron parte de las mochilas de transporte de lingotes.",
        },
      ],
    },
    {
      title: "Desacople magnético del vagón del tesoro en plena curva",
      description:
        "La computadora central del convoy ha iniciado la secuencia de desacople electromagnético para abandonar el vagón del oro a 190 km/h.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El vagón se desacopló y comenzó a frenar en seco en mitad de la vía (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_tren2_cond",
          label: "Enganche de cables de alta tensión con el furgón de apoyo",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 65,
          winRateBonus: 16,
          winRatePenalty: 10,
          successText:
            "🏎️ ¡Maniobra extrema en paralelo a las vías! Enganchó los pernos de tracción manteniendo unido el convoy.",
          failText:
            "⚠️ Las ruedas patinaron con el balasto del arcén.",
        },
        {
          id: "qte_tren2_demo",
          label: "Soldar en caliente el enganche con termita explosiva",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 11,
          lootBonusPct: 20,
          successText:
            "🔥 ¡Fusión de acero! La termita soldó los goznes del enganche evitando el desacople y liberando cofres de oro adicionales (+20% botín).",
          failText:
            "⚠️ Las chispas de la termita quemaron las mangueras de freno secundarias.",
        },
        {
          id: "qte_tren2_hack",
          label: "Cancelar la secuencia de desacople en la centralita del vagón",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 15,
          winRatePenalty: 9,
          successText:
            "💻 ¡Señal de desacople anulada! La computadora de la locomotora restableció el bloqueo de seguridad.",
          failText:
            "⚠️ La señal se interrumpió por la interferencia del túnel.",
        },
        {
          id: "qte_tren2_gen",
          label: "Tirar de los cables de bloqueo manual del bogie",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 76,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "⚙️ Entre dos miembros encajaron la barra de bloqueo mecánica frenando la separación.",
          failText:
            "⚠️ La vibración del tren golpeó las manos de los asaltantes.",
        },
      ],
    },
    {
      title: "Emboscada del escuadrón ferroviario en el vagón comedor",
      description:
        "Cinco soldados del destacamento ferroviario con fusiles de asalto y chalecos pesados abren fuego cruzado desde la cocina blindada.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El fuego nutrido obligó a la banda a retroceder perdiendo el control del pasillo (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_tren3_tirador",
          label: "Fuego de supresión perforando los mamparos de acero",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 68,
          winRateBonus: 16,
          winRatePenalty: 10,
          successText:
            "🎯 ¡Ráfagas demoledoras! Neutralizó la línea de fuego de los guardias obligándolos a deponer las armas.",
          failText:
            "⚠️ La munición perforante rozó los cables de luz del vagón.",
        },
        {
          id: "qte_tren3_medico",
          label: "Lanzar gas fumígeno y estabilizar las heridas del equipo",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 68,
          winRateBonus: 14,
          winRatePenalty: 9,
          successText:
            "🩺 ¡Soporte táctico y cobertura! Cubrió el avance con humo mientras aplicaba vendajes hemostáticos instantáneos.",
          failText:
            "⚠️ El humo tardó en cubrir todo el comedor.",
        },
        {
          id: "qte_tren3_negoc",
          label: "Pactar un alto el fuego distrayendo al oficial al mando",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 65,
          winRateBonus: 13,
          winRatePenalty: 9,
          lootBonusPct: 15,
          successText:
            "🎙️ Convenció al capitán de que el tren estaba saboteado, desarmando la emboscada mientras la banda desvalijaba la caja del convoy (+15% botín).",
          failText:
            "⚠️ Un soldado novato disparó a ciegas rompiendo el diálogo.",
        },
        {
          id: "qte_tren3_gen",
          label: "Avanzar cuerpo a tierra volcando mesas blindadas",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 76,
          winRateBonus: 7,
          winRatePenalty: 8,
          successText:
            "🛡️ El equipo formó una barricada móvil avanzando con determinación bajo el fuego.",
          failText:
            "⚠️ La metralla dañó parte de las herramientas de corte.",
        },
      ],
    },
  ],
  empresa: [
    {
      title: "Purga criogénica de nitrógeno en sala de servidores",
      description:
        "El sistema de contingencia de la multinacional ha detectado la extracción del rack de datos y ha empezado a inundar la cámara con gas a -196°C.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El frío extremo congeló las herramientas de corte y el equipo tuvo que retroceder tosiendo (-16% éxito).",
      timeoutPenalty: 16,
      options: [
        {
          id: "qte_empresa_hack",
          label: "Invertir válvulas criogénicas",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 16,
          winRatePenalty: 11,
          successText:
            "💻 ¡Acceso root concedido! El flujo de nitrógeno se detuvo y las compuertas de seguridad se abrieron de par en par.",
          failText:
            "⚠️ La IA defensiva bloqueó los permisos de administrador y forzó el reinicio físico del servidor.",
        },
        {
          id: "qte_empresa_demo",
          label: "Carga de termita en válvula de escape",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 65,
          winRateBonus: 12,
          winRatePenalty: 11,
          lootBonusPct: 20,
          successText:
            "🔥 ¡Metal fundido en segundos! La termita abrió una vía de escape y fundió la caja de discos duros de patentes secretas (+20% botín).",
          failText:
            "⚠️ La deflagración térmica activó los rociadores químicos de extinción en toda la planta.",
        },
        {
          id: "qte_empresa_infil",
          label: "Deslizarse bajo compuerta hidráulica",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 13,
          winRatePenalty: 10,
          successText:
            "⚡ ¡A milímetros del suelo! El infiltrador rodó bajo la compuerta justo antes del sellado y colocó la traba manual para la banda.",
          failText:
            "⚠️ La compuerta atrapó la mochila de equipo táctico obligando a forzarla ruidosamente.",
        },
        {
          id: "qte_empresa_general",
          label: "Cortar cuadro eléctrico con hacha",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 75,
          winRateBonus: 7,
          winRatePenalty: 9,
          successText:
            "⚡ De un golpe seco al seccionador principal, las luces y compresores de gas se apagaron dejando la sala en penumbra.",
          failText:
            "⚠️ Un arco eléctrico saltó del seccionador dejando a oscuras el pasillo pero activando el generador diésel con alarma.",
        },
      ],
    },
    {
      title: "Enjambre de drones de asalto autónomos en el atrio",
      description:
        "Tres drones tácticos equipados con ametralladoras de alta cadencia descienden en formación triangular por el atrio de cristal de Nexo Corp.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Las ráfagas de los drones fijaron a la banda contra el suelo (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_emp2_hack",
          label: "Hackeo masivo por Wi-Fi forzando colisión entre drones",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 16,
          winRatePenalty: 10,
          lootBonusPct: 20,
          successText:
            "💻 ¡Sobrecarga de firmware! Los tres drones colisionaron en una bola de fuego, soltando sus módulos criptográficos (+20% botín).",
          failText:
            "⚠️ La señal encriptada de Nexo Corp rechazó la orden de desvío.",
        },
        {
          id: "qte_emp2_tirador",
          label: "Disparo certero a los rotores de sustentación",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 68,
          winRateBonus: 15,
          winRatePenalty: 10,
          successText:
            "🎯 ¡Tres disparos, tres bajas! Los drones cayeron desintegrados contra las baldosas de mármol del atrio.",
          failText:
            "⚠️ El dron líder esquivó el segundo disparo respondiendo con ráfaga.",
        },
        {
          id: "qte_emp2_negoc",
          label: "Activar credencial corporativa de 'Consejo de Administración'",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 9,
          successText:
            "🎙️ Transmitió la orden de cese de fuego con voz ejecutiva del CEO; los drones entraron en modo escolta pasiva.",
          failText:
            "⚠️ La IA corporativa solicitó verificación biométrica ocular.",
        },
        {
          id: "qte_emp2_gen",
          label: "Buscar cobertura tras columnas de hormigón armado",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 76,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "🛡️ La banda se cubrió detrás de los pilares principales dejando pasar las ráfagas.",
          failText:
            "⚠️ Los fragmentos de hormigón alcanzaron una mochila táctica.",
        },
      ],
    },
    {
      title: "Despresurización y neurotoxina en el laboratorio cuántico",
      description:
        "La IA de Nexo Corp sella las esclusas del laboratorio de procesadores cuánticos e inicia la extracción de oxígeno.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La falta de oxígeno provocó asfixia en el equipo antes de abrir la compuerta (-16% éxito).",
      timeoutPenalty: 16,
      options: [
        {
          id: "qte_emp3_medico",
          label: "Inyectar oxigenadores sintéticos de grado militar al equipo",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 70,
          winRateBonus: 16,
          winRatePenalty: 9,
          successText:
            "🩺 ¡Potenciador metabólico administrado! Los niveles de saturación se mantuvieron al 100% pese al vacío.",
          failText:
            "⚠️ La ampolla del último miembro resbaló perdiendo unos segundos.",
        },
        {
          id: "qte_emp3_demo",
          label: "Brecha con carga hueca en el conducto de recirculación",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 11,
          lootBonusPct: 20,
          successText:
            "💣 ¡EXPLOSIÓN DIRIGIDA! Abrió un conducto de ventilación nuevo absorbiendo aire fresco y descubriendo el cofre de patentes (+20% botín).",
          failText:
            "⚠️ La detonación dañó las luces del laboratorio.",
        },
        {
          id: "qte_emp3_infil",
          label: "Puenteo directo de contactos cuánticos con grafito",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 13,
          winRatePenalty: 10,
          successText:
            "🥷 ¡Circuito reanimado a pulso! El teclado de acceso cobró vida abriendo la esclusa de escape.",
          failText:
            "⚠️ El grafito se desgastó antes de completar el puenteo.",
        },
        {
          id: "qte_emp3_gen",
          label: "Romper el cristal templado con un ariete neumático",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 75,
          winRateBonus: 7,
          winRatePenalty: 8,
          successText:
            "🔨 A base de impactos coordinados, el panel de cristal templado cedió permitiendo el paso.",
          failText:
            "⚠️ Las astillas de cristal rasgaron el mono de asalto de un integrante.",
        },
      ],
    },
  ],
  submarino: [
    {
      title: "Inundación masiva en la sala de torpedos",
      description:
        "Una compuerta de torpedos ha colapsado por la presión abisal y un torrente de agua salada a 40 atmósferas inunda el compartimento.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El agua superó la línea de flotación interna forzando el sellado del mamparo (-16% éxito).",
      timeoutPenalty: 16,
      options: [
        {
          id: "qte_sub_demo",
          label: "Soldadura explosiva subacuática con mezcla de magnesio",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 65,
          winRateBonus: 16,
          winRatePenalty: 11,
          lootBonusPct: 20,
          successText:
            "💣 ¡Sello hermético instantáneo! La reacción selló la compuerta y expulsó el agua hacia el exterior, dejando al descubierto una caja estanca de lingotes (+20% botín).",
          failText:
            "⚠️ La reacción generó vapor hirviendo retrasando el avance.",
        },
        {
          id: "qte_sub_infil",
          label: "Buceo a contracorriente para cerrar la válvula de presurización",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 15,
          winRatePenalty: 10,
          successText:
            "🥷 ¡Nado impecable en aguas heladas! Alcanzó la manivela principal y cerró la entrada de agua a pulso.",
          failText:
            "⚠️ La corriente arrastró al infiltrador haciéndole tragar agua salada.",
        },
        {
          id: "qte_sub_hack",
          label: "Activar bombas de achique de emergencia del Leviathan",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 14,
          winRatePenalty: 9,
          successText:
            "💻 ¡Secuencia de achique activada! Las turbinas del submarino vaciaron la sala en menos de 20 segundos.",
          failText:
            "⚠️ El sensor de nivel de agua tardó en registrar la orden.",
        },
        {
          id: "qte_sub_gen",
          label: "Empuje coordinado para bajar la palanca manual del mamparo",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 76,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "⚙️ Con el agua por la cintura, la banda unió fuerzas cerrando el mamparo estanco.",
          failText:
            "⚠️ La presión casi arranca la palanca de su bisagra.",
        },
      ],
    },
    {
      title: "Pulso de sonar activo y emboscada de buzos tácticos navales",
      description:
        "El sonar del submarino emite un pulso acústico atronador y tres buzos de operaciones especiales con fusiles anfibios bloquean la esclusa.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los buzos acorralaron al equipo apuntando a las salidas de emergencia (-15% éxito).",
      timeoutPenalty: 15,
      options: [
        {
          id: "qte_sub2_medico",
          label: "Administrar fármacos anticinetosis y aturdimiento acústico",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 70,
          winRateBonus: 16,
          winRatePenalty: 9,
          successText:
            "🩺 ¡Soporte vital hiperbárico! Estabilizó el oído interno del equipo y lanzó una cápsula de dispersión desorientando a los buzos.",
          failText:
            "⚠️ El pitido en los oídos persistió unos segundos en un cómplice.",
        },
        {
          id: "qte_sub2_tirador",
          label: "Disparo perforante a las válvulas de los tanques de aire",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 68,
          winRateBonus: 15,
          winRatePenalty: 10,
          successText:
            "🎯 ¡Fuga de burbujas inmediata! Los buzos tuvieron que abortar el combate para regular su flotabilidad.",
          failText:
            "⚠️ El proyectil rebotó contra el casco de acero del submarino.",
        },
        {
          id: "qte_sub2_negoc",
          label: "Suplantar la voz del Comandante de Flota por el interfono naval",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 9,
          lootBonusPct: 15,
          successText:
            "🎙️ Transmitió código militar de repliegue táctico al puente; los buzos despejaron el camino entregando las llaves del silo (+15% botín).",
          failText:
            "⚠️ El operador de sonar detectó ruido de fondo no estándar.",
        },
        {
          id: "qte_sub2_gen",
          label: "Ataque sorpresa con llaves inglesas pesadas y arpones",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 75,
          winRateBonus: 7,
          winRatePenalty: 8,
          successText:
            "⚔️ Combate cuerpo a cuerpo feroz en el pasillo estrecho hasta desarmar a los centinelas.",
          failText:
            "⚠️ Un miembro recibió un golpe en el hombro.",
        },
      ],
    },
    {
      title: "Fallo crítico del reactor nuclear por sobrecalentamiento",
      description:
        "El sistema de autodestrucción del Leviathan ha comenzado a calentar el núcleo de uranio para forzar una fusión antes de perder los códigos.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La radiación térmica obligó a abandonar la sala de mandos sin el botín principal (-16% éxito).",
      timeoutPenalty: 16,
      options: [
        {
          id: "qte_sub3_hack",
          label: "Reescribir el firmware de refrigeración criogénica del reactor",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 16,
          winRatePenalty: 10,
          successText:
            "💻 ¡Núcleo estabilizado! La temperatura cayó de 900°C a 200°C en segundos liberando los códigos de lanzamiento.",
          failText:
            "⚠️ El firewall naval de triple canal ralentizó la inyección de código.",
        },
        {
          id: "qte_sub3_cond",
          label: "Maniobra de inmersión en picado para aprovechar corrientes heladas",
          emoji: "🚗",
          style: ButtonStyle.Danger,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 65,
          winRateBonus: 15,
          winRatePenalty: 10,
          successText:
            "⚓ ¡Giro brusco a 45° en la fosa marina! El flujo de agua helada exterior refrigeró el reactor.",
          failText:
            "⚠️ La sacudida arrojó objetos sueltos por todo el submarino.",
        },
        {
          id: "qte_sub3_demo",
          label: "Desacoplar la cápsula del núcleo blindado con microcargas",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 11,
          lootBonusPct: 25,
          successText:
            "💣 ¡Corte quirúrgico! Separó el contenedor de plutonio enriquecido y los códigos intactos (+25% botín colosal).",
          failText:
            "⚠️ La deflagración chamuscó la consola de mandos.",
        },
        {
          id: "qte_sub3_gen",
          label: "Insertar las barras de grafito a mano con palancas aislantes",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 75,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "🛡️ Con guantes de amianto, el equipo bajó las barras de control deteniendo la reacción.",
          failText:
            "⚠️ El calor extremo desgastó el equipo protector.",
        },
      ],
    },
  ],
  estacion_espacial: [
    {
      title: "Pérdida de gravedad y campo electromagnético en esclusa",
      description:
        "La estación orbital detectó la intrusión en el módulo central de antimateria. La gravedad artificial ha caído a 0G y una barrera de iones bloquea la salida a la nave.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El campo de iones bloqueó los propulsores del equipo dejándolos flotando a merced de los drones de defensa (-16% éxito).",
      timeoutPenalty: 16,
      options: [
        {
          id: "qte_espacio_hack",
          label: "Puentear relés del anillo orbital",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 65,
          winRateBonus: 16,
          winRatePenalty: 11,
          successText:
            "💻 ¡Desvío energético ejecutado! El campo de iones se disipó y los propulsores de la esclusa recobraron potencia completa.",
          failText:
            "⚠️ La subestación orbital aisló el nodo y dejó al módulo en cuarentena presurizada.",
        },
        {
          id: "qte_espacio_infil",
          label: "Salida EVA en gravedad cero al cuadro exterior",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 15,
          winRatePenalty: 12,
          successText:
            "👨‍🚀 ¡Maniobra orbital perfecta! En caída libre sobre la atmósfera terrestre, el infiltrador cortó la alimentación del campo desde el exterior.",
          failText:
            "⚠️ Un micrometeorito impactó el cable de seguridad obligando a retornar a la esclusa de emergencia.",
        },
        {
          id: "qte_espacio_demo",
          label: "Detonación de plasma en el transformador",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 60,
          winRateBonus: 13,
          winRatePenalty: 13,
          lootBonusPct: 25,
          successText:
            "⚡ ¡Arco de plasma masivo! El generador saltó por los aires desintegrando la barrera y soltando canisters de antimateria pura (+25% botín).",
          failText:
            "⚠️ La sobrecarga de plasma fundió el cierre automático de la compuerta de carga.",
        },
        {
          id: "qte_espacio_general",
          label: "Botas magnéticas y palanca manual",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 72,
          winRateBonus: 6,
          winRatePenalty: 9,
          successText:
            "🧲 Botas fijadas al casco de acero, dos miembros tiraron a pulso de la válvula manual de liberación de compuerta.",
          failText:
            "⚠️ El sello de vacío resistió el esfuerzo manual perdiendo segundos valiosos de oxígeno.",
        },
      ],
    },
    {
      title: "Fuga de radiación cósmica en el conducto de antimateria",
      description:
        "Un conducto de plasma de la estación se ha fisurado y una nube de radiación gamma ionizante bloquea el paso hacia la lanzadera orbital.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los trajes espaciales alcanzaron el límite de radiación forzando un rodeo (-16% éxito).",
      timeoutPenalty: 16,
      options: [
        {
          id: "qte_espacio2_medico",
          label: "Inyectar radioprotector sintético y sellar los trajes EVA",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 70,
          winRateBonus: 16,
          winRatePenalty: 9,
          successText:
            "🩺 ¡Escudo biológico! La solución quelante protegió las células del equipo permitiendo cruzar la nube sin daño.",
          failText:
            "⚠️ El inyector de alta presión tardó en cargar la última dosis.",
        },
        {
          id: "qte_espacio2_hack",
          label: "Levantar campo magnético de confinamiento desde la consola",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 70,
          winRateBonus: 15,
          winRatePenalty: 10,
          successText:
            "💻 ¡Física orbital bajo control! El campo magnético recondujo el plasma al núcleo despejando el pasillo.",
          failText:
            "⚠️ La consola de órbita baja solicitó clave de dos pasos.",
        },
        {
          id: "qte_espacio2_infil",
          label: "Maniobra EVA por fuera de la estación reparando la fuga",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 10,
          lootBonusPct: 20,
          successText:
            "👨‍🚀 ¡Caminata espacial épica! Selló la fuga y recuperó una batería de antimateria abandonada (+20% botín).",
          failText:
            "⚠️ La atadura de seguridad se tensó peligrosamente con el viento solar.",
        },
        {
          id: "qte_espacio2_gen",
          label: "Cerrar las compuertas de plomo con la manivela manual",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 75,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "🛡️ A pulso en gravedad cero, la banda bajó la cortina de plomo blindada.",
          failText:
            "⚠️ La inercia hizo girar a dos miembros en el aire.",
        },
      ],
    },
    {
      title: "Emboscada de Centinelas Robóticos en el anillo de gravedad",
      description:
        "Dos robots de combate orbital con blindaje de grafeno y lásers pesados de pulso se despliegan en el pasillo de atraque.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los lásers fijaron a la banda impidiendo el acceso a la cápsula de huida (-16% éxito).",
      timeoutPenalty: 16,
      options: [
        {
          id: "qte_espacio3_tirador",
          label: "Disparo certero al núcleo de alimentación de plasma del robot líder",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 68,
          winRateBonus: 16,
          winRatePenalty: 10,
          successText:
            "🎯 ¡Impacto crítico! El núcleo del centinela reventó desconectando al segundo robot por sobretensión.",
          failText:
            "⚠️ El rebote del láser chamuscó el mamparo detrás del tirador.",
        },
        {
          id: "qte_espacio3_demo",
          label: "Granada EMP magnética de choque orbital",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 11,
          lootBonusPct: 20,
          successText:
            "💣 ¡Pulso electromagnético fulminante! Los circuitos de los androides se fundieron soltando módulos de datos confidenciales (+20% botín).",
          failText:
            "⚠️ El pulso apagó temporalmente las luces de emergencia del módulo.",
        },
        {
          id: "qte_espacio3_negoc",
          label: "Transmitir código maestro de mantenimiento en frecuencia militar",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 65,
          winRateBonus: 14,
          winRatePenalty: 9,
          successText:
            "🎙️ Suplantó la estación de control terrestre; los robots entraron en modo hibernación y abrieron la esclusa.",
          failText:
            "⚠️ El procesador del robot solicitó verificación de latencia terrestre.",
        },
        {
          id: "qte_espacio3_gen",
          label: "Cobertura tras mamparos de carga y fuego de distracción",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 75,
          winRateBonus: 6,
          winRatePenalty: 8,
          successText:
            "🛡️ La banda avanzó de mamparo en mamparo hasta alcanzar la compuerta de la nave.",
          failText:
            "⚠️ Un haz de láser rozó la mochila de transporte de muestras.",
        },
      ],
    },
  ],
};

export const DAVITO_QTE_GAUNTLET: HeistQteIncident[] = [
  {
    title: "Fisura Dimensional en el Umbral del Trono",
    description:
      "La realidad colapsa en fractales luminiscentes. Un desgarro del espacio-tiempo bloquea la entrada al Santuario de Davito emitiendo radiación cósmica.",
    timeoutText:
      "⏰ **¡Tiempo agotado!** La indecisión cósmica devoró la estabilidad del salto. El desgarro desestabilizó el portal (-0.10% éxito).",
    timeoutPenalty: 0.10,
    options: [
      {
        id: "qte_dav1_hack",
        label: "Sincronizar frecuencia cuántica armónica",
        emoji: "🌌",
        style: ButtonStyle.Primary,
        recommendedRole: "hacker",
        roleNameLabel: "Hacker",
        successChanceNonRole: 40,
        winRateBonus: 0.03,
        winRatePenalty: 0.08,
        successText:
          "🌌 ¡Sintonización milagrosa! Las ondas de fase estabilizaron la brecha hiperdimensional.",
        failText:
          "⚠️ La ecuación se bifurcó y la radiación cósmica sobrecargó la consola de salto.",
      },
      {
        id: "qte_dav1_infil",
        label: "Deslizarse por pliegues de sombra espacial",
        emoji: "🥷",
        style: ButtonStyle.Primary,
        recommendedRole: "infiltrador",
        roleNameLabel: "Infiltrador",
        successChanceNonRole: 38,
        winRateBonus: 0.03,
        winRatePenalty: 0.08,
        successText:
          "🥷 ¡Infiltración fantasma! Guió a la banda a través de los micro-pliegues sin alterar el continuo dimensional.",
        failText:
          "⚠️ Una fluctuación de gravedad rozó al equipo alertando a los sensores perimetrales.",
      },
      {
        id: "qte_dav1_tirador",
        label: "Disparo disruptor al nodo gravitatorio",
        emoji: "🎯",
        style: ButtonStyle.Danger,
        recommendedRole: "tirador",
        roleNameLabel: "Tirador",
        successChanceNonRole: 35,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "🎯 ¡Impacto subatómico! El disparo colapsó el vórtice temporal abriendo paso a la banda.",
        failText:
          "⚠️ El proyectil fue absorbido por la curvatura gravitacional aumentando la distorsión.",
      },
      {
        id: "qte_dav1_general",
        label: "Formación cerrada y avance a ciegas",
        emoji: "👥",
        style: ButtonStyle.Secondary,
        roleNameLabel: "Cualquiera",
        successChanceNonRole: 50,
        winRateBonus: 0.015,
        winRatePenalty: 0.06,
        successText:
          "✨ Muro táctico cerrado: la banda cruzó la brecha antes de que el vórtice se cerrara.",
        failText:
          "⚠️ El equipo se dispersó por la fuerza de marea perdiendo valiosos suministros.",
      },
    ],
  },
  {
    title: "El Ojo Cuántico: Ciberdefensa Omnipresente",
    description:
      "Una superinteligencia artificial conectada al trono de Davito rastrea el multiverso para reescribir la memoria biológica de los asaltantes y borrarlos.",
    timeoutText:
      "⏰ **¡Tiempo agotado!** El Ojo Cuántico fijó sus escáneres en la banda e inició el borrado existencial (-0.10% éxito).",
    timeoutPenalty: 0.10,
    options: [
      {
        id: "qte_dav2_hack",
        label: "Inyectar virus de recursión temporal infinita",
        emoji: "💻",
        style: ButtonStyle.Primary,
        recommendedRole: "hacker",
        roleNameLabel: "Hacker",
        successChanceNonRole: 42,
        winRateBonus: 0.03,
        winRatePenalty: 0.08,
        successText:
          "💻 ¡Paradoja inyectada! El Ojo Cuántico quedó atrapado en un bucle infinito de ceros y unos.",
        failText:
          "⚠️ El cortafuegos cuántico rebotó el malware friendo los dispositivos del equipo.",
      },
      {
        id: "qte_dav2_demo",
        label: "Micro-pulso de plasma concentrado",
        emoji: "💣",
        style: ButtonStyle.Danger,
        recommendedRole: "demoliciones",
        roleNameLabel: "Demoliciones",
        successChanceNonRole: 38,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "💥 ¡Detonación de plasma! Los sensores visuales del Ojo quedaron temporalmente calcinados.",
        failText:
          "⚠️ La detonación activó las torretas automáticas del techo del santuario.",
      },
      {
        id: "qte_dav2_cond",
        label: "Giro telemétrico en el ciberespacio",
        emoji: "🚗",
        style: ButtonStyle.Primary,
        recommendedRole: "conductor",
        roleNameLabel: "Conductor",
        successChanceNonRole: 35,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "🏎️ ¡Fuga de firmas térmicas! El piloto despistó al radar con un patrón caótico de telemetría.",
        failText:
          "⚠️ La IA anticipó la trayectoria y bloqueó las esclusas frontales.",
      },
      {
        id: "qte_dav2_general",
        label: "Desconectar radios y avance en silencio radio",
        emoji: "👥",
        style: ButtonStyle.Secondary,
        roleNameLabel: "Cualquiera",
        successChanceNonRole: 48,
        winRateBonus: 0.015,
        winRatePenalty: 0.06,
        successText:
          "🤫 Silencio total: sin emisiones electromagnéticas el Ojo perdió la señal del equipo.",
        failText:
          "⚠️ Un miembro tropezó con una baliza resonante encendiendo las luces rojas.",
      },
    ],
  },
  {
    title: "Inversión de Marea Gravitatoria",
    description:
      "El suelo de titanio se licúa y los vectores gravitatorios giran violentamente hacia una singularidad de antimateria.",
    timeoutText:
      "⏰ **¡Tiempo agotado!** La gravedad aplastó los trajes de la banda contra el mamparo (-0.10% éxito).",
    timeoutPenalty: 0.10,
    options: [
      {
        id: "qte_dav3_cond",
        label: "Giro hiperespacial compensado a velocidad luz",
        emoji: "🚗",
        style: ButtonStyle.Danger,
        recommendedRole: "conductor",
        roleNameLabel: "Conductor",
        successChanceNonRole: 40,
        winRateBonus: 0.03,
        winRatePenalty: 0.08,
        successText:
          "🏎️ ¡Aceleración antigravitatoria perfecta! La banda surfeó la onda expansiva sin tocar la singularidad.",
        failText:
          "⚠️ El propulsor tosió y la inercia deformó los sistemas de navegación.",
      },
      {
        id: "qte_dav3_infil",
        label: "Fijar arpeos cuánticos a los anclajes de vacío",
        emoji: "🥷",
        style: ButtonStyle.Primary,
        recommendedRole: "infiltrador",
        roleNameLabel: "Infiltrador",
        successChanceNonRole: 38,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "🥷 ¡Líneas de titanio disparadas al milímetro! El equipo quedó anclado con firmeza sobre el abismo.",
        failText:
          "⚠️ Un anclaje cedió y un cómplice estuvo a punto de ser absorbido.",
      },
      {
        id: "qte_dav3_tirador",
        label: "Impactar generador gravitatorio con bala cinética",
        emoji: "🎯",
        style: ButtonStyle.Primary,
        recommendedRole: "tirador",
        roleNameLabel: "Tirador",
        successChanceNonRole: 36,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "🎯 ¡Impacto certero! El rotor gravitatorio estalló neutralizando la fuerza de caída.",
        failText:
          "⚠️ La bala rebotó en el campo de fuerza sin frenar la anomalía.",
      },
      {
        id: "qte_dav3_general",
        label: "Fijar botas magnéticas y resistir la aceleración",
        emoji: "👥",
        style: ButtonStyle.Secondary,
        roleNameLabel: "Cualquiera",
        successChanceNonRole: 50,
        winRateBonus: 0.015,
        winRatePenalty: 0.06,
        successText:
          "🧲 Botas fijadas al suelo metálico: la banda apretó los dientes y aguantó la embestida.",
        failText:
          "⚠️ Las suelas patinaron por la fricción dañando los escudos del traje.",
      },
    ],
  },
  {
    title: "Tormenta de Taquiones y Paradoja Temporal",
    description:
      "El flujo temporal se bifurca. La banda empieza a ver ecos de su propio fracaso proyectados en el aire mientras los relojes marchan hacia atrás.",
    timeoutText:
      "⏰ **¡Tiempo agotado!** El bucle temporal atrapó la mente de los asaltantes (-0.10% éxito).",
    timeoutPenalty: 0.10,
    options: [
      {
        id: "qte_dav4_hack",
        label: "Cálculo de entrelazamiento para fijar el presente",
        emoji: "💻",
        style: ButtonStyle.Primary,
        recommendedRole: "hacker",
        roleNameLabel: "Hacker",
        successChanceNonRole: 40,
        winRateBonus: 0.03,
        winRatePenalty: 0.08,
        successText:
          "💻 ¡Constante temporal restablecida! La línea temporal se estabilizó disipando las ilusiones.",
        failText:
          "⚠️ El cálculo arrojó un error de división por cero y la paradoja se intensificó.",
      },
      {
        id: "qte_dav4_demo",
        label: "Detonar microcarga temporal para romper el bucle",
        emoji: "💣",
        style: ButtonStyle.Danger,
        recommendedRole: "demoliciones",
        roleNameLabel: "Demoliciones",
        successChanceNonRole: 36,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "💥 ¡Onda de choque cronológica! La explosión quebró el vórtice devolviendo el flujo a la normalidad.",
        failText:
          "⚠️ La explosión aceleró la tormenta taquiónica quemando sensores.",
      },
      {
        id: "qte_dav4_infil",
        label: "Moverse entre los microsegundos congelados",
        emoji: "🥷",
        style: ButtonStyle.Primary,
        recommendedRole: "infiltrador",
        roleNameLabel: "Infiltrador",
        successChanceNonRole: 38,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "🥷 ¡Paso cuántico! Guió a la banda a través de los instantes muertos del tiempo.",
        failText:
          "⚠️ El tiempo se reanudó de golpe desorientando al equipo.",
      },
      {
        id: "qte_dav4_general",
        label: "Sincronizar cronómetros analógicos y correr",
        emoji: "👥",
        style: ButtonStyle.Secondary,
        roleNameLabel: "Cualquiera",
        successChanceNonRole: 48,
        winRateBonus: 0.015,
        winRatePenalty: 0.06,
        successText:
          "🏃‍♂️ Siguiendo el tic-tac de un reloj de cuerda mecánico, la banda atravesó la tormenta.",
        failText:
          "⚠️ Las agujas del reloj giraron descontroladas sembrando el pánico.",
      },
    ],
  },
  {
    title: "Emboscada de la Guardia Celestial de Davito",
    description:
      "Una legión de centinelas astrales inmortales forjados en energía solar materializa empuñando alabardas de plasma fulminante.",
    timeoutText:
      "⏰ **¡Tiempo agotado!** La guardia celestial cargó con sus alabardas rodeando a la banda (-0.10% éxito).",
    timeoutPenalty: 0.10,
    options: [
      {
        id: "qte_dav5_tirador",
        label: "Fuego de supresión de plasma contra los núcleos",
        emoji: "🎯",
        style: ButtonStyle.Danger,
        recommendedRole: "tirador",
        roleNameLabel: "Tirador",
        successChanceNonRole: 42,
        winRateBonus: 0.03,
        winRatePenalty: 0.08,
        successText:
          "🎯 ¡Tiroteo legendario! Cada disparo de plasma detonó el núcleo de un centinela reduciéndolos a ceniza estelar.",
        failText:
          "⚠️ La ráfaga rebotó en los escudos solares y los centinelas cerraron el cerco.",
      },
      {
        id: "qte_dav5_demo",
        label: "Mina de fragmentación termobárica masiva",
        emoji: "💣",
        style: ButtonStyle.Danger,
        recommendedRole: "demoliciones",
        roleNameLabel: "Demoliciones",
        successChanceNonRole: 38,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "💥 ¡INFIERNO TERMOBÁRICO! La explosión desintegró la primera línea de la guardia.",
        failText:
          "⚠️ La metralla dañó el mamparo detrás de la banda cortando su retirada.",
      },
      {
        id: "qte_dav5_infil",
        label: "Apuñalar los catalizadores dorsales de éter",
        emoji: "🥷",
        style: ButtonStyle.Primary,
        recommendedRole: "infiltrador",
        roleNameLabel: "Infiltrador",
        successChanceNonRole: 36,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "🥷 ¡Ataque por la espalda! Desconectó a los capitanes astrales desactivando al resto de tropas.",
        failText:
          "⚠️ Un centinela detectó el filo de energía bloqueando el golpe.",
      },
      {
        id: "qte_dav5_general",
        label: "Muro de escudos balísticos y bengalas de distracción",
        emoji: "👥",
        style: ButtonStyle.Secondary,
        roleNameLabel: "Cualquiera",
        successChanceNonRole: 50,
        winRateBonus: 0.015,
        winRatePenalty: 0.06,
        successText:
          "🛡️ ¡Formación espartana! El resplandor de las bengalas cegó a los espectros ganando tiempo.",
        failText:
          "⚠️ El empuje de las alabardas agrietó los escudos frontales.",
      },
    ],
  },
  {
    title: "Los Siete Sellos del Núcleo del Vacío",
    description:
      "La Bóveda Suprema de Davito está protegida por 7 sellos cuánticos y cerrojos de aleación de estrella de neutrones. El botín de 100.000.000 está al otro lado.",
    timeoutText:
      "⏰ **¡Tiempo agotado!** El mecanismo de autodestrucción del tesoro inició su conteo (-0.10% éxito).",
    timeoutPenalty: 0.10,
    options: [
      {
        id: "qte_dav6_demo",
        label: "Desactivar los detonadores de antimateria del tesoro",
        emoji: "💣",
        style: ButtonStyle.Danger,
        recommendedRole: "demoliciones",
        roleNameLabel: "Demoliciones",
        successChanceNonRole: 40,
        winRateBonus: 0.03,
        winRatePenalty: 0.08,
        successText:
          "✂️ ¡Cables de antimateria neutralizados! Los detonadores se apagaron y la compuerta cedió.",
        failText:
          "⚠️ Un chispazo casi activa la espoleta de aniquilación.",
      },
      {
        id: "qte_dav6_hack",
        label: "Descifrar clave cuántica de 1024 qubits",
        emoji: "💻",
        style: ButtonStyle.Primary,
        recommendedRole: "hacker",
        roleNameLabel: "Hacker",
        successChanceNonRole: 38,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "💻 ¡Acceso concedido! Los 7 sellos se desbloquearon al unísono con un zumbido armónico.",
        failText:
          "⚠️ El sistema bloqueó el terminal central exigiendo autenticación divina.",
      },
      {
        id: "qte_dav6_tirador",
        label: "Disparo milimétrico al perno maestro de resonancia",
        emoji: "🎯",
        style: ButtonStyle.Primary,
        recommendedRole: "tirador",
        roleNameLabel: "Tirador",
        successChanceNonRole: 35,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "🎯 ¡Impacto perfecto! El cerrojo maestro se fracturó liberando las cerraduras auxiliares.",
        failText:
          "⚠️ El proyectil resbaló por la superficie de neutronio sin mella.",
      },
      {
        id: "qte_dav6_general",
        label: "Fuerza combinada con palancas de titanio puro",
        emoji: "👥",
        style: ButtonStyle.Secondary,
        roleNameLabel: "Cualquiera",
        successChanceNonRole: 48,
        winRateBonus: 0.015,
        winRatePenalty: 0.06,
        successText:
          "💪 Toda la banda empujó al unísono logrando entreabrir el acceso a la cámara.",
        failText:
          "⚠️ Las palancas se doblaron como mantequilla ante el peso de la puerta.",
      },
    ],
  },
  {
    title: "Colapso del Multiverso y Huida Imposible",
    description:
      "¡¡EL SANTUARIO ENTERO SE DILUYE EN UN AGUJERO NEGRO SUPERMASIVO!! La gravedad desgarra el espacio. Es ahora o la nada absoluta.",
    timeoutText:
      "⏰ **¡Tiempo agotado!** El horizonte de sucesos se tragó la nave de escape (-0.12% éxito).",
    timeoutPenalty: 0.12,
    options: [
      {
        id: "qte_dav7_cond",
        label: "Salto hiperespacial atravesando el horizonte de sucesos",
        emoji: "🚗",
        style: ButtonStyle.Danger,
        recommendedRole: "conductor",
        roleNameLabel: "Conductor",
        successChanceNonRole: 42,
        winRateBonus: 0.03,
        winRatePenalty: 0.08,
        successText:
          "🏎️ ¡MANIOBRA HISTÓRICA! El Conductor clavó el hiperpropulsor en el ángulo exacto emergiendo al espacio conocido con el botín intacto.",
        failText:
          "⚠️ La marea gravitacional casi parte la nave en dos durante el salto.",
      },
      {
        id: "qte_dav7_hack",
        label: "Abrir microbrecha de gusano hacia la dimensión de Nexo",
        emoji: "💻",
        style: ButtonStyle.Primary,
        recommendedRole: "hacker",
        roleNameLabel: "Hacker",
        successChanceNonRole: 38,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "💻 ¡Túnel cuántico abierto! La nave cruzó la grieta en el último milisegundo antes de la aniquilación.",
        failText:
          "⚠️ Las coordenadas se descalibraron enviando a la nave a la deriva.",
      },
      {
        id: "qte_dav7_demo",
        label: "Detonación de retropropulsión para salir despedidos",
        emoji: "💣",
        style: ButtonStyle.Danger,
        recommendedRole: "demoliciones",
        roleNameLabel: "Demoliciones",
        successChanceNonRole: 36,
        winRateBonus: 0.02,
        winRatePenalty: 0.08,
        successText:
          "💥 ¡Empuje colosal! La explosión catapultó la cápsula fuera del radio de atracción.",
        failText:
          "⚠️ La onda expansiva sacudió la nave apagando los motores secundarios.",
      },
      {
        id: "qte_dav7_general",
        label: "Propulsores al 300% y plegaria suprema a Davito",
        emoji: "👥",
        style: ButtonStyle.Secondary,
        roleNameLabel: "Cualquiera (Desesperada)",
        successChanceNonRole: 50,
        winRateBonus: 0.015,
        winRatePenalty: 0.06,
        successText:
          "✨ En un estallido de luz blanca, la nave rompió el cerco gravitacional contra toda ley física conocida.",
        failText:
          "⚠️ Los propulsores reventaron por sobrecalentamiento perdiendo velocidad.",
      },
    ],
  },
];

export const HEIST_QTE_INCIDENTS: Record<string, HeistQteIncident[]> = {
  ...HEIST_QTE_INCIDENTS_BASE,
  davito: DAVITO_QTE_GAUNTLET,
};

export function getHeistQteForTarget(targetId: string): HeistQteIncident {
  const list = HEIST_QTE_INCIDENTS[targetId] ?? HEIST_QTE_INCIDENTS.banco!;
  return list[Math.floor(Math.random() * list.length)]!;
}
