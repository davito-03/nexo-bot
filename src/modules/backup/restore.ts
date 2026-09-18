import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import unzipper from "unzipper";
import {
  ChannelType,
  Guild,
  PermissionFlagsBits,
  PermissionsBitField,
} from "discord.js";
import { logger } from "../../logger.js";
import { getDb, setGuildConfig } from "../../database/index.js";
import { sleep } from "../../utils/time.js";
import type { BackupMeta } from "./create.js";

export async function unzipBackup(zipPath: string): Promise<string> {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "nexo-restore-"));
  await fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: dest })).promise();
  return dest;
}

export async function restoreBackup(
  guild: Guild,
  zipPath: string,
  opts: { restoreRoles?: boolean; restoreChannels?: boolean; restoreConfig?: boolean; restoreEmojis?: boolean } = {},
): Promise<{ notes: string[] }> {
  const notes: string[] = [];
  const dir = await unzipBackup(zipPath);
  let meta: BackupMeta;
  try {
    meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")) as BackupMeta;
  } catch {
    fs.rmSync(dir, { recursive: true, force: true });
    throw new Error("Backup inválido: falta meta.json o está corrupto.");
  }
  if (meta.guildId !== guild.id) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw new Error("El backup pertenece a otro servidor.");
  }
  try {
  notes.push(`Backup de ${meta.guildName} (${new Date(meta.createdAt).toISOString()})`);

  const roleMap = new Map<string, string>();
  roleMap.set(meta.guildId, guild.id);

  if (opts.restoreRoles !== false && fs.existsSync(path.join(dir, "roles.json"))) {
    const roles = JSON.parse(fs.readFileSync(path.join(dir, "roles.json"), "utf8")) as {
      id: string;
      name: string;
      color: number;
      hoist: boolean;
      mentionable: boolean;
      permissions: string;
      managed: boolean;
    }[];
    for (const r of roles.filter((x) => !x.managed)) {
      try {
        const created = await guild.roles.create({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          mentionable: r.mentionable,
          permissions: new PermissionsBitField(BigInt(r.permissions)),
          reason: "Restauración de backup Nexo",
        });
        roleMap.set(r.id, created.id);
        await sleep(350);
      } catch (err) {
        notes.push(`No se pudo crear rol ${r.name}: ${(err as Error).message}`);
      }
    }
    notes.push(`Roles restaurados: ${roleMap.size - 1}`);
  }

  if (opts.restoreChannels !== false && fs.existsSync(path.join(dir, "channels.json"))) {
    const channels = JSON.parse(fs.readFileSync(path.join(dir, "channels.json"), "utf8")) as {
      id: string;
      name: string;
      type: number;
      parentId: string | null;
      topic?: string | null;
      nsfw?: boolean;
      rateLimitPerUser?: number;
      bitrate?: number | null;
      userLimit?: number | null;
      overwrites: { id: string; type: number; allow: string; deny: string }[];
    }[];
    const idMap = new Map<string, string>();
    const categories = channels.filter((c) => c.type === ChannelType.GuildCategory);
    const rest = channels.filter((c) => c.type !== ChannelType.GuildCategory);
    for (const c of categories) {
      try {
        const created = await guild.channels.create({
          name: c.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites: mapOverwrites(c.overwrites, roleMap),
          reason: "Restauración backup",
        });
        idMap.set(c.id, created.id);
        await sleep(400);
      } catch (err) {
        notes.push(`Categoría ${c.name}: ${(err as Error).message}`);
      }
    }
    for (const c of rest) {
      const type = supportedType(c.type);
      if (type === null) continue;
      try {
        await guild.channels.create({
          name: c.name,
          type,
          parent: c.parentId ? idMap.get(c.parentId) : undefined,
          topic: c.topic ?? undefined,
          nsfw: c.nsfw,
          rateLimitPerUser: c.rateLimitPerUser,
          bitrate: c.bitrate ?? undefined,
          userLimit: c.userLimit ?? undefined,
          permissionOverwrites: mapOverwrites(c.overwrites, roleMap),
          reason: "Restauración backup",
        });
        await sleep(400);
      } catch (err) {
        notes.push(`Canal ${c.name}: ${(err as Error).message}`);
      }
    }
    notes.push("Canales restaurados (no se borran los actuales; se crean copias).");
  }

  if (opts.restoreEmojis !== false && fs.existsSync(path.join(dir, "emojis"))) {
    const files = fs.readdirSync(path.join(dir, "emojis"));
    const emojisMeta = fs.existsSync(path.join(dir, "emojis.json"))
      ? (JSON.parse(fs.readFileSync(path.join(dir, "emojis.json"), "utf8")) as { id: string; name: string }[])
      : [];
    for (const file of files) {
      const id = path.parse(file).name;
      const name = emojisMeta.find((e) => e.id === id)?.name ?? id.slice(0, 20);
      try {
        await guild.emojis.create({ attachment: path.join(dir, "emojis", file), name: name.slice(0, 32) });
        await sleep(800);
      } catch (err) {
        notes.push(`Emoji ${name}: ${(err as Error).message}`);
      }
    }
  }

  if (opts.restoreConfig !== false && fs.existsSync(path.join(dir, "config.json"))) {
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
      setGuildConfig(guild.id, cfg);
      notes.push("Configuración del bot restaurada.");
    } catch (err) {
      notes.push(`Config: ${(err as Error).message}`);
    }
  }

  const db = getDb();
  if (fs.existsSync(path.join(dir, "cases.json"))) {
    const cases = JSON.parse(fs.readFileSync(path.join(dir, "cases.json"), "utf8")) as Record<string, unknown>[];
    const ins = db.prepare(
      `INSERT OR IGNORE INTO cases (guild_id, case_id, type, user_id, moderator_id, reason, duration_ms, expires_at, active, extra, created_at)
       VALUES (@guild_id, @case_id, @type, @user_id, @moderator_id, @reason, @duration_ms, @expires_at, @active, @extra, @created_at)`,
    );
    const tx = db.transaction((rows: Record<string, unknown>[]) => {
      for (const r of rows) ins.run(r);
    });
    try {
      tx(cases);
      notes.push(`Sanciones importadas: ${cases.length}`);
    } catch (err) {
      notes.push(`Sanciones: ${(err as Error).message}`);
    }
  }
  if (fs.existsSync(path.join(dir, "levels.json"))) {
    const levels = JSON.parse(fs.readFileSync(path.join(dir, "levels.json"), "utf8")) as Record<string, unknown>[];
    const ins = db.prepare(
      `INSERT INTO levels (guild_id, user_id, xp, level, messages, voice_seconds, last_xp_at)
       VALUES (@guild_id, @user_id, @xp, @level, @messages, @voice_seconds, @last_xp_at)
       ON CONFLICT(guild_id, user_id) DO UPDATE SET xp=excluded.xp, level=excluded.level, messages=excluded.messages, voice_seconds=excluded.voice_seconds`,
    );
    const tx = db.transaction((rows: Record<string, unknown>[]) => {
      for (const r of rows) ins.run({ ...r, guild_id: guild.id });
    });
    try {
      tx(levels);
      notes.push(`Niveles importados: ${levels.length}`);
    } catch (err) {
      notes.push(`Niveles: ${(err as Error).message}`);
    }
  }

  notes.push("Los mensajes se conservan en el ZIP (no se reenvían masivamente para no floodear).");
  logger.info("restore done", guild.id, notes);
  return { notes };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function supportedType(t: number): ChannelType.GuildText | ChannelType.GuildVoice | ChannelType.GuildAnnouncement | ChannelType.GuildForum | ChannelType.GuildStageVoice | null {
  switch (t) {
    case ChannelType.GuildText:
      return ChannelType.GuildText;
    case ChannelType.GuildVoice:
      return ChannelType.GuildVoice;
    case ChannelType.GuildAnnouncement:
      return ChannelType.GuildAnnouncement;
    case ChannelType.GuildForum:
      return ChannelType.GuildForum;
    case ChannelType.GuildStageVoice:
      return ChannelType.GuildStageVoice;
    default:
      return null;
  }
}

function mapOverwrites(
  overwrites: { id: string; type: number; allow: string; deny: string }[],
  roleMap: Map<string, string>,
) {
  return overwrites
    .map((o) => {
      const id = roleMap.get(o.id) ?? o.id;
      return {
        id,
        allow: new PermissionsBitField(BigInt(o.allow)),
        deny: new PermissionsBitField(BigInt(o.deny)),
      };
    })
    .filter((o) => o.id);
}

export const RestorePermissions = PermissionFlagsBits.Administrator;
