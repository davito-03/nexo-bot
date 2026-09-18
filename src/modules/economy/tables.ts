import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Message,
  type ModalSubmitInteraction,
} from "discord.js";
import { COLORS, GLOBO_BLESSED_USERS } from "../../constants.js";

import { casinoEmbed, errorEmbed, ephemeral, successEmbed } from "../../utils/embeds.js";
import { addWallet, getEco, jailCheck, n, rng, saveEco } from "./engine.js";
import { collectLoan } from "./loans.js";

type ColorBet = "rojo" | "negro" | "verde";

interface RouletteTable {
  kind: "roulette";
  id: string;
  guildId: string;
  channelId: string;
  hostId: string;
  message: Message;
  bets: Map<string, { color: ColorBet; amount: number; tag: string }>;
  closesAt: number;
  closed: boolean;
}

interface HorseTable {
  kind: "horse";
  id: string;
  guildId: string;
  channelId: string;
  hostId: string;
  message: Message;
  bets: Map<string, { horse: number; amount: number; tag: string }>;
  closesAt: number;
  closed: boolean;
}

interface GloboTable {
  kind: "globo";
  id: string;
  guildId: string;
  channelId: string;
  hostId: string;
  message: Message;
  players: Map<string, { amount: number; tag: string; cashed?: number }>;
  closesAt: number;
  phase: "join" | "fly" | "done";
  crashAt: number;
  mult: number;
}

interface JackpotTable {
  kind: "jackpot";
  id: string;
  guildId: string;
  channelId: string;
  hostId: string;
  message: Message;
  players: Map<string, { amount: number; tag: string }>;
  closesAt: number;
  closed: boolean;
}

interface Duel {
  kind: "duel";
  id: string;
  guildId: string;
  hostId: string;
  hostTag: string;
  rivalId: string;
  amount: number;
}

interface RussianHouseGame {
  kind: "russian-house";
  id: string;
  guildId: string;
  userId: string;
  tag: string;
  message: Message;
  amount: number;
  chamber: number;
  bulletAt: number;
  multiplier: number;
}

interface RussianPlayerDuel {
  kind: "russian-player";
  id: string;
  guildId: string;
  hostId: string;
  hostTag: string;
  rivalId: string;
  rivalTag?: string;
  message: Message;
  amount: number;
  chamber: number;
  bulletAt: number;
  accepted: boolean;
  turn: "host" | "rival";
}

type Table = RouletteTable | HorseTable | GloboTable | JackpotTable;

const tables = new Map<string, Table>();
const channelBusy = new Map<string, string>();
const duels = new Map<string, Duel>();
const russianHouseGames = new Map<string, RussianHouseGame>();
const russianPlayerDuels = new Map<string, RussianPlayerDuel>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function later(id: string, ms: number, fn: () => void): void {
  const prev = timers.get(id);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.set(id, t);
}

function clearTable(id: string, channelId: string): void {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  tables.delete(id);
  if (channelBusy.get(channelId) === id) channelBusy.delete(channelId);
}

const HORSES = [
  { emoji: "🐱", name: "Mochi" },
  { emoji: "🌸", name: "Sakura" },
  { emoji: "⚡", name: "Nexo" },
  { emoji: "🖤", name: "Shadow" },
  { emoji: "👑", name: "Rey Gato" },
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function busy(channelId: string): string | null {
  return channelBusy.get(channelId) ?? null;
}

export function refundOpenTables(): void {
  for (const t of tables.values()) {
    if (t.kind === "roulette" || t.kind === "horse") {
      if (t.closed) continue;
      for (const [userId, b] of t.bets) {
        const eco = getEco(t.guildId, userId);
        addWallet(eco, b.amount, { stats: false });
        saveEco(eco);
      }
    } else if (t.kind === "globo" && t.phase !== "done") {
      for (const [userId, p] of t.players) {
        if (p.cashed) continue;
        const eco = getEco(t.guildId, userId);
        addWallet(eco, p.amount, { stats: false });
        saveEco(eco);
      }
    } else if (t.kind === "jackpot" && !t.closed) {
      for (const [userId, p] of t.players) {
        const eco = getEco(t.guildId, userId);
        addWallet(eco, p.amount, { stats: false });
        saveEco(eco);
      }
    }
  }
  for (const [id, game] of russianHouseGames) {
    refund(game.guildId, game.userId, game.amount);
    russianHouseGames.delete(id);
  }
  for (const [id, duel] of russianPlayerDuels) {
    refund(duel.guildId, duel.hostId, duel.amount);
    if (duel.accepted) refund(duel.guildId, duel.rivalId, duel.amount);
    russianPlayerDuels.delete(id);
  }
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  tables.clear();
  channelBusy.clear();
}

function takeChip(guildId: string, userId: string, amount: number): string | null {
  if (amount < 10) return "Mínimo 10 nexocoin.";
  const eco = getEco(guildId, userId);
  collectLoan(eco);
  const jail = jailCheck(eco);
  if (jail) return jail;
  if (eco.wallet < amount) return `No te llega. Tienes ${n(eco.wallet)}.`;
  addWallet(eco, -amount);
  saveEco(eco);
  return null;
}

function refund(guildId: string, userId: string, amount: number): void {
  const eco = getEco(guildId, userId);
  addWallet(eco, amount, { stats: false });
  saveEco(eco);
}

function parseAmount(raw: string): number | null {
  const v = Number(raw.replace(/[^\d]/g, ""));
  if (!Number.isFinite(v) || v < 10) return null;
  return Math.floor(v);
}

/* ───────── roulette ───────── */

function rouletteEmbed(t: RouletteTable, extra = "") {
  const lines = [...t.bets.values()].map((b) => `• **${b.tag}** ${b.color} · ${n(b.amount)}`);
  const left = Math.max(0, Math.ceil((t.closesAt - Date.now()) / 1000));
  return casinoEmbed("Mesa de ruleta")
    .setDescription(
      [
        "Apuesta a **rojo x2**, **negro x2** o **verde x14**.",
        t.closed ? extra : `Cierra en **${left}s**.`,
        "",
        lines.length ? lines.slice(0, 15).join("\n") : "*Nadie ha apostado aún.*",
      ].join("\n"),
    )
    .setFooter({ text: `${t.bets.size} jugador(es)` });
}

function rouletteButtons(id: string, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cs:rl:${id}:rojo`).setLabel("Rojo x2").setStyle(ButtonStyle.Danger).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`cs:rl:${id}:negro`).setLabel("Negro x2").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`cs:rl:${id}:verde`).setLabel("Verde x14").setStyle(ButtonStyle.Success).setDisabled(disabled),
  );
}

export async function startRoulette(interaction: ChatInputCommandInteraction, seconds: number): Promise<void> {
  const ch = interaction.channel;
  if (!ch || !("send" in ch) || busy(interaction.channelId)) {
    await interaction.reply(ephemeral([errorEmbed("Mesa ocupada", "Ya hay una partida en este canal.")]));
    return;
  }
  const id = uid();
  const closesAt = Date.now() + seconds * 1000;
  await interaction.reply({
    embeds: [
      casinoEmbed("Mesa de ruleta").setDescription(`Apuestas abiertas **${seconds}s**.\nElige color y escribe tu apuesta.`),
    ],
    components: [rouletteButtons(id)],
  });
  const message = await interaction.fetchReply();
  const table: RouletteTable = {
    kind: "roulette",
    id,
    guildId: interaction.guildId!,
    channelId: interaction.channelId,
    hostId: interaction.user.id,
    message,
    bets: new Map(),
    closesAt,
    closed: false,
  };
  tables.set(id, table);
  channelBusy.set(interaction.channelId, id);
  later(id, seconds * 1000 + 400, () => void resolveRoulette(id));
}

async function resolveRoulette(id: string): Promise<void> {
  const t = tables.get(id);
  if (!t || t.kind !== "roulette" || t.closed) return;
  t.closed = true;
  try {
    const spin = rng(0, 14);
    const landed: ColorBet = spin === 0 ? "verde" : spin <= 7 ? "rojo" : "negro";
    const payout = landed === "verde" ? 14 : 2;
    const winners: string[] = [];
    for (const [uid_, b] of t.bets) {
      if (b.color === landed) {
        const eco = getEco(t.guildId, uid_);
        addWallet(eco, b.amount * payout);
        saveEco(eco);
        winners.push(`• **${b.tag}** +${n(b.amount * payout)}`);
      }
    }
    await t.message
      .edit({
        embeds: [
          rouletteEmbed(t, `Bola en **${landed}**.`).setColor(COLORS.casino).setDescription(
            `Bola en **${landed}** (${payout}x).\n\n${winners.length ? `**Ganan:**\n${winners.join("\n")}` : "Nadie acertó. La casa se queda el bote."}`,
          ),
        ],
        components: [],
      })
      .catch(() => null);
  } finally {
    clearTable(id, t.channelId);
  }
}

/* ───────── horses ───────── */

function horseEmbed(t: HorseTable, extra = "") {
  const byHorse = HORSES.map((h, i) => {
    const people = [...t.bets.values()].filter((b) => b.horse === i);
    const names = people.map((p) => p.tag).join(", ") || "—";
    return `${h.emoji} **${i + 1}. ${h.name}**  ${names}`;
  });
  const left = Math.max(0, Math.ceil((t.closesAt - Date.now()) / 1000));
  return casinoEmbed("Carrera de caballos")
    .setDescription(
      [
        extra || `Elige caballo. Cierra en **${left}s**. Premio **x4**.`,
        "",
        byHorse.join("\n"),
      ].join("\n"),
    )
    .setFooter({ text: `${t.bets.size} apuesta(s)` });
}

function horseButtons(id: string, disabled = false) {
  const row = new ActionRowBuilder<ButtonBuilder>();
  HORSES.forEach((h, i) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`cs:hr:${id}:${i}`)
        .setLabel(`${i + 1}`)
        .setEmoji(h.emoji)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
    );
  });
  return row;
}

export async function startRace(interaction: ChatInputCommandInteraction, seconds: number): Promise<void> {
  if (busy(interaction.channelId)) {
    await interaction.reply(ephemeral([errorEmbed("Mesa ocupada", "Ya hay una partida en este canal.")]));
    return;
  }
  const id = uid();
  await interaction.reply({
    embeds: [casinoEmbed("Carrera de caballos").setDescription(`Apuestas **${seconds}s**. Pulsa el caballo.`)],
    components: [horseButtons(id)],
  });
  const message = await interaction.fetchReply();
  const table: HorseTable = {
    kind: "horse",
    id,
    guildId: interaction.guildId!,
    channelId: interaction.channelId,
    hostId: interaction.user.id,
    message,
    bets: new Map(),
    closesAt: Date.now() + seconds * 1000,
    closed: false,
  };
  tables.set(id, table);
  channelBusy.set(interaction.channelId, id);
  later(id, seconds * 1000 + 400, () => void resolveRace(id));
}

function horseBoard(progress: number[], goal: number): string {
  return HORSES.map((h, i) => {
    const p = Math.min(goal, progress[i]!);
    return `${h.emoji} ${h.name.padEnd(10, " ")} ${"▰".repeat(p)}${"▱".repeat(goal - p)}`;
  }).join("\n");
}

async function resolveRace(id: string): Promise<void> {
  const t = tables.get(id);
  if (!t || t.kind !== "horse" || t.closed) return;
  t.closed = true;
  const progress = [0, 0, 0, 0, 0];
  const goal = 10;
  let winner = -1;
  try {
    await t.message.edit({ embeds: [horseEmbed(t, "¡Salen!")], components: [] }).catch(() => null);
    for (let tick = 0; tick < 10 && winner < 0; tick++) {
      await new Promise((r) => setTimeout(r, 850));
      for (let i = 0; i < 5; i++) progress[i] += rng(1, 3);
      winner = progress.findIndex((p) => p >= goal);
      await t.message
        .edit({
          embeds: [casinoEmbed("Carrera de caballos").setDescription(`\`\`\`\n${horseBoard(progress, goal)}\n\`\`\``)],
          components: [],
        })
        .catch(() => null);
    }
    if (winner < 0) winner = progress.indexOf(Math.max(...progress));
    const horse = HORSES[winner]!;
    const winners: string[] = [];
    for (const [uid_, b] of t.bets) {
      if (b.horse === winner) {
        const eco = getEco(t.guildId, uid_);
        addWallet(eco, b.amount * 4);
        saveEco(eco);
        winners.push(`• **${b.tag}** +${n(b.amount * 4)}`);
      }
    }
    const payload = {
      embeds: [
        casinoEmbed("Meta")
          .setColor(COLORS.success)
          .setDescription(
            `Gana ${horse.emoji} **${horse.name}**.\n\n${winners.length ? winners.join("\n") : "Nadie apostó al ganador."}`,
          ),
      ],
      components: [],
    };
    const edited = await t.message.edit(payload).catch(() => null);
    if (!edited) {
      const ch = t.message.channel;
      if (ch && "send" in ch) await ch.send(payload).catch(() => null);
    }
  } finally {
    clearTable(id, t.channelId);
  }
}

/* ───────── globo / crash ───────── */

function globoCrashChance(mult: number, hasBlessed = false): number {
  if (hasBlessed) {
    // Para usuarios bendecidos: mantener en 2% hasta x1.2
    if (mult < 1.2) return 0.02;
    const excess = mult - 1.2;
    return Math.min(0.35, 0.035 + 0.05 * excess + 0.015 * (excess ** 2));
  }
  // 0.25 → 1.0: 3% fijo por tick (si explota antes de 1x se devuelve el multiplicador acumulado)
  if (mult < 1) return 0.03;
  // Tras x1: el riesgo crece de forma progresiva y cuadrática para equilibrar la casa
  const excess = mult - 1;
  return Math.min(0.48, 0.045 + 0.075 * excess + 0.02 * (excess ** 2));
}


function globoEmbed(t: GloboTable) {
  const list = [...t.players.values()]
    .map((p) => `• **${p.tag}** ${n(p.amount)}${p.cashed ? ` → salió a **${p.cashed.toFixed(2)}x**` : ""}`)
    .join("\n");
  if (t.phase === "join") {
    const left = Math.max(0, Math.ceil((t.closesAt - Date.now()) / 1000));
    return casinoEmbed("Globo 🎈")
      .setDescription(
        `Empieza en **x0.25**. De x0.25 a x1: **3%** de explotar por tick (si explota antes de x1, ¡se devuelve el % correspondiente!).\nDespués de x1 el riesgo sube progresivamente y se puede perder todo.\n\nCierra en **${left}s**.\n\n${list || "*Nadie dentro.*"}`,
      );
  }
  return casinoEmbed("Globo 🎈").setDescription(
    `Multiplicador **${t.mult.toFixed(2)}x**\nPulsa **Salir** para cobrar.\n\n${list || "*—*"}`,
  );
}

export async function startGlobo(interaction: ChatInputCommandInteraction, seconds: number): Promise<void> {
  if (busy(interaction.channelId)) {
    await interaction.reply(ephemeral([errorEmbed("Mesa ocupada")]));
    return;
  }
  const id = uid();
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cs:gl:${id}:join`).setLabel("Entrar").setStyle(ButtonStyle.Success),
  );
  await interaction.reply({
    embeds: [
      casinoEmbed("Globo 🎈").setDescription(
        `Entra en **${seconds}s**. Empieza en **x0.25** · 3% hasta x1 (con pago proporcional si explota) · luego el riesgo sube.`,
      ),
    ],
    components: [row],
  });
  const message = await interaction.fetchReply();
  const table: GloboTable = {
    kind: "globo",
    id,
    guildId: interaction.guildId!,
    channelId: interaction.channelId,
    hostId: interaction.user.id,
    message,
    players: new Map(),
    closesAt: Date.now() + seconds * 1000,
    phase: "join",
    crashAt: 0,
    mult: 0.25,
  };
  tables.set(id, table);
  channelBusy.set(interaction.channelId, id);
  later(id, seconds * 1000 + 300, () => void flyGlobo(id));
}

async function flyGlobo(id: string): Promise<void> {
  const t = tables.get(id);
  if (!t || t.kind !== "globo" || t.phase !== "join") return;
  if (!t.players.size) {
    await t.message.edit({ embeds: [casinoEmbed("Globo").setDescription("Nadie entró.")], components: [] }).catch(() => null);
    clearTable(id, t.channelId);
    return;
  }
  t.phase = "fly";
  t.mult = 0.25;
  const cash = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cs:gl:${id}:out`).setLabel("Salir / cobrar").setStyle(ButtonStyle.Primary),
  );
  try {
    const hasBlessed = [...t.players.keys()].some((uid) => GLOBO_BLESSED_USERS.has(uid));
    const maxCap = hasBlessed ? 6.0 : 5;
    while (t.phase === "fly") {
      await t.message.edit({ embeds: [globoEmbed(t)], components: [cash] }).catch(() => null);
      await new Promise((r) => setTimeout(r, 1200));
      if (t.phase !== "fly") return;
      const boom = Math.random() < globoCrashChance(t.mult, hasBlessed) || t.mult >= maxCap;
      if (boom) {
        t.crashAt = t.mult;
        break;
      }
      t.mult = Math.round((t.mult + 0.08 + t.mult * 0.025) * 100) / 100;
    }

    t.phase = "done";
    const boom = t.crashAt || t.mult;
    const isUnderOne = boom < 1;
    const lines: string[] = [];
    for (const [userId, p] of t.players.entries()) {
      if (p.cashed) {
        lines.push(`✅ **${p.tag}** salió a ${p.cashed.toFixed(2)}x → ${n(Math.floor(p.amount * p.cashed))}`);
      } else if (isUnderOne) {
        const payout = Math.floor(p.amount * boom);
        if (payout > 0) {
          const eco = getEco(t.guildId, userId);
          addWallet(eco, payout);
          saveEco(eco);
        }
        lines.push(`🎈 **${p.tag}** recupera **${(boom * 100).toFixed(0)}%** (${boom.toFixed(2)}x) → ${n(payout)}`);
      } else {
        lines.push(`💥 **${p.tag}** explotó con ${n(p.amount)}`);
      }
    }
    await t.message
      .edit({
        embeds: [
          casinoEmbed(isUnderOne ? "🎈 El globo estalló antes de x1" : "💥 El globo explotó")
            .setColor(isUnderOne ? COLORS.warn : COLORS.danger)
            .setDescription(
              isUnderOne
                ? `Crash prematuro a **${boom.toFixed(2)}x**.\n*Al explotar antes de x1.00, se devuelve el ${(boom * 100).toFixed(0)}% de lo apostado.*\n\n${lines.join("\n")}`
                : `Crash a **${boom.toFixed(2)}x**.\n\n${lines.join("\n")}`,
            ),
        ],
        components: [],
      })
      .catch(() => null);
  } finally {
    t.phase = "done";
    clearTable(id, t.channelId);
  }
}

/* ───────── jackpot ───────── */

export async function startJackpot(interaction: ChatInputCommandInteraction, seconds: number): Promise<void> {
  if (busy(interaction.channelId)) {
    await interaction.reply(ephemeral([errorEmbed("Mesa ocupada")]));
    return;
  }
  const id = uid();
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cs:jp:${id}:in`).setLabel("Meter nexocoin").setStyle(ButtonStyle.Success),
  );
  await interaction.reply({
    embeds: [casinoEmbed("Bote compartido").setDescription(`Más fichas = más probabilidad. Cierra en **${seconds}s**.`)],
    components: [row],
  });
  const message = await interaction.fetchReply();
  const table: JackpotTable = {
    kind: "jackpot",
    id,
    guildId: interaction.guildId!,
    channelId: interaction.channelId,
    hostId: interaction.user.id,
    message,
    players: new Map(),
    closesAt: Date.now() + seconds * 1000,
    closed: false,
  };
  tables.set(id, table);
  channelBusy.set(interaction.channelId, id);
  later(id, seconds * 1000 + 400, () => void resolveJackpot(id));
}

function jackpotEmbed(t: JackpotTable) {
  const pot = [...t.players.values()].reduce((a, p) => a + p.amount, 0);
  const lines = [...t.players.values()].map((p) => {
    const pct = pot ? Math.round((p.amount / pot) * 100) : 0;
    return `• **${p.tag}** ${n(p.amount)} (${pct}%)`;
  });
  const left = Math.max(0, Math.ceil((t.closesAt - Date.now()) / 1000));
  return casinoEmbed("Bote compartido").setDescription(
    `Bote **${n(pot)}** · ${left}s\n\n${lines.join("\n") || "*Vacío.*"}`,
  );
}

async function resolveJackpot(id: string): Promise<void> {
  const t = tables.get(id);
  if (!t || t.kind !== "jackpot" || t.closed) return;
  t.closed = true;
  try {
    const pot = [...t.players.values()].reduce((a, p) => a + p.amount, 0);
    if (!pot) {
      await t.message.edit({ embeds: [casinoEmbed("Bote").setDescription("Nadie entró.")], components: [] }).catch(() => null);
      return;
    }
    let cursor = Math.random() * pot;
    let winnerId = t.players.keys().next().value as string;
    for (const [uid_, p] of t.players) {
      cursor -= p.amount;
      if (cursor <= 0) {
        winnerId = uid_;
        break;
      }
    }
    const eco = getEco(t.guildId, winnerId);
    addWallet(eco, pot);
    saveEco(eco);
    const tag = t.players.get(winnerId)?.tag ?? winnerId;
    await t.message
      .edit({
        embeds: [
          casinoEmbed("Bote · ganador")
            .setColor(COLORS.success)
            .setDescription(`**${tag}** se lleva ${n(pot)}.`),
        ],
        components: [],
      })
      .catch(() => null);
  } finally {
    clearTable(id, t.channelId);
  }
}

/* ───────── duel ───────── */

export async function startDuel(interaction: ChatInputCommandInteraction, rivalId: string, amount: number): Promise<void> {
  if (rivalId === interaction.user.id) {
    await interaction.reply(ephemeral([errorEmbed("Elige a otra persona")]));
    return;
  }
  const err = takeChip(interaction.guildId!, interaction.user.id, amount);
  if (err) {
    await interaction.reply(ephemeral([errorEmbed("No puedes apostar", err)]));
    return;
  }
  const id = uid();
  duels.set(id, {
    kind: "duel",
    id,
    guildId: interaction.guildId!,
    hostId: interaction.user.id,
    hostTag: interaction.user.username,
    rivalId,
    amount,
  });
  setTimeout(() => {
    const d = duels.get(id);
    if (!d) return;
    duels.delete(id);
    refund(d.guildId, d.hostId, d.amount);
  }, 60_000);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cs:du:${id}:yes`).setLabel("Aceptar").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`cs:du:${id}:no`).setLabel("Rechazar").setStyle(ButtonStyle.Danger),
  );
  await interaction.reply({
    content: `<@${rivalId}>`,
    embeds: [
      casinoEmbed("Duelo de moneda").setDescription(
        `**${interaction.user.username}** te reta a cara o cruz por ${n(amount)}.\nTienes 60s.`,
      ),
    ],
    components: [row],
  });
}

/* ───────── ruleta rusa ───────── */

const RUSSIAN_HOUSE_MULTIPLIERS = [0.40, 0.75, 1.20, 2.20, 4.50];

function russianHouseEmbed(game: RussianHouseGame, extra = "") {
  const currentPayout = game.chamber > 0 ? Math.floor(game.amount * game.multiplier) : 0;
  const nextMultiplier = game.chamber < 5 ? RUSSIAN_HOUSE_MULTIPLIERS[game.chamber] : null;

  return casinoEmbed(`Ruleta rusa · contra la casa`)
    .setDescription(
      [
        extra || (
          game.chamber === 0
            ? `Has cargado **1 bala** en un tambor de **6 cámaras**.\n` +
              `💥 **Atención:** Si la bala sale en cualquier disparo, **¡lo pierdes todo directamente!**\n\n` +
              `🎈 *Mecánica de riesgo progresivo (inspirada en el globo):*\n` +
              `• 1ª bala: **0.40x** *(zona de pérdidas, recuperas 40%)*\n` +
              `• 2ª bala: **0.75x** *(zona de pérdidas, recuperas 75%)*\n` +
              `• 3ª bala: **1.20x** *(¡cruzas a beneficios! +20%)*\n` +
              `• 4ª bala: **2.20x** *(beneficio alto, más del doble)*\n` +
              `• 5ª bala: **4.50x** *(Jackpot absoluto por vaciar el tambor)*\n\n` +
              `💵 **Apuesta:** ${n(game.amount)}`
            : `Cámara superada: **${game.chamber}/6** · Multiplicador actual: **${game.multiplier.toFixed(2)}x**.\n` +
              (game.chamber < 3
                ? `⚠️ *Estás en zona de pérdidas.* Si te retiras ahora recuperas **${n(currentPayout)}** (${(game.multiplier * 100).toFixed(0)}%).\n`
                : `✅ *¡Estás en zona de beneficios!* Cobro asegurado: **${n(currentPayout)}**.\n`) +
              (nextMultiplier ? `➡️ Siguiente disparo (**${game.chamber + 1}/6**): Multiplicador **${nextMultiplier.toFixed(2)}x**` : "")
        ),
      ].join("\n"),
    )
    .setFooter({
      text: game.chamber === 0
        ? "No puedes retirarte antes de disparar. ¡Aprieta el gatillo!"
        : game.chamber < 3
        ? "No empiezas a ganar dinero hasta la 3ª y 4ª bala. ¿Te atreves?"
        : "Has entrado en ganancias. Puedes cobrar o arriesgar por el jackpot.",
    });
}

function russianHouseButtons(id: string, canCash: boolean, chamber = 0) {
  const nextChamber = chamber + 1;
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`cs:rrh:${id}:pull`)
      .setLabel(`🔫 Disparar (Cámara ${nextChamber}/6)`)
      .setStyle(ButtonStyle.Danger),
  );
  if (canCash) {
    const isProfit = chamber >= 3;
    const mult = RUSSIAN_HOUSE_MULTIPLIERS[chamber - 1];
    const label = isProfit
      ? `💰 Cobrar Ganancias (${mult.toFixed(2)}x)`
      : `🚪 Retirarse (${(mult * 100).toFixed(0)}% devuelto)`;
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`cs:rrh:${id}:cash`)
        .setLabel(label)
        .setStyle(isProfit ? ButtonStyle.Success : ButtonStyle.Secondary),
    );
  }
  return row;
}

export async function startRussianRouletteHouse(interaction: ChatInputCommandInteraction, amount: number): Promise<void> {
  const err = takeChip(interaction.guildId!, interaction.user.id, amount);
  if (err) {
    await interaction.reply(ephemeral([errorEmbed("No puedes jugar", err)]));
    return;
  }
  const id = uid();
  const game: RussianHouseGame = {
    kind: "russian-house",
    id,
    guildId: interaction.guildId!,
    userId: interaction.user.id,
    tag: interaction.user.username,
    message: null as unknown as Message,
    amount,
    chamber: 0,
    bulletAt: rng(0, 5),
    multiplier: 0,
  };
  await interaction.reply({ embeds: [russianHouseEmbed(game)], components: [russianHouseButtons(id, false, 0)] });
  game.message = await interaction.fetchReply();
  russianHouseGames.set(id, game);
  setTimeout(() => {
    const active = russianHouseGames.get(id);
    if (!active) return;
    russianHouseGames.delete(id);
    if (active.chamber === 0) {
      refund(active.guildId, active.userId, active.amount);
      active.message.edit({ embeds: [russianHouseEmbed(active, "⏱️ La partida caducó sin disparar. Tu apuesta ha sido devuelta.")], components: [] }).catch(() => null);
    } else {
      const payout = Math.floor(active.amount * active.multiplier);
      const eco = getEco(active.guildId, active.userId);
      addWallet(eco, payout);
      saveEco(eco);
      active.message.edit({
        embeds: [russianHouseEmbed(active, `⏱️ La partida caducó por inactividad. Se ha cobrado automáticamente ${n(payout)} (${active.multiplier.toFixed(2)}x).`).setColor(COLORS.success)],
        components: [],
      }).catch(() => null);
    }
  }, 90_000);
}

function russianPlayerEmbed(game: RussianPlayerDuel, extra = "") {
  const turnName = game.turn === "host" ? game.hostTag : game.rivalTag ?? "rival";
  return casinoEmbed("Ruleta rusa · duelo")
    .setDescription(
      [
        extra || (game.accepted ? `Turno de **${turnName}** · Cámara ${game.chamber + 1}/6.` : `**${game.hostTag}** te ha retado por **${n(game.amount)}**.`),
        "Cada jugador aporta la misma cantidad. En cada turno se pulsa **Disparar**; quien encuentre la bala pierde y el rival gana el bote.",
        game.accepted
          ? `Bote: **${n(game.amount * 2)}** · Turno: **${turnName}**`
          : `Apuesta: **${n(game.amount)}** por jugador · Tienes 60 segundos para aceptar.`,
      ].join("\n"),
    )
    .setFooter({ text: "Ruleta rusa entre jugadores · Sin ventaja de la casa" });
}

function russianPlayerButtons(id: string, accepted: boolean) {
  if (!accepted) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`cs:rrp:${id}:yes`).setLabel("Aceptar reto").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`cs:rrp:${id}:no`).setLabel("Rechazar").setStyle(ButtonStyle.Danger),
    );
  }
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`cs:rrp:${id}:fire`).setLabel("Disparar").setStyle(ButtonStyle.Danger),
  );
}

export async function startRussianRouletteDuel(
  interaction: ChatInputCommandInteraction,
  rivalId: string,
  amount: number,
): Promise<void> {
  if (rivalId === interaction.user.id) {
    await interaction.reply(ephemeral([errorEmbed("Elige a otra persona", "No puedes retarte a ti mismo.")]));
    return;
  }
  const err = takeChip(interaction.guildId!, interaction.user.id, amount);
  if (err) {
    await interaction.reply(ephemeral([errorEmbed("No puedes retar", err)]));
    return;
  }
  const id = uid();
  const game: RussianPlayerDuel = {
    kind: "russian-player",
    id,
    guildId: interaction.guildId!,
    hostId: interaction.user.id,
    hostTag: interaction.user.username,
    rivalId,
    message: null as unknown as Message,
    amount,
    chamber: 0,
    bulletAt: rng(0, 5),
    accepted: false,
    turn: "host",
  };
  await interaction.reply({
    content: `<@${rivalId}>`,
    embeds: [russianPlayerEmbed(game)],
    components: [russianPlayerButtons(id, false)],
  });
  game.message = await interaction.fetchReply();
  russianPlayerDuels.set(id, game);
  setTimeout(() => {
    const active = russianPlayerDuels.get(id);
    if (!active) return;
    russianPlayerDuels.delete(id);
    refund(active.guildId, active.hostId, active.amount);
    if (active.accepted) refund(active.guildId, active.rivalId, active.amount);
    active.message.edit({ embeds: [russianPlayerEmbed(active, "⏱️ El reto caducó. Las apuestas han sido devueltas.")], components: [] }).catch(() => null);
  }, 60_000);
}

/* ───────── interactions ───────── */

export async function handleCasinoButton(interaction: ButtonInteraction): Promise<void> {
  const parts = interaction.customId.split(":");
  const kind = parts[1];
  const id = parts[2]!;
  const act = parts[3];

  if (kind === "rrh") {
    const game = russianHouseGames.get(id);
    if (!game) {
      await interaction.reply(ephemeral([errorEmbed("Partida caducada")]));
      return;
    }
    if (interaction.user.id !== game.userId) {
      await interaction.reply(ephemeral([errorEmbed("No es tu partida")]));
      return;
    }
    if (act === "cash") {
      if (game.chamber === 0) {
        await interaction.reply(ephemeral([errorEmbed("No puedes cobrar", "Debes disparar al menos una vez para poder retirarte.")]));
        return;
      }
      const payout = Math.floor(game.amount * game.multiplier);
      russianHouseGames.delete(id);
      const eco = getEco(game.guildId, game.userId);
      addWallet(eco, payout);
      saveEco(eco);
      await interaction.update({
        embeds: [
          russianHouseEmbed(
            game,
            `✅ **¡Te has retirado a tiempo!**\n` +
            `Has sobrevivido a **${game.chamber}/6** cámaras y cobrado **${n(payout)}** con un multiplicador de **${game.multiplier.toFixed(2)}x**.`
          ).setColor(COLORS.success),
        ],
        components: [],
      });
      return;
    }
    if (act === "pull") {
      if (game.chamber === game.bulletAt) {
        russianHouseGames.delete(id);
        const chamberNum = game.chamber + 1;
        await interaction.update({
          embeds: [
            russianHouseEmbed(
              game,
              `💥 **¡¡BANG!!** La bala estaba en la cámara **${chamberNum}/6**.\nHas muerto y has perdido tu apuesta de ${n(game.amount)}.`
            ).setColor(COLORS.danger),
          ],
          components: [],
        });
        return;
      }
      game.chamber += 1;
      game.multiplier = RUSSIAN_HOUSE_MULTIPLIERS[game.chamber - 1];

      if (game.chamber >= 5) {
        const payout = Math.floor(game.amount * game.multiplier);
        russianHouseGames.delete(id);
        const eco = getEco(game.guildId, game.userId);
        addWallet(eco, payout);
        saveEco(eco);
        await interaction.update({
          embeds: [
            russianHouseEmbed(
              game,
              `🏆 **¡¡JACKPOT ABSOLUTO!!**\n` +
              `¡Has sobrevivido a las **5 cámaras vacías**!\n` +
              `La última cámara restante contenía la bala. Te retiras como leyenda con el multiplicador máximo de **${game.multiplier.toFixed(2)}x**.\n\n` +
              `💰 **Premio cobrado:** ${n(payout)}`
            ).setColor(COLORS.success),
          ],
          components: [],
        });
        return;
      }

      const payout = Math.floor(game.amount * game.multiplier);
      const nextMultiplier = RUSSIAN_HOUSE_MULTIPLIERS[game.chamber];
      const statusText = game.chamber < 3
        ? `⚠️ *Aún en zona de pérdidas.* Multiplicador: **${game.multiplier.toFixed(2)}x** (Recuperas: ${n(payout)}).`
        : `✅ *¡Zona de beneficios!* Multiplicador: **${game.multiplier.toFixed(2)}x** (Cobro asegurado: ${n(payout)}).`;

      await interaction.update({
        embeds: [
          russianHouseEmbed(
            game,
            `*Click...* 🔄 **¡Cámara vacía!** Has sobrevivido a la cámara **${game.chamber}/6**.\n` +
            `${statusText}\n` +
            `➡️ Siguiente cámara: **${game.chamber + 1}/6** (Multiplicador siguiente: **${nextMultiplier.toFixed(2)}x**).`
          ),
        ],
        components: [russianHouseButtons(id, true, game.chamber)],
      });
      return;
    }
  }

  if (kind === "rrp") {
    const game = russianPlayerDuels.get(id);
    if (!game) {
      await interaction.reply(ephemeral([errorEmbed("Reto caducado")]));
      return;
    }
    if (act === "yes" || act === "no") {
      if (interaction.user.id !== game.rivalId) {
        await interaction.reply(ephemeral([errorEmbed("No es tu reto")]));
        return;
      }
      if (act === "no") {
        russianPlayerDuels.delete(id);
        refund(game.guildId, game.hostId, game.amount);
        await interaction.update({ embeds: [russianPlayerEmbed(game, "Reto rechazado. La apuesta ha sido devuelta.")], components: [] });
        return;
      }
      if (game.accepted) {
        await interaction.reply(ephemeral([errorEmbed("El reto ya está aceptado")]));
        return;
      }
      const err = takeChip(game.guildId, game.rivalId, game.amount);
      if (err) {
        await interaction.reply(ephemeral([errorEmbed("No puedes aceptar", err)]));
        return;
      }
      game.accepted = true;
      game.rivalTag = interaction.user.username;
      await interaction.update({
        embeds: [russianPlayerEmbed(game, "⚔️ " + game.rivalTag + " ha aceptado. Empieza el turno de " + game.hostTag + ".")],
        components: [russianPlayerButtons(id, true)],
      });
      return;
    }
    if (act === "fire") {
      if (!game.accepted) {
        await interaction.reply(ephemeral([errorEmbed("Reto pendiente", "El rival todavía debe aceptar.")]));
        return;
      }
      const isHostTurn = game.turn === "host";
      const expected = isHostTurn ? game.hostId : game.rivalId;
      if (interaction.user.id !== expected) {
        await interaction.reply(ephemeral([errorEmbed("No es tu turno")]));
        return;
      }
      if (game.chamber === game.bulletAt) {
        const winner = isHostTurn ? game.rivalId : game.hostId;
        const loser = interaction.user.id;
        russianPlayerDuels.delete(id);
        const eco = getEco(game.guildId, winner);
        addWallet(eco, game.amount * 2);
        saveEco(eco);
        await interaction.update({
          embeds: [
            russianPlayerEmbed(game, "💥 ¡BANG! <@" + loser + "> encontró la bala.\n🏆 <@" + winner + "> gana el bote de " + n(game.amount * 2) + ".")
              .setColor(COLORS.success),
          ],
          components: [],
        });
        return;
      }
      game.chamber += 1;
      game.turn = isHostTurn ? "rival" : "host";
      await interaction.update({
        embeds: [russianPlayerEmbed(game, "🔄 Cámara vacía. Ahora dispara " + (game.turn === "host" ? game.hostTag : game.rivalTag) + ".")],
        components: [russianPlayerButtons(id, true)],
      });
      return;
    }
  }

  if (kind === "du") {
    const d = duels.get(id);
    if (!d) {
      await interaction.reply(ephemeral([errorEmbed("Caducado")]));
      return;
    }
    if (interaction.user.id !== d.rivalId) {
      await interaction.reply(ephemeral([errorEmbed("No es tu duelo")]));
      return;
    }
    if (act === "no") {
      duels.delete(id);
      refund(d.guildId, d.hostId, d.amount);
      await interaction.update({ embeds: [casinoEmbed("Duelo rechazado")], components: [] });
      return;
    }
    const err = takeChip(d.guildId, d.rivalId, d.amount);
    if (err) {
      await interaction.reply(ephemeral([errorEmbed("No puedes aceptar", err)]));
      return;
    }
    duels.delete(id);
    const hostWins = Math.random() < 0.5;
    const winner = hostWins ? d.hostId : d.rivalId;
    const loser = hostWins ? d.rivalId : d.hostId;
    const eco = getEco(d.guildId, winner);
    addWallet(eco, d.amount * 2);
    saveEco(eco);
    await interaction.update({
      embeds: [
        casinoEmbed("Duelo")
          .setColor(COLORS.success)
          .setDescription(
            `Ha salido **${hostWins ? "cara" : "cruz"}**.\n<@${winner}> gana ${n(d.amount * 2)}.\n<@${loser}> pierde ${n(d.amount)}.`,
          ),
      ],
      components: [],
    });
    return;
  }

  if (kind === "gl" && act === "out") {
    const t = tables.get(id);
    if (!t || t.kind !== "globo" || t.phase !== "fly") {
      await interaction.reply(ephemeral([errorEmbed("Ya no se puede salir")]));
      return;
    }
    const p = t.players.get(interaction.user.id);
    if (!p || p.cashed) {
      await interaction.reply(ephemeral([errorEmbed("No estás dentro o ya saliste")]));
      return;
    }
    p.cashed = t.mult;
    const eco = getEco(t.guildId, interaction.user.id);
    addWallet(eco, Math.floor(p.amount * t.mult));
    saveEco(eco);
    await interaction.reply(
      ephemeral([successEmbed("Has saltado", `Cobraste ${n(Math.floor(p.amount * t.mult))} a ${t.mult.toFixed(2)}x.`)]),
    );
    return;
  }

  const needModal = (kind === "rl" || kind === "hr" || (kind === "gl" && act === "join") || (kind === "jp" && act === "in"));
  if (!needModal) {
    await interaction.reply(ephemeral([errorEmbed("Acción desconocida")]));
    return;
  }
  const t = tables.get(id);
  if (!t) {
    await interaction.reply(ephemeral([errorEmbed("Esta mesa ya cerró")]));
    return;
  }
  const modal = new ModalBuilder().setCustomId(interaction.customId.replace(/^cs:/, "csm:")).setTitle("Apuesta nexocoin");
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("amt")
        .setLabel("¿Cuántos nexocoin?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder("100")
        .setMaxLength(10),
    ),
  );
  await interaction.showModal(modal);
}

export async function handleCasinoModal(interaction: ModalSubmitInteraction): Promise<void> {
  const parts = interaction.customId.split(":");
  const kind = parts[1];
  const id = parts[2]!;
  const act = parts[3];
  const amount = parseAmount(interaction.fields.getTextInputValue("amt"));
  if (!amount) {
    await interaction.reply(ephemeral([errorEmbed("Cantidad inválida", "Mínimo 10 nexocoin.")]));
    return;
  }
  const t = tables.get(id);
  if (!t) {
    await interaction.reply(ephemeral([errorEmbed("La mesa ya cerró")]));
    return;
  }
  const err = takeChip(t.guildId, interaction.user.id, amount);
  if (err) {
    await interaction.reply(ephemeral([errorEmbed("No puedes apostar", err)]));
    return;
  }
  const tag = interaction.user.username;

  if (t.kind === "roulette" && !t.closed && (act === "rojo" || act === "negro" || act === "verde")) {
    const prev = t.bets.get(interaction.user.id);
    if (prev) {
      refund(t.guildId, interaction.user.id, prev.amount);
    }
    t.bets.set(interaction.user.id, { color: act, amount, tag });
    await t.message.edit({ embeds: [rouletteEmbed(t)], components: [rouletteButtons(t.id)] }).catch(() => null);
    await interaction.reply(ephemeral([successEmbed("Apuesta", `${act} · ${n(amount)}`)]));
    return;
  }

  if (t.kind === "horse" && !t.closed) {
    const horse = Number(act);
    if (Number.isNaN(horse) || horse < 0 || horse > 4) {
      refund(t.guildId, interaction.user.id, amount);
      await interaction.reply(ephemeral([errorEmbed("Caballo inválido")]));
      return;
    }
    const prev = t.bets.get(interaction.user.id);
    if (prev) refund(t.guildId, interaction.user.id, prev.amount);
    t.bets.set(interaction.user.id, { horse, amount, tag });
    await t.message.edit({ embeds: [horseEmbed(t)], components: [horseButtons(t.id)] }).catch(() => null);
    await interaction.reply(
      ephemeral([successEmbed("Apuesta", `${HORSES[horse]!.emoji} ${HORSES[horse]!.name} · ${n(amount)}`)]),
    );
    return;
  }

  if (t.kind === "globo" && t.phase === "join" && act === "join") {
    const prev = t.players.get(interaction.user.id);
    if (prev) refund(t.guildId, interaction.user.id, prev.amount);
    t.players.set(interaction.user.id, { amount, tag });
    await t.message
      .edit({
        embeds: [globoEmbed(t)],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`cs:gl:${t.id}:join`).setLabel("Entrar").setStyle(ButtonStyle.Success),
          ),
        ],
      })
      .catch(() => null);
    await interaction.reply(ephemeral([successEmbed("Dentro", n(amount))]));
    return;
  }

  if (t.kind === "jackpot" && !t.closed && act === "in") {
    const prev = t.players.get(interaction.user.id);
    const total = (prev?.amount ?? 0) + amount;
    t.players.set(interaction.user.id, { amount: total, tag });
    await t.message
      .edit({
        embeds: [jackpotEmbed(t)],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`cs:jp:${t.id}:in`).setLabel("Meter nexocoin").setStyle(ButtonStyle.Success),
          ),
        ],
      })
      .catch(() => null);
    await interaction.reply(ephemeral([successEmbed("Bote", `Llevas ${n(total)} en el bote.`)]));
    return;
  }

  refund(t.guildId, interaction.user.id, amount);
  await interaction.reply(ephemeral([errorEmbed("Tarde", "Esa ronda ya no acepta apuestas.")]));
}
