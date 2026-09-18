import { Events, type Message } from "discord.js";
import { DISBOARD_BOT_ID } from "../constants.js";
import { handleDisboardMessage } from "../modules/bump/engine.js";
import type { EventModule } from "../handlers/loadEvents.js";

const event: EventModule = {
  name: Events.MessageUpdate,
  async execute(oldMessage: unknown, newMessage: unknown) {
    const msg = newMessage as Message;
    if (!msg || !msg.inGuild()) return;

    if (msg.author?.id === DISBOARD_BOT_ID) {
      await handleDisboardMessage(msg);
    }
  },
};

export default event;
