import { 
  ActionRowBuilder, 
  EmbedBuilder, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder,
  type StringSelectMenuInteraction 
} from "discord.js";
import { getDb } from "../../database/index.js";
import { infoEmbed, successEmbed, errorEmbed } from "../../utils/embeds.js";

export interface PanelRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  title: string;
  description: string | null;
  mode: string;
  max_roles: number | null;
  created_by: string;
  created_at: number;
}

export interface OptionRow {
  panel_id: number;
  role_id: string;
  label: string;
  emoji: string | null;
  description: string | null;
  sort_order: number;
}

export function createPanel(
  guildId: string, 
  channelId: string, 
  title: string, 
  description: string | null, 
  mode: string, 
  maxRoles: number | null, 
  createdBy: string
): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO selfrole_panels (guild_id, channel_id, title, description, mode, max_roles, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(guildId, channelId, title, description, mode, maxRoles, createdBy, Date.now());
  return result.lastInsertRowid as number;
}

export function getPanel(panelId: number): PanelRow | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM selfrole_panels WHERE id = ?").get(panelId) as PanelRow | undefined;
  return row || null;
}

export function getPanelsByGuild(guildId: string): PanelRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM selfrole_panels WHERE guild_id = ?").all(guildId) as PanelRow[];
}

export function updatePanel(
  panelId: number, 
  updates: { title?: string; description?: string; mode?: string; maxRoles?: number | null; channel_id?: string; }
): boolean {
  const db = getDb();
  const sets: string[] = [];
  const params: any[] = [];
  
  if (updates.title !== undefined) { sets.push("title = ?"); params.push(updates.title); }
  if (updates.description !== undefined) { sets.push("description = ?"); params.push(updates.description); }
  if (updates.mode !== undefined) { sets.push("mode = ?"); params.push(updates.mode); }
  if (updates.maxRoles !== undefined) { sets.push("max_roles = ?"); params.push(updates.maxRoles); }
  if (updates.channel_id !== undefined) { sets.push("channel_id = ?"); params.push(updates.channel_id); }
  
  if (sets.length === 0) return false;
  
  params.push(panelId);
  const stmt = db.prepare(`UPDATE selfrole_panels SET ${sets.join(", ")} WHERE id = ?`);
  return stmt.run(...params).changes > 0;
}

export function deletePanel(panelId: number): boolean {
  const db = getDb();
  return db.prepare("DELETE FROM selfrole_panels WHERE id = ?").run(panelId).changes > 0;
}

export function addOption(
  panelId: number, 
  roleId: string, 
  label: string, 
  emoji: string | null, 
  description: string | null
): boolean {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO selfrole_options (panel_id, role_id, label, emoji, description)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(panel_id, role_id) DO UPDATE SET
      label = excluded.label,
      emoji = excluded.emoji,
      description = excluded.description
  `);
  return stmt.run(panelId, roleId, label, emoji, description).changes > 0;
}

export function removeOption(panelId: number, roleId: string): boolean {
  const db = getDb();
  return db.prepare("DELETE FROM selfrole_options WHERE panel_id = ? AND role_id = ?").run(panelId, roleId).changes > 0;
}

export function getOptions(panelId: number): OptionRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM selfrole_options WHERE panel_id = ? ORDER BY sort_order ASC, rowid ASC").all(panelId) as OptionRow[];
}

export function updatePanelMessageId(panelId: number, messageId: string): void {
  const db = getDb();
  db.prepare("UPDATE selfrole_panels SET message_id = ? WHERE id = ?").run(messageId, panelId);
}

export function renderPanelEmbed(panel: PanelRow, options: OptionRow[]): EmbedBuilder {
  let desc = panel.description ? panel.description + "\\n\\n" : "";
  
  const modeText = panel.mode === 'unico' 
    ? "Elige 1 rol de la lista abajo." 
    : panel.mode === 'multiple' 
      ? `Puedes elegir múltiples roles${panel.max_roles ? ` (máximo ${panel.max_roles})` : ""}.`
      : "Selecciona los roles que desees.";
      
  desc += `**Modo:** ${modeText}\\n\\n`;
  
  if (options.length === 0) {
    desc += "*No hay roles configurados en este panel aún.*";
  }
  
  const embed = infoEmbed(desc, panel.title);
  return embed;
}

export function renderPanelComponents(panel: PanelRow, options: OptionRow[]): ActionRowBuilder<StringSelectMenuBuilder>[] {
  if (options.length === 0) return [];
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`sr:panel:${panel.id}`)
    .setPlaceholder("Selecciona tus roles...");

  if (panel.mode === "unico") {
    selectMenu.setMinValues(0);
    selectMenu.setMaxValues(1);
  } else {
    const maxSelectable = panel.max_roles ? Math.min(options.length, panel.max_roles) : options.length;
    selectMenu.setMinValues(0);
    selectMenu.setMaxValues(maxSelectable);
  }

  const menuOptions = options.map(opt => {
    const builder = new StringSelectMenuOptionBuilder()
      .setLabel(opt.label)
      .setValue(opt.role_id);
    if (opt.emoji) builder.setEmoji(opt.emoji);
    if (opt.description) builder.setDescription(opt.description);
    return builder;
  });

  selectMenu.addOptions(menuOptions);

  return [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)];
}

export async function handleSelfroleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const [, , panelIdStr] = interaction.customId.split(":");
  const panelId = parseInt(panelIdStr, 10);
  if (isNaN(panelId)) return;

  const panel = getPanel(panelId);
  if (!panel) {
    await interaction.reply({ 
      embeds: [errorEmbed("Este panel ya no existe en la base de datos.")], 
      ephemeral: true 
    });
    return;
  }

  const options = getOptions(panelId);
  const panelRoleIds = options.map(o => o.role_id);
  const member = interaction.guild?.members.cache.get(interaction.user.id) || await interaction.guild?.members.fetch(interaction.user.id);

  if (!member) {
    await interaction.reply({ 
      embeds: [errorEmbed("No se pudo encontrar tu perfil en el servidor.")], 
      ephemeral: true 
    });
    return;
  }

  const selectedRoles = interaction.values;
  const currentRoles = member.roles.cache;
  
  const rolesToAdd: string[] = [];
  const rolesToRemove: string[] = [];
  
  if (panel.mode === "unico") {
    for (const roleId of panelRoleIds) {
      if (selectedRoles.includes(roleId) && !currentRoles.has(roleId)) {
        rolesToAdd.push(roleId);
      } else if (!selectedRoles.includes(roleId) && currentRoles.has(roleId)) {
        rolesToRemove.push(roleId);
      }
    }
  } else if (panel.mode === "toggle" || panel.mode === "multiple") {
    // Both toggle and multiple behavior can be handled similarly in terms of the select menu
    // The select menu gives us exactly the roles the user wants to have from the current panel
    for (const roleId of panelRoleIds) {
      if (selectedRoles.includes(roleId) && !currentRoles.has(roleId)) {
        rolesToAdd.push(roleId);
      } else if (!selectedRoles.includes(roleId) && currentRoles.has(roleId)) {
        rolesToRemove.push(roleId);
      }
    }
  }

  if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
    await interaction.reply({ 
      embeds: [infoEmbed("Tus roles no han sido modificados.")], 
      ephemeral: true 
    });
    return;
  }

  try {
    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove);
    }
    if (rolesToAdd.length > 0) {
      await member.roles.add(rolesToAdd);
    }

    const addedText = rolesToAdd.length > 0 ? `**Añadidos:**\\n${rolesToAdd.map(id => `<@&${id}>`).join(", ")}` : "";
    const removedText = rolesToRemove.length > 0 ? `**Eliminados:**\\n${rolesToRemove.map(id => `<@&${id}>`).join(", ")}` : "";
    
    const summary = [addedText, removedText].filter(Boolean).join("\\n\\n");
    
    await interaction.reply({ 
      embeds: [successEmbed(summary, "Roles Actualizados")], 
      ephemeral: true 
    });

  } catch (error) {
    console.error("Error in selfroles:", error);
    await interaction.reply({ 
      embeds: [errorEmbed("Ocurrió un error al asignar los roles. Es posible que el bot no tenga suficientes permisos (jerarquía de roles).")], 
      ephemeral: true 
    });
  }
}
