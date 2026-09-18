import { Events, type VoiceState } from "discord.js";
import { endVoiceSession, startVoiceSession } from "../modules/levels/engine.js";
import { handleVoiceJoin, handleVoiceLeave } from "../modules/voicemaster/manager.js";
import type { EventModule } from "../handlers/loadEvents.js";

const event: EventModule = {
  name: Events.VoiceStateUpdate,
  async execute(oldState: unknown, newState: unknown) {
    const oldS = oldState as VoiceState;
    const newS = newState as VoiceState;
    if (!oldS.channelId && newS.channelId) {
      startVoiceSession(newS);
      await handleVoiceJoin(newS);
    } else if (oldS.channelId && !newS.channelId) {
      endVoiceSession(oldS.guild.id, oldS.id);
      await handleVoiceLeave(oldS);
    } else if (oldS.channelId && newS.channelId && oldS.channelId !== newS.channelId) {
      startVoiceSession(newS);
      await handleVoiceLeave(oldS);
      await handleVoiceJoin(newS);
    }
  },
};

export default event;
