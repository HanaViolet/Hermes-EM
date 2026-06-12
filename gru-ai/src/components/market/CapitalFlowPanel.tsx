import { Landmark } from 'lucide-react';
import type { AgentType, MarketMetrics } from '@/types/market';
import { AGENT_COLORS, AGENT_LABELS } from './marketTheme';
import { formatLargeNumber, TERMINAL, terminalPanel } from './marketTerminal';

const FLOW_ORDER: AgentType[] = ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team', 'training_quant'];

export default function CapitalFlowPanel({ metrics }: { metrics: MarketMetrics | null }) {
  const flows = metrics?.capitalFlowByAgent;
  const available = FLOW_ORDER.filter((type) => flows?.[type] !== undefined);
  const visible = available.length > 0 ? available : FLOW_ORDER.slice(0, 6);
  const maxAbs = Math.max(1, ...visible.map((type) => Math.abs(flows?.[type] ?? 0)));
  const total = metrics?.capitalFlowTotal ?? 0;

  return (
    <section className="p-3 space-y-3" style={terminalPanel}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: TERMINAL.text }}>
          <Landmark className="h-4 w-4" />
          资金流向
        </h2>
        <span className="text-[11px] tabular-nums" style={{ color: total >= 0 ? TERMINAL.red : TERMINAL.green }}>
          {formatLargeNumber(total)}
        </span>
      </div>

      <div className="space-y-2">
        {visible.map((type) => {
          const value = flows?.[type] ?? 0;
          const width = Math.max(2, Math.round((Math.abs(value) / maxAbs) * 100));
          return (
            <div key={type} className="grid grid-cols-[62px_1fr_64px] items-center gap-2 font-mono text-[11px]">
              <span className="truncate" style={{ color: TERMINAL.text }}>{AGENT_LABELS[type]}</span>
              <div className="h-2" style={{ backgroundColor: TERMINAL.panelSoft, border: `1px solid ${TERMINAL.borderSoft}` }}>
                <div
                  className="h-full"
                  style={{
                    width: `${width}%`,
                    marginLeft: value < 0 ? `${100 - width}%` : 0,
                    backgroundColor: value >= 0 ? (AGENT_COLORS[type] ?? TERMINAL.red) : TERMINAL.green,
                  }}
                />
              </div>
              <span className="text-right tabular-nums" style={{ color: value >= 0 ? TERMINAL.red : TERMINAL.green }}>
                {formatLargeNumber(value)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
