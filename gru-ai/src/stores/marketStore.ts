import { create } from 'zustand';
import type { MarketState, MarketUpdateMessage, SimulatedStockSummary } from '@/types/market';

interface MarketStore {
  marketState: MarketState | null;
  marketStates: Record<string, MarketState>;
  activeSymbol: string | null;
  stockList: SimulatedStockSummary[];
  marketUpdate: MarketUpdateMessage | null;
  setMarketState: (state: MarketState) => void;
  setStockList: (payload: { activeSymbol: string; stocks: SimulatedStockSummary[] }) => void;
  selectStock: (symbol: string) => void;
  setMarketUpdate: (update: MarketUpdateMessage) => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  marketState: null,
  marketStates: {},
  activeSymbol: null,
  stockList: [],
  marketUpdate: null,
  setMarketState: (marketState) => set((state) => {
    const symbol = marketState.stock.symbol;
    const activeSymbol = state.activeSymbol ?? symbol;
    const marketStates = { ...state.marketStates, [symbol]: marketState };
    return {
      marketStates,
      activeSymbol,
      marketState: symbol === activeSymbol || !state.marketState ? marketState : state.marketState,
    };
  }),
  setStockList: ({ activeSymbol, stocks }) => set((state) => ({
    activeSymbol,
    stockList: stocks,
    marketState: state.marketStates[activeSymbol] ?? state.marketState,
  })),
  selectStock: (symbol) => set((state) => ({
    activeSymbol: symbol,
    marketState: state.marketStates[symbol] ?? state.marketState,
  })),
  setMarketUpdate: (marketUpdate) => set({ marketUpdate }),
}));
