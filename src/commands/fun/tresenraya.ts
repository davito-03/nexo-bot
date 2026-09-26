import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Message,
  ComponentType,
} from "discord.js";
import type { Command } from "../../types/index.js";
import type { NexoClient } from "../../client.js";
import { errorEmbed, successEmbed, baseEmbed, ephemeral } from "../../utils/embeds.js";
import { getEco, saveEco, addWallet, deductFunds, n } from "../../modules/economy/engine.js";
import { COLORS } from "../../constants.js";

interface TttGame {
  id: string;
  guildId: string;
  channelId: string;
  p1Id: string;
  p2Id: string;
  bet: number;
  turn: 1 | 2; // 1 = p1 (❌), 2 = p2 (⭕)
  board: (0 | 1 | 2)[]; // 9 cells: 0 empty, 1 X, 2 O
  message: Message | null;
  timer: NodeJS.Timeout | null;
}

const activeGames = new Map<string, TttGame>();

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
  [0, 4, 8], [2, 4, 6],           // Diagonales
];

function checkWinner(board: (0 | 1 | 2)[]): { winner: 1 | 2; combo: number[] } | null {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as 1 | 2, combo };
    }
  }
  return null;
}

function checkDraw(board: (0 | 1 | 2)[]): boolean {
  return board.every((cell) => cell !== 0);
}

function renderButtons(game: TttGame, disabledAll = false): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const val = game.board[idx];

      let label = " ";
      let style = ButtonStyle.Secondary;
      let disabled = disabledAll || val !== 0;

      if (val === 1) {
        label = "❌";
        style = ButtonStyle.Danger;
      } else if (val === 2) {
        label = "⭕";
        style = ButtonStyle.Primary;
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt:move:${game.id}:${idx}`)
          .setLabel(label)
          .setStyle(style)
          .setDisabled(disabled),
      );
    }
    rows.push(row);
  }
  return rows;
}

function clearGame(gameId: string): void {
  const g = activeGames.get(gameId);
  if (g?.timer) clearTimeout(g.timer);
  activeGames.delete(gameId);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("tresenraya")
    .setDescription("Juega una partida de Tres en Raya (Tic-Tac-Toe) contra otro usuario con apuesta opcional")
    .addUserOption((o) => o.setName("rival").setDescription("Usuario al que retas").setRequired(true))
    .addIntegerOption((o) => o.setName("apuesta").setDescription("Cantidad de NexoCoins a apostar").setMinValue(1)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.inCachedGuild()) {
      await interaction.reply(ephemeral([errorEmbed("Solo en servidores")]));
      return;
    }

    const rival = interaction.options.getUser("rival", true);
    const bet = interaction.options.getInteger("apuesta") ?? 0;
    const author = interaction.user;

    if (rival.id === author.id) {
      await interaction.reply(ephemeral([errorEmbed("No puedes retarte a ti mismo")]));
      return;
    }
    if (rival.bot) {
      await interaction.reply(ephemeral([errorEmbed("No puedes jugar contra un bot")]));
      return;
    }

    // Verificar saldo si hay apuesta
    if (bet > 0) {
      const p1Eco = getEco(interaction.guildId, author.id);
      if (p1Eco.wallet < bet) {
        await interaction.reply(
          ephemeral([errorEmbed("Saldo insuficiente", `No tienes **${n(bet)}** en tu cartera para realizar la apuesta.`)]),
        );
        return;
      }

      const p2Eco = getEco(interaction.guildId, rival.id);
      if (p2Eco.wallet < bet) {
        await interaction.reply(
          ephemeral([errorEmbed("El rival no tiene saldo", `<@${rival.id}> no tiene **${n(bet)}** para aceptar esta apuesta.`)]),
        );
        return;
      }

      // Cobrar apuesta preventiva al anfitrión
      deductFunds(p1Eco, bet);
      saveEco(p1Eco);
    }

    const gameId = `${interaction.id}`;
    const acceptBtnId = `ttt:accept:${gameId}`;
    const declineBtnId = `ttt:decline:${gameId}`;

    const challengeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(acceptBtnId).setLabel("Aceptar reto").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(declineBtnId).setLabel("Rechazar").setStyle(ButtonStyle.Danger),
    );

    const challengeEmbed = baseEmbed(COLORS.primary)
      .setTitle("🎮 Reto de Tres en Raya (Tic-Tac-Toe)")
      .setDescription(
        `Hey <@${rival.id}>, ¡**${author.username}** te ha retado a una partida de **Tres en Raya**!\n\n` +
          (bet > 0 ? `💰 **Apuesta en juego:** **${n(bet)}** por jugador (Total bote: **${n(bet * 2)}**)\n` : "") +
          `⏱️ Tienes 60 segundos para responder.`,
      );

    await interaction.reply({
      content: `<@${rival.id}>`,
      embeds: [challengeEmbed],
      components: [challengeRow],
    });

    const replyMsg = await interaction.fetchReply();

    // Esperar respuesta del rival
    try {
      const response = await replyMsg.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => [acceptBtnId, declineBtnId].includes(i.customId) && i.user.id === rival.id,
        time: 60_000,
      });

      if (response.customId === declineBtnId) {
        if (bet > 0) {
          const p1Eco = getEco(interaction.guildId, author.id);
          addWallet(p1Eco, bet);
          saveEco(p1Eco);
        }
        await response.update({
          content: null,
          embeds: [baseEmbed(COLORS.danger).setTitle("❌ Reto rechazado").setDescription(`<@${rival.id}> ha rechazado el reto.`)],
          components: [],
        });
        return;
      }

      // Aceptó el reto
      if (bet > 0) {
        const p2Eco = getEco(interaction.guildId, rival.id);
        if (p2Eco.wallet < bet) {
          const p1Eco = getEco(interaction.guildId, author.id);
          addWallet(p1Eco, bet);
          saveEco(p1Eco);
          await response.update({
            content: null,
            embeds: [errorEmbed("Saldo insuficiente", `<@${rival.id}> ya no tiene suficientes monedas para la apuesta.`)],
            components: [],
          });
          return;
        }
        deductFunds(p2Eco, bet);
        saveEco(p2Eco);
      }

      const game: TttGame = {
        id: gameId,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        p1Id: author.id,
        p2Id: rival.id,
        bet,
        turn: 1,
        board: Array(9).fill(0),
        message: replyMsg,
        timer: null,
      };

      activeGames.set(gameId, game);

      const renderGameEmbed = (statusText: string, color: number = COLORS.primary) =>
        baseEmbed(color)
          .setTitle("🎮 Tres en Raya (Tic-Tac-Toe)")
          .setDescription(
            `❌ **Jugador 1:** <@${author.id}>\n` +
              `⭕ **Jugador 2:** <@${rival.id}>\n\n` +
              (bet > 0 ? `💰 **Bote en juego:** **${n(bet * 2)}**\n\n` : "") +
              statusText,
          )
          .setFooter({ text: "Pulsa una casilla vacía en tu turno" });

      const setTurnTimer = () => {
        if (game.timer) clearTimeout(game.timer);
        game.timer = setTimeout(async () => {
          const loserId = game.turn === 1 ? game.p1Id : game.p2Id;
          const winnerId = game.turn === 1 ? game.p2Id : game.p1Id;
          clearGame(gameId);

          if (bet > 0) {
            const winEco = getEco(game.guildId, winnerId);
            addWallet(winEco, bet * 2);
            saveEco(winEco);
          }

          await replyMsg
            .edit({
              content: null,
              embeds: [
                renderGameEmbed(
                  `⏱️ **¡Tiempo agotado para <@${loserId}>!**\n🏆 <@${winnerId}> gana por abandono.${bet > 0 ? `\n💰 Premio: **+${n(bet * 2)}**` : ""}`,
                  COLORS.danger,
                ),
              ],
              components: renderButtons(game, true),
            })
            .catch(() => null);
        }, 60_000);
      };

      setTurnTimer();

      await response.update({
        content: null,
        embeds: [renderGameEmbed(`👉 Turno de: <@${author.id}> (❌)`)],
        components: renderButtons(game),
      });

      // Collector de movimientos
      const moveCollector = replyMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.customId.startsWith(`ttt:move:${gameId}:`),
        time: 15 * 60_000,
      });

      moveCollector.on("collect", async (btnInteraction: ButtonInteraction) => {
        const active = activeGames.get(gameId);
        if (!active) {
          await btnInteraction.reply(ephemeral([errorEmbed("Partida finalizada")]));
          return;
        }

        const expectedUser = active.turn === 1 ? active.p1Id : active.p2Id;
        if (btnInteraction.user.id !== expectedUser) {
          await btnInteraction.reply(
            ephemeral([
              errorEmbed(
                "No es tu turno",
                btnInteraction.user.id === active.p1Id || btnInteraction.user.id === active.p2Id
                  ? "Espera a que tu rival haga su movimiento."
                  : "Esta partida no es tuya.",
              ),
            ]),
          );
          return;
        }

        const idx = parseInt(btnInteraction.customId.split(":")[3]!, 10);
        if (active.board[idx] !== 0) {
          await btnInteraction.reply(ephemeral([errorEmbed("Casilla ocupada", "Elige una casilla vacía.")]));
          return;
        }

        // Marcar casilla
        active.board[idx] = active.turn;

        // Comprobar victoria
        const winResult = checkWinner(active.board);
        if (winResult) {
          clearGame(gameId);
          moveCollector.stop("win");

          const winnerId = winResult.winner === 1 ? active.p1Id : active.p2Id;
          const loserId = winResult.winner === 1 ? active.p2Id : active.p1Id;

          if (bet > 0) {
            const winEco = getEco(active.guildId, winnerId);
            addWallet(winEco, bet * 2);
            saveEco(winEco);
          }

          await btnInteraction.update({
            embeds: [
              renderGameEmbed(
                `🎉 **¡<@${winnerId}> HA GANADO LA PARTIDA!** 🏆\n` +
                  (bet > 0 ? `💰 Premio cobrado: **+${n(bet * 2)}** (Ganancia neta: **+${n(bet)}**)` : ""),
                COLORS.success,
              ),
            ],
            components: renderButtons(active, true),
          });
          return;
        }

        // Comprobar empate
        if (checkDraw(active.board)) {
          clearGame(gameId);
          moveCollector.stop("draw");

          if (bet > 0) {
            const p1Eco = getEco(active.guildId, active.p1Id);
            const p2Eco = getEco(active.guildId, active.p2Id);
            addWallet(p1Eco, bet);
            addWallet(p2Eco, bet);
            saveEco(p1Eco);
            saveEco(p2Eco);
          }

          await btnInteraction.update({
            embeds: [
              renderGameEmbed(
                `🤝 **¡Tablas! La partida ha terminado en empate.**\n${bet > 0 ? "Las apuestas han sido reembolsadas a ambos jugadores." : ""}`,
                COLORS.warn,
              ),
            ],
            components: renderButtons(active, true),
          });
          return;
        }

        // Cambiar turno
        active.turn = active.turn === 1 ? 2 : 1;
        const nextUser = active.turn === 1 ? active.p1Id : active.p2Id;
        const nextSymbol = active.turn === 1 ? "❌" : "⭕";
        setTurnTimer();

        await btnInteraction.update({
          embeds: [renderGameEmbed(`👉 Turno de: <@${nextUser}> (${nextSymbol})`)],
          components: renderButtons(active),
        });
      });

      moveCollector.on("end", () => {
        clearGame(gameId);
      });
    } catch {
      // Timeout del reto
      if (bet > 0) {
        const p1Eco = getEco(interaction.guildId, author.id);
        addWallet(p1Eco, bet);
        saveEco(p1Eco);
      }
      await replyMsg
        .edit({
          content: null,
          embeds: [baseEmbed(COLORS.danger).setTitle("⏱️ Reto expirado").setDescription(`<@${rival.id}> no respondió a tiempo.`)],
          components: [],
        })
        .catch(() => null);
    }
  },
};

export default command;
