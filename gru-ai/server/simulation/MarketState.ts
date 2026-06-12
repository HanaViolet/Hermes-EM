import { randomUUID } from 'node:crypto';
import type {
  AgentState,
  AgentType,
  MarketEnvironmentSnapshot,
  MarketEvent,
  MarketMetrics,
  MarketScenario,
  MarketScenarioSummary,
  MarketState as MarketStateSnapshot,
  OrderBookSnapshot,
  SimulationStatus,
  StockState,
  Trade,
} from './types.js';
import { ScenarioLoader, scenarioSummary } from './scenarios/ScenarioLoader.js';

const AGENT_TYPES: AgentType[] = ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team', 'news', 'training_quant'];

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function createInitialEnvironment(scenario?: MarketScenario): MarketEnvironmentSnapshot {
  const sentiment = scenario?.environment.marketSentiment ?? 0;
  return {
    marketSentiment: sentiment,
    bullPower: Number(Math.max(0, Math.min(1, 0.5 + sentiment / 2)).toFixed(4)),
    bearPower: Number(Math.max(0, Math.min(1, 0.5 - sentiment / 2)).toFixed(4)),
    volatility: scenario?.environment.volatility ?? 0,
    capitalFlow: 0,
    lastNewsImpact: 0,
    liquidity: scenario?.environment.liquidity ?? 0.72,
    macroRisk: scenario?.environment.macroRisk ?? 0.18,
    halted: false,
  };
}

function createInitialStock(scenario?: MarketScenario): StockState {
  const previousClose = scenario?.stock.previousClose ?? 10;
  const currentPrice = scenario?.stock.initialPrice ?? previousClose;
  const board = scenario?.stock.board ?? 'main_board';
  const limitRatio = board === 'st' ? 0.05 : board === 'star_market' || board === 'chinext' ? 0.2 : 0.1;
  return {
    symbol: scenario?.stock.symbol ?? 'SIM001',
    name: scenario?.stock.name ?? '模拟科技',
    board,
    totalShares: scenario?.stock.totalShares ?? 100_000_000,
    previousClose,
    open: currentPrice,
    high: currentPrice,
    low: currentPrice,
    currentPrice,
    upperLimit: round2(previousClose * (1 + limitRatio)),
    lowerLimit: round2(previousClose * (1 - limitRatio)),
    tickSize: 0.01,
    lotSize: 100,
    volume: 0,
    turnover: 0,
    change: round2(currentPrice - previousClose),
    changePct: round2(((currentPrice - previousClose) / previousClose) * 100),
    isLimitUp: false,
    isLimitDown: false,
  };
}

function emptyOrderBook(): OrderBookSnapshot {
  return {
    bids: [],
    asks: [],
    depth: 5,
    lastUpdatedTick: 0,
  };
}

function emptyCapitalFlow(): Record<AgentType, number> {
  return Object.fromEntries(AGENT_TYPES.map((type) => [type, 0])) as Record<AgentType, number>;
}

function emptyMetrics(): MarketMetrics {
  return {
    bullPower: 0.5,
    bearPower: 0.5,
    marketSentiment: 0,
    volatility: 0,
    orderBookImbalance: 0,
    capitalFlowTotal: 0,
    capitalFlowByAgent: emptyCapitalFlow(),
    buyPressure: 0,
    sellPressure: 0,
    turnoverRate: 0,
    maxDrawdown: 0,
    liquidityDepth: 0,
    activeBuyRatio: 0.5,
    activeSellRatio: 0.5,
    cancelRate: 0,
    fillRate: 0,
    limitUpTouches: 0,
    limitDownTouches: 0,
  };
}

export class MarketState {
  private readonly scenarioLoader = new ScenarioLoader();
  private scenario = this.scenarioLoader.getDefault();
  private scenarioView: MarketScenarioSummary = scenarioSummary(this.scenario);
  private stock = createInitialStock(this.scenario);
  private environment = createInitialEnvironment(this.scenario);
  private orderBook = emptyOrderBook();
  private agents: AgentState[] = [];
  private recentTrades: Trade[] = [];
  private events: MarketEvent[] = [];
  private metrics = emptyMetrics();
  private priceSeries = [{ tick: 0, time: '09:30:00', price: this.stock.currentPrice }];
  private volumeSeries = [{ tick: 0, time: '09:30:00', volume: 0, turnover: 0 }];
  private status: SimulationStatus = {
    running: false,
    phase: 'call_auction',
    tick: 0,
    speed: 1,
    virtualTime: '09:30:00',
  };

  setStatus(status: SimulationStatus): void {
    this.status = status;
  }

  setEnvironment(environment: MarketEnvironmentSnapshot): void {
    this.environment = environment;
    this.recalculateMetrics();
  }

  setScenario(scenario: MarketScenario): void {
    this.scenario = scenario;
    this.scenarioView = scenarioSummary(scenario);
  }

  setAgents(agents: AgentState[]): void {
    this.agents = agents.map((agent) => ({
      ...agent,
      pnl: round2(agent.cash + agent.position * this.stock.currentPrice - 1_000_000),
    }));
    this.recalculateMetrics();
  }

  setOrderBook(orderBook: OrderBookSnapshot): void {
    this.orderBook = orderBook;
    this.recalculateMetrics();
  }

  applyTrades(trades: Trade[], virtualTime: string): void {
    if (trades.length === 0) {
      this.priceSeries.push({ tick: this.status.tick, time: virtualTime, price: this.stock.currentPrice });
      this.volumeSeries.push({ tick: this.status.tick, time: virtualTime, volume: 0, turnover: 0 });
      this.trimSeries();
      return;
    }

    const wasLimitUp = this.stock.isLimitUp;
    const wasLimitDown = this.stock.isLimitDown;
    let tickVolume = 0;
    let tickTurnover = 0;
    for (const trade of trades) {
      tickVolume += trade.quantity;
      tickTurnover += trade.amount;
      this.stock.currentPrice = trade.price;
      this.stock.high = Math.max(this.stock.high, trade.price);
      this.stock.low = Math.min(this.stock.low, trade.price);
      this.appendEvent({
        id: randomUUID(),
        tick: trade.tick,
        timestamp: trade.timestamp,
        type: 'trade',
        title: '撮合成交',
        message: `${trade.quantity} 股 @ ${trade.price.toFixed(2)}，${trade.aggressorSide === 'buy' ? '主动买入' : '主动卖出'}`,
        impact: 0,
        sentimentDelta: trade.aggressorSide === 'buy' ? 0.02 : -0.02,
        affectedAgentTypes: Array.from(new Set([trade.buyerAgentType, trade.sellerAgentType])),
        severity: trade.amount > 100_000 ? 'medium' : 'low',
        source: 'matching_engine',
      });
    }

    this.stock.volume += tickVolume;
    this.stock.turnover = round2(this.stock.turnover + tickTurnover);
    this.stock.change = round2(this.stock.currentPrice - this.stock.previousClose);
    this.stock.changePct = round2((this.stock.change / this.stock.previousClose) * 100);
    this.stock.isLimitUp = this.stock.currentPrice >= this.stock.upperLimit;
    this.stock.isLimitDown = this.stock.currentPrice <= this.stock.lowerLimit;
    if (!wasLimitUp && this.stock.isLimitUp) {
      this.appendLimitEvent('limit_up');
    }
    if (!wasLimitDown && this.stock.isLimitDown) {
      this.appendLimitEvent('limit_down');
    }
    this.recentTrades = [...trades, ...this.recentTrades].slice(0, 80);
    this.priceSeries.push({ tick: this.status.tick, time: virtualTime, price: this.stock.currentPrice });
    this.volumeSeries.push({ tick: this.status.tick, time: virtualTime, volume: tickVolume, turnover: tickTurnover });
    this.trimSeries();
    this.recalculateMetrics();
  }

  appendEvent(event: MarketEvent): void {
    this.events = [event, ...this.events].slice(0, 160);
  }

  snapshot(): MarketStateSnapshot {
    return {
      status: this.status,
      stock: { ...this.stock },
      scenario: { ...this.scenarioView },
      agents: this.agents.map((agent) => ({
        ...agent,
        openOrderIds: [...agent.openOrderIds],
        lastDecision: agent.lastDecision ? { ...agent.lastDecision } : undefined,
      })),
      orderBook: {
        ...this.orderBook,
        bids: this.orderBook.bids.map((level) => ({ ...level })),
        asks: this.orderBook.asks.map((level) => ({ ...level })),
      },
      recentTrades: this.recentTrades.map((trade) => ({ ...trade })),
      metrics: {
        ...this.metrics,
        capitalFlowByAgent: { ...this.metrics.capitalFlowByAgent },
      },
      events: this.events.map((event) => ({
        ...event,
        affectedAgentTypes: [...event.affectedAgentTypes],
      })),
      priceSeries: this.priceSeries.map((point) => ({ ...point })),
      volumeSeries: this.volumeSeries.map((point) => ({ ...point })),
      lastUpdated: new Date().toISOString(),
    };
  }

  reset(scenario = this.scenario): void {
    this.setScenario(scenario);
    this.stock = createInitialStock(scenario);
    this.environment = createInitialEnvironment(scenario);
    this.orderBook = emptyOrderBook();
    this.agents = [];
    this.recentTrades = [];
    this.events = [];
    this.metrics = emptyMetrics();
    this.priceSeries = [{ tick: 0, time: '09:30:00', price: this.stock.currentPrice }];
    this.volumeSeries = [{ tick: 0, time: '09:30:00', volume: 0, turnover: 0 }];
    this.status = {
      running: false,
      phase: 'call_auction',
      tick: 0,
      speed: 1,
      virtualTime: '09:30:00',
    };
    this.recalculateMetrics();
  }

  private appendLimitEvent(type: 'limit_up' | 'limit_down'): void {
    const up = type === 'limit_up';
    this.appendEvent({
      id: randomUUID(),
      tick: this.status.tick,
      timestamp: new Date().toISOString(),
      type,
      title: up ? '触及涨停' : '触及跌停',
      message: `${this.stock.name} 价格到达 ${up ? this.stock.upperLimit.toFixed(2) : this.stock.lowerLimit.toFixed(2)}`,
      impact: up ? 0.5 : -0.5,
      sentimentDelta: up ? 0.08 : -0.08,
      affectedAgentTypes: ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team'],
      severity: 'high',
      source: 'simulation',
    });
  }

  private recalculateMetrics(): void {
    const bidQty = this.orderBook.bids.reduce((sum, level) => sum + level.quantity, 0);
    const askQty = this.orderBook.asks.reduce((sum, level) => sum + level.quantity, 0);
    const totalDepth = bidQty + askQty;
    const imbalance = totalDepth === 0 ? 0 : (bidQty - askQty) / totalDepth;
    const capitalFlowByAgent = emptyCapitalFlow();
    for (const agent of this.agents) {
      capitalFlowByAgent[agent.type] += agent.capitalFlow;
    }
    const capitalFlowTotal = Object.values(capitalFlowByAgent).reduce((sum, value) => sum + value, 0);
    const buyAmount = this.recentTrades.filter((trade) => trade.aggressorSide === 'buy').reduce((sum, trade) => sum + trade.amount, 0);
    const sellAmount = this.recentTrades.filter((trade) => trade.aggressorSide === 'sell').reduce((sum, trade) => sum + trade.amount, 0);
    const tapeAmount = buyAmount + sellAmount;
    const activeBuyRatio = tapeAmount > 0 ? buyAmount / tapeAmount : 0.5;
    const highWater = Math.max(this.stock.open, this.stock.high, ...this.priceSeries.map((point) => point.price));
    const maxDrawdown = highWater > 0 ? Math.min(0, (this.stock.currentPrice - highWater) / highWater) : 0;
    const sentiment = Math.max(-1, Math.min(1, this.environment.marketSentiment * 0.55 + imbalance * 0.28 + this.stock.changePct / 35));
    const cancelEvents = this.events.filter((event) => event.type === 'order_cancel').length;
    const tradeEvents = this.events.filter((event) => event.type === 'trade').length;
    const totalEvents = Math.max(1, cancelEvents + tradeEvents);
    this.metrics = {
      bullPower: this.environment.bullPower,
      bearPower: this.environment.bearPower,
      marketSentiment: Number(sentiment.toFixed(4)),
      volatility: Number(Math.max(this.environment.volatility, Math.min(1, Math.abs(this.stock.changePct) / 10)).toFixed(4)),
      orderBookImbalance: Number(imbalance.toFixed(4)),
      capitalFlowTotal: round2(capitalFlowTotal),
      capitalFlowByAgent,
      buyPressure: totalDepth === 0 ? 0 : Number((bidQty / totalDepth).toFixed(4)),
      sellPressure: totalDepth === 0 ? 0 : Number((askQty / totalDepth).toFixed(4)),
      spread: this.orderBook.spread,
      turnoverRate: Number((this.stock.volume / Math.max(1, this.stock.totalShares)).toFixed(6)),
      maxDrawdown: Number((maxDrawdown * 100).toFixed(2)),
      liquidityDepth: Number(Math.min(1, (totalDepth / 150_000) * this.environment.liquidity).toFixed(4)),
      activeBuyRatio: Number(activeBuyRatio.toFixed(4)),
      activeSellRatio: Number((1 - activeBuyRatio).toFixed(4)),
      cancelRate: Number((cancelEvents / totalEvents).toFixed(4)),
      fillRate: Number((tradeEvents / totalEvents).toFixed(4)),
      limitUpTouches: this.events.filter((event) => event.type === 'limit_up').length,
      limitDownTouches: this.events.filter((event) => event.type === 'limit_down').length,
    };
  }

  private trimSeries(): void {
    this.priceSeries = this.priceSeries.slice(-2000);
    this.volumeSeries = this.volumeSeries.slice(-2000);
  }
}
