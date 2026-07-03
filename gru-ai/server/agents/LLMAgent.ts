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
  quant: '量化研究员',
  northbound: '北向资金',
  national_team: '国家队',
  training_quant: 'Hermes Agent',
};

export class LLMAgent extends BaseInvestorAgent {
  private readonly llm: LLMClient;

  constructor(seed: LLMAgentSeed) {
    super(seed);
    this.llm = seed.llmClient ?? new LLMClient();
  }

  async decide(market: MarketState, environment: MarketEnvironmentSnapshot): Promise<AgentDecision> {
    const tick = market.status.tick;
    this.state.status = 'thinking';

    try {
      const raw = await this.llm.chat([
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: this.buildUserPrompt(market, environment) },
      ]);
      const parsed = this.parseDecision(raw);
      this.pushSayMessage(parsed, tick);
      return this.toAgentDecision(parsed, market, tick);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return this.hold(tick, `LLM 调用失败: ${reason.slice(0, 120)}`);
    }
  }

  private buildSystemPrompt(): string {
    const role = TYPE_LABELS[this.state.type] ?? this.state.type;
    const persona = this.state.personaSkill;
    const personaLines = persona
      ? [
          `Persona Skill: ${persona.label}，蒸馏来源：${persona.distilledFrom}。`,
          `角色定位：${persona.role}`,
          `核心规则：${persona.coreRules.join(' / ')}`,
          `风险纪律：${persona.riskDiscipline}`,
          `进化规则：${persona.evolutionRule}`,
        ]
      : [];

    return [
      `你是 ${role} 投资者，名字是“${this.state.name}”。`,
      `你的风险偏好为 ${(this.state.riskAppetite * 100).toFixed(0)}%，当前情绪为 ${(this.state.sentiment * 100).toFixed(0)}%。`,
      ...personaLines,
      '你只能在 buy、sell、hold、cancel 中选择 action。',
      'A 股交易必须遵守 100 股整数倍、价格限制、涨跌停和可用持仓约束。',
      '你需要同时考虑新闻冲击、社交推荐、盘口深度、资金拥挤和风险反馈。',
      '如果社交热度很高但流动性或封单变弱，优先降低仓位或等待确认。',
      '可以通过 say 字段广播一句话，也可以通过 sayTo 指定接收者 agent id。',
      '输出必须是合法 JSON，不要包含 markdown、解释段落或注释。',
    ].join('\n');
  }

  private buildUserPrompt(market: MarketState, environment: MarketEnvironmentSnapshot): string {
    const stock = market.stock;
    const orderBook = market.orderBook;
    const metrics = market.metrics;
    const recentTrades = market.recentTrades.slice(0, 10);
    const inbox = this.state.inbox ?? [];
    const activeNews = this.state.activeNews ?? [];
    const socialFeed = this.state.socialFeed ?? [];

    return [
      `当前 tick: ${market.status.tick}, 虚拟时间: ${market.status.virtualTime}, 阶段: ${market.status.phase}`,
      `标的: ${stock.name}(${stock.symbol}) 价格 ${stock.currentPrice.toFixed(2)} 涨跌 ${stock.changePct.toFixed(2)}%`,
      `涨停 ${stock.upperLimit.toFixed(2)} 跌停 ${stock.lowerLimit.toFixed(2)}`,
      `盘口: 买一 ${orderBook.bestBid ?? '-'} 卖一 ${orderBook.bestAsk ?? '-'} 失衡 ${metrics.orderBookImbalance.toFixed(3)}`,
      `市场情绪 ${metrics.marketSentiment.toFixed(3)} 波动率 ${metrics.volatility.toFixed(3)} 流动性 ${metrics.liquidityDepth.toFixed(0)}`,
      `外部环境: 新闻冲击 ${environment.lastNewsImpact.toFixed(3)} 牛方 ${environment.bullPower.toFixed(3)} 熊方 ${environment.bearPower.toFixed(3)}`,
      `最近成交: ${recentTrades.map((trade) => `${trade.aggressorSide === 'buy' ? 'B' : 'S'}${trade.quantity}@${trade.price.toFixed(2)}`).join(', ') || '暂无'}`,
      `你的持仓: 现金 ${this.state.cash.toFixed(2)} 持仓 ${this.state.position} 可用 ${this.state.availablePosition} 成本 ${this.state.avgCost.toFixed(2)}`,
      `未成交订单: ${this.state.openOrderIds.join(', ') || '无'}`,
      activeNews.length > 0
        ? `可见新闻:\n${activeNews.map((news) => `- ${news.title} / ${news.impact_direction} / reaction=${news.reaction_strength.toFixed(2)} / bias=${news.action_bias}`).join('\n')}`
        : '可见新闻: 暂无',
      inbox.length > 0
        ? `收到的消息:\n${inbox.map((message) => `- ${message.from}: ${message.content}`).join('\n')}`
        : '收到的消息: 无',
      socialFeed.length > 0
        ? `社交推荐 feed:\n${socialFeed.map((post) => `- [${post.agentName}/${post.postType}/热度${post.score.toFixed(2)}]: ${post.content}`).join('\n')}`
        : '社交推荐 feed: 暂无',
      '请输出 JSON:',
      JSON.stringify({
        action: 'buy | sell | hold | cancel',
        targetQuantity: 100,
        limitPrice: stock.currentPrice,
        confidence: 0.7,
        urgency: 0.5,
        reason: '简短决策理由',
        say: '可选：广播给其他 Agent 的一句话',
        sayTo: '可选：指定接收者 agent id',
        cancelOrderId: '可选：取消订单时填写',
      }),
    ].join('\n');
  }

  private parseDecision(raw: string): LLMRawDecision {
    const parsed = JSON.parse(this.extractJson(raw)) as Partial<LLMRawDecision>;
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
    const reason = (parsed.reason ?? 'LLM 决策').slice(0, 200);

    if (parsed.action === 'hold') {
      return this.hold(tick, reason);
    }

    if (parsed.action === 'cancel') {
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

    const price = typeof parsed.limitPrice === 'number' && parsed.limitPrice > 0
      ? parsed.limitPrice
      : market.stock.currentPrice;
    const quantity = typeof parsed.targetQuantity === 'number' && parsed.targetQuantity > 0
      ? parsed.targetQuantity
      : 100;

    return this.buildDecision(
      parsed.action,
      tick,
      quantity,
      price,
      reason,
      parsed.confidence,
      parsed.urgency,
    );
  }
}
