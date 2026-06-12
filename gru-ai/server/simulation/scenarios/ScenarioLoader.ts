import type { AgentScenarioConfig, AgentType, MarketScenario, MarketScenarioSummary } from '../types.js';

const baseAgent = (
  count: number,
  cash: [number, number],
  position: [number, number],
  sentiment: [number, number],
  risk: [number, number],
  strategyParams: Record<string, number | boolean | string>,
): AgentScenarioConfig => ({
  count,
  initialCashRange: cash,
  initialPositionRange: position,
  sentimentRange: sentiment,
  riskPreferenceRange: risk,
  strategyParams,
});

const AGENTS = {
  retail: baseAgent(300, [20_000, 200_000], [0, 10_000], [-0.15, 0.15], [0.35, 0.9], {
    herdingStrength: 0.65,
    panicSellThreshold: -0.6,
    chaseUpStrength: 0.55,
    stopLossRatio: -0.08,
    takeProfitRatio: 0.12,
  }),
  hotMoney: baseAgent(18, [300_000, 3_000_000], [0, 30_000], [0.05, 0.45], [0.72, 0.98], {
    limitUpChaseThreshold: 0.72,
    sealLimitUpStrength: 0.7,
    breakLimitEscapeThreshold: -0.28,
    maxHoldingTicks: 28,
  }),
  mutualFund: baseAgent(12, [1_000_000, 10_000_000], [10_000, 120_000], [-0.1, 0.2], [0.25, 0.55], {
    targetPositionRatio: 0.58,
    rebalanceSpeed: 0.18,
    valuationAnchor: 10,
    maxDailyTradeRatio: 0.08,
    riskLimit: 0.22,
  }),
  quant: baseAgent(10, [500_000, 4_000_000], [0, 60_000], [-0.1, 0.1], [0.5, 0.82], {
    momentumWindow: 12,
    meanReversionWindow: 30,
    orderBookImbalanceThreshold: 0.28,
    volatilityThreshold: 0.48,
    maxPositionRatio: 0.55,
  }),
  northbound: baseAgent(6, [2_000_000, 12_000_000], [10_000, 100_000], [-0.05, 0.28], [0.32, 0.62], {
    trendSensitivity: 0.56,
    macroRiskSensitivity: 0.42,
    inflowStrength: 0.5,
    outflowThreshold: -0.38,
  }),
  nationalTeam: baseAgent(1, [20_000_000, 50_000_000], [100_000, 300_000], [0, 0.08], [0.12, 0.28], {
    interventionDrawdownThreshold: -0.045,
    sentimentThreshold: -0.48,
    liquidityThreshold: 0.35,
    maxInterventionCash: 12_000_000,
    supportOrderSize: 50_000,
  }),
  trainingQuantAgent: baseAgent(1, [1_000_000, 1_000_000], [0, 0], [0, 0], [0.5, 0.5], {
    observationSpace: 'price/orderBook/trades/market/agent/news',
    actionSpace: 'hold/buy/sell/cancel',
    rewardFunction: 'risk_adjusted',
    episode: 1,
    cumulativeReward: 0,
  }),
} satisfies MarketScenario['agents'];

function makeScenario(
  id: string,
  name: string,
  description: string,
  difficulty: MarketScenario['difficulty'],
  environment: MarketScenario['environment'],
  newsEvents: MarketScenario['newsEvents'],
  trainingEnabled = false,
): MarketScenario {
  return {
    id,
    name,
    description,
    difficulty,
    stock: {
      symbol: 'SIM001',
      name: '模拟科技',
      previousClose: 10,
      initialPrice: 10,
      board: 'main_board',
      totalShares: 100_000_000,
    },
    environment,
    agents: AGENTS,
    newsEvents,
    trainingConfig: trainingEnabled ? {
      enabled: true,
      maxTicks: difficulty === 'expert' ? 720 : 480,
      rewardFunction: difficulty === 'expert' ? 'drawdown_penalty' : 'risk_adjusted',
      randomizeEvents: difficulty === 'hard' || difficulty === 'expert',
      randomizeAgentParams: difficulty === 'hard' || difficulty === 'expert',
    } : undefined,
  };
}

export const SCENARIOS: MarketScenario[] = [
  makeScenario('default', '普通交易日', '无重大新闻，市场情绪中性，流动性正常，适合测试基础撮合逻辑。', 'easy',
    { marketSentiment: 0, liquidity: 0.72, volatility: 0.18, macroRisk: 0.18 }, []),
  makeScenario('positive-news', '利好上涨', '公司获得重大订单，散户和游资买入意愿增强，成交量放大。', 'medium',
    { marketSentiment: 0.24, liquidity: 0.78, volatility: 0.32, macroRisk: 0.12 }, [
      { id: 'positive-1', tick: 8, type: 'positive_news', title: '公司获得重大订单', description: '模拟科技公告虚拟大额订单，市场预期改善。', sentimentImpact: 0.62, liquidityImpact: 0.18, volatilityImpact: 0.2, fundamentalImpact: 0.35, affectedAgentTypes: ['retail', 'hot_money', 'mutual_fund', 'quant'] },
      { id: 'positive-2', tick: 32, type: 'policy_news', title: '行业政策支持', description: '虚拟产业政策释放积极信号，北向和公募关注度提升。', sentimentImpact: 0.36, liquidityImpact: 0.12, volatilityImpact: 0.1, fundamentalImpact: 0.18, affectedAgentTypes: ['mutual_fund', 'northbound', 'retail'] },
    ]),
  makeScenario('panic-sell', '利空恐慌', '盘中出现重大利空，散户恐慌卖出，游资撤退，国家队可能入场护盘。', 'hard',
    { marketSentiment: -0.28, liquidity: 0.5, volatility: 0.56, macroRisk: 0.55 }, [
      { id: 'panic-1', tick: 10, type: 'negative_news', title: '业绩低于预期', description: '模拟科技发布业绩预告，利润低于市场预期。', sentimentImpact: -0.78, liquidityImpact: -0.24, volatilityImpact: 0.42, fundamentalImpact: -0.4, affectedAgentTypes: ['retail', 'hot_money', 'mutual_fund', 'quant'] },
      { id: 'panic-2', tick: 44, type: 'liquidity_shock', title: '买盘深度快速下降', description: '恐慌卖压导致盘口流动性收缩，价差扩大。', sentimentImpact: -0.36, liquidityImpact: -0.34, volatilityImpact: 0.5, fundamentalImpact: -0.08, affectedAgentTypes: ['retail', 'quant', 'national_team'] },
    ]),
  makeScenario('limit-up', '游资封板', '游资尝试拉升股价，散户跟风买入，价格接近涨停。', 'medium',
    { marketSentiment: 0.38, liquidity: 0.68, volatility: 0.48, macroRisk: 0.22 }, [
      { id: 'limit-up-1', tick: 16, type: 'positive_news', title: '热点题材发酵', description: '市场短线资金开始聚焦模拟科技，游资尝试冲击涨停。', sentimentImpact: 0.52, liquidityImpact: 0.1, volatilityImpact: 0.38, fundamentalImpact: 0.12, affectedAgentTypes: ['hot_money', 'retail', 'quant'] },
    ]),
  makeScenario('limit-up-failure', '游资封板失败', '游资冲击涨停后资金不足，涨停打开，散户追高被套。', 'hard',
    { marketSentiment: 0.2, liquidity: 0.48, volatility: 0.68, macroRisk: 0.34 }, [
      { id: 'failure-1', tick: 14, type: 'positive_news', title: '短线资金冲板', description: '游资带动散户跟风，价格快速上行。', sentimentImpact: 0.45, liquidityImpact: 0.06, volatilityImpact: 0.36, fundamentalImpact: 0.08, affectedAgentTypes: ['hot_money', 'retail'] },
      { id: 'failure-2', tick: 54, type: 'rumor', title: '封单不足传闻', description: '市场传出封单不足，追高资金开始犹豫。', sentimentImpact: -0.55, liquidityImpact: -0.2, volatilityImpact: 0.52, fundamentalImpact: -0.05, affectedAgentTypes: ['retail', 'hot_money', 'quant'] },
    ]),
  makeScenario('national-team-rescue', '国家队护盘', '市场快速下跌，国家队提供买盘流动性稳定市场。', 'hard',
    { marketSentiment: -0.34, liquidity: 0.42, volatility: 0.5, macroRisk: 0.6 }, [
      { id: 'rescue-1', tick: 10, type: 'macro', title: '市场风险偏好下降', description: '宏观风险抬升，模拟科技跟随市场回落。', sentimentImpact: -0.48, liquidityImpact: -0.2, volatilityImpact: 0.35, fundamentalImpact: -0.12, affectedAgentTypes: ['retail', 'mutual_fund', 'northbound', 'national_team'] },
      { id: 'rescue-2', tick: 42, type: 'policy_news', title: '稳定资金入场', description: '国家队触发护盘策略，盘口买盘深度改善。', sentimentImpact: 0.34, liquidityImpact: 0.36, volatilityImpact: -0.12, fundamentalImpact: 0, affectedAgentTypes: ['national_team', 'retail', 'mutual_fund'] },
    ]),
  makeScenario('quant-volatility', '量化扰动', '量化 Agent 高频交易，短期价格和订单簿频繁波动。', 'hard',
    { marketSentiment: 0.02, liquidity: 0.64, volatility: 0.72, macroRisk: 0.24 }, [
      { id: 'quant-1', tick: 18, type: 'macro', title: '盘口噪声放大', description: '量化策略密集下单撤单，短期波动加大。', sentimentImpact: -0.08, liquidityImpact: -0.06, volatilityImpact: 0.62, fundamentalImpact: 0, affectedAgentTypes: ['quant', 'retail', 'hot_money'] },
    ], true),
  makeScenario('liquidity-crisis', '流动性危机', '卖盘增加，买盘深度下降，价差扩大，市场冲击成本上升。', 'expert',
    { marketSentiment: -0.42, liquidity: 0.28, volatility: 0.76, macroRisk: 0.68 }, [
      { id: 'liq-1', tick: 12, type: 'liquidity_shock', title: '流动性骤降', description: '买盘撤退，盘口深度显著下降。', sentimentImpact: -0.5, liquidityImpact: -0.45, volatilityImpact: 0.64, fundamentalImpact: -0.08, affectedAgentTypes: ['retail', 'quant', 'national_team'] },
    ], true),
  makeScenario('training-easy', '训练简单场景', '趋势相对清晰，新闻影响明显，适合初步训练量化 Agent。', 'easy',
    { marketSentiment: 0.18, liquidity: 0.76, volatility: 0.3, macroRisk: 0.16 }, [
      { id: 'train-easy-1', tick: 20, type: 'positive_news', title: '训练利好样本', description: '清晰利好驱动上涨，用于训练动量识别。', sentimentImpact: 0.45, liquidityImpact: 0.12, volatilityImpact: 0.24, fundamentalImpact: 0.22, affectedAgentTypes: ['retail', 'quant', 'training_quant'] },
    ], true),
  makeScenario('training-hard', '训练困难场景', '市场噪声大，新闻真假混合，流动性不稳定，适合测试泛化能力。', 'expert',
    { marketSentiment: -0.04, liquidity: 0.46, volatility: 0.82, macroRisk: 0.52 }, [
      { id: 'train-hard-1', tick: 18, type: 'rumor', title: '真假混合传闻', description: '市场传出未经确认消息，短期情绪剧烈波动。', sentimentImpact: -0.28, liquidityImpact: -0.12, volatilityImpact: 0.52, fundamentalImpact: -0.04, affectedAgentTypes: ['retail', 'hot_money', 'quant', 'training_quant'] },
      { id: 'train-hard-2', tick: 52, type: 'positive_news', title: '消息反转', description: '传闻被部分澄清，价格和情绪出现反向修复。', sentimentImpact: 0.38, liquidityImpact: 0.08, volatilityImpact: 0.34, fundamentalImpact: 0.12, affectedAgentTypes: ['retail', 'quant', 'training_quant'] },
    ], true),
];

export function scenarioSummary(scenario: MarketScenario): MarketScenarioSummary {
  const mainAgents = Object.entries(scenario.agents)
    .filter(([, config]) => Boolean(config) && config.count > 0)
    .map(([key]) => {
      if (key === 'hotMoney') return 'hot_money';
      if (key === 'mutualFund') return 'mutual_fund';
      if (key === 'nationalTeam') return 'national_team';
      if (key === 'trainingQuantAgent') return 'training_quant';
      return key;
    })
    .filter((key): key is AgentType => ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team', 'training_quant'].includes(key));

  return {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    difficulty: scenario.difficulty,
    initialPrice: scenario.stock.initialPrice,
    initialSentiment: scenario.environment.marketSentiment,
    initialLiquidity: scenario.environment.liquidity,
    newsEventCount: scenario.newsEvents.length,
    mainAgents,
    trainingEnabled: scenario.trainingConfig?.enabled ?? false,
  };
}

export class ScenarioLoader {
  private readonly scenarios = new Map(SCENARIOS.map((scenario) => [scenario.id, scenario]));

  list(): MarketScenarioSummary[] {
    return Array.from(this.scenarios.values()).map(scenarioSummary);
  }

  get(id: string): MarketScenario {
    return this.scenarios.get(id) ?? this.getDefault();
  }

  getDefault(): MarketScenario {
    const scenario = this.scenarios.get('default');
    if (!scenario) throw new Error('Default scenario is not configured');
    return scenario;
  }
}
