import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getDb } from "../../database/index.js";
import { requireStaff } from "../../utils/permissions.js";
import { infoEmbed } from "../../utils/embeds.js";
import { timestamp } from "../../utils/time.js";
import { paginate } from "../../utils/pagination.js";
import { baseEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { chunk } from "../../utils/format.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("miembros")
    .setDescription("Registro de miembros (joins/leaves)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s
        .setName("buscar")
        .setDescription("Buscar por nombre o ID")
        .addStringOption((o) => o.setName("query").setDescription("Texto").setRequired(true)),
    )
    .addSubcommand((s) => s.setName("recientes").setDescription("Últimos en unirse"))
    .addSubcommand((s) => s.setName("salidas").setDescription("Últimos en irse")),
  async execute(interaction: ChatInputCommandInteraction) {
    const staff = await requireStaff(interaction);
    if (!staff) return;
    const sub = interaction.options.getSubcommand();
    const gid = interaction.guildId!;
    if (sub === "buscar") {
      const q = `%${interaction.options.getString("query", true)}%`;
      const rows = getDb()
        .prepare(
          "SELECT * FROM members WHERE guild_id = ? AND (user_id LIKE ? OR username LIKE ? OR display_name LIKE ?) LIMIT 20",
        )
        .all(gid, q, q, q) as { user_id: string; username: string; display_name: string; joined_at: number; left_at: number | null }[];
      await interaction.reply({
        ephemeral: true,
        embeds: [
          infoEmbed(
            "Búsqueda",
            rows
              .map((r) => `<@${r.user_id}> · ${r.username} · ${r.left_at ? "fuera" : "dentro"}`)
              .join("\n") || "Sin resultados.",
          ),
        ],
      });
      return;
    }
    const sql =
      sub === "salidas"
        ? "SELECT * FROM members WHERE guild_id = ? AND left_at IS NOT NULL ORDER BY left_at DESC LIMIT 15"
        : "SELECT * FROM members WHERE guild_id = ? AND left_at IS NULL ORDER BY joined_at DESC LIMIT 15";
    const rows = getDb().prepare(sql).all(gid) as {
      user_id: string;
      username: string;
      joined_at: number | null;
      left_at: number | null;
    }[];
    const pages = chunk(rows, 8).map((part, i) =>
      baseEmbed(COLORS.info)
        .setTitle(sub === "salidas" ? "Salidas" : "Altas recientes")
        .setDescription(
          part
            .map(
              (r) =>
                `<@${r.user_id}> · ${r.username}\n${r.left_at ? `salida ${timestamp(r.left_at)}` : `alta ${r.joined_at ? timestamp(r.joined_at) : "—"}`}`,
            )
            .join("\n\n") || "—",
        )
        .setFooter({ text: `p${i + 1}` }),
    );
    await paginate(interaction, pages, true);
  },
};

export default command;
