import { WebSocket, type WebSocketServer } from 'ws';
import type { SimulationManager } from '../simulation/SimulationManager.js';
import type { SyntheticNewsUpdate } from '../news/types.js';
import type {
  AgentBehaviorEvent,
  AgentGroupSummary,
  AgentSnapshot,
  AgentType,
  AgentUpdateMessage,
  MarketState,
  MarketUpdateMessage,
  ScenarioUpdateMessage,
  SentimentView,
  SimulatedStockSummary,
  SimulationCommand,
  SimulationStatus,
  TrainingUpdateMessage,
} from '../simulation/types.js';

type SimulationMessage =
  | { version: 1; type: 'simulation_state'; payload: MarketState }
  | { version: 1; type: 'simulation_status'; payload: SimulationStatus }
  | { version: 1; type: 'simulation_error'; payload: { message: string } }
  | { version: 1; type: 'market_update'; payload: MarketUpdateMessage }
  | { version: 1; type: 'agent_update'; payload: AgentUpdateMessage }
  | { version: 1; type: 'scenario_update'; payload: ScenarioUpdateMessage }
  | { version: 1; type: 'training_update'; payload: TrainingUpdateMessage }
  | { version: 1; type: 'news_update'; payload: SyntheticNewsUpdate }
  | { version: 1; type: 'stock_list'; payload: { activeSymbol: string; stocks: SimulatedStockSummary[] } };

const AGENT_LABELS: Record<AgentType, string> = {
  retail: '散户',
  hot_money: '游资',
  mutual_fund: '公募基金',
  quant: '内置量化',
  northbound: '北向资金',
  national_team: '国家队',
  news: '新闻事件',
  training_quant: '训练量化',
};

function sentimentView(value: number): SentimentView {
  if (value < -0.8) return { value, label: '极度恐慌', emoji: '😱' };
  if (value < -0.3) return { value, label: '悲观', emoji: '😟' };
  if (value <= 0.3) return { value, label: '中性', emoji: '😐' };
  if (value <= 0.8) return { value, label: '乐观', emoji: '🙂' };
  return { value, label: '极度兴奋', emoji: '🚀' };
}

function send(ws: WebSocket, message: SimulationMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(wss: WebSocketServer, message: SimulationMessage): void {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function parseCommand(raw: unknown): SimulationCommand | null {
  if (!raw || typeof raw !== 'object') return null;
  const message = raw as { type?: unknown; payload?: unknown };
  if (message.type !== 'simulation_command') return null;
  if (!message.payload || typeof message.payload !== 'object') return null;
  const payload = message.payload as Partial<SimulationCommand>;
  if (!payload.command) return null;
  return payload as SimulationCommand;
}

function agentSnapshot(agent: MarketState['agents'][number], price: number): AgentSnapshot {
  const marketValue = agent.position * price;
  const totalWealth = agent.cash + marketValue;
  const returnRate = (totalWealth - 1_000_000) / 1_000_000;
  const view = sentimentView(agent.sentiment);
  return {
    ...agent,
    marketValue,
    totalWealth,
    returnRate,
    sentimentLabel: view.label,
    sentimentEmoji: view.emoji,
  };
}

function buildMarketUpdate(state: MarketState): MarketUpdateMessage {
  return {
    type: 'market_update',
    tick: state.status.tick,
    simulationTime: state.status.virtualTime,
    tradingPhase: state.status.phase,
    stock: {
      symbol: state.stock.symbol,
      name: state.stock.name,
      currentPrice: state.stock.currentPrice,
      previousClose: state.stock.previousClose,
      open: state.stock.open,
      high: state.stock.high,
      low: state.stock.low,
      change: state.stock.change,
      changePercent: state.stock.changePct,
      limitUpPrice: state.stock.upperLimit,
      limitDownPrice: state.stock.lowerLimit,
      volume: state.stock.volume,
      turnover: state.stock.turnover,
    },
    orderBook: {
      ...state.orderBook,
      bids: state.orderBook.bids,
      asks: state.orderBook.asks,
      imbalance: state.metrics.orderBookImbalance,
    },
    recentTrades: state.recentTrades,
    marketSentiment: sentimentView(state.metrics.marketSentiment),
    metrics: state.metrics,
    events: state.events,
    scenario: state.scenario,
  };
}

function buildAgentUpdate(state: MarketState): AgentUpdateMessage {
  const snapshots = state.agents.map((agent) => agentSnapshot(agent, state.stock.currentPrice));
  const byType = new Map<AgentType, AgentSnapshot[]>();
  for (const agent of snapshots) {
    const current = byType.get(agent.type) ?? [];
    current.push(agent);
    byType.set(agent.type, current);
  }

  const groups: AgentGroupSummary[] = Array.from(byType.entries()).map(([type, agents]) => {
    const count = agents.reduce((sum, agent) => sum + (agent.groupSize ?? 1), 0);
    const totalCash = agents.reduce((sum, agent) => sum + agent.cash, 0);
    const totalPosition = agents.reduce((sum, agent) => sum + agent.position, 0);
    const totalMarketValue = agents.reduce((sum, agent) => sum + agent.marketValue, 0);
    const averageSentiment = agents.reduce((sum, agent) => sum + agent.sentiment, 0) / agents.length;
    const averageReturn = agents.reduce((sum, agent) => sum + agent.returnRate, 0) / agents.length;
    const netFlow = agents.reduce((sum, agent) => sum + agent.capitalFlow, 0);
    const latestAction = agents[0]?.lastAction ?? 'hold';
    const view = sentimentView(averageSentiment);
    return {
      type,
      label: AGENT_LABELS[type],
      count,
      totalCash,
      frozenCash: agents.reduce((sum, agent) => sum + agent.openOrderIds.length * state.stock.currentPrice * 100, 0),
      totalPosition,
      totalMarketValue,
      averageCost: totalPosition > 0 ? agents.reduce((sum, agent) => sum + agent.avgCost * agent.position, 0) / totalPosition : 0,
      averageReturn,
      averageSentiment,
      sentimentLabel: view.label,
      sentimentEmoji: view.emoji,
      netFlow,
      tradingBias: latestAction === 'buy' ? 'buy' : latestAction === 'sell' ? 'sell' : 'hold',
      latestAction,
      strategyStatus: agents[0]?.currentStrategy ?? '策略观察',
      strategyParams: agents[0]?.strategyParams ?? {},
    };
  });

  const activeAgents = snapshots.filter((agent) => agent.status !== 'idle').length;
  const buyingAgents = snapshots.filter((agent) => agent.lastAction === 'buy').length;
  const sellingAgents = snapshots.filter((agent) => agent.lastAction === 'sell').length;
  const holdingAgents = snapshots.length - buyingAgents - sellingAgents;
  const averageReturn = snapshots.length ? snapshots.reduce((sum, agent) => sum + agent.returnRate, 0) / snapshots.length : 0;
  const averageSentiment = snapshots.length ? snapshots.reduce((sum, agent) => sum + agent.sentiment, 0) / snapshots.length : 0;
  const behaviorEvents: AgentBehaviorEvent[] = state.events
    .filter((event) => event.type === 'agent_behavior' || event.type === 'rule_reject' || event.type === 'order_cancel' || event.affectedAgentTypes.length > 0)
    .slice(0, 24)
    .map((event) => ({
      id: event.id,
      tick: event.tick,
      time: state.status.virtualTime,
      agentType: event.affectedAgentTypes[0] ?? 'retail',
      title: event.title,
      message: event.message,
      sentiment: event.sentimentDelta,
    }));

  return {
    type: 'agent_update',
    tick: state.status.tick,
    simulationTime: state.status.virtualTime,
    overview: {
      totalAgents: groups.reduce((sum, group) => sum + group.count, 0),
      activeAgents,
      buyingAgents,
      sellingAgents,
      holdingAgents,
      averageReturn,
      averageSentiment,
      totalMarketValue: snapshots.reduce((sum, agent) => sum + agent.marketValue, 0),
      totalCash: snapshots.reduce((sum, agent) => sum + agent.cash, 0),
      herdingIndex: Math.min(1, Math.abs(buyingAgents - sellingAgents) / Math.max(1, snapshots.length)),
    },
    groups,
    topProfitAgents: [...snapshots].sort((a, b) => b.returnRate - a.returnRate).slice(0, 8),
    topLossAgents: [...snapshots].sort((a, b) => a.returnRate - b.returnRate).slice(0, 8),
    selectedAgent: snapshots[0],
    behaviorEvents,
  };
}

function sendSnapshot(ws: WebSocket, manager: SimulationManager): void {
  const state = manager.getState();
  send(ws, { version: 1, type: 'stock_list', payload: manager.getStockList() });
  send(ws, { version: 1, type: 'simulation_state', payload: state });
  send(ws, { version: 1, type: 'market_update', payload: buildMarketUpdate(state) });
  send(ws, { version: 1, type: 'agent_update', payload: buildAgentUpdate(state) });
  send(ws, { version: 1, type: 'scenario_update', payload: manager.getScenarioUpdate() });
  send(ws, { version: 1, type: 'training_update', payload: manager.getTrainingUpdate() });
  send(ws, { version: 1, type: 'news_update', payload: manager.getNewsUpdate() });
}

export function attachSimulationSocket(wss: WebSocketServer, manager: SimulationManager): void {
  wss.on('connection', (ws) => {
    sendSnapshot(ws, manager);

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString()) as unknown;
        const command = parseCommand(parsed);
        if (!command) return;
        manager.handleCommand(command);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid simulation command';
        send(ws, { version: 1, type: 'simulation_error', payload: { message } });
      }
    });
  });

  manager.on('state', (payload: MarketState) => {
    broadcast(wss, { version: 1, type: 'simulation_state', payload });
    broadcast(wss, { version: 1, type: 'market_update', payload: buildMarketUpdate(payload) });
    broadcast(wss, { version: 1, type: 'agent_update', payload: buildAgentUpdate(payload) });
  });

  manager.on('status', (payload: SimulationStatus) => {
    broadcast(wss, { version: 1, type: 'simulation_status', payload });
  });

  manager.on('scenario', (payload: ScenarioUpdateMessage) => {
    broadcast(wss, { version: 1, type: 'scenario_update', payload });
  });

  manager.on('training', (payload: TrainingUpdateMessage) => {
    broadcast(wss, { version: 1, type: 'training_update', payload });
  });

  manager.on('news', (payload: SyntheticNewsUpdate) => {
    broadcast(wss, { version: 1, type: 'news_update', payload });
  });

  manager.on('stock_list', (payload: { activeSymbol: string; stocks: SimulatedStockSummary[] }) => {
    broadcast(wss, { version: 1, type: 'stock_list', payload });
  });
}
