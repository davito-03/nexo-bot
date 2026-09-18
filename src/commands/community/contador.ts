import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { COLORS, COUNTING_CHANNEL_ID } from "../../constants.js";
import {
  getCountingState,
  saveCountingState,
  getCountingLeaderboard,
  buyServerSave,
  setupCountingChannel,
} from "../../modules/counting/engine.js";
import { requireStaff } from "../../utils/permissions.js";
import { errorEmbed, successEmbed } from "../../utils/embeds.js";
import { n } from "../../modules/economy/engine.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("contador")
    .setDescription("Sistema del juego de contar de Nexo")
    .addSubcommand((s) =>
      s
        .setName("estado")
        .setDescription("Ver el número actual, récord histórico y salvavidas del contador"),
    )
    .addSubcommand((s) =>
      s
        .setName("top")
        .setDescription("Ver el ranking de los miembros con más números acertados"),
    )
    .addSubcommand((s) =>
      s
        .setName("salvavidas")
        .setDescription("Comprar 1 Salvavidas 🛟 para el servidor por 5.000 NexoCoins"),
    )
    .addSubcommand((s) =>
      s
        .setName("fijar-panel")
        .setDescription("Publicar y fijar la guía y reglas en el canal del contador (Staff)"),
    )
    .addSubcommand((s) =>
      s
        .setName("set-canal")
        .setDescription("Establecer el canal oficial para el juego de contar (Staff)")
        .addChannelOption((o) =>
          o
            .setName("canal")
            .setDescription("Canal de texto")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Este comando solo se puede usar dentro del servidor.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const state = getCountingState(guild.id);

    if (sub === "estado") {
      const nextNum = state.current_number + 1;
      const lastUserText = state.last_user_id ? `<@${state.last_user_id}>` : "*Nadie todavía*";
      const progressToNextSave = 100 - (state.current_number % 100);

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle("🔢 Estado del Contador · Nexo")
        .setDescription(
          `Juega en <#${state.channel_id}> escribiendo números en orden sin repetir participante.\n\n` +
          `📊 **Datos de la Partida Actual:**\n` +
          `• Número actual: **${state.current_number}**\n` +
          `• Siguiente número a escribir: **${nextNum}**\n` +
          `• Último en contar: ${lastUserText}\n` +
          `• 🛟 Salvavidas del servidor: **${state.saves} / ${state.max_saves}**\n` +
          `• 🎁 Próximo salvavidas gratis: a los **${state.current_number + progressToNextSave}** (en ${progressToNextSave} números)\n\n` +
          `🏆 **Estadísticas Globales:**\n` +
          `• Récord histórico del servidor: **${state.highest_record}**\n` +
          `• Total de números contados: **${state.total_counts}**\n\n` +
          `💡 *Gana 15 NexoCoins por cada número y bonus en múltiplos de 50 y 100.*`
        )
        .setFooter({ text: "Nexo · Usa /contador top para ver los mejores participantes" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "top") {
      const top = getCountingLeaderboard(guild.id, 10);
      if (!top.length) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.info)
              .setTitle("🏆 Top Contadores")
              .setDescription("Aún no hay estadísticas registradas en el contador. ¡Sé el primero en <#" + state.channel_id + ">!"),
          ],
        });
        return;
      }

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const lines = top.map((entry, idx) => {
        const medal = medals[idx] ?? `**#${idx + 1}**`;
        const ruinedText = entry.ruined_counts > 0 ? ` · ${entry.ruined_counts} fallos` : "";
        return `${medal} <@${entry.user_id}> · **${entry.correct_counts}** números acertados${ruinedText}`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("🏆 Top Contadores del Servidor")
        .setDescription(
          `Los miembros que más números han aportado al récord de <#${state.channel_id}>:\n\n` +
          lines.join("\n")
        )
        .setFooter({ text: "Nexo · ¡Sigue sumando números para subir en el podio!" })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "salvavidas") {
      const result = buyServerSave(guild.id, interaction.user.id, 5000);
      if (!result.success) {
        await interaction.reply({ embeds: [errorEmbed(result.message)], ephemeral: true });
        return;
      }

      await interaction.reply({
        embeds: [
          successEmbed("¡Salvavidas Comprado!", result.message),
        ],
      });
      return;
    }

    if (sub === "fijar-panel") {
      const staff = await requireStaff(interaction);
      if (!staff) return;

      const targetChannel = (guild.channels.cache.get(state.channel_id) ??
        (await guild.channels.fetch(state.channel_id).catch(() => null))) as TextChannel | null;

      if (!targetChannel || !targetChannel.isTextBased()) {
        await interaction.reply({ embeds: [errorEmbed("No se encontró el canal de conteo.")], ephemeral: true });
        return;
      }

      await setupCountingChannel(targetChannel);
      await interaction.reply({
        embeds: [successEmbed("Panel publicado", `Se ha fijado el mensaje de reglas en ${targetChannel}.`)],
        ephemeral: true,
      });
      return;
    }

    if (sub === "set-canal") {
      const staff = await requireStaff(interaction);
      if (!staff) return;

      const newCh = interaction.options.getChannel("canal", true) as TextChannel;
      state.channel_id = newCh.id;
      saveCountingState(state);

      await interaction.reply({
        embeds: [
          successEmbed("Canal actualizado", `El juego del contador ahora se desarrollará en ${newCh}.`),
        ],
      });
      return;
    }
  },
};

export default command;
