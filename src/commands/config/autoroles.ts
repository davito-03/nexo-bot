import { 
  SlashCommandBuilder, 
  type ChatInputCommandInteraction, 
  TextChannel 
} from "discord.js";
import type { Command } from "../../types/index.js";
import type { NexoClient } from "../../client.js";
import { requireStaff } from "../../utils/permissions.js";
import { infoEmbed, successEmbed, errorEmbed } from "../../utils/embeds.js";
import { 
  createPanel, 
  getPanel, 
  getPanelsByGuild, 
  updatePanel, 
  deletePanel, 
  addOption, 
  removeOption, 
  getOptions, 
  updatePanelMessageId, 
  renderPanelEmbed, 
  renderPanelComponents 
} from "../../modules/community/selfroles.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("autoroles")
    .setDescription("Configura el sistema de autoroles")
    .addSubcommand(sub => sub
      .setName("crear")
      .setDescription("Crea un nuevo panel de roles")
      .addStringOption(opt => opt.setName("titulo").setDescription("Título del panel").setRequired(true).setMaxLength(256))
      .addStringOption(opt => opt.setName("descripcion").setDescription("Descripción del panel").setRequired(false).setMaxLength(2048))
      .addStringOption(opt => opt.setName("modo").setDescription("Modo de selección (por defecto: toggle)")
        .setRequired(false)
        .addChoices(
          { name: "Toggle (Añadir/Quitar)", value: "toggle" },
          { name: "Único (Solo 1 rol)", value: "unico" },
          { name: "Múltiple (Con máximo)", value: "multiple" }
        )
      )
    )
    .addSubcommand(sub => sub
      .setName("añadir")
      .setDescription("Añade una opción de rol a un panel")
      .addIntegerOption(opt => opt.setName("panel_id").setDescription("ID del panel").setRequired(true).setMinValue(1))
      .addRoleOption(opt => opt.setName("rol").setDescription("Rol a añadir").setRequired(true))
      .addStringOption(opt => opt.setName("emoji").setDescription("Emoji para la opción").setRequired(false))
      .addStringOption(opt => opt.setName("etiqueta").setDescription("Nombre a mostrar (por defecto: nombre del rol)").setRequired(false).setMaxLength(100))
      .addStringOption(opt => opt.setName("descripcion").setDescription("Descripción de la opción").setRequired(false).setMaxLength(100))
    )
    .addSubcommand(sub => sub
      .setName("quitar")
      .setDescription("Quita una opción de rol de un panel")
      .addIntegerOption(opt => opt.setName("panel_id").setDescription("ID del panel").setRequired(true).setMinValue(1))
      .addRoleOption(opt => opt.setName("rol").setDescription("Rol a quitar").setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName("editar")
      .setDescription("Edita los ajustes de un panel")
      .addIntegerOption(opt => opt.setName("panel_id").setDescription("ID del panel").setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName("titulo").setDescription("Nuevo título").setRequired(false).setMaxLength(256))
      .addStringOption(opt => opt.setName("descripcion").setDescription("Nueva descripción").setRequired(false).setMaxLength(2048))
      .addStringOption(opt => opt.setName("modo").setDescription("Nuevo modo")
        .setRequired(false)
        .addChoices(
          { name: "Toggle (Añadir/Quitar)", value: "toggle" },
          { name: "Único (Solo 1 rol)", value: "unico" },
          { name: "Múltiple (Con máximo)", value: "multiple" }
        )
      )
      .addIntegerOption(opt => opt.setName("max_roles").setDescription("Máximo de roles (solo modo múltiple)").setRequired(false).setMinValue(1).setMaxValue(25))
    )
    .addSubcommand(sub => sub
      .setName("publicar")
      .setDescription("Envía o actualiza el mensaje del panel en este canal")
      .addIntegerOption(opt => opt.setName("panel_id").setDescription("ID del panel").setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub => sub
      .setName("eliminar")
      .setDescription("Elimina un panel completo")
      .addIntegerOption(opt => opt.setName("panel_id").setDescription("ID del panel").setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub => sub
      .setName("lista")
      .setDescription("Lista todos los paneles configurados")
    ),

  async execute(interaction: ChatInputCommandInteraction, client: NexoClient): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Este comando solo funciona en un servidor.", ephemeral: true });
      return;
    }

    const member = await requireStaff(interaction);
    if (!member) return;

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (subcommand === "crear") {
      const titulo = interaction.options.getString("titulo", true);
      const descripcion = interaction.options.getString("descripcion");
      const modo = interaction.options.getString("modo") || "toggle";
      
      const panelId = createPanel(guildId, interaction.channelId, titulo, descripcion, modo, null, interaction.user.id);
      
      await interaction.reply({
        embeds: [successEmbed(`Se ha creado el panel con ID **${panelId}**.\\nUsa \`/autoroles añadir\` para agregar roles y \`/autoroles publicar\` para mostrarlo.`, "Panel Creado")],
        ephemeral: true
      });
      return;
    }

    if (subcommand === "añadir") {
      const panelId = interaction.options.getInteger("panel_id", true);
      const role = interaction.options.getRole("rol", true);
      const emoji = interaction.options.getString("emoji");
      const etiqueta = interaction.options.getString("etiqueta") || role.name;
      const descripcion = interaction.options.getString("descripcion");

      const panel = getPanel(panelId);
      if (!panel || panel.guild_id !== guildId) {
        await interaction.reply({ embeds: [errorEmbed("Panel no encontrado o no pertenece a este servidor.")], ephemeral: true });
        return;
      }

      // Option validation
      const options = getOptions(panelId);
      if (options.length >= 25) {
        await interaction.reply({ embeds: [errorEmbed("El panel ya tiene el máximo de 25 opciones.")], ephemeral: true });
        return;
      }

      addOption(panelId, role.id, etiqueta, emoji, descripcion);
      
      await interaction.reply({
        embeds: [successEmbed(`El rol <@&${role.id}> fue añadido al panel **${panel.id}** (${panel.title}).`, "Opción Añadida")],
        ephemeral: true
      });
      return;
    }

    if (subcommand === "quitar") {
      const panelId = interaction.options.getInteger("panel_id", true);
      const role = interaction.options.getRole("rol", true);

      const panel = getPanel(panelId);
      if (!panel || panel.guild_id !== guildId) {
        await interaction.reply({ embeds: [errorEmbed("Panel no encontrado o no pertenece a este servidor.")], ephemeral: true });
        return;
      }

      const success = removeOption(panelId, role.id);
      if (success) {
        await interaction.reply({ embeds: [successEmbed(`El rol fue eliminado del panel.`, "Opción Removida")], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed("Ese rol no estaba configurado en este panel.")], ephemeral: true });
      }
      return;
    }

    if (subcommand === "editar") {
      const panelId = interaction.options.getInteger("panel_id", true);
      const titulo = interaction.options.getString("titulo");
      const descripcion = interaction.options.getString("descripcion");
      const modo = interaction.options.getString("modo");
      const maxRoles = interaction.options.getInteger("max_roles");

      const panel = getPanel(panelId);
      if (!panel || panel.guild_id !== guildId) {
        await interaction.reply({ embeds: [errorEmbed("Panel no encontrado o no pertenece a este servidor.")], ephemeral: true });
        return;
      }

      if (!titulo && !descripcion && !modo && maxRoles === null) {
        await interaction.reply({ embeds: [errorEmbed("No se proporcionó ningún valor para editar.")], ephemeral: true });
        return;
      }

      updatePanel(panelId, {
        title: titulo || undefined,
        description: descripcion || undefined,
        mode: modo || undefined,
        maxRoles: maxRoles
      });

      await interaction.reply({ embeds: [successEmbed(`El panel **${panel.id}** ha sido actualizado.`, "Panel Editado")], ephemeral: true });
      return;
    }

    if (subcommand === "publicar") {
      const panelId = interaction.options.getInteger("panel_id", true);
      const panel = getPanel(panelId);
      
      if (!panel || panel.guild_id !== guildId) {
        await interaction.reply({ embeds: [errorEmbed("Panel no encontrado o no pertenece a este servidor.")], ephemeral: true });
        return;
      }

      const options = getOptions(panelId);
      if (options.length === 0) {
        await interaction.reply({ embeds: [errorEmbed("El panel no tiene opciones de roles. Añade alguna antes de publicar.")], ephemeral: true });
        return;
      }

      const embed = renderPanelEmbed(panel, options);
      const components = renderPanelComponents(panel, options);
      const channel = interaction.channel;

      if (!channel || !(channel instanceof TextChannel)) {
        await interaction.reply({ embeds: [errorEmbed("No se puede publicar en este canal. Debe ser un canal de texto.")], ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      if (panel.message_id && panel.channel_id === channel.id) {
        try {
          const msg = await channel.messages.fetch(panel.message_id);
          if (msg) {
            await msg.edit({ embeds: [embed], components });
            await interaction.editReply({ embeds: [successEmbed("Mensaje del panel actualizado exitosamente.")] });
            return;
          }
        } catch (e) {
          // If fetch fails, we just send a new one
        }
      }

      try {
        const sent = await channel.send({ embeds: [embed], components });
        updatePanelMessageId(panelId, sent.id);
        
        if (panel.channel_id !== channel.id) {
          updatePanel(panelId, { channel_id: channel.id });
        }
        
        await interaction.editReply({ embeds: [successEmbed(`Panel publicado exitosamente en este canal.`, "Panel Publicado")] });
      } catch (err) {
        console.error("Error publishing panel:", err);
        await interaction.editReply({ embeds: [errorEmbed("Hubo un error al enviar el mensaje. Verifica mis permisos de envío en este canal.")] });
      }
      return;
    }

    if (subcommand === "eliminar") {
      const panelId = interaction.options.getInteger("panel_id", true);
      const panel = getPanel(panelId);
      
      if (!panel || panel.guild_id !== guildId) {
        await interaction.reply({ embeds: [errorEmbed("Panel no encontrado o no pertenece a este servidor.")], ephemeral: true });
        return;
      }

      deletePanel(panelId);
      await interaction.reply({ embeds: [successEmbed(`El panel **${panel.id}** ha sido eliminado por completo.`, "Panel Eliminado")], ephemeral: true });
      return;
    }

    if (subcommand === "lista") {
      const panels = getPanelsByGuild(guildId);
      
      if (panels.length === 0) {
        await interaction.reply({ embeds: [infoEmbed("No hay paneles configurados en este servidor.")], ephemeral: true });
        return;
      }

      const desc = panels.map(p => {
        const opts = getOptions(p.id);
        return `**ID:** \`${p.id}\` | **Título:** ${p.title}\\n**Canal:** <#${p.channel_id}> | **Roles:** ${opts.length}\\n`;
      }).join("\\n");

      await interaction.reply({
        embeds: [infoEmbed(desc, "Paneles de Autoroles")],
        ephemeral: true
      });
      return;
    }
  }
};
export default command;
