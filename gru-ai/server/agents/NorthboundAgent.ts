import { BaseInvestorAgent, type InvestorSeed } from './BaseInvestorAgent.js';
import type { AgentDecision, MarketEnvironmentSnapshot, MarketState } from '../simulation/types.js';

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export class NorthboundAgent extends BaseInvestorAgent {
  constructor(seed: InvestorSeed) {
    super({ ...seed, type: 'northbound' });
  }

  decide(market: MarketState, environment: MarketEnvironmentSnapshot): AgentDecision {
    const tick = market.status.tick;
    if (this.state.openOrderIds.length > 0) return this.hold(tick, '北向资金订单排队');
    if (tick % 5 !== 0) return this.hold(tick, '北向低频观察');

    const price = market.stock.currentPrice;
    const discount = price < market.stock.previousClose * 0.995;
    const canBuyLots = Math.floor(this.state.cash / (price * 100));
    const canSellLots = Math.floor(this.state.availablePosition / 100);

    if ((discount || environment.lastNewsImpact > 0.25) && canBuyLots > 0) {
      const lots = Math.max(8, Math.min(canBuyLots, 28));
      return this.buildDecision('buy', tick, lots * 100, round2(price - 0.01), '北向资金价值买入', 0.78, 0.45);
    }

    if (market.stock.changePct > 5 && canSellLots > 0) {
      const lots = Math.max(6, Math.min(canSellLots, 20));
      return this.buildDecision('sell', tick, lots * 100, round2(price + 0.02), '北向资金高位减仓', 0.66, 0.42);
    }

    return this.hold(tick, '估值信号不足');
  }
}
