import { GuildMember, User } from "discord.js";

export function userTag(user: User | GuildMember): string {
  const u = user instanceof GuildMember ? user.user : user;
  return `${u.tag} (\`${u.id}\`)`;
}

export function truncate(text: string, max = 1024): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function code(text: string): string {
  return `\`${text.replace(/`/g, "'")}\``;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function replacePlaceholders(
  template: string,
  data: Record<string, string | number | undefined | null>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(data[key] ?? `{${key}}`));
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
