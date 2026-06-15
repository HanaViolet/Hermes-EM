import { Newspaper, TrendingDown, TrendingUp } from 'lucide-react';
import { useCommandSymbol } from '@/hooks/useCommandSymbol';
import { useSimulationStore } from '@/stores/simulation-store';
import type { MarketEvent } from '@/types/market';
import { eventTone } from './marketTheme';
import { TERMINAL, terminalPanel } from './marketTerminal';

const NEWS_TYPES = new Set<MarketEvent['type']>(['positive_news', 'negative_news', 'policy', 'policy_news', 'earnings', 'macro', 'rumor']);

function isNews(event: MarketEvent): boolean {
  return NEWS_TYPES.has(event.type);
}

function eventLabel(type: MarketEvent['type']): string {
  if (type === 'positive_news') return '利好';
  if (type === 'negative_news') return '利空';
  if (type === 'policy' || type === 'policy_news') return '政策';
  if (type === 'earnings') return '财报';
  return '新闻';
}

export default function NewsPanel({ events }: { events: MarketEvent[] }) {
  const connected = useSimulationStore((s) => s.connected);
  const sendCommand = useSimulationStore((s) => s.sendCommand);
  const commandSymbol = useCommandSymbol();
  const news = events.filter(isNews).slice(0, 5);

  return (
    <section className="p-3" style={terminalPanel}>
      <div className="flex items-center justify-between gap-2 mb-2 font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Newspaper className="h-4 w-4" />
          新闻
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!connected}
            className="h-7 px-2 inline-flex items-center gap-1 font-mono text-[11px] disabled:opacity-40"
            style={{ color: TERMINAL.red, border: `1px solid ${TERMINAL.borderSoft}`, backgroundColor: TERMINAL.panelSoft }}
            onClick={() => sendCommand({ command: 'inject_news', newsImpact: 0.55, symbol: commandSymbol })}
          >
            <TrendingUp className="h-3 w-3" />
            利好
          </button>
          <button
            type="button"
            disabled={!connected}
            className="h-7 px-2 inline-flex items-center gap-1 font-mono text-[11px] disabled:opacity-40"
            style={{ color: TERMINAL.green, border: `1px solid ${TERMINAL.borderSoft}`, backgroundColor: TERMINAL.panelSoft }}
            onClick={() => sendCommand({ command: 'inject_news', newsImpact: -0.55, symbol: commandSymbol })}
          >
            <TrendingDown className="h-3 w-3" />
            利空
          </button>
        </div>
      </div>

      <div className="space-y-2 min-h-[160px]">
        {news.length === 0 ? (
          <div className="h-28 grid place-items-center text-[11px] font-mono" style={{ color: TERMINAL.textDim }}>
            暂无新闻
          </div>
        ) : news.map((event) => (
          <article key={event.id} className="grid grid-cols-[42px_1fr] gap-2 font-mono">
            <div className="h-7 px-1 grid place-items-center text-[10px]" style={{ color: TERMINAL.darkText, backgroundColor: eventTone(event.type) }}>
              {eventLabel(event.type)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold truncate" style={{ color: TERMINAL.text }}>{event.title}</h3>
                <span className="text-[9px] shrink-0 tabular-nums" style={{ color: TERMINAL.textDim }}>T{event.tick}</span>
              </div>
              <p className="text-[10px] leading-snug line-clamp-2" style={{ color: TERMINAL.textDim }}>
                {event.message}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
