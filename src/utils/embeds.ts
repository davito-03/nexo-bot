import {
  EmbedBuilder,
  MessageFlags,
  type ColorResolvable,
  type InteractionReplyOptions,
} from "discord.js";
import { COLORS, SANCTION_STYLE, SERVER_NAME } from "../constants.js";

export function baseEmbed(color: ColorResolvable = COLORS.primary): EmbedBuilder {
  return new EmbedBuilder().setColor(color).setTimestamp().setFooter({ text: `${SERVER_NAME} · gatitos y caos` });
}

export function successEmbed(title: string, description?: string): EmbedBuilder {
  const e = baseEmbed(COLORS.success).setTitle(`✅  ${title}`);
  if (description) e.setDescription(description);
  return e;
}

export function errorEmbed(title: string, description?: string): EmbedBuilder {
  const e = baseEmbed(COLORS.danger).setTitle(`❌  ${title}`);
  if (description) e.setDescription(description);
  return e;
}

export function infoEmbed(title: string, description?: string): EmbedBuilder {
  const e = baseEmbed(COLORS.info).setTitle(`ℹ️  ${title}`);
  if (description) e.setDescription(description);
  return e;
}

export function warnEmbed(title: string, description?: string): EmbedBuilder {
  const e = baseEmbed(COLORS.warn).setTitle(`⚠️  ${title}`);
  if (description) e.setDescription(description);
  return e;
}

export function modEmbed(title: string, description?: string): EmbedBuilder {
  const e = baseEmbed(COLORS.danger).setTitle(`🛡️  ${title}`);
  if (description) e.setDescription(description);
  return e;
}

export function ecoEmbed(title: string, description?: string): EmbedBuilder {
  const e = baseEmbed(COLORS.eco).setTitle(`🐱  ${title}`);
  if (description) e.setDescription(description);
  return e;
}

export function crimeEmbed(title: string, description?: string): EmbedBuilder {
  const e = baseEmbed(COLORS.crime).setTitle(`🕶️  ${title}`);
  if (description) e.setDescription(description);
  return e;
}

export function casinoEmbed(title: string, description?: string): EmbedBuilder {
  const e = baseEmbed(COLORS.casino).setTitle(`🎰  ${title}`);
  if (description) e.setDescription(description);
  return e;
}

export function voiceEmbed(title: string, description?: string): EmbedBuilder {
  const e = baseEmbed(COLORS.voice).setTitle(`🔊  ${title}`);
  if (description) e.setDescription(description);
  return e;
}

export function ticketEmbed(title: string, description?: string): EmbedBuilder {
  const e = baseEmbed(COLORS.ticket).setTitle(`🎫  ${title}`);
  if (description) e.setDescription(description);
  return e;
}

export function sanctionColor(type: string): number {
  return SANCTION_STYLE[type]?.color ?? COLORS.danger;
}

export function ephemeral(embeds: EmbedBuilder[], extra?: InteractionReplyOptions): InteractionReplyOptions {
  return { embeds, flags: MessageFlags.Ephemeral, ...extra };
}

export function onlyGuild(): InteractionReplyOptions {
  return ephemeral([errorEmbed("Solo en servidor", "Este comando se usa dentro de un servidor.")]);
}
