import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import type { Command } from "../../types/index.js";
import type { NexoClient } from "../../client.js";
import { baseEmbed, successEmbed, errorEmbed, ecoEmbed } from "../../utils/embeds.js";
import { getMarriage, deleteMarriage, getTopMarriages, isMarriageActive, getMarriageWorkBonus, pendingProposals } from "../../modules/community/marriages.js";
import { COLORS } from "../../constants.js";
import crypto from "crypto";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("matrimonio")
    .setDescription("Sistema de matrimonios y parejas")
    .addSubcommand(sub => 
      sub.setName("proponer")
        .setDescription("Propón matrimonio a otro usuario")
        .addUserOption(opt => opt.setName("usuario").setDescription("El usuario al que quieres proponer").setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName("perfil")
        .setDescription("Muestra el perfil de matrimonio")
        .addUserOption(opt => opt.setName("usuario").setDescription("Usuario para ver su perfil (opcional)").setRequired(false))
    )
    .addSubcommand(sub => 
      sub.setName("divorcio")
        .setDescription("Divórciate de tu pareja actual")
    )
    .addSubcommand(sub => 
      sub.setName("top")
        .setDescription("Muestra los matrimonios más duraderos")
    ),
    
  async execute(interaction: ChatInputCommandInteraction, _client: NexoClient) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ embeds: [errorEmbed("Error", "Este comando solo funciona en un servidor.")], ephemeral: true });
      return;
    }
    
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    
    if (subcommand === "proponer") {
      const targetUser = interaction.options.getUser("usuario", true);
      
      if (targetUser.bot) {
        await interaction.reply({ embeds: [errorEmbed("No permitido", "No puedes casarte con un bot.")], ephemeral: true });
        return;
      }
      if (targetUser.id === userId) {
        await interaction.reply({ embeds: [errorEmbed("No permitido", "No puedes casarte contigo mismo.")], ephemeral: true });
        return;
      }
      
      if (isMarriageActive(guildId, userId)) {
        await interaction.reply({ embeds: [errorEmbed("Ya casado", "¡Ya estás casado con alguien!")], ephemeral: true });
        return;
      }
      
      if (isMarriageActive(guildId, targetUser.id)) {
        await interaction.reply({ embeds: [errorEmbed("Ocupado", "Ese usuario ya está casado con alguien más.")], ephemeral: true });
        return;
      }
      
      const orderId = crypto.randomUUID();
      pendingProposals.set(orderId, {
        proposerId: userId,
        targetId: targetUser.id,
        guildId: guildId,
        timestamp: Date.now()
      });
      
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`marry:accept:${orderId}:${userId}`)
          .setLabel("Aceptar")
          .setStyle(ButtonStyle.Success)
          .setEmoji("❤️"),
        new ButtonBuilder()
          .setCustomId(`marry:reject:${orderId}:${userId}`)
          .setLabel("Rechazar")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("💔")
      );
      
      const embed = baseEmbed(COLORS.primary)
        .setTitle("💍 Propuesta de Matrimonio")
        .setDescription(`<@${userId}> le ha propuesto matrimonio a <@${targetUser.id}>.\n¿Aceptas ser su pareja en Nexo?`);

      await interaction.reply({
        content: `<@${targetUser.id}>`,
        embeds: [embed],
        components: [row]
      });
      
      setTimeout(() => {
        pendingProposals.delete(orderId);
      }, 60000);
      
    } else if (subcommand === "perfil") {
      const targetUser = interaction.options.getUser("usuario") || interaction.user;
      const marriage = getMarriage(guildId, targetUser.id);
      
      if (!marriage) {
        await interaction.reply({ embeds: [errorEmbed("Sin matrimonio", `${targetUser.id === userId ? "No estás" : "Ese usuario no está"} casado.`)], ephemeral: true });
        return;
      }
      
      const durationMs = Date.now() - marriage.married_at;
      const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
      const bonus = getMarriageWorkBonus(guildId, targetUser.id);
      const bonusStatus = bonus > 0 ? "✅ Activo (+10% en /eco work)" : "💤 Inactivo (Pareja no ha trabajado recientemente)";
      
      const embed = ecoEmbed("💑 Perfil de Matrimonio")
        .addFields(
          { name: "Pareja", value: `<@${targetUser.id}> ❤️ <@${marriage.partner_id}>`, inline: false },
          { name: "Fecha de Matrimonio", value: `<t:${Math.floor(marriage.married_at / 1000)}:D>`, inline: true },
          { name: "Duración", value: `${days} días`, inline: true },
          { name: "Bono de Pareja", value: bonusStatus, inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }));
        
      await interaction.reply({ embeds: [embed] });
      
    } else if (subcommand === "divorcio") {
      if (!isMarriageActive(guildId, userId)) {
        await interaction.reply({ embeds: [errorEmbed("Sin matrimonio", "No estás casado actualmente.")], ephemeral: true });
        return;
      }
      
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`marry:divorce:confirm:${userId}`)
          .setLabel("Confirmar Divorcio")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`marry:divorce:cancel:${userId}`)
          .setLabel("Cancelar")
          .setStyle(ButtonStyle.Secondary)
      );
      
      const promptEmbed = baseEmbed(COLORS.danger)
        .setTitle("💔 Confirmar Divorcio")
        .setDescription("¿Estás seguro de que quieres divorciarte? Esta acción romperá la unión y se perderán las ventajas de pareja.");

      const response = await interaction.reply({
        embeds: [promptEmbed],
        components: [row],
        ephemeral: true,
        fetchReply: true
      });
      
      try {
        const confirmation = await response.awaitMessageComponent({
          filter: i => i.user.id === userId && i.customId.startsWith("marry:divorce:"),
          time: 30000,
          componentType: ComponentType.Button
        });
        
        if (confirmation.customId === `marry:divorce:confirm:${userId}`) {
          deleteMarriage(guildId, userId);
          await confirmation.update({
            embeds: [successEmbed("Divorcio completado", "Te has divorciado exitosamente.")],
            components: []
          });
        } else {
          await confirmation.update({
            embeds: [baseEmbed(COLORS.info).setTitle("Cancelado").setDescription("Divorcio cancelado.")],
            components: []
          });
        }
      } catch {
        await interaction.editReply({
          embeds: [errorEmbed("Expirado", "Tiempo de espera agotado para confirmar el divorcio.")],
          components: []
        });
      }
      
    } else if (subcommand === "top") {
      const top = getTopMarriages(guildId, 10);
      
      if (top.length === 0) {
        await interaction.reply({ embeds: [baseEmbed(COLORS.primary).setTitle("💍 Top Matrimonios").setDescription("Aún no hay matrimonios en este servidor.")] });
        return;
      }
      
      const desc = top.map((m, i) => {
        const days = Math.floor((Date.now() - m.married_at) / (1000 * 60 * 60 * 24));
        return `**${i+1}.** <@${m.user1_id}> & <@${m.user2_id}> — ${days} días (<t:${Math.floor(m.married_at/1000)}:d>)`;
      }).join("\n");
      
      await interaction.reply({
        embeds: [baseEmbed(COLORS.primary).setTitle("💍 Top Matrimonios Más Duraderos").setDescription(desc)]
      });
    }
  },
};
export default command;
