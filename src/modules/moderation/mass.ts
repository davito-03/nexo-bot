import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
  type User,
} from "discord.js";
import type { NexoClient } from "../../client.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed, successEmbed, warnEmbed } from "../../utils/embeds.js";
import { parseDuration } from "../../utils/time.js";
import {
  banMember,
  kickMember,
  softbanMember,
  timeoutMember,
  warnMember,
} from "./actions.js";

const MENTION_RE = /<@!?(\d{17,20})>/g;
const ID_RE = /\b(\d{17,20})\b/g;
const MAX_TARGETS = 15;

export function massBuilder(name: string, description: string, extra?: "duration" | "ban" | "tempban") {
  const b = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((o) =>
      o
        .setName("usuarios")
        .setDescription("Menciones o IDs: @uno @dos @tres")
        .setRequired(true),
    )
    .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true));
  if (extra === "duration" || extra === "ban" || extra === "tempban") {
    b.addStringOption((o) =>
      o
        .setName("duracion")
        .setDescription("Ej: 10m, 1h, 7d")
        .setRequired(extra === "duration" || extra === "tempban"),
    );
  }
  if (extra === "ban" || extra === "tempban") {
    b.addIntegerOption((o) =>
      o.setName("borrar_dias").setDescription("Días de mensajes a borrar (0-7)").setMinValue(0).setMaxValue(7),
    );
  }
  for (let i = 2; i <= 6; i++) {
    b.addUserOption((o) => o.setName(`extra${i}`).setDescription(`Usuario extra ${i}`));
  }
  return b;
}

export function collectTargets(interaction: ChatInputCommandInteraction): string[] {
  const ids = new Set<string>();
  const raw = interaction.options.getString("usuarios") ?? "";
  for (const m of raw.matchAll(MENTION_RE)) ids.add(m[1]!);
  for (const m of raw.matchAll(ID_RE)) ids.add(m[1]!);
  for (let i = 2; i <= 6; i++) {
    const u = interaction.options.getUser(`extra${i}`);
    if (u) ids.add(u.id);
  }
  ids.delete(interaction.user.id);
  ids.delete(interaction.client.user?.id ?? "");
  return [...ids].slice(0, MAX_TARGETS);
}

export async function runMass(
  interaction: ChatInputCommandInteraction,
  client: NexoClient,
  kind: "warn" | "kick" | "ban" | "tempban" | "timeout" | "softban",
): Promise<void> {
  const staff = await requireStaff(interaction);
  if (!staff) return;
  const guild = interaction.guild!;
  const ids = collectTargets(interaction);
  if (!ids.length) {
    await interaction.reply({
      embeds: [errorEmbed("Sin objetivos", "Menciona usuarios o pega IDs en `usuarios`. Máximo 15.")],
      ephemeral: true,
    });
    return;
  }
  const reason = interaction.options.getString("razon", true);
  let durationMs: number | null = null;
  if (kind === "timeout" || kind === "tempban") {
    const raw = interaction.options.getString("duracion");
    durationMs = raw ? parseDuration(raw) : null;
    if (!durationMs) {
      await interaction.reply({
        embeds: [errorEmbed("Duración inválida", "Usa valores como `10m`, `1h` o `7d`.")],
        ephemeral: true,
      });
      return;
    }
  }
  const deleteDays = interaction.options.getInteger("borrar_dias") ?? 1;
  await interaction.deferReply();
  const ok: string[] = [];
  const fail: string[] = [];

  for (const id of ids) {
    try {
      const user = await client.users.fetch(id).catch(() => null);
      if (!user) {
        fail.push(`\`${id}\` no existe`);
        continue;
      }
      if (user.bot) {
        fail.push(`${user.tag} es un bot`);
        continue;
      }
      const member = await guild.members.fetch(id).catch(() => null);
      let res: { ok: boolean; message: string };
      if (kind === "warn") {
        if (!member) {
          fail.push(`${user.tag} no está en el servidor`);
          continue;
        }
        res = await warnMember(guild, staff, member, reason, client);
      } else if (kind === "kick") {
        if (!member) {
          fail.push(`${user.tag} no está en el servidor`);
          continue;
        }
        res = await kickMember(guild, staff, member, reason);
      } else if (kind === "timeout") {
        if (!member) {
          fail.push(`${user.tag} no está en el servidor`);
          continue;
        }
        res = await timeoutMember(guild, staff, member, durationMs!, reason);
      } else if (kind === "softban") {
        if (!member) {
          fail.push(`${user.tag} no está en el servidor`);
          continue;
        }
        res = await softbanMember(guild, staff, member, reason);
      } else {
        res = await banMember(guild, staff, user, reason, kind === "tempban" ? durationMs : null, client, deleteDays);
      }
      if (res.ok) ok.push(`${user}`);
      else fail.push(`${user.tag}: ${res.message}`);
    } catch (err) {
      fail.push(`\`${id}\`: ${(err as Error).message}`);
    }
  }

  const embed = (ok.length ? successEmbed : warnEmbed)(
    `Sanción múltiple · ${kind}`,
    [
      `Hecho: **${ok.length}** / ${ids.length}`,
      ok.length ? ok.join(" ") : null,
      fail.length ? `Fallos:\n${fail.map((f) => `• ${f}`).join("\n")}` : null,
      `Razón: ${reason}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
  await interaction.editReply({ embeds: [embed] });
}

void (null as unknown as GuildMember);
void (null as unknown as User);
