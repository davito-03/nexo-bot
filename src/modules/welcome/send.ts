import { AttachmentBuilder, type MessageCreateOptions } from "discord.js";
import { baseEmbed } from "../../utils/embeds.js";

export function cardAnnouncement(opts: {
  text: string;
  image?: Buffer | null;
  filename: string;
  color: number;
  pingUserId?: string | null;
}): MessageCreateOptions {
  const embed = baseEmbed(opts.color).setDescription(opts.text);
  const allowedMentions = {
    parse: [] as [],
    users: opts.pingUserId ? [opts.pingUserId] : [],
    roles: [] as string[],
  };
  if (opts.image) {
    embed.setImage(`attachment://${opts.filename}`);
    return {
      embeds: [embed],
      files: [new AttachmentBuilder(opts.image, { name: opts.filename })],
      allowedMentions,
    };
  }
  return { embeds: [embed], allowedMentions };
}
