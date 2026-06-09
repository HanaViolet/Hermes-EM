import AgentMarketMap from '@/components/market/AgentMarketMap';
import CapitalFlowPanel from '@/components/market/CapitalFlowPanel';
import { PARCHMENT, PIXEL_CARD, PIXEL_CARD_RAISED } from '@/components/game/panels/panelUtils';
import type { AgentState, AgentType, MarketEvent, MarketState } from '@/types/market';
import { AGENT_COLORS, AGENT_LABELS, eventTone, formatMoney } from '@/components/market/marketTheme';

const AGENT_ORDER: AgentType[] = ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team'];
const NEWS_TYPES = new Set<MarketEvent['type']>(['positive_news', 'negative_news', 'policy', 'earnings']);

function AgentDock({ agents }: { agents: AgentState[] }) {
  const byType = new Map<AgentType, AgentState>();
  for (const agent of agents) {
    if (!byType.has(agent.type)) byType.set(agent.type, agent);
  }

  return (
    <section className="p-3" style={PIXEL_CARD_RAISED}>
      <div className="flex items-center justify-between mb-2 font-mono">
        <h2 className="text-sm font-bold" style={{ color: PARCHMENT.text }}>Agent 状态</h2>
        <span className="text-[11px]" style={{ color: PARCHMENT.textDim }}>{agents.length}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        {AGENT_ORDER.map((type) => {
          const agent = byType.get(type);
          const color = AGENT_COLORS[type];
          return (
            <div key={type} className="min-w-0 p-2 font-mono" style={PIXEL_CARD}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold truncate" style={{ color: PARCHMENT.text }}>{AGENT_LABELS[type]}</span>
                <span className="text-[10px] shrink-0" style={{ color }}>{agent?.lastAction.toUpperCase() ?? 'HOLD'}</span>
              </div>
              <div className="mt-2 space-y-1 text-[10px] tabular-nums" style={{ color: PARCHMENT.textDim }}>
                <div className="flex justify-between gap-2">
                  <span>现金</span>
                  <span>{formatMoney(agent?.cash ?? 0)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>持仓</span>
                  <span>{agent?.position ?? 0}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>情绪</span>
                  <span>{Math.round(((agent?.sentiment ?? 0) + 1) * 50)}%</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>净流</span>
                  <span style={{ color: (agent?.capitalFlow ?? 0) >= 0 ? '#D94838' : '#138A4C' }}>
                    {formatMoney(agent?.capitalFlow ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NewsTicker({ events }: { events: MarketEvent[] }) {
  const latestNews = events.find((event) => NEWS_TYPES.has(event.type));

  return (
    <section className="p-3 font-mono" style={PIXEL_CARD}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold" style={{ color: PARCHMENT.text }}>最新新闻</h2>
        <span className="text-[11px]" style={{ color: PARCHMENT.textDim }}>
          {latestNews ? `T${latestNews.tick}` : '--'}
        </span>
      </div>
      {latestNews ? (
        <div className="grid grid-cols-[8px_1fr] gap-2">
          <span className="mt-1.5 h-2 w-2" style={{ backgroundColor: eventTone(latestNews.type) }} />
          <div className="min-w-0">
            <div className="text-[11px] font-bold truncate" style={{ color: PARCHMENT.text }}>{latestNews.title}</div>
            <p className="text-[10px] leading-snug line-clamp-2" style={{ color: PARCHMENT.textDim }}>{latestNews.message}</p>
          </div>
        </div>
      ) : (
        <div className="text-[11px]" style={{ color: PARCHMENT.textDim }}>暂无新闻</div>
      )}
    </section>
  );
}

export default function AgentSandbox({ marketState }: { marketState: MarketState | null }) {
  return (
    <div className="space-y-3">
      <AgentMarketMap agents={marketState?.agents ?? []} variant="full" />
      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-3">
        <AgentDock agents={marketState?.agents ?? []} />
        <div className="space-y-3">
          <NewsTicker events={marketState?.events ?? []} />
          <CapitalFlowPanel metrics={marketState?.metrics ?? null} />
        </div>
      </section>
    </div>
  );
}
