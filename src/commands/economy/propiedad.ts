import { SlashCommandBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction } from "discord.js";
import type { Command } from "../../types/index.js";
import type { NexoClient } from "../../client.js";
import { ecoEmbed, errorEmbed, successEmbed } from "../../utils/embeds.js";
import { n } from "../../modules/economy/engine.js";
import { 
  PROPERTY_CATALOG, getPropertyDef, getUserProperties, 
  buyProperty, upgradeProperty, collectIncome, 
  sellProperty, calculatePendingIncome 
} from "../../modules/economy/properties.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("propiedad")
    .setDescription("Sistema de propiedades e inmuebles")
    .addSubcommand(s => s.setName("catalogo").setDescription("Muestra las propiedades disponibles"))
    .addSubcommand(s => s
      .setName("comprar")
      .setDescription("Compra una nueva propiedad")
      .addStringOption(o => o.setName("propiedad").setDescription("ID de la propiedad").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(s => s
      .setName("mejorar")
      .setDescription("Sube el nivel de una de tus propiedades")
      .addStringOption(o => o.setName("propiedad").setDescription("ID de tu propiedad").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(s => s.setName("cobrar").setDescription("Cobra los ingresos de todas tus propiedades"))
    .addSubcommand(s => s
      .setName("ver")
      .setDescription("Mira tu portafolio de propiedades (o de alguien más)")
      .addUserOption(o => o.setName("usuario").setDescription("Usuario a revisar"))
    )
    .addSubcommand(s => s
      .setName("vender")
      .setDescription("Vende una propiedad por el 50% de lo invertido")
      .addStringOption(o => o.setName("propiedad").setDescription("ID de la propiedad a vender").setRequired(true).setAutocomplete(true))
    ),
    
  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    const sub = interaction.options.getSubcommand();
    
    if (sub === 'comprar') {
      const ownedIds = getUserProperties(interaction.guildId!, interaction.user.id).map(p => p.property_id);
      const available = PROPERTY_CATALOG.filter(p => !ownedIds.includes(p.id));
      const filtered = available.filter(choice => choice.id.startsWith(focused.value.toLowerCase()) || choice.name.toLowerCase().includes(focused.value.toLowerCase()));
      await interaction.respond(filtered.slice(0, 25).map(choice => ({ name: choice.name, value: choice.id })));
    } else if (['mejorar', 'vender'].includes(sub)) {
      const ownedIds = getUserProperties(interaction.guildId!, interaction.user.id).map(p => p.property_id);
      const owned = PROPERTY_CATALOG.filter(p => ownedIds.includes(p.id));
      const filtered = owned.filter(choice => choice.id.startsWith(focused.value.toLowerCase()) || choice.name.toLowerCase().includes(focused.value.toLowerCase()));
      await interaction.respond(filtered.slice(0, 25).map(choice => ({ name: choice.name, value: choice.id })));
    } else {
      await interaction.respond([]);
    }
  },

  async execute(interaction: ChatInputCommandInteraction, client: NexoClient) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ embeds: [errorEmbed("Este comando solo funciona en un servidor.")], ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (sub === 'catalogo') {
      const ownedIds = getUserProperties(guildId, userId).map(p => p.property_id);
      let text = "";
      for (const p of PROPERTY_CATALOG) {
        const ownedText = ownedIds.includes(p.id) ? " *(Propiedad)*" : "";
        text += `**${p.name}** \`${p.id}\`${ownedText}\n`;
        text += `Precio: **${n(p.price)}** | Ingreso (8h): **${n(p.income8h)}**\n\n`;
      }
      await interaction.reply({ embeds: [ecoEmbed("Catálogo de Inmuebles", text)] });
    }
    
    else if (sub === 'comprar') {
      const propId = interaction.options.getString("propiedad", true);
      const res = buyProperty(guildId, userId, propId);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed(res.msg!)], ephemeral: true });
      } else {
        const p = getPropertyDef(propId);
        await interaction.reply({ embeds: [successEmbed("Propiedad Adquirida", `Has comprado **${p!.name}**.`)] });
      }
    }
    
    else if (sub === 'mejorar') {
      const propId = interaction.options.getString("propiedad", true);
      const res = upgradeProperty(guildId, userId, propId);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed(res.msg!)], ephemeral: true });
      } else {
        const p = getPropertyDef(propId);
        await interaction.reply({ embeds: [successEmbed("Propiedad Mejorada", `Has subido de nivel tu **${p!.name}**.`)] });
      }
    }
    
    else if (sub === 'cobrar') {
      const res = collectIncome(guildId, userId);
      if (res.total > 0) {
        await interaction.reply({ embeds: [successEmbed("Ingresos Cobrados", `Has recogido un total de **${n(res.total)}** monedas de tus propiedades.`)] });
      } else {
        await interaction.reply({ embeds: [errorEmbed(res.msg!)], ephemeral: true });
      }
    }
    
    else if (sub === 'ver') {
      const targetUser = interaction.options.getUser("usuario") || interaction.user;
      const props = getUserProperties(guildId, targetUser.id);
      
      if (!props.length) {
        await interaction.reply({ embeds: [errorEmbed(targetUser.id === userId ? "No tienes ninguna propiedad." : "Este usuario no tiene propiedades.")], ephemeral: true });
        return;
      }
      
      let pending = 0;
      if (targetUser.id === userId) {
        pending = calculatePendingIncome(guildId, userId);
      }
      
      let text = targetUser.id === userId && pending > 0 ? `💰 Tienes **${n(pending)}** listos para cobrar (/propiedad cobrar)\n\n` : "";
      
      for (const p of props) {
        const def = getPropertyDef(p.property_id)!;
        const income = Math.floor(def.income8h * (1 + 0.5 * (p.level - 1)));
        text += `**${def.name}** (Nivel ${p.level}/${def.maxLevel})\n`;
        text += `Ingreso actual: **${n(income)}** cada 8h\n\n`;
      }
      
      await interaction.reply({ embeds: [ecoEmbed(`Portafolio de ${targetUser.username}`, text)] });
    }
    
    else if (sub === 'vender') {
      const propId = interaction.options.getString("propiedad", true);
      const res = sellProperty(guildId, userId, propId);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed(res.msg!)], ephemeral: true });
      } else {
        const p = getPropertyDef(propId);
        await interaction.reply({ embeds: [successEmbed("Propiedad Vendida", `Has vendido tu **${p!.name}** y recuperado **${n(res.amount!)}** monedas.`)] });
      }
    }
  },
};

export default command;
