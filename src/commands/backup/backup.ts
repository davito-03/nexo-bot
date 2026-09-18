import fs from "node:fs";
import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getDb } from "../../database/index.js";
import { createBackup, pruneBackups } from "../../modules/backup/create.js";
import { restoreBackup } from "../../modules/backup/restore.js";
import { requireAdmin } from "../../utils/permissions.js";
import { confirmAction } from "../../utils/confirm.js";
import { errorEmbed, infoEmbed, successEmbed, warnEmbed } from "../../utils/embeds.js";
import { timestamp } from "../../utils/time.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("backup")
    .setDescription("Copias de seguridad del servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((s) =>
      s
        .setName("crear")
        .setDescription("Crear un backup completo")
        .addBooleanOption((o) => o.setName("mensajes").setDescription("Incluir mensajes recientes"))
        .addIntegerOption((o) => o.setName("limite").setDescription("Mensajes por canal (máx 1000)").setMinValue(50).setMaxValue(1000)),
    )
    .addSubcommand((s) => s.setName("listar").setDescription("Listar backups"))
    .addSubcommand((s) =>
      s
        .setName("descargar")
        .setDescription("Adjuntar un backup (si cabe en Discord)")
        .addIntegerOption((o) => o.setName("id").setDescription("ID").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("restaurar")
        .setDescription("Restaurar un backup (crea roles/canales, no borra los actuales)")
        .addIntegerOption((o) => o.setName("id").setDescription("ID").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("intervalo")
        .setDescription("Horas entre backups automáticos (0 = off)")
        .addIntegerOption((o) => o.setName("horas").setDescription("Horas").setRequired(true).setMinValue(0).setMaxValue(168)),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const admin = await requireAdmin(interaction);
    if (!admin) return;
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    if (sub === "crear") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const res = await createBackup(guild, interaction.user.id, {
          includeMessages: interaction.options.getBoolean("mensajes") ?? true,
          messageLimit: interaction.options.getInteger("limite") ?? undefined,
        });
        pruneBackups(guild.id, 10);
        const mb = (res.size / 1024 / 1024).toFixed(2);
        await interaction.editReply({
          embeds: [successEmbed("Backup creado", `ID **${res.id}** · ${mb} MB\n\`${res.file}\``)],
        });
      } catch (err) {
        await interaction.editReply({ embeds: [errorEmbed("Falló el backup", (err as Error).message)] });
      }
      return;
    }

    if (sub === "listar") {
      const rows = getDb()
        .prepare("SELECT * FROM backups WHERE guild_id = ? ORDER BY created_at DESC LIMIT 15")
        .all(guild.id) as { id: number; path: string; size: number; created_at: number; created_by: string }[];
      await interaction.reply({
        ephemeral: true,
        embeds: [
          infoEmbed(
            "Backups",
            rows
              .map((r) => `**#${r.id}** ${(r.size / 1024 / 1024).toFixed(2)} MB · ${timestamp(r.created_at, "f")} · <@${r.created_by}>`)
              .join("\n") || "Ninguno todavía.",
          ),
        ],
      });
      return;
    }

    if (sub === "descargar") {
      const id = interaction.options.getInteger("id", true);
      const row = getDb().prepare("SELECT * FROM backups WHERE id = ? AND guild_id = ?").get(id, guild.id) as
        | { path: string; size: number }
        | undefined;
      if (!row || !fs.existsSync(row.path)) {
        await interaction.reply({ embeds: [errorEmbed("Backup no encontrado")], ephemeral: true });
        return;
      }
      if (row.size > 24 * 1024 * 1024) {
        await interaction.reply({
          embeds: [infoEmbed("Demasiado grande para Discord", `Está en el servidor: \`${row.path}\``)],
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({ files: [{ attachment: row.path, name: `nexo-backup-${id}.zip` }], ephemeral: true });
      return;
    }

    if (sub === "restaurar") {
      const id = interaction.options.getInteger("id", true);
      const row = getDb().prepare("SELECT * FROM backups WHERE id = ? AND guild_id = ?").get(id, guild.id) as
        | { path: string }
        | undefined;
      if (!row) {
        await interaction.reply({ embeds: [errorEmbed("ID inválido")], ephemeral: true });
        return;
      }
      const ok = await confirmAction(
        interaction,
        warnEmbed(
          "¿Restaurar backup?",
          "Se **crearán** roles, canales y emojis a partir del ZIP. **No se borran** los actuales. Puede tardar varios minutos y saturar el servidor si se abusa.",
        ),
      );
      if (!ok) return;
      await interaction.followUp({ content: "Restaurando… esto puede tardar.", ephemeral: true });
      const { notes } = await restoreBackup(guild, row.path);
      await interaction.followUp({ embeds: [successEmbed("Restauración", notes.join("\n").slice(0, 4000))], ephemeral: true });
      return;
    }

    if (sub === "intervalo") {
      const { setGuildConfig, getGuildConfig } = await import("../../database/index.js");
      const hours = interaction.options.getInteger("horas", true);
      const cfg = getGuildConfig(guild.id);
      setGuildConfig(guild.id, { backups: { ...cfg.backups, intervalHours: hours } });
      await interaction.reply({
        embeds: [successEmbed("Intervalo", hours ? `Cada ${hours}h` : "Backups automáticos desactivados")],
        ephemeral: true,
      });
    }
  },
};

export default command;
