import { create } from 'zustand';
import type { SocialState } from '@/types/social';

interface SocialStore {
  socialState: SocialState | null;
  selectedAgentId: string | null;
  setSocialState: (state: SocialState) => void;
  selectAgent: (id: string | null) => void;
}

export const useSocialStore = create<SocialStore>((set) => ({
  socialState: null,
  selectedAgentId: null,
  setSocialState: (socialState) => set({ socialState }),
  selectAgent: (selectedAgentId) => set({ selectedAgentId }),
}));
