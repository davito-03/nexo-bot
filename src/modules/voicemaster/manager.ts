import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  type ButtonInteraction,
  type GuildMember,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  type UserSelectMenuInteraction,
  type VoiceBasedChannel,
  type VoiceState,
} from "discord.js";
import { COLORS, NEXO_OWNER_ROLE_ID, NEXO_STAFF_ROLE_ID } from "../../constants.js";
import { ephemeral, errorEmbed, voiceEmbed } from "../../utils/embeds.js";
import { getDb, getGuildConfig } from "../../database/index.js";
import { isStaff, isAdmin } from "../../utils/permissions.js";
import type { NexoClient } from "../../client.js";
import { logger } from "../../logger.js";

export function getTemp(channelId: string) {
  return getDb().prepare("SELECT * FROM temp_voices WHERE channel_id = ?").get(channelId) as
    | { channel_id: string; guild_id: string; owner_id: string; hub_id: string | null; created_at: number }
    | undefined;
}

export function isOwner(channelId: string, userId: string): boolean {
  const t = getTemp(channelId);
  return !!t && t.owner_id === userId;
}

/**
 * Comprueba si el usuario tiene privilegios de Moderación u Owner para gestionar cualquier sala de voz.
 */
export function hasVoiceStaffBypass(member: GuildMember): boolean {
  if (member.id === member.guild.ownerId) return true;
  if (member.roles.cache.has(NEXO_OWNER_ROLE_ID) || member.roles.cache.has(NEXO_STAFF_ROLE_ID)) return true;
  if (isStaff(member) || isAdmin(member)) return true;
  return false;
}

/**
 * Comprueba si un usuario puede controlar una sala de voz temporal (dueño legítimo o Staff/Owner).
 */
export function canControlRoom(member: GuildMember, channelId: string): boolean {
  return isOwner(channelId, member.id) || hasVoiceStaffBypass(member);
}

export async function handleVoiceJoin(state: VoiceState): Promise<void> {
  const member = state.member;
  if (!member || member.user.bot || !state.channelId) return;
  const cfg = getGuildConfig(state.guild.id);
  if (!cfg.voicemaster.hubId || state.channelId !== cfg.voicemaster.hubId) return;

  const name = cfg.voicemaster.nameTemplate.replace("{user}", member.displayName).slice(0, 90);
  const parent = cfg.voicemaster.categoryId ?? state.channel?.parentId ?? undefined;
  const channel = await state.guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: parent ?? undefined,
    userLimit: cfg.voicemaster.userLimit || undefined,
    bitrate: Math.min(cfg.voicemaster.bitrate || 64000, state.guild.maximumBitrate),
    permissionOverwrites: [
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.ViewChannel,
        ],
      },
      {
        id: NEXO_OWNER_ROLE_ID,
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.MuteMembers,
          PermissionFlagsBits.DeafenMembers,
        ],
      },
      {
        id: NEXO_STAFF_ROLE_ID,
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.MuteMembers,
          PermissionFlagsBits.DeafenMembers,
        ],
      },
    ],
    reason: `Canal temporal de ${member.user.tag}`,
  });
  getDb()
    .prepare("INSERT INTO temp_voices (channel_id, guild_id, owner_id, hub_id, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(channel.id, state.guild.id, member.id, cfg.voicemaster.hubId, Date.now());
  await member.voice.setChannel(channel).catch(() => {
    /* user left hub too fast */
  });
}

export async function handleVoiceLeave(state: VoiceState): Promise<void> {
  if (!state.channelId) return;
  const temp = getTemp(state.channelId);
  if (!temp) return;
  const channel = state.guild.channels.cache.get(state.channelId) ?? (await state.guild.channels.fetch(state.channelId).catch(() => null));
  if (!channel || !channel.isVoiceBased()) {
    getDb().prepare("DELETE FROM temp_voices WHERE channel_id = ?").run(state.channelId);
    return;
  }
  const humans = channel.members.filter((m) => !m.user.bot);
  if (humans.size === 0) {
    getDb().prepare("DELETE FROM temp_voices WHERE channel_id = ?").run(channel.id);
    await channel.delete("Canal temporal vacío").catch(() => null);
    return;
  }
  if (temp.owner_id === state.member?.id) {
    const next = humans.first();
    if (next) {
      getDb().prepare("UPDATE temp_voices SET owner_id = ? WHERE channel_id = ?").run(next.id, channel.id);
      await channel.permissionOverwrites.edit(next.id, {
        Connect: true,
        Speak: true,
        ViewChannel: true,
      }).catch(() => null);
    }
  }
}

export function panelEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.voice)
    .setTitle("🔊 Panel de Control · Canales de Voz")
    .setDescription(
      "¡Administra tu canal de voz temporal pulsando los botones interactivos mientras estés conectado a él!\n\n" +
      "**Acceso & Privacidad:**\n" +
      "🔒 **Bloquear:** Cierra la sala a nuevos miembros.\n" +
      "🔓 **Desbloquear:** Abre la sala para que todos puedan entrar.\n" +
      "🙈 **Ocultar:** Esconde la sala para los demás usuarios.\n" +
      "👁️ **Mostrar:** Vuelve a hacer la sala visible en la lista.\n" +
      "✏️ **Renombrar:** Cambia el nombre de tu canal.\n\n" +
      "**Capacidad & Audio:**\n" +
      "🔢 **Límite:** Establece un límite numérico exacto (0 = ilimitado).\n" +
      "➕ / ➖ **+1 / -1:** Modifica el cupo rápidamente.\n" +
      "📶 **Bitrate:** Ajusta la calidad de audio de tu sala.\n" +
      "ℹ️ **Información:** Consulta el estado y ajustes de la sala.\n\n" +
      "**Miembros & Control:**\n" +
      "✅ **Permitir:** Da acceso a un amigo aunque la sala esté cerrada u oculta.\n" +
      "🚫 **Bloquear:** Veta a un usuario impidiendo que entre.\n" +
      "🤝 **Desbloquear:** Quita el veto a un usuario para que pueda volver a entrar.\n" +
      "👢 **Expulsar:** Desconecta a un miembro de la sala.\n" +
      "👑 **Reclamar:** Reclama el canal si el dueño se fue (o control directo si eres Moderación/Owner).\n\n" +
      "**Gestión:**\n" +
      "🔄 **Transferir:** Cede la propiedad a otro compañero.\n" +
      "🗑️ **Borrar sala:** Elimina tu canal inmediatamente.\n\n" +
      "🛡️ *Los roles de **Owner** y **Moderación** disponen de control y acceso permanente sobre cualquier sala.*"
    )
    .setFooter({ text: "Nexo VoiceMaster · Conéctate a 'Entra para crear' para obtener tu sala" });
}

export function panelComponents(): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("vm:lock").setEmoji("🔒").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:unlock").setEmoji("🔓").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:hide").setEmoji("🙈").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:show").setEmoji("👁️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:rename").setEmoji("✏️").setStyle(ButtonStyle.Primary),
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("vm:limit").setEmoji("🔢").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:inc").setEmoji("➕").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:dec").setEmoji("➖").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:bitrate").setEmoji("📶").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:info").setEmoji("ℹ️").setStyle(ButtonStyle.Primary),
  );
  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("vm:permit").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("vm:reject").setEmoji("🚫").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("vm:unreject").setEmoji("🤝").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("vm:kick").setEmoji("👢").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("vm:claim").setEmoji("👑").setStyle(ButtonStyle.Success),
  );
  const row4 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("vm:transfer").setLabel("Transferir").setEmoji("🔄").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vm:delete").setLabel("Borrar sala").setEmoji("🗑️").setStyle(ButtonStyle.Danger),
  );
  return [row1, row2, row3, row4];
}

async function currentTemp(member: GuildMember): Promise<VoiceBasedChannel | null> {
  const ch = member.voice.channel;
  if (!ch) return null;
  const temp = getTemp(ch.id);
  if (temp) return ch;

  // Auto-recuperación si está en la categoría de VoiceMaster y no es el Hub
  const cfg = getGuildConfig(member.guild.id);
  if (cfg.voicemaster.categoryId && ch.parentId === cfg.voicemaster.categoryId && ch.id !== cfg.voicemaster.hubId) {
    getDb()
      .prepare("INSERT OR REPLACE INTO temp_voices (channel_id, guild_id, owner_id, hub_id, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(ch.id, member.guild.id, member.id, cfg.voicemaster.hubId || null, Date.now());
    return ch;
  }
  return null;
}

function requireOwner(member: GuildMember, channel: VoiceBasedChannel): string | null {
  if (!canControlRoom(member, channel.id)) {
    return "Solo el dueño de la sala o miembros con rol de Moderación/Owner pueden realizar esta acción.";
  }
  return null;
}

/** Gestiona los permisos de lock, unlock, hide y show garantizando que Moderación y Owner nunca pierdan acceso */
export async function setChannelAccess(channel: VoiceBasedChannel, operatorId: string, type: "lock" | "unlock" | "hide" | "show"): Promise<void> {
  const guild = channel.guild;
  const everyone = guild.roles.everyone.id;
  const temp = getTemp(channel.id);
  const roomOwnerId = temp?.owner_id;
  const exemptRoleIds = new Set([NEXO_OWNER_ROLE_ID, NEXO_STAFF_ROLE_ID]);

  if (type === "lock") {
    await channel.permissionOverwrites.edit(everyone, { Connect: false });
    // Bloquear también los roles con Connect allow que vienen heredados de la categoría (ej: rol verificado)
    for (const [id, overwrite] of channel.permissionOverwrites.cache) {
      if (id === operatorId || id === roomOwnerId || id === guild.client.user.id || id === everyone || exemptRoleIds.has(id)) continue;
      if (overwrite.type === 0 && overwrite.allow.has(PermissionFlagsBits.Connect)) {
        await channel.permissionOverwrites.edit(id, { Connect: false }).catch(() => null);
      }
    }
    if (roomOwnerId) {
      await channel.permissionOverwrites.edit(roomOwnerId, { Connect: true, ViewChannel: true }).catch(() => null);
    }
    if (operatorId && operatorId !== roomOwnerId) {
      await channel.permissionOverwrites.edit(operatorId, { Connect: true, ViewChannel: true }).catch(() => null);
    }
    await channel.permissionOverwrites.edit(NEXO_OWNER_ROLE_ID, { Connect: true, ViewChannel: true }).catch(() => null);
    await channel.permissionOverwrites.edit(NEXO_STAFF_ROLE_ID, { Connect: true, ViewChannel: true }).catch(() => null);
  } else if (type === "unlock") {
    await channel.permissionOverwrites.edit(everyone, { Connect: null });
    for (const [id, overwrite] of channel.permissionOverwrites.cache) {
      if (id === operatorId || id === roomOwnerId || id === guild.client.user.id || id === everyone || exemptRoleIds.has(id)) continue;
      if (overwrite.type === 0 && overwrite.deny.has(PermissionFlagsBits.Connect)) {
        await channel.permissionOverwrites.edit(id, { Connect: null }).catch(() => null);
      }
    }
  } else if (type === "hide") {
    await channel.permissionOverwrites.edit(everyone, { ViewChannel: false });
    for (const [id, overwrite] of channel.permissionOverwrites.cache) {
      if (id === operatorId || id === roomOwnerId || id === guild.client.user.id || id === everyone || exemptRoleIds.has(id)) continue;
      if (overwrite.type === 0 && overwrite.allow.has(PermissionFlagsBits.ViewChannel)) {
        await channel.permissionOverwrites.edit(id, { ViewChannel: false }).catch(() => null);
      }
    }
    if (roomOwnerId) {
      await channel.permissionOverwrites.edit(roomOwnerId, { ViewChannel: true, Connect: true }).catch(() => null);
    }
    if (operatorId && operatorId !== roomOwnerId) {
      await channel.permissionOverwrites.edit(operatorId, { ViewChannel: true, Connect: true }).catch(() => null);
    }
    await channel.permissionOverwrites.edit(NEXO_OWNER_ROLE_ID, { ViewChannel: true, Connect: true }).catch(() => null);
    await channel.permissionOverwrites.edit(NEXO_STAFF_ROLE_ID, { ViewChannel: true, Connect: true }).catch(() => null);
  } else if (type === "show") {
    await channel.permissionOverwrites.edit(everyone, { ViewChannel: null });
    for (const [id, overwrite] of channel.permissionOverwrites.cache) {
      if (id === operatorId || id === roomOwnerId || id === guild.client.user.id || id === everyone || exemptRoleIds.has(id)) continue;
      if (overwrite.type === 0 && overwrite.deny.has(PermissionFlagsBits.ViewChannel)) {
        await channel.permissionOverwrites.edit(id, { ViewChannel: null }).catch(() => null);
      }
    }
  }
}

export async function handleVoiceButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const member = interaction.member;
  const channel = await currentTemp(member);
  if (!channel) {
    if (hasVoiceStaffBypass(member)) {
      const db = getDb();
      const temps = db.prepare("SELECT channel_id FROM temp_voices WHERE guild_id = ?").all(interaction.guild.id) as { channel_id: string }[];
      const activeVoiceChannels = temps
        .map((t) => interaction.guild.channels.cache.get(t.channel_id))
        .filter((c): c is VoiceBasedChannel => !!c && c.isVoiceBased());

      if (activeVoiceChannels.length === 0) {
        await interaction.reply(ephemeral([errorEmbed("Sin salas activas", "No hay salas temporales activas en este momento en el servidor.")]));
        return;
      }

      const action = interaction.customId.split(":")[1];
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`vm:staff_target:${action}`)
        .setPlaceholder("Selecciona la sala que deseas controlar...")
        .addOptions(
          activeVoiceChannels.slice(0, 25).map((c) => {
            const temp = getTemp(c.id);
            return {
              label: c.name.slice(0, 100),
              description: `👥 ${c.members.size} miembro(s) · Creador: ${temp?.owner_id ? `<@${temp.owner_id}>` : "Desconocido"}`.slice(0, 100),
              value: c.id,
              emoji: "🔊",
            };
          }),
        );

      await interaction.reply({
        content: `🛡️ **Modo Staff/Owner:** No estás conectado a ninguna sala. Selecciona qué canal de voz deseas gestionar:`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(ephemeral([errorEmbed("Sin sala", "Debes estar conectado a tu canal temporal de voz.")]));
    return;
  }
  const action = interaction.customId.split(":")[1];

  // Acción: Reclamar liderazgo
  if (action === "claim") {
    const temp = getTemp(channel.id)!;
    if (temp.owner_id === member.id) {
      await interaction.reply({ content: "Ya eres el dueño de esta sala.", ephemeral: true });
      return;
    }
    const isStaffOrOwner = hasVoiceStaffBypass(member);
    const ownerIn = channel.members.has(temp.owner_id);
    if (ownerIn && !isStaffOrOwner) {
      await interaction.reply(ephemeral([errorEmbed("Dueño presente", "El dueño actual sigue en la sala. No puedes reclamarla.")]));
      return;
    }
    getDb().prepare("UPDATE temp_voices SET owner_id = ? WHERE channel_id = ?").run(member.id, channel.id);
    await channel.permissionOverwrites.edit(member.id, {
      Connect: true,
      Speak: true,
      ViewChannel: true,
    });
    const msg = isStaffOrOwner && ownerIn
      ? "👑 Has tomado el control oficial de la sala como Moderación/Owner (el dueño original sigue en la sala)."
      : "Ahora eres el nuevo dueño de la sala.";
    await interaction.reply(ephemeral([voiceEmbed("👑 Sala reclamada", msg)]));
    return;
  }

  // Acción: Info de la sala (disponible para todos los miembros dentro de la sala o staff)
  if (action === "info") {
    const temp = getTemp(channel.id);
    const ownerId = temp?.owner_id || "Desconocido";
    const everyone = channel.guild.roles.everyone.id;
    const isLocked = channel.permissionOverwrites.cache.get(everyone)?.deny.has(PermissionFlagsBits.Connect) ?? false;
    const isHidden = channel.permissionOverwrites.cache.get(everyone)?.deny.has(PermissionFlagsBits.ViewChannel) ?? false;
    const currentBitrate = Math.round(channel.bitrate / 1000);
    const members = channel.members.map((m) => `• <@${m.id}>${m.id === ownerId ? " 👑" : ""}`).join("\n");

    const embed = new EmbedBuilder()
      .setColor(COLORS.voice)
      .setTitle(`ℹ️ Información · ${channel.name}`)
      .addFields(
        { name: "👑 Dueño", value: `<@${ownerId}>`, inline: true },
        { name: "👥 Límite", value: channel.userLimit ? `${channel.members.size}/${channel.userLimit}` : `${channel.members.size} (Ilimitado)`, inline: true },
        { name: "📶 Calidad", value: `${currentBitrate} kbps`, inline: true },
        { name: "🔒 Acceso", value: isLocked ? "🔒 Bloqueada" : "🔓 Abierta", inline: true },
        { name: "👁️ Visibilidad", value: isHidden ? "🙈 Oculta" : "👁️ Visible", inline: true },
        { name: `🎙️ Conectados (${channel.members.size})`, value: members || "*Nadie en la sala*", inline: false },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // Las siguientes acciones requieren ser el dueño o Moderación/Owner
  const blocked = requireOwner(member, channel);
  if (blocked) {
    await interaction.reply({ content: blocked, ephemeral: true });
    return;
  }

  // Acción: Renombrar sala
  if (action === "rename") {
    const modal = new ModalBuilder().setCustomId(`vm:rename:${channel.id}`).setTitle("Renombrar sala");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("name")
          .setLabel("Nuevo nombre para tu sala")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(90)
          .setRequired(true)
          .setValue(channel.name.slice(0, 90)),
      ),
    );
    await interaction.showModal(modal);
    return;
  }

  // Acción: Fijar límite exacto
  if (action === "limit") {
    const modal = new ModalBuilder().setCustomId(`vm:limit:${channel.id}`).setTitle("Límite de usuarios");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("limit")
          .setLabel("Cupo de usuarios (0 = ilimitado)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("0 - 99")
          .setMaxLength(2)
          .setRequired(true)
          .setValue(String(channel.userLimit || 0)),
      ),
    );
    await interaction.showModal(modal);
    return;
  }

  // Acción: Ajustar Bitrate
  if (action === "bitrate") {
    const max = channel.guild.maximumBitrate;
    const options = [
      { label: "64 kbps", description: "Calidad estándar (ahorro de datos)", value: "64000", emoji: "📻" },
      { label: "96 kbps", description: "Calidad alta recomendada", value: "96000", emoji: "🎧" },
      { label: "128 kbps", description: "Excelente fidelidad", value: "128000", emoji: "🔊" },
      ...(max >= 256000 ? [{ label: "256 kbps", description: "Calidad muy alta (Boost Nivel 2)", value: "256000", emoji: "✨" }] : []),
      ...(max >= 384000 ? [{ label: "384 kbps", description: "Calidad de estudio (Boost Nivel 3)", value: "384000", emoji: "💎" }] : []),
    ];
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`vm:bitrate:select:${channel.id}`)
      .setPlaceholder("Elige la calidad de sonido...")
      .addOptions(options);

    await interaction.reply({
      content: "📶 Selecciona el bitrate deseado para tu sala:",
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
      ephemeral: true,
    });
    return;
  }

  // Acción: Permitir a un usuario específico
  if (action === "permit") {
    const select = new UserSelectMenuBuilder()
      .setCustomId(`vm:permit:user:${channel.id}`)
      .setPlaceholder("Elige al usuario al que dar acceso...")
      .setMaxValues(1);

    await interaction.reply({
      content: "✅ Selecciona al usuario que deseas autorizar para ver y unirse a tu sala:",
      components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select)],
      ephemeral: true,
    });
    return;
  }

  // Acción: Bloquear a un usuario específico
  if (action === "reject") {
    const select = new UserSelectMenuBuilder()
      .setCustomId(`vm:reject:user:${channel.id}`)
      .setPlaceholder("Elige al usuario que deseas vetar...")
      .setMaxValues(1);

    await interaction.reply({
      content: "🚫 Selecciona al usuario que deseas bloquear (será expulsado si está dentro):",
      components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select)],
      ephemeral: true,
    });
    return;
  }

  // Acción: Desbloquear a un usuario previamente bloqueado
  if (action === "unreject") {
    const blockedOverwrites = channel.permissionOverwrites.cache.filter(
      (o) => o.type === 1 && o.deny.has(PermissionFlagsBits.Connect) && o.id !== channel.guild.client.user.id,
    );

    if (blockedOverwrites.size === 0) {
      await interaction.reply({
        content: "🤝 No tienes a ningún usuario bloqueado actualmente en esta sala.",
        ephemeral: true,
      });
      return;
    }

    const options = await Promise.all(
      blockedOverwrites.first(25).map(async (o) => {
        const u = await interaction.client.users.fetch(o.id).catch(() => null);
        return {
          label: (u?.username || `Usuario ${o.id}`).slice(0, 100),
          description: `ID: ${o.id}`,
          value: o.id,
          emoji: "🔓",
        };
      }),
    );

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`vm:unreject:select:${channel.id}`)
      .setPlaceholder("Selecciona a quién deseas desbloquear...")
      .addOptions(options);

    await interaction.reply({
      content: "🤝 **Usuarios actualmente bloqueados de tu sala:**\nElige al usuario al que deseas retirar el veto:",
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
      ephemeral: true,
    });
    return;
  }

  // Acciones sobre otros miembros de la sala (Kick, Transfer)
  if (action === "transfer" || action === "kick") {
    const others = channel.members.filter((m) => !m.user.bot && m.id !== member.id);
    if (!others.size) {
      await interaction.reply({ content: "No hay nadie más en tu sala para realizar esta acción.", ephemeral: true });
      return;
    }
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`vm:${action}:pick:${channel.id}`)
      .setPlaceholder(
        action === "kick"
          ? "Elige a quién expulsar..."
          : "Elige al nuevo dueño de la sala...",
      )
      .addOptions(
        others.first(25).map((m) => {
          return {
            label: m.displayName.slice(0, 100),
            value: m.id,
          };
        }),
      );
    await interaction.reply({
      content:
        action === "kick"
          ? "👢 ¿A quién deseas expulsar de la sala?"
          : "🔄 ¿A quién deseas transferir la propiedad de tu sala?",
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
      ephemeral: true,
    });
    return;
  }

  // Botones de acción directa
  switch (action) {
    case "lock":
      await setChannelAccess(channel, member.id, "lock");
      await interaction.reply(ephemeral([voiceEmbed("🔒 Sala Bloqueada", "Nadie más puede unirse a la sala temporal.")]));
      break;
    case "unlock":
      await setChannelAccess(channel, member.id, "unlock");
      await interaction.reply(ephemeral([voiceEmbed("🔓 Sala Desbloqueada", "La sala ahora está abierta a cualquier usuario.")]));
      break;
    case "hide":
      await setChannelAccess(channel, member.id, "hide");
      await interaction.reply({ content: "🙈 La sala ha sido ocultada en la lista de canales.", ephemeral: true });
      break;
    case "show":
      await setChannelAccess(channel, member.id, "show");
      await interaction.reply({ content: "👁️ La sala vuelve a ser visible para todos.", ephemeral: true });
      break;
    case "inc": {
      const next = Math.min(99, (channel.userLimit || 0) + 1);
      await channel.setUserLimit(next);
      await interaction.reply({ content: `➕ Límite aumentado a **${next} usuarios**.`, ephemeral: true });
      break;
    }
    case "dec": {
      const next = Math.max(0, (channel.userLimit || 0) - 1);
      await channel.setUserLimit(next);
      await interaction.reply({ content: `➖ Límite reducido a **${next === 0 ? "sin límite" : `${next} usuarios`}**.`, ephemeral: true });
      break;
    }
    case "delete":
      getDb().prepare("DELETE FROM temp_voices WHERE channel_id = ?").run(channel.id);
      await interaction.reply({ content: "🗑️ Borrando sala temporal…", ephemeral: true });
      await channel.delete("Sala eliminada").catch(() => null);
      break;
    default:
      await interaction.reply({ content: "Acción desconocida.", ephemeral: true });
  }
}

export async function executeStaffVoiceAction(
  interaction: StringSelectMenuInteraction,
  channel: VoiceBasedChannel,
  action: string,
): Promise<void> {
  const userId = interaction.user.id;
  const temp = getTemp(channel.id);
  const ownerId = temp?.owner_id || "Desconocido";

  switch (action) {
    case "info": {
      const everyone = channel.guild.roles.everyone.id;
      const isLocked = channel.permissionOverwrites.cache.get(everyone)?.deny.has(PermissionFlagsBits.Connect) ?? false;
      const isHidden = channel.permissionOverwrites.cache.get(everyone)?.deny.has(PermissionFlagsBits.ViewChannel) ?? false;
      const currentBitrate = Math.round(channel.bitrate / 1000);
      const members = channel.members.map((m) => `• <@${m.id}>${m.id === ownerId ? " 👑" : ""}`).join("\n");

      const embed = new EmbedBuilder()
        .setColor(COLORS.voice)
        .setTitle(`ℹ️ Información · ${channel.name}`)
        .addFields(
          { name: "👑 Dueño", value: `<@${ownerId}>`, inline: true },
          { name: "👥 Límite", value: channel.userLimit ? `${channel.members.size}/${channel.userLimit}` : `${channel.members.size} (Ilimitado)`, inline: true },
          { name: "📶 Calidad", value: `${currentBitrate} kbps`, inline: true },
          { name: "🔒 Acceso", value: isLocked ? "🔒 Bloqueada" : "🔓 Abierta", inline: true },
          { name: "👁️ Visibilidad", value: isHidden ? "🙈 Oculta" : "👁️ Visible", inline: true },
          { name: `🎙️ Conectados (${channel.members.size})`, value: members || "*Nadie en la sala*", inline: false },
        )
        .setTimestamp();

      await interaction.update({ content: null, embeds: [embed], components: [] });
      break;
    }
    case "lock":
      await setChannelAccess(channel, userId, "lock");
      await interaction.update({ content: `🔒 Sala **${channel.name}** bloqueada con éxito.`, components: [] });
      break;
    case "unlock":
      await setChannelAccess(channel, userId, "unlock");
      await interaction.update({ content: `🔓 Sala **${channel.name}** desbloqueada con éxito.`, components: [] });
      break;
    case "hide":
      await setChannelAccess(channel, userId, "hide");
      await interaction.update({ content: `🙈 Sala **${channel.name}** ocultada con éxito.`, components: [] });
      break;
    case "show":
      await setChannelAccess(channel, userId, "show");
      await interaction.update({ content: `👁️ Sala **${channel.name}** visible con éxito.`, components: [] });
      break;
    case "inc": {
      const next = Math.min(99, (channel.userLimit || 0) + 1);
      await channel.setUserLimit(next);
      await interaction.update({ content: `➕ Límite de **${channel.name}** aumentado a **${next} usuarios**.`, components: [] });
      break;
    }
    case "dec": {
      const next = Math.max(0, (channel.userLimit || 0) - 1);
      await channel.setUserLimit(next);
      await interaction.update({ content: `➖ Límite de **${channel.name}** reducido a **${next === 0 ? "sin límite" : `${next} usuarios`}**.`, components: [] });
      break;
    }
    case "delete":
      getDb().prepare("DELETE FROM temp_voices WHERE channel_id = ?").run(channel.id);
      await channel.delete("Moderación eliminó la sala").catch(() => null);
      await interaction.update({ content: `🗑️ Sala temporal **${channel.name}** eliminada con éxito.`, components: [] });
      break;
    case "claim":
      getDb().prepare("UPDATE temp_voices SET owner_id = ? WHERE channel_id = ?").run(userId, channel.id);
      await channel.permissionOverwrites.edit(userId, {
        Connect: true,
        Speak: true,
        ViewChannel: true,
      });
      await interaction.update({ content: `👑 Te has asignado como nuevo dueño de la sala **${channel.name}**.`, components: [] });
      break;
    case "rename": {
      const modal = new ModalBuilder().setCustomId(`vm:rename:${channel.id}`).setTitle("Renombrar sala");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("name")
            .setLabel("Nuevo nombre para la sala")
            .setStyle(TextInputStyle.Short)
            .setMaxLength(90)
            .setRequired(true)
            .setValue(channel.name.slice(0, 90)),
        ),
      );
      await interaction.showModal(modal);
      break;
    }
    case "limit": {
      const modal = new ModalBuilder().setCustomId(`vm:limit:${channel.id}`).setTitle("Límite de usuarios");
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("limit")
            .setLabel("Cupo de usuarios (0 = ilimitado)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("0 - 99")
            .setMaxLength(2)
            .setRequired(true)
            .setValue(String(channel.userLimit || 0)),
        ),
      );
      await interaction.showModal(modal);
      break;
    }
    case "bitrate": {
      const max = channel.guild.maximumBitrate;
      const options = [
        { label: "64 kbps", description: "Calidad estándar (ahorro de datos)", value: "64000", emoji: "📻" },
        { label: "96 kbps", description: "Calidad alta recomendada", value: "96000", emoji: "🎧" },
        { label: "128 kbps", description: "Excelente fidelidad", value: "128000", emoji: "🔊" },
        ...(max >= 256000 ? [{ label: "256 kbps", description: "Calidad muy alta (Boost Nivel 2)", value: "256000", emoji: "✨" }] : []),
        ...(max >= 384000 ? [{ label: "384 kbps", description: "Calidad de estudio (Boost Nivel 3)", value: "384000", emoji: "💎" }] : []),
      ];
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`vm:bitrate:select:${channel.id}`)
        .setPlaceholder("Elige la calidad de sonido...")
        .addOptions(options);

      await interaction.update({
        content: `📶 Selecciona el bitrate deseado para **${channel.name}**:`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
      });
      break;
    }
    case "permit": {
      const select = new UserSelectMenuBuilder()
        .setCustomId(`vm:permit:user:${channel.id}`)
        .setPlaceholder("Elige al usuario a autorizar...")
        .setMaxValues(1);

      await interaction.update({
        content: `✅ Selecciona al usuario que deseas autorizar en **${channel.name}**:`,
        components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select)],
      });
      break;
    }
    case "reject": {
      const select = new UserSelectMenuBuilder()
        .setCustomId(`vm:reject:user:${channel.id}`)
        .setPlaceholder("Elige al usuario a vetar...")
        .setMaxValues(1);

      await interaction.update({
        content: `🚫 Selecciona al usuario que deseas vetar de **${channel.name}**:`,
        components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(select)],
      });
      break;
    }
    case "unreject": {
      const blockedOverwrites = channel.permissionOverwrites.cache.filter(
        (o) => o.type === 1 && o.deny.has(PermissionFlagsBits.Connect) && o.id !== channel.guild.client.user.id,
      );

      if (blockedOverwrites.size === 0) {
        await interaction.update({
          content: `🤝 No hay usuarios bloqueados en **${channel.name}**.`,
          components: [],
        });
        break;
      }

      const options = await Promise.all(
        blockedOverwrites.first(25).map(async (o) => {
          const u = await interaction.client.users.fetch(o.id).catch(() => null);
          return {
            label: (u?.username || `Usuario ${o.id}`).slice(0, 100),
            description: `ID: ${o.id}`,
            value: o.id,
            emoji: "🔓",
          };
        }),
      );

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`vm:unreject:select:${channel.id}`)
        .setPlaceholder("Selecciona a quién desbloquear...")
        .addOptions(options);

      await interaction.update({
        content: `🤝 **Usuarios bloqueados en ${channel.name}:**`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
      });
      break;
    }
    case "transfer":
    case "kick": {
      const others = channel.members.filter((m) => !m.user.bot && m.id !== userId);
      if (!others.size) {
        await interaction.update({ content: `No hay nadie más en **${channel.name}** para realizar esta acción.`, components: [] });
        break;
      }
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`vm:${action}:pick:${channel.id}`)
        .setPlaceholder(action === "kick" ? "Elige a quién expulsar..." : "Elige al nuevo dueño...")
        .addOptions(
          others.first(25).map((m) => ({
            label: m.displayName.slice(0, 100),
            value: m.id,
          })),
        );

      await interaction.update({
        content: action === "kick" ? `👢 ¿A quién expulsar de **${channel.name}**?` : `🔄 ¿A quién transferir **${channel.name}**?`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
      });
      break;
    }
    default:
      await interaction.update({ content: "Acción desconocida.", components: [] });
  }
}

export async function handleVoiceModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const parts = interaction.customId.split(":");
  const modalType = parts[1];
  const targetChId = parts[2];

  let channel: VoiceBasedChannel | null = null;
  if (targetChId) {
    channel = interaction.guild.channels.cache.get(targetChId) as VoiceBasedChannel | null;
  }
  if (!channel) {
    channel = await currentTemp(interaction.member);
  }

  if (!channel || !canControlRoom(interaction.member, channel.id)) {
    await interaction.reply({ content: "No tienes permisos para administrar esta sala de voz.", ephemeral: true });
    return;
  }

  if (modalType === "rename") {
    const name = interaction.fields.getTextInputValue("name").trim().slice(0, 90);
    if (!name) {
      await interaction.reply({ content: "Debes escribir un nombre válido.", ephemeral: true });
      return;
    }
    try {
      await channel.setName(name);
      await interaction.reply({ content: `✏️ Nombre de la sala cambiado a **${name}**.`, ephemeral: true });
    } catch (err: unknown) {
      const errObj = err as { code?: number; status?: number; message?: string };
      if (errObj?.code === 50035 || errObj?.status === 429) {
        await interaction.reply({
          content: `⚠️ Discord limita el cambio de nombre de canales a 2 veces cada 10 minutos. Espera un momento antes de volver a renombrarla.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({ content: `No se pudo renombrar la sala: ${errObj?.message || "error"}`, ephemeral: true });
      }
    }
    return;
  }

  if (modalType === "limit") {
    const val = parseInt(interaction.fields.getTextInputValue("limit").trim(), 10);
    if (isNaN(val) || val < 0 || val > 99) {
      await interaction.reply({ content: "El límite debe ser un número entero entre 0 y 99 (0 para ilimitado).", ephemeral: true });
      return;
    }
    try {
      await channel.setUserLimit(val);
      await interaction.reply({ content: `🔢 Límite establecido en **${val === 0 ? "sin límite" : `${val} usuarios`}**.`, ephemeral: true });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      await interaction.reply({ content: `No se pudo cambiar el límite: ${errObj?.message || "error"}`, ephemeral: true });
    }
    return;
  }
}

export async function handleVoiceSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;

  if (interaction.customId.startsWith("vm:staff_target:")) {
    const action = interaction.customId.split(":")[2];
    const targetChannelId = interaction.values[0];
    const targetChannel = interaction.guild.channels.cache.get(targetChannelId) as VoiceBasedChannel | null;
    if (!targetChannel || !targetChannel.isVoiceBased()) {
      await interaction.update({ content: "La sala seleccionada ya no existe.", components: [] });
      return;
    }
    await executeStaffVoiceAction(interaction, targetChannel, action);
    return;
  }

  const parts = interaction.customId.split(":");
  const selectType = parts[1]; // "bitrate", "unreject", "kick", "transfer"
  const targetChId = parts[3] || (parts[2] !== "select" && parts[2] !== "pick" ? parts[2] : undefined);

  let channel: VoiceBasedChannel | null = null;
  if (targetChId) {
    channel = interaction.guild.channels.cache.get(targetChId) as VoiceBasedChannel | null;
  }
  if (!channel) {
    channel = await currentTemp(interaction.member);
  }

  if (!channel || !canControlRoom(interaction.member, channel.id)) {
    await interaction.reply({ content: "No tienes permisos para administrar esta sala de voz.", ephemeral: true });
    return;
  }

  if (selectType === "bitrate") {
    const bitrate = parseInt(interaction.values[0], 10);
    try {
      await channel.setBitrate(bitrate);
      await interaction.update({ content: `📶 Calidad de audio ajustada a **${Math.round(bitrate / 1000)} kbps**.`, components: [] });
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      await interaction.update({ content: `No se pudo cambiar la calidad: ${errObj?.message || "error"}`, components: [] });
    }
    return;
  }

  if (selectType === "unreject") {
    const targetId = interaction.values[0];
    await channel.permissionOverwrites.delete(targetId).catch(async () => {
      await channel.permissionOverwrites.edit(targetId, { Connect: null, ViewChannel: null }).catch(() => null);
    });
    await interaction.update({
      content: `🤝 <@${targetId}> ha sido desbloqueado de la sala temporal y ya puede volver a entrar.`,
      components: [],
    });
    return;
  }

  const targetId = interaction.values[0];
  const action = selectType.includes("kick") ? "kick" : "transfer";

  if (action === "kick") {
    const targetMember = channel.guild.members.cache.get(targetId) ?? (await channel.guild.members.fetch(targetId).catch(() => null));
    if (targetMember && hasVoiceStaffBypass(targetMember) && !hasVoiceStaffBypass(interaction.member)) {
      await interaction.update({ content: "🛡️ No puedes expulsar a un miembro del equipo de Moderación u Owner de la sala.", components: [] });
      return;
    }
    if (targetMember) await targetMember.voice.disconnect("Expulsado de la sala temporal").catch(() => null);
    await channel.permissionOverwrites.edit(targetId, { Connect: false }).catch(() => null);
    await interaction.update({ content: `👢 <@${targetId}> ha sido expulsado de la sala temporal.`, components: [] });
  } else {
    getDb().prepare("UPDATE temp_voices SET owner_id = ? WHERE channel_id = ?").run(targetId, channel.id);
    await channel.permissionOverwrites.edit(targetId, {
      Connect: true,
      Speak: true,
      ViewChannel: true,
    });
    await channel.permissionOverwrites.edit(interaction.user.id, {
      Connect: null,
      Speak: null,
      ViewChannel: null,
    }).catch(() => null);
    await interaction.update({ content: `👑 Sala transferida exitosamente a <@${targetId}>.`, components: [] });
  }
}

export async function handleVoiceUserSelect(interaction: UserSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const parts = interaction.customId.split(":");
  const selectType = parts[1]; // "permit", "reject"
  const targetChId = parts[3];

  let channel: VoiceBasedChannel | null = null;
  if (targetChId) {
    channel = interaction.guild.channels.cache.get(targetChId) as VoiceBasedChannel | null;
  }
  if (!channel) {
    channel = await currentTemp(interaction.member);
  }

  if (!channel || !canControlRoom(interaction.member, channel.id)) {
    await interaction.reply({ content: "No tienes permisos para administrar esta sala de voz.", ephemeral: true });
    return;
  }
  const targetId = interaction.values[0];

  if (selectType === "permit") {
    await channel.permissionOverwrites.edit(targetId, {
      Connect: true,
      ViewChannel: true,
    }).catch(() => null);
    await interaction.update({
      content: `✅ <@${targetId}> ahora tiene acceso autorizado a la sala aunque esté bloqueada u oculta.`,
      components: [],
    });
    return;
  }

  if (selectType === "reject") {
    if (targetId === interaction.user.id) {
      await interaction.update({ content: "No puedes bloquearte a ti mismo de la sala.", components: [] });
      return;
    }
    const targetMember = channel.guild.members.cache.get(targetId) ?? (await channel.guild.members.fetch(targetId).catch(() => null));
    if (targetMember && hasVoiceStaffBypass(targetMember)) {
      await interaction.update({ content: "🛡️ No puedes bloquear ni expulsar a miembros del equipo de Moderación u Owner.", components: [] });
      return;
    }
    await channel.permissionOverwrites.edit(targetId, {
      Connect: false,
    }).catch(() => null);
    if (targetMember) {
      await targetMember.voice.disconnect("Bloqueado de la sala temporal").catch(() => null);
    }
    await interaction.update({
      content: `🚫 <@${targetId}> ha sido vetado de la sala temporal y no podrá ingresar.`,
      components: [],
    });
    return;
  }
}

export async function cleanupTempVoicePermissions(client: NexoClient): Promise<void> {
  try {
    const temps = getDb().prepare("SELECT channel_id, guild_id, owner_id FROM temp_voices").all() as {
      channel_id: string;
      guild_id: string;
      owner_id: string;
    }[];

    let cleaned = 0;
    for (const t of temps) {
      try {
        const guild = client.guilds.cache.get(t.guild_id) ?? (await client.guilds.fetch(t.guild_id).catch(() => null));
        if (!guild) continue;
        const ch = guild.channels.cache.get(t.channel_id) ?? (await guild.channels.fetch(t.channel_id).catch(() => null));
        if (!ch || !ch.isVoiceBased()) continue;

        for (const [id, overwrite] of ch.permissionOverwrites.cache) {
          if (id === NEXO_OWNER_ROLE_ID || id === NEXO_STAFF_ROLE_ID) continue;
          if (
            overwrite.allow.has(PermissionFlagsBits.MuteMembers) ||
            overwrite.allow.has(PermissionFlagsBits.DeafenMembers) ||
            overwrite.allow.has(PermissionFlagsBits.MoveMembers) ||
            overwrite.allow.has(PermissionFlagsBits.ManageChannels)
          ) {
            await ch.permissionOverwrites.edit(id, {
              MuteMembers: null,
              DeafenMembers: null,
              MoveMembers: null,
              ManageChannels: null,
            }).catch(() => null);
            cleaned++;
          }
        }
      } catch {
        // ignore
      }
    }
    if (cleaned > 0) {
      logger.info(`Limpiados permisos de moderación en ${cleaned} sobrescrituras de canales de voz temporales.`);
    }
  } catch (e) {
    logger.warn("Error al limpiar permisos de salas temporales:", e);
  }
}
