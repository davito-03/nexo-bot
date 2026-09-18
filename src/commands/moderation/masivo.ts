import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { NexoClient } from "../../client.js";
import { runMass } from "../../modules/moderation/mass.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("masivo")
    .setDescription("Acciones de moderación masiva sobre múltiples usuarios")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s
        .setName("warn")
        .setDescription("Advertir a varios usuarios a la vez")
        .addStringOption((o) =>
          o.setName("usuarios").setDescription("Menciones o IDs: @uno @dos @tres").setRequired(true),
        )
        .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("kick")
        .setDescription("Expulsar a varios usuarios a la vez")
        .addStringOption((o) =>
          o.setName("usuarios").setDescription("Menciones o IDs: @uno @dos @tres").setRequired(true),
        )
        .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("timeout")
        .setDescription("Silenciar temporalmente a varios usuarios a la vez")
        .addStringOption((o) =>
          o.setName("usuarios").setDescription("Menciones o IDs: @uno @dos @tres").setRequired(true),
        )
        .addStringOption((o) => o.setName("duracion").setDescription("Ej: 10m, 1h, 7d").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("ban")
        .setDescription("Banear a varios usuarios a la vez")
        .addStringOption((o) =>
          o.setName("usuarios").setDescription("Menciones o IDs: @uno @dos @tres").setRequired(true),
        )
        .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("borrar_dias").setDescription("Días de mensajes a borrar (0-7)").setMinValue(0).setMaxValue(7),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("tempban")
        .setDescription("Banear temporalmente a varios usuarios a la vez")
        .addStringOption((o) =>
          o.setName("usuarios").setDescription("Menciones o IDs: @uno @dos @tres").setRequired(true),
        )
        .addStringOption((o) => o.setName("duracion").setDescription("Ej: 1h, 7d, 2w").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("borrar_dias").setDescription("Días de mensajes a borrar (0-7)").setMinValue(0).setMaxValue(7),
        ),
    ),
  execute: (i: ChatInputCommandInteraction, c: NexoClient) => {
    const sub = i.options.getSubcommand() as "warn" | "kick" | "ban" | "timeout" | "tempban";
    return runMass(i, c, sub);
  },
};

export default command;
