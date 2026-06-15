import { randomUUID } from 'node:crypto';
import { BaseInvestorAgent, type InvestorSeed } from './BaseInvestorAgent.js';
import type { AgentDecision, AgentMessage, MarketEnvironmentSnapshot, MarketState } from '../simulation/types.js';
import { LLMClient } from '../llm/LLMClient.js';

export interface LLMAgentSeed extends InvestorSeed {
  llmClient?: LLMClient;
}

interface LLMRawDecision {
  action: 'buy' | 'sell' | 'hold' | 'cancel';
  targetQuantity?: number;
  limitPrice?: number;
  confidence?: number;
  urgency?: number;
  reason?: string;
  say?: string;
  sayTo?: string;
  cancelOrderId?: string;
}

const TYPE_LABELS: Record<string, string> = {
  retail: '散户',
  hot_money: '游资',
  mutual_fund: '公募基金',
  quant: '量化基金',
  northbound: '北向资金',
  national_team: '国家队',
  training_quant: '训练量化',
};

export class LLMAgent extends BaseInvestorAgent {
  private readonly llm: LLMClient;

  constructor(seed: LLMAgentSeed) {
    super(seed);
    this.llm = seed.llmClient ?? new LLMClient();
  }

  async decide(market: MarketState, _environment: MarketEnvironmentSnapshot): Promise<AgentDecision> {
    const tick = market.status.tick;
    this.state.status = 'thinking';

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(market, _environment);

    try {
      const raw = await this.llm.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = this.parseDecision(raw, tick);
      this.pushSayMessage(parsed, tick);
      return this.toAgentDecision(parsed, market, tick);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return this.hold(tick, `LLM调用失败: ${reason.slice(0, 120)}`);
    }
  }

  private buildSystemPrompt(): string {
    const role = TYPE_LABELS[this.state.type] ?? this.state.type;
    return [
      `你是一名${role}投资者，名叫“${this.state.name}”。`,
      `你的风险偏好为${(this.state.riskAppetite * 100).toFixed(0)}%，当前情绪为${(this.state.sentiment * 100).toFixed(0)}%。`,
      `你只能在 buy（买入）、sell（卖出）、hold（观望）中选择 action。`,
      `如果之前有未成交订单且认为应该取消，可以使用 action: "cancel" 并提供 cancelOrderId。`,
      `你可以通过 "say" 字段向其他 Agent 发送一句话（广播），通过 "sayTo" 指定接收者 agent id。`,
      `输出必须是合法 JSON，不要包含 markdown 代码块、解释或注释。`,
    ].join('\n');
  }

  private buildUserPrompt(market: MarketState, _environment: MarketEnvironmentSnapshot): string {
    const stock = market.stock;
    const orderBook = market.orderBook;
    const metrics = market.metrics;
    const recentTrades = market.recentTrades.slice(0, 10);
    const inbox = this.state.inbox ?? [];

    return [
      `当前 tick: ${market.status.tick}, 虚拟时间: ${market.status.virtualTime}, 阶段: ${market.status.phase}`,
      `市场: ${stock.name}(${stock.symbol}) 价格 ${stock.currentPrice.toFixed(2)} 涨跌 ${stock.changePct.toFixed(2)}%`,
      `涨停 ${stock.upperLimit.toFixed(2)} 跌停 ${stock.lowerLimit.toFixed(2)}`,
      `盘口 买一 ${orderBook.bestBid ?? '-'} 卖一 ${orderBook.bestAsk ?? '-'} 失衡 ${metrics.orderBookImbalance.toFixed(3)}`,
      `市场情绪 ${metrics.marketSentiment.toFixed(3)} 波动率 ${metrics.volatility.toFixed(3)} 流动性 ${metrics.liquidityDepth.toFixed(0)}`,
      `最近成交: ${recentTrades.map((t) => `${t.aggressorSide === 'buy' ? 'B' : 'S'}${t.quantity}@${t.price.toFixed(2)}`).join(', ')}`,
      `你的持仓: 现金 ${this.state.cash.toFixed(2)} 持仓 ${this.state.position} 可用 ${this.state.availablePosition} 成本 ${this.state.avgCost.toFixed(2)}`,
      `未成交订单: ${this.state.openOrderIds.join(', ') || '无'}`,
      inbox.length > 0 ? `收到的消息:\n${inbox.map((m) => `- ${m.from}: ${m.content}`).join('\n')}` : '收到的消息: 无',
      `请输出 JSON:`,
      JSON.stringify({
        action: 'buy | sell | hold | cancel',
        targetQuantity: 100,
        limitPrice: stock.currentPrice,
        confidence: 0.7,
        urgency: 0.5,
        reason: '简短决策理由',
        say: '可选：发给其他 Agent 的话',
        sayTo: '可选：指定接收者 agent id',
        cancelOrderId: '取消订单时填写',
      }),
    ].join('\n');
  }

  private parseDecision(raw: string, _tick: number): LLMRawDecision {
    const cleaned = this.extractJson(raw);
    const parsed = JSON.parse(cleaned) as Partial<LLMRawDecision>;
    if (!parsed.action || !['buy', 'sell', 'hold', 'cancel'].includes(parsed.action)) {
      throw new Error(`invalid action: ${parsed.action}`);
    }
    return {
      action: parsed.action,
      targetQuantity: parsed.targetQuantity,
      limitPrice: parsed.limitPrice,
      confidence: parsed.confidence,
      urgency: parsed.urgency,
      reason: parsed.reason,
      say: parsed.say,
      sayTo: parsed.sayTo,
      cancelOrderId: parsed.cancelOrderId,
    };
  }

  private extractJson(raw: string): string {
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) return codeBlock[1].trim();
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return raw.slice(firstBrace, lastBrace + 1).trim();
    }
    return raw.trim();
  }

  private pushSayMessage(parsed: LLMRawDecision, tick: number): void {
    const content = (parsed.say ?? '').trim();
    if (!content) return;
    const message: AgentMessage = {
      from: this.state.id,
      to: parsed.sayTo?.trim() || undefined,
      content,
      tick,
    };
    this.state.lastSay = message;
    this.state.outbox = [...this.state.outbox, message];
  }

  private toAgentDecision(parsed: LLMRawDecision, market: MarketState, tick: number): AgentDecision {
    const action = parsed.action;
    const reason = (parsed.reason ?? 'LLM决策').slice(0, 200);

    if (action === 'hold') {
      return this.hold(tick, reason);
    }

    if (action === 'cancel') {
      this.state.status = 'ordering';
      this.state.lastAction = 'cancel';
      return {
        id: randomUUID(),
        agentId: this.state.id,
        tick,
        action: 'cancel',
        cancelOrderId: parsed.cancelOrderId,
        confidence: Number(Math.max(0, Math.min(1, parsed.confidence ?? 0.5)).toFixed(2)),
        urgency: Number(Math.max(0, Math.min(1, parsed.urgency ?? 0.5)).toFixed(2)),
        reason,
      };
    }

    const side = action;
    const price = typeof parsed.limitPrice === 'number' && parsed.limitPrice > 0
      ? parsed.limitPrice
      : market.stock.currentPrice;
    const quantity = typeof parsed.targetQuantity === 'number' && parsed.targetQuantity > 0
      ? parsed.targetQuantity
      : 100;

    return this.buildDecision(
      side,
      tick,
      quantity,
      price,
      reason,
      parsed.confidence,
      parsed.urgency,
    );
  }
}
