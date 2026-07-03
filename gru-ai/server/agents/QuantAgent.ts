import { BaseInvestorAgent, type InvestorSeed } from './BaseInvestorAgent.js';
import type { AgentDecision, MarketEnvironmentSnapshot, MarketState } from '../simulation/types.js';

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export class QuantAgent extends BaseInvestorAgent {
  constructor(seed: InvestorSeed) {
    super({ ...seed, type: 'quant' });
  }

  async decide(market: MarketState, environment: MarketEnvironmentSnapshot): Promise<AgentDecision> {
    const tick = market.status.tick;
    if (this.state.openOrderIds.length > 0) return this.hold(tick, '量化订单等待盘口回报');

    const price = market.stock.currentPrice;
    const mean = market.stock.previousClose + environment.lastNewsImpact * 0.8;
    const deviation = (price - mean) / Math.max(Number.EPSILON, Math.abs(mean));
    const canBuyLots = Math.floor(this.state.cash / (price * 100));
    const canSellLots = Math.floor(this.state.availablePosition / 100);

    if ((deviation < -0.0015 || market.metrics.orderBookImbalance < -0.25) && canBuyLots > 0) {
      const lots = Math.max(1, Math.min(canBuyLots, 8));
      const decision = this.buildDecision('buy', tick, lots * 100, round2(price + 0.01), '量化均值回归买入', 0.7, 0.7);
      this.maybeSay(tick, 'buy', price, 0.3);
      return decision;
    }

    if ((deviation > 0.0015 || market.metrics.orderBookImbalance > 0.25) && canSellLots > 0) {
      const lots = Math.max(1, Math.min(canSellLots, 8));
      const decision = this.buildDecision('sell', tick, lots * 100, round2(price - 0.01), '量化均值回归卖出', 0.7, 0.7);
      this.maybeSay(tick, 'sell', price, 0.3);
      return decision;
    }

    this.maybeSay(tick, 'hold', price, 0.04);
    return this.hold(tick, '价差不足，量化观望');
  }
}
