import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { baseEmbed, errorEmbed, onlyGuild } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import {
  PET_SPECIES,
  adoptPet,
  claimExpedition,
  expToNextLevel,
  feedPet,
  getUserPet,
  petPet,
  renamePet,
  startExpedition,
} from "../../modules/pets/engine.js";
import { n } from "../../modules/economy/engine.js";
import type { Command } from "../../types/index.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mascota")
    .setDescription("Sistema de mascotas virtuales: adopción, cuidados y expediciones")
    .addSubcommand((s) =>
      s
        .setName("perfil")
        .setDescription("Ver el estado, nivel y felicidad de tu mascota")
        .addUserOption((o) => o.setName("usuario").setDescription("Ver mascota de otro usuario")),
    )
    .addSubcommand((s) =>
      s
        .setName("tienda")
        .setDescription("Ver el catálogo de especies de mascotas disponibles para adoptar"),
    )
    .addSubcommand((s) =>
      s
        .setName("adoptar")
        .setDescription("Adopta una mascota para que te acompañe en Nexo")
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
    .addSubcommand((s) => s.setName("alimentar").setDescription("Alimenta a tu mascota para subir su felicidad y EXP (200 nexocoins)"))
    .addSubcommand((s) => s.setName("acariciar").setDescription("Acaricia y juega con tu mascota gratis para darle cariño"))
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
        ),
    )
    .addSubcommand((s) => s.setName("reclamar").setDescription("Reclama el botín y experiencia de la expedición de tu mascota"))
    .addSubcommand((s) =>
      s
        .setName("renombrar")
        .setDescription("Cambia el nombre de tu mascota")
        .addStringOption((o) => o.setName("nombre").setDescription("Nuevo nombre").setRequired(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }

    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    if (sub === "tienda") {
      const embed = baseEmbed(COLORS.primary)
        .setTitle("🐾 Centro de Adopción de Mascotas de Nexo")
        .setDescription(
          "¡Adopta un compañero fiel! Cuídalo, súbelo de nivel y envíalo en expediciones para recolectar NexoCoins e ítems valiosos.\n\n" +
            Object.values(PET_SPECIES)
              .map(
                (s) =>
                  `### ${s.emoji} ${s.name} · ${n(s.price)}\n` +
                  `> *${s.description}*\n` +
                  `> 🌟 **Habilidad pasiva:** ${s.bonus}\n`,
              )
              .join("\n") +
            "\nUsa `/mascota adoptar [especie] [nombre]` para adoptar la tuya.",
        );
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "perfil") {
      const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
      const pet = getUserPet(gid, targetUser.id);

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
      const status = isExpedition
        ? `🎒 En expedición (<t:${Math.floor(pet.on_expedition_until / 1000)}:R>)`
        : "🏡 Descansando en casa";

      // Barra de felicidad visual
      const heartsCount = Math.round(pet.happiness / 20);
      const happyBar = "❤️".repeat(heartsCount) + "🤍".repeat(5 - heartsCount);

      const embed = baseEmbed(COLORS.primary)
        .setTitle(`${species.emoji} Mascota · ${pet.name}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setDescription(
          `**Dueño:** <@${pet.user_id}>\n` +
            `**Especie:** ${species.emoji} ${species.name}\n` +
            `**Estado:** ${status}\n\n` +
            `⭐ **Nivel:** ${pet.level} · Exp: ${pet.exp} / ${neededExp} XP\n` +
            `💖 **Felicidad:** ${pet.happiness}% [${happyBar}]\n` +
            `🌟 **Efecto Pasivo:** ${species.bonus}\n\n` +
            `*Alimenta y acaricia a tu mascota con regularidad para mantener su felicidad alta y maximizar su botín de expedición.*`,
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
      const res = feedPet(gid, interaction.user.id);
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
      const res = petPet(gid, interaction.user.id);
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
      const res = startExpedition(gid, interaction.user.id, duracion);
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
      const res = claimExpedition(gid, interaction.user.id);
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
      const res = renamePet(gid, interaction.user.id, nuevoNombre);
      if (!res.ok) {
        await interaction.reply({ embeds: [errorEmbed("Renombrar mascota", res.message)], ephemeral: true });
        return;
      }

      await interaction.reply({
        embeds: [baseEmbed(COLORS.success).setTitle("✨ Mascota Renombrada").setDescription(res.message)],
      });
      return;
    }
  },
};

export default command;
