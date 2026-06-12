import type { AgentState, AgentType, BoardType, MarketState, TradingPhase } from '../simulation/types.js';

export type NewsEngineMode = 'deterministic' | 'stochastic';
export type NewsDirection = 'positive' | 'negative' | 'neutral' | 'rumor' | 'clarification';
export type NewsImpactDirection = 'up' | 'down' | 'neutral' | 'uncertain';
export type NewsEventCategory =
  | 'company_fundamental'
  | 'industry_event'
  | 'macro_event'
  | 'market_trading_event'
  | 'sentiment_rumor_event'
  | 'risk_event';
export type SourceType =
  | 'official_announcement'
  | 'financial_media'
  | 'analyst_report'
  | 'social_media'
  | 'market_rumor'
  | 'regulatory_notice'
  | 'clarification_notice';

export interface NewsEngineConfig {
  enabled: boolean;
  generation_interval_steps: number;
  random_seed: number;
  mode: NewsEngineMode;
  global_impact_multiplier: number;
  rumor_probability: number;
  policy_event_probability: number;
  risk_event_probability: number;
  max_active_news: number;
  allow_clarification_news: boolean;
}

export interface StandardizedMarketState {
  time_step: number;
  trading_day: number;
  market_phase: TradingPhase | 'continuous_auction';
  asset: {
    symbol: string;
    name: string;
    industry: string;
    board: BoardType;
    price: number;
    previous_close: number;
    return_1_step: number;
    return_5_steps: number;
    return_20_steps: number;
    volatility: number;
    volume: number;
    turnover_rate: number;
    limit_up_price: number;
    limit_down_price: number;
  };
  order_book: {
    best_bid: number;
    best_ask: number;
    spread: number;
    bid_depth: number;
    ask_depth: number;
    order_book_imbalance: number;
  };
  agent_state: {
    retail_sentiment: number;
    institution_sentiment: number;
    momentum_agent_position: number;
    fundamental_agent_position: number;
    noise_agent_activity: number;
    market_maker_inventory: number;
  };
  recent_news: Array<{
    news_id: string;
    title: string;
    impact_direction: NewsDirection | NewsImpactDirection;
    published_step: number;
    current_impact: number;
  }>;
}

export interface NewsEventTemplate {
  template_id: string;
  category: NewsEventCategory;
  event_type: string;
  direction: NewsDirection;
  base_strength: number;
  base_credibility: number;
  base_duration_steps: number;
  default_decay_rate: number;
  applicable_conditions: {
    min_volatility?: number;
    max_volatility?: number;
    min_return_5_steps?: number;
    max_return_5_steps?: number;
    min_order_book_imbalance?: number;
    max_order_book_imbalance?: number;
    allowed_market_phases?: Array<TradingPhase | 'continuous_auction'>;
    required_industries?: string[];
  };
  affected_agent_types: Partial<Record<AgentType, number>>;
  summary_template: string;
  tags: string[];
}

export interface SyntheticNewsEvent {
  event_id: string;
  event_time: number;
  event_type: string;
  event_category: NewsEventCategory;
  target_asset: string;
  target_asset_name: string;
  target_industry: string;
  event_level: 'company' | 'industry' | 'macro' | 'market';
  event_direction: NewsDirection;
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

export interface NewsSourceProfile {
  source_type: SourceType;
  display_name: string;
  credibility_multiplier: number;
  speed: number;
  retail_reach: number;
  institution_reach: number;
  noise_level: number;
  style: string;
}

export interface NewsImpactResult {
  impact_direction: NewsImpactDirection;
  impact_strength: number;
  expected_price_impact: number;
  expected_volume_impact: number;
  duration_steps: number;
  decay_rate: number;
  market_sensitivity: number;
}

export interface SyntheticNewsArticle {
  news_id: string;
  event_id: string;
  published_step: number;
  title: string;
  content: string;
  source_type: SourceType;
  source_name: string;
  tone: 'positive' | 'neutral_positive' | 'neutral' | 'neutral_negative' | 'negative' | 'uncertain';
  language: 'zh-CN';
  sentiment_score: number;
  credibility: number;
  novelty: number;
  uncertainty: number;
  target_assets: string[];
  target_industries: string[];
  impact_direction: NewsImpactDirection;
  impact_strength: number;
  duration_steps: number;
  decay_rate: number;
  current_impact: number;
  tags: string[];
}

export interface AgentNewsExposure {
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
  source_type: SourceType;
  title: string;
  impact_direction: NewsImpactDirection;
  current_impact: number;
}

export interface NewsConsistencyResult {
  passed: boolean;
  issues: string[];
  adjustments: string[];
  final_credibility: number;
  action?: 'accept' | 'adjust' | 'discard' | 'regenerate';
}

export interface NewsFeedbackSnapshot {
  step: number;
  price: number;
  volume: number;
  buy_orders: number;
  sell_orders: number;
  volatility: number;
  order_book_imbalance: number;
  retail_sentiment: number;
  institution_sentiment: number;
}

export interface NewsMarketFeedback {
  news_id: string;
  event_id: string;
  published_step: number;
  pre_market_snapshot: NewsFeedbackSnapshot;
  post_market_snapshots: NewsFeedbackSnapshot[];
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
}

export interface SyntheticNewsRecord {
  event: SyntheticNewsEvent;
  article: SyntheticNewsArticle;
  source: NewsSourceProfile;
  exposures: AgentNewsExposure[];
  consistency: NewsConsistencyResult;
  feedback: NewsMarketFeedback;
}

export interface SyntheticNewsUpdate {
  type: 'news_update';
  enabled: boolean;
  config: NewsEngineConfig;
  news: SyntheticNewsArticle[];
  activeNews: SyntheticNewsArticle[];
  latestRecord?: SyntheticNewsRecord;
  templates: NewsEventTemplate[];
}

export interface ManualNewsRequest {
  mode?: 'auto' | 'manual';
  source_type?: SourceType;
  event_type?: string;
  target_asset?: string;
}

export interface AgentNewsContext {
  active_news: AgentNewsExposure[];
}

export type AgentProfileInput = Pick<AgentState, 'id' | 'type' | 'riskAppetite' | 'sentiment' | 'groupSize'>;
export type MarketStateInput = MarketState;
