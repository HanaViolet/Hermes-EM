import { Newspaper, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PARCHMENT, PIXEL_CARD_RAISED } from '@/components/game/panels/panelUtils';
import { useSimulationStore } from '@/stores/simulation-store';
import type { MarketEvent } from '@/types/market';
import { eventTone } from './marketTheme';

const NEWS_TYPES = new Set<MarketEvent['type']>(['positive_news', 'negative_news', 'policy', 'earnings']);

function isNews(event: MarketEvent): boolean {
  return NEWS_TYPES.has(event.type);
}

function eventLabel(type: MarketEvent['type']): string {
  if (type === 'positive_news') return '利好';
  if (type === 'negative_news') return '利空';
  if (type === 'policy') return '政策';
  if (type === 'earnings') return '财报';
  return '新闻';
}

export default function NewsPanel({ events }: { events: MarketEvent[] }) {
  const connected = useSimulationStore((s) => s.connected);
  const sendCommand = useSimulationStore((s) => s.sendCommand);
  const news = events.filter(isNews).slice(0, 5);

  return (
    <section className="p-3" style={PIXEL_CARD_RAISED}>
      <div className="flex items-center justify-between gap-2 mb-2 font-mono">
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: PARCHMENT.text }}>
          <Newspaper className="h-4 w-4" />
          新闻
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!connected}
            className="h-7 px-2 gap-1 font-mono text-[11px]"
            onClick={() => sendCommand({ command: 'inject_news', newsImpact: 0.55 })}
          >
            <TrendingUp className="h-3 w-3" />
            利好
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!connected}
            className="h-7 px-2 gap-1 font-mono text-[11px]"
            onClick={() => sendCommand({ command: 'inject_news', newsImpact: -0.55 })}
          >
            <TrendingDown className="h-3 w-3" />
            利空
          </Button>
        </div>
      </div>

      <div className="space-y-2 min-h-[160px]">
        {news.length === 0 ? (
          <div className="h-28 grid place-items-center text-[11px] font-mono" style={{ color: PARCHMENT.textDim }}>
            暂无新闻
          </div>
        ) : news.map((event) => (
          <article key={event.id} className="grid grid-cols-[42px_1fr] gap-2 font-mono">
            <div
              className="h-7 px-1 grid place-items-center text-[10px]"
              style={{
                color: '#F5ECD7',
                backgroundColor: eventTone(event.type),
                boxShadow: 'inset -1px -1px 0 0 #2A1A10, inset 1px 1px 0 0 #F5ECD740',
              }}
            >
              {eventLabel(event.type)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-bold truncate" style={{ color: PARCHMENT.text }}>{event.title}</h3>
                <span className="text-[9px] shrink-0 tabular-nums" style={{ color: PARCHMENT.textDim }}>T{event.tick}</span>
              </div>
              <p className="text-[10px] leading-snug line-clamp-2" style={{ color: PARCHMENT.textDim }}>
                {event.message}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
