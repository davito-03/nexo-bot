import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, type ButtonInteraction, type ChatInputCommandInteraction } from "discord.js";
import { baseEmbed, onlyGuild } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { COLLECTIONS, getUserCollectionProgress, COLLECTION_REWARD_AMOUNT } from "../../modules/economy/items.js";
import { getEco, invOf, claimCompletedCollections } from "../../modules/economy/engine.js";
import { hasClaimedCollection } from "../../database/index.js";
import type { Command } from "../../types/index.js";

function progressBar(pct: number, length = 10): string {
  const filled = Math.min(length, Math.max(0, Math.round((pct / 100) * length)));
  return "▰".repeat(filled) + "▱".repeat(length - filled);
}

function buildGalleryPages(guildId: string, userId: string, notice = ""): string[] {
  const inv = invOf(getEco(guildId, userId));
  let totalPossible = 0;
  let totalOwned = 0;

  const sections = COLLECTIONS.map((col) => {
    const prog = getUserCollectionProgress(inv, col.id);
    if (!prog) return "";
    totalPossible += prog.total;
    totalOwned += prog.owned;

    const claimed = hasClaimedCollection(guildId, userId, col.id);
    const statusTag = prog.pct === 100
      ? (claimed ? " ✅ *(Recompensa 10.000 🪙 cobrada)*" : " 🎁 *(¡Completa! +10.000 🪙)*")
      : ` *(Recompensa: ${COLLECTION_REWARD_AMOUNT.toLocaleString("es-ES")} 🪙)*`;

    const itemsLine = prog.items
      .map((item) => item.count > 0 ? `${item.def.emoji} **${item.def.name}** ×${item.count}` : `~~${item.def.emoji} ${item.def.name}~~`)
      .join(" · ");

    return `**${col.emoji} ${col.name}** (${prog.owned}/${prog.total})${statusTag}\n\`${progressBar(prog.pct)}\` **${prog.pct}%**\n${itemsLine}\n`;
  });

  const globalPct = totalPossible > 0 ? Math.round((totalOwned / totalPossible) * 100) : 0;
  let badge = "Novato 🔰";
  if (globalPct >= 80) badge = "Maestro Coleccionista 🏆";
  else if (globalPct >= 50) badge = "Coleccionista Veterano 🌟";
  else if (globalPct >= 25) badge = "Aficionado Curioso 🧭";

  let header = `Progreso de coleccionista: **${totalOwned}/${totalPossible} objetos** (${globalPct}%)\nRango: **${badge}**\n\n`;
  if (notice) header = `${notice}\n\n${header}`;

  const pages: string[] = [];
  let currentPage = header;
  for (const section of sections) {
    if (!section) continue;
    if (currentPage.length + section.length + 2 > 3800 && currentPage !== header) {
      pages.push(currentPage);
      currentPage = section;
    } else {
      currentPage += section + "\n";
    }
  }
  pages.push(currentPage);
  return pages;
}

function galleryButtons(userId: string, page: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`gallery:${userId}:${page - 1}`)
      .setLabel("Anterior")
      .setEmoji("◀️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`gallery:${userId}:current`)
      .setLabel(`Página ${page + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`gallery:${userId}:${page + 1}`)
      .setLabel("Siguiente")
      .setEmoji("▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages - 1),
  );
}

function galleryEmbed(username: string, avatar: string, pages: string[], page: number) {
  return baseEmbed(COLORS.level)
    .setTitle(`🏛️ Galería & Vitrina de ${username} · Página ${page + 1}/${pages.length}`)
    .setDescription(pages[page] ?? pages[0] ?? "No hay colecciones disponibles.")
    .setThumbnail(avatar)
    .setFooter({ text: "Completar cada colección otorga 10.000 🪙 · Consigue piezas en tienda, pesca, caza, robos, etc." });
}

export async function handleGalleryButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const [, userId, rawPage] = interaction.customId.split(":");
  if (!userId || rawPage === "current") {
    await interaction.reply({ content: "Ese botón ya no está disponible.", ephemeral: true });
    return;
  }

  const targetUser = await interaction.client.users.fetch(userId).catch(() => null);
  if (!targetUser) {
    await interaction.reply({ content: "No se pudo cargar esa galería.", ephemeral: true });
    return;
  }

  const pages = buildGalleryPages(interaction.guild.id, userId);
  const page = Math.min(pages.length - 1, Math.max(0, Number(rawPage) || 0));
  await interaction.update({
    embeds: [galleryEmbed(targetUser.username, targetUser.displayAvatarURL({ size: 128 }), pages, page)],
    components: [galleryButtons(userId, page, pages.length)],
  });
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("galeria")
    .setDescription("Vitrina de coleccionista y trofeos de Nexo")
    .addUserOption((o) => o.setName("usuario").setDescription("Ver la vitrina de otro miembro")),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
    let notice = "";
    if (targetUser.id === interaction.user.id) {
      const claimRes = claimCompletedCollections(interaction.guild.id, interaction.user.id);
      if (claimRes.rewardTotal > 0) {
        notice = `🎉 **¡Felicidades!** Has completado: **${claimRes.collections.join(", ")}**.\nHas recibido **${claimRes.rewardTotal.toLocaleString("es-ES")} 🪙 nexocoins**.`;
      }
    }

    const pages = buildGalleryPages(interaction.guild.id, targetUser.id, notice);
    await interaction.reply({
      embeds: [galleryEmbed(targetUser.username, targetUser.displayAvatarURL({ size: 128 }), pages, 0)],
      components: [galleryButtons(targetUser.id, 0, pages.length)],
    });
  },
};

export default command;
