import { InteractionType, type Interaction } from "discord.js";
import type { NexoClient } from "../client.js";
import { logger } from "../logger.js";
import { errorEmbed } from "../utils/embeds.js";
import { handleVoiceButton, handleVoiceModal, handleVoiceSelect, handleVoiceUserSelect } from "../modules/voicemaster/manager.js";
import { handleTicketButton, openTicket } from "../modules/tickets/manager.js";
import { handleJoin } from "../modules/giveaways/manager.js";
import { handleRpsButton } from "../commands/fun/rps.js";
import { handleBlackjack } from "../commands/economy/casino.js";
import { handleCasinoButton, handleCasinoModal } from "../modules/economy/tables.js";
import { handleEventButton } from "../modules/events/rsvp.js";
import { handleMissionButton } from "../commands/community/mision.js";
import { handleAppealButton, handleAppealModal } from "../modules/moderation/appeals.js";
import { handleTradeButton } from "../modules/economy/trade.js";
import { renderShopView } from "../modules/economy/shop.js";
import { handleRpgButton } from "../commands/rpg/rpg.js";
import { handleHelpSelect } from "../commands/info/help.js";
import { handleGalleryButton } from "../commands/economy/galeria.js";
import { handleBumpButton } from "../modules/bump/engine.js";
import { logEmbed, sendLog } from "../modules/logs/dispatch.js";
import { getGuildConfig } from "../database/index.js";
import { COLORS } from "../constants.js";
import { handlePollButton, handlePollVote } from "../modules/community/polls.js";
import { handleMarriageButton } from "../modules/community/marriages.js";
import { handleConecta4Button } from "../commands/fun/conecta4.js";
import { handleCardTradeButton } from "../modules/economy/cards.js";
import { handleSelfroleSelect } from "../modules/community/selfroles.js";

function formatCommandOptions(options: readonly any[]): string {
  const parts: string[] = [];
  for (const opt of options) {
    if (opt.value !== undefined) {
      parts.push(`${opt.name}:${opt.value}`);
    } else if (opt.options) {
      parts.push(opt.name);
      parts.push(formatCommandOptions(opt.options));
    } else {
      parts.push(opt.name);
    }
  }
  return parts.join(" ");
}

export async function handleInteraction(interaction: Interaction, client: NexoClient): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== "say" && interaction.guild) {
        const cfg = getGuildConfig(interaction.guild.id);
        const targetType = cfg.logs.commands ? "commands" : (cfg.logs.audit ? "audit" : "moderation");
        const optStr = formatCommandOptions(interaction.options.data);
        const fullCmd = `/${interaction.commandName}${optStr ? ` ${optStr}` : ""}`;
        const emb = logEmbed("⌨️ Comando ejecutado", COLORS.info)
          .addFields(
            { name: "Usuario", value: `${interaction.user} (\`${interaction.user.id}\` · \`${interaction.user.tag}\`)`, inline: true },
            { name: "Canal", value: `<#${interaction.channelId}> (\`${interaction.channelId}\`)`, inline: true },
            { name: "Comando", value: `\`${fullCmd.slice(0, 1000)}\`` },
          );
        sendLog(interaction.guild, targetType, emb).catch(() => null);
      }

      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) {
        await interaction.reply({ content: "Comando desconocido.", ephemeral: true });
        return;
      }
      await cmd.execute(interaction, client);
      return;
    }
    if (interaction.isAutocomplete()) {
      const cmd = client.commands.get(interaction.commandName);
      await cmd?.autocomplete?.(interaction, client);
      return;
    }
    if (interaction.isButton()) {
      const id = interaction.customId;
      if (id.startsWith("trade:")) return void (await handleTradeButton(interaction));
      if (id.startsWith("rpg:")) return void (await handleRpgButton(interaction));
      if (id.startsWith("appeal:")) return void (await handleAppealButton(interaction));
      if (id.startsWith("vm:")) return void (await handleVoiceButton(interaction));
      if (id.startsWith("ticket:")) return void (await handleTicketButton(interaction));
      if (id.startsWith("gw:join:")) return void (await handleJoin(interaction));
      if (id.startsWith("gallery:")) return void (await handleGalleryButton(interaction));
      if (id.startsWith("rps:")) return void (await handleRpsButton(interaction));
      if (id.startsWith("bj:")) return void (await handleBlackjack(interaction));
      if (id.startsWith("cs:")) return void (await handleCasinoButton(interaction));
      if (id.startsWith("ev:")) return void (await handleEventButton(interaction));
      if (id.startsWith("ms:")) return void (await handleMissionButton(interaction));
      if (id.startsWith("bump:")) return void (await handleBumpButton(interaction));
      if (id.startsWith("poll:")) return void (await handlePollButton(interaction, client));
      if (id.startsWith("marry:")) return void (await handleMarriageButton(interaction, client));
      if (id.startsWith("c4:")) return void (await handleConecta4Button(interaction, client));
      if (id.startsWith("ctrade:")) return void (await handleCardTradeButton(interaction));
      return;
    }
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith("poll:")) {
        return void (await handlePollVote(interaction, client));
      }
      if (interaction.customId === "shop:category") {
        const cat = interaction.values[0] || "todas";
        const view = renderShopView(interaction.guildId!, cat);
        await interaction.update({ embeds: [view.embed], components: [view.row] });
        return;
      }
      if (interaction.customId === "help:category") {
        return void (await handleHelpSelect(interaction, client));
      }
      if (interaction.customId === "ticket:open") return void (await openTicket(interaction));
      if (interaction.customId.startsWith("vm:")) return void (await handleVoiceSelect(interaction));
      if (interaction.customId.startsWith("sr:panel:")) return void (await handleSelfroleSelect(interaction));
      return;
    }
    if (interaction.isUserSelectMenu()) {
      if (interaction.customId.startsWith("vm:")) return void (await handleVoiceUserSelect(interaction));
      return;
    }
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("appeal:")) return void (await handleAppealModal(interaction));
      if (interaction.customId.startsWith("vm:")) return void (await handleVoiceModal(interaction));
      if (interaction.customId.startsWith("csm:")) return void (await handleCasinoModal(interaction));
    }
  } catch (err) {
    logger.error("interaction", err);
    const payload = { embeds: [errorEmbed("Error", "Ha ocurrido un error al procesar esto. El staff ya puede ver el log.")], ephemeral: true };
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => null);
      else await interaction.reply(payload).catch(() => null);
    }
  }
  void InteractionType;
}
