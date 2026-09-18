import { Events, type Invite } from "discord.js";
import type { EventModule } from "../handlers/loadEvents.js";
import type { NexoClient } from "../client.js";

const event: EventModule = {
  name: Events.InviteDelete,
  async execute(invite: unknown) {
    const inv = invite as Invite;
    if (!inv.guild) return;
    const client = inv.client as NexoClient;

    const cache = client.inviteCache.get(inv.guild.id);
    if (cache) {
      cache.delete(inv.code);
    }
  },
};

export default event;
