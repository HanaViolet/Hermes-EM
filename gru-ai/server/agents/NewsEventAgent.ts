import { randomUUID } from 'node:crypto';
import type { AgentType, MarketEnvironmentSnapshot, MarketEvent, MarketState, TickContext } from '../simulation/types.js';

const NEWS_TEMPLATES: Array<{
  type: MarketEvent['type'];
  title: string;
  message: string;
  impact: number;
  affectedAgentTypes: AgentType[];
}> = [
  {
    type: 'positive_news',
    title: '产业利好',
    message: 'ABM科技虚拟新品订单超预期，市场风险偏好升温',
    impact: 0.45,
    affectedAgentTypes: ['retail', 'hot_money', 'mutual_fund', 'northbound', 'quant'],
  },
  {
    type: 'negative_news',
    title: '业绩扰动',
    message: 'ABM科技虚拟成本压力上升，短线资金转向谨慎',
    impact: -0.42,
    affectedAgentTypes: ['retail', 'hot_money', 'mutual_fund', 'quant'],
  },
  {
    type: 'policy',
    title: '政策风向',
    message: '虚拟产业政策释放积极信号，机构资金关注度提升',
    impact: 0.32,
    affectedAgentTypes: ['mutual_fund', 'northbound', 'national_team', 'retail'],
  },
  {
    type: 'earnings',
    title: '财报预告',
    message: 'ABM科技虚拟财报进入预告窗口，市场分歧扩大',
    impact: -0.18,
    affectedAgentTypes: ['retail', 'quant', 'hot_money'],
  },
];

export class NewsEventAgent {
  generate(context: TickContext, market: MarketState, environment: MarketEnvironmentSnapshot, forcedImpact?: number): MarketEvent | null {
    if (forcedImpact === undefined && (context.tick < 8 || context.tick % 18 !== 0)) return null;

    const template = forcedImpact === undefined
      ? NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)]
      : NEWS_TEMPLATES.find((item) => Math.sign(item.impact) === Math.sign(forcedImpact)) ?? NEWS_TEMPLATES[0];

    const impact = forcedImpact ?? template.impact;
    const sentimentDelta = Number((impact * 0.45 + environment.marketSentiment * 0.05).toFixed(4));

    return {
      id: randomUUID(),
      tick: context.tick,
      timestamp: new Date().toISOString(),
      type: template.type,
      title: template.title,
      message: `${template.message}（价格 ${market.stock.currentPrice.toFixed(2)}）`,
      impact,
      sentimentDelta,
      affectedAgentTypes: template.affectedAgentTypes,
      severity: Math.abs(impact) > 0.4 ? 'high' : 'medium',
      source: 'news_agent',
    };
  }
}
