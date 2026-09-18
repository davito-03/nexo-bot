import { SlashCommandBuilder, type ChatInputCommandInteraction, type AutocompleteInteraction } from "discord.js";
import type { Command } from "../../types/index.js";
import type { NexoClient } from "../../client.js";
import { ecoEmbed, errorEmbed, successEmbed } from "../../utils/embeds.js";
import { n } from "../../modules/economy/engine.js";
import { JOB_CATALOG, getUserJob, assignJob, doJobShift, getTopJobs, getJobWorkBonus } from "../../modules/economy/jobs.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("trabajo")
    .setDescription("Sistema de empleos y profesiones")
    .addSubcommand(s => s
      .setName("elegir")
      .setDescription("Elige una profesión")
      .addStringOption(o => o.setName("profesion").setDescription("Profesión a elegir").setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(s => s.setName("perfil").setDescription("Muestra tu perfil laboral y estadísticas"))
    .addSubcommand(s => s.setName("turno").setDescription("Realiza un turno especial de trabajo (cada 45m)"))
    .addSubcommand(s => s.setName("catalogo").setDescription("Ver todos los trabajos disponibles"))
    .addSubcommand(s => s.setName("top").setDescription("Ver el ranking de mejores trabajadores")),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    if (interaction.options.getSubcommand() === 'elegir') {
      const filtered = JOB_CATALOG.filter(choice => choice.name.toLowerCase().includes(focused.value.toLowerCase()) || choice.id.startsWith(focused.value.toLowerCase()));
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
      let text = "";
      for (const j of JOB_CATALOG) {
        text += `**${j.name}** \`${j.id}\`\n`;
        text += `Requisito: Economía Nivel ${j.minLevel}\n`;
        text += `Beneficio: *${j.desc}*\n\n`;
      }
      await interaction.reply({ embeds: [ecoEmbed("Catálogo de Profesiones", text)] });
    }
    
    else if (sub === 'elegir') {
      const jobId = interaction.options.getString("profesion", true);
      const res = assignJob(guildId, userId, jobId);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed(res.msg!)], ephemeral: true });
      } else {
        const j = JOB_CATALOG.find(x => x.id === jobId)!;
        await interaction.reply({ embeds: [successEmbed("Nuevo Trabajo", `Has empezado a trabajar como **${j.name}**.`)] });
      }
    }
    
    else if (sub === 'perfil') {
      const current = getUserJob(guildId, userId);
      if (!current) {
        await interaction.reply({ embeds: [errorEmbed("No tienes ningún trabajo. Usa `/trabajo elegir`.")], ephemeral: true });
        return;
      }
      
      const jobDef = JOB_CATALOG.find(j => j.id === current.job_id)!;
      const nextXp = current.level < 10 ? current.level * 200 : "MAX";
      const workBonus = getJobWorkBonus(guildId, userId);
      
      let text = `**Profesión:** ${jobDef.name}\n`;
      text += `**Nivel:** ${current.level} / 10\n`;
      text += `**XP:** ${current.xp} / ${nextXp}\n`;
      text += `**Turnos Completados:** ${current.shifts_worked}\n\n`;
      text += `**Bonus de Sueldo:** +${(workBonus * 100).toFixed(0)}%\n`;
      text += `**Beneficios Activos:** ${jobDef.desc}\n`;
      
      await interaction.reply({ embeds: [ecoEmbed("Perfil Laboral", text)] });
    }
    
    else if (sub === 'turno') {
      const res = doJobShift(guildId, userId);
      if (!res.success) {
        await interaction.reply({ embeds: [errorEmbed(res.msg!)], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [successEmbed("Turno Finalizado", res.msg!)] });
      }
    }
    
    else if (sub === 'top') {
      const top = getTopJobs(guildId);
      if (!top.length) {
        await interaction.reply({ embeds: [errorEmbed("Aún no hay trabajadores registrados.")], ephemeral: true });
        return;
      }
      
      let text = "";
      for (let i = 0; i < top.length; i++) {
        const u = top[i];
        const jobDef = JOB_CATALOG.find(j => j.id === u.job_id);
        const jName = jobDef ? jobDef.name : u.job_id;
        text += `**${i + 1}.** <@${u.user_id}> - ${jName} (Nivel ${u.level})\n`;
      }
      
      await interaction.reply({ embeds: [ecoEmbed("Mejores Trabajadores", text)] });
    }
  }
};

export default command;
