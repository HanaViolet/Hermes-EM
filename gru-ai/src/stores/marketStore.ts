import { create } from 'zustand';
import type { AgentUpdateMessage, MarketState, MarketUpdateMessage, SimulatedStockSummary } from '@/types/market';

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
  mergeMarketUpdate: (update: MarketUpdateMessage) => void;
  mergeAgentUpdate: (update: AgentUpdateMessage) => void;
}

function carryOverAgentFields(current: MarketState | null, next: MarketState): MarketState {
  if (!current || current.stock.symbol !== next.stock.symbol) return next;
  return {
    ...next,
    overview: current.overview,
    groups: current.groups,
    topProfitAgents: current.topProfitAgents,
    topLossAgents: current.topLossAgents,
    behaviorEvents: current.behaviorEvents,
  };
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
    const merged = carryOverAgentFields(state.marketState, marketState);
    const marketStates = { ...state.marketStates, [symbol]: merged };
    return {
      marketStates,
      activeSymbol,
      marketState: symbol === activeSymbol || !state.marketState ? merged : state.marketState,
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
  mergeMarketUpdate: (update) => set((state) => {
    if (!state.marketState || state.marketState.stock.symbol !== update.stock.symbol) {
      return { marketUpdate: update };
    }
    const { changePercent, limitUpPrice, limitDownPrice, ...stockRest } = update.stock;
    const next: MarketState = {
      ...state.marketState,
      status: {
        ...state.marketState.status,
        tick: update.tick,
        phase: update.tradingPhase,
        virtualTime: update.simulationTime,
      },
      stock: {
        ...state.marketState.stock,
        ...stockRest,
        changePct: changePercent,
        upperLimit: limitUpPrice,
        lowerLimit: limitDownPrice,
      },
      orderBook: update.orderBook,
      recentTrades: update.recentTrades,
      metrics: update.metrics,
      events: update.events,
      scenario: update.scenario,
      lastUpdated: new Date().toISOString(),
    };
    const marketStates = { ...state.marketStates, [next.stock.symbol]: next };
    return { marketState: next, marketStates, marketUpdate: update };
  }),
  mergeAgentUpdate: (update) => set((state) => {
    if (!state.marketState) return {};
    const next: MarketState = {
      ...state.marketState,
      overview: update.overview,
      groups: update.groups,
      topProfitAgents: update.topProfitAgents,
      topLossAgents: update.topLossAgents,
      behaviorEvents: update.behaviorEvents,
    };
    const marketStates = { ...state.marketStates, [next.stock.symbol]: next };
    return { marketState: next, marketStates };
  }),
}));
