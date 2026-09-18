import {
  GuildMember,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Guild,
} from "discord.js";
import { getGuildConfig } from "../database/index.js";
import { NEXO_OWNER_ROLE_ID, NEXO_STAFF_ROLE_ID } from "../constants.js";

function hasNexoStaffRole(member: GuildMember): boolean {
  return member.roles.cache.has(NEXO_STAFF_ROLE_ID) || member.roles.cache.has(NEXO_OWNER_ROLE_ID);
}

export function isStaff(member: GuildMember): boolean {
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers) || member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }
  if (hasNexoStaffRole(member)) return true;
  const cfg = getGuildConfig(member.guild.id);
  return cfg.staffRoles.some((id) => member.roles.cache.has(id)) || cfg.adminRoles.some((id) => member.roles.cache.has(id));
}

export function isAdmin(member: GuildMember): boolean {
  if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }
  if (member.roles.cache.has(NEXO_OWNER_ROLE_ID)) return true;
  const cfg = getGuildConfig(member.guild.id);
  return cfg.adminRoles.some((id) => member.roles.cache.has(id));
}

export function canModerate(moderator: GuildMember, target: GuildMember): string | null {
  if (moderator.id === target.id) return "No puedes sancionarte a ti mismo.";
  if (target.id === moderator.guild.ownerId) return "No puedes sancionar al dueño del servidor.";
  if (target.user.bot) return "No puedes sancionar bots con este comando.";
  const me = moderator.guild.members.me;
  if (me && target.roles.highest.position >= me.roles.highest.position) {
    return "Mi rol está por debajo o al mismo nivel que el del objetivo.";
  }
  if (moderator.id !== moderator.guild.ownerId && target.roles.highest.position >= moderator.roles.highest.position) {
    return "No puedes sancionar a alguien con un rol igual o superior al tuyo.";
  }
  return null;
}

export async function requireStaff(interaction: ChatInputCommandInteraction): Promise<GuildMember | null> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "Este comando solo funciona en un servidor.", ephemeral: true });
    return null;
  }
  const member = interaction.member;
  if (!isStaff(member)) {
    await interaction.reply({ content: "Necesitas ser staff para usar este comando.", ephemeral: true });
    return null;
  }
  return member;
}

export async function requireAdmin(interaction: ChatInputCommandInteraction): Promise<GuildMember | null> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "Este comando solo funciona en un servidor.", ephemeral: true });
    return null;
  }
  if (!isAdmin(interaction.member)) {
    await interaction.reply({ content: "Necesitas permisos de administrador para esto.", ephemeral: true });
    return null;
  }
  return interaction.member;
}

export function me(guild: Guild) {
  return guild.members.me;
}
