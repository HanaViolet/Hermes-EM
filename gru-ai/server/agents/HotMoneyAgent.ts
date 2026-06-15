import { BaseInvestorAgent, type InvestorSeed } from './BaseInvestorAgent.js';
import type { AgentDecision, MarketEnvironmentSnapshot, MarketState } from '../simulation/types.js';

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export class HotMoneyAgent extends BaseInvestorAgent {
  constructor(seed: InvestorSeed) {
    super({ ...seed, type: 'hot_money' });
  }

  async decide(market: MarketState, environment: MarketEnvironmentSnapshot): Promise<AgentDecision> {
    const tick = market.status.tick;
    if (this.state.openOrderIds.length > 0) return this.hold(tick, '等待游资委托反馈');

    const price = market.stock.currentPrice;
    const nearLimitUp = (market.stock.upperLimit - price) / Math.max(Number.EPSILON, price) <= 0.05;
    const strongTape = environment.marketSentiment > 0.18 || market.metrics.orderBookImbalance > 0.2 || nearLimitUp;
    const canBuyLots = Math.floor(this.state.cash / (price * 100));
    const canSellLots = Math.floor(this.state.availablePosition / 100);

    if (strongTape && canBuyLots > 0 && Math.random() < 0.78) {
      const lots = Math.max(5, Math.min(canBuyLots, nearLimitUp ? 35 : 18));
      return this.buildDecision('buy', tick, lots * 100, round2(price + (nearLimitUp ? 0.18 : 0.08)), '游资尝试打板/接力', 0.82, 0.92);
    }

    if (!strongTape && canSellLots > 0 && Math.random() < 0.58) {
      const lots = Math.max(3, Math.min(canSellLots, 20));
      return this.buildDecision('sell', tick, lots * 100, round2(price - 0.09), '热点退潮，游资兑现', 0.72, 0.86);
    }

    return this.hold(tick, '等待明确热点信号');
  }
}
