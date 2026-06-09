import { randomUUID } from 'node:crypto';
import type {
  AgentState,
  AgentType,
  MarketEvent,
  MarketMetrics,
  MarketState as MarketStateSnapshot,
  OrderBookSnapshot,
  SimulationStatus,
  StockState,
  Trade,
} from './types.js';

const AGENT_TYPES: AgentType[] = ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team', 'news'];

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function createInitialStock(): StockState {
  const previousClose = 100;
  return {
    symbol: 'ABM',
    name: 'ABM科技',
    previousClose,
    open: previousClose,
    high: previousClose,
    low: previousClose,
    currentPrice: previousClose,
    upperLimit: round2(previousClose * 1.1),
    lowerLimit: round2(previousClose * 0.9),
    tickSize: 0.01,
    lotSize: 100,
    volume: 0,
    turnover: 0,
    change: 0,
    changePct: 0,
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
  };
}

export class MarketState {
  private stock = createInitialStock();
  private orderBook = emptyOrderBook();
  private agents: AgentState[] = [];
  private recentTrades: Trade[] = [];
  private events: MarketEvent[] = [];
  private metrics = emptyMetrics();
  private priceSeries = [{ tick: 0, time: '09:30:00', price: 100 }];
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
        message: `${trade.quantity} 股 @ ${trade.price.toFixed(2)}`,
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
      this.appendEvent({
        id: randomUUID(),
        tick: this.status.tick,
        timestamp: new Date().toISOString(),
        type: 'limit_up',
        title: '触及涨停',
        message: `${this.stock.name} 价格到达 ${this.stock.upperLimit.toFixed(2)}`,
        impact: 0.5,
        sentimentDelta: 0.08,
        affectedAgentTypes: ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team'],
        severity: 'high',
        source: 'simulation',
      });
    }
    if (!wasLimitDown && this.stock.isLimitDown) {
      this.appendEvent({
        id: randomUUID(),
        tick: this.status.tick,
        timestamp: new Date().toISOString(),
        type: 'limit_down',
        title: '触及跌停',
        message: `${this.stock.name} 价格到达 ${this.stock.lowerLimit.toFixed(2)}`,
        impact: -0.5,
        sentimentDelta: -0.08,
        affectedAgentTypes: ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team'],
        severity: 'high',
        source: 'simulation',
      });
    }
    this.recentTrades = [...trades, ...this.recentTrades].slice(0, 80);
    this.priceSeries.push({ tick: this.status.tick, time: virtualTime, price: this.stock.currentPrice });
    this.volumeSeries.push({ tick: this.status.tick, time: virtualTime, volume: tickVolume, turnover: tickTurnover });
    this.trimSeries();
    this.recalculateMetrics();
  }

  appendEvent(event: MarketEvent): void {
    this.events = [event, ...this.events].slice(0, 120);
  }

  snapshot(): MarketStateSnapshot {
    return {
      status: this.status,
      stock: { ...this.stock },
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

  reset(): void {
    this.stock = createInitialStock();
    this.orderBook = emptyOrderBook();
    this.agents = [];
    this.recentTrades = [];
    this.events = [];
    this.metrics = emptyMetrics();
    this.priceSeries = [{ tick: 0, time: '09:30:00', price: 100 }];
    this.volumeSeries = [{ tick: 0, time: '09:30:00', volume: 0, turnover: 0 }];
    this.status = {
      running: false,
      phase: 'call_auction',
      tick: 0,
      speed: 1,
      virtualTime: '09:30:00',
    };
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
    const sentiment = Math.max(-1, Math.min(1, imbalance * 0.45 + this.stock.changePct / 20));
    this.metrics = {
      bullPower: Number(Math.max(0, Math.min(1, 0.5 + sentiment / 2)).toFixed(4)),
      bearPower: Number(Math.max(0, Math.min(1, 0.5 - sentiment / 2)).toFixed(4)),
      marketSentiment: Number(sentiment.toFixed(4)),
      volatility: Number(Math.min(1, Math.abs(this.stock.changePct) / 10).toFixed(4)),
      orderBookImbalance: Number(imbalance.toFixed(4)),
      capitalFlowTotal: round2(capitalFlowTotal),
      capitalFlowByAgent,
      buyPressure: totalDepth === 0 ? 0 : Number((bidQty / totalDepth).toFixed(4)),
      sellPressure: totalDepth === 0 ? 0 : Number((askQty / totalDepth).toFixed(4)),
      spread: this.orderBook.spread,
    };
  }

  private trimSeries(): void {
    this.priceSeries = this.priceSeries.slice(-240);
    this.volumeSeries = this.volumeSeries.slice(-240);
  }
}
