import { PARCHMENT, PIXEL_CARD } from '@/components/game/panels/panelUtils';
import type { AgentType, MarketMetrics } from '@/types/market';
import { AGENT_COLORS, AGENT_LABELS, formatMoney } from './marketTheme';

const FLOW_ORDER: AgentType[] = ['retail', 'hot_money', 'mutual_fund', 'quant', 'northbound', 'national_team'];

export default function CapitalFlowPanel({ metrics }: { metrics: MarketMetrics | null }) {
  const flows = metrics?.capitalFlowByAgent;
  const maxAbs = Math.max(1, ...FLOW_ORDER.map((type) => Math.abs(flows?.[type] ?? 0)));

  return (
    <section className="p-3 space-y-2" style={PIXEL_CARD}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-bold" style={{ color: PARCHMENT.text }}>资金流向</h2>
        <span className="text-[11px] tabular-nums" style={{ color: PARCHMENT.textDim }}>
          净额 {formatMoney(metrics?.capitalFlowTotal ?? 0)}
        </span>
      </div>
      <div className="space-y-2">
        {FLOW_ORDER.map((type) => {
          const value = flows?.[type] ?? 0;
          const width = Math.max(2, Math.round((Math.abs(value) / maxAbs) * 100));
          return (
            <div key={type} className="grid grid-cols-[52px_1fr_56px] items-center gap-2 font-mono text-[11px]">
              <span style={{ color: PARCHMENT.text }}>{AGENT_LABELS[type]}</span>
              <div className="h-2" style={{ backgroundColor: '#C4A26555', boxShadow: 'inset 1px 1px 0 0 #8B6914' }}>
                <div
                  className="h-full"
                  style={{
                    width: `${width}%`,
                    marginLeft: value < 0 ? `${100 - width}%` : 0,
                    backgroundColor: value >= 0 ? AGENT_COLORS[type] : '#138A4C',
                  }}
                />
              </div>
              <span className="text-right tabular-nums" style={{ color: value >= 0 ? '#D94838' : '#138A4C' }}>
                {formatMoney(value)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
