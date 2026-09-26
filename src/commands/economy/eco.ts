import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { ecoEmbed, errorEmbed, ephemeral, onlyGuild, successEmbed } from "../../utils/embeds.js";
import { requireStaff } from "../../utils/permissions.js";
import {
  CD,
  FISH,
  HUNT,
  JOBS,
  addWallet,
  cdCheck,
  chance,
  checkActivityDrop,
  getEco,
  giveItem,
  hasItem,
  invOf,
  jailCheck,
  n,
  rng,
  saveEco,
  takeItem,
  topEconomy,
  totalFunds,
  deductFunds,
  type EcoTopKind,
  workPay,
} from "../../modules/economy/engine.js";
import { getItemDef, RARITY_INFO, isTrainerItem, type ItemDef } from "../../modules/economy/items.js";

import {
  collectLoan,
  getLoan,
  loanOffer,
  loanSummary,
  payLoan,
  takeLoan,
} from "../../modules/economy/loans.js";
import { bumpMission } from "../../modules/missions/engine.js";
import { autocompleteShop, buyCatalogItem, catalog, findItem, renderShopView, executeSell, getSellAutocomplete } from "../../modules/economy/shop.js";
import {
  FIXED_DEPOSIT_PLANS,
  MAX_ACTIVE_DEPOSITS_PER_USER,
  activateOverclock,
  claimMaturedDeposits,
  openFixedDeposit,
  RIG_TIERS,
} from "../../modules/economy/passive.js";
import { getCryptoMiner, getUserFixedDeposits } from "../../database/index.js";
import { startBankHeist } from "../../modules/economy/heist.js";
import { getEquippedTitle, checkUserAchievements } from "../../modules/economy/achievements.js";
import type { AutocompleteInteraction } from "discord.js";
import type { Command } from "../../types/index.js";



function ecoCommand(
  name: string,
  description: string,
  configure?: (b: SlashCommandBuilder) => any,
  withAutocomplete = false,
): Command {
  let b = new SlashCommandBuilder().setName(name).setDescription(description);
  if (configure) b = configure(b) as SlashCommandBuilder;
  return {
    data: b,
    execute,
    autocomplete: withAutocomplete ? autocomplete : undefined,
  };
}

async function autocomplete(interaction: AutocompleteInteraction) {
  if (!interaction.inCachedGuild()) {
    await interaction.respond([]);
    return;
  }
  const focused = interaction.options.getFocused(true);
  const eco = getEco(interaction.guild.id, interaction.user.id);
  const inv = invOf(eco);
  const q = focused.value.toLowerCase();

  if (focused.name === "cana") {
    const rods = [
      { id: "basica", name: "🎣 Caña Básica (Estándar)", has: true },
      { id: "cana_carbono", name: "🎣 Caña de Carbono (+16 suerte)", has: (inv["cana_carbono"] ?? 0) > 0 },
      { id: "cana_legendaria", name: "✨ Caña de Profundidades (+32 suerte)", has: (inv["cana_legendaria"] ?? 0) > 0 },
    ];
    const opts = rods
      .filter((r) => r.has && (!q || r.name.toLowerCase().includes(q)))
      .map((r) => ({ name: r.name, value: r.id }));
    await interaction.respond(opts).catch(() => {});
    return;
  }

  if (focused.name === "cebo") {
    const baits = [
      { id: "ninguno", name: "🚫 Sin cebo extra", has: true },
      { id: "cebo", name: `🪱 Cebo Estándar (+18 suerte) · tienes ×${inv["cebo"] ?? 0}`, has: (inv["cebo"] ?? 0) > 0 },
      { id: "cebo_dorado", name: `✨ Cebo Dorado (+40 suerte) · tienes ×${inv["cebo_dorado"] ?? 0}`, has: (inv["cebo_dorado"] ?? 0) > 0 },
      { id: "red_pesca", name: `🕸️ Red Marina (captura múltiple) · tienes ×${inv["red_pesca"] ?? 0}`, has: (inv["red_pesca"] ?? 0) > 0 },
    ];
    const opts = baits
      .filter((b) => b.has && (!q || b.name.toLowerCase().includes(q)))
      .map((b) => ({ name: b.name.slice(0, 100), value: b.id }));
    await interaction.respond(opts).catch(() => {});
    return;
  }

  if (focused.name === "arma") {
    const weapons = [
      { id: "basica", name: "🏹 Caza Tradicional (Básica)", has: true },
      { id: "rifle", name: `🎯 Rifle de Caza (+16 suerte) · tienes ×${inv["rifle"] ?? 0}`, has: (inv["rifle"] ?? 0) > 0 },
      { id: "rifle_precision", name: `🎯 Rifle AWP Precisión (+32 suerte) · tienes ×${inv["rifle_precision"] ?? 0}`, has: (inv["rifle_precision"] ?? 0) > 0 },
    ];
    const opts = weapons
      .filter((w) => w.has && (!q || w.name.toLowerCase().includes(q)))
      .map((w) => ({ name: w.name.slice(0, 100), value: w.id }));
    await interaction.respond(opts).catch(() => {});
    return;
  }

  if (focused.name === "trampa") {
    const traps = [
      { id: "ninguna", name: "🚫 Sin trampa ni señuelo", has: true },
      { id: "senuelo", name: `🪈 Señuelo Acústico (+25 suerte) · tienes ×${inv["senuelo"] ?? 0}`, has: (inv["senuelo"] ?? 0) > 0 },
      { id: "trampa_osos", name: `🪤 Trampa Reforzada (+45 suerte) · tienes ×${inv["trampa_osos"] ?? 0}`, has: (inv["trampa_osos"] ?? 0) > 0 },
    ];
    const opts = traps
      .filter((t) => t.has && (!q || t.name.toLowerCase().includes(q)))
      .map((t) => ({ name: t.name.slice(0, 100), value: t.id }));
    await interaction.respond(opts).catch(() => {});
    return;
  }

  if (focused.name !== "item") {
    await interaction.respond([]).catch(() => {});
    return;
  }
  const subCmd = interaction.options.getSubcommand(false);
  if (interaction.commandName === "eco-vender" || subCmd === "vender") {
    await interaction.respond(getSellAutocomplete(interaction.guild.id, inv, focused.value)).catch(() => {});
    return;
  }
  await interaction.respond(autocompleteShop(interaction.guild.id, focused.value)).catch(() => {});
}


async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }
    const sub = interaction.options.getSubcommand(false) ?? interaction.commandName.replace(/^eco-/, "");
    const gid = interaction.guild.id;
    const me = getEco(gid, interaction.user.id);
    const seized = collectLoan(me);

    const needFree = ["work", "extra", "daily", "weekly", "pescar", "cazar", "mendigar"].includes(sub);
    if (needFree) {
      const jail = jailCheck(me);
      if (jail) {
        await interaction.reply(ephemeral([errorEmbed("Calabozo", jail)]));
        return;
      }
    }

    if (sub === "bal" || sub === "perfil") {
      const user = interaction.options.getUser("usuario") ?? interaction.user;
      checkUserAchievements(gid, user.id);
      const row = getEco(gid, user.id);
      const title = getEquippedTitle(gid, user.id);
      const crown = hasItem(row, "corona") ? " 👑" : "";
      const titlePrefix = title ? `[${title}] ` : "";
      const e = ecoEmbed(`${titlePrefix}Nexocoin de ${user.username}${crown}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: "Cartera", value: n(row.wallet), inline: true },
          { name: "Banco", value: n(row.bank), inline: true },
          { name: "Total", value: n(row.wallet + row.bank), inline: true },
        );
      const deposits = getUserFixedDeposits(gid, user.id, true);
      const lockedInDeposits = deposits.reduce((acc, d) => acc + d.amount, 0);
      if (lockedInDeposits > 0) {
        e.addFields({ name: "🔒 Plazo Fijo", value: n(lockedInDeposits), inline: true });
      }

      if (sub === "perfil") {
        if (title) e.addFields({ name: "🎖️ Título Cosmético", value: `**${title}**`, inline: true });
        e.addFields(
          { name: "Ganado", value: n(row.earned), inline: true },
          { name: "Perdido", value: n(row.lost), inline: true },
          { name: "Racha daily", value: `🔥 **${row.daily_streak}**`, inline: true },
        );
        const miner = getCryptoMiner(gid, user.id);
        if (miner) {
          const tier = RIG_TIERS[miner.rig_tier] ?? RIG_TIERS[0]!;
          e.addFields({ name: "⛏️ Minería", value: `${tier.emoji} Nvl ${miner.rig_tier} (${tier.hashrateDesc})`, inline: true });
        }
        if (row.jailed_until > Date.now()) e.addFields({ name: "Calabozo", value: `<t:${Math.floor(row.jailed_until / 1000)}:R>` });
      }
      const loan = getLoan(gid, user.id);
      if (loan) e.addFields({ name: "Préstamo", value: loanSummary(loan) });
      if (seized.paid && user.id === interaction.user.id) {
        e.setFooter({ text: `El banco cobró ${seized.paid.toLocaleString("es-ES")} nexocoin de un impago.` });
      }
      await interaction.reply({ embeds: [e] });
      return;
    }

    if (sub === "work" || sub === "extra") {
      const skip = sub === "work" && takeItem(me, "chicle");
      if (!skip) {
        const cd = cdCheck(me.last_work, sub === "work" ? CD.work : CD.overtime);
        if (cd) {
          await interaction.reply(ephemeral([errorEmbed("Descansa", cd)]));
          return;
        }
      }
      const job = JOBS[rng(0, JOBS.length - 1)]!;
      let pay = workPay(me, job.min, job.max);
      if (sub === "extra") pay = Math.floor(pay * 0.45);
      me.last_work = Date.now();
      addWallet(me, pay);
      saveEco(me);
      if (sub === "work") {
        bumpMission(gid, interaction.user.id, "work_3");
        bumpMission(gid, interaction.user.id, "work_5");
      }
      if (sub === "extra") bumpMission(gid, interaction.user.id, "extra_2");
      const colDrop = checkActivityDrop(gid, interaction.user.id);
      const emb = ecoEmbed(sub === "extra" ? "Horas extra" : "Trabajo")
        .setDescription(`${job.emoji} Has ido a **${job.name}**.`)
        .addFields(
          { name: "Cobro", value: n(pay), inline: true },
          { name: "Cartera", value: n(me.wallet), inline: true },
        );
      if (colDrop.dropped && colDrop.item) {
        emb.addFields({
          name: "✨ ¡Coleccionable encontrado!",
          value: `¡Has obtenido una pieza rara: ${colDrop.item.emoji} **${colDrop.item.name}**!${colDrop.completedCollection ? `\n🎉 **¡Colección completada "${colDrop.completedCollection}"! (+10.000 🪙 recibidos)**` : ""}`,
        });
      }
      await interaction.reply({ embeds: [emb] });
      return;
    }

    if (sub === "daily") {
      const cd = cdCheck(me.last_daily, CD.daily);
      if (cd) return void interaction.reply(ephemeral([errorEmbed("Ya cobrado", cd)]));
      const within = Date.now() - me.last_daily < CD.daily + 6 * 3600_000;
      me.daily_streak = me.last_daily && within ? me.daily_streak + 1 : 1;
      me.last_daily = Date.now();
      const pay = 400 + me.daily_streak * 40 + rng(0, 120);
      const interest = Math.floor(me.bank * 0.02);
      addWallet(me, pay);
      if (interest > 0) me.bank += interest;
      saveEco(me);
      bumpMission(gid, interaction.user.id, "daily_3");
      bumpMission(gid, interaction.user.id, "daily_5");

      const colDrop = checkActivityDrop(gid, interaction.user.id);
      const emb = ecoEmbed("Daily")
        .setDescription(`Racha **${me.daily_streak}** día(s).`)
        .addFields(
          { name: "Paga", value: n(pay), inline: true },
          { name: "Interés banco", value: interest ? n(interest) : "—", inline: true },
          { name: "Cartera", value: n(me.wallet), inline: true },
        );
      if (colDrop.dropped && colDrop.item) {
        emb.addFields({
          name: "✨ ¡Coleccionable encontrado!",
          value: `¡Has obtenido una pieza rara: ${colDrop.item.emoji} **${colDrop.item.name}**!${colDrop.completedCollection ? `\n🎉 **¡Colección completada "${colDrop.completedCollection}"! (+10.000 🪙 recibidos)**` : ""}`,
        });
      }
      await interaction.reply({ embeds: [emb] });
      return;
    }

    if (sub === "weekly") {
      const cd = cdCheck(me.last_weekly, CD.weekly);
      if (cd) return void interaction.reply(ephemeral([errorEmbed("Semanal", cd)]));
      me.last_weekly = Date.now();
      const pay = 1800 + rng(0, 700);
      addWallet(me, pay);
      saveEco(me);
      bumpMission(gid, interaction.user.id, "weekly_1");

      const colDrop = checkActivityDrop(gid, interaction.user.id);
      const emb = ecoEmbed("Paga semanal").addFields({ name: "Cobro", value: n(pay) }, { name: "Cartera", value: n(me.wallet) });
      if (colDrop.dropped && colDrop.item) {
        emb.addFields({
          name: "✨ ¡Coleccionable encontrado!",
          value: `¡Has obtenido una pieza rara: ${colDrop.item.emoji} **${colDrop.item.name}**!${colDrop.completedCollection ? `\n🎉 **¡Colección completada "${colDrop.completedCollection}"! (+10.000 🪙 recibidos)**` : ""}`,
        });
      }
      await interaction.reply({ embeds: [emb] });
      return;
    }


    if (sub === "pescar") {
      const cd = cdCheck(me.last_fish, CD.fish);
      if (cd) return void interaction.reply(ephemeral([errorEmbed("Aún no", cd)]));

      const chosenCana = interaction.options.getString("cana");
      const chosenCebo = interaction.options.getString("cebo");

      let bonusLuck = 0;
      const usedNotes: string[] = [];

      // Validate or auto-select rod
      if (chosenCana && chosenCana !== "basica") {
        if (!hasItem(me, chosenCana)) {
          return void interaction.reply(ephemeral([errorEmbed("No tienes esa caña", `No posees **${getItemDef(chosenCana)?.name ?? chosenCana}** en tu inventario.`)]));
        }
        if (chosenCana === "cana_legendaria") {
          bonusLuck += 32;
          usedNotes.push("Caña de Profundidades 🎣");
        } else if (chosenCana === "cana_carbono") {
          bonusLuck += 16;
          usedNotes.push("Caña de Carbono 🎣");
        }
      } else if (!chosenCana) {
        if (hasItem(me, "cana_legendaria")) {
          bonusLuck += 32;
          usedNotes.push("Caña de Profundidades 🎣");
        } else if (hasItem(me, "cana_carbono")) {
          bonusLuck += 16;
          usedNotes.push("Caña de Carbono 🎣");
        }
      }

      // Validate or auto-select bait
      let hasRed = false;
      if (chosenCebo && chosenCebo !== "ninguno") {
        if (!hasItem(me, chosenCebo)) {
          return void interaction.reply(ephemeral([errorEmbed("Sin cebo", `No tienes **${getItemDef(chosenCebo)?.name ?? chosenCebo}** en tu inventario.`)]));
        }
        takeItem(me, chosenCebo);
        if (chosenCebo === "cebo_dorado") {
          bonusLuck += 40;
          usedNotes.push("Cebo Dorado ✨");
        } else if (chosenCebo === "cebo") {
          bonusLuck += 18;
          usedNotes.push("Cebo Estándar 🪱");
        } else if (chosenCebo === "red_pesca") {
          hasRed = true;
          usedNotes.push("Red Marina 🕸️ (captura múltiple)");
        }
      } else if (!chosenCebo) {
        hasRed = takeItem(me, "red_pesca");
        const hasCeboDorado = takeItem(me, "cebo_dorado");
        const hasCebo = !hasCeboDorado && takeItem(me, "cebo");
        if (hasCeboDorado) {
          bonusLuck += 40;
          usedNotes.push("Cebo Dorado ✨");
        } else if (hasCebo) {
          bonusLuck += 18;
          usedNotes.push("Cebo Estándar 🪱");
        }
        if (hasRed) usedNotes.push("Red Marina 🕸️ (captura múltiple)");
      }

      me.last_fish = Date.now();
      bumpMission(gid, interaction.user.id, "fish_1");

      const numCatches = hasRed ? rng(2, 4) : 1;
      const catches: { def: ItemDef; qty: number }[] = [];

      for (let i = 0; i < numCatches; i++) {
        let roll: number;
        // Gear grants a high bonus roll chance, but preserves standard rolls so common catches are always obtainable
        if (chance(Math.min(50, bonusLuck))) {
          roll = rng(70, 115) + Math.floor(bonusLuck / 4);
        } else {
          roll = rng(1, 80);
        }

        let dropId = "pez_sardina";
        if (roll >= 115) dropId = "pez_calamar_gigante";
        else if (roll >= 102) dropId = "objeto_cofre_mar";
        else if (roll >= 90) dropId = "pez_tiburon";
        else if (roll >= 78) dropId = "objeto_perla";
        else if (roll >= 65) dropId = "pez_pulpo";
        else if (roll >= 50) dropId = "pez_globo";
        else if (roll >= 35) dropId = "pez_salmon";
        else if (roll >= 18) dropId = "pez_trucha";
        else if (roll < 8) dropId = "objeto_bota";

        const def = getItemDef(dropId)!;
        giveItem(me, dropId, 1);
        catches.push({ def, qty: 1 });
      }

      const extraCoins = rng(15, 45);
      addWallet(me, extraCoins);
      saveEco(me);

      const colDrop = checkActivityDrop(gid, interaction.user.id);
      const catchLines = catches.map((c) => {
        const rarity = RARITY_INFO[c.def.rarity];
        return `• ${c.def.emoji} **${c.def.name}** — *${rarity.label}* (Venta: ${c.def.sellPrice} 🪙)`;
      });

      const gearText = usedNotes.length ? `\n*Equipamiento usado: ${usedNotes.join(", ")}*` : "";
      const embed = ecoEmbed("Salida de Pesca 🎣")
        .setDescription(`¡Has tirado la caña al agua!${gearText}\n\n${catchLines.join("\n")}\n\n*Capturas guardadas en tu inventario. Consérvalas para tu \`/galeria\`, súbelas a \`/subasta\` o véndelas con \`/eco-vender\`.*`)
        .addFields(
          { name: "Recompensa extra", value: n(extraCoins), inline: true },
          { name: "Cartera", value: n(me.wallet), inline: true },
        );

      if (colDrop.dropped && colDrop.item) {
        embed.addFields({
          name: "✨ ¡Coleccionable encontrado!",
          value: `¡Has obtenido una pieza rara: ${colDrop.item.emoji} **${colDrop.item.name}**!${colDrop.completedCollection ? `\n🎉 **¡Colección completada "${colDrop.completedCollection}"! (+10.000 🪙 recibidos)**` : ""}`,
        });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "cazar") {
      const cd = cdCheck(me.last_hunt, CD.hunt);
      if (cd) return void interaction.reply(ephemeral([errorEmbed("Aún no", cd)]));

      const chosenArma = interaction.options.getString("arma");
      const chosenTrampa = interaction.options.getString("trampa");

      let bonusLuck = 0;
      const usedNotes: string[] = [];

      // Validate or auto-select weapon
      if (chosenArma && chosenArma !== "basica") {
        if (!hasItem(me, chosenArma)) {
          return void interaction.reply(ephemeral([errorEmbed("No tienes esa arma", `No posees **${getItemDef(chosenArma)?.name ?? chosenArma}** en tu inventario.`)]));
        }
        if (chosenArma === "rifle_precision") {
          bonusLuck += 32;
          usedNotes.push("Rifle AWP de Precisión 🎯");
        } else if (chosenArma === "rifle") {
          bonusLuck += 16;
          usedNotes.push("Rifle de Caza 🎯");
        }
      } else if (!chosenArma) {
        if (hasItem(me, "rifle_precision")) {
          bonusLuck += 32;
          usedNotes.push("Rifle AWP de Precisión 🎯");
        } else if (hasItem(me, "rifle")) {
          bonusLuck += 16;
          usedNotes.push("Rifle de Caza 🎯");
        }
      }

      if (hasItem(me, "camuflaje")) {
        bonusLuck += 14;
        usedNotes.push("Camuflaje 🌿");
      }

      // Validate or auto-select trap/bait
      if (chosenTrampa && chosenTrampa !== "ninguna") {
        if (!hasItem(me, chosenTrampa)) {
          return void interaction.reply(ephemeral([errorEmbed("Sin trampa", `No tienes **${getItemDef(chosenTrampa)?.name ?? chosenTrampa}** en tu inventario.`)]));
        }
        takeItem(me, chosenTrampa);
        if (chosenTrampa === "trampa_osos") {
          bonusLuck += 45;
          usedNotes.push("Trampa Reforzada 🪤");
        } else if (chosenTrampa === "senuelo") {
          bonusLuck += 25;
          usedNotes.push("Señuelo Acústico 🪈");
        }
      } else if (!chosenTrampa) {
        const hasTrampa = takeItem(me, "trampa_osos");
        const hasSenuelo = !hasTrampa && takeItem(me, "senuelo");
        if (hasTrampa) {
          bonusLuck += 45;
          usedNotes.push("Trampa Reforzada 🪤");
        } else if (hasSenuelo) {
          bonusLuck += 25;
          usedNotes.push("Señuelo Acústico 🪈");
        }
      }

      me.last_hunt = Date.now();
      bumpMission(gid, interaction.user.id, "hunt_1");

      let roll: number;
      if (chance(Math.min(50, bonusLuck))) {
        roll = rng(65, 115) + Math.floor(bonusLuck / 4);
      } else {
        roll = rng(1, 80);
      }

      let dropId = "presa_conejo";
      if (roll >= 115) dropId = "presa_fenix";
      else if (roll >= 100) dropId = "presa_lobo";
      else if (roll >= 85) dropId = "presa_oso";
      else if (roll >= 70) dropId = "presa_jabali";
      else if (roll >= 50) dropId = "presa_ciervo";
      else if (roll >= 30) dropId = "presa_zorro";
      else if (roll >= 15) dropId = "presa_pato";

      const def = getItemDef(dropId)!;
      giveItem(me, dropId, 1);

      const extraCoins = rng(20, 60);
      addWallet(me, extraCoins);
      saveEco(me);

      const colDrop = checkActivityDrop(gid, interaction.user.id);
      const rarity = RARITY_INFO[def.rarity];
      const gearText = usedNotes.length ? `\n*Equipamiento usado: ${usedNotes.join(", ")}*` : "";

      const embed = ecoEmbed("Expedición de Caza 🏹")
        .setDescription(`¡Has rastreado el bosque de Nexo!${gearText}\n\n• ${def.emoji} **${def.name}** — *${rarity.label}* (Venta: ${def.sellPrice} 🪙)\n\n*Presa guardada en tu inventario. Consérvala para tu \`/galeria\`, súbela a \`/subasta\` o véndela con \`/eco-vender\`.*`)
        .addFields(
          { name: "Recompensa extra", value: n(extraCoins), inline: true },
          { name: "Cartera", value: n(me.wallet), inline: true },
        );

      if (colDrop.dropped && colDrop.item) {
        embed.addFields({
          name: "✨ ¡Coleccionable encontrado!",
          value: `¡Has obtenido una pieza rara: ${colDrop.item.emoji} **${colDrop.item.name}**!${colDrop.completedCollection ? `\n🎉 **¡Colección completada "${colDrop.completedCollection}"! (+10.000 🪙 recibidos)**` : ""}`,
        });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }


    if (sub === "mendigar") {
      const cd = cdCheck(me.last_beg, CD.beg);
      if (cd) return void interaction.reply(ephemeral([errorEmbed("Ya pediste", cd)]));
      me.last_beg = Date.now();
      bumpMission(gid, interaction.user.id, "beg_2");
      if (chance(35)) {
        const pay = rng(15, 80);
        addWallet(me, pay);
        saveEco(me);
        await interaction.reply({ embeds: [ecoEmbed("Mendigo").setDescription(`Alguien te ha tirado ${n(pay)}. Cartera ${n(me.wallet)}`)] });
      } else {
        saveEco(me);
        await interaction.reply({
          embeds: [errorEmbed("Nadie para", "Te han ignorado. Prueba en un rato.")],
        });
      }
      return;
    }

    if (sub === "pagar") {
      const target = interaction.options.getUser("usuario", true);
      const amount = interaction.options.getInteger("cantidad", true);
      if (target.id === interaction.user.id || target.bot) {
        await interaction.reply(ephemeral([errorEmbed("No válido", "No puedes transferirte fondos a ti mismo ni a un bot.")]));
        return;
      }
      if (amount <= 0) {
        await interaction.reply(ephemeral([errorEmbed("Cantidad inválida", "La cantidad a transferir debe ser mayor a 0.")]));
        return;
      }
      if (!deductFunds(me, amount, { stats: false })) {
        await interaction.reply(
          ephemeral([
            errorEmbed(
              "Fondos insuficientes",
              `Necesitas ${n(amount)} pero solo dispones de ${n(totalFunds(me))} (Cartera: ${n(me.wallet)} | Banco: ${n(me.bank)}).`,
            ),
          ]),
        );
        return;
      }
      const other = getEco(gid, target.id);
      addWallet(other, amount, { stats: false });
      saveEco(me);
      saveEco(other);
      bumpMission(gid, interaction.user.id, "transfer_1");
      await interaction.reply({
        embeds: [
          ecoEmbed("Transferencia")
            .setDescription(`${interaction.user} → ${target}`)
            .addFields(
              { name: "Cantidad enviada", value: n(amount), inline: true },
              { name: "Tu saldo restante", value: `Cartera: ${n(me.wallet)}\nBanco: ${n(me.bank)}`, inline: true },
            ),
        ],
      });
      return;
    }

    if (sub === "depositar" || sub === "retirar") {
      let amount = interaction.options.getInteger("cantidad", true);
      if (sub === "depositar") {
        if (amount < 0) amount = me.wallet;
        if (amount <= 0 || me.wallet < amount) {
          await interaction.reply(ephemeral([errorEmbed("Cantidad inválida")]));
          return;
        }
        me.wallet -= amount;
        me.bank += amount;
        bumpMission(gid, interaction.user.id, "deposit_1");
      } else {
        if (amount < 0) amount = me.bank;
        if (amount <= 0 || me.bank < amount) {
          await interaction.reply(ephemeral([errorEmbed("Cantidad inválida")]));
          return;
        }
        me.bank -= amount;
        me.wallet += amount;
      }
      saveEco(me);
      await interaction.reply({
        embeds: [
          ecoEmbed(sub === "depositar" ? "Depósito" : "Retiro").addFields(
            { name: "Cartera", value: n(me.wallet), inline: true },
            { name: "Banco", value: n(me.bank), inline: true },
          ),
        ],
      });
      return;
    }

    if (sub === "top") {
      const kind = (interaction.options.getString("tipo") ?? "global") as EcoTopKind;
      const titles: Record<EcoTopKind, string> = {
        global: "Top global · cartera + banco",
        efectivo: "Top efectivo · cartera",
        banco: "Top banco",
        semanal: "Top semanal · ganado esta semana",
      };
      const rows = topEconomy(gid, kind, 10);
      const amountOf = (r: (typeof rows)[0]) => {
        if (kind === "efectivo") return r.wallet;
        if (kind === "banco") return r.bank;
        if (kind === "semanal") return r.week_earned;
        return r.wallet + r.bank;
      };
      const lines = await Promise.all(
        rows.map(async (r, i) => {
          const cached = interaction.guild.members.cache.get(r.user_id);
          const u = cached?.user ?? (await interaction.client.users.fetch(r.user_id).catch(() => null));
          const medal = ["🥇", "🥈", "🥉"][i] ?? `**${i + 1}.**`;
          const tag = u ? u.username : r.user_id;
          return `${medal} ${tag} — ${n(amountOf(r))}`;
        }),
      );
      await interaction.reply({
        embeds: [ecoEmbed(titles[kind]).setDescription(lines.join("\n") || "Nadie tiene nexocoin.")],
      });
      return;
    }

    if (sub === "dar" || sub === "quitar") {
      const staff = await requireStaff(interaction);
      if (!staff) return;
      const target = interaction.options.getUser("usuario", true);
      const amount = interaction.options.getInteger("cantidad", true);
      const row = getEco(gid, target.id);
      if (sub === "dar") {
        const donde = interaction.options.getString("donde") ?? "wallet";
        if (donde === "bank") row.bank += amount;
        else addWallet(row, amount, { stats: false });
        saveEco(row);
        await interaction.reply({
          embeds: [
            successEmbed(
              "Nexocoin añadidos",
              `${n(amount)} a ${target} (${donde === "bank" ? "banco" : "cartera"}).\nCartera ${n(row.wallet)} · Banco ${n(row.bank)}`,
            ),
          ],
        });
        return;
      }
      let left = amount;
      const w = Math.min(row.wallet, left);
      row.wallet -= w;
      left -= w;
      const b = Math.min(row.bank, left);
      row.bank -= b;
      left -= b;
      saveEco(row);
      const taken = amount - left;
      await interaction.reply({
        embeds: [
          successEmbed(
            "Nexocoin retirados",
            `Se han quitado ${n(taken)} a ${target}${left ? ` (no tenía más; faltaban ${n(left)})` : ""}.\nCartera ${n(row.wallet)} · Banco ${n(row.bank)}`,
          ),
        ],
      });
      return;
    }

    if (sub === "prestamo") {
      const existing = getLoan(gid, interaction.user.id);
      if (existing) {
        await interaction.reply({
          embeds: [ecoEmbed("Préstamo abierto").setDescription(`${loanSummary(existing)}\nPaga con \`/eco deuda\`.`)],
        });
        return;
      }
      const offer = loanOffer(me);
      const qty = interaction.options.getInteger("cantidad");
      if (!qty) {
        await interaction.reply({
          embeds: [
            ecoEmbed("Oferta de préstamo").setDescription(
              [
                `Según tu saldo (${n(me.wallet + me.bank)}) puedes pedir hasta **${n(offer.max)}**.`,
                `Interés **${Math.round(offer.rate * 100)}%** · a devolver en **48h**.`,
                `Si no pagas a tiempo, la deuda sube **+8% cada 12h** (tope x3) y el banco se cobra solo.`,
                "",
                `Pide con \`/eco-prestamo cantidad:${offer.max}\`.`,
              ].join("\n"),
            ),
          ],
        });
        return;
      }
      const res = takeLoan(me, qty);
      if (typeof res === "string") {
        await interaction.reply(ephemeral([errorEmbed("Préstamo", res)]));
        return;
      }
      await interaction.reply({
        embeds: [
          ecoEmbed("Préstamo concedido").setDescription(
            `Has recibido ${n(res.principal)} en cartera.\n${loanSummary(res)}\nPaga con \`/eco deuda\`.`,
          ),
        ],
      });
      return;
    }

    if (sub === "deuda") {
      const existing = getLoan(gid, interaction.user.id);
      if (!existing) {
        await interaction.reply({ embeds: [ecoEmbed("Sin deuda", "No tienes préstamo abierto. Mira `/eco-prestamo`.")] });
        return;
      }
      let qty = interaction.options.getInteger("cantidad");
      if (qty == null) {
        await interaction.reply({
          embeds: [ecoEmbed("Tu deuda").setDescription(`${loanSummary(existing)}\nPaga con \`/eco deuda cantidad:\` (−1 = todo).`)],
        });
        return;
      }
      if (qty < 0) qty = existing.owed;
      const res = payLoan(me, qty);
      if (typeof res === "string") {
        await interaction.reply(ephemeral([errorEmbed("Pago", res)]));
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed("Pago registrado", res.left ? `Pagaste ${n(res.paid)}. Quedan ${n(res.left)}.` : `Pagaste ${n(res.paid)}. Deuda saldada.`),
        ],
      });
      return;
    }

    if (sub === "tienda") {
      const view = renderShopView(gid, "todas");
      await interaction.reply({ embeds: [view.embed], components: [view.row] });
      return;
    }


    if (sub === "comprar") {
      const id = interaction.options.getString("item", true);
      const qty = interaction.options.getInteger("cantidad") ?? 1;
      const res = await buyCatalogItem(interaction.member, id, qty);
      const embed = res.ok ? successEmbed(res.title, res.detail) : errorEmbed(res.title, res.detail);
      await interaction.reply({ embeds: [embed], ephemeral: !res.ok });
      return;
    }

    if (sub === "vender") {
      const id = interaction.options.getString("item", true);
      const qtyOption = interaction.options.getInteger("cantidad") ?? 1;
      const res = executeSell(me, gid, id, qtyOption);
      if (!res.ok) {
        await interaction.reply(ephemeral([errorEmbed(res.title, res.detail)]));
        return;
      }
      await interaction.reply({
        embeds: [
          ecoEmbed(res.title)
            .setDescription(res.detail)
            .addFields({ name: "Cartera", value: n(res.wallet) }),
        ],
      });
      return;
    }

    if (sub === "asalto") {
      return startBankHeist(interaction);
    }

    if (sub === "inv") {
      const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
      if (targetUser.bot) {
        await interaction.reply(ephemeral([errorEmbed("Sin inventario", "Los bots no poseen inventario ni participan en la economía.")]));
        return;
      }

      const targetEco = targetUser.id === interaction.user.id ? me : getEco(gid, targetUser.id);
      const inv = invOf(targetEco);
      const entries = Object.entries(inv).filter(([, q]) => q > 0);

      if (!entries.length) {
        const isSelf = targetUser.id === interaction.user.id;
        const msg = isSelf
          ? "Tu inventario está vacío. Consigue objetos en `/tienda ver`, pescando con `/eco pescar` o cazando con `/eco cazar`.\nPuedes ver tus colecciones con `/galeria`, subastar con `/subasta` y vender con `/eco vender`."
          : `El inventario de **${targetUser.username}** está vacío. No posee ningún objeto actualmente.`;
        await interaction.reply(ephemeral([ecoEmbed(`Inventario de ${targetUser.username}`).setDescription(msg)]));
        return;
      }

      const tools: string[] = [];
      const trainer: string[] = [];
      const fish: string[] = [];
      const hunt: string[] = [];
      const collectibles: string[] = [];
      let totalItems = 0;

      for (const [id, q] of entries) {
        totalItems += q;
        const def = getItemDef(id);
        const itemObj = findItem(gid, id);
        const emoji = def?.emoji ?? "📦";
        const name = def?.name ?? itemObj?.name ?? id;
        const rarity = def ? ` · *${RARITY_INFO[def.rarity]?.label ?? def.rarity}*` : "";
        const line = `• ${emoji} **${name}** ×${q}${rarity}`;

        if (
          isTrainerItem(id) ||
          def?.category === "captura" ||
          id.startsWith("piedra_") ||
          id.startsWith("baya_") ||
          id.startsWith("huevo_") ||
          id === "pocion_maxima" ||
          id === "caramelo_raro"
        ) {
          trainer.push(line);
        } else if (!def) {
          tools.push(line);
        } else if (def.category === "herramienta" || def.category === "consumible") {
          tools.push(line);
        } else if (
          def.collectionId === "col_pesca" ||
          def.category === "pesca" ||
          id.startsWith("pez_") ||
          id === "objeto_bota" ||
          id === "objeto_perla" ||
          id === "objeto_cofre_mar"
        ) {
          fish.push(line);
        } else if (
          def.collectionId === "col_caza" ||
          def.category === "caza" ||
          id.startsWith("presa_")
        ) {
          hunt.push(line);
        } else {
          collectibles.push(line);
        }
      }

      const embed = ecoEmbed(`Inventario de ${targetUser.username}`)
        .setDescription(`📦 **${totalItems.toLocaleString("es-ES")}** objetos en total (${entries.length} tipos distintos)`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setFooter({ text: "Vende con /eco vender · Mochila Pokémon con /mochila · Vitrina con /galeria" });

      const addSafeFields = (title: string, lines: string[]) => {
        if (!lines.length) return;
        let current = "";
        let part = 1;
        for (const l of lines) {
          if (current.length + l.length + 1 > 900) {
            embed.addFields({
              name: part === 1 ? title : `${title} (cont. ${part})`,
              value: current,
            });
            current = l;
            part++;
          } else {
            current = current ? `${current}\n${l}` : l;
          }
        }
        if (current) {
          embed.addFields({
            name: part === 1 ? title : `${title} (cont. ${part})`,
            value: current,
          });
        }
      };

      addSafeFields("🔴 Mochila de Entrenador Pokémon", trainer);
      addSafeFields("🛠️ Herramientas y Consumibles", tools);
      addSafeFields("🎣 Pesca y Océano", fish);
      addSafeFields("🏹 Caza y Bosque", hunt);
      addSafeFields("🏛️ Coleccionables y Joyas", collectibles);

      await interaction.reply(ephemeral([embed]));
      return;
    }

    if (sub === "usar") {
      const id = interaction.options.getString("item", true);
      if (id === "cafe") {
        if (!takeItem(me, "cafe")) {
          await interaction.reply(ephemeral([errorEmbed("Sin café", "Cómpralo en `/eco-tienda`." )]));
          return;
        }
        me.jailed_until = 0;
        saveEco(me);
        await interaction.reply({ embeds: [ecoEmbed("Café").setDescription("Libre otra vez.")] });
        return;
      }
      if (id === "chicle") {
        if (!takeItem(me, "chicle")) {
          await interaction.reply(ephemeral([errorEmbed("No tienes chicle")]));
          return;
        }
        me.last_work = 0;
        saveEco(me);
        await interaction.reply({ embeds: [ecoEmbed("Chicle").setDescription("Cooldown de work reseteado.")] });
        return;
      }
      if (id === "pasta_termica") {
        const oc = activateOverclock(gid, me.user_id);
        if (!oc.ok) {
          await interaction.reply(ephemeral([errorEmbed("Error", oc.error ?? "No tienes pasta térmica criogénica.")]));
          return;
        }
        await interaction.reply({
          embeds: [
            successEmbed("Overclock Activado ❄️", "Has aplicado Pasta Térmica Criogénica a tu estación de minería.\n`+25%` de velocidad de minado durante las próximas 24 horas."),
          ],
        });
        return;
      }
      await interaction.reply(
        ephemeral([errorEmbed("Ese objeto se usa solo", "Los cebos, redes, trampas y rifles se equipan automáticamente al pescar o cazar.")]),
      );
      return;
    }

    if (sub === "plazo-fijo") {
      const accion = interaction.options.getString("accion", true);

      if (accion === "ver") {
        const active = getUserFixedDeposits(gid, interaction.user.id, true);
        const embed = ecoEmbed("Depósitos a Plazo Fijo · Banco Central de Nexo")
          .setDescription(
            "Los depósitos a plazo fijo congelan tus fondos bancarios con **intereses garantizados** y **100% protegidos contra robos y hackeos**.\nMáximo **3 depósitos activos simultáneos**.",
          );

        const plansText = Object.values(FIXED_DEPOSIT_PLANS)
          .map((p) => `${p.emoji} **${p.name}**: \`+${Math.round(p.interestRate * 100)}%\` rendimiento (Mín: ${n(p.minAmount)})`)
          .join("\n");
        embed.addFields({ name: "📈 Planes Disponibles", value: plansText });

        if (active.length > 0) {
          const now = Date.now();
          const lines = active.map((d, idx) => {
            const plan = FIXED_DEPOSIT_PLANS[d.plan_days];
            const ready = d.ends_at <= now;
            const timeStr = ready ? "✅ **¡Listo para reclamar!**" : `Vence <t:${Math.floor(d.ends_at / 1000)}:R>`;
            const profit = d.reward_amount - d.amount;
            return `**#${idx + 1}** ${plan?.emoji ?? "💰"} **${n(d.amount)}** → **${n(d.reward_amount)}** (+${n(profit)})\nEstado: ${timeStr}`;
          });
          embed.addFields({
            name: `🔒 Tus Depósitos Activos (${active.length}/${MAX_ACTIVE_DEPOSITS_PER_USER})`,
            value: lines.join("\n\n"),
          });
        } else {
          embed.addFields({
            name: "🔒 Tus Depósitos Activos",
            value: "No tienes ningún depósito activo en este momento.\nUsa `/eco plazo-fijo accion:abrir` para invertir fondos de tu banco.",
          });
        }

        embed.setFooter({ text: "Usa /eco plazo-fijo accion:reclamar para cobrar tus depósitos vencidos." });
        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (accion === "abrir") {
        const cantidad = interaction.options.getInteger("cantidad");
        const dias = interaction.options.getInteger("dias");

        if (!cantidad || !dias) {
          await interaction.reply({
            embeds: [errorEmbed("Datos requeridos", "Para abrir un depósito debes especificar tanto la `cantidad` como los `dias` de plazo.")],
            ephemeral: true,
          });
          return;
        }

        const res = openFixedDeposit(gid, interaction.user.id, cantidad, dias);
        if (!res.ok || !res.deposit) {
          await interaction.reply({ embeds: [errorEmbed("Operación rechazada", res.error ?? "No se pudo abrir el depósito.")], ephemeral: true });
          return;
        }

        const plan = FIXED_DEPOSIT_PLANS[dias]!;
        const profit = res.deposit.reward_amount - res.deposit.amount;

        const embed = successEmbed("Depósito a Plazo Fijo Constituido 🔒", `Has invertido **${n(res.deposit.amount)}** de tu cuenta bancaria a plazo fijo.`)
          .addFields(
            { name: "Plan", value: `${plan.emoji} **${plan.name}**`, inline: true },
            { name: "Interés Garantizado", value: `**+${Math.round(plan.interestRate * 100)}%** (+${n(profit)})`, inline: true },
            { name: "Cobro Estimado", value: `**${n(res.deposit.reward_amount)}**`, inline: true },
            { name: "Vencimiento", value: `<t:${Math.floor(res.deposit.ends_at / 1000)}:F> (<t:${Math.floor(res.deposit.ends_at / 1000)}:R>)`, inline: false },
          )
          .setFooter({ text: "Tus fondos están 100% blindados de robos mientras el depósito esté activo." });

        await interaction.reply({ embeds: [embed] });
        return;
      }

      if (accion === "reclamar") {
        const res = claimMaturedDeposits(gid, interaction.user.id);
        if (!res.ok) {
          await interaction.reply({ embeds: [errorEmbed("Sin depósitos vencidos", res.error ?? "No hay depósitos listos.")], ephemeral: true });
          return;
        }

        const embed = successEmbed(
          "¡Depósitos Liquidados! 💸",
          `Has liquidado **${res.count}** depósito(s) vencido(s) con éxito.\n\n` +
            `• **Ingresado a tu banco:** **${n(res.totalReceived)}**\n` +
            `• **Beneficio neto ganado:** **+${n(res.totalProfit)}** 🪙 de intereses.`,
        );

        await interaction.reply({ embeds: [embed] });
        return;
      }
    }
  }


const data = new SlashCommandBuilder()
  .setName("eco")
  .setDescription("Sistema de economía de Nexo: fondos, trabajos, cosecha y banca")
  .addSubcommand((s) =>
    s
      .setName("bal")
      .setDescription("Consulta el saldo de cartera y banco")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario")),
  )
  .addSubcommand((s) =>
    s
      .setName("perfil")
      .setDescription("Perfil económico, estadísticas y rachas")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario")),
  )
  .addSubcommand((s) => s.setName("work").setDescription("Trabajar en tu oficio del servidor (~30 min)"))
  .addSubcommand((s) => s.setName("extra").setDescription("Realizar horas extra rápidas (~10 min)"))
  .addSubcommand((s) => s.setName("daily").setDescription("Recompensa diaria con intereses bancarios"))
  .addSubcommand((s) => s.setName("weekly").setDescription("Salario semanal acumulable"))
  .addSubcommand((s) =>
    s
      .setName("pescar")
      .setDescription("Pescar en el lago o alta mar")
      .addStringOption((o) => o.setName("cana").setDescription("Caña a equipar").setAutocomplete(true))
      .addStringOption((o) => o.setName("cebo").setDescription("Cebo o red marina a equipar").setAutocomplete(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("cazar")
      .setDescription("Cazar presas salvajes en el bosque")
      .addStringOption((o) => o.setName("arma").setDescription("Arma o rifle a equipar").setAutocomplete(true))
      .addStringOption((o) => o.setName("trampa").setDescription("Trampa o señuelo a equipar").setAutocomplete(true)),
  )
  .addSubcommand((s) => s.setName("mendigar").setDescription("Pedir caridad a la comunidad"))
  .addSubcommand((s) =>
    s
      .setName("pagar")
      .setDescription("Enviar nexocoins a otro usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Destino").setRequired(true))
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Nexocoins").setRequired(true).setMinValue(1)),
  )
  .addSubcommand((s) =>
    s
      .setName("depositar")
      .setDescription("Ingresar dinero en tu cuenta bancaria")
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad a depositar (-1 = todo)").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("retirar")
      .setDescription("Retirar dinero de tu cuenta bancaria")
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Cantidad a retirar (-1 = todo)").setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName("top")
      .setDescription("Rankings de riqueza de nexocoins")
      .addStringOption((o) =>
        o
          .setName("tipo")
          .setDescription("Tipo de clasificación")
          .addChoices(
            { name: "Global (cartera + banco)", value: "global" },
            { name: "Efectivo (cartera)", value: "efectivo" },
            { name: "Banco", value: "banco" },
            { name: "Semanal", value: "semanal" },
          ),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("dar")
      .setDescription("Staff: añadir nexocoins a un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Nexocoins").setRequired(true).setMinValue(1))
      .addStringOption((o) =>
        o.setName("donde").setDescription("Destino").addChoices({ name: "Cartera", value: "wallet" }, { name: "Banco", value: "bank" }),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("quitar")
      .setDescription("Staff: retirar nexocoins a un usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Nexocoins").setRequired(true).setMinValue(1)),
  )
  .addSubcommand((s) =>
    s
      .setName("prestamo")
      .setDescription("Solicitar un préstamo bancario")
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Cuánto pedir (vacío = ver oferta)").setMinValue(50)),
  )
  .addSubcommand((s) =>
    s
      .setName("deuda")
      .setDescription("Consultar o amortizar tu deuda pendiente")
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Cuánto pagar (−1 = todo)").setMinValue(-1)),
  )
  .addSubcommand((s) =>
    s
      .setName("inv")
      .setDescription("Consultar tu inventario o el de otro usuario")
      .addUserOption((o) => o.setName("usuario").setDescription("Usuario")),
  )
  .addSubcommand((s) =>
    s
      .setName("usar")
      .setDescription("Usar un objeto consumible del inventario")
      .addStringOption((o) =>
        o
          .setName("item")
          .setDescription("Objeto")
          .setRequired(true)
          .addChoices(
            { name: "Café ☕", value: "cafe" },
            { name: "Chicle 🍬", value: "chicle" },
            { name: "Pasta Térmica ❄️", value: "pasta_termica" },
            { name: "Cebo 🪱", value: "cebo" },
            { name: "Rifle 🎯", value: "rifle" },
          ),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("plazo-fijo")
      .setDescription("Depósitos bancarios a plazo fijo con intereses garantizados y protegidos de robos")
      .addStringOption((o) =>
        o
          .setName("accion")
          .setDescription("Acción a realizar")
          .setRequired(true)
          .addChoices(
            { name: "📋 Ver mis depósitos y planes de inversión", value: "ver" },
            { name: "💰 Abrir nuevo depósito a plazo fijo", value: "abrir" },
            { name: "💸 Reclamar depósitos vencidos", value: "reclamar" },
          ),
      )
      .addIntegerOption((o) =>
        o.setName("cantidad").setDescription("Cantidad a invertir de tu banco (para abrir)").setMinValue(100),
      )
      .addIntegerOption((o) =>
        o
          .setName("dias")
          .setDescription("Plazo de inversión en días (para abrir)")
          .addChoices(
            { name: "🥉 Bronce: 3 días (+6% de rentabilidad)", value: 3 },
            { name: "🥈 Plata: 7 días (+15% de rentabilidad)", value: 7 },
            { name: "🥇 Oro: 14 días (+35% de rentabilidad)", value: 14 },
            { name: "💎 Platino: 30 días (+80% de rentabilidad)", value: 30 },
          ),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("vender")
      .setDescription("Vender cualquier objeto, captura de pesca, presa de caza o coleccionable")
      .addStringOption((o) => o.setName("item").setDescription("Objeto").setRequired(true).setAutocomplete(true))
      .addIntegerOption((o) => o.setName("cantidad").setDescription("Unidades a vender (−1 = todo)").setMinValue(-1)),
  )
  .addSubcommand((s) =>
    s
      .setName("asalto")
      .setDescription("Organiza o únete a un golpe cooperativo al Banco Central de Nexo"),
  );

const command: Command = {
  data,
  execute,
  autocomplete,
};

export default command;
