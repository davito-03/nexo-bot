# Nexo Bot

Bot de Discord para **nexo | VC Activo · Español · Social · Gaming · Chill · Anime · Cats · Voice · Music · Chat · Emojis**.

Stack: **TypeScript + discord.js v14 + SQLite**. Es el que mejor aguanta un bot de este tamaño (slash commands, botones, auditoría, voz, canvas y backups) sin montar una infra extra.

## Qué incluye

| Módulo | Qué hace |
| --- | --- |
| Moderación | `/warn` `/kick` `/ban` `/timeout` `/mod` — warns, kicks, bans, tempbans, timeouts, softban, historial y casos. Escalado automático de warns. |
| Logs | Mensajes, miembros, voz, servidor, moderación, **registro de auditoría**, tickets, sanciones, joins (con invitación) y boosts. |
| Miembros | Registro persistente de altas/bajas, `/miembros`. |
| Niveles | XP por chat (cooldown) y por **minutos en VC**. Tarjetas, `/nivel rank` `/nivel top`, roles por nivel. |
| VoiceMaster | Canal **➕ Crear sala**, panel con lock/hide/rename/límite/claim/transfer/kick. |
| Tickets | Panel por categorías, claim/cierre, transcripciones HTML, añadir/quitar usuarios. |
| IA de soporte | **Neko** responde tickets con un pool (Groq → Gemini → OpenRouter → Cohere → Cloudflare → OpenAI mini) y memoria por ticket. El prompt de normas se carga con `/ticket ia prompt:`. |
| Giveaways | `/sorteo` con requisitos de rol, nivel o booster. |
| Backup | ZIP con roles, canales, emojis, miembros, bans, sanciones, niveles, tickets, config y mensajes recientes. Restauración y backups automáticos. |
| Entretenimiento | `/fun` (8ball, gato, neko, ship, trivia, wyr…) y `/rps`. |
| Bienvenida / boost | Tarjetas con la estética gatitos anime. |

## CI

`.github/workflows/ci.yml`: `npm ci`, `npm run typecheck`, `npm run smoke`.

## Arranque rápido

1. Crea una aplicación en [Discord Developer Portal](https://discord.com/developers/applications).
2. Bot → Reset Token. Activa **Privileged Gateway Intents**: Server Members, Message Content (Presence no hace falta).
3. OAuth2 → URL Generator: scopes `bot` + `applications.commands`. Permisos: Administrator (o Manage Guild/Roles/Channels/Messages, Ban, Kick, Moderate Members, View Audit Log).
4. Invita el bot al servidor.

```bash
cp .env.example .env
# edita .env: DISCORD_TOKEN, CLIENT_ID, GUILD_ID (el de Nexo)
npm install
npm run start:prod    # compila TypeScript y arranca con node
# desarrollo: npm run dev
```

`GUILD_ID` registra los slash al instante en ese servidor y vacía los globales (evita duplicados). Al entrar a un guild nuevo también se despliegan ahí.

El bot está restringido al servidor oficial de Nexo (`1394312233810395146`) y abandona cualquier otro servidor.

Intents en el portal: **Server Members** y **Message Content**.

Cuando pases de pruebas a Nexo, cambia `GUILD_ID` al ID del servidor real y reinicia.

### IA de tickets (pool barato, sin xAI)

Neko usa las mismas claves que dabot, en cascada:

`Groq → Gemini (3 keys) → OpenRouter → Cohere → Cloudflare → OpenAI gpt-4o-mini`

Cada ticket guarda un **resumen + hechos** en SQLite. Si un proveedor se cae o se acaba el cupo, el siguiente recibe esa memoria y la conversación reciente, así no pierde el hilo.

Cuando tengas el prompt de normas: `/ticket ia prompt:<texto>`

### Chatbots de personajes

Un administrador puede preparar un canal con `/config chatbot canal:#canal personaje:"Nombre" prompt:"Personalidad..."`.
Los mensajes se procesan en cola por canal y la respuesta se publica mediante un webhook con el nombre del personaje. El bot no crea canales automáticamente ni afirma que el personaje sea una persona real.

Para usar una IA local compatible con la API de OpenAI, configura `LOCAL_AI_URL` y `LOCAL_AI_MODEL`. Por ejemplo, con Ollama en el mismo VPS:

```env
LOCAL_AI_URL=http://127.0.0.1:11434/v1
LOCAL_AI_MODEL=llama3.2:3b
```

La IA local se prueba primero y los proveedores remotos quedan como fallback.

### Primer setup en Discord

```
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

## Imágenes

Fondos de las tarjetas (PNG oficiales):

- `assets/images/welcome.png`
- `assets/images/levelup.png`
- `assets/images/boosts.png`

## Estructura

```
src/
  commands/     slash commands por área
  events/       ready, mensajes, miembros, voz
  modules/      lógica (mod, logs, levels, voicemaster, tickets, ai, giveaways, backup, automod, welcome)
  database/     SQLite
  handlers/     carga de comandos / interacciones
```

Datos: `data/nexo.db`. Backups: `backups/`. Transcripciones: `data/transcripts/`.

## Producción (Docker)

Un solo contenedor. SQLite y backups viven en el host (`./data`, `./backups`).

```bash
docker compose up -d --build
docker compose logs -f
```

Comandos útiles:

```bash
docker compose ps
docker compose logs -f --tail=100
docker compose restart
docker compose down          # para el bot; no borra data/
docker compose up -d --build # tras cambiar código
```

`restart: unless-stopped` lo levanta solo si se cae o reinicia la máquina. `stop_grace_period: 25s` deja devolver apuestas de mesas de casino al apagar.

Sin Docker: `./start.sh` o `npm run start:prod`. Node 20+.
