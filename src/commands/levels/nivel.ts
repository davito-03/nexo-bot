import {
  AttachmentBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getDb, getLevel, getRank, setLevelPing, topLevels } from "../../database/index.js";
import { addXp, progressInLevel, xpForLevel } from "../../modules/levels/engine.js";
import { rankCard } from "../../modules/welcome/cards.js";
import { errorEmbed, infoEmbed, successEmbed } from "../../utils/embeds.js";
import { requireAdmin } from "../../utils/permissions.js";
import { paginate } from "../../utils/pagination.js";
import { COLORS } from "../../constants.js";
import { baseEmbed } from "../../utils/embeds.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("nivel")
    .setDescription("Sistema de niveles (chat + voz)")
    .addSubcommand((s) =>
      s
        .setName("rank")
        .setDescription("Tu tarjeta de rango")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario")),
    )
    .addSubcommand((s) => s.setName("top").setDescription("Clasificación del servidor"))
    .addSubcommand((s) =>
      s
        .setName("recompensa")
        .setDescription("Asignar un rol al subir de nivel")
        .addIntegerOption((o) => o.setName("nivel").setDescription("Nivel").setRequired(true).setMinValue(1))
        .addRoleOption((o) => o.setName("rol").setDescription("Rol").setRequired(true)),
    )
    .addSubcommand((s) => s.setName("recompensas").setDescription("Listar roles por nivel"))
    .addSubcommand((s) =>
      s
        .setName("addxp")
        .setDescription("Añadir XP (admin)")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
        .addIntegerOption((o) => o.setName("cantidad").setDescription("XP").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("ping")
        .setDescription("Elige si te mencionan al subir de nivel")
        .addBooleanOption((o) =>
          o.setName("activar").setDescription("True = te hacen ping · False = solo el anuncio, sin mención"),
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Solo en servidor.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (sub === "rank") {
      const user = interaction.options.getUser("usuario") ?? interaction.user;
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        await interaction.reply({ embeds: [errorEmbed("Ese usuario no está en el servidor")], ephemeral: true });
        return;
      }
      await interaction.deferReply();
      const row = getLevel(guild.id, user.id);
      const rank = getRank(guild.id, user.id);
      const prog = progressInLevel(row);
      try {
        const buf = await rankCard(member, { xp: row.xp, level: row.level, rank, needed: prog.needed, current: prog.current });
        await interaction.editReply({
          files: [new AttachmentBuilder(buf, { name: "rank.png" })],
        });
      } catch {
        await interaction.editReply({
          embeds: [
            infoEmbed(
              `Nivel de ${member.displayName}`,
              `Nivel **${row.level}** · Rank **#${rank}**${member.premiumSince ? " · Booster XP ×1.5" : ""}\nXP: ${row.xp.toLocaleString("es-ES")} (${prog.current}/${prog.needed})\nMensajes: ${row.messages} · Voz: ${Math.floor(row.voice_seconds / 60)} min`,
            ),
          ],
        });
      }
      return;
    }

    if (sub === "top") {
      const rows = topLevels(guild.id, 15);
      const lines = await Promise.all(
        rows.map(async (r, i) => {
          const u = await interaction.client.users.fetch(r.user_id).catch(() => null);
          return `**${i + 1}.** ${u ? u.tag : r.user_id} — niv. ${r.level} · ${r.xp.toLocaleString("es-ES")} XP`;
        }),
      );
      await interaction.reply({
        embeds: [baseEmbed(COLORS.level).setTitle("🏆 Top niveles").setDescription(lines.join("\n") || "Aún no hay XP.")],
      });
      return;
    }

    if (sub === "recompensas") {
      const rows = getDb()
        .prepare("SELECT * FROM role_rewards WHERE guild_id = ? ORDER BY level")
        .all(guild.id) as { level: number; role_id: string }[];
      await interaction.reply({
        embeds: [
          infoEmbed(
            "Recompensas de nivel",
            rows.map((r) => `Nivel **${r.level}** → <@&${r.role_id}>`).join("\n") || "Ninguna configurada.",
          ),
        ],
      });
      return;
    }

    if (sub === "recompensa") {
      const admin = await requireAdmin(interaction);
      if (!admin) return;
      const level = interaction.options.getInteger("nivel", true);
      const role = interaction.options.getRole("rol", true);
      getDb()
        .prepare(
          `INSERT INTO role_rewards (guild_id, level, role_id) VALUES (?, ?, ?)
           ON CONFLICT(guild_id, level) DO UPDATE SET role_id = excluded.role_id`,
        )
        .run(guild.id, level, role.id);
      await interaction.reply({ embeds: [successEmbed("Recompensa guardada", `Nivel ${level} → ${role}`)] });
      return;
    }

    if (sub === "addxp") {
      const admin = await requireAdmin(interaction);
      if (!admin) return;
      const user = interaction.options.getUser("usuario", true);
      const amount = interaction.options.getInteger("cantidad", true);
      const member = await guild.members.fetch(user.id);
      const res = await addXp(member, amount, "admin");
      await interaction.reply({
        embeds: [successEmbed("XP añadida", `${user} ahora tiene ${res.row.xp} XP (nivel ${res.row.level}).`)],
      });
      return;
    }

    if (sub === "ping") {
      const row = getLevel(guild.id, interaction.user.id);
      const requested = interaction.options.getBoolean("activar");
      const enabled = requested ?? row.level_ping === 0;
      setLevelPing(guild.id, interaction.user.id, enabled);
      await interaction.reply({
        ephemeral: true,
        embeds: [
          successEmbed(
            enabled ? "Ping de nivel activado" : "Ping de nivel desactivado",
            enabled
              ? "Cuando subas de nivel te mencionaré para que te enteres ⭐"
              : "Seguiré anunciando tu subida, pero **sin mencionarte**. Puedes volver a activarlo con `/nivel ping activar:True`.",
          ),
        ],
      });
    }
  },
};

export default command;
void xpForLevel;
void paginate;
void PermissionFlagsBits;
