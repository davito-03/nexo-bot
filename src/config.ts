import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { ROOT_DIR } from "./constants.js";

// Las variables del entorno del proceso (Docker/systemd) tienen prioridad sobre .env.
loadEnv({ path: path.join(ROOT_DIR, ".env"), override: false });

const csv = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const schema = z.object({
  DISCORD_TOKEN: z.string().min(10, "Falta DISCORD_TOKEN"),
  CLIENT_ID: z.string().min(5, "Falta CLIENT_ID"),
  GUILD_ID: z.string().optional().default(""),
  GROQ_API_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  COHERE_API_KEY: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().optional().default(""),
  LOCAL_AI_URL: z.union([z.string().url(), z.literal("")]).optional().default(""),
  LOCAL_AI_MODEL: z.string().optional().default("llama3.2:3b"),
  LOCAL_AI_API_KEY: z.string().optional().default(""),
  CF_API_TOKEN: z.string().optional().default(""),
  CF_ACCOUNT_ID: z.string().optional().default(""),
  DATABASE_PATH: z.string().optional().default("./data/nexo.db"),
  BACKUP_DIR: z.string().optional().default("./backups"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Configuración inválida:\n${issues}\nCopia .env.example a .env y rellena los valores.`);
}

const env = parsed.data;

export const config = {
  token: env.DISCORD_TOKEN,
  clientId: env.CLIENT_ID,
  guildId: env.GUILD_ID || null,
  groqKey: env.GROQ_API_KEY || null,
  geminiKeys: csv(env.GEMINI_API_KEY),
  openrouterKey: env.OPENROUTER_API_KEY || null,
  cohereKey: env.COHERE_API_KEY || null,
  openaiKey: env.OPENAI_API_KEY || null,
  localAiUrl: env.LOCAL_AI_URL || null,
  localAiModel: env.LOCAL_AI_MODEL || "llama3.2:3b",
  localAiKey: env.LOCAL_AI_API_KEY || null,
  cfToken: env.CF_API_TOKEN || null,
  cfAccountId: env.CF_ACCOUNT_ID || null,
  databasePath: path.isAbsolute(env.DATABASE_PATH)
    ? env.DATABASE_PATH
    : path.join(ROOT_DIR, env.DATABASE_PATH),
  backupDir: path.isAbsolute(env.BACKUP_DIR) ? env.BACKUP_DIR : path.join(ROOT_DIR, env.BACKUP_DIR),
};

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
fs.mkdirSync(config.backupDir, { recursive: true });
