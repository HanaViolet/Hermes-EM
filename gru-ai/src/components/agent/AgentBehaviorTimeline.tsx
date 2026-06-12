import type { AgentBehaviorEvent } from '@/types/market';
import { AGENT_COLORS, AGENT_LABELS } from '@/components/market/marketTheme';
import { TERMINAL, terminalPanel } from '@/components/market/marketTerminal';

export default function AgentBehaviorTimeline({ events }: { events: AgentBehaviorEvent[] }) {
  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold" style={{ color: TERMINAL.text }}>行为时间线</h2>
        <span className="text-[11px]" style={{ color: TERMINAL.textDim }}>{events.length}</span>
      </div>

      <div className="space-y-2 max-h-72 overflow-auto pr-1">
        {events.length === 0 ? (
          <div className="h-24 grid place-items-center text-xs font-mono" style={{ color: TERMINAL.textDim }}>
            暂无关键行为
          </div>
        ) : events.map((event) => (
          <article key={event.id} className="grid grid-cols-[8px_1fr] gap-2 font-mono">
            <span className="mt-1.5 h-2 w-2" style={{ backgroundColor: AGENT_COLORS[event.agentType] ?? TERMINAL.blue }} />
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold truncate" style={{ color: TERMINAL.text }}>
                  {AGENT_LABELS[event.agentType]} · {event.title}
                </h3>
                <span className="text-[10px] shrink-0" style={{ color: TERMINAL.textDim }}>T{event.tick}</span>
              </div>
              <p className="text-[10px] leading-snug line-clamp-2" style={{ color: TERMINAL.textDim }}>{event.message}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
