import { BaseInvestorAgent, type InvestorSeed } from './BaseInvestorAgent.js';
import type { AgentDecision, MarketEnvironmentSnapshot, MarketState } from '../simulation/types.js';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export class RetailAgent extends BaseInvestorAgent {
  constructor(seed: InvestorSeed) {
    super(seed);
    this.state.type = 'retail';
  }

  async decide(market: MarketState, environment: MarketEnvironmentSnapshot): Promise<AgentDecision> {
    const tick = market.status.tick;

    if (this.state.openOrderIds.length > 0) {
      this.state.status = 'waiting';
      return this.hold(tick, '等待上一笔委托成交');
    }

    const price = market.stock.currentPrice;
    const momentum = clamp(market.stock.changePct / 10, -1, 1);
    const emotionalBias = clamp(this.state.sentiment * 0.55 + environment.marketSentiment * 0.3 + momentum * 0.15, -1, 1);
    const activityThreshold = 0.28 + (1 - this.state.riskAppetite) * 0.28;
    const maxAffordableLots = Math.floor(this.state.cash / (price * 100));
    const canBuy = maxAffordableLots > 0;
    const canSell = this.state.availablePosition >= 100;
    const bookNeedsBuy = market.orderBook.bids.length === 0 && canBuy;
    const bookNeedsSell = market.orderBook.asks.length === 0 && canSell;

    if (!bookNeedsBuy && !bookNeedsSell && Math.random() > activityThreshold + Math.abs(emotionalBias) * 0.2) {
      this.state.status = 'idle';
      this.state.lastAction = 'hold';
      return this.hold(tick, '情绪不足，暂时观望');
    }

    const wantsBuy = bookNeedsBuy && bookNeedsSell
      ? this.state.sentiment >= 0 || !canSell
      : bookNeedsBuy || (!bookNeedsSell && emotionalBias + (Math.random() - 0.5) * 0.7 >= 0);

    if ((wantsBuy && canBuy) || !canSell) {
      if (!canBuy) return this.hold(tick, '现金不足，无法买入');
      const lots = Math.max(1, Math.min(maxAffordableLots, Math.ceil(this.state.riskAppetite * 4)));
      const aggression = 0.01 + this.state.riskAppetite * 0.06 + Math.max(0, emotionalBias) * 0.04;
      return this.buildDecision('buy', tick, lots * 100, round2(price + aggression), '追随上涨情绪提交买单', 0.55 + Math.random() * 0.35, 0.4 + this.state.riskAppetite * 0.5);
    }

    if (canSell) {
      const lotsHeld = Math.floor(this.state.availablePosition / 100);
      const lots = Math.max(1, Math.min(lotsHeld, Math.ceil((0.5 + this.state.riskAppetite) * 2)));
      const aggression = 0.01 + this.state.riskAppetite * 0.05 + Math.max(0, -emotionalBias) * 0.04;
      return this.buildDecision('sell', tick, lots * 100, round2(price - aggression), '担心回落提交卖单', 0.55 + Math.random() * 0.35, 0.4 + this.state.riskAppetite * 0.5);
    }

    return this.hold(tick, '没有可执行方向');
  }

}
