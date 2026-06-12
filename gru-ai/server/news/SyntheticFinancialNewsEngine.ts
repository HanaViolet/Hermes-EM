import { randomUUID } from 'node:crypto';
import type { AgentState, AgentType, MarketEvent } from '../simulation/types.js';
import type {
  AgentNewsExposure,
  AgentProfileInput,
  ManualNewsRequest,
  NewsConsistencyResult,
  NewsDirection,
  NewsEngineConfig,
  NewsEventCategory,
  NewsEventTemplate,
  NewsFeedbackSnapshot,
  NewsImpactDirection,
  NewsImpactResult,
  NewsMarketFeedback,
  NewsSourceProfile,
  SourceType,
  StandardizedMarketState,
  SyntheticNewsArticle,
  SyntheticNewsEvent,
  SyntheticNewsRecord,
  SyntheticNewsUpdate,
} from './types.js';
import type { MarketStateInput } from './types.js';

const ALL_AGENT_TYPES: AgentType[] = ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team', 'training_quant'];
const INDUSTRIES = ['AI芯片', '新能源', '机器人', '医药', '工业软件', '智能制造'];
const REAL_ENTITY_PATTERNS = [
  /贵州茅台|宁德时代|比亚迪|腾讯|阿里巴巴|华为|苹果|英伟达|特斯拉|微软|谷歌|百度|小米/,
  /\b(6\d{5}|0\d{5}|3\d{5}|688\d{3})\b/,
  /马云|马化腾|雷军|任正非|黄仁勋|Elon Musk|Musk|Tim Cook/,
];

const DEFAULT_CONFIG: NewsEngineConfig = {
  enabled: true,
  generation_interval_steps: 8,
  random_seed: 42,
  mode: 'stochastic',
  global_impact_multiplier: 1,
  rumor_probability: 0.12,
  policy_event_probability: 0.08,
  risk_event_probability: 0.1,
  max_active_news: 10,
  allow_clarification_news: true,
};

const SOURCE_PROFILES: Record<SourceType, NewsSourceProfile> = {
  official_announcement: {
    source_type: 'official_announcement',
    display_name: '云岚公告台',
    credibility_multiplier: 0.96,
    speed: 0.58,
    retail_reach: 0.58,
    institution_reach: 0.9,
    noise_level: 0.04,
    style: '正式、稳健、少情绪、多事实',
  },
  financial_media: {
    source_type: 'financial_media',
    display_name: '星河财经',
    credibility_multiplier: 0.82,
    speed: 0.85,
    retail_reach: 0.88,
    institution_reach: 0.62,
    noise_level: 0.18,
    style: '客观、简洁、带少量市场解读',
  },
  analyst_report: {
    source_type: 'analyst_report',
    display_name: '远岫研究所',
    credibility_multiplier: 0.84,
    speed: 0.54,
    retail_reach: 0.42,
    institution_reach: 0.88,
    noise_level: 0.12,
    style: '专业、强调估值和风险',
  },
  social_media: {
    source_type: 'social_media',
    display_name: '量潮社区',
    credibility_multiplier: 0.48,
    speed: 0.95,
    retail_reach: 0.96,
    institution_reach: 0.28,
    noise_level: 0.42,
    style: '短、情绪明显、不确定性较强',
  },
  market_rumor: {
    source_type: 'market_rumor',
    display_name: '灰盒传闻社',
    credibility_multiplier: 0.38,
    speed: 0.9,
    retail_reach: 0.86,
    institution_reach: 0.34,
    noise_level: 0.56,
    style: '传闻口径、强调尚未确认',
  },
  regulatory_notice: {
    source_type: 'regulatory_notice',
    display_name: '虚拟交易监管观察',
    credibility_multiplier: 0.98,
    speed: 0.88,
    retail_reach: 0.82,
    institution_reach: 0.92,
    noise_level: 0.05,
    style: '严肃、风险导向',
  },
  clarification_notice: {
    source_type: 'clarification_notice',
    display_name: '澄清快讯',
    credibility_multiplier: 0.88,
    speed: 0.9,
    retail_reach: 0.82,
    institution_reach: 0.78,
    noise_level: 0.1,
    style: '修正前期消息、降低不确定性',
  },
};

function clamp(value: number, min = -1, max = 1): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(4));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function hashText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number, salt: string): number {
  let value = (seed + hashText(salt)) >>> 0;
  value += 0x6D2B79F5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function directionSign(direction: NewsDirection | NewsImpactDirection): number {
  if (direction === 'positive' || direction === 'up') return 1;
  if (direction === 'negative' || direction === 'down') return -1;
  return 0;
}

function eventLevel(category: NewsEventCategory): SyntheticNewsEvent['event_level'] {
  if (category === 'industry_event') return 'industry';
  if (category === 'macro_event') return 'macro';
  if (category === 'market_trading_event' || category === 'sentiment_rumor_event') return 'market';
  return 'company';
}

function template(
  category: NewsEventCategory,
  eventType: string,
  direction: NewsDirection,
  strength: number,
  credibility: number,
  duration: number,
  decay: number,
  summary: string,
  conditions: NewsEventTemplate['applicable_conditions'] = {},
  affected: Partial<Record<AgentType, number>> = {},
  tags: string[] = [],
): NewsEventTemplate {
  return {
    template_id: `${category}_${eventType}_${direction}`,
    category,
    event_type: eventType,
    direction,
    base_strength: strength,
    base_credibility: credibility,
    base_duration_steps: duration,
    default_decay_rate: decay,
    applicable_conditions: {
      allowed_market_phases: ['continuous', 'call_auction', 'continuous_auction'],
      required_industries: INDUSTRIES,
      ...conditions,
    },
    affected_agent_types: {
      retail: 0.52,
      hot_money: 0.58,
      mutual_fund: 0.58,
      quant: 0.5,
      northbound: 0.42,
      national_team: 0.24,
      training_quant: 0.5,
      ...affected,
    },
    summary_template: summary,
    tags,
  };
}

export class EventTemplateLibrary {
  private templates: NewsEventTemplate[];

  constructor(extraTemplates: NewsEventTemplate[] = []) {
    this.templates = [...this.createBuiltIns(), ...extraTemplates];
  }

  list(): NewsEventTemplate[] {
    return this.templates.map((item) => ({ ...item, affected_agent_types: { ...item.affected_agent_types } }));
  }

  add(templateConfig: NewsEventTemplate): void {
    this.templates = [templateConfig, ...this.templates.filter((item) => item.template_id !== templateConfig.template_id)];
  }

  select(market: StandardizedMarketState, recent: SyntheticNewsArticle[], preferredEventType?: string): Array<{ template: NewsEventTemplate; score: number; reason: string }> {
    const recentStrongSameDirection = recent.filter((item) => Math.abs(item.current_impact) > 0.45 && market.time_step - item.published_step <= 10);
    return this.templates
      .filter((item) => {
        const conditions = item.applicable_conditions;
        if (preferredEventType && item.event_type !== preferredEventType) return false;
        if (conditions.min_volatility !== undefined && market.asset.volatility < conditions.min_volatility) return false;
        if (conditions.max_volatility !== undefined && market.asset.volatility > conditions.max_volatility) return false;
        if (conditions.min_return_5_steps !== undefined && market.asset.return_5_steps < conditions.min_return_5_steps) return false;
        if (conditions.max_return_5_steps !== undefined && market.asset.return_5_steps > conditions.max_return_5_steps) return false;
        if (conditions.min_order_book_imbalance !== undefined && market.order_book.order_book_imbalance < conditions.min_order_book_imbalance) return false;
        if (conditions.max_order_book_imbalance !== undefined && market.order_book.order_book_imbalance > conditions.max_order_book_imbalance) return false;
        if (conditions.required_industries?.length && !conditions.required_industries.includes(market.asset.industry)) return false;
        return true;
      })
      .map((item) => {
        const momentum = market.asset.return_5_steps;
        const imbalance = market.order_book.order_book_imbalance;
        const overheated = momentum > 0.035 || market.asset.return_20_steps > 0.08 || market.agent_state.retail_sentiment > 0.72;
        const oversold = momentum < -0.035 || market.agent_state.retail_sentiment < -0.38;
        let score = item.base_strength + item.base_credibility * 0.2 + market.asset.volatility * 0.2;
        const reasons: string[] = [];
        if (item.direction === 'positive' && (oversold || imbalance > 0.18)) {
          score += 0.28;
          reasons.push('市场偏弱或买盘增强，适合生成修复/利好信息');
        }
        if (item.direction === 'negative' && overheated) {
          score += 0.3;
          reasons.push('价格或情绪过热，适合生成风险提示');
        }
        if (item.direction === 'rumor' && Math.abs(imbalance) > 0.22) {
          score += 0.2;
          reasons.push('盘口倾斜明显，传闻传播概率上升');
        }
        if (item.direction === 'clarification' && market.recent_news.some((news) => news.impact_direction === 'uncertain' || news.impact_direction === 'rumor')) {
          score += 0.35;
          reasons.push('近期存在传闻，适合生成澄清信息');
        }
        if (recentStrongSameDirection.some((news) => directionSign(news.impact_direction) === directionSign(item.direction))) {
          score -= 0.38;
          reasons.push('近期已有同方向强新闻，降低重复强冲击概率');
        }
        if (item.category === 'market_trading_event' && (Math.abs(momentum) > 0.02 || market.asset.volume > 0)) score += 0.16;
        if (item.category === 'risk_event' && (overheated || market.asset.volatility > 0.45)) score += 0.2;
        return { template: item, score, reason: reasons.join('；') || '模板满足市场状态约束，按基础强度入选' };
      })
      .filter((item) => item.score > 0.35)
      .sort((a, b) => b.score - a.score);
  }

  private createBuiltIns(): NewsEventTemplate[] {
    return [
      template('company_fundamental', 'earnings_revision', 'positive', 0.65, 0.8, 12, 0.86, '公司上调全年盈利预期，主要受益于订单增长和成本改善。', { max_volatility: 0.75 }, { mutual_fund: 0.9, northbound: 0.72, retail: 0.6 }, ['业绩上修', '订单增长']),
      template('company_fundamental', 'earnings_warning', 'negative', 0.68, 0.78, 14, 0.87, '公司提示阶段性业绩承压，主要受成本和交付节奏影响。', { min_volatility: 0.02 }, { mutual_fund: 0.86, national_team: 0.44, retail: 0.64 }, ['业绩预减', '成本压力']),
      template('company_fundamental', 'large_order', 'positive', 0.58, 0.72, 10, 0.84, '公司获得虚拟产业链订单，短期收入弹性预期改善。', {}, { hot_money: 0.75, retail: 0.68, mutual_fund: 0.58 }, ['订单增加']),
      template('company_fundamental', 'order_cancel', 'negative', 0.62, 0.7, 10, 0.84, '公司部分订单节奏出现调整，收入确认存在不确定性。', {}, { retail: 0.7, mutual_fund: 0.7, quant: 0.56 }, ['订单取消']),
      template('company_fundamental', 'new_product', 'positive', 0.52, 0.68, 9, 0.82, '公司发布虚拟新产品，市场关注技术迭代节奏。', {}, { hot_money: 0.66, retail: 0.64, quant: 0.55 }, ['新产品']),
      template('company_fundamental', 'technology_breakthrough', 'positive', 0.7, 0.76, 16, 0.88, '公司核心技术取得阶段性突破，长期基本面预期改善。', {}, { mutual_fund: 0.86, northbound: 0.75, retail: 0.62 }, ['技术突破']),
      template('company_fundamental', 'capacity_expansion', 'neutral', 0.38, 0.74, 12, 0.84, '公司推进产能扩张，短期费用与长期供给弹性并存。', {}, { mutual_fund: 0.72, northbound: 0.58 }, ['产能扩张']),
      template('company_fundamental', 'supply_chain_disruption', 'negative', 0.63, 0.72, 11, 0.85, '公司供应链交付受阻，短期生产节奏存在扰动。', {}, { mutual_fund: 0.78, quant: 0.55, retail: 0.66 }, ['供应链']),
      template('company_fundamental', 'shareholder_increase', 'positive', 0.45, 0.82, 8, 0.82, '虚拟主要股东计划增持，释放中期信心信号。', {}, { retail: 0.56, mutual_fund: 0.6 }, ['股东增持']),
      template('company_fundamental', 'shareholder_reduction', 'negative', 0.52, 0.82, 8, 0.82, '虚拟股东披露减持计划，短期风险偏好受到压制。', {}, { retail: 0.66, hot_money: 0.62 }, ['股东减持']),
      template('company_fundamental', 'buyback_plan', 'positive', 0.48, 0.86, 10, 0.84, '公司发布回购计划，试图稳定市场预期。', {}, { retail: 0.58, mutual_fund: 0.64, national_team: 0.45 }, ['回购']),
      template('company_fundamental', 'impairment_risk', 'negative', 0.66, 0.78, 14, 0.87, '公司提示资产减值风险，基本面不确定性上升。', {}, { mutual_fund: 0.82, northbound: 0.7, retail: 0.62 }, ['商誉减值']),
      template('industry_event', 'industry_boom', 'positive', 0.56, 0.72, 12, 0.84, '虚拟行业景气度上行，产业链订单与价格预期改善。', {}, { mutual_fund: 0.74, northbound: 0.72, hot_money: 0.6 }, ['行业景气']),
      template('industry_event', 'industry_price_war', 'negative', 0.58, 0.7, 11, 0.84, '虚拟行业价格竞争加剧，利润率预期受到扰动。', {}, { mutual_fund: 0.78, retail: 0.62 }, ['价格战']),
      template('industry_event', 'policy_support', 'positive', 0.62, 0.82, 16, 0.88, '虚拟产业政策释放扶持信号，板块风险偏好改善。', {}, { northbound: 0.78, mutual_fund: 0.78, retail: 0.6 }, ['政策扶持']),
      template('industry_event', 'regulatory_tightening', 'negative', 0.64, 0.86, 16, 0.88, '虚拟行业监管趋严，市场重新评估合规成本。', {}, { mutual_fund: 0.82, quant: 0.62, retail: 0.64 }, ['监管']),
      template('macro_event', 'liquidity_easing', 'positive', 0.5, 0.76, 14, 0.86, '虚拟流动性环境边际宽松，成长资产估值压力缓解。', {}, { northbound: 0.74, mutual_fund: 0.72, quant: 0.58 }, ['流动性']),
      template('macro_event', 'liquidity_tightening', 'negative', 0.54, 0.78, 14, 0.86, '虚拟流动性环境收紧，风险资产估值折现压力上升。', {}, { mutual_fund: 0.74, northbound: 0.72, quant: 0.62 }, ['流动性']),
      template('macro_event', 'economic_data_surprise', 'positive', 0.44, 0.7, 10, 0.82, '虚拟经济数据好于预期，市场风险偏好修复。', {}, { northbound: 0.7, mutual_fund: 0.62 }, ['宏观']),
      template('macro_event', 'economic_data_miss', 'negative', 0.46, 0.72, 10, 0.82, '虚拟经济数据不及预期，市场风险偏好降温。', {}, { northbound: 0.7, mutual_fund: 0.62 }, ['宏观']),
      template('market_trading_event', 'volume_breakout', 'positive', 0.48, 0.62, 6, 0.76, '股票放量上涨，短线资金关注度提升。', { min_return_5_steps: 0.01, min_order_book_imbalance: 0.08 }, { hot_money: 0.88, quant: 0.75, retail: 0.72 }, ['放量上涨']),
      template('market_trading_event', 'breakdown_warning', 'negative', 0.5, 0.64, 6, 0.76, '股价跌破关键观察位，短线止损压力上升。', { max_return_5_steps: -0.01 }, { quant: 0.78, hot_money: 0.74, retail: 0.7 }, ['跌破价位']),
      template('market_trading_event', 'capital_inflow', 'positive', 0.46, 0.66, 7, 0.78, '虚拟资金净流入迹象增强，盘口买盘更为主动。', { min_order_book_imbalance: 0.15 }, { hot_money: 0.78, quant: 0.72, retail: 0.64 }, ['资金流入']),
      template('market_trading_event', 'capital_outflow', 'negative', 0.48, 0.66, 7, 0.78, '虚拟资金净流出迹象增强，盘口卖压有所抬升。', { max_order_book_imbalance: -0.15 }, { quant: 0.72, hot_money: 0.7, retail: 0.64 }, ['资金流出']),
      template('sentiment_rumor_event', 'market_rumor', 'rumor', 0.52, 0.42, 5, 0.7, '市场出现未经确认的订单或合作传闻，短期情绪波动放大。', {}, { retail: 0.84, hot_money: 0.82, quant: 0.48 }, ['传闻']),
      template('sentiment_rumor_event', 'social_media_heat', 'rumor', 0.42, 0.38, 4, 0.66, '社交平台热议升温，但消息真实性仍待验证。', {}, { retail: 0.9, hot_money: 0.76 }, ['社交热议']),
      template('sentiment_rumor_event', 'analyst_upgrade', 'positive', 0.46, 0.76, 9, 0.82, '虚拟研究机构上调观点，强调盈利弹性与估值修复。', {}, { mutual_fund: 0.84, northbound: 0.66, retail: 0.52 }, ['分析师看多']),
      template('sentiment_rumor_event', 'analyst_downgrade', 'negative', 0.48, 0.76, 9, 0.82, '虚拟研究机构下调观点，提示估值和订单风险。', {}, { mutual_fund: 0.84, northbound: 0.66, retail: 0.58 }, ['评级下调']),
      template('sentiment_rumor_event', 'rumor_clarification', 'clarification', 0.5, 0.82, 6, 0.72, '公司对前期传闻进行澄清，市场不确定性下降。', {}, { retail: 0.78, hot_money: 0.68, mutual_fund: 0.62 }, ['澄清']),
      template('risk_event', 'regulatory_inquiry', 'negative', 0.68, 0.92, 14, 0.88, '虚拟监管问询出现，市场关注信息披露和经营风险。', { min_volatility: 0.02 }, { retail: 0.74, mutual_fund: 0.8, quant: 0.66 }, ['监管问询']),
      template('risk_event', 'financial_abnormality', 'negative', 0.7, 0.82, 16, 0.9, '财务指标出现异常波动，基本面风险溢价抬升。', {}, { mutual_fund: 0.88, northbound: 0.78, retail: 0.66 }, ['财务异常']),
      template('risk_event', 'data_security_risk', 'negative', 0.56, 0.74, 10, 0.82, '公司出现虚拟数据安全风险提示，市场短期避险情绪升温。', {}, { retail: 0.68, mutual_fund: 0.62, quant: 0.58 }, ['数据安全']),
      template('risk_event', 'executive_departure', 'negative', 0.5, 0.76, 9, 0.8, '核心高管变动引发治理稳定性讨论。', {}, { mutual_fund: 0.72, retail: 0.56 }, ['高管离职']),
    ];
  }
}

class MarketStateMonitor {
  snapshot(state: MarketStateInput, recentNews: SyntheticNewsArticle[]): StandardizedMarketState {
    const prices = state.priceSeries.map((point) => point.price);
    const priceAt = (offset: number) => prices.length > offset ? prices[prices.length - 1 - offset] : state.stock.previousClose;
    const pct = (base: number) => base === 0 ? 0 : (state.stock.currentPrice - base) / base;
    const bidDepth = state.orderBook.bids.reduce((sum, level) => sum + level.quantity, 0);
    const askDepth = state.orderBook.asks.reduce((sum, level) => sum + level.quantity, 0);
    const retailAgents = state.agents.filter((agent) => agent.type === 'retail' || agent.type === 'hot_money');
    const institutionAgents = state.agents.filter((agent) => ['mutual_fund', 'northbound', 'national_team'].includes(agent.type));
    const averageSentiment = (agents: AgentState[]) => agents.length ? agents.reduce((sum, agent) => sum + agent.sentiment, 0) / agents.length : 0;
    const averagePosition = (types: AgentType[]) => {
      const agents = state.agents.filter((agent) => types.includes(agent.type));
      if (!agents.length) return 0;
      return clamp01(agents.reduce((sum, agent) => sum + agent.position * state.stock.currentPrice / Math.max(1, agent.cash + agent.position * state.stock.currentPrice), 0) / agents.length);
    };
    return {
      time_step: state.status.tick,
      trading_day: Math.max(1, Math.floor(state.status.tick / 240) + 1),
      market_phase: state.status.phase === 'continuous' ? 'continuous_auction' : state.status.phase,
      asset: {
        symbol: state.stock.symbol,
        name: state.stock.name,
        industry: INDUSTRIES[hashText(state.stock.symbol) % INDUSTRIES.length],
        board: state.stock.board,
        price: state.stock.currentPrice,
        previous_close: state.stock.previousClose,
        return_1_step: pct(priceAt(1)),
        return_5_steps: pct(priceAt(5)),
        return_20_steps: pct(priceAt(20)),
        volatility: state.metrics.volatility,
        volume: state.stock.volume,
        turnover_rate: state.metrics.turnoverRate,
        limit_up_price: state.stock.upperLimit,
        limit_down_price: state.stock.lowerLimit,
      },
      order_book: {
        best_bid: state.orderBook.bestBid ?? state.stock.currentPrice,
        best_ask: state.orderBook.bestAsk ?? state.stock.currentPrice,
        spread: state.orderBook.spread ?? 0,
        bid_depth: bidDepth,
        ask_depth: askDepth,
        order_book_imbalance: state.metrics.orderBookImbalance,
      },
      agent_state: {
        retail_sentiment: averageSentiment(retailAgents),
        institution_sentiment: averageSentiment(institutionAgents),
        momentum_agent_position: averagePosition(['hot_money', 'quant']),
        fundamental_agent_position: averagePosition(['mutual_fund', 'northbound']),
        noise_agent_activity: clamp01((state.metrics.activeBuyRatio + state.metrics.activeSellRatio) / 2 + Math.abs(state.metrics.marketSentiment) * 0.2),
        market_maker_inventory: clamp((state.agents.find((agent) => agent.type === 'national_team')?.position ?? 0) / Math.max(1, state.stock.totalShares), -1, 1),
      },
      recent_news: recentNews.slice(0, 8).map((news) => ({
        news_id: news.news_id,
        title: news.title,
        impact_direction: news.impact_direction,
        published_step: news.published_step,
        current_impact: news.current_impact,
      })),
    };
  }
}

class SourceChannelSimulator {
  choose(event: SyntheticNewsEvent, config: NewsEngineConfig, forced?: SourceType): NewsSourceProfile {
    if (forced) return SOURCE_PROFILES[forced];
    if (event.event_direction === 'rumor') return seededRandom(config.random_seed, event.event_id) < 0.55 ? SOURCE_PROFILES.market_rumor : SOURCE_PROFILES.social_media;
    if (event.event_direction === 'clarification') return SOURCE_PROFILES.clarification_notice;
    if (event.event_category === 'risk_event') return SOURCE_PROFILES.regulatory_notice;
    if (event.event_category === 'company_fundamental' && event.credibility > 0.82) return SOURCE_PROFILES.official_announcement;
    if (event.event_category === 'sentiment_rumor_event' && event.event_type.includes('analyst')) return SOURCE_PROFILES.analyst_report;
    return SOURCE_PROFILES.financial_media;
  }
}

class EventCausalGenerator {
  constructor(private readonly library: EventTemplateLibrary) {}

  generate(market: StandardizedMarketState, config: NewsEngineConfig, request?: ManualNewsRequest): { event: SyntheticNewsEvent; selection_reason: string } | null {
    const candidates = this.library.select(market, [], request?.event_type);
    if (!candidates.length) return null;
    const pick = config.mode === 'deterministic' || request?.event_type
      ? candidates[0]
      : candidates[Math.min(candidates.length - 1, Math.floor(seededRandom(config.random_seed, `${market.asset.symbol}-${market.time_step}`) * Math.min(candidates.length, 5)))];
    const item = pick.template;
    const randomSalt = `${item.template_id}-${market.asset.symbol}-${market.time_step}`;
    const stochasticNoise = config.mode === 'stochastic' ? (seededRandom(config.random_seed, randomSalt) - 0.5) * 0.12 : 0;
    const direction = directionSign(item.direction);
    const strength = clamp01((item.base_strength + Math.abs(market.asset.return_5_steps) + Math.abs(market.order_book.order_book_imbalance) * 0.15 + stochasticNoise) * config.global_impact_multiplier);
    const credibility = clamp01(item.base_credibility + (SOURCE_PROFILES.financial_media.credibility_multiplier - 0.8) * 0.1);
    const novelty = clamp01(0.55 + seededRandom(config.random_seed, `${randomSalt}-novelty`) * 0.35);
    const uncertainty = item.direction === 'rumor' ? clamp01(0.45 + seededRandom(config.random_seed, `${randomSalt}-uncertainty`) * 0.35) : clamp01(1 - credibility + SOURCE_PROFILES.financial_media.noise_level * 0.2);
    const expectedPriceImpact = clamp(direction * strength * credibility * 0.08, -0.1, 0.1);
    return {
      event: {
        event_id: `E_${String(market.time_step).padStart(4, '0')}_${hashText(randomSalt).toString(16).slice(0, 5)}`,
        event_time: market.time_step,
        event_type: item.event_type,
        event_category: item.category,
        target_asset: request?.target_asset ?? market.asset.symbol,
        target_asset_name: market.asset.name,
        target_industry: market.asset.industry,
        event_level: eventLevel(item.category),
        event_direction: item.direction,
        event_strength: strength,
        credibility,
        novelty,
        uncertainty,
        expected_price_impact: expectedPriceImpact,
        expected_volume_impact: clamp01(strength * (0.25 + market.asset.volatility * 0.2)),
        duration_steps: item.base_duration_steps,
        decay_rate: item.default_decay_rate,
        affected_agent_types: item.affected_agent_types,
        causal_reason: pick.reason,
        event_summary: item.summary_template.replace('公司', market.asset.name),
        template_id: item.template_id,
      },
      selection_reason: pick.reason,
    };
  }
}

class ImpactCalibrationModel {
  calculateNewsImpact(event: SyntheticNewsEvent, source: NewsSourceProfile, market: StandardizedMarketState): NewsImpactResult {
    const limitDistance = Math.min(
      Math.abs(market.asset.limit_up_price - market.asset.price) / Math.max(0.01, market.asset.price),
      Math.abs(market.asset.price - market.asset.limit_down_price) / Math.max(0.01, market.asset.price),
    );
    const marketSensitivity = clamp01(
      0.35
      + market.asset.volatility * 0.45
      + Math.abs(market.order_book.order_book_imbalance) * 0.25
      + Math.abs(market.agent_state.retail_sentiment) * 0.18
      + Math.max(0, 0.08 - limitDistance) * 1.4
      + market.recent_news.reduce((sum, news) => sum + Math.abs(news.current_impact), 0) * 0.04,
    );
    const sourceWeight = source.credibility_multiplier * (1 - source.noise_level * 0.18);
    const base = event.event_strength * event.credibility * event.novelty * sourceWeight * marketSensitivity;
    const sign = directionSign(event.event_direction);
    const direction: NewsImpactDirection = event.event_direction === 'rumor'
      ? 'uncertain'
      : event.event_direction === 'clarification'
        ? 'neutral'
        : sign > 0
          ? 'up'
          : sign < 0
            ? 'down'
            : 'neutral';
    const signedImpact = direction === 'uncertain' || direction === 'neutral' ? base * 0.55 : base * sign;
    return {
      impact_direction: direction,
      impact_strength: clamp(signedImpact),
      expected_price_impact: clamp(signedImpact * 0.065, -0.1, 0.1),
      expected_volume_impact: clamp01(event.expected_volume_impact * (1 + Math.abs(signedImpact))),
      duration_steps: event.duration_steps,
      decay_rate: event.decay_rate,
      market_sensitivity: marketSensitivity,
    };
  }

  calculateAgentReaction(article: SyntheticNewsArticle, exposure: Omit<AgentNewsExposure, 'reaction_strength' | 'sentiment_delta' | 'expected_return_delta' | 'risk_preference_delta' | 'action_bias'>, agent: AgentProfileInput): Pick<AgentNewsExposure, 'reaction_strength' | 'sentiment_delta' | 'expected_return_delta' | 'risk_preference_delta' | 'action_bias'> {
    const trust = channelTrust(agent.type, article.source_type);
    const strategy = strategyWeight(agent.type, article.tags, article.impact_direction);
    const risk = clamp01(agent.riskAppetite);
    const sensitivity = newsSensitivity(agent.type);
    const reaction = clamp01(Math.abs(article.current_impact) * sensitivity * risk * trust * strategy);
    const sign = directionSign(article.impact_direction);
    return {
      reaction_strength: reaction,
      sentiment_delta: clamp(sign * reaction * 0.28, -0.35, 0.35),
      expected_return_delta: clamp(sign * reaction * 0.035, -0.06, 0.06),
      risk_preference_delta: clamp((article.impact_direction === 'uncertain' ? -1 : sign) * reaction * 0.08, -0.12, 0.12),
      action_bias: article.impact_direction === 'up' ? 'buy' : article.impact_direction === 'down' ? 'sell' : exposure.received && reaction > 0.55 ? (sign >= 0 ? 'buy' : 'sell') : 'hold',
    };
  }
}

class NewsNarrator {
  narrate(event: SyntheticNewsEvent, source: NewsSourceProfile, impact: NewsImpactResult): SyntheticNewsArticle {
    const name = event.target_asset_name;
    const directionTitle = event.event_direction === 'positive'
      ? '预期改善'
      : event.event_direction === 'negative'
        ? '风险升温'
        : event.event_direction === 'rumor'
          ? '传闻发酵'
          : event.event_direction === 'clarification'
            ? '澄清前期传闻'
            : '信息更新';
    const title = `${name}${directionTitle}，${event.event_summary.replace(name, '').slice(0, 18)}`;
    const rumorPrefix = source.source_type === 'market_rumor' || source.source_type === 'social_media'
      ? '虚拟市场传言显示，相关信息尚未确认。'
      : source.source_type === 'official_announcement'
        ? `${name}在虚拟公告渠道披露经营更新。`
        : source.source_type === 'clarification_notice'
          ? `${name}对前期市场消息进行澄清。`
          : `${source.display_name}报道，${name}出现新的经营与市场信息。`;
    const content = `${rumorPrefix}${event.event_summary}当前该消息的可信度为${Math.round(event.credibility * 100)}%，模型测算其对虚拟市场情绪的冲击强度为${Math.round(Math.abs(impact.impact_strength) * 100)}%。该新闻仅用于ABM仿真实验，不对应任何真实公司、真实人物或真实证券。`;
    const sentiment = impact.impact_direction === 'up' ? 0.5 + Math.abs(impact.impact_strength) / 2 : impact.impact_direction === 'down' ? 0.5 - Math.abs(impact.impact_strength) / 2 : 0.5;
    return {
      news_id: `N_${String(event.event_time).padStart(4, '0')}_${event.event_id.slice(-5)}`,
      event_id: event.event_id,
      published_step: event.event_time,
      title,
      content,
      source_type: source.source_type,
      source_name: source.display_name,
      tone: impact.impact_direction === 'up' ? 'neutral_positive' : impact.impact_direction === 'down' ? 'neutral_negative' : impact.impact_direction === 'uncertain' ? 'uncertain' : 'neutral',
      language: 'zh-CN',
      sentiment_score: clamp01(sentiment),
      credibility: event.credibility,
      novelty: event.novelty,
      uncertainty: event.uncertainty,
      target_assets: [event.target_asset],
      target_industries: [event.target_industry],
      impact_direction: impact.impact_direction,
      impact_strength: impact.impact_strength,
      duration_steps: impact.duration_steps,
      decay_rate: impact.decay_rate,
      current_impact: impact.impact_strength,
      tags: [event.event_category, event.event_type, ...Object.keys(event.affected_agent_types)],
    };
  }
}

class ConsistencyChecker {
  check(article: SyntheticNewsArticle, event: SyntheticNewsEvent, recent: SyntheticNewsArticle[]): NewsConsistencyResult {
    const issues: string[] = [];
    const adjustments: string[] = [];
    const text = `${article.title} ${article.content}`;
    for (const pattern of REAL_ENTITY_PATTERNS) {
      if (pattern.test(text)) issues.push('新闻包含真实公司、真实人物或真实证券代码');
    }
    if (!article.target_assets.includes(event.target_asset)) issues.push('新闻目标资产与 event JSON 不一致');
    if (event.event_direction === 'rumor' && !/(传闻|尚未确认|不确定|传言)/.test(text)) issues.push('market_rumor 未体现不确定性');
    if (article.source_type === 'official_announcement' && /(传闻|猜测|或许|尚未确认)/.test(text)) issues.push('official_announcement 文风过于模糊');
    if (Math.abs(article.impact_strength) > 1) issues.push('impact_strength 超出范围');
    if (recent.some((news) => news.title === article.title && article.published_step - news.published_step <= 8)) issues.push('近期新闻标题重复');
    let credibility = article.credibility;
    if (issues.length > 0 && issues.every((item) => !item.includes('真实'))) {
      credibility = clamp01(credibility - 0.12);
      adjustments.push('降低新闻可信度以反映一致性风险');
    }
    return {
      passed: issues.length === 0 || !issues.some((item) => item.includes('真实')),
      issues,
      adjustments,
      final_credibility: credibility,
      action: issues.length === 0 ? 'accept' : issues.some((item) => item.includes('真实')) ? 'discard' : 'adjust',
    };
  }
}

class AgentExposureModel {
  constructor(private readonly calibration: ImpactCalibrationModel) {}

  expose(article: SyntheticNewsArticle, agents: AgentState[], source: NewsSourceProfile, config: NewsEngineConfig): AgentNewsExposure[] {
    return agents.map((agent) => {
      const receiveProbability = clamp01(channelReach(agent.type, source) * attention(agent) * channelPreference(agent.type, source.source_type) * credibilityAdjustment(agent.type, article.credibility));
      const sample = seededRandom(config.random_seed, `${article.news_id}-${agent.id}`);
      const received = sample <= receiveProbability && article.credibility >= credibilityThreshold(agent.type);
      const latency = received ? Math.round((1 - source.speed) * 3 + seededRandom(config.random_seed, `${article.news_id}-${agent.id}-latency`) * 2) : 0;
      const baseExposure = {
        id: randomUUID(),
        news_id: article.news_id,
        agent_id: agent.id,
        agent_type: agent.type,
        received,
        receive_step: article.published_step + latency,
        source_type: article.source_type,
        title: article.title,
        impact_direction: article.impact_direction,
        current_impact: article.current_impact,
      };
      return {
        ...baseExposure,
        ...this.calibration.calculateAgentReaction(article, baseExposure, agent),
      };
    });
  }
}

class NewsMemoryDecay {
  update(records: SyntheticNewsRecord[], currentStep: number): void {
    for (const record of records) {
      record.article.current_impact = this.currentImpact(record.article, currentStep);
      for (const exposure of record.exposures) {
        exposure.current_impact = record.article.current_impact;
      }
    }
  }

  currentImpact(article: SyntheticNewsArticle, currentStep: number): number {
    const elapsed = Math.max(0, currentStep - article.published_step);
    if (elapsed > article.duration_steps) return 0;
    return clamp(article.impact_strength * (article.decay_rate ** elapsed));
  }

  activeForAgent(records: SyntheticNewsRecord[], agentId: string, currentStep: number): AgentNewsExposure[] {
    return records.flatMap((record) => {
      const impact = this.currentImpact(record.article, currentStep);
      if (impact === 0) return [];
      return record.exposures
        .filter((exposure) => exposure.agent_id === agentId && exposure.received && exposure.receive_step <= currentStep)
        .map((exposure) => ({
          ...exposure,
          current_impact: impact,
          reaction_strength: clamp01(exposure.reaction_strength * Math.max(0.15, Math.abs(impact) / Math.max(0.01, Math.abs(record.article.impact_strength)))),
        }));
    });
  }
}

class MarketFeedbackLogger {
  create(record: Omit<SyntheticNewsRecord, 'feedback'>, state: MarketStateInput): NewsMarketFeedback {
    const pre = this.snapshot(state);
    const received = record.exposures.filter((item) => item.received);
    const buy = received.filter((item) => item.action_bias === 'buy');
    const sell = received.filter((item) => item.action_bias === 'sell');
    return {
      news_id: record.article.news_id,
      event_id: record.event.event_id,
      published_step: record.article.published_step,
      pre_market_snapshot: pre,
      post_market_snapshots: [],
      agent_response_summary: {
        received_agent_count: received.length,
        buy_bias_count: buy.length,
        sell_bias_count: sell.length,
        hold_bias_count: received.length - buy.length - sell.length,
        avg_reaction_strength: received.length ? clamp01(received.reduce((sum, item) => sum + item.reaction_strength, 0) / received.length) : 0,
        retail_sentiment_change: received.filter((item) => item.agent_type === 'retail').reduce((sum, item) => sum + item.sentiment_delta, 0),
        institution_sentiment_change: received.filter((item) => ['mutual_fund', 'northbound', 'national_team'].includes(item.agent_type)).reduce((sum, item) => sum + item.sentiment_delta, 0),
      },
      realized_impact: {
        price_change_1_step: 0,
        price_change_5_steps: 0,
        volume_change_5_steps: 0,
        volatility_change_5_steps: 0,
        predicted_price_impact: record.event.expected_price_impact,
        prediction_error_5_steps: 0,
      },
    };
  }

  update(records: SyntheticNewsRecord[], state: MarketStateInput): void {
    for (const record of records) {
      const elapsed = state.status.tick - record.article.published_step;
      if (![1, 3, 5, 10].includes(elapsed)) continue;
      const current = this.snapshot(state);
      if (!record.feedback.post_market_snapshots.some((item) => item.step === current.step)) {
        record.feedback.post_market_snapshots.push(current);
      }
      const pre = record.feedback.pre_market_snapshot;
      const step1 = record.feedback.post_market_snapshots.find((item) => item.step - record.article.published_step === 1);
      const step5 = record.feedback.post_market_snapshots.find((item) => item.step - record.article.published_step === 5) ?? current;
      record.feedback.realized_impact = {
        price_change_1_step: step1 ? (step1.price - pre.price) / Math.max(0.01, pre.price) : record.feedback.realized_impact.price_change_1_step,
        price_change_5_steps: (step5.price - pre.price) / Math.max(0.01, pre.price),
        volume_change_5_steps: (step5.volume - pre.volume) / Math.max(1, pre.volume || 1),
        volatility_change_5_steps: step5.volatility - pre.volatility,
        predicted_price_impact: record.event.expected_price_impact,
        prediction_error_5_steps: (step5.price - pre.price) / Math.max(0.01, pre.price) - record.event.expected_price_impact,
      };
    }
  }

  private snapshot(state: MarketStateInput): NewsFeedbackSnapshot {
    return {
      step: state.status.tick,
      price: state.stock.currentPrice,
      volume: state.stock.volume,
      buy_orders: state.orderBook.bids.reduce((sum, item) => sum + item.orderCount, 0),
      sell_orders: state.orderBook.asks.reduce((sum, item) => sum + item.orderCount, 0),
      volatility: state.metrics.volatility,
      order_book_imbalance: state.metrics.orderBookImbalance,
      retail_sentiment: average(state.agents.filter((agent) => agent.type === 'retail').map((agent) => agent.sentiment)),
      institution_sentiment: average(state.agents.filter((agent) => ['mutual_fund', 'northbound', 'national_team'].includes(agent.type)).map((agent) => agent.sentiment)),
    };
  }
}

export class SyntheticFinancialNewsEngine {
  private readonly monitor = new MarketStateMonitor();
  private readonly library = new EventTemplateLibrary();
  private readonly generator = new EventCausalGenerator(this.library);
  private readonly sourceSimulator = new SourceChannelSimulator();
  private readonly calibration = new ImpactCalibrationModel();
  private readonly narrator = new NewsNarrator();
  private readonly checker = new ConsistencyChecker();
  private readonly exposure = new AgentExposureModel(this.calibration);
  private readonly decay = new NewsMemoryDecay();
  private readonly feedback = new MarketFeedbackLogger();
  private config: NewsEngineConfig = { ...DEFAULT_CONFIG };
  private records: SyntheticNewsRecord[] = [];

  getConfig(): NewsEngineConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<NewsEngineConfig>): NewsEngineConfig {
    this.config = {
      ...this.config,
      ...partial,
      generation_interval_steps: Math.max(1, Math.round(partial.generation_interval_steps ?? this.config.generation_interval_steps)),
      random_seed: Math.round(partial.random_seed ?? this.config.random_seed),
      global_impact_multiplier: clamp01(partial.global_impact_multiplier ?? this.config.global_impact_multiplier),
      rumor_probability: clamp01(partial.rumor_probability ?? this.config.rumor_probability),
      policy_event_probability: clamp01(partial.policy_event_probability ?? this.config.policy_event_probability),
      risk_event_probability: clamp01(partial.risk_event_probability ?? this.config.risk_event_probability),
      max_active_news: Math.max(1, Math.round(partial.max_active_news ?? this.config.max_active_news)),
    };
    return this.getConfig();
  }

  listTemplates(): NewsEventTemplate[] {
    return this.library.list();
  }

  addTemplate(templateConfig: NewsEventTemplate): void {
    this.library.add(templateConfig);
  }

  listRecords(): SyntheticNewsRecord[] {
    return this.records;
  }

  listArticles(): SyntheticNewsArticle[] {
    return this.records.map((record) => record.article);
  }

  getRecord(newsId: string): SyntheticNewsRecord | undefined {
    return this.records.find((record) => record.article.news_id === newsId);
  }

  clear(): void {
    this.records = [];
  }

  updateDecayAndFeedback(step: number, state: MarketStateInput): void {
    this.decay.update(this.records, step);
    this.feedback.update(this.records, state);
  }

  maybeGenerate(state: MarketStateInput, agents: AgentState[]): SyntheticNewsRecord | null {
    if (!this.config.enabled) return null;
    if (state.status.tick === 0 || state.status.tick % this.config.generation_interval_steps !== 0) return null;
    if (this.activeArticles(state.status.tick).length >= this.config.max_active_news) return null;
    return this.generate(state, agents);
  }

  generate(state: MarketStateInput, agents: AgentState[], request?: ManualNewsRequest): SyntheticNewsRecord | null {
    const market = this.monitor.snapshot(state, this.listArticles());
    const generated = this.generator.generate(market, this.config, request);
    if (!generated) return null;
    const source = this.sourceSimulator.choose(generated.event, this.config, request?.source_type);
    const impact = this.calibration.calculateNewsImpact(generated.event, source, market);
    let article = this.narrator.narrate(generated.event, source, impact);
    const consistency = this.checker.check(article, generated.event, this.listArticles());
    if (!consistency.passed && consistency.action === 'discard') return null;
    if (consistency.final_credibility !== article.credibility) {
      article = { ...article, credibility: consistency.final_credibility, impact_strength: clamp(article.impact_strength * consistency.final_credibility / Math.max(0.01, article.credibility)) };
    }
    const exposures = this.exposure.expose(article, agents, source, this.config);
    const partial = { event: generated.event, article, source, exposures, consistency };
    const record: SyntheticNewsRecord = {
      ...partial,
      feedback: this.feedback.create(partial, state),
    };
    this.records = [record, ...this.records].slice(0, 120);
    return record;
  }

  activeArticles(step: number): SyntheticNewsArticle[] {
    this.decay.update(this.records, step);
    return this.records.map((record) => record.article).filter((article) => article.current_impact !== 0);
  }

  getCurrentNewsImpact(newsId: string, step: number): number {
    const record = this.getRecord(newsId);
    return record ? this.decay.currentImpact(record.article, step) : 0;
  }

  getActiveNewsForAgent(agentId: string, step: number): AgentNewsExposure[] {
    return this.decay.activeForAgent(this.records, agentId, step);
  }

  toMarketEvent(record: SyntheticNewsRecord): MarketEvent {
    const affected = Array.from(new Set(record.exposures.filter((item) => item.received).map((item) => item.agent_type)));
    return {
      id: record.article.news_id,
      tick: record.article.published_step,
      timestamp: new Date().toISOString(),
      type: record.article.impact_direction === 'up'
        ? 'positive_news'
        : record.article.impact_direction === 'down'
          ? 'negative_news'
          : record.article.source_type === 'clarification_notice'
            ? 'risk'
            : 'rumor',
      title: record.article.title,
      message: record.article.content,
      impact: record.article.impact_strength,
      sentimentDelta: clamp(record.article.impact_strength * 0.45),
      affectedAgentTypes: affected.length ? affected : ALL_AGENT_TYPES,
      severity: Math.abs(record.article.impact_strength) > 0.5 ? 'high' : Math.abs(record.article.impact_strength) > 0.24 ? 'medium' : 'low',
      source: 'news_agent',
    };
  }

  getUpdate(step: number): SyntheticNewsUpdate {
    return {
      type: 'news_update',
      enabled: this.config.enabled,
      config: this.getConfig(),
      news: this.listArticles(),
      activeNews: this.activeArticles(step),
      latestRecord: this.records[0],
      templates: this.listTemplates(),
    };
  }
}

function average(values: number[]): number {
  return values.length ? Number((values.reduce((sum, item) => sum + item, 0) / values.length).toFixed(4)) : 0;
}

function channelReach(type: AgentType, source: NewsSourceProfile): number {
  if (type === 'retail' || type === 'hot_money') return source.retail_reach;
  if (type === 'quant' || type === 'training_quant') return (source.retail_reach + source.institution_reach) / 2;
  return source.institution_reach;
}

function channelPreference(type: AgentType, source: SourceType): number {
  const retail = ['financial_media', 'social_media', 'market_rumor'];
  const institution = ['official_announcement', 'analyst_report', 'regulatory_notice', 'clarification_notice'];
  if (type === 'retail') return retail.includes(source) ? 0.95 : 0.55;
  if (type === 'hot_money') return ['financial_media', 'social_media', 'market_rumor', 'market_rumor'].includes(source) ? 0.98 : 0.58;
  if (type === 'quant' || type === 'training_quant') return ['financial_media', 'market_rumor', 'regulatory_notice'].includes(source) ? 0.82 : 0.62;
  if (type === 'national_team') return source === 'regulatory_notice' || source === 'official_announcement' ? 0.92 : 0.48;
  return institution.includes(source) ? 0.95 : 0.45;
}

function credibilityThreshold(type: AgentType): number {
  if (type === 'retail' || type === 'hot_money') return 0.22;
  if (type === 'quant' || type === 'training_quant') return 0.34;
  if (type === 'national_team') return 0.62;
  return 0.42;
}

function credibilityAdjustment(type: AgentType, credibility: number): number {
  const threshold = credibilityThreshold(type);
  if (credibility < threshold) return 0.35;
  return clamp01(0.55 + credibility * 0.55);
}

function attention(agent: AgentState): number {
  const group = Math.max(1, agent.groupSize ?? 1);
  return clamp01(0.72 + Math.min(0.18, Math.log10(group) * 0.05) + Math.abs(agent.sentiment) * 0.08);
}

function channelTrust(type: AgentType, source: SourceType): number {
  if (source === 'regulatory_notice') return type === 'national_team' ? 0.98 : 0.9;
  if (source === 'official_announcement') return ['mutual_fund', 'northbound', 'national_team'].includes(type) ? 0.92 : 0.72;
  if (source === 'analyst_report') return ['mutual_fund', 'northbound'].includes(type) ? 0.88 : 0.5;
  if (source === 'market_rumor' || source === 'social_media') return ['retail', 'hot_money'].includes(type) ? 0.78 : 0.38;
  return 0.74;
}

function strategyWeight(type: AgentType, tags: string[], direction: NewsImpactDirection): number {
  if (type === 'mutual_fund' || type === 'northbound') return tags.some((tag) => ['company_fundamental', 'industry_event', 'macro_event'].includes(tag)) ? 0.9 : 0.55;
  if (type === 'hot_money') return tags.some((tag) => ['market_trading_event', 'sentiment_rumor_event', '传闻'].includes(tag)) ? 0.95 : 0.64;
  if (type === 'quant' || type === 'training_quant') return tags.includes('market_trading_event') || direction === 'uncertain' ? 0.86 : 0.66;
  if (type === 'national_team') return direction === 'down' ? 0.8 : 0.38;
  return 0.76;
}

function newsSensitivity(type: AgentType): number {
  switch (type) {
    case 'retail':
      return 0.88;
    case 'hot_money':
      return 0.92;
    case 'mutual_fund':
      return 0.62;
    case 'northbound':
      return 0.58;
    case 'national_team':
      return 0.42;
    case 'quant':
    case 'training_quant':
      return 0.72;
    default:
      return 0.5;
  }
}
