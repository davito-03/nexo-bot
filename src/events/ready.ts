import { Events } from "discord.js";
import type { NexoClient } from "../client.js";
import { getDb, upsertMembers } from "../database/index.js";
import { logger } from "../logger.js";
import type { EventModule } from "../handlers/loadEvents.js";
import { syncVoiceSessions } from "../modules/voice/profile.js";
import { autoClaimUnclaimedMissions } from "../modules/missions/engine.js";
import { cleanupTempVoicePermissions } from "../modules/voicemaster/manager.js";
import { syncGuildBoosters } from "../modules/boosts/tracker.js";
import { OFFICIAL_GUILD_ID } from "../constants.js";
import { syncActiveGiveawayMessages } from "../modules/giveaways/manager.js";

const event: EventModule = {
  name: Events.ClientReady,
  once: true,
  async execute(client: unknown) {
    const c = client as NexoClient;
    logger.info(`Listo: ${c.user?.tag}`);
    for (const guild of c.guilds.cache.values()) {
      if (guild.id !== OFFICIAL_GUILD_ID) {
        await guild.leave().catch((err) => logger.error("No pude salir del guild no autorizado", err));
        continue;
      }
      try {
        const invites = await guild.invites.fetch();
        const map = new Map<string, { uses: number; inviterId: string | null }>();
        for (const inv of invites.values()) {
          map.set(inv.code, { uses: inv.uses ?? 0, inviterId: inv.inviter?.id ?? null });
          getDb()
            .prepare(
              `INSERT INTO invites (guild_id, code, inviter_id, uses) VALUES (?, ?, ?, ?)
               ON CONFLICT(guild_id, code) DO UPDATE SET uses = excluded.uses, inviter_id = excluded.inviter_id`,
            )
            .run(guild.id, inv.code, inv.inviter?.id ?? null, inv.uses ?? 0);
        }
        c.inviteCache.set(guild.id, map);
      } catch {
        logger.warn("No pude cachear invitaciones de", guild.id);
      }
      try {
        await guild.members.fetch();
        upsertMembers([...guild.members.cache.values()].map((m) => ({
            guildId: guild.id,
            userId: m.id,
            username: m.user.username,
            displayName: m.displayName,
            avatar: m.user.displayAvatarURL(),
            bot: m.user.bot,
            joinedAt: m.joinedTimestamp,
            roles: [...m.roles.cache.keys()],
          })));
      } catch {
        logger.warn("No pude cachear miembros de", guild.id);
      }

      try {
        const stats = await syncGuildBoosters(guild);
        logger.info(`[Boosts] Sincronizados ${stats.synced} boosters en ${guild.name} (${stats.totalBoosts} boosts totales)`);
      } catch (err) {
        logger.warn("No pude sincronizar boosters de", guild.id, err);
      }
      try {
        await syncActiveGiveawayMessages(guild);
      } catch (err) {
        logger.warn("No pude sincronizar mensajes de sorteos de", guild.id, err);
      }
    }

    try {
      syncVoiceSessions(c);
      await cleanupTempVoicePermissions(c);
      const claimed = await autoClaimUnclaimedMissions();
      if (claimed > 0) {
        logger.info(`Se cobraron automáticamente ${claimed} misiones pendientes.`);
      }
    } catch (e) {
      logger.error("error en sync ready", e);
    }
  },
};

export default event;
