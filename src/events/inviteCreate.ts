import { Events, type Invite } from "discord.js";
import type { EventModule } from "../handlers/loadEvents.js";
import type { NexoClient } from "../client.js";
import { getDb } from "../database/index.js";

const event: EventModule = {
  name: Events.InviteCreate,
  async execute(invite: unknown) {
    const inv = invite as Invite;
    if (!inv.guild) return;
    const client = inv.client as NexoClient;

    const cache = client.inviteCache.get(inv.guild.id) ?? new Map();
    cache.set(inv.code, { uses: inv.uses ?? 0, inviterId: inv.inviter?.id ?? null });
    client.inviteCache.set(inv.guild.id, cache);

    getDb()
      .prepare(
        `INSERT INTO invites (guild_id, code, inviter_id, uses) VALUES (?, ?, ?, ?)
         ON CONFLICT(guild_id, code) DO UPDATE SET uses = excluded.uses, inviter_id = excluded.inviter_id`,
      )
      .run(inv.guild.id, inv.code, inv.inviter?.id ?? null, inv.uses ?? 0);
  },
};

export default event;
