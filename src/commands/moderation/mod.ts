import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import type { NexoClient } from "../../client.js";
import {
  banMember,
  deleteCaseAction,
  editCase,
  kickMember,
  removeTimeout,
  replyAction,
  softbanMember,
  timeoutMember,
  unbanMember,
  unwarn,
  warnMember,
} from "../../modules/moderation/actions.js";
import { caseEmbed, caseLabel, historyText } from "../../modules/moderation/cases.js";
import { getCase, getCasesForUser } from "../../database/index.js";
import { parseDuration } from "../../utils/time.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed, infoEmbed } from "../../utils/embeds.js";
import { paginate } from "../../utils/pagination.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mod")
    .setDescription("Herramientas de moderación")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s
        .setName("warn")
        .setDescription("Advertir a un miembro")
        .addUserOption((o) => o.setName("usuario").setDescription("Objetivo").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("kick")
        .setDescription("Expulsar a un miembro")
        .addUserOption((o) => o.setName("usuario").setDescription("Objetivo").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("ban")
        .setDescription("Banear a un usuario")
        .addUserOption((o) => o.setName("usuario").setDescription("Objetivo").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("borrar_dias").setDescription("Días de mensajes a borrar (0-7)").setMinValue(0).setMaxValue(7),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("tempban")
        .setDescription("Ban temporal")
        .addUserOption((o) => o.setName("usuario").setDescription("Objetivo").setRequired(true))
        .addStringOption((o) => o.setName("duracion").setDescription("Ej: 1h, 7d, 2w").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("unban")
        .setDescription("Quitar un ban")
        .addStringOption((o) => o.setName("id").setDescription("ID del usuario").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Razón")),
    )
    .addSubcommand((s) =>
      s
        .setName("timeout")
        .setDescription("Silenciar temporalmente (timeout)")
        .addUserOption((o) => o.setName("usuario").setDescription("Objetivo").setRequired(true))
        .addStringOption((o) => o.setName("duracion").setDescription("Ej: 10m, 1h, 1d").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("untimeout")
        .setDescription("Quitar timeout")
        .addUserOption((o) => o.setName("usuario").setDescription("Objetivo").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Razón")),
    )
    .addSubcommand((s) =>
      s
        .setName("softban")
        .setDescription("Kick + borrar mensajes de 7 días")
        .addUserOption((o) => o.setName("usuario").setDescription("Objetivo").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Razón").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("unwarn")
        .setDescription("Retirar una advertencia")
        .addIntegerOption((o) => o.setName("caso").setDescription("Nº de caso del warn").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Razón")),
    )
    .addSubcommand((s) =>
      s
        .setName("historial")
        .setDescription("Ver sanciones de un usuario")
        .addUserOption((o) => o.setName("usuario").setDescription("Objetivo").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("caso")
        .setDescription("Ver un caso por número")
        .addIntegerOption((o) => o.setName("id").setDescription("Nº de caso").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("editar-caso")
        .setDescription("Editar la razón de un caso de sanción")
        .addIntegerOption((o) => o.setName("id").setDescription("Nº de caso").setRequired(true))
        .addStringOption((o) => o.setName("razon").setDescription("Nueva razón").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("eliminar-caso")
        .setDescription("Eliminar permanentemente un caso de sanción")
        .addIntegerOption((o) => o.setName("id").setDescription("Nº de caso").setRequired(true))
        .addBooleanOption((o) =>
          o.setName("revertir").setDescription("Si está activo, levantar ban/timeout en Discord (def: true)"),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction, client: NexoClient) {
    const staff = await requireStaff(interaction);
    if (!staff) return;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild!;
    const reasonOf = () => interaction.options.getString("razon") ?? "Sin razón";

    const targetMember = async (): Promise<GuildMember | null> => {
      const user = interaction.options.getUser("usuario", true);
      return guild.members.fetch(user.id).catch(() => null);
    };

    switch (sub) {
      case "warn": {
        const member = await targetMember();
        if (!member) return void interaction.reply({ embeds: [errorEmbed("No está en el servidor")], ephemeral: true });
        return replyAction(interaction, await warnMember(guild, staff, member, reasonOf(), client));
      }
      case "kick": {
        const member = await targetMember();
        if (!member) return void interaction.reply({ embeds: [errorEmbed("No está en el servidor")], ephemeral: true });
        return replyAction(interaction, await kickMember(guild, staff, member, reasonOf()));
      }
      case "ban": {
        const user = interaction.options.getUser("usuario", true);
        const days = interaction.options.getInteger("borrar_dias") ?? 1;
        return replyAction(interaction, await banMember(guild, staff, user, reasonOf(), null, client, days));
      }
      case "tempban": {
        const user = interaction.options.getUser("usuario", true);
        const dur = parseDuration(interaction.options.getString("duracion", true));
        if (!dur) return void interaction.reply({ embeds: [errorEmbed("Duración inválida", "Usa 10m, 2h, 7d…")], ephemeral: true });
        return replyAction(interaction, await banMember(guild, staff, user, reasonOf(), dur, client));
      }
      case "unban": {
        const id = interaction.options.getString("id", true);
        return replyAction(interaction, await unbanMember(guild, staff, id, reasonOf()));
      }
      case "timeout": {
        const member = await targetMember();
        if (!member) return void interaction.reply({ embeds: [errorEmbed("No está en el servidor")], ephemeral: true });
        const dur = parseDuration(interaction.options.getString("duracion", true));
        if (!dur) return void interaction.reply({ embeds: [errorEmbed("Duración inválida")], ephemeral: true });
        return replyAction(interaction, await timeoutMember(guild, staff, member, dur, reasonOf()));
      }
      case "untimeout": {
        const member = await targetMember();
        if (!member) return void interaction.reply({ embeds: [errorEmbed("No está en el servidor")], ephemeral: true });
        return replyAction(interaction, await removeTimeout(guild, staff, member, reasonOf()));
      }
      case "softban": {
        const member = await targetMember();
        if (!member) return void interaction.reply({ embeds: [errorEmbed("No está en el servidor")], ephemeral: true });
        return replyAction(interaction, await softbanMember(guild, staff, member, reasonOf()));
      }
      case "unwarn": {
        const id = interaction.options.getInteger("caso", true);
        return replyAction(interaction, await unwarn(guild, staff, id, reasonOf()));
      }
      case "historial": {
        const user = interaction.options.getUser("usuario", true);
        const rows = getCasesForUser(guild.id, user.id);
        const embed = infoEmbed(`Sanciones de ${user.tag}`, historyText(rows)).setThumbnail(user.displayAvatarURL());
        return void interaction.reply({ embeds: [embed] });
      }
      case "caso": {
        const id = interaction.options.getInteger("id", true);
        const row = getCase(guild.id, id);
        if (!row) return void interaction.reply({ embeds: [errorEmbed("Caso no encontrado")], ephemeral: true });
        const user = await client.users.fetch(row.user_id).catch(() => null);
        const mod = await client.users.fetch(row.moderator_id).catch(() => null);
        return void interaction.reply({ embeds: [caseEmbed(guild, row, user, mod)] });
      }
      case "editar-caso": {
        const id = interaction.options.getInteger("id", true);
        const razon = interaction.options.getString("razon", true);
        return replyAction(interaction, await editCase(guild, staff, id, razon));
      }
      case "eliminar-caso": {
        const id = interaction.options.getInteger("id", true);
        const revertir = interaction.options.getBoolean("revertir") ?? true;
        return replyAction(interaction, await deleteCaseAction(guild, staff, id, revertir, client));
      }
      default:
        return void interaction.reply({ content: "Subcomando desconocido.", ephemeral: true });
    }
  },
};

export default command;
void paginate;
void caseLabel;
