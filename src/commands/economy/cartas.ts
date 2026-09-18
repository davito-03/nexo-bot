import { SlashCommandBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction, ButtonBuilder, ActionRowBuilder, ButtonStyle } from "discord.js";
import type { Command } from "../../types/index.js";
import type { NexoClient } from "../../client.js";
import { getDb } from "../../database/index.js";
import { getAllCards, PACK_TYPES, openPack, getCollectionProgress, getUserCards, getUserCardCount, recycleCards, getDuplicates, getCardDef, RARITY_INFO } from "../../modules/economy/cards.js";
import { ecoEmbed, errorEmbed, successEmbed, infoEmbed, baseEmbed, ephemeral, onlyGuild } from "../../utils/embeds.js";
import { CURRENCY_EMOJI } from "../../modules/economy/engine.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("cartas")
    .setDescription("Sistema de Colección de Cartas de Nexo")
    .addSubcommand(sub => 
      sub.setName("abrir")
        .setDescription("Abre un sobre de cartas.")
        .addStringOption(opt => {
          opt.setName("sobre").setDescription("El sobre que quieres comprar y abrir").setRequired(true);
          PACK_TYPES.forEach(p => opt.addChoices({ name: `${p.name} - ${p.price} ${CURRENCY_EMOJI}`, value: p.id }));
          return opt;
        })
    )
    .addSubcommand(sub => 
      sub.setName("album")
        .setDescription("Mira tu colección de cartas o la de otro usuario.")
        .addUserOption(opt => opt.setName("usuario").setDescription("Usuario del que quieres ver el álbum"))
    )
    .addSubcommand(sub => 
      sub.setName("ver")
        .setDescription("Muestra los detalles de una carta específica.")
        .addStringOption(opt => opt.setName("carta").setDescription("Nombre de la carta").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub => 
      sub.setName("duplicadas")
        .setDescription("Muestra las cartas que tienes repetidas.")
    )
    .addSubcommand(sub => 
      sub.setName("reciclar")
        .setDescription("Destruye cartas duplicadas a cambio de monedas.")
        .addStringOption(opt => opt.setName("carta").setDescription("La carta que quieres reciclar").setRequired(true).setAutocomplete(true))
        .addIntegerOption(opt => opt.setName("cantidad").setDescription("Cantidad a reciclar (por defecto: 1)").setMinValue(1))
    )
    .addSubcommand(sub => 
      sub.setName("top")
        .setDescription("Muestra el top de coleccionistas de cartas.")
    )
    .addSubcommand(sub => 
      sub.setName("intercambiar")
        .setDescription("Crea una oferta de intercambio con otro usuario.")
        .addUserOption(opt => opt.setName("usuario").setDescription("Usuario con el que quieres intercambiar").setRequired(true))
        .addStringOption(opt => opt.setName("ofreces").setDescription("Cartas que ofreces (ID:cantidad, ...)").setRequired(true))
        .addStringOption(opt => opt.setName("pides").setDescription("Cartas que pides a cambio (ID:cantidad, ...)").setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction, client: NexoClient) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (sub === "abrir") {
      const packId = interaction.options.getString("sobre", true);
      const res = openPack(guildId, userId, packId);

      if (!res.ok) {
        await interaction.reply(ephemeral([errorEmbed("Error", res.error)]));
        return;
      }

      const pack = PACK_TYPES.find(p => p.id === packId)!;
      let desc = `Has comprado un **${pack.name}** por **${res.cost}** ${CURRENCY_EMOJI}.\n\n**¡Cartas Obtenidas!**\n`;

      for (const card of res.cards!) {
        const isNew = res.newCards!.includes(card.id);
        const rarity = RARITY_INFO[card.rarity];
        desc += `${card.emoji} **${card.name}** - ${rarity.emoji} ${card.rarity.replace('_', ' ').toUpperCase()} ${isNew ? '✨ **¡NUEVA!**' : ''}\n`;
      }

      const embed = ecoEmbed("¡Sobre Abierto!", desc)
        .setThumbnail("https://cdn-icons-png.flaticon.com/512/3074/3074127.png"); // generic pack icon

      await interaction.reply({ embeds: [embed] });
    }
    
    else if (sub === "album") {
      const targetUser = interaction.options.getUser("usuario") || interaction.user;
      const progress = getCollectionProgress(guildId, targetUser.id);
      const counts = getUserCardCount(guildId, targetUser.id);

      const embed = baseEmbed()
        .setTitle(`📖 Álbum de Colección: ${targetUser.displayName}`)
        .setDescription(`Cartas Únicas: **${counts.unique}** / **${counts.maxUnique}**\nTotal de Cartas: **${counts.total}**\n\n**Progreso por Temáticas:**`)
        .setThumbnail(targetUser.displayAvatarURL());

      for (const p of progress) {
        const barLength = 10;
        const filled = Math.round((p.percentage / 100) * barLength);
        const empty = barLength - filled;
        const bar = '🟩'.repeat(filled) + '⬛'.repeat(empty);
        embed.addFields({ name: `Tema: ${p.theme.toUpperCase()}`, value: `${bar} **${p.percentage}%** (${p.owned}/${p.total})`, inline: true });
      }

      await interaction.reply({ embeds: [embed] });
    }
    
    else if (sub === "ver") {
      const cardId = interaction.options.getString("carta", true);
      const card = getCardDef(cardId);
      if (!card) {
        await interaction.reply(ephemeral([errorEmbed("No encontrado", "No se encontró la carta solicitada.")]));
        return;
      }

      const rarityInfo = RARITY_INFO[card.rarity];
      const embed = infoEmbed(`Detalle de Carta: ${card.name}`, card.description)
        .addFields([
          { name: 'Emoji', value: card.emoji, inline: true },
          { name: 'Rareza', value: `${rarityInfo.emoji} ${card.rarity.replace('_', ' ').toUpperCase()}`, inline: true },
          { name: 'Temática', value: card.theme.toUpperCase(), inline: true },
          { name: 'Valor de Reciclaje', value: `${card.value} ${CURRENCY_EMOJI}`, inline: true }
        ]);

      await interaction.reply({ embeds: [embed] });
    }
    
    else if (sub === "duplicadas") {
      const dups = getDuplicates(guildId, userId);
      if (dups.length === 0) {
        await interaction.reply({ embeds: [infoEmbed("Duplicadas", "No tienes cartas repetidas.")], ephemeral: true });
        return;
      }

      const lines = dups.map(d => `${d.card.emoji} **${d.card.name}**: Tienes ${d.quantity} (Sobran ${d.quantity - 1})`);
      const embed = infoEmbed(`Cartas Duplicadas de ${interaction.user.displayName}`, lines.join('\n').substring(0, 4000));
      await interaction.reply({ embeds: [embed] });
    }
    
    else if (sub === "reciclar") {
      const cardId = interaction.options.getString("carta", true);
      const quantity = interaction.options.getInteger("cantidad") || 1;
      
      const res = recycleCards(guildId, userId, cardId, quantity);
      if (!res.ok) {
        await interaction.reply(ephemeral([errorEmbed("Error al reciclar", res.error)]));
        return;
      }

      await interaction.reply({ embeds: [successEmbed("Cartas Recicladas", `Has reciclado **${quantity}** copia(s) y obtenido **${res.coinsGained}** ${CURRENCY_EMOJI}.`)] });
    }
    
    else if (sub === "top") {
      const db = getDb();
      const rows = db.prepare(`
        SELECT user_id, COUNT(card_id) as unique_c, SUM(quantity) as total_c 
        FROM user_cards 
        WHERE guild_id = ? 
        GROUP BY user_id 
        ORDER BY unique_c DESC, total_c DESC 
        LIMIT 10
      `).all(guildId) as any[];

      if (rows.length === 0) {
        await interaction.reply(ephemeral([infoEmbed("Top Coleccionistas", "Nadie tiene cartas en este servidor aún.")]));
        return;
      }

      let desc = "";
      for (let i = 0; i < rows.length; i++) {
        const u = rows[i];
        desc += `**${i + 1}.** <@${u.user_id}> - **${u.unique_c}** únicas (${u.total_c} totales)\n`;
      }

      const embed = infoEmbed("🏆 Top Coleccionistas de Cartas", desc);
      await interaction.reply({ embeds: [embed] });
    }
    
    else if (sub === "intercambiar") {
      const targetUser = interaction.options.getUser("usuario", true);
      const ofrecesStr = interaction.options.getString("ofreces", true);
      const pidesStr = interaction.options.getString("pides", true);

      if (targetUser.bot || targetUser.id === interaction.user.id) {
        await interaction.reply(ephemeral([errorEmbed("Inválido", "No puedes intercambiar con un bot o contigo mismo.")]));
        return;
      }

      // Parse string: "id:qty, id:qty"
      const parseItems = (str: string) => {
        const res: Record<string, number> = {};
        const parts = str.split(',').map(s => s.trim()).filter(s => s);
        for (const p of parts) {
          let [id, qtyStr] = p.split(':');
          id = id.trim();
          const qty = qtyStr ? parseInt(qtyStr.trim()) : 1;
          if (isNaN(qty) || qty < 1) return null;
          const card = getCardDef(id);
          if (!card) return null; // invalid card
          res[id] = (res[id] || 0) + qty;
        }
        return res;
      };

      const offered = parseItems(ofrecesStr);
      const requested = parseItems(pidesStr);

      if (!offered || Object.keys(offered).length === 0) {
         await interaction.reply(ephemeral([errorEmbed("Error", "Formato inválido o carta no existente en lo que OFRECES. Usa `id_carta:cantidad, id_carta2:cantidad`")]));
         return;
      }
      if (!requested || Object.keys(requested).length === 0) {
         await interaction.reply(ephemeral([errorEmbed("Error", "Formato inválido o carta no existente en lo que PIDES. Usa `id_carta:cantidad, id_carta2:cantidad`")]));
         return;
      }

      const ofrecesArr = Object.entries(offered).map(([id, qty]) => `${getCardDef(id)?.emoji} ${getCardDef(id)?.name} x${qty}`);
      const pidesArr = Object.entries(requested).map(([id, qty]) => `${getCardDef(id)?.emoji} ${getCardDef(id)?.name} x${qty}`);

      const db = getDb();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

      const result = db.prepare(`
        INSERT INTO card_trades (guild_id, sender_id, receiver_id, offered_cards, requested_cards, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(guildId, interaction.user.id, targetUser.id, JSON.stringify(offered), JSON.stringify(requested), expiresAt, Date.now());

      const tradeId = result.lastInsertRowid;

      const embed = baseEmbed()
        .setTitle("🔄 Oferta de Intercambio de Cartas")
        .setDescription(`<@${interaction.user.id}> ha propuesto un intercambio a <@${targetUser.id}>.`)
        .addFields([
          { name: 'Ofrece:', value: ofrecesArr.join('\n') },
          { name: 'Pide:', value: pidesArr.join('\n') }
        ])
        .setFooter({ text: "Esta oferta expira en 15 minutos." });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`cards:accept:${tradeId}`)
          .setLabel("Aceptar")
          .setStyle(ButtonStyle.Success)
          .setEmoji("✅"),
        new ButtonBuilder()
          .setCustomId(`cards:reject:${tradeId}`)
          .setLabel("Rechazar")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("❌")
      );

      const msg = await interaction.reply({ content: `<@${targetUser.id}>, tienes una nueva oferta de intercambio!`, embeds: [embed], components: [row], fetchReply: true });
      db.prepare(`UPDATE card_trades SET message_id = ?, channel_id = ? WHERE id = ?`).run(msg.id, msg.channelId, tradeId);
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const all = getAllCards();
    
    const filtered = all.filter(c => 
      c.name.toLowerCase().includes(focused) || 
      c.id.toLowerCase().includes(focused)
    ).slice(0, 25);

    await interaction.respond(
      filtered.map(c => ({
        name: `${c.emoji} ${c.name} (${c.rarity.replace('_', ' ').toUpperCase()}) - ID: ${c.id}`,
        value: c.id
      }))
    );
  }
};

export default command;
