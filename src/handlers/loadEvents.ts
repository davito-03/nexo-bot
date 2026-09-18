import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ClientEvents } from "discord.js";
import type { NexoClient } from "../client.js";
import { logger } from "../logger.js";

export interface EventModule {
  name: keyof ClientEvents;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
}

export async function loadEvents(client: NexoClient, dir: string): Promise<void> {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts") || f.endsWith(".js"));
  for (const file of files) {
    const full = path.join(dir, file);
    const mod = (await import(pathToFileURL(full).href)) as { default?: EventModule };
    if (!mod.default?.name || !mod.default.execute) {
      logger.warn("Evento inválido", full);
      continue;
    }
    const { name, once, execute } = mod.default;
    const wrapped = (...args: unknown[]) => {
      Promise.resolve(execute(...args)).catch((err) => logger.error(`Evento ${String(name)}`, err));
    };
    if (once) client.once(name, wrapped as never);
    else client.on(name, wrapped as never);
  }
}
