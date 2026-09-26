import path from "node:path";
import { fileURLToPath } from "node:url";
import { Events, REST, Routes } from "discord.js";
import { NexoClient } from "./client.js";
import { config } from "./config.js";
import { initDatabase } from "./database/index.js";
import { loadCommands } from "./handlers/loadCommands.js";
import { loadEvents } from "./handlers/loadEvents.js";
import { registerLogEvents } from "./modules/logs/register.js";
import { startScheduler } from "./scheduler.js";
import { logger } from "./logger.js";
import { registerFonts } from "./utils/canvas.js";
import { configuredProviders } from "./modules/ai/client.js";
import { refundOpenTables } from "./modules/economy/tables.js";
import { setMissionsClient } from "./modules/missions/engine.js";
import { OFFICIAL_GUILD_ID } from "./constants.js";
import { restoreBumpReminderTimers } from "./modules/bump/engine.js";
import { setTaxClient, ensureBeneficiaryBalanceEqualityRebalance } from "./modules/economy/tax.js";
import { setTransactionClient } from "./modules/economy/transactionLogger.js";
import { syncHeistPinnedGuide } from "./modules/economy/heistGuideEmbed.js";
import { syncPokemonPinnedGuide } from "./modules/pets/pokemonGuideEmbed.js";
import { syncAllGangRoles } from "./modules/economy/gangs.js";
import { tickServerStats } from "./modules/serverStats/engine.js";

const srcDir = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  initDatabase();
  registerFonts();
  const client = new NexoClient();
  setMissionsClient(client);
  setTaxClient(client);
  setTransactionClient(client);
  await loadCommands(client, path.join(srcDir, "commands"));
  await loadEvents(client, path.join(srcDir, "events"));
  registerLogEvents(client);
  startScheduler(client);

  client.once(Events.ClientReady, async () => {
    logger.info(`Conectado como ${client.user?.tag} · ${client.commands.size} comandos`);
    logger.info(`Servidores: ${[...client.guilds.cache.values()].map((g) => `${g.name} (${g.id})`).join(", ") || "(ninguno)"}`);
    logger.info(`IA tickets: ${configuredProviders().join(" → ") || "sin proveedores"}`);
    await deployCommands(client);
    restoreBumpReminderTimers(client);
    ensureBeneficiaryBalanceEqualityRebalance(OFFICIAL_GUILD_ID);
    syncHeistPinnedGuide(client, OFFICIAL_GUILD_ID).catch(() => {});
    syncPokemonPinnedGuide(client).catch(() => {});
    syncAllGangRoles(client).catch(() => {});
    tickServerStats(client).catch(() => {});
    client.user?.setPresence({
      activities: [{ name: "Nexo · /help", type: 3 }],
      status: "online",
    });
  });

  client.on(Events.GuildCreate, async (guild) => {
    if (guild.id !== OFFICIAL_GUILD_ID) {
      logger.warn(`Guild no autorizado: ${guild.id}. Saliendo.`);
      await guild.leave().catch((err) => logger.error("No pude salir del guild no autorizado", err));
      return;
    }
    logger.info(`Entré a ${guild.name} (${guild.id})`);
    const rest = new REST({ version: "10" }).setToken(config.token);
    const body = [...client.commands.values()].map((c) => c.data.toJSON());
    await rest.put(Routes.applicationGuildCommands(config.clientId, guild.id), { body }).catch((err) => {
      logger.error("deploy al entrar al guild", err);
    });
  });

  const shutdown = async (signal: string) => {
    logger.info(`Apagando (${signal})…`);
    try {
      refundOpenTables();
      client.destroy();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (err) => logger.error("unhandledRejection", err));
  process.on("uncaughtException", (err) => logger.error("uncaughtException", err));

  await client.login(config.token);
}

async function deployCommands(client: NexoClient): Promise<void> {
  const body = [...client.commands.values()].map((c) => c.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(config.token);
  try {
    await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
    const guilds = new Set([OFFICIAL_GUILD_ID]);
    if (!guilds.size) {
      await rest.put(Routes.applicationCommands(config.clientId), { body });
      logger.info(`Comandos globales desplegados (${body.length})`);
      return;
    }
    for (const gid of guilds) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, gid), { body });
      logger.info(`Comandos desplegados en guild ${gid} (${body.length})`);
    }
    logger.info("Comandos globales vaciados para no duplicar");
  } catch (err) {
    logger.error("No se pudieron desplegar comandos", err);
  }
}

main().catch((err) => {
  logger.error("Fallo al arrancar", err);
  process.exit(1);
});
