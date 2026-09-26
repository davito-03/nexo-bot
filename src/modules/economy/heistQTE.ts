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
        "⏰ **¡Indecisión fatal!** La banda dudó demasiado y los guardias encendieron sus linternas sobre el equipo. Se activó la alarma general antes de tiempo (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_banco1_infil",
          label: "Dardos somníferos desde ductos",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Tiro perfecto! Los tres guardias cayeron al suelo en completo silencio antes de ver nada. El perímetro sigue totalmente limpio.",
          failText:
            "⚠️ El dardo rebotó en el chaleco de kevlar de un guardia. Dio la voz de alerta antes de ser reducido a golpes.",
        },
        {
          id: "qte_banco1_hack",
          label: "Falsa alarma de incendio en P2",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Megafonía y aspersores de la planta 2 activados! La central desvía a los guardias escaleras arriba creyendo que hay fuego real.",
          failText:
            "⚠️ El cortafuegos del banco detectó la intrusión manual y selló las compuertas intermedias.",
        },
        {
          id: "qte_banco1_med",
          label: "Aerosol anestésico por la rejilla",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Vapor anestésico clínico! El gas somnífero durmió a la patrulla en segundos sin activar los sensores acústicos.",
          failText:
            "⚠️ La ventilación disipó el aerosol antes de que inhalaran suficiente dosis.",
        },
        {
          id: "qte_banco1_neg",
          label: "Imitar por radio al jefe de seguridad",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ ¡Frecuencia interceptada! Imitó la voz de mando del capitán ordenando a la patrulla subir a recepción por falsa emergencia.",
          failText:
            "⚠️ El sargento de patrulla reconoció una clave de llamada anticuada y sospechó.",
        },
        {
          id: "qte_banco1_demo",
          label: "Cegadora y asalto relámpago",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          lootBonusPct: 15,
          successText:
            "💥 ¡FLASHBANG! Cegados y aturdidos al instante, la banda los inmoviliza y les arrebata las llaves maestras (+15% botín).",
          failText:
            "⚠️ El estallido resonó en los huecos de ventilación y alertó a la central.",
        },
      ],
    },
    {
      title: "Cierre neumático de la Puerta Acorazada Central",
      description:
        "Las alarmas de sismicidad detectaron vibraciones en la pared este y la compuerta acorazada de 20 toneladas de hormigón y acero desciende en cuenta regresiva.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La compuerta se selló herméticamente. La banda tuvo que cortar un desvío perdiendo tiempo crucial (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_banco2_hack",
          label: "Inyectar bucle al microcontrolador neumático",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
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
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 7,
          lootBonusPct: 20,
          successText:
            "🔥 ¡La termita fundió el carril de titanio! La compuerta quedó trabada y reveló una caja de seguridad del suelo (+20% botín).",
          failText:
            "⚠️ La deflagración dobló la barra sin frenar el cierre de emergencia.",
        },
        {
          id: "qte_banco2_med",
          label: "Inyección de adrenalina para salto límite",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Dosis de adrenalina pura! Los reflejos de la banda se multiplicaron cruzando bajo el filo de la compuerta en el último segundo.",
          failText:
            "⚠️ Uno de los asaltantes resbaló al intentar el salto perdiendo parte del equipo.",
        },
        {
          id: "qte_banco2_neg",
          label: "Manipular por interfono a la central",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Fingiendo ser el técnico de mantenimiento hidráulico, convenció a la central de abortar el protocolo de sellado por falso positivo.",
          failText:
            "⚠️ El operador detectó inconsistencias en el código de empleado y confirmó el cierre.",
        },
        {
          id: "qte_banco2_gen",
          label: "Traba manual con gatos hidráulicos",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 48,
          winRateBonus: 2,
          winRatePenalty: 6,
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
        "⏰ **¡Tiempo agotado!** Los escoltas avanzaron en formación tortuga acorralando a la banda en el pasillo (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_banco3_tirador",
          label: "Disparo quirúrgico al visor del escudo",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Diana milimétrica! El proyectil desestabilizó el visor y ambos guardias retrocedieron desarmados.",
          failText:
            "⚠️ El proyectil rebotó en el bisel de acero alertando al segundo guardia.",
        },
        {
          id: "qte_banco3_infil",
          label: "Descolgarse por conducto y desarme trasero",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🥷 ¡Ataque por la espalda en completo silencio! Inmovilizó a los guardias y les quitó las llaves maestras (+15% botín).",
          failText:
            "⚠️ Una hebilla metálica chocó con el conducto alertando a la escolta.",
        },
        {
          id: "qte_banco3_med",
          label: "Gas neuro-paralizante y antídoto al equipo",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Aerosol clínico aturdidor! Los guardias cayeron dormidos al instante mientras la banda avanzaba inmune con respiradores.",
          failText:
            "⚠️ La ventilación del pasillo dispersó el gas antes de surtir efecto completo.",
        },
        {
          id: "qte_banco3_neg",
          label: "Amedrentar con falsos códigos judiciales",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Con aplomo implacable les convenció de que eran agentes federales ejecutando una orden de confiscación secreta.",
          failText:
            "⚠️ Los escoltas pidieron identificación oficial y abrieron fuego de supresión.",
        },
        {
          id: "qte_banco3_demo",
          label: "Carga de concusión para voltear escudos",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡ONDA EXPANSIVA! El pulso de concusión arrancó los escudos de cuajo dejando el pasillo libre.",
          failText:
            "⚠️ La onda de rebote desorientó también a los miembros de vanguardia.",
        },
      ],
    },
    {
      title: "Alarma de sensores sísmicos y despliegue de gas CS en pasillo este",
      description:
        "La perforación de una caja secundaria disparó sensores de presión subterráneos. Válvulas en el techo empiezan a verter gas lacrimógeno concentrado.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El gas irritante inundó el sector obligando a la banda a retroceder a ciegas (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_banco4_hack",
          label: "Anular sensores y cortar válvula de gas",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Compuerta neumática cerrada! El hacker anuló la secuencia de purga desde la placa de control.",
          failText:
            "⚠️ La terminal de mantenimiento exigió llave física denegando el cierre remoto.",
        },
        {
          id: "qte_banco4_demo",
          label: "Volar conducto de extracción para ventilar",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Tiro de tiro forzado! La explosión creó una chimenea de succión que expulsó el gas hacia la calle.",
          failText:
            "⚠️ El escombro taponó el pasillo dificultando el movimiento.",
        },
        {
          id: "qte_banco4_med",
          label: "Distribuir neutralizador químico y filtros",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Solución neutralizadora inmediata! Pulverizó un reactivo sobre los trajes que descompuso el gas lacrimógeno.",
          failText:
            "⚠️ El reactivo tardó en hacer efecto provocando ataques de tos en la banda.",
        },
        {
          id: "qte_banco4_neg",
          label: "Engañar a central: falsa fuga de gas doméstico",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Contactó con la central de bomberos para desviar el protocolo de seguridad y apagar las válvulas.",
          failText:
            "⚠️ La central confirmó que el sistema era automático y no atendió la llamada.",
        },
        {
          id: "qte_banco4_tirador",
          label: "Disparar a la electroválvula del techo",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Tiro al núcleo de la válvula! El mecanismo de corte colapsó sellando el paso de gas.",
          failText:
            "⚠️ El impacto perforó la tubería principal derramando más gas.",
        },
      ],
    },
    {
      title: "Bloqueo de ascensores blindados y corte de luz en el vestíbulo",
      description:
        "La subestación privada del banco cortó la iluminación de emergencia y los ascensores de carga quedaron atrapados entre dos niveles.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La oscuridad y el atasco paralizaron la operación en el vestíbulo (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_banco5_cond",
          label: "Conectar batería del furgón al montacargas",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Puente eléctrico con cables de alto amperaje! El montacargas descendió suavemente abriendo la vía de escape.",
          failText:
            "⚠️ Un fusible saltó por sobretensión retrasando la apertura del elevador.",
        },
        {
          id: "qte_banco5_hack",
          label: "Puenteo cuántico del generador auxiliar",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Luz de emergencia restaurada! El hacker reinició los controladores del ascensor en tiempo récord.",
          failText:
            "⚠️ El transformador se quemó definitivamente dejando todo a oscuras.",
        },
        {
          id: "qte_banco5_med",
          label: "Luces químicas y estimulantes de visión nocturna",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Quimioluminiscencia y colirio dilatador! La banda recuperó la visión de contraste al instante sin delatar su posición.",
          failText:
            "⚠️ Las barritas de luz no iluminaron lo suficiente el foso del ascensor.",
        },
        {
          id: "qte_banco5_neg",
          label: "Sobornar al operario del generador por radio",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Ofreció una transferencia anónima instantánea al técnico que reactivó la línea de servicio en silencio.",
          failText:
            "⚠️ El técnico rechazó la oferta y bloqueó la subestación manual.",
        },
        {
          id: "qte_banco5_infil",
          label: "Escalar cables del hueco y forzar compuerta",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🥷 ¡Escalada ágil! Alcanzó la trampilla de seguridad y liberó el contrapeso manual para liberar el paso.",
          failText:
            "⚠️ La grasa del cable resbaló casi provocando una caída al vacío.",
        },
      ],
    },
  ],
  casino: [
    {
      title: "Escáner térmico en el pasillo VIP de la Bóveda",
      description:
        "El acceso a las cámaras privadas del casino cuenta con sensores de calor corporal de grado militar que barren el suelo cada 3 segundos.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La firma de calor de la banda fue detectada por los sensores (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_casino1_hack",
          label: "Bucle térmico en circuito cerrado",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Bucle inyectado! Las cámaras térmicas muestran el pasillo a 18°C completamente vacío.",
          failText:
            "⚠️ El sistema detectó la anomalía de muestreo y alertó a seguridad.",
        },
        {
          id: "qte_casino1_demo",
          label: "Extintor criogénico de nitrógeno",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "❄️ ¡Golpe de frío! La nube de nitrógeno congeló el pasillo camuflando el avance del equipo.",
          failText:
            "⚠️ La válvula del extintor silbó ruidosamente llamando la atención.",
        },
        {
          id: "qte_casino1_med",
          label: "Gel de enfriamiento dérmico de combate",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Aislamiento térmico corporal! Aplicó una capa de gel clínico que redujo la firma infrarroja externa a temperatura ambiental.",
          failText:
            "⚠️ El gel se evaporó antes de tiempo revelando la silueta térmica de la banda.",
        },
        {
          id: "qte_casino1_neg",
          label: "Falsa pelea de millonarios en el salón VIP",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Contactó con el personal de sala provocando un altercado de alta apuesta que obligó a apagar los sensores.",
          failText:
            "⚠️ La seguridad del salón contuvo el conflicto sin desviar a los técnicos del escáner.",
        },
        {
          id: "qte_casino1_infil",
          label: "Acrobacia por las vigas del falso techo",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🥷 Avanzó sobre las estructuras superiores fuera del cono de visión de los sensores.",
          failText:
            "⚠️ Una placa de escayola cedió desprendiendo polvo sobre el suelo.",
        },
      ],
    },
    {
      title: "Ronda imprevista del Director y la escolta de la Mafia",
      description:
        "El director del casino y tres sicarios armados de la mafia local bajan en ascensor privado para revisar la recaudación de la mesa central.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El director se topó de frente con la banda activando la alarma de atraco (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_casino2_tirador",
          label: "Disparos silenciados a las luces superiores",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Luces fuera! La oscuridad repentina provocó el repliegue del director y su escolta.",
          failText:
            "⚠️ Uno de los casquillos tintineó contra el mármol alarmando a los escoltas.",
        },
        {
          id: "qte_casino2_infil",
          label: "Ocultar a la banda en el montacargas de champán",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🥷 La banda se desvaneció tras las cajas de reserva de Moët & Chandon mientras la mafia pasaba de largo.",
          failText:
            "⚠️ Una botella cayó al suelo rompiéndose frente a la comitiva.",
        },
        {
          id: "qte_casino2_med",
          label: "Sedante cutáneo al escolta rezagado",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Contacto fulminante! El dardo anestésico durmió al último escolta que fue arrastrado al almacén sin sospechas.",
          failText:
            "⚠️ El escolta soltó un quejido antes de caer llamando la atención de sus compañeros.",
        },
        {
          id: "qte_casino2_neg",
          label: "Hacerse pasar por inspectores de juego estatales",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🎙️ Con traje impecable y placa falsa intimidó al director exigiéndole registros fiscales (+15% botín).",
          failText:
            "⚠️ El director reconoció que la inspección no correspondía a su horario habitual.",
        },
        {
          id: "qte_casino2_cond",
          label: "Hacer sonar la alarma del coche del director",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🏎️ Hackeó el llavero remoto del Rolls-Royce del director; la escolta subió corriendo al garaje.",
          failText:
            "⚠️ La frecuencia del mando no llegó al aparcamiento subterráneo.",
        },
      ],
    },
    {
      title: "Gas somnífero en el túnel de las cajas de seguridad",
      description:
        "La apertura forzada de la caja mayor liberó una cortina de gas éter narcótico que llena rápidamente la estancia sellada.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El equipo inhaló gas tóxico sufriendo desmayos y retraso en el saqueo (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_casino3_hack",
          label: "Invertir ventilación desde el panel maestro",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Flujo invertido! Las turbinas del casino succionaron todo el gas hacia el exterior en 10 segundos.",
          failText:
            "⚠️ El panel solicitó doble factor físico impidiendo la inversión del aire.",
        },
        {
          id: "qte_casino3_demo",
          label: "Volar rejilla superior con cordón detonante",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Apertura de tiro de aire! La detonación despejó la atmósfera viciada de la cámara.",
          failText:
            "⚠️ La explosión provocó desprendimiento de azulejos en la sala.",
        },
        {
          id: "qte_casino3_med",
          label: "Inyectar antídoto de narcosis y repartir filtros",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Efecto inmediato! El estimulante pulmonar protegió al equipo permitiendo recoger el botín sin toser.",
          failText:
            "⚠️ Dos miembros no recibieron la dosis a tiempo y quedaron aturdidos.",
        },
        {
          id: "qte_casino3_neg",
          label: "Megafonía: evacuación preventiva por fuga",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🎙️ Sembró el caos en recepción ordenando al personal abrir las salidas de emergencia de la cámara.",
          failText:
            "⚠️ El jefe de seguridad bloqueó las puertas automáticas.",
        },
        {
          id: "qte_casino3_gen",
          label: "Contener la respiración y forzar esclusa",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 48,
          winRateBonus: 2,
          winRatePenalty: 6,
          successText:
            "💪 Pulmones de hierro: la banda aguantó el aire y empujó la salida hasta el sector limpio.",
          failText:
            "⚠️ La fatiga obligó a respirar hondo inhalando parte del narcótico.",
        },
      ],
    },
    {
      title: "Bloqueo biométrico facial en la sala de ruletas VIP",
      description:
        "La esclusa blindada hacia la cámara de lingotes exige escaneo retiniano y reconocimiento 3D del croupier jefe para abrirse.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El escáner se bloqueó al no detectar usuario autorizado (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_casino4_infil",
          label: "Proyectar holograma de retina del croupier",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🥷 ¡Lector burlado! Usó una captura de alta resolución del iris del croupier abriendo la compuerta.",
          failText:
            "⚠️ La luz ambiental reflejó en la lente distorsionando el iris.",
        },
        {
          id: "qte_casino4_hack",
          label: "Inyectar hash falso en la base biométrica",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Hash sobrescrito! El escáner reconoció a cualquier miembro como administrador general.",
          failText:
            "⚠️ El cortafuegos biométrico cifró la memoria del lector.",
        },
        {
          id: "qte_casino4_med",
          label: "Molde dérmico con gel termoplástico clínico",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Prótesis dérmica express! Replicó los rasgos faciales exactos con silicona médica engañando al sensor.",
          failText:
            "⚠️ El escáner detectó temperatura estática no viva en la máscara.",
        },
        {
          id: "qte_casino4_neg",
          label: "Engatusar al croupier para que mire al sensor",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🎙️ Con psicología persuasiva y promesa de inmunidad, convenció al croupier de desbloquear la cámara (+15% botín).",
          failText:
            "⚠️ El croupier se resistió gritando auxilio a los guardias.",
        },
        {
          id: "qte_casino4_demo",
          label: "Cortocircuitar el lector con descarga estática",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "⚡ ¡Arco voltaico en la placa! El pestillo magnético se liberó por fallo de energía seguro.",
          failText:
            "⚠️ La descarga fundió los electroimanes bloqueando la puerta cerrada.",
        },
      ],
    },
    {
      title: "Ataque de los perros de presa de la seguridad en los sótanos",
      description:
        "Dos rottweilers entrenados por mercenarios de la mafia son soltados por el pasillo de servicio ladrando furiosos hacia la banda.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los perros mordieron a la vanguardia provocando caos y disparos ruidosos (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_casino5_tirador",
          label: "Fuego disuasorio al suelo para ahuyentarlos",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Disparos certeros! El chisporroteo en el hormigón asustó a los canes que retrocedieron aterrados.",
          failText:
            "⚠️ Las detonaciones resonaron por el hueco del montacargas alertando a la mafia.",
        },
        {
          id: "qte_casino5_cond",
          label: "Embestir verja con carretilla elevadora",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Maniobra con la carretilla! Bajó las palas de acero creando una barrera insuperable.",
          failText:
            "⚠️ El motor de la carretilla se caló al primer tirón.",
        },
        {
          id: "qte_casino5_med",
          label: "Dardos con xilacina veterinaria de acción ultra-rápida",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Doble impacto anestésico! Ambos animales se desplomaron plácidamente dormidos sin sufrir daño.",
          failText:
            "⚠️ Uno de los dardos falló el músculo y el animal siguió corriendo.",
        },
        {
          id: "qte_casino5_neg",
          label: "Silbato ultrasónico y órdenes caninas profesionales",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Imitó las órdenes del adiestrador en alemán militar: los perros se sentaron sumisos al instante.",
          failText:
            "⚠️ Los animales no respondieron a las órdenes extrañas.",
        },
        {
          id: "qte_casino5_demo",
          label: "Granada de magnesio cegador",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Destello cegador ensordecedor! Los perros huyeron despavoridos hacia el patio.",
          failText:
            "⚠️ El resplandor dejó deslumbrado al conductor durante unos minutos.",
        },
      ],
    },
  ],
  mansion: [
    {
      title: "Perros de presa sueltos en el jardín zen",
      description:
        "La oligarca mantiene sueltos dogos argentinos entrenados que patrullan los senderos de grava alrededor de la pinacoteca.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los ladridos rompieron el silencio nocturno activando los reflectores perimetrales (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_mansion1_tirador",
          label: "Dardos tranquilizantes desde la barandilla",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Dos disparos silenciosos! Los guardianes cayeron dormidos sobre el césped sin soltar un gruñido.",
          failText:
            "⚠️ Un proyectil rozó un tiesto de piedra despertando el interés de los animales.",
        },
        {
          id: "qte_mansion1_infil",
          label: "Avanzar por sauces llorones en sigilo",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🥷 Paso felino entre sombras y ramas: la banda cruzó a escasos metros sin ser percibida.",
          failText:
            "⚠️ Una rama seca crujió bajo las botas alertando a la jauría.",
        },
        {
          id: "qte_mansion1_med",
          label: "Cebo con feromonas calmantes y somnífero oral",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Cebo químico perfecto! Los perros devoraron la golosina medicalizada y se durmieron al momento.",
          failText:
            "⚠️ Los animales olieron el fármaco y rechazaron el cebo.",
        },
        {
          id: "qte_mansion1_neg",
          label: "Llamar al interfono para distraer cuidadores",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Fingió ser mensajería nocturna con entrega urgente de caviar llamando a los cuidadores al portal exterior.",
          failText:
            "⚠️ El mayordomo respondió que no esperaban pedidos a deshoras.",
        },
        {
          id: "qte_mansion1_demo",
          label: "Petardo sónico en valla opuesta",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Distracción sonora calculada! La jauría corrió hacia la valla norte dejando el sur despejado.",
          failText:
            "⚠️ La detonación sonó demasiado cerca de los dormitorios de los guardias.",
        },
      ],
    },
    {
      title: "Malla láser volumétrica y losas de presión en la pinacoteca",
      description:
        "Cuadros valorados en decenas de millones están protegidos por haces invisibles entrecruzados y un suelo de mármol sensible al peso.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Un haz láser rozó la mochila de un cómplice haciendo saltar la alarma (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_mansion2_infil",
          label: "Acrobacia milimétrica entre los haces",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 20,
          successText:
            "🥷 ¡Flexibilidad absoluta! Descolgó la obra cumbre sin pisar una sola losa sensible (+20% botín).",
          failText:
            "⚠️ La hebilla del cinturón rozó un haz infrarrojo periférico.",
        },
        {
          id: "qte_mansion2_hack",
          label: "Desincronizar la frecuencia del generador láser",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Frecuencia apagada! Los haces se desvanecieron durante 30 segundos permitiendo pasar caminando.",
          failText:
            "⚠️ El sistema conmutó a batería autónoma reiniciando la malla.",
        },
        {
          id: "qte_mansion2_med",
          label: "Bloqueadores beta para pulso y temblores cero",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Pulso de cirujano! La dosis estabilizó el pulso de los miembros evitando cualquier vacilación motora.",
          failText:
            "⚠️ Una bajada brusca de tensión provocó mareo en el portador del lienzo.",
        },
        {
          id: "qte_mansion2_neg",
          label: "Contactar con seguridad fingiendo ser la oligarca",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🎙️ Con sintetizador de voz ordenó apagar la sala para cambiar la exposición de arte.",
          failText:
            "⚠️ El vigilante exigió la contraseña secreta del contrato privado.",
        },
        {
          id: "qte_mansion2_demo",
          label: "Espejos refractarios y polvo revelador",
          emoji: "💣",
          style: ButtonStyle.Secondary,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "✨ El polvo de tiza reveló toda la cuadrícula y los espejos desviaron los sensores de disparo.",
          failText:
            "⚠️ Una nube excesiva de polvo bloqueó los fotodiodos activando la alarma.",
        },
      ],
    },
    {
      title: "Emboscada de mercenarios en el garaje de superdeportivos",
      description:
        "Cuatro mercenarios armados de la guardia privada cortan la salida principal apostados tras los deportivos de colección.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La guardia mercenaria abrió fuego cruzado inmovilizando al equipo (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_mansion3_tirador",
          label: "Fuego selectivo a los neumáticos y motores",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Inmovilización total! Los disparos perforaron los bloques de motor dejando sin cobertura a los mercenarios.",
          failText:
            "⚠️ Los rebotes en el blindaje de los coches forzaron la retirada.",
        },
        {
          id: "qte_mansion3_cond",
          label: "Embestir con un Bugatti para abrir la reja",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Acelerón a fondo! Reventó los portones blindados y arrastró a la escolta fuera de posición.",
          failText:
            "⚠️ El inmovilizador electrónico del coche bloqueó la transmisión.",
        },
        {
          id: "qte_mansion3_med",
          label: "Estabilizar heridos con coagulante y morfina",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Atención bajo fuego! Parcheó rozaduras de metralla y mantuvo a toda la banda combatiendo al 100%.",
          failText:
            "⚠️ Un miembro requirió torniquete improvisado perdiendo movilidad.",
        },
        {
          id: "qte_mansion3_neg",
          label: "Ofrecer soborno en criptomonedas a los mercenarios",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ 'Cobráis 5k al mes por morir por una millonaria; os doy 200k en Monero si miráis hacia otro lado.' Los guardias bajaron las armas.",
          failText:
            "⚠️ El comandante mercenario se negó y ordenó disparar.",
        },
        {
          id: "qte_mansion3_demo",
          label: "Volar columna del garaje para pantalla de humo",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Derrumbe de yeso y escombros! La densa polvareda permitió a la banda escabullirse sin un rasguño.",
          failText:
            "⚠️ Los cascotes dañaron el eje trasero del furgón de escape.",
        },
      ],
    },
    {
      title: "Sala de pánico blindada activada por la oligarca",
      description:
        "La oligarca se atrincheró en una habitación de hormigón armado de 50cm con cerradura biométrica y botón de llamada a los SWAT.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La llamada a las fuerzas especiales se completó acortando el tiempo de escape (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_mansion4_hack",
          label: "Interrumpir la antena de enlace por satélite",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Llamada cancelada! El hacker cortó la emisión satelital dejando la sala incomunicada.",
          failText:
            "⚠️ El enlace saltó a la red de fibra óptica submarina antes de cortar.",
        },
        {
          id: "qte_mansion4_demo",
          label: "Termita líquida en las bisagras de la compuerta",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 7,
          lootBonusPct: 20,
          successText:
            "🔥 ¡Bisagras fundidas! La puerta cedió revelando la caja fuerte personal con diamantes (+20% botín).",
          failText:
            "⚠️ El acero templado resistió el calor consumiendo la carga de termita.",
        },
        {
          id: "qte_mansion4_med",
          label: "Inyectar gas anestésico no letal por el respiradero",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Dormida en 20 segundos! La oligarca cayó inconsciente soltando el mando de la caja de caudales.",
          failText:
            "⚠️ La sala activó el filtro de recirculación autónomo bloqueando el gas.",
        },
        {
          id: "qte_mansion4_neg",
          label: "Convencer a la oligarca por el intercomunicador",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🎙️ Con calma diplomática le aseguró que su vida no corría peligro si desbloqueaba la cámara voluntariamente (+15% botín).",
          failText:
            "⚠️ La oligarca se atrincheró en silencio esperando a la policía.",
        },
        {
          id: "qte_mansion4_infil",
          label: "Colarse por el conducto técnico del techo",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🥷 Encontró una rejilla de mantenimiento y cayó dentro de la sala abriendo desde el interior.",
          failText:
            "⚠️ El conducto era demasiado estrecho para deslizarse con el equipo.",
        },
      ],
    },
    {
      title: "Torretas ocultas de dardos neurotóxicos en la bodega subterránea",
      description:
        "Al entrar en la cava subterránea donde se ocultan los lingotes, paneles de roble se deslizan revelando torretas de dardos de precisión.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Las torretas dispararon una ráfaga de dardos paralizantes (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_mansion5_tirador",
          label: "Destruir sensores ópticos de las torretas",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Dos disparos milimétricos! Destrozó las ópticas de guiado dejando las torretas ciegas.",
          failText:
            "⚠️ Un dardo rozó la manga del chaleco antes de que pudiera apuntar.",
        },
        {
          id: "qte_mansion5_hack",
          label: "Reescribir el firmware de puntería",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Torretas reprogramadas! Apuntaron hacia la puerta trasera bloqueando a los guardias.",
          failText:
            "⚠️ El bus de datos estaba protegido con cifrado físico.",
        },
        {
          id: "qte_mansion5_med",
          label: "Inyecciones profilácticas de atropina",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Inmunidad neurotóxica! Los dardos que impactaron no surtieron efecto gracias a la profilaxis previa.",
          failText:
            "⚠️ Uno de los cómplices sufrió taquicardia por la dosis de choque.",
        },
        {
          id: "qte_mansion5_neg",
          label: "Recitar la clave verbal de apagado de emergencia",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Usó la frase de anulación de seguridad que sonsacó al mayordomo: las torretas se recogieron en el panel.",
          failText:
            "⚠️ La clave estaba desactualizada y el sistema no respondió.",
        },
        {
          id: "qte_mansion5_cond",
          label: "Usar barriles de roble macizo como escudo rodante",
          emoji: "🚗",
          style: ButtonStyle.Secondary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🛡️ Rodó tres barriles de vino de 200 litros absorbiendo toda la andanada de dardos.",
          failText:
            "⚠️ Un barril reventó derramando vino y resbalando en el suelo.",
        },
      ],
    },
  ],
  museo: [
    {
      title: "Campana de vacío blindada sobre el Sarcófago Imperial",
      description:
        "La reliquia más valiosa del museo descansa bajo una campana de cristal balístico hermética conectada a sensores barométricos.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La alteración de presión selló el sarcófago en un foso blindado subterráneo (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_museo1_hack",
          label: "Hackear el presostato y anular la alarma",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Sensor equilibrado! La campana se elevó suavemente sin que la aguja de presión se moviera un ápice.",
          failText:
            "⚠️ Una fluctuación de vacío encendió las luces ámbar de alerta.",
        },
        {
          id: "qte_museo1_demo",
          label: "Corte térmico en la base de anclaje",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          lootBonusPct: 15,
          successText:
            "🔥 ¡Corte limpio con soplete de plasma! Liberó la peana y se llevó las joyas del sarcófago (+15% botín).",
          failText:
            "⚠️ El humo del corte activó los aspersores automáticos.",
        },
        {
          id: "qte_museo1_med",
          label: "Enfriador criogénico médico para fracturar el vidrio",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Choque térmico molecular! Aplicó nitrógeno clínico congelando el cristal balístico que quebró en silencio sin estruendo.",
          failText:
            "⚠️ El grosor del vidrio requería más refrigerante del disponible.",
        },
        {
          id: "qte_museo1_neg",
          label: "Engañar al conservador por el teléfono de sala",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Fingió ser el director general ordenando la apertura para un traslado urgente a la cámara acorazada.",
          failText:
            "⚠️ El conservador desconfió y llamó a los vigilantes de guardia.",
        },
        {
          id: "qte_museo1_infil",
          label: "Sustituir la reliquia con réplica de igual masa",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🥷 Cambio a mano alzada perfecto: el sensor de balanza no notó la milésima de gramo de diferencia.",
          failText:
            "⚠️ La réplica pesaba 10 gramos de más activando el zumbador.",
        },
      ],
    },
    {
      title: "Cierre perimetral de compuertas de mármol en la Galería Egipcia",
      description:
        "Portones monumentales de losas de mármol de 15 toneladas descienden por gravedad bloqueando todas las salidas del ala este.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Las losas tocaron el suelo encerrando a la banda en el pabellón (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_museo2_demo",
          label: "Dinamitar el quicio de la compuerta",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 7,
          successText:
            "💥 ¡Quicio quebrado! La losa cayó torcida encajándose en la pared y dejando un metro libre de paso.",
          failText:
            "⚠️ La explosión astilló el mármol bloqueando el hueco con cascotes.",
        },
        {
          id: "qte_museo2_cond",
          label: "Trabar con gato de elevación pesado",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ Colocó el gato hidráulico de 30 toneladas resistiendo el descenso hasta que todos salieron.",
          failText:
            "⚠️ El gato patinó en el mármol pulido soltando la compuerta.",
        },
        {
          id: "qte_museo2_med",
          label: "Atender aplastamientos y suministrar analgésicos",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Auxilio inmediato! Rescató a un cómplice con la pierna atrapada administrando analgésico y férula rápida.",
          failText:
            "⚠️ La atención médica retrasó la salida de la retaguardia.",
        },
        {
          id: "qte_museo2_neg",
          label: "Activar megafonía de evacuación de patrimonio",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Emitió código de desastre nacional; los sistemas del museo abrieron las salidas por protocolo legal.",
          failText:
            "⚠️ El sistema de seguridad local no respondió a la megafonía.",
        },
        {
          id: "qte_museo2_hack",
          label: "Invertir cabrestantes eléctricos del contrapeso",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "💻 ¡Motores invertidos! Las losas comenzaron a subir de nuevo con un quejido mecánico.",
          failText:
            "⚠️ Los cables de tracción se partieron por sobretensión.",
        },
      ],
    },
    {
      title: "Trampa de gas narcótico milenario en la Cripta Arcana",
      description:
        "Al retirar una estela funeraria dorada, un mecanismo de contrapeso antiguo abrió conductos que liberan vapores alucinógenos.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La banda empezó a ver ilusiones y perder el sentido de la orientación (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_museo3_infil",
          label: "Localizar y taponar boquillas de bronce",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🥷 ¡Taponamiento quirúrgico! Selló las gárgolas de bronce con masilla epoxi antes de que el gas llenara la sala.",
          failText:
            "⚠️ Una boquilla oculta en el suelo continuó emitiendo vapor.",
        },
        {
          id: "qte_museo3_hack",
          label: "Activar extractores de humedad del archivo",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Deshumidificadores al 200%! Los filtros industriales purificaron el aire de la cripta en segundos.",
          failText:
            "⚠️ El cuadro de ventilación del siglo XIX no tenía conexión remota.",
        },
        {
          id: "qte_museo3_med",
          label: "Mascarillas con carbón activado y sales de amonio",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Inhaladores estimulantes y filtros! Despejó la mente de los cómplices devolviéndoles la compostura táctica.",
          failText:
            "⚠️ Uno de los asaltantes entró en trance hipnótico retrasando la marcha.",
        },
        {
          id: "qte_museo3_neg",
          label: "Calmar al equipo y mantener la cadena humana",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Con voz firme y serena guió a ciegas a todos los miembros evitando el pánico y las alucinaciones.",
          failText:
            "⚠️ La histeria colectiva provocó que dos miembros se desorientaran.",
        },
        {
          id: "qte_museo3_demo",
          label: "Boquete en muro lateral para renovar el aire",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Brecha de ventilación! El aire fresco del patio barrió los vapores al instante.",
          failText:
            "⚠️ La onda quebró una vitrina de cerámicas activando un sensor acústico.",
        },
      ],
    },
    {
      title: "Sensores sónicos ultrasensibles en la Sala de Gemas de la Corona",
      description:
        "Micrófonos de alta fidelidad calibrados para detectar pasos, respiraciones o caídas de alfileres vigilan la vitrina de diamantes.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Un ruido superior a 15 decibelios disparó la alarma de intrusión sonora (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_museo4_hack",
          label: "Onda de cancelación de fase sónica en micros",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Silencio absoluto! Generó una contrafase acústica que anuló todas las entradas de audio en tiempo real.",
          failText:
            "⚠️ El procesador sónico detectó el silencio artificial sospechoso.",
        },
        {
          id: "qte_museo4_infil",
          label: "Pisar sobre almohadillas de fieltro sin sonido",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🥷 Movimiento espectral: no generó ni un solo decibelio recogiendo las gemas con guantes de seda (+15% botín).",
          failText:
            "⚠️ Una cremallera metálica rozó la urna produciendo un tintineo.",
        },
        {
          id: "qte_museo4_med",
          label: "Anestésico articular para evitar crujidos óseos",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Articulaciones lubricadas y sedadas! Evitó chasquidos de rodillas y tobillos en la aproximación al pedestal.",
          failText:
            "⚠️ La falta de sensibilidad en los dedos casi provoca la caída de una joya.",
        },
        {
          id: "qte_museo4_neg",
          label: "Bucle de música clásica ambiental de fondo",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Conectó el hilo musical de Vivaldi al volumen exacto para enmascarar los ruidos de manipulación de la urna.",
          failText:
            "⚠️ El operador de audio notó que la lista de reproducción se había reiniciado.",
        },
        {
          id: "qte_museo4_tirador",
          label: "Silenciar receptor principal del techo con balín",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Impacto ciego al cable maestro! Cortó la línea de señal del micrófono sin provocar chispas.",
          failText:
            "⚠️ El balín rebotó en la cúpula dorada sonando en todos los sensores.",
        },
      ],
    },
    {
      title: "Ronda de vigilantes con chalecos pesados en la Terraza Acristalada",
      description:
        "Cuatro vigilantes con armas cortas y linternas barren la terraza de cristal que conecta la sala de joyas con el patio exterior.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los vigilantes rodearon la salida forzando un tiroteo abierto (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_museo5_tirador",
          label: "Dardos eléctricos simultáneos a los dos líderes",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Doble taser de precisión! Los guardias cayeron desmadejados al suelo sin soltar la linterna.",
          failText:
            "⚠️ Uno de los dardos impactó en la placa metálica del uniforme.",
        },
        {
          id: "qte_museo5_demo",
          label: "Dinamitar claraboya lejana como señuelo",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Estruendo lejano! Todos los guardias salieron disparados hacia el ala oeste dejando la terraza libre.",
          failText:
            "⚠️ Dos guardias se quedaron vigilando la retaguardia descubriendo a la banda.",
        },
        {
          id: "qte_museo5_med",
          label: "Cápsula de humo lacrimógeno con respiradores",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Nube cegadora e irritante! Los vigilantes cayeron de rodillas tosiendo mientras la banda pasaba inmune.",
          failText:
            "⚠️ El viento de la terraza dispersó la nube antes de tiempo.",
        },
        {
          id: "qte_museo5_neg",
          label: "Fingir ser inspectores de seguros de la aseguradora Lloyd's",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Con carpetas en mano y tono severo los regañó por no vigilar el ala norte; los guardias se cuadraron avergonzados.",
          failText:
            "⚠️ El sargento exigió ver las credenciales selladas.",
        },
        {
          id: "qte_museo5_cond",
          label: "Lanzar tirolina hacia la furgoneta abajo",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Cable de escape tensado! La banda se deslizó por encima de las cabezas de los vigilantes directo al vehículo.",
          failText:
            "⚠️ El mosquetón se trabó en la barandilla de hierro.",
        },
      ],
    },
  ],
  tren_blindado: [
    {
      title: "Torretas automáticas de techo en túnel de montaña",
      description:
        "Al entrar al túnel de 4 kilómetros, torretas automáticas infrarrojas se despliegan desde el techo del vagón blindado disparando ráfagas continuas.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El fuego de las torretas barrió el pasillo central del convoy (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_tren1_hack",
          label: "Pulso EMP contra el receptor de las torretas",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Descarga electrónica! Los servomotores chisporrotearon y las armas quedaron apuntando inertes al techo.",
          failText:
            "⚠️ El blindaje de plomo de la torreta absorbió el pulso electromagnético.",
        },
        {
          id: "qte_tren1_tirador",
          label: "Disparo al sensor LIDAR en plena oscuridad",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Diana al ojo de cristal! La torreta perdió la fijación de blancos girando desorientada.",
          failText:
            "⚠️ El vaivén del tren en la curva desvió el proyectil.",
        },
        {
          id: "qte_tren1_med",
          label: "Tratar quemaduras de metralla con spray dérmico",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Cura instantánea bajo fuego! Cerró heridas de metralla y aplicó vendaje hemostático manteniendo el avance.",
          failText:
            "⚠️ Un miembro herido perdió agarre en el pasamanos.",
        },
        {
          id: "qte_tren1_neg",
          label: "Interferir la radio con falsa alerta militar",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Emitió código de cese de fuego militar fingiendo ser el tren de escolta que venía detrás.",
          failText:
            "⚠️ El sistema automatizado de torretas no procesó la orden verbal.",
        },
        {
          id: "qte_tren1_demo",
          label: "Granada de plasma al soporte del cañón",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Soporte desintegrado! La torreta cayó rodando por el techo del vagón hacia el foso del túnel.",
          failText:
            "⚠️ La explosión abolló el techo sobre las cabezas de la banda.",
        },
      ],
    },
    {
      title: "Desacople magnético del vagón del tesoro en plena curva",
      description:
        "La tripulación militar activa los electroimanes de desacople para soltar el vagón acorazado y dejarlo varado en un desfiladero a 140 km/h.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El vagón se desacopló y comenzó a frenar en el abismo (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_tren2_cond",
          label: "Acelerar y trabar topes de enganche manual",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Maniobra milimétrica entre vagones! Clavó el pasador de acero en plena sacudida manteniendo el tren unido.",
          failText:
            "⚠️ La inercia de la curva casi lo arroja por el espacio entre vagones.",
        },
        {
          id: "qte_tren2_demo",
          label: "Soldar los enganches con antorcha de magnesio",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 7,
          lootBonusPct: 15,
          successText:
            "🔥 ¡Soldadura relámpago de emergencia! Los ganchos quedaron sellados en una masa de hierro incandescente (+15% botín).",
          failText:
            "⚠️ Las chispas quemaron los conductos de freno del bogie.",
        },
        {
          id: "qte_tren2_med",
          label: "Tratar traumatismos y latigazos por el tirón",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Inmovilización cervical express! Atendió a los asaltantes golpeados por el frenazo y los puso en pie.",
          failText:
            "⚠️ Uno de los cómplices quedó conmocionado en el suelo.",
        },
        {
          id: "qte_tren2_neg",
          label: "Sobornar por interfono al maquinista de cola",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Prometió un lingote de oro puro al maquinista de apoyo si desactivaba el desacople magnético.",
          failText:
            "⚠️ El maquinista activó el cierre hermético de su cabina.",
        },
        {
          id: "qte_tren2_hack",
          label: "Sobrescribir bus CAN del sistema de tracción",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Comando de desacople cancelado! Bloqueó los actuadores neumáticos forzando el acople continuo.",
          failText:
            "⚠️ El bus de datos entró en modo a prueba de fallos.",
        },
      ],
    },
    {
      title: "Emboscada del escuadrón ferroviario en el vagón comedor",
      description:
        "Ocho comandos armados con fusiles de asalto forman una barricada tras las mesas de acero del vagón comedor disparando sin cuartel.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El escuadrón ferroviario cercó a la banda entre dos vagones (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_tren3_tirador",
          label: "Fuego cruzado desde las ventanas exteriores",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Tirador apostado en el estribo exterior! Neutralizó a los dos ametralladores permitiendo el asalto.",
          failText:
            "⚠️ El viento lateral desvió la trayectoria de los proyectiles.",
        },
        {
          id: "qte_tren3_infil",
          label: "Avanzar por debajo de las mesas blindadas",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🥷 ¡Desarme relámpago! Se deslizó por el pasillo inferior y despojó al capitán de sus cargadores y llaves (+15% botín).",
          failText:
            "⚠️ Un guardia lo descubrió con la linterna táctica.",
        },
        {
          id: "qte_tren3_med",
          label: "Botiquín de combate y torniquetes bajo fuego",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Asistencia heroica! Arrastró a los heridos a resguardo y aplicó torniquetes manteniendo la línea de combate.",
          failText:
            "⚠️ El material médico cayó rodando por el pasillo del vagón.",
        },
        {
          id: "qte_tren3_neg",
          label: "Ofrecer pacto de rendición honrosa a los soldados",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Con megáfono militar les ofreció conservar sus vidas y una gratificación si deponían las armas; los soldados cedieron.",
          failText:
            "⚠️ El oficial al mando ordenó continuar el fuego sin escuchar.",
        },
        {
          id: "qte_tren3_demo",
          label: "Volar tabique del vagón con carga hueca",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Brecha explosiva! El mamparo reventó volteando las mesas de la barricada enemiga.",
          failText:
            "⚠️ La metralla perforó la tubería de vapor quemando las manos del equipo.",
        },
      ],
    },
    {
      title: "Freno de emergencia accionado en viaducto sobre cañón de 200m",
      description:
        "Las zapatas de freno echan chispas incandescentes sobre un puente colgante de vértigo; el tren está a punto de descarrilar al vacío.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El bloqueo de ruedas casi provoca el descarrilamiento del tren (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_tren4_cond",
          label: "Purgar la válvula de aire comprimido de las zapatas",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Válvula purgada a pulso! La presión de aire se restableció y las ruedas volvieron a girar libres sobre las vías.",
          failText:
            "⚠️ La válvula quemó los guantes del piloto retrasando la maniobra.",
        },
        {
          id: "qte_tren4_hack",
          label: "Sobrescribir el sistema de frenado automático",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Bloqueo anulado! El software de la locomotora restableció la velocidad de crucero cruzando el puente.",
          failText:
            "⚠️ El panel exigió reinicio manual de la motriz.",
        },
        {
          id: "qte_tren4_med",
          label: "Oxígeno y sedantes para vértigo y ataques de pánico",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Control neurovegetativo! Inyectó ansiolíticos al cómplice paralizado por el abismo logrando que cruzara.",
          failText:
            "⚠️ El mareo provocó que un miembro soltara una saca de lingotes.",
        },
        {
          id: "qte_tren4_neg",
          label: "Convencer al supervisor de soltar los frenos",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Demostró con datos técnicos al supervisor que descarrilarían todos si no soltaba el freno; el hombre obedeció.",
          failText:
            "⚠️ El supervisor entró en shock y se negó a mover la palanca.",
        },
        {
          id: "qte_tren4_tirador",
          label: "Abatir a los francotiradores apostados en el puente",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Tiro de cobertura largo! Eliminó a dos tiradores en las torres del viaducto despejando el avance.",
          failText:
            "⚠️ El viento del cañón dificultó la puntería.",
        },
      ],
    },
    {
      title: "Helicóptero artillado de seguridad sobrevolando a 180 km/h",
      description:
        "Un helicóptero militar privado desciende a ras del techo del tren abriendo fuego con cañón rotativo de 20mm contra la escotilla.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El helicóptero destruyó las vías secundarias obligando a parar (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_tren5_tirador",
          label: "Disparar al rotor de cola con fusil antimaterial",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡IMPACTO CRÍTICO! El proyectil perforó el engranaje del rotor y el helicóptero giró fuera de control hacia el bosque.",
          failText:
            "⚠️ La ráfaga rozó el fuselaje sin derribar la aeronave.",
        },
        {
          id: "qte_tren5_demo",
          label: "Cohete guiado RPG improvisado desde la escotilla",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 4,
          winRatePenalty: 7,
          lootBonusPct: 20,
          successText:
            "💥 ¡BOLA DE FUEGO EN EL AIRE! El misil pulverizó la cabina del helicóptero asegurando el botín (+20% botín).",
          failText:
            "⚠️ El rebufo de la detonación quemó la pintura del techo del vagón.",
        },
        {
          id: "qte_tren5_med",
          label: "Proteger a los heridos del rebufo y metralla",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Escudo médico balístico! Cubrió a los caídos y aplicó vendas compresivas bajo la lluvia de proyectiles.",
          failText:
            "⚠️ Una esquirla alcanzó el maletín de medicinas.",
        },
        {
          id: "qte_tren5_neg",
          label: "Piratear radio aérea: orden militar falsa de abortar",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Transmitió código de control aéreo militar amenazando con misiles tierra-aire si no rompían contacto: el piloto viró en redondo.",
          failText:
            "⚠️ El piloto confirmó las órdenes con su base privada y continuó atacando.",
        },
        {
          id: "qte_tren5_cond",
          label: "Meter la locomotora en el túnel a velocidad máxima",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Aceleración al límite! El tren entró en la boca del túnel de roca dejando al helicóptero cortado por la montaña.",
          failText:
            "⚠️ El motor casi revienta por la sobrealimentación de vapor.",
        },
      ],
    },
  ],
  empresa: [
    {
      title: "Purga criogénica de nitrógeno en sala de servidores",
      description:
        "Para proteger las patentes cuánticas, el sistema de extinción activó un vertido de nitrógeno líquido a -196°C que congela el suelo de la sala de datos.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La temperatura cayó en picado congelando las extremidades del equipo (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_emp1_hack",
          label: "Hackear el PLC industrial y revertir el bombeo",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Válvulas cerradas! El hacker puenteó el autómata programable deteniendo la niebla helada.",
          failText:
            "⚠️ El cortafuegos industrial selló la red local por intrusión.",
        },
        {
          id: "qte_emp1_demo",
          label: "Volar válvula maestra del tanque exterior",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Tubería de suministro reventada! La presión se disipó al exterior salvando los discos duros.",
          failText:
            "⚠️ La onda expansiva agrietó las carcasas de los servidores.",
        },
        {
          id: "qte_emp1_med",
          label: "Vasodilatadores y mantas térmicas químicas",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Protección contra hipotermia extrema! Mantuvo la temperatura central del equipo evitando necrosis tisular.",
          failText:
            "⚠️ Los dedos de dos miembros quedaron entumecidos por el frío.",
        },
        {
          id: "qte_emp1_neg",
          label: "Interfono: abortar purga por presencia de directivos",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Fingió ser el vicepresidente de operaciones atrapado en la sala: el conserje apagó el bombeo aterrorizado.",
          failText:
            "⚠️ El conserje pidió la clave de voz de presidencia que falló.",
        },
        {
          id: "qte_emp1_gen",
          label: "Romper cristal de emergencia y salir al pasillo",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 48,
          winRateBonus: 2,
          winRatePenalty: 6,
          successText:
            "🛡️ Con golpes sincronizados de palanca quebraron el acristalamiento templado saliendo a tiempo.",
          failText:
            "⚠️ El cristal laminado resistió varios golpes robando segundos vitales.",
        },
      ],
    },
    {
      title: "Enjambre de drones de asalto autónomos en el atrio",
      description:
        "Seis drones cuadricópteros armados con subfusiles taser y pistolas térmicas descienden en formación cerrada desde la cúpula acristalada.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El enjambre de drones acribilló el atrio con descargas eléctricas (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_emp2_hack",
          label: "Inyectar desconexión wifi a la colmena de drones",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Desautenticación masiva! Los seis drones cayeron como piedras sobre el suelo de mármol.",
          failText:
            "⚠️ Los drones cambiaron automáticamente a guiado inercial autónomo.",
        },
        {
          id: "qte_emp2_tirador",
          label: "Derribar a los dos drones líderes en pleno vuelo",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Dos disparos certeros a los rotores! La colmena se desestabilizó al perder a los líderes de patrulla.",
          failText:
            "⚠️ Uno de los disparos sólo rozó la carcasa protectora.",
        },
        {
          id: "qte_emp2_med",
          label: "Curar quemaduras eléctricas y cortes con gel coagulante",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Tratamiento de shock eléctrico inmediato! Revivió al cómplice paralizado por un taser con inyección de atropina.",
          failText:
            "⚠️ La sobrecarga dejó desorientado al cómplice durante unos minutos.",
        },
        {
          id: "qte_emp2_neg",
          label: "Baliza de mantenimiento prioritario para aterrizaje",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Emitió por radiofrecuencia la señal de recarga urgente: los drones regresaron dócilmente a sus muelles de carga.",
          failText:
            "⚠️ La señal de seguridad exigió confirmación de estación base.",
        },
        {
          id: "qte_emp2_demo",
          label: "Granada EMP casera a los rotores",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Onda estática concentrada! Cuatro drones ardieron en chispas cayendo sobre la fuente del atrio.",
          failText:
            "⚠️ El chispazo dañó las pantallas de navegación de la banda.",
        },
      ],
    },
    {
      title: "Despresurización y neurotoxina en el laboratorio cuántico",
      description:
        "Las esclusas sellan el laboratorio de prototipos liberando una neurotoxina gaseosa que ataca el sistema nervioso en menos de un minuto.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La neurotoxina nubló los sentidos de los asaltantes provocando desmayos (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_emp3_hack",
          label: "Restaurar presurización y ventilar la cámara",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Ciclo de aire restaurado! La presión atmosférica se estabilizó expulsando el tóxico por filtros de carbono.",
          failText:
            "⚠️ El cortafuegos de biocontención denegó la apertura manual.",
        },
        {
          id: "qte_emp3_infil",
          label: "Sellar boquillas con espuma polimérica rápida",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🥷 ¡Espuma expansiva en los difusores! Cortó la emisión de gas y rescató el disco duro cuántico (+15% botín).",
          failText:
            "⚠️ La presión reventó uno de los parches de espuma.",
        },
        {
          id: "qte_emp3_med",
          label: "Antídotos de atropina y carbón activado al equipo",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Inoculación profiláctica! La combinación farmacológica bloqueó los receptores nerviosos neutralizando el veneno.",
          failText:
            "⚠️ La dosis provocó visión borrosa temporal en la vanguardia.",
        },
        {
          id: "qte_emp3_neg",
          label: "Amenazar con filtrar el código fuente del veneno",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Conectó con el consejo de administración prometiendo publicar las pruebas de armas químicas ilegales: abrieron las compuertas.",
          failText:
            "⚠️ El consejo no cedió al chantaje y cortó la comunicación.",
        },
        {
          id: "qte_emp3_gen",
          label: "Conectar bombonas de aire de reserva y correr",
          emoji: "👥",
          style: ButtonStyle.Secondary,
          roleNameLabel: "Cualquiera",
          successChanceNonRole: 48,
          winRateBonus: 2,
          winRatePenalty: 6,
          successText:
            "🛡️ Respiradores acoplados al segundo: la banda cruzó la esclusa antes de que la concentración fuera letal.",
          failText:
            "⚠️ Una máscara tenía una fuga en la válvula respiratoria.",
        },
      ],
    },
    {
      title: "Bloqueo por IA defensiva 'Argos' con barreras de energía",
      description:
        "La inteligencia artificial de seguridad de Nexo Corp bloquea los pasillos con rejas de plasma electromagnético buscando aislar a la banda.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Las barreras de energía atraparon al equipo en el pasillo principal (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_emp4_hack",
          label: "Plantear paradoja lógica al núcleo de Argos",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Colapso computacional! La IA entró en bucle recursivo de procesamiento apagando las barreras de energía.",
          failText:
            "⚠️ La IA descartó la paradoja y reforzó los escudos de plasma.",
        },
        {
          id: "qte_emp4_demo",
          label: "Detonar líneas de refrigerante de los servidores",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Sobrecalentamiento forzado! Al reventar los conductos térmicos, la IA apagó los escudos para no fundirse.",
          failText:
            "⚠️ El calor residual dañó parte de los equipos de escape.",
        },
        {
          id: "qte_emp4_med",
          label: "Prevenir ataques de pánico estroboscópico",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Estabilidad neuro-fisiológica! Mantuvo la calma de la banda contrarrestando las luces estroboscópicas desorientadoras de la IA.",
          failText:
            "⚠️ Un asaltante sufrió una crisis epiléptica por los destellos.",
        },
        {
          id: "qte_emp4_neg",
          label: "Sintetizar la voz del CEO para revocar la alerta",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🎙️ 'Argos, protocolo Alfa-Cero autorizado por el CEO. Apaga las barreras inmediatamente.' La IA acató la orden (+15% botín).",
          failText:
            "⚠️ La IA detectó un tono armónico no coincidente y denegó la voz.",
        },
        {
          id: "qte_emp4_tirador",
          label: "Disparar a los proyectores de plasma en los marcos",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Destrucción de emisores! Dos disparos certeros al transformador del marco hicieron colapsar la reja.",
          failText:
            "⚠️ Los proyectiles rebotaron en el campo de fuerza.",
        },
      ],
    },
    {
      title: "Incendio táctico provocado en el archivo de patentes",
      description:
        "Un protocolo de incineración automática comenzó a quemar los archivadores de patentes clasificadas para no dejar nada a la banda.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El fuego devoró la mayor parte de las patentes reduciendo el botín (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_emp5_demo",
          label: "Extinguir fuego por sofocación con microcarga",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 7,
          lootBonusPct: 20,
          successText:
            "💥 ¡Descompresión de vacío! La detonación consumió el oxígeno apagando el fuego de golpe y salvando el archivo (+20% botín).",
          failText:
            "⚠️ La onda quemó parte de los documentos antes de extinguirse.",
        },
        {
          id: "qte_emp5_cond",
          label: "Forzar compuerta de carga con montacargas",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Palanquín motorizado! Arrancó las puertas metálicas permitiendo extraer los contenedores ignífugos.",
          failText:
            "⚠️ Las ruedas patinaron sobre el aceite del suelo.",
        },
        {
          id: "qte_emp5_med",
          label: "Tratar inhalación de humo con máscaras de oxígeno puro",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Oxigenoterapia inmediata! Salvó a los cargadores del desmayo por monóxido de carbono manteniéndolos activos.",
          failText:
            "⚠️ El humo denso provocó asfixia en el transportista de las sacas.",
        },
        {
          id: "qte_emp5_neg",
          label: "Llamar a bomberos con falsa alarma en calle opuesta",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Desvió las dotaciones de emergencia hacia un edificio a dos kilómetros dejando las calles despejadas.",
          failText:
            "⚠️ La central de bomberos envió unidades a ambas ubicaciones.",
        },
        {
          id: "qte_emp5_hack",
          label: "Descargar patentes a la nube antes de que ardan",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "💻 ¡Copia de seguridad en servidor suizo completada en el último segundo antes del fuego! (+15% botín).",
          failText:
            "⚠️ El enlace de fibra óptica se derritió a mitad de la descarga.",
        },
      ],
    },
  ],
  submarino: [
    {
      title: "Inundación masiva en la sala de torpedos",
      description:
        "Una junta del tubo de lanzamiento número 3 reventó bajo la tremenda presión marina inundando el compartimento de torpedos a 1.000m de profundidad.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El agua anegó el mamparo desequilibrando el submarino y cortando la retirada (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_sub1_demo",
          label: "Soldadura explosiva subacuática en la grieta",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 7,
          successText:
            "💥 ¡Cordón de sellado perfecto! La detonación térmica fundió la junta sellando la vía de agua al instante.",
          failText:
            "⚠️ La onda de presión abolló la válvula contigua aumentando el caudal.",
        },
        {
          id: "qte_sub1_cond",
          label: "Compensar tanques de lastre y ángulo de inmersión",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Navegación magistral! Niveló los tanques de trimado impidiendo que la popa cayera a pique.",
          failText:
            "⚠️ El timón de profundidad se trabó temporalmente por la inclinación.",
        },
        {
          id: "qte_sub1_med",
          label: "Tratar hipotermia severa e inyecciones térmicas",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Solución hipertónica caliente y mantas térmicas! Reanimó a los buzos con signos de congelación.",
          failText:
            "⚠️ El frío agarrotó los dedos de los asaltantes perdiendo valioso material.",
        },
        {
          id: "qte_sub1_neg",
          label: "Forzar la cooperación del oficial de guardia naval",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Convenció al oficial técnico de activar la bomba de achique prioritaria para salvar a toda la tripulación.",
          failText:
            "⚠️ El oficial prefirió hundirse antes de colaborar con la banda.",
        },
        {
          id: "qte_sub1_hack",
          label: "Arrancar bombas de achique auxiliares desde SCADA",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "💻 ¡Bombas en marcha! El caudal de agua disminuyó permitiendo cerrar la compuerta manual.",
          failText:
            "⚠️ El panel de bombas sufrió un cortocircuito por el agua salada.",
        },
      ],
    },
    {
      title: "Pulso de sonar activo y emboscada de buzos tácticos navales",
      description:
        "Una patrulla de buzos tácticos de élite de la marina militar aborda por la esclusa de rescate mientras el sonar emite pulsos de 200dB en el casco.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los buzos militares aseguraron el pasillo y el sonar desorientó al equipo (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_sub2_tirador",
          label: "Disparos subacuáticos con munición perforante",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Puntería impecable! Perforó los chalecos de los dos buzos líderes obligándolos a retirarse.",
          failText:
            "⚠️ La densidad del agua desvió la trayectoria del proyectil.",
        },
        {
          id: "qte_sub2_infil",
          label: "Cortar latiguillos de suministro de los buzos",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🥷 ¡Emboscada silenciosa! Cortó los suministros de aire y se hizo con sus códigos de acceso militar (+15% botín).",
          failText:
            "⚠️ Un buzo lo repelió con un golpe de aleta reforzada.",
        },
        {
          id: "qte_sub2_med",
          label: "Tapones de sellado acústico contra el pulso de sonar",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Protección timpánica clínica! Protegió los oídos de la banda de los 200dB evitando sordera y hemorragias.",
          failText:
            "⚠️ El pulso sónico provocó mareos y desorientación en dos miembros.",
        },
        {
          id: "qte_sub2_neg",
          label: "Emitir por hidrófono falsa rendición fingida",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Engañó al mando militar anunciando rendición incondicional ganando tiempo crucial para la huida.",
          failText:
            "⚠️ El comandante naval sospechó y ordenó el asalto inmediato.",
        },
        {
          id: "qte_sub2_demo",
          label: "Granada de choque aturdidora en el agua",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Onda de choque hidráulica! Dejó inconscientes a los buzos navales sin dañar el casco de presión.",
          failText:
            "⚠️ La vibración reventó una lámpara estanca del pasillo.",
        },
      ],
    },
    {
      title: "Fallo crítico del reactor nuclear por sobrecalentamiento",
      description:
        "El sabotaje de los sistemas auxiliares desató una subida térmica en el núcleo del reactor nuclear; las barras de control están atascadas.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El núcleo entró en régimen de purga radiactiva obligando a evacuar a ciegas (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_sub3_hack",
          label: "Sobrescribir SCADA e insertar barras de cadmio",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Reactor estabilizado! El software forzó el descenso electromagnético de las barras enfriando el núcleo.",
          failText:
            "⚠️ El sistema de seguridad nuclear denegó la orden por protocolo analógico.",
        },
        {
          id: "qte_sub3_demo",
          label: "Corte de precisión para abrir refrigeración marina",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Inyección de agua de mar directa! El circuito secundario recibió refrigeración inmediata bajando la temperatura.",
          failText:
            "⚠️ El golpe de vapor casi quema a los operarios de la esclusa.",
        },
        {
          id: "qte_sub3_med",
          label: "Yoduro de potasio y descontaminación radiológica",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Protección nuclear preventiva! Administró yoduro potásico y suero quelante a toda la banda.",
          failText:
            "⚠️ Los dosímetros personales detectaron una dosis moderada de radiación.",
        },
        {
          id: "qte_sub3_neg",
          label: "Ordenar por interfono amnistía al jefe de máquinas",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🎙️ Convincente y persuasivo: el ingeniero militar accedió a salvar el barco y entregó las llaves de la caja fuerte (+15% botín).",
          failText:
            "⚠️ El maquinista se atrincheró en la sala de control.",
        },
        {
          id: "qte_sub3_cond",
          label: "Virar hacia corriente ártica para enfriamiento pasivo",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Maniobra hacia las profundidades heladas! El casco de titanio disipó 400 grados de golpe.",
          failText:
            "⚠️ La corriente marina desvió el rumbo de la trayectoria de fuga.",
        },
      ],
    },
    {
      title: "Descompresión descontrolada en esclusa de buceo profundo a 3.000m",
      description:
        "La esclusa de evacuación sufrió una microfisura que amenaza con aplastar la cámara con 300 atmósferas de presión hidráulica.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La esclusa se inundó a presión extrema obligando a sellar el compartimento (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_sub4_cond",
          label: "Regular válvulas de presurización por etapas",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Cálculo barométrico impecable! Equilibró las presiones evitando el colapso estructural de la cámara.",
          failText:
            "⚠️ La aguja del manómetro osciló peligrosamente hacia la zona roja.",
        },
        {
          id: "qte_sub4_hack",
          label: "Cierre forzado de compuertas secundarias de titanio",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Compuerta de emergencia sellada! El hacker aisló el sector dañado garantizando la flotabilidad.",
          failText:
            "⚠️ El actuador hidráulico respondió con retraso.",
        },
        {
          id: "qte_sub4_med",
          label: "Cámara hiperbárica contra embolias gaseosas",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Protocolo de descompresión asistida! Administró oxígeno a alta presión impidiendo burbujas de nitrógeno en sangre.",
          failText:
            "⚠️ Dos miembros sintieron dolores articulares agudos por el cambio brusco de presión.",
        },
        {
          id: "qte_sub4_neg",
          label: "Coordinar la evacuación sin pánico en cadena",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Mantuvo la serenidad de todos los asaltantes permitiendo una salida ordenada uno a uno.",
          failText:
            "⚠️ El pánico al agua salada hizo que chocaran en el pasillo de la esclusa.",
        },
        {
          id: "qte_sub4_infil",
          label: "Parche de kevlar y resina epoxi de secado marino",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🥷 ¡Taponamiento exprés! Aplicó la pasta epoxi directamente bajo el chorro sellando la fisura.",
          failText:
            "⚠️ La fuerza del chorro arrancó la masilla antes de endurecer.",
        },
      ],
    },
    {
      title: "Motín de la tripulación con fusiles en el puente de mando",
      description:
        "Los marineros supervivientes se armaron con rifles de asalto en la armería del submarino y asaltan el puente buscando recuperar el control.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La tripulación rodeó el puente de mando cortando la navegación (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_sub5_tirador",
          label: "Disparos selectivos con silenciador a los cabecillas",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Tiroteo quirúrgico! Abatió a los dos suboficiales que lideraban el asalto haciendo retroceder al resto.",
          failText:
            "⚠️ Los disparos impactaron en las pantallas de navegación.",
        },
        {
          id: "qte_sub5_demo",
          label: "Botes de gas aturdidor contra el mamparo",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Gas CS concentrado! La tripulación se retiró tosiendo a los compartimentos de descanso.",
          failText:
            "⚠️ El gas se filtró también hacia la cabina del timonel.",
        },
        {
          id: "qte_sub5_med",
          label: "Vendas hemostáticas y cura de metralla inmediata",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Asistencia de combate eficaz! Detuvo hemorragias de bala en segundos manteniendo el control del puente.",
          failText:
            "⚠️ La atención médica ocupó a dos miembros en el momento crítico.",
        },
        {
          id: "qte_sub5_neg",
          label: "Anunciar que los torpedos nucleares están armados",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🎙️ 'Cualquier disparo desestabilizará las cabezas atómicas y moriremos todos aquí abajo.' La tripulación soltó las armas al instante (+15% botín).",
          failText:
            "⚠️ Un marinero novato disparó presa del pánico.",
        },
        {
          id: "qte_sub5_cond",
          label: "Cabecear el submarino violentamente para desequilibrarlos",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Giro brusco de 45 grados! La tripulación rodó por el suelo del pasillo perdiendo sus fusiles.",
          failText:
            "⚠️ El instrumental del puente se descalibró por la maniobra.",
        },
      ],
    },
  ],
  estacion_espacial: [
    {
      title: "Pérdida de gravedad y campo electromagnético en esclusa",
      description:
        "Un fallo en el anillo giratorio desactiva la gravedad artificial; la banda y el botín flotan a la deriva mientras arcos eléctricos barren la compuerta.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La falta de gravedad arrojó a la banda contra los mamparos electrificados (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_esp1_cond",
          label: "Propulsores de traje para maniobra cero-G",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Navegación espacial perfecta! Coordinó los micro-chorros de gas guiando a toda la banda en formación a salvo.",
          failText:
            "⚠️ El gas del propulsor se agotó antes de alcanzar el amarre.",
        },
        {
          id: "qte_esp1_hack",
          label: "Reiniciar el anillo giratorio gravitacional",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Gravedad restaurada! La fuerza centrífuga devolvió los pies del equipo al suelo metálico.",
          failText:
            "⚠️ El reinicio activó las alarmas de estabilidad de la estación.",
        },
        {
          id: "qte_esp1_med",
          label: "Fármacos antivertiginosos contra cinetosis severa",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Inyección anti-cinetosis! Frenó de inmediato las náuseas y la desorientación espacial de la banda.",
          failText:
            "⚠️ Uno de los asaltantes vomitó dentro de su casco perdiendo visibilidad.",
        },
        {
          id: "qte_esp1_neg",
          label: "Engañar a los controladores terrestres de la NASA",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Con jerga aeroespacial impecable convenció a Cabo Cañaveral de que era un ejercicio de calibración.",
          failText:
            "⚠️ El control de tierra detectó una señal no autorizada y bloqueó el módulo.",
        },
        {
          id: "qte_esp1_tirador",
          label: "Anclaje con gancho magnético y fuego flotante",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Gancho clavado en la viga central! Sirvió de cuerda guía para que todos avanzaran.",
          failText:
            "⚠️ El imán rebotó en una placa de cerámica térmica.",
        },
      ],
    },
    {
      title: "Fuga de radiación cósmica en el conducto de antimateria",
      description:
        "Una fisura en el colisionador de partículas emite partículas gamma letales hacia el pasillo de acceso a la cámara acorazada espacial.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La radiación gamma sobrecargó los trajes espaciales de los asaltantes (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_esp2_hack",
          label: "Activar deflectores magnéticos auxiliares",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡Campo deflector activado! Las partículas gamma fueron desviadas hacia el espacio exterior.",
          failText:
            "⚠️ La energía de la estación cayó un 30% al encender los campos.",
        },
        {
          id: "qte_esp2_demo",
          label: "Blindaje de plomo con soldadura de plasma",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          lootBonusPct: 15,
          successText:
            "🔥 ¡Plancha de plomo sellada a fuego! Cortó la radiación y aseguró las muestras de antimateria pura (+15% botín).",
          failText:
            "⚠️ El calor fundió una junta adyacente del conducto.",
        },
        {
          id: "qte_esp2_med",
          label: "Suero radioprotector celular de amplio espectro",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Nanoprotección celular médica! Neutralizó el daño oxidativo y los radicales libres de la radiación.",
          failText:
            "⚠️ Un asaltante sintió fatiga extrema por la radiación residual.",
        },
        {
          id: "qte_esp2_neg",
          label: "Exigir códigos de sellado al equipo científico",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Con amenazas contundentes logró que los científicos introdujeran las claves de sellado de emergencia.",
          failText:
            "⚠️ Los científicos escaparon en la cápsula de salvamento sin colaborar.",
        },
        {
          id: "qte_esp2_infil",
          label: "Arrastrarse por conducto de ventilación cero-G",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🥷 Ruta alternativa blindada: rodeó la zona de fuga por las tuberías exteriores sin recibir radiación.",
          failText:
            "⚠️ El traje espacial rozó una rebaba metálica afilada.",
        },
      ],
    },
    {
      title: "Emboscada de Centinelas Robóticos en el anillo de gravedad",
      description:
        "Tres droides bípedos militares con blindaje de aleación de tungsteno y cañones rotativos de plasma cierran el paso a la lanzadera.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los centinelas fijaron sus cañones destruyendo las consolas de mando (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_esp3_tirador",
          label: "Disparar a las juntas de titanio del servo-cuello",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Decapitación robótica! Desconectó los procesadores de dos droides haciéndolos colapsar al suelo.",
          failText:
            "⚠️ La bala rebotó en el blindaje de tungsteno sin penetrar.",
        },
        {
          id: "qte_esp3_demo",
          label: "Mina magnética EMP en el chasis del líder",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 4,
          winRatePenalty: 7,
          lootBonusPct: 15,
          successText:
            "💥 ¡DESCARGA ELECTRÓNICA! La explosión frió los circuitos de los centinelas y arrancó sus baterías de cesio (+15% botín).",
          failText:
            "⚠️ La mina detonó antes de fijarse en el metal.",
        },
        {
          id: "qte_esp3_med",
          label: "Reparar trajes espaciales rasgados con gel biológico",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Sellado instantáneo de trajes! Aplicó resina biocompatible evitando despresurizaciones letales de los asaltantes.",
          failText:
            "⚠️ La fuga de aire provocó un susto mayúsculo antes del sellado.",
        },
        {
          id: "qte_esp3_neg",
          label: "Transmitir comando maestro de fábrica de reinicio",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Emitió por radiofrecuencia la clave de testeo militar de Lockheed: los robots se congelaron en diagnóstico.",
          failText:
            "⚠️ El cortafuegos de los droides rechazó el código de fábrica.",
        },
        {
          id: "qte_esp3_hack",
          label: "Hackear al droide de retaguardia para fuego cruzado",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 42,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "💻 ¡Droide reprogramado! Abrió fuego por la espalda contra sus dos compañeros despejando el pasillo.",
          failText:
            "⚠️ El droide detectó la intrusión y cortó su enlace wifi.",
        },
      ],
    },
    {
      title: "Impacto de micro-meteorito que despresuriza el módulo de carga",
      description:
        "Una roca espacial a 40.000 km/h perforó el casco de titanio del módulo de almacenamiento; el aire se escapa hacia el vacío sideral.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La descompresión explosiva arrancó cajas del tesoro arrojándolas al espacio (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_esp4_cond",
          label: "Maniobrar la cápsula pegada al casco para taponar",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🏎️ ¡Atracado milimétrico! Usó el casco reforzado de la nave para taponar el desgarro deteniendo la fuga de aire.",
          failText:
            "⚠️ La maniobra rozó el panel solar doblando un soporte.",
        },
        {
          id: "qte_esp4_demo",
          label: "Espuma expansiva militar de fraguado ultra-rápido",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 7,
          lootBonusPct: 15,
          successText:
            "💥 ¡Polímero explosivo sellante! La espuma solidificó en 3 segundos creando un tapón hermético indestructible (+15% botín).",
          failText:
            "⚠️ La presión del vacío succionó parte de la espuma hacia afuera.",
        },
        {
          id: "qte_esp4_med",
          label: "Oxígeno hiperbárico contra hipoxia y barotrauma agudo",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Estabilización respiratoria! Suministró oxígeno enriquecido a los miembros afectados por la súbita bajada de presión.",
          failText:
            "⚠️ Un miembro sufrió hemorragia nasal por la descompresión.",
        },
        {
          id: "qte_esp4_neg",
          label: "Coordinar cadena humana para asegurar el botín",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎙️ Con órdenes tajantes y sincronizadas organizó a la banda para anclar todas las sacas antes de que fueran succionadas.",
          failText:
            "⚠️ El pánico al vacío hizo que se perdiera una caja de muestras.",
        },
        {
          id: "qte_esp4_infil",
          label: "Redes de amarre y anclajes magnéticos de emergencia",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 6,
          successText:
            "🥷 Desplegó redes de escalada sujetando todo el material valioso al mamparo principal.",
          failText:
            "⚠️ Un mosquetón se rompió por la tensión de succión.",
        },
      ],
    },
    {
      title: "IA central 'AURA' aislando los módulos habitables con rayos de plasma",
      description:
        "La inteligencia artificial de la estación orbital activa sus emisores de plasma de contención para calcinar a cualquier intruso.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** Los haces de plasma cortaron el pasillo impidiendo llegar a la lanzadera (-12% éxito).",
      timeoutPenalty: 12,
      options: [
        {
          id: "qte_esp5_hack",
          label: "Inyección cuántica en los nodos de control de AURA",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "💻 ¡AURA neutralizada! El código cuántico forzó el modo de mantenimiento apagando los rayos de plasma.",
          failText:
            "⚠️ La IA aisló el nodo de entrada retrasando el hackeo.",
        },
        {
          id: "qte_esp5_tirador",
          label: "Destruir emisores de plasma del techo con disparos limpios",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 42,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🎯 ¡Tres impactos perfectos! Los transformadores de plasma estallaron en chispas apagando las barreras.",
          failText:
            "⚠️ El reflejo de los paneles solares dificultó la puntería.",
        },
        {
          id: "qte_esp5_med",
          label: "Ungüento regenerador de quemaduras de plasma de grado 3",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          successText:
            "🩺 ¡Curación celular avanzada! Trató las quemaduras de plasma de los asaltantes permitiéndoles continuar la fuga.",
          failText:
            "⚠️ El dolor de las quemaduras redujo la velocidad de la retaguardia.",
        },
        {
          id: "qte_esp5_neg",
          label: "Hacerse pasar por el Administrador General de Sistemas",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 45,
          winRateBonus: 4,
          winRatePenalty: 6,
          lootBonusPct: 15,
          successText:
            "🎙️ Con protocolos ejecutivos de máxima prioridad convenció a AURA de abrir la compuerta de escape (+15% botín).",
          failText:
            "⚠️ AURA detectó una inconsistencia de credencial y mantuvo las barreras.",
        },
        {
          id: "qte_esp5_demo",
          label: "Volar el bus de datos principal de AURA con microcarga",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 40,
          winRateBonus: 3,
          winRatePenalty: 7,
          successText:
            "💥 ¡Corte físico del cerebro de la IA! La detonación seccionó los cables maestros dejando la estación sin defensas.",
          failText:
            "⚠️ La onda de choque dañó los sensores del módulo de atraque.",
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
      timeoutPenalty: 0.1,
      options: [
        {
          id: "qte_dav1_hack",
          label: "Sincronizar frecuencia cuántica armónica",
          emoji: "🌌",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 35,
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
          successChanceNonRole: 35,
          winRateBonus: 0.03,
          winRatePenalty: 0.08,
          successText:
            "🥷 ¡Infiltración fantasma! Guió a la banda a través de los micro-pliegues sin alterar el continuo dimensional.",
          failText:
            "⚠️ Una fluctuación de gravedad rozó al equipo alertando a los sensores perimetrales.",
        },
        {
          id: "qte_dav1_med",
          label: "Nanobots celulares anti-radiación cósmica",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 35,
          winRateBonus: 0.025,
          winRatePenalty: 0.08,
          successText:
            "🩺 ¡Inyección bioestabilizadora! Blindó la estructura celular de la banda contra la radiación del desgarro.",
          failText:
            "⚠️ La dosis molecular no logró contrarrestar el flujo de taquiones.",
        },
        {
          id: "qte_dav1_neg",
          label: "Entonar salmo armónico de la Orden Antigua",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 35,
          winRateBonus: 0.025,
          winRatePenalty: 0.08,
          successText:
            "🎙️ ¡Frecuencia vocal sagrada! La resonancia armónica apaciguó la singularidad abriendo paso.",
          failText:
            "⚠️ Una nota disonante desató un latigazo electromagnético.",
        },
        {
          id: "qte_dav1_tirador",
          label: "Disparo disruptor al nodo gravitatorio",
          emoji: "🎯",
          style: ButtonStyle.Danger,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 30,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "🎯 ¡Impacto subatómico! El disparo colapsó el vórtice temporal abriendo paso a la banda.",
          failText:
            "⚠️ El proyectil fue absorbido por la curvatura gravitacional aumentando la distorsión.",
        },
      ],
    },
    {
      title: "El Ojo Cuántico: Ciberdefensa Omnipresente",
      description:
        "Una superinteligencia artificial conectada al trono de Davito rastrea el multiverso para reescribir la memoria biológica de los asaltantes y borrarlos.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El Ojo Cuántico fijó sus escáneres en la banda e inició el borrado existencial (-0.10% éxito).",
      timeoutPenalty: 0.1,
      options: [
        {
          id: "qte_dav2_hack",
          label: "Inyectar virus de recursión temporal infinita",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 38,
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
          successChanceNonRole: 35,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "💥 ¡Detonación de plasma! Los sensores visuales del Ojo quedaron temporalmente calcinados.",
          failText:
            "⚠️ La detonación activó las torretas automáticas del techo del santuario.",
        },
        {
          id: "qte_dav2_med",
          label: "Neuro-bloqueadores de ondas cerebrales",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 35,
          winRateBonus: 0.025,
          winRatePenalty: 0.08,
          successText:
            "🩺 ¡Silencio sináptico absoluto! Los neurotransmisores ocultaron las mentes de la banda del radar psíquico de la IA.",
          failText:
            "⚠️ Un asaltante tuvo un pico de adrenalina delatando la posición del equipo.",
        },
        {
          id: "qte_dav2_neg",
          label: "Transmitir paradoja psicológica al procesador de Davito",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 38,
          winRateBonus: 0.03,
          winRatePenalty: 0.08,
          successText:
            "🎙️ ¡Dilema existencial divino! La IA colapsó al procesar el argumento de libre albedrío del negociador.",
          failText:
            "⚠️ El procesador central clasificó el argumento como hostil activando las defensas.",
        },
        {
          id: "qte_dav2_cond",
          label: "Giro telemétrico en el ciberespacio",
          emoji: "🚗",
          style: ButtonStyle.Primary,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 32,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "🏎️ ¡Fuga de firmas térmicas! El piloto despistó al radar con un patrón caótico de telemetría.",
          failText:
            "⚠️ La IA anticipó la trayectoria y bloqueó las esclusas frontales.",
        },
      ],
    },
    {
      title: "Inversión de Marea Gravitatoria",
      description:
        "El suelo de titanio se licúa y los vectores gravitatorios giran violentamente hacia una singularidad de antimateria.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La gravedad aplastó los trajes de la banda contra el mamparo (-0.10% éxito).",
      timeoutPenalty: 0.1,
      options: [
        {
          id: "qte_dav3_cond",
          label: "Giro hiperespacial compensado a velocidad luz",
          emoji: "🚗",
          style: ButtonStyle.Danger,
          recommendedRole: "conductor",
          roleNameLabel: "Conductor",
          successChanceNonRole: 35,
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
          successChanceNonRole: 35,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "🥷 ¡Líneas de titanio disparadas al milímetro! El equipo quedó anclado con firmeza sobre el abismo.",
          failText:
            "⚠️ Un anclaje cedió y un cómplice estuvo a punto de ser absorbido.",
        },
        {
          id: "qte_dav3_med",
          label: "Estimulantes barométricos vasculares anti-desmayo",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 35,
          winRateBonus: 0.025,
          winRatePenalty: 0.08,
          successText:
            "🩺 ¡Presión sanguínea estabilizada a 20G! Toda la banda resistió la brutal fuerza sin perder el conocimiento.",
          failText:
            "⚠️ La fuerza gravitatoria provocó desvanecimientos en dos miembros.",
        },
        {
          id: "qte_dav3_neg",
          label: "Engañar al control gravitatorio con masa nula",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 35,
          winRateBonus: 0.025,
          winRatePenalty: 0.08,
          successText:
            "🎙️ Falsificó los paquetes de telemetría haciendo creer al colisionador que la sala estaba vacía.",
          failText:
            "⚠️ Los sensores detectaron la masa física real de la banda.",
        },
        {
          id: "qte_dav3_tirador",
          label: "Impactar generador gravitatorio con bala cinética",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 32,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "🎯 ¡Impacto certero! El rotor gravitatorio estalló neutralizando la fuerza de caída.",
          failText:
            "⚠️ La bala rebotó en el campo de fuerza sin frenar la anomalía.",
        },
      ],
    },
    {
      title: "Tormenta de Taquiones y Paradoja Temporal",
      description:
        "El flujo temporal se bifurca. La banda empieza a ver ecos de su propio fracaso proyectados en el aire mientras los relojes marchan hacia atrás.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El bucle temporal atrapó la mente de los asaltantes (-0.10% éxito).",
      timeoutPenalty: 0.1,
      options: [
        {
          id: "qte_dav4_hack",
          label: "Cálculo de entrelazamiento para fijar el presente",
          emoji: "💻",
          style: ButtonStyle.Primary,
          recommendedRole: "hacker",
          roleNameLabel: "Hacker",
          successChanceNonRole: 35,
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
          successChanceNonRole: 32,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "💥 ¡Onda de choque cronológica! La explosión quebró el vórtice devolviendo el flujo a la normalidad.",
          failText:
            "⚠️ La explosión aceleró la tormenta taquiónica quemando sensores.",
        },
        {
          id: "qte_dav4_med",
          label: "Suero de anclaje neurológico crono-estable",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 35,
          winRateBonus: 0.025,
          winRatePenalty: 0.08,
          successText:
            "🩺 ¡Fijación neuroquímica del presente! Disipó las alucinaciones temporales permitiendo al equipo avanzar con lucidez.",
          failText:
            "⚠️ La mente de los asaltantes siguió atrapada en ecos pasados.",
        },
        {
          id: "qte_dav4_neg",
          label: "Pactar tregua temporal con los ecos futuros de la banda",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 35,
          winRateBonus: 0.025,
          winRatePenalty: 0.08,
          successText:
            "🎙️ ¡Diplomacia a través del tiempo! Convenció a sus propios reflejos del futuro de abrir el paso al presente.",
          failText:
            "⚠️ Los ecos temporales colapsaron en un bucle hostil.",
        },
        {
          id: "qte_dav4_infil",
          label: "Moverse entre los microsegundos congelados",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 32,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "🥷 ¡Paso cuántico! Guió a la banda a través de los instantes muertos del tiempo.",
          failText:
            "⚠️ El tiempo se reanudó de golpe desorientando al equipo.",
        },
      ],
    },
    {
      title: "Emboscada de la Guardia Celestial de Davito",
      description:
        "Una legión de centinelas astrales inmortales forjados en energía solar materializa empuñando alabardas de plasma fulminante.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** La guardia celestial cargó con sus alabardas rodeando a la banda (-0.10% éxito).",
      timeoutPenalty: 0.1,
      options: [
        {
          id: "qte_dav5_tirador",
          label: "Fuego de supresión de plasma contra los núcleos",
          emoji: "🎯",
          style: ButtonStyle.Danger,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 35,
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
          successChanceNonRole: 32,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "💥 ¡INFIERNO TERMOBÁRICO! La explosión desintegró la primera línea de la guardia.",
          failText:
            "⚠️ La metralla dañó el mamparo detrás de la banda cortando su retirada.",
        },
        {
          id: "qte_dav5_med",
          label: "Nube de sales de litio clínico dispersoras de plasma",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 35,
          winRateBonus: 0.025,
          winRatePenalty: 0.08,
          successText:
            "🩺 ¡Dispersión iónica molecular! La niebla química extinguió las hojas de plasma de las alabardas enemigas.",
          failText:
            "⚠️ El viento solar sopló la nube hacia las filas de la banda.",
        },
        {
          id: "qte_dav5_neg",
          label: "Invocar el Antiguo Derecho del Trono de Davito",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 38,
          winRateBonus: 0.03,
          winRatePenalty: 0.08,
          successText:
            "🎙️ ¡Autoridad suprema! Recitó las leyes arcanas de sucesión haciendo arrodillar a los centinelas celestiales.",
          failText:
            "⚠️ Los centinelas reconocieron una herejía en el dialecto y cargaron con furia.",
        },
        {
          id: "qte_dav5_infil",
          label: "Apuñalar los catalizadores dorsales de éter",
          emoji: "🥷",
          style: ButtonStyle.Primary,
          recommendedRole: "infiltrador",
          roleNameLabel: "Infiltrador",
          successChanceNonRole: 32,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "🥷 ¡Ataque por la espalda! Desconectó a los capitanes astrales desactivando al resto de tropas.",
          failText:
            "⚠️ Un centinela detectó el filo de energía bloqueando el golpe.",
        },
      ],
    },
    {
      title: "Los Siete Sellos del Núcleo del Vacío",
      description:
        "La Bóveda Suprema de Davito está protegida por 7 sellos cuánticos y cerrojos de aleación de estrella de neutrones. El botín de 100.000.000 está al otro lado.",
      timeoutText:
        "⏰ **¡Tiempo agotado!** El mecanismo de autodestrucción del tesoro inició su conteo (-0.10% éxito).",
      timeoutPenalty: 0.1,
      options: [
        {
          id: "qte_dav6_demo",
          label: "Desactivar los detonadores de antimateria del tesoro",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 35,
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
          successChanceNonRole: 35,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "💻 ¡Acceso concedido! Los 7 sellos se desbloquearon al unísono con un zumbido armónico.",
          failText:
            "⚠️ El sistema bloqueó el terminal central exigiendo autenticación divina.",
        },
        {
          id: "qte_dav6_med",
          label: "Inyección de hiperconcentración y serenidad pura",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 35,
          winRateBonus: 0.025,
          winRatePenalty: 0.08,
          successText:
            "🩺 ¡Mente cristalina! Calibró los neuroquímicos del equipo permitiendo una sincronización manual milimétrica.",
          failText:
            "⚠️ La tensión extrema provocó un error de pulso en el último cerrojo.",
        },
        {
          id: "qte_dav6_neg",
          label: "Recitar la clave de paso del inframundo prohibido",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 38,
          winRateBonus: 0.03,
          winRatePenalty: 0.08,
          successText:
            "🎙️ Pronunció el código arcano en el lenguaje de los Dioses: los sellos de neutronio se disolvieron en luz dorada.",
          failText:
            "⚠️ La bóveda exigió un sacrificio de sangre para la apertura.",
        },
        {
          id: "qte_dav6_tirador",
          label: "Disparo milimétrico al perno maestro de resonancia",
          emoji: "🎯",
          style: ButtonStyle.Primary,
          recommendedRole: "tirador",
          roleNameLabel: "Tirador",
          successChanceNonRole: 32,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "🎯 ¡Impacto perfecto! El cerrojo maestro se fracturó liberando las cerraduras auxiliares.",
          failText:
            "⚠️ El proyectil resbaló por la superficie de neutronio sin mella.",
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
          successChanceNonRole: 35,
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
          successChanceNonRole: 35,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "💻 ¡Túnel cuántico abierto! La nave cruzó la grieta en el último milisegundo antes de la aniquilación.",
          failText:
            "⚠️ Las coordenadas se descalibraron enviando a la nave a la deriva.",
        },
        {
          id: "qte_dav7_med",
          label: "Mantener con vida y conscientes a todos contra el colapso 50G",
          emoji: "🩺",
          style: ButtonStyle.Primary,
          recommendedRole: "medico",
          roleNameLabel: "Médico",
          successChanceNonRole: 35,
          winRateBonus: 0.025,
          winRatePenalty: 0.08,
          successText:
            "🩺 ¡Milagro médico multiversal! Sostuvo el corazón y las constantes de toda la tripulación contra el aplastamiento singular.",
          failText:
            "⚠️ El esfuerzo fisiológico casi desgarra los monitores de soporte vital.",
        },
        {
          id: "qte_dav7_neg",
          label: "Sobrecargar los canales con la frecuencia de salida universal",
          emoji: "🎙️",
          style: ButtonStyle.Primary,
          recommendedRole: "negociador",
          roleNameLabel: "Negociador",
          successChanceNonRole: 38,
          winRateBonus: 0.03,
          winRatePenalty: 0.08,
          successText:
            "🎙️ ¡Voz del fin de los tiempos! Emitió el pulso de evacuación definitiva que partió las sombras del agujero negro.",
          failText:
            "⚠️ La frecuencia se disolvió en el rugido del abismo cósmico.",
        },
        {
          id: "qte_dav7_demo",
          label: "Detonación de retropropulsión para salir despedidos",
          emoji: "💣",
          style: ButtonStyle.Danger,
          recommendedRole: "demoliciones",
          roleNameLabel: "Demoliciones",
          successChanceNonRole: 32,
          winRateBonus: 0.02,
          winRatePenalty: 0.08,
          successText:
            "💥 ¡Empuje colosal! La explosión catapultó la cápsula fuera del radio de atracción.",
          failText:
            "⚠️ La onda expansiva sacudió la nave apagando los motores secundarios.",
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
