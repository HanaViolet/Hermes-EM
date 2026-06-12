import { Newspaper } from 'lucide-react';
import type { MarketEvent, ScenarioUpdateMessage } from '@/types/market';
import { eventTone } from './marketTheme';
import { TERMINAL, terminalPanel } from './marketTerminal';

const NEWS_TYPES = new Set<MarketEvent['type']>(['positive_news', 'negative_news', 'policy', 'policy_news', 'rumor', 'earnings', 'macro', 'liquidity_shock', 'halt', 'resume']);

function label(type: string): string {
  if (type === 'positive_news') return '利好';
  if (type === 'negative_news') return '利空';
  if (type === 'policy' || type === 'policy_news') return '政策';
  if (type === 'earnings') return '财报';
  if (type === 'liquidity_shock') return '流动性';
  if (type === 'halt') return '停牌';
  if (type === 'resume') return '复牌';
  return '新闻';
}

export default function MarketNewsTimeline({
  events,
  scenarioUpdate,
}: {
  events: MarketEvent[];
  scenarioUpdate: ScenarioUpdateMessage | null;
}) {
  const news = events.filter((event) => NEWS_TYPES.has(event.type)).slice(0, 8);
  const upcoming = scenarioUpdate?.upcomingNews.slice(0, 4) ?? [];

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Newspaper className="h-4 w-4" />
          新闻时间线
        </h2>
        <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>
          触发 {scenarioUpdate?.triggeredNews.length ?? 0}
        </span>
      </div>

      <div className="space-y-2">
        {news.length === 0 ? (
          <div className="h-24 grid place-items-center text-xs font-mono" style={{ color: TERMINAL.textDim }}>
            暂无已触发新闻
          </div>
        ) : news.map((event) => (
          <article key={event.id} className="grid grid-cols-[46px_1fr] gap-2 font-mono">
            <div
              className="h-7 grid place-items-center text-[10px]"
              style={{ color: TERMINAL.darkText, backgroundColor: eventTone(event.type) }}
            >
              {label(event.type)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold truncate" style={{ color: TERMINAL.text }}>{event.title}</h3>
                <span className="text-[10px] shrink-0" style={{ color: TERMINAL.textDim }}>T{event.tick}</span>
              </div>
              <p className="text-[10px] leading-snug line-clamp-2" style={{ color: TERMINAL.textDim }}>{event.message}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="pt-2 border-t" style={{ borderColor: TERMINAL.borderSoft }}>
        <div className="mb-2 text-[11px] font-mono" style={{ color: TERMINAL.textDim }}>即将到来的场景事件</div>
        <div className="space-y-1">
          {upcoming.length === 0 ? (
            <div className="text-[11px] font-mono" style={{ color: TERMINAL.textDim }}>当前无预设事件</div>
          ) : upcoming.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-2 text-[11px] font-mono">
              <span className="truncate" style={{ color: TERMINAL.text }}>{event.title}</span>
              <span className="shrink-0" style={{ color: TERMINAL.amber }}>T{event.tick}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
