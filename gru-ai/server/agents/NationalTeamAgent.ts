import { BaseInvestorAgent, type InvestorSeed } from './BaseInvestorAgent.js';
import type { AgentDecision, MarketEnvironmentSnapshot, MarketState } from '../simulation/types.js';

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export class NationalTeamAgent extends BaseInvestorAgent {
  constructor(seed: InvestorSeed) {
    super({ ...seed, type: 'national_team' });
  }

  decide(market: MarketState, environment: MarketEnvironmentSnapshot): AgentDecision {
    const tick = market.status.tick;
    if (this.state.openOrderIds.length > 0) return this.hold(tick, '护盘委托等待中');

    const price = market.stock.currentPrice;
    const panic = market.stock.changePct < -3 || environment.marketSentiment < -0.35 || market.metrics.orderBookImbalance < -0.45;
    const canBuyLots = Math.floor(this.state.cash / (price * 100));

    if (panic && canBuyLots > 0) {
      const lots = Math.max(20, Math.min(canBuyLots, 70));
      return this.buildDecision('buy', tick, lots * 100, round2(price + 0.04), '国家队护盘买入', 0.88, 0.65);
    }

    return this.hold(tick, '未触发护盘条件');
  }
}
