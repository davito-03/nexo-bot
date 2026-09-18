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
import { errorEmbed, successEmbed, infoEmbed, baseEmbed } from "../../utils/embeds.js";
import { getEco, saveEco, addWallet, deductFunds, n } from "../../modules/economy/engine.js";
import { COLORS } from "../../constants.js";

const EMPTY = "⬛";
const P1_PIECE = "🔴";
const P2_PIECE = "🟡";
const COLS = 7;
const ROWS = 6;
const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣"];

interface GameState {
  id: string;
  guildId: string;
  p1Id: string;
  p2Id: string;
  bet: number;
  turn: 1 | 2;
  board: number[][]; // 0: empty, 1: p1, 2: p2 (row 0 is top)
  message: Message | null;
  timer: NodeJS.Timeout | null;
  channelId: string;
}

const activeGames = new Map<string, GameState>();

function createEmptyBoard(): number[][] {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

function renderBoard(board: number[][]): string {
  let str = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === 1) str += P1_PIECE;
      else if (board[r][c] === 2) str += P2_PIECE;
      else str += EMPTY;
    }
    str += "\n";
  }
  str += NUMBER_EMOJIS.join("");
  return str;
}

function checkWin(board: number[][], player: 1 | 2): boolean {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (board[r][c] === player && board[r][c+1] === player && board[r][c+2] === player && board[r][c+3] === player) return true;
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      if (board[r][c] === player && board[r+1][c] === player && board[r+2][c] === player && board[r+3][c] === player) return true;
    }
  }
  // Diagonal 1
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (board[r][c] === player && board[r+1][c+1] === player && board[r+2][c+2] === player && board[r+3][c+3] === player) return true;
    }
  }
  // Diagonal 2
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (board[r][c] === player && board[r-1][c+1] === player && board[r-2][c+2] === player && board[r-3][c+3] === player) return true;
    }
  }
  return false;
}

function checkDraw(board: number[][]): boolean {
  return board[0].every(cell => cell !== 0);
}

function getColButtons(gameId: string, board: number[][]): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>();
  const row2 = new ActionRowBuilder<ButtonBuilder>();

  for (let c = 0; c < COLS; c++) {
    const isFull = board[0][c] !== 0;
    const btn = new ButtonBuilder()
      .setCustomId(`c4:col:${gameId}:${c}`)
      .setEmoji(NUMBER_EMOJIS[c])
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isFull);
    
    if (c < 5) row1.addComponents(btn);
    else row2.addComponents(btn);
  }
  return [row1, row2];
}

async function updateGameMessage(game: GameState, client: NexoClient, win: boolean = false, draw: boolean = false, timeout: boolean = false) {
  if (!game.message) return;
  const p1 = client.users.cache.get(game.p1Id) || await client.users.fetch(game.p1Id);
  const p2 = client.users.cache.get(game.p2Id) || await client.users.fetch(game.p2Id);
  
  let desc = renderBoard(game.board) + "\n\n";
  let color: number = COLORS.info;
  let title = "🎮 Conecta 4";
  const components: ActionRowBuilder<ButtonBuilder>[] = [];

  if (timeout) {
    const winnerId = game.turn === 1 ? game.p2Id : game.p1Id;
    const loserId = game.turn === 1 ? game.p1Id : game.p2Id;
    desc += `⏱️ **¡Tiempo agotado para <@${loserId}>!**\n🏆 <@${winnerId}> gana por abandono.`;
    if (game.bet > 0) desc += `\n💰 Ganancia: **+${n(game.bet * 2)}**`;
    color = COLORS.danger;
  } else if (win) {
    const winnerId = game.turn === 1 ? game.p1Id : game.p2Id;
    desc += `🏆 **¡<@${winnerId}> HA GANADO!** 🎉`;
    if (game.bet > 0) desc += `\n💰 Ganancia: **+${n(game.bet * 2)}**`;
    color = COLORS.success;
  } else if (draw) {
    desc += `🤝 **¡ES UN EMPATE!**\nAmbos jugadores han llenado el tablero.`;
    if (game.bet > 0) desc += `\n💸 Se han devuelto las apuestas de **${n(game.bet)}**.`;
    color = COLORS.warn;
  } else {
    const currentId = game.turn === 1 ? game.p1Id : game.p2Id;
    const currentPiece = game.turn === 1 ? P1_PIECE : P2_PIECE;
    desc += `Es el turno de ${currentPiece} <@${currentId}>\nTienes 30 segundos.`;
    components.push(...getColButtons(game.id, game.board));
  }

  const embed = baseEmbed()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color);
    
  if (game.bet > 0) {
    embed.setFooter({ text: `Apuesta: ${n(game.bet)}` });
  }

  await game.message.edit({ embeds: [embed], components });
}

export async function handleConecta4Button(interaction: ButtonInteraction, client: NexoClient) {
  const parts = interaction.customId.split(":");
  const action = parts[1];
  const gameId = parts[2];
  
  if (action === "accept" || action === "reject") {
    const p1Id = parts[3];
    const p2Id = parts[4];
    const bet = parseInt(parts[5]);
    
    if (interaction.user.id !== p2Id) {
      await interaction.reply({ content: "Este desafío no es para ti.", ephemeral: true });
      return;
    }

    if (action === "reject") {
      await interaction.update({ components: [], embeds: [errorEmbed(`Desafío rechazado por <@${p2Id}>.`)] });
      return;
    }

    const guildId = interaction.guildId!;

    // Accept game
    if (bet > 0) {
      let eco1 = getEco(guildId, p1Id);
      let eco2 = getEco(guildId, p2Id);
      if (eco1.wallet < bet || eco2.wallet < bet) {
        await interaction.update({ components: [], embeds: [errorEmbed("Uno de los jugadores ya no tiene suficientes fondos para la apuesta.")] });
        return;
      }
      deductFunds(eco1, bet);
      deductFunds(eco2, bet);
      saveEco(eco1);
      saveEco(eco2);
    }

    const game: GameState = {
      id: gameId,
      guildId,
      p1Id,
      p2Id,
      bet,
      turn: 1,
      board: createEmptyBoard(),
      message: null,
      timer: null,
      channelId: interaction.channelId!
    };
    
    activeGames.set(gameId, game);
    
    // Set first turn timeout
    game.timer = setTimeout(async () => {
      activeGames.delete(gameId);
      if (game.bet > 0) {
        // P2 wins by timeout
        let eco2 = getEco(guildId, p2Id);
        addWallet(eco2, game.bet * 2);
        saveEco(eco2);
      }
      await updateGameMessage(game, client, false, false, true);
    }, 30000);

    await interaction.deferUpdate();
    const msg = await interaction.message.fetch();
    game.message = msg;
    await updateGameMessage(game, client);
    return;
  }

  if (action === "col") {
    const col = parseInt(parts[3]);
    const game = activeGames.get(gameId);
    
    if (!game) {
      await interaction.reply({ content: "Esta partida ya ha terminado o ha expirado.", ephemeral: true });
      return;
    }
    
    const currentId = game.turn === 1 ? game.p1Id : game.p2Id;
    if (interaction.user.id !== currentId) {
      await interaction.reply({ content: "¡No es tu turno!", ephemeral: true });
      return;
    }

    // Find row
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (game.board[r][col] === 0) {
        row = r;
        break;
      }
    }
    
    if (row === -1) {
      await interaction.reply({ content: "Esa columna está llena.", ephemeral: true });
      return;
    }

    game.board[row][col] = game.turn;
    if (game.timer) clearTimeout(game.timer);
    
    const win = checkWin(game.board, game.turn);
    const draw = checkDraw(game.board);
    
    if (win || draw) {
      activeGames.delete(gameId);
      if (win && game.bet > 0) {
        const ecoCurrent = getEco(game.guildId, currentId);
        addWallet(ecoCurrent, game.bet * 2);
        saveEco(ecoCurrent);
      } else if (draw && game.bet > 0) {
        const eco1 = getEco(game.guildId, game.p1Id);
        const eco2 = getEco(game.guildId, game.p2Id);
        addWallet(eco1, game.bet);
        addWallet(eco2, game.bet);
        saveEco(eco1);
        saveEco(eco2);
      }
      await interaction.deferUpdate();
      await updateGameMessage(game, client, win, draw);
      return;
    }
    
    game.turn = game.turn === 1 ? 2 : 1;
    game.timer = setTimeout(async () => {
      activeGames.delete(gameId);
      if (game.bet > 0) {
        const winnerId = game.turn === 1 ? game.p2Id : game.p1Id;
        const ecoWinner = getEco(game.guildId, winnerId);
        addWallet(ecoWinner, game.bet * 2);
        saveEco(ecoWinner);
      }
      await updateGameMessage(game, client, false, false, true);
    }, 30000);
    
    await interaction.deferUpdate();
    await updateGameMessage(game, client);
  }
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("conecta4")
    .setDescription("Juega a Conecta 4 contra otro usuario")
    .addUserOption(o => o.setName("oponente").setDescription("Usuario a desafiar").setRequired(true))
    .addIntegerOption(o => o.setName("apuesta").setDescription("Apuesta en nexocoins (100 - 50000)").setMinValue(100).setMaxValue(50000).setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction, client: NexoClient) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Este comando solo funciona en un servidor.", ephemeral: true });
      return;
    }
    
    const opponent = interaction.options.getUser("oponente", true);
    const bet = interaction.options.getInteger("apuesta") || 0;
    
    if (opponent.bot) {
      await interaction.reply({ embeds: [errorEmbed("No puedes jugar contra un bot.")], ephemeral: true });
      return;
    }
    
    if (opponent.id === interaction.user.id) {
      await interaction.reply({ embeds: [errorEmbed("No puedes jugar contra ti mismo.")], ephemeral: true });
      return;
    }
    
    if (bet > 0) {
      const guildId = interaction.guildId!;
      const p1Eco = getEco(guildId, interaction.user.id);
      const p2Eco = getEco(guildId, opponent.id);
      
      if (p1Eco.wallet < bet) {
        await interaction.reply({ embeds: [errorEmbed(`No tienes suficientes fondos. Necesitas **${n(bet)}** y tienes **${n(p1Eco.wallet)}**.`)], ephemeral: true });
        return;
      }
      if (p2Eco.wallet < bet) {
        await interaction.reply({ embeds: [errorEmbed(`El oponente no tiene suficientes fondos. Necesita **${n(bet)}** y tiene **${n(p2Eco.wallet)}**.`)], ephemeral: true });
        return;
      }
    }
    
    const gameId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`c4:accept:${gameId}:${interaction.user.id}:${opponent.id}:${bet}`).setLabel("Aceptar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`c4:reject:${gameId}:${interaction.user.id}:${opponent.id}:${bet}`).setLabel("Rechazar").setStyle(ButtonStyle.Danger)
    );
    
    let desc = `**${interaction.user.username}** te ha desafiado a una partida de Conecta 4.`;
    if (bet > 0) desc += `\n💰 Apuesta: **${n(bet)}** nexocoins.`;
    desc += `\nTienes 30 segundos para aceptar.`;
    
    const msg = await interaction.reply({
      content: `<@${opponent.id}>`,
      embeds: [infoEmbed(desc).setTitle("🎮 Desafío: Conecta 4")],
      components: [row],
      fetchReply: true
    });
    
    // Fallback if opponent doesn't respond
    setTimeout(async () => {
      if (!activeGames.has(gameId)) {
        try {
          await msg.edit({ components: [], embeds: [errorEmbed(`El desafío de Conecta 4 a <@${opponent.id}> ha expirado.`)] });
        } catch {}
      }
    }, 30000);
  }
};
export default command;
