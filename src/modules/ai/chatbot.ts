import { WebhookClient, type Message, type TextChannel } from "discord.js";
import { getGuildConfig } from "../../database/index.js";
import { getChannelHistory, rememberChannelMessage } from "./memory.js";
import { completeChat } from "./client.js";
import { logger } from "../../logger.js";

const queues = new Map<string, Promise<void>>();
const webhooks = new Map<string, WebhookClient>();

export function isConfiguredChatbotChannel(message: Message): boolean {
  if (!message.inGuild()) return false;
  return getGuildConfig(message.guild.id).ai.chatbotChannels.some((c) => c.channelId === message.channelId);
}

export function handleChatbotMessage(message: Message): void {
  if (!message.inGuild() || message.author.bot) return;
  const character = getGuildConfig(message.guild.id).ai.chatbotChannels.find((c) => c.channelId === message.channelId);
  if (!character) return;
  const previous = queues.get(message.channelId) ?? Promise.resolve();
  const next = previous.then(() => respond(message, character)).catch((err) => logger.error("chatbot", err));
  let tracked!: Promise<void>;
  tracked = next.finally(() => { if (queues.get(message.channelId) === tracked) queues.delete(message.channelId); });
  queues.set(message.channelId, tracked);
}

async function respond(message: Message, character: { channelId: string; character: string; systemPrompt: string }): Promise<void> {
  rememberChannelMessage(message.channelId, "user", `${message.author.displayName}: ${message.content}`);
  const result = await completeChat({
    system: character.systemPrompt || `Interpreta a ${character.character}. No afirmes ser la persona real. Responde en español y mantén claro que eres un personaje virtual.`,
    messages: getChannelHistory(message.channelId),
  });
  if (!result || !message.channel.isTextBased() || !("createWebhook" in message.channel)) return;
  const channel = message.channel as TextChannel;
  rememberChannelMessage(message.channelId, "assistant", result.text);
  let webhook = webhooks.get(message.channelId);
  if (!webhook) {
    const hookName = `Nexo · ${character.character}`;
    const existing = [...(await channel.fetchWebhooks().catch(() => new Map())).values()]
          .find((hook) => hook.name === hookName && hook.token)
    const created = existing ?? await channel.createWebhook({ name: hookName }).catch(() => null);
    const token = created?.token;
    if (!created || !token) return;
    webhook = new WebhookClient({ id: created.id, token });
    webhooks.set(message.channelId, webhook);
  }
  await webhook.send({ username: character.character.slice(0, 80), content: result.text.slice(0, 2000), allowedMentions: { parse: [] } }).catch((err) => logger.warn("chatbot webhook", err));
}
