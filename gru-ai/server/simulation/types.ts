export type AgentType =
  | 'retail'
  | 'hot_money'
  | 'mutual_fund'
  | 'quant'
  | 'northbound'
  | 'national_team'
  | 'news';

export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
export type DecisionAction = 'buy' | 'sell' | 'cancel' | 'hold';
export type TradingPhase = 'pre_open' | 'call_auction' | 'continuous' | 'midday_break' | 'closed';

export interface SimulationStatus {
  running: boolean;
  phase: TradingPhase;
  tick: number;
  speed: number;
  virtualTime: string;
  startedAt?: string;
  pausedAt?: string;
}

export interface TickContext {
  tick: number;
  virtualTime: string;
  phase: TradingPhase;
}

export interface StockState {
  symbol: 'ABM';
  name: 'ABM科技';
  previousClose: number;
  open: number;
  high: number;
  low: number;
  currentPrice: number;
  upperLimit: number;
  lowerLimit: number;
  tickSize: 0.01;
  lotSize: 100;
  volume: number;
  turnover: number;
  change: number;
  changePct: number;
  isLimitUp: boolean;
  isLimitDown: boolean;
}

export interface Order {
  id: string;
  agentId: string;
  agentType: AgentType;
  side: OrderSide;
  price: number;
  quantity: number;
  remainingQuantity: number;
  createdAtTick: number;
  createdAt: string;
  status: OrderStatus;
  cancelReason?: string;
}

export interface Trade {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerAgentId: string;
  sellerAgentId: string;
  buyerAgentType: AgentType;
  sellerAgentType: AgentType;
  price: number;
  quantity: number;
  amount: number;
  tick: number;
  timestamp: string;
  aggressorSide: OrderSide;
}

export interface AgentDecision {
  id: string;
  agentId: string;
  tick: number;
  action: DecisionAction;
  side?: OrderSide;
  confidence: number;
  targetQuantity?: number;
  limitPrice?: number;
  urgency: number;
  reason: string;
  cancelOrderId?: string;
}

export interface AgentState {
  id: string;
  type: AgentType;
  name: string;
  cash: number;
  position: number;
  availablePosition: number;
  todayBought: number;
  avgCost: number;
  pnl: number;
  sentiment: number;
  riskAppetite: number;
  status: 'idle' | 'thinking' | 'ordering' | 'waiting' | 'filled';
  lastDecision?: AgentDecision;
  lastAction: DecisionAction;
  capitalFlow: number;
  openOrderIds: string[];
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orderCount: number;
}

export interface OrderBookSnapshot {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  depth: number;
  lastUpdatedTick: number;
}

export interface MarketMetrics {
  bullPower: number;
  bearPower: number;
  marketSentiment: number;
  volatility: number;
  orderBookImbalance: number;
  capitalFlowTotal: number;
  capitalFlowByAgent: Record<AgentType, number>;
  buyPressure: number;
  sellPressure: number;
  spread?: number;
}

export interface MarketEvent {
  id: string;
  tick: number;
  timestamp: string;
  type: 'positive_news' | 'negative_news' | 'policy' | 'earnings' | 'limit_up' | 'limit_down' | 'large_trade' | 'rule_reject' | 'order_cancel' | 'trade' | 'auction';
  title: string;
  message: string;
  impact: number;
  sentimentDelta: number;
  affectedAgentTypes: AgentType[];
  severity: 'low' | 'medium' | 'high';
  source: 'simulation' | 'news_agent' | 'rules_engine' | 'matching_engine';
}

export interface MarketState {
  status: SimulationStatus;
  stock: StockState;
  agents: AgentState[];
  orderBook: OrderBookSnapshot;
  recentTrades: Trade[];
  metrics: MarketMetrics;
  events: MarketEvent[];
  priceSeries: Array<{ tick: number; time: string; price: number }>;
  volumeSeries: Array<{ tick: number; time: string; volume: number; turnover: number }>;
  lastUpdated: string;
}

export interface MarketEnvironmentSnapshot {
  marketSentiment: number;
  bullPower: number;
  bearPower: number;
  volatility: number;
  capitalFlow: number;
  lastNewsImpact: number;
}

export interface RuleValidationResult {
  ok: boolean;
  order?: Order;
  reason?: string;
}

export interface SimulationCommand {
  command: 'start' | 'pause' | 'reset' | 'step' | 'set_speed' | 'inject_news';
  speed?: number;
  newsImpact?: number;
}
