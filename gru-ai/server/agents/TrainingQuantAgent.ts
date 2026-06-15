import { BaseInvestorAgent, type InvestorSeed } from './BaseInvestorAgent.js';
import type { AgentDecision, MarketEnvironmentSnapshot, MarketState, QuantAction } from '../simulation/types.js';
import { randomUUID } from 'node:crypto';

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export class TrainingQuantAgent extends BaseInvestorAgent {
  private queuedAction: QuantAction | null = null;

  constructor(seed: InvestorSeed) {
    super({ ...seed, type: 'training_quant' });
  }

  queueExternalAction(action: QuantAction): void {
    this.queuedAction = action;
  }

  async decide(market: MarketState, _environment: MarketEnvironmentSnapshot): Promise<AgentDecision> {
    const tick = market.status.tick;
    if (this.state.openOrderIds.length > 0) return this.hold(tick, '训练量化 Agent 等待订单回报');

    const action = this.queuedAction;
    this.queuedAction = null;
    if (!action || action.type === 'hold') return this.hold(tick, '训练接口未提交动作，保持观察');
    if (action.type === 'cancel') {
      return {
        id: randomUUID(),
        agentId: this.state.id,
        tick,
        action: 'cancel',
        confidence: 0.8,
        urgency: 0.5,
        reason: '训练接口请求撤单',
        cancelOrderId: action.orderId,
      };
    }

    const price = action.price ?? market.stock.currentPrice;
    return this.buildDecision(
      action.type,
      tick,
      action.quantity,
      round2(price),
      `训练接口提交 ${action.type === 'buy' ? '买入' : '卖出'} 动作`,
      0.78,
      action.orderType === 'market' ? 0.92 : 0.62,
    );
  }
}
