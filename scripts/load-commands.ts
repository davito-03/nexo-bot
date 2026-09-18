import path from "node:path";
import { fileURLToPath } from "node:url";
import { NexoClient } from "../src/client.ts";
import { loadCommands } from "../src/handlers/loadCommands.ts";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/commands");
const client = new NexoClient();
await loadCommands(client, dir);
const names = [...client.commands.keys()].sort();
console.log("COMMANDS", names.length);
console.log(names.join("\n"));
if (names.length < 20) throw new Error("too few commands");
for (const c of client.commands.values()) c.data.toJSON();
console.log("COMMANDS_OK");
