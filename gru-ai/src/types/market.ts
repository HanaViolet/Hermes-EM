export type AgentType =
  | 'retail'
  | 'hot_money'
  | 'mutual_fund'
  | 'quant'
  | 'northbound'
  | 'national_team'
  | 'news'
  | 'training_quant';

export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
export type DecisionAction = 'buy' | 'sell' | 'cancel' | 'hold';
export type TradingPhase = 'pre_open' | 'call_auction' | 'continuous' | 'midday_break' | 'closed';
export type BoardType = 'main_board' | 'st' | 'star_market' | 'chinext';
export type ScenarioDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type RewardMode = 'profit_only' | 'risk_adjusted' | 'sharpe_like' | 'drawdown_penalty' | 'market_making';
export type ManualEventType =
  | 'positive_news'
  | 'negative_news'
  | 'retail_panic'
  | 'hot_money_attack'
  | 'hot_money_retreat'
  | 'national_team_support'
  | 'quant_sell_pressure'
  | 'liquidity_crisis'
  | 'halt'
  | 'resume';

export interface SimulationStatus {
  running: boolean;
  phase: TradingPhase;
  tick: number;
  speed: number;
  virtualTime: string;
  startedAt?: string;
  pausedAt?: string;
}

export interface StockState {
  symbol: string;
  name: string;
  board: BoardType;
  totalShares: number;
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

export interface AgentActiveNews {
  news_id: string;
  title: string;
  source_type: string;
  impact_direction: 'up' | 'down' | 'neutral' | 'uncertain';
  current_impact: number;
  reaction_strength: number;
  action_bias: 'buy' | 'sell' | 'hold';
  expected_return_delta: number;
  sentiment_delta: number;
}

export interface AgentMessage {
  from: string;
  to?: string;
  content: string;
  tick: number;
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
  groupSize?: number;
  strategyParams?: Record<string, number | boolean | string>;
  currentStrategy?: string;
  activeNews?: AgentActiveNews[];
  lastNewsReaction?: AgentActiveNews;
  inbox: AgentMessage[];
  outbox: AgentMessage[];
  lastSay?: AgentMessage;
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
  turnoverRate: number;
  maxDrawdown: number;
  liquidityDepth: number;
  activeBuyRatio: number;
  activeSellRatio: number;
  cancelRate: number;
  fillRate: number;
  limitUpTouches: number;
  limitDownTouches: number;
}

export interface MarketEvent {
  id: string;
  tick: number;
  timestamp: string;
  type:
    | 'positive_news'
    | 'negative_news'
    | 'policy'
    | 'policy_news'
    | 'rumor'
    | 'earnings'
    | 'macro'
    | 'liquidity_shock'
    | 'halt'
    | 'resume'
    | 'limit_up'
    | 'limit_down'
    | 'large_trade'
    | 'rule_reject'
    | 'order_cancel'
    | 'trade'
    | 'auction'
    | 'agent_behavior'
    | 'system'
    | 'risk'
    | 'training';
  title: string;
  message: string;
  impact: number;
  sentimentDelta: number;
  affectedAgentTypes: AgentType[];
  severity: 'low' | 'medium' | 'high';
  source: 'simulation' | 'news_agent' | 'rules_engine' | 'matching_engine' | 'scenario' | 'training';
}

export interface AgentScenarioConfig {
  count: number;
  initialCashRange: [number, number];
  initialPositionRange: [number, number];
  sentimentRange: [number, number];
  riskPreferenceRange: [number, number];
  strategyParams: Record<string, number | boolean | string>;
}

export interface ScenarioNewsEvent {
  id: string;
  tick: number;
  type: 'positive_news' | 'negative_news' | 'policy_news' | 'rumor' | 'earnings' | 'macro' | 'liquidity_shock' | 'halt' | 'resume';
  title: string;
  description: string;
  sentimentImpact: number;
  liquidityImpact: number;
  volatilityImpact: number;
  fundamentalImpact: number;
  affectedAgentTypes: AgentType[];
}

export interface MarketScenario {
  id: string;
  name: string;
  description: string;
  difficulty: ScenarioDifficulty;
  stock: {
    symbol: string;
    name: string;
    previousClose: number;
    initialPrice: number;
    board: BoardType;
    totalShares: number;
  };
  environment: {
    marketSentiment: number;
    liquidity: number;
    volatility: number;
    macroRisk: number;
  };
  agents: {
    retail: AgentScenarioConfig;
    hotMoney: AgentScenarioConfig;
    mutualFund: AgentScenarioConfig;
    quant: AgentScenarioConfig;
    northbound: AgentScenarioConfig;
    nationalTeam: AgentScenarioConfig;
    trainingQuantAgent?: AgentScenarioConfig;
  };
  newsEvents: ScenarioNewsEvent[];
  trainingConfig?: {
    enabled: boolean;
    maxTicks: number;
    rewardFunction: RewardMode;
    randomizeEvents: boolean;
    randomizeAgentParams: boolean;
  };
}

export interface MarketScenarioSummary {
  id: string;
  name: string;
  description: string;
  difficulty: ScenarioDifficulty;
  initialPrice: number;
  initialSentiment: number;
  initialLiquidity: number;
  newsEventCount: number;
  mainAgents: AgentType[];
  trainingEnabled: boolean;
}

export interface MarketState {
  status: SimulationStatus;
  stock: StockState;
  scenario: MarketScenarioSummary;
  agents: AgentState[];
  orderBook: OrderBookSnapshot;
  recentTrades: Trade[];
  metrics: MarketMetrics;
  events: MarketEvent[];
  priceSeries: Array<{ tick: number; time: string; price: number }>;
  volumeSeries: Array<{ tick: number; time: string; volume: number; turnover: number }>;
  lastUpdated: string;
  overview?: AgentUpdateMessage['overview'];
  groups?: AgentGroupSummary[];
  topProfitAgents?: AgentSnapshot[];
  topLossAgents?: AgentSnapshot[];
  behaviorEvents?: AgentBehaviorEvent[];
}

export interface NewStockConfig {
  symbol?: string;
  name?: string;
  initialPrice?: number;
  previousClose?: number;
  board?: BoardType;
  totalShares?: number;
}

export interface SimulatedStockSummary {
  symbol: string;
  name: string;
  board: BoardType;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePct: number;
  volume: number;
  turnover: number;
  tick: number;
  virtualTime: string;
  running: boolean;
}

export type SimulationCommand =
  | { command: 'start'; symbol?: string }
  | { command: 'pause'; symbol?: string }
  | { command: 'reset'; symbol?: string }
  | { command: 'step'; symbol?: string }
  | { command: 'set_speed'; speed: number; symbol?: string }
  | { command: 'inject_news'; newsImpact?: number; symbol?: string }
  | { command: 'set_scenario'; scenarioId: string; symbol?: string }
  | { command: 'inject_event'; eventType: ManualEventType; symbol?: string }
  | { command: 'external_action'; action: QuantAction; symbol?: string }
  | { command: 'training_reset'; scenarioId?: string; symbol?: string }
  | { command: 'select_stock'; symbol: string }
  | { command: 'add_stock'; stock: NewStockConfig }
  | { command: 'generate_news'; symbol?: string; newsRequest?: { mode?: 'auto' | 'manual'; source_type?: string; event_type?: string; target_asset?: string } }
  | { command: 'update_news_config'; symbol?: string; newsConfig: Record<string, unknown> }
  | { command: 'clear_news'; symbol?: string };

export interface SentimentView {
  value: number;
  label: string;
  emoji: string;
}

export interface MarketUpdateMessage {
  type: 'market_update';
  tick: number;
  simulationTime: string;
  tradingPhase: TradingPhase;
  stock: {
    symbol: string;
    name: string;
    currentPrice: number;
    previousClose: number;
    open: number;
    high: number;
    low: number;
    change: number;
    changePercent: number;
    limitUpPrice: number;
    limitDownPrice: number;
    volume: number;
    turnover: number;
  };
  orderBook: OrderBookSnapshot & { imbalance: number };
  recentTrades: Trade[];
  marketSentiment: SentimentView;
  metrics: MarketMetrics;
  events: MarketEvent[];
  scenario: MarketScenarioSummary;
}

export interface AgentSnapshot extends AgentState {
  totalWealth: number;
  marketValue: number;
  returnRate: number;
  sentimentLabel: string;
  sentimentEmoji: string;
}

export interface AgentGroupSummary {
  type: AgentType;
  label: string;
  count: number;
  totalCash: number;
  frozenCash: number;
  totalPosition: number;
  totalMarketValue: number;
  averageCost: number;
  averageReturn: number;
  averageSentiment: number;
  sentimentLabel: string;
  sentimentEmoji: string;
  netFlow: number;
  tradingBias: 'buy' | 'sell' | 'hold';
  latestAction: string;
  strategyStatus: string;
  strategyParams: Record<string, number | boolean | string>;
}

export interface AgentBehaviorEvent {
  id: string;
  tick: number;
  time: string;
  agentType: AgentType;
  title: string;
  message: string;
  sentiment: number;
}

export interface AgentUpdateMessage {
  type: 'agent_update';
  tick: number;
  simulationTime: string;
  overview: {
    totalAgents: number;
    activeAgents: number;
    buyingAgents: number;
    sellingAgents: number;
    holdingAgents: number;
    averageReturn: number;
    averageSentiment: number;
    totalMarketValue: number;
    totalCash: number;
    herdingIndex: number;
  };
  groups: AgentGroupSummary[];
  topProfitAgents: AgentSnapshot[];
  topLossAgents: AgentSnapshot[];
  selectedAgent?: AgentSnapshot;
  behaviorEvents: AgentBehaviorEvent[];
}

export interface ScenarioUpdateMessage {
  type: 'scenario_update';
  currentScenario: MarketScenario;
  availableScenarios: MarketScenarioSummary[];
  triggeredNews: ScenarioNewsEvent[];
  upcomingNews: ScenarioNewsEvent[];
}

export interface QuantObservation {
  tick: number;
  simulationTime: string;
  price: {
    current: number;
    changePercent: number;
    movingAverageShort: number;
    movingAverageLong: number;
    volatility: number;
  };
  orderBook: {
    bestBid: number;
    bestAsk: number;
    spread: number;
    bidDepth: number;
    askDepth: number;
    imbalance: number;
  };
  trades: {
    recentVolume: number;
    activeBuyRatio: number;
    activeSellRatio: number;
  };
  market: {
    sentiment: number;
    liquidity: number;
    volatility: number;
    tradingPhase: TradingPhase;
  };
  agent: {
    cash: number;
    position: number;
    availablePosition: number;
    totalWealth: number;
    unrealizedPnl: number;
  };
  news: {
    latestSentimentImpact: number;
    latestLiquidityImpact: number;
    hasRecentNews: boolean;
  };
}

export type QuantAction =
  | { type: 'hold' }
  | { type: 'buy'; price?: number; quantity: number; orderType: 'limit' | 'market' }
  | { type: 'sell'; price?: number; quantity: number; orderType: 'limit' | 'market' }
  | { type: 'cancel'; orderId: string };

export interface TrainingStepResult {
  observation: QuantObservation;
  reward: number;
  done: boolean;
}

export interface TrainingUpdateMessage {
  type: 'training_update';
  tick: number;
  episode: number;
  step: number;
  reward: number;
  cumulativeReward: number;
  done: boolean;
  trainingAgent: {
    id: string;
    cash: number;
    position: number;
    totalWealth: number;
    pnl: number;
    returnRate: number;
    lastAction: string;
  };
  observation: QuantObservation;
}

export interface NewsEngineConfig {
  enabled: boolean;
  generation_interval_steps: number;
  random_seed: number;
  mode: 'deterministic' | 'stochastic';
  global_impact_multiplier: number;
  rumor_probability: number;
  policy_event_probability: number;
  risk_event_probability: number;
  max_active_news: number;
  allow_clarification_news: boolean;
}

export interface SyntheticNewsArticle {
  news_id: string;
  event_id: string;
  published_step: number;
  title: string;
  content: string;
  source_type: string;
  source_name: string;
  tone: string;
  language: 'zh-CN';
  sentiment_score: number;
  credibility: number;
  novelty: number;
  uncertainty: number;
  target_assets: string[];
  target_industries: string[];
  impact_direction: 'up' | 'down' | 'neutral' | 'uncertain';
  impact_strength: number;
  duration_steps: number;
  decay_rate: number;
  current_impact: number;
  tags: string[];
}

export interface SyntheticNewsEvent {
  event_id: string;
  event_time: number;
  event_type: string;
  event_category: string;
  target_asset: string;
  target_asset_name: string;
  target_industry: string;
  event_direction: string;
  event_strength: number;
  credibility: number;
  novelty: number;
  uncertainty: number;
  expected_price_impact: number;
  expected_volume_impact: number;
  duration_steps: number;
  decay_rate: number;
  affected_agent_types: Partial<Record<AgentType, number>>;
  causal_reason: string;
  event_summary: string;
  template_id: string;
}

export interface SyntheticNewsExposure {
  id: string;
  news_id: string;
  agent_id: string;
  agent_type: AgentType;
  received: boolean;
  receive_step: number;
  reaction_strength: number;
  action_bias: 'buy' | 'sell' | 'hold';
  sentiment_delta: number;
  expected_return_delta: number;
  risk_preference_delta: number;
  source_type: string;
  title: string;
  impact_direction: 'up' | 'down' | 'neutral' | 'uncertain';
  current_impact: number;
}

export interface SyntheticNewsRecord {
  event: SyntheticNewsEvent;
  article: SyntheticNewsArticle;
  exposures: SyntheticNewsExposure[];
  consistency: {
    passed: boolean;
    issues: string[];
    adjustments: string[];
    final_credibility: number;
    action?: string;
  };
  feedback: {
    pre_market_snapshot: Record<string, number>;
    post_market_snapshots: Array<Record<string, number>>;
    agent_response_summary: {
      received_agent_count: number;
      buy_bias_count: number;
      sell_bias_count: number;
      hold_bias_count: number;
      avg_reaction_strength: number;
      retail_sentiment_change: number;
      institution_sentiment_change: number;
    };
    realized_impact: {
      price_change_1_step: number;
      price_change_5_steps: number;
      volume_change_5_steps: number;
      volatility_change_5_steps: number;
      predicted_price_impact: number;
      prediction_error_5_steps: number;
    };
  };
}

export interface SyntheticNewsUpdate {
  type: 'news_update';
  enabled: boolean;
  config: NewsEngineConfig;
  news: SyntheticNewsArticle[];
  activeNews: SyntheticNewsArticle[];
  latestRecord?: SyntheticNewsRecord;
  templates: Array<{
    template_id: string;
    category: string;
    event_type: string;
    direction: string;
    base_strength: number;
    base_credibility: number;
    base_duration_steps: number;
    default_decay_rate: number;
    summary_template: string;
  }>;
}

export type SimulationMessage =
  | { version: 1; type: 'simulation_state'; payload: MarketState }
  | { version: 1; type: 'simulation_status'; payload: SimulationStatus }
  | { version: 1; type: 'simulation_error'; payload: { message: string } }
  | { version: 1; type: 'market_update'; payload: MarketUpdateMessage }
  | { version: 1; type: 'agent_update'; payload: AgentUpdateMessage }
  | { version: 1; type: 'scenario_update'; payload: ScenarioUpdateMessage }
  | { version: 1; type: 'training_update'; payload: TrainingUpdateMessage }
  | { version: 1; type: 'news_update'; payload: SyntheticNewsUpdate }
  | { version: 1; type: 'stock_list'; payload: { activeSymbol: string; stocks: SimulatedStockSummary[] } };
