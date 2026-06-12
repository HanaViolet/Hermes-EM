import { create } from 'zustand';
import type { TrainingUpdateMessage } from '@/types/market';

interface TrainingStore {
  trainingUpdate: TrainingUpdateMessage | null;
  setTrainingUpdate: (update: TrainingUpdateMessage) => void;
}

export const useTrainingStore = create<TrainingStore>((set) => ({
  trainingUpdate: null,
  setTrainingUpdate: (trainingUpdate) => set({ trainingUpdate }),
}));
