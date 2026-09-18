import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { crimeEmbed, errorEmbed, ephemeral, onlyGuild } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import {
  CD,
  CRIMES,
  addWallet,
  cdCheck,
  chance,
  checkActivityDrop,
  getEco,
  jailCheck,
  n,
  rng,
  saveEco,
  takeItem,
} from "../../modules/economy/engine.js";
import { collectLoan } from "../../modules/economy/loans.js";
import { bumpMission } from "../../modules/missions/engine.js";
import type { Command } from "../../types/index.js";


async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }
    const gid = interaction.guild.id;
    const me = getEco(gid, interaction.user.id);
    collectLoan(me);
    const jail = jailCheck(me);
    if (jail) {
      await interaction.reply(ephemeral([errorEmbed("Calabozo", jail)]));
      return;
    }
    const sub = interaction.options.getSubcommand(false) ?? interaction.commandName.replace(/^crimen-/, "");

    if (sub === "hacer") {
      const cd = cdCheck(me.last_crime, CD.crime);
      if (cd) return void interaction.reply({ embeds: [errorEmbed("La poli te vigila", cd)], ephemeral: true });
      me.last_crime = Date.now();
      bumpMission(gid, interaction.user.id, "crime_1");
      const job = CRIMES[rng(0, CRIMES.length - 1)]!;
      const ok = chance(42);
      if (ok) {
        const gain = rng(job.min, job.max);
        addWallet(me, gain);
        saveEco(me);
        const colDrop = checkActivityDrop(gid, interaction.user.id);
        const emb = crimeEmbed("Crimen")
          .setColor(COLORS.success)
          .setDescription(`Has logrado **${job.name}**.`)
          .addFields({ name: "Botín", value: n(gain), inline: true }, { name: "Cartera", value: n(me.wallet), inline: true });
        if (colDrop.dropped && colDrop.item) {
          emb.addFields({
            name: "✨ ¡Coleccionable encontrado!",
            value: `¡Has obtenido una pieza rara: ${colDrop.item.emoji} **${colDrop.item.name}**!${colDrop.completedCollection ? `\n🎉 **¡Colección completada "${colDrop.completedCollection}"! (+10.000 🪙 recibidos)**` : ""}`,
          });
        }
        await interaction.reply({ embeds: [emb] });
      } else {

        const fine = rng(80, 250);
        addWallet(me, -fine);
        const insured = takeItem(me, "seguro");
        if (!insured) me.jailed_until = Date.now() + rng(2, 6) * 60_000;
        saveEco(me);
        await interaction.reply({
          embeds: [
            crimeEmbed("Te han pillado")
              .setDescription(
                `Has fallado **${job.name}**. Multa ${n(fine)}.${insured ? " El **seguro** te ha librado del calabozo." : " Calabozo unos minutos (café en la tienda)."}`,
              ),
          ],
        });
      }
      return;
    }

    if (sub === "buscar") {
      const cd = cdCheck(me.last_crime, CD.beg);
      if (cd) return void interaction.reply(ephemeral([errorEmbed("La poli ronda", cd)]));
      me.last_crime = Date.now();
      if (chance(55)) {
        const gain = rng(20, 120);
        addWallet(me, gain);
        saveEco(me);
        await interaction.reply({
          embeds: [crimeEmbed("Basura").setColor(COLORS.success).setDescription(`Has encontrado ${n(gain)} entre latas y cables.`)],
        });
      } else {
        saveEco(me);
        await interaction.reply({ embeds: [crimeEmbed("Nada").setDescription("Solo has sacado un calcetín húmedo.")] });
      }
      return;
    }

    const targetUser = interaction.options.getUser("usuario", true);
    if (targetUser.bot || targetUser.id === interaction.user.id) {
      await interaction.reply(ephemeral([errorEmbed("Elige a otra persona")]));
      return;
    }
    const victim = getEco(gid, targetUser.id);

    if (sub === "robar") {
      const cd = cdCheck(me.last_rob, CD.rob);
      if (cd) return void interaction.reply({ embeds: [errorEmbed("Espera", cd)], ephemeral: true });
      if (victim.wallet < 80) {
        await interaction.reply({ embeds: [errorEmbed("Está pelado", "No merece la pena.")], ephemeral: true });
        return;
      }
      me.last_rob = Date.now();
      if (takeItem(victim, "candado")) {
        saveEco(victim);
        saveEco(me);
        await interaction.reply({
          embeds: [crimeEmbed("Candado").setDescription(`${targetUser} tenía un candado. Te has ido de vacío.`)],
        });
        return;
      }
      let pct = 45;
      if (takeItem(me, "ganzua")) pct += 18;
      const ok = chance(pct);
      if (ok) {
        const steal = Math.max(20, Math.floor(victim.wallet * (rng(12, 35) / 100)));
        addWallet(victim, -steal);
        addWallet(me, steal);
        saveEco(me);
        saveEco(victim);
        const colDrop = checkActivityDrop(gid, interaction.user.id);
        const emb = crimeEmbed("Robo")
          .setColor(COLORS.success)
          .setDescription(`Le has levantado ${n(steal)} a ${targetUser}.\nCartera ${n(me.wallet)}`);
        if (colDrop.dropped && colDrop.item) {
          emb.addFields({
            name: "✨ ¡Coleccionable encontrado!",
            value: `¡Has obtenido una pieza rara: ${colDrop.item.emoji} **${colDrop.item.name}**!${colDrop.completedCollection ? `\n🎉 **¡Colección completada "${colDrop.completedCollection}"! (+10.000 🪙 recibidos)**` : ""}`,
          });
        }
        await interaction.reply({ embeds: [emb] });
      } else {
        const fine = Math.max(40, Math.floor(me.wallet * 0.12));
        addWallet(me, -fine);
        const insured = takeItem(me, "seguro");
        if (!insured) me.jailed_until = Date.now() + 3 * 60_000;
        saveEco(me);
        await interaction.reply({
          embeds: [
            crimeEmbed("Te han visto").setDescription(
              `Has fallado el robo. Multa ${n(fine)}.${insured ? " Seguro: sin calabozo." : " 3 min de calabozo."}`,
            ),
          ],
        });
      }
      return;
    }

    if (sub === "hackear") {
      const cd = cdCheck(me.last_hack, CD.hack);
      if (cd) return void interaction.reply({ embeds: [errorEmbed("Espera", cd)], ephemeral: true });
      const pool = victim.bank + Math.floor(victim.wallet * 0.3);
      if (pool < 150) {
        await interaction.reply({ embeds: [errorEmbed("Cuenta vacía", "No hay nada que hackear.")], ephemeral: true });
        return;
      }
      me.last_hack = Date.now();
      if (takeItem(victim, "vpn")) {
        saveEco(victim);
        saveEco(me);
        await interaction.reply({
          embeds: [crimeEmbed("VPN").setDescription(`${targetUser} tenía VPN. El ataque ha rebotado.`)],
        });
        return;
      }
      let pct = 32;
      if (takeItem(me, "kit")) pct += 18;
      const ok = chance(pct);
      if (ok) {
        const steal = Math.max(50, Math.floor(victim.bank * (rng(15, 40) / 100)));
        victim.bank = Math.max(0, victim.bank - steal);
        addWallet(me, steal);
        saveEco(me);
        saveEco(victim);
        const colDrop = checkActivityDrop(gid, interaction.user.id);
        const emb = crimeEmbed("Hack")
          .setColor(COLORS.success)
          .setDescription(`Has drenado ${n(steal)} del banco de ${targetUser}.`);
        if (colDrop.dropped && colDrop.item) {
          emb.addFields({
            name: "✨ ¡Coleccionable encontrado!",
            value: `¡Has obtenido una pieza rara: ${colDrop.item.emoji} **${colDrop.item.name}**!${colDrop.completedCollection ? `\n🎉 **¡Colección completada "${colDrop.completedCollection}"! (+10.000 🪙 recibidos)**` : ""}`,
          });
        }
        await interaction.reply({ embeds: [emb] });
      } else {

        const fine = Math.max(80, Math.floor(me.wallet * 0.18));
        addWallet(me, -fine);
        const insured = takeItem(me, "seguro");
        if (!insured) me.jailed_until = Date.now() + 5 * 60_000;
        saveEco(me);
        await interaction.reply({
          embeds: [
            crimeEmbed("Traceback").setDescription(
              `Te han rastreado. Multa ${n(fine)}.${insured ? " El seguro evita el calabozo." : " 5 min de calabozo."}`,
            ),
          ],
        });
      }
      return;
    }

    if (sub === "extorsionar") {
      const cd = cdCheck(me.last_hack, CD.hack);
      if (cd) return void interaction.reply(ephemeral([errorEmbed("Espera", cd)]));
      if (victim.bank < 200) {
        await interaction.reply(ephemeral([errorEmbed("No pica", "Ese banco no da para un chantaje.")]));
        return;
      }
      me.last_hack = Date.now();
      if (chance(28)) {
        const steal = Math.max(40, Math.floor(victim.bank * (rng(8, 18) / 100)));
        victim.bank -= steal;
        addWallet(me, steal);
        saveEco(me);
        saveEco(victim);
        await interaction.reply({
          embeds: [
            crimeEmbed("Extorsión")
              .setColor(COLORS.success)
              .setDescription(`${targetUser} ha picado. Te lleva ${n(steal)}.`),
          ],
        });
      } else {
        const fine = rng(60, 200);
        addWallet(me, -fine);
        saveEco(me);
        await interaction.reply({
          embeds: [crimeEmbed("Te han denunciado").setDescription(`No ha colado. Multa ${n(fine)}.`)],
        });
      }
    }
  }


const data = new SlashCommandBuilder()
  .setName("crimen")
  .setDescription("Actividades delictivas y pillería en el servidor")
  .addSubcommand((s) => s.setName("hacer").setDescription("Un crimen random contra el server"))
  .addSubcommand((s) =>
    s
      .setName("robar")
      .setDescription("Vaciarle la cartera a alguien")
      .addUserOption((o) => o.setName("usuario").setDescription("Víctima").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("hackear")
      .setDescription("Intentar entrar en su banco")
      .addUserOption((o) => o.setName("usuario").setDescription("Víctima").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("extorsionar")
      .setDescription("Amenazar por una tajada del banco")
      .addUserOption((o) => o.setName("usuario").setDescription("Víctima").setRequired(true)),
  )
  .addSubcommand((s) => s.setName("buscar").setDescription("Rebuscar en la basura del server"));

const command: Command = { data, execute };
export default command;
