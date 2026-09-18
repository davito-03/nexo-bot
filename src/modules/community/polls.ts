import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { COLORS, SERVER_NAME } from "../../constants.js";
import { getDb } from "../../database/index.js";
import { logger } from "../../logger.js";
import { isStaff } from "../../utils/permissions.js";
import type { NexoClient } from "../../client.js";

export interface PollRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string;
  author_id: string;
  question: string;
  options_json: string;
  mode: "single" | "multiple";
  ends_at: number | null;
  closed: number;
  created_at: number;
}

export interface PollData {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string;
  author_id: string;
  question: string;
  options: string[];
  mode: "single" | "multiple";
  ends_at: number | null;
  closed: boolean;
  created_at: number;
}

export interface PollResults {
  totalVoters: number;
  totalVotes: number;
  votesPerOption: number[];
  percentages: number[];
  winnerIndices: number[];
}

const OPTION_EMOJIS = [
  "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣",
  "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟",
  "1️⃣1️⃣", "1️⃣2️⃣", "1️⃣3️⃣", "1️⃣4️⃣", "1️⃣5️⃣"
];

function getOptionBadge(index: number): string {
  if (index < OPTION_EMOJIS.length) {
    return OPTION_EMOJIS[index];
  }
  return `**[${index + 1}]**`;
}

function makeBar(percentage: number, isWinner = false, length = 8): string {
  const filled = Math.min(length, Math.max(0, Math.round((percentage / 100) * length)));
  const empty = length - filled;
  const fillChar = isWinner ? "🟩" : "🟦";
  return fillChar.repeat(filled) + "⬜".repeat(empty);
}

export function parsePollRow(row: PollRow): PollData {
  let options: string[] = [];
  try {
    options = JSON.parse(row.options_json);
  } catch {
    options = [];
  }
  return {
    id: row.id,
    guild_id: row.guild_id,
    channel_id: row.channel_id,
    message_id: row.message_id,
    author_id: row.author_id,
    question: row.question,
    options,
    mode: row.mode,
    ends_at: row.ends_at,
    closed: row.closed === 1,
    created_at: row.created_at,
  };
}

export function createPollRecord(data: {
  guildId: string;
  channelId: string;
  authorId: string;
  question: string;
  options: string[];
  mode: "single" | "multiple";
  endsAt: number | null;
}): number {
  const stmt = getDb().prepare(`
    INSERT INTO polls (guild_id, channel_id, message_id, author_id, question, options_json, mode, ends_at, closed, created_at)
    VALUES (?, ?, '', ?, ?, ?, ?, ?, 0, ?)
  `);
  const info = stmt.run(
    data.guildId,
    data.channelId,
    data.authorId,
    data.question,
    JSON.stringify(data.options),
    data.mode,
    data.endsAt,
    Date.now(),
  );
  return Number(info.lastInsertRowid);
}

export function updatePollMessageId(pollId: number, messageId: string): void {
  getDb().prepare("UPDATE polls SET message_id = ? WHERE id = ?").run(messageId, pollId);
}

export function getPoll(pollId: number): PollData | null {
  const row = getDb().prepare("SELECT * FROM polls WHERE id = ?").get(pollId) as PollRow | undefined;
  return row ? parsePollRow(row) : null;
}

export function getPollByMessage(messageId: string): PollData | null {
  const row = getDb().prepare("SELECT * FROM polls WHERE message_id = ?").get(messageId) as PollRow | undefined;
  return row ? parsePollRow(row) : null;
}

export function getPollVotes(pollId: number): Map<string, number[]> {
  const rows = getDb().prepare("SELECT user_id, votes_json FROM poll_votes WHERE poll_id = ?").all(pollId) as {
    user_id: string;
    votes_json: string;
  }[];
  const map = new Map<string, number[]>();
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.votes_json);
      if (Array.isArray(parsed)) {
        map.set(r.user_id, parsed);
      }
    } catch {
      /* ignore corrupted row */
    }
  }
  return map;
}

export function getUserVote(pollId: number, userId: string): number[] | null {
  const row = getDb().prepare("SELECT votes_json FROM poll_votes WHERE poll_id = ? AND user_id = ?").get(pollId, userId) as {
    votes_json: string;
  } | undefined;
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.votes_json);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function recordVote(pollId: number, userId: string, optionIndices: number[]): void {
  getDb().prepare(`
    INSERT INTO poll_votes (poll_id, user_id, votes_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (poll_id, user_id) DO UPDATE SET
      votes_json = excluded.votes_json,
      updated_at = excluded.updated_at
  `).run(pollId, userId, JSON.stringify(optionIndices), Date.now());
}

export function deleteVote(pollId: number, userId: string): boolean {
  const res = getDb().prepare("DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?").run(pollId, userId);
  return res.changes > 0;
}

export function calculatePollResults(poll: PollData): PollResults {
  const votesMap = getPollVotes(poll.id);
  const totalVoters = votesMap.size;
  const votesPerOption = new Array<number>(poll.options.length).fill(0);
  let totalVotes = 0;

  for (const userVotes of votesMap.values()) {
    for (const idx of userVotes) {
      if (idx >= 0 && idx < poll.options.length) {
        votesPerOption[idx]++;
        totalVotes++;
      }
    }
  }

  const percentages = votesPerOption.map((cnt) => {
    if (poll.mode === "single") {
      return totalVoters > 0 ? (cnt / totalVoters) * 100 : 0;
    }
    // For multiple choice, percentage of voters who picked this option
    return totalVoters > 0 ? (cnt / totalVoters) * 100 : 0;
  });

  let maxVotes = 0;
  for (const cnt of votesPerOption) {
    if (cnt > maxVotes) maxVotes = cnt;
  }

  const winnerIndices: number[] = [];
  if (maxVotes > 0) {
    for (let i = 0; i < votesPerOption.length; i++) {
      if (votesPerOption[i] === maxVotes) {
        winnerIndices.push(i);
      }
    }
  }

  return {
    totalVoters,
    totalVotes,
    votesPerOption,
    percentages,
    winnerIndices,
  };
}

export function renderPollEmbed(poll: PollData, results: PollResults): EmbedBuilder {
  const color = poll.closed ? 0x2b2d31 : COLORS.primary;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`📊 Encuesta: ${poll.question}`)
    .setFooter({
      text: `${SERVER_NAME} · Encuesta #${poll.id} · ${poll.mode === "single" ? "Opción Única" : "Opción Múltiple"}`,
    })
    .setTimestamp();

  let desc = "";
  desc += `**Tipo:** ${poll.mode === "single" ? "🔘 **Opción única** *(1 voto por persona)*" : "☑️ **Opción múltiple** *(varias respuestas permitidas)*"}\n`;

  if (poll.closed) {
    desc += `**Estado:** 🔴 **Cerrada / Finalizada**\n`;
  } else if (poll.ends_at) {
    desc += `**Estado:** 🟢 **Activa** · Finaliza <t:${Math.floor(poll.ends_at / 1000)}:R> (<t:${Math.floor(poll.ends_at / 1000)}:f>)\n`;
  } else {
    desc += `**Estado:** 🟢 **Activa** · *Sin límite de tiempo*\n`;
  }

  desc += `**Autor:** <@${poll.author_id}>\n`;
  desc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (let i = 0; i < poll.options.length; i++) {
    const opt = poll.options[i];
    const votes = results.votesPerOption[i] || 0;
    const pct = results.percentages[i] || 0;
    const isWinner = poll.closed && results.winnerIndices.includes(i) && votes > 0;
    const bar = makeBar(pct, isWinner, 8);
    const badge = getOptionBadge(i);
    const crown = isWinner ? " 👑" : "";

    desc += `${badge} **${opt}**${crown}\n`;
    desc += `${bar} \`${pct.toFixed(1)}%\` · **${votes}** ${votes === 1 ? "voto" : "votos"}\n\n`;
  }

  desc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  desc += `👥 **Participantes:** ${results.totalVoters} · 🗳️ **Total votos emitidos:** ${results.totalVotes}`;

  if (poll.closed && results.winnerIndices.length > 0 && results.totalVotes > 0) {
    const winners = results.winnerIndices.map((i) => `**${poll.options[i]}**`).join(", ");
    desc += `\n🏆 **Ganador(es):** ${winners}`;
  }

  embed.setDescription(desc);
  return embed;
}

export function renderPollComponents(poll: PollData): ActionRowBuilder<any>[] {
  if (poll.closed) {
    const closedButton = new ButtonBuilder()
      .setCustomId(`poll:closed:${poll.id}`)
      .setLabel("Encuesta finalizada")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closedButton);
    return [row];
  }

  // Row 1: Select menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`poll:vote:${poll.id}`)
    .setPlaceholder(
      poll.mode === "single"
        ? "Selecciona tu opción para votar..."
        : "Selecciona una o varias opciones para votar...",
    )
    .setMinValues(1)
    .setMaxValues(poll.mode === "single" ? 1 : Math.min(poll.options.length, 15))
    .addOptions(
      poll.options.map((opt, idx) => {
        const label = opt.length > 95 ? `${opt.slice(0, 92)}...` : opt;
        const emoji = idx < 10 ? OPTION_EMOJIS[idx] : "🔹";
        return {
          label: `${idx + 1}. ${label}`,
          value: String(idx),
          description: `Opción #${idx + 1}`,
          emoji,
        };
      }),
    );

  const rowSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  // Row 2: Action buttons
  const removeBtn = new ButtonBuilder()
    .setCustomId(`poll:remove:${poll.id}`)
    .setLabel("Borrar mi voto")
    .setEmoji("🗑️")
    .setStyle(ButtonStyle.Secondary);

  const myVoteBtn = new ButtonBuilder()
    .setCustomId(`poll:myvote:${poll.id}`)
    .setLabel("Mis votos")
    .setEmoji("🗳️")
    .setStyle(ButtonStyle.Secondary);

  const closeBtn = new ButtonBuilder()
    .setCustomId(`poll:close:${poll.id}`)
    .setLabel("Cerrar")
    .setEmoji("🔒")
    .setStyle(ButtonStyle.Danger);

  const rowButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(removeBtn, myVoteBtn, closeBtn);

  return [rowSelect, rowButtons];
}

export async function closePoll(
  pollId: number,
  closedByUserId: string,
  client: NexoClient,
): Promise<{ success: boolean; error?: string }> {
  const poll = getPoll(pollId);
  if (!poll) return { success: false, error: "Encuesta no encontrada." };
  if (poll.closed) return { success: true };

  getDb().prepare("UPDATE polls SET closed = 1 WHERE id = ?").run(pollId);
  poll.closed = true;

  const results = calculatePollResults(poll);
  const embed = renderPollEmbed(poll, results);
  const components = renderPollComponents(poll);

  try {
    const channel = await client.channels.fetch(poll.channel_id).catch(() => null);
    if (channel && channel.isTextBased() && "messages" in channel) {
      const msg = await (channel as any).messages.fetch(poll.message_id).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed], components }).catch(() => null);
      }
    }
  } catch (err) {
    logger.error("closePoll edit error", err);
  }

  logger.info(`Encuesta #${pollId} cerrada por ${closedByUserId}`);
  return { success: true };
}

export async function tickPolls(client: NexoClient): Promise<void> {
  try {
    const due = getDb()
      .prepare("SELECT id FROM polls WHERE closed = 0 AND ends_at IS NOT NULL AND ends_at <= ?")
      .all(Date.now()) as { id: number }[];

    for (const row of due) {
      await closePoll(row.id, "system", client).catch((e) => logger.error(`tickPolls poll #${row.id}`, e));
    }
  } catch (err) {
    logger.error("tickPolls error", err);
  }
}

export async function handlePollVote(interaction: StringSelectMenuInteraction, client: NexoClient): Promise<void> {
  const pollIdStr = interaction.customId.replace("poll:vote:", "");
  const pollId = parseInt(pollIdStr, 10);
  if (isNaN(pollId)) return;

  const poll = getPoll(pollId);
  if (!poll) {
    await interaction.reply({ content: "❌ Esta encuesta ya no existe en el sistema.", ephemeral: true });
    return;
  }

  if (poll.closed || (poll.ends_at && Date.now() >= poll.ends_at)) {
    if (!poll.closed) {
      void closePoll(poll.id, "system", client).catch(() => null);
    }
    await interaction.reply({ content: "🔒 Esta encuesta ya ha finalizado.", ephemeral: true });
    return;
  }

  const selectedIndices = interaction.values
    .map((v) => parseInt(v, 10))
    .filter((n) => !isNaN(n) && n >= 0 && n < poll.options.length);

  if (selectedIndices.length === 0) {
    await interaction.reply({ content: "⚠️ No seleccionaste ninguna opción válida.", ephemeral: true });
    return;
  }

  if (poll.mode === "single" && selectedIndices.length > 1) {
    selectedIndices.splice(1);
  }

  recordVote(poll.id, interaction.user.id, selectedIndices);

  const results = calculatePollResults(poll);
  const embed = renderPollEmbed(poll, results);
  const components = renderPollComponents(poll);

  await interaction.update({ embeds: [embed], components });

  const chosenLabels = selectedIndices.map((idx) => `• **${poll.options[idx]}**`).join("\n");
  await interaction.followUp({
    content: `✅ ¡Tu voto ha sido registrado correctamente!\n**Opciones elegidas:**\n${chosenLabels}`,
    ephemeral: true,
  });
}

export async function handlePollButton(interaction: ButtonInteraction, client: NexoClient): Promise<void> {
  const parts = interaction.customId.split(":");
  const action = parts[1];
  const pollId = parseInt(parts[2], 10);
  if (isNaN(pollId)) return;

  const poll = getPoll(pollId);
  if (!poll) {
    await interaction.reply({ content: "❌ Esta encuesta no existe.", ephemeral: true });
    return;
  }

  if (action === "remove") {
    if (poll.closed) {
      await interaction.reply({ content: "🔒 La encuesta ya está cerrada y no se pueden modificar los votos.", ephemeral: true });
      return;
    }
    const hadVote = deleteVote(poll.id, interaction.user.id);
    if (!hadVote) {
      await interaction.reply({ content: "ℹ️ No tienes ningún voto registrado en esta encuesta.", ephemeral: true });
      return;
    }

    const results = calculatePollResults(poll);
    const embed = renderPollEmbed(poll, results);
    const components = renderPollComponents(poll);

    await interaction.update({ embeds: [embed], components });
    await interaction.followUp({ content: "🗑️ Tu voto ha sido eliminado de la encuesta.", ephemeral: true });
    return;
  }

  if (action === "myvote") {
    const userVotes = getUserVote(poll.id, interaction.user.id);
    if (!userVotes || userVotes.length === 0) {
      await interaction.reply({ content: "ℹ️ Aún no has votado en esta encuesta.", ephemeral: true });
      return;
    }

    const choices = userVotes.map((idx) => `• **${poll.options[idx]}**`).join("\n");
    await interaction.reply({
      content: `🗳️ **Tus votos registrados actualmente en esta encuesta:**\n${choices}`,
      ephemeral: true,
    });
    return;
  }

  if (action === "close") {
    const isAuthor = interaction.user.id === poll.author_id;
    let allowed = isAuthor;

    if (!allowed && interaction.member) {
      const member = interaction.guild?.members.cache.get(interaction.user.id) ?? interaction.member;
      if ("permissions" in member && (member.permissions as any)?.has?.(PermissionFlagsBits.ManageMessages)) {
        allowed = true;
      } else if (member && isStaff(member as any)) {
        allowed = true;
      }
    }

    if (!allowed) {
      await interaction.reply({
        content: `❌ Solo el creador de la encuesta (<@${poll.author_id}>) o un miembro del Staff con permisos pueden cerrarla.`,
        ephemeral: true,
      });
      return;
    }

    if (poll.closed) {
      await interaction.reply({ content: "ℹ️ La encuesta ya se encontraba cerrada.", ephemeral: true });
      return;
    }

    await closePoll(poll.id, interaction.user.id, client);
    await interaction.reply({ content: "🔒 Encuesta cerrada correctamente.", ephemeral: true });
    return;
  }
}
