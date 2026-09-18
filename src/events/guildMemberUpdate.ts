import { Events, type GuildMember } from "discord.js";
import { getDb, getGuildConfig, upsertMember } from "../database/index.js";
import { replacePlaceholders } from "../utils/format.js";
import { boostCard } from "../modules/welcome/cards.js";
import { cardAnnouncement } from "../modules/welcome/send.js";
import { describeMemberUpdate } from "../modules/logs/register.js";
import { logEmbed, sendLog } from "../modules/logs/dispatch.js";
import { COLORS } from "../constants.js";
import { refreshMemberGiveawayEntries } from "../modules/giveaways/manager.js";
import type { EventModule } from "../handlers/loadEvents.js";

const event: EventModule = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: unknown, newMember: unknown) {
    const oldM = oldMember as GuildMember;
    const newM = newMember as GuildMember;
    upsertMember({
      guildId: newM.guild.id,
      userId: newM.id,
      username: newM.user.username,
      displayName: newM.displayName,
      avatar: newM.user.displayAvatarURL(),
      bot: newM.user.bot,
      roles: [...newM.roles.cache.keys()],
    });
    const changes = describeMemberUpdate(oldM, newM);
    if (changes.length) {
      await sendLog(
        newM.guild,
        "members",
        logEmbed("Miembro actualizado", COLORS.info).setDescription(`${newM} (\`${newM.id}\`)\n${changes.join("\n")}`),
      );
    }
    const db = getDb();
    if (newM.premiumSince) {
      db.prepare(`
        INSERT INTO member_boosts (guild_id, user_id, boost_count, updated_at)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET updated_at = excluded.updated_at
      `).run(newM.guild.id, newM.id, Date.now());
    } else if (oldM.premiumSince && !newM.premiumSince) {
      db.prepare("DELETE FROM member_boosts WHERE guild_id = ? AND user_id = ?").run(newM.guild.id, newM.id);
    }

    if (Boolean(oldM.premiumSince) !== Boolean(newM.premiumSince)) {
      await refreshMemberGiveawayEntries(newM);
    }

    const boosted = !oldM.premiumSince && Boolean(newM.premiumSince);
    if (!boosted) return;
    const cfg = getGuildConfig(newM.guild.id);
    const boosts = newM.guild.premiumSubscriptionCount ?? 0;
    await sendLog(
      newM.guild,
      "boosts",
      logEmbed("Nuevo boost", COLORS.boost).setDescription(`${newM} (\`${newM.id}\`) ha impulsado el servidor. Boosts: **${boosts}**.`),
    );
    if (!cfg.boost.enabled || !cfg.boost.channelId) return;
    const ch = newM.guild.channels.cache.get(cfg.boost.channelId);
    if (!ch?.isTextBased() || !("send" in ch)) return;
    const text = replacePlaceholders(cfg.boost.message, {
      user: `${newM}`,
      name: newM.displayName,
      boosts,
      guild: newM.guild.name,
    });
    let image: Buffer | null = null;
    if (cfg.boost.withImage) {
      try {
        image = await boostCard(newM, boosts);
      } catch {
        image = null;
      }
    }
    await ch.send(
      cardAnnouncement({
        text,
        image,
        filename: "boost.png",
        color: COLORS.boost,
        pingUserId: newM.id,
      }),
    );
  },
};

export default event;
