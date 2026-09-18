<p align="center">
  <img src="assets/images/nexo.png" width="180" alt="Nexo Bot">
</p>

<h1 align="center">Nexo Bot</h1>

<p align="center">
  Bot de Discord <strong>a medida</strong> para el servidor Nexo.<br>
  TypeScript + discord.js v14 + SQLite. Lo construí y lo opero yo.
</p>

<p align="center">
  <a href="https://discord.gg/P2hXkTV3Jb">Servidor</a>
  ·
  <a href="https://davito.es/proyectos/nexo">Ficha</a>
  ·
  <a href="https://davito.es/proyectos">Portfolio</a>
  ·
  <a href="https://github.com/davito-03">@davito-03</a>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="discord.js" src="https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
</p>

No es un bot genérico de “invitar a cualquier servidor”. Está cerrado al guild de Nexo: slash commands, voz, tickets, backups y una IA de soporte con memoria por ticket.

Ficha: [davito.es/proyectos/nexo](https://davito.es/proyectos/nexo) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Módulos

| Módulo | Qué hace |
| --- | --- |
| Moderación | `/warn` `/kick` `/ban` `/timeout` `/mod` — historial, casos, escalado de warns |
| Logs | Mensajes, miembros, voz, auditoría, tickets, sanciones, joins (con invitación), boosts |
| Niveles | XP de chat y **minutos en VC**, tarjetas, `/nivel rank` `/nivel top` |
| VoiceMaster | Canal ➕ Crear sala, lock/hide/rename/límite/claim/transfer/kick |
| Tickets | Categorías, claim/cierre, transcripciones HTML |
| IA de soporte | Pool Groq → Gemini → OpenRouter → Cohere → Cloudflare → OpenAI, con memoria |
| Backup | ZIP de roles, canales, emojis, miembros, bans, niveles, tickets y mensajes |
| Extra | Sorteos, fun, bienvenida/boost con canvas |

## Arranque

```bash
cp .env.example .env   # DISCORD_TOKEN, CLIENT_ID, GUILD_ID
npm install
npm run start:prod     # tsc + node
# dev: npm run dev
```

Producción: `docker compose up -d --build`.

Intents: **Server Members**, **Message Content**. `data/` y `backups/` no se publican. Claves de IA en `.env`.

## Relacionado

- Dabot (Python, multi-servidor): [davito-03/dabot](https://github.com/davito-03/dabot)
- Portfolio: [davito.es/proyectos](https://davito.es/proyectos)
