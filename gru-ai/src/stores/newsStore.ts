import { create } from 'zustand';
import type { SyntheticNewsUpdate } from '@/types/market';

interface NewsStore {
  newsUpdate: SyntheticNewsUpdate | null;
  selectedNewsId: string | null;
  setNewsUpdate: (update: SyntheticNewsUpdate) => void;
  setSelectedNewsId: (id: string | null) => void;
}

export const useNewsStore = create<NewsStore>((set) => ({
  newsUpdate: null,
  selectedNewsId: null,
  setNewsUpdate: (newsUpdate) => set((state) => ({
    newsUpdate,
    selectedNewsId: state.selectedNewsId ?? newsUpdate.news[0]?.news_id ?? null,
  })),
  setSelectedNewsId: (selectedNewsId) => set({ selectedNewsId }),
}));
