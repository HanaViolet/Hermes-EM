import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { HotMoneyAgent } from '../agents/HotMoneyAgent.js';
import { MutualFundAgent } from '../agents/MutualFundAgent.js';
import { NationalTeamAgent } from '../agents/NationalTeamAgent.js';
import { NewsEventAgent } from '../agents/NewsEventAgent.js';
import { NorthboundAgent } from '../agents/NorthboundAgent.js';
import { QuantAgent } from '../agents/QuantAgent.js';
import { RetailAgent } from '../agents/RetailAgent.js';
import type { BaseInvestorAgent } from '../agents/BaseInvestorAgent.js';
import { SimulationStore } from '../storage/simulationStore.js';
import { AshareRulesEngine } from './AshareRulesEngine.js';
import { LimitOrderBook } from './LimitOrderBook.js';
import { MarketEnvironment } from './MarketEnvironment.js';
import { MarketState } from './MarketState.js';
import { MatchingEngine } from './MatchingEngine.js';
import { OrderGenerator } from './OrderGenerator.js';
import { SimulationClock } from './SimulationClock.js';
import type { AgentState, MarketState as MarketStateSnapshot, Order, SimulationCommand, TickContext, Trade } from './types.js';

const MAX_OPEN_ORDER_AGE_TICKS = 18;

function createRetailAgents(): BaseInvestorAgent[] {
  return [
    new RetailAgent({ id: 'retail-1', name: '散户甲', cash: 720_000, position: 2_800, sentiment: 0.45, riskAppetite: 0.8 }),
    new RetailAgent({ id: 'retail-2', name: '散户乙', cash: 640_000, position: 3_400, sentiment: -0.25, riskAppetite: 0.55 }),
    new HotMoneyAgent({ id: 'hot-money-1', name: '游资敢死队', cash: 1_800_000, position: 5_000, sentiment: 0.55, riskAppetite: 0.95 }),
    new MutualFundAgent({ id: 'mutual-fund-1', name: '公募稳健', cash: 3_200_000, position: 12_000, sentiment: 0.1, riskAppetite: 0.42 }),
    new QuantAgent({ id: 'quant-1', name: '量化Alpha', cash: 1_400_000, position: 8_000, sentiment: 0, riskAppetite: 0.72 }),
    new NorthboundAgent({ id: 'northbound-1', name: '北向长线', cash: 2_500_000, position: 9_000, sentiment: 0.18, riskAppetite: 0.5 }),
    new NationalTeamAgent({ id: 'national-team-1', name: '国家队', cash: 5_000_000, position: 18_000, sentiment: 0, riskAppetite: 0.25 }),
  ];
}

export class SimulationEngine extends EventEmitter {
  private readonly clock = new SimulationClock();
  private readonly environment = new MarketEnvironment();
  private readonly marketState = new MarketState();
  private readonly orderBook = new LimitOrderBook();
  private readonly matchingEngine = new MatchingEngine();
  private readonly rulesEngine = new AshareRulesEngine();
  private readonly orderGenerator = new OrderGenerator();
  private readonly store = new SimulationStore();
  private readonly newsAgent = new NewsEventAgent();
  private agents: BaseInvestorAgent[] = createRetailAgents();
  private forcedNewsImpact: number | undefined;

  constructor() {
    super();
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

  pause(): void {
    this.clock.pause();
  }

  reset(): void {
    this.clock.reset();
    this.environment.reset();
    this.marketState.reset();
    this.orderBook.reset();
    this.store.clear();
    this.agents = createRetailAgents();
    this.publishInitialState();
    this.emit('state', this.getState());
  }

  step(): void {
    this.clock.step();
  }

  setSpeed(speed: number): void {
    this.clock.setSpeed(speed);
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
        this.step();
        break;
      case 'set_speed':
        if (typeof command.speed === 'number') this.setSpeed(command.speed);
        break;
      case 'inject_news':
        this.forcedNewsImpact = typeof command.newsImpact === 'number' ? command.newsImpact : 0.35;
        if (!this.clock.getStatus().running) this.step();
        break;
    }
  }

  getState(): MarketStateSnapshot {
    return this.marketState.snapshot();
  }

  destroy(): void {
    this.clock.destroy();
    this.removeAllListeners();
  }

  private runTick(context: TickContext): void {
    this.marketState.setStatus(this.clock.getStatus());
    const agentStates = this.getMutableAgentStateMap();
    this.expireStaleOrders(context, agentStates);
    this.syncOpenOrders();
    this.marketState.setOrderBook(this.orderBook.snapshot());
    this.marketState.setAgents(Array.from(agentStates.values()));

    const generatedNews = this.newsAgent.generate(context, this.marketState.snapshot(), this.environment.getSnapshot(), this.forcedNewsImpact);
    this.forcedNewsImpact = undefined;
    if (generatedNews) {
      this.environment.applyNewsEvent(generatedNews);
      this.marketState.appendEvent(generatedNews);
      for (const agent of this.agents) {
        agent.reactToEvent(generatedNews);
      }
    }

    const beforeState = this.marketState.snapshot();
    const environment = this.environment.getSnapshot();

    for (const agent of this.agents) {
      const state = agent.mutableState();
      state.status = 'thinking';
      const decision = agent.decide(beforeState, environment);
      state.lastDecision = decision;

      const order = this.orderGenerator.generate(decision, state, context);
      if (!order) continue;

      const validation = this.rulesEngine.validateOrder(order, state, beforeState.stock);
      if (!validation.ok || !validation.order) {
        state.status = 'idle';
        state.lastAction = 'hold';
        this.marketState.appendEvent({
          id: randomUUID(),
          tick: context.tick,
          timestamp: new Date().toISOString(),
          type: 'rule_reject',
          title: '委托被拒',
          message: `${state.name}: ${validation.reason ?? '规则校验未通过'}`,
          impact: 0,
          sentimentDelta: 0,
          affectedAgentTypes: [state.type],
          severity: 'low',
          source: 'rules_engine',
        });
        continue;
      }

      this.orderBook.addOrder(validation.order);
      if (validation.order.side === 'sell') {
        state.availablePosition = Math.max(0, state.availablePosition - validation.order.remainingQuantity);
      }
      state.openOrderIds.push(validation.order.id);
      state.status = 'waiting';
    }

    const trades = this.matchOrders(context, beforeState.stock.currentPrice);
    this.rulesEngine.applyTradesToAgents(trades, agentStates);
    this.syncOpenOrders();
    this.marketState.setOrderBook(this.orderBook.snapshot());
    this.marketState.setAgents(Array.from(agentStates.values()));
    this.marketState.applyTrades(trades, context.virtualTime);
    this.marketState.setAgents(Array.from(agentStates.values()));
    this.environment.updateFromState(this.marketState.snapshot(), trades);

    const snapshot = this.marketState.snapshot();
    this.store.saveSnapshot(snapshot);
    this.emit('state', snapshot);
  }

  private publishInitialState(): void {
    this.marketState.setStatus(this.clock.getStatus());
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
