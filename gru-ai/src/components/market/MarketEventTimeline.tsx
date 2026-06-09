import { PARCHMENT, PIXEL_CARD_RAISED } from '@/components/game/panels/panelUtils';
import type { MarketEvent } from '@/types/market';
import { eventTone } from './marketTheme';

export default function MarketEventTimeline({ events }: { events: MarketEvent[] }) {
  return (
    <section className="p-3" style={PIXEL_CARD_RAISED}>
      <div className="flex items-center justify-between mb-2 font-mono">
        <h2 className="text-sm font-bold" style={{ color: PARCHMENT.text }}>事件时间线</h2>
        <span className="text-[11px]" style={{ color: PARCHMENT.textDim }}>{events.length}</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-hidden">
        {events.length === 0 ? (
          <div className="text-[11px] font-mono" style={{ color: PARCHMENT.textDim }}>暂无市场事件</div>
        ) : events.slice(0, 12).map((event) => (
          <div key={event.id} className="grid grid-cols-[9px_1fr] gap-2">
            <span
              className="mt-1.5 h-2 w-2"
              style={{ backgroundColor: eventTone(event.type), boxShadow: `0 0 4px ${eventTone(event.type)}80` }}
            />
            <div className="min-w-0 font-mono">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold truncate" style={{ color: PARCHMENT.text }}>{event.title}</span>
                <span className="text-[9px] shrink-0 tabular-nums" style={{ color: PARCHMENT.textDim }}>T{event.tick}</span>
              </div>
              <p className="text-[10px] leading-snug line-clamp-2" style={{ color: PARCHMENT.textDim }}>
                {event.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
