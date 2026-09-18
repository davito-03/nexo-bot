import { Events, type Message } from "discord.js";
import { archiveMessage } from "../database/index.js";
import { handleAutomod } from "../modules/automod/engine.js";
import { handleMessageXp } from "../modules/levels/engine.js";
import { handleTicketMessage } from "../modules/tickets/manager.js";
import { CONFESSIONS_CHANNEL_ID, DISBOARD_BOT_ID, BOOST_CHANNEL_ID } from "../constants.js";
import { getGuildConfig } from "../database/index.js";
import type { EventModule } from "../handlers/loadEvents.js";
import { bumpMission } from "../modules/missions/engine.js";
import { madridDay } from "../utils/time.js";
import { handleDisboardMessage } from "../modules/bump/engine.js";
import { handleBoostChannelMessage } from "../modules/boosts/tracker.js";
import { handleChatbotMessage, isConfiguredChatbotChannel } from "../modules/ai/chatbot.js";
import { handleCountingMessage } from "../modules/counting/engine.js";

const event: EventModule = {
  name: Events.MessageCreate,
  async execute(message: unknown) {
    const msg = message as Message;

    if (!msg.inGuild()) return;

    // Detectar bumps de DISBOARD para recompensar al usuario y actualizar racha
    if (msg.author.id === DISBOARD_BOT_ID) {
      await handleDisboardMessage(msg);
      return;
    }

    // Detectar avisos de boosts (Sapphire, bots o mensajes de sistema) en el canal de boosts
    if (msg.channelId === BOOST_CHANNEL_ID || msg.channelId === msg.guild.systemChannelId) {
      await handleBoostChannelMessage(msg);
    }

    if (msg.author.bot) return;

    if (isConfiguredChatbotChannel(msg)) {
      handleChatbotMessage(msg);
      return;
    }

    // Canal del contador (Counting Game)
    const handledCounting = await handleCountingMessage(msg);
    if (handledCounting) return;

    // Canal exclusivo de confesiones: eliminar cualquier mensaje de usuario
    const cfg = getGuildConfig(msg.guild.id);
    const isConfessionsCh = msg.channelId === CONFESSIONS_CHANNEL_ID || msg.channelId === cfg.confessions?.channelId;
    if (isConfessionsCh) {
      await msg.delete().catch(() => null);
      if (msg.channel.isTextBased() && "send" in msg.channel) {
        const warn = await msg.channel.send({
          content: `${msg.author}, este canal es exclusivo para confesiones anónimas. Usa el comando \`/confesar enviar\` para publicar una confesión.`,
        }).catch(() => null);
        if (warn) setTimeout(() => warn.delete().catch(() => null), 6000);
      }
      return;
    }

    archiveMessage({
      messageId: msg.id,
      guildId: msg.guild.id,
      channelId: msg.channelId,
      authorId: msg.author.id,
      authorTag: msg.author.tag,
      content: msg.content,
      attachments: [...msg.attachments.values()].map((a) => a.url),
      createdAt: msg.createdTimestamp,
    });
    const blocked = await handleAutomod(msg);
    if (blocked) return;

    // Misiones de participación en chat (independientes del nivel o XP)
    const day = madridDay();
    bumpMission(msg.guild.id, msg.author.id, "chat_5", day);
    bumpMission(msg.guild.id, msg.author.id, "chat_3", day);

    await handleTicketMessage(msg);
    await handleMessageXp(msg);
  },
};


export default event;
