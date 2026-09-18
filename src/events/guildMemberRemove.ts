import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { getGuildConfig, upsertMember } from "../database/index.js";
import { replacePlaceholders } from "../utils/format.js";
import { logEmbed, sendLog } from "../modules/logs/dispatch.js";
import { COLORS } from "../constants.js";
import type { EventModule } from "../handlers/loadEvents.js";

const event: EventModule = {
  name: Events.GuildMemberRemove,
  async execute(member: unknown) {
    const m = member as GuildMember | PartialGuildMember;
    if (!m.guild) return;
    const user = m.user;
    upsertMember({
      guildId: m.guild.id,
      userId: m.id,
      username: user?.username,
      displayName: (m as GuildMember).displayName ?? user?.username,
      bot: user?.bot,
      leftAt: Date.now(),
    });
    await sendLog(
      m.guild,
      "members",
      logEmbed("Miembro sale", COLORS.danger)
        .setDescription(`${user?.tag ?? m.id} (\`${m.id}\`)`)
        .addFields({ name: "Miembros", value: String(m.guild.memberCount), inline: true }),
    );
    const cfg = getGuildConfig(m.guild.id);
    if (!cfg.goodbye.enabled || !cfg.goodbye.channelId) return;
    const ch = m.guild.channels.cache.get(cfg.goodbye.channelId);
    if (!ch?.isTextBased() || !("send" in ch)) return;
    await ch.send({
      content: replacePlaceholders(cfg.goodbye.message, {
        user: m.user?.tag ?? m.id,
        name: m.user?.username ?? m.id,
        count: m.guild.memberCount,
        guild: m.guild.name,
      }),
    });
  },
};

export default event;
