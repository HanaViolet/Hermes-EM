import { BaseInvestorAgent, type InvestorSeed } from './BaseInvestorAgent.js';
import type { AgentDecision, MarketEnvironmentSnapshot, MarketState } from '../simulation/types.js';

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export class MutualFundAgent extends BaseInvestorAgent {
  constructor(seed: InvestorSeed) {
    super({ ...seed, type: 'mutual_fund' });
  }

  decide(market: MarketState, environment: MarketEnvironmentSnapshot): AgentDecision {
    const tick = market.status.tick;
    if (this.state.openOrderIds.length > 0) return this.hold(tick, '机构分批订单等待中');
    if (tick % 4 !== 0) return this.hold(tick, '公募低频调仓');

    const price = market.stock.currentPrice;
    const valuationComfort = price <= market.stock.previousClose * 1.02;
    const canBuyLots = Math.floor(this.state.cash / (price * 100));
    const canSellLots = Math.floor(this.state.availablePosition / 100);

    if ((valuationComfort || environment.marketSentiment < -0.15) && canBuyLots > 0) {
      const lots = Math.max(10, Math.min(canBuyLots, 40));
      return this.buildDecision('buy', tick, lots * 100, round2(price - 0.02), '公募按估值分批建仓', 0.76, 0.42);
    }

    if (market.stock.changePct > 4 && canSellLots > 0) {
      const lots = Math.max(8, Math.min(canSellLots, 32));
      return this.buildDecision('sell', tick, lots * 100, round2(price + 0.03), '涨幅较大，公募再平衡减仓', 0.68, 0.38);
    }

    return this.hold(tick, '长期资金保持观察');
  }
}
