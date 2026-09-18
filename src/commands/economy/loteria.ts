import { SlashCommandBuilder, type ChatInputCommandInteraction, TextChannel } from "discord.js";
import type { Command } from "../../types/index.js";
import type { NexoClient } from "../../client.js";
import { infoEmbed, successEmbed, errorEmbed } from "../../utils/embeds.js";
import { getEco, saveEco, deductFunds, n, addPot, giveItem, invOf, drawLottery, getLottery } from "../../modules/economy/engine.js";
import { OFFICIAL_GUILD_ID } from "../../constants.js";

const TICKET_PRICE = 200;
const MAX_TICKETS = 10;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("loteria")
    .setDescription("Sistema de lotería semanal")
    .addSubcommand(s => 
      s.setName("comprar")
       .setDescription("Compra boletos de lotería")
       .addIntegerOption(o => 
         o.setName("cantidad")
          .setDescription("Cantidad de boletos a comprar (máx 10)")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(MAX_TICKETS)
       )
    )
    .addSubcommand(s => 
      s.setName("ver")
       .setDescription("Muestra el bote actual y tus boletos")
    ),
  async execute(interaction: ChatInputCommandInteraction, _client: NexoClient) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Este comando solo funciona en un servidor.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guildId!;
    
    if (sub === "comprar") {
      const qty = interaction.options.getInteger("cantidad", true);
      const cost = qty * TICKET_PRICE;
      
      const eco = getEco(guildId, userId);
      const inv = invOf(eco);
      const currentTickets = inv.boleto ?? 0;
      
      if (currentTickets + qty > MAX_TICKETS) {
        await interaction.reply({ embeds: [errorEmbed("Límite de boletos", `Solo puedes tener un máximo de ${MAX_TICKETS} boletos. Actualmente tienes ${currentTickets}.`)], ephemeral: true });
        return;
      }
      
      if (eco.wallet < cost) {
        await interaction.reply({ embeds: [errorEmbed("Fondos insuficientes", `No tienes suficientes fondos. Necesitas **${n(cost)}** y tienes **${n(eco.wallet)}**.`)], ephemeral: true });
        return;
      }
      
      deductFunds(eco, cost);
      giveItem(eco, "boleto", qty);
      addPot(guildId, cost);
      saveEco(eco);
      
      await interaction.reply({ embeds: [successEmbed("¡Boletos adquiridos!", `Has comprado **${qty}** boletos por **${n(cost)}**.\n¡Buena suerte en el sorteo semanal! 🍀`)] });
    }
    
    else if (sub === "ver") {
      const lot = getLottery(guildId);
      const eco = getEco(guildId, userId);
      const inv = invOf(eco);
      const currentTickets = inv.boleto ?? 0;
      
      const embed = infoEmbed("🎟️ Lotería Semanal de Nexo", "¡Participa en la lotería y llévate todo el bote acumulado!")
        .addFields(
          { name: "💰 Bote Actual", value: `**${n(lot.pot)}**`, inline: true },
          { name: "🎫 Tus Boletos", value: `**${currentTickets}** / ${MAX_TICKETS}`, inline: true },
          { name: "⏰ Sorteo", value: "Todos los domingos a las 20:00 (Hora España peninsular)", inline: false }
        );
        
      await interaction.reply({ embeds: [embed] });
    }
  }
};
export default command;

let lastLotteryDrawWeek = "";

export async function tickWeeklyLottery(client: NexoClient): Promise<void> {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: "Europe/Madrid", hour: "numeric", minute: "numeric", weekday: "long" };
  const str = now.toLocaleString("en-US", options);
  
  if (str.includes("Sunday") && (str.includes("8:00 PM") || str.includes("20:00"))) {
    const weekKey = `${now.getFullYear()}-${Math.floor(now.getTime() / (7 * 86_400_000))}`;
    if (lastLotteryDrawWeek === weekKey) return;
    lastLotteryDrawWeek = weekKey;
    
    const result = drawLottery(OFFICIAL_GUILD_ID);
    
    if (result) {
      const guild = client.guilds.cache.get(OFFICIAL_GUILD_ID);
      if (guild) {
        const channel = guild.channels.cache.find(c => c.name.includes("general") && c.isTextBased()) || 
                        guild.channels.cache.find(c => c.isTextBased());
                        
        if (channel && channel instanceof TextChannel) {
          if (result.winner) {
            const embed = successEmbed("🎉 ¡GANADOR DE LA LOTERÍA! 🎉", `¡El sorteo semanal de la lotería ha finalizado!\n\n🏆 **GANADOR:** <@${result.winner}>\n💰 **PREMIO:** ${n(result.pot)}\n\n*¡Compra tus boletos para el próximo sorteo con \`/loteria comprar\`!*`);
            await channel.send({ content: `<@${result.winner}>`, embeds: [embed] });
          } else {
            const embed = infoEmbed("🎟️ Resultados de la Lotería", `El sorteo semanal ha finalizado, pero nadie tenía boletos. El bote de **${n(result.pot)}** se acumula para la próxima semana.`);
            await channel.send({ embeds: [embed] });
          }
        }
      }
    }
  }
}
