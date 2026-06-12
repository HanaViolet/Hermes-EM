import { create } from 'zustand';
import type { AgentUpdateMessage } from '@/types/market';

interface AgentStore {
  agentUpdate: AgentUpdateMessage | null;
  selectedAgentId: string | null;
  setAgentUpdate: (update: AgentUpdateMessage) => void;
  setSelectedAgentId: (id: string | null) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agentUpdate: null,
  selectedAgentId: null,
  setAgentUpdate: (agentUpdate) => set({ agentUpdate }),
  setSelectedAgentId: (selectedAgentId) => set({ selectedAgentId }),
}));
