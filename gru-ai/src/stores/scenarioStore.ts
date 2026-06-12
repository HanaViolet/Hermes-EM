import { create } from 'zustand';
import type { ScenarioUpdateMessage } from '@/types/market';

interface ScenarioStore {
  scenarioUpdate: ScenarioUpdateMessage | null;
  setScenarioUpdate: (update: ScenarioUpdateMessage) => void;
}

export const useScenarioStore = create<ScenarioStore>((set) => ({
  scenarioUpdate: null,
  setScenarioUpdate: (scenarioUpdate) => set({ scenarioUpdate }),
}));
