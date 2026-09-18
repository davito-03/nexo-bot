import fs from "node:fs";
import path from "node:path";
import { createWriteStream } from "node:fs";
import archiver from "archiver";
import {
  ChannelType,
  Guild,
  type GuildBasedChannel,
  type OverwriteType,
} from "discord.js";
import { config } from "../../config.js";
import { getDb, getGuildConfig } from "../../database/index.js";
import { logger } from "../../logger.js";
import { sleep } from "../../utils/time.js";

export interface BackupMeta {
  version: 1;
  guildId: string;
  guildName: string;
  createdAt: number;
  createdBy: string;
  includes: {
    settings: boolean;
    roles: boolean;
    channels: boolean;
    emojis: boolean;
    members: boolean;
    bans: boolean;
    cases: boolean;
    levels: boolean;
    tickets: boolean;
    messages: boolean;
  };
}

function overwriteJson(ch: GuildBasedChannel) {
  if (!("permissionOverwrites" in ch)) return [];
  return [...ch.permissionOverwrites.cache.values()].map((o) => ({
    id: o.id,
    type: o.type as OverwriteType,
    allow: o.allow.bitfield.toString(),
    deny: o.deny.bitfield.toString(),
  }));
}

export async function createBackup(
  guild: Guild,
  createdBy: string,
  opts?: { includeMessages?: boolean; messageLimit?: number; includeMembers?: boolean },
): Promise<{ id: number; file: string; size: number }> {
  const cfg = getGuildConfig(guild.id);
  const includeMessages = opts?.includeMessages ?? cfg.backups.includeMessages;
  const messageLimit = opts?.messageLimit ?? cfg.backups.messageLimit;
  const includeMembers = opts?.includeMembers ?? cfg.backups.includeMembers;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(config.backupDir, guild.id, stamp);
  fs.mkdirSync(dir, { recursive: true });

  const meta: BackupMeta = {
    version: 1,
    guildId: guild.id,
    guildName: guild.name,
    createdAt: Date.now(),
    createdBy,
    includes: {
      settings: true,
      roles: true,
      channels: true,
      emojis: true,
      members: includeMembers,
      bans: true,
      cases: true,
      levels: true,
      tickets: true,
      messages: includeMessages,
    },
  };

  const guildJson = {
    id: guild.id,
    name: guild.name,
    description: guild.description,
    icon: guild.iconURL({ size: 4096 }),
    banner: guild.bannerURL({ size: 4096 }),
    splash: guild.splashURL({ size: 4096 }),
    verificationLevel: guild.verificationLevel,
    defaultMessageNotifications: guild.defaultMessageNotifications,
    explicitContentFilter: guild.explicitContentFilter,
    afkChannelId: guild.afkChannelId,
    afkTimeout: guild.afkTimeout,
    systemChannelId: guild.systemChannelId,
    rulesChannelId: guild.rulesChannelId,
    publicUpdatesChannelId: guild.publicUpdatesChannelId,
    preferredLocale: guild.preferredLocale,
    premiumTier: guild.premiumTier,
    premiumSubscriptionCount: guild.premiumSubscriptionCount,
    vanityURLCode: guild.vanityURLCode,
    features: guild.features,
    ownerId: guild.ownerId,
    nsfwLevel: guild.nsfwLevel,
  };
  fs.writeFileSync(path.join(dir, "guild.json"), JSON.stringify(guildJson, null, 2));
  fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify(cfg, null, 2));
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));

  const roles = [...guild.roles.cache.values()]
    .filter((r) => r.id !== guild.id)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.bitfield.toString(),
      position: r.position,
      unicodeEmoji: r.unicodeEmoji,
      icon: r.icon,
      managed: r.managed,
    }));
  fs.writeFileSync(path.join(dir, "roles.json"), JSON.stringify(roles, null, 2));

  const channels = [...guild.channels.cache.values()]
    .sort((a, b) => {
      const ap = "rawPosition" in a ? a.rawPosition : 0;
      const bp = "rawPosition" in b ? b.rawPosition : 0;
      return ap - bp;
    })
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId,
      position: "rawPosition" in c ? c.rawPosition : 0,
      topic: "topic" in c ? c.topic : null,
      nsfw: "nsfw" in c ? c.nsfw : false,
      rateLimitPerUser: "rateLimitPerUser" in c ? c.rateLimitPerUser : 0,
      bitrate: "bitrate" in c ? c.bitrate : null,
      userLimit: "userLimit" in c ? c.userLimit : null,
      rtcRegion: "rtcRegion" in c ? c.rtcRegion : null,
      defaultAutoArchiveDuration: "defaultAutoArchiveDuration" in c ? c.defaultAutoArchiveDuration : null,
      availableTags: "availableTags" in c ? c.availableTags : null,
      overwrites: overwriteJson(c),
    }));
  fs.writeFileSync(path.join(dir, "channels.json"), JSON.stringify(channels, null, 2));

  const emojis = [...guild.emojis.cache.values()].map((e) => ({
    id: e.id,
    name: e.name,
    animated: e.animated,
    url: e.imageURL({ size: 128 }),
    roles: [...e.roles.cache.keys()],
  }));
  fs.writeFileSync(path.join(dir, "emojis.json"), JSON.stringify(emojis, null, 2));
  const emojiDir = path.join(dir, "emojis");
  fs.mkdirSync(emojiDir, { recursive: true });
  for (const e of emojis) {
    try {
      const res = await fetch(e.url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(emojiDir, `${e.id}.${e.animated ? "gif" : "png"}`), buf);
      await sleep(150);
    } catch (err) {
      logger.warn("emoji download failed", e.id, err);
    }
  }

  try {
    const bans = await guild.bans.fetch();
    fs.writeFileSync(
      path.join(dir, "bans.json"),
      JSON.stringify([...bans.values()].map((b) => ({ id: b.user.id, tag: b.user.tag, reason: b.reason })), null, 2),
    );
  } catch {
    fs.writeFileSync(path.join(dir, "bans.json"), "[]");
  }

  if (includeMembers) {
    try {
      await guild.members.fetch();
    } catch {
      /* missing intent */
    }
    const members = [...guild.members.cache.values()].map((m) => ({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName,
      bot: m.user.bot,
      joinedAt: m.joinedTimestamp,
      roles: [...m.roles.cache.keys()].filter((id) => id !== guild.id),
      avatar: m.user.displayAvatarURL({ size: 256 }),
      booster: Boolean(m.premiumSince),
    }));
    fs.writeFileSync(path.join(dir, "members.json"), JSON.stringify(members, null, 2));
  }

  const db = getDb();
  fs.writeFileSync(
    path.join(dir, "cases.json"),
    JSON.stringify(db.prepare("SELECT * FROM cases WHERE guild_id = ?").all(guild.id), null, 2),
  );
  fs.writeFileSync(
    path.join(dir, "levels.json"),
    JSON.stringify(db.prepare("SELECT * FROM levels WHERE guild_id = ?").all(guild.id), null, 2),
  );
  fs.writeFileSync(
    path.join(dir, "tickets.json"),
    JSON.stringify(db.prepare("SELECT * FROM tickets WHERE guild_id = ?").all(guild.id), null, 2),
  );
  fs.writeFileSync(
    path.join(dir, "giveaways.json"),
    JSON.stringify(db.prepare("SELECT * FROM giveaways WHERE guild_id = ?").all(guild.id), null, 2),
  );
  fs.writeFileSync(
    path.join(dir, "role_rewards.json"),
    JSON.stringify(db.prepare("SELECT * FROM role_rewards WHERE guild_id = ?").all(guild.id), null, 2),
  );

  if (includeMessages) {
    const msgDir = path.join(dir, "messages");
    fs.mkdirSync(msgDir, { recursive: true });
    const textChannels = guild.channels.cache.filter((c) => c.isTextBased() && "messages" in c);
    for (const ch of textChannels.values()) {
      try {
        const collected: unknown[] = [];
        let last: string | undefined;
        while (collected.length < messageLimit) {
          const batch = await (ch as { messages: { fetch: Function } }).messages.fetch({
            limit: Math.min(100, messageLimit - collected.length),
            before: last,
          });
          if (!batch.size) break;
          for (const m of batch.values()) {
            collected.push({
              id: m.id,
              authorId: m.author?.id,
              authorTag: m.author?.tag,
              content: m.content,
              createdAt: m.createdTimestamp,
              attachments: [...m.attachments.values()].map((a: { url: string; name: string }) => ({
                url: a.url,
                name: a.name,
              })),
              embeds: m.embeds?.map((e: { toJSON: () => unknown }) => e.toJSON?.() ?? e) ?? [],
              pinned: m.pinned,
            });
          }
          last = batch.last()?.id;
          await sleep(400);
        }
        fs.writeFileSync(path.join(msgDir, `${ch.id}.json`), JSON.stringify(collected, null, 2));
      } catch (err) {
        logger.warn("message backup failed", ch.id, err);
      }
    }
  }

  const zipPath = `${dir}.zip`;
  await zipDirectory(dir, zipPath);
  fs.rmSync(dir, { recursive: true, force: true });
  const size = fs.statSync(zipPath).size;
  const rec = db
    .prepare("INSERT INTO backups (guild_id, created_by, path, size, includes, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(guild.id, createdBy, zipPath, size, JSON.stringify(meta.includes), Date.now());
  return { id: Number(rec.lastInsertRowid), file: zipPath, size };
}

export function pruneBackups(guildId: string, keep = 10): void {
  const rows = getDb().prepare("SELECT id, path FROM backups WHERE guild_id = ? ORDER BY created_at DESC").all(guildId) as { id: number; path: string }[];
  for (const row of rows.slice(keep)) {
    try { fs.rmSync(row.path, { force: true }); } catch (err) { logger.warn("No se pudo eliminar backup", row.path, err); }
    getDb().prepare("DELETE FROM backups WHERE id = ?").run(row.id);
  }
}

function zipDirectory(src: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(dest);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(src, false);
    void archive.finalize();
  });
}
