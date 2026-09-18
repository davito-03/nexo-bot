import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { requireStaff } from "../../utils/permissions.js";
import { ecoEmbed, errorEmbed, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { n } from "../../modules/economy/engine.js";
import {
  claimMission,
  completeForUser,
  createCustomMission,
  ensureWeeklyMissions,
  getProgress,
  listActiveMissions,
  setMissionMessage,
} from "../../modules/missions/engine.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mision")
    .setDescription("Misiones semanales y de eventos")
    .addSubcommand((s) => s.setName("ver").setDescription("Tus misiones de esta semana"))
    .addSubcommand((s) =>
      s
        .setName("reclamar")
        .setDescription("Cobrar una misión completada")
        .addIntegerOption((o) => o.setName("id").setDescription("ID de la misión").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("crear")
        .setDescription("Staff: misión personalizada (eventos, etc.)")
        .addStringOption((o) => o.setName("titulo").setDescription("Título").setRequired(true).setMaxLength(80))
        .addStringOption((o) => o.setName("descripcion").setDescription("Qué hay que hacer").setRequired(true))
        .addIntegerOption((o) => o.setName("recompensa").setDescription("nexocoin").setRequired(true).setMinValue(0).setMaxValue(100_000))
        .addIntegerOption((o) => o.setName("evento").setDescription("ID de /evento (opcional)").setMinValue(1)),
    )
    .addSubcommand((s) =>
      s
        .setName("lanzar")
        .setDescription("Staff: publicar una misión custom en este canal")
        .addIntegerOption((o) => o.setName("id").setDescription("ID de la misión").setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName("completar")
        .setDescription("Staff: marcar a alguien como hecho")
        .addIntegerOption((o) => o.setName("id").setDescription("ID misión").setRequired(true))
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true)),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }
    const gid = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    ensureWeeklyMissions(gid);

    if (sub === "ver") {
      const list = listActiveMissions(gid);
      const lines = list.map((m) => {
        const p = getProgress(m.id, interaction.user.id);
        const status = p.claimed
          ? `✅ **Completada y cobrada automáticamente**`
          : `⏳ Progreso: **${p.progress}/${m.goal}**`;
        const tag = m.kind === "custom" ? " · custom" : "";
        return `**#${m.id} ${m.title}**${tag} — ${n(m.reward)}\n${m.description}\n${status}`;
      });
      await interaction.reply({
        embeds: [
          ecoEmbed("🎯 Misiones de la Semana").setDescription(
            (lines.join("\n\n") || "No hay misiones activas esta semana.") +
              "\n\n*💡 Las misiones se cobran de forma **automática** al completarse y se te notificará por MD.*",
          ),
        ],
      });
      return;
    }

    if (sub === "reclamar") {
      const id = interaction.options.getInteger("id", true);
      const msg = claimMission(gid, interaction.user.id, id);
      await interaction.reply({ embeds: [successEmbed("Misiones Nexo", msg)] });
      return;
    }

    const staff = await requireStaff(interaction);
    if (!staff) return;

    if (sub === "crear") {
      const m = createCustomMission({
        guildId: gid,
        title: interaction.options.getString("titulo", true),
        description: interaction.options.getString("descripcion", true),
        reward: interaction.options.getInteger("recompensa", true),
        eventId: interaction.options.getInteger("evento"),
        createdBy: interaction.user.id,
      });
      await interaction.reply({
        embeds: [
          successEmbed(
            "Misión creada",
            `**#${m.id} ${m.title}** · ${n(m.reward)}\nLánzala con \`/mision lanzar id:${m.id}\`.`,
          ),
        ],
      });
      return;
    }

    if (sub === "lanzar") {
      const id = interaction.options.getInteger("id", true);
      const m = listActiveMissions(gid).find((x) => x.id === id);
      if (!m) {
        await interaction.reply({ embeds: [errorEmbed("No existe")], ephemeral: true });
        return;
      }
      if (!interaction.channel || !("send" in interaction.channel)) return;
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`ms:claim:${m.id}`).setLabel("Reclamar").setStyle(ButtonStyle.Success),
      );
      const msg = await interaction.channel.send({
        embeds: [
          ecoEmbed(`Misión · ${m.title}`).setDescription(`${m.description}\nRecompensa ${n(m.reward)} · ID **${m.id}**`),
        ],
        components: [row],
      });
      setMissionMessage(m.id, interaction.channel.id, msg.id);
      await interaction.reply({ embeds: [successEmbed("Publicada")], ephemeral: true });
      return;
    }

    if (sub === "completar") {
      const id = interaction.options.getInteger("id", true);
      const user = interaction.options.getUser("usuario", true);
      const msg = completeForUser(gid, id, user.id);
      await interaction.reply({ embeds: [successEmbed("Marcado", `${user} · ${msg}`)] });
    }
  },
};

export async function handleMissionButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const id = Number(interaction.customId.split(":")[2]);
  const msg = claimMission(interaction.guild.id, interaction.user.id, id);
  await interaction.reply({ content: msg, ephemeral: true });
}

export default command;
