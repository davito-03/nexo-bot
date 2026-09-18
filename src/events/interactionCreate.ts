import { Events, type Interaction } from "discord.js";
import type { NexoClient } from "../client.js";
import { handleInteraction } from "../handlers/interactions.js";
import type { EventModule } from "../handlers/loadEvents.js";

const event: EventModule = {
  name: Events.InteractionCreate,
  async execute(interaction: unknown) {
    const i = interaction as Interaction;
    await handleInteraction(i, i.client as NexoClient);
  },
};

export default event;
