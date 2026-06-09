import { PARCHMENT, PIXEL_CARD } from '@/components/game/panels/panelUtils';
import type { MarketMetrics } from '@/types/market';

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  const width = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span style={{ color: PARCHMENT.text }}>{label}</span>
        <span className="tabular-nums" style={{ color: PARCHMENT.textDim }}>{width}%</span>
      </div>
      <div className="h-2" style={{ backgroundColor: '#C4A26555', boxShadow: 'inset 1px 1px 0 0 #8B6914' }}>
        <div className="h-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function MarketMetricsPanel({ metrics }: { metrics: MarketMetrics | null }) {
  return (
    <section className="p-3 space-y-3" style={PIXEL_CARD}>
      <div className="flex items-center justify-between font-mono">
        <h2 className="text-sm font-bold" style={{ color: PARCHMENT.text }}>市场指标</h2>
        <span className="text-[11px] tabular-nums" style={{ color: PARCHMENT.textDim }}>
          波动 {(metrics?.volatility ?? 0).toFixed(2)}
        </span>
      </div>
      <MetricBar label="多头力量" value={metrics?.bullPower ?? 0.5} color="#D94838" />
      <MetricBar label="空头力量" value={metrics?.bearPower ?? 0.5} color="#138A4C" />
      <MetricBar label="市场情绪" value={metrics?.marketSentiment ?? 0.5} color="#B8792D" />
      <MetricBar label="盘口倾斜" value={((metrics?.orderBookImbalance ?? 0) + 1) / 2} color="#5C3D2E" />
      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] tabular-nums">
        <div>
          <div style={{ color: PARCHMENT.textDim }}>买压</div>
          <div style={{ color: '#D94838' }}>{Math.round((metrics?.buyPressure ?? 0) * 100)}%</div>
        </div>
        <div>
          <div style={{ color: PARCHMENT.textDim }}>卖压</div>
          <div style={{ color: '#138A4C' }}>{Math.round((metrics?.sellPressure ?? 0) * 100)}%</div>
        </div>
      </div>
    </section>
  );
}
