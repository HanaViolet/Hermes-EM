import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { HotMoneyAgent } from '../agents/HotMoneyAgent.js';
import { LLMAgent } from '../agents/LLMAgent.js';
import { MutualFundAgent } from '../agents/MutualFundAgent.js';
import { NationalTeamAgent } from '../agents/NationalTeamAgent.js';
import { NewsEventAgent } from '../agents/NewsEventAgent.js';
import { NorthboundAgent } from '../agents/NorthboundAgent.js';
import { QuantAgent } from '../agents/QuantAgent.js';
import { RetailAgent } from '../agents/RetailAgent.js';
import { TrainingQuantAgent } from '../agents/TrainingQuantAgent.js';
import type { BaseInvestorAgent } from '../agents/BaseInvestorAgent.js';
import { LLMClient } from '../llm/LLMClient.js';
import { loadConfig } from '../config.js';
import { SyntheticFinancialNewsEngine } from '../news/SyntheticFinancialNewsEngine.js';
import type { ManualNewsRequest, NewsEngineConfig, NewsEventTemplate, SyntheticNewsRecord, SyntheticNewsUpdate } from '../news/types.js';
import { SimulationStore } from '../storage/simulationStore.js';
import { AshareRulesEngine } from './AshareRulesEngine.js';
import { LimitOrderBook } from './LimitOrderBook.js';
import { MarketEnvironment } from './MarketEnvironment.js';
import { MarketState } from './MarketState.js';
import { MatchingEngine } from './MatchingEngine.js';
import { OrderGenerator } from './OrderGenerator.js';
import { ScenarioLoader } from './scenarios/ScenarioLoader.js';
import { SimulationClock } from './SimulationClock.js';
import { SocialEngine } from '../social/SocialEngine.js';
import { getPersonaSkillForType, personaSkillToStrategyParams } from '../skills/personaSkills.js';
import type {
  AgentMessage,
  AgentScenarioConfig,
  AgentState,
  AgentType,
  ManualEventType,
  MarketEvent,
  MarketScenario,
  MarketState as MarketStateSnapshot,
  Order,
  QuantAction,
  QuantObservation,
  ScenarioNewsEvent,
  ScenarioUpdateMessage,
  SimulationCommand,
  TickContext,
  Trade,
  TrainingUpdateMessage,
} from './types.js';

const MAX_OPEN_ORDER_AGE_TICKS = 18;

function mid([min, max]: [number, number]): number {
  return (min + max) / 2;
}

function seedFromConfig(id: string, type: AgentType, name: string, config: AgentScenarioConfig) {
  const personaSkill = getPersonaSkillForType(type);
  return {
    id,
    type,
    name,
    cash: Math.round(mid(config.initialCashRange)),
    position: Math.floor(mid(config.initialPositionRange) / 100) * 100,
    sentiment: Number(mid(config.sentimentRange).toFixed(2)),
    riskAppetite: Number(mid(config.riskPreferenceRange).toFixed(2)),
    groupSize: config.count,
    strategyParams: {
      ...config.strategyParams,
      ...personaSkillToStrategyParams(personaSkill),
    },
    currentStrategy: personaSkill.tradeStyle || readableStrategyName(type),
    personaSkill,
  };
}

function readableStrategyName(type: AgentType): string {
  const labels: Partial<Record<AgentType, string>> = {
    retail: '追涨杀跌 / 群体行为',
    hot_money: '打板接力 / 炸板撤退',
    mutual_fund: '估值中枢 / 慢速调仓',
    quant: '动量 + 均值回归 + 盘口不平衡',
    northbound: '趋势流入 / 宏观风险过滤',
    national_team: '极端下跌护盘',
    training_quant: '外部训练接口驱动',
    news: '新闻事件驱动',
  };
  return labels[type] ?? '新闻事件驱动';
}

function strategyName(type: AgentType): string {
  switch (type) {
    case 'retail':
      return '追涨杀跌 / 羊群行为';
    case 'hot_money':
      return '打板接力 / 炸板撤退';
    case 'mutual_fund':
      return '估值中枢 / 慢速调仓';
    case 'quant':
      return '动量 + 均值回归 + 盘口不平衡';
    case 'northbound':
      return '趋势流入 / 宏观风险过滤';
    case 'national_team':
      return '极端下跌护盘';
    case 'training_quant':
      return '外部训练接口驱动';
    default:
      return '新闻事件驱动';
  }
}

const LLM_AGENT_TYPES: AgentType[] = ['quant', 'hot_money', 'mutual_fund'];

function createAgent(seed: ReturnType<typeof seedFromConfig> & { llmClient?: LLMClient }): BaseInvestorAgent {
  if (seed.llmClient && LLM_AGENT_TYPES.includes(seed.type)) {
    return new LLMAgent({
      ...seed,
      strategyParams: { ...seed.strategyParams, llm: true },
    });
  }
  switch (seed.type) {
    case 'retail':
      return new RetailAgent(seed);
    case 'hot_money':
      return new HotMoneyAgent(seed);
    case 'mutual_fund':
      return new MutualFundAgent(seed);
    case 'quant':
      return new QuantAgent(seed);
    case 'northbound':
      return new NorthboundAgent(seed);
    case 'national_team':
      return new NationalTeamAgent(seed);
    case 'training_quant':
      return new TrainingQuantAgent(seed);
    default:
      return new RetailAgent(seed);
  }
}

function createAgents(scenario: MarketScenario, llmClient?: LLMClient): BaseInvestorAgent[] {
  const seed = (id: string, type: AgentType, name: string, config: AgentScenarioConfig, sentiment?: number) => {
    const base = seedFromConfig(id, type, readableAgentName(id, type, name), config);
    if (sentiment !== undefined) base.sentiment = sentiment;
    return { ...base, llmClient };
  };

  const agents: BaseInvestorAgent[] = [
    createAgent(seed('retail-1', 'retail', '散户群体代表A', scenario.agents.retail)),
    createAgent(seed('retail-2', 'retail', '散户群体代表B', scenario.agents.retail, scenario.environment.marketSentiment - 0.18)),
    createAgent(seed('hot-money-1', 'hot_money', '游资打板席位', scenario.agents.hotMoney)),
    createAgent(seed('mutual-fund-1', 'mutual_fund', '公募稳健组合', scenario.agents.mutualFund)),
    createAgent(seed('quant-1', 'quant', '内置量化Alpha', scenario.agents.quant)),
    createAgent(seed('northbound-1', 'northbound', '北向长线资金', scenario.agents.northbound)),
    createAgent(seed('national-team-1', 'national_team', '国家队稳定账户', scenario.agents.nationalTeam)),
  ];

  if (scenario.agents.trainingQuantAgent) {
    agents.push(createAgent(seed('training-quant-1', 'training_quant', '训练量化Agent', scenario.agents.trainingQuantAgent)));
  }

  return agents;
}

function readableAgentName(id: string, type: AgentType, fallback: string): string {
  const names: Record<string, string> = {
    'retail-1': '散户群体代表A',
    'retail-2': '散户群体代表B',
    'hot-money-1': '游资打板席位',
    'mutual-fund-1': '公募稳健组合',
    'quant-1': '内置量化Alpha',
    'northbound-1': '北向长线资金',
    'national-team-1': '国家队稳定账户',
    'training-quant-1': '训练量化Agent',
  };
  const byType: Partial<Record<AgentType, string>> = {
    retail: '散户代表',
    hot_money: '游资代表',
    mutual_fund: '公募基金',
    quant: '量化研究员',
    northbound: '北向资金',
    national_team: '国家队',
    training_quant: 'Hermes Agent',
    news: '新闻事件',
  };
  return names[id] ?? byType[type] ?? fallback;
}

function eventImpact(eventType: ManualEventType): number {
  switch (eventType) {
    case 'positive_news':
    case 'hot_money_attack':
    case 'national_team_support':
    case 'resume':
      return 0.55;
    case 'negative_news':
    case 'retail_panic':
    case 'hot_money_retreat':
    case 'quant_sell_pressure':
    case 'liquidity_crisis':
    case 'halt':
      return -0.55;
    default:
      return 0;
  }
}

function manualEventTitle(eventType: ManualEventType): string {
  switch (eventType) {
    case 'positive_news':
      return '手动注入利好新闻';
    case 'negative_news':
      return '手动注入利空新闻';
    case 'retail_panic':
      return '触发散户恐慌';
    case 'hot_money_attack':
      return '触发游资打板';
    case 'hot_money_retreat':
      return '触发游资撤退';
    case 'national_team_support':
      return '触发国家队护盘';
    case 'quant_sell_pressure':
      return '触发量化卖压';
    case 'liquidity_crisis':
      return '触发流动性危机';
    case 'halt':
      return '触发停牌';
    case 'resume':
      return '恢复交易';
  }
}

function toMarketEvent(event: ScenarioNewsEvent, context: TickContext): MarketEvent {
  return {
    id: event.id,
    tick: context.tick,
    timestamp: new Date().toISOString(),
    type: event.type,
    title: event.title,
    message: event.description,
    impact: event.sentimentImpact,
    sentimentDelta: event.sentimentImpact,
    affectedAgentTypes: event.affectedAgentTypes,
    severity: Math.abs(event.sentimentImpact) > 0.6 ? 'high' : 'medium',
    source: 'scenario',
  };
}

export class SimulationEngine extends EventEmitter {
  private readonly clock = new SimulationClock();
  private readonly scenarioLoader = new ScenarioLoader();
  private currentScenario = this.scenarioLoader.getDefault();
  private readonly environment = new MarketEnvironment();
  private readonly marketState = new MarketState();
  private readonly orderBook = new LimitOrderBook();
  private readonly matchingEngine = new MatchingEngine();
  private readonly rulesEngine = new AshareRulesEngine();
  private readonly orderGenerator = new OrderGenerator();
  private readonly store = new SimulationStore();
  private readonly newsAgent = new NewsEventAgent();
  private readonly syntheticNewsEngine = new SyntheticFinancialNewsEngine();
  private readonly socialEngine = new SocialEngine();
  private readonly llmClient: LLMClient | undefined;
  private pendingMessages: AgentMessage[] = [];
  private agents: BaseInvestorAgent[] = [];
  private forcedNewsImpact: number | undefined;
  private readonly triggeredNewsIds = new Set<string>();
  private triggeredNews: ScenarioNewsEvent[] = [];
  private trainingEpisode = 1;
  private trainingStep = 0;
  private lastReward = 0;
  private cumulativeReward = 0;
  private previousTrainingWealth = 1_000_000;

  constructor(initialScenario?: MarketScenario) {
    super();
    const config = loadConfig();
    this.llmClient = config.llm?.apiKey ? new LLMClient(config.llm) : undefined;
    if (initialScenario) {
      this.currentScenario = initialScenario;
    }
    this.agents = createAgents(this.currentScenario, this.llmClient);
    this.previousTrainingWealth = this.trainingAgentInitialWealth();
    this.environment.applyScenario(this.currentScenario);
    this.marketState.reset(this.currentScenario);
    this.clock.on('tick', (context: TickContext) => this.runTick(context));
    this.clock.on('status', () => {
      this.marketState.setStatus(this.clock.getStatus());
      this.emit('status', this.clock.getStatus());
    });
    this.publishInitialState();
  }

  start(): void {
    this.clock.start();
  }

  getSocialEngine(): SocialEngine {
    return this.socialEngine;
  }

  pause(): void {
    this.clock.pause();
  }

  reset(scenario = this.currentScenario): void {
    this.clock.reset();
    this.environment.reset(scenario);
    this.marketState.reset(scenario);
    this.marketState.setEnvironment(this.environment.getSnapshot());
    this.orderBook.reset();
    this.store.clear();
    this.currentScenario = scenario;
    this.agents = createAgents(this.currentScenario, this.llmClient);
    this.triggeredNewsIds.clear();
    this.triggeredNews = [];
    this.pendingMessages = [];
    this.trainingStep = 0;
    this.lastReward = 0;
    this.cumulativeReward = 0;
    this.previousTrainingWealth = this.trainingAgentInitialWealth();
    this.syntheticNewsEngine.clear();
    this.publishInitialState();
    this.emit('scenario', this.getScenarioUpdate());
    this.emit('training', this.getTrainingUpdate());
    this.emit('news', this.getNewsUpdate());
    this.emit('state', this.getState());
  }

  async step(): Promise<void> {
    await this.clock.step();
  }

  setSpeed(speed: number): void {
    this.clock.setSpeed(speed);
  }

  getStatus() {
    return this.clock.getStatus();
  }

  handleCommand(command: SimulationCommand): void {
    switch (command.command) {
      case 'start':
        this.start();
        break;
      case 'pause':
        this.pause();
        break;
      case 'reset':
        this.reset();
        break;
      case 'step':
        void this.step();
        break;
      case 'set_speed':
        if (typeof command.speed === 'number') this.setSpeed(command.speed);
        break;
      case 'inject_news':
        this.forcedNewsImpact = typeof command.newsImpact === 'number' ? command.newsImpact : 0.35;
        if (!this.clock.getStatus().running) {
          void this.step();
        } else {
          this.emit('state', this.getState());
        }
        break;
      case 'set_scenario':
        if (command.scenarioId) this.reset(this.scenarioLoader.get(command.scenarioId));
        break;
      case 'inject_event':
        if (command.eventType) {
          this.injectManualEvent(command.eventType);
          this.emit('state', this.getState());
        }
        if (!this.clock.getStatus().running) void this.step();
        break;
      case 'external_action':
        if (command.action) this.queueTrainingAction(command.action);
        if (!this.clock.getStatus().running) void this.step();
        break;
      case 'training_reset':
        this.trainingEpisode += 1;
        this.reset(command.scenarioId ? this.scenarioLoader.get(command.scenarioId) : this.currentScenario);
        break;
      case 'generate_news': {
        const record = this.generateSyntheticNews(command.newsRequest as ManualNewsRequest | undefined);
        if (!record) {
          this.emit('error', { message: '生成新闻失败：无可用模板或一致性检查未通过，请尝试切换事件类型/来源或调整 seed。' });
        }
        break;
      }
      case 'update_news_config':
        this.updateNewsConfig(command.newsConfig ?? {});
        break;
      case 'clear_news':
        this.clearNews();
        break;
      default:
        this.emit('error', { message: `Unknown simulation command: ${(command as SimulationCommand).command}` });
    }
  }

  getState(): MarketStateSnapshot {
    return this.marketState.snapshot();
  }

  getScenarioUpdate(): ScenarioUpdateMessage {
    return {
      type: 'scenario_update',
      currentScenario: this.currentScenario,
      availableScenarios: this.scenarioLoader.list(),
      triggeredNews: [...this.triggeredNews],
      upcomingNews: this.currentScenario.newsEvents.filter((event) => !this.triggeredNewsIds.has(event.id)),
    };
  }

  getTrainingUpdate(): TrainingUpdateMessage {
    const observation = this.observe();
    const trainingAgent = this.trainingAgentState();
    const totalWealth = observation.agent.totalWealth;
    return {
      type: 'training_update',
      tick: observation.tick,
      episode: this.trainingEpisode,
      step: this.trainingStep,
      reward: Number(this.lastReward.toFixed(2)),
      cumulativeReward: Number(this.cumulativeReward.toFixed(2)),
      done: Boolean(this.currentScenario.trainingConfig && observation.tick >= this.currentScenario.trainingConfig.maxTicks),
      trainingAgent: {
        id: trainingAgent?.id ?? 'training-quant-1',
        cash: trainingAgent?.cash ?? 0,
        position: trainingAgent?.position ?? 0,
        totalWealth,
        pnl: trainingAgent?.pnl ?? 0,
        returnRate: Number(((totalWealth - this.trainingAgentInitialWealth()) / Math.max(1, this.trainingAgentInitialWealth())).toFixed(4)),
        lastAction: trainingAgent?.lastAction ?? 'hold',
      },
      observation,
    };
  }

  getNewsUpdate(): SyntheticNewsUpdate {
    return this.syntheticNewsEngine.getUpdate(this.clock.getStatus().tick);
  }

  getNewsRecord(newsId: string): SyntheticNewsRecord | undefined {
    return this.syntheticNewsEngine.getRecord(newsId);
  }

  getActiveNewsForAgent(agentId: string) {
    return this.syntheticNewsEngine.getActiveNewsForAgent(agentId, this.clock.getStatus().tick);
  }

  listNewsTemplates(): NewsEventTemplate[] {
    return this.syntheticNewsEngine.listTemplates();
  }

  addNewsTemplate(templateConfig: NewsEventTemplate): void {
    this.syntheticNewsEngine.addTemplate(templateConfig);
    this.emit('news', this.getNewsUpdate());
  }

  updateNewsConfig(partial: Partial<NewsEngineConfig> | Record<string, unknown>): NewsEngineConfig {
    const config = this.syntheticNewsEngine.updateConfig(partial as Partial<NewsEngineConfig>);
    this.emit('news', this.getNewsUpdate());
    return config;
  }

  clearNews(): void {
    this.syntheticNewsEngine.clear();
    this.emit('news', this.getNewsUpdate());
  }

  generateSyntheticNews(request?: ManualNewsRequest): SyntheticNewsRecord | null {
    const record = this.syntheticNewsEngine.generate(this.marketState.snapshot(), Array.from(this.getMutableAgentStateMap().values()), request);
    if (!record) return null;
    this.applyMarketEvent(this.syntheticNewsEngine.toMarketEvent(record), false);
    this.emit('news', this.getNewsUpdate());
    this.emit('state', this.getState());
    return record;
  }

  observe(): QuantObservation {
    const state = this.getState();
    const prices = state.priceSeries.map((point) => point.price);
    const short = prices.slice(-12);
    const long = prices.slice(-40);
    const average = (values: number[]) => values.length === 0 ? state.stock.currentPrice : values.reduce((sum, value) => sum + value, 0) / values.length;
    const bidDepth = state.orderBook.bids.reduce((sum, level) => sum + level.quantity, 0);
    const askDepth = state.orderBook.asks.reduce((sum, level) => sum + level.quantity, 0);
    const recentVolume = state.recentTrades.slice(0, 20).reduce((sum, trade) => sum + trade.quantity, 0);
    const agent = this.trainingAgentState();
    const totalWealth = agent ? agent.cash + agent.position * state.stock.currentPrice : 1_000_000;
    const latestNews = state.events.find((event) => ['positive_news', 'negative_news', 'policy_news', 'policy', 'earnings', 'rumor', 'macro', 'liquidity_shock'].includes(event.type));

    return {
      tick: state.status.tick,
      simulationTime: state.status.virtualTime,
      price: {
        current: state.stock.currentPrice,
        changePercent: state.stock.changePct,
        movingAverageShort: Number(average(short).toFixed(4)),
        movingAverageLong: Number(average(long).toFixed(4)),
        volatility: state.metrics.volatility,
      },
      orderBook: {
        bestBid: state.orderBook.bestBid ?? state.stock.currentPrice,
        bestAsk: state.orderBook.bestAsk ?? state.stock.currentPrice,
        spread: state.orderBook.spread ?? 0,
        bidDepth,
        askDepth,
        imbalance: state.metrics.orderBookImbalance,
      },
      trades: {
        recentVolume,
        activeBuyRatio: state.metrics.activeBuyRatio,
        activeSellRatio: state.metrics.activeSellRatio,
      },
      market: {
        sentiment: state.metrics.marketSentiment,
        liquidity: state.metrics.liquidityDepth,
        volatility: state.metrics.volatility,
        tradingPhase: state.status.phase,
      },
      agent: {
        cash: agent?.cash ?? 1_000_000,
        position: agent?.position ?? 0,
        availablePosition: agent?.availablePosition ?? 0,
        totalWealth,
        unrealizedPnl: agent ? agent.position * (state.stock.currentPrice - agent.avgCost) : 0,
      },
      news: {
        latestSentimentImpact: latestNews?.sentimentDelta ?? 0,
        latestLiquidityImpact: latestNews?.type === 'liquidity_shock' ? -0.3 : 0,
        hasRecentNews: Boolean(latestNews && state.status.tick - latestNews.tick <= 20),
      },
    };
  }

  destroy(): void {
    this.clock.destroy();
    this.removeAllListeners();
  }

  private async runTick(context: TickContext): Promise<void> {
    this.marketState.setStatus(this.clock.getStatus());
    const agentStates = this.getMutableAgentStateMap();
    this.expireStaleOrders(context, agentStates);
    this.syncOpenOrders();
    this.marketState.setOrderBook(this.orderBook.snapshot());
    this.marketState.setAgents(Array.from(agentStates.values()));

    this.triggerScenarioNews(context);
    const generatedNews = this.newsAgent.generate(context, this.marketState.snapshot(), this.environment.getSnapshot(), this.forcedNewsImpact);
    this.forcedNewsImpact = undefined;
    if (generatedNews) {
      this.applyMarketEvent(generatedNews);
    }

    const syntheticRecord = this.syntheticNewsEngine.maybeGenerate(this.marketState.snapshot(), Array.from(agentStates.values()));
    if (syntheticRecord) {
      this.applyMarketEvent(this.syntheticNewsEngine.toMarketEvent(syntheticRecord), false);
      this.marketState.setEnvironment(this.environment.getSnapshot());
    }

    this.marketState.setEnvironment(this.environment.getSnapshot());
    const beforeState = this.marketState.snapshot();
    const environment = this.environment.getSnapshot();

    if (!environment.halted) {
      this.distributeMessages();
      const decisions = await Promise.all(
        this.agents.map(async (agent) => {
          const state = agent.mutableState();
          state.status = 'thinking';
          agent.applyNewsEffects(this.syntheticNewsEngine.getActiveNewsForAgent(state.id, context.tick));
          const decision = await agent.decide(beforeState, environment);
          state.lastDecision = decision;
          return { agent, state, decision };
        }),
      );

      for (const { state, decision } of decisions) {
        if (decision.action === 'cancel' && decision.cancelOrderId) {
          const cancelled = this.orderBook.cancelOrder(decision.cancelOrderId, '训练接口撤单');
          if (cancelled) state.openOrderIds = state.openOrderIds.filter((id) => id !== decision.cancelOrderId);
          continue;
        }

        const order = this.orderGenerator.generate(decision, state, context);
        if (!order) continue;

        const validation = this.rulesEngine.validateOrder(order, state, beforeState.stock);
        if (!validation.ok || !validation.order) {
          this.appendRuleReject(context, state, validation.reason);
          continue;
        }

        this.orderBook.addOrder(validation.order);
        if (validation.order.side === 'sell') {
          state.availablePosition = Math.max(0, state.availablePosition - validation.order.remainingQuantity);
        }
        state.openOrderIds.push(validation.order.id);
        state.status = 'waiting';
      }

    } else {
      this.marketState.appendEvent({
        id: randomUUID(),
        tick: context.tick,
        timestamp: new Date().toISOString(),
        type: 'system',
        title: '停牌中',
        message: '当前场景处于停牌状态，订单生成和撮合暂停。',
        impact: 0,
        sentimentDelta: 0,
        affectedAgentTypes: ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team', 'training_quant'],
        severity: 'medium',
        source: 'simulation',
      });
    }

    const trades = environment.halted ? [] : this.matchOrders(context, beforeState.stock.currentPrice);
    this.rulesEngine.applyTradesToAgents(trades, agentStates);
    this.syncOpenOrders();
    this.marketState.setOrderBook(this.orderBook.snapshot());
    this.marketState.setAgents(Array.from(agentStates.values()));
    this.marketState.applyTrades(trades, context.virtualTime);
    this.environment.updateFromState(this.marketState.snapshot(), trades);
    this.marketState.setEnvironment(this.environment.getSnapshot());
    this.syntheticNewsEngine.updateDecayAndFeedback(context.tick, this.marketState.snapshot());
    const socialState = this.socialEngine.tick(Array.from(agentStates.values()), context.tick);
    if (!environment.halted) {
      this.collectMessages();
    }
    this.marketState.setAgents(Array.from(agentStates.values()));

    const wealth = this.trainingAgentWealth();
    const reward = wealth - this.previousTrainingWealth;
    this.lastReward = reward;
    this.cumulativeReward += reward;
    this.previousTrainingWealth = wealth;
    this.trainingStep += 1;

    const snapshot = this.marketState.snapshot();
    this.store.saveSnapshot(snapshot);
    this.emit('state', snapshot);
    this.emit('scenario', this.getScenarioUpdate());
    this.emit('training', this.getTrainingUpdate());
    this.emit('news', this.getNewsUpdate());

    // 社交网络：每 tick 更新并广播（复用已有的 agentStates Map）
    this.emit('social', socialState);
  }

  private distributeMessages(): void {
    for (const agent of this.agents) {
      const state = agent.mutableState();
      state.inbox = this.pendingMessages.filter((message) => !message.to || message.to === state.id);
      state.outbox = [];
    }
  }

  private collectMessages(): void {
    const messages: AgentMessage[] = [];
    for (const agent of this.agents) {
      const state = agent.mutableState();
      messages.push(...state.outbox);
      state.outbox = [];
    }
    this.pendingMessages = messages;
  }

  private publishInitialState(): void {
    this.marketState.setStatus(this.clock.getStatus());
    this.marketState.setEnvironment(this.environment.getSnapshot());
    this.marketState.setOrderBook(this.orderBook.snapshot());
    this.marketState.setAgents(Array.from(this.getMutableAgentStateMap().values()));
    this.store.saveSnapshot(this.marketState.snapshot());
  }

  private getMutableAgentStateMap(): Map<string, AgentState> {
    return new Map(this.agents.map((agent) => {
      const state = agent.mutableState();
      return [state.id, state];
    }));
  }

  private syncOpenOrders(): void {
    for (const agent of this.agents) {
      const state = agent.mutableState();
      state.openOrderIds = state.openOrderIds.filter((id) => this.orderBook.hasOpenOrder(id));
      if (state.openOrderIds.length > 0 && state.status !== 'filled') {
        state.status = 'waiting';
      } else if (state.status !== 'filled') {
        state.status = 'idle';
      }
    }
  }

  private triggerScenarioNews(context: TickContext): void {
    for (const news of this.currentScenario.newsEvents) {
      if (news.tick > context.tick || this.triggeredNewsIds.has(news.id)) continue;
      this.triggeredNewsIds.add(news.id);
      this.triggeredNews = [news, ...this.triggeredNews].slice(0, 24);
      this.environment.applyScenarioNews(news);
      this.applyMarketEvent(toMarketEvent(news, context));
    }
  }

  private applyMarketEvent(event: MarketEvent, reactToAgents = true): void {
    this.environment.applyNewsEvent(event);
    this.marketState.appendEvent(event);
    if (!reactToAgents) return;
    for (const agent of this.agents) {
      agent.reactToEvent(event);
    }
  }

  private injectManualEvent(eventType: ManualEventType): void {
    const impact = eventImpact(eventType);
    const affected: AgentType[] = eventType === 'national_team_support'
      ? ['national_team', 'retail', 'mutual_fund']
      : eventType === 'hot_money_attack' || eventType === 'hot_money_retreat'
        ? ['hot_money', 'retail', 'quant']
        : eventType === 'quant_sell_pressure'
          ? ['quant', 'training_quant', 'retail']
          : ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team', 'training_quant'];
    const type: MarketEvent['type'] = eventType === 'positive_news'
      ? 'positive_news'
      : eventType === 'negative_news'
        ? 'negative_news'
        : eventType === 'liquidity_crisis'
          ? 'liquidity_shock'
          : eventType === 'halt' || eventType === 'resume'
            ? eventType
            : 'agent_behavior';
    this.applyMarketEvent({
      id: randomUUID(),
      tick: this.clock.getStatus().tick,
      timestamp: new Date().toISOString(),
      type,
      title: manualEventTitle(eventType),
      message: `${manualEventTitle(eventType)}，影响市场情绪、流动性和 Agent 下单倾向。`,
      impact,
      sentimentDelta: impact,
      affectedAgentTypes: affected,
      severity: Math.abs(impact) > 0.45 ? 'high' : 'medium',
      source: 'simulation',
    });
  }

  private queueTrainingAction(action: QuantAction): void {
    const trainingAgent = this.agents.find((agent): agent is TrainingQuantAgent => agent instanceof TrainingQuantAgent);
    trainingAgent?.queueExternalAction(action);
  }

  private trainingAgentState(): AgentState | undefined {
    return this.getState().agents.find((agent) => agent.type === 'training_quant');
  }

  private trainingAgentInitialWealth(): number {
    const agent = this.agents.find((item): item is TrainingQuantAgent => item instanceof TrainingQuantAgent);
    return agent ? agent.getState().initialWealth : 1_000_000;
  }

  private trainingAgentWealth(): number {
    const state = this.marketState.snapshot();
    const agent = state.agents.find((item) => item.type === 'training_quant');
    return agent ? Number((agent.cash + agent.position * state.stock.currentPrice).toFixed(2)) : 1_000_000;
  }

  private appendRuleReject(context: TickContext, state: AgentState, reason?: string): void {
    state.status = 'idle';
    state.lastAction = 'hold';
    this.marketState.appendEvent({
      id: randomUUID(),
      tick: context.tick,
      timestamp: new Date().toISOString(),
      type: 'rule_reject',
      title: '委托被拒',
      message: `${state.name}: ${reason ?? '规则校验未通过'}`,
      impact: 0,
      sentimentDelta: 0,
      affectedAgentTypes: [state.type],
      severity: 'low',
      source: 'rules_engine',
    });
  }

  private expireStaleOrders(context: TickContext, agentStates: Map<string, AgentState>): Order[] {
    if (context.phase === 'call_auction') return [];

    const expiredOrders = this.orderBook.expireOrders(context.tick, MAX_OPEN_ORDER_AGE_TICKS);
    for (const order of expiredOrders) {
      const state = agentStates.get(order.agentId);
      if (state) {
        if (order.side === 'sell') {
          state.availablePosition = Math.min(state.position, state.availablePosition + order.remainingQuantity);
        }
        state.openOrderIds = state.openOrderIds.filter((id) => id !== order.id);
        if (state.status === 'waiting') state.status = 'idle';
      }
      this.marketState.appendEvent({
        id: randomUUID(),
        tick: context.tick,
        timestamp: new Date().toISOString(),
        type: 'order_cancel',
        title: '委托过期',
        message: `${state?.name ?? order.agentId}: ${order.side === 'buy' ? '买单' : '卖单'} ${order.remainingQuantity} 股 @ ${order.price.toFixed(2)} 被撤销`,
        impact: 0,
        sentimentDelta: 0,
        affectedAgentTypes: [state?.type ?? order.agentType],
        severity: 'low',
        source: 'simulation',
      });
    }
    return expiredOrders;
  }

  private matchOrders(context: TickContext, referencePrice: number): Trade[] {
    if (context.phase === 'call_auction' && context.tick < 3) {
      return [];
    }

    if (context.phase === 'call_auction') {
      const auctionPrice = this.rulesEngine.calculateAuctionPrice(this.orderBook.snapshot(20), referencePrice);
      if (!auctionPrice) return [];
      const trades = this.matchingEngine.matchAtPrice(this.orderBook, context, auctionPrice);
      if (trades.length > 0) {
        this.marketState.appendEvent({
          id: randomUUID(),
          tick: context.tick,
          timestamp: new Date().toISOString(),
          type: 'auction',
          title: '集合竞价成交',
          message: `统一成交价 ${auctionPrice.toFixed(2)}，成交 ${trades.reduce((sum, trade) => sum + trade.quantity, 0)} 股`,
          impact: 0,
          sentimentDelta: 0,
          affectedAgentTypes: ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team'],
          severity: 'medium',
          source: 'matching_engine',
        });
      }
      return trades;
    }

    return this.matchingEngine.match(this.orderBook, context);
  }
}
