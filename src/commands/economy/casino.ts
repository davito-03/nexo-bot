import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { casinoEmbed, errorEmbed, ephemeral, onlyGuild } from "../../utils/embeds.js";
import { COLORS } from "../../constants.js";
import {
  CD,
  addWallet,
  cdCheck,
  chance,
  getEco,
  jailCheck,
  n,
  rng,
  saveEco,
  takeItem,
} from "../../modules/economy/engine.js";
import {
  startDuel,
  startGlobo,
  startJackpot,
  startRace,
  startRoulette,
  startRussianRouletteHouse,
  startRussianRouletteDuel,
} from "../../modules/economy/tables.js";
import { collectLoan } from "../../modules/economy/loans.js";
import { getJackpot, feedJackpot, winJackpot } from "../../modules/economy/jackpot.js";
import { checkUserAchievements } from "../../modules/economy/achievements.js";
import type { Command } from "../../types/index.js";

const casinoCd = new Map<string, number>();

function casinoWait(uid: string): string | null {
  return cdCheck(casinoCd.get(uid) ?? 0, CD.casino);
}

function touchCasino(uid: string): void {
  casinoCd.set(uid, Date.now());
}

function takeBet(interaction: ChatInputCommandInteraction): number {
  return interaction.options.getInteger("apuesta", true);
}

const SLOTS = ["🐱", "🌸", "⭐", "💎", "🍒", "🍋", "7️⃣"];

interface BjGame {
  id: string;
  userId: string;
  guildId: string;
  bet: number;
  hands: { cards: number[]; done: boolean }[];
  activeHand: number;
  dealer: number[];
  amuleto: boolean;
}

const bjGames = new Map<string, BjGame>();

function draw(): number {
  const v = rng(1, 13);
  return Math.min(v, 10);
}

function total(hand: number[]): number {
  let s = hand.reduce((a, b) => a + b, 0);
  // aces as 1 already (draw 1). Fine for simple blackjack
  if (hand.includes(1) && s + 10 <= 21) s += 10;
  return s;
}

function handStr(hand: number[]): string {
  return `${hand.join(" + ")} = **${total(hand)}**`;
}

function bjCanSplit(game: BjGame): boolean {
  const hand = game.hands[0];
  return game.hands.length === 1 && !hand?.done && hand.cards.length === 2 && hand.cards[0] === hand.cards[1];
}

function bjDescription(game: BjGame): string {
  const hands = game.hands
    .map((hand, index) => {
      const marker = index === game.activeHand && game.hands.length > 1 ? " ◀️ **Tu turno**" : "";
      return game.hands.length > 1
        ? `Mano ${index + 1}: ${handStr(hand.cards)}${marker}`
        : `Tu mano: ${handStr(hand.cards)}`;
    })
    .join("\n");
  const splitInfo = bjCanSplit(game)
    ? "\n\n🪓 **Split disponible:** como tus dos cartas tienen el mismo valor, puedes separarlas en dos manos. Se añade otra apuesta igual y juegas cada mano por separado."
    : "";
  return `${hands}\nDealer: **${game.dealer[0]}** + ?\nApuesta por mano: ${n(game.bet)}${splitInfo}`;
}

function bjButtons(game: BjGame): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`bj:${game.id}:hit`).setLabel("Pedir").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bj:${game.id}:stand`).setLabel("Plantarse").setStyle(ButtonStyle.Secondary),
  );
  if (bjCanSplit(game)) {
    row.addComponents(
      new ButtonBuilder().setCustomId(`bj:${game.id}:split`).setLabel("Split (apuesta x2)").setStyle(ButtonStyle.Success),
    );
  }
  return row;
}

function chargeBlackjackSplit(game: BjGame): string | null {
  const me = getEco(game.guildId, game.userId);
  collectLoan(me);
  const jail = jailCheck(me);
  if (jail) return jail;
  if (me.wallet < game.bet) return `Necesitas ${n(game.bet)} adicionales para hacer split. Tienes ${n(me.wallet)}.`;
  addWallet(me, -game.bet);
  saveEco(me);
  return null;
}


async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply(onlyGuild());
      return;
    }
    collectLoan(getEco(interaction.guild.id, interaction.user.id));
    const sub = interaction.options.getSubcommand(false) ?? interaction.commandName.replace(/^casino-/, "");
    const secs = interaction.options.getInteger("segundos") ?? 35;
    if (sub === "rusa-casa") return startRussianRouletteHouse(interaction, interaction.options.getInteger("apuesta", true));
    if (sub === "rusa-duelo") {
      const rival = interaction.options.getUser("rival", true);
      if (rival.bot) {
        await interaction.reply(ephemeral([errorEmbed("Elige a una persona, no a un bot")]));
        return;
      }
      return startRussianRouletteDuel(interaction, rival.id, interaction.options.getInteger("apuesta", true));
    }
    if (sub === "mesa") return startRoulette(interaction, secs);
    if (sub === "carrera") return startRace(interaction, secs);
    if (sub === "globo") return startGlobo(interaction, secs);
    if (sub === "bote") return startJackpot(interaction, secs);
    if (sub === "duelo") {
      const rival = interaction.options.getUser("rival", true);
      if (rival.bot) {
        await interaction.reply(ephemeral([errorEmbed("Elige a una persona, no a un bot")]));
        return;
      }
      return startDuel(interaction, rival.id, interaction.options.getInteger("apuesta", true));
    }
    if (sub === "jackpot-global") {
      const jp = getJackpot(interaction.guild.id);
      const embed = casinoEmbed("🎰 Bote Progresivo Global Nexo")
        .setColor(COLORS.eco)
        .setDescription(
          `# 💰 Bote Acumulado: **${n(jp.amount)}**\n\n` +
            `Cada apuesta realizada en el casino añade automáticamente un **1%** a este bote progresivo.\n\n` +
            `🎯 **¿Cómo llevarse el bote?**\n` +
            `Juega a las tragaperras con \`/casino slots\` y saca una línea de tres diamantes (**💎 💎 💎**) o tres sietes (**7️⃣ 7️⃣ 7️⃣**).\n\n` +
            (jp.lastWinnerId
              ? `🏆 **Último Ganador:** <@${jp.lastWinnerId}> (\`${jp.lastWinnerTag}\`)\n` +
                `💵 **Premio llevado:** ${n(jp.lastWonAmount)}\n` +
                `🕒 **Fecha:** <t:${Math.floor(jp.lastWonAt / 1000)}:R>`
              : `🏆 **Último Ganador:** *¡Todavía nadie se lo ha llevado! Sé el primer afortunado.*`),
        );
      await interaction.reply({ embeds: [embed] });
      return;
    }
    const wait = casinoWait(interaction.user.id);
    if (wait) {
      await interaction.reply(ephemeral([errorEmbed("Espera un momento", wait)]));
      return;
    }
    const me = getEco(interaction.guild.id, interaction.user.id);
    const jail = jailCheck(me);
    if (jail) {
      await interaction.reply(ephemeral([errorEmbed("Calabozo", jail)]));
      return;
    }
    const bet = takeBet(interaction);
    if (me.wallet < bet) {
      await interaction.reply(ephemeral([errorEmbed("Sin fondos", `Tienes ${n(me.wallet)}`)]));
      return;
    }
    const lucky = takeItem(me, "amuleto");
    touchCasino(interaction.user.id);
    feedJackpot(interaction.guild.id, bet);

    if (sub === "coinflip") {
      const lado = interaction.options.getString("lado", true);
      const roll = chance(50 + (lucky ? 6 : 0)) ? lado : lado === "cara" ? "cruz" : "cara";
      const win = roll === lado;
      addWallet(me, win ? bet : -bet);
      saveEco(me);
      await interaction.reply({
        embeds: [
          casinoEmbed("Coinflip")
            .setColor(win ? COLORS.success : COLORS.danger)
            .setDescription(`Ha salido **${roll}**. ${win ? `Ganas ${n(bet)}` : `Pierdes ${n(bet)}`}.\nCartera ${n(me.wallet)}`),
        ],
      });
      return;
    }

    if (sub === "slots") {
      const a = SLOTS[rng(0, SLOTS.length - 1)]!;
      const b = SLOTS[rng(0, SLOTS.length - 1)]!;
      const c = SLOTS[rng(0, SLOTS.length - 1)]!;
      let mult = 0;
      let wonJackpot = 0;
      if (a === b && b === c) {
        mult = a === "7️⃣" ? 12 : a === "💎" ? 8 : 5;
        if (a === "7️⃣" || a === "💎") {
          wonJackpot = winJackpot(interaction.guild.id, interaction.user.id, interaction.user.tag);
        }
      } else if (a === b || b === c || a === c) mult = 1.6;
      if (lucky && mult > 0) mult *= 1.12;
      const delta = mult > 0 ? Math.floor(bet * mult) - bet : -bet;
      addWallet(me, delta);
      saveEco(me);
      checkUserAchievements(interaction.guild.id, interaction.user.id);

      let desc = `**${a} ${b} ${c}**\n${mult > 0 ? `Premio ${n(delta + bet)}` : `Pierdes ${n(bet)}`}\nCartera ${n(me.wallet)}`;
      if (wonJackpot > 0) {
        desc = `🎰💥 **¡¡¡JACKPOT GLOBAL PROGRESIVO!!!** 💥🎰\n**${a} ${b} ${c}**\n🎉 ¡Te llevas el bote acumulado de **${n(wonJackpot)}**!\nPremio de tirada: +${n(delta + bet)}\nCartera ${n(me.wallet)}`;
      }

      await interaction.reply({
        embeds: [
          casinoEmbed("Slots")
            .setColor(wonJackpot > 0 ? COLORS.eco : mult > 0 ? COLORS.success : COLORS.danger)
            .setDescription(desc),
        ],
      });
      return;
    }

    if (sub === "ruleta") {
      const color = interaction.options.getString("color", true);
      const spin = rng(0, 14); // 0 verde, 1-7 rojo, 8-14 negro
      const landed = spin === 0 ? "verde" : spin <= 7 ? "rojo" : "negro";
      let mult = 0;
      if (color === landed) mult = landed === "verde" ? 14 : 2;
      if (lucky && mult) mult *= 1.12;
      const delta = mult ? Math.floor(bet * mult) - bet : -bet;
      addWallet(me, delta);
      saveEco(me);
      await interaction.reply({
        embeds: [
          casinoEmbed("Ruleta")
            .setColor(mult ? COLORS.success : COLORS.danger)
            .setDescription(`Bola en **${landed}**. ${mult ? `Ganas ${n(delta + bet)}` : `Pierdes ${n(bet)}`}.\nCartera ${n(me.wallet)}`),
        ],
      });
      return;
    }

    if (sub === "dados") {
      const die = rng(1, 6);
      const win = die >= 4;
      const payout = win ? Math.floor(bet * (lucky ? 1.12 : 1)) : -bet;
      addWallet(me, win ? payout : -bet);
      saveEco(me);
      await interaction.reply({
        embeds: [
          casinoEmbed("Dados")
            .setColor(win ? COLORS.success : COLORS.danger)
            .setDescription(`Ha salido **${die}**. ${win ? `Ganas ${n(payout)}` : `Pierdes ${n(bet)}`}.\nCartera ${n(me.wallet)}`),
        ],
      });
      return;
    }

    if (sub === "blackjack") {
      addWallet(me, -bet);
      saveEco(me);
      const id = `${interaction.id}`;
      const game: BjGame = {
        id,
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        bet,
        hands: [{ cards: [draw(), draw()], done: false }],
        activeHand: 0,
        dealer: [draw(), draw()],
        amuleto: lucky,
      };
      bjGames.set(id, game);
      setTimeout(() => {
        const active = bjGames.get(id);
        if (!active) return;
        bjGames.delete(id);
        const expired = getEco(active.guildId, active.userId);
        addWallet(expired, active.hands.length * active.bet);
        saveEco(expired);
      }, 120_000);
      await interaction.reply({
        embeds: [casinoEmbed("Blackjack").setDescription(bjDescription(game))],
        components: [bjButtons(game)],
      });
      return;
    }

    if (sub === "rps") {
      const pick = interaction.options.getString("jugada", true);
      const opts = ["piedra", "papel", "tijera"] as const;
      const bot = opts[rng(0, 2)]!;
      const win =
        pick === bot
          ? "push"
          : (pick === "piedra" && bot === "tijera") || (pick === "papel" && bot === "piedra") || (pick === "tijera" && bot === "papel")
            ? "win"
            : "lose";
      if (win === "win") addWallet(me, lucky ? Math.floor(bet * 1.12) : bet);
      else if (win === "lose") addWallet(me, -bet);
      saveEco(me);
      await interaction.reply({
        embeds: [
          casinoEmbed("RPS")
            .setColor(win === "win" ? COLORS.success : win === "lose" ? COLORS.danger : COLORS.warn)
            .setDescription(`Tú **${pick}** vs Neko **${bot}**.\n${win === "push" ? "Empate." : win === "win" ? `Ganas ${n(bet)}` : `Pierdes ${n(bet)}`}\nCartera ${n(me.wallet)}`),
        ],
      });
      return;
    }

    if (sub === "mayor") {
      const first = rng(1, 13);
      const second = rng(1, 13);
      const win = second > first;
      addWallet(me, win ? (lucky ? Math.floor(bet * 1.12) : bet) : -bet);
      saveEco(me);
      await interaction.reply({
        embeds: [
          casinoEmbed("¿Mayor?")
            .setColor(win ? COLORS.success : COLORS.danger)
            .setDescription(`Primera **${first}** → segunda **${second}**.\n${win ? `Ganas ${n(bet)}` : `Pierdes ${n(bet)}`}\nCartera ${n(me.wallet)}`),
        ],
      });
    }
}

async function finishBlackjack(interaction: ButtonInteraction, id: string, game: BjGame): Promise<void> {
  while (total(game.dealer) < 17) game.dealer.push(draw());
  const dealerTotal = total(game.dealer);
  const me = getEco(game.guildId, game.userId);
  let returned = 0;
  const lines: string[] = [];

  for (const [index, hand] of game.hands.entries()) {
    const playerTotal = total(hand.cards);
    if (playerTotal > 21) {
      lines.push(`**Mano ${index + 1}:** ${handStr(hand.cards)} · Pierdes ${n(game.bet)}.`);
      continue;
    }
    if (dealerTotal > 21 || playerTotal > dealerTotal) {
      const payout = Math.floor(game.bet * (game.amuleto ? 2.2 : 2));
      returned += payout;
      lines.push(`**Mano ${index + 1}:** ${handStr(hand.cards)} · Ganas ${n(payout)}.`);
    } else if (playerTotal === dealerTotal) {
      returned += game.bet;
      lines.push(`**Mano ${index + 1}:** ${handStr(hand.cards)} · Empate, recuperas ${n(game.bet)}.`);
    } else {
      lines.push(`**Mano ${index + 1}:** ${handStr(hand.cards)} · Pierdes ${n(game.bet)}.`);
    }
  }

  if (returned) addWallet(me, returned);
  saveEco(me);
  bjGames.delete(id);
  await interaction.update({
    embeds: [
      casinoEmbed("Blackjack · resultado")
        .setColor(returned > game.hands.length * game.bet ? COLORS.success : returned ? COLORS.warn : COLORS.danger)
        .setDescription(`${lines.join("\n")}\n\nDealer: ${handStr(game.dealer)}\nRetorno total: **${n(returned)}**\nCartera: **${n(me.wallet)}**`),
    ],
    components: [],
  });
}

async function advanceBlackjack(interaction: ButtonInteraction, id: string, game: BjGame): Promise<void> {
  if (game.activeHand < game.hands.length - 1) {
    game.activeHand += 1;
    await interaction.update({
      embeds: [casinoEmbed("Blackjack").setDescription(bjDescription(game))],
      components: [bjButtons(game)],
    });
    return;
  }
  await finishBlackjack(interaction, id, game);
}

export async function handleBlackjack(interaction: ButtonInteraction): Promise<void> {
  const [, id, action] = interaction.customId.split(":");
  const game = bjGames.get(id!);
  if (!game) {
    await interaction.reply(ephemeral([errorEmbed("Partida caducada", "Esta mano ya no existe.")]));
    return;
  }
  if (interaction.user.id !== game.userId) {
    await interaction.reply(ephemeral([errorEmbed("No es tu partida")]));
    return;
  }
  if (action === "split") {
    if (!bjCanSplit(game)) {
      await interaction.reply(ephemeral([errorEmbed("Split no disponible", "Solo puedes dividir la mano inicial cuando las dos cartas tienen el mismo valor.")]));
      return;
    }
    const err = chargeBlackjackSplit(game);
    if (err) {
      await interaction.reply(ephemeral([errorEmbed("No puedes hacer split", err)]));
      return;
    }
    const original = game.hands[0]!.cards;
    game.hands = [
      { cards: [original[0]!, draw()], done: false },
      { cards: [original[1]!, draw()], done: false },
    ];
    game.activeHand = 0;
    await interaction.update({
      embeds: [casinoEmbed("Blackjack · Split").setDescription(bjDescription(game))],
      components: [bjButtons(game)],
    });
    return;
  }

  const hand = game.hands[game.activeHand]!;
  if (action === "hit") {
    hand.cards.push(draw());
    if (total(hand.cards) > 21) {
      hand.done = true;
      await advanceBlackjack(interaction, id!, game);
      return;
    }
    await interaction.update({
      embeds: [casinoEmbed("Blackjack").setDescription(bjDescription(game))],
      components: [bjButtons(game)],
    });
    return;
  }
  if (action === "stand") {
    hand.done = true;
    await advanceBlackjack(interaction, id!, game);
  }
}


const data = new SlashCommandBuilder()
  .setName("casino")
  .setDescription("Juegos de azar, apuestas y salas multijugador")
  .addSubcommand((s) =>
    s
      .setName("coinflip")
      .setDescription("Cara o cruz")
      .addIntegerOption((o) => o.setName("apuesta").setDescription("nexocoin").setRequired(true).setMinValue(10))
      .addStringOption((o) =>
        o.setName("lado").setDescription("Tu lado").setRequired(true).addChoices({ name: "cara", value: "cara" }, { name: "cruz", value: "cruz" }),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("slots")
      .setDescription("Tragaperras gatunas")
      .addIntegerOption((o) => o.setName("apuesta").setDescription("nexocoin").setRequired(true).setMinValue(10)),
  )
  .addSubcommand((s) =>
    s
      .setName("ruleta")
      .setDescription("Rojo / negro / verde")
      .addIntegerOption((o) => o.setName("apuesta").setDescription("nexocoin").setRequired(true).setMinValue(10))
      .addStringOption((o) =>
        o
          .setName("color")
          .setDescription("Color")
          .setRequired(true)
          .addChoices(
            { name: "rojo x2", value: "rojo" },
            { name: "negro x2", value: "negro" },
            { name: "verde x14", value: "verde" },
          ),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("dados")
      .setDescription("Apuesta a que el dado saca 4, 5 o 6")
      .addIntegerOption((o) => o.setName("apuesta").setDescription("nexocoin").setRequired(true).setMinValue(10)),
  )
  .addSubcommand((s) =>
    s
      .setName("blackjack")
      .setDescription("21 contra Neko; permite split con dos cartas iguales")
      .addIntegerOption((o) => o.setName("apuesta").setDescription("nexocoin").setRequired(true).setMinValue(10)),
  )
  .addSubcommand((s) =>
    s
      .setName("rusa-casa")
      .setDescription("Ruleta rusa contra la casa: dispara o cobra antes de la bala")
      .addIntegerOption((o) => o.setName("apuesta").setDescription("nexocoin").setRequired(true).setMinValue(10)),
  )
  .addSubcommand((s) =>
    s
      .setName("rusa-duelo")
      .setDescription("Reta a otro jugador a una ruleta rusa por turnos")
      .addUserOption((o) => o.setName("rival").setDescription("Jugador retado").setRequired(true))
      .addIntegerOption((o) => o.setName("apuesta").setDescription("nexocoin por jugador").setRequired(true).setMinValue(10)),
  )
  .addSubcommand((s) =>
    s
      .setName("rps")
      .setDescription("Piedra, papel o tijera por nexocoin")
      .addIntegerOption((o) => o.setName("apuesta").setDescription("nexocoin").setRequired(true).setMinValue(10))
      .addStringOption((o) =>
        o
          .setName("jugada")
          .setDescription("Tu jugada")
          .setRequired(true)
          .addChoices(
            { name: "piedra", value: "piedra" },
            { name: "papel", value: "papel" },
            { name: "tijera", value: "tijera" },
          ),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName("mayor")
      .setDescription("¿La siguiente carta es mayor?")
      .addIntegerOption((o) => o.setName("apuesta").setDescription("nexocoin").setRequired(true).setMinValue(10)),
  )
  .addSubcommand((s) =>
    s
      .setName("mesa")
      .setDescription("Ruleta multijugador en el canal")
      .addIntegerOption((o) => o.setName("segundos").setDescription("Tiempo para apostar (15-90)").setMinValue(15).setMaxValue(90)),
  )
  .addSubcommand((s) =>
    s
      .setName("carrera")
      .setDescription("Carrera de caballos multijugador")
      .addIntegerOption((o) => o.setName("segundos").setDescription("Tiempo para apostar (15-90)").setMinValue(15).setMaxValue(90)),
  )
  .addSubcommand((s) =>
    s
      .setName("duelo")
      .setDescription("Cara o cruz contra otro usuario")
      .addUserOption((o) => o.setName("rival").setDescription("A quién retas").setRequired(true))
      .addIntegerOption((o) => o.setName("apuesta").setDescription("nexocoin").setRequired(true).setMinValue(10)),
  )
  .addSubcommand((s) =>
    s
      .setName("globo")
      .setDescription("Crash compartido: entra y salta antes de que explote")
      .addIntegerOption((o) => o.setName("segundos").setDescription("Tiempo para entrar (15-60)").setMinValue(15).setMaxValue(60)),
  )
  .addSubcommand((s) =>
    s
      .setName("bote")
      .setDescription("Jackpot de sala: todos meten fichas y uno se lleva el bote")
      .addIntegerOption((o) => o.setName("segundos").setDescription("Tiempo para entrar (15-90)").setMinValue(15).setMaxValue(90)),
  )
  .addSubcommand((s) =>
    s
      .setName("jackpot-global")
      .setDescription("Consulta el Jackpot Global Progresivo acumulado del casino"),
  );

const command: Command = { data, execute };
export default command;
