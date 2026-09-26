import {
  AttachmentBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { errorEmbed, successEmbed } from "../../utils/embeds.js";
import {
  renderProfileCard,
  setUserProfileTheme,
  getUserProfileTheme,
  type ProfileTheme,
} from "../../modules/community/profileCard.js";
import type { Command } from "../../types/index.js";

const THEME_CHOICES = [
  { name: "⚡ Cyberpunk 2077 (Cyan & Magenta)", value: "cyberpunk" },
  { name: "🌸 Neón Sakura (Rosa & Celeste)", value: "neon_pink" },
  { name: "👑 Oro Imperial (Dorado & Ébano)", value: "gold_luxury" },
  { name: "🌿 Esmeralda Mística (Verde & Menta)", value: "emerald" },
  { name: "🔮 Nebulosa Cósmica (Violeta & Púrpura)", value: "cosmic" },
];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("Tarjeta de perfil visual en alta definición generada con Canvas")
    .addSubcommand((s) =>
      s
        .setName("ver")
        .setDescription("Muestra tu tarjeta de perfil o la de otro usuario")
        .addUserOption((o) =>
          o.setName("usuario").setDescription("Miembro a consultar (opcional)").setRequired(false),
        )
        .addStringOption((o) =>
          o
            .setName("tema")
            .setDescription("Estilo visual temporal para la tarjeta")
            .setRequired(false)
            .addChoices(...THEME_CHOICES),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("tema")
        .setDescription("Guarda tu fondo visual favorito para tu tarjeta de perfil")
        .addStringOption((o) =>
          o
            .setName("estilo")
            .setDescription("Tema estético a establecer")
            .setRequired(true)
            .addChoices(...THEME_CHOICES),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Este comando solo funciona dentro del servidor.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    if (sub === "tema") {
      const selectedTheme = interaction.options.getString("estilo", true) as ProfileTheme;
      setUserProfileTheme(guild.id, interaction.user.id, selectedTheme);

      const foundChoice = THEME_CHOICES.find((c) => c.value === selectedTheme);
      await interaction.reply({
        embeds: [
          successEmbed(
            "🎨 Tema de Perfil Actualizado",
            `Has seleccionado el estilo **${foundChoice?.name ?? selectedTheme}** como tu fondo predeterminado.\n` +
              `Cada vez que uses \`/perfil ver\` se mostrará con esta estética.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === "ver") {
      const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
      const member = await guild.members.fetch(targetUser.id).catch(() => null);

      if (!member) {
        await interaction.reply({
          embeds: [errorEmbed("Usuario no encontrado", "Ese miembro no está actualmente en este servidor.")],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      const themeOverride = interaction.options.getString("tema") as ProfileTheme | null;
      try {
        const buffer = await renderProfileCard(member, themeOverride || undefined);
        const attachment = new AttachmentBuilder(buffer, { name: `perfil-${member.id}.png` });

        await interaction.editReply({
          files: [attachment],
        });
      } catch (err) {
        await interaction.editReply({
          content: "❌ Ha ocurrido un error al generar la tarjeta de perfil.",
        });
      }
    }
  },
};

export default command;
