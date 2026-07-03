import { randomUUID } from 'node:crypto';
import type { AgentDecision, AgentPersonaSkill, AgentState, AgentType, MarketEnvironmentSnapshot, MarketEvent, MarketState, OrderSide } from '../simulation/types.js';
import type { AgentNewsExposure } from '../news/types.js';

export interface InvestorSeed {
  id: string;
  type?: AgentType;
  name: string;
  cash: number;
  position: number;
  avgCost?: number;
  sentiment: number;
  riskAppetite: number;
  groupSize?: number;
  strategyParams?: Record<string, number | boolean | string>;
  currentStrategy?: string;
  personaSkill?: AgentPersonaSkill;
}

export abstract class BaseInvestorAgent {
  protected readonly state: AgentState;

  constructor(seed: InvestorSeed) {
    const avgCost = seed.avgCost ?? (seed.position > 0 ? 100 : 0);
    this.state = {
      id: seed.id,
      type: seed.type ?? 'retail',
      name: seed.name,
      cash: seed.cash,
      position: seed.position,
      availablePosition: seed.position,
      todayBought: 0,
      avgCost,
      initialWealth: seed.cash + seed.position * avgCost,
      pnl: 0,
      sentiment: seed.sentiment,
      riskAppetite: seed.riskAppetite,
      status: 'idle',
      lastAction: 'hold',
      capitalFlow: 0,
      openOrderIds: [],
      inbox: [],
      outbox: [],
      groupSize: seed.groupSize,
      strategyParams: seed.strategyParams,
      currentStrategy: seed.currentStrategy,
      personaSkill: seed.personaSkill,
    };
  }

  configureGroup(groupSize: number, strategyParams: Record<string, number | boolean | string>, currentStrategy: string): void {
    this.state.groupSize = groupSize;
    this.state.strategyParams = strategyParams;
    this.state.currentStrategy = currentStrategy;
  }

  getState(): AgentState {
    return {
      ...this.state,
      openOrderIds: [...this.state.openOrderIds],
      inbox: [...this.state.inbox],
      outbox: [...this.state.outbox],
      personaSkill: this.state.personaSkill,
      socialFeed: this.state.socialFeed ? [...this.state.socialFeed] : undefined,
    };
  }

  mutableState(): AgentState {
    return this.state;
  }

  reactToEvent(event: MarketEvent): void {
    if (!event.affectedAgentTypes.includes(this.state.type)) return;
    this.state.sentiment = Math.max(-1, Math.min(1, this.state.sentiment + event.sentimentDelta));
  }

  applyNewsEffects(activeNews: AgentNewsExposure[]): void {
    const visible = activeNews
      .filter((news) => news.received)
      .slice(0, 5)
      .map((news) => ({
        news_id: news.news_id,
        title: news.title,
        source_type: news.source_type,
        impact_direction: news.impact_direction,
        current_impact: news.current_impact,
        reaction_strength: news.reaction_strength,
        action_bias: news.action_bias,
        expected_return_delta: news.expected_return_delta,
        sentiment_delta: news.sentiment_delta,
      }));
    this.state.activeNews = visible;
    this.state.lastNewsReaction = visible[0];
    if (visible.length === 0) return;

    const sentimentDelta = visible.reduce((sum, news) => sum + news.sentiment_delta * Math.max(0.2, news.reaction_strength), 0);
    const riskDelta = activeNews.reduce((sum, news) => sum + news.risk_preference_delta * Math.max(0.2, news.reaction_strength), 0);
    this.state.sentiment = Math.max(-1, Math.min(1, this.state.sentiment + sentimentDelta));
    this.state.riskAppetite = Math.max(0.05, Math.min(1, this.state.riskAppetite + riskDelta));
  }

  protected hold(tick: number, reason: string): AgentDecision {
    this.state.status = 'idle';
    this.state.lastAction = 'hold';
    return {
      id: randomUUID(),
      agentId: this.state.id,
      tick,
      action: 'hold',
      confidence: 0.5,
      urgency: 0,
      reason,
    };
  }

  protected buildDecision(
    side: OrderSide,
    tick: number,
    quantity: number,
    price: number,
    reason: string,
    confidence = 0.65,
    urgency = 0.55,
  ): AgentDecision {
    this.state.status = 'ordering';
    this.state.lastAction = side;
    const decision: AgentDecision = {
      id: randomUUID(),
      agentId: this.state.id,
      tick,
      action: side,
      side,
      confidence: Number(Math.max(0, Math.min(1, confidence)).toFixed(2)),
      targetQuantity: Math.max(100, Math.floor(quantity / 100) * 100),
      limitPrice: Number(price.toFixed(2)),
      urgency: Number(Math.max(0, Math.min(1, urgency)).toFixed(2)),
      reason,
    };
    this.state.lastDecision = decision;
    return decision;
  }

  abstract decide(market: MarketState, environment: MarketEnvironmentSnapshot): AgentDecision | Promise<AgentDecision>;

  protected maybeSay(tick: number, action: string, price: number, probability = 0.25): void {
    if (Math.random() > probability) return;
    const content = this.buildSayContent(action, price, this.state.sentiment);
    if (!content) return;
    const message = { from: this.state.id, content, tick };
    this.state.outbox = [...this.state.outbox, message];
    this.state.lastSay = message;
  }

  private buildSayContent(action: string, price: number, sentiment: number): string {
    const role = this.state.type;
    const p = price.toFixed(2);
    const s = (sentiment * 100).toFixed(0);

    const phrases: Record<string, string[]> = {
      buy: [
        `买入观察：当前 ${p}，情绪 ${s}%，短线资金仍在推升。`,
        `刚建仓 ${p}，先小仓位试探，继续看盘口确认。`,
        `量价配合改善，${p} 附近有交易机会，但需要控制仓位。`,
        `情绪 ${s}% 偏强，${p} 值得跟踪一笔试单。`,
      ],
      sell: [
        `先兑现一部分，${p} 附近情绪过热，需要保护收益。`,
        `${p} 附近有见顶迹象，先降低暴露。`,
        `社交热度过快升温，情绪 ${s}%，减仓等待确认。`,
        `盘口开始松动，${p} 先卖出，避免追涨回撤。`,
      ],
      hold: [
        `${p} 先观望，情绪 ${s}%，等待更明确的盘口信号。`,
        `暂时不动，先看 ${p} 附近的成交和封单变化。`,
        `市场分歧扩大，${p} 不急着下结论。`,
      ],
    };

    const overrides: Partial<Record<AgentType, Partial<Record<string, string[]>>>> = {
      hot_money: {
        buy: [`游资尝试接力 ${p}，关注封单强度。`, `热点仍在发酵，${p} 小心打板节奏。`],
        sell: [`热点退潮，${p} 先撤一部分。`, `封单变弱，${p} 不再恋战。`],
      },
      quant: {
        buy: [`量化模型显示 ${p} 附近动量与均值回归信号共振。`, `因子信号转强，${p} 触发小仓位买入。`],
        sell: [`模型提示 ${p} 附近风险收益比下降，先平部分仓位。`, `盘口不平衡转弱，${p} 触发量化减仓。`],
        hold: [`${p} 信号仍不一致，量化模型保持观望。`],
      },
      training_quant: {
        buy: [`Hermes 训练信号尝试买入 ${p}，同时监控社交拥挤度。`],
        sell: [`Hermes 训练信号降低 ${p} 暴露，优先避开情绪反转。`],
        hold: [`Hermes 等待 ${p} 的情绪、盘口和资金流共同确认。`],
      },
      mutual_fund: {
        buy: [`估值进入可配置区间，${p} 分批买入。`],
        sell: [`组合再平衡，${p} 附近适度减仓。`],
      },
      national_team: {
        buy: [`${p} 附近提供稳定买盘，守住关键流动性。`],
        hold: [`${p} 密切关注，等待极端风险触发。`],
      },
      northbound: {
        buy: [`北向资金关注 ${p} 的趋势延续与宏观风险。`],
        sell: [`宏观风险升温，${p} 附近先降低风险暴露。`],
      },
    };

    const pool = overrides[role]?.[action] ?? phrases[action] ?? phrases.hold;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
