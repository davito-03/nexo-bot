import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import { baseEmbed, onlyGuild } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import {
  getUserTitles,
  getEquippedTitle,
  setEquippedTitle,
  ACHIEVEMENTS,
} from "../../modules/economy/achievements.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("titulos")
    .setDescription("Gestiona y equipa tus títulos cosméticos conseguidos con logros")
    .addSubcommand((s) =>
      s
        .setName("ver")
        .setDescription("Ver tus títulos desbloqueados")
        .addUserOption((o) => o.setName("usuario").setDescription("Ver títulos de otro miembro")),
    )
    .addSubcommand((s) =>
      s
        .setName("equipar")
        .setDescription("Equipa un título que hayas desbloqueado")
        .addStringOption((o) =>
          o
            .setName("titulo")
            .setDescription("El título que deseas equipar")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((s) => s.setName("desequipar").setDescription("Quita tu título cosmético equipado")),

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.respond([]);
      return;
    }
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "titulo") {
      await interaction.respond([]);
      return;
    }

    const q = focused.value.toLowerCase();
    const unlocked = getUserTitles(interaction.guild.id, interaction.user.id);
    const filtered = unlocked
      .filter((t) => !q || t.toLowerCase().includes(q))
      .slice(0, 25)
      .map((t) => ({ name: t, value: t }));

    await interaction.respond(filtered);
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === "ver") {
      const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
      const titles = getUserTitles(gid, targetUser.id);
      const equipped = getEquippedTitle(gid, targetUser.id);

      const embed = baseEmbed(COLORS.primary)
        .setTitle(`🎖️ Títulos Cosméticos · ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setDescription(
          `Título activo: **${equipped ?? "*(Ninguno equipado)*"}**\n` +
            `Títulos desbloqueados: **${titles.length}**\n\n` +
            (titles.length > 0
              ? titles
                  .map((t) => {
                    const isEq = t === equipped;
                    const matchAch = ACHIEVEMENTS.find((a) => a.titleReward === t);
                    const note = matchAch ? `*(Logro: ${matchAch.name})*` : "";
                    return `${isEq ? "⭐" : "🔹"} **${t}** ${note} ${isEq ? "*(Equipado)*" : ""}`;
                  })
                  .join("\n")
              : "No has desbloqueado ningún título todavía. ¡Completa logros con `/logros` para conseguirlos!"),
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "equipar") {
      const titleToEquip = interaction.options.getString("titulo", true);
      const unlocked = getUserTitles(gid, interaction.user.id);

      if (!unlocked.includes(titleToEquip)) {
        await interaction.reply({
          embeds: [
            baseEmbed(COLORS.danger)
              .setTitle("❌ Título no disponible")
              .setDescription(
                `No tienes el título **${titleToEquip}** desbloqueado.\nUsa \`/logros\` para consultar qué necesitas para conseguirlo.`,
              ),
          ],
          ephemeral: true,
        });
        return;
      }

      setEquippedTitle(gid, interaction.user.id, titleToEquip);

      await interaction.reply({
        embeds: [
          baseEmbed(COLORS.success)
            .setTitle("🎖️ Título equipado")
            .setDescription(`Te has equipado el título **${titleToEquip}**.\nAhora será visible en tu tarjeta de \`/eco perfil\`.`),
        ],
      });
      return;
    }

    if (sub === "desequipar") {
      const current = getEquippedTitle(gid, interaction.user.id);
      if (!current) {
        await interaction.reply({
          embeds: [baseEmbed(COLORS.warn).setDescription("No tienes ningún título equipado actualmente.")],
          ephemeral: true,
        });
        return;
      }

      setEquippedTitle(gid, interaction.user.id, null);
      await interaction.reply({
        embeds: [
          baseEmbed(COLORS.primary)
            .setTitle("🎖️ Título desequipado")
            .setDescription(`Has quitado tu título **${current}**.`),
        ],
      });
      return;
    }
  },
};

export default command;
