# Nexo Bot

**Nexo Bot es el bot de Discord de la comunidad Nexo:** una mezcla de
moderación, soporte, voz, juegos y herramientas sociales con una personalidad
propia. Está escrito en TypeScript, usa `discord.js` y guarda sus datos en
SQLite, por lo que puede funcionar en un único VPS sin depender de una
infraestructura compleja.

## Lo que hace

| Área | Funcionalidades |
| --- | --- |
| Moderación | Warns, kick, ban, tempban, timeout, softban, casos e historial. |
| Logs | Mensajes editados o borrados, voz, auditoría, tickets, sanciones, altas y boosts. |
| Miembros y niveles | Registro de entradas y salidas, XP por chat y voz, rankings, tarjetas y roles. |
| VoiceMaster | Salas temporales con bloqueo, ocultación, nombre, límite, claim, transferencia y expulsión. |
| Tickets | Panel por categorías, claim, cierre, transcripts HTML y gestión de usuarios. |
| IA de soporte | Neko responde en tickets con varios proveedores y memoria por conversación. |
| Economía | Trabajo, crimen, tienda, P2P, bolsa, minería, propiedades y ledger. |
| Juegos | Asaltos cooperativos, casino, trivia, mascotas, RPG y `/fun`. |
| Comunidad | Giveaways, bienvenida, boosts, automod y backups restaurables. |

## Inicio rápido

### 1. Crear el bot

1. Crea una aplicación en el [Discord Developer Portal](https://discord.com/developers/applications).
2. En **Bot**, genera un token y activa `Server Members` y `Message Content`.
3. En **OAuth2**, usa los scopes `bot` y `applications.commands`.
4. Invita el bot al servidor con los permisos que necesite. `Administrator`
   funciona para una instalación rápida, pero es preferible conceder permisos
   concretos en producción.

### 2. Configurar y arrancar

```bash
cp .env.example .env
# Edita .env: DISCORD_TOKEN, CLIENT_ID y GUILD_ID.

npm install
npm run dev              # Desarrollo con recarga
npm run start:prod       # Producción
```

También existe un despliegue preparado para Docker:

```bash
docker compose up -d --build
docker compose logs -f
```

El proyecto requiere **Node.js 20 o superior**. Para validar cambios:

```bash
npm run typecheck
npm run smoke
```

`GUILD_ID` permite registrar los comandos slash al instante en un servidor de
pruebas y evita esperar al registro global. El bot está configurado para
trabajar con el servidor oficial de Nexo y abandona otros servidores.

## Primer setup en Discord

Después de invitarlo, una configuración habitual puede empezar así:

```text
/config bienvenida canal:#bienvenidas activa:true imagen:true
/config boost canal:#boosts activa:true
/config niveles canal:#niveles activos:true
/config staff rol:@Staff
/logs todo canal:#logs
/voz setup categoria:#VOZ
/ticket setup categoria:#TICKETS staff:@Staff logs:#ticket-logs
/ticket panel
/automod toggle filtro:maestro valor:true
```

## IA de tickets y personajes

Neko intenta usar los proveedores configurados en cascada para mantener el
servicio disponible. La conversación conserva un resumen y hechos relevantes en
SQLite, de modo que un cambio de proveedor no rompe el contexto del ticket.

El prompt de normas se configura con:

```text
/ticket ia prompt:<texto>
```

También se pueden crear personajes para canales concretos:

```text
/config chatbot canal:#canal personaje:"Nombre" prompt:"Personalidad..."
```

Si quieres probar una IA local compatible con OpenAI, configura:

```env
LOCAL_AI_URL=http://127.0.0.1:11434/v1
LOCAL_AI_MODEL=llama3.2:3b
```

La IA local se prueba primero y los proveedores remotos quedan como respaldo.

## Datos y copias de seguridad

```text
src/                 Código fuente
src/commands/        Comandos slash
src/events/          Eventos de Discord
src/modules/         Moderación, tickets, IA, niveles, voz y juegos
src/database/        SQLite y esquema
src/handlers/        Carga de comandos e interacciones
data/nexo.db         Base de datos local
data/transcripts/    Transcripciones de tickets
backups/             Copias ZIP
```

El contenedor guarda `data/` y `backups/` en el host para que los datos
sobrevivan a las actualizaciones:

```bash
docker compose ps
docker compose logs -f --tail=100
docker compose restart
docker compose down          # Detiene el bot, no borra data/
docker compose up -d --build
```

El `stop_grace_period` deja tiempo para cerrar correctamente las operaciones
activas antes de apagar el proceso.

## Imágenes

Las tarjetas usan estos fondos:

- `assets/images/welcome.png`
- `assets/images/levelup.png`
- `assets/images/boosts.png`

## Seguridad

No incluyas tokens, claves de proveedores ni credenciales en Git. Usa `.env`
solo en el servidor y rota inmediatamente cualquier secreto que haya podido
quedar expuesto en una copia, log o captura.

## CI

El workflow de CI ejecuta:

```text
npm ci
npm run typecheck
npm run smoke
```

## Licencia y estado

Este repositorio contiene el bot operativo de la comunidad Nexo. La
configuración del servidor, las credenciales y los datos de usuarios pertenecen
al entorno de despliegue y no forman parte del código público.
