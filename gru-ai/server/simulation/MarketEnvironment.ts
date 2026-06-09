import type { MarketEnvironmentSnapshot, MarketState, Trade } from './types.js';
import type { MarketEvent } from './types.js';

export class MarketEnvironment {
  private snapshot: MarketEnvironmentSnapshot = {
    marketSentiment: 0,
    bullPower: 0.5,
    bearPower: 0.5,
    volatility: 0,
    capitalFlow: 0,
    lastNewsImpact: 0,
  };

  updateFromState(state: MarketState, trades: Trade[]): void {
    const changeImpulse = Math.max(-1, Math.min(1, state.stock.changePct / 10));
    const buyVolume = trades.filter((trade) => trade.aggressorSide === 'buy').reduce((sum, trade) => sum + trade.amount, 0);
    const sellVolume = trades.filter((trade) => trade.aggressorSide === 'sell').reduce((sum, trade) => sum + trade.amount, 0);
    const flow = buyVolume - sellVolume;
    const flowImpulse = Math.max(-1, Math.min(1, flow / 1_000_000));
    const sentiment = this.snapshot.marketSentiment * 0.85 + changeImpulse * 0.1 + flowImpulse * 0.05;

    this.snapshot = {
      marketSentiment: Number(Math.max(-1, Math.min(1, sentiment)).toFixed(4)),
      bullPower: Number(Math.max(0, Math.min(1, 0.5 + sentiment / 2)).toFixed(4)),
      bearPower: Number(Math.max(0, Math.min(1, 0.5 - sentiment / 2)).toFixed(4)),
      volatility: Number(Math.min(1, Math.abs(state.stock.changePct) / 10).toFixed(4)),
      capitalFlow: Number((this.snapshot.capitalFlow * 0.9 + flow).toFixed(2)),
      lastNewsImpact: Number((this.snapshot.lastNewsImpact * 0.88).toFixed(4)),
    };
  }

  applyNewsEvent(event: MarketEvent): void {
    const sentiment = this.snapshot.marketSentiment + event.sentimentDelta;
    this.snapshot = {
      ...this.snapshot,
      marketSentiment: Number(Math.max(-1, Math.min(1, sentiment)).toFixed(4)),
      bullPower: Number(Math.max(0, Math.min(1, 0.5 + sentiment / 2)).toFixed(4)),
      bearPower: Number(Math.max(0, Math.min(1, 0.5 - sentiment / 2)).toFixed(4)),
      lastNewsImpact: Number(Math.max(-1, Math.min(1, event.impact)).toFixed(4)),
    };
  }

  getSnapshot(): MarketEnvironmentSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = {
      marketSentiment: 0,
      bullPower: 0.5,
      bearPower: 0.5,
      volatility: 0,
      capitalFlow: 0,
      lastNewsImpact: 0,
    };
  }
}
