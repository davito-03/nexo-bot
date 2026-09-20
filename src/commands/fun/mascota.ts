import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import { baseEmbed, errorEmbed, onlyGuild } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import {
  PET_SPECIES,
  MAX_PETS_PER_USER,
  adoptPet,
  claimExpedition,
  expToNextLevel,
  feedPet,
  getUserPet,
  getUserPets,
  setActivePet,
  petPet,
  renamePet,
  releasePet,
  startExpedition,
  type UserPet,
} from "../../modules/pets/engine.js";
import { n } from "../../modules/economy/engine.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mascota")
    .setDescription("Sistema de mascotas virtuales: adopción múltiple, cuidados y expediciones")
    .addSubcommand((s) =>
      s
        .setName("perfil")
        .setDescription("Ver el estado, nivel y felicidad de tu mascota")
        .addUserOption((o) => o.setName("usuario").setDescription("Ver mascota de otro usuario"))
        .addStringOption((o) =>
          o.setName("mascota").setDescription("Mascota específica a consultar").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("lista")
        .setDescription("Ver todas las mascotas adoptadas en tu colección")
        .addUserOption((o) => o.setName("usuario").setDescription("Ver mascotas de otro usuario")),
    )
    .addSubcommand((s) =>
      s
        .setName("seleccionar")
        .setDescription("Selecciona cuál de tus mascotas será tu compañera activa")
        .addStringOption((o) =>
          o.setName("mascota").setDescription("Mascota que deseas activar").setRequired(true).setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("tienda")
        .setDescription("Ver el catálogo de especies de mascotas disponibles para adoptar"),
    )
    .addSubcommand((s) =>
      s
        .setName("adoptar")
        .setDescription("Adopta una mascota para que te acompañe en Nexo (puedes tener hasta 10)")
        .addStringOption((o) =>
          o
            .setName("especie")
            .setDescription("Especie de mascota")
            .setRequired(true)
            .addChoices(
              { name: "🐱 Gato Callejero (10.000 NexoCoins)", value: "gato" },
              { name: "🐶 Shiba Inu (25.000 NexoCoins)", value: "shiba" },
              { name: "🦊 Zorro Astuto (50.000 NexoCoins)", value: "zorro" },
              { name: "🦉 Búho Místico (100.000 NexoCoins)", value: "buho" },
              { name: "🐉 Dragón Bebé (500.000 NexoCoins)", value: "dragon" },
            ),
        )
        .addStringOption((o) =>
          o.setName("nombre").setDescription("Nombre para tu mascota").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("alimentar")
        .setDescription("Alimenta a tu mascota para subir su felicidad y EXP (200 nexocoins)")
        .addStringOption((o) =>
          o.setName("mascota").setDescription("Mascota a alimentar (por defecto la activa)").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("acariciar")
        .setDescription("Acaricia y juega con tu mascota gratis para darle cariño")
        .addStringOption((o) =>
          o.setName("mascota").setDescription("Mascota a mimar (por defecto la activa)").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("expedicion")
        .setDescription("Envía a tu mascota a explorar y conseguir tesoros")
        .addIntegerOption((o) =>
          o
            .setName("duracion")
            .setDescription("Duración de la expedición")
            .setRequired(true)
            .addChoices(
              { name: "1 hora · Paseo por los jardines", value: 1 },
              { name: "4 horas · Bosque misterioso", value: 4 },
              { name: "8 horas · Cavernas profundas", value: 8 },
              { name: "24 horas · Odisea a ruinas olvidadas", value: 24 },
            ),
        )
        .addStringOption((o) =>
          o.setName("mascota").setDescription("Mascota a enviar (por defecto la activa)").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("reclamar")
        .setDescription("Reclama el botín y experiencia de las expediciones finalizadas")
        .addStringOption((o) =>
          o
            .setName("mascota")
            .setDescription("Mascota específica o déjalo vacío para reclamar todas las listas")
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("renombrar")
        .setDescription("Cambia el nombre de tu mascota")
        .addStringOption((o) => o.setName("nombre").setDescription("Nuevo nombre").setRequired(true))
        .addStringOption((o) =>
          o.setName("mascota").setDescription("Mascota a renombrar (por defecto la activa)").setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("liberar")
        .setDescription("Libera a una de tus mascotas a la naturaleza para hacer espacio en tu colección")
        .addStringOption((o) =>
          o.setName("mascota").setDescription("Mascota que deseas liberar").setRequired(true).setAutocomplete(true),
        ),
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    if (!interaction.inCachedGuild()) return;
    const focused = interaction.options.getFocused().toLowerCase();
    const pets = getUserPets(interaction.guild.id, interaction.user.id);

    const matches = pets.filter((p) => {
      const species = PET_SPECIES[p.pet_type]?.name ?? p.pet_type;
      return (
        p.name.toLowerCase().includes(focused) ||
        species.toLowerCase().includes(focused) ||
        p.pet_type.toLowerCase().includes(focused)
      );
    });

    const choices = matches.slice(0, 25).map((p) => {
      const emoji = PET_SPECIES[p.pet_type]?.emoji ?? "🐾";
      const activeMark = p.is_active === 1 ? "⭐ " : "";
      return {
        name: `${activeMark}${emoji} ${p.name} (Nv. ${p.level})`,
        value: String(p.id),
      };
    });

    await interaction.respond(choices).catch(() => null);
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === "tienda") {
      const userPets = getUserPets(gid, interaction.user.id);
      const embed = baseEmbed(COLORS.primary)
        .setTitle("🐾 Centro de Adopción de Mascotas de Nexo")
        .setDescription(
          `¡Adopta compañeros fieles para tu aventura! Puedes poseer **hasta ${MAX_PETS_PER_USER} mascotas simultáneamente**.\n` +
            `Tienes **${userPets.length}/${MAX_PETS_PER_USER}** mascotas en tu colección.\n\n` +
            Object.values(PET_SPECIES)
              .map(
                (s) =>
                  `### ${s.emoji} ${s.name} · ${n(s.price)}\n` +
                  `> *${s.description}*\n` +
                  `> 🌟 **Habilidad pasiva:** ${s.bonus}\n`,
              )
              .join("\n") +
            "\nUsa `/mascota adoptar [especie] [nombre]` para adoptar una nueva mascota.",
        );
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "lista") {
      const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
      const pets = getUserPets(gid, targetUser.id);
      const isSelf = targetUser.id === interaction.user.id;

      if (!pets.length) {
        await interaction.reply({
          embeds: [
            baseEmbed(COLORS.warn).setDescription(
              isSelf
                ? "No tienes ninguna mascota todavía. ¡Revisa el catálogo en `/mascota tienda` y adopta una!"
                : `**${targetUser.username}** no tiene ninguna mascota adoptada.`,
            ),
          ],
          ephemeral: isSelf,
        });
        return;
      }

      const now = Date.now();
      const lines = pets.map((p, idx) => {
        const species = PET_SPECIES[p.pet_type] ?? { emoji: "🐾", name: p.pet_type };
        const activeMark = p.is_active === 1 ? "⭐ **(Compañera Activa)**" : "";
        let status = "🏡 En casa";
        if (p.on_expedition_until > now) {
          status = `🎒 Explorando (<t:${Math.floor(p.on_expedition_until / 1000)}:R>)`;
        } else if (p.on_expedition_until > 0) {
          status = "🎁 **¡Expedición lista para reclamar!**";
        }

        const hearts = Math.round(p.happiness / 20);
        const heartStr = "❤️".repeat(hearts) + "🤍".repeat(5 - hearts);

        return `**${idx + 1}.** ${species.emoji} **${p.name}** ${activeMark}\n` +
               `└ Especie: *${species.name}* · Nivel: **${p.level}** (\`${p.exp}/${expToNextLevel(p.level)} XP\`)\n` +
               `└ Felicidad: ${p.happiness}% [${heartStr}] · Estado: ${status}`;
      });

      const embed = baseEmbed(COLORS.primary)
        .setTitle(`🐾 Colección de Mascotas de ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setDescription(
          `Posee **${pets.length} / ${MAX_PETS_PER_USER}** mascotas en este servidor.\n\n` +
          lines.join("\n\n") +
          (isSelf && pets.length > 1 ? "\n\n💡 *Puedes cambiar tu mascota activa con `/mascota seleccionar <mascota>`.*" : "")
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "seleccionar") {
      const petId = interaction.options.getString("mascota", true);
      const res = setActivePet(gid, interaction.user.id, petId);

      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("Seleccionar mascota", res.message)], ephemeral: true });
        return;
      }

      await interaction.reply({
        embeds: [baseEmbed(COLORS.success).setTitle("⭐ Compañera Activa").setDescription(res.message)],
      });
      return;
    }

    if (sub === "perfil") {
      const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
      const petArg = interaction.options.getString("mascota");
      const pet = getUserPet(gid, targetUser.id, petArg ?? undefined);
      const allPets = getUserPets(gid, targetUser.id);

      if (!pet) {
        const isSelf = targetUser.id === interaction.user.id;
        await interaction.reply({
          embeds: [
            baseEmbed(COLORS.warn).setDescription(
              isSelf
                ? "No tienes ninguna mascota todavía. ¡Revisa el catálogo en `/mascota tienda` y adopta una!"
                : `**${targetUser.username}** no tiene ninguna mascota adoptada.`,
            ),
          ],
          ephemeral: isSelf,
        });
        return;
      }

      const species = PET_SPECIES[pet.pet_type] ?? { emoji: "🐾", name: pet.pet_type, bonus: "Ninguno" };
      const neededExp = expToNextLevel(pet.level);
      const isExpedition = pet.on_expedition_until > Date.now();
      const isReadyToClaim = pet.on_expedition_until > 0 && pet.on_expedition_until <= Date.now();
      const status = isExpedition
        ? `🎒 En expedición (<t:${Math.floor(pet.on_expedition_until / 1000)}:R>)`
        : isReadyToClaim
        ? "🎁 **¡Expedición finalizada!** Reclámala con `/mascota reclamar`"
        : "🏡 Descansando en casa";

      const heartsCount = Math.round(pet.happiness / 20);
      const happyBar = "❤️".repeat(heartsCount) + "🤍".repeat(5 - heartsCount);

      const activeBadge = pet.is_active === 1 ? "⭐ *(Compañera Activa)*" : "";
      const otherPetsCount = allPets.length;

      const embed = baseEmbed(COLORS.primary)
        .setTitle(`${species.emoji} Mascota · ${pet.name} ${activeBadge}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setDescription(
          `**Dueño:** <@${pet.user_id}>\n` +
            `**Especie:** ${species.emoji} ${species.name}\n` +
            `**Estado:** ${status}\n\n` +
            `⭐ **Nivel:** ${pet.level} · Exp: ${pet.exp} / ${neededExp} XP\n` +
            `💖 **Felicidad:** ${pet.happiness}% [${happyBar}]\n` +
            `🌟 **Efecto Pasivo:** ${species.bonus}\n\n` +
            (otherPetsCount > 1
              ? `📁 *Posee **${otherPetsCount} mascotas** en total. Usa \`/mascota lista\` para verlas todas o \`/mascota seleccionar\` para cambiar de activa.*`
              : `*Alimenta y acaricia a tu mascota con regularidad para mantener su felicidad alta y maximizar su botín de expedición.*`),
        );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "adoptar") {
      const especie = interaction.options.getString("especie", true);
      const nombre = interaction.options.getString("nombre", true);
      const res = adoptPet(gid, interaction.user.id, especie, nombre);

      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("Adopción fallida", res.message)], ephemeral: true });
        return;
      }

      await interaction.reply({
        embeds: [
          baseEmbed(COLORS.success)
            .setTitle("🎉 ¡Nueva Mascota Adoptada!")
            .setDescription(
              `${res.message}\n\n` +
                `Prueba a mimarle con \`/mascota acariciar\`, alimentarle con \`/mascota alimentar\` o enviarle en su primera misión con \`/mascota expedicion\`!`,
            ),
        ],
      });
      return;
    }

    if (sub === "alimentar") {
      const petArg = interaction.options.getString("mascota");
      const res = feedPet(gid, interaction.user.id, petArg ?? undefined);
      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("Alimentación", res.message)], ephemeral: true });
        return;
      }

      await interaction.reply({
        embeds: [baseEmbed(COLORS.success).setTitle("🍖 Mascota Satisfecha").setDescription(res.message)],
      });
      return;
    }

    if (sub === "acariciar") {
      const petArg = interaction.options.getString("mascota");
      const res = petPet(gid, interaction.user.id, petArg ?? undefined);
      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("Mimos", res.message)], ephemeral: true });
        return;
      }

      await interaction.reply({
        embeds: [baseEmbed(COLORS.primary).setTitle("💖 Tiempo de Cariño").setDescription(res.message)],
      });
      return;
    }

    if (sub === "expedicion") {
      const duracion = interaction.options.getInteger("duracion", true);
      const petArg = interaction.options.getString("mascota");
      const res = startExpedition(gid, interaction.user.id, duracion, petArg ?? undefined);
      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("Expedición", res.message)], ephemeral: true });
        return;
      }

      await interaction.reply({
        embeds: [baseEmbed(COLORS.eco).setTitle("🗺️ ¡Partiendo de Expedición!").setDescription(res.message)],
      });
      return;
    }

    if (sub === "reclamar") {
      const petArg = interaction.options.getString("mascota");
      const res = claimExpedition(gid, interaction.user.id, petArg ?? undefined);
      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("Reclamar botín", res.message)], ephemeral: true });
        return;
      }

      await interaction.reply({
        embeds: [baseEmbed(COLORS.success).setTitle("🏆 ¡Expedición Completada!").setDescription(res.message)],
      });
      return;
    }

    if (sub === "renombrar") {
      const nuevoNombre = interaction.options.getString("nombre", true);
      const petArg = interaction.options.getString("mascota");
      const res = renamePet(gid, interaction.user.id, nuevoNombre, petArg ?? undefined);
      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("Renombrar mascota", res.message)], ephemeral: true });
        return;
      }

      await interaction.reply({
        embeds: [baseEmbed(COLORS.success).setTitle("✨ Mascota Renombrada").setDescription(res.message)],
      });
      return;
    }

    if (sub === "liberar") {
      const petId = interaction.options.getString("mascota", true);
      const res = releasePet(gid, interaction.user.id, petId);
      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("Liberar mascota", res.message)], ephemeral: true });
        return;
      }

      await interaction.reply({
        embeds: [baseEmbed(COLORS.warn).setTitle("🍃 Mascota Liberada").setDescription(res.message)],
      });
      return;
    }
  },
};

export default command;
