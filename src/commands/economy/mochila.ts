import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { ecoEmbed, ephemeral, onlyGuild } from "../../utils/embeds.js";
import { getEco, invOf, n } from "../../modules/economy/engine.js";
import { getItemDef, RARITY_INFO, isTrainerItem } from "../../modules/economy/items.js";
import { findItem } from "../../modules/economy/shop.js";
import type { Command } from "../../types/index.js";

async function executeMochila(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    await interaction.reply(onlyGuild());
    return;
  }
  const gid = interaction.guild.id;
  const targetUser = interaction.options.getUser("usuario") ?? interaction.user;

  if (targetUser.bot) {
    await interaction.reply(ephemeral([ecoEmbed("Sin mochila").setDescription("Los bots no poseen inventario.")]));
    return;
  }

  const eco = getEco(gid, targetUser.id);
  const inv = invOf(eco);
  const entries = Object.entries(inv).filter(([, q]) => q > 0);

  if (!entries.length) {
    const isSelf = targetUser.id === interaction.user.id;
    const msg = isSelf
      ? "Tu mochila está completamente vacía.\n\n" +
        "• Adquiere Poké Balls y bayas con `/pokemon tienda` o `/tienda comprar`\n" +
        "• Consigue herramientas y candados en `/tienda ver`\n" +
        "• Pesca con `/eco pescar` o caza con `/eco cazar`"
      : `La mochila de **${targetUser.username}** está vacía. No posee ningún objeto actualmente.`;
    await interaction.reply(ephemeral([ecoEmbed(`Mochila de ${targetUser.username}`).setDescription(msg)]));
    return;
  }

  const trainer: string[] = [];
  const tools: string[] = [];
  const fish: string[] = [];
  const hunt: string[] = [];
  const collectibles: string[] = [];
  let totalItems = 0;

  for (const [id, q] of entries) {
    totalItems += q;
    const def = getItemDef(id);
    const itemObj = findItem(gid, id);
    const emoji = def?.emoji ?? "📦";
    const name = def?.name ?? itemObj?.name ?? id;
    const rarity = def ? ` · *${RARITY_INFO[def.rarity]?.label ?? def.rarity}*` : "";
    const line = `• ${emoji} **${name}** ×${q}${rarity}`;

    if (
      isTrainerItem(id) ||
      def?.category === "captura" ||
      id.startsWith("piedra_") ||
      id.startsWith("baya_") ||
      id.startsWith("huevo_") ||
      id === "pocion_maxima" ||
      id === "caramelo_raro"
    ) {
      trainer.push(line);
    } else if (!def) {
      tools.push(line);
    } else if (def.category === "herramienta" || def.category === "consumible") {
      tools.push(line);
    } else if (
      def.collectionId === "col_pesca" ||
      def.category === "pesca" ||
      id.startsWith("pez_") ||
      id === "objeto_bota" ||
      id === "objeto_perla" ||
      id === "objeto_cofre_mar"
    ) {
      fish.push(line);
    } else if (
      def.collectionId === "col_caza" ||
      def.category === "caza" ||
      id.startsWith("presa_")
    ) {
      hunt.push(line);
    } else {
      collectibles.push(line);
    }
  }

  const embed = ecoEmbed(`🎒 Mochila e Inventario de ${targetUser.username}`)
    .setDescription(
      `💰 **Cartera:** ${n(eco.wallet)} | 🏦 **Banco:** ${n(eco.bank)} | 💎 **Total:** ${n(eco.wallet + eco.bank)}\n` +
      `📦 **${totalItems.toLocaleString("es-ES")}** objetos en total (${entries.length} tipos distintos)`,
    )
    .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
    .setFooter({ text: "Usa /pokemon usar para objetos Pokémon · /tienda comprar para abastecerte" });

  const addSafeFields = (title: string, lines: string[]) => {
    if (!lines.length) return;
    let current = "";
    let part = 1;
    for (const l of lines) {
      if (current.length + l.length + 1 > 900) {
        embed.addFields({
          name: part === 1 ? title : `${title} (cont. ${part})`,
          value: current,
        });
        current = l;
        part++;
      } else {
        current = current ? `${current}\n${l}` : l;
      }
    }
    if (current) {
      embed.addFields({
        name: part === 1 ? title : `${title} (cont. ${part})`,
        value: current,
      });
    }
  };

  addSafeFields("🔴 Mochila de Entrenador Pokémon", trainer);
  addSafeFields("🛠️ Herramientas y Consumibles", tools);
  addSafeFields("🎣 Pesca y Océano", fish);
  addSafeFields("🏹 Caza y Bosque", hunt);
  addSafeFields("🏛️ Coleccionables y Joyas", collectibles);

  await interaction.reply(ephemeral([embed]));
}

const mochilaCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("mochila")
    .setDescription("Consultar tu mochila completa: objetos Pokémon, herramientas, capturas y saldo")
    .addUserOption((o) => o.setName("usuario").setDescription("Ver la mochila de otro usuario")),
  execute: executeMochila,
};

const inventarioCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("inventario")
    .setDescription("Consultar tu inventario general: objetos Pokémon, herramientas, capturas y saldo")
    .addUserOption((o) => o.setName("usuario").setDescription("Ver el inventario de otro usuario")),
  execute: executeMochila,
};

export default [mochilaCommand, inventarioCommand];
