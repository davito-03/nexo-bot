import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { baseEmbed, errorEmbed, successEmbed, onlyGuild, ephemeral } from "../../utils/embeds.js";
import { COLORS, RPG_CLASSES } from "../../constants.js";
import {
  getOrCreatePlayer,
  switchClass,
  xpForLevel,
  executeRpgBattle,
  getRandomMonster,
  getDungeonBoss,
  createRpgClan,
  getRpgClanByName,
  getUserRpgClan,
  getRpgClanApplicationForUser,
  getRpgClanApplications,
  createRpgClanApplication,
  approveRpgClanApplication,
  rejectRpgClanApplication,
  setRpgClanMemberRole,
  removeRpgClanMember,
  getRpgClanMembers,
  getRpgTopClans,
  getRpgTopPlayers,
  saveRpgPlayer,
  deleteRpgClan,
  transferRpgClanLeadership,
  RPG_COOLDOWNS,
} from "../../modules/rpg/engine.js";
import { getEco, addWallet, n, saveEco, cdCheck } from "../../modules/economy/engine.js";
import type { Command } from "../../types/index.js";

function hpBar(current: number, max: number, length = 10): string {
  const pct = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(pct * length);
  return "🟩".repeat(filled) + "⬛".repeat(length - filled);
}

function xpBar(current: number, max: number, length = 10): string {
  const pct = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(pct * length);
  return "🟪".repeat(filled) + "⬛".repeat(length - filled);
}

function clanRoleLabel(role: string): string {
  if (role === "leader") return "👑 Líder";
  if (role === "officer") return "🛡️ Oficial";
  return "⚔️ Miembro";
}

function canManageClanMembers(memberRole: string): boolean {
  return memberRole === "leader" || memberRole === "officer";
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("rpg")
    .setDescription("Sistema RPG de batallas, clases, mazmorras y clanes de Nexo")
    .addSubcommand((s) =>
      s
        .setName("perfil")
        .setDescription("Ver tu ficha de aventurero o la de otro usuario")
        .addUserOption((o) => o.setName("usuario").setDescription("Usuario a consultar")),
    )
    .addSubcommand((s) =>
      s
        .setName("clase")
        .setDescription("Seleccionar o cambiar tu clase de aventurero")
        .addStringOption((o) =>
          o
            .setName("tipo")
            .setDescription("Clase elegida")
            .setRequired(true)
            .addChoices(
              { name: "⚔️ Guerrero (+Vida y armadura pesada)", value: "guerrero" },
              { name: "🔮 Mago (+30% Daño de ataque mágico)", value: "mago" },
              { name: "🗡️ Pícaro (+25% Golpe Crítico)", value: "picaro" },
              { name: "🛡️ Paladín (Regenera vida por turno)", value: "paladin" },
              { name: "🏹 Cazador (Perfora defensas)", value: "cazador" },
            ),
        ),
    )
    .addSubcommand((s) => s.setName("batalla").setDescription("Explorar y combatir contra monstruos salvajes"))
    .addSubcommand((s) => s.setName("dungeon").setDescription("Desafiar la mazmorra y enfrentar al jefe del piso actual"))
    .addSubcommand((s) => s.setName("curar").setDescription("Recuperar tu salud completa (1 poción o 60 nexocoins)"))
    .addSubcommand((s) => s.setName("top").setDescription("Ranking de los héroes de mayor nivel en Nexo"))
    .addSubcommandGroup((g) =>
      g
        .setName("clan")
        .setDescription("Gestión y ranking de clanes RPG")
        .addSubcommand((s) =>
          s
            .setName("crear")
            .setDescription("Crear un nuevo clan RPG (Cuesta 1.000 nexocoins)")
            .addStringOption((o) => o.setName("nombre").setDescription("Nombre del clan").setRequired(true).setMaxLength(30))
            .addStringOption((o) => o.setName("tag").setDescription("Etiqueta corta (ej: [NEXO])").setRequired(true).setMaxLength(6))
            .addStringOption((o) => o.setName("descripcion").setDescription("Lema o descripción").setMaxLength(120)),
        )
        .addSubcommand((s) =>
          s
            .setName("unirse")
            .setDescription("Solicitar unirte a un clan existente")
            .addStringOption((o) => o.setName("nombre").setDescription("Nombre o Tag del clan").setRequired(true)),
        )
        .addSubcommand((s) => s.setName("solicitudes").setDescription("Líder: ver solicitudes pendientes de ingreso"))
        .addSubcommand((s) =>
          s
            .setName("aprobar")
            .setDescription("Líder: aprobar la entrada de un usuario")
            .addUserOption((o) => o.setName("usuario").setDescription("Usuario que solicita entrar").setRequired(true)),
        )
        .addSubcommand((s) =>
          s
            .setName("rechazar")
            .setDescription("Líder: rechazar una solicitud de ingreso")
            .addUserOption((o) => o.setName("usuario").setDescription("Usuario que solicita entrar").setRequired(true)),
        )
        .addSubcommand((s) =>
          s
            .setName("rango")
            .setDescription("Líder: otorgar o retirar el rango de oficial")
            .addUserOption((o) => o.setName("usuario").setDescription("Miembro del clan").setRequired(true))
            .addStringOption((o) =>
              o
                .setName("nivel")
                .setDescription("Rango que tendrá dentro del clan")
                .setRequired(true)
                .addChoices(
                  { name: "🛡️ Oficial", value: "officer" },
                  { name: "⚔️ Miembro", value: "member" },
                ),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("expulsar")
            .setDescription("Líder u oficial: expulsar a un miembro")
            .addUserOption((o) => o.setName("usuario").setDescription("Miembro que será expulsado").setRequired(true)),
        )
        .addSubcommand((s) =>
          s
            .setName("info")
            .setDescription("Ver detalles de un clan")
            .addStringOption((o) => o.setName("nombre").setDescription("Nombre del clan (vacío = tu clan)")),
        )
        .addSubcommand((s) => s.setName("salir").setDescription("Abandonar tu clan actual"))
        .addSubcommand((s) =>
          s
            .setName("disolver")
            .setDescription("Líder: Disolver tu clan RPG definitivamente")
            .addBooleanOption((o) =>
              o.setName("confirmar").setDescription("¿Confirmas la disolución irreversible del clan?").setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName("transferir")
            .setDescription("Líder: Traspasar el liderazgo del clan a otro miembro")
            .addUserOption((o) =>
              o.setName("usuario").setDescription("Miembro que será el nuevo líder").setRequired(true),
            ),
        )
        .addSubcommand((s) => s.setName("top").setDescription("Clasificación de clanes más poderosos")),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const gid = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    // ── CLANES ──
    if (group === "clan") {
      if (sub === "crear") {
        const name = interaction.options.getString("nombre", true).trim();
        const tag = interaction.options.getString("tag", true).trim().toUpperCase();
        const desc = interaction.options.getString("descripcion")?.trim() ?? "Clan de aventureros de Nexo";

        const existingUserClan = getUserRpgClan(gid, interaction.user.id);
        if (existingUserClan) {
          await interaction.reply(ephemeral([errorEmbed("Ya estás en un clan", `Ya formas parte de **${existingUserClan.clan.name}**. Sal primero con \`/rpg clan salir\`.`)]));
          return;
        }


        const nameTaken = getRpgClanByName(gid, name);
        if (nameTaken) {
          await interaction.reply(ephemeral([errorEmbed("Nombre ocupado", "Ya existe un clan con ese nombre o etiqueta.")]));
          return;
        }

        const eco = getEco(gid, interaction.user.id);
        const clanCost = 1000;
        if (eco.wallet < clanCost) {
          await interaction.reply(
            ephemeral([errorEmbed("Fondos insuficientes", `Crear un clan cuesta ${n(clanCost)}. Tienes ${n(eco.wallet)} en cartera.`)]),
          );
          return;
        }

        addWallet(eco, -clanCost, { stats: false });
        saveEco(eco);

        const newClan = createRpgClan(gid, name, tag, desc, interaction.user.id);

        await interaction.reply({
          embeds: [
            successEmbed(
              "¡Clan Creado con Éxito! 🛡️",
                `Has fundado el clan **[${newClan.tag}] ${newClan.name}**.\n` +
                `Líder: ${interaction.user}\n` +
                `Coste: ${n(clanCost)}\n\n` +
                `*Los miembros pueden solicitar entrar con \`/rpg clan unirse ${newClan.name}\`; tú decides quién es aceptado.*`,
            ),
          ],
        });
        return;
      }

      if (sub === "unirse") {
        const query = interaction.options.getString("nombre", true).trim();
        const clan = getRpgClanByName(gid, query);
        if (!clan) {
          await interaction.reply(ephemeral([errorEmbed("Clan no encontrado", `No existe ningún clan llamado o con tag **${query}**.`)]));
          return;
        }

        const userClan = getUserRpgClan(gid, interaction.user.id);
        if (userClan) {
          await interaction.reply(ephemeral([errorEmbed("Ya en clan", `Ya perteneces a **${userClan.clan.name}**. Debes salir antes con \`/rpg clan salir\`.`)]));
          return;
        }

        const pending = getRpgClanApplicationForUser(gid, interaction.user.id);
        if (pending) {
          const sameClan = pending.clan_id === clan.id;
          await interaction.reply(
            ephemeral([
              errorEmbed(
                "Solicitud pendiente",
                sameClan
                  ? `El líder de **[${clan.tag}] ${clan.name}** todavía debe aprobar tu entrada.`
                  : `Ya tienes una solicitud pendiente para **[${pending.clan_tag}] ${pending.clan_name}**.`,
              ),
            ]),
          );
          return;
        }

        createRpgClanApplication(gid, clan.id, interaction.user.id);
        const leader = await interaction.client.users.fetch(clan.leader_id).catch(() => null);
        await leader?.send(
          `📜 ${interaction.user} ha solicitado entrar en tu clan **[${clan.tag}] ${clan.name}**.\n` +
            `Revisa las solicitudes con \`/rpg clan solicitudes\` y decide con \`/rpg clan aprobar usuario:${interaction.user.username}\` o \`/rpg clan rechazar usuario:${interaction.user.username}\`.`,
        ).catch(() => null);
        await interaction.reply({
          embeds: [
            successEmbed(
              "Solicitud enviada 📜",
              `Has solicitado entrar en **[${clan.tag}] ${clan.name}**.\n` +
                `El líder debe aprobar tu entrada con \`/rpg clan solicitudes\` y \`/rpg clan aprobar usuario:${interaction.user.username}\`.`,
            ),
          ],
        });
        return;
      }

      if (sub === "solicitudes") {
        const userClan = getUserRpgClan(gid, interaction.user.id);
        if (!userClan || userClan.clan.leader_id !== interaction.user.id) {
          await interaction.reply(ephemeral([errorEmbed("Permiso denegado", "Solo el líder puede revisar las solicitudes de ingreso.")]));
          return;
        }
        const applications = getRpgClanApplications(gid, userClan.clan.id);
        if (!applications.length) {
          await interaction.reply({ embeds: [successEmbed("Solicitudes", "No hay solicitudes pendientes de ingreso.")], ephemeral: true });
          return;
        }
        const lines = await Promise.all(
          applications.slice(0, 20).map(async (application, index) => {
            const user = await interaction.client.users.fetch(application.user_id).catch(() => null);
            const label = user ? `${user} · ${user.tag}` : `<@${application.user_id}>`;
            return `**${index + 1}.** ${label} · solicitó <t:${Math.floor(application.requested_at / 1000)}:R>`;
          }),
        );
        await interaction.reply({
          embeds: [
            baseEmbed(COLORS.primary)
              .setTitle(`📜 Solicitudes · [${userClan.clan.tag}] ${userClan.clan.name}`)
              .setDescription(
                `${lines.join("\n")}\n\n` +
                  `Aprueba con \`/rpg clan aprobar usuario:@usuario\` o rechaza con \`/rpg clan rechazar usuario:@usuario\`.`,
              ),
          ],
          ephemeral: true,
        });
        return;
      }

      if (sub === "aprobar" || sub === "rechazar") {
        const userClan = getUserRpgClan(gid, interaction.user.id);
        if (!userClan || userClan.clan.leader_id !== interaction.user.id) {
          await interaction.reply(ephemeral([errorEmbed("Permiso denegado", "Solo el líder puede aprobar o rechazar solicitudes.")]));
          return;
        }
        const target = interaction.options.getUser("usuario", true);
        const result = sub === "aprobar"
          ? approveRpgClanApplication(gid, userClan.clan.id, target.id, interaction.user.id)
          : rejectRpgClanApplication(gid, userClan.clan.id, target.id, interaction.user.id);
        if (result === "missing") {
          await interaction.reply(ephemeral([errorEmbed("Solicitud no encontrada", `${target} no tiene una solicitud pendiente para tu clan.`)]));
          return;
        }
        if (result === "already_member") {
          await interaction.reply(ephemeral([errorEmbed("Ya tiene clan", `${target} ya pertenece a un clan. La solicitud se ha eliminado.`)]));
          return;
        }
        await interaction.reply({
          embeds: [
            successEmbed(
              sub === "aprobar" ? "Solicitud aprobada ✅" : "Solicitud rechazada ❌",
              sub === "aprobar"
                ? `${target} ya forma parte de **[${userClan.clan.tag}] ${userClan.clan.name}** como miembro.`
                : `La solicitud de ${target} ha sido rechazada.`,
            ),
          ],
        });
        return;
      }

      if (sub === "rango") {
        const userClan = getUserRpgClan(gid, interaction.user.id);
        if (!userClan || userClan.clan.leader_id !== interaction.user.id) {
          await interaction.reply(ephemeral([errorEmbed("Permiso denegado", "Solo el líder puede gestionar los rangos del clan.")]));
          return;
        }
        const target = interaction.options.getUser("usuario", true);
        const role = interaction.options.getString("nivel", true) as "officer" | "member";
        if (target.id === interaction.user.id) {
          await interaction.reply(ephemeral([errorEmbed("Operación inválida", "El líder no puede cambiarse su propio rango.")]));
          return;
        }
        const changed = setRpgClanMemberRole(gid, userClan.clan.id, target.id, role);
        if (!changed) {
          await interaction.reply(ephemeral([errorEmbed("No es miembro", `${target} no pertenece a tu clan o es el líder.`)]));
          return;
        }
        await interaction.reply({
          embeds: [successEmbed("Rango actualizado", `${target} ahora tiene el rango **${clanRoleLabel(role)}** en **${userClan.clan.name}**.`)],
        });
        return;
      }

      if (sub === "expulsar") {
        const userClan = getUserRpgClan(gid, interaction.user.id);
        if (!userClan || !canManageClanMembers(userClan.memberRole)) {
          await interaction.reply(ephemeral([errorEmbed("Permiso denegado", "Solo el líder u oficial puede expulsar miembros.")]));
          return;
        }
        const target = interaction.options.getUser("usuario", true);
        const targetClan = getUserRpgClan(gid, target.id);
        if (!targetClan || targetClan.clan.id !== userClan.clan.id) {
          await interaction.reply(ephemeral([errorEmbed("No es miembro", `${target} no pertenece a tu clan.`)]));
          return;
        }
        if (target.id === userClan.clan.leader_id) {
          await interaction.reply(ephemeral([errorEmbed("Operación inválida", "El líder no puede ser expulsado. Debe transferir el liderazgo o disolver el clan.")]));
          return;
        }
        if (userClan.memberRole === "officer" && targetClan.memberRole === "officer") {
          await interaction.reply(ephemeral([errorEmbed("Permiso insuficiente", "Un oficial no puede expulsar a otro oficial.")]));
          return;
        }
        removeRpgClanMember(gid, target.id);
        await interaction.reply({
          embeds: [successEmbed("Miembro expulsado", `${target} ha sido expulsado de **[${userClan.clan.tag}] ${userClan.clan.name}**.`)],
        });
        return;
      }

      if (sub === "salir") {
        const userClan = getUserRpgClan(gid, interaction.user.id);
        if (!userClan) {
          await interaction.reply(ephemeral([errorEmbed("Sin clan", "No perteneces a ningún clan actualmente.")]));
          return;
        }

        if (userClan.clan.leader_id === interaction.user.id) {
          await interaction.reply(
            ephemeral([errorEmbed("Eres el líder", "El líder no puede abandonar el clan sin antes traspasarlo o disolverlo.")]),
          );
          return;
        }

        removeRpgClanMember(gid, interaction.user.id);
        await interaction.reply({
          embeds: [successEmbed("Clan abandonado", `Has salido de **${userClan.clan.name}**.`)],
        });
        return;
      }

      if (sub === "disolver") {
        const userClan = getUserRpgClan(gid, interaction.user.id);
        if (!userClan) {
          await interaction.reply(ephemeral([errorEmbed("Sin clan", "No perteneces a ningún clan actualmente.")]));
          return;
        }

        if (userClan.clan.leader_id !== interaction.user.id) {
          await interaction.reply(
            ephemeral([errorEmbed("Permiso denegado", "Solo el líder del clan puede disolverlo.")]),
          );
          return;
        }

        const confirm = interaction.options.getBoolean("confirmar", true);
        if (!confirm) {
          await interaction.reply(
            ephemeral([errorEmbed("Operación cancelada", "Debes seleccionar `confirmar: Verdadero` para proceder a disolver el clan.")]),
          );
          return;
        }

        const clanName = userClan.clan.name;
        const clanTag = userClan.clan.tag;
        deleteRpgClan(gid, userClan.clan.id);

        await interaction.reply({
          embeds: [
            successEmbed(
              "Clan Disuelto 💥",
              `El clan **[${clanTag}] ${clanName}** ha sido disuelto permanentemente.\nTodos sus miembros han sido liberados y el registro del clan ha sido eliminado.`,
            ),
          ],
        });
        return;
      }

      if (sub === "transferir") {
        const userClan = getUserRpgClan(gid, interaction.user.id);
        if (!userClan) {
          await interaction.reply(ephemeral([errorEmbed("Sin clan", "No perteneces a ningún clan actualmente.")]));
          return;
        }

        if (userClan.clan.leader_id !== interaction.user.id) {
          await interaction.reply(
            ephemeral([errorEmbed("Permiso denegado", "Solo el líder del clan puede traspasar el liderazgo.")]),
          );
          return;
        }

        const targetUser = interaction.options.getUser("usuario", true);
        if (targetUser.id === interaction.user.id) {
          await interaction.reply(
            ephemeral([errorEmbed("Operación inválida", "Ya eres el líder del clan. Elige a otro miembro.")]),
          );
          return;
        }

        if (targetUser.bot) {
          await interaction.reply(
            ephemeral([errorEmbed("Objetivo inválido", "No puedes transferir el liderazgo a un bot.")]),
          );
          return;
        }

        const targetClan = getUserRpgClan(gid, targetUser.id);
        if (!targetClan || targetClan.clan.id !== userClan.clan.id) {
          await interaction.reply(
            ephemeral([errorEmbed("No es miembro", `${targetUser} no es miembro de tu clan **${userClan.clan.name}**.`)]),
          );
          return;
        }

        const transferred = transferRpgClanLeadership(gid, userClan.clan.id, interaction.user.id, targetUser.id);
        if (!transferred) {
          await interaction.reply(ephemeral([errorEmbed("No se pudo transferir", "El usuario ya no pertenece al clan o el liderazgo cambió. Revisa la información e inténtalo de nuevo.")]));
          return;
        }

        await interaction.reply({
          embeds: [
            successEmbed(
              "Liderazgo Transferido 👑",
              `Has traspasado el mando y liderazgo de **[${userClan.clan.tag}] ${userClan.clan.name}** a ${targetUser}.\n¡Un nuevo líder se alza al frente del clan!`,
            ),
          ],
        });
        return;
      }

      if (sub === "info") {
        const query = interaction.options.getString("nombre")?.trim();
        let targetClan: any;
        if (query) {
          targetClan = getRpgClanByName(gid, query);
        } else {
          const uClan = getUserRpgClan(gid, interaction.user.id);
          targetClan = uClan?.clan;
        }

        if (!targetClan) {
          await interaction.reply(
            ephemeral([errorEmbed("Clan no encontrado", query ? `No existe el clan "${query}".` : "No estás en ningún clan. Usa `/rpg clan top` o busca uno con `/rpg clan info <nombre>`." )]),
          );
          return;
        }


        const members = getRpgClanMembers(gid, targetClan.id);
        const memberTags = members
          .slice(0, 10)
          .map((m) => `<@${m.user_id}> (${clanRoleLabel(m.role)})`)
          .join("\n• ");

        const embed = baseEmbed(COLORS.primary)
          .setTitle(`🛡️ Clan: [${targetClan.tag}] ${targetClan.name}`)
          .setDescription(`*${targetClan.description || "Sin descripción"}*\n\n` +
            `👑 **Líder:** <@${targetClan.leader_id}>\n` +
            `⭐ **Nivel de Clan:** ${targetClan.level} (XP: ${targetClan.xp}/${targetClan.level * 500})\n` +
            `🏆 **Puntuación de Gloria:** ${targetClan.score.toLocaleString("es-ES")} pts\n` +
            `👥 **Miembros (${members.length}):**\n• ${memberTags}${members.length > 10 ? `\n*...y ${members.length - 10} miembros más*` : ""}`,
          )
          .setFooter({ text: "Los miembros aumentan la gloria y XP del clan ganando batallas y mazmorras" });

        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (sub === "top") {
        const top = getRpgTopClans(gid, 10);
        if (top.length === 0) {
          await interaction.reply({
            embeds: [baseEmbed(COLORS.primary).setTitle("🏆 Salón de Clanes").setDescription("Aún no se han fundado clanes en este servidor. ¡Sé el primero con `/rpg clan crear`!")],
          });
          return;
        }

        const lines = top.map((c, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**#${i + 1}**`;
          return `${medal} **[${c.tag}] ${c.name}** — Nivel ${c.level} · **${c.score.toLocaleString("es-ES")} pts** (${c.member_count} miembros)`;
        });

        const embed = baseEmbed(COLORS.primary)
          .setTitle("🏆 Salón de Clanes Más Poderosos")
          .setDescription(lines.join("\n\n"))
          .setFooter({ text: "Fundad vuestro clan con /rpg clan crear y alcanzad la cima" });

        await interaction.reply({ embeds: [embed] });
        return;
      }
    }

    // ── CAMBIO DE CLASE ──
    if (sub === "clase") {
      const classId = interaction.options.getString("tipo", true);
      const player = getOrCreatePlayer(gid, interaction.user.id);
      switchClass(player, classId);

      const classDef = RPG_CLASSES[classId]!;
      const embed = successEmbed(
        `¡Clase Actualizada! ${classDef.emoji}`,
        `Ahora eres un **${classDef.name}**.\n\n` +
          `✨ **Ventaja Especial:** ${classDef.perk}\n` +
          `❤️ **Vida Máxima:** ${player.max_hp} HP\n` +
          `⚔️ **Ataque:** ${player.attack} | 🛡️ **Defensa:** ${player.defense} | 💨 **Velocidad:** ${player.speed}\n\n` +
          `*Tus atributos se escalan automáticamente con tu nivel.*`,
      );
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── PERFIL RPG ──
    if (sub === "perfil") {
      const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
      const player = getOrCreatePlayer(gid, targetUser.id);
      const classDef = RPG_CLASSES[player.class] ?? RPG_CLASSES["guerrero"]!;
      const neededXp = xpForLevel(player.level);
      const clanData = getUserRpgClan(gid, targetUser.id);
      const clanTag = clanData ? ` · [${clanData.clan.tag}] ${clanData.clan.name}` : "";

      const battleCd = cdCheck(player.last_battle_at, RPG_COOLDOWNS.battle);
      const dungeonCd = cdCheck(player.last_dungeon_at, RPG_COOLDOWNS.dungeon);
      const battleStatus = battleCd ? `⏳ ${battleCd}` : "🟢 Lista";
      const dungeonStatus = dungeonCd ? `⏳ ${dungeonCd}` : "🟢 Lista";

      const embed = baseEmbed(COLORS.level)
        .setAuthor({ name: `Aventurero: ${targetUser.username}${clanTag}`, iconURL: targetUser.displayAvatarURL({ size: 128 }) })
        .setTitle(`${classDef.emoji} ${classDef.name} (Nivel ${player.level})`)
        .setDescription(
          `**Salud:** \`${hpBar(player.hp, player.max_hp)}\` **${player.hp}/${player.max_hp} HP**\n` +
            `**Progreso:** \`${xpBar(player.xp, neededXp)}\` **${player.xp}/${neededXp} XP**\n\n` +
            `⚔️ **Ataque:** \`${player.attack}\` · 🛡️ **Defensa:** \`${player.defense}\` · 💨 **Velocidad:** \`${player.speed}\`\n` +
            `🧪 **Pociones de vida:** \`${player.potions}\`\n\n` +
            `🌟 **Pasiva de Clase:** *${classDef.perk}*\n` +
            `🏰 **Mazmorra actual:** Piso **#${player.dungeon_floor}**\n` +
            `📊 **Récord:** **${player.wins} Victorias** / **${player.losses} Derrotas**\n\n` +
            `⏱️ **Disponibilidad:** Batalla: ${battleStatus} | Mazmorra: ${dungeonStatus}`,
        )
        .setFooter({ text: "Explora con /rpg batalla o desafía el calabozo con /rpg dungeon" });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("rpg:battle").setLabel("Explorar Batalla").setStyle(ButtonStyle.Primary).setEmoji("⚔️"),
        new ButtonBuilder().setCustomId("rpg:dungeon").setLabel("Entrar a Mazmorra").setStyle(ButtonStyle.Danger).setEmoji("🏰"),
        new ButtonBuilder().setCustomId("rpg:heal").setLabel("Curarse").setStyle(ButtonStyle.Success).setEmoji("🧪"),
      );

      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    // ── CURAR ──
    if (sub === "curar") {
      const player = getOrCreatePlayer(gid, interaction.user.id);
      if (player.hp >= player.max_hp) {
        await interaction.reply(ephemeral([errorEmbed("Salud al máximo", "Ya tienes tu vida completamente llena.")]));
        return;
      }

      if (player.potions > 0) {
        player.potions -= 1;
        player.hp = player.max_hp;
        saveRpgPlayer(player);
        await interaction.reply({
          embeds: [successEmbed("¡Te has curado! 🧪", `Has tomado una poción y restaurado tu vida a **${player.max_hp}/${player.max_hp} HP**.\nTe quedan **${player.potions}** pociones.`)],
        });
        return;
      }

      const healCost = 60;
      const eco = getEco(gid, interaction.user.id);
      if (eco.wallet < healCost) {
        await interaction.reply(
          ephemeral([errorEmbed("Sin pociones ni fondos", `No tienes pociones y necesitas ${n(healCost)} para pagar al médico del gremio.`)]),
        );
        return;
      }

      addWallet(eco, -healCost, { stats: false });
      saveEco(eco);
      player.hp = player.max_hp;
      saveRpgPlayer(player);

      await interaction.reply({
        embeds: [successEmbed("¡Tratamiento médico completado! 💉", `El médico de Nexo te ha restaurado al **${player.max_hp}/${player.max_hp} HP** por ${n(healCost)} en cartera.`)],
      });
      return;
    }

    // ── BATALLA MONSTRUOS ──
    if (sub === "batalla") {
      const player = getOrCreatePlayer(gid, interaction.user.id);
      const cd = cdCheck(player.last_battle_at, RPG_COOLDOWNS.battle);
      if (cd) {
        await interaction.reply(
          ephemeral([errorEmbed("En recuperación ⏳", `Tus músculos y energía aún se recuperan del combate salvaje anterior. ${cd}`)]),
        );
        return;
      }

      if (player.hp < player.max_hp * 0.15) {
        await interaction.reply(
          ephemeral([errorEmbed("Demasiado herido", `Tienes solo **${player.hp}/${player.max_hp} HP**. Cúrate con \`/rpg curar\` antes de volver al combate salvaje.`)]),
        );
        return;
      }

      const { monster, zone } = getRandomMonster(player.level);
      const res = executeRpgBattle(player, monster, false);

      const embed = baseEmbed(res.won ? COLORS.success : COLORS.danger)
        .setTitle(`${res.won ? "¡Victoria en Combate! ⚔️" : "Derrota en Combate 💀"} — ${zone}`)
        .setDescription(
          `Te has encontrado con **${monster.emoji} ${monster.name}** (${monster.maxHp} HP)\n\n` +
            res.rounds.slice(-5).join("\n") +
            `\n\n` +
            (res.won
              ? `🎉 **¡Monstruo abatido!**\n` +
                `⭐ **+${res.xpGained} XP** | 🪙 **+${res.coinsGained} Nexocoins** en tu cartera!\n` +
                (res.leveledUp ? `🆙 **¡HAS SUBIDO AL NIVEL ${res.newLevel}!** Vida y estadísticas incrementadas.\n` : "") +
                `❤️ Tu salud restante: **${res.playerHpLeft}/${player.max_hp} HP**`
              : `Has caído en combate. Consigues escapar con **${res.playerHpLeft}/${player.max_hp} HP**.\nUsa \`/rpg curar\` para recuperarte.`),
        )
        .setFooter({ text: res.potionUsed ? "Se usó una poción de emergencia en combate" : "Gana batallas para subir de nivel y enriquecerte" });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── MAZMORRA / DUNGEON ──
    if (sub === "dungeon") {
      const player = getOrCreatePlayer(gid, interaction.user.id);
      const cd = cdCheck(player.last_dungeon_at, RPG_COOLDOWNS.dungeon);
      if (cd) {
        await interaction.reply(
          ephemeral([errorEmbed("Mazmorra sellada ⏳", `El portal al siguiente piso de la mazmorra se está recargando. ${cd}`)]),
        );
        return;
      }

      if (player.hp < player.max_hp * 0.3) {
        await interaction.reply(
          ephemeral([errorEmbed("Vida insuficiente", `La mazmorra es letal. Necesitas al menos el 30% de vida (actual: **${player.hp}/${player.max_hp} HP**). Usa \`/rpg curar\`.`)]),
        );
        return;
      }

      const boss = getDungeonBoss(player.dungeon_floor);
      const res = executeRpgBattle(player, boss, true);

      const embed = baseEmbed(res.won ? 0xf1c40f : COLORS.danger)
        .setTitle(res.won ? `👑 ¡JEFE DERROTADO! (Piso ${player.dungeon_floor - 1})` : `💀 DERROTA EN LA MAZMORRA (Piso ${player.dungeon_floor})`)

        .setDescription(
          `Desafío contra el jefe de piso: **${boss.emoji} ${boss.name}** (${boss.maxHp} HP)\n\n` +
            res.rounds.slice(-6).join("\n") +
            `\n\n` +
            (res.won
              ? `🏆 **¡HAS CONQUISTADO EL PISO! Avanzas al Piso ${player.dungeon_floor}.**\n` +
                `⭐ **+${res.xpGained} XP** | 💰 **+${res.coinsGained} Nexocoins de botín del tesoro!**\n` +
                `🛡️ **+${res.clanScoreGained} Puntos de Gloria** para tu clan.\n` +
                (res.leveledUp ? `🆙 **¡HAS SUBIDO AL NIVEL ${res.newLevel}!**\n` : "") +
                `❤️ Salud restante: **${res.playerHpLeft}/${player.max_hp} HP**`
              : `El jefe te ha sobrepasado. Quedas con **${res.playerHpLeft}/${player.max_hp} HP**.\nCúrate y mejora tus estadísticas para volver a intentarlo.`),
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── TOP PLAYERS ──
    if (sub === "top") {
      const top = getRpgTopPlayers(gid, 10);
      if (top.length === 0) {
        await interaction.reply({
          embeds: [baseEmbed(COLORS.level).setTitle("🏆 Héroes de Nexo").setDescription("Aún no hay aventureros registrados. ¡Sé el primero con `/rpg clase`!")],
        });
        return;
      }

      const lines = top.map((p, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**#${i + 1}**`;
        const c = RPG_CLASSES[p.class] ?? RPG_CLASSES["guerrero"]!;
        return `${medal} <@${p.user_id}> — ${c.emoji} Nivel **${p.level}** (${p.xp} XP) · Mazmorra **#${p.dungeon_floor}** (${p.wins}W / ${p.losses}L)`;
      });

      const embed = baseEmbed(COLORS.level)
        .setTitle("🏆 Salón de Héroes de Nexo")
        .setDescription(lines.join("\n\n"))
        .setFooter({ text: "Sube de nivel combatiendo con /rpg batalla y /rpg dungeon" });

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};

export async function handleRpgButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const parts = interaction.customId.split(":");
  const action = parts[1];
  const gid = interaction.guild.id;

  if (action === "heal") {
    const player = getOrCreatePlayer(gid, interaction.user.id);
    if (player.hp >= player.max_hp) {
      await interaction.reply(ephemeral([errorEmbed("Salud llena", "Tu salud ya está al máximo.")]));
      return;
    }
    if (player.potions > 0) {
      player.potions -= 1;
      player.hp = player.max_hp;
      saveRpgPlayer(player);
      await interaction.reply(ephemeral([successEmbed("¡Curado! 🧪", `Has usado una poción. Salud restaurada a **${player.max_hp}/${player.max_hp} HP**.`)]));
      return;
    }
    const healCost = 60;
    const eco = getEco(gid, interaction.user.id);
    if (eco.wallet < healCost) {
      await interaction.reply(ephemeral([errorEmbed("Sin fondos", `Necesitas ${n(healCost)} para curarte sin pociones.`)]));
      return;
    }
    addWallet(eco, -healCost, { stats: false });
    saveEco(eco);
    player.hp = player.max_hp;
    saveRpgPlayer(player);
    await interaction.reply(ephemeral([successEmbed("¡Curado! 💉", `Has pagado ${n(healCost)} y restaurado tus ${player.max_hp} HP.`)]));
    return;
  }

  if (action === "battle") {
    const player = getOrCreatePlayer(gid, interaction.user.id);
    const cd = cdCheck(player.last_battle_at, RPG_COOLDOWNS.battle);
    if (cd) {
      await interaction.reply(ephemeral([errorEmbed("En recuperación ⏳", `Aún estás agotado del combate salvaje anterior. ${cd}`)]));
      return;
    }

    if (player.hp < player.max_hp * 0.15) {
      await interaction.reply(ephemeral([errorEmbed("Demasiado herido", `Tienes solo **${player.hp}/${player.max_hp} HP**. Cúrate primero.`)]));
      return;
    }
    const { monster, zone } = getRandomMonster(player.level);
    const res = executeRpgBattle(player, monster, false);

    const embed = baseEmbed(res.won ? COLORS.success : COLORS.danger)
      .setTitle(`${res.won ? "¡Victoria! ⚔️" : "Derrota 💀"} — ${zone}`)
      .setDescription(
        `Monstruo: **${monster.emoji} ${monster.name}**\n\n` +
          res.rounds.slice(-4).join("\n") +
          `\n\n` +
          (res.won
            ? `⭐ **+${res.xpGained} XP** | 🪙 **+${res.coinsGained} Nexocoins**\n❤️ Salud: **${res.playerHpLeft}/${player.max_hp} HP**`
            : `Has caído. Te queda **${res.playerHpLeft}/${player.max_hp} HP**.`),
      );
    await interaction.reply(ephemeral([embed]));
    return;
  }

  if (action === "dungeon") {
    const player = getOrCreatePlayer(gid, interaction.user.id);
    const cd = cdCheck(player.last_dungeon_at, RPG_COOLDOWNS.dungeon);
    if (cd) {
      await interaction.reply(ephemeral([errorEmbed("Mazmorra sellada ⏳", `La entrada a la mazmorra aún se está recargando. ${cd}`)]));
      return;
    }

    if (player.hp < player.max_hp * 0.3) {
      await interaction.reply(ephemeral([errorEmbed("Vida insuficiente", `Necesitas al menos 30% de HP.`)]));
      return;
    }
    const boss = getDungeonBoss(player.dungeon_floor);
    const res = executeRpgBattle(player, boss, true);
    const embed = baseEmbed(res.won ? 0xf1c40f : COLORS.danger)
      .setTitle(res.won ? `👑 ¡Piso ${player.dungeon_floor - 1} Conquistado!` : `💀 Derrota en Piso ${player.dungeon_floor}`)

      .setDescription(
        `Jefe: **${boss.emoji} ${boss.name}**\n\n` +
          res.rounds.slice(-5).join("\n") +
          `\n\n` +
          (res.won
            ? `🏆 **Avanzas al Piso ${player.dungeon_floor}!**\n⭐ **+${res.xpGained} XP** | 💰 **+${res.coinsGained} Nexocoins**`
            : `Has caído ante el jefe. Salud: **${res.playerHpLeft}/${player.max_hp} HP**`),
      );
    await interaction.reply(ephemeral([embed]));
    return;
  }
}

export default command;
