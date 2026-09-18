import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import type { NexoClient } from "../client.js";

export type SlashData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface Command {
  data: SlashData;
  execute: (interaction: ChatInputCommandInteraction, client: NexoClient) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction, client: NexoClient) => Promise<void>;
}
