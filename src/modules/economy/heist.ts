import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getDb } from "../../database/index.js";
import { baseEmbed, errorEmbed } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import { getEco, saveEco, addWallet, jailCheck, n, rng } from "./engine.js";
import { checkUserAchievements } from "./achievements.js";

const HEIST_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos entre golpes
const lastHeistMap = new Map<string, number>();

export async function startBankHeist(interaction: ChatInputCommandInteraction): Promise<void> {
  const gid = interaction.guildId!;
  const leader = interaction.user;

  // Comprobar cooldown en el servidor
  const last = lastHeistMap.get(gid) ?? 0;
  const now = Date.now();
  if (now - last < HEIST_COOLDOWN_MS) {
    const remMin = Math.ceil((HEIST_COOLDOWN_MS - (now - last)) / 60000);
    await interaction.reply({
      embeds: [
        errorEmbed(
          "🚨 Alerta de Seguridad Máxima",
          `El Banco Central de Nexo está en alerta roja por un asalto reciente.\nLos furgones blindados y guardias no bajarán la guardia hasta dentro de **${remMin} minuto(s)**.`,
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const leaderEco = getEco(gid, leader.id);
  const jailed = jailCheck(leaderEco);
  if (jailed) {
    await interaction.reply({
      embeds: [errorEmbed("Estás en el calabozo", jailed)],
      ephemeral: true,
    });
    return;
  }

  const crew = new Set<string>([leader.id]);
  const crewTags = new Map<string, string>([[leader.id, leader.username]]);

  const heistId = `heist_${Date.now()}`;
  const endsAt = Math.floor((Date.now() + 60_000) / 1000);

  const getEmbed = (status = "En preparación") => {
    const list = Array.from(crew)
      .map((id, i) => `${i + 1}. <@${id}> ${id === leader.id ? "👑 *(Líder)*" : ""}`)
      .join("\n");

    const prob = Math.min(85, 35 + (crew.size - 1) * 12);
    const estLootMin = 40_000 * crew.size;
    const estLootMax = 80_000 * crew.size;

    return baseEmbed(COLORS.crime)
      .setTitle("🏦 ¡Planificando Asalto al Banco Central de Nexo!")
      .setDescription(
        `**${leader.username}** está reclutando a una banda de criminales expertos para asaltar la bóveda del banco.\n\n` +
          `⏳ **Tiempo para unirse:** <t:${endsAt}:R>\n` +
          `👥 **Miembros en la banda:** ${crew.size} / 8\n` +
          `🎯 **Probabilidad de éxito estimada:** ~${prob}%\n` +
          `💰 **Botín estimado total:** ${n(estLootMin)} - ${n(estLootMax)}\n\n` +
          `**Integrantes de la banda:**\n${list}\n\n` +
          `⚠️ *Si el golpe falla, todos los participantes acabarán en el calabozo durante 10 minutos.*`,
      )
      .setFooter({ text: `Estado: ${status} · Pulsa el botón para unirte` });
  };

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${heistId}:join`)
      .setLabel("🔫 Unirse a la banda")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`${heistId}:start`)
      .setLabel("🚀 Ejecutar asalto ahora")
      .setStyle(ButtonStyle.Success),
  );

  const response = await interaction.reply({
    embeds: [getEmbed()],
    components: [row],
    fetchReply: true,
  });

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
  });

  let resolved = false;

  async function resolveHeist() {
    if (resolved) return;
    resolved = true;
    collector.stop("executed");
    lastHeistMap.set(gid, Date.now());

    if (crew.size < 2) {
      await interaction.editReply({
        embeds: [
          errorEmbed(
            "Asalto cancelado",
            "No se unieron suficientes cómplices a la banda. Se necesitan al menos **2 asaltantes** para neutralizar a los guardias.",
          ),
        ],
        components: [],
      });
      return;
    }

    // Calcular éxito
    // Base 35% + 12% por persona adicional (máx 85%)
    const winRate = Math.min(85, 35 + (crew.size - 1) * 12);
    const roll = rng(1, 100);
    const success = roll <= winRate;

    const crewIds = Array.from(crew);

    if (success) {
      // Botín por persona: 30,000 a 60,000 nexocoins
      const lootPerPerson = rng(35_000, 65_000);
      const totalLoot = lootPerPerson * crewIds.length;

      getDb().transaction(() => {
        for (const uid of crewIds) {
          const eco = getEco(gid, uid);
          addWallet(eco, lootPerPerson);
          saveEco(eco);
          checkUserAchievements(gid, uid);
        }

        getDb()
          .prepare(
            "INSERT INTO bank_heists (guild_id, leader_id, participants, loot_amount, status, ends_at, created_at) VALUES (?, ?, ?, ?, 'success', ?, ?)",
          )
          .run(gid, leader.id, JSON.stringify(crewIds), totalLoot, Date.now(), now);
      })();

      const mentions = crewIds.map((id) => `<@${id}>`).join(", ");
      await interaction.editReply({
        embeds: [
          baseEmbed(COLORS.success)
            .setTitle("💰 ¡¡¡ASALTO AL BANCO EXITOSO!!! 💰")
            .setDescription(
              `¡La banda logró infiltrarse en la cámara acorazada, reventar las cajas fuertes y escapar en el furgón sin dejar rastro!\n\n` +
                `💵 **Botín Total Saqueado:** **${n(totalLoot)}**\n` +
                `🎁 **Parte de cada asaltante:** **${n(lootPerPerson)}**\n\n` +
                `🎉 **Banda triunfante:** ${mentions}`,
            ),
        ],
        components: [],
      });
    } else {
      // Falla el asalto -> Calabozo 10 minutos
      const jailTime = Date.now() + 10 * 60_000;

      getDb().transaction(() => {
        for (const uid of crewIds) {
          const eco = getEco(gid, uid);
          eco.jailed_until = jailTime;
          saveEco(eco);
        }

        getDb()
          .prepare(
            "INSERT INTO bank_heists (guild_id, leader_id, participants, loot_amount, status, ends_at, created_at) VALUES (?, ?, ?, 0, 'failed', ?, ?)",
          )
          .run(gid, leader.id, JSON.stringify(crewIds), Date.now(), now);
      })();

      const mentions = crewIds.map((id) => `<@${id}>`).join(", ");
      await interaction.editReply({
        embeds: [
          baseEmbed(COLORS.danger)
            .setTitle("🚨 ¡EL ASALTO HA SIDO UN FRACASO TOTAL! 🚨")
            .setDescription(
              `Sonaron las alarmas silenciosas y el escuadrón táctico SWAT rodeó el banco antes de poder abrir la caja fuerte.\n\n` +
                `🚔 **Toda la banda ha sido arrestada** y enviada al calabozo durante **10 minutos** (<t:${Math.floor(jailTime / 1000)}:R>).\n\n` +
                `🔒 **Prisioneros:** ${mentions}`,
            ),
        ],
        components: [],
      });
    }
  }

  collector.on("collect", async (i) => {
    if (i.customId === `${heistId}:join`) {
      if (crew.has(i.user.id)) {
        await i.reply({ content: "Ya estás apuntado en la banda de este asalto.", ephemeral: true });
        return;
      }
      if (crew.size >= 8) {
        await i.reply({ content: "La banda ya está completa (máximo 8 asaltantes).", ephemeral: true });
        return;
      }

      const userEco = getEco(gid, i.user.id);
      const isJailed = jailCheck(userEco);
      if (isJailed) {
        await i.reply({ content: `No puedes unirte al asalto: ${isJailed}`, ephemeral: true });
        return;
      }

      crew.add(i.user.id);
      crewTags.set(i.user.id, i.user.username);
      await i.update({ embeds: [getEmbed()] });
      return;
    }

    if (i.customId === `${heistId}:start`) {
      if (i.user.id !== leader.id) {
        await i.reply({
          content: "Solo el líder de la banda que inició el golpe puede ordenar ejecutar el asalto.",
          ephemeral: true,
        });
        return;
      }
      if (crew.size < 2) {
        await i.reply({
          content: "Necesitas al menos a **1 cómplice más** en la banda antes de ejecutar el asalto.",
          ephemeral: true,
        });
        return;
      }

      await i.deferUpdate();
      await resolveHeist();
    }
  });

  collector.on("end", async (_collected, reason) => {
    if (reason !== "executed" && !resolved) {
      await resolveHeist();
    }
  });
}
