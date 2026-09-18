import type { ButtonInteraction } from "discord.js";
import { getDb } from "../../database/index.js";
import { getEco } from "../economy/engine.js";
import type { NexoClient } from "../../client.js";
import { baseEmbed, successEmbed, errorEmbed } from "../../utils/embeds.js";

// Pending proposals map (orderId -> data)
export const pendingProposals = new Map<string, { proposerId: string; targetId: string; guildId: string; timestamp: number }>();

export function getMarriage(guildId: string, userId: string): { partner_id: string; married_at: number } | null {
  const db = getDb();
  const row = db.prepare("SELECT user2_id, married_at FROM marriages WHERE guild_id = ? AND user1_id = ?").get(guildId, userId) as { user2_id: string; married_at: number } | undefined;
  if (!row) return null;
  return { partner_id: row.user2_id, married_at: row.married_at };
}

export function createMarriage(guildId: string, user1: string, user2: string): void {
  const db = getDb();
  const now = Date.now();
  const insert = db.prepare("INSERT INTO marriages (guild_id, user1_id, user2_id, married_at) VALUES (?, ?, ?, ?)");
  
  db.transaction(() => {
    insert.run(guildId, user1, user2, now);
    insert.run(guildId, user2, user1, now);
  })();
}

export function deleteMarriage(guildId: string, userId: string): boolean {
  const db = getDb();
  const marriage = getMarriage(guildId, userId);
  if (!marriage) return false;
  
  const partnerId = marriage.partner_id;
  const del = db.prepare("DELETE FROM marriages WHERE guild_id = ? AND user1_id = ? AND user2_id = ?");
  
  db.transaction(() => {
    del.run(guildId, userId, partnerId);
    del.run(guildId, partnerId, userId);
  })();
  
  return true;
}

export function getTopMarriages(guildId: string, limit: number = 10): { user1_id: string; user2_id: string; married_at: number }[] {
  const db = getDb();
  // Fetch distinct marriages by enforcing user1_id < user2_id to get one row per couple
  const rows = db.prepare("SELECT user1_id, user2_id, married_at FROM marriages WHERE guild_id = ? AND user1_id < user2_id ORDER BY married_at ASC LIMIT ?").all(guildId, limit) as { user1_id: string; user2_id: string; married_at: number }[];
  return rows;
}

export function isMarriageActive(guildId: string, userId: string): boolean {
  return getMarriage(guildId, userId) !== null;
}

export function getMarriageWorkBonus(guildId: string, userId: string): number {
  const marriage = getMarriage(guildId, userId);
  if (!marriage) return 0;
  
  const partnerEco = getEco(guildId, marriage.partner_id);
  if (!partnerEco) return 0;
  
  const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
  if (partnerEco.last_work && partnerEco.last_work > twoHoursAgo) {
    return 0.10; // 10% bonus
  }
  return 0;
}

export async function handleMarriageButton(interaction: ButtonInteraction, client: NexoClient): Promise<void> {
  const [feature, action, orderId, proposerId] = interaction.customId.split(":");
  
  if (feature !== "marry") return;
  
  if (action === "divorce") {
    // Handling divorce in command file component collector is usually better, but if it comes here:
    // ... not needed if handled via collector in command
    return;
  }

  const proposal = pendingProposals.get(orderId);
  
  if (!proposal) {
    await interaction.reply({ embeds: [errorEmbed("Esta propuesta ha expirado o no existe.")], ephemeral: true });
    return;
  }
  
  if (interaction.user.id !== proposal.targetId) {
    await interaction.reply({ embeds: [errorEmbed("¡Esta propuesta no es para ti!")], ephemeral: true });
    return;
  }
  
  if (action === "accept") {
    if (isMarriageActive(proposal.guildId, proposal.proposerId) || isMarriageActive(proposal.guildId, proposal.targetId)) {
      await interaction.reply({ embeds: [errorEmbed("Uno de ustedes ya está casado.")], ephemeral: true });
      pendingProposals.delete(orderId);
      return;
    }
    
    createMarriage(proposal.guildId, proposal.proposerId, proposal.targetId);
    pendingProposals.delete(orderId);
    
    await interaction.update({
      embeds: [successEmbed(`¡Felicidades! <@${proposal.proposerId}> y <@${proposal.targetId}> ahora están casados. ❤️`)],
      components: []
    });
  } else if (action === "reject") {
    pendingProposals.delete(orderId);
    await interaction.update({
      embeds: [errorEmbed(`<@${proposal.targetId}> ha rechazado la propuesta de matrimonio de <@${proposal.proposerId}>. 💔`)],
      components: []
    });
  }
}
