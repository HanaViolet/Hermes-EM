import { randomUUID } from 'node:crypto';
import type { AgentDecision, AgentState, AgentType, MarketEnvironmentSnapshot, MarketEvent, MarketState, OrderSide } from '../simulation/types.js';
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
}

export abstract class BaseInvestorAgent {
  protected readonly state: AgentState;

  constructor(seed: InvestorSeed) {
    this.state = {
      id: seed.id,
      type: seed.type ?? 'retail',
      name: seed.name,
      cash: seed.cash,
      position: seed.position,
      availablePosition: seed.position,
      todayBought: 0,
      avgCost: seed.avgCost ?? (seed.position > 0 ? 100 : 0),
      pnl: 0,
      sentiment: seed.sentiment,
      riskAppetite: seed.riskAppetite,
      status: 'idle',
      lastAction: 'hold',
      capitalFlow: 0,
      openOrderIds: [],
      groupSize: seed.groupSize,
      strategyParams: seed.strategyParams,
      currentStrategy: seed.currentStrategy,
    };
  }

  configureGroup(groupSize: number, strategyParams: Record<string, number | boolean | string>, currentStrategy: string): void {
    this.state.groupSize = groupSize;
    this.state.strategyParams = strategyParams;
    this.state.currentStrategy = currentStrategy;
  }

  getState(): AgentState {
    return { ...this.state, openOrderIds: [...this.state.openOrderIds] };
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

  abstract decide(market: MarketState, environment: MarketEnvironmentSnapshot): AgentDecision;
}
