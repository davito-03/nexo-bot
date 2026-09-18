import { Events, type GuildMember } from "discord.js";
import type { NexoClient } from "../client.js";
import { getDb, getGuildConfig, upsertMember } from "../database/index.js";
import { replacePlaceholders } from "../utils/format.js";
import { welcomeCard } from "../modules/welcome/cards.js";
import { cardAnnouncement } from "../modules/welcome/send.js";
import { logEmbed, sendLog } from "../modules/logs/dispatch.js";
import { COLORS } from "../constants.js";
import type { EventModule } from "../handlers/loadEvents.js";

const event: EventModule = {
  name: Events.GuildMemberAdd,
  async execute(member: unknown) {
    const m = member as GuildMember;
    upsertMember({
      guildId: m.guild.id,
      userId: m.id,
      username: m.user.username,
      displayName: m.displayName,
      avatar: m.user.displayAvatarURL(),
      bot: m.user.bot,
      joinedAt: m.joinedTimestamp,
      leftAt: null,
      roles: [...m.roles.cache.keys()],
    });

    const client = m.client as NexoClient;
    let used: { code: string; inviterId: string | null } | null = null;
    try {
      const invites = await m.guild.invites.fetch();
      const prev = client.inviteCache.get(m.guild.id) ?? new Map();
      for (const inv of invites.values()) {
        const old = prev.get(inv.code);
        if ((inv.uses ?? 0) > (old?.uses ?? 0)) {
          used = { code: inv.code, inviterId: inv.inviter?.id ?? old?.inviterId ?? null };
        }
        prev.set(inv.code, { uses: inv.uses ?? 0, inviterId: inv.inviter?.id ?? null });
      }
      client.inviteCache.set(m.guild.id, prev);
    } catch {
      /* no permission */
    }
    if (used) {
      getDb()
        .prepare("INSERT INTO join_invites (guild_id, user_id, code, inviter_id, joined_at) VALUES (?, ?, ?, ?, ?)")
        .run(m.guild.id, m.id, used.code, used.inviterId, Date.now());
    }

    const cfg = getGuildConfig(m.guild.id);
    const count = m.guild.memberCount;
    await sendLog(
      m.guild,
      "joins",
      logEmbed("Miembro entra", COLORS.success)
        .setDescription(`${m} (\`${m.id}\`)`)
        .addFields(
          { name: "Cuenta creada", value: `<t:${Math.floor(m.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: "Invitación", value: used ? `\`${used.code}\` por ${used.inviterId ? `<@${used.inviterId}> (\`${used.inviterId}\`)` : "?"}` : "desconocida", inline: true },
        )
        .setThumbnail(m.user.displayAvatarURL()),
    );
    await sendLog(m.guild, "members", logEmbed("Join", COLORS.success).setDescription(`${m} (\`${m.id}\`) · miembros **${count}**`));

    if (!cfg.welcome.enabled || !cfg.welcome.channelId) return;
    const ch = m.guild.channels.cache.get(cfg.welcome.channelId);
    if (!ch?.isTextBased() || !("send" in ch)) return;
    const text = replacePlaceholders(cfg.welcome.message, {
      user: `${m}`,
      tag: m.user.tag,
      name: m.displayName,
      count,
      guild: m.guild.name,
    });
    let image: Buffer | null = null;
    if (cfg.welcome.withImage) {
      try {
        image = await welcomeCard(m, count);
      } catch {
        image = null;
      }
    }
    await ch.send(
      cardAnnouncement({
        text,
        image,
        filename: "welcome.png",
        color: COLORS.primary,
        pingUserId: m.id,
      }),
    );
  },
};

export default event;
