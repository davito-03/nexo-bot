import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import type { Command } from "./types/index.js";
import "./config.js";
import { logger } from "./logger.js";

export class NexoClient extends Client {
  commands = new Collection<string, Command>();
  inviteCache = new Map<string, Map<string, { uses: number; inviterId: string | null }>>();

  constructor() {
    const skipPrivileged = process.env.SKIP_PRIVILEGED_INTENTS === "1";
    if (skipPrivileged) {
      logger.warn(
        "Intents privilegiados desactivados (SKIP_PRIVILEGED_INTENTS=1). Activa MESSAGE CONTENT y SERVER MEMBERS en el portal y quita esa variable.",
      );
    }
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.AutoModerationExecution,
        GatewayIntentBits.GuildWebhooks,
        ...(skipPrivileged
          ? []
          : [GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent]),
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.User,
        Partials.Reaction,
        Partials.ThreadMember,
        Partials.GuildScheduledEvent,
      ],
    });
  }
}
