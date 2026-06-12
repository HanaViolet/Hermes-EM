import type { MarketEnvironmentSnapshot, MarketScenario, MarketState, ScenarioNewsEvent, Trade } from './types.js';
import type { MarketEvent } from './types.js';

export class MarketEnvironment {
  private snapshot: MarketEnvironmentSnapshot = {
    marketSentiment: 0,
    bullPower: 0.5,
    bearPower: 0.5,
    volatility: 0,
    capitalFlow: 0,
    lastNewsImpact: 0,
    liquidity: 0.72,
    macroRisk: 0.18,
    halted: false,
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
      volatility: Number(Math.max(0, Math.min(1, this.snapshot.volatility * 0.82 + Math.abs(state.stock.changePct) / 10 * 0.18)).toFixed(4)),
      capitalFlow: Number((this.snapshot.capitalFlow * 0.9 + flow).toFixed(2)),
      lastNewsImpact: Number((this.snapshot.lastNewsImpact * 0.88).toFixed(4)),
      liquidity: Number(Math.max(0.05, Math.min(1, this.snapshot.liquidity * 0.98 + (trades.length > 0 ? 0.01 : -0.002))).toFixed(4)),
      macroRisk: this.snapshot.macroRisk,
      halted: this.snapshot.halted,
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
      liquidity: event.type === 'liquidity_shock'
        ? Number(Math.max(0.05, this.snapshot.liquidity - 0.25).toFixed(4))
        : this.snapshot.liquidity,
      volatility: Number(Math.max(0, Math.min(1, this.snapshot.volatility + Math.abs(event.impact) * 0.12)).toFixed(4)),
      halted: event.type === 'halt' ? true : event.type === 'resume' ? false : this.snapshot.halted,
    };
  }

  applyScenario(scenario: MarketScenario): void {
    this.snapshot = {
      marketSentiment: scenario.environment.marketSentiment,
      bullPower: Number(Math.max(0, Math.min(1, 0.5 + scenario.environment.marketSentiment / 2)).toFixed(4)),
      bearPower: Number(Math.max(0, Math.min(1, 0.5 - scenario.environment.marketSentiment / 2)).toFixed(4)),
      volatility: scenario.environment.volatility,
      capitalFlow: 0,
      lastNewsImpact: 0,
      liquidity: scenario.environment.liquidity,
      macroRisk: scenario.environment.macroRisk,
      halted: false,
    };
  }

  applyScenarioNews(event: ScenarioNewsEvent): void {
    const sentiment = this.snapshot.marketSentiment + event.sentimentImpact;
    this.snapshot = {
      ...this.snapshot,
      marketSentiment: Number(Math.max(-1, Math.min(1, sentiment)).toFixed(4)),
      bullPower: Number(Math.max(0, Math.min(1, 0.5 + sentiment / 2)).toFixed(4)),
      bearPower: Number(Math.max(0, Math.min(1, 0.5 - sentiment / 2)).toFixed(4)),
      volatility: Number(Math.max(0, Math.min(1, this.snapshot.volatility + event.volatilityImpact)).toFixed(4)),
      liquidity: Number(Math.max(0.05, Math.min(1, this.snapshot.liquidity + event.liquidityImpact)).toFixed(4)),
      lastNewsImpact: Number(Math.max(-1, Math.min(1, event.sentimentImpact)).toFixed(4)),
      halted: event.type === 'halt' ? true : event.type === 'resume' ? false : this.snapshot.halted,
    };
  }

  getSnapshot(): MarketEnvironmentSnapshot {
    return { ...this.snapshot };
  }

  reset(scenario?: MarketScenario): void {
    if (scenario) {
      this.applyScenario(scenario);
      return;
    }
    this.snapshot = {
      marketSentiment: 0,
      bullPower: 0.5,
      bearPower: 0.5,
      volatility: 0,
      capitalFlow: 0,
      lastNewsImpact: 0,
      liquidity: 0.72,
      macroRisk: 0.18,
      halted: false,
    };
  }
}
