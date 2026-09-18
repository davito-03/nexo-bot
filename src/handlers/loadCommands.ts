import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { NexoClient } from "../client.js";
import { logger } from "../logger.js";
import type { Command } from "../types/index.js";

export async function loadCommands(client: NexoClient, dir: string): Promise<void> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await loadCommands(client, full);
      continue;
    }
    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".js")) continue;
    const mod = (await import(pathToFileURL(full).href)) as { default?: Command | Command[] };
    const list = Array.isArray(mod.default) ? mod.default : mod.default ? [mod.default] : [];
    if (!list.length) {
      logger.warn("Comando inválido", full);
      continue;
    }
    for (const cmd of list) {
      if (!cmd?.data || !cmd.execute) {
        logger.warn("Comando inválido", full);
        continue;
      }
      client.commands.set(cmd.data.name, cmd);
    }
  }
}
